# T-016: Screen 16, the notification centre

## Goal
§6.7 in the approved look: the notification centre opened from the bell as a side sheet in the panels' frame (the map central and visible, the owner's rule mapCentral), with the tiers and the pending orders.

## Acceptance criteria
1. The approved panel sheet from the right (shared builder and checker), no dock item open, the map central with Egypt clear.
2. Sections in words: قرارات تنتظرك، أوامر معلقة، مهم، للعلم; each row under its own section; rows read whole by VoiceOver and say where they lead.
3. The badge = the unread notifications, the bell reads its count; unread rows carry a dot and «غير مقروء»; a pending order is not a notification and has its own «إلغاء» (cancellable before time resumes).
4. Gate: 0 issues on 7 phones, the self-test catches every plant, `check_screen.py` PASS; three independent read-only reviews (checker and consistency; what the player sees; dimensions and the formatting of text and boxes) with every confirmed finding fixed.

## Out of scope (own items)
The per-category auto-pause settings; the full history of past notifications (the log in «المزيد»).
