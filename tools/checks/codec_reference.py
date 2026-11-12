#!/usr/bin/env python3
"""The reference model of SaneiCore's column codec and state hash (design_doc §2.3, §7, §8).

The bytes of saves are a promise («every released save loads in every later version»), so the codec is written here a
second time and its vectors are generated: Tests/SaneiCoreTests/CodecGolden.swift.

  --write   regenerate the file
  --check   (default) fail if the committed file differs

Before it writes anything it checks itself against things that are not this code: published LEB128 and protobuf
bytes, Python's struct for the raw encoding, a second decoder written another way, SplitMix64's published first
output, and the hash on every state of three small boxes (no two may hash alike).
"""
import sys, os, struct

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GOLDEN = os.path.join(ROOT, 'Tests/SaneiCoreTests/CodecGolden.swift')
M64 = (1 << 64) - 1
RAW, DELTA, ZIGZAG = 0, 1, 2                      # ColumnEncoding's stored numbers
GAMMA = 0x9E3779B97F4A7C15                         # SplitMix64's step (DetRNG.gamma)


def varint(v):
    assert 0 <= v <= M64
    out = []
    while v >= 0x80:
        out.append((v & 0x7F) | 0x80)
        v >>= 7
    out.append(v)
    return out


def zz(v):
    """Zigzag: 0, -1, 1, -2, ... -> 0, 1, 2, 3, ..."""
    return ((v << 1) ^ (v >> 63)) & M64


def zigzag(v): return varint(zz(v))


def read_varint(b, at=0):
    """(value, next position) or None: the bytes end inside it, it passes 64 bits, or it is not the shortest form."""
    v = shift = 0
    while at < len(b):
        x = b[at]; at += 1
        part = x & 0x7F
        if shift == 63 and part > 1: return None
        v |= part << shift
        if not x & 0x80:
            if x == 0 and shift != 0: return None
            return v, at
        if shift == 63: return None
        shift += 7
    return None


def as_i64(v, bits, is_signed):
    if is_signed: return v                                   # already a signed value
    return v - (1 << 64) if bits == 64 and v >> 63 else v    # UInt64 above Int64.max goes in as its bit pattern


