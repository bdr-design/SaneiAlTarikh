#!/usr/bin/env python3
"""The reference model of SaneiCore's determinism kit (design_doc §2.3, ADR 0002).

The arithmetic of Sources/SaneiCore's fixed-point types, DMath, DetRNG and GameDate is written here a second time, in
exact integer arithmetic. From it come two generated Swift files:

  Sources/SaneiCore/DMathTables.swift       the exp2 and log2 tables (1,025 entries each), correctly rounded
  Tests/SaneiCoreTests/CoreGolden.swift     rows of inputs, outputs and the clamps counted, which the Swift tests
                                            must reproduce exactly

  --write   regenerate both files
  --check   (default) fail if a committed file differs, a bound or a known value does not hold, or the Swift tests do
            not read a family

Where an independent truth exists the model is checked against it, row by row: exact fractions for the rounding and
the clamps, 60-digit decimals for the table maths (never the platform's libm), Python's own calendar for the dates,
SplitMix64's published sequence.
"""
import sys, os, re, datetime, calendar
from decimal import Decimal, getcontext
from fractions import Fraction

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


# ---- exact shares and helpers (T-038) ----
def mul_div(a, n, d):
    """a * n / d to the nearest whole, ties away from zero; clamped and counted. d = 0 is counted: 0 when the product
    is 0 too, anything else the end of the range on the product's side."""
    if d == 0:
        SAT[0] += 1
        return 0 if a * n == 0 else (I64_MIN if a * n < 0 else I64_MAX)
    return sat64(rdiv(a * n, d))


def held(v, lo, hi): return lo if v < lo else hi if v > hi else v


def q_ratio_within(n, d, lo, hi):
    """n / d as a Q32, held inside [lo, hi]; never counted."""
    if d == 0: return held(0 if n == 0 else (I64_MIN if n < 0 else I64_MAX), lo, hi)
    return held(held(rdiv(n << 32, d), I64_MIN, I64_MAX), lo, hi)


def bp_ratio_within(n, d, lo, hi):
    if d == 0: return held(0 if n == 0 else (I64_MIN if n < 0 else I64_MAX), lo, hi)
    return held(rdiv(n * 10000, d), lo, hi)


def split(whole, weights):
    """The largest-remainder split: parts in proportion to the weights that add up to the whole."""
    count = len(weights)
    if count == 0:
        if whole != 0: SAT[0] += 1
        return []
    ws = []
    for w in weights:
        if w < 0: SAT[0] += 1
        ws.append(max(w, 0))
    if sum(ws) > M64:
        SAT[0] += 1
        while sum(ws) > M64: ws = [w >> 1 for w in ws]
    total = sum(ws)
    if total == 0: ws, total = [1] * count, count
    size = abs(whole)
    floors = [size * w // total for w in ws]
    rems = [size * w % total for w in ws]
    left = size - sum(floors)
    # the units left over: the largest remainders, the earlier part first among equals
    order = sorted(range(count), key=lambda i: (-rems[i], i))
    for i in order[:left]: floors[i] += 1
    return [-q if whole < 0 else q for q in floors]


def split_truth(whole, weights):
    """What a split must be, said without the algorithm: exact fractions, and the rule's own words."""
    parts, n = counted(lambda: split(whole, weights))
    if not weights: return ([], 1 if whole != 0 else 0)
    assert sum(parts) == whole, (whole, weights)
    ws = [max(w, 0) for w in weights]
    clamps = sum(1 for w in weights if w < 0) + (1 if sum(ws) > M64 else 0)
    if sum(ws) <= M64:
        total = sum(ws)
        exact = [Fraction(whole * w, total) if total else Fraction(whole, len(ws)) for w in ws]
        for part, x in zip(parts, exact):
            assert abs(part - x) < 1 and (part == 0 or (part < 0) == (whole < 0)), (whole, weights)
        # a part rounded up never lost less by the rounding than a part rounded down; among equals the earlier is up
        lost = [abs(x) - abs(x).__floor__() for x in exact]
        ups = [i for i, (part, x) in enumerate(zip(parts, exact)) if abs(part) > abs(x).__floor__()]
        downs = [i for i in range(len(ws)) if i not in ups]
        for u in ups:
            for dn in downs: assert lost[u] > lost[dn] or (lost[u] == lost[dn] and u < dn), (whole, weights, u, dn)
    return (parts, clamps)


def log2_bits(r):
    """log2 of a whole number above 0, with 32 binary places."""
    p = r.bit_length() - 1
    u = (r << (63 - p)) & M64
    i, t = (u >> 53) & 0x3FF, (u >> 21) & 0xFFFFFFFF
    return (p << 32) + LOG2[i] + (((LOG2[i + 1] - LOG2[i]) * t + (1 << 31)) >> 32)


def log2_ratio(n, d):
    if n <= 0 or d <= 0:
        SAT[0] += 1
        return I64_MIN if n <= 0 else I64_MAX
    return log2_bits(n) - log2_bits(d)


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
    assert ((p - 32) << 32) + l == log2_bits(x) - (32 << 32)
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
        """Each coordinate mixed in on its own: the seed, then the key, then stream and serial."""
        game = mix64((seed + GOLD) & M64)
        day = mix64((game + GOLD + (key & M64)) & M64)
        return cls(mix64((day + GOLD + ((stream << 32) | serial)) & M64))

    def next(self):
        self.state = (self.state + GOLD) & M64
        return mix64(self.state)

    def below(self, n): return (self.next() * n) >> 64
    def bp(self): return self.below(10000)
    def chance(self, p): return self.bp() < p

    def chance_in(self, n, d):
        draw = self.below(d)
        return d != 0 and draw < n

    def pick(self, weights):
        """A position with a chance in proportion to its weight, or -1 with no draw when no weight is above 0."""
        total = 0
        for w in weights:
            if w <= 0: continue
            if total + w > M64:
                SAT[0] += 1
                total = M64
                break
            total += w
        if total == 0: return -1
        left = self.below(total)
        for i, w in enumerate(weights):
            if w > 0:
                if left < w: return i
                left -= w
        raise AssertionError('the draw is below the sum')

    def shuffle(self, items):
        n = len(items)
        while n > 1:
            j = self.below(n)
            n -= 1
            items[n], items[j] = items[j], items[n]
        return items


# ---- GameDate (days since 1970-01-01, proleptic Gregorian) ----
DAY_MIN, DAY_MAX = -43829, 84370                 # 1850-01-01 and 2200-12-31


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


def is_leap(y): return y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)
def days_in(m, y): return [31, 29 if is_leap(y) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] if 1 <= m <= 12 else 0
def weekday(z): return (z + 4) % 7               # 0 = Sunday; 1970-01-01 was a Thursday


