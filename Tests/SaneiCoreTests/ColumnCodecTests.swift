import XCTest
@testable import SaneiCore

final class ColumnCodecTests: XCTestCase {
    func testVarintsAndZigzagsMatchTheReference() {
        for (v, bytes) in CodecGolden.varints {
            var w = ByteWriter()
            w.varint(v)
            XCTAssertEqual(w.bytes, bytes, "varint \(v)")
            var r = ByteReader(bytes)
            XCTAssertEqual(r.varint(), v)
            XCTAssertEqual(r.remaining, 0)
        }
        for (v, bytes) in CodecGolden.zigzags {
            var w = ByteWriter()
            w.zigzag(v)
            XCTAssertEqual(w.bytes, bytes, "zigzag \(v)")
            var r = ByteReader(bytes)
            XCTAssertEqual(r.zigzag(), v)
            XCTAssertEqual(r.remaining, 0)
        }
    }

    func testDamagedVarintsAreRefusedAndThePositionStays() {
        for bytes in CodecGolden.badVarints {
            var r = ByteReader([7] + bytes)
            XCTAssertEqual(r.u8(), 7)
            XCTAssertNil(r.varint(), "\(bytes)")
            XCTAssertEqual(r.offset, 1, "a failed read does not move: \(bytes)")
            XCTAssertNil(r.zigzag(), "\(bytes)")
            XCTAssertEqual(r.offset, 1)
        }
    }

    private func check<T: FixedWidthInteger>(_ rows: [(UInt8, [T], [UInt8])], file: StaticString = #filePath, line: UInt = #line) {
        for (tag, values, bytes) in rows {
            guard let encoding = ColumnEncoding(rawValue: tag) else {
                XCTFail("encoding \(tag)", file: file, line: line)
                continue
            }
            var w = ByteWriter()
            ColumnCodec.write(values, as: encoding, to: &w)
            XCTAssertEqual(w.bytes, bytes, "\(encoding) \(values)", file: file, line: line)
            // read back, with a byte after the column that must be left alone
            var r = ByteReader(bytes + [0xEE])
            XCTAssertEqual(ColumnCodec.read(T.self, count: values.count, as: encoding, from: &r), values, "\(encoding) \(values)",
                           file: file, line: line)
            XCTAssertEqual(r.u8(), 0xEE, file: file, line: line)
            // one value too many: refused, and the reader has not moved
            var short = ByteReader(bytes)
            XCTAssertNil(ColumnCodec.read(T.self, count: values.count + 1, as: encoding, from: &short), file: file, line: line)
            XCTAssertEqual(short.offset, 0, file: file, line: line)
        }
    }

    func testColumnsMatchTheReference() {
        check(CodecGolden.columns64)
        check(CodecGolden.columns32)
        check(CodecGolden.columnsU16)
        check(CodecGolden.columnsU64)
        check(CodecGolden.columns8)
        XCTAssertEqual(ColumnEncoding.raw.rawValue, 0, "the stored numbers never change")
        XCTAssertEqual(ColumnEncoding.varintDelta.rawValue, 1)
        XCTAssertEqual(ColumnEncoding.zigzag.rawValue, 2)
    }

