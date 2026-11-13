import Foundation
import XCTest
@testable import SaneiCore
@testable import SaneiEngine

/// The container's, META's and the tree's edges: each case at a bound's both sides, or refused by its own rule alone,
/// so that changing the rule makes a test fail (the reviews planted faults).
final class SaveEdgeTests: XCTestCase {
    private let base = SaveTests.busyWorld().state
    private func meta() -> SaveMeta { SaveMeta(formatVersion: 1, date: base.world.date.days, seed: base.world.seed) }
    private func metaLength(_ file: [UInt8]) -> Int { Int(file[12]) | Int(file[13]) << 8 | Int(file[14]) << 16 | Int(file[15]) << 24 }
    private func reseal(_ b: inout [UInt8]) { b.replaceSubrange((b.count - 32)..., with: SHA256.hash(b, 0..<(b.count - 32))) }

    /// The bounds the file keeps are the documented ones (§3.5, §7).
    func testTheBoundsAreTheDocumentedOnes() {
        XCTAssertEqual(SaveFile.mostPayloadBytes, 12 << 20, "§3.5's 8 MB raw and half again")
        XCTAssertEqual(SaveFile.mostCompressedBytes, 4 << 20, "§3.5's 2 MB compressed, twice over")
        XCTAssertEqual(SaveFile.mostMetaBytes, 1 << 16)
        XCTAssertEqual(SaveTree.mostChunks, 64)
        XCTAssertEqual(SaveTree.mostColumns, 96)
        XCTAssertEqual(SaveTree.mostNameBytes, 64)
    }

    /// A compressor whose bytes are longer than the payload: the stored length is the stored bytes', so the file reads.
    func testTheStoredLengthIsTheStoredBytes() throws {
        struct Padded: SaveCompressor {
            var compression: SaveCompression { .rawDeflate }
            func compress(_ bytes: [UInt8], appendingTo out: inout [UInt8]) -> Bool { out.append(0xAA); out.append(contentsOf: bytes); return true }
            func decompress(_ bytes: ArraySlice<UInt8>, rawLength: Int) -> [UInt8]? { bytes.count == rawLength + 1 ? Array(bytes.dropFirst()) : nil }
        }
        let file = SaveCodec.write(base, meta: meta(), compressor: Padded())
        XCTAssertEqual(file[10], SaveCompression.rawDeflate.rawValue)
        XCTAssertEqual(try SaveCodec.read(file, decompressor: Padded()).get().state, base)
    }

    /// Compressed bytes up to `mostCompressedBytes` are kept compressed; one byte more and the payload is stored as it
    /// is, so the file still reads, with no decompressor.
    func testCompressedBytesPastTheBoundAreStoredAsTheyAre() throws {
        struct Sized: SaveCompressor {
            let size: Int
            var compression: SaveCompression { .rawDeflate }
            func compress(_ bytes: [UInt8], appendingTo out: inout [UInt8]) -> Bool {
                out.append(contentsOf: bytes)
                out.append(contentsOf: [UInt8](repeating: 0, count: size - bytes.count))
                return true
            }
            func decompress(_ bytes: ArraySlice<UInt8>, rawLength: Int) -> [UInt8]? { Array(bytes.prefix(rawLength)) }
        }
        let atBound = Sized(size: SaveFile.mostCompressedBytes)
        let kept = SaveCodec.write(base, meta: meta(), compressor: atBound)
        XCTAssertEqual(kept[10], SaveCompression.rawDeflate.rawValue)
        XCTAssertEqual(try SaveCodec.read(kept, decompressor: atBound).get().state, base)
        let past = SaveCodec.write(base, meta: meta(), compressor: Sized(size: SaveFile.mostCompressedBytes + 1))
        XCTAssertEqual(past[10], SaveCompression.none.rawValue)
        XCTAssertEqual(try SaveCodec.read(past).get().state, base)
    }

