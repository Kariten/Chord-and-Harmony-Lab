import {
  KEY_OPTIONS,
  MODES,
  buildDiatonicChords,
  chordMidiVoicing,
  identifyChord,
  intervalLabel,
  keyByPc,
  modeById,
  noteName,
  noteNameWithOctave,
  pc,
  pianoKeys,
  scalePitchClasses
} from "./chordEngine.js";
import { playMidiNotes } from "./audio.js";
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
  midiStatus: ""
};

const dom = {
  keySelect: document.querySelector("#keySelect"),
  modeSelect: document.querySelector("#modeSelect"),
  languageSelect: document.querySelector("#languageSelect"),
  triadButton: document.querySelector("#triadButton"),
  seventhButton: document.querySelector("#seventhButton"),
  playProgression: document.querySelector("#playProgression"),
  clearSelection: document.querySelector("#clearSelection"),
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

  dom.languageSelect.addEventListener("change", () => {
    state.language = dom.languageSelect.value;
    localStorage.setItem("chordLabLanguage", state.language);
    applyStaticTranslations();
    renderModeOptions();
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
  window.addEventListener("resize", scheduleFitDegreeNames);

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

function render() {
  const key = keyByPc(state.keyPc);
  const mode = modeById(state.modeId);
  const chords = buildDiatonicChords(state.keyPc, state.modeId, state.chordSize);
  const activeChord = chords[state.selectedDegree];
  const scaleNotes = scalePitchClasses(state.keyPc, state.modeId).map((notePc) => noteName(notePc, key.preferFlats));

  dom.heroKey.textContent = `${key.name} ${modeLabel(state.language, mode, "short")}`;
  dom.heroChord.textContent = activeChord.name;
  dom.modeFormula.textContent = t("scale", { notes: scaleNotes.join("  ") });
  dom.triadButton.classList.toggle("active", state.chordSize === "triad");
  dom.seventhButton.classList.toggle("active", state.chordSize === "seventh");
  dom.keySelect.value = String(state.keyPc);
  dom.modeSelect.value = state.modeId;

  renderMidiControls();
  renderDegrees(chords);
  renderAnalysis(activeChord, key.preferFlats);
  renderPianoState(activeChord, key.preferFlats);
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
      playMidiNotes(chordMidiVoicing(chord, 4));
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
    dom.detectedName.textContent = activeChord.name;
    dom.detectedFormula.textContent = `${activeChord.quality}｜${activeChord.intervals.map(intervalLabel).join("  ")}`;
    renderAliases(activeChord.aliases.map((symbol) => ({ symbol, quality: t("aliasLabel") })));
    renderToneMap(activeChord.rootPc, activeChord.pitchClasses, preferFlats);
    return;
  }

  dom.manualNotes.textContent = `${source}：${manual.displayNotes.join("  ")}`;

  if (manual.status === "exact") {
    dom.detectedName.textContent = manual.primary.symbol;
    dom.detectedFormula.textContent = `${manual.primary.quality}｜${manual.primary.intervalLabels.join("  ")}`;
    renderAliases(manual.aliases);
    renderToneMap(manual.primary.rootPc, manual.pitchClasses, preferFlats);
    return;
  }

  dom.detectedName.textContent = t("unknownChord");
  dom.detectedFormula.textContent = t("keepAdding");
  renderAliases(manual.suggestions.map((suggestion) => ({
    symbol: suggestion.symbol,
    quality: suggestion.missing.length ? t("missing", { notes: suggestion.missing.join(" ") }) : suggestion.quality
  })));
  renderToneMap(null, manual.pitchClasses, preferFlats);
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

function renderToneMap(rootPc, pitchClasses, preferFlats) {
  dom.toneMap.replaceChildren();
  pitchClasses.forEach((notePc) => {
    const tone = document.createElement("div");
    tone.className = "tone-pill";
    tone.classList.toggle("root", rootPc === notePc);
    const interval = rootPc === null ? "" : intervalLabel(pc(notePc - rootPc));
    tone.innerHTML = `<strong>${noteName(notePc, preferFlats)}</strong><span>${interval || t("selected")}</span>`;
    dom.toneMap.append(tone);
  });
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
  const key = keyByPc(state.keyPc);
  const { values: picked } = activeInputMidis();
  if (picked.length > 0) {
    playMidiNotes(picked);
    return;
  }

  const chord = buildDiatonicChords(state.keyPc, state.modeId, state.chordSize)[state.selectedDegree];
  playMidiNotes(chordMidiVoicing(chord, key.preferFlats ? 3 : 4));
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
      playMidiNotes(chordMidiVoicing(chord, 4), { duration: 1.25, spread: 0.012 });
    }, index * 760);
  });
}

init();
