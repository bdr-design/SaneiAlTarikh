#!/usr/bin/env python3
"""The reference model of SaneiCore's determinism kit (design_doc §2.3, ADR 0002).

Every algorithm of Sources/SaneiCore's fixed-point types, DMath, DetRNG and GameDate is written here a second time, in
exact integer arithmetic. From it come two generated Swift files:

  Sources/SaneiCore/DMathTables.swift       the exp2 and log2 tables (1,025 entries each), correctly rounded
  Tests/SaneiCoreTests/CoreGolden.swift     input and output vectors the Swift tests must reproduce exactly

  --write   regenerate both files
  --check   (default) fail if the committed files differ, or an accuracy bound or a known value does not hold

The accuracy bounds are measured against 60-digit decimal arithmetic, never against the platform's libm.
"""
import sys, os
from decimal import Decimal, getcontext

getcontext().prec = 60
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TABLES = os.path.join(ROOT, 'Sources/SaneiCore/DMathTables.swift')
GOLDEN = os.path.join(ROOT, 'Tests/SaneiCoreTests/CoreGolden.swift')

I64_MAX, I64_MIN = (1 << 63) - 1, -(1 << 63)
I32_MAX, I32_MIN = (1 << 31) - 1, -(1 << 31)
M64 = (1 << 64) - 1
ONE = 1 << 32
SAT = [0]                                   # the saturation counter


def sat64(v):
    """Clamp to Int64 and count."""
    if v > I64_MAX: SAT[0] += 1; return I64_MAX
    if v < I64_MIN: SAT[0] += 1; return I64_MIN
    return v


def sat32(v):
    if v > I32_MAX: SAT[0] += 1; return I32_MAX
    if v < I32_MIN: SAT[0] += 1; return I32_MIN
    return v


def rdiv(n, d):
    """n / d to the nearest integer, ties away from zero (d != 0)."""
    s = -1 if (n < 0) != (d < 0) else 1
    n, d = abs(n), abs(d)
    q, r = divmod(n, d)
    if 2 * r >= d: q += 1
    return s * q


def rshift(v, s):
    """v / 2^s to the nearest integer, ties away from zero (s >= 0)."""
    return rdiv(v, 1 << s) if s > 0 else v


# ---- Q32 (Int64, 32 fractional bits) ----
def q_add(a, b): return sat64(a + b)
def q_sub(a, b): return sat64(a - b)
def q_neg(a): return sat64(-a)
def q_mul(a, b): return sat64(rshift(a * b, 32))


def q_div(a, b):
    if b == 0:
        SAT[0] += 1
        return 0 if a == 0 else (I64_MAX if a > 0 else I64_MIN)
    return sat64(rdiv(a << 32, b))


def q_from_int(i): return sat64(i << 32)


def q_div_raw(a, b):
    """Q32(ratio: a, b): two plain integers."""
    if b == 0:
        SAT[0] += 1
        return 0 if a == 0 else (I64_MAX if a > 0 else I64_MIN)
    return sat64(rdiv(a << 32, b))


def q_apply(q, amount): return sat64(rshift(q * amount, 32))      # an integer amount times a Q32 factor
def q_floor(q): return q >> 32
def q_round(q): return rshift(q, 32)


# ---- BP (Int32, 1/10,000) ----
def bp_add(a, b): return sat32(a + b)
def bp_sub(a, b): return sat32(a - b)
def bp_mul(a, b): return sat32(rdiv(a * b, 10000))
def bp_of(bp, amount): return sat64(rdiv(bp * amount, 10000))
def bp_ratio(a, b):
    if b == 0:
        SAT[0] += 1
        return 0 if a == 0 else (I32_MAX if a > 0 else I32_MIN)
    return sat32(rdiv(a * 10000, b))
def bp_to_q(bp): return rdiv(bp << 32, 10000)
def q_to_bp(q): return sat32(rshift(q * 10000, 32))


