// A save's payload as typed column buffers (§7): chunks, each a four-letter tag and its columns; a column is its name,
// its type, its encoding, its count and its bytes in the column codec. A later version reads what it knows and skips
// what it does not (a chunk and a column carry their lengths), and migrations work on these buffers, never on old Swift
// types. Reading checks every length against what is left, so a bad file is refused, never trusted; and it copies
// nothing: every column read from a file points into the file's one buffer. In SaneiCore, so the platform's saves list
// and the engine read one format with one reader (§2.2). stdlib only.
//
// The bytes of a tree: the format version (u16, little-endian), the number of chunks (varint), then each chunk: its tag
// (4 ASCII bytes), the length of its body (varint) and the body: the number of columns (varint), then each column: the
// name's length (varint) and the name (ASCII, 1 to 64 bytes), the type (u8), the encoding (u8), the count (varint), the
// data's length (varint) and the data.

/// The stored type of a column. The numbers are stored in saves and registered in `tags.lock`: never renumber one.
public enum SaveType: UInt8, Sendable, CaseIterable {
    case u8 = 1, u16 = 2, u32 = 3, u64 = 4
    case i8 = 5, i16 = 6, i32 = 7, i64 = 8
    case bool = 9
    /// Items of bytes, each with its length (a varint), for values with their own codec (a command, a name).
    case items = 10
}

/// One column: a name (ASCII, at most 64 bytes), its stored type and encoding, how many values, and their bytes (a
/// range of a buffer that may be shared with the rest of the file).
public struct SaveColumn: Sendable, Equatable {
    public var name: String
    public var type: SaveType
    public var encoding: ColumnEncoding
    public var count: Int
    let buffer: [UInt8]
    let range: Range<Int>

    public init(name: String, type: SaveType, encoding: ColumnEncoding, count: Int, data: [UInt8]) {
        self.init(name: name, type: type, encoding: encoding, count: count, buffer: data, range: 0..<data.count)
    }

    init(name: String, type: SaveType, encoding: ColumnEncoding, count: Int, buffer: [UInt8], range: Range<Int>) {
        self.name = name
        self.type = type
        self.encoding = encoding
        self.count = count
        self.buffer = buffer
        self.range = range
    }

    /// The column's bytes (a copy).
    public var data: [UInt8] { Array(buffer[range]) }
    public var dataCount: Int { range.count }

    public static func == (a: SaveColumn, b: SaveColumn) -> Bool {
        a.name == b.name && a.type == b.type && a.encoding == b.encoding && a.count == b.count && a.buffer[a.range] == b.buffer[b.range]
    }

    /// A column of whole numbers. Raw values take the stored type's width (a `.u8` column is one byte a value,
    /// whatever Swift type holds them); varints are the same whatever the width.
    public static func of<T: FixedWidthInteger>(_ name: String, _ values: [T], _ type: SaveType, _ encoding: ColumnEncoding) -> SaveColumn {
        let width: Int
        switch type {
        case .u8, .i8, .bool, .items: width = 1
        case .u16, .i16: width = 2
        case .u32, .i32: width = 4
        case .u64, .i64: width = 8
        }
        var w = ByteWriter(capacity: values.count * (encoding == .raw ? width : Swift.min(width, 3)) + 8)
        if encoding == .raw {
            switch type {
            case .u8, .i8: for v in values { w.fixed(UInt8(truncatingIfNeeded: v), as: UInt8.self) }
            case .u16, .i16: for v in values { w.fixed(UInt16(truncatingIfNeeded: v), as: UInt16.self) }
            case .u32, .i32: for v in values { w.fixed(UInt32(truncatingIfNeeded: v), as: UInt32.self) }
            default: for v in values { w.fixed(UInt64(truncatingIfNeeded: v), as: UInt64.self) }
            }
        } else {
            ColumnCodec.write(values, as: encoding, to: &w)
        }
        return SaveColumn(name: name, type: type, encoding: encoding, count: values.count, data: w.bytes)
    }

