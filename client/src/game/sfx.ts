// Sound effects
const SFX_FILES = {
  npcGreet: { src: "/hi roblox sound effect - TheSoundMachine.mp3", startAt: 3 },
} as const;

type SfxKey = keyof typeof SFX_FILES;

const cache = new Map<string, HTMLAudioElement>();

export function playSfx(key: SfxKey, volume = 0.5): void {
  const entry = SFX_FILES[key];
  // Clone from cache or create new
  let base = cache.get(entry.src);
  if (!base) {
    base = new Audio(entry.src);
    cache.set(entry.src, base);
  }
  const sfx = base.cloneNode() as HTMLAudioElement;
  sfx.volume = volume;
  sfx.currentTime = entry.startAt;
  sfx.play().catch(() => {});
}

// Looping running sound
const RUN_SRC = "/Running sound effect - Lauren M.mp3";
const RUN_VOLUME = 0.3;
let runAudio: HTMLAudioElement | null = null;
let runPlaying = false;

export function setRunning(moving: boolean): void {
  if (moving && !runPlaying) {
    if (!runAudio) {
      runAudio = new Audio(RUN_SRC);
      runAudio.loop = true;
      runAudio.volume = RUN_VOLUME;
    }
    runAudio.play().catch(() => {});
    runPlaying = true;
  } else if (!moving && runPlaying) {
    if (runAudio) {
      runAudio.pause();
      runAudio.currentTime = 0;
    }
    runPlaying = false;
  }
}
