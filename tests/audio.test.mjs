import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";
import {
  DEFAULT_BPM,
  MAX_DECODED_PIANO_SAMPLES,
  MAX_BPM,
  MIN_BPM,
  PIANO_SAMPLES,
  PLAYBACK_TEXTURES,
  SAMPLE_DECODE_CONCURRENCY,
  SAMPLE_FETCH_CONCURRENCY,
  barDurationForBpm,
  chordPlaybackEvents,
  mapWithConcurrency,
  midiPlaybackWindow,
  normalizeBpm,
  pianoSampleForMidi,
  pianoSamplePreloadOrder,
  pianoSamplesForMidis,
  playbackWindow
} from "../src/audio.js";

test("normalizes BPM values and converts 4/4 bars to seconds", () => {
  assert.equal(DEFAULT_BPM, 150);
  assert.equal(normalizeBpm("120"), 120);
  assert.equal(normalizeBpm(20), MIN_BPM);
  assert.equal(normalizeBpm(300), MAX_BPM);
  assert.equal(normalizeBpm(null), DEFAULT_BPM);
  assert.equal(normalizeBpm(""), DEFAULT_BPM);
  assert.equal(normalizeBpm("invalid", 96), 96);
  assert.equal(barDurationForBpm(120), 2);
  assert.equal(barDurationForBpm(DEFAULT_BPM), 1.6);
});

test("covers the full piano range with Salamander sample roots", () => {
  assert.equal(PIANO_SAMPLES.length, 30);
  assert.equal(PIANO_SAMPLES[0].midi, 21);
  assert.equal(PIANO_SAMPLES.at(-1).midi, 108);
  assert.ok(PIANO_SAMPLES.every((sample, index) => index === 0 || sample.midi - PIANO_SAMPLES[index - 1].midi === 3));
});

test("bundles every declared piano sample as a non-empty MP3 file", async () => {
  for (const sample of PIANO_SAMPLES) {
    const file = new URL(`../assets/piano/salamander/${sample.file}`, import.meta.url);
    assert.ok((await stat(file)).size > 1000, `${sample.file} should contain audio data`);
  }
});

test("maps every note to a nearby sample with the correct playback rate", () => {
  const exact = pianoSampleForMidi(60);
  const raised = pianoSampleForMidi(62);
  const lowered = pianoSampleForMidi(59);

  assert.equal(exact.name, "C4");
  assert.equal(exact.playbackRate, 1);
  assert.equal(raised.name, "Ds4");
  assert.equal(round(raised.playbackRate), round(2 ** (-1 / 12)));
  assert.equal(lowered.name, "C4");
  assert.equal(round(lowered.playbackRate), round(2 ** (-1 / 12)));
});

test("loads only the distinct sample roots required by the played notes", () => {
  const samples = pianoSamplesForMidis([60, 64, 67, 71, 60]);

  assert.deepEqual(samples.map((sample) => sample.midi), [60, 63, 66, 72]);
  assert.ok(samples.every((sample) => sample.playbackRate > 0));
});

test("preloads compressed piano samples from the middle register outward", () => {
  const order = pianoSamplePreloadOrder();

  assert.equal(order[0].midi, 60);
  assert.ok(Math.abs(order[1].midi - 60) <= Math.abs(order.at(-1).midi - 60));
  assert.equal(new Set(order.map((sample) => sample.midi)).size, PIANO_SAMPLES.length);
});

test("limits mobile-friendly sample loading and decoding concurrency", async () => {
  assert.equal(SAMPLE_FETCH_CONCURRENCY, 3);
  assert.equal(SAMPLE_DECODE_CONCURRENCY, 2);
  assert.equal(MAX_DECODED_PIANO_SAMPLES, 12);

  let active = 0;
  let peak = 0;
  const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active -= 1;
    return value * 2;
  });

  assert.deepEqual(results, [2, 4, 6, 8, 10]);
  assert.equal(peak, 2);
});

