// The column codec (§2.3, §7): the bytes of saves, commands and baked content. Three encodings of a column of whole
// numbers: raw (fixed width, little-endian), zigzag (each value as a signed varint) and varint-delta (the first value,
// then each change from the value before, as signed varints). Readers never trap and never over-allocate on damaged
// bytes: every read can fail, and a count is checked against the bytes that are left. Varints are canonical (one byte
// string per value), so the same state always gives the same file. stdlib only.

/// Bytes being written.
public struct ByteWriter: Sendable {
    public var bytes: [UInt8]

    public init(capacity: Int = 0) {
        bytes = []
        bytes.reserveCapacity(capacity)
    }

    @inlinable public mutating func u8(_ v: UInt8) { bytes.append(v) }

    /// A whole number in its own width, the low byte first (little-endian on every machine).
    @inlinable
    public mutating func fixed<T: FixedWidthInteger>(_ v: T) {
        for i in 0..<(T.bitWidth / 8) {
            bytes.append(UInt8(truncatingIfNeeded: v >> (8 * i)))
        }
    }

    /// An unsigned varint: 7 bits a byte, the low bits first, the top bit set on every byte but the last.
    @inlinable
    public mutating func varint(_ v: UInt64) {
        var rest = v
        while rest >= 0x80 {
            bytes.append(UInt8(truncatingIfNeeded: rest) | 0x80)
            rest >>= 7
        }
        bytes.append(UInt8(truncatingIfNeeded: rest))
    }

    /// A signed varint: zigzag (0, -1, 1, -2, ... become 0, 1, 2, 3, ...), then the unsigned form. Small values of
    /// either sign stay short (dates before 1970, deltas).
    @inlinable
    public mutating func zigzag(_ v: Int64) {
        varint(UInt64(bitPattern: (v << 1) ^ (v >> 63)))
    }
}

/// Bytes being read. Every read returns nil when the bytes run out or are not valid; the position then stays where
/// the failed read began.
public struct ByteReader: Sendable {
    public let bytes: [UInt8]
    public private(set) var offset: Int

    public init(_ bytes: [UInt8], offset: Int = 0) {
        self.bytes = bytes
        self.offset = Swift.max(0, Swift.min(offset, bytes.count))
    }

    /// Bytes not read yet.
    public var remaining: Int { bytes.count - offset }

    public mutating func u8() -> UInt8? {
        guard offset < bytes.count else { return nil }
        defer { offset += 1 }
        return bytes[offset]
    }

    public mutating func fixed<T: FixedWidthInteger>(_ type: T.Type) -> T? {
        let width = T.bitWidth / 8
        guard remaining >= width else { return nil }
        var v: T = 0
        for i in 0..<width { v |= T(truncatingIfNeeded: bytes[offset + i]) << (8 * i) }
        offset += width
        return v
    }

    /// An unsigned varint. Nil when the bytes end inside it, when it would not fit in 64 bits, or when it is not the
    /// shortest form of its value.
    public mutating func varint() -> UInt64? {
        var v: UInt64 = 0
        var shift: UInt64 = 0
        var at = offset
        while at < bytes.count {
            let b = bytes[at]
            at += 1
            let part = UInt64(b & 0x7F)
            if shift == 63 && part > 1 { return nil }               // beyond 64 bits
            v |= part << shift
            if b & 0x80 == 0 {
                if b == 0 && shift != 0 { return nil }              // a longer form of a smaller value
                offset = at
                return v
            }
            if shift == 63 { return nil }                            // an eleventh byte
            shift += 7
        }
        return nil
    }

    /// A signed varint.
    public mutating func zigzag() -> Int64? {
        guard let u = varint() else { return nil }
        return Int64(bitPattern: u >> 1) ^ -Int64(bitPattern: u & 1)
    }
}

/// How a column's values are written. The numbers are stored in files: never renumber one.
public enum ColumnEncoding: UInt8, Sendable {
    case raw = 0
    case varintDelta = 1
    case zigzag = 2
}

public enum ColumnCodec {
    /// Writes a column's values (not their count: the table's header holds it).
    public static func write<T: FixedWidthInteger>(_ column: [T], as encoding: ColumnEncoding, to w: inout ByteWriter) {
        switch encoding {
        case .raw:
            for v in column { w.fixed(v) }
        case .zigzag:
            for v in column { w.zigzag(Int64(truncatingIfNeeded: v)) }
        case .varintDelta:
            var previous: Int64 = 0
            for v in column {
                let z = Int64(truncatingIfNeeded: v)
                w.zigzag(z &- previous)
                previous = z
            }
        }
    }

    /// Reads `count` values. Nil when the bytes run out, a value does not fit in `T`, or `count` is more than the bytes
    /// left could hold (so damaged bytes cannot ask for a huge array).
    public static func read<T: FixedWidthInteger>(_ type: T.Type, count: Int, as encoding: ColumnEncoding,
                                                    from r: inout ByteReader) -> [T]? {
        let least = encoding == .raw ? T.bitWidth / 8 : 1           // the fewest bytes a value takes
        guard count >= 0, count <= r.remaining / least else { return nil }
        var start = r
        var out: [T] = []
        out.reserveCapacity(count)
        var previous: Int64 = 0
        for _ in 0..<count {
            switch encoding {
            case .raw:
                guard let v = start.fixed(T.self) else { return nil }
                out.append(v)
            case .zigzag, .varintDelta:
                guard let read = start.zigzag() else { return nil }
                let z = encoding == .zigzag ? read : previous &+ read
                previous = z
                let v = T(truncatingIfNeeded: z)
                guard Int64(truncatingIfNeeded: v) == z else { return nil }     // does not fit in T
                out.append(v)
            }
        }
        r = start
        return out
    }
}
