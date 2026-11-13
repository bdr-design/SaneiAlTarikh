// swift-tools-version: 6.0
// صانع التاريخ: the game's Swift packages (design_doc/final_design.md §2.1, §2.2; ADR 0001 engines and threads). The iOS
// app (App/project.yml) links them; the Linux CI builds and tests them without the app. Swift 6 language mode.
import PackageDescription

let package = Package(
    name: "SaneiAlTarikh",
    // the minimum systems; their Swift runtime's Unicode (15.0) bounds a name's characters: ContentDB.unicodeVersion
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "SaneiCore", targets: ["SaneiCore"]),
        .library(name: "SaneiRuntime", targets: ["SaneiRuntime"]),
        .library(name: "SaneiEngine", targets: ["SaneiEngine"]),
        .library(name: "SaneiContent", targets: ["SaneiContent"]),
        // the offline tools; SaneiBake (JSON and CSV) is linked by simcli and the tests only, never by the app (L2)
        .executable(name: "simcli", targets: ["simcli"]),
    ],
    targets: [
        // stdlib only, never Foundation (§2.2)
        .target(name: "SaneiCore", path: "Sources/SaneiCore"),
        // the engines' threads: dedicated-thread executors and per-engine meters (Foundation; ADR 0001)
        .target(name: "SaneiRuntime", path: "Sources/SaneiRuntime"),
        // the simulation (no Foundation: its executor comes from outside)
        .target(name: "SaneiEngine", dependencies: ["SaneiCore"], path: "Sources/SaneiEngine"),
        // the content's readers and the validator (stdlib only, no JSON: L2)
        .target(name: "SaneiContent", dependencies: ["SaneiCore"], path: "Sources/SaneiContent"),
        // the strict CSV and JSON loaders and the baker (Foundation; never in the app)
        .target(name: "SaneiBake", dependencies: ["SaneiCore", "SaneiContent"], path: "Sources/SaneiBake"),
        .executableTarget(name: "simcli", dependencies: ["SaneiBake"], path: "Sources/simcli"),
        .testTarget(name: "SaneiCoreTests", dependencies: ["SaneiCore"], path: "Tests/SaneiCoreTests"),
        .testTarget(name: "SaneiContentTests", dependencies: ["SaneiContent", "SaneiBake"], path: "Tests/SaneiContentTests"),
        .testTarget(name: "SaneiRuntimeTests", dependencies: ["SaneiRuntime"], path: "Tests/SaneiRuntimeTests"),
        // the golden saves are read by path, not bundled
        .testTarget(name: "SaneiEngineTests", dependencies: ["SaneiEngine", "SaneiRuntime", "SaneiContent"], path: "Tests/SaneiEngineTests", exclude: ["Golden"]),
    ],
    swiftLanguageModes: [.v6]
)
