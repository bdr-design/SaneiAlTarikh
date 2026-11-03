# Screen 15 brief: the decision sheet

Visual mockup. NOT app code. The build is `../screen15/A`. Task card: `tasks/T-015_screen15_events.md`. Designed and approved by Claude under the owner's delegation (`ownerDelegation`, `finishEverything`), to the owner's rule `mapCentral` (2026-11-02: «لازم تبقى خريطة اللعبة مركزية ولاتغطيها الخيارات»).

## The moment (Egypt, Saturday 1 January 2011)
The Tunisian protests (since 17 December 2010) are the HUD's toast. The game opens on an urgent decision about them and pauses (§6.7: urgent, auto-pause on for this category). It is a decision, not a historical event. The campaign starts at midnight; the Alexandria church bombing of that night (about 00:20) is a dated historical event that fires right after, not part of this screen.

## Frame
The approved panel sheet from the right, built with the shared builder and checked with the shared checker: same width (clamp(43% of the safe width, 340, 380)), from 8 pt under the top row to the dock line, the dock beside it or hidden on the 375 pt phones. The map stays central and undimmed, Egypt and the delta clear of the sheet (the map placement of the panels). One body, no tab row; it belongs to no section, so no dock item is open and the identity is the neutral grey (as «المزيد»). The game is paused: the clock's button shows play and says «اللعبة متوقفة للقرار».

## Content
- **Header:** the category image as the strip (the owner's generic `design/generated/event_protests.png`, no Egyptian landmark), Egypt's flag (the decision is Egypt's), «احتجاجات في تونس», the line «قرار · احتجاجات وثورات · الوقت متوقف», the grey emblem (flame), and the close button that puts the decision off («لاحقًا: تأجيل القرار إلى الإشعارات…»).
- **Text (neutral, ≤90 words):** the protests since 17 December after a young man set himself on fire in Sidi Bouzid; demands for jobs and lower prices; your advisers think unemployment and prices in Egypt make the street sensitive to it.
- **«خياراتك»:** four 44 pt rows (the panels' action rows), each with its cost and effects; the main effect a white chip, costs amber with their arrow:
  1. «دعم أكبر للخبز» with «↑ العجز +0.5» in the title (as screen 9's costs) · «500 مليون $ سنويًا» (a part of the economy panel's 2.9 مليار $ bread line) · chip «↓ الاضطرابات −3».
  2. «تشديد الانتشار الأمني» · «لا كلفة إضافية · ↓ الشرعية −2» · chip «↓ الاضطرابات −2».
  3. «حوار مع النقابات والأحزاب» · «10 من رأس المال السياسي» (of the state panel's 86) · chip «↓ الاضطرابات −1» (a narrower talk than the internal panel's «فتح حوار وطني»: 20, once a year, −3).
  4. «المتابعة دون إجراء» · «الافتراضي · لا كلفة · ↑ خطر الاضطرابات».
- **«لاحقًا»:** a link row: «يبقى في الإشعارات · الافتراضي بعد 7 أيام»; it lets time run, so the default can come.
- **VoiceOver:** each option reads all it shows, each effect in its own clause with its direction and «أفضل» or «أسوأ», «دولار» for $. Unrest (45, the internal panel's) and legitimacy (44, the HUD's) stay within 0–100 after any option.

The notification centre is screen 16.

## Gate
`screen15/A/_build/render.js` uses the shared checker (every generic rule of the approved panels, for a sheet with one body and no section) and adds: the game shown paused; the title short and the text the brief's (≤90 words); the options in order with their cost lines, chips, amber costs with their arrows, arrows agreeing with their signs, one default named on screen and in VoiceOver, each effect's own VoiceOver clause; the numbers against the economy, state and internal panels; «لاحقًا» and the close button putting the decision off with its expiry. `--selftest` and `check_screen.py` must pass. Reviewed by three independent read-only reviewers (checker and consistency; what the player sees; dimensions and the formatting of text and boxes).
