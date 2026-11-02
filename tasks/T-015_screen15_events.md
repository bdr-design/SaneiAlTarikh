# T-015: Screen 15, the event and decision modal and the notification centre

## Goal
§6.7 and §6.8 in the approved look: an urgent decision as a modal over the paused game, and the notification centre opened from the bell, with the tiers (urgent, important, info) and the pending orders.

## Acceptance criteria
1. The approved play screen (B3, opaque panels) under a scrim; the game paused (the play button shows play and says so); the HUD inert under the modal.
2. The modal: the owner's category image, the category in words, a title ≤60 characters, neutral text ≤90 words, 2–4 options each with its cost and its effects (arrow, sign and word; costs amber with their arrow), the default marked in words, the expiry and its default answer.
3. Numbers agree with the approved panels (bread subsidy, deficit, unrest, legitimacy, political capital).
4. The centre: sections in words (قرارات تنتظرك، أوامر معلقة، مهم، للعلم), the badge's count = the unread items, a pending order that can be cancelled before time resumes, every row read whole by VoiceOver.
5. Gate: 0 issues on 7 phones, the self-test catches every plant, `check_screen.py` PASS; two independent read-only reviews with every confirmed finding fixed.

## Out of scope (own items)
The «لماذا؟» sheet; the per-category auto-pause settings; confirmation, text-input and chooser dialogs.
