# T-014: Screen 14, the military map (D-15: units that glide along their route)

## Goal
The moving prototype D-15 asks for, with the military screen: the owner's generic unit images on the map with flag and strength, an army selected and ordered, its route, the order bar, and the glide itself, light on the phone (L9, L14, L15).

## Acceptance criteria
1. The approved play screen (B3, opaque panels) in the military map mode («الخريطة: عسكرية»); the HUD at its B3 place.
2. Units: the owner's images (design/generated/units: tank, destroyer, fighter) under a tag with the flag and the strength from the military panel (screen 9); each image's centre at its place on the map; every unit whole, in the safe screen, clear of every panel, no two hit boxes touching.
3. The selected army: a teal ring on its tag; its route dashed teal from the unit through the waypoint still ahead to the destination, with an arrowhead and the destination named; shown only while it is under way.
4. The order bar takes the dock's place on the dock's line: the army, its strength, «إلى سيوة · يصل بعد N» (Arabic number agreement); the order in force white (move under way, halt on arrival); attack locked with no war; close.
5. Time: the HUD date is 1 January 2011 plus the whole days marched (40 km a day) with its weekday.
6. Lightness, measured live: ≤30 frames a second while gliding at ×1–×5; a step a game day at ×10 and above and with Reduce Motion; no frame when nothing moves or when paused.
7. VoiceOver: each unit reads its name, strength and where it is or goes; the bar's army reads all it shows; no real weapon names.
8. Gate: 0 issues on 7 phones, the self-test catches every plant, `check_screen.py` PASS; two independent read-only reviews with every confirmed finding fixed.

## Out of scope (own items)
Choosing a destination by tapping the map and dragging waypoints (the prototype plays one order); fronts and combat; the chooser for a stack of armies; air and naval missions.