def column(values, enc, bits, is_signed):
    out = []
    if enc == RAW:
        for v in values:
            u = v & ((1 << bits) - 1)
            out += [(u >> (8 * i)) & 0xFF for i in range(bits // 8)]
    elif enc == ZIGZAG:
        for v in values: out += zigzag(as_i64(v, bits, is_signed))
    else:
        prev = 0
        for v in values:
            z = as_i64(v, bits, is_signed)
            d = (z - prev + (1 << 63)) % (1 << 64) - (1 << 63)        # the wrapping difference
            out += zigzag(d)
            prev = z
    return out


def mix64(z):
    z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & M64
    z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & M64
    return z ^ (z >> 31)


class Hasher:
    """StateHasher: each 64-bit word goes in as state = mix((state ^ word) + gamma); a column is its length, then its
    values. The step keeps a state of 0 from swallowing the zeros that follow."""
    def __init__(self): self.state = 0xCBF29CE484222325
    def combine(self, v): self.state = mix64(((self.state ^ (v & M64)) + GAMMA) & M64)
    def column(self, vs):
        self.combine(len(vs))
        for v in vs: self.combine(v)
    def value(self): return self.state


def hash_of(cols):
    h = Hasher()
    for c in cols: h.column(c)
    return h.value()


def decode_another_way(b, count, enc, bits, is_signed):
    """A column read back by a decoder that shares no code with the writer above: bytes to values, or None."""
    at, out, run = 0, [], 0
    for _ in range(count):
        if enc == RAW:
            w = bits // 8
            if at + w > len(b): return None
            out.append(int.from_bytes(bytes(b[at:at + w]), 'little', signed=is_signed)); at += w
            continue
        u, n = 0, 0
        while True:                                          # 7 bits a byte, low first
            if at >= len(b): return None
            x = b[at]; at += 1
            u += (x & 0x7F) * (128 ** n); n += 1
            if x < 0x80: break
        z = u // 2 if u % 2 == 0 else -(u + 1) // 2         # undo the zigzag by its definition
        if enc == DELTA:
            run = (run + z + (1 << 63)) % (1 << 64) - (1 << 63)
            z = run
        out.append(z % (1 << 64) if not is_signed and bits == 64 else z)
    return out if at == len(b) else None


def self_check():
    I64_MAX, I64_MIN = (1 << 63) - 1, -(1 << 63)
    # the zigzag order, protobuf's table with both ends, and every varint read back
    assert [zz(v) for v in (0, -1, 1, -2, 2)] == [0, 1, 2, 3, 4]
    assert [zz(v) for v in (2147483647, -2147483648, I64_MAX, I64_MIN)] == [4294967294, 4294967295, M64 - 1, M64]
    # LEB128's known bytes for 300 and 624485, protobuf's for 150
    assert varint(300) == [0xAC, 0x02] and varint(624485) == [0xE5, 0x8E, 0x26] and varint(0) == [0]
    assert varint(150) == [0x96, 0x01]
    for v in [0, 1, 127, 128, 16383, 16384, I64_MAX, 1 << 63, M64] + [(1 << k) - 1 for k in range(1, 65)]:
        assert read_varint(varint(v)) == (v, len(varint(v)))
    assert len(varint(M64)) == 10 and varint(M64)[-1] == 1
    # one byte string per value: every string of one or two bytes, and three-byte strings over a spread of first
    # bytes, is read exactly as the rule says, stated here a second time, and is what the writer writes for its value
    spread = [0x80, 0x81, 0x82, 0x90, 0xA5, 0xC0, 0xFE, 0xFF, 0x00, 0x01, 0x7F, 0x40]
    strings = [[a] for a in range(256)] + [[a, c] for a in range(256) for c in range(256)]
    strings += [[a, c, d] for a in spread for c in spread for d in range(256)]
    for bs in strings:
        end = next((i for i, x in enumerate(bs) if x < 0x80), None)             # the first byte without the top bit
        if end is None or (end > 0 and bs[end] == 0): want = None                 # cut short, or a longer form
        else: want = (sum((x & 0x7F) << (7 * i) for i, x in enumerate(bs[:end + 1])), end + 1)
        assert read_varint(bs) == want, bs
        if want is not None: assert varint(want[0]) == bs[:end + 1], bs
    # the raw encoding against Python's struct, low byte first
    assert column([-2, 0x1122334455667788], RAW, 64, True) == list(struct.pack('<qq', -2, 0x1122334455667788))
    assert column([0x11223344, 7], RAW, 32, False) == list(struct.pack('<II', 0x11223344, 7))
    assert column([-2, 513], RAW, 16, True) == list(struct.pack('<hh', -2, 513))
    # a delta column worked by hand: 100, -10, +5, -100, +5 as zigzags 200, 19, 10, 199, 10
    assert column([100, 90, 95, -5, 0], DELTA, 64, True) == [0xC8, 0x01, 0x13, 0x0A, 0xC7, 0x01, 0x0A]
    # SplitMix64's published first output for the seed 0: the function the hash is made of
    assert mix64(0x9E3779B97F4A7C15) == 0xE220A8397B1DCDAF and Hasher().state == 14695981039346656037
    # the hash tells apart every state of three boxes where a multiply per word did not (signs, top bits, order,
    # whole numbers in Q32, a flag set on a pair and on its mirror)
    box = {hash_of([[a, c]]) for a in range(-100, 101) for c in range(-100, 101)}
    assert len(box) == 201 * 201, 'two values in -100...100'
    box = {hash_of([[a, c, d, e]]) for a in range(-4, 5) for c in range(-4, 5) for d in range(-4, 5) for e in range(-4, 5)}
    assert len(box) == 9 ** 4, 'four values in -4...4'
    box = {hash_of([[a << 32, c << 32]]) for a in range(150) for c in range(150)}
    assert len(box) == 150 * 150, 'two whole numbers as Q32'
    top = 1 << 63
    alike = [([[0, 0]], [[I64_MIN, I64_MIN]]), ([[-1, 1, 0]], [[1, -1, 0]]), ([[0, 0]], [[-2, -2]]), ([[I64_MAX, -1]], [[-1, I64_MAX]]),
             ([[-1, -1]], [[I64_MAX, I64_MAX]]), ([[0, 397 << 32]], [[1 << 32, 48 << 32]]), ([[1], [2]], [[1 | top], [2 | top]]),
             ([[0, I64_MIN]], [[I64_MIN, 0]]), ([[5, 6, 7, 8]], [[5 | top, 6, 7, 8 | top]]), ([[1 << 62, 3, 1 << 62]], [[0, 3, 0]])]
    for one, two in alike: assert hash_of(one) != hash_of(two), (one, two)


def vectors():
    I64_MAX, I64_MIN = (1 << 63) - 1, -(1 << 63)
    out = []
    vs = [0, 1, 127, 128, 129, 300, 16383, 16384, 624485, (1 << 32) - 1, 1 << 32, (1 << 56) - 1, 1 << 56, (1 << 63) - 1, 1 << 63, M64]
    out.append(('varints', '(UInt64, [UInt8])', [(v, varint(v)) for v in vs]))
    zs = [0, -1, 1, -2, 2, 63, -64, 64, -65, 14975, -43829, 84370, I64_MAX, I64_MIN, I64_MAX - 1, I64_MIN + 1, 1 << 31, -(1 << 31)]
    out.append(('zigzags', '(Int64, [UInt8])', [(v, zigzag(v)) for v in zs]))
    bad = [[], [0x80], [0xFF, 0xFF], [0x80, 0x00], [0xFF, 0x00], [0x81, 0x80, 0x00],
           [0xFF] * 9 + [0x02], [0xFF] * 9 + [0x7F], [0xFF] * 10, [0x80] * 10 + [0x01], [0xFF] * 9 + [0x81, 0x00]]
    # a longer form of a smaller value, at every length up to the tenth byte
    bad += [[0x80] * k + [0x00] for k in range(2, 10)] + [[0xFF] * 9 + [0x00], [0x81] + [0x80] * 8 + [0x00]]
    for b in bad: assert read_varint(b) is None, b
    out.append(('badVarints', '[UInt8]', bad))
    cols64 = [[], [0], [5, 5, 5, 5], [1, 2, 3, 4, 5], [100, 90, 95, -5, 0], [I64_MAX, I64_MIN, 0, -1, 1],
              [14975, 14976, 14977, 15006, 15340], [I64_MIN, I64_MAX], [-1, I64_MIN, I64_MAX, -1]]
    out.append(('columns64', '(UInt8, [Int64], [UInt8])', [(e, c, column(c, e, 64, True)) for c in cols64 for e in (RAW, DELTA, ZIGZAG)]))
    cols32 = [[], [0, 1, -1], [-43829, 0, 14975, 84370], [(1 << 31) - 1, -(1 << 31), 0], [10000, 9999, 2500, 0, -10000]]
    out.append(('columns32', '(UInt8, [Int32], [UInt8])', [(e, c, column(c, e, 32, True)) for c in cols32 for e in (RAW, DELTA, ZIGZAG)]))
    cols16 = [[], [0, 1, 2, 65535], [3150, 3149, 0, 383, 65534], [65535, 0, 65535]]
    out.append(('columnsU16', '(UInt8, [UInt16], [UInt8])', [(e, c, column(c, e, 16, False)) for c in cols16 for e in (RAW, DELTA, ZIGZAG)]))
    colsu64 = [[0, 1, M64, 1 << 63, (1 << 63) - 1], [M64, 0, M64]]
    out.append(('columnsU64', '(UInt8, [UInt64], [UInt8])', [(e, c, column(c, e, 64, False)) for c in colsu64 for e in (RAW, DELTA, ZIGZAG)]))
    cols8 = [[0, 1, -1, 127, -128], []]
    out.append(('columns8', '(UInt8, [Int8], [UInt8])', [(e, c, column(c, e, 8, True)) for c in cols8 for e in (RAW, DELTA, ZIGZAG)]))
    # a column of serials: what a handle table's first column is
    colsu32 = [[], [1, 2, 3, 7, 8, 4000000000], [(1 << 32) - 2, (1 << 32) - 1, 0], [1100, 1, 599]]
    out.append(('columnsU32', '(UInt8, [UInt32], [UInt8])', [(e, c, column(c, e, 32, False)) for c in colsu32 for e in (RAW, DELTA, ZIGZAG)]))
    # every column above read back by the second decoder
    for name, ty, rows in out[3:]:
        kind = ty.split('[')[1]
        bits = int(''.join(ch for ch in kind if ch.isdigit()))
        for e, c, bs in rows: assert decode_another_way(bs, len(c), e, bits, 'UInt' not in kind) == c, (name, e, c)
    hs = []
    states = [[], [[]], [[1]], [[1], [2]], [[1, 2]], [[2, 1]], [[-1]], [[0, 0, 0]], [[0, 0]], [[I64_MAX, I64_MIN], [14975]],
              [[I64_MIN, I64_MIN]], [[-1, 1, 0]], [[1, -1, 0]], [[I64_MAX, -1]], [[-1, I64_MAX]], [[0], [0]], [[], []]]
    for cols in states: hs.append((cols, hash_of(cols)))
    assert len({v for _, v in hs}) == len(hs), 'every state here hashes apart'
    out.append(('hashes', '([[Int64]], UInt64)', hs))
    return out


def lit(v):
    if isinstance(v, tuple): return '(' + ', '.join(lit(x) for x in v) + ')'
    if isinstance(v, list): return '[' + ', '.join(lit(x) for x in v) + ']'
    return str(v)


def swift(vs):
    out = ["// GENERATED by tools/checks/codec_reference.py --write. Do not edit: CI regenerates it and fails on a difference.",
           "// The column codec's and the state hash's vectors: the bytes a save holds, written a second time in Python.", "",
           "enum CodecGolden {"]
    for name, ty, rows in vs:
        out.append(f"    static let {name}: [{ty}] = [")
        out += [f"        {lit(r)}," for r in rows]
        out.append("    ]")
    out.append("}")
    return '\n'.join(out) + '\n'


def main():
    if '--write' in sys.argv and '--check' in sys.argv:
        print("codec reference: --write or --check, not both")
        sys.exit(2)
    self_check()
    vs = vectors()
    text = swift(vs)
    if '--write' in sys.argv:
        open(GOLDEN, 'w').write(text)
        print(f"codec reference: {sum(len(r) for _, _, r in vs)} vectors; written")
        return
    ok = os.path.exists(GOLDEN) and open(GOLDEN).read() == text
    print(f"codec reference: {sum(len(r) for _, _, r in vs)} vectors; {'OK' if ok else 'DIFFERS: run tools/checks/codec_reference.py --write'}")
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
