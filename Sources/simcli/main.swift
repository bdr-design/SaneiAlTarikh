import Foundation
import SaneiBake

// simcli (§2.2): the offline tools. T-042 brings `validate` and `bake`; the other commands come with their tasks.
//
//     simcli validate [--content <dir>]                    every content rule; exit 1 on the first problem
//     simcli bake [--content <dir>] --out <content.bin>    the checked content into content.bin

func option(_ name: String, _ args: [String]) -> String? {
    guard let k = args.firstIndex(of: name), k + 1 < args.count else { return nil }
    return args[k + 1]
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(1)
}

let args = Array(CommandLine.arguments.dropFirst())
let content = URL(fileURLWithPath: option("--content", args) ?? "content")
switch args.first {
case "validate":
    do {
        let db = try Bake.validate(content)
        print("content holds: \(db.polities.count) polities, \(db.actors.count) actors, \(db.groups.count) groups, \(db.currencies.count) currencies")
    } catch { fail("\(error)") }
case "bake":
    guard let out = option("--out", args) else { fail("bake needs --out <content.bin>") }
    do {
        let bytes = try Bake.contentFile(content)
        let url = URL(fileURLWithPath: out)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data(bytes).write(to: url, options: .atomic)
        print("content.bin: \(bytes.count) bytes")
    } catch { fail("\(error)") }
default:
    fail("usage: simcli validate [--content <dir>] | simcli bake [--content <dir>] --out <content.bin>")
}
