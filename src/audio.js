import { midiToFrequency } from "./chordEngine.js";

let audioContext;
let encodedSamplePromise;
let decodedSamplePromise;
let decodedSampleContext;
let encodedSamples = new Map();
let decodedSamples = new Map();

const PIANO_RELEASE_SECONDS = 0.68;
export const DEFAULT_BPM = 150;
export const MIN_BPM = 40;
export const MAX_BPM = 240;
const PIANO_SAMPLE_FILES = [
  "A0", "C1", "Ds1", "Fs1", "A1", "C2", "Ds2", "Fs2", "A2", "C3",
  "Ds3", "Fs3", "A3", "C4", "Ds4", "Fs4", "A4", "C5", "Ds5", "Fs5",
  "A5", "C6", "Ds6", "Fs6", "A6", "C7", "Ds7", "Fs7", "A7", "C8"
];

export const PIANO_SAMPLES = PIANO_SAMPLE_FILES.map((name, index) => ({
  name,
  midi: 21 + index * 3,
  file: `${name}.mp3`
}));

export const PLAYBACK_TEXTURES = [
  { id: "block", nameKey: "textureBlock" },
  { id: "arpeggio-up", nameKey: "textureArpeggioUp" },
  { id: "arpeggio-down", nameKey: "textureArpeggioDown" },
  { id: "alberti", nameKey: "textureAlberti" },
  { id: "waltz", nameKey: "textureWaltz" },
  { id: "bass-syncopation", nameKey: "textureBassSyncopation" },
  { id: "stride", nameKey: "textureStride" },
  { id: "arpeggio-up-rest", nameKey: "textureArpeggioUpRest" },
  { id: "arpeggio-down-rest", nameKey: "textureArpeggioDownRest" },
  { id: "arpeggio-turn-rest", nameKey: "textureArpeggioTurnRest" },
  { id: "bass-answer", nameKey: "textureBassAnswer" }
];

export function normalizeBpm(value, fallback = DEFAULT_BPM) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(parsed)));
}

export function barDurationForBpm(bpm) {
  return 240 / normalizeBpm(bpm);
}

export async function playMidiNotes(midiNotes, options = {}) {
  const notes = [...new Set(midiNotes)].sort((a, b) => a - b);
  if (!notes.length) return;

  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      return;
    }
  }

  const duration = options.duration ?? 1.6;
  const events = chordPlaybackEvents(notes, {
    texture: options.texture,
    duration,
    spread: options.spread,
    rootPc: options.rootPc
  });
  const { eventEnd, playbackEnd } = playbackWindow(events, duration);
  const samples = await ensurePianoSamples(context);
  const now = context.currentTime + 0.012;
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();

  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(samples.size ? 0.82 : 0.46, now + 0.018);
  master.gain.setValueAtTime(samples.size ? 0.78 : 0.42, now + Math.max(0.04, eventEnd));
  master.gain.exponentialRampToValueAtTime(0.0001, now + playbackEnd);

  compressor.threshold.value = -18;
  compressor.knee.value = 16;
  compressor.ratio.value = 3.5;
  compressor.attack.value = 0.008;
  compressor.release.value = 0.3;

  master.connect(compressor);
  compressor.connect(context.destination);

  events.forEach((event) => {
    if (samples.size) {
      playSampledPianoEvent(context, master, samples, event, now);
    } else {
      playSynthFallbackEvent(context, master, event, now, playbackEnd);
    }
  });
}

export function preloadPianoSamples() {
  const context = getAudioContext();
  if (!context) return Promise.resolve(false);
  return ensurePianoSamples(context).then((samples) => samples.size > 0);
}

function loadEncodedPianoSamples() {
  if (encodedSamplePromise) return encodedSamplePromise;
  if (typeof fetch !== "function") return Promise.resolve(false);

  encodedSamplePromise = Promise.allSettled(
    PIANO_SAMPLES.map(async (sample) => {
      const url = new URL(`../assets/piano/salamander/${sample.file}`, import.meta.url);
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) throw new Error(`Unable to load piano sample ${sample.file}`);
      return [sample.midi, await response.arrayBuffer()];
    })
  ).then((results) => {
    encodedSamples = new Map(
      results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value)
    );
    return encodedSamples.size > 0;
  }).catch(() => false);

  return encodedSamplePromise;
}

