const FUNCTION_GROUPS = {
  T: new Set([1, 3, 6]),
  S: new Set([2, 4]),
  D: new Set([5, 7])
};

export function functionGroupForDegree(degree) {
  const numericDegree = Number(degree);
  return Object.entries(FUNCTION_GROUPS).find(([, degrees]) => degrees.has(numericDegree))?.[0] ?? "N";
}

export function functionGroupForRoot(rootPc, scalePitchClasses) {
  const degreeIndex = scalePitchClasses.findIndex((pitchClass) => pitchClass === rootPc);
  return degreeIndex < 0 ? "N" : functionGroupForDegree(degreeIndex + 1);
}

export function createDegreeProgressionItem(chord, midiNotes, id) {
  return {
    id,
    symbol: chord.name,
    functionGroup: functionGroupForDegree(chord.degree),
    rootPc: chord.rootPc,
    midiNotes: [...midiNotes],
    source: "degree"
  };
}

export function createDetectedProgressionItem(match, midiNotes, scalePitchClasses, id) {
  return {
    id,
    symbol: match.symbol,
    functionGroup: functionGroupForRoot(match.rootPc, scalePitchClasses),
    rootPc: match.rootPc,
    midiNotes: [...midiNotes].sort((a, b) => a - b),
    source: "input"
  };
}

export function moveProgressionItem(items, itemId, targetIndex) {
  const fromIndex = items.findIndex((item) => item.id === itemId);
  if (fromIndex < 0 || targetIndex < 0 || targetIndex >= items.length || fromIndex === targetIndex) return [...items];

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export function shouldUseNativeProgressionDrag(inputCapabilities = {}) {
  return Boolean(inputCapabilities.anyFinePointer && inputCapabilities.anyHover);
}

export function progressionDragSwapDirection(draggedRect, previousRect, nextRect, movementX) {
  if (movementX < 0 && previousRect) {
    const previousMidpoint = previousRect.left + previousRect.width / 2;
    return draggedRect.left < previousMidpoint ? "before" : null;
  }

  if (movementX > 0 && nextRect) {
    const nextMidpoint = nextRect.left + nextRect.width / 2;
    return draggedRect.right > nextMidpoint ? "after" : null;
  }

  return null;
}

export function progressionPianoHighlight(midiNotes, rootPc) {
  const midis = [...new Set(midiNotes.filter(Number.isFinite))].sort((a, b) => a - b);
  return {
    midis,
    pitchClasses: [...new Set(midis.map((midi) => ((midi % 12) + 12) % 12))],
    rootPc: Number.isFinite(rootPc) ? ((rootPc % 12) + 12) % 12 : null
  };
}

export function removeProgressionItem(items, itemId) {
  return items.filter((item) => item.id !== itemId);
}

export function restoreProgressionQueue(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => {
      return item
        && typeof item.id === "string"
        && typeof item.symbol === "string"
        && ["T", "S", "D", "N"].includes(item.functionGroup)
        && Number.isInteger(item.rootPc)
        && Array.isArray(item.midiNotes)
        && item.midiNotes.every(Number.isFinite);
    })
    .map((item) => ({
      id: item.id,
      symbol: item.symbol,
      functionGroup: item.functionGroup,
      rootPc: item.rootPc,
      midiNotes: [...item.midiNotes],
      source: item.source === "input" ? "input" : "degree"
    }));
}
