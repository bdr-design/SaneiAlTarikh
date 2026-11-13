import Foundation

/// A strict JSON reader for the content's few JSON files (`aliases.json`): one parser, so there is one reading of every
/// file. It refuses what a lenient parser would let through: a byte-order mark, a key twice in one object, a number
/// with a fraction or an exponent (numbers are whole, at most 18 digits), a control character in a string, more than
/// 64 levels of nesting, and anything after the value.
public enum JSON: Sendable, Equatable {
    case object([(key: String, value: JSON)])
    case array([JSON])
    case string(String)
    case integer(Int64)
    case bool(Bool)
    case null

    public static func == (a: JSON, b: JSON) -> Bool {
        switch (a, b) {
        case let (.object(x), .object(y)): return x.count == y.count && zip(x, y).allSatisfy { $0.key == $1.key && $0.value == $1.value }
        case let (.array(x), .array(y)): return x == y
        case let (.string(x), .string(y)): return x.utf8.elementsEqual(y.utf8)
        case let (.integer(x), .integer(y)): return x == y
        case let (.bool(x), .bool(y)): return x == y
        case (.null, .null): return true
        default: return false
        }
    }

    /// The object's value for `key` (keys are unique: the reader refuses a repeated one).
    public subscript(key: String) -> JSON? {
        guard case let .object(pairs) = self else { return nil }
        return pairs.first { $0.key == key }?.value
    }

    public var keys: [String] {
        guard case let .object(pairs) = self else { return [] }
        return pairs.map(\.key)
    }

    public static func parse(_ data: [UInt8], file: String) throws -> JSON {
        var p = Parser(bytes: data, file: file)
        if data.starts(with: [0xEF, 0xBB, 0xBF]) { throw p.fail("a byte-order mark: save as UTF-8 without one") }
        guard String(decoding: data, as: UTF8.self).utf8.elementsEqual(data) else { throw p.fail("not valid UTF-8") }
        p.space()
        let v = try p.value(depth: 0)
        p.space()
        guard p.i == data.count else { throw p.fail("text after the value") }
        return v
    }

    struct Parser {
        let bytes: [UInt8]
        let file: String
        var i = 0

        func fail(_ m: String) -> BakeError {
            let line = 1 + bytes[..<Swift.min(i, bytes.count)].filter { $0 == 0x0A }.count
            return BakeError(file, line, m)
        }

        mutating func space() { while i < bytes.count, [0x20, 0x09, 0x0A, 0x0D].contains(bytes[i]) { i += 1 } }

        mutating func expect(_ word: String) throws {
            let w = Array(word.utf8)
            guard i + w.count <= bytes.count, Array(bytes[i..<(i + w.count)]) == w else { throw fail("expected «\(word)»") }
            i += w.count
        }

        mutating func value(depth: Int) throws -> JSON {
            guard depth < 64 else { throw fail("nested past 64 levels") }
            guard i < bytes.count else { throw fail("a value is missing") }
            switch bytes[i] {
            case 0x7B: return try object(depth: depth)
            case 0x5B: return try array(depth: depth)
            case 0x22: return .string(try string())
            case 0x74: try expect("true"); return .bool(true)
            case 0x66: try expect("false"); return .bool(false)
            case 0x6E: try expect("null"); return .null
            default: return .integer(try integer())
            }
        }

        mutating func object(depth: Int) throws -> JSON {
            i += 1
            var pairs: [(key: String, value: JSON)] = []
            space()
            if i < bytes.count && bytes[i] == 0x7D { i += 1; return .object(pairs) }
            while true {
                space()
                guard i < bytes.count, bytes[i] == 0x22 else { throw fail("a key must be a string") }
                let key = try string()
                if pairs.contains(where: { $0.key.utf8.elementsEqual(key.utf8) }) { throw fail("the key «\(key)» twice in one object") }
                space()
                try expect(":")
                space()
                pairs.append((key, try value(depth: depth + 1)))
                space()
                guard i < bytes.count else { throw fail("an object never closed") }
                if bytes[i] == 0x2C { i += 1; continue }
                guard bytes[i] == 0x7D else { throw fail("expected «,» or «}»") }
                i += 1
                return .object(pairs)
            }
        }

        mutating func array(depth: Int) throws -> JSON {
            i += 1
            var items: [JSON] = []
            space()
            if i < bytes.count && bytes[i] == 0x5D { i += 1; return .array(items) }
            while true {
                space()
                items.append(try value(depth: depth + 1))
                space()
                guard i < bytes.count else { throw fail("an array never closed") }
                if bytes[i] == 0x2C { i += 1; continue }
                guard bytes[i] == 0x5D else { throw fail("expected «,» or «]»") }
                i += 1
                return .array(items)
            }
        }

        mutating func string() throws -> String {
            i += 1
            var out: [UInt8] = []
            while true {
                guard i < bytes.count else { throw fail("a string never closed") }
                let b = bytes[i]
                if b == 0x22 { i += 1; break }
                if b < 0x20 { throw fail("a control character in a string") }
                if b == 0x5C {
                    guard i + 1 < bytes.count else { throw fail("a string never closed") }
                    let e = bytes[i + 1]
                    switch e {
                    case 0x22, 0x5C, 0x2F: out.append(e)
                    case 0x6E: out.append(0x0A)
                    case 0x74: out.append(0x09)
                    default: throw fail("an escape this reader does not take (only \\\" \\\\ \\/ \\n \\t)")
                    }
                    i += 2
                    continue
                }
                out.append(b)
                i += 1
            }
            return String(decoding: out, as: UTF8.self)
        }

        mutating func integer() throws -> Int64 {
            let start = i
            if i < bytes.count && bytes[i] == 0x2D { i += 1 }
            let digits = i
            while i < bytes.count && bytes[i] >= 0x30 && bytes[i] <= 0x39 { i += 1 }
            let n = i - digits
            guard n >= 1, n <= 18 else { throw fail(n == 0 ? "not a value" : "a number past 18 digits") }
            if n > 1 && bytes[digits] == 0x30 { throw fail("a number with a leading zero") }
            if i < bytes.count && [0x2E, 0x65, 0x45].contains(bytes[i]) { throw fail("a number with a fraction or an exponent: numbers are whole") }
            return Int64(String(decoding: bytes[start..<i], as: UTF8.self))!
        }
    }
}