export function pianoSampleForMidi(midi, samples = PIANO_SAMPLES) {
  if (!samples.length) return null;
  const sample = samples.reduce((nearest, candidate) => {
    return Math.abs(candidate.midi - midi) < Math.abs(nearest.midi - midi) ? candidate : nearest;
  });
  return {
    ...sample,
    playbackRate: 2 ** ((midi - sample.midi) / 12)
  };
}

export function pianoSampleStatus() {
  return {
    expected: PIANO_SAMPLES.length,
    encoded: encodedSamples.size,
    decoded: decodedSamples.size,
    ready: decodedSamples.size === PIANO_SAMPLES.length
  };
}

function getAudioContext() {
  const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ??= new AudioContextClass();
  return audioContext;
}

async function ensurePianoSamples(context) {
  if (decodedSampleContext === context && decodedSamples.size) return decodedSamples;
  if (decodedSampleContext !== context) {
    decodedSampleContext = context;
    decodedSamples = new Map();
    decodedSamplePromise = null;
  }

  decodedSamplePromise ??= loadEncodedPianoSamples()
    .then(async () => {
      const results = await Promise.allSettled(
        [...encodedSamples].map(async ([midi, data]) => [midi, await context.decodeAudioData(data.slice(0))])
      );
      decodedSamples = new Map(
        results
          .filter((result) => result.status === "fulfilled")
          .map((result) => result.value)
      );
      return decodedSamples;
    })
    .catch(() => new Map());

  return decodedSamplePromise;
}

function playSampledPianoEvent(context, output, samples, event, now) {
  const available = PIANO_SAMPLES.filter((sample) => samples.has(sample.midi));
  const sample = pianoSampleForMidi(event.midi, available);
  if (!sample) return;

  const start = now + event.time;
  const releaseStart = start + Math.max(0.12, event.duration);
  const stop = releaseStart + PIANO_RELEASE_SECONDS;
  const source = context.createBufferSource();
  const gain = context.createGain();
  const level = (0.9 * event.velocity) / Math.sqrt(event.voiceCount);

  source.buffer = samples.get(sample.midi);
  source.playbackRate.setValueAtTime(sample.playbackRate, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(level, start + 0.008);
  gain.gain.setValueAtTime(level * 0.94, releaseStart);
  gain.gain.exponentialRampToValueAtTime(0.0001, stop);

  source.connect(gain);
  gain.connect(output);
  source.start(start);
  source.stop(Math.min(stop + 0.04, start + source.buffer.duration / sample.playbackRate));
}

function playSynthFallbackEvent(context, output, event, now, playbackEnd) {
  const start = now + event.time;
  const stop = now + Math.min(playbackEnd, event.time + event.duration + 0.05);
  const osc = context.createOscillator();
  const overtone = context.createOscillator();
  const gain = context.createGain();
  const overtoneGain = context.createGain();
  const filter = context.createBiquadFilter();

  osc.type = "triangle";
  overtone.type = "sine";
  osc.frequency.setValueAtTime(midiToFrequency(event.midi), start);
  overtone.frequency.setValueAtTime(midiToFrequency(event.midi) * 2, start);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, start);
  filter.Q.value = 0.7;

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime((0.34 * event.velocity) / Math.sqrt(event.voiceCount), start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.001, stop);

  overtoneGain.gain.setValueAtTime((0.035 * event.velocity) / Math.sqrt(event.voiceCount), start);
  overtoneGain.gain.exponentialRampToValueAtTime(0.001, stop);

  osc.connect(gain);
  overtone.connect(overtoneGain);
  gain.connect(filter);
  overtoneGain.connect(filter);
  filter.connect(output);

  osc.start(start);
  overtone.start(start);
  osc.stop(stop);
  overtone.stop(stop);
}

