let gamesData = [];

/* =========================
   INITIALISATION
========================= */

document.addEventListener("DOMContentLoaded", init);
window.addEventListener("popstate", router);

async function init() {
    try {
        const response = await fetch("/games.neon");
        if (!response.ok) throw new Error("Failed to load games.neon");

        const text = await response.text();
        const parsed = jsyaml.load(text);

        gamesData = parsed.games || [];

        renderHome();
        router(); // Handle direct URL load

    } catch (err) {
        console.error(err);
        renderError("Failed to load site data.");
    }
}

/* =========================
   ROUTER
========================= */

function router() {
    const hash = window.location.hash.replace('#','')||'home';

    if(hash.startsWith('game/')) {
        const slug = hash.split('/')[1];
        const game = gamesData.find(g => slugify(g.title) === slug);

        if (game) {
            showGame(game);
            setSEO(
                game.title,
                game.summary || "Game by Kiwi Game Design",
                game.banner
            );
        } else {
            render404();
        }
        return;
    }

    showHome();
    setSEO("Kiwi Game Design", "Megagame, boardgame and RPG design.");
}

/* =========================
   NAVIGATION
========================= */

function navigate(url) {
    history.pushState({}, "", url);
    router();
}

/* =========================
   HOME
========================= */

function renderHome() {
    document.querySelectorAll(".grid").forEach(grid => grid.innerHTML = "");

    gamesData.forEach(game => {
        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            ${game.banner ? `<img src="${game.banner}">` : ''}
            <h3>${game.title || ''}</h3>
            <p>${game.summary || ''}</p>
            ${game.cost ? `<strong>${game.cost}</strong>` : ''}
            ${game.status ? `
                <div class="status ${game.status}">
                    ${formatStatus(game.status)}
                </div>` : ''}
        `;

        card.onclick = () => {
            navigate(`/#game/${slugify(game.title)}`);
        };

        const section = document.querySelector(
            `#${mapCategory(game.category)} .grid`
        );

        if (section) section.appendChild(card);
    });
}

function showHome() {
    document.getElementById("homeView").classList.remove("hidden");
    document.getElementById("gameView").classList.add("hidden");
}

/* =========================
   GAME VIEW
========================= */

function showGame(game) {
    document.getElementById("homeView").classList.add("hidden");
    document.getElementById("gameView").classList.remove("hidden");

    const content = document.getElementById("gameContent");

    const optionsHTML = (game.options || []).map(option => `
        <div class="option-card">
            ${option.image ? `<img src="${option.image}">` : ""}
            <div class="option-info">
                ${option.title ? `<h3>${option.title}</h3>` : ""}
                ${option.description ? `<p>${markdownToHTML(option.description)}</p>` : ""}
                ${option.cost ? `<strong>${option.cost}</strong>` : ""}
                <button onclick="window.location.href='${option.link}'">
                    ${option.type === "purchase" ? "Buy" : "Download"}
                </button>
            </div>
        </div>
    `).join("");

    content.innerHTML = `
        <button onclick="navigate('/')">← Back</button>
        ${game.banner ? `<div><img class="banner" src="${game.banner}"></div>` : ""}
        <h1>${game.title}</h1>
        <div class="markdown">
            ${markdownToHTML(game.description || "")}
            ${game.link ? `<button onclick="window.location.href='${game.link}'">
                ${game.link_type === "purchase" ? "Buy" : "Download"}
            </button>`:""}
        </div>
        <div class="options-container">
            ${optionsHTML}
        </div>
    `;
}

/* =========================
   404
========================= */

function render404() {
    document.getElementById("homeView").classList.add("hidden");
    document.getElementById("gameView").classList.remove("hidden");

    document.getElementById("gameContent").innerHTML = `
        <h1>404</h1>
        <p>Page not found.</p>
        <button onclick="navigate('/')">Return Home</button>
    `;

    setSEO("404 - Kiwi Game Design", "Page not found.");
}

/* =========================
   SEO METADATA
========================= */

function setSEO(title, description, image = null) {
    document.title = `${title} | Kiwi Game Design`;

    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:url", window.location.href, "property");

    if (image) {
        setMeta("og:image", image, "property");
    }
}

function setMeta(name, content, attrType = "name") {
    let element = document.querySelector(`meta[${attrType}="${name}"]`);

    if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attrType, name);
        document.head.appendChild(element);
    }

    element.setAttribute("content", content);
}

/* =========================
   HELPERS
========================= */

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

function mapCategory(cat) {
    if (!cat) return "other";
    cat = cat.toLowerCase();

    if (cat.includes("mega")) return "megagames";
    if (cat.includes("board")) return "boardgames";
    if (cat.includes("role")) return "roleplaying";
    return "other";
}

function formatStatus(status) {
    return status.replace("_", " ").toUpperCase();
}

function markdownToHTML(md) {
    return md
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        .replace(/\n/gim, '<br>');
}