    /// A compressed file whose raw length is the bound opens; one byte more is refused before the decompressor is asked.
    func testARawLengthPastTheBoundIsRefused() {
        struct Zeros: SaveCompressor {
            var compression: SaveCompression { .rawDeflate }
            func compress(_ bytes: [UInt8], appendingTo out: inout [UInt8]) -> Bool { out.append(contentsOf: bytes); return true }
            func decompress(_ bytes: ArraySlice<UInt8>, rawLength: Int) -> [UInt8]? { [UInt8](repeating: 0, count: rawLength) }
        }
        let file = SaveCodec.write(base, meta: meta(), compressor: Zeros())
        let at = SaveFile.headerBytes + metaLength(file)
        func withRaw(_ n: Int) -> [UInt8] {
            var b = file
            for k in 0..<8 { b[at + k] = UInt8(truncatingIfNeeded: UInt64(n) >> UInt64(8 * k)) }
            reseal(&b)
            return b
        }
        guard case let .success(o) = SaveFile.open(withRaw(SaveFile.mostPayloadBytes), decompressor: Zeros()) else { return XCTFail("at the bound") }
        XCTAssertEqual(o.payload.count, SaveFile.mostPayloadBytes)
        XCTAssertEqual(SaveFile.open(withRaw(SaveFile.mostPayloadBytes + 1), decompressor: Zeros()).failureValue, .badPayload)
    }

    /// The saves list's prefix: from 16 bytes, from the whole file, and each refusal of the header.
    func testTheSavesListsPrefix() throws {
        let file = SaveCodec.write(base, meta: meta())
        let first16 = Array(file.prefix(16))
        XCTAssertEqual(try SaveFile.metaPrefixLength(first16).get(), 16 + metaLength(file))
        XCTAssertEqual(try SaveFile.metaPrefixLength(file).get(), 16 + metaLength(file), "a header with its META")
        XCTAssertEqual(SaveFile.metaPrefixLength(Array(file.prefix(12))).failureValue, .truncated)
        XCTAssertEqual(SaveFile.metaPrefixLength(Array("NOTASAVE12345678".utf8)).failureValue, .notASave)
        var zero = first16; zero[8] = 0; zero[9] = 0
        XCTAssertEqual(SaveFile.metaPrefixLength(zero).failureValue, .notASave)
        var newer = first16; newer[8] = 2
        XCTAssertEqual(SaveFile.metaPrefixLength(newer).failureValue, .newerContainer(2))
        var long = first16; long[14] = 1
        XCTAssertEqual(SaveFile.metaPrefixLength(long).failureValue, .badMeta)
    }

    /// META is one chunk: a second chunk in its tree refuses it.
    func testMetaIsOneChunk() {
        func file(_ chunks: [SaveChunk]) -> [UInt8] {
            var w = ByteWriter()
            w.bytes.append(contentsOf: SaveFile.magic); w.fixed(UInt16(1), as: UInt16.self); w.u8(0); w.u8(0)
            let mb = SaveTree(formatVersion: 1, chunks: chunks).write()
            w.fixed(UInt32(mb.count), as: UInt32.self); w.bytes.append(contentsOf: mb)
            return w.bytes
        }
        XCTAssertNotNil(try? SaveFile.readMeta(file([meta().chunk])).get(), "the control")
        XCTAssertEqual(SaveFile.readMeta(file([meta().chunk, SaveChunk(tag: "XTRA", columns: [])])).failureValue, .badMeta)
    }

    /// A text past 256 bytes is cut at a character's boundary: as near 256 as a whole character allows.
    func testATextIsCutAtACharactersBoundaryByBytes() throws {
        let payload = base.saveTree().write()
        for (name, kept) in [("a" + String(repeating: "م", count: 200), 255), (String(repeating: "x", count: 300), 256),
                             (String(repeating: "م", count: 200), 256), (String(repeating: "y", count: 256), 256)] {
            var m = meta()
            m.playerName = name
            let read = try SaveFile.readMeta(SaveFile.write(meta: m, payload: payload)).get().meta.playerName
            XCTAssertEqual(read.utf8.count, kept, "\(name.utf8.count) bytes")
            XCTAssertTrue(name.utf8.starts(with: read.utf8))
        }
    }

