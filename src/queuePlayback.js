export function startQueuePlayback(items, options, clock = {}) {
  const now = clock.now ?? (() => performance.now());
  const setTimer = clock.setTimer ?? ((callback, delay) => setTimeout(callback, delay));
  const clearTimer = clock.clearTimer ?? ((timer) => clearTimeout(timer));
  const controller = new AbortController();
  const queue = items.map((item) => ({ ...item, midiNotes: [...item.midiNotes] }));
  const barMs = options.duration * 1000;
  let deadline = now();
  let index = 0;
  let timer;
  let stopped = false;

  function schedule(callback, time) {
    timer = setTimer(callback, Math.max(0, time - now()));
  }

  function finish() {
    if (stopped) return;
    stopped = true;
    options.onFinish();
  }

  function advance() {
    if (stopped) return;
    if (index === queue.length) {
      if (options.shouldLoop()) {
        index = 0;
      } else {
        const releaseMs = Math.max(0, (options.playbackEnd - options.duration) * 1000);
        schedule(finish, deadline + releaseMs);
        return;
      }
    }

    const item = queue[index];
    options.onChord(item, controller.signal);
    if (stopped) return;
    index += 1;
    // Anchor every chord and repeat to the original beat grid, including callback delays.
    deadline += barMs;
    schedule(advance, deadline);
  }

  if (queue.length) schedule(advance, deadline);
  else finish();

  return {
    stop() {
      stopped = true;
      clearTimer(timer);
      controller.abort();
    }
  };
}
