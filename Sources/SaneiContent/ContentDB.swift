import SaneiCore

/// The content the game runs on: the registries (T-042; the static rules join them in later tasks). Read from
/// `content.bin` once at launch; each table keeps its rows in registry order and an index sorted by ID, so a lookup by
/// ID is a search by halving that allocates nothing and walks no dictionary.
public struct ContentDB: Sendable, Equatable {
    public private(set) var polities: [PolityRow]
    public private(set) var actors: [ActorRow]
    public private(set) var groups: [GroupRow]
    public private(set) var currencies: [CurrencyRow]

    /// Per table: its IDs in row order, and its rows' positions ordered by ID (a step of a lookup reads one ID, never
    /// a whole row).
    var polityIDs: [String] = [], polityIndex: [Int32] = []
    var actorIDs: [String] = [], actorIndex: [Int32] = []
    var groupIDs: [String] = [], groupIndex: [Int32] = []
    var currencyIDs: [String] = [], currencyIndex: [Int32] = []

    /// The tables as given (the baker checks them first; `ContentFile.read` checks what it reads).
    public init(polities: [PolityRow], actors: [ActorRow], groups: [GroupRow],
                currencies: [CurrencyRow]) {
        self.polities = polities
        self.actors = actors
        self.groups = groups
        self.currencies = currencies
        polityIDs = polities.map(\.id); polityIndex = Self.sortedIndex(polityIDs)
        actorIDs = actors.map(\.id); actorIndex = Self.sortedIndex(actorIDs)
        groupIDs = groups.map(\.id); groupIndex = Self.sortedIndex(groupIDs)
        currencyIDs = currencies.map(\.id); currencyIndex = Self.sortedIndex(currencyIDs)
    }

    public static func == (a: ContentDB, b: ContentDB) -> Bool {
        a.polities == b.polities && a.actors == b.actors && a.groups == b.groups
            && a.currencies == b.currencies
    }

    /// The rows' positions ordered by their IDs' bytes.
    static func sortedIndex(_ ids: [String]) -> [Int32] {
        var index = (0..<ids.count).map { Int32($0) }
        index.sort { ids[Int($0)].utf8.lexicographicallyPrecedes(ids[Int($1)].utf8) }
        return index
    }

    /// The row whose ID is `id`, by halving over the sorted index; nil when there is none.
    static func find(_ id: String, _ index: [Int32], _ ids: [String]) -> Int? {
        var lo = 0, hi = index.count
        while lo < hi {
            let mid = (lo + hi) / 2
            let row = Int(index[mid])
            let other = ids[row]
            if other.utf8.elementsEqual(id.utf8) { return row }
            if other.utf8.lexicographicallyPrecedes(id.utf8) { lo = mid + 1 } else { hi = mid }
        }
        return nil
    }

    public func polity(_ id: String) -> Int? { Self.find(id, polityIndex, polityIDs) }
    public func actor(_ id: String) -> Int? { Self.find(id, actorIndex, actorIDs) }
    public func group(_ id: String) -> Int? { Self.find(id, groupIndex, groupIDs) }
    public func currency(_ id: String) -> Int? { Self.find(id, currencyIndex, currencyIDs) }

    /// Two rows of a table with one ID: the first such ID, or nil. (Uses the sorted index: neighbours.)
    static func repeated(_ index: [Int32], _ ids: [String]) -> String? {
        guard index.count > 1 else { return nil }
        for k in 1..<index.count where ids[Int(index[k])].utf8.elementsEqual(ids[Int(index[k - 1])].utf8) {
            return ids[Int(index[k])]
        }
        return nil
    }

    /// The first ID that two rows of one table share, with the table's name; nil when every ID is unique.
    public func repeatedID() -> (table: String, id: String)? {
        if let id = Self.repeated(polityIndex, polityIDs) { return ("polities", id) }
        if let id = Self.repeated(actorIndex, actorIDs) { return ("actors", id) }
        if let id = Self.repeated(groupIndex, groupIDs) { return ("groups", id) }
        if let id = Self.repeated(currencyIndex, currencyIDs) { return ("currencies", id) }
        return nil
    }
}
