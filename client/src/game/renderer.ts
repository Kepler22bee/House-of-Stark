import { TILE_SIZE, drawTile } from "./tiles";
import { gameMap, MAP_WIDTH, MAP_HEIGHT, npcs, NPC } from "./map";
import { Player, drawPlayer, MapData } from "./player";

export interface SceneData {
  map: number[][];
  mapWidth: number;
  mapHeight: number;
  npcs: NPC[];
  scene: "overworld" | "casino";
}

export function getCamera(player: Player, canvasW: number, canvasH: number, mapWidth: number, mapHeight: number) {
  let camX = player.x + TILE_SIZE / 2 - canvasW / 2;
  let camY = player.y + TILE_SIZE / 2 - canvasH / 2;

  const mapPxW = mapWidth * TILE_SIZE;
  const mapPxH = mapHeight * TILE_SIZE;
  camX = Math.max(0, Math.min(camX, mapPxW - canvasW));
  camY = Math.max(0, Math.min(camY, mapPxH - canvasH));

  return { camX, camY };
}

export interface IntroOverlay {
  line: number;
  lines: string[];
}

export function renderGame(
  ctx: CanvasRenderingContext2D,
  player: Player,
  canvasW: number,
  canvasH: number,
  dialogueState: { active: boolean; npc: NPC | null; line: number } | null,
  tileDialogue: { active: boolean; lines: string[]; line: number } | null,
  introOverlay: IntroOverlay | null = null,
  sceneData?: SceneData,
  gameScreen?: "coin_toss" | "price_prediction" | null,
) {
  const activeMap = sceneData?.map ?? gameMap;
  const activeW = sceneData?.mapWidth ?? MAP_WIDTH;
  const activeH = sceneData?.mapHeight ?? MAP_HEIGHT;
  const activeNpcs = sceneData?.npcs ?? npcs;
  const scene = sceneData?.scene ?? "overworld";

  const { camX, camY } = getCamera(player, canvasW, canvasH, activeW, activeH);

  // Clear
  ctx.fillStyle = scene === "casino" ? "#0a0812" : "#1a3a2a";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Calculate visible tile range
  const startTX = Math.max(0, Math.floor(camX / TILE_SIZE) - 1);
  const startTY = Math.max(0, Math.floor(camY / TILE_SIZE) - 1);
  const endTX = Math.min(activeW, Math.ceil((camX + canvasW) / TILE_SIZE) + 1);
  const endTY = Math.min(activeH, Math.ceil((camY + canvasH) / TILE_SIZE) + 1);

  ctx.save();
  ctx.translate(-Math.round(camX), -Math.round(camY));

  // Draw tiles
  for (let ty = startTY; ty < endTY; ty++) {
    for (let tx = startTX; tx < endTX; tx++) {
      if (activeMap[ty] && activeMap[ty][tx] !== undefined) {
        drawTile(ctx, activeMap[ty][tx], tx, ty);
      }
    }
  }

  // Draw casino sign text on the marquee (only in overworld)
  if (scene === "overworld") {
    drawCasinoSign(ctx);
  }

  // Draw scene label inside casino
  if (scene === "casino") {
    drawCasinoInteriorLabel(ctx);
  }

  // Draw NPCs
  for (const npc of activeNpcs) {
    drawNPC(ctx, npc, player);
  }

  // Draw player
  drawPlayer(ctx, player, 0, 0);

  ctx.restore();

  // Draw UI overlay
  drawUI(ctx, canvasW, canvasH, player, dialogueState, tileDialogue, introOverlay, activeMap, activeW, activeH, activeNpcs);

  // Draw game screen overlay
  if (gameScreen) {
    drawGameScreen(ctx, canvasW, canvasH, gameScreen);
  }
}