test("prefetches compressed samples without creating or decoding an audio context", async () => {
  const originalFetch = globalThis.fetch;
  const originalAudioContext = globalThis.AudioContext;
  let activeFetches = 0;
  let peakFetches = 0;
  let contextCreations = 0;

  globalThis.fetch = async () => {
    activeFetches += 1;
    peakFetches = Math.max(peakFetches, activeFetches);
    await new Promise((resolve) => setTimeout(resolve, 1));
    activeFetches -= 1;
    return {
      ok: true,
      arrayBuffer: async () => new Uint8Array(2048).buffer
    };
  };
  globalThis.AudioContext = class {
    constructor() {
      contextCreations += 1;
    }
  };

  try {
    const audio = await import("../src/audio.js?encoded-preload-test");
    assert.equal(await audio.preloadPianoSamples(), true);
    assert.equal(contextCreations, 0);
    assert.ok(peakFetches <= audio.SAMPLE_FETCH_CONCURRENCY);
    assert.deepEqual(audio.pianoSampleStatus(), {
      expected: audio.PIANO_SAMPLES.length,
      encoded: audio.PIANO_SAMPLES.length,
      decoded: 0,
      ready: false,
      complete: false
    });
  } finally {
    restoreGlobal("fetch", originalFetch);
    restoreGlobal("AudioContext", originalAudioContext);
  }
});

test("retries sample downloads after a transient preload failure", async () => {
  const originalFetch = globalThis.fetch;
  let shouldFail = true;
  let requestCount = 0;

  globalThis.fetch = async () => {
    requestCount += 1;
    if (shouldFail) throw new Error("temporary network failure");
    return {
      ok: true,
      arrayBuffer: async () => new Uint8Array(2048).buffer
    };
  };

  try {
    const audio = await import("../src/audio.js?sample-retry-test");
    assert.equal(await audio.preloadPianoSamples(), false);
    shouldFail = false;
    assert.equal(await audio.preloadPianoSamples(), true);
    assert.equal(requestCount, audio.PIANO_SAMPLES.length * 2);
  } finally {
    restoreGlobal("fetch", originalFetch);
  }
});

test("decodes only the samples needed for the first played chord", async () => {
  const originalFetch = globalThis.fetch;
  const originalAudioContext = globalThis.AudioContext;
  let decodeCount = 0;
  let sourceCount = 0;
  let contextCreations = 0;

  globalThis.fetch = async () => ({
    ok: true,
    arrayBuffer: async () => new Uint8Array(2048).buffer
  });
  globalThis.AudioContext = class {
    constructor() {
      contextCreations += 1;
      this.state = "running";
      this.currentTime = 0;
      this.destination = {};
    }

    decodeAudioData() {
      decodeCount += 1;
      return Promise.resolve({ duration: 4 });
    }

    createGain() {
      return { gain: audioParam(), connect() {} };
    }

    createDynamicsCompressor() {
      return {
        threshold: { value: 0 },
        knee: { value: 0 },
        ratio: { value: 0 },
        attack: { value: 0 },
        release: { value: 0 },
        connect() {}
      };
    }

    createBufferSource() {
      sourceCount += 1;
      return {
        buffer: null,
        playbackRate: audioParam(),
        connect() {},
        start() {},
        stop() {}
      };
    }
  };

  try {
    const audio = await import("../src/audio.js?on-demand-decode-test");
    await audio.playMidiNotes([60, 64, 67, 71], { duration: 1 });

    assert.equal(contextCreations, 1);
    assert.equal(decodeCount, 4);
    assert.equal(sourceCount, 4);
    assert.equal(audio.pianoSampleStatus().decoded, 4);
    assert.equal(audio.pianoSampleStatus().ready, true);
  } finally {
    restoreGlobal("fetch", originalFetch);
    restoreGlobal("AudioContext", originalAudioContext);
  }
});