    /// A column of flags, one byte each.
    public static func flags(_ name: String, _ values: [Bool]) -> SaveColumn {
        SaveColumn(name: name, type: .bool, encoding: .raw, count: values.count, data: values.map { $0 ? 1 : 0 })
    }

    /// A column of byte items.
    public static func items(_ name: String, _ values: [[UInt8]]) -> SaveColumn {
        var w = ByteWriter(capacity: values.reduce(0) { $0 + $1.count + 2 })
        for v in values {
            w.varint(UInt64(v.count))
            w.bytes.append(contentsOf: v)
        }
        return SaveColumn(name: name, type: .items, encoding: .raw, count: values.count, data: w.bytes)
    }

    /// The values, when the column holds `type` and exactly its count of them in its bytes; nil otherwise, or past
    /// `limit` values.
    public func values<T: FixedWidthInteger>(_ t: T.Type, as type: SaveType, atMost limit: Int) -> [T]? {
        guard self.type == type, count <= limit, count >= 0 else { return nil }
        var r = ByteReader(buffer, offset: range.lowerBound)
        let out: [T]?
        if encoding == .raw {
            func widened<W: FixedWidthInteger>(_ w: W.Type) -> [T]? {
                guard count <= range.count / MemoryLayout<W>.size,
                      let v = ColumnCodec.read(W.self, count: count, atMost: limit, as: .raw, from: &r) else { return nil }
                var o: [T] = []
                o.reserveCapacity(v.count)
                for x in v { o.append(T(truncatingIfNeeded: x)) }
                return o
            }
            switch type {
            case .u8: out = widened(UInt8.self)
            case .i8: out = widened(Int8.self)
            case .u16: out = widened(UInt16.self)
            case .i16: out = widened(Int16.self)
            case .u32: out = widened(UInt32.self)
            case .i32: out = widened(Int32.self)
            case .u64: out = widened(UInt64.self)
            case .i64: out = widened(Int64.self)
            case .bool, .items: out = nil
            }
        } else {
            guard count <= range.count else { return nil }                 // a varint takes at least a byte
            out = ColumnCodec.read(T.self, count: count, atMost: limit, as: encoding, from: &r)
        }
        // the values must end exactly where the column's bytes do
        guard let v = out, r.offset == range.upperBound else { return nil }
        return v
    }

    /// The flags, when the column holds them (each byte 0 or 1).
    public func flags(atMost limit: Int) -> [Bool]? {
        guard type == .bool, encoding == .raw, count <= limit, range.count == count else { return nil }
        var out: [Bool] = []
        out.reserveCapacity(count)
        for i in range {
            guard buffer[i] <= 1 else { return nil }
            out.append(buffer[i] == 1)
        }
        return out
    }

    /// The byte items, when the column holds them, each at most `itemLimit` bytes.
    public func items(atMost limit: Int, itemLimit: Int) -> [[UInt8]]? {
        guard type == .items, encoding == .raw, count <= limit, count <= range.count else { return nil }
        var r = ByteReader(buffer, offset: range.lowerBound)
        var out: [[UInt8]] = []
        out.reserveCapacity(count)
        for _ in 0..<count {
            guard let n = r.varint(), n <= UInt64(itemLimit), n <= UInt64(range.upperBound - r.offset) else { return nil }
            let start = r.offset
            out.append(Array(buffer[start..<(start + Int(n))]))
            r = ByteReader(buffer, offset: start + Int(n))
        }
        return r.offset == range.upperBound ? out : nil
    }
}

/// One chunk: its tag (four ASCII letters) and its columns, each name at most once.
public struct SaveChunk: Sendable, Equatable {
    public var tag: String
    public var columns: [SaveColumn]

    public init(tag: String, columns: [SaveColumn]) {
        self.tag = tag
        self.columns = columns
    }

    public func column(_ name: String) -> SaveColumn? { columns.first { $0.name == name } }
}