def add_days(z, n):
    """The day `n` days on, held at the ends of the supported range and counted there."""
    s = z + n
    if DAY_MIN <= s <= DAY_MAX: return s
    SAT[0] += 1
    return DAY_MIN if s < DAY_MIN else DAY_MAX


def add_months(z, n):
    """The same day `n` months on (a day past the month's end becomes its last day), held at the ends and counted."""
    y, m, d = civil_from_days(z)
    total = y * 12 + (m - 1) + n
    y2, m2 = total // 12, total % 12 + 1
    if 1850 <= y2 <= 2200: return days_from_civil(y2, m2, min(d, days_in(m2, y2)))
    SAT[0] += 1
    return DAY_MIN if y2 < 1850 else DAY_MAX


def start_of_month(z): return add_days(z, 1 - civil_from_days(z)[2])


# ---- independent truths ----
EPOCH = datetime.date(1970, 1, 1)
PY_MIN, PY_MAX = (datetime.date(1, 1, 1) - EPOCH).days, (datetime.date(9999, 12, 31) - EPOCH).days


def near(x):
    """A fraction to the nearest integer, ties away from zero: the rounding rule, stated without rdiv."""
    x = Fraction(x)
    n = abs(x.numerator) // x.denominator
    if abs(x) - n >= Fraction(1, 2): n += 1
    return -n if x < 0 else n


def want(x, lo, hi):
    """The rounded value clamped to [lo, hi], and whether it had to be clamped."""
    v = near(x)
    return (lo, 1) if v < lo else (hi, 1) if v > hi else (v, 0)


def want64(x): return want(x, I64_MIN, I64_MAX)
def want32(x): return want(x, I32_MIN, I32_MAX)


def by_zero(a, lo, hi): return (0 if a == 0 else (hi if a > 0 else lo), 1)


def counted(fn):
    before = SAT[0]
    v = fn()
    return v, SAT[0] - before


def py_date(z): return EPOCH + datetime.timedelta(days=z)


def py_add_months(z, n):
    """Month arithmetic through Python's own calendar; None when it leaves the years Python knows."""
    if not PY_MIN <= z <= PY_MAX: return None
    d = py_date(z)
    y2, m2 = divmod(d.year * 12 + d.month - 1 + n, 12)
    if not 1 <= y2 <= 9999: return None
    return (datetime.date(y2, m2 + 1, min(d.day, calendar.monthrange(y2, m2 + 1)[1])) - EPOCH).days


# ---- checks ----
def check_bounds():
    """The accuracy the design asks for (§2.3: 1e-6) and the tighter numbers the code's comments state."""
    two, ln2 = Decimal(2), Decimal(2).ln()
    g = RNG.keyed(20110101, 0, 0, 0)
    worst_e = worst_l = worst_r = Decimal(0)
    ys = [g.next() % (61 * ONE) - 30 * ONE for _ in range(4000)] + [i << 22 for i in range(1025)] + [(i << 22) + (1 << 21) for i in range(1024)]
    ys += [30 * ONE + (i << 22) + (1 << 21) for i in range(1024)] + [-(g.next() % (40 * ONE)) for _ in range(2000)]
    for y in ys:
        if y >= 31 * ONE: continue
        true = two ** (Decimal(y) / ONE) * ONE
        err = abs(Decimal(exp2(y)) - true)
        assert err <= true * Decimal('6e-8') + 1, y              # below 1 the result's own last bit is the limit
        if y >= 0: worst_e = max(worst_e, err / true)
    xs = [(g.next() % (1 << 62)) + 1 for _ in range(4000)] + [ONE + (i << 22) + (1 << 21) for i in range(1024)]
    xs += [(g.next() % (1 << 40)) + (1 << 20) for _ in range(2000)] + [(1 << 62) + (g.next() % (1 << 62)) for _ in range(1000)]
    for x in xs:
        true = (Decimal(x) / ONE).ln() / ln2
        worst_l = max(worst_l, abs(Decimal(log2(x)) / ONE - true))
        if x >= ONE and log2(x) < 31 * ONE:
            worst_r = max(worst_r, abs(Decimal(exp2(log2(x))) - x) / x)
    assert worst_e <= Decimal('6e-8'), worst_e                   # the numbers DMath.swift and ADR 0002 state
    assert worst_l <= Decimal('2e-7'), worst_l
    assert worst_r <= Decimal('2e-7'), worst_r
    worst_s = Decimal(0)
    for x in [-40 * ONE + (g.next() % (80 * ONE)) for _ in range(3000)] + [8931133415, -8931133415, 17862266830, 8334305841]:
        true = Decimal(1) / (Decimal(1) + (-(Decimal(x) / ONE)).exp())
        worst_s = max(worst_s, abs(Decimal(logistic(x)) / ONE - true))
        assert logistic(x) + logistic(-x) == ONE
    assert worst_s <= Decimal('2e-8'), worst_s
    assert logistic(0) == ONE // 2
    # every whole power of two a Q32 holds is exact both ways
    for k in range(-32, 31): assert exp2(k * ONE) == (1 << (32 + k)) and log2(1 << (32 + k)) == k * ONE, k
    # a product by a level against decimals, at every size of shift
    for a, y in [(g.next() % (1 << 50) + 1, g.next() % (60 * ONE) - 40 * ONE) for _ in range(3000)]:
        true = Decimal(a) * two ** (Decimal(y) / ONE)
        if true * Decimal('1.000001') < I64_MAX:
            v, sat = counted(lambda: scale(a, y))
            assert sat == 0 and abs(Decimal(v) - true) <= true * Decimal('6e-8') + 1, (a, y)
            assert scale(-a, y) == -v
    # roots: never above the true root; one step below 1, within 2^-30 relative from 1 up
    for x in [g.next() % (1 << 63) for _ in range(3000)] + [g.next() % ONE for _ in range(2000)] + [0, 1, 2, 3, 4, (1 << 62), I64_MAX]:
        r = q_sqrt(x)
        true = (Decimal(x) / ONE).sqrt() * ONE
        assert r <= true and (true - r < 1 if x < ONE else (true - r) / true < Decimal(2) ** -30), x
    # the rounded quotient that needs 65 bits (2^64 exactly) must clamp, never wrap to 0
    n229 = ((229 << 64) - 64) // 10000
    assert n229 * 10000 == (229 << 64) - 64 and n229 <= I64_MAX and rdiv(n229 * 10000, 229) == 1 << 64
    assert counted(lambda: bp_ratio(n229, 229)) == (I32_MAX, 1)
    SAT[0] = 0                                                   # that clamp was the point
    for n in [g.next() for _ in range(3000)] + [0, 1, 2, 3, 4, 15, 16, 17, M64, (1 << 32) ** 2 - 1, (1 << 32) ** 2]:
        r = isqrt(n & M64)
        assert r * r <= (n & M64) < (r + 1) * (r + 1)
    # never out of order: around every knot of both tables, and on a stride between
    for n in range(-36, 31):
        prev = exp2((n << 32) - 2)
        for i in range(1025):
            for y in ((n << 32) + (i << 22) + k for k in (-1, 0, 1)):
                if y >= 31 * ONE: continue
                v = exp2(y); assert v >= prev, y; prev = v
    for p in range(11, 63):
        prev = log2((1 << p) - 2)
        for i in range(1025):
            for x in ((1 << p) + ((i << p) >> 10) + k for k in (-1, 0, 1)):
                if x > I64_MAX: continue
                v = log2(x); assert v >= prev, x; prev = v
    prev = 0
    for y in range(-3 * ONE, 3 * ONE, 104729):
        v = exp2(y); assert v >= prev; prev = v
    # the calendar: every day of 1850-2200 is the day Python says, with its weekday, there and back
    assert (days_from_civil(1850, 1, 1), days_from_civil(2200, 12, 31)) == (DAY_MIN, DAY_MAX)
    assert days_from_civil(2011, 1, 1) == 14975 and days_from_civil(1970, 1, 1) == 0
    for z in range(DAY_MIN, DAY_MAX + 1):
        c = civil_from_days(z)
        d = py_date(z)
        assert days_from_civil(*c) == z and c == (d.year, d.month, d.day)
        assert weekday(z) == (d.weekday() + 1) % 7
    for y in range(1850, 2201):
        for m in range(1, 13): assert days_in(m, y) == calendar.monthrange(y, m)[1] and is_leap(y) == calendar.isleap(y)
    # SplitMix64's published sequence for seed 1234567
    r = RNG(1234567)
    assert [r.next() for _ in range(5)] == [6457827717110365317, 3203168211198807973, 9817491932198370423,
                                             4593380528125082431, 16408922859458223821]
    # no two (seed, day) pairs share a generator: 250 seeds over 440 days
    states = {RNG.keyed(s, 14975 + d, 3, 77).state for s in range(250) for d in range(440)}
    assert len(states) == 250 * 440 and RNG.keyed(1, 0, 0, 0).state != RNG.keyed(0, 1, 0, 0).state
    assert SAT[0] == 0, 'the bounds checks must not clamp'
    return worst_e, worst_l, worst_r, worst_s


