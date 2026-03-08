"use client";
import { useRef, useEffect, useCallback } from "react";
import { createPlayer, updatePlayer, Player, getFacingTile, MapData } from "./player";
import { renderGame, SceneData } from "./renderer";
import { npcs, NPC, gameMap, MAP_WIDTH, MAP_HEIGHT, tileInteractions } from "./map";
import { casinoMap, CASINO_MAP_WIDTH, CASINO_MAP_HEIGHT, casinoNpcs, casinoTileInteractions } from "./casino-map";
import { TILE_INFO, TileType, TILE_SIZE } from "./tiles";

interface DialogueState {
  active: boolean;
  npc: NPC | null;
  line: number;
}

interface TileDialogueState {
  active: boolean;
  lines: string[];
  line: number;
}

interface GameScreenState {
  active: boolean;
  type: "coin_toss" | "price_prediction" | null;
}

interface IntroState {
  active: boolean;
  line: number;
  dismissed: boolean;
}

type Scene = "overworld" | "casino";

const INTRO_LINES = [
  "Welcome to Fortune Falls.",
  "A neon-lit casino town where fortunes are made... and lost.",
  "Two games of chance await you at the Golden Dragon Casino:",
  "Coin Toss — flip coins, double or nothing. Pure luck.",
  "Price Prediction — read the market, bet on direction. Pure skill.",
  "Start by playing the tables yourself. Earn coins. Learn the odds.",
  "Win enough and you'll unlock AI Agents — they play for you.",
  "Agents earn yield even while you sleep. Upgrade them. Specialize them.",
  "Your goal: build an autonomous casino empire.",
  "Talk to Merchant Kai nearby, then head SOUTH to the casino.",
  "Look for the neon lights and the torii gate. Good luck.",
];

const CASINO_INTRO_LINES = [
  "Welcome to the Golden Dragon Casino!",
  "This is where fortunes are won... and lost.",
  "TUTORIAL: Walk up and talk to Bartender Jin ahead.",
  "He'll explain how the games work and get you started.",
  "Use WASD to move. Press E near people to talk.",
  "When you're done, find the EXIT door to leave. Good luck!",
];

