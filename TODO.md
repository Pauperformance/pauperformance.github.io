# TODO

- [ ] **Find out why banned cards (e.g. Atog) have no card page.** They should
  have one. Card pages are built from `assets/data/intel/card/`, which has no
  file for Atog, Gush, Daze and other banned cards, so the cause is likely in
  Myr's card intel export (pauperformance-bot). Meanwhile, pages show those
  cards as plain text instead of linking them (`src/utils/cardPages.js`).
- [ ] **Fail the build on broken links**, after the item above: run
  `node scripts/check-links.mjs` in `prebuild`, after `build-data.mjs`, so
  any new broken link fails the build.
