export const NOTE_NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const NOTE_NAMES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export const KEY_OPTIONS = [
  { name: "C", pc: 0, preferFlats: false },
  { name: "Db", pc: 1, preferFlats: true },
  { name: "D", pc: 2, preferFlats: false },
  { name: "Eb", pc: 3, preferFlats: true },
  { name: "E", pc: 4, preferFlats: false },
  { name: "F", pc: 5, preferFlats: true },
  { name: "F#", pc: 6, preferFlats: false },
  { name: "G", pc: 7, preferFlats: false },
  { name: "Ab", pc: 8, preferFlats: true },
  { name: "A", pc: 9, preferFlats: false },
  { name: "Bb", pc: 10, preferFlats: true },
  { name: "B", pc: 11, preferFlats: false }
];

export const MODES = [
  {
    id: "ionian",
    name: "Ionian / 大调",
    shortName: "Ionian",
    intervals: [0, 2, 4, 5, 7, 9, 11],
    color: "#1f8a70"
  },
  {
    id: "aeolian",
    name: "Aeolian / 自然小调",
    shortName: "Aeolian",
    intervals: [0, 2, 3, 5, 7, 8, 10],
    color: "#7c4dff"
  },
  {
    id: "harmonic-minor",
    name: "Harmonic Minor / 和声小调",
    shortName: "Harmonic minor",
    intervals: [0, 2, 3, 5, 7, 8, 11],
    color: "#c2410c"
  },
  {
    id: "melodic-minor",
    name: "Melodic Minor / 旋律小调",
    shortName: "Melodic minor",
    intervals: [0, 2, 3, 5, 7, 9, 11],
    color: "#0f766e"
  },
  {
    id: "dorian",
    name: "Dorian",
    shortName: "Dorian",
    intervals: [0, 2, 3, 5, 7, 9, 10],
    color: "#2563eb"
  },
  {
    id: "phrygian",
    name: "Phrygian",
    shortName: "Phrygian",
    intervals: [0, 1, 3, 5, 7, 8, 10],
    color: "#be123c"
  },
  {
    id: "lydian",
    name: "Lydian",
    shortName: "Lydian",
    intervals: [0, 2, 4, 6, 7, 9, 11],
    color: "#b45309"
  },
  {
    id: "mixolydian",
    name: "Mixolydian",
    shortName: "Mixolydian",
    intervals: [0, 2, 4, 5, 7, 9, 10],
    color: "#047857"
  },
  {
    id: "locrian",
    name: "Locrian",
    shortName: "Locrian",
    intervals: [0, 1, 3, 5, 6, 8, 10],
    color: "#334155"
  },
  {
    id: "harmonic-major",
    name: "Harmonic Major / 和声大调",
    shortName: "Harmonic major",
    intervals: [0, 2, 4, 5, 7, 8, 11],
    color: "#a16207"
  }
];

const ROMANS = ["I", "II", "III", "IV", "V", "VI", "VII"];
const SCALE_DEGREES = ["1", "2", "3", "4", "5", "6", "7"];

