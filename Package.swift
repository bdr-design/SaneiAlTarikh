// swift-tools-version: 6.0
// صانع التاريخ: the game's Swift packages (design_doc/final_design.md §2.1, §2.2; ADR 0001 engines and threads). The iOS
// app (App/project.yml) links them; the Linux CI builds and tests them without the app. Swift 6 language mode.
import PackageDescription

let package = Package(
    name: "SaneiAlTarikh",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "SaneiCore", targets: ["SaneiCore"]),
        .library(name: "SaneiRuntime", targets: ["SaneiRuntime"]),
        .library(name: "SaneiEngine", targets: ["SaneiEngine"]),
    ],
    targets: [
        // stdlib only, never Foundation (§2.2)
        .target(name: "SaneiCore", path: "Sources/SaneiCore"),
        // the engines' threads: dedicated-thread executors and per-engine meters (Foundation; ADR 0001)
        .target(name: "SaneiRuntime", path: "Sources/SaneiRuntime"),
        // the simulation (no Foundation: its executor comes from outside)
        .target(name: "SaneiEngine", dependencies: ["SaneiCore"], path: "Sources/SaneiEngine"),
        .testTarget(name: "SaneiCoreTests", dependencies: ["SaneiCore"], path: "Tests/SaneiCoreTests"),
        .testTarget(name: "SaneiRuntimeTests", dependencies: ["SaneiRuntime"], path: "Tests/SaneiRuntimeTests"),
        .testTarget(name: "SaneiEngineTests", dependencies: ["SaneiEngine", "SaneiRuntime"], path: "Tests/SaneiEngineTests"),
    ],
    swiftLanguageModes: [.v6]
)
