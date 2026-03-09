// Background music manager for scene-based music
type SceneMusic = "overworld" | "casino";

const MUSIC_FILES: Record<SceneMusic, string> = {
  overworld: "/Village  D&D_TTRPG Ambience  1 Hour - Bardify.mp3",
  casino: "/DANGANRONPA OST 1-27 Climax Reasoning - sharaness.mp3",
};

const VOLUME = 0.35;
const FADE_MS = 800;

let currentScene: SceneMusic | null = null;
let audio: HTMLAudioElement | null = null;
let fadeInterval: ReturnType<typeof setInterval> | null = null;
let started = false;

function fadeOut(cb: () => void) {
  if (!audio) { cb(); return; }
  if (fadeInterval) clearInterval(fadeInterval);

  const step = audio.volume / (FADE_MS / 30);
  fadeInterval = setInterval(() => {
    if (!audio) { clearInterval(fadeInterval!); cb(); return; }
    audio.volume = Math.max(0, audio.volume - step);
    if (audio.volume <= 0) {
      clearInterval(fadeInterval!);
      fadeInterval = null;
      audio.pause();
      cb();
    }
  }, 30);
}

function playTrack(scene: SceneMusic) {
  if (audio) {
    audio.pause();
    audio = null;
  }
  const a = new Audio(MUSIC_FILES[scene]);
  a.loop = true;
  a.volume = VOLUME;
  a.play().catch(() => {
    // Autoplay blocked — will retry on next user interaction
  });
  audio = a;
  currentScene = scene;
}

export function setSceneMusic(scene: SceneMusic): void {
  if (scene === currentScene) return;

  if (!started) {
    // First play — no fade, just start
    started = true;
    playTrack(scene);
    return;
  }

  fadeOut(() => playTrack(scene));
}

// Call once on first user interaction to unlock autoplay
export function resumeMusicIfNeeded(): void {
  if (audio && audio.paused && currentScene) {
    audio.play().catch(() => {});
  }
}