const CHORD_TYPES = [
  { suffix: "5", quality: "Power chord", intervals: [0, 7], aliases: ["no3"] },
  { suffix: "", quality: "Major triad", intervals: [0, 4, 7], aliases: ["maj", "M"] },
  { suffix: "m", quality: "Minor triad", intervals: [0, 3, 7], aliases: ["min", "-"] },
  { suffix: "dim", quality: "Diminished triad", intervals: [0, 3, 6], aliases: ["o"] },
  { suffix: "aug", quality: "Augmented triad", intervals: [0, 4, 8], aliases: ["+", "#5"] },
  { suffix: "sus2", quality: "Suspended second", intervals: [0, 2, 7], aliases: ["sus2"] },
  { suffix: "sus4", quality: "Suspended fourth", intervals: [0, 5, 7], aliases: ["sus"] },
  { suffix: "6", quality: "Major sixth", intervals: [0, 4, 7, 9], aliases: ["add6"] },
  { suffix: "m6", quality: "Minor sixth", intervals: [0, 3, 7, 9], aliases: ["min6"] },
  { suffix: "7", quality: "Dominant seventh", intervals: [0, 4, 7, 10], aliases: ["dom7"] },
  { suffix: "7(no5)", quality: "Dominant seventh shell", intervals: [0, 4, 10], aliases: ["7 shell"] },
  { suffix: "maj7", quality: "Major seventh", intervals: [0, 4, 7, 11], aliases: ["M7", "△7"] },
  { suffix: "maj7(no5)", quality: "Major seventh shell", intervals: [0, 4, 11], aliases: ["M7 shell", "△7 shell"] },
  { suffix: "m7", quality: "Minor seventh", intervals: [0, 3, 7, 10], aliases: ["min7", "-7"] },
  { suffix: "m7(no5)", quality: "Minor seventh shell", intervals: [0, 3, 10], aliases: ["min7 shell", "-7 shell"] },
  { suffix: "mMaj7", quality: "Minor major seventh", intervals: [0, 3, 7, 11], aliases: ["m△7", "mM7"] },
  { suffix: "mMaj7(no5)", quality: "Minor major seventh shell", intervals: [0, 3, 11], aliases: ["m△7 shell", "mM7 shell"] },
  { suffix: "m7b5", quality: "Half-diminished seventh", intervals: [0, 3, 6, 10], aliases: ["ø7"] },
  { suffix: "dim7", quality: "Fully diminished seventh", intervals: [0, 3, 6, 9], aliases: ["o7"] },
  { suffix: "aug7", quality: "Augmented dominant seventh", intervals: [0, 4, 8, 10], aliases: ["7#5"] },
  { suffix: "maj7#5", quality: "Augmented major seventh", intervals: [0, 4, 8, 11], aliases: ["△7#5"] },
  { suffix: "7b5", quality: "Dominant seventh flat five", intervals: [0, 4, 6, 10], aliases: ["7#11(no5)"] },
  { suffix: "7sus4", quality: "Dominant suspended fourth", intervals: [0, 5, 7, 10], aliases: ["sus7"] },
  { suffix: "add9", quality: "Major add nine", intervals: [0, 2, 4, 7], aliases: ["add2"] },
  { suffix: "madd9", quality: "Minor add nine", intervals: [0, 2, 3, 7], aliases: ["madd2"] },
  { suffix: "6/9", quality: "Six nine", intervals: [0, 2, 4, 7, 9], aliases: ["6add9"] },
  { suffix: "m6/9", quality: "Minor six nine", intervals: [0, 2, 3, 7, 9], aliases: ["m6add9"] },
  { suffix: "9", quality: "Dominant ninth", intervals: [0, 2, 4, 7, 10], aliases: ["dom9"] },
  { suffix: "9(no5)", quality: "Dominant ninth without fifth", intervals: [0, 2, 4, 10], aliases: ["9"] },
  { suffix: "9(no1)", quality: "Rootless dominant ninth", intervals: [2, 4, 7, 10], aliases: ["9"] },
  { suffix: "maj9", quality: "Major ninth", intervals: [0, 2, 4, 7, 11], aliases: ["M9", "△9"] },
  { suffix: "maj9(no5)", quality: "Major ninth without fifth", intervals: [0, 2, 4, 11], aliases: ["M9", "△9"] },
  { suffix: "m9", quality: "Minor ninth", intervals: [0, 2, 3, 7, 10], aliases: ["min9", "-9"] },
  { suffix: "m9(no5)", quality: "Minor ninth without fifth", intervals: [0, 2, 3, 10], aliases: ["min9", "-9"] },
  { suffix: "mMaj9", quality: "Minor major ninth", intervals: [0, 2, 3, 7, 11], aliases: ["m△9"] },
  { suffix: "7b9", quality: "Dominant flat ninth", intervals: [0, 1, 4, 7, 10], aliases: ["dom7b9"] },
  { suffix: "7b9(no5)", quality: "Dominant flat ninth without fifth", intervals: [0, 1, 4, 10], aliases: ["7b9"] },
  { suffix: "7b9(no1)", quality: "Rootless dominant flat ninth", intervals: [1, 4, 7, 10], aliases: ["7b9"] },
  { suffix: "7#9", quality: "Dominant sharp ninth", intervals: [0, 3, 4, 7, 10], aliases: ["Hendrix chord"] },
  { suffix: "7#9(no5)", quality: "Dominant sharp ninth without fifth", intervals: [0, 3, 4, 10], aliases: ["7#9"] },
  { suffix: "7#9(no1)", quality: "Rootless dominant sharp ninth", intervals: [3, 4, 7, 10], aliases: ["7#9"] },
  { suffix: "9b5", quality: "Dominant ninth flat fifth", intervals: [0, 2, 4, 6, 10], aliases: ["9#11(no5)"] },
  { suffix: "9#5", quality: "Dominant ninth sharp fifth", intervals: [0, 2, 4, 8, 10], aliases: ["9+"] },
  { suffix: "11", quality: "Dominant eleventh", intervals: [0, 2, 4, 5, 7, 10], aliases: ["9sus(add3)"] },
  { suffix: "m11", quality: "Minor eleventh", intervals: [0, 2, 3, 5, 7, 10], aliases: ["min11", "-11"] },
  { suffix: "9sus4", quality: "Dominant ninth suspended fourth", intervals: [0, 2, 5, 7, 10], aliases: ["11(no3)"] },
  { suffix: "maj9#11", quality: "Lydian major ninth", intervals: [0, 2, 4, 6, 7, 11], aliases: ["△9#11"] },
  { suffix: "13", quality: "Dominant thirteenth", intervals: [0, 2, 4, 7, 9, 10], aliases: ["dom13"] },
  { suffix: "13(no5)", quality: "Dominant thirteenth without fifth", intervals: [0, 2, 4, 9, 10], aliases: ["13"] },
  { suffix: "13(no1/no5)", quality: "Rootless dominant thirteenth", intervals: [2, 4, 9, 10], aliases: ["13"] },
  { suffix: "maj13", quality: "Major thirteenth", intervals: [0, 2, 4, 7, 9, 11], aliases: ["M13", "△13"] },
  { suffix: "maj13(no5)", quality: "Major thirteenth without fifth", intervals: [0, 2, 4, 9, 11], aliases: ["M13", "△13"] },
  { suffix: "m13", quality: "Minor thirteenth", intervals: [0, 2, 3, 5, 7, 9, 10], aliases: ["min13", "-13"] },
  { suffix: "m13(no5)", quality: "Minor thirteenth without fifth", intervals: [0, 2, 3, 5, 9, 10], aliases: ["min13", "-13"] },
  { suffix: "13b9", quality: "Dominant thirteenth flat ninth", intervals: [0, 1, 4, 7, 9, 10], aliases: ["7b9add13"] },
  { suffix: "7alt", quality: "Altered dominant", intervals: [0, 1, 3, 4, 8, 10], aliases: ["7b9#9#5"] }
];

