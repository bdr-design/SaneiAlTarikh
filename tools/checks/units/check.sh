#!/bin/bash
# The units kept apart by type (T-040, ADR 0003): each snippet here posts money of the wrong unit and must fail to
# compile, with the compiler naming the wrong type; the control must compile, so a failure is the unit's, not the
# setup's. Run after `swift build` (a debug build, made with testing on, so `@testable import` reaches the ledger's
# internal posting functions). Usage: tools/checks/units/check.sh [build dir, default .build/debug]
set -u
BUILD="${1:-.build/debug}"
MODS="$BUILD/Modules"
[ -d "$MODS" ] || MODS="$BUILD"
DIR="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
head='@testable import SaneiEngine
import SaneiCore
var w = WorldState(start: GameDate(days: 0), seed: 1)
let g = w.governments.ref(0)
let c = w.currency(of: Idx(raw: 0))'
check() {   # name, body, the wrong type the compiler must name ("" for the control)
    printf '%s\n%s\n' "$head" "$2" > "$TMP/$1.swift"
    out=$(swiftc -typecheck -I "$MODS" "$TMP/$1.swift" 2>&1); status=$?
    if [ -z "$3" ]; then
        [ $status -eq 0 ] || { echo "units: the control does not compile:"; echo "$out"; exit 1; }
    else
        [ $status -ne 0 ] || { echo "units: $1 compiled, and must not"; exit 1; }
        echo "$out" | grep -q "'$3'" || { echo "units: $1 failed for another reason:"; echo "$out"; exit 1; }
    fi
}
check control 'w.post(g, .treasury, .tax, LCU(raw: 1)); w.post(.world, .trade, USDn(raw: 1)); w.post(moneyBase: c, .spending, LCU(raw: 1))' ""
check dollars_to_a_local_account 'w.post(g, .treasury, .tax, USDn(raw: 1))' USDn
check local_to_a_dollar_account 'w.post(.world, .trade, LCU(raw: 1))' LCU
check money_to_a_local_account 'w.post(g, .treasury, .tax, Money(raw: 1))' Money
check money_to_a_dollar_account 'w.post(.world, .trade, Money(raw: 1))' Money
check dollars_to_the_money_base 'w.post(moneyBase: c, .spending, USDn(raw: 1))' USDn
check dollars_in_a_local_transfer 'w.transfer(from: (g, .treasury), to: (g, .domesticDebt), .aid, USDn(raw: 1))' USDn
check local_plus_dollars 'let x = LCU(raw: 1) + USDn(raw: 1)' USDn
echo "units: 6 wrong-unit postings and 1 wrong-unit sum refused by the compiler; the control compiles"