# ---- DMath ----
def make_tables():
    two = Decimal(2)
    ln2 = two.ln()
    exp_t = [int((two ** (Decimal(i) / 1024) * ONE).to_integral_value(rounding='ROUND_HALF_EVEN')) for i in range(1025)]
    log_t = [int(((Decimal(1) + Decimal(i) / 1024).ln() / ln2 * ONE).to_integral_value(rounding='ROUND_HALF_EVEN')) for i in range(1025)]
    assert exp_t[0] == ONE and exp_t[1024] == 2 * ONE and log_t[0] == 0 and log_t[1024] == ONE
    return exp_t, log_t


EXP2, LOG2 = make_tables()
LOG2E = int((Decimal(1) / Decimal(2).ln() * ONE).to_integral_value(rounding='ROUND_HALF_EVEN'))


def mant(y):
    """The exponent and the Q32 mantissa in [1, 2) of 2^(y / 2^32)."""
    n, f = y >> 32, y & 0xFFFFFFFF
    i, t = f >> 22, f & 0x3FFFFF
    return n, EXP2[i] + (((EXP2[i + 1] - EXP2[i]) * t + (1 << 21)) >> 22)


def exp2(y):
    """LogQ raw -> Q32 raw."""
    n, m = mant(y)
    if n >= 31: SAT[0] += 1; return I64_MAX
    if n >= 0: return m << n
    s = -n
    return 0 if s >= 64 else (m + (1 << (s - 1))) >> s


def log2(x):
    """Q32 raw (> 0) -> LogQ raw."""
    if x <= 0: SAT[0] += 1; return I64_MIN
    p = x.bit_length() - 1
    u = (x << (63 - p)) & M64
    i, t = (u >> 53) & 0x3FF, (u >> 21) & 0xFFFFFFFF
    l = LOG2[i] + (((LOG2[i + 1] - LOG2[i]) * t + (1 << 31)) >> 32)
    return ((p - 32) << 32) + l


def scale(amount, y):
    """An integer amount times 2^(y / 2^32), to the nearest integer."""
    n, m = mant(y)
    p = abs(amount) * m
    s = 32 - n
    if s >= 1: v = 0 if s >= 128 else (p + (1 << (s - 1))) >> s
    else:
        v = p << (-s) if -s < 64 else (0 if p == 0 else 1 << 200)
    return sat64(-v if amount < 0 else v)