test("provides layered playback textures including the original block chord", () => {
  assert.deepEqual(
    PLAYBACK_TEXTURES.map((texture) => texture.id),
    [
      "block",
      "arpeggio-up",
      "arpeggio-down",
      "alberti",
      "waltz",
      "bass-syncopation",
      "stride",
      "arpeggio-up-rest",
      "arpeggio-down-rest",
      "arpeggio-turn-rest",
      "bass-answer"
    ]
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
  assert.equal(round(window.playbackEnd - window.eventEnd), 0.68);
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

test("short arpeggios add a sustained low root beneath five eighth-note attacks", () => {
  const duration = 1.6;
  ["arpeggio-up-rest", "arpeggio-down-rest", "arpeggio-turn-rest"].forEach((texture) => {
    const events = chordPlaybackEvents([60, 64, 67, 71], { texture, duration, rootPc: 0 });
    const bass = events.find((event) => event.duration === duration);
    const arpeggio = events.filter((event) => event !== bass);

    assert.equal(events.length, 6);
    assert.equal(bass.midi, 48);
    assert.equal(bass.time, 0);
    assert.deepEqual(arpeggio.map((event) => round(event.time)), [0, 0.2, 0.4, 0.6, 0.8]);
    assert.ok(
      duration - Math.max(...arpeggio.map((event) => event.time + event.duration)) >= 0.6,
      `${texture} should leave three upper-voice rest slots`
    );
    assert.equal(midiPlaybackWindow([60, 64, 67, 71], { texture, duration, rootPc: 0 }).eventEnd, duration);
  });
});

test("short ascending and descending arpeggios continue across octaves", () => {
  const ascending = chordPlaybackEvents([60, 64, 67], {
    texture: "arpeggio-up-rest",
    duration: 1.6
  });
  const descending = chordPlaybackEvents([60, 64, 67], {
    texture: "arpeggio-down-rest",
    duration: 1.6
  });
  const turn = chordPlaybackEvents([60, 64, 67], {
    texture: "arpeggio-turn-rest",
    duration: 1.6
  });

  assert.deepEqual(ascending.slice(1).map((event) => event.midi), [60, 64, 67, 72, 76]);
  assert.deepEqual(descending.slice(1).map((event) => event.midi), [67, 64, 60, 55, 52]);
  assert.deepEqual(turn.slice(1).map((event) => event.midi), [60, 64, 67, 72, 67]);
});

test("short arpeggio bass follows the recognized root in inverted voicings", () => {
  const events = chordPlaybackEvents([64, 67, 72], {
    texture: "arpeggio-up-rest",
    duration: 1.6,
    rootPc: 0
  });
  const bass = events.find((event) => event.duration === 1.6);

  assert.equal(bass.midi, 48);
  assert.equal(bass.midi % 12, 0);
});

test("short arpeggios keep the same rhythm across triads and seventh chords", () => {
  ["arpeggio-up-rest", "arpeggio-down-rest", "arpeggio-turn-rest"].forEach((texture) => {
    const triad = chordPlaybackEvents([60, 64, 67], { texture, duration: 1.6, rootPc: 0 });
    const seventh = chordPlaybackEvents([60, 64, 67, 71], { texture, duration: 1.6, rootPc: 0 });
    const triadOnsets = rhythmicSlots(triad, 1.6);
    const seventhOnsets = rhythmicSlots(seventh, 1.6);

    assert.deepEqual(triadOnsets, seventhOnsets);
  });
});

test("bass answer texture keeps a clear ending rest", () => {
  const duration = 1.6;
  const events = chordPlaybackEvents([60, 64, 67, 71], { texture: "bass-answer", duration, rootPc: 0 });
  const lastSoundEnd = Math.max(...events.map((event) => event.time + event.duration));

  assert.ok(duration - lastSoundEnd >= 0.35);
  assert.equal(midiPlaybackWindow([60, 64, 67, 71], { texture: "bass-answer", duration, rootPc: 0 }).eventEnd, duration);
});

function rhythmicSlots(events, duration) {
  const step = duration / 8;
  return [...new Set(events.filter((event) => event.duration < duration).map((event) => Math.round(event.time / step)))];
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function audioParam() {
  return {
    value: 0,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {}
  };
}

function restoreGlobal(name, value) {
  if (value === undefined) {
    delete globalThis[name];
  } else {
    globalThis[name] = value;
  }
}