export function chordPlaybackEvents(midiNotes, options = {}) {
  const notes = [...new Set(midiNotes)].sort((a, b) => a - b);
  if (!notes.length) return [];

  const texture = options.texture ?? "block";
  const duration = options.duration ?? 1.6;
  const spread = options.spread ?? 0.018;
  const voiceCount = notes.length;
  const rootPc = options.rootPc;

  if (texture === "arpeggio-up") {
    return slotEvents(notePattern(notes, [0, 1, 2, 3, 4, 5, 6, 7]), duration, 8, voiceCount);
  }

  if (texture === "arpeggio-down") {
    return slotEvents(notePattern(notes, [notes.length - 1, notes.length - 2, notes.length - 3, notes.length - 4, notes.length - 5, notes.length - 6, notes.length - 7, notes.length - 8]), duration, 8, voiceCount);
  }

  if (texture === "alberti") {
    return slotEvents(albertiPattern(notes), duration, 8, voiceCount);
  }

  if (texture === "waltz") {
    return waltzEvents(notes, duration, voiceCount);
  }

  if (texture === "bass-syncopation") {
    return bassSyncopationEvents(notes, duration, voiceCount, rootPc);
  }

  if (texture === "stride") {
    return strideEvents(notes, duration, voiceCount, rootPc);
  }

  if (texture === "arpeggio-up-rest") {
    return shortArpeggioEvents(directionalPattern(notes, 5, 1), notes, duration, voiceCount, rootPc);
  }

  if (texture === "arpeggio-down-rest") {
    return shortArpeggioEvents(directionalPattern(notes, 5, -1), notes, duration, voiceCount, rootPc);
  }

  if (texture === "arpeggio-turn-rest") {
    const rising = directionalPattern(notes, 4, 1);
    return shortArpeggioEvents(
      [...rising, notes[Math.min(2, notes.length - 1)]],
      notes,
      duration,
      voiceCount,
      rootPc
    );
  }

  if (texture === "bass-answer") {
    return bassAnswerEvents(notes, duration, voiceCount, rootPc);
  }

  return notes.map((midi, index) => ({
    midi,
    time: index * spread,
    duration,
    velocity: 1,
    voiceCount
  }));
}

export function midiPlaybackWindow(midiNotes, options = {}) {
  const notes = [...new Set(midiNotes)].sort((a, b) => a - b);
  const duration = options.duration ?? 1.6;
  const events = chordPlaybackEvents(notes, {
    texture: options.texture,
    duration,
    spread: options.spread,
    rootPc: options.rootPc
  });
  return playbackWindow(events, duration);
}

export function playbackWindow(events, duration) {
  const eventEnd = events.reduce((end, event) => Math.max(end, event.time + event.duration), duration);
  return {
    eventEnd,
    playbackEnd: eventEnd + PIANO_RELEASE_SECONDS
  };
}

function slotEvents(pattern, duration, slotCount, voiceCount) {
  const step = duration / slotCount;
  return pattern.map((midi, index) => ({
    midi,
    time: index * step,
    duration: step * 1.7,
    velocity: index === 0 ? 1 : 0.86,
    voiceCount
  }));
}

function stackEvents(notes, time, duration, velocity, voiceCount, spread = 0.012) {
  return notes.map((midi, index) => ({
    midi,
    time: time + index * spread,
    duration,
    velocity,
    voiceCount
  }));
}

function notePattern(notes, indexes) {
  return indexes.map((index) => notes[((index % notes.length) + notes.length) % notes.length]);
}

function directionalPattern(notes, count, direction) {
  const pattern = [];

  for (let index = 0; index < count; index += 1) {
    const noteIndex = direction > 0
      ? index % notes.length
      : notes.length - 1 - (index % notes.length);
    let midi = notes[noteIndex];

    if (pattern.length) {
      const previous = pattern[pattern.length - 1];
      while (direction > 0 ? midi <= previous : midi >= previous) {
        midi += direction * 12;
      }
    }

    pattern.push(midi);
  }

  return pattern;
}

function albertiPattern(notes) {
  if (notes.length === 1) return notePattern(notes, [0, 0, 0, 0, 0, 0, 0, 0]);
  if (notes.length === 2) return notePattern(notes, [0, 1, 0, 1, 0, 1, 0, 1]);
  const middleIndexes = notes.length === 3 ? [1, 1] : [1, 2];
  return notePattern(notes, [0, notes.length - 1, middleIndexes[0], notes.length - 1, 0, notes.length - 1, middleIndexes[1], notes.length - 1]);
}

function waltzEvents(notes, duration, voiceCount) {
  const upper = notes.slice(1);
  const chordNotes = upper.length ? upper : notes;
  const beats = [0, duration / 3, (duration / 3) * 2];
  return [
    {
      midi: notes[0],
      time: beats[0],
      duration: duration / 2.8,
      velocity: 1,
      voiceCount
    },
    ...chordNotes.map((midi, index) => ({
      midi,
      time: beats[1] + index * 0.012,
      duration: duration / 3,
      velocity: 0.76,
      voiceCount
    })),
    ...chordNotes.map((midi, index) => ({
      midi,
      time: beats[2] + index * 0.012,
      duration: duration / 3,
      velocity: 0.68,
      voiceCount
    }))
  ];
}

