import assert from "node:assert/strict";
import test from "node:test";
import { PLAYBACK_TEXTURES, chordPlaybackEvents, midiPlaybackWindow, playbackWindow } from "../src/audio.js";

test("provides layered playback textures including the original block chord", () => {
  assert.deepEqual(
    PLAYBACK_TEXTURES.map((texture) => texture.id),
    ["block", "arpeggio-up", "arpeggio-down", "alberti", "waltz", "bass-syncopation", "stride"]
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
  assert.equal(seventh.length, 8);
  assert.equal(round(seventh.at(-1).time), 1.4);
});

test("keeps the master release after the final texture note", () => {
  const events = chordPlaybackEvents([60, 64, 67, 71], { texture: "arpeggio-up", duration: 1.6 });
  const lastEvent = events.at(-1);
  const window = playbackWindow(events, 1.6);

  assert.ok(lastEvent.time < 1.6);
  assert.ok(lastEvent.time + lastEvent.duration > 1.6);
  assert.ok(window.eventEnd >= lastEvent.time + lastEvent.duration);
  assert.ok(window.playbackEnd > window.eventEnd);
});

test("reports release time beyond the musical bar duration", () => {
  const window = midiPlaybackWindow([60, 64, 67, 71], { texture: "arpeggio-up", duration: 1.6, spread: 0.012 });

  assert.ok(window.eventEnd > 1.6);
  assert.ok(window.playbackEnd > window.eventEnd);
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

test("layers bass support with upper syncopation for a full 4/4 bar", () => {
  const events = chordPlaybackEvents([60, 64, 67, 71], { texture: "bass-syncopation", duration: 1.6 });
  const bassEvents = events.filter((event) => event.midi === 48);
  const upperOnsets = [...new Set(events.filter((event) => event.midi > 48).map((event) => round(event.time)))];

  assert.deepEqual(bassEvents.map((event) => round(event.time)), [0, 0.8]);
  assert.deepEqual(upperOnsets, [0.2, 0.212, 0.224, 0.6, 0.612, 0.624, 1.2, 1.212, 1.224, 1.4, 1.412, 1.424]);
  assert.ok(events.some((event) => event.time + event.duration >= 1.6));
});

test("alternates low bass and upper chord stabs in stride texture", () => {
  const events = chordPlaybackEvents([60, 64, 67, 71], { texture: "stride", duration: 1.6 });
  const lowOnsets = [...new Set(events.filter((event) => event.midi <= 55).map((event) => round(event.time)))];
  const upperOnsets = [...new Set(events.filter((event) => event.midi > 55).map((event) => round(event.time)))];

  assert.deepEqual(lowOnsets, [0, 0.4, 0.8, 1.2]);
  assert.deepEqual(upperOnsets, [0.2, 0.212, 0.224, 0.6, 0.612, 0.624, 1, 1.012, 1.024, 1.4, 1.412, 1.424]);
  assert.ok(events.some((event) => event.time + event.duration >= 1.6));
});

test("uses the recognized root for bass-led textures when the voicing is inverted", () => {
  const withoutRoot = chordPlaybackEvents([64, 67, 72], { texture: "bass-syncopation", duration: 1.6 });
  const withRoot = chordPlaybackEvents([64, 67, 72], { texture: "bass-syncopation", duration: 1.6, rootPc: 0 });

  assert.deepEqual(withoutRoot.filter((event) => event.velocity > 0.9).map((event) => event.midi), [52, 52]);
  assert.deepEqual(withRoot.filter((event) => event.velocity > 0.9).map((event) => event.midi), [60, 60]);
});

function round(value) {
  return Math.round(value * 1000) / 1000;
}
