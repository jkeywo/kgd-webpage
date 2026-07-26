/* =========================
   PROSE

   Turns the description text written in games.neon into HTML.

   THE DIALECT — this is the whole of it. Anything not listed here is
   rendered literally, so writing games.neon never depends on reading
   the regexes below.

     # ## ###          headings
     **bold**          bold
     *italic*          italic
     - item  /  * item bullet list (a run of them becomes one list)
     blank line        new paragraph
     single newline    line break within a paragraph

   INLINE HTML — descriptions in games.neon deliberately contain real
   links, so a small allowlist of tags is passed through:

     <a href="http…">  link (rendered with target/rel added)
     <em> <strong> <br>

   Everything else is escaped. That is the trust decision: catalogue
   text is authored by us and may link out, but it cannot inject
   arbitrary markup.
========================= */

const ALLOWED_INLINE_TAGS = ["em", "strong", "br"];

export function proseToHTML(source) {
    if (!source) return "";

    const blocks = String(source)
        .replace(/\r\n/g, "\n")
        .split(/\n\s*\n/)
        .map(block => block.trim())
        .filter(Boolean);

    return blocks.map(renderBlock).join("\n");
}

function renderBlock(block) {
    const lines = block.split("\n").map(line => line.trim());

    if (lines.every(isBullet)) {
        const items = lines
            .map(line => `<li>${renderInline(stripBullet(line))}</li>`)
            .join("");
        return `<ul>${items}</ul>`;
    }

    const heading = lines[0].match(/^(#{1,3})\s+(.*)$/);
    if (heading && lines.length === 1) {
        const level = heading[1].length;
        return `<h${level}>${renderInline(heading[2])}</h${level}>`;
    }

    return `<p>${lines.map(renderInline).join("<br>")}</p>`;
}

function isBullet(line) {
    return /^[-*]\s+\S/.test(line);
}

function stripBullet(line) {
    return line.replace(/^[-*]\s+/, "");
}

/* Escape first, then restore the allowlist. Emphasis is applied after
   escaping so that markup inside catalogue text can never introduce a
   tag we didn't intend. */
function renderInline(text) {
    let html = escapeHTML(text);

    html = restoreAllowedTags(html);

    html = html
        .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(?=\S)([^*]*?\S)\*/g, "<em>$1</em>");

    return html;
}

function escapeHTML(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function restoreAllowedTags(escaped) {
    const tags = ALLOWED_INLINE_TAGS.join("|");
    let openAnchors = 0;

    return escaped
        /* Links, http(s) only. The capture is tempered so it cannot run
           past the closing quote — without that, backtracking lets a
           second attribute (onclick=…) ride in on the match. The href
           is already in escaped form, so it goes out unchanged. */
        .replace(
            /&lt;a href=&quot;(https?:\/\/(?:(?!&quot;)[\s\S])*?)&quot;&gt;/gi,
            (_match, href) => {
                openAnchors += 1;
                return `<a href="${href}" target="_blank" rel="noopener">`;
            },
        )
        /* Only close anchors we actually opened, so a rejected opening
           tag doesn't leave a stray </a> behind. */
        .replace(/&lt;\/a&gt;/gi, match => {
            if (openAnchors === 0) return match;
            openAnchors -= 1;
            return "</a>";
        })
        .replace(new RegExp(`&lt;(${tags})\\s*/?&gt;`, "gi"), "<$1>")
        .replace(new RegExp(`&lt;/(${tags})&gt;`, "gi"), "</$1>");
}
