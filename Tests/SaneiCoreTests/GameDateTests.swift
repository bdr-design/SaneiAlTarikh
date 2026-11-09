import XCTest
@testable import SaneiCore

final class GameDateTests: XCTestCase {
    func testEveryDayOfTheSupportedRange() {
        XCTAssertEqual(GameDate(year: 1850, month: 1, day: 1), GameDate.min)
        XCTAssertEqual(GameDate(year: 2200, month: 12, day: 31), GameDate.max)
        var previous = (year: 1849, month: 12, day: 31)
        var weekday = (GameDate.min.weekday + 6) % 7
        for days in GameDate.min.days...GameDate.max.days {
            let date = GameDate(days: days)
            let c = date.civil
            XCTAssertEqual(GameDate(year: c.year, month: c.month, day: c.day), date, "day \(days)")
            // each day follows the one before it
            if c.day == 1 {
                let newYear = c.month == 1
                XCTAssertEqual(c.month, newYear ? 1 : previous.month + 1, "day \(days)")
                XCTAssertEqual(c.year, newYear ? previous.year + 1 : previous.year, "day \(days)")
                XCTAssertEqual(previous.day, GameDate.daysIn(month: previous.month, year: previous.year), "day \(days)")
            } else {
                XCTAssertEqual(c.day, previous.day + 1, "day \(days)")
                XCTAssertEqual(c.month, previous.month, "day \(days)")
                XCTAssertEqual(c.year, previous.year, "day \(days)")
            }
            weekday = (weekday + 1) % 7
            XCTAssertEqual(date.weekday, weekday, "day \(days)")
            XCTAssertTrue(date.isSupported)
            previous = c
        }
        XCTAssertEqual(previous.year, 2200)
        XCTAssertEqual(previous.month, 12)
        XCTAssertEqual(previous.day, 31)
    }

    func testKnownDays() {
        let start = GameDate(year: 2011, month: 1, day: 1)
        XCTAssertEqual(start?.days, 14_975)
        XCTAssertEqual(start?.weekday, 6, "1 January 2011 was a Saturday")
        XCTAssertEqual(GameDate(days: 0).year, 1970)
        XCTAssertEqual(GameDate(days: 0).weekday, 4, "1 January 1970 was a Thursday")
        XCTAssertEqual(GameDate(year: 2011, month: 7, day: 9)?.daysSince(GameDate(days: 14_975)), 189, "South Sudan's day")
        XCTAssertTrue(GameDate.isLeap(year: 2000))
        XCTAssertTrue(GameDate.isLeap(year: 2012))
        XCTAssertFalse(GameDate.isLeap(year: 1900))
        XCTAssertFalse(GameDate.isLeap(year: 2100))
        XCTAssertFalse(GameDate.isLeap(year: 2011))
    }

    func testDaysThatDoNotExist() {
        XCTAssertNil(GameDate(year: 2011, month: 2, day: 29))
        XCTAssertNil(GameDate(year: 1900, month: 2, day: 29))
        XCTAssertNil(GameDate(year: 2100, month: 2, day: 29))
        XCTAssertNotNil(GameDate(year: 2000, month: 2, day: 29))
        XCTAssertNil(GameDate(year: 2011, month: 4, day: 31))
        XCTAssertNil(GameDate(year: 2011, month: 13, day: 1))
        XCTAssertNil(GameDate(year: 2011, month: 0, day: 1))
        XCTAssertNil(GameDate(year: 2011, month: 1, day: 0))
        XCTAssertNil(GameDate(year: 1849, month: 12, day: 31))
        XCTAssertNil(GameDate(year: 2201, month: 1, day: 1))
        XCTAssertFalse(GameDate(days: GameDate.max.days + 1).isSupported)
        XCTAssertFalse(GameDate(days: GameDate.min.days - 1).isSupported)
    }

    func testAddingDaysAndMonths() throws {
        let start = try XCTUnwrap(GameDate(year: 2011, month: 1, day: 31))
        XCTAssertEqual(start.adding(days: 1), GameDate(year: 2011, month: 2, day: 1))
        XCTAssertEqual(start.adding(days: -31), GameDate(year: 2010, month: 12, day: 31))
        XCTAssertEqual(start.adding(months: 1), GameDate(year: 2011, month: 2, day: 28))
        XCTAssertEqual(start.adding(months: 13), GameDate(year: 2012, month: 2, day: 29))
        XCTAssertEqual(start.adding(months: 2), GameDate(year: 2011, month: 3, day: 31))
        XCTAssertEqual(start.adding(months: -1), GameDate(year: 2010, month: 12, day: 31))
        XCTAssertEqual(start.adding(months: -2), GameDate(year: 2010, month: 11, day: 30))
        XCTAssertEqual(start.adding(months: 12 * 89), GameDate(year: 2100, month: 1, day: 31))
        XCTAssertEqual(start.startOfMonth, GameDate(year: 2011, month: 1, day: 1))
        XCTAssertEqual(GameDate.min.startOfMonth, GameDate.min)
        // the ends of the range hold, and the game counts it
        let c = SaturationCounter()
        Saturation.counting(into: c) {
            XCTAssertEqual(GameDate.max.adding(days: 1), GameDate.max)
            XCTAssertEqual(GameDate.min.adding(days: -1), GameDate.min)
            XCTAssertEqual(GameDate.max.adding(days: .max), GameDate.max)
            XCTAssertEqual(GameDate.min.adding(days: .min), GameDate.min)
            XCTAssertEqual(GameDate.max.adding(months: 1), GameDate.max)
            XCTAssertEqual(GameDate.min.adding(months: -1), GameDate.min)
            XCTAssertEqual(start.adding(months: .max), GameDate.max)
            XCTAssertEqual(start.adding(months: .min), GameDate.min)
            XCTAssertEqual(GameDate.max.adding(days: 0), GameDate.max)       // in range: not counted
            XCTAssertEqual(GameDate.max.adding(months: 0), GameDate.max)
        }
        XCTAssertEqual(c.count, 8)
    }
}