function bassSyncopationEvents(notes, duration, voiceCount, rootPc) {
  const step = duration / 8;
  const bass = lowBassNote(rootMidi(notes, rootPc));
  const upper = upperChordNotes(notes, bass);
  const upperSlots = [1, 3, 6, 7];
  const events = [
    ...stackEvents([bass], 0, step * 3.4, 1.05, voiceCount),
    ...stackEvents([bass], step * 4, step * 3.6, 0.96, voiceCount)
  ];

  upperSlots.forEach((slot, index) => {
    events.push(
      ...stackEvents(upper, step * slot, step * (slot === 7 ? 1.15 : 1.65), index === 0 ? 0.84 : 0.76, voiceCount)
    );
  });

  return events.sort((a, b) => a.time - b.time || a.midi - b.midi);
}

function strideEvents(notes, duration, voiceCount, rootPc) {
  const step = duration / 8;
  const bass = lowBassNote(rootMidi(notes, rootPc));
  const bassAlternate = lowBassNote(alternateBassMidi(notes, rootPc));
  const upper = upperChordNotes(notes, bass);
  const events = [];

  [0, 2, 4, 6].forEach((slot, index) => {
    events.push(
      ...stackEvents([index % 2 === 0 ? bass : bassAlternate], step * slot, step * 1.45, index === 0 ? 1 : 0.9, voiceCount)
    );
  });

  [1, 3, 5, 7].forEach((slot, index) => {
    events.push(
      ...stackEvents(upper, step * slot, step * (slot === 7 ? 1.2 : 1.5), index % 2 === 0 ? 0.78 : 0.7, voiceCount)
    );
  });

  return events.sort((a, b) => a.time - b.time || a.midi - b.midi);
}

function shortArpeggioEvents(pattern, notes, duration, voiceCount, rootPc) {
  const step = duration / 8;
  const bass = sustainedRootBass(rootMidi(notes, rootPc));
  return [
    {
      midi: bass,
      time: 0,
      duration,
      velocity: 0.76,
      voiceCount
    },
    ...pattern.map((midi, index) => ({
      midi,
      time: index * step,
      duration: step * 0.82,
      velocity: index === 0 ? 1 : 0.84,
      voiceCount
    }))
  ];
}

function bassAnswerEvents(notes, duration, voiceCount, rootPc) {
  const step = duration / 8;
  const bass = lowBassNote(rootMidi(notes, rootPc));
  const bassAlternate = lowBassNote(alternateBassMidi(notes, rootPc));
  const upper = upperChordNotes(notes, bass);
  return [
    ...stackEvents([bass], 0, step * 1.8, 1, voiceCount),
    ...stackEvents(upper, step * 2, step * 1.3, 0.76, voiceCount),
    ...stackEvents([bassAlternate], step * 4, step * 1.45, 0.88, voiceCount),
    ...stackEvents(upper, step * 5, step, 0.7, voiceCount)
  ].sort((a, b) => a.time - b.time || a.midi - b.midi);
}

function lowBassNote(midi) {
  return midi >= 52 ? midi - 12 : midi;
}

function sustainedRootBass(midi) {
  let bass = midi;
  while (bass > 51) bass -= 12;
  while (bass < 40) bass += 12;
  return bass;
}

function rootMidi(notes, rootPc) {
  return rootPc == null ? notes[0] : notes.find((midi) => pitchClass(midi) === rootPc) ?? notes[0];
}

function alternateBassMidi(notes, rootPc) {
  if (rootPc == null) return notes[Math.min(2, notes.length - 1)];
  return notes.find((midi) => pitchClass(midi) === (rootPc + 7) % 12) ?? rootMidi(notes, rootPc);
}

function pitchClass(midi) {
  return ((midi % 12) + 12) % 12;
}

function upperChordNotes(notes, bass) {
  const upper = notes.length > 1 ? notes.slice(1) : notes.map((midi) => midi + 12);
  return upper.map((midi) => (midi <= bass + 9 ? midi + 12 : midi));
}
