import Foundation

/// A problem in a content file, with where it is.
public struct BakeError: Error, Sendable, Equatable, CustomStringConvertible {
    public var file: String
    /// The 1-based line, 0 for the file as a whole.
    public var line: Int
    public var message: String

    public init(_ file: String, _ line: Int, _ message: String) {
        self.file = file
        self.line = line
        self.message = message
    }

    public var description: String { line > 0 ? "\(file):\(line): \(message)" : "\(file): \(message)" }
}

/// A strict CSV reader (RFC 4180 with stricter rules): UTF-8 only, no byte-order mark, lines ending in `\n` alone, no
/// empty line, the first line the header, every row as many fields as the header. A field may be quoted, with `""`
/// for a quote inside; a quoted field never holds a line break; an unquoted one never starts or ends with a space. The
/// file is split on its bytes (a comma, a quote and a line break are single ASCII bytes, never inside a character), so
/// how it splits never depends on Unicode's tables. Nothing is guessed: a file that breaks a rule is refused with its
/// line.
public struct CSV: Sendable {
    public var header: [String]
    /// The rows with their line numbers.
    public var rows: [(line: Int, fields: [String])]

    public static func parse(_ data: [UInt8], file: String) throws -> CSV {
        if data.starts(with: [0xEF, 0xBB, 0xBF]) { throw BakeError(file, 1, "a byte-order mark: save as UTF-8 without one") }
        guard String(decoding: data, as: UTF8.self).utf8.elementsEqual(data) else { throw BakeError(file, 0, "not valid UTF-8") }
        if data.contains(0x0D) { throw BakeError(file, 0, "a carriage return: lines end in \\n alone") }
        var lines = data.split(separator: 0x0A, omittingEmptySubsequences: false)
        if lines.last?.isEmpty == true { lines.removeLast() }
        guard !lines.isEmpty else { throw BakeError(file, 0, "empty: no header") }
        let header = try fields(lines[0], file: file, line: 1)
        for (k, h) in header.enumerated() {
            if h.isEmpty { throw BakeError(file, 1, "an empty column name") }
            if header[..<k].contains(where: { $0.utf8.elementsEqual(h.utf8) }) { throw BakeError(file, 1, "the column «\(h)» twice") }
        }
        var rows: [(Int, [String])] = []
        for (k, l) in lines.enumerated().dropFirst() {
            if l.isEmpty { throw BakeError(file, k + 1, "an empty line") }
            let f = try fields(l, file: file, line: k + 1)
            guard f.count == header.count else {
                throw BakeError(file, k + 1, "\(f.count) fields, the header has \(header.count)")
            }
            rows.append((k + 1, f))
        }
        return CSV(header: header, rows: rows)
    }

    static func fields(_ line: ArraySlice<UInt8>, file: String, line n: Int) throws -> [String] {
        let comma: UInt8 = 0x2C, quote: UInt8 = 0x22
        var out: [String] = []
        var i = line.startIndex
        while true {
            var f: [UInt8] = []
            if i < line.endIndex && line[i] == quote {
                i += 1
                while true {
                    guard i < line.endIndex else { throw BakeError(file, n, "a quote never closed") }
                    if line[i] == quote {
                        if i + 1 < line.endIndex && line[i + 1] == quote { f.append(quote); i += 2; continue }
                        i += 1
                        break
                    }
                    f.append(line[i])
                    i += 1
                }
                out.append(String(decoding: f, as: UTF8.self))
                if i == line.endIndex { return out }
                guard line[i] == comma else { throw BakeError(file, n, "text after a closing quote") }
            } else {
                while i < line.endIndex && line[i] != comma {
                    if line[i] == quote { throw BakeError(file, n, "a quote inside an unquoted field") }
                    f.append(line[i])
                    i += 1
                }
                let s = String(decoding: f, as: UTF8.self)
                if s.unicodeScalars.first?.properties.isWhitespace == true || s.unicodeScalars.last?.properties.isWhitespace == true {
                    throw BakeError(file, n, "a space around «\(s)»: quote it, or take the space out")
                }
                out.append(s)
                if i == line.endIndex { return out }
            }
            i += 1                                          // the comma
        }
    }

    /// The rows as name-to-value records, after checking the header is exactly `schema`, in order.
    public func records(_ schema: [String], file: String) throws -> [(line: Int, value: (String) -> String)] {
        guard header == schema else {
            throw BakeError(file, 1, "the header is «\(header.joined(separator: ","))», the schema is «\(schema.joined(separator: ","))»")
        }
        var position: [String: Int] = [:]
        for (k, h) in header.enumerated() { position[h] = k }
        return rows.map { row in
            (row.line, { (name: String) -> String in row.fields[position[name]!] })
        }
    }
}
