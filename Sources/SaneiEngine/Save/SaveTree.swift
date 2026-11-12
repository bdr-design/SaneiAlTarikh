import SaneiCore

// A save's payload as typed column buffers (§7): chunks, each a four-letter tag and its columns; a column is its name,
// its type, its encoding, its count and its bytes in the column codec. A later version reads what it knows and skips
// what it does not (a chunk and a column carry their lengths), and migrations work on these buffers, never on old Swift
// types. Reading checks every length against what is left, so a bad file is refused, never trusted. stdlib only.

/// The stored type of a column. The numbers are stored in saves: never renumber one.
public enum SaveType: UInt8, Sendable {
    case u8 = 1, u16 = 2, u32 = 3, u64 = 4
    case i8 = 5, i16 = 6, i32 = 7, i64 = 8
    case bool = 9
    /// Items of bytes, each with its length (a varint), for values with their own codec (a command, a name).
    case items = 10
}

/// One column: a name (ASCII, at most 64 bytes), its stored type and encoding, how many values, and their bytes.
public struct SaveColumn: Sendable, Equatable {
    public var name: String
    public var type: SaveType
    public var encoding: ColumnEncoding
    public var count: Int
    public var data: [UInt8]

    public init(name: String, type: SaveType, encoding: ColumnEncoding, count: Int, data: [UInt8]) {
        self.name = name
        self.type = type
        self.encoding = encoding
        self.count = count
        self.data = data
    }

    /// A column of whole numbers. Raw values take the stored type's width (a `.u8` column is one byte a value,
    /// whatever Swift type holds them); varints are the same whatever the width.
    public static func of<T: FixedWidthInteger>(_ name: String, _ values: [T], _ type: SaveType, _ encoding: ColumnEncoding) -> SaveColumn {
        var w = ByteWriter(capacity: values.count * 8)
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
        var w = ByteWriter()
        for v in values {
            w.varint(UInt64(v.count))
            w.bytes.append(contentsOf: v)
        }
        return SaveColumn(name: name, type: .items, encoding: .raw, count: values.count, data: w.bytes)
    }

    /// The values, when the column holds `type` and exactly its count of them in its bytes; nil otherwise, or past
    /// `limit` values.
    public func values<T: FixedWidthInteger>(_ t: T.Type, as type: SaveType, atMost limit: Int) -> [T]? {
        guard self.type == type, count <= limit else { return nil }
        var r = ByteReader(data)
        if encoding == .raw {
            func widened<W: FixedWidthInteger>(_ w: W.Type) -> [T]? {
                guard let v = ColumnCodec.read(W.self, count: count, atMost: limit, as: .raw, from: &r), r.remaining == 0 else { return nil }
                var out: [T] = []
                out.reserveCapacity(v.count)
                for x in v { out.append(T(truncatingIfNeeded: x)) }
                return out
            }
            switch type {
            case .u8: return widened(UInt8.self)
            case .i8: return widened(Int8.self)
            case .u16: return widened(UInt16.self)
            case .i16: return widened(Int16.self)
            case .u32: return widened(UInt32.self)
            case .i32: return widened(Int32.self)
            case .u64: return widened(UInt64.self)
            case .i64: return widened(Int64.self)
            case .bool, .items: return nil
            }
        }
        guard let v = ColumnCodec.read(T.self, count: count, atMost: limit, as: encoding, from: &r), r.remaining == 0 else { return nil }
        return v
    }

    /// The flags, when the column holds them (each byte 0 or 1).
    public func flags(atMost limit: Int) -> [Bool]? {
        guard type == .bool, encoding == .raw, count <= limit, data.count == count else { return nil }
        var out: [Bool] = []
        out.reserveCapacity(count)
        for b in data {
            guard b <= 1 else { return nil }
            out.append(b == 1)
        }
        return out
    }

    /// The byte items, when the column holds them, each at most `itemLimit` bytes.
    public func items(atMost limit: Int, itemLimit: Int) -> [[UInt8]]? {
        guard type == .items, count <= limit else { return nil }
        var r = ByteReader(data)
        var out: [[UInt8]] = []
        out.reserveCapacity(count)
        for _ in 0..<count {
            guard let n = r.varint(), n <= UInt64(itemLimit), n <= UInt64(r.remaining) else { return nil }
            out.append(Array(data[r.offset..<(r.offset + Int(n))]))
            r = ByteReader(data, offset: r.offset + Int(n))
        }
        return r.remaining == 0 ? out : nil
    }
}

