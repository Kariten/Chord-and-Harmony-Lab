import { noteName, pc } from "./chordEngine.js";

export const STANDARD_GUITAR_TUNING = [
  { name: "E", midi: 40, pc: 4 },
  { name: "A", midi: 45, pc: 9 },
  { name: "D", midi: 50, pc: 2 },
  { name: "G", midi: 55, pc: 7 },
  { name: "B", midi: 59, pc: 11 },
  { name: "E", midi: 64, pc: 4 }
];

const MUTE = null;
const DEFAULT_MAX_FRET = 15;
const DEFAULT_MAX_SPAN = 4;
const DEFAULT_LIMIT = 8;

export function guitarVoicings({
  rootPc,
  pitchClasses,
  preferFlats = false,
  maxFret = DEFAULT_MAX_FRET,
  maxSpan = DEFAULT_MAX_SPAN,
  limit = DEFAULT_LIMIT
}) {
  const chordPcs = [...new Set(pitchClasses.map(pc))].sort((a, b) => a - b);
  if (!Number.isFinite(rootPc) || chordPcs.length === 0) return [];

  const root = pc(rootPc);
  const requiredPcs = requiredChordTones(root, chordPcs);
  const candidates = new Map();

  for (let windowStart = 0; windowStart <= maxFret; windowStart += 1) {
    const windowEnd = Math.min(maxFret, Math.max(windowStart + maxSpan, 4));
    const allowOpen = windowStart <= 1;
    const options = STANDARD_GUITAR_TUNING.map((string) => {
      return stringOptions(string, chordPcs, windowStart, windowEnd, allowOpen, maxFret);
    });

    collectCandidates(options, (frets) => {
      const candidate = buildCandidate(frets, root, chordPcs, requiredPcs, preferFlats);
      if (!candidate) return;
      const key = candidate.frets.map((fret) => fret ?? "x").join("-");
      const existing = candidates.get(key);
      if (!existing || candidate.score < existing.score) {
        candidates.set(key, candidate);
      }
    });
  }

  return selectVoicings([...candidates.values()], limit)
    .sort((a, b) => a.score - b.score || a.position - b.position || a.frets.join("").localeCompare(b.frets.join("")));
}

function requiredChordTones(root, chordPcs) {
  if (chordPcs.length <= 3) return chordPcs;

  const required = [root];
  [pc(root + 3), pc(root + 4), pc(root + 10), pc(root + 11)].forEach((notePc) => {
    if (chordPcs.includes(notePc) && !required.includes(notePc)) {
      required.push(notePc);
    }
  });

  if (required.length >= 3) return required;

  chordPcs.forEach((notePc) => {
    if (required.length < 3 && !required.includes(notePc)) {
      required.push(notePc);
    }
  });
  return required;
}

function stringOptions(string, chordPcs, windowStart, windowEnd, allowOpen, maxFret) {
  const options = [MUTE];
  if (allowOpen && chordPcs.includes(string.pc)) {
    options.push(0);
  }

  const firstFret = Math.max(1, windowStart);
  for (let fret = firstFret; fret <= Math.min(windowEnd, maxFret); fret += 1) {
    if (chordPcs.includes(pc(string.pc + fret))) {
      options.push(fret);
    }
  }

  return options;
}

function collectCandidates(options, visit, index = 0, frets = []) {
  if (index === options.length) {
    visit(frets);
    return;
  }

  options[index].forEach((fret) => {
    frets.push(fret);
    collectCandidates(options, visit, index + 1, frets);
    frets.pop();
  });
}

function buildCandidate(frets, root, chordPcs, requiredPcs, preferFlats) {
  const played = frets
    .map((fret, stringIndex) => {
      if (fret === MUTE) return null;
      const string = STANDARD_GUITAR_TUNING[stringIndex];
      const notePc = pc(string.pc + fret);
      return {
        fret,
        midi: string.midi + fret,
        notePc,
        note: noteName(notePc, preferFlats),
        stringIndex
      };
    })
    .filter(Boolean);

  if (played.length < Math.min(3, requiredPcs.length)) return null;

  const presentPcs = [...new Set(played.map((item) => item.notePc))];
  if (!requiredPcs.every((notePc) => presentPcs.includes(notePc))) return null;
  if (!presentPcs.includes(root)) return null;

  const fretted = played.filter((item) => item.fret > 0);
  const fretNumbers = fretted.map((item) => item.fret);
  const minFret = fretNumbers.length ? Math.min(...fretNumbers) : 0;
  const maxFret = fretNumbers.length ? Math.max(...fretNumbers) : 0;
  const span = maxFret > 0 ? maxFret - minFret : 0;
  if (span > DEFAULT_MAX_SPAN) return null;

  const bass = played[0];
  const missingPcs = chordPcs.filter((notePc) => !presentPcs.includes(notePc));
  const mutedMiddleStrings = countMutedMiddleStrings(frets);
  if (mutedMiddleStrings > 0) return null;

  const openStrings = played.filter((item) => item.fret === 0).length;
  if (openStrings > 0 && maxFret > 4) return null;

  const muteCount = frets.filter((fret) => fret === MUTE).length;
  if (muteCount > 2) return null;
  if (frets[4] === MUTE && frets[5] === MUTE) return null;

  const fingering = buildFingering(fretted, frets);
  if (!fingering) return null;
  const firstRootString = played.find((item) => item.notePc === root)?.stringIndex ?? played[0].stringIndex;
  const lowerNonRootStrings = played.filter((item) => item.stringIndex < firstRootString).length;

  const score =
    missingPcs.length * 64 +
    muteCount * 12 +
    (frets[5] === MUTE ? 18 : 0) +
    (frets[4] === MUTE ? 8 : 0) +
    lowerNonRootStrings * 12 +
    (played.length <= 3 ? 12 : 0) +
    (bass.notePc === root ? 0 : 14) +
    span * 7 +
    fretted.length * 1.8 +
    Math.max(0, minFret - 1) * 1.1 -
    (openStrings > 0 ? 24 : 0) -
    openStrings * 2.4 -
    barreScoreBonus(fingering.barres[0]);

  const displayPosition = openStrings > 0 && maxFret <= 3 ? 1 : minFret === 0 ? 1 : minFret;

  return {
    frets: [...frets],
    fingers: fingering.fingers,
    barres: fingering.barres,
    position: displayPosition,
    label: displayPosition === 1 && openStrings > 0 ? "Open" : `Fret ${displayPosition}`,
    score,
    notes: played.map((item) => item.note),
    notePcs: presentPcs,
    missingPcs,
    missingNotes: missingPcs.map((notePc) => noteName(notePc, preferFlats)),
    rootInBass: bass.notePc === root,
    stringCount: played.length,
    muteCount
  };
}

