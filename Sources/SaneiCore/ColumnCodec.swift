// The column codec (§2.3, §7): the bytes of saves and commands. Three encodings of a column of whole numbers: raw
// (fixed width, little-endian), zigzag (each value as a signed varint) and varint-delta (the first value, then each
// change from the value before, as signed varints). Readers never trap on damaged bytes: every read can fail, and a
// failed read leaves the reader where it was. A column's count is checked before anything is allocated, against the
// caller's own limit (its table's cap) and against the bytes that are left. Varints are canonical (one byte string
// per value), so the same state always gives the same file. Everything here is inlinable: called from another module
// with a known type, a column is a tight loop, not a call per byte. stdlib only.

/// Bytes being written. Give the size when it is known, or empty one writer and use it again: a writer that starts
/// empty and grows to 8 MB reallocates about 21 times.
@frozen
public struct ByteWriter: Sendable {
    public var bytes: [UInt8]

    @inlinable
    public init(capacity: Int = 0) {
        bytes = []
        bytes.reserveCapacity(Swift.max(0, capacity))
    }

    /// Empties the writer and keeps its room, so the next chunk is written without allocating.
    @inlinable public mutating func removeAll() { bytes.removeAll(keepingCapacity: true) }

    /// One byte.
    @inlinable public mutating func u8(_ v: UInt8) { bytes.append(v) }

    /// A whole number in the width of the named type, the low byte first (little-endian on every machine). The type
    /// is named, as the reader names it, so that a bare number cannot choose the width by accident:
    /// `fixed(1, as: UInt16.self)` writes two bytes.
    @inlinable
    public mutating func fixed<T: FixedWidthInteger>(_ v: T, as type: T.Type) {
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
@frozen
public struct ByteReader: Sendable {
    public let bytes: [UInt8]
    @usableFromInline var _offset: Int

    /// A reader of `bytes` from `offset`: a negative offset is taken as 0, one past the end as the end.
    @inlinable
    public init(_ bytes: [UInt8], offset: Int = 0) {
        self.bytes = bytes
        _offset = Swift.max(0, Swift.min(offset, bytes.count))
    }

    /// The position of the next byte to read.
    @inlinable public var offset: Int { _offset }

    /// Bytes not read yet.
    @inlinable public var remaining: Int { bytes.count - _offset }

    /// One byte; nil at the end.
    @inlinable
    public mutating func u8() -> UInt8? {
        guard _offset < bytes.count else { return nil }
        let b = bytes[_offset]
        _offset += 1
        return b
    }

    /// A whole number in the width of `type`, the low byte first; nil when fewer bytes than that are left.
    @inlinable
    public mutating func fixed<T: FixedWidthInteger>(_ type: T.Type) -> T? {
        let width = T.bitWidth / 8
        guard remaining >= width else { return nil }
        var v: T = 0
        for i in 0..<width { v |= T(truncatingIfNeeded: bytes[_offset + i]) << (8 * i) }
        _offset += width
        return v
    }

    /// An unsigned varint. Nil when the bytes end inside it, when it would not fit in 64 bits, or when it is not the
    /// shortest form of its value.
    @inlinable
    public mutating func varint() -> UInt64? {
        var v: UInt64 = 0
        var shift: UInt64 = 0
        var at = _offset
        while at < bytes.count {
            let b = bytes[at]
            at += 1
            let part = UInt64(b & 0x7F)
            if shift == 63 && part > 1 { return nil }               // beyond 64 bits
            v |= part << shift
            if b & 0x80 == 0 {
                if b == 0 && shift != 0 { return nil }              // a longer form of a smaller value
                _offset = at
                return v
            }
            if shift == 63 { return nil }                            // an eleventh byte
            shift += 7
        }
        return nil
    }

    /// A signed varint.
    @inlinable
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
    /// Writes a column's values (not their count: the table's header holds it). The two varint encodings carry 64
    /// bits: a wider type is a programmer's error there (a debug build stops; no such type is used).
    @inlinable
    public static func write<T: FixedWidthInteger>(_ column: [T], as encoding: ColumnEncoding, to w: inout ByteWriter) {
        switch encoding {
        case .raw:
            for v in column { w.fixed(v, as: T.self) }
        case .zigzag:
            assert(T.bitWidth <= 64, "the varint encodings carry 64 bits")
            for v in column { w.zigzag(Int64(truncatingIfNeeded: v)) }
        case .varintDelta:
            assert(T.bitWidth <= 64, "the varint encodings carry 64 bits")
            var previous: Int64 = 0
            for v in column {
                let z = Int64(truncatingIfNeeded: v)
                w.zigzag(z &- previous)
                previous = z
            }
        }
    }

    /// The most values of `T` that `bytes` bytes can hold: a raw value takes its width, a varint at least one byte.
    @inlinable
    static func mostValues<T: FixedWidthInteger>(of type: T.Type, as encoding: ColumnEncoding, in bytes: Int) -> Int {
        encoding == .raw ? bytes / (T.bitWidth / 8) : bytes
    }

    /// Reads `count` values. `limit` is the most values the caller's column may hold: its table's cap (L3). The bytes
    /// alone do not bound the memory, because a varint can be one byte and its value eight. The array is reserved
    /// only after `count` has passed both checks, so it is never more than `limit` values.
    ///
    /// Nil, with the reader where it was, when `count` is negative, above `limit`, or more than the bytes left could
    /// hold; when the bytes run out; when a varint is not the shortest form of its value; when a value does not fit
    /// in `T`; or when `T` is wider than 64 bits and the encoding is a varint one.
    @inlinable
    public static func read<T: FixedWidthInteger>(_ type: T.Type, count: Int, atMost limit: Int, as encoding: ColumnEncoding,
                                                    from r: inout ByteReader) -> [T]? {
        guard count >= 0, count <= limit, count <= mostValues(of: T.self, as: encoding, in: r.remaining) else { return nil }
        var start = r
        var out: [T] = []
        out.reserveCapacity(count)
        switch encoding {
        case .raw:
            for _ in 0..<count {
                guard let v = start.fixed(T.self) else { return nil }
                out.append(v)
            }
        case .zigzag, .varintDelta:
            guard T.bitWidth <= 64 else { return nil }
            let isDelta = encoding == .varintDelta
            var previous: Int64 = 0
            for _ in 0..<count {
                guard let read = start.zigzag() else { return nil }
                let z = isDelta ? previous &+ read : read
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