function drawGameScreen(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  gameType: "coin_toss" | "price_prediction",
) {
  // Dim background
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Center black panel
  const panelW = Math.min(700, canvasW - 80);
  const panelH = Math.min(450, canvasH - 80);
  const panelX = (canvasW - panelW) / 2;
  const panelY = (canvasH - panelH) / 2;

  // Panel shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.beginPath();
  ctx.roundRect(panelX + 6, panelY + 6, panelW, panelH, 12);
  ctx.fill();

  // Panel background
  ctx.fillStyle = "#0a0a14";
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.fill();

  // Gold border
  ctx.strokeStyle = "#fdd835";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.stroke();

  // Inner border
  ctx.strokeStyle = "rgba(253, 216, 53, 0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(panelX + 8, panelY + 8, panelW - 16, panelH - 16, 8);
  ctx.stroke();

  // Title
  const isCoinToss = gameType === "coin_toss";
  const title = isCoinToss ? "COIN TOSS" : "PRICE PREDICTION";
  const icon = isCoinToss ? "🪙" : "📈";
  const accentColor = isCoinToss ? "#fdd835" : "#00d2ff";

  ctx.font = "bold 28px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = accentColor;
  ctx.fillText(title, canvasW / 2, panelY + 50);

  // Icon
  ctx.font = "48px Arial";
  ctx.fillText(icon, canvasW / 2, panelY + 120);

  // Subtitle
  ctx.font = "16px 'Courier New', monospace";
  ctx.fillStyle = "#8a8a8a";
  const subtitle = isCoinToss
    ? "Call heads or tails. Double or nothing."
    : "Read the chart. Bet on the next move.";
  ctx.fillText(subtitle, canvasW / 2, panelY + 160);

  // "Coming Soon" text
  ctx.font = "bold 20px 'Courier New', monospace";
  ctx.fillStyle = "#555";
  ctx.fillText("— COMING SOON —", canvasW / 2, panelY + panelH / 2 + 30);

  // Decorative line
  ctx.fillStyle = "rgba(253, 216, 53, 0.15)";
  ctx.fillRect(panelX + 40, panelY + panelH / 2 + 50, panelW - 80, 1);

  // Dismiss hint
  ctx.font = "12px 'Courier New', monospace";
  ctx.fillStyle = "rgba(253, 216, 53, 0.7)";
  const blink = Math.sin(Date.now() / 300) > 0;
  if (blink) {
    ctx.fillText("Press E to close", canvasW / 2, panelY + panelH - 24);
  }
}

function drawCasinoSign(ctx: CanvasRenderingContext2D) {
  // Marquee is at row 28, columns 13-24
  const signX = 13 * TILE_SIZE;
  const signY = 28 * TILE_SIZE;
  const signW = 12 * TILE_SIZE;

  const glow = Math.sin(Date.now() / 400) * 0.2 + 0.8;
  ctx.save();
  ctx.font = "bold 22px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Glow layers
  ctx.fillStyle = `rgba(255, 107, 53, ${glow * 0.3})`;
  ctx.fillText("GOLDEN DRAGON", signX + signW / 2, signY + 12);
  ctx.fillStyle = `rgba(253, 216, 53, ${glow})`;
  ctx.fillText("GOLDEN DRAGON", signX + signW / 2, signY + 12);

  // Subtitle
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.fillStyle = `rgba(200, 230, 255, ${glow * 0.9})`;
  ctx.fillText("CASINO", signX + signW / 2, signY + 26);

  ctx.restore();
}

function drawCasinoInteriorLabel(ctx: CanvasRenderingContext2D) {
  // Neon sign inside the casino — "GOLDEN DRAGON" on the back wall
  const signX = 4 * TILE_SIZE;
  const signY = 0 * TILE_SIZE;
  const signW = 12 * TILE_SIZE;

  const glow = Math.sin(Date.now() / 400) * 0.2 + 0.8;
  ctx.save();
  ctx.font = "bold 18px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = `rgba(233, 69, 96, ${glow * 0.3})`;
  ctx.fillText("GOLDEN DRAGON CASINO", signX + signW / 2, signY + 16);
  ctx.fillStyle = `rgba(253, 216, 53, ${glow})`;
  ctx.fillText("GOLDEN DRAGON CASINO", signX + signW / 2, signY + 16);

  ctx.restore();
}

function drawNPC(ctx: CanvasRenderingContext2D, npc: NPC, player: Player) {
  const px = Math.round(npc.x);
  const py = Math.round(npc.y);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 30, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = npc.color;
  ctx.fillRect(px + 6, py + 12, 20, 14);

  // Head
  ctx.fillStyle = "#ffcc99";
  ctx.fillRect(px + 8, py + 2, 16, 12);

  // Hair
  ctx.fillStyle = npc.hairColor;
  ctx.fillRect(px + 6, py + 0, 20, 6);

  // Eyes
  ctx.fillStyle = "#2d1b4e";
  ctx.fillRect(px + 10, py + 7, 3, 3);
  ctx.fillRect(px + 19, py + 7, 3, 3);

  // Legs
  ctx.fillStyle = "#4a3728";
  ctx.fillRect(px + 8, py + 24, 6, 8);
  ctx.fillRect(px + 18, py + 24, 6, 8);

  // Icon above head
  if (npc.icon) {
    const dist = Math.sqrt(
      Math.pow(player.x - npc.x, 2) + Math.pow(player.y - npc.y, 2)
    );
    if (dist < 150) {
      const bob = Math.sin(Date.now() / 400) * 3;
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.fillText(npc.icon, px + 16, py - 6 + bob);
    }
  }

  // Name tag when close
  const dist = Math.sqrt(
    Math.pow(player.x - npc.x, 2) + Math.pow(player.y - npc.y, 2)
  );
  if (dist < 80) {
    ctx.font = "bold 10px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(px + 16 - ctx.measureText(npc.name).width / 2 - 4, py - 18, ctx.measureText(npc.name).width + 8, 14);
    ctx.fillStyle = "#fff";
    ctx.fillText(npc.name, px + 16, py - 8);

    // E to interact hint
    ctx.font = "8px 'Courier New', monospace";
    ctx.fillStyle = "rgba(253,216,53,0.9)";
    ctx.fillText("[E] Talk", px + 16, py + 42);
  }
}

