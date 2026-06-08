import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiatonicChords,
  identifyChord,
  intervalLabel,
  noteName,
  scalePitchClasses
} from "../src/chordEngine.js";

test("builds standard seventh chords in C major", () => {
  const names = buildDiatonicChords(0, "ionian", "seventh").map((chord) => chord.name);
  assert.deepEqual(names, ["Cmaj7", "Dm7", "Em7", "Fmaj7", "G7", "Am7", "Bm7b5"]);
});

test("builds harmonic minor seventh color tones", () => {
  const names = buildDiatonicChords(9, "harmonic-minor", "seventh").map((chord) => chord.name);
  assert.deepEqual(names, ["AmMaj7", "Bm7b5", "Cmaj7#5", "Dm7", "E7", "Fmaj7", "G#dim7"]);
});

test("recognizes dominant seventh inversions with slash bass", () => {
  const result = identifyChord([64, 67, 70, 72]);
  assert.equal(result.status, "exact");
  assert.equal(result.primary.symbol, "C7/E");
  assert.equal(result.primary.quality, "Dominant seventh");
});

test("recognizes major sixth and exposes relative minor alias", () => {
  const result = identifyChord([60, 64, 67, 69]);
  assert.equal(result.status, "exact");
  assert.equal(result.primary.symbol, "C6");
  assert.ok(result.aliases.some((alias) => alias.symbol === "Am7/C"));
});

test("recognizes extended and altered common keyboard voicings", () => {
  assert.equal(identifyChord([52, 56, 59, 63, 66]).primary.symbol, "Emaj9");
  assert.equal(identifyChord([60, 64, 67, 70, 73]).primary.symbol, "C7b9");
  assert.equal(identifyChord([60, 64, 70]).primary.symbol, "C7(no5)");
  assert.equal(identifyChord([60, 64, 70, 73]).primary.symbol, "C7b9(no5)");
  assert.equal(identifyChord([60, 63, 64, 70]).primary.symbol, "C7#9(no5)");
  assert.equal(identifyChord([60, 64, 70, 74, 81]).primary.symbol, "C13(no5)");
  assert.equal(identifyChord([62, 64, 69, 70]).primary.symbol, "C13(no1/no5)/D");
});

test("provides stable pitch spelling helpers", () => {
  assert.equal(noteName(10, true), "Bb");
  assert.equal(noteName(10, false), "A#");
  assert.equal(intervalLabel(6), "b5/#11");
  assert.deepEqual(scalePitchClasses(0, "lydian"), [0, 2, 4, 6, 7, 9, 11]);
});
