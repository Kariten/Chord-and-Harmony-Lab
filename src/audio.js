import { midiToFrequency } from "./chordEngine.js";

let audioContext;

export function playMidiNotes(midiNotes, options = {}) {
  const notes = [...new Set(midiNotes)].sort((a, b) => a - b);
  if (!notes.length) return;

  audioContext ??= new AudioContext();
  const now = audioContext.currentTime;
  const duration = options.duration ?? 1.6;
  const spread = options.spread ?? 0.018;
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

  notes.forEach((midi, index) => {
    const start = now + index * spread;
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
    gain.gain.exponentialRampToValueAtTime(0.34 / Math.sqrt(notes.length), start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    overtoneGain.gain.setValueAtTime(0.035 / Math.sqrt(notes.length), start);
    overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.82);

    osc.connect(gain);
    overtone.connect(overtoneGain);
    gain.connect(filter);
    overtoneGain.connect(filter);
    filter.connect(master);

    osc.start(start);
    overtone.start(start);
    osc.stop(now + duration + 0.05);
    overtone.stop(now + duration + 0.05);
  });
}