/// The payload: the format version and the chunks in the order written.
public struct SaveTree: Sendable, Equatable {
    /// The most chunks, columns per chunk and name length a reader accepts: several times what the engine writes, so
    /// later versions have room, and small enough that a forged tree costs little to refuse.
    public static let mostChunks = 64
    public static let mostColumns = 96
    public static let mostNameBytes = 64

    public var formatVersion: UInt16
    public var chunks: [SaveChunk]

    public init(formatVersion: UInt16, chunks: [SaveChunk]) {
        self.formatVersion = formatVersion
        self.chunks = chunks
    }

    public func chunk(_ tag: String) -> SaveChunk? { chunks.first { $0.tag == tag } }

    // MARK: column-level migration steps (§7)

    /// Adds a column to a chunk; false when the chunk is missing or already has a column of that name.
    @discardableResult
    public mutating func addColumn(_ column: SaveColumn, to tag: String) -> Bool {
        guard let c = chunks.firstIndex(where: { $0.tag == tag }), chunks[c].column(column.name) == nil else { return false }
        chunks[c].columns.append(column)
        return true
    }

    /// Renames a column; false when it is missing or the new name is taken.
    @discardableResult
    public mutating func renameColumn(_ name: String, to newName: String, in tag: String) -> Bool {
        guard let c = chunks.firstIndex(where: { $0.tag == tag }), chunks[c].column(newName) == nil,
              let k = chunks[c].columns.firstIndex(where: { $0.name == name }) else { return false }
        chunks[c].columns[k].name = newName
        return true
    }

    /// Drops a column; false when it is missing.
    @discardableResult
    public mutating func dropColumn(_ name: String, from tag: String) -> Bool {
        guard let c = chunks.firstIndex(where: { $0.tag == tag }), let k = chunks[c].columns.firstIndex(where: { $0.name == name }) else { return false }
        chunks[c].columns.remove(at: k)
        return true
    }

    /// Adds a chunk; false when one with that tag exists.
    @discardableResult
    public mutating func addChunk(_ chunk: SaveChunk) -> Bool {
        guard self.chunk(chunk.tag) == nil else { return false }
        chunks.append(chunk)
        return true
    }

    // MARK: bytes

    /// The tree's bytes, sized once.
    public func write() -> [UInt8] {
        func bodySize(_ c: SaveChunk) -> Int { 10 + c.columns.reduce(0) { $0 + 40 + $1.name.utf8.count + $1.dataCount } }
        var w = ByteWriter(capacity: 16 + chunks.reduce(0) { $0 + 14 + bodySize($1) })
        w.fixed(formatVersion, as: UInt16.self)
        w.varint(UInt64(chunks.count))
        for c in chunks {
            for b in Self.tagBytes(c.tag) { w.u8(b) }
            var length = ByteWriter(capacity: 10)
            length.varint(UInt64(c.columns.count))
            var size = length.bytes.count
            for col in c.columns {
                var head = ByteWriter(capacity: 32)
                head.varint(UInt64(col.name.utf8.count))
                head.varint(UInt64(col.count))
                head.varint(UInt64(col.dataCount))
                size += head.bytes.count + col.name.utf8.count + 2 + col.dataCount
            }
            w.varint(UInt64(size))
            w.varint(UInt64(c.columns.count))
            for col in c.columns {
                w.varint(UInt64(col.name.utf8.count))
                w.bytes.append(contentsOf: col.name.utf8)
                w.u8(col.type.rawValue)
                w.u8(col.encoding.rawValue)
                w.varint(UInt64(col.count))
                w.varint(UInt64(col.dataCount))
                w.bytes.append(contentsOf: col.buffer[col.range])
            }
        }
        return w.bytes
    }