function drawUI(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  player: Player,
  dialogueState: { active: boolean; npc: NPC | null; line: number } | null,
  tileDialogue: { active: boolean; lines: string[]; line: number } | null,
  introOverlay: IntroOverlay | null = null,
  activeMap: number[][] = gameMap,
  activeW: number = MAP_WIDTH,
  activeH: number = MAP_HEIGHT,
  activeNpcs: NPC[] = npcs,
) {
  // Minimap
  const mmSize = 120;
  const mmX = canvasW - mmSize - 10;
  const mmY = 10;
  const mmScale = mmSize / Math.max(activeW, activeH);

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(mmX - 2, mmY - 2, mmSize + 4, mmSize * (activeH / activeW) + 4);

  for (let ty = 0; ty < activeH; ty++) {
    for (let tx = 0; tx < activeW; tx++) {
      const tile = activeMap[ty][tx];
      let color = "#5a8f3c";
      if (tile === 1) color = "#d4a574";
      else if (tile === 2 || tile === 22) color = "#3498db";
      else if (tile === 3 || tile === 4) color = "#2e7d32";
      else if (tile >= 5 && tile <= 7 || tile === 16 || tile === 17 || tile === 18) color = "#8d6e63";
      else if (tile === 8) color = "#a1887f";
      else if (tile === 11) color = "#f1c40f";
      else if (tile === 15) color = "#f0d9a0";

      ctx.fillStyle = color;
      ctx.fillRect(mmX + tx * mmScale, mmY + ty * mmScale, mmScale + 0.5, mmScale + 0.5);
    }
  }

  // Player dot on minimap
  const playerMmX = mmX + (player.x / TILE_SIZE) * mmScale;
  const playerMmY = mmY + (player.y / TILE_SIZE) * mmScale;
  ctx.fillStyle = "#fdd835";
  ctx.fillRect(playerMmX - 2, playerMmY - 2, 4, 4);
  // Pulse
  ctx.strokeStyle = "rgba(253,216,53,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(playerMmX, playerMmY, 4 + Math.sin(Date.now() / 300) * 2, 0, Math.PI * 2);
  ctx.stroke();

  // NPC dots on minimap
  for (const npc of activeNpcs) {
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(mmX + (npc.x / TILE_SIZE) * mmScale - 1, mmY + (npc.y / TILE_SIZE) * mmScale - 1, 3, 3);
  }

  // Dialogue box
  const activeDialogue = dialogueState?.active ? dialogueState : null;
  const activeTileDialogue = tileDialogue?.active ? tileDialogue : null;

  if (activeDialogue && activeDialogue.npc) {
    drawDialogueBox(ctx, canvasW, canvasH, activeDialogue.npc.name, activeDialogue.npc.dialogue[activeDialogue.line]);
  } else if (activeTileDialogue) {
    drawDialogueBox(ctx, canvasW, canvasH, "Notice", activeTileDialogue.lines[activeTileDialogue.line]);
  }

  // Controls overlay (top left) — hide during intro
  if (!introOverlay) {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(10, 10, 160, 28);
    ctx.font = "11px 'Courier New', monospace";
    ctx.fillStyle = "#8ecae6";
    ctx.textAlign = "left";
    ctx.fillText("WASD: Move  E: Interact", 18, 28);
  }

  // Intro overlay
  if (introOverlay) {
    drawIntroOverlay(ctx, canvasW, canvasH, introOverlay);
  }
}

