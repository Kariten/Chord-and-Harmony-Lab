import assert from "node:assert/strict";
import test from "node:test";
import {
  createDegreeProgressionItem,
  createDetectedProgressionItem,
  functionGroupForDegree,
  functionGroupForRoot,
  moveProgressionItem,
  progressionDragSwapDirection,
  progressionPianoHighlight,
  removeProgressionItem,
  restoreProgressionQueue,
  shouldUseNativeProgressionDrag
} from "../src/progression.js";

test("classifies diatonic degrees into tonic, subdominant, and dominant groups", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(functionGroupForDegree), ["T", "S", "T", "S", "D", "T", "D"]);
});

test("classifies detected chord roots against the active scale", () => {
  const cMajor = [0, 2, 4, 5, 7, 9, 11];
  assert.equal(functionGroupForRoot(0, cMajor), "T");
  assert.equal(functionGroupForRoot(5, cMajor), "S");
  assert.equal(functionGroupForRoot(7, cMajor), "D");
  assert.equal(functionGroupForRoot(1, cMajor), "N");
});

test("keeps degree and user-input voicings in progression items", () => {
  const degree = createDegreeProgressionItem({ name: "Cmaj7", degree: 1, rootPc: 0 }, [60, 64, 67, 71], "degree-1");
  const detected = createDetectedProgressionItem({ symbol: "C7/E", rootPc: 0 }, [64, 67, 70, 72], [0, 2, 4, 5, 7, 9, 11], "input-1");

  assert.equal(degree.functionGroup, "T");
  assert.deepEqual(degree.midiNotes, [60, 64, 67, 71]);
  assert.equal(detected.functionGroup, "T");
  assert.deepEqual(detected.midiNotes, [64, 67, 70, 72]);
});

test("reorders and removes progression items without mutating the source", () => {
  const items = [
    { id: "a" },
    { id: "b" },
    { id: "c" }
  ];
  assert.deepEqual(moveProgressionItem(items, "c", 0).map((item) => item.id), ["c", "a", "b"]);
  assert.deepEqual(removeProgressionItem(items, "b").map((item) => item.id), ["a", "c"]);
  assert.deepEqual(items.map((item) => item.id), ["a", "b", "c"]);
});

test("uses native drag for precise hovering pointers even on touch-capable desktops", () => {
  assert.equal(shouldUseNativeProgressionDrag({
    anyFinePointer: true,
    anyHover: true,
    maxTouchPoints: 10
  }), true);
  assert.equal(shouldUseNativeProgressionDrag({
    anyFinePointer: false,
    anyHover: false,
    maxTouchPoints: 5
  }), false);
  assert.equal(shouldUseNativeProgressionDrag({
    anyFinePointer: true,
    anyHover: false
  }), false);
});

test("swaps progression items after the dragged edge crosses half of an adjacent item", () => {
  const previous = { left: 20, width: 80 };
  const next = { left: 140, width: 120 };

  assert.equal(
    progressionDragSwapDirection({ left: 61, right: 141 }, previous, next, -1),
    null
  );
  assert.equal(
    progressionDragSwapDirection({ left: 59, right: 139 }, previous, next, -1),
    "before"
  );
  assert.equal(
    progressionDragSwapDirection({ left: 119, right: 199 }, previous, next, 1),
    null
  );
  assert.equal(
    progressionDragSwapDirection({ left: 120, right: 200 }, previous, next, 1),
    null
  );
  assert.equal(
    progressionDragSwapDirection({ left: 121, right: 201 }, previous, next, 1),
    "after"
  );
});

test("only evaluates the adjacent item in the active drag direction", () => {
  const previous = { left: 20, width: 80 };
  const next = { left: 140, width: 120 };

  assert.equal(
    progressionDragSwapDirection({ left: 0, right: 260 }, previous, next, 1),
    "after"
  );
  assert.equal(
    progressionDragSwapDirection({ left: 0, right: 260 }, previous, next, -1),
    "before"
  );
  assert.equal(
    progressionDragSwapDirection({ left: 0, right: 260 }, previous, next, 0),
    null
  );
});

test("builds exact piano highlights for progression playback", () => {
  assert.deepEqual(progressionPianoHighlight([67, 71, 74, 77, 67], 7), {
    midis: [67, 71, 74, 77],
    pitchClasses: [7, 11, 2, 5],
    rootPc: 7
  });
  assert.deepEqual(progressionPianoHighlight([60, 64, Number.NaN], 12), {
    midis: [60, 64],
    pitchClasses: [0, 4],
    rootPc: 0
  });
});

test("restores only valid persisted progression entries", () => {
  const restored = restoreProgressionQueue([
    { id: "a", symbol: "Cmaj7", functionGroup: "T", rootPc: 0, midiNotes: [60, 64, 67, 71], source: "degree" },
    { id: "bad", symbol: "bad", functionGroup: "X", rootPc: 0, midiNotes: [] }
  ]);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].symbol, "Cmaj7");
});
