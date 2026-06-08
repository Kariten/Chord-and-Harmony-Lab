import assert from "node:assert/strict";
import test from "node:test";
import { describeMidiSupport, midiInputLabel, parseMidiMessage } from "../src/midi.js";

test("parses note on messages", () => {
  assert.deepEqual(parseMidiMessage([0x90, 60, 96]), {
    type: "noteon",
    channel: 1,
    note: 60,
    velocity: 96
  });
});

test("treats note on with zero velocity as note off", () => {
  assert.deepEqual(parseMidiMessage([0x92, 64, 0]), {
    type: "noteoff",
    channel: 3,
    note: 64,
    velocity: 0
  });
});

test("parses explicit note off messages", () => {
  assert.deepEqual(parseMidiMessage([0x8f, 72, 12]), {
    type: "noteoff",
    channel: 16,
    note: 72,
    velocity: 12
  });
});

test("labels MIDI inputs without repeating manufacturer", () => {
  assert.equal(midiInputLabel({ manufacturer: "Roland", name: "A-49" }), "Roland A-49");
  assert.equal(midiInputLabel({ manufacturer: "Arturia", name: "Arturia KeyLab" }), "Arturia KeyLab");
});

test("explains iPad Safari Web MIDI limitation", () => {
  const support = describeMidiSupport({
    hasRequestMIDIAccess: false,
    isSecureContext: true,
    platform: "MacIntel",
    maxTouchPoints: 5,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  });

  assert.equal(support.available, false);
  assert.equal(support.reason, "iPad Safari 不支持 Web MIDI");
});

test("explains secure-context requirement for Web MIDI", () => {
  const support = describeMidiSupport({
    hasRequestMIDIAccess: true,
    isSecureContext: false,
    platform: "Win32",
    maxTouchPoints: 0,
    userAgent: "Mozilla/5.0 Chrome/120 Safari/537.36"
  });

  assert.equal(support.available, false);
  assert.equal(support.reason, "Web MIDI 需要 HTTPS 或 localhost");
});