const QUALITY_BY_INTERVALS = new Map(CHORD_TYPES.map((type) => [intervalKey(type.intervals), type]));

export function pc(value) {
  return ((value % 12) + 12) % 12;
}

export function uniquePitchClasses(values) {
  return [...new Set(values.map(pc))].sort((a, b) => a - b);
}

export function noteName(value, preferFlats = false) {
  return (preferFlats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP)[pc(value)];
}

export function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function noteNameWithOctave(midi, preferFlats = false) {
  const octave = Math.floor(midi / 12) - 1;
  return `${noteName(midi, preferFlats)}${octave}`;
}

export function modeById(id) {
  return MODES.find((mode) => mode.id === id) ?? MODES[0];
}

export function keyByPc(keyPc) {
  return KEY_OPTIONS.find((key) => key.pc === pc(keyPc)) ?? KEY_OPTIONS[0];
}

export function scalePitchClasses(keyPc, modeId) {
  const mode = modeById(modeId);
  return mode.intervals.map((interval) => pc(keyPc + interval));
}

export function buildDiatonicChords(keyPc, modeId, chordSize = "seventh") {
  const mode = modeById(modeId);
  const key = keyByPc(keyPc);
  const scale = scalePitchClasses(keyPc, modeId);
  const noteCount = chordSize === "triad" ? 3 : 4;

  return scale.map((rootPc, index) => {
    const pitchClasses = Array.from({ length: noteCount }, (_, toneIndex) => {
      const scaleIndex = (index + toneIndex * 2) % 7;
      return scale[scaleIndex];
    });
    const intervals = intervalsFromRoot(rootPc, pitchClasses);
    const type = QUALITY_BY_INTERVALS.get(intervalKey(intervals)) ?? describeByIntervals(intervals);
    const name = chordName(rootPc, type.suffix, key.preferFlats);

    return {
      degree: index + 1,
      roman: romanForQuality(index, type),
      scaleDegree: SCALE_DEGREES[index],
      rootPc,
      pitchClasses,
      intervals,
      name,
      suffix: type.suffix,
      quality: type.quality,
      aliases: buildSymbolAliases(rootPc, type, key.preferFlats),
      notes: pitchClasses.map((notePc) => noteName(notePc, key.preferFlats)),
      color: mode.color
    };
  });
}

