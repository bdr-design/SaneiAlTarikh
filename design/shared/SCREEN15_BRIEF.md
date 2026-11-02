# Screen 15 brief: the event and decision modal, the notification centre

Visual mockups. NOT app code. The build is `../screen15/A`. Task card: `tasks/T-015_screen15_events.md`. Designed and approved by Claude under the owner's delegation (`ownerDelegation`, `finishEverything`).

## The moment (Egypt, Saturday 1 January 2011)
The Tunisian protests (since 17 December 2010) are the HUD's toast. The game opens on an urgent decision about them and pauses (§6.7: urgent → modal, auto-pause on for this category). It is a decision, not a historical event: what the player chooses is the player's. The campaign starts at midnight; the Alexandria church bombing of that night (about 00:20) is a dated historical event that fires right after, not part of this screen.

## The modal (`&state=event`, the default)
- **Frame:** one opaque panel over a scrim (≥0.4 dim), the safe width wide, from 8 pt under the top row and centred in the height left above the home indicator; the left stack and the dock step out of the way, only the top row shows (its clock shows play: the game is paused); the HUD and map are inert. Landscape layout: the text and options on the right, the category image in a column on the left (a third of the width, ≤220 pt): the owner's generic protests image `design/generated/event_protests.png` (no Egyptian landmark, so it does not suggest Egypt is already in revolt), a 3x copy cut to the column; its category in words on the image: «احتجاجات وثورات». Map names the modal's edge would cut are hidden.
- **Head:** «قرار · تونس · 1 يناير 2011 · الوقت متوقف»; the title «احتجاجات واسعة في تونس» (≤60 characters).
- **Text (neutral, ≤90 words):** the protests since 17 December after a young man set himself on fire in Sidi Bouzid; demands for jobs and lower prices; your advisers think unemployment and prices in Egypt make the street sensitive to it.
- **Options (2 × 2, each a button that reads whole):**
  1. «توسيع دعم الخبز والتموين» · 500 مليون $ سنويًا (on the economy panel's 2.9 مليار $ line) · «↓ الاضطرابات −3» · cost «↑ العجز +0.5 مليار $» (amber).
  2. «تشديد الانتشار الأمني في المدن» · «لا كلفة إضافية · من بند الأمن الداخلي» · «↓ الاضطرابات −2» · cost «↓ الشرعية −2» (amber).
  3. «حوار مع النقابات والأحزاب» · الكلفة: 10 من رأس المال السياسي (of the state panel's 86) · «↓ الاضطرابات −1» and «↑ الشرعية +1»: a narrower talk than the internal panel's «فتح حوار وطني» (20, once a year, −3).
  4. «المتابعة دون إجراء» · لا كلفة · «↑ خطر الاضطرابات» (amber) · marked «الافتراضي».
- **Foot:** «إن لم تختر، يُختار الافتراضي بعد 7 أيام.» beside «لاحقًا» (a 32 pt outlined button: it puts the decision off to the centre's «قرارات تنتظرك» and lets time run, so the default can come).
- **VoiceOver:** each option reads all it shows, each effect in its own clause with its direction and «أفضل» or «أسوأ» (points said as the approved panels say them: «3 نقاط», «نقطتين», «نقطة واحدة»), «دولار» for $. Unrest (45, the internal panel's) and legitimacy (44, the HUD's) stay within 0–100 after any option.

## The centre (`&state=center`)
Opened from the bell (badge 3): a panel under the toast, the map-mode and my-country buttons yielding to it. Sections in words, each row a 44 pt button with its icon and a chevron:
- **قرارات تنتظرك:** «احتجاجات واسعة في تونس» · «قرار · يُختار الافتراضي بعد 7 أيام».
- **أوامر معلقة:** «المنطقة الغربية إلى سيوة» · «يُنفَّذ عند استئناف الوقت» with «إلغاء» (§6.7: pending orders can be cancelled before time resumes).
- **مهم:** «السودان: استفتاء الجنوب بعد 8 أيام» · «9 يناير 2011 · الجوار».
- **للعلم:** «أسعار القمح العالمية عند أعلى مستوى منذ 2008» · «السلع · ديسمبر 2010».
The badge counts the unread notifications (the decision and the two news items: 3); a pending order is not a notification. Unread rows carry a small teal dot and begin «غير مقروء» in VoiceOver; the bell reads «الإشعارات، 3 غير مقروءة» and whether the centre is open. In VoiceOver order the centre comes right after the left stack, before the dock; the pending order is one group with its own «إلغاء».

## Gate
`screen15/A/_build/render.js` checks the generic rules (as screen 14), the modal (centred, inside the safe screen, the image column and its category, title ≤60, text ≤90 words, 4 options with their effects and costs: arrow, sign and words, amber costs with their arrow, the default named, the expiry), the numbers against the economy and internal panels, the paused clock, the inert HUD, the centre (sections, badge = unread, the pending order's cancel, rows read whole). `--selftest` and `check_screen.py` must pass.
