export function parseMidiMessage(data) {
  if (!data || data.length < 2) return { type: "unknown" };

  const status = data[0] & 0xf0;
  const channel = (data[0] & 0x0f) + 1;
  const note = data[1];
  const velocity = data.length > 2 ? data[2] : 0;

  if (!Number.isInteger(note) || note < 0 || note > 127) {
    return { type: "unknown", channel };
  }

  if (status === 0x90 && velocity > 0) {
    return { type: "noteon", channel, note, velocity };
  }

  if (status === 0x80 || (status === 0x90 && velocity === 0)) {
    return { type: "noteoff", channel, note, velocity };
  }

  return { type: "unknown", channel };
}

export function midiInputLabel(input) {
  const manufacturer = input.manufacturer?.trim();
  const name = input.name?.trim() || "MIDI Input";
  return manufacturer && !name.includes(manufacturer) ? `${manufacturer} ${name}` : name;
}

export function describeMidiSupport(environment) {
  const userAgent = environment.userAgent ?? "";
  const platform = environment.platform ?? "";
  const maxTouchPoints = environment.maxTouchPoints ?? 0;
  const isAppleMobile = /iPad|iPhone|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
  const isSafari = /Safari/.test(userAgent) && !/Chrome|Chromium|CriOS|FxiOS|Edg\//.test(userAgent);

  if (isAppleMobile && isSafari && !environment.hasRequestMIDIAccess) {
    return {
      available: false,
      reason: "iPad Safari 不支持 Web MIDI"
    };
  }

  if (isAppleMobile && !environment.hasRequestMIDIAccess) {
    return {
      available: false,
      reason: "iOS/iPadOS 浏览器不支持 Web MIDI"
    };
  }

  if (!environment.isSecureContext) {
    return {
      available: false,
      reason: "Web MIDI 需要 HTTPS 或 localhost"
    };
  }

  if (!environment.hasRequestMIDIAccess) {
    return {
      available: false,
      reason: "浏览器不支持 Web MIDI"
    };
  }

  return {
    available: true,
    reason: "Web MIDI 可用"
  };
}
