import Foundation
import SaneiBake

// simcli (§2.2): the offline tools. T-042 brings `validate` and `bake` (their options: `SimcliOptions`); the other
// commands come with their tasks. Every failure exits 1, with its message on standard error.

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(1)
}

let options: SimcliOptions
switch SimcliOptions.parse(Array(CommandLine.arguments.dropFirst())) {
case let .success(o): options = o
case let .failure(e): fail(e.message)
}
let content = URL(fileURLWithPath: options.content)
if let out = options.out {
    do {
        let bytes = try Bake.contentFile(content)
        let url = URL(fileURLWithPath: out)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data(bytes).write(to: url, options: .atomic)
        print("content.bin: \(bytes.count) bytes")
    } catch { fail("\(error)") }
} else {
    do {
        let db = try Bake.validate(content)
        print("content holds: \(db.polities.count) polities, \(db.actors.count) actors, \(db.groups.count) groups, \(db.currencies.count) currencies")
    } catch { fail("\(error)") }
}
