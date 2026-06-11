import { midiToFrequency } from "./chordEngine.js";

let audioContext;

export const PLAYBACK_TEXTURES = [
  { id: "block", nameKey: "textureBlock" },
  { id: "arpeggio-up", nameKey: "textureArpeggioUp" },
  { id: "arpeggio-down", nameKey: "textureArpeggioDown" },
  { id: "alberti", nameKey: "textureAlberti" },
  { id: "waltz", nameKey: "textureWaltz" }
];

export function playMidiNotes(midiNotes, options = {}) {
  const notes = [...new Set(midiNotes)].sort((a, b) => a - b);
  if (!notes.length) return;

  audioContext ??= new AudioContext();
  const now = audioContext.currentTime;
  const duration = options.duration ?? 1.6;
  const events = chordPlaybackEvents(notes, { texture: options.texture, duration, spread: options.spread });
  const master = audioContext.createGain();
  const compressor = audioContext.createDynamicsCompressor();

  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.46, now + 0.035);
  master.gain.exponentialRampToValueAtTime(0.18, now + duration * 0.72);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  compressor.threshold.value = -20;
  compressor.knee.value = 18;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.008;
  compressor.release.value = 0.22;

  master.connect(compressor);
  compressor.connect(audioContext.destination);

  events.forEach((event) => {
    const start = now + event.time;
    const stop = now + Math.min(duration + 0.05, event.time + event.duration + 0.05);
    const osc = audioContext.createOscillator();
    const overtone = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const overtoneGain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    osc.type = "triangle";
    overtone.type = "sine";
    osc.frequency.setValueAtTime(midiToFrequency(midi), start);
    overtone.frequency.setValueAtTime(midiToFrequency(midi) * 2, start);

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
    filter.connect(master);

    osc.start(start);
    overtone.start(start);
    osc.stop(stop);
    overtone.stop(stop);
  });
}

export function chordPlaybackEvents(midiNotes, options = {}) {
  const notes = [...new Set(midiNotes)].sort((a, b) => a - b);
  if (!notes.length) return [];

  const texture = options.texture ?? "block";
  const duration = options.duration ?? 1.6;
  const spread = options.spread ?? 0.018;
  const voiceCount = notes.length;

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

  return notes.map((midi, index) => ({
    midi,
    time: index * spread,
    duration,
    velocity: 1,
    voiceCount
  }));
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

function notePattern(notes, indexes) {
  return indexes.map((index) => notes[((index % notes.length) + notes.length) % notes.length]);
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
