import {
  KEY_OPTIONS,
  MODES,
  buildDiatonicChords,
  centeredChordMidiVoicing,
  chordMidiVoicing,
  identifyChord,
  intervalLabel,
  keyByPc,
  modeById,
  noteName,
  noteNameWithOctave,
  pc,
  pianoKeys,
  scaleNoteNames,
  scalePitchClasses,
  scaleUsesFlats
} from "./chordEngine.js";
import { PLAYBACK_TEXTURES, playMidiNotes } from "./audio.js";
import { guitarVoicings, STANDARD_GUITAR_TUNING } from "./guitarVoicings.js";
import { DEFAULT_LANGUAGE, LANGUAGES, modeLabel, translate } from "./i18n.js";
import { describeMidiSupport, midiInputLabel, parseMidiMessage } from "./midi.js";

const state = {
  language: localStorage.getItem("chordLabLanguage") || DEFAULT_LANGUAGE,
  keyPc: 0,
  modeId: "ionian",
  chordSize: "seventh",
  selectedDegree: 0,
  pickedMidis: new Set(),
  midiAccess: null,
  midiInput: null,
  selectedMidiInputId: "",
  midiActiveMidis: new Set(),
  midiEnabled: false,
  midiStatus: "",
  analysisView: "tones",
  guitarEnabled: localStorage.getItem("chordLabGuitarEnabled") !== "false",
  texture: localStorage.getItem("chordLabTexture") || "block"
};

const dom = {
  keySelect: document.querySelector("#keySelect"),
  modeSelect: document.querySelector("#modeSelect"),
  languageSelect: document.querySelector("#languageSelect"),
  textureSelect: document.querySelector("#textureSelect"),
  triadButton: document.querySelector("#triadButton"),
  seventhButton: document.querySelector("#seventhButton"),
  playProgression: document.querySelector("#playProgression"),
  clearSelection: document.querySelector("#clearSelection"),
  guitarToggle: document.querySelector("#guitarToggle"),
  analysisTabs: document.querySelector(".analysis-tabs"),
  toneViewButton: document.querySelector("#toneViewButton"),
  guitarViewButton: document.querySelector("#guitarViewButton"),
  toneView: document.querySelector("#toneView"),
  guitarView: document.querySelector("#guitarView"),
  guitarTipButton: document.querySelector("#guitarTipButton"),
  guitarTipBubble: document.querySelector("#guitarTipBubble"),
  playSelected: document.querySelector("#playSelected"),
  midiEnable: document.querySelector("#midiEnable"),
  midiInputSelect: document.querySelector("#midiInputSelect"),
  degreeGrid: document.querySelector("#degreeGrid"),
  piano: document.querySelector("#piano"),
  modeFormula: document.querySelector("#modeFormula"),
  manualNotes: document.querySelector("#manualNotes"),
  detectedName: document.querySelector("#detectedName"),
  detectedFormula: document.querySelector("#detectedFormula"),
  aliasList: document.querySelector("#aliasList"),
  toneMap: document.querySelector("#toneMap"),
  guitarSummary: document.querySelector("#guitarSummary"),
  guitarVoicingList: document.querySelector("#guitarVoicingList"),
  heroKey: document.querySelector("#heroKey"),
  heroChord: document.querySelector("#heroChord")
};

const PIANO_KEYS = pianoKeys(48, 83);

