# TODO

- [x] **Find out why banned cards (e.g. Atog) have no card page.** Myr's card
  intel export now includes them (2026-10-27), so they have pages and links.
- [x] **Fail the build on broken links**: `prebuild` runs
  `node scripts/check-links.mjs` after `build-data.mjs`.
- [ ] **Recent Marvel cards have no card page**: Crossover Collaboration (in
  167 decklists), Vision of Love (122), Call Damage Control (47), Ultimate
  Alliance, Hawkeye's Bow, Surveillance Room, Undercover Skrull, Minion
  Missile... `assets/data/intel/card/` has no file for them, like banned cards
  before: likely Myr's card intel export again. Pages show them as plain text
  meanwhile (`src/utils/cardPages.js`).
- [ ] **Garbled accented letters in some decklists**: "LÃÂ³rien Revealed" (99
  decklists), "TerrariÃ³n" (19) are Lórien Revealed and Terrarión with their
  accented letter mis-encoded, so they match no card. Likely an encoding bug
  where Myr imports decklists.
- [ ] **Misspelt names in community decklists** ("Muntain", "lightining bolt",
  "SB: 1 Dispel", Italian names...): about 40 names, shown as plain text. Fix
  them where Myr imports decklists, or with a list of corrections applied by
  `build-data.mjs`.
- [ ] **Treat "Name Sticker" Goblin as a banned card**: it should
  get the Banned badge on its card page and count as banned wherever banned
  cards are used. `banned` comes from Myr's card intel export, so set it there
  (Myr is the source of truth).
- [ ] **Make the Previous / Next buttons consistent**: three looks today (the big
  centred bar on Tournaments, Cards, Players, Card page and the video lists;
  the small `Pager` under the decklists of archetype, family, metagame and
  player pages; the `SwipeCards` header on phones), some at the bottom only and
  some at the top and bottom, and Articles has "Show more" instead. Use one
  shared component and one placement rule. The Card page's bars (`pagination`
  in `src/pages/CardPage.jsx`) are padded `lg:pl-[21.5rem] xl:pl-[27.5rem]` for
  the old narrow left panel, so they are off-centre since it became `wideList`
  (22rem / 32rem).
