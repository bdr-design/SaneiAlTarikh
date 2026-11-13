import Foundation
import SaneiContent

/// The bake (§2.2, §4.3's stage 40 for the registries): the checked-in content into `content.bin`. Every rule is
/// checked first (the registries' rows, the validator, the ID lock and the aliases); the file is then read back with
/// the app's own reader and must give the same content. The same content always makes the same bytes.
public enum Bake {
    /// The registries' folder inside a content folder.
    public static func registryDirectory(_ content: URL) -> URL { content.appendingPathComponent("registry") }

    /// Every rule checked: the content, the lock and the aliases; throws the first problem.
    public static func validate(_ content: URL) throws -> ContentDB {
        let dir = registryDirectory(content)
        let db = try Registries.load(dir)
        func data(_ name: String) throws -> [UInt8] {
            guard let d = FileManager.default.contents(atPath: dir.appendingPathComponent(name).path) else {
                throw BakeError(name, 0, "missing")
            }
            return Array(d)
        }
        let lock = try IDLock.parse(try data("ids.lock"))
        let aliases = try Aliases.parse(try data("aliases.json"))
        if let first = lock.problems(db, aliases).first { throw BakeError("content/registry", 0, first) }
        return db
    }

    /// `content.bin`'s bytes for the content in `content`, checked and read back.
    public static func contentFile(_ content: URL) throws -> [UInt8] {
        let db = try validate(content)
        let bytes = ContentFile.write(db)
        guard case let .success(back) = ContentFile.read(bytes), back == db else {
            throw BakeError("content.bin", 0, "the file does not read back as the content it was made from")
        }
        return bytes
    }
}