function init() {
  state.midiStatus = t("midiInitial");

  KEY_OPTIONS.forEach((key) => {
    dom.keySelect.append(new Option(key.name, String(key.pc)));
  });
  renderModeOptions();
  LANGUAGES.forEach((language) => {
    dom.languageSelect.append(new Option(language.label, language.id));
  });
  dom.languageSelect.value = state.language;
  renderTextureOptions();

  dom.languageSelect.addEventListener("change", () => {
    state.language = dom.languageSelect.value;
    localStorage.setItem("chordLabLanguage", state.language);
    applyStaticTranslations();
    renderModeOptions();
    renderTextureOptions();
    render();
  });

  dom.textureSelect.addEventListener("change", () => {
    state.texture = dom.textureSelect.value;
    localStorage.setItem("chordLabTexture", state.texture);
    render();
  });

  dom.keySelect.addEventListener("change", () => {
    state.keyPc = Number(dom.keySelect.value);
    state.selectedDegree = 0;
    state.pickedMidis.clear();
    render();
  });

  dom.modeSelect.addEventListener("change", () => {
    state.modeId = dom.modeSelect.value;
    state.selectedDegree = 0;
    state.pickedMidis.clear();
    render();
  });

  dom.triadButton.addEventListener("click", () => {
    state.chordSize = "triad";
    render();
  });

  dom.seventhButton.addEventListener("click", () => {
    state.chordSize = "seventh";
    render();
  });

  dom.playProgression.addEventListener("click", playProgression);
  dom.toneViewButton.addEventListener("click", () => setAnalysisView("tones"));
  dom.guitarViewButton.addEventListener("click", () => setAnalysisView("guitar"));
  dom.guitarToggle.addEventListener("change", () => {
    state.guitarEnabled = dom.guitarToggle.checked;
    localStorage.setItem("chordLabGuitarEnabled", String(state.guitarEnabled));
    if (!state.guitarEnabled) state.analysisView = "tones";
    render();
  });
  dom.guitarTipButton.addEventListener("click", (event) => {
    event.stopPropagation();
    positionGuitarTip();
    setGuitarTipOpen(dom.guitarTipButton.getAttribute("aria-expanded") !== "true");
  });
  dom.guitarTipButton.addEventListener("pointerenter", positionGuitarTip);
  dom.guitarTipButton.addEventListener("focus", positionGuitarTip);
  document.addEventListener("click", () => setGuitarTipOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setGuitarTipOpen(false);
  });
  window.addEventListener("scroll", positionGuitarTip, { passive: true });
  dom.guitarView.addEventListener("scroll", positionGuitarTip, { passive: true });
  dom.playSelected.addEventListener("click", playActiveSound);
  dom.midiEnable.addEventListener("click", enableMidi);
  dom.midiInputSelect.addEventListener("change", () => {
    connectMidiInput(dom.midiInputSelect.value);
  });
  dom.clearSelection.addEventListener("click", () => {
    state.pickedMidis.clear();
    state.midiActiveMidis.clear();
    render();
  });
  window.addEventListener("resize", () => {
    scheduleFitDegreeNames();
    positionGuitarTip();
  });

  renderPiano();
  applyStaticTranslations();
  renderMidiControls();
  render();
}

function t(key, values) {
  return translate(state.language, key, values);
}

function applyStaticTranslations() {
  document.documentElement.lang = state.language;
  document.title = t("pageTitle");
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-attr]").forEach((element) => {
    element.dataset.i18nAttr.split(";").forEach((binding) => {
      const [attribute, key] = binding.split(":");
      if (attribute && key) {
        element.setAttribute(attribute, t(key));
      }
    });
  });
}

function renderModeOptions() {
  dom.modeSelect.replaceChildren();
  MODES.forEach((mode) => {
    dom.modeSelect.append(new Option(modeLabel(state.language, mode), mode.id));
  });
  dom.modeSelect.value = state.modeId;
}

function renderTextureOptions() {
  dom.textureSelect.replaceChildren();
  PLAYBACK_TEXTURES.forEach((texture) => {
    dom.textureSelect.append(new Option(t(texture.nameKey), texture.id));
  });
  if (!PLAYBACK_TEXTURES.some((texture) => texture.id === state.texture)) {
    state.texture = "block";
  }
  dom.textureSelect.value = state.texture;
}

