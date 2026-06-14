import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16) / 255);
  const linear = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

test("dark action buttons keep AA contrast with white text", () => {
  const darkTheme = styles.match(/html\[data-theme="dark"\]\s*\{(?<rules>[^}]+)\}/)?.groups?.rules;
  const actionGreen = darkTheme?.match(/--action-green:\s*(?<color>#[a-f\d]{6})/i)?.groups?.color;

  assert.ok(actionGreen, "dark theme must define a six-digit --action-green color");
  assert.ok(
    contrastRatio("#ffffff", actionGreen) >= 4.5,
    `${actionGreen} must have at least 4.5:1 contrast with white text`,
  );
  assert.match(styles, /\.command\.primary\s*\{[^}]*background:\s*var\(--action-green\)/s);
  assert.match(styles, /\.queue-command\.primary\s*\{[^}]*background:\s*var\(--action-green\)/s);
});

test("dark progression playback preserves the yellow active ring", () => {
  assert.match(
    styles,
    /html\[data-theme="dark"\]\s+\.progression-item\.playing\s*\{[^}]*box-shadow:\s*0 0 0 3px var\(--yellow\)/s,
  );
});