class Families(list):
    """The golden families. Every row ends with the clamps the reference counted for that row alone."""

    def add(self, name, types, rows, truth=None):
        """`rows` are (inputs, lambda) pairs; `truth(*inputs)` is the independent (value, clamps), or None."""
        out = []
        for inputs, fn in rows:
            v, n = counted(fn)
            vs = v if isinstance(v, tuple) else (v,)
            if truth is not None:
                t = truth(*inputs)
                assert t is None or t == (v, n), (name, inputs, (v, n), t)
            out.append(tuple(inputs) + vs + (n,))
        assert len(out) >= 5, name
        self.append((name, '(' + ', '.join(types + ['UInt64']) + ')', out))

    def stream(self):
        """Each family draws its random rows from a stream of its own, so adding a family changes no other."""
        return RNG.keyed(0x5A4E4549, 0, len(self) + 1, 0)


def vectors():
    fs = Families()
    I64, I32, U64, U32 = 'Int64', 'Int32', 'UInt64', 'UInt32'

    def s64(g, bits): return (g.next() % (1 << bits)) - (1 << (bits - 1))
    edge = [0, 1, -1, ONE, -ONE, ONE // 2, 3 * ONE, I64_MAX, I64_MIN, I64_MAX - 1, I64_MIN + 1, 1 << 31, -(1 << 31), 10000 * ONE]

    def pairs(g): return [(a, b) for a in edge for b in edge[:9]] + [(s64(g, 40), s64(g, 40)) for _ in range(40)] + [(s64(g, 63), s64(g, 34)) for _ in range(20)]

    def div_truth(a, b): return by_zero(a, I64_MIN, I64_MAX) if b == 0 else want64(Fraction(a * ONE, b))
    g = fs.stream()
    fs.add('q32Add', [I64, I64, I64], [((a, b), lambda a=a, b=b: q_add(a, b)) for a, b in pairs(g)[:70]], lambda a, b: want64(a + b))
    g = fs.stream()
    fs.add('q32Sub', [I64, I64, I64], [((a, b), lambda a=a, b=b: q_sub(a, b)) for a, b in pairs(g)[:70]], lambda a, b: want64(a - b))
    g = fs.stream()
    fs.add('q32Neg', [I64, I64], [((a,), lambda a=a: q_neg(a)) for a in edge + [s64(g, 60) for _ in range(6)]], lambda a: want64(-a))
    g = fs.stream()
    fs.add('q32Mul', [I64, I64, I64], [((a, b), lambda a=a, b=b: q_mul(a, b)) for a, b in pairs(g)], lambda a, b: want64(Fraction(a * b, ONE)))
    g = fs.stream()
    fs.add('q32Div', [I64, I64, I64], [((a, b), lambda a=a, b=b: q_div(a, b)) for a, b in pairs(g)], div_truth)
    g = fs.stream()
    ratios = [(1, 3), (2, 3), (-1, 3), (1, -3), (5, 0), (0, 0), (-5, 0), (I64_MAX, 1), (1 << 31, 1), ((1 << 31) - 1, 1), (-(1 << 31), 1), (7, 1 << 40), (I64_MIN, I64_MAX), (I64_MIN, -1), (5_000_000, 20_000_000), (3, 1 << 33)]
    fs.add('q32Ratio', [I64, I64, I64], [((a, b), lambda a=a, b=b: q_div_raw(a, b)) for a, b in ratios + [(s64(g, 50), s64(g, 30)) for _ in range(20)]], div_truth)
    g = fs.stream()
    applies = [(ONE, 5), (ONE // 2, 5), (ONE // 2, -5), (ONE // 2, 3), (-ONE // 2, 3), (3 * ONE, I64_MAX), (ONE, I64_MIN), (I64_MAX, 2), (1, 1 << 31), (1, (1 << 31) - 1),
               (I64_MIN, 1), (I64_MIN, -1), (I64_MIN, I64_MIN), (I64_MAX, I64_MAX), (I64_MIN, 0), (0, I64_MIN)]
    fs.add('q32Apply', [I64, I64, I64], [((q, a), lambda q=q, a=a: q_apply(q, a)) for q, a in applies + [(s64(g, 36), s64(g, 60)) for _ in range(30)]], lambda q, a: want64(Fraction(q * a, ONE)))
    g = fs.stream()
    rounds = [0, 1, -1, ONE // 2, -ONE // 2, ONE // 2 - 1, -ONE // 2 - 1, ONE + ONE // 2, -ONE - ONE // 2, I64_MAX, I64_MIN] + [s64(g, 45) for _ in range(12)]
    fs.add('q32Round', [I64, I64, I64], [((q,), lambda q=q: (q_floor(q), q_round(q))) for q in rounds],
           lambda q: ((Fraction(q, ONE).__floor__(), near(Fraction(q, ONE))), 0))
    fs.add('q32FromInt', [I64, I64], [((i,), lambda i=i: q_from_int(i)) for i in [0, 1, -1, (1 << 31) - 1, 1 << 31, -(1 << 31), -(1 << 31) - 1, I64_MAX, I64_MIN, 2011]], lambda i: want64(i * ONE))
    bps = [0, 1, -1, 10000, -10000, 5000, 3333, I32_MAX, I32_MIN, 12345, -9999]
    amts = [0, 1, -1, 2, 3, -3, 10000, 5000, 15000, I64_MAX, I64_MIN, 1 << 60, -(1 << 60), 123456789012345]
    g = fs.stream()
    fs.add('bpOf', [I32, I64, I64], [((b, a), lambda b=b, a=a: bp_of(b, a)) for b, a in [(b, a) for b in bps for a in amts] + [(s64(g, 20), s64(g, 62)) for _ in range(20)]], lambda b, a: want64(Fraction(b * a, 10000)))
    bb = [(a, b) for a in bps for b in bps]
    fs.add('bpAdd', [I32, I32, I32], [((a, b), lambda a=a, b=b: bp_add(a, b)) for a, b in bb], lambda a, b: want32(a + b))
    fs.add('bpSub', [I32, I32, I32], [((a, b), lambda a=a, b=b: bp_sub(a, b)) for a, b in bb], lambda a, b: want32(a - b))
    fs.add('bpMul', [I32, I32, I32], [((a, b), lambda a=a, b=b: bp_mul(a, b)) for a, b in bb], lambda a, b: want32(Fraction(a * b, 10000)))
    fs.add('bpNeg', [I32, I32], [((a,), lambda a=a: sat32(-a)) for a in bps], lambda a: want32(-a))
    g = fs.stream()
    n229 = ((229 << 64) - 64) // 10000
    bratios = [(1, 2), (1, 3), (2, 3), (-1, 3), (1, -3), (0, 5), (5, 0), (0, 0), (-5, 0), (I64_MAX, 1), (I64_MIN, 1), (I64_MAX, I64_MAX), (I64_MIN, I64_MAX), (1, I64_MAX), (214748, 1), (214749, 1), (1, 20000), (3, 20000), (I64_MAX, I64_MIN), (n229, 229), (-n229, 229), (5_000_000, 20_000_000), (1, 6)]
    fs.add('bpRatio', ['Int64', 'Int64', I32], [((a, b), lambda a=a, b=b: bp_ratio(a, b)) for a, b in bratios + [(s64(g, 55), s64(g, 50)) for _ in range(20)]],
           lambda a, b: by_zero(a, I32_MIN, I32_MAX) if b == 0 else want32(Fraction(a * 10000, b)))
    fs.add('bpToQ32', [I32, I64], [((b,), lambda b=b: bp_to_q(b)) for b in bps + [1234, 9999, 2, 3]], lambda b: (near(Fraction(b * ONE, 10000)), 0))
    qbps = [0, ONE, -ONE, ONE // 2, ONE // 3, I64_MAX, I64_MIN, 214748 * ONE, 214749 * ONE, 429497, 214748, 214749, 1 << 27, -(1 << 27), 3 << 27, 1844674407370955, -1844674407370955] + [bp_to_q(b) for b in bps]
    fs.add('qToBP', [I64, I32], [((q,), lambda q=q: q_to_bp(q)) for q in qbps], lambda q: want32(Fraction(q * 10000, ONE)))
    two, ln2 = Decimal(2), Decimal(2).ln()

    def exp2_truth(y):
        if -64 * ONE <= y < 31 * ONE:
            true = two ** (Decimal(y) / ONE) * ONE
            assert abs(Decimal(exp2(y)) - true) <= true * Decimal('6e-8') + 1, y
        return None

    def log2_truth(x):
        if x > 0: assert abs(Decimal(log2(x)) / ONE - (Decimal(x) / ONE).ln() / ln2) <= Decimal('2e-7'), x
        return None

    def scale_truth(a, y):
        true = Decimal(abs(a)) * two ** (Decimal(max(min(y, 200 * ONE), -200 * ONE)) / ONE)
        if true * Decimal('1.000001') < I64_MAX:
            v, n = counted(lambda: scale(a, y))
            assert n == 0 and abs(Decimal(abs(v)) - true) <= true * Decimal('6e-8') + 1 and (v < 0) == (a < 0 and v != 0), (a, y)
        elif true > Decimal(I64_MAX) * Decimal('1.000001') and abs(y) <= 200 * ONE:
            assert counted(lambda: scale(a, y)) == (I64_MIN if a < 0 else I64_MAX, 1), (a, y)
        return None
    g = fs.stream()
    ys = [0, 1, -1, ONE, -ONE, ONE // 2, -ONE // 2, 30 * ONE, 31 * ONE - 1, 31 * ONE, -31 * ONE, -32 * ONE, -33 * ONE, -33 * ONE - 1, -34 * ONE, -64 * ONE, -90 * ONE, I64_MAX, I64_MIN, (1 << 22) - 1, 1 << 22, 1023 << 22, (1024 << 22) - 1, 18874368, 30 * ONE + (1023 << 22) + 12345]
    fs.add('exp2', [I64, I64], [((y,), lambda y=y: exp2(y)) for y in ys + [s64(g, 37) for _ in range(40)]], exp2_truth)
    g = fs.stream()
    xs = [1, 2, 3, ONE, ONE - 1, ONE + 1, 2 * ONE, 2 * ONE - 1, 3 * ONE, ONE // 2, I64_MAX, I64_MAX - 743440383, I64_MAX - 743440384, 1 << 62, (1 << 62) - 1, 0, -1, I64_MIN, 10 * ONE, 1000 * ONE, 4297064448]
    fs.add('log2', [I64, I64], [((x,), lambda x=x: log2(x)) for x in xs + [(g.next() % (1 << 62)) + 1 for _ in range(30)] + [(g.next() % (1 << 34)) + 1 for _ in range(10)]], log2_truth)
    g = fs.stream()
    sc = [(1000, 0), (1000, ONE), (1000, -ONE), (1000, ONE // 2), (-1000, ONE // 2), (1, -ONE), (3, -ONE), (-3, -ONE), (1, -2 * ONE), (I64_MAX, 0), (I64_MIN, 0), (I64_MAX, 1), (I64_MIN, 1), (1, 62 * ONE), (1, 63 * ONE), (-1, 63 * ONE), (-1, 64 * ONE), (0, 200 * ONE), (5, 200 * ONE), (1 << 62, -62 * ONE), (I64_MAX, -63 * ONE), (I64_MAX, -64 * ONE), (I64_MAX, -200 * ONE), (I64_MAX, I64_MIN), (7, I64_MAX), (0, I64_MAX), (123456789, 31 * ONE + 12345), (3, 61 * ONE + ONE // 2), (1, 95 * ONE), (1 << 40, -96 * ONE), (I64_MAX, -127 * ONE), (I64_MAX, -128 * ONE), (I64_MAX, -129 * ONE)]
    # every size of shift: the carry of the rounding add, a shift of exactly 64, the clamp of the high half each way
    sc += [(4294967295, -ONE), (1 << 31, -32 * ONE), (3 << 31, -32 * ONE), (1 << 40, -32 * ONE), (-(1 << 40) - 1, -32 * ONE + 12345), (1 << 62, 2 * ONE), (-(1 << 62), 2 * ONE), (1 << 32, 32 * ONE), (-(1 << 40), 40 * ONE), (1 << 31, 32 * ONE), (10 ** 12, -15 * ONE + 987654321), (123456789, 20 * ONE + 55555), (I64_MAX, -50 * ONE), (10 ** 12, 1 << 21)]
    fs.add('scale', [I64, I64, I64], [((a, y), lambda a=a, y=y: scale(a, y)) for a, y in sc + [(s64(g, 50), s64(g, 36)) for _ in range(30)]], scale_truth)
    g = fs.stream()
    ns = [0, 1, 2, 3, 4, 8, 9, 15, 16, 17, 24, 25, 26, M64, M64 - 1, (1 << 32) ** 2 - 1, 1 << 62, (1 << 63) - 1, 1 << 63, 4294967295 * 4294967295, 4294967295 * 4294967295 - 1]

    def isqrt_truth(n):
        r = isqrt(n)
        assert r * r <= n < (r + 1) * (r + 1)
        return (r, 0)
    fs.add('isqrt', [U64, U64], [((n,), lambda n=n: isqrt(n)) for n in ns + [g.next() for _ in range(15)] + [g.next() >> 30 for _ in range(10)]], isqrt_truth)
    g = fs.stream()
    qs = [0, 1, 2, 4, ONE, ONE - 1, ONE + 1, 4 * ONE, 2 * ONE, ONE // 4, ONE // 16, ONE // 16 - 1, I64_MAX, 1 << 62, -1, I64_MIN, 100 * ONE, 1 << 33, (1 << 33) - 1, 1 << 31, 42949673]
    def sqrt_truth(q):
        if q < 0: return (0, 1)
        r, true = q_sqrt(q), (Decimal(q) / ONE).sqrt() * ONE
        assert r <= true and (true - r < 1 if q < ONE else (true - r) / true < Decimal(2) ** -30), q
        return None
    fs.add('q32Sqrt', [I64, I64], [((q,), lambda q=q: q_sqrt(q)) for q in qs + [g.next() >> 1 for _ in range(15)] + [g.next() >> 33 for _ in range(10)]], sqrt_truth)
    g = fs.stream()
    ls = [0, 1, -1, ONE, -ONE, 5 * ONE, -5 * ONE, 45 * ONE, 46 * ONE - 1, 46 * ONE, -46 * ONE, 100 * ONE, I64_MAX, I64_MIN, ONE // 1000, 8931133415, -8931133415, 17862266830, 8334305841]
    def logistic_truth(x):
        t = (-(Decimal(abs(x)) / ONE)).exp()                        # e^-|x|: never too large for a decimal
        low = t / (1 + t)
        assert abs(Decimal(logistic(x)) / ONE - (low if x < 0 else 1 - low)) <= Decimal('2e-8'), x
        return None
    fs.add('logistic', [I64, I64], [((x,), lambda x=x: logistic(x)) for x in ls + [s64(g, 38) for _ in range(30)]], logistic_truth)
    seq = RNG(1234567)
    fs.add('rngSeq', [U64], [((), lambda: seq.next()) for _ in range(8)])
    keys = [(0, 0, 0, 0), (1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1), (2011, 14975, 3, 77), (2011, 14976, 3, 77), (2012, 14974, 3, 77), (2012, 14975, 3, 77), (2011, 14975, 4, 77), (2011, 14975, 3, 78), (M64, -1, 0xFFFFFFFF, 0xFFFFFFFF), (0xDEADBEEF, -43829, 12, 4000000000), (42, 84370, 1, 2),
            (7, I64_MAX, 1, 2), (7, I64_MIN, 1, 2), (0xFEDCBA9876543210, 0x0123456789ABCDEF, 0x89ABCDEF, 0x76543210),
            (0x7EDCBA9876543210, -0x0123456789ABCDEF, 0x89ABCDEF, 0x76543210), (0xFEDCBA9876543210, 0x0123456709ABCDEF, 0x89ABCDEF, 0x76543210)]

    def three(seed, key, stream, serial):
        k = RNG.keyed(seed, key, stream, serial)
        return (k.next(), k.next(), k.next())
    fs.add('rngKeyed', [U64, I64, U32, U32, U64, U64, U64], [((a, b, c, d), lambda a=a, b=b, c=c, d=d: three(a, b, c, d)) for a, b, c, d in keys])
    assert len({r[4] for r in fs[-1][2]}) == len(keys), 'no two of these keys share a first draw'
    b = RNG.keyed(7, 7, 7, 7)
    fs.add('rngBelow', [U64, U64], [((n,), lambda n=n: b.below(n)) for n in [1, 2, 3, 10, 10000, 1 << 32, M64, 6, 6, 6, 100, 100, 1000000007, 1 << 63, 0]])
    b2 = RNG.keyed(9, 9, 9, 9)
    fs.add('rngBP', [I32], [((), lambda: b2.bp()) for _ in range(16)])
    b3 = RNG.keyed(5, 5, 5, 5)
    fs.add('rngChance', [I32, I32], [((p,), lambda p=p: int(b3.chance(p))) for p in [-1, 0, 1, 2500, 5000, 9999, 10000, 10001, I32_MAX, I32_MIN] * 3])
    ds = [(1850, 1, 1), (1899, 12, 31), (1900, 2, 28), (1900, 3, 1), (1969, 12, 31), (1970, 1, 1), (2000, 2, 29), (2011, 1, 1), (2011, 1, 25), (2011, 7, 9), (2012, 2, 29), (2100, 2, 28), (2100, 3, 1), (2200, 12, 31), (1979, 2, 11), (1990, 8, 2), (2026, 1, 1)]
    fs.add('dates', [I32, I32, I32, I32, I32], [((y, m, d), lambda y=y, m=m, d=d: (days_from_civil(y, m, d), weekday(days_from_civil(y, m, d)))) for y, m, d in ds],
           lambda y, m, d: (((datetime.date(y, m, d) - EPOCH).days, (datetime.date(y, m, d).weekday() + 1) % 7), 0))
    fs.add('monthFacts', [I32, I32, I32, I32], [((y, m), lambda y=y, m=m: (days_in(m, y), int(is_leap(y)))) for y, m in [(2011, 2), (2012, 2), (1900, 2), (2000, 2), (2100, 2), (2011, 1), (2011, 4), (2011, 12), (2011, 0), (2011, 13), (1850, 6), (2200, 9), (2011, -1),
           (I32_MAX, 12), (I32_MIN, 1), (2011, I32_MAX), (2011, I32_MIN), (-4, 2), (0, 2)]],
           lambda y, m: ((calendar.monthrange(y, m)[1] if 1 <= m <= 12 and 1 <= y <= 9999 else days_in(m, y), int(calendar.isleap(y))), 0))
    INT_MAX, INT_MIN = I64_MAX, I64_MIN
    I32MAX, I32MIN = I32_MAX, I32_MIN
    d2011 = days_from_civil(2011, 1, 31)
    starts = [d2011, DAY_MIN, DAY_MAX, 0, days_from_civil(2012, 2, 29), DAY_MAX + 1, DAY_MIN - 1, 90000, -719528, I32MIN, I32MAX]

    def add_days_truth(z, n):
        if PY_MIN <= z <= PY_MAX and PY_MIN <= z + n <= PY_MAX:
            s = (py_date(z) + datetime.timedelta(days=n) - EPOCH).days
            return want(s, DAY_MIN, DAY_MAX)
        return None
    fs.add('dateAddDays', [I32, I64, I32], [((z, n), lambda z=z, n=n: add_days(z, n)) for z in starts for n in [0, 1, -1, 31, -31, 365, 100000, -100000, INT_MAX, INT_MIN]], add_days_truth)

    def add_months_truth(z, n):
        s = py_add_months(z, n)
        if s is None: return None
        return (s, 0) if 1850 <= py_date(s).year <= 2200 else want(s, DAY_MIN, DAY_MAX)[0:1] + (1,)
    months = [0, 1, -1, 2, -2, 12, 13, 1068, -1932, 2280, 1 << 40, -(1 << 40), INT_MAX, INT_MIN, INT_MIN + 7, INT_MIN + 8, INT_MIN + 70_531_687]
    fs.add('dateAddMonths', [I32, I64, I32], [((z, n), lambda z=z, n=n: add_months(z, n)) for z in starts for n in months], add_months_truth)
    fs.add('startOfMonth', [I32, I32], [((z,), lambda z=z: start_of_month(z)) for z in starts + [days_from_civil(2011, 3, 1), days_from_civil(2100, 2, 28)]],
           lambda z: ((py_date(z).replace(day=1) - EPOCH).days, 0) if DAY_MIN <= z <= DAY_MAX else None)
    g = fs.stream()
    defl = [(3000, 0), (3000, ONE), (3000, -ONE), (-3000, ONE // 2), (0, I64_MIN), (5, I64_MIN), (-5, I64_MIN), (I64_MAX, -1), (I64_MAX, 1), (1 << 40, 40 * ONE), (15_600_000_000, 2 * ONE + 12345),
            (I64_MIN, 0), (I64_MIN, ONE), (I64_MIN, -ONE), (5, I64_MAX), (I64_MAX, I64_MAX), (I64_MIN, I64_MAX), (I64_MIN, I64_MIN)]

    def deflate(nominal, d):
        return scale(nominal, q_neg(d))
    fs.add('moneyDeflated', [I64, I64, I64], [((a, d), lambda a=a, d=d: deflate(a, d)) for a, d in defl + [(s64(g, 45), s64(g, 34)) for _ in range(10)]],
           lambda a, d: scale_truth(a, -d) if d != I64_MIN else None)
    shares(fs, s64)
    return fs


def shares(fs, s64):
    """T-038: sums that close, exact n / d, bounded ratios, logarithms of ratios, finer chances, choices, people."""
    I64, I32, U64 = 'Int64', 'Int32', 'UInt64'
    g = fs.stream()
    big = 10 ** 15
    mds = [(big, 1, 7), (big, 2, 3), (-big, 1, 7), (big, -1, 7), (big, 1, -7), (10, 1, 4), (10, 3, 4), (-10, 1, 4), (5, 1, 2), (-5, 1, 2), (7, 0, 5),
           (0, 9, 0), (7, 1, 0), (-7, 1, 0), (7, -1, 0), (I64_MAX, I64_MAX, I64_MAX), (I64_MIN, I64_MIN, I64_MAX), (I64_MIN, 1, -1), (I64_MIN, -1, -1),
           (I64_MAX, 2, 1), (I64_MAX, 2, 2), (I64_MAX, 3, 2), (I64_MIN, 3, 3), (1, 1, I64_MIN), (I64_MAX, 1, I64_MIN), (I64_MIN, 1, I64_MIN),
           (3, 1, 2), (1, 1, 2), (-1, 1, 2), (1, 1, 3), (2, 1, 3), (300_000_000, 1, 225), ((1 << 62) + 1, 1 << 40, 1 << 39)]
    fs.add('mulDiv', [I64, I64, I64, I64], [((a, n, d), lambda a=a, n=n, d=d: mul_div(a, n, d)) for a, n, d in mds + [(s64(g, 62), s64(g, 40), s64(g, 38)) for _ in range(40)]],
           lambda a, n, d: by_zero(a * n, I64_MIN, I64_MAX) if d == 0 else want64(Fraction(a * n, d)))
    g = fs.stream()
    counts = [(1000, 3), (1000, -3), (-1000, 3), (0, 5), (5, 0), (I64_MAX, 1), (I64_MAX, 2), (I64_MIN, -1), (I64_MIN, 1), (I64_MAX, -2), (1 << 32, 1 << 31), (1 << 32, -(1 << 31)), (-(1 << 32), -(1 << 31)), (3_037_000_500, 3_037_000_500)]
    fs.add('amountTimesCount', [I64, I64, I64], [((a, n), lambda a=a, n=n: sat64(a * n)) for a, n in counts + [(s64(g, 40), s64(g, 26)) for _ in range(20)]], lambda a, n: want64(a * n))
    fs.add('amountDividedBy', [I64, I64, I64], [((a, n), lambda a=a, n=n: mul_div(a, 1, n)) for a, n in counts + [(10, 4), (-10, 4), (10, -4), (1, 2), (-1, 2), (I64_MIN, -1), (0, 0), (-3, 0)] + [(s64(g, 60), s64(g, 20)) for _ in range(20)]],
           lambda a, n: by_zero(a, I64_MIN, I64_MAX) if n == 0 else want64(Fraction(a, n)))
    g = fs.stream()
    pct8 = (-ONE * 8 // 100, ONE * 8 // 100)
    rws = [(5, 0, *pct8), (-5, 0, *pct8), (0, 0, *pct8), (0, 0, ONE, 2 * ONE), (1, 100, *pct8), (9, 100, *pct8), (-9, 100, *pct8), (8, 100, *pct8), (1, 3, 0, ONE), (4, 3, 0, ONE), (-1, 3, 0, ONE),
           (I64_MAX, 1, I64_MIN, I64_MAX), (I64_MIN, 1, I64_MIN, I64_MAX), (I64_MIN, -1, I64_MIN, I64_MAX), (I64_MAX, -1, -5, 5), (7, I64_MIN, I64_MIN, I64_MAX), (1, 2, ONE // 2, ONE // 2), (1, 2, I64_MIN, I64_MAX), (-1, 2, I64_MIN, I64_MAX)]
    fs.add('q32RatioWithin', [I64, I64, I64, I64, I64], [((n, d, lo, hi), lambda n=n, d=d, lo=lo, hi=hi: q_ratio_within(n, d, lo, hi)) for n, d, lo, hi in rws + [(s64(g, 50), s64(g, 30), -ONE, ONE) for _ in range(15)]],
           lambda n, d, lo, hi: (held(0 if n == 0 else (lo if n < 0 else hi), lo, hi) if d == 0 else held(near(Fraction(n * ONE, d)), lo, hi), 0))
    bws = [(5, 0, -800, 800), (-5, 0, -800, 800), (0, 0, -800, 800), (0, 0, 100, 200), (1, 100, -800, 800), (9, 100, -800, 800), (-9, 100, -800, 800), (1, 3, 0, 10000), (2, 3, 0, 10000), (4, 3, 0, 10000),
           (I64_MAX, 1, I32_MIN, I32_MAX), (I64_MIN, 1, I32_MIN, I32_MAX), (I64_MIN, -1, I32_MIN, I32_MAX), (1, 6, I32_MIN, I32_MAX), (1, 20000, 0, 10000), (3, 20000, 0, 10000), ((229 << 64) // 10000, 229, I32_MIN, I32_MAX)]
    fs.add('bpRatioWithin', [I64, I64, I32, I32, I32], [((n, d, lo, hi), lambda n=n, d=d, lo=lo, hi=hi: bp_ratio_within(n, d, lo, hi)) for n, d, lo, hi in bws + [(s64(g, 50), s64(g, 48), -20000, 20000) for _ in range(15)]],
           lambda n, d, lo, hi: (held(0 if n == 0 else (lo if n < 0 else hi), lo, hi) if d == 0 else held(near(Fraction(n * 10000, d)), lo, hi), 0))
    g = fs.stream()
    two_ln = Decimal(2).ln()

    def log_ratio_truth(n, d):
        if n > 0 and d > 0: assert abs(Decimal(log2_ratio(n, d)) / ONE - (Decimal(n) / Decimal(d)).ln() / two_ln) <= Decimal('4e-7'), (n, d)
        return None
    lrs = [(1, 1), (2, 1), (1, 2), (8, 1), (1, 8), (1, 20500), (20500, 1), (3, 1), (1, 3), (I64_MAX, 1), (1, I64_MAX), (I64_MAX, I64_MAX), (1 << 62, 1 << 31), (10, 4), (0, 5), (-1, 5), (5, 0), (5, -1), (0, 0), (-3, -3), (1, 18250), (1000003, 999983)]
    fs.add('logRatio', [I64, I64, I64], [((n, d), lambda n=n, d=d: log2_ratio(n, d)) for n, d in lrs + [((g.next() % (1 << 60)) + 1, (g.next() % (1 << 44)) + 1) for _ in range(20)]], log_ratio_truth)
    g = fs.stream()
    wide = [I64_MAX, I64_MAX, I64_MAX]
    sps = [(10000, [1, 1, 1, 1, 1, 1]), (10, [1, 1, 1, 1]), (300_000_000, [1] * 225), (10, [0, 0, 0]), (10, [0, 0, 5]), (-10, [1, 1, 1, 1]), (-7, [3, 1]), (7, [3, 1]), (0, [1, 2, 3]), (5, []), (0, []),
           (100, [1]), (100, [0]), (1, [1, 1, 1]), (2, [1, 1, 1]), (-1, [1, 1, 1]), (10, [5, -3, 5]), (10, [-1, -1]), (7, [2, 2, 2, 2, 2]), (I64_MAX, [1, 1]), (I64_MIN, [1, 1]), (I64_MIN, [1]), (I64_MAX, [I64_MAX, 1]),
           (1000, wide), (I64_MAX, wide), (I64_MIN, wide + [1]), (10000, [3271, 2910, 1885, 1002, 932]), (450, [7, 7, 7, 1]), (12, [1, 1, 1, 1, 1, 1, 1, 1]), (99, [50, 50]), (-99, [50, 50]), (3, [1, 2, 4, 8, 16])]
    for _ in range(30):
        n = 1 + g.next() % 12
        sps.append((s64(g, 40), [g.next() % (1 << (1 + g.next() % 30)) for _ in range(n)]))
    fs.add('splits', [I64, '[Int64]', '[Int64]'], [((w, ws), lambda w=w, ws=ws: split(w, ws)) for w, ws in sps], split_truth)
    # party support: 10,000 bp over the votes, and the same split over a country's provinces by population
    fs.add('splitsBP', [I32, '[Int64]', '[Int32]'], [((w, ws), lambda w=w, ws=ws: split(w, ws)) for w, ws in
           [(10000, [1, 1, 1, 1, 1, 1]), (10000, [5_421_332, 4_898_112, 1_200_904, 98_001]), (10000, [0, 0]), (10000, []), (-10000, [1, 2]), (0, [4, 4]), (I32_MAX, [1, 1, 1]), (I32_MIN, [1, 1, 1]), (9999, [1, 1])]], split_truth)
    c = RNG.keyed(4, 4, 4, 4)
    fs.add('rngChanceIn', [U64, U64, I32], [((n, d), lambda n=n, d=d: int(c.chance_in(n, d))) for n, d in [(0, 10), (10, 10), (11, 10), (1, 0), (0, 0), (1, 18250), (9125, 18250), (18249, 18250), (1, 2), (1, 2), (1, 2), (1, 2), (M64, M64), (M64 - 1, M64), (1, M64), (3, 7), (3, 7), (3, 7), (3, 7), (3, 7)]])
    k = RNG.keyed(6, 6, 6, 6)
    pks = [[1], [0, 1], [1, 0], [0, 0], [], [-5, 3], [3, -5], [-1, -1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4], [1000, 1], [1, 1000],
           [I64_MAX, I64_MAX], [I64_MAX, I64_MAX, I64_MAX], [I64_MAX, I64_MAX, I64_MAX], [0, 0, 7, 0], [5, 0, 0, 5], [5, 0, 0, 5], [5, 0, 0, 5]]
    fs.add('rngPick', ['[Int64]', I32], [((ws,), lambda ws=ws: k.pick(ws)) for ws in pks])
    h = RNG.keyed(8, 8, 8, 8)
    fs.add('rngShuffle', [I32, '[Int32]'], [((n,), lambda n=n: h.shuffle(list(range(n)))) for n in [0, 1, 2, 2, 2, 3, 3, 3, 5, 8, 13, 13, 52]])
    for row in fs[-1][2]: assert sorted(row[1]) == list(range(row[0])), 'a shuffle keeps every item once'
    fs.add('popNarrowed', [I64, I32], [((v,), lambda v=v: sat32(v)) for v in [0, 1, -1, I32_MAX, I32_MAX + 1, I32_MIN, I32_MIN - 1, I64_MAX, I64_MIN, 1_339_724_852]], lambda v: want32(v))


def swift_tables():
    def rows(t): return '\n'.join('        ' + ', '.join(str(v) for v in t[i:i + 8]) + ',' for i in range(0, len(t), 8))
    return f"""// GENERATED by tools/checks/core_reference.py --write. Do not edit: CI regenerates it and fails on a difference.
// DMath's tables (§2.3): 2^(i/1024) and log2(1 + i/1024) for i = 0...1024, in Q32.32, each correctly rounded from
// 60-digit decimal arithmetic. Fixed data, so the same on every platform by construction (L5).

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
           "// The reference model's rows (exact integer arithmetic, written a second time in Python): the Swift code must",
           "// reproduce every one exactly (§2.3: golden values lock the maths). The last number of a row is how many clamps",
           "// the reference counted for that row.", "",
           "enum CoreGolden {"]
    for name, ty, rows in vs:
        clamps = sum(r[-1] for r in rows)
        out.append(f"    /// {len(rows)} rows, {clamps} clamp{'' if clamps == 1 else 's'}.")
        out.append(f"    static let {name}: [{ty}] = [")
        out += ['        (' + ', '.join(str(v) for v in r) + '),' for r in rows]
        out.append("    ]")
    out.append("}")
    return '\n'.join(out) + '\n'


def tests_read_every_family(vs):
    """The Swift tests name every family: a family nobody asserts is a hole."""
    text = ''.join(open(os.path.join(ROOT, 'Tests/SaneiCoreTests', f)).read() for f in ('CoreGoldenTests.swift', 'SharesTests.swift'))
    return [name for name, _, _ in vs if not re.search(r'\bCoreGolden\.' + name + r'\b', text)]


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
    unread = tests_read_every_family(vs)
    if unread:
        print("NOT READ by Tests/SaneiCoreTests/CoreGoldenTests.swift or SharesTests.swift: " + ', '.join(unread))
        bad = 1
    print(f"core reference: exp2 rel {e:.2e}, log2 abs {l:.2e}, round trip rel {r:.2e}, logistic abs {s:.2e}; "
          f"{len(vs)} families, {sum(len(rows) for _, _, rows in vs)} rows, {SAT[0]} clamps; {'written' if write else ('FAIL' if bad else 'OK')}")
    sys.exit(bad)


if __name__ == '__main__':
    main()
