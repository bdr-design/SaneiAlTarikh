import SaneiCore

/// The content the game runs on: the registries (T-042; the static rules join them in later tasks). Read from
/// `content.bin` once at launch; each table keeps its rows in registry order, and its IDs apart with an order sorted by
/// their bytes, so finding a row by ID is a search by halving over the IDs alone: it allocates nothing and walks no
/// dictionary. The tables never change once made, so their orders always match them.
public struct ContentDB: Sendable, Equatable {
    public let polities: [PolityRow]
    public let actors: [ActorRow]
    public let groups: [GroupRow]
    public let currencies: [CurrencyRow]

    let polityIDs: [String], polityOrder: [Int32]
    let actorIDs: [String], actorOrder: [Int32]
    let groupIDs: [String], groupOrder: [Int32]
    let currencyIDs: [String], currencyOrder: [Int32]

    /// The tables as given; `problems()` says whether they keep the rules (the bake checks it first, `ContentFile.read`
    /// checks what it reads).
    public init(polities: [PolityRow], actors: [ActorRow], groups: [GroupRow], currencies: [CurrencyRow]) {
        self.polities = polities
        self.actors = actors
        self.groups = groups
        self.currencies = currencies
        polityIDs = polities.map(\.id); polityOrder = Self.sortedOrder(polityIDs)
        actorIDs = actors.map(\.id); actorOrder = Self.sortedOrder(actorIDs)
        groupIDs = groups.map(\.id); groupOrder = Self.sortedOrder(groupIDs)
        currencyIDs = currencies.map(\.id); currencyOrder = Self.sortedOrder(currencyIDs)
    }

    /// Equal when every row is equal: text compared by its bytes, never by Unicode equivalence (two spellings of one
    /// name are two contents, as their `content.bin` bytes are). It writes both contents out (about the cost of one
    /// write): for tests and the bake, never at launch.
    public static func == (a: ContentDB, b: ContentDB) -> Bool {
        ContentFile.chunks(a) == ContentFile.chunks(b)
    }

    /// The order of two texts by their bytes, in one walk: below 0, 0 or above 0.
    static func order(_ a: String, _ b: String) -> Int {
        var i = a.utf8.makeIterator(), j = b.utf8.makeIterator()
        while true {
            switch (i.next(), j.next()) {
            case (nil, nil): return 0
            case (nil, _): return -1
            case (_, nil): return 1
            case let (x?, y?): if x != y { return x < y ? -1 : 1 }
            }
        }
    }

    /// The rows' positions ordered by their IDs' bytes.
    static func sortedOrder(_ ids: [String]) -> [Int32] {
        var order = (0..<ids.count).map { Int32($0) }
        order.sort { Self.order(ids[Int($0)], ids[Int($1)]) < 0 }
        return order
    }

    /// The position of the row whose ID is `id`, by halving over the sorted IDs; nil when there is none.
    static func find(_ id: String, _ order: [Int32], _ ids: [String]) -> Int? {
        var lo = 0, hi = order.count
        while lo < hi {
            let mid = (lo + hi) / 2
            let row = Int(order[mid])
            let o = Self.order(ids[row], id)
            if o == 0 { return row }
            if o < 0 { lo = mid + 1 } else { hi = mid }
        }
        return nil
    }

    /// The position in `polities` of the polity whose ID is `id`; nil when there is none.
    public func polityRow(id: String) -> Int? { Self.find(id, polityOrder, polityIDs) }
    /// The position in `actors` of the actor whose ID is `id`; nil when there is none.
    public func actorRow(id: String) -> Int? { Self.find(id, actorOrder, actorIDs) }
    /// The position in `groups` of the group whose ID is `id`; nil when there is none.
    public func groupRow(id: String) -> Int? { Self.find(id, groupOrder, groupIDs) }
    /// The position in `currencies` of the currency whose ID is `id`; nil when there is none.
    public func currencyRow(id: String) -> Int? { Self.find(id, currencyOrder, currencyIDs) }

    /// The later of two rows with one ID, as a position in the table; nil when every ID is unique.
    static func repeated(_ order: [Int32], _ ids: [String]) -> Int? {
        guard order.count > 1 else { return nil }
        for k in 1..<order.count where Self.order(ids[Int(order[k])], ids[Int(order[k - 1])]) == 0 {
            return Int(Swift.max(order[k], order[k - 1]))
        }
        return nil
    }
}
