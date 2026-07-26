import test from "node:test";
import assert from "node:assert/strict";

import {
    buildCatalogue,
    findGameBySlug,
    gamesInCategory,
    slugify,
    CATEGORIES,
} from "../catalogue.js";

const one = entry => buildCatalogue({ games: [entry] });
const firstGame = entry => one(entry).games[0];

/* Fixtures are deliberately partial, so they raise problems beyond the
   one under test. Match on the problem, don't index the list. */
function assertProblem(problems, pattern) {
    assert.ok(
        problems.some(p => pattern.test(p.message)),
        `expected a problem matching ${pattern}, got: ${problems.map(p => p.message).join(" | ") || "none"}`,
    );
}

test("slugs are derived from the title", () => {
    assert.equal(firstGame({ title: "Crisis: Black Swan" }).slug, "crisis-black-swan");
    assert.equal(slugify("Fae's Anatomy"), "fae-s-anatomy");
});

test("an explicit slug pins the URL against a title change", () => {
    const game = firstGame({ title: "A New Title", slug: "old-title" });
    assert.equal(game.slug, "old-title");
});

test("a duplicate slug is reported rather than shadowing the first game", () => {
    const { games, problems } = buildCatalogue({
        games: [{ title: "Intrepid" }, { title: "Intrepid" }],
    });

    assert.equal(games.length, 1);
    assertProblem(problems, /already used/);
});

test("an entry with no title is dropped with a problem", () => {
    const { games, problems } = one({ summary: "orphan" });
    assert.equal(games.length, 0);
    assertProblem(problems, /no title/);
});

/* The two ways games.neon spells "you can get this" both normalise to
   one options list, so nothing downstream reads link_type or type. */
test("a top-level link becomes an option", () => {
    const game = firstGame({
        title: "Annex",
        link: "files/annex.pdf",
        link_type: "download",
    });

    assert.deepEqual(game.options.map(o => [o.href, o.action]), [
        ["files/annex.pdf", "download"],
    ]);
});

test("listed options use type and land in the same list", () => {
    const game = firstGame({
        title: "Intrepid",
        options: [
            { description: "PDF", link: "https://drivethru/x", type: "purchase" },
            { description: "Guide", link: "files/guide.pdf", type: "download" },
        ],
    });

    assert.deepEqual(game.options.map(o => o.action), ["purchase", "download"]);
});

test("a top-level link and listed options combine, top-level first", () => {
    const game = firstGame({
        title: "Mixed",
        link: "files/free.pdf",
        link_type: "download",
        options: [{ link: "https://shop/x", type: "purchase" }],
    });

    assert.deepEqual(game.options.map(o => o.href), ["files/free.pdf", "https://shop/x"]);
});

test("an option with no link is reported, not silently rendered", () => {
    const { games, problems } = one({
        title: "Broken",
        options: [{ description: "The players guide", type: "download" }],
    });

    assert.equal(games[0].options.length, 0);
    assertProblem(problems, /has no link/);
});

test("an unknown option type is reported and falls back to download", () => {
    const { games, problems } = one({
        title: "Odd",
        options: [{ link: "x.pdf", type: "purchace" }],
    });

    assert.equal(games[0].options[0].action, "download");
    assertProblem(problems, /unknown option type/);
});

test("link_type with no link is reported", () => {
    const { problems } = one({ title: "Half", link_type: "download" });
    assertProblem(problems, /no `link`/);
});

/* Category resolution — the taxonomy is the only place categories are
   listed, and an unrecognised one is loud rather than invisible. */
test("categories resolve to taxonomy ids", () => {
    assert.equal(firstGame({ title: "A", category: "megagames" }).categoryId, "megagames");
    assert.equal(firstGame({ title: "B", category: "boardgames" }).categoryId, "boardgames");
    assert.equal(firstGame({ title: "C", category: "roleplaying" }).categoryId, "roleplaying");
});

test("an unknown category is reported and filed under other", () => {
    const { games, problems } = one({ title: "D", category: "wargame" });
    assert.equal(games[0].categoryId, "other");
    assertProblem(problems, /unknown category/);
});

test("a missing category is reported and filed under other", () => {
    const { games, problems } = one({ title: "E" });
    assert.equal(games[0].categoryId, "other");
    assertProblem(problems, /no category/);
});

test("every taxonomy entry except other has a match rule", () => {
    const withoutMatch = CATEGORIES.filter(c => !c.match);
    assert.deepEqual(withoutMatch.map(c => c.id), ["other"]);
});

test("status labels replace every underscore", () => {
    assert.equal(firstGame({ title: "F", status: "in_development" }).statusLabel, "IN DEVELOPMENT");
    assert.equal(firstGame({ title: "G", status: "for_sale" }).statusLabel, "FOR SALE");
});

test("an unknown status is reported but still shown", () => {
    const { games, problems } = one({ title: "H", status: "coming_soon" });
    assert.equal(games[0].status, "coming_soon");
    assertProblem(problems, /unknown status/);
});

test("optional fields default rather than leaking undefined", () => {
    const game = firstGame({ title: "Bare" });

    assert.equal(game.summary, "");
    assert.equal(game.description, "");
    assert.equal(game.banner, null);
    assert.equal(game.cost, null);
    assert.equal(game.status, null);
    assert.deepEqual(game.options, []);
});

test("a catalogue with no games list is reported, not thrown", () => {
    const { games, problems } = buildCatalogue({});
    assert.deepEqual(games, []);
    assertProblem(problems, /no `games` list/);
});

test("lookups", () => {
    const catalogue = buildCatalogue({
        games: [
            { title: "One", category: "megagames" },
            { title: "Two", category: "megagames" },
            { title: "Three", category: "boardgames" },
        ],
    });

    assert.equal(findGameBySlug(catalogue, "two").title, "Two");
    assert.equal(findGameBySlug(catalogue, "nope"), undefined);
    assert.deepEqual(gamesInCategory(catalogue, "megagames").map(g => g.title), ["One", "Two"]);
});
