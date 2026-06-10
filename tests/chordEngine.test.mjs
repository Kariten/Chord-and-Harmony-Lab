import assert from "node:assert/strict";
import test from "node:test";
import {
  KEY_OPTIONS,
  MODES,
  buildDiatonicChords,
  centeredChordMidiVoicing,
  chordMidiVoicing,
  identifyChord,
  intervalLabel,
  noteName,
  scaleNoteNames,
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

test("spells modal scales with one letter name per degree", () => {
  assert.deepEqual(scaleNoteNames(0, "aeolian"), ["C", "D", "Eb", "F", "G", "Ab", "Bb"]);
  assert.deepEqual(scaleNoteNames(0, "harmonic-minor"), ["C", "D", "Eb", "F", "G", "Ab", "B"]);
  assert.deepEqual(scaleNoteNames(6, "harmonic-minor"), ["F#", "G#", "A", "B", "C#", "D", "E#"]);
  assert.deepEqual(scaleNoteNames(1, "harmonic-major"), ["Db", "Eb", "F", "Gb", "Ab", "Bbb", "C"]);

  for (const key of KEY_OPTIONS) {
    for (const mode of MODES) {
      const letters = scaleNoteNames(key.pc, mode.id).map((name) => name[0]);
      assert.deepEqual(new Set(letters).size, 7, `${key.name} ${mode.id} repeats a letter: ${letters.join(" ")}`);
    }
  }
});

test("uses modal spellings for diatonic chord roots and chord tones", () => {
  const cAeolian = buildDiatonicChords(0, "aeolian", "seventh");
  assert.deepEqual(cAeolian.map((chord) => chord.name), ["Cm7", "Dm7b5", "Ebmaj7", "Fm7", "Gm7", "Abmaj7", "Bb7"]);
  assert.deepEqual(cAeolian[2].notes, ["Eb", "G", "Bb", "D"]);

  const dbHarmonicMajor = buildDiatonicChords(1, "harmonic-major", "triad");
  assert.equal(dbHarmonicMajor[5].name, "Bbbaug");
  assert.deepEqual(dbHarmonicMajor[5].notes, ["Bbb", "Db", "F"]);
});

test("centers default chord playback near the middle octave", () => {
  const dbMajor = buildDiatonicChords(1, "harmonic-major", "seventh")[0];
  assert.deepEqual(chordMidiVoicing(dbMajor, 3), [49, 53, 56, 60]);
  assert.deepEqual(centeredChordMidiVoicing(dbMajor), [61, 65, 68, 72]);

  const bHalfDiminished = buildDiatonicChords(0, "ionian", "seventh")[6];
  assert.deepEqual(centeredChordMidiVoicing(bHalfDiminished), [71, 74, 77, 81]);

  for (const key of KEY_OPTIONS) {
    for (const mode of MODES) {
      for (const chord of buildDiatonicChords(key.pc, mode.id, "seventh")) {
        const notes = centeredChordMidiVoicing(chord);
        assert.ok(notes[0] >= 60 && notes[0] <= 71, `${chord.name} starts outside C4-B4: ${notes.join(" ")}`);
      }
    }
  }
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
