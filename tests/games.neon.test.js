/* The real catalogue, run through the real modules. Guards the two
   failure modes that don't show up as an error in a browser: an entry
   the catalogue can't make sense of, and a download link pointing at a
   file that isn't there. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import jsyaml from "../vendor/js-yaml.js";
import { buildCatalogue } from "../catalogue.js";

const repo = new URL("../", import.meta.url);

const catalogue = buildCatalogue(
    jsyaml.load(await readFile(new URL("games.neon", repo), "utf8")),
);

test("games.neon has no problems", () => {
    assert.deepEqual(
        catalogue.problems.map(p => `${p.where}: ${p.message}`),
        [],
    );
});

test("games.neon has games", () => {
    assert.ok(catalogue.games.length > 0);
});

test("every local link points at a file that exists", () => {
    const missing = [];

    for (const game of catalogue.games) {
        for (const option of game.options) {
            if (/^[a-z]+:/i.test(option.href)) continue;
            if (!existsSync(fileURLToPath(new URL(option.href, repo)))) {
                missing.push(`${game.title} -> ${option.href}`);
            }
        }
    }

    assert.deepEqual(missing, []);
});

test("every banner points at a file that exists", () => {
    const missing = catalogue.games
        .filter(game => game.banner)
        .filter(game => !existsSync(fileURLToPath(new URL(game.banner, repo))))
        .map(game => `${game.title} -> ${game.banner}`);

    assert.deepEqual(missing, []);
});

/* The old site's PDFs were hosted by Wix and every one of those URLs
   is dead. These are the ones still waiting on a source file to be
   added to files/ — delete the entry as each is fixed. The assertion
   is an exact match, so it fails both when a new dead link appears and
   when a listed one is fixed but left here. */
const AWAITING_LOCAL_COPY = [
    "RPG Poems -> The Life and Death of...",
    "RPG Poems -> Artefact",
    "RPG Poems -> Devils",
    "RPG Poems -> Ghosts of the Drowned",
    "Annex -> untitled",
];

test("the only links on the retired Wix host are the ones still awaiting a local copy", () => {
    const dead = [];

    for (const game of catalogue.games) {
        for (const option of game.options) {
            if (option.href.includes("/_files/ugd/")) {
                dead.push(`${game.title} -> ${option.title || "untitled"}`);
            }
        }
    }

    assert.deepEqual(dead, AWAITING_LOCAL_COPY);
});