/// One chunk: its tag (four ASCII letters, stored as a big-endian UInt32 so the bytes read as the letters) and its
/// columns, each name at most once.
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
    /// The most chunks, columns per chunk and name length a reader accepts.
    public static let mostChunks = 256
    public static let mostColumns = 256
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

    /// The tree's bytes: the format version (u16), the number of chunks, then each chunk: its tag (4 bytes), the
    /// length of its body, and the body (the number of columns, then each column: name length and name, type,
    /// encoding, count, data length and data).
    public func write() -> [UInt8] {
        var w = ByteWriter(capacity: 16 + chunks.reduce(0) { $0 + 16 + $1.columns.reduce(0) { $0 + 32 + $1.data.count } })
        w.fixed(formatVersion, as: UInt16.self)
        w.varint(UInt64(chunks.count))
        for c in chunks {
            for b in Self.tagBytes(c.tag) { w.u8(b) }
            var body = ByteWriter(capacity: c.columns.reduce(0) { $0 + 32 + $1.data.count })
            body.varint(UInt64(c.columns.count))
            for col in c.columns {
                let name = Array(col.name.utf8)
                body.varint(UInt64(name.count))
                body.bytes.append(contentsOf: name)
                body.u8(col.type.rawValue)
                body.u8(col.encoding.rawValue)
                body.varint(UInt64(col.count))
                body.varint(UInt64(col.data.count))
                body.bytes.append(contentsOf: col.data)
            }
            w.varint(UInt64(body.bytes.count))
            w.bytes.append(contentsOf: body.bytes)
        }
        return w.bytes
    }

    /// Reads a tree; nil when any length, name or tag is malformed or runs past the bytes. An unknown type or encoding
    /// refuses the tree: a reader that cannot tell a column's size cannot skip it safely. Two chunks with one tag, or
    /// two columns with one name in a chunk, refuse it too.
    public static func read(_ bytes: [UInt8]) -> SaveTree? {
        var r = ByteReader(bytes)
        guard let version = r.fixed(UInt16.self), let n = r.varint(), n <= UInt64(mostChunks) else { return nil }
        var chunks: [SaveChunk] = []
        chunks.reserveCapacity(Int(n))
        for _ in 0..<Int(n) {
            guard r.remaining >= 4 else { return nil }
            var tagBytes: [UInt8] = []
            for _ in 0..<4 { tagBytes.append(r.u8()!) }
            guard let tag = tagString(tagBytes), !chunks.contains(where: { $0.tag == tag }),
                  let length = r.varint(), length <= UInt64(r.remaining) else { return nil }
            let end = r.offset + Int(length)
            var b = ByteReader(Array(bytes[r.offset..<end]))
            r = ByteReader(bytes, offset: end)
            guard let m = b.varint(), m <= UInt64(mostColumns) else { return nil }
            var columns: [SaveColumn] = []
            columns.reserveCapacity(Int(m))
            for _ in 0..<Int(m) {
                guard let nameLength = b.varint(), nameLength >= 1, nameLength <= UInt64(mostNameBytes), nameLength <= UInt64(b.remaining) else { return nil }
                var name: [UInt8] = []
                for _ in 0..<Int(nameLength) { name.append(b.u8()!) }
                guard name.allSatisfy({ $0 >= 0x21 && $0 <= 0x7E }),
                      let typeRaw = b.u8(), let type = SaveType(rawValue: typeRaw),
                      let encRaw = b.u8(), let encoding = ColumnEncoding(rawValue: encRaw),
                      let count = b.varint(), count <= UInt64(Int32.max),
                      let dataLength = b.varint(), dataLength <= UInt64(b.remaining) else { return nil }
                let start = b.offset
                let data = Array(b.bytes[start..<(start + Int(dataLength))])
                b = ByteReader(b.bytes, offset: start + Int(dataLength))
                let nameString = String(decoding: name, as: UTF8.self)
                guard !columns.contains(where: { $0.name == nameString }) else { return nil }
                columns.append(SaveColumn(name: nameString, type: type, encoding: encoding, count: Int(count), data: data))
            }
            guard b.remaining == 0 else { return nil }
            chunks.append(SaveChunk(tag: tag, columns: columns))
        }
        guard r.remaining == 0 else { return nil }
        return SaveTree(formatVersion: version, chunks: chunks)
    }

    static func tagBytes(_ tag: String) -> [UInt8] {
        let b = Array(tag.utf8)
        precondition(b.count == 4 && b.allSatisfy { $0 >= 0x20 && $0 <= 0x7E }, "a chunk tag is four ASCII letters")
        return b
    }

    static func tagString(_ b: [UInt8]) -> String? {
        guard b.count == 4, b.allSatisfy({ $0 >= 0x20 && $0 <= 0x7E }) else { return nil }
        return String(decoding: b, as: UTF8.self)
    }
}