    /// Reads a tree from `bytes[range]` (the whole buffer by default); nil when any length, name or tag is malformed or
    /// runs past the range. The columns point into `bytes`: nothing is copied. An unknown type or encoding refuses the
    /// tree (its values could not be read, and a migration could not convert them); two chunks with one tag, or two
    /// columns with one name in a chunk, refuse it too.
    public static func read(_ bytes: [UInt8], _ range: Range<Int>? = nil) -> SaveTree? {
        let whole = range ?? 0..<bytes.count
        guard whole.lowerBound >= 0, whole.upperBound <= bytes.count else { return nil }
        let end = whole.upperBound
        var r = ByteReader(bytes, offset: whole.lowerBound)
        func left() -> Int { end - r.offset }
        guard left() >= 2, let version = r.fixed(UInt16.self), let n = r.varint(), n <= UInt64(mostChunks) else { return nil }
        var chunks: [SaveChunk] = []
        chunks.reserveCapacity(Int(n))
        for _ in 0..<Int(n) {
            guard left() >= 4 else { return nil }
            let tagStart = r.offset
            guard let tag = tagString(bytes[tagStart..<(tagStart + 4)]), !chunks.contains(where: { $0.tag == tag }) else { return nil }
            r = ByteReader(bytes, offset: tagStart + 4)
            guard let length = r.varint(), r.offset <= end, length <= UInt64(left()) else { return nil }
            let chunkEnd = r.offset + Int(length)
            func inChunk() -> Int { chunkEnd - r.offset }
            guard let m = r.varint(), r.offset <= chunkEnd, m <= UInt64(mostColumns) else { return nil }
            var columns: [SaveColumn] = []
            columns.reserveCapacity(Int(m))
            for _ in 0..<Int(m) {
                guard let nameLength = r.varint(), r.offset <= chunkEnd, nameLength >= 1, nameLength <= UInt64(mostNameBytes),
                      nameLength <= UInt64(inChunk()) else { return nil }
                let nameStart = r.offset
                let name = bytes[nameStart..<(nameStart + Int(nameLength))]
                guard name.allSatisfy({ $0 >= 0x21 && $0 <= 0x7E }) else { return nil }
                r = ByteReader(bytes, offset: nameStart + Int(nameLength))
                guard inChunk() >= 2, let typeRaw = r.u8(), let type = SaveType(rawValue: typeRaw),
                      let encRaw = r.u8(), let encoding = ColumnEncoding(rawValue: encRaw),
                      let count = r.varint(), r.offset <= chunkEnd, count <= UInt64(Int32.max),
                      let dataLength = r.varint(), r.offset <= chunkEnd, dataLength <= UInt64(inChunk()) else { return nil }
                let dataStart = r.offset
                r = ByteReader(bytes, offset: dataStart + Int(dataLength))
                let nameString = String(decoding: name, as: UTF8.self)
                guard !columns.contains(where: { $0.name == nameString }) else { return nil }
                columns.append(SaveColumn(name: nameString, type: type, encoding: encoding, count: Int(count), buffer: bytes,
                                          range: dataStart..<(dataStart + Int(dataLength))))
            }
            guard r.offset == chunkEnd else { return nil }
            chunks.append(SaveChunk(tag: tag, columns: columns))
        }
        guard r.offset == end else { return nil }
        return SaveTree(formatVersion: version, chunks: chunks)
    }

    static func tagBytes(_ tag: String) -> [UInt8] {
        let b = Array(tag.utf8)
        precondition(b.count == 4 && b.allSatisfy { $0 >= 0x20 && $0 <= 0x7E }, "a chunk tag is four ASCII letters")
        return b
    }

    static func tagString(_ b: ArraySlice<UInt8>) -> String? {
        guard b.count == 4, b.allSatisfy({ $0 >= 0x20 && $0 <= 0x7E }) else { return nil }
        return String(decoding: b, as: UTF8.self)
    }
}

/// What a load skipped or filled in, for the log.
public struct SaveReport: Sendable, Equatable {
    /// Chunks and columns this version does not know, as "TAG" and "TAG.column".
    public var skipped: [String] = []
    /// Columns the save lacks, filled with their defaults, as "TAG.column".
    public var defaulted: [String] = []
    /// Waiting commands of a tag this version does not know.
    public var skippedCommands = 0
    public init() {}
}
