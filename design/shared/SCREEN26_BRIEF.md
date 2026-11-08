# Screen 26 brief: the pending orders

Visual mockup. NOT app code. The build is `../screen26/A`. Task card: `tasks/T-028_screen26_pending_orders.md`. Designed
and approved by Claude under the owner's delegation, to the owner's rules `mapCentral`, `sheetIdentity` and `ownerProxy`.

## The moment
1 January 2011, the game paused. While paused the player gave three orders on their screens: the fuel subsidy −10%
(screen 7), an intelligence-gathering operation in Sudan (screen 22) and the Western Region's army to Siwa (screen 14).
They wait for time to resume (§6.5); nothing is spent or moved before.

## The HUD while paused
- The play button shows ▶ («استئناف (اللعبة موقوفة)، تبدأ 3 أوامر معلّقة») with a badge «3» in the sheet's colour on its
  top corner toward the date (clear of the glyph), as the bell carries its count.
- The toast slot holds «3 أوامر تنتظر الاستئناف» with the queue icon in the sheet's colour while paused (in place of the
  3 s toasts, which wait); a tap opens this list (aria-expanded, controls the sheet). The slot keeps B3's width, so the
  left column does not move when pausing. The rest of the HUD stays at B3's places.
- Resuming from the HUD's play button starts the orders as «استئناف الوقت» does.

## Frame
A side sheet of no dock section (no dock item open), its own identity: yellow #F0E73C («الأوامر المعلّقة: أصفر»),
chosen by measure as the others in section_identity.css (ΔE2000 ≥ 16 from every section colour, meaning hue and other
sheet; contrast 14.3 on the panel), on the chrome only (the top line, the emblem, the badge, the toast's icon). Header:
Egypt's flag, «أوامر معلّقة», «الوقت موقوف · 1 يناير 2011» (the HUD's date), the queue emblem, close («إغلاق، العودة
إلى الخريطة والوقت موقوف»). Two bodies and no tab row: `&tab=list` (default) and `&tab=less` (after one cancel).

## The list (`&tab=list`)
- «تبدأ عند استئناف الوقت»: an ordered list («الأوامر المعلّقة، 3»), in the order given, one card row each (44 pt; 40 pt
  at the fit level that keeps the resume above the fold on iPhone 13 mini and SE): the tile the section's dock icon
  (white), the order's title and its line opening with the section's name, the cancel (a 32 pt round grey control, its
  touch 44 pt) at the row's end:
  - «دعم الوقود −10%» · «الاقتصاد · 11.7 إلى 10.5 مليار $»
  - «جمع معلومات في السودان» · «الاستخبارات · 3 أشهر · 60 مليون $»
  - «المنطقة الغربية إلى سيوة» · «الجيش · 4 تشكيلات · الوصول بعد 7 أيام»
- Note: «لا يُخصم شيء ولا يتحرك شيء قبل الاستئناف. الأمر الملغى لا يكلّف شيئًا.»
- «استئناف الوقت» · «تبدأ الأوامر الثلاثة» (the one primary, after the list).

## After a cancel (`&tab=less`)
The operation cancelled: two rows; the status «أُلغي: جمع معلومات في السودان. لم يُخصم شيء.» (VoiceOver reads it at
once); «استئناف الوقت» · «يبدأ الأمران». The HUD's counts follow (2) in the game.

## Rules
- No red: cancelling an order loses nothing (the order is simply not given); no confirmation.
- A cancel is one tap; there is no «cancel all».

## Cost
Static rows from the command queue the game already holds while paused (a few entries, each with its stored title and
values); nothing is simulated or previewed. The HUD's badge and toast change only on pause, resume and a new or cancelled
order (no timer while paused, L1). Cancel removes the queued command; the sheet's model is rebuilt once.

## Gate
`screen26/A/_build/render.js` uses the shared checker (a sheet of no section) and adds: the paused HUD (play «استئناف»
with the count, its badge in the sheet's colour, the toast slot opening the list, saying the count, its queue icon); the
header's date the HUD's; the flag, the emblem, the close; the orders read from screens 7, 22 and 14, each with its
section's dock icon (white), its line opening with the section, a cancel naming it at the row's end, rows 44 pt (40 at a
fit level); the ordered list named with its count; the note; «استئناف الوقت» the one primary after the list, counting in
words; the list after a cancel (two rows, the status); the identity on the chrome alone; no red; no dialog.
`--selftest` and `check_screen.py` must pass.
