import Foundation
import XCTest
@testable import SaneiCore
@testable import SaneiContent
@testable import SaneiBake

/// What the content's tests share: copies of the repository's content with one change, the bake's refusal with its
/// file, line and rule, and forged `content.bin` files.
protocol ContentFixtures: XCTestCase {}

extension ContentFixtures {
    func hex(_ b: [UInt8]) -> String { b.map { String(format: "%02x", $0) }.joined() }

    /// A copy of the repository's content in a new folder, with `change` applied to one file's text.
    func copy(_ file: String? = nil, _ change: (String) -> String = { $0 }) throws -> URL {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("content-\(UUID().uuidString)")
        let reg = dir.appendingPathComponent("registry")
        try FileManager.default.createDirectory(at: reg, withIntermediateDirectories: true)
        for name in try FileManager.default.contentsOfDirectory(atPath: ContentTests.registry.path) {
            var text = try String(contentsOf: ContentTests.registry.appendingPathComponent(name), encoding: .utf8)
            if name == file { text = change(text) }
            try Data(text.utf8).write(to: reg.appendingPathComponent(name))
        }
        addTeardownBlock { try? FileManager.default.removeItem(at: dir) }
        return dir
    }

    /// Refused by the bake, with this file and line, and a message holding `rule`.
    func refused(_ dir: URL, file: String, line: Int, _ rule: String, _ at: UInt = #line) {
        do {
            _ = try Bake.validate(dir)
            XCTFail("«\(rule)»: not refused", line: at)
        } catch let e as BakeError {
            XCTAssertEqual(e.file, file, "\(e)", line: at)
            XCTAssertEqual(e.line, line, "\(e)", line: at)
            XCTAssertTrue(e.message.contains(rule), "«\(rule)» not in «\(e.message)»", line: at)
        } catch { XCTFail("\(error)", line: at) }
    }

    func swap(_ old: String, _ new: String) -> (String) -> String {
        { s in
            XCTAssertTrue(s.contains(old), "«\(old)» is not in the file")
            return s.replacingOccurrences(of: old, with: new)
        }
    }

    func reseal(_ b: inout [UInt8]) { b.replaceSubrange((b.count - 32)..., with: SHA256.hash(b, 0..<(b.count - 32))) }

    /// A file made from these chunks, sealed.
    func file(_ chunks: [SaveChunk], format: UInt16 = ContentFile.format) -> [UInt8] {
        let payload = SaveTree(formatVersion: format, chunks: chunks).write()
        var w = ByteWriter()
        w.bytes.append(contentsOf: ContentFile.magic)
        w.fixed(ContentFile.containerVersion, as: UInt16.self)
        w.fixed(UInt16(0), as: UInt16.self)
        w.fixed(UInt32(payload.count), as: UInt32.self)
        w.bytes.append(contentsOf: payload)
        w.bytes.append(contentsOf: SHA256.hash(w.bytes))
        return w.bytes
    }
}
