# Screen 26 brief: the pending orders

Visual mockup. NOT app code. The build is `../screen26/A`. Task card: `tasks/T-028_screen26_pending_orders.md`. Designed
and approved by Claude under the owner's delegation, to the owner's rules `mapCentral`, `sheetIdentity` and `ownerProxy`.

## The moment
1 January 2011, the game paused. While paused the player gave three orders on their screens: the fuel subsidy −10%
(screen 7), an intelligence-gathering operation in Sudan (screen 22) and the Western Region's army to Siwa (screen 14).
They wait for time to resume (§6.7: pending orders can be cancelled before time resumes); nothing is spent or moved
before. On resume each is carried out as its own screen says (the subsidy from next month, screen 7; the operation's 3
months and the march's 7 days start then).

## The HUD while paused (design/shared/paused_hud: the rule for every screen; screen 16 shows it too)
- The play button: ▶, «تشغيل (اللعبة متوقفة)، تُنفَّذ 3 أوامر معلّقة» (screen 16's «تشغيل (اللعبة متوقفة)» plus the
  count), with a badge «3» in the pending orders' yellow, dark digits, on its top corner toward the date, clear of the
  glyph, overhanging the date pill 3 pt as the bell's badge.
- The toast slot holds the orders while paused («3 أوامر تنتظر الاستئناف», the queue icon in yellow; the 3 s toasts wait):
  a button whose name is its visible text, opening this list (aria-expanded, controls the sheet). The slot keeps B3's
  width, so the left column does not move when pausing. The rest of the HUD stays at B3's places. The bell reads 2 at this
  moment, as screen 16.
- Counted forms (paused_hud.py, for any count): toast 1 «أمر واحد ينتظر الاستئناف», 2 «أمران ينتظران الاستئناف», 3–10
  «N أوامر تنتظر الاستئناف», 11+ «N أمرًا ينتظر الاستئناف»; play label 1 «يُنفَّذ أمر معلّق واحد», 2 «يُنفَّذ أمران
  معلّقان», 3–10 «تُنفَّذ N أوامر معلّقة», 11+ «يُنفَّذ N أمرًا معلّقًا»; resume line 1 «يُنفَّذ الأمر», 2 «يُنفَّذ
  الأمران», 3–10 «تُنفَّذ الأوامر الثلاثة … العشرة», 11+ «تُنفَّذ الأوامر الـN».
- No pending orders: no badge, the toast slot back to its toasts. Resuming from the HUD's play button carries the orders
  out as «استئناف الوقت» does.

## Frame
A side sheet of no dock section (no dock item open), its own identity: yellow #F0E73C («الأوامر المعلّقة: أصفر»),
chosen by measure as the others in section_identity.css (ΔE2000 ≥ 16 from every section colour, meaning hue and other
sheet; contrast 14.3 on the panel), on the chrome only (the top line, the emblem, the badge, the toast's icon). Header:
Egypt's flag, «أوامر معلّقة», «اللعبة متوقفة · 1 يناير 2011» (the HUD's date), the queue emblem, close («إغلاق، العودة
إلى الخريطة واللعبة متوقفة»). Two bodies and no tab row: `&tab=list` (default) and `&tab=less` (after one cancel).

## The list (`&tab=list`)
- «تُنفَّذ عند استئناف الوقت» (screen 16's «يُنفَّذ عند استئناف الوقت»): an ordered list («الأوامر المعلّقة، 3»), in the
  order given, screen 16's pending-order row (44 pt; on iPhone 13 mini 40 pt at fit level 2, where the cancels' 44 pt
  touches meet without overlap; on SE only the body's gap tightens, fit level 1): the tile the section's dock icon (white),
  the order's title and its line opening with the section's name, screen 16's «إلغاء» at the row's end («إلغاء أمر …»):
  - «دعم الوقود −10%» · «الاقتصاد · 11.7 إلى 10.5 مليار $»
  - «جمع معلومات في السودان» · «الاستخبارات · 3 أشهر · 60 مليون $»
  - «المنطقة الغربية إلى سيوة» · «الجيش · 4 تشكيلات · الوصول بعد 7 أيام»
- Note: «لا يُخصم شيء ولا يتحرك شيء قبل الاستئناف. الأمر الملغى لا يكلّف شيئًا.»
- «استئناف الوقت» · «تُنفَّذ الأوامر الثلاثة» (the one primary, after the list).

## After a cancel (`&tab=less`)
The operation cancelled: two rows; the status «أُلغي: جمع معلومات في السودان. لم يُخصم شيء.» (VoiceOver reads it at
once) with «تراجع» («تراجع عن إلغاء أمر جمع معلومات في السودان»: puts it back in its place; it stays until time resumes or
the sheet closes); «استئناف الوقت» · «يُنفَّذ الأمران». The HUD follows: the badge 2, «أمران ينتظران الاستئناف», the play
label «… يُنفَّذ أمران معلّقان». VoiceOver focus moves to the next row's «إلغاء», or to the status when no row follows.
The last order cancelled: the sheet shows the status and «تراجع» alone and «إغلاق»; the badge goes, the toast slot returns
to its toasts.

## Rules
- No red: cancelling loses nothing (the order is not given) and can be undone; no confirmation.
- A cancel is one tap; there is no «cancel all».

## Cost
See design doc §3.9 «The pending orders (screen 26)», §2.4 (the pending-command queue) and L3 (≤64): each queued order
carries what was worked out when it was given (the route and ETA, the previewed values), so resuming applies them in one
`ApplyCommands` at O(1) each, with no new route search, the units under D-15's glide cap; static rows; the HUD's badge
and toast change only on pause, resume and a new or cancelled order (no timer while paused, L1); a cancel or an undo
changes one entry and rebuilds the sheet's model once.

## Gate
`screen26/A/_build/render.js` uses the shared checker (a sheet of no section) and adds: the paused HUD counting the open
body's orders in the counted forms (the play label, its badge in the sheet's colour on the date's side, clear of the glyph,
overhanging ≤3 pt; the toast slot's text as its name, its queue icon, opening the list), the bell 2; the header's date the
HUD's; the flag, the emblem, the close; the orders read from screens 7 (the delta chip and values), 22 (the type, the
target, the duration, the cost) and 14 (the army and its formations from its page, the arrival from its brief), shown in
the order given, each with its section's dock icon in white, its line opening with the section, screen 16's «إلغاء» naming
it at the row's end, rows 44 pt (40 from fit level 2); the ordered list named with its count; the note; «استئناف الوقت»
the one primary after the list, in the counted form; the list after a cancel (two rows, the status, «تراجع»); the
identity on the chrome alone; no red of any shade; no dialog or modal. `--selftest` and `check_screen.py` must pass.