function drawIntroOverlay(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  intro: IntroOverlay,
) {
  // Dim background
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Center box
  const boxW = Math.min(600, canvasW - 60);
  const boxH = 260;
  const boxX = (canvasW - boxW) / 2;
  const boxY = (canvasH - boxH) / 2;
  const r = 12;

  // Box shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.beginPath();
  ctx.roundRect(boxX + 4, boxY + 4, boxW, boxH, r);
  ctx.fill();

  // Box background
  ctx.fillStyle = "rgba(8, 8, 28, 0.95)";
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, r);
  ctx.fill();

  // Gold border
  ctx.strokeStyle = "#fdd835";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, r);
  ctx.stroke();

  // Inner border
  ctx.strokeStyle = "rgba(253, 216, 53, 0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(boxX + 6, boxY + 6, boxW - 12, boxH - 12, r - 2);
  ctx.stroke();

  // Title
  ctx.font = "bold 18px 'Courier New', monospace";
  ctx.fillStyle = "#fdd835";
  ctx.textAlign = "center";
  ctx.fillText("FORTUNE FALLS", canvasW / 2, boxY + 36);

  // Subtitle line
  ctx.fillStyle = "rgba(253, 216, 53, 0.3)";
  ctx.fillRect(boxX + 40, boxY + 46, boxW - 80, 1);

  // Dice icon
  ctx.font = "28px Arial";
  ctx.fillText("🎰", canvasW / 2, boxY + 78);

  // Current line text
  const text = intro.lines[intro.line];
  ctx.font = "14px 'Courier New', monospace";
  ctx.fillStyle = "#e0e0e0";
  ctx.textAlign = "center";

  // Word wrap
  const maxLineW = boxW - 60;
  const words = text.split(" ");
  const wrappedLines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const test = currentLine ? currentLine + " " + word : word;
    if (ctx.measureText(test).width > maxLineW) {
      wrappedLines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) wrappedLines.push(currentLine);

  const textY = boxY + 110;
  for (let i = 0; i < wrappedLines.length; i++) {
    ctx.fillText(wrappedLines[i], canvasW / 2, textY + i * 22);
  }

  // Progress dots
  const dotY = boxY + boxH - 50;
  const totalDots = intro.lines.length;
  const dotSpacing = 12;
  const dotsStartX = canvasW / 2 - ((totalDots - 1) * dotSpacing) / 2;
  for (let i = 0; i < totalDots; i++) {
    ctx.beginPath();
    ctx.arc(dotsStartX + i * dotSpacing, dotY, i === intro.line ? 4 : 2, 0, Math.PI * 2);
    ctx.fillStyle = i === intro.line ? "#fdd835" : i < intro.line ? "rgba(253,216,53,0.5)" : "rgba(255,255,255,0.2)";
    ctx.fill();
  }

  // Continue hint
  ctx.font = "11px 'Courier New', monospace";
  ctx.fillStyle = "rgba(253,216,53,0.7)";
  ctx.textAlign = "center";
  const blink = Math.sin(Date.now() / 300) > 0;
  if (blink) {
    ctx.fillText(`Press E to continue (${intro.line + 1}/${totalDots})`, canvasW / 2, boxY + boxH - 16);
  }
}

function drawDialogueBox(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  name: string,
  text: string,
) {
  const boxH = 100;
  const boxW = canvasW - 40;
  const boxX = 20;
  const boxY = canvasH - boxH - 20;

  // Box background
  ctx.fillStyle = "rgba(10, 10, 30, 0.92)";
  ctx.strokeStyle = "#fdd835";
  ctx.lineWidth = 2;

  // Rounded rect
  const r = 8;
  ctx.beginPath();
  ctx.moveTo(boxX + r, boxY);
  ctx.lineTo(boxX + boxW - r, boxY);
  ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
  ctx.lineTo(boxX + boxW, boxY + boxH - r);
  ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
  ctx.lineTo(boxX + r, boxY + boxH);
  ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
  ctx.lineTo(boxX, boxY + r);
  ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Name tag
  ctx.font = "bold 14px 'Courier New', monospace";
  ctx.fillStyle = "#fdd835";
  ctx.textAlign = "left";
  ctx.fillText(name, boxX + 16, boxY + 24);

  // Dialogue text
  ctx.font = "13px 'Courier New', monospace";
  ctx.fillStyle = "#e0e0e0";
  ctx.fillText(text, boxX + 16, boxY + 50);

  // Continue hint
  ctx.font = "10px 'Courier New', monospace";
  ctx.fillStyle = "rgba(253,216,53,0.7)";
  ctx.textAlign = "right";
  const blink = Math.sin(Date.now() / 300) > 0;
  if (blink) {
    ctx.fillText("Press E to continue ▶", boxX + boxW - 16, boxY + boxH - 12);
  }
}
