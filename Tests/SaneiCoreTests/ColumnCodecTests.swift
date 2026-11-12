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
            XCTAssertEqual(ColumnCodec.read(T.self, count: values.count, atMost: values.count, as: encoding, from: &r), values,
                           "\(encoding) \(values)", file: file, line: line)
            XCTAssertEqual(r.u8(), 0xEE, file: file, line: line)
            // read back when the column ends exactly where the bytes end
            var exact = ByteReader(bytes)
            XCTAssertEqual(ColumnCodec.read(T.self, count: values.count, atMost: 1_000, as: encoding, from: &exact), values,
                           "to the last byte: \(encoding) \(values)", file: file, line: line)
            XCTAssertEqual(exact.remaining, 0, file: file, line: line)
            // one value too many: refused, and the reader has not moved
            var short = ByteReader(bytes)
            XCTAssertNil(ColumnCodec.read(T.self, count: values.count + 1, atMost: 1_000, as: encoding, from: &short), file: file, line: line)
            XCTAssertEqual(short.offset, 0, file: file, line: line)
            // more values than the caller's table may hold: refused before anything is read
            if !values.isEmpty {
                var capped = ByteReader(bytes)
                XCTAssertNil(ColumnCodec.read(T.self, count: values.count, atMost: values.count - 1, as: encoding, from: &capped),
                             file: file, line: line)
                XCTAssertEqual(capped.offset, 0, file: file, line: line)
            }
        }
    }

    func testColumnsMatchTheReference() {
        check(CodecGolden.columns64)
        check(CodecGolden.columns32)
        check(CodecGolden.columnsU16)
        check(CodecGolden.columnsU64)
        check(CodecGolden.columns8)
        check(CodecGolden.columnsU32)
        XCTAssertEqual(ColumnEncoding.raw.rawValue, 0, "the stored numbers never change")
        XCTAssertEqual(ColumnEncoding.varintDelta.rawValue, 1)
        XCTAssertEqual(ColumnEncoding.zigzag.rawValue, 2)
    }

    func testDamagedColumnsAreRefused() {
        // a count no bytes could hold never allocates
        var empty = ByteReader([1, 2, 3])
        XCTAssertNil(ColumnCodec.read(Int64.self, count: .max, atMost: .max, as: .zigzag, from: &empty))
        XCTAssertNil(ColumnCodec.read(Int64.self, count: 1, atMost: 10, as: .raw, from: &empty), "three bytes are not an Int64")
        XCTAssertNil(ColumnCodec.read(Int64.self, count: -1, atMost: 10, as: .raw, from: &empty))
        XCTAssertNil(ColumnCodec.read(Int64.self, count: 1, atMost: 0, as: .zigzag, from: &empty), "above the caller's limit")
        XCTAssertNil(ColumnCodec.read(Int64.self, count: 1, atMost: -1, as: .zigzag, from: &empty))
        XCTAssertEqual(ColumnCodec.read(Int64.self, count: 0, atMost: 0, as: .zigzag, from: &empty), [])
        XCTAssertEqual(empty.offset, 0)
        // a value that does not fit the column's type
        var w = ByteWriter()
        ColumnCodec.write([Int64(127), 128], as: .zigzag, to: &w)
        var narrow = ByteReader(w.bytes)
        XCTAssertNil(ColumnCodec.read(Int8.self, count: 2, atMost: 2, as: .zigzag, from: &narrow))
        XCTAssertEqual(narrow.offset, 0)
        XCTAssertEqual(ColumnCodec.read(Int8.self, count: 1, atMost: 2, as: .zigzag, from: &narrow), [127])
        var negative = ByteWriter()
        ColumnCodec.write([Int64(-1)], as: .zigzag, to: &negative)
        var unsigned = ByteReader(negative.bytes)
        XCTAssertNil(ColumnCodec.read(UInt16.self, count: 1, atMost: 1, as: .zigzag, from: &unsigned), "-1 is not a UInt16")
        // a delta column whose running value leaves the type
        var deltas = ByteWriter()
        ColumnCodec.write([Int64(100), 300], as: .varintDelta, to: &deltas)
        var bytes = ByteReader(deltas.bytes)
        XCTAssertNil(ColumnCodec.read(UInt8.self, count: 2, atMost: 2, as: .varintDelta, from: &bytes))
    }

    /// A varint can be one byte and its value eight, so the bytes alone do not bound a column's memory: the caller's
    /// limit does. A column of zero bytes is a valid column of zeros.
    func testTheCallersLimitBoundsAColumn() {
        XCTAssertEqual(ColumnCodec.mostValues(of: Int64.self, as: .raw, in: 15), 1)
        XCTAssertEqual(ColumnCodec.mostValues(of: Int64.self, as: .raw, in: 16), 2)
        XCTAssertEqual(ColumnCodec.mostValues(of: Int64.self, as: .zigzag, in: 15), 15)
        XCTAssertEqual(ColumnCodec.mostValues(of: Int64.self, as: .varintDelta, in: 15), 15)
        XCTAssertEqual(ColumnCodec.mostValues(of: UInt16.self, as: .raw, in: 15), 7)
        XCTAssertEqual(ColumnCodec.mostValues(of: UInt8.self, as: .raw, in: 15), 15)
        XCTAssertEqual(ColumnCodec.mostValues(of: Int32.self, as: .raw, in: 0), 0)
        let zeros = [UInt8](repeating: 0, count: 10_000)
        var r = ByteReader(zeros)
        XCTAssertNil(ColumnCodec.read(Int64.self, count: 10_000, atMost: 8_192, as: .zigzag, from: &r), "a table of 8,192 rows has no such column")
        XCTAssertNil(ColumnCodec.read(Int64.self, count: 10_000, atMost: 9_999, as: .varintDelta, from: &r))
        XCTAssertEqual(r.offset, 0)
        XCTAssertEqual(ColumnCodec.read(Int64.self, count: 8_192, atMost: 8_192, as: .zigzag, from: &r)?.count, 8_192)
        XCTAssertEqual(r.offset, 8_192)
        // raw: the bytes bound it too
        var raw = ByteReader(zeros)
        XCTAssertNil(ColumnCodec.read(Int64.self, count: 1_251, atMost: 8_192, as: .raw, from: &raw), "10,000 bytes hold 1,250")
        XCTAssertEqual(ColumnCodec.read(Int64.self, count: 1_250, atMost: 8_192, as: .raw, from: &raw)?.count, 1_250)
        XCTAssertEqual(raw.remaining, 0)
    }

    func testFixedWidthsRoundTripLowByteFirst() {
        var w = ByteWriter(capacity: 32)
        w.fixed(0x1122_3344, as: UInt32.self)
        w.fixed(-2, as: Int16.self)
        w.fixed(9, as: UInt8.self)
        w.fixed(Int64.min, as: Int64.self)
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
        XCTAssertNil(r.fixed(UInt8.self))
        XCTAssertEqual(r.offset, 16)
        // a read that ends exactly where the bytes end
        var exact = ByteReader([1, 0])
        XCTAssertEqual(exact.fixed(UInt16.self), 1)
        XCTAssertEqual(exact.remaining, 0)
        var eight = ByteReader([0, 0, 0, 0, 0, 0, 0, 0x80])
        XCTAssertEqual(ColumnCodec.read(Int64.self, count: 1, atMost: 1, as: .raw, from: &eight), [Int64.min])
        XCTAssertEqual(eight.remaining, 0)
        // the width is the named type's, not the number's
        var named = ByteWriter()
        named.fixed(1, as: UInt16.self)
        XCTAssertEqual(named.bytes, [1, 0])
        named.removeAll()
        XCTAssertEqual(named.bytes, [])
        // where a reader starts
        XCTAssertEqual(ByteReader([1, 2], offset: 99).remaining, 0, "a start past the end is the end")
        XCTAssertEqual(ByteReader([1, 2], offset: -5).offset, 0, "a start before the bytes is their start")
        var middle = ByteReader([1, 2, 3], offset: 1)
        XCTAssertEqual(middle.u8(), 2)
    }

    func testRandomBytesNeverTrap() {
        var g = DetRNG(seed: 7, key: 0, stream: 9, serial: 0)
        for _ in 0..<3_000 {
            let bytes = (0..<Int(g.below(24))).map { _ in UInt8(truncatingIfNeeded: g.next()) }
            var r = ByteReader(bytes)
            while r.remaining > 0 {
                let before = r.offset
                if r.varint() == nil {
                    XCTAssertEqual(r.offset, before, "a refused varint does not move the reader")
                    _ = r.u8()
                }
                XCTAssertGreaterThan(r.offset, before)
            }
            for encoding in [ColumnEncoding.raw, .varintDelta, .zigzag] {
                var c = ByteReader(bytes)
                let count = Int(g.below(40))
                if let column = ColumnCodec.read(Int32.self, count: count, atMost: 40, as: encoding, from: &c) {
                    XCTAssertEqual(column.count, count)
                    // what was read writes back to the same bytes: one byte string per column
                    var w = ByteWriter()
                    ColumnCodec.write(column, as: encoding, to: &w)
                    XCTAssertEqual(w.bytes, Array(bytes.prefix(c.offset)))
                } else {
                    XCTAssertEqual(c.offset, 0)
                    // a raw column is refused only when the bytes are too few: every bit pattern is a value
                    if encoding == .raw { XCTAssertGreaterThan(count * 4, bytes.count) }
                }
            }
            // any bytes are a raw column of bytes, to the last one
            var whole = ByteReader(bytes)
            XCTAssertEqual(ColumnCodec.read(UInt8.self, count: bytes.count, atMost: 24, as: .raw, from: &whole), bytes)
        }
    }

    func testStateHashMatchesTheReference() {
        for (columns, expected) in CodecGolden.hashes {
            var h = StateHasher()
            for c in columns { h.combine(c) }
            XCTAssertEqual(h.value, expected, "\(columns)")
        }
        // the same number hashes the same in every width, alone and in a column
        var narrow = StateHasher()
        narrow.combine(Int8(-1))
        var wide = StateHasher()
        wide.combine(Int64(-1))
        XCTAssertEqual(narrow.value, wide.value)
        func hash<T: FixedWidthInteger>(_ column: [T]) -> UInt64 {
            var h = StateHasher()
            h.combine(column)
            return h.value
        }
        XCTAssertEqual(hash([Int8(-1)]), hash([Int64(-1)]))
        XCTAssertEqual(hash([Int32.min, 7]), hash([Int64(Int32.min), 7]))
        XCTAssertEqual(hash([UInt16(65_535)]), hash([Int64(65_535)]))
        XCTAssertNotEqual(hash([UInt16(65_535)]), hash([Int16(-1)]), "65,535 is not -1")
        XCTAssertEqual(hash([UInt8(1), 2, 3]), hash([UInt64(1), 2, 3]))
        var a = StateHasher()
        a.combine(UInt64(1))
        a.combine(UInt64(2))
        var b = StateHasher()
        b.combine(UInt64(2))
        b.combine(UInt64(1))
        XCTAssertNotEqual(a.value, b.value, "order matters")
        // the states a multiply per value could not tell apart: signs, top bits, a swap
        XCTAssertNotEqual(hash([Int64(0), 0]), hash([Int64.min, Int64.min]))
        XCTAssertNotEqual(hash([Int64(-1), 1, 0]), hash([Int64(1), -1, 0]))
        XCTAssertNotEqual(hash([Int64.max, -1]), hash([Int64(-1), Int64.max]))
        XCTAssertNotEqual(hash([UInt64(1) << 63, 5, UInt64(1) << 63]), hash([UInt64(0), 5, 0]), "a flag on a pair and on its mirror")
        // a flag is 1 or 0
        var flags = StateHasher()
        flags.combine(true)
        flags.combine(false)
        var bits = StateHasher()
        bits.combine(UInt8(1))
        bits.combine(UInt8(0))
        XCTAssertEqual(flags.value, bits.value)
        XCTAssertEqual(StateHasher().value, 0xCBF2_9CE4_8422_2325, "nothing mixed in")
        // a state of 0 does not swallow the zeros after it: an empty column and a `false` still move the hash
        var zero = StateHasher()
        zero.state = 0
        var seen: Set<UInt64> = [zero.value]
        zero.combine([UInt8]())
        XCTAssertTrue(seen.insert(zero.value).inserted)
        zero.combine(false)
        XCTAssertTrue(seen.insert(zero.value).inserted)
        zero.combine(UInt64(0))
        XCTAssertTrue(seen.insert(zero.value).inserted)
        // a hasher's value mixed into another fresh one is not a dead end either
        var outer = StateHasher()
        outer.combine(StateHasher().value)
        let afterValue = outer.value
        outer.combine([Int64]())
        XCTAssertNotEqual(outer.value, afterValue)
    }
}
