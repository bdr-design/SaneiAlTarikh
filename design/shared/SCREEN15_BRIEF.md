# Screen 15 brief: the event and decision modal, the notification centre

Visual mockups. NOT app code. The build is `../screen15/A`. Task card: `tasks/T-015_screen15_events.md`. Designed and approved by Claude under the owner's delegation (`ownerDelegation`, `finishEverything`).

## The moment (Egypt, Saturday 1 January 2011)
The Tunisian protests (since 17 December 2010) are the HUD's toast. The game opens on an urgent decision about them and pauses (§6.7: urgent → modal, auto-pause on for this category). It is a decision, not a historical event: what the player chooses is the player's.

## The modal (`&state=event`, the default)
- **Frame:** one opaque panel centred in the safe screen over a scrim; the HUD under it is inert. Landscape layout: the text and options on the right, the category image in a column on the left (the owner's `design/generated/08b_event_protests_arab.png`, a 3x copy cut to the column), its category in words on the image: «احتجاجات وثورات».
- **Head:** «قرار · تونس · 1 يناير 2011»; the title «احتجاجات واسعة في تونس» (≤60 characters).
- **Text (neutral, ≤90 words):** the protests since 17 December after a young man set himself on fire in Sidi Bouzid; demands for jobs and lower prices; your advisers think unemployment and prices in Egypt make the street sensitive to it.
- **Options (2 × 2, each a button that reads whole):**
  1. «توسيع دعم الخبز والتموين» · 500 مليون $ سنويًا (on the economy panel's 2.9 مليار $ line) · «↓ الاضطرابات −3» · cost «↑ العجز +0.5 مليار $» (amber).
  2. «تشديد الانتشار الأمني في المدن» · from the internal-security line · «↓ الاضطرابات −2» · cost «↓ الشرعية −2» (amber).
  3. «حوار مع النقابات والأحزاب» · الكلفة: 10 من رأس المال السياسي · «↑ الشرعية +2».
  4. «المتابعة دون إجراء» · لا كلفة · «↑ خطر الاضطرابات» (amber) · marked «الافتراضي».
- **Foot:** «إن لم تختر، يُختار الافتراضي بعد 7 أيام».

## The centre (`&state=center`)
Opened from the bell (badge 3): a panel under the toast, the map-mode and my-country buttons yielding to it. Sections in words, each row a 44 pt button with its icon and a chevron:
- **قرارات تنتظرك:** «احتجاجات واسعة في تونس» · «قرار · يُختار الافتراضي بعد 7 أيام».
- **أوامر معلقة:** «المنطقة الغربية إلى سيوة» · «يُنفَّذ عند استئناف الوقت» with «إلغاء» (§6.7: pending orders can be cancelled before time resumes).
- **مهم:** «السودان: استفتاء الجنوب بعد 8 أيام» · «9 يناير 2011 · الجوار».
- **للعلم:** «أسعار القمح العالمية عند أعلى مستوى منذ 2008» · «السلع · ديسمبر 2010».
The badge counts the unread notifications (the decision and the two news items: 3); a pending order is not a notification.

## Gate
`screen15/A/_build/render.js` checks the generic rules (as screen 14), the modal (centred, inside the safe screen, the image column and its category, title ≤60, text ≤90 words, 4 options with their effects and costs: arrow, sign and words, amber costs with their arrow, the default named, the expiry), the numbers against the economy and internal panels, the paused clock, the inert HUD, the centre (sections, badge = unread, the pending order's cancel, rows read whole). `--selftest` and `check_screen.py` must pass.