function render() {
  const key = keyByPc(state.keyPc);
  const mode = modeById(state.modeId);
  const chords = buildDiatonicChords(state.keyPc, state.modeId, state.chordSize);
  const activeChord = chords[state.selectedDegree];
  const preferFlats = scaleUsesFlats(state.keyPc, state.modeId);
  const scaleNotes = scaleNoteNames(state.keyPc, state.modeId);

  renderHero(activeChord, key, mode, preferFlats);
  dom.modeFormula.textContent = t("scale", { notes: scaleNotes.join("  ") });
  dom.triadButton.classList.toggle("active", state.chordSize === "triad");
  dom.seventhButton.classList.toggle("active", state.chordSize === "seventh");
  dom.keySelect.value = String(state.keyPc);
  dom.modeSelect.value = state.modeId;
  dom.textureSelect.value = state.texture;
  dom.guitarToggle.checked = state.guitarEnabled;

  renderMidiControls();
  renderAnalysisTabs();
  renderDegrees(chords);
  renderAnalysis(activeChord, preferFlats);
  renderPianoState(activeChord, preferFlats);
}

function renderHero(activeChord, key, mode, preferFlats) {
  const { values: picked } = activeInputMidis();
  if (picked.length === 0) {
    dom.heroKey.textContent = `${key.name} ${mode.shortName}`;
    dom.heroChord.textContent = activeChord.name;
    return;
  }

  const manual = identifyChord(picked, { preferFlats });
  if (manual.status === "exact") {
    dom.heroKey.textContent = harmonyContextSummary(manual.primary.rootPc, manual.pitchClasses, preferFlats);
    dom.heroChord.textContent = manual.primary.symbol;
    return;
  }

  dom.heroKey.textContent = manual.displayNotes.join("  ");
  dom.heroChord.textContent = t("unknownChord");
}

function harmonyContextSummary(rootPc, pitchClasses, preferFlats) {
  const contexts = matchingDiatonicContexts(rootPc, pitchClasses, preferFlats);
  if (contexts.length === 0) return noteName(rootPc, preferFlats);

  const visible = contexts.slice(0, 3).map((context) => context.label);
  return visible.join(" / ");
}

function matchingDiatonicContexts(rootPc, pitchClasses, preferFlats) {
  const chordSize = pitchClasses.length <= 3 ? "triad" : "seventh";
  const exactContexts = [];

  KEY_OPTIONS.forEach((key) => {
    MODES.forEach((mode) => {
      const chords = buildDiatonicChords(key.pc, mode.id, chordSize);
      chords.forEach((chord) => {
        if (chord.rootPc === rootPc && samePitchClassSet(chord.pitchClasses, pitchClasses)) {
          exactContexts.push(contextRecord(key, mode));
        }
      });
    });
  });

  const contexts = exactContexts.length ? exactContexts : scaleContainmentContexts(rootPc, pitchClasses);
  return uniqueContexts(contexts).sort((a, b) => contextSort(a, b, rootPc));
}

function scaleContainmentContexts(rootPc, pitchClasses) {
  const contexts = [];
  KEY_OPTIONS.forEach((key) => {
    MODES.forEach((mode) => {
      const scale = scalePitchClasses(key.pc, mode.id);
      if (scale.includes(rootPc) && pitchClasses.every((notePc) => scale.includes(notePc))) {
        contexts.push(contextRecord(key, mode));
      }
    });
  });
  return contexts;
}

function contextRecord(key, mode) {
  return {
    keyPc: key.pc,
    modeId: mode.id,
    label: `${key.name} ${mode.shortName}`
  };
}

