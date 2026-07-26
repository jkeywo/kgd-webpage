/* =========================
   MAIN

   Wiring only. Everything that decides anything lives in the
   catalogue, prose and view modules.

   The catalogue is loaded through an injected pair — how to get the
   text, and how to parse it — so tests can build a catalogue from a
   fixture without a network or a YAML parser.
========================= */

import jsyaml from "./vendor/js-yaml.js";
import { buildCatalogue, findGameBySlug } from "./catalogue.js";
import { createView } from "./views.js";

/* Resolved against this module, not the site root, so the site works
   when served from a subdirectory. */
const CATALOGUE_URL = new URL("games.neon", import.meta.url);

export async function loadCatalogue({ fetchText, parse }) {
    return buildCatalogue(parse(await fetchText()));
}

function parseRoute(catalogue, hash) {
    const path = hash.replace(/^#/, "");

    if (path.startsWith("game/")) {
        const game = findGameBySlug(catalogue, path.slice("game/".length));
        return game ? { name: "game", game } : { name: "notFound" };
    }

    return { name: "home" };
}

async function start() {
    const view = createView({ onNavigate: navigate });

    let catalogue;
    try {
        catalogue = await loadCatalogue({
            fetchText: async () => {
                const response = await fetch(CATALOGUE_URL);
                if (!response.ok) throw new Error(`${response.status} loading games.neon`);
                return response.text();
            },
            parse: text => jsyaml.load(text),
        });
    } catch (err) {
        console.error(err);
        document.getElementById("gameContent").textContent = "Failed to load site data.";
        document.getElementById("homeView").classList.add("hidden");
        document.getElementById("gameView").classList.remove("hidden");
        return;
    }

    reportProblems(catalogue.problems);

    view.renderHome(catalogue);

    function route() {
        view.show(parseRoute(catalogue, window.location.hash));
    }

    function navigate(hash) {
        history.pushState({}, "", hash);
        route();
    }

    window.addEventListener("popstate", route);
    window.addEventListener("hashchange", route);

    route();
}

/* Entries the catalogue couldn't make sense of. These are authoring
   mistakes in games.neon, so they surface loudly rather than showing
   up as a missing button on the page. */
function reportProblems(problems) {
    if (problems.length === 0) return;

    console.groupCollapsed(`games.neon: ${problems.length} problem(s)`);
    problems.forEach(p => console.warn(`${p.where}: ${p.message}`));
    console.groupEnd();
}

start();
