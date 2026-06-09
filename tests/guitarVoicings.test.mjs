import assert from "node:assert/strict";
import test from "node:test";
import { guitarVoicings } from "../src/guitarVoicings.js";

test("generates playable C major seventh guitar voicings before the twelfth fret", () => {
  const voicings = guitarVoicings({
    rootPc: 0,
    pitchClasses: [0, 4, 7, 11]
  });

  assert.ok(voicings.length > 0);
  assert.ok(voicings.length <= 8);
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

  assert.ok(positions.size >= 2);
  assert.ok(Math.max(...positions) <= 12);
});

test("keeps dense chord results compact and transparent", () => {
  const voicings = guitarVoicings({
    rootPc: 0,
    pitchClasses: [0, 4, 7, 10, 2, 9]
  });

  assert.ok(voicings.length > 0);
  assert.ok(voicings.length <= 8);
  assert.ok(voicings.every((voicing) => Array.isArray(voicing.missingNotes)));
});

test("keeps familiar open chord shapes near the top", () => {
  const cMajor = guitarVoicings({ rootPc: 0, pitchClasses: [0, 4, 7] });
  const aMajor = guitarVoicings({ rootPc: 9, pitchClasses: [9, 1, 4] });
  const dMajor = guitarVoicings({ rootPc: 2, pitchClasses: [2, 6, 9] });

  assert.deepEqual(cMajor[0].frets, [null, 3, 2, 0, 1, 0]);
  assert.deepEqual(aMajor[0].frets, [null, 0, 2, 2, 2, 0]);
  assert.deepEqual(dMajor[0].frets, [null, null, 0, 2, 3, 2]);
});

test("filters awkward mute and barre shapes", () => {
  const samples = [
    ...guitarVoicings({ rootPc: 0, pitchClasses: [0, 4, 7, 11] }),
    ...guitarVoicings({ rootPc: 9, pitchClasses: [9, 0, 4, 7] }),
    ...guitarVoicings({ rootPc: 7, pitchClasses: [7, 11, 2, 5] })
  ];

  assert.ok(samples.length > 0);
  for (const voicing of samples) {
    assert.ok(voicing.frets.filter((fret) => fret === null).length <= 2);
    assert.equal(hasInternalMute(voicing.frets), false);
    assert.equal(voicing.frets[4] === null && voicing.frets[5] === null, false);
    for (const barre of voicing.barres) {
      assert.equal(barreCrossesOpenOrMutedString(voicing.frets, barre), false);
      assert.ok(barre.fromString <= 1 || barre.toString - barre.fromString + 1 <= 3);
    }
  }
});

test("does not reuse one finger on different strings unless a barre is used", () => {
  const samples = [
    ...guitarVoicings({ rootPc: 0, pitchClasses: [0, 4, 7] }),
    ...guitarVoicings({ rootPc: 9, pitchClasses: [9, 1, 4] }),
    ...guitarVoicings({ rootPc: 0, pitchClasses: [0, 4, 7, 11] }),
    ...guitarVoicings({ rootPc: 7, pitchClasses: [7, 11, 2, 5] })
  ];

  assert.ok(samples.length > 0);
  for (const voicing of samples) {
    const barreStrings = new Set();
    voicing.barres.forEach((barre) => {
      for (let stringIndex = barre.fromString; stringIndex <= barre.toString; stringIndex += 1) {
        barreStrings.add(stringIndex);
      }
    });
    const nonBarreFingers = Object.entries(voicing.fingers)
      .filter(([stringIndex]) => !barreStrings.has(Number(stringIndex)))
      .map(([, finger]) => finger);
    assert.equal(new Set(nonBarreFingers).size, nonBarreFingers.length);
    assert.ok(nonBarreFingers.every((finger) => finger >= 1 && finger <= 4));
  }
});

test("uses separate fingers instead of unnecessary same-fret barres", () => {
  const aMajor = guitarVoicings({ rootPc: 9, pitchClasses: [9, 1, 4] })[0];

  assert.deepEqual(aMajor.frets, [null, 0, 2, 2, 2, 0]);
  assert.equal(aMajor.barres.length, 0);
  assert.deepEqual([aMajor.fingers[2], aMajor.fingers[3], aMajor.fingers[4]], [1, 2, 3]);
});

function hasInternalMute(frets) {
  const playedIndexes = frets
    .map((fret, index) => (fret === null ? null : index))
    .filter((index) => index !== null);
  const first = Math.min(...playedIndexes);
  const last = Math.max(...playedIndexes);
  return frets.slice(first, last + 1).some((fret) => fret === null);
}

function barreCrossesOpenOrMutedString(frets, barre) {
  return frets.slice(barre.fromString, barre.toString + 1).some((fret) => fret === null || fret === 0 || fret < barre.fret);
}
