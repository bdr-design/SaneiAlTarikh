/// simcli's command line (§2.2), read strictly: a known command, then options each known to it, each with a value that
/// is not an option, each once.
///
///     simcli validate [--content <dir>]                    every content rule; exit 1 on the first problem
///     simcli bake [--content <dir>] --out <content.bin>    the checked content into content.bin
public struct SimcliOptions: Sendable, Equatable {
    public static let usage = "usage: simcli validate [--content <dir>] | simcli bake [--content <dir>] --out <content.bin>"

    public var command: String
    /// The content folder (`content` when not given).
    public var content: String
    /// The file `bake` writes; nil for `validate`.
    public var out: String?

    /// The options in `args` (the arguments after the program's name); a message, with the usage, for anything else.
    public static func parse(_ args: [String]) -> Result<SimcliOptions, BakeError> {
        func fail(_ m: String) -> Result<SimcliOptions, BakeError> { .failure(BakeError("simcli", 0, m + "\n" + usage)) }
        guard let command = args.first, command == "validate" || command == "bake" else { return fail("a command: validate or bake") }
        let allowed = command == "bake" ? ["--content", "--out"] : ["--content"]
        var given: [(name: String, value: String)] = []
        var k = 1
        while k < args.count {
            let name = args[k]
            guard allowed.contains(name) else { return fail("\(command) does not take «\(name)»") }
            guard k + 1 < args.count, !args[k + 1].hasPrefix("--") else { return fail("\(name) needs a value") }
            guard !given.contains(where: { $0.name == name }) else { return fail("\(name) given twice") }
            given.append((name, args[k + 1]))
            k += 2
        }
        let out = given.first { $0.name == "--out" }?.value
        if command == "bake" && out == nil { return fail("bake needs --out <content.bin>") }
        return .success(SimcliOptions(command: command, content: given.first { $0.name == "--content" }?.value ?? "content", out: out))
    }
}
