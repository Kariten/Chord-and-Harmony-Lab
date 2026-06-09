import assert from "node:assert/strict";
import test from "node:test";
import { guitarVoicings } from "../src/guitarVoicings.js";

test("generates playable C major seventh guitar voicings before the twelfth fret", () => {
  const voicings = guitarVoicings({
    rootPc: 0,
    pitchClasses: [0, 4, 7, 11]
  });

  assert.ok(voicings.length > 6);
  assert.ok(voicings.every((voicing) => voicing.frets.every((fret) => fret === null || (fret >= 0 && fret <= 12))));
  assert.ok(voicings.every((voicing) => voicing.notePcs.includes(0)));
  assert.ok(voicings.every((voicing) => voicing.notePcs.includes(4)));
  assert.ok(voicings.every((voicing) => voicing.notePcs.includes(11)));
});

test("keeps generated shapes within a four-fret span", () => {
  const voicings = guitarVoicings({
    rootPc: 9,
    pitchClasses: [9, 0, 4, 7]
  });

  assert.ok(voicings.length > 0);
  for (const voicing of voicings) {
    const fretted = voicing.frets.filter((fret) => fret > 0);
    if (fretted.length < 2) continue;
    assert.ok(Math.max(...fretted) - Math.min(...fretted) <= 4);
  }
});

test("returns voicings from multiple fret positions", () => {
  const voicings = guitarVoicings({
    rootPc: 7,
    pitchClasses: [7, 11, 2, 5]
  });
  const positions = new Set(voicings.map((voicing) => voicing.position));

  assert.ok(positions.size >= 3);
  assert.ok(Math.max(...positions) <= 12);
});

test("reports omitted optional tones for dense shapes", () => {
  const voicings = guitarVoicings({
    rootPc: 0,
    pitchClasses: [0, 4, 7, 10, 2, 9]
  });

  assert.ok(voicings.length > 0);
  assert.ok(voicings.some((voicing) => voicing.missingNotes.length > 0));
});