def isqrt(n):
    if n < 2: return n
    x = 1 << ((n.bit_length() + 1) // 2)
    while True:
        y = (x + n // x) >> 1
        if y >= x: return x
        x = y


def q_sqrt(x):
    if x < 0: SAT[0] += 1; return 0
    if x == 0: return 0
    lz = 64 - x.bit_length()
    k = min(lz & ~1, 32)
    return isqrt(x << k) << ((32 - k) // 2)


def logistic(x):
    """1 / (1 + e^-x) for a Q32 x; exactly symmetric: logistic(x) + logistic(-x) = 1."""
    a = min(abs(x), I64_MAX)
    if a >= 46 * ONE: s = 0
    else:
        y = rshift(a * LOG2E, 32)
        t = exp2(-y)
        s = rdiv(t << 32, ONE + t)
    return ONE - s if x >= 0 else s


# ---- DetRNG (SplitMix64) ----
GOLD = 0x9E3779B97F4A7C15


def mix64(z):
    z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & M64
    z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & M64
    return z ^ (z >> 31)


class RNG:
    def __init__(self, state): self.state = state & M64

    @classmethod
    def keyed(cls, seed, key, stream, serial):
        s = mix64((seed + GOLD + (key & M64)) & M64)
        s = mix64((s + GOLD + ((stream << 32) | serial)) & M64)
        return cls(s)

    def next(self):
        self.state = (self.state + GOLD) & M64
        return mix64(self.state)

    def below(self, n): return (self.next() * n) >> 64
    def bp(self): return self.below(10000)


# ---- GameDate (days since 1970-01-01, proleptic Gregorian) ----
def days_from_civil(y, m, d):
    y -= m <= 2
    era = y // 400
    yoe = y - era * 400
    doy = (153 * (m + (-3 if m > 2 else 9)) + 2) // 5 + d - 1
    doe = yoe * 365 + yoe // 4 - yoe // 100 + doy
    return era * 146097 + doe - 719468


def civil_from_days(z):
    z += 719468
    era = z // 146097
    doe = z - era * 146097
    yoe = (doe - doe // 1460 + doe // 36524 - doe // 146096) // 365
    y = yoe + era * 400
    doy = doe - (365 * yoe + yoe // 4 - yoe // 100)
    mp = (5 * doy + 2) // 153
    d = doy - (153 * mp + 2) // 5 + 1
    m = mp + 3 if mp < 10 else mp - 9
    return (y + (m <= 2), m, d)


# ---- checks ----
def check_bounds():
    """The accuracy the design asks for (§2.3: relative error <= 1e-6), against 60-digit decimals."""
    two, ln2 = Decimal(2), Decimal(2).ln()
    g = RNG(20110101)
    worst_e = worst_l = worst_r = Decimal(0)
    ys = [g.next() % (60 * ONE) - 30 * ONE for _ in range(4000)] + [i << 22 for i in range(1025)] + [(i << 22) + (1 << 21) for i in range(1024)]
    for y in ys:
        if y >= 31 * ONE: continue
        true = two ** (Decimal(y) / ONE) * ONE
        err = abs(Decimal(exp2(y)) - true)
        assert err <= true * Decimal('3e-7') + 1, y              # below 1.0 the result's own last bit is the limit
        if y >= 0: worst_e = max(worst_e, err / true)
    xs = [(g.next() % (1 << 62)) + 1 for _ in range(4000)] + [ONE + (i << 22) + (1 << 21) for i in range(1024)] + [(g.next() % (1 << 40)) + (1 << 20) for _ in range(2000)]
    for x in xs:
        true = (Decimal(x) / ONE).ln() / ln2
        worst_l = max(worst_l, abs(Decimal(log2(x)) / ONE - true))
        back = abs(Decimal(exp2(log2(x))) - x)
        assert back <= x * Decimal('6e-7') + 1, x
        if x >= ONE: worst_r = max(worst_r, back / x)
    assert worst_e < Decimal('3e-7'), worst_e
    assert worst_l < Decimal('3e-7'), worst_l
    assert worst_r < Decimal('1e-6'), worst_r
    worst_s = Decimal(0)
    for x in [-40 * ONE + (g.next() % (80 * ONE)) for _ in range(3000)]:
        true = Decimal(1) / (Decimal(1) + (-(Decimal(x) / ONE)).exp())
        worst_s = max(worst_s, abs(Decimal(logistic(x)) / ONE - true))
        assert logistic(x) + logistic(-x) == ONE
    assert worst_s < Decimal('3e-7'), worst_s
    assert logistic(0) == ONE // 2
    for k in range(-20, 31): assert exp2(k * ONE) == (1 << (32 + k)) and log2(1 << (32 + k)) == k * ONE
    for x in [g.next() % (1 << 63) for _ in range(3000)] + [0, 1, 2, 3, 4, (1 << 62), I64_MAX]:
        r = q_sqrt(x)
        true = (Decimal(x) / ONE).sqrt() * ONE
        assert r <= true and (true - r <= 1 if x < ONE else (true - r) / true < Decimal(2) ** -30), x
    # the rounded quotient that needs 65 bits (2^64 exactly) must clamp, never wrap to 0
    n229 = ((229 << 64) - 64) // 10000
    assert n229 * 10000 == (229 << 64) - 64 and n229 <= I64_MAX and rdiv(n229 * 10000, 229) == 1 << 64
    before = SAT[0]; assert bp_ratio(n229, 229) == I32_MAX and SAT[0] == before + 1; SAT[0] = before
    for n in [g.next() for _ in range(3000)] + [0, 1, 2, 3, 4, 15, 16, 17, M64, (1 << 32) ** 2 - 1, (1 << 32) ** 2]:
        r = isqrt(n & M64)
        assert r * r <= (n & M64) < (r + 1) * (r + 1)
    # monotone: a higher level never gives a lower value
    prev = 0
    for y in range(-3 * ONE, 3 * ONE, 104729):
        v = exp2(y); assert v >= prev; prev = v
    prev = I64_MIN
    for x in range(1, 8 * ONE, 1299709):
        v = log2(x); assert v >= prev; prev = v
    # the calendar: every day of 1850-2200 round-trips, in order
    lo, hi = days_from_civil(1850, 1, 1), days_from_civil(2200, 12, 31)
    assert (lo, hi) == (-43829, 84370) and days_from_civil(2011, 1, 1) == 14975 and days_from_civil(1970, 1, 1) == 0
    prev = None
    import datetime
    for z in range(lo, hi + 1):
        c = civil_from_days(z)
        assert days_from_civil(*c) == z
        assert c == tuple((datetime.date(1970, 1, 1) + datetime.timedelta(days=z)).timetuple()[:3])
    # SplitMix64's published sequence for seed 1234567
    r = RNG(1234567)
    assert [r.next() for _ in range(5)] == [6457827717110365317, 3203168211198807973, 9817491932198370423,
                                             4593380528125082431, 16408922859458223821]
    assert SAT[0] == 0, 'the bounds checks must not saturate'
    return worst_e, worst_l, worst_r, worst_s


def vectors():
    """The golden vectors: (name, Swift element type, rows)."""
    g = RNG(0x5A4E4549)                                    # the vectors' own fixed stream
    def r64(): return g.next()
    def s64(bits): return (r64() % (1 << bits)) - (1 << (bits - 1))
    out = []
    class Fam(list):
        def append(self, item):                            # each family carries the saturations its rows counted
            name, ty, rows = item
            super().append((name, ty, rows, SAT[0] - self.mark))
            self.mark = SAT[0]
    out = Fam(); out.mark = SAT[0]
    edge = [0, 1, -1, ONE, -ONE, ONE // 2, 3 * ONE, I64_MAX, I64_MIN, I64_MAX - 1, I64_MIN + 1, 1 << 31, -(1 << 31), 10000 * ONE]
    pairs = [(a, b) for a in edge for b in edge[:9]] + [(s64(40), s64(40)) for _ in range(40)] + [(s64(63), s64(34)) for _ in range(20)]
    out.append(('q32Add', '(Int64, Int64, Int64)', [(a, b, q_add(a, b)) for a, b in pairs[:60]]))
    out.append(('q32Sub', '(Int64, Int64, Int64)', [(a, b, q_sub(a, b)) for a, b in pairs[:60]]))
    out.append(('q32Mul', '(Int64, Int64, Int64)', [(a, b, q_mul(a, b)) for a, b in pairs]))
    out.append(('q32Div', '(Int64, Int64, Int64)', [(a, b, q_div(a, b)) for a, b in pairs]))
    out.append(('q32Ratio', '(Int64, Int64, Int64)', [(a, b, q_div_raw(a, b)) for a, b in [(1, 3), (2, 3), (-1, 3), (1, -3), (5, 0), (0, 0), (-5, 0), (I64_MAX, 1), (1 << 31, 1), ((1 << 31) - 1, 1), (-(1 << 31), 1), (7, 1 << 40), (I64_MIN, I64_MAX), (I64_MIN, -1)] + [(s64(50), s64(30)) for _ in range(20)]]))
    out.append(('q32Apply', '(Int64, Int64, Int64)', [(q, a, q_apply(q, a)) for q, a in [(ONE, 5), (ONE // 2, 5), (ONE // 2, -5), (ONE // 2, 3), (-ONE // 2, 3), (3 * ONE, I64_MAX), (ONE, I64_MIN), (I64_MAX, 2), (1, 1 << 31), (1, (1 << 31) - 1)] + [(s64(36), s64(60)) for _ in range(30)]]))
    out.append(('q32Round', '(Int64, Int64, Int64)', [(q, q_floor(q), q_round(q)) for q in [0, 1, -1, ONE // 2, -ONE // 2, ONE // 2 - 1, -ONE // 2 - 1, ONE + ONE // 2, -ONE - ONE // 2, I64_MAX, I64_MIN] + [s64(45) for _ in range(12)]]))
    out.append(('q32FromInt', '(Int64, Int64)', [(i, q_from_int(i)) for i in [0, 1, -1, (1 << 31) - 1, 1 << 31, -(1 << 31), -(1 << 31) - 1, I64_MAX, I64_MIN, 2011]]))
    bps = [0, 1, -1, 10000, -10000, 5000, 3333, I32_MAX, I32_MIN, 12345, -9999]
    amts = [0, 1, -1, 2, 3, -3, 10000, 5000, 15000, I64_MAX, I64_MIN, 1 << 60, -(1 << 60), 123456789012345]
    out.append(('bpOf', '(Int32, Int64, Int64)', [(b, a, bp_of(b, a)) for b, a in [(b, a) for b in bps for a in amts] + [(s64(20), s64(62)) for _ in range(20)]]))
    out.append(('bpArith', '(Int32, Int32, Int32, Int32, Int32)', [(a, b, bp_add(a, b), bp_sub(a, b), bp_mul(a, b)) for a in bps for b in bps[:8]]))
    out.append(('bpRatio', '(Int64, Int64, Int32)', [(a, b, bp_ratio(a, b)) for a, b in [(1, 2), (1, 3), (2, 3), (-1, 3), (1, -3), (0, 5), (5, 0), (0, 0), (-5, 0), (I64_MAX, 1), (I64_MIN, 1), (I64_MAX, I64_MAX), (I64_MIN, I64_MAX), (1, I64_MAX), (214748, 1), (214749, 1), (1, 20000), (3, 20000), (I64_MAX, I64_MIN), (((229 << 64) - 64) // 10000, 229), (-(((229 << 64) - 64) // 10000), 229)] + [(s64(55), s64(50)) for _ in range(20)]]))
    out.append(('bpQ32', '(Int32, Int64, Int32)', [(b, bp_to_q(b), q_to_bp(bp_to_q(b))) for b in bps + [1234, 9999, 2, 3]]))
    out.append(('qToBP', '(Int64, Int32)', [(q, q_to_bp(q)) for q in [0, ONE, -ONE, ONE // 2, ONE // 3, I64_MAX, I64_MIN, 214748 * ONE, 214749 * ONE, 429497, 214748, 214749]]))
    ys = [0, 1, -1, ONE, -ONE, ONE // 2, -ONE // 2, 30 * ONE, 31 * ONE - 1, 31 * ONE, -31 * ONE, -32 * ONE, -33 * ONE, -34 * ONE, -64 * ONE, -90 * ONE, I64_MAX, I64_MIN, (1 << 22) - 1, 1 << 22, 1023 << 22, (1024 << 22) - 1]
    ys += [s64(37) for _ in range(40)]
    out.append(('exp2', '(Int64, Int64)', [(y, exp2(y)) for y in ys]))
    xs = [1, 2, 3, ONE, ONE - 1, ONE + 1, 2 * ONE, 2 * ONE - 1, 3 * ONE, ONE // 2, I64_MAX, 1 << 62, (1 << 62) - 1, 0, -1, I64_MIN, 10 * ONE, 1000 * ONE]
    xs += [(r64() % (1 << 62)) + 1 for _ in range(30)] + [(r64() % (1 << 34)) + 1 for _ in range(10)]
    out.append(('log2', '(Int64, Int64)', [(x, log2(x)) for x in xs]))
    sc = [(1000, 0), (1000, ONE), (1000, -ONE), (1000, ONE // 2), (-1000, ONE // 2), (1, -ONE), (3, -ONE), (-3, -ONE), (1, -2 * ONE), (I64_MAX, 0), (I64_MIN, 0), (I64_MAX, 1), (I64_MIN, 1), (1, 62 * ONE), (1, 63 * ONE), (-1, 63 * ONE), (-1, 64 * ONE), (0, 200 * ONE), (5, 200 * ONE), (1 << 62, -62 * ONE), (I64_MAX, -63 * ONE), (I64_MAX, -64 * ONE), (I64_MAX, -200 * ONE), (I64_MAX, I64_MIN), (7, I64_MAX), (0, I64_MAX), (123456789, 31 * ONE + 12345), (3, 61 * ONE + ONE // 2), (1, 95 * ONE), (1 << 40, -96 * ONE), (I64_MAX, -127 * ONE), (I64_MAX, -128 * ONE), (I64_MAX, -129 * ONE)]
    sc += [(s64(50), s64(36)) for _ in range(30)]
    out.append(('scale', '(Int64, Int64, Int64)', [(a, y, scale(a, y)) for a, y in sc]))
    ns = [0, 1, 2, 3, 4, 8, 9, 15, 16, 17, 24, 25, 26, M64, M64 - 1, (1 << 32) ** 2 - 1, 1 << 62, (1 << 63) - 1, 1 << 63, 4294967295 * 4294967295, 4294967295 * 4294967295 - 1]
    ns += [r64() for _ in range(15)] + [r64() >> 30 for _ in range(10)]
    out.append(('isqrt', '(UInt64, UInt64)', [(n, isqrt(n)) for n in ns]))
    qs = [0, 1, 2, 4, ONE, ONE - 1, ONE + 1, 4 * ONE, 2 * ONE, ONE // 4, I64_MAX, 1 << 62, -1, I64_MIN, 100 * ONE, 1 << 33, (1 << 33) - 1, 1 << 31]
    qs += [r64() >> 1 for _ in range(15)] + [r64() >> 33 for _ in range(10)]
    out.append(('q32Sqrt', '(Int64, Int64)', [(q, q_sqrt(q)) for q in qs]))
    ls = [0, 1, -1, ONE, -ONE, 5 * ONE, -5 * ONE, 45 * ONE, 46 * ONE - 1, 46 * ONE, -46 * ONE, 100 * ONE, I64_MAX, I64_MIN, ONE // 1000]
    ls += [s64(38) for _ in range(30)]
    out.append(('logistic', '(Int64, Int64)', [(x, logistic(x)) for x in ls]))
    seq = RNG(1234567)
    out.append(('rngSeq', 'UInt64', [seq.next() for _ in range(8)]))
    keyed = []
    for seed, key, stream, serial in [(0, 0, 0, 0), (1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1), (2011, 14975, 3, 77), (2011, 14976, 3, 77), (2011, 14975, 4, 77), (2011, 14975, 3, 78), (M64, -1, 0xFFFFFFFF, 0xFFFFFFFF), (0xDEADBEEF, -43829, 12, 4000000000), (42, 84370, 1, 2)]:
        k = RNG.keyed(seed, key, stream, serial)
        keyed.append((seed, key, stream, serial, k.next(), k.next(), k.next()))
    out.append(('rngKeyed', '(UInt64, Int64, UInt32, UInt32, UInt64, UInt64, UInt64)', keyed))
    b = RNG.keyed(7, 7, 7, 7)
    out.append(('rngBelow', '(UInt64, UInt64)', [(n, b.below(n)) for n in [1, 2, 3, 10, 10000, 1 << 32, M64, 6, 6, 6, 100, 100, 1000000007, 1 << 63, 0]]))
    b = RNG.keyed(9, 9, 9, 9)
    out.append(('rngBP', 'Int32', [b.bp() for _ in range(16)]))
    ds = [(1850, 1, 1), (1899, 12, 31), (1900, 2, 28), (1900, 3, 1), (1969, 12, 31), (1970, 1, 1), (2000, 2, 29), (2011, 1, 1), (2011, 1, 25), (2011, 7, 9), (2012, 2, 29), (2100, 2, 28), (2100, 3, 1), (2200, 12, 31), (1979, 2, 11), (1990, 8, 2), (2026, 1, 1)]
    out.append(('dates', '(Int32, Int32, Int32, Int32, Int32)', [(y, m, d, days_from_civil(y, m, d), (days_from_civil(y, m, d) + 4) % 7) for y, m, d in ds]))
    return out


def swift_tables():
    def rows(t): return '\n'.join('        ' + ', '.join(str(v) for v in t[i:i + 8]) + ',' for i in range(0, len(t), 8))
    return f"""// GENERATED by tools/checks/core_reference.py --write. Do not edit: CI regenerates it and fails on a difference.
// DMath's tables (§2.3): 2^(i/1024) and log2(1 + i/1024) for i = 0...1024, in Q32.32, each correctly rounded from
// 60-digit decimal arithmetic. Fixed data, so every platform computes the same values (L5).

extension DMath {{
    /// round(2^(i/1024) * 2^32), i = 0...1024.
    @usableFromInline static let exp2Table: [UInt64] = [
{rows(EXP2)}
    ]

    /// round(log2(1 + i/1024) * 2^32), i = 0...1024.
    @usableFromInline static let log2Table: [UInt64] = [
{rows(LOG2)}
    ]

    /// round(log2(e) * 2^32).
    @usableFromInline static let log2e: UInt64 = {LOG2E}
}}
"""


def swift_golden(vs):
    out = ["// GENERATED by tools/checks/core_reference.py --write. Do not edit: CI regenerates it and fails on a difference.",
           "// The reference model's vectors (exact integer arithmetic, written a second time in Python): the Swift code must",
           "// reproduce every one exactly (§2.3: golden values lock the maths).", "",
           "enum CoreGolden {"]
    for name, ty, rows, sat in vs:
        out.append(f"    /// {len(rows)} rows; the reference counted {sat} saturations making them.")
        out.append(f"    static let {name}: [{ty}] = [")
        for r in rows:
            out.append('        ' + (('(' + ', '.join(str(v) for v in r) + ')') if isinstance(r, tuple) else str(r)) + ',')
        out.append("    ]")
        out.append(f"    static let {name}Saturations: UInt64 = {sat}")
    out.append("}")
    return '\n'.join(out) + '\n'


def main():
    write = '--write' in sys.argv
    e, l, r, s = check_bounds()
    SAT[0] = 0
    vs = vectors()
    files = {TABLES: swift_tables(), GOLDEN: swift_golden(vs)}
    bad = 0
    for path, text in files.items():
        if write:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            open(path, 'w').write(text)
        elif not os.path.exists(path) or open(path).read() != text:
            print(f"DIFFERS from the reference: {os.path.relpath(path, ROOT)} (run tools/checks/core_reference.py --write)")
            bad = 1
    print(f"core reference: exp2 rel {e:.2e}, log2 abs {l:.2e}, round trip rel {r:.2e}, logistic abs {s:.2e}; "
          f"{sum(len(rows) for _, _, rows, _ in vs)} vectors, {SAT[0]} saturations; {'written' if write else ('FAIL' if bad else 'OK')}")
    sys.exit(bad)


if __name__ == '__main__':
    main()
