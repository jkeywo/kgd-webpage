/* =========================
   VIEW

   Owns what is on screen and what the document says about itself.
   Showing a route sets visibility and page metadata together, so the
   two can never disagree — there is no way to show a game and forget
   to update the title and share card.

   Structure is built with createElement; the only HTML strings that
   reach the page come from the prose module, which owns escaping.
========================= */

import { CATEGORIES, gamesInCategory } from "./catalogue.js";
import { proseToHTML } from "./prose.js";

const SITE_NAME = "Kiwi Game Design";
const SITE_DESCRIPTION = "Megagame, boardgame and RPG design.";

export function createView({ onNavigate }) {
    const homeView = document.getElementById("homeView");
    const gameView = document.getElementById("gameView");
    const gameContent = document.getElementById("gameContent");

    let catalogue = { games: [], problems: [] };

    function renderHome(nextCatalogue) {
        catalogue = nextCatalogue;
        homeView.replaceChildren(...CATEGORIES.map(buildSection).filter(Boolean));
    }

    function buildSection(category) {
        const games = gamesInCategory(catalogue, category.id);
        if (games.length === 0) return null;

        const section = element("section", { id: category.id });
        section.append(element("h2", { text: category.title }));

        const grid = element("div", { className: "grid" });
        games.forEach(game => grid.append(buildCard(game)));
        section.append(grid);

        return section;
    }

    function buildCard(game) {
        const card = element("div", { className: "card" });

        if (game.banner) card.append(image(game.banner, game.title, "lazy"));
        card.append(element("h3", { text: game.title }));
        if (game.summary) card.append(element("p", { text: game.summary }));
        if (game.cost) card.append(element("strong", { text: game.cost }));
        if (game.status) {
            card.append(element("div", {
                className: `status ${game.status}`,
                text: game.statusLabel,
            }));
        }

        card.addEventListener("click", () => onNavigate(`#game/${game.slug}`));

        return card;
    }

    /* The one way to change what's on screen. */
    function show(route) {
        if (route.name === "game") {
            showGame(route.game);
        } else if (route.name === "notFound") {
            showNotFound();
        } else {
            showHome();
        }
    }

    function showHome() {
        homeView.classList.remove("hidden");
        gameView.classList.add("hidden");
        setMetadata({ title: SITE_NAME, description: SITE_DESCRIPTION });
    }

    function showGame(game) {
        homeView.classList.add("hidden");
        gameView.classList.remove("hidden");

        const parts = [backButton()];

        if (game.banner) {
            const wrapper = element("div");
            wrapper.append(image(game.banner, game.title, "eager", "banner"));
            parts.push(wrapper);
        }

        parts.push(element("h1", { text: game.title }));

        if (game.description) {
            parts.push(element("div", {
                className: "markdown",
                html: proseToHTML(game.description),
            }));
        }

        if (game.options.length > 0) {
            const container = element("div", { className: "options-container" });
            game.options.forEach(option => container.append(buildOptionCard(option)));
            parts.push(container);
        }

        gameContent.replaceChildren(...parts);

        setMetadata({
            title: game.title,
            description: game.summary || `Game by ${SITE_NAME}`,
            image: game.banner,
        });
    }

    function buildOptionCard(option) {
        const card = element("div", { className: "option-card" });

        if (option.image) card.append(image(option.image, option.title || "", "lazy"));

        const info = element("div", { className: "option-info" });
        if (option.title) info.append(element("h3", { text: option.title }));
        if (option.description) {
            info.append(element("div", { html: proseToHTML(option.description) }));
        }
        if (option.cost) info.append(element("strong", { text: option.cost }));

        const link = element("a", {
            className: "action",
            text: option.action === "purchase" ? "Buy" : "Download",
        });
        link.href = option.href;
        if (isExternal(option.href)) {
            link.target = "_blank";
            link.rel = "noopener";
        }
        info.append(link);

        card.append(info);
        return card;
    }

    function showNotFound() {
        homeView.classList.add("hidden");
        gameView.classList.remove("hidden");

        gameContent.replaceChildren(
            element("h1", { text: "404" }),
            element("p", { text: "Page not found." }),
            backButton("Return Home"),
        );

        setMetadata({ title: "404", description: "Page not found." });
    }

    function backButton(label = "← Back") {
        const button = element("button", { text: label, className: "back" });
        button.addEventListener("click", () => onNavigate("#"));
        return button;
    }

    return { renderHome, show };
}

/* ---- metadata ---- */

function setMetadata({ title, description, image = null }) {
    document.title = title === SITE_NAME ? SITE_NAME : `${title} | ${SITE_NAME}`;

    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:url", window.location.href, "property");
    setMeta("og:image", image ? absoluteURL(image) : "", "property");
}

function setMeta(name, content, attrType = "name") {
    let tag = document.head.querySelector(`meta[${attrType}="${name}"]`);

    if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attrType, name);
        document.head.append(tag);
    }

    tag.setAttribute("content", content);
}

function absoluteURL(path) {
    return new URL(path, window.location.href).href;
}

/* ---- element helpers ---- */

function element(tag, { className, id, text, html } = {}) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (id) node.id = id;
    if (text) node.textContent = text;
    if (html) node.innerHTML = html;
    return node;
}

function image(src, alt, loading, className) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = alt;
    img.loading = loading;
    img.decoding = "async";
    if (className) img.className = className;
    return img;
}

function isExternal(href) {
    return /^[a-z]+:/i.test(href);
}