    func testDamagedColumnsAreRefused() {
        // a count no bytes could hold never allocates
        var empty = ByteReader([1, 2, 3])
        XCTAssertNil(ColumnCodec.read(Int64.self, count: .max, as: .zigzag, from: &empty))
        XCTAssertNil(ColumnCodec.read(Int64.self, count: 1, as: .raw, from: &empty), "three bytes are not an Int64")
        XCTAssertNil(ColumnCodec.read(Int64.self, count: -1, as: .raw, from: &empty))
        XCTAssertEqual(empty.offset, 0)
        // a value that does not fit the column's type
        var w = ByteWriter()
        ColumnCodec.write([Int64(127), 128], as: .zigzag, to: &w)
        var narrow = ByteReader(w.bytes)
        XCTAssertNil(ColumnCodec.read(Int8.self, count: 2, as: .zigzag, from: &narrow))
        XCTAssertEqual(narrow.offset, 0)
        XCTAssertEqual(ColumnCodec.read(Int8.self, count: 1, as: .zigzag, from: &narrow), [127])
        var negative = ByteWriter()
        ColumnCodec.write([Int64(-1)], as: .zigzag, to: &negative)
        var unsigned = ByteReader(negative.bytes)
        XCTAssertNil(ColumnCodec.read(UInt16.self, count: 1, as: .zigzag, from: &unsigned), "-1 is not a UInt16")
        // a delta column whose running value leaves the type
        var deltas = ByteWriter()
        ColumnCodec.write([Int64(100), 300], as: .varintDelta, to: &deltas)
        var bytes = ByteReader(deltas.bytes)
        XCTAssertNil(ColumnCodec.read(UInt8.self, count: 2, as: .varintDelta, from: &bytes))
    }

    func testFixedWidthsRoundTripLowByteFirst() {
        var w = ByteWriter(capacity: 32)
        w.fixed(UInt32(0x1122_3344))
        w.fixed(Int16(-2))
        w.fixed(UInt8(9))
        w.fixed(Int64.min)
        w.u8(1)
        XCTAssertEqual(Array(w.bytes.prefix(7)), [0x44, 0x33, 0x22, 0x11, 0xFE, 0xFF, 9])
        var r = ByteReader(w.bytes)
        XCTAssertEqual(r.fixed(UInt32.self), 0x1122_3344)
        XCTAssertEqual(r.fixed(Int16.self), -2)
        XCTAssertEqual(r.fixed(UInt8.self), 9)
        XCTAssertEqual(r.fixed(Int64.self), Int64.min)
        XCTAssertNil(r.fixed(UInt16.self), "one byte is left")
        XCTAssertEqual(r.remaining, 1)
        XCTAssertEqual(r.u8(), 1)
        XCTAssertNil(r.u8())
        XCTAssertEqual(ByteReader([1, 2], offset: 99).remaining, 0, "a start past the end is the end")
    }

    func testRandomBytesNeverTrap() {
        var g = DetRNG(seed: 7, key: 0, stream: 9, serial: 0)
        for _ in 0..<3_000 {
            let bytes = (0..<Int(g.below(24))).map { _ in UInt8(truncatingIfNeeded: g.next()) }
            var r = ByteReader(bytes)
            while r.remaining > 0 {
                if r.varint() == nil { _ = r.u8() }
            }
            for encoding in [ColumnEncoding.raw, .varintDelta, .zigzag] {
                var c = ByteReader(bytes)
                let count = Int(g.below(40))
                if let column = ColumnCodec.read(Int32.self, count: count, as: encoding, from: &c) {
                    XCTAssertEqual(column.count, count)
                    // what was read writes back to the same bytes: one byte string per column
                    var w = ByteWriter()
                    ColumnCodec.write(column, as: encoding, to: &w)
                    XCTAssertEqual(w.bytes, Array(bytes.prefix(c.offset)))
                } else {
                    XCTAssertEqual(c.offset, 0)
                }
            }
        }
    }

    func testStateHashMatchesTheReference() {
        for (columns, expected) in CodecGolden.hashes {
            var h = StateHasher()
            for c in columns { h.combine(c) }
            XCTAssertEqual(h.value, expected, "\(columns)")
        }
        // the same number hashes the same in every width
        var narrow = StateHasher()
        narrow.combine(Int8(-1))
        var wide = StateHasher()
        wide.combine(Int64(-1))
        XCTAssertEqual(narrow.value, wide.value)
        var a = StateHasher()
        a.combine(UInt64(1))
        a.combine(UInt64(2))
        var b = StateHasher()
        b.combine(UInt64(2))
        b.combine(UInt64(1))
        XCTAssertNotEqual(a.value, b.value, "order matters")
    }
}
