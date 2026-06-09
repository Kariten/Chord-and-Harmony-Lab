import assert from "node:assert/strict";
import test from "node:test";
import { MODES } from "../src/chordEngine.js";
import { DEFAULT_LANGUAGE, LANGUAGES, MODE_LABELS, TRANSLATIONS, modeLabel, translate } from "../src/i18n.js";

test("provides at least five languages", () => {
  assert.ok(LANGUAGES.length >= 5);
  assert.ok(LANGUAGES.some((language) => language.id === DEFAULT_LANGUAGE));
});

test("all languages include the default translation keys", () => {
  const requiredKeys = Object.keys(TRANSLATIONS[DEFAULT_LANGUAGE]);
  for (const language of LANGUAGES) {
    for (const key of requiredKeys) {
      assert.ok(TRANSLATIONS[language.id][key], `${language.id} is missing ${key}`);
    }
  }
});

test("interpolates translation values", () => {
  assert.equal(translate("en", "scale", { notes: "C D E" }), "Scale: C D E");
  assert.equal(translate("zh-CN", "missing", { notes: "G A" }), "可补：G A");
});

test("falls back to default language for unknown locale", () => {
  assert.equal(translate("unknown", "playSelected"), TRANSLATIONS[DEFAULT_LANGUAGE].playSelected);
});

test("localizes degree card audition label in Chinese", () => {
  assert.equal(translate("zh-CN", "play"), "试听");
});

test("provides localized mode labels without Chinese aliases outside Chinese", () => {
  const chineseFragments = /大调|小调|和声|旋律|自然/;
  const modeIds = MODES.map((mode) => mode.id);

  for (const language of LANGUAGES) {
    for (const id of modeIds) {
      assert.ok(MODE_LABELS[language.id][id], `${language.id} is missing mode ${id}`);
    }
  }

  for (const language of LANGUAGES.filter((item) => item.id !== "zh-CN")) {
    for (const mode of MODES) {
      assert.equal(chineseFragments.test(modeLabel(language.id, mode)), false, `${language.id} leaks Chinese in ${mode.id}`);
    }
  }
});
