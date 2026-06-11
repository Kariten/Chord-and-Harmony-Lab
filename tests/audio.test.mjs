import assert from "node:assert/strict";
import test from "node:test";
import { PLAYBACK_TEXTURES, chordPlaybackEvents } from "../src/audio.js";

test("provides five playback textures including the original block chord", () => {
  assert.deepEqual(
    PLAYBACK_TEXTURES.map((texture) => texture.id),
    ["block", "arpeggio-up", "arpeggio-down", "alberti", "waltz"]
  );
});

test("keeps block texture close to the original chord audition", () => {
  const events = chordPlaybackEvents([60, 64, 67, 71], { texture: "block", duration: 1.6, spread: 0.018 });
  assert.deepEqual(events.map((event) => event.midi), [60, 64, 67, 71]);
  assert.deepEqual(events.map((event) => event.time), [0, 0.018, 0.036, 0.05399999999999999]);
  assert.ok(events.every((event) => event.duration === 1.6));
});

test("uses stable arpeggio timing across triads and seventh chords", () => {
  const triad = chordPlaybackEvents([60, 64, 67], { texture: "arpeggio-up", duration: 1.6 });
  const seventh = chordPlaybackEvents([60, 64, 67, 71], { texture: "arpeggio-up", duration: 1.6 });

  assert.deepEqual(triad.map((event) => event.time), seventh.map((event) => event.time));
  assert.deepEqual(triad.map((event) => event.midi), [60, 64, 67, 60, 64, 67, 60, 64]);
  assert.deepEqual(seventh.map((event) => event.midi), [60, 64, 67, 71, 60, 64, 67, 71]);
});

test("adapts alberti and waltz textures to different chord sizes", () => {
  const dyadAlberti = chordPlaybackEvents([60, 67], { texture: "alberti", duration: 1.6 });
  const seventhAlberti = chordPlaybackEvents([60, 64, 67, 71], { texture: "alberti", duration: 1.6 });
  const waltz = chordPlaybackEvents([60, 64, 67, 71], { texture: "waltz", duration: 1.5 });

  assert.deepEqual(dyadAlberti.map((event) => event.midi), [60, 67, 60, 67, 60, 67, 60, 67]);
  assert.deepEqual(seventhAlberti.map((event) => event.midi), [60, 71, 64, 71, 60, 71, 67, 71]);
  assert.equal(waltz[0].midi, 60);
  assert.deepEqual(waltz.slice(1, 4).map((event) => event.midi), [64, 67, 71]);
  assert.deepEqual(waltz.slice(4).map((event) => event.midi), [64, 67, 71]);
});
