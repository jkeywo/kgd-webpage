# Context

Domain vocabulary for the Kiwi Game Design site. Use these words in code
and commit messages; they're what the site is actually about.

## Terms

**Catalogue**
The full list of games the site publishes, authored by hand in
`games.neon` and read by `catalogue.js`. The catalogue is the only
source of content — there is no CMS and no database.

**Game**
One entry in the catalogue. Has a title, a summary (shown on its card),
a description (shown on its page), a category, a status, and zero or
more options. Everything except the title is optional.

**Slug**
A game's identity in a URL (`#game/the-raven-banner`). Derived from the
title, but can be pinned with an explicit `slug:` so that renaming a
game doesn't break links people have already shared.

**Category**
Which section of the home page a game appears under: megagames,
boardgames, roleplaying games, or other. The taxonomy lives in
`catalogue.js` and the home page builds its sections from it.

**Status**
Where a game is in its life: `for_sale`, `free`, `in_development`,
`on_hold`, `unavailable`. Shown as a badge on the game's card.

**Option**
A way to get a game — a free download or a purchase. A game can have
several (PDF, print with UK postage, print with EU postage). In
`games.neon` these can be written either as a top-level `link` with a
`link_type`, or as entries under `options:` with a `type`; the catalogue
normalises both into one list.

**Player's guide**
The free rules PDF for a game, served from `files/`. These used to be
hosted by the old Wix site; those URLs are dead, so guides are added to
the repo instead. `tests/games.neon.test.js` fails if a link points at a
file that isn't in `files/`.

**Prose**
The text written into a game's description. Rendered by `prose.js`,
which states its dialect at the top of the file — that comment is the
spec, not the regexes below it.

## Constraints

- **No build step.** The repo is what GitHub Pages serves. `js-yaml` is
  vendored rather than installed.
- **No runtime dependencies.** `package.json` exists only so
  `node --test` can load ES modules; `npm test` needs no `npm install`.
- Deployed from `main` to <https://kiwigamedesign.co.uk>.
