import test from "node:test";
import assert from "node:assert/strict";

import { proseToHTML } from "../prose.js";

test("blank lines separate paragraphs", () => {
    assert.equal(proseToHTML("one\n\ntwo"), "<p>one</p>\n<p>two</p>");
});

test("a single newline is a line break within a paragraph", () => {
    assert.equal(proseToHTML("one\ntwo"), "<p>one<br>two</p>");
});

test("headings", () => {
    assert.equal(proseToHTML("# Big"), "<h1>Big</h1>");
    assert.equal(proseToHTML("## Middle"), "<h2>Middle</h2>");
    assert.equal(proseToHTML("### Small"), "<h3>Small</h3>");
});

test("bold and italic", () => {
    assert.equal(proseToHTML("**loud**"), "<p><strong>loud</strong></p>");
    assert.equal(proseToHTML("*soft*"), "<p><em>soft</em></p>");
});

test("bold wins over italic when both could match", () => {
    assert.equal(
        proseToHTML("**December 2025 Update** - and then"),
        "<p><strong>December 2025 Update</strong> - and then</p>",
    );
});

/* The catalogue uses both bullet characters. Before the prose module
   existed, `*` bullets rendered as literal asterisks and `-` bullets
   produced <li> with no surrounding list. */
test("a run of dash bullets becomes one list", () => {
    assert.equal(
        proseToHTML("- one\n- two"),
        "<ul><li>one</li><li>two</li></ul>",
    );
});

test("a run of asterisk bullets becomes one list", () => {
    assert.equal(
        proseToHTML("* one\n* two"),
        "<ul><li>one</li><li>two</li></ul>",
    );
});

test("an asterisk bullet is not mistaken for emphasis", () => {
    const html = proseToHTML("* Hunt the Ripper through the streets of London.");
    assert.equal(html, "<ul><li>Hunt the Ripper through the streets of London.</li></ul>");
});

test("separate bullet blocks become separate lists", () => {
    assert.equal(
        proseToHTML("- one\n\n- two"),
        "<ul><li>one</li></ul>\n<ul><li>two</li></ul>",
    );
});

/* Descriptions in games.neon contain real links, so those pass
   through. Everything else is escaped. */
test("allowed links pass through and get target and rel", () => {
    assert.equal(
        proseToHTML('see <a href="https://example.com/x">this song</a> now'),
        '<p>see <a href="https://example.com/x" target="_blank" rel="noopener">this song</a> now</p>',
    );
});

test("query strings in links survive", () => {
    const html = proseToHTML('<a href="https://example.com/?a=1&b=2">x</a>');
    assert.match(html, /href="https:\/\/example\.com\/\?a=1&amp;b=2"/);
});

test("em, strong and br pass through", () => {
    assert.equal(proseToHTML("a<br>b"), "<p>a<br>b</p>");
    assert.equal(proseToHTML("<em>x</em>"), "<p><em>x</em></p>");
});

test("disallowed tags are escaped, not rendered", () => {
    assert.equal(
        proseToHTML("<script>alert(1)</script>"),
        "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
});

test("javascript: links are escaped, not rendered", () => {
    const html = proseToHTML('<a href="javascript:alert(1)">x</a>');
    assert.doesNotMatch(html, /<a /);
});

/* The href capture must not be able to run past its closing quote —
   if it can, a second attribute rides in on the match. */
test("a link carrying an extra attribute is rejected whole", () => {
    const html = proseToHTML('<a href="https://example.com" onclick="steal()">x</a>');

    assert.doesNotMatch(html, /<a[\s>]/, "no anchor tag should be rendered");
    assert.doesNotMatch(html, /<\/a>/, "and no orphan closing tag either");
    assert.match(html, /&lt;a href=/, "it stays as escaped text");
});

test("empty input is empty output", () => {
    assert.equal(proseToHTML(""), "");
    assert.equal(proseToHTML(null), "");
    assert.equal(proseToHTML(undefined), "");
});
