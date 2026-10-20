import assert from "node:assert/strict";
import test from "node:test";
import { startQueuePlayback } from "../src/queuePlayback.js";

function fixture({ loop = true, items = [{ id: "C", midiNotes: [60, 64, 67] }, { id: "G", midiNotes: [67, 71, 74] }] } = {}) {
  let time = 0;
  let nextId = 0;
  let finished = 0;
  const pending = new Map();
  const played = [];
  const player = startQueuePlayback(items, {
    duration: 2,
    playbackEnd: 2.7,
    shouldLoop: () => loop,
    onChord: (item, signal) => played.push({ id: item.id, at: time, signal }),
    onFinish: () => { finished += 1; }
  }, {
    now: () => time,
    setTimer: (callback, delay) => {
      const id = ++nextId;
      pending.set(id, { callback, at: time + delay });
      return id;
    },
    clearTimer: (id) => pending.delete(id)
  });

  return {
    player, played, pending,
    setLoop(value) { loop = value; },
    get finished() { return finished; },
    advanceTo(target) {
      while (pending.size) {
        const [id, next] = [...pending].sort((a, b) => a[1].at - b[1].at)[0];
        if (next.at > target) break;
        pending.delete(id);
        time = next.at;
        next.callback();
      }
      time = target;
    }
  };
}

test("repeats queue on bar boundaries without adding the sample release tail", () => {
  const run = fixture();
  run.advanceTo(8000);
  assert.deepEqual(run.played.map(({ id, at }) => [id, at]), [
    ["C", 0], ["G", 2000], ["C", 4000], ["G", 6000], ["C", 8000]
  ]);
  assert.equal(run.pending.size, 1);
  assert.equal(run.finished, 0);
  run.player.stop();
});

test("plays once by default and preserves the final piano release", () => {
  const run = fixture({ loop: false });
  run.advanceTo(4000);
  assert.equal(run.played.length, 2);
  assert.equal(run.finished, 0);
  run.advanceTo(4700);
  assert.equal(run.finished, 1);
  assert.equal(run.pending.size, 0);
});

test("turning loop off finishes the current pass without restarting it", () => {
  const run = fixture();
  run.advanceTo(4000);
  run.setLoop(false);
  run.advanceTo(8700);
  assert.deepEqual(run.played.map(({ id, at }) => [id, at]), [
    ["C", 0], ["G", 2000], ["C", 4000], ["G", 6000]
  ]);
  assert.equal(run.finished, 1);
});

test("turning loop on during a pass enables the next repeat", () => {
  const run = fixture({ loop: false });
  run.advanceTo(2000);
  run.setLoop(true);
  run.advanceTo(4000);
  assert.equal(run.played.length, 3);
  assert.equal(run.finished, 0);
  run.player.stop();
});

test("stop cancels future chords and aborts sounding and loading notes", () => {
  const run = fixture();
  run.advanceTo(2000);
  run.player.stop();
  run.player.stop();
  assert.equal(run.pending.size, 0);
  assert.ok(run.played.every(({ signal }) => signal.aborted));
  run.advanceTo(20000);
  assert.equal(run.played.length, 2);
  assert.equal(run.finished, 0);
});

test("a single-chord queue repeats at the same BPM", () => {
  const run = fixture({ items: [{ id: "C", midiNotes: [60] }] });
  run.advanceTo(6000);
  assert.deepEqual(run.played.map(({ at }) => at), [0, 2000, 4000, 6000]);
  run.player.stop();
});
