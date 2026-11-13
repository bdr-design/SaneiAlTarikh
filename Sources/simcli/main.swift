import Foundation
import SaneiBake

// simcli (§2.2): the offline tools. T-042 brings `validate` and `bake`; the other commands come with their tasks.
//
//     simcli validate [--content <dir>]                    every content rule; exit 1 on the first problem
//     simcli bake [--content <dir>] --out <content.bin>    the checked content into content.bin

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(1)
}

let usage = "usage: simcli validate [--content <dir>] | simcli bake [--content <dir>] --out <content.bin>"
let args = Array(CommandLine.arguments.dropFirst())
guard let command = args.first, ["validate", "bake"].contains(command) else { fail(usage) }
// options: each known, each with a value, each once
var options: [String: String] = [:]
var k = 1
while k < args.count {
    let name = args[k]
    let allowed = command == "bake" ? ["--content", "--out"] : ["--content"]
    guard allowed.contains(name) else { fail("\(command) does not take «\(name)»\n" + usage) }
    guard k + 1 < args.count, !args[k + 1].hasPrefix("--") else { fail("\(name) needs a value\n" + usage) }
    guard options[name] == nil else { fail("\(name) given twice") }
    options[name] = args[k + 1]
    k += 2
}
let content = URL(fileURLWithPath: options["--content"] ?? "content")
switch command {
case "validate":
    do {
        let db = try Bake.validate(content)
        print("content holds: \(db.polities.count) polities, \(db.actors.count) actors, \(db.groups.count) groups, \(db.currencies.count) currencies")
    } catch { fail("\(error)") }
default:
    guard let out = options["--out"] else { fail("bake needs --out <content.bin>") }
    do {
        let bytes = try Bake.contentFile(content)
        let url = URL(fileURLWithPath: out)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data(bytes).write(to: url, options: .atomic)
        print("content.bin: \(bytes.count) bytes")
    } catch { fail("\(error)") }
}
