import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const styles = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("keeps short wide tablet layouts within the viewport", () => {
  assert.match(
    styles,
    /@media \(min-width: 901px\) and \(max-height: 700px\)\s*\{[\s\S]*?body\s*\{[^}]*overflow:\s*hidden[^}]*\}[\s\S]*?\.app-shell\s*\{[^}]*grid-template-rows:\s*92px 58px minmax\(0, 1fr\) 172px[^}]*height:\s*100dvh/s
  );
});

test("only uses the document scrolling fallback on narrow short screens", () => {
  assert.match(styles, /@media \(max-height: 700px\) and \(max-width: 900px\)/);
  assert.doesNotMatch(styles, /@media \(max-height: 700px\)\s*\{/);
});

test("disables mobile text autosizing to preserve fixed panel proportions", () => {
  assert.match(
    styles,
    /html\s*\{[^}]*-webkit-text-size-adjust:\s*100%[^}]*text-size-adjust:\s*100%/s
  );
});