export function identifyChord(values, options = {}) {
  const preferFlats = options.preferFlats ?? false;
  const rawValues = [...values].map(Number).filter(Number.isFinite);
  const pitchClasses = uniquePitchClasses(rawValues);
  const bassPc = rawValues.length > 0 ? pc(Math.min(...rawValues)) : null;

  if (pitchClasses.length === 0) {
    return {
      status: "empty",
      pitchClasses,
      displayNotes: [],
      primary: null,
      aliases: [],
      suggestions: []
    };
  }

  const exactMatches = [];
  for (let rootPc = 0; rootPc < 12; rootPc += 1) {
    const intervals = intervalsFromRoot(rootPc, pitchClasses);
    const type = QUALITY_BY_INTERVALS.get(intervalKey(intervals));
    if (!type) continue;
    exactMatches.push(buildMatch(rootPc, type, bassPc, preferFlats, pitchClasses));
  }

  exactMatches.sort((a, b) => b.score - a.score || a.symbol.length - b.symbol.length);

  if (exactMatches.length > 0) {
    const [primary, ...rest] = exactMatches;
    return {
      status: "exact",
      pitchClasses,
      displayNotes: rawValues.length ? rawValues.sort((a, b) => a - b).map((midi) => noteNameWithOctave(midi, preferFlats)) : pitchClasses.map((notePc) => noteName(notePc, preferFlats)),
      primary,
      aliases: [...rest, ...primary.aliasSymbols.map((symbol) => ({ symbol, quality: primary.quality, rootPc: primary.rootPc }))].slice(0, 8),
      suggestions: []
    };
  }

  const suggestions = nearestChordSuggestions(pitchClasses, bassPc, preferFlats);
  return {
    status: "unknown",
    pitchClasses,
    displayNotes: rawValues.length ? rawValues.sort((a, b) => a - b).map((midi) => noteNameWithOctave(midi, preferFlats)) : pitchClasses.map((notePc) => noteName(notePc, preferFlats)),
    primary: null,
    aliases: [],
    suggestions
  };
}

export function chordMidiVoicing(chord, baseOctave = 4) {
  const baseMidi = (baseOctave + 1) * 12 + chord.rootPc;
  return chord.intervals.map((interval) => baseMidi + interval);
}

export function pianoKeys(startMidi = 48, endMidi = 83) {
  return Array.from({ length: endMidi - startMidi + 1 }, (_, index) => {
    const midi = startMidi + index;
    const pitchClass = pc(midi);
    return {
      midi,
      pitchClass,
      name: noteNameWithOctave(midi),
      isBlack: [1, 3, 6, 8, 10].includes(pitchClass)
    };
  });
}