function selectVoicings(candidates, limit) {
  const ranked = candidates.sort((a, b) => a.score - b.score || a.position - b.position || a.frets.join("").localeCompare(b.frets.join("")));
  const complete = ranked.filter((candidate) => candidate.missingPcs.length === 0);
  const pool = complete.length >= Math.min(4, limit) ? complete : ranked;
  const selected = [];
  const usedPositions = new Set();

  for (const candidate of pool) {
    if (usedPositions.has(candidate.position)) continue;
    selected.push(candidate);
    usedPositions.add(candidate.position);
    if (selected.length === limit) return selected;
  }

  for (const candidate of ranked) {
    if (selected.includes(candidate)) continue;
    if (usedPositions.has(candidate.position)) continue;
    selected.push(candidate);
    usedPositions.add(candidate.position);
    if (selected.length === limit) return selected;
  }

  return selected;
}

function buildFingering(fretted, frets) {
  const usableBarres = detectUsableBarres(fretted, frets);
  const plans = [{ fingers: assignDistinctFingers(fretted), barres: [] }];
  usableBarres.forEach((barre) => {
    const remaining = fretted.filter((note) => {
      return note.stringIndex < barre.fromString || note.stringIndex > barre.toString || note.fret !== barre.fret;
    });
    const fingers = assignDistinctFingers(remaining, 2);
    if (!fingers) return;
    for (let stringIndex = barre.fromString; stringIndex <= barre.toString; stringIndex += 1) {
      if (frets[stringIndex] === barre.fret) {
        fingers[stringIndex] = 1;
      }
    }
    plans.push({ fingers, barres: [barre] });
  });

  return plans
    .filter((plan) => plan.fingers)
    .sort((a, b) => fingeringCost(a, fretted) - fingeringCost(b, fretted))[0] ?? null;
}

function assignDistinctFingers(fretted, firstFinger = 1) {
  if (fretted.length > 5 - firstFinger) return null;
  const sorted = [...fretted].sort((a, b) => a.fret - b.fret || a.stringIndex - b.stringIndex);
  return sorted.reduce((map, note, index) => {
    map[note.stringIndex] = firstFinger + index;
    return map;
  }, {});
}

function fingeringCost(plan, fretted) {
  const fingerCount = new Set(Object.values(plan.fingers)).size;
  const repeatedFingerCost = Object.values(plan.fingers).length - fingerCount;
  return plan.barres.length * 5 + repeatedFingerCost * 20 + fingerCount;
}

function detectUsableBarres(fretted, frets) {
  const byFret = new Map();
  const barres = [];
  fretted.forEach((note) => {
    const notes = byFret.get(note.fret) ?? [];
    notes.push(note);
    byFret.set(note.fret, notes);
  });

  for (const [fret, notes] of byFret.entries()) {
    if (notes.length < 2) continue;
    const strings = notes.map((note) => note.stringIndex).sort((a, b) => a - b);
    const fromString = strings[0];
    const toString = strings[strings.length - 1];
    const crossesOnlyFrettedStrings = frets.slice(fromString, toString + 1).every((candidateFret) => {
      return candidateFret !== MUTE && candidateFret > 0 && candidateFret >= fret;
    });
    if (!crossesOnlyFrettedStrings) continue;
    if (toString - fromString + 1 > 3 && fromString > 1) continue;

    const barre = {
      fret,
      fromString,
      toString
    };
    if (shouldUseBarre(barre, fretted)) {
      barres.push(barre);
    }
  }

  return barres;
}

function barreScoreBonus(barre) {
  if (!barre) return 0;
  const width = barre.toString - barre.fromString + 1;
  if (barre.fromString <= 1 && width >= 4) return 10;
  if (width <= 3) return 4;
  return 0;
}

function shouldUseBarre(barre, fretted) {
  const width = barre.toString - barre.fromString + 1;
  if (fretted.length > 4) return true;
  if (barre.fromString <= 1 && width >= 4) return true;
  return width <= 3 && fretted.length > 4;
}

function countMutedMiddleStrings(frets) {
  const playedIndexes = frets
    .map((fret, index) => (fret === MUTE ? null : index))
    .filter((index) => index !== null);
  if (playedIndexes.length < 2) return 0;
  const first = Math.min(...playedIndexes);
  const last = Math.max(...playedIndexes);
  return frets.slice(first, last + 1).filter((fret) => fret === MUTE).length;
}