    /// With no player, the row means nothing: it is cleared when META is read and when a save is written.
    func testARowWithNoPlayerIsCleared() throws {
        var m = meta()
        m.playerRow = 5
        m.playerSerial = 0
        var r = SaveReport()
        XCTAssertEqual(SaveMeta.read(m.chunk, report: &r)?.playerRow, 0, "read")
        let file = SaveCodec.write(base, meta: m)
        let tree = try XCTUnwrap(SaveTree.read(file, SaveFile.headerBytes..<(SaveFile.headerBytes + metaLength(file))))
        XCTAssertEqual(tree.chunks[0].column("playerRow")?.values(UInt64.self, as: .u16, atMost: 1), [0], "written")
    }

    /// A player's government whose serial was given to a later row is left out when the save is written, so it reads.
    func testAPlayerGovernmentNeverMadeIsLeftOut() throws {
        var m = meta()
        let ahead = GovRef(row: Idx(raw: 0), serial: base.governments.serial[1])
        XCTAssertTrue(base.governments.counter.hasGiven(ahead.serial))
        XCTAssertFalse(base.governments.wasMade(ahead))
        m.playerGovernment = ahead
        XCTAssertNil(try SaveCodec.read(SaveCodec.write(base, meta: m)).get().meta.playerGovernment)
        m.playerGovernment = base.governments.ref(1)
        XCTAssertEqual(try SaveCodec.read(SaveCodec.write(base, meta: m)).get().meta.playerGovernment, base.governments.ref(1))
    }

    /// An items column ends with its last item: a byte after it refuses the column.
    func testAnItemsColumnEndsWithItsLastItem() {
        XCTAssertEqual(SaveColumn(name: "x", type: .items, encoding: .raw, count: 1, data: [1, 5]).items(atMost: 4, itemLimit: 8), [[5]])
        XCTAssertNil(SaveColumn(name: "x", type: .items, encoding: .raw, count: 1, data: [1, 5, 9]).items(atMost: 4, itemLimit: 8))
    }

    /// A tree's chunks and a chunk's columns at their caps read; one more is refused.
    func testTheTreesCaps() {
        func chunks(_ n: Int) -> [UInt8] {
            var w = ByteWriter()
            w.fixed(UInt16(1), as: UInt16.self); w.varint(UInt64(n))
            for k in 0..<n {
                w.bytes.append(contentsOf: [0x43, UInt8(0x30 + k / 100), UInt8(0x30 + k / 10 % 10), UInt8(0x30 + k % 10)])
                w.varint(1); w.varint(0)
            }
            return w.bytes
        }
        XCTAssertEqual(SaveTree.read(chunks(SaveTree.mostChunks))?.chunks.count, SaveTree.mostChunks)
        XCTAssertNil(SaveTree.read(chunks(SaveTree.mostChunks + 1)))
        func columns(_ n: Int) -> [UInt8] {
            var body = ByteWriter()
            body.varint(UInt64(n))
            for k in 0..<n {
                let name = Array("c\(k)".utf8)
                body.varint(UInt64(name.count)); body.bytes.append(contentsOf: name)
                body.u8(SaveType.u8.rawValue); body.u8(ColumnEncoding.raw.rawValue); body.varint(0); body.varint(0)
            }
            var w = ByteWriter()
            w.fixed(UInt16(1), as: UInt16.self); w.varint(1); w.bytes.append(contentsOf: Array("AAAA".utf8))
            w.varint(UInt64(body.bytes.count)); w.bytes.append(contentsOf: body.bytes)
            return w.bytes
        }
        XCTAssertEqual(SaveTree.read(columns(SaveTree.mostColumns))?.chunks[0].columns.count, SaveTree.mostColumns)
        XCTAssertNil(SaveTree.read(columns(SaveTree.mostColumns + 1)))
    }

    /// A ranged hash is the hash of the range's bytes, at any start and length (whole blocks read from the range).
    func testARangedHashIsItsBytesHash() {
        let bytes = (0..<300).map { UInt8(truncatingIfNeeded: $0 &* 31 &+ 7) }
        for r in [5..<200, 1..<65, 64..<300, 3..<300, 0..<0, 299..<300] {
            XCTAssertEqual(SHA256.hash(bytes, r), SHA256.hash(Array(bytes[r])), "\(r)")
        }
    }
}
