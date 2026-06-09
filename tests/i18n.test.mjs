import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_LANGUAGE, LANGUAGES, TRANSLATIONS, translate } from "../src/i18n.js";

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
