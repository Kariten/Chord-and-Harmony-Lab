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

test("uses a full-width harmony panel only in narrow portrait layouts", () => {
  assert.match(
    styles,
    /@media \(max-width: 900px\)\s*\{[\s\S]*?\.control-band,\s*\.workspace-grid\s*\{[^}]*grid-template-columns:\s*1fr 1fr[^}]*\}/s
  );
  assert.match(
    styles,
    /@media \(max-width: 900px\) and \(orientation: portrait\)\s*\{[\s\S]*?\.workspace-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)[^}]*\}[\s\S]*?\.harmony-panel,\s*\.analysis-panel\s*\{[^}]*grid-column:\s*1[^}]*\}/s
  );
  assert.match(
    styles,
    /@media \(max-width: 760px\) and \(orientation: portrait\)\s*\{[\s\S]*?\.degree-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(140px, 1fr\)\)[^}]*\}/s
  );
});

test("allows nested scrollers to hand vertical movement back to the page", () => {
  assert.match(
    styles,
    /\.degree-grid\s*\{[^}]*overscroll-behavior-x:\s*contain[^}]*overscroll-behavior-y:\s*auto[^}]*touch-action:\s*pan-x pan-y/s
  );
  assert.match(
    styles,
    /\.analysis-scroll\s*\{[^}]*overflow-y:\s*auto[^}]*overscroll-behavior-y:\s*auto[^}]*touch-action:\s*pan-y/s
  );
  assert.match(
    styles,
    /\.progression-queue\s*\{[^}]*overscroll-behavior-x:\s*contain[^}]*touch-action:\s*pan-x pan-y/s
  );
  assert.match(styles, /\.progression-item\s*\{[^}]*touch-action:\s*pan-x pan-y/s);
});
