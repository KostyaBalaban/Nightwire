import { useCallback } from "react";
import { usePrefsStore } from "../store/prefs.store.js";

function synth(frequency, duration, volume = 0.12) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + duration / 1000
    );
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch {
    /* audio not available */
  }
}

export function useSound() {
  const soundOnMessage = usePrefsStore((s) => s.soundOnMessage);
  const soundOnSend    = usePrefsStore((s) => s.soundOnSend);

  const playPing = useCallback(() => {
    if (!soundOnMessage) return;
    synth(880, 110, 0.1);
    setTimeout(() => synth(1100, 80, 0.07), 120);
  }, [soundOnMessage]);

  const playSend = useCallback(() => {
    if (!soundOnSend) return;
    synth(660, 70, 0.07);
  }, [soundOnSend]);

  return { playPing, playSend };
}