export function intervalLabel(interval) {
  const labels = {
    0: "1",
    1: "b9",
    2: "9",
    3: "b3/#9",
    4: "3",
    5: "11",
    6: "b5/#11",
    7: "5",
    8: "#5/b13",
    9: "6/13",
    10: "b7",
    11: "7"
  };
  return labels[pc(interval)];
}

function intervalsFromRoot(rootPc, pitchClasses) {
  return uniquePitchClasses(pitchClasses.map((notePc) => pc(notePc - rootPc)));
}

function intervalKey(intervals) {
  return uniquePitchClasses(intervals).join(",");
}

function chordName(rootPc, suffix, preferFlats) {
  return `${noteName(rootPc, preferFlats)}${suffix}`;
}

function buildSymbolAliases(rootPc, type, preferFlats) {
  const root = noteName(rootPc, preferFlats);
  return type.aliases.map((alias) => `${root}${alias}`);
}

function buildMatch(rootPc, type, bassPc, preferFlats, pitchClasses) {
  const baseSymbol = chordName(rootPc, type.suffix, preferFlats);
  const slash = bassPc !== null && bassPc !== rootPc ? `/${noteName(bassPc, preferFlats)}` : "";
  const symbol = `${baseSymbol}${slash}`;
  const hasRootInBass = bassPc === rootPc;
  const densityScore = type.intervals.length * 8;
  const extensionScore = Math.max(...type.intervals) > 11 ? 4 : 0;
  const bassScore = hasRootInBass ? 40 : 0;
  const rootPresentScore = pitchClasses.includes(rootPc) ? 20 : 0;

  return {
    symbol,
    baseSymbol,
    rootPc,
    bassPc,
    intervals: type.intervals,
    intervalLabels: type.intervals.map(intervalLabel),
    pitchClasses,
    quality: type.quality,
    aliasSymbols: buildSymbolAliases(rootPc, type, preferFlats),
    score: bassScore + rootPresentScore + densityScore + extensionScore
  };
}

function nearestChordSuggestions(pitchClasses, bassPc, preferFlats) {
  const suggestions = [];
  for (let rootPc = 0; rootPc < 12; rootPc += 1) {
    for (const type of CHORD_TYPES) {
      const chordPcs = type.intervals.map((interval) => pc(rootPc + interval));
      const selectedInsideChord = pitchClasses.filter((notePc) => chordPcs.includes(notePc)).length;
      const missing = chordPcs.filter((notePc) => !pitchClasses.includes(notePc));
      const extra = pitchClasses.filter((notePc) => !chordPcs.includes(notePc));
      if (selectedInsideChord < Math.min(3, pitchClasses.length)) continue;
      const score = selectedInsideChord * 12 - missing.length * 4 - extra.length * 8 + (bassPc === rootPc ? 8 : 0);
      suggestions.push({
        symbol: chordName(rootPc, type.suffix, preferFlats),
        quality: type.quality,
        missing: missing.map((notePc) => noteName(notePc, preferFlats)),
        extra: extra.map((notePc) => noteName(notePc, preferFlats)),
        score
      });
    }
  }
  return suggestions.sort((a, b) => b.score - a.score).slice(0, 5);
}

function romanForQuality(index, type) {
  const base = ROMANS[index];
  if (type.suffix.includes("dim7")) return `${base.toLowerCase()}°`;
  if (type.suffix.includes("dim")) return `${base.toLowerCase()}°`;
  if (type.suffix.includes("m7b5")) return `${base.toLowerCase()}ø`;
  if (type.suffix === "m" || type.suffix.startsWith("m")) return base.toLowerCase();
  if (type.suffix.includes("aug") || type.suffix.includes("#5")) return `${base}+`;
  if (type.suffix === "7" || type.suffix.includes("sus")) return base;
  return base;
}

function describeByIntervals(intervals) {
  const suffix = `(${intervals.map(intervalLabel).join(" ")})`;
  return {
    suffix,
    quality: "Modal stack",
    intervals,
    aliases: []
  };
}