function uniqueContexts(contexts) {
  const seen = new Set();
  return contexts.filter((context) => {
    const key = `${context.keyPc}:${context.modeId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function contextSort(a, b, rootPc) {
  return contextScore(a, rootPc) - contextScore(b, rootPc) || a.label.localeCompare(b.label);
}

function contextScore(context, rootPc) {
  const modePriority = ["ionian", "aeolian", "dorian", "mixolydian", "lydian", "harmonic-minor", "melodic-minor", "phrygian", "locrian", "harmonic-major"];
  const currentBonus = context.keyPc === state.keyPc && context.modeId === state.modeId ? -100 : 0;
  const selectedKeyBonus = context.keyPc === state.keyPc ? -12 : 0;
  const chordTonicBonus = context.keyPc === rootPc ? -8 : 0;
  return currentBonus + selectedKeyBonus + chordTonicBonus + modePriority.indexOf(context.modeId);
}

function samePitchClassSet(a, b) {
  return a.length === b.length && a.every((notePc) => b.includes(notePc));
}

function setAnalysisView(view) {
  if (view === "guitar" && !state.guitarEnabled) return;
  state.analysisView = view;
  setGuitarTipOpen(false);
  renderAnalysisTabs();
}

function setGuitarTipOpen(open) {
  if (open) positionGuitarTip();
  dom.guitarTipButton.setAttribute("aria-expanded", String(open));
}

function positionGuitarTip() {
  const rect = dom.guitarTipButton.getBoundingClientRect();
  const bubble = dom.guitarTipBubble;
  const margin = 12;
  const top = rect.bottom + 8;
  const width = bubble.offsetWidth || Math.min(560, window.innerWidth - margin * 2);
  const preferredLeft = rect.right - width;
  const left = Math.min(Math.max(margin, preferredLeft), window.innerWidth - width - margin);

  bubble.style.setProperty("--tip-left", `${left}px`);
  bubble.style.setProperty("--tip-top", `${top}px`);
}

function renderAnalysisTabs() {
  if (!state.guitarEnabled && state.analysisView === "guitar") {
    state.analysisView = "tones";
  }

  const showGuitar = state.guitarEnabled && state.analysisView === "guitar";
  dom.analysisTabs.hidden = !state.guitarEnabled;
  dom.toneViewButton.classList.toggle("active", !showGuitar);
  dom.guitarViewButton.hidden = !state.guitarEnabled;
  dom.guitarViewButton.classList.toggle("active", showGuitar);
  dom.toneViewButton.setAttribute("aria-selected", String(!showGuitar));
  dom.guitarViewButton.setAttribute("aria-selected", String(showGuitar));
  dom.toneView.hidden = showGuitar;
  dom.guitarView.hidden = !showGuitar;
  dom.toneView.classList.toggle("active", !showGuitar);
  dom.guitarView.classList.toggle("active", showGuitar);
}

function renderDegrees(chords) {
  dom.degreeGrid.replaceChildren();

  chords.forEach((chord, index) => {
    const card = document.createElement("article");
    card.className = "degree-card";
    card.classList.toggle("active", index === state.selectedDegree);
    card.style.setProperty("--degree-color", chord.color);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "degree-main";
    button.addEventListener("click", () => {
      state.selectedDegree = index;
      state.pickedMidis.clear();
      render();
    });

    button.innerHTML = `
      <span class="roman">${chord.roman}</span>
      <strong class="chord-name">${chord.name}</strong>
      <span class="quality">${chord.quality}</span>
      <span class="notes">${chord.notes.join(" - ")}</span>
    `;

    const play = document.createElement("button");
    play.type = "button";
    play.className = "mini-play";
    play.textContent = t("play");
    play.addEventListener("click", (event) => {
      event.stopPropagation();
      playChord(chordMidiVoicing(chord, 4), { rootPc: chord.rootPc });
    });

    card.append(button, play);
    dom.degreeGrid.append(card);
  });

  scheduleFitDegreeNames();
}

function scheduleFitDegreeNames() {
  window.requestAnimationFrame(fitDegreeNames);
}

function fitDegreeNames() {
  dom.degreeGrid.querySelectorAll(".chord-name").forEach((name) => {
    name.style.removeProperty("font-size");
    const baseSize = Number.parseFloat(getComputedStyle(name).fontSize);
    const minSize = Math.max(15, baseSize * 0.62);
    let size = baseSize;

    while (name.scrollWidth > name.clientWidth && size > minSize) {
      size -= 1;
      name.style.fontSize = `${size}px`;
    }
  });
}

function renderAnalysis(activeChord, preferFlats) {
  const { values: picked, source } = activeInputMidis();
  const manual = identifyChord(picked, { preferFlats });

  if (picked.length === 0) {
    dom.manualNotes.textContent = t("currentDegree", { notes: activeChord.notes.join("  ") });
    dom.detectedName.classList.remove("unmatched");
    dom.detectedName.textContent = activeChord.name;
    dom.detectedFormula.textContent = `${activeChord.quality}｜${activeChord.intervals.map(intervalLabel).join("  ")}`;
    renderAliases(activeChord.aliases.map((symbol) => ({ symbol, quality: t("aliasLabel") })));
    renderToneMap(activeChord.rootPc, activeChord.pitchClasses, preferFlats, activeChord.notes);
    renderGuitarReference({
      name: activeChord.name,
      rootPc: activeChord.rootPc,
      pitchClasses: activeChord.pitchClasses,
      preferFlats
    });
    return;
  }

  dom.manualNotes.textContent = `${source}：${manual.displayNotes.join("  ")}`;

  if (manual.status === "exact") {
    dom.detectedName.classList.remove("unmatched");
    dom.detectedName.textContent = manual.primary.symbol;
    dom.detectedFormula.textContent = `${manual.primary.quality}｜${manual.primary.intervalLabels.join("  ")}`;
    renderAliases(manual.aliases);
    renderToneMap(manual.primary.rootPc, manual.pitchClasses, preferFlats);
    renderGuitarReference({
      name: manual.primary.symbol,
      rootPc: manual.primary.rootPc,
      pitchClasses: manual.pitchClasses,
      preferFlats
    });
    return;
  }

  dom.detectedName.classList.add("unmatched");
  dom.detectedName.textContent = t("unknownChord");
  dom.detectedFormula.textContent = t("keepAdding");
  renderAliases(manual.suggestions.map((suggestion) => ({
    symbol: suggestion.symbol,
    quality: suggestion.missing.length ? t("missing", { notes: suggestion.missing.join(" ") }) : suggestion.quality
  })));
  renderToneMap(null, manual.pitchClasses, preferFlats);
  renderGuitarReference(null);
}

function renderAliases(items) {
  dom.aliasList.replaceChildren();
  const list = items.length ? items : [{ symbol: t("noAliases"), quality: t("noCommonAliases") }];
  list.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "alias-chip";
    chip.innerHTML = `<strong>${item.symbol}</strong><small>${item.quality ?? ""}</small>`;
    dom.aliasList.append(chip);
  });
}

function renderToneMap(rootPc, pitchClasses, preferFlats, spellings = []) {
  dom.toneMap.replaceChildren();
  pitchClasses.forEach((notePc, index) => {
    const tone = document.createElement("div");
    tone.className = "tone-pill";
    tone.classList.toggle("root", rootPc === notePc);
    const interval = rootPc === null ? "" : intervalLabel(pc(notePc - rootPc));
    tone.innerHTML = `<strong>${spellings[index] ?? noteName(notePc, preferFlats)}</strong><span>${interval || t("selected")}</span>`;
    dom.toneMap.append(tone);
  });
}

function renderGuitarReference(context) {
  if (!state.guitarEnabled) return;

  dom.guitarVoicingList.replaceChildren();
  if (!context) {
    dom.guitarSummary.textContent = t("noGuitarVoicings");
    return;
  }

  const voicings = guitarVoicings({
    rootPc: context.rootPc,
    pitchClasses: context.pitchClasses,
    preferFlats: context.preferFlats,
    limit: 8
  });

  dom.guitarSummary.textContent = voicings.length
    ? t("guitarSummary", { name: context.name, count: String(voicings.length) })
    : t("noGuitarVoicings");

  voicings.forEach((voicing, index) => {
    const card = document.createElement("article");
    card.className = "guitar-card";

    const header = document.createElement("div");
    header.className = "guitar-card-header";
    const title = document.createElement("strong");
    title.textContent = `${context.name} · ${voicing.label}`;
    const meta = document.createElement("small");
    meta.textContent = voicing.rootInBass ? t("rootBass") : t("inversionShape");
    header.append(title, meta);

    const diagram = createGuitarDiagram(voicing, index);
    const notes = document.createElement("p");
    notes.className = "guitar-notes";
    notes.textContent = voicing.missingNotes.length
      ? t("omittedNotes", { notes: voicing.missingNotes.join(" ") })
      : t("allChordTones");

    card.append(header, diagram, notes);
    dom.guitarVoicingList.append(card);
  });
}

function createGuitarDiagram(voicing, index) {
  const diagram = document.createElement("div");
  diagram.className = "guitar-diagram";

  const status = document.createElement("div");
  status.className = "guitar-string-status";
  displayStringIndexes().forEach((stringIndex) => {
    const fret = voicing.frets[stringIndex];
    const item = document.createElement("span");
    item.textContent = fret === null ? "x" : fret === 0 ? "o" : "";
    item.title = STANDARD_GUITAR_TUNING[stringIndex].name;
    status.append(item);
  });

  const displayStart = guitarDisplayStart(voicing);
  const fretboard = document.createElement("div");
  fretboard.className = "guitar-fretboard";
  fretboard.classList.toggle("nut-position", displayStart === 1);
  fretboard.setAttribute("aria-label", `${voicing.label} ${voicing.frets.map((fret) => fret ?? "x").join(" ")}`);

  displayStringIndexes().forEach((stringIndex, displayIndex) => {
    const string = STANDARD_GUITAR_TUNING[stringIndex];
    const line = document.createElement("span");
    line.className = "guitar-string-line";
    line.style.setProperty("--string-top", `${((displayIndex + 0.5) / STANDARD_GUITAR_TUNING.length) * 100}%`);
    line.title = string.name;
    fretboard.append(line);
  });

  for (let fretIndex = 0; fretIndex <= 5; fretIndex += 1) {
    const line = document.createElement("span");
    line.className = "guitar-fret-line";
    line.style.setProperty("--fret-left", `${(fretIndex / 5) * 100}%`);
    fretboard.append(line);
  }

  voicing.frets.forEach((fret, stringIndex) => {
    if (!fret) return;
    const column = fret - displayStart + 1;
    if (column < 1 || column > 5) return;
    const marker = document.createElement("span");
    marker.className = "guitar-marker";
    marker.style.gridColumn = String(column);
    marker.style.gridRow = String(displayRowForString(stringIndex));
    marker.textContent = voicing.fingers[stringIndex] ?? "";
    fretboard.append(marker);
  });

  voicing.barres.forEach((barre) => {
    const column = barre.fret - displayStart + 1;
    if (column < 1 || column > 5) return;
    const rows = [displayRowForString(barre.fromString), displayRowForString(barre.toString)].sort((a, b) => a - b);
    const marker = document.createElement("span");
    marker.className = "guitar-barre";
    marker.style.gridColumn = String(column);
    marker.style.gridRow = `${rows[0]} / ${rows[1] + 1}`;
    marker.textContent = "1";
    fretboard.append(marker);
  });

  const position = document.createElement("span");
  position.className = "guitar-position";
  position.textContent = displayStart === 1 ? "" : `${displayStart}fr`;

  diagram.append(status, fretboard, position);
  return diagram;
}

function displayStringIndexes() {
  return STANDARD_GUITAR_TUNING.map((_, index) => index).reverse();
}

function displayRowForString(stringIndex) {
  return STANDARD_GUITAR_TUNING.length - stringIndex;
}

function guitarDisplayStart(voicing) {
  const fretted = voicing.frets.filter((fret) => fret > 0);
  if (fretted.length === 0 || Math.max(...fretted) <= 3) return 1;
  return voicing.position === 1 ? 1 : voicing.position;
}

function renderPiano() {
  dom.piano.replaceChildren();
  const whiteKeys = PIANO_KEYS.filter((key) => !key.isBlack);
  dom.piano.style.setProperty("--white-key-count", whiteKeys.length);

  let whiteIndex = 0;
  PIANO_KEYS.forEach((key) => {
    const keyButton = document.createElement("button");
    keyButton.type = "button";
    keyButton.className = key.isBlack ? "piano-key black" : "piano-key white";
    keyButton.dataset.midi = String(key.midi);
    keyButton.dataset.pc = String(key.pitchClass);
    keyButton.setAttribute("aria-label", noteNameWithOctave(key.midi));

    if (key.isBlack) {
      keyButton.style.left = `calc((var(--white-key-width) * ${whiteIndex}) - (var(--black-key-width) / 2))`;
    } else {
      keyButton.style.left = `calc(var(--white-key-width) * ${whiteIndex})`;
      whiteIndex += 1;
    }

    keyButton.innerHTML = `<span>${noteNameWithOctave(key.midi)}</span>`;
    keyButton.addEventListener("click", () => {
      if (state.pickedMidis.has(key.midi)) {
        state.pickedMidis.delete(key.midi);
      } else {
        state.pickedMidis.add(key.midi);
        playMidiNotes([key.midi], { duration: 0.72, spread: 0 });
      }
      render();
    });

    dom.piano.append(keyButton);
  });
}

function renderPianoState(activeChord, preferFlats) {
  const manualPcs = new Set([...state.pickedMidis].map(pc));
  const midiPcs = new Set([...state.midiActiveMidis].map(pc));
  const { values } = activeInputMidis();
  const detected = values.length ? identifyChord(values, { preferFlats }) : null;
  const activePcs = new Set(values.length ? values.map(pc) : activeChord.pitchClasses);
  const activeRoot = detected?.primary?.rootPc ?? activeChord.rootPc;

  dom.piano.querySelectorAll(".piano-key").forEach((button) => {
    const midi = Number(button.dataset.midi);
    const pitchClass = Number(button.dataset.pc);
    const isPickedMidi = state.pickedMidis.has(midi);
    const isPickedPc = manualPcs.has(pitchClass);
    const isMidiNote = state.midiActiveMidis.has(midi);
    const isMidiPc = midiPcs.has(pitchClass);
    const isChordTone = activePcs.has(pitchClass);

    button.classList.toggle("picked", isPickedMidi);
    button.classList.toggle("picked-octave", !isPickedMidi && isPickedPc);
    button.classList.toggle("midi", isMidiNote);
    button.classList.toggle("midi-octave", !isMidiNote && isMidiPc);
    button.classList.toggle("current-tone", isChordTone);
    button.classList.toggle("root-tone", pitchClass === activeRoot && isChordTone);
    button.querySelector("span").textContent = noteNameWithOctave(midi, preferFlats);
  });
}

function playActiveSound() {
  const { values: picked } = activeInputMidis();
  if (picked.length > 0) {
    const detected = identifyChord(picked, { preferFlats: scaleUsesFlats(state.keyPc, state.modeId) });
    playChord(picked, { rootPc: detected.primary?.rootPc });
    return;
  }

  const chord = buildDiatonicChords(state.keyPc, state.modeId, state.chordSize)[state.selectedDegree];
  playChord(centeredChordMidiVoicing(chord), { rootPc: chord.rootPc });
}

function playChord(midiNotes, options = {}) {
  playMidiNotes(midiNotes, { ...options, texture: state.texture });
}

function activeInputMidis() {
  if (state.midiActiveMidis.size > 0) {
    return {
      source: t("midiInputSource"),
      values: [...state.midiActiveMidis].sort((a, b) => a - b)
    };
  }

  if (state.pickedMidis.size > 0) {
    return {
      source: t("manualInput"),
      values: [...state.pickedMidis].sort((a, b) => a - b)
    };
  }

  return { source: "", values: [] };
}

async function enableMidi() {
  const support = currentMidiSupport();
  if (!support.available) {
    state.midiStatus = t("midiUnavailable");
    setMidiInputMessage(state.midiStatus);
    renderMidiControls();
    return;
  }

  try {
    state.midiStatus = t("requestingMidi");
    renderMidiControls();
    state.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    state.midiEnabled = true;
    state.midiAccess.onstatechange = refreshMidiInputs;
    refreshMidiInputs();
  } catch (error) {
    state.midiEnabled = false;
    state.midiStatus = t("midiPermissionDenied");
    setMidiInputMessage(state.midiStatus);
    renderMidiControls();
  }
}

function refreshMidiInputs() {
  if (!state.midiAccess) {
    setMidiInputMessage(state.midiStatus);
    renderMidiControls();
    return;
  }

  const inputs = [...state.midiAccess.inputs.values()].filter((input) => input.state !== "disconnected");
  dom.midiInputSelect.replaceChildren();

  if (inputs.length === 0) {
    disconnectMidiInput();
    state.midiStatus = t("noMidiInputs");
    setMidiInputMessage(state.midiStatus);
    renderMidiControls();
    render();
    return;
  }

  inputs.forEach((input) => {
    dom.midiInputSelect.append(new Option(midiInputLabel(input), input.id));
  });

  const preferredId = inputs.some((input) => input.id === state.selectedMidiInputId)
    ? state.selectedMidiInputId
    : inputs[0].id;

  connectMidiInput(preferredId);
}

function connectMidiInput(inputId) {
  if (!state.midiAccess) return;

  const input = [...state.midiAccess.inputs.values()].find((candidate) => {
    return candidate.id === inputId && candidate.state !== "disconnected";
  });
  if (!input) {
    refreshMidiInputs();
    return;
  }

  disconnectMidiInput();
  state.midiInput = input;
  state.selectedMidiInputId = input.id;
  state.midiInput.onmidimessage = handleMidiMessage;
  state.midiActiveMidis.clear();
  state.midiStatus = t("midiConnected", { name: midiInputLabel(input) });
  dom.midiInputSelect.value = input.id;
  render();
}

function disconnectMidiInput() {
  if (state.midiInput) {
    state.midiInput.onmidimessage = null;
  }
  state.midiInput = null;
  state.midiActiveMidis.clear();
}

function handleMidiMessage(event) {
  const message = parseMidiMessage(event.data);

  if (message.type === "noteon") {
    state.midiActiveMidis.add(message.note);
    render();
    return;
  }

  if (message.type === "noteoff") {
    state.midiActiveMidis.delete(message.note);
    render();
  }
}

function setMidiInputMessage(message) {
  dom.midiInputSelect.replaceChildren(new Option(message, ""));
  dom.midiInputSelect.value = "";
}

function renderMidiControls() {
  const support = currentMidiSupport();
  dom.midiEnable.disabled = !support.available;
  dom.midiInputSelect.disabled = !support.available || !state.midiEnabled || !state.midiInput;
  dom.midiEnable.textContent = support.available ? (state.midiEnabled ? t("midiEnabled") : t("enableMidi")) : t("midiUnavailable");
  if (!support.available && !state.midiEnabled) {
    state.midiStatus = t("midiUnavailable");
    setMidiInputMessage(state.midiStatus);
  }
  dom.midiEnable.title = state.midiStatus;
  dom.midiInputSelect.title = state.midiStatus;
}

function currentMidiSupport() {
  return describeMidiSupport({
    hasRequestMIDIAccess: "requestMIDIAccess" in navigator,
    isSecureContext: window.isSecureContext,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints
  });
}

function playProgression() {
  const chords = buildDiatonicChords(state.keyPc, state.modeId, state.chordSize);
  chords.forEach((chord, index) => {
    window.setTimeout(() => {
      state.selectedDegree = index;
      render();
      playChord(chordMidiVoicing(chord, 4), { duration: 1.25, spread: 0.012, rootPc: chord.rootPc });
    }, index * 760);
  });
}

init();
