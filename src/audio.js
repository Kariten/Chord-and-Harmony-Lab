import { midiToFrequency } from "./chordEngine.js";

let audioContext;

export const PLAYBACK_TEXTURES = [
  { id: "block", nameKey: "textureBlock" },
  { id: "arpeggio-up", nameKey: "textureArpeggioUp" },
  { id: "arpeggio-down", nameKey: "textureArpeggioDown" },
  { id: "alberti", nameKey: "textureAlberti" },
  { id: "waltz", nameKey: "textureWaltz" },
  { id: "bass-syncopation", nameKey: "textureBassSyncopation" },
  { id: "stride", nameKey: "textureStride" }
];

export function playMidiNotes(midiNotes, options = {}) {
  const notes = [...new Set(midiNotes)].sort((a, b) => a - b);
  if (!notes.length) return;

  audioContext ??= new AudioContext();
  const now = audioContext.currentTime;
  const duration = options.duration ?? 1.6;
  const events = chordPlaybackEvents(notes, {
    texture: options.texture,
    duration,
    spread: options.spread,
    rootPc: options.rootPc
  });
  const { eventEnd, playbackEnd } = playbackWindow(events, duration);
  const master = audioContext.createGain();
  const compressor = audioContext.createDynamicsCompressor();

  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.46, now + 0.035);
  master.gain.setValueAtTime(0.42, now + Math.max(0.04, eventEnd - 0.02));
  master.gain.exponentialRampToValueAtTime(0.0001, now + playbackEnd);

  compressor.threshold.value = -20;
  compressor.knee.value = 18;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.008;
  compressor.release.value = 0.22;

  master.connect(compressor);
  compressor.connect(audioContext.destination);

  events.forEach((event) => {
    const start = now + event.time;
    const stop = now + Math.min(playbackEnd, event.time + event.duration + 0.05);
    const osc = audioContext.createOscillator();
    const overtone = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const overtoneGain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

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
    playbackEnd: eventEnd + 0.12
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

function lowBassNote(midi) {
  return midi >= 52 ? midi - 12 : midi;
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