// Yuki's NPC name for matching
const YUKI_NAME = "Dealer Yuki";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Player>(createPlayer());
  const keysRef = useRef<Set<string>>(new Set());
  const dialogueRef = useRef<DialogueState>({ active: false, npc: null, line: 0 });
  const tileDialogueRef = useRef<TileDialogueState>({ active: false, lines: [], line: 0 });
  const gameScreenRef = useRef<GameScreenState>({ active: false, type: null });
  const introRef = useRef<IntroState>({ active: true, line: 0, dismissed: false });
  const lastTimeRef = useRef<number>(0);
  const sceneRef = useRef<Scene>("overworld");
  const casinoIntroRef = useRef<IntroState>({ active: false, line: 0, dismissed: false });
  // Store overworld position to restore when exiting casino
  const overworldPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const getActiveMap = useCallback((): { map: number[][]; width: number; height: number } => {
    if (sceneRef.current === "casino") {
      return { map: casinoMap, width: CASINO_MAP_WIDTH, height: CASINO_MAP_HEIGHT };
    }
    return { map: gameMap, width: MAP_WIDTH, height: MAP_HEIGHT };
  }, []);

  const getActiveNpcs = useCallback((): NPC[] => {
    return sceneRef.current === "casino" ? casinoNpcs : npcs;
  }, []);

  const getActiveInteractions = useCallback((): Record<number, string[]> => {
    return sceneRef.current === "casino" ? casinoTileInteractions : tileInteractions;
  }, []);

  const switchToCasino = useCallback(() => {
    // Save overworld position
    overworldPosRef.current = { x: playerRef.current.x, y: playerRef.current.y };
    // Move player to casino entrance (near exit door at col 29, row 35)
    playerRef.current.x = 29 * TILE_SIZE;
    playerRef.current.y = 35 * TILE_SIZE;
    playerRef.current.direction = "up";
    sceneRef.current = "casino";
    // Show casino intro tutorial
    casinoIntroRef.current = { active: true, line: 0, dismissed: false };
  }, []);

  const switchToOverworld = useCallback(() => {
    // Restore overworld position
    playerRef.current.x = overworldPosRef.current.x;
    playerRef.current.y = overworldPosRef.current.y;
    playerRef.current.direction = "down";
    sceneRef.current = "overworld";
  }, []);

  const tryInteract = useCallback(() => {
    // Handle intro first
    if (introRef.current.active) {
      introRef.current.line++;
      if (introRef.current.line >= INTRO_LINES.length) {
        introRef.current = { active: false, line: 0, dismissed: true };
      }
      return;
    }

    // Handle game screen dismiss
    if (gameScreenRef.current.active) {
      gameScreenRef.current = { active: false, type: null };
      return;
    }

    // Handle casino intro
    if (casinoIntroRef.current.active) {
      casinoIntroRef.current.line++;
      if (casinoIntroRef.current.line >= CASINO_INTRO_LINES.length) {
        casinoIntroRef.current = { active: false, line: 0, dismissed: true };
      }
      return;
    }

    const player = playerRef.current;

    if (dialogueRef.current.active && dialogueRef.current.npc) {
      dialogueRef.current.line++;
      if (dialogueRef.current.line >= dialogueRef.current.npc.dialogue.length) {
        const npcName = dialogueRef.current.npc.name;
        dialogueRef.current = { active: false, npc: null, line: 0 };
        // After Yuki's dialogue ends, enter casino
        if (npcName === YUKI_NAME && sceneRef.current === "overworld") {
          switchToCasino();
        }
        return;
      }
      return;
    }

    if (tileDialogueRef.current.active) {
      tileDialogueRef.current.line++;
      if (tileDialogueRef.current.line >= tileDialogueRef.current.lines.length) {
        tileDialogueRef.current = { active: false, lines: [], line: 0 };
      }
      return;
    }

    const activeNpcs = getActiveNpcs();
    for (const npc of activeNpcs) {
      const dist = Math.sqrt(
        Math.pow(player.x - npc.x, 2) + Math.pow(player.y - npc.y, 2)
      );
      if (dist < 60) {
        dialogueRef.current = { active: true, npc, line: 0 };
        return;
      }
    }

    const { map, width, height } = getActiveMap();
    const interactions = getActiveInteractions();
    const { tx, ty } = getFacingTile(player);
    if (ty >= 0 && ty < height && tx >= 0 && tx < width) {
      const tile = map[ty][tx];
      const info = TILE_INFO[tile as TileType];

      // Casino exit door — go back to overworld
      if (tile === TileType.CASINO_EXIT && sceneRef.current === "casino") {
        switchToOverworld();
        return;
      }

      // Casino table — open game screen
      if (tile === TileType.CASINO_TABLE && sceneRef.current === "casino") {
        // Left tables (cols 3-5) = coin toss, right tables (cols 55-57) = price prediction
        const isLeftSide = tx < 30;
        gameScreenRef.current = {
          active: true,
          type: isLeftSide ? "coin_toss" : "price_prediction",
        };
        return;
      }

      if (info?.interactable && interactions[tile]) {
        tileDialogueRef.current = { active: true, lines: interactions[tile], line: 0 };
      }
    }
  }, [getActiveNpcs, getActiveMap, getActiveInteractions, switchToCasino, switchToOverworld]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === "e" || e.key === "E" || e.key === "Enter" || e.key === " ") {
        tryInteract();
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    let animId: number;

    const gameLoop = (timestamp: number) => {
      const dt = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
      lastTimeRef.current = timestamp;

      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const { map, width, height } = getActiveMap();
      const mapData: MapData = { map, width, height };

      // Don't move during any dialogue/intro
      const blocked = introRef.current.active || casinoIntroRef.current.active || dialogueRef.current.active || tileDialogueRef.current.active || gameScreenRef.current.active;
      if (!blocked) {
        updatePlayer(playerRef.current, keysRef.current, dt, mapData);
      }

      ctx.imageSmoothingEnabled = false;

      const sceneData: SceneData = {
        map,
        mapWidth: width,
        mapHeight: height,
        npcs: getActiveNpcs(),
        scene: sceneRef.current,
      };

      renderGame(
        ctx,
        playerRef.current,
        w,
        h,
        dialogueRef.current,
        tileDialogueRef.current,
        introRef.current.active
          ? { line: introRef.current.line, lines: INTRO_LINES }
          : casinoIntroRef.current.active
            ? { line: casinoIntroRef.current.line, lines: CASINO_INTRO_LINES }
            : null,
        sceneData,
        gameScreenRef.current.active ? gameScreenRef.current.type : null,
      );

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [tryInteract, getActiveMap, getActiveNpcs]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "#0a0a0a",
        imageRendering: "pixelated",
        cursor: "default",
      }}
    />
  );
}
