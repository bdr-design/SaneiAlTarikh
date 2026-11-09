#!/usr/bin/env python3
"""The reference model of SaneiCore's column codec and state hash (design_doc §2.3, §7, §8).

The bytes of saves are a promise («every released save loads in every later version»), so the codec is written here a
second time and its vectors are generated: Tests/SaneiCoreTests/CodecGolden.swift.

  --write   regenerate the file
  --check   (default) fail if the committed file differs
"""
import sys, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GOLDEN = os.path.join(ROOT, 'Tests/SaneiCoreTests/CodecGolden.swift')
M64 = (1 << 64) - 1
RAW, DELTA, ZIGZAG = 0, 1, 2                      # ColumnEncoding's stored numbers


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
    def __init__(self): self.state = 0xCBF29CE484222325
    def combine(self, v): self.state = ((self.state ^ (v & M64)) * 0x100000001B3) & M64
    def column(self, vs):
        self.combine(len(vs))
        for v in vs: self.combine(v)
    def value(self): return mix64(self.state)


def self_check():
    # the zigzag order, and every varint read back; LEB128's known bytes for 300 and 624485
    assert [zz(v) for v in (0, -1, 1, -2, 2)] == [0, 1, 2, 3, 4]
    assert varint(300) == [0xAC, 0x02] and varint(624485) == [0xE5, 0x8E, 0x26] and varint(0) == [0]
    for v in [0, 1, 127, 128, 16383, 16384, (1 << 63) - 1, 1 << 63, M64] + [(1 << k) - 1 for k in range(1, 65)]:
        assert read_varint(varint(v)) == (v, len(varint(v)))
    assert len(varint(M64)) == 10 and varint(M64)[-1] == 1
    # FNV-1a's published offset and prime
    assert Hasher().state == 14695981039346656037 and 0x100000001B3 == 1099511628211


def vectors():
    I64_MAX, I64_MIN = (1 << 63) - 1, -(1 << 63)
    out = []
    vs = [0, 1, 127, 128, 129, 300, 16383, 16384, 624485, (1 << 32) - 1, 1 << 32, (1 << 56) - 1, 1 << 56, (1 << 63) - 1, 1 << 63, M64]
    out.append(('varints', '(UInt64, [UInt8])', [(v, varint(v)) for v in vs]))
    zs = [0, -1, 1, -2, 2, 63, -64, 64, -65, 14975, -43829, 84370, I64_MAX, I64_MIN, I64_MAX - 1, I64_MIN + 1, 1 << 31, -(1 << 31)]
    out.append(('zigzags', '(Int64, [UInt8])', [(v, zigzag(v)) for v in zs]))
    bad = [[], [0x80], [0xFF, 0xFF], [0x80, 0x00], [0xFF, 0x00], [0x81, 0x80, 0x00],
           [0xFF] * 9 + [0x02], [0xFF] * 9 + [0x7F], [0xFF] * 10, [0x80] * 10 + [0x01], [0xFF] * 9 + [0x81, 0x00]]
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
    hs = []
    for cols in [[], [[]], [[1]], [[1], [2]], [[1, 2]], [[2, 1]], [[-1]], [[0, 0, 0]], [[0, 0]], [[I64_MAX, I64_MIN], [14975]]]:
        h = Hasher()
        for c in cols: h.column(c)
        hs.append((cols, h.value()))
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
