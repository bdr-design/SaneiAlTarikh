# T-027: Screen 25, the save mirror prompt (D-28)

## The need
D-28 (the owner's answer «As recommended»): saves live in Documents (visible in Files) plus an optional mirror to a folder
the player picks once; §7 «Mirror»: the player is prompted once, after the first manual save, and a stale bookmark asks the
player to pick the folder again. The design list (§6 «Pending design») names «save mirror prompt»; it needs a design.

## Evidence
Decision D-28 and its rows in the design doc (§7 «Location», «Mirror», «Re-signing note»; the D-28 table rows); the approved
«المزيد» panel (screen 13: its saves tab, «حفظ الآن», the row «نسخة في مجلد آخر · لم يُختر مجلد» that opens the folder
choice); the approved save-file sheet (screen 23: the same frame, three bodies in one sheet, the safe choice first);
the owner's rules mapCentral (no dialog over the map), sheetIdentity and ownerProxy (realism and lightness first).

## Scope
A side sheet in the «المزيد» section's frame, shown once right after the first manual save: the ask (pick a folder, or not
now: never asked again), the folder chosen (what is copied and how often), and the folder gone (the bookmark no longer
resolves: pick again, or not now). The system's folder picker itself is iOS's and is not drawn.

## Acceptance criteria
1. The ask says the saves are on this device only and lost if the game is deleted, and asks once to pick a folder (an
   example: iCloud Drive) to copy them to automatically; «اختيار مجلد» first and primary, opening the system's folder
   picker; «ليس الآن» says it will not ask again and where the choice stays (the saves tab).
2. The folder chosen names the folder and its place, says the save just made is copied now, and what is copied and how
   often (§7: every manual save and the newest autosave, on saving or leaving the game, at most once every 10 minutes).
3. The folder gone names the folder, says saving goes on without a copy, and offers to pick it again (first) or not now.
   A folder inside the game's own container is refused with its reason (added after the reviews), and the folder chosen
   shows only once the first copy has returned.
4. In the «المزيد» frame, never a dialog over the map; no red (nothing is deleted).
5. Gate: 0 issues on 7 phones, self-test, `check_screen.py` PASS; six independent read-only reviews, every confirmed
   finding fixed; the owner's proxy for any owner question.
