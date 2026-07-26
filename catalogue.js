/* =========================
   CATALOGUE

   Owns the shape of a games.neon entry. Callers get normalised game
   records and never see the raw file's quirks: the link/link_type vs
   options[].link/type split, missing fields, or category spellings.

   Anything the catalogue can't make sense of comes back as a problem
   rather than silently rendering as absence.
========================= */

/* The category taxonomy. Ordered — the home page renders sections in
   this order. `match` is tested against the entry's `category` value. */
export const CATEGORIES = [
    { id: "megagames",   title: "Megagames",         match: "mega" },
    { id: "boardgames",  title: "Boardgames",        match: "board" },
    { id: "roleplaying", title: "Roleplaying Games", match: "role" },
    { id: "other",       title: "Other Games",       match: null },
];

const FALLBACK_CATEGORY = "other";

/* Statuses map to a badge; the value is also used as a CSS class. */
const STATUSES = ["for_sale", "free", "in_development", "on_hold", "unavailable"];

/* What a download/purchase button does. */
const ACTIONS = ["purchase", "download"];

const DEFAULT_ACTION = "download";

export function slugify(text) {
    return String(text)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

/* Build a catalogue from already-parsed data. Pure — no DOM, no I/O,
   no YAML. This is the test surface. */
export function buildCatalogue(rawData) {
    const problems = [];
    const entries = Array.isArray(rawData?.games) ? rawData.games : [];

    if (!Array.isArray(rawData?.games)) {
        problems.push({ where: "catalogue", message: "no `games` list found" });
    }

    const games = [];
    const seenSlugs = new Map();

    entries.forEach((entry, index) => {
        const game = buildGame(entry, index, problems);
        if (!game) return;

        const claimedBy = seenSlugs.get(game.slug);
        if (claimedBy !== undefined) {
            problems.push({
                where: game.title,
                message: `slug "${game.slug}" already used by "${claimedBy}" — one of them needs an explicit \`slug:\``,
            });
            return;
        }

        seenSlugs.set(game.slug, game.title);
        games.push(game);
    });

    return { games, problems };
}

function buildGame(entry, index, problems) {
    const where = entry?.title || `entry ${index + 1}`;

    if (!entry || typeof entry !== "object") {
        problems.push({ where, message: "entry is not a mapping" });
        return null;
    }

    if (!entry.title) {
        problems.push({ where, message: "entry has no title — skipped, it can't be linked to" });
        return null;
    }

    const slug = entry.slug ? slugify(entry.slug) : slugify(entry.title);
    if (!slug) {
        problems.push({ where, message: "title produces an empty slug — needs an explicit `slug:`" });
        return null;
    }

    return {
        slug,
        title: entry.title,
        summary: text(entry.summary),
        description: text(entry.description),
        banner: entry.banner || null,
        cost: entry.cost || null,
        status: resolveStatus(entry.status, where, problems),
        statusLabel: entry.status ? String(entry.status).replace(/_/g, " ").toUpperCase() : null,
        categoryId: resolveCategory(entry.category, where, problems),
        options: resolveOptions(entry, where, problems),
    };
}

/* The catalogue has two ways of spelling "you can get this thing":
   a top-level link/link_type, and entries in options[] using link/type.
   Both become one options list so nothing downstream has to know. */
function resolveOptions(entry, where, problems) {
    const options = [];

    if (entry.link) {
        options.push(buildOption(
            { link: entry.link, type: entry.link_type },
            where,
            problems,
        ));
    } else if (entry.link_type) {
        problems.push({ where, message: "`link_type` set but no `link`" });
    }

    const listed = Array.isArray(entry.options) ? entry.options : [];
    if (entry.options !== undefined && !Array.isArray(entry.options)) {
        problems.push({ where, message: "`options` is not a list" });
    }

    listed.forEach((option, index) => {
        if (!option || typeof option !== "object") {
            problems.push({ where, message: `option ${index + 1} is not a mapping` });
            return;
        }
        options.push(buildOption(option, where, problems));
    });

    return options.filter(Boolean);
}

function buildOption(option, where, problems) {
    if (!option.link) {
        problems.push({ where, message: `option "${option.title || option.description || "untitled"}" has no link` });
        return null;
    }

    let action = option.type;
    if (action && !ACTIONS.includes(action)) {
        problems.push({ where, message: `unknown option type "${action}" — expected one of ${ACTIONS.join(", ")}` });
        action = null;
    }

    return {
        title: option.title || null,
        description: text(option.description),
        cost: option.cost || null,
        image: option.image || null,
        href: option.link,
        action: action || DEFAULT_ACTION,
    };
}

function resolveCategory(category, where, problems) {
    if (!category) {
        problems.push({ where, message: "no category — filed under Other Games" });
        return FALLBACK_CATEGORY;
    }

    const value = String(category).toLowerCase();
    const found = CATEGORIES.find(c => c.match && value.includes(c.match));

    if (!found) {
        problems.push({ where, message: `unknown category "${category}" — filed under Other Games` });
        return FALLBACK_CATEGORY;
    }

    return found.id;
}

function resolveStatus(status, where, problems) {
    if (!status) return null;

    if (!STATUSES.includes(status)) {
        problems.push({ where, message: `unknown status "${status}" — badge will be unstyled` });
    }

    return status;
}

function text(value) {
    return value == null ? "" : String(value).trim();
}

/* Lookups. A game's slug is its identity — resolved once, at build
   time — so nothing recomputes it from the title. */

export function findGameBySlug(catalogue, slug) {
    return catalogue.games.find(game => game.slug === slug);
}

export function gamesInCategory(catalogue, categoryId) {
    return catalogue.games.filter(game => game.categoryId === categoryId);
}
