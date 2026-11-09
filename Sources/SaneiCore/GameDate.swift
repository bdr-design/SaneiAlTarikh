// The game's calendar (§2.3): a day count from 1970-01-01, signed, in the proleptic Gregorian calendar. The supported
// range is 1850-01-01 to 2200-12-31 (every day of it is tested): leaders' birth dates and old treaty dates fit, and a
// campaign that runs to 2100 stays far from the end. No Foundation: the civil-date conversion is integer arithmetic
// (eras of 400 years, the year of the era and the day of a year that starts in March; the reference model checks
// every supported day against Python's own calendar). stdlib only.

@frozen
public struct GameDate: Sendable, Hashable, Comparable {
    /// Days since 1970-01-01 (negative before it).
    public var days: Int32

    /// Any day count, as a save or a column holds it. Not checked: ask `isSupported`. Adding to an unsupported date
    /// brings it to the nearest end of the supported range, counted.
    @inlinable public init(days: Int32) { self.days = days }

    /// 1850-01-01: the first supported day (not the type's limit).
    @inlinable public static var min: GameDate { GameDate(days: -43_829) }
    /// 2200-12-31: the last supported day (not the type's limit, and not a «never»: adding to it holds and counts).
    @inlinable public static var max: GameDate { GameDate(days: 84_370) }

    /// A civil date; nil when it is not a real day or lies outside the supported range.
    public init?(year: Int, month: Int, day: Int) {
        guard year >= 1850, year <= 2200, month >= 1, month <= 12, day >= 1,
              day <= GameDate.daysIn(month: month, year: year) else { return nil }
        let y = month <= 2 ? year - 1 : year
        let era = GameDate.floorDiv(y, 400)
        let yoe = y - era * 400
        let doy = (153 * (month > 2 ? month - 3 : month + 9) + 2) / 5 + day - 1
        let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
        days = Int32(truncatingIfNeeded: era * 146_097 + doe - 719_468)
    }

    @inlinable public static func == (a: GameDate, b: GameDate) -> Bool { a.days == b.days }
    @inlinable public static func < (a: GameDate, b: GameDate) -> Bool { a.days < b.days }

    /// True inside the supported range.
    @inlinable public var isSupported: Bool { days >= GameDate.min.days && days <= GameDate.max.days }

    /// The date `n` days later (earlier when negative), held at the ends of the supported range and counted there.
    public func adding(days n: Int) -> GameDate {
        let (sum, overflow) = Int(days).addingReportingOverflow(n)
        let lo = Int(GameDate.min.days)
        let hi = Int(GameDate.max.days)
        if !overflow && sum >= lo && sum <= hi { return GameDate(days: Int32(truncatingIfNeeded: sum)) }
        Saturation.record()
        return (overflow ? n < 0 : sum < lo) ? .min : .max
    }

    /// Whole days from `other` to this date.
    @inlinable public func daysSince(_ other: GameDate) -> Int { Int(days) - Int(other.days) }

    /// The civil date. `year`, `month` and `day` each work it out again: a loop takes `civil` once.
    public var civil: (year: Int, month: Int, day: Int) {
        let z = Int(days) + 719_468
        let era = GameDate.floorDiv(z, 146_097)
        let doe = z - era * 146_097
        let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
        let mp = (5 * doy + 2) / 153
        let month = mp < 10 ? mp + 3 : mp - 9
        return (yoe + era * 400 + (month <= 2 ? 1 : 0), month, doy - (153 * mp + 2) / 5 + 1)
    }

    public var year: Int { civil.year }
    public var month: Int { civil.month }
    public var day: Int { civil.day }

    /// 0 for Sunday to 6 for Saturday (1970-01-01 was a Thursday, 4). The formatter turns it into a name.
    public var weekday: Int {
        let w = (Int(days) + 4) % 7
        return w < 0 ? w + 7 : w
    }

    /// The first day of this date's month.
    public var startOfMonth: GameDate { adding(days: 1 - civil.day) }

    /// The same day `n` months later (earlier when negative); a day past the month's end becomes its last day
    /// (31 January + 1 month = 28 or 29 February). So steps do not add up: one month three times from 31 January is
    /// 28 April, three months at once 30 April; a term counts its months from its start date. Held at the ends of the
    /// supported range and counted there.
    public func adding(months n: Int) -> GameDate {
        let c = civil
        let (total, overflow) = (c.year * 12 + (c.month - 1)).addingReportingOverflow(n)
        if overflow {
            Saturation.record()
            return n < 0 ? .min : .max
        }
        let year = GameDate.floorDiv(total, 12)
        let rest = total % 12                                       // never `total - year * 12`: that can overflow
        let month = (rest < 0 ? rest + 12 : rest) + 1
        if let d = GameDate(year: year, month: month, day: Swift.min(c.day, GameDate.daysIn(month: month, year: year))) {
            return d
        }
        Saturation.record()
        return year < 1850 ? .min : .max
    }

    /// The Gregorian rule: every fourth year, but a century only when 400 divides it.
    public static func isLeap(year: Int) -> Bool {
        year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)
    }

    /// Days in a month (1...12); 0 for anything else.
    public static func daysIn(month: Int, year: Int) -> Int {
        switch month {
        case 1, 3, 5, 7, 8, 10, 12: return 31
        case 4, 6, 9, 11: return 30
        case 2: return isLeap(year: year) ? 29 : 28
        default: return 0
        }
    }

    /// a / b rounding down (b > 0).
    @inlinable
    static func floorDiv(_ a: Int, _ b: Int) -> Int {
        let q = a / b
        return a % b < 0 ? q - 1 : q
    }
}
