import { TILE_SIZE, TILE_INFO, TileType, drawTile } from "./tiles";
import { gameMap, MAP_WIDTH, MAP_HEIGHT, npcs, NPC } from "./map";
import { Player, drawPlayer, MapData, getFacingTile } from "./player";
import { AgentMenuState, AgentData, MOCK_AGENTS, SHOP_POWERS, playerMoney } from "./GameCanvas";

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
  agentMenu?: AgentMenuState | null,
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

  // Draw agent menu overlay
  if (agentMenu) {
    drawAgentMenu(ctx, canvasW, canvasH, agentMenu);
  }
}

function drawGameScreen(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  gameType: "coin_toss" | "price_prediction",
) {
  // Dim background
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Panel
  const panelW = Math.min(700, canvasW - 80);
  const panelH = Math.min(450, canvasH - 80);
  const panelX = (canvasW - panelW) / 2;
  const panelY = (canvasH - panelH) / 2;
  const r = 12;

  // Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.roundRect(panelX + 4, panelY + 4, panelW, panelH, r);
  ctx.fill();

  // Background — warm cream
  ctx.fillStyle = "#c8bfa0";
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, r);
  ctx.fill();

  // Dark border
  ctx.strokeStyle = "#5a5040";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, r);
  ctx.stroke();

  // Inner highlight
  ctx.strokeStyle = "#ddd4b8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(panelX + 4, panelY + 4, panelW - 8, panelH - 8, r - 2);
  ctx.stroke();

  // Title
  const isCoinToss = gameType === "coin_toss";
  const title = isCoinToss ? "COIN TOSS" : "PRICE PREDICTION";
  const icon = isCoinToss ? "🪙" : "📈";

  ctx.font = "bold 28px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#3a3020";
  ctx.fillText(title, canvasW / 2, panelY + 50);

  // Decorative line under title
  ctx.fillStyle = "#a89878";
  ctx.fillRect(panelX + 60, panelY + 60, panelW - 120, 2);

  // Icon
  ctx.font = "48px Arial";
  ctx.fillText(icon, canvasW / 2, panelY + 120);

  // Subtitle — inner cream panel
  const subPanelX = panelX + 40;
  const subPanelY = panelY + 140;
  const subPanelW = panelW - 80;
  const subPanelH = 50;
  ctx.fillStyle = "#ede6d0";
  ctx.beginPath();
  ctx.roundRect(subPanelX, subPanelY, subPanelW, subPanelH, 6);
  ctx.fill();
  ctx.strokeStyle = "#a89878";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(subPanelX, subPanelY, subPanelW, subPanelH, 6);
  ctx.stroke();

  ctx.font = "15px 'Courier New', monospace";
  ctx.fillStyle = "#5a5040";
  const subtitle = isCoinToss
    ? "Call heads or tails. Double or nothing."
    : "Read the chart. Bet on the next move.";
  ctx.fillText(subtitle, canvasW / 2, subPanelY + 30);

  // "Coming Soon" text
  ctx.font = "bold 20px 'Courier New', monospace";
  ctx.fillStyle = "#8a7a50";
  ctx.fillText("— COMING SOON —", canvasW / 2, panelY + panelH / 2 + 40);

  // Decorative line
  ctx.fillStyle = "#a89878";
  ctx.fillRect(panelX + 60, panelY + panelH / 2 + 56, panelW - 120, 2);

  // Dismiss hint
  ctx.font = "12px 'Courier New', monospace";
  ctx.fillStyle = "#6a6050";
  const blink = Math.sin(Date.now() / 400) > 0;
  if (blink) {
    ctx.fillText("Press E to close", canvasW / 2, panelY + panelH - 20);
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

  // Proximity prompt for interactable tiles
  if (!introOverlay && !activeDialogue && !activeTileDialogue) {
    const facing = getFacingTile(player);
    if (facing.ty >= 0 && facing.ty < activeH && facing.tx >= 0 && facing.tx < activeW) {
      const facingTile = activeMap[facing.ty][facing.tx];
      const info = TILE_INFO[facingTile as TileType];
      if (info?.interactable && info.label) {
        const promptText = `[E] ${info.label}`;
        ctx.font = "bold 22px 'Courier New', monospace";
        const tw = ctx.measureText(promptText).width + 36;
        const px = (canvasW - tw) / 2;
        const py = canvasH - 90;
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.beginPath();
        ctx.roundRect(px, py, tw, 44, 10);
        ctx.fill();
        ctx.strokeStyle = "#fdd835";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(px, py, tw, 44, 10);
        ctx.stroke();
        ctx.fillStyle = "#fdd835";
        ctx.textAlign = "center";
        ctx.fillText(promptText, canvasW / 2, py + 30);
      }
    }
    // NPC proximity prompt
    for (const npc of activeNpcs) {
      const dist = Math.sqrt(
        Math.pow(player.x - npc.x, 2) + Math.pow(player.y - npc.y, 2)
      );
      if (dist < 60) {
        const promptText = `[E] Talk to ${npc.name}`;
        ctx.font = "bold 22px 'Courier New', monospace";
        const tw = ctx.measureText(promptText).width + 36;
        const px = (canvasW - tw) / 2;
        const py = canvasH - 90;
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.beginPath();
        ctx.roundRect(px, py, tw, 44, 10);
        ctx.fill();
        ctx.strokeStyle = "#fdd835";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(px, py, tw, 44, 10);
        ctx.stroke();
        ctx.fillStyle = "#fdd835";
        ctx.textAlign = "center";
        ctx.fillText(promptText, canvasW / 2, py + 30);
        break;
      }
    }
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
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.roundRect(boxX + 4, boxY + 4, boxW, boxH, r);
  ctx.fill();

  // Box background — warm cream
  ctx.fillStyle = "#c8bfa0";
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, r);
  ctx.fill();

  // Dark border
  ctx.strokeStyle = "#5a5040";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, r);
  ctx.stroke();

  // Inner highlight border
  ctx.strokeStyle = "#ddd4b8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(boxX + 4, boxY + 4, boxW - 8, boxH - 8, r - 2);
  ctx.stroke();

  // Title
  ctx.font = "bold 18px 'Courier New', monospace";
  ctx.fillStyle = "#3a3020";
  ctx.textAlign = "center";
  ctx.fillText("FORTUNE FALLS", canvasW / 2, boxY + 36);

  // Subtitle line
  ctx.fillStyle = "#a89878";
  ctx.fillRect(boxX + 40, boxY + 46, boxW - 80, 2);

  // Dice icon
  ctx.font = "28px Arial";
  ctx.fillText("🎰", canvasW / 2, boxY + 78);

  // Current line text — inner cream panel
  const textPadX = 30;
  const textPanelY = boxY + 88;
  const textPanelH = boxH - 140;
  ctx.fillStyle = "#ede6d0";
  ctx.beginPath();
  ctx.roundRect(boxX + textPadX, textPanelY, boxW - textPadX * 2, textPanelH, 6);
  ctx.fill();
  ctx.strokeStyle = "#a89878";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(boxX + textPadX, textPanelY, boxW - textPadX * 2, textPanelH, 6);
  ctx.stroke();

  const text = intro.lines[intro.line];
  ctx.font = "bold 20px 'Courier New', monospace";
  ctx.fillStyle = "#3a3020";
  ctx.textAlign = "center";

  // Word wrap
  const maxLineW = boxW - 80;
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

  const totalTextH = wrappedLines.length * 28;
  const textStartY = textPanelY + (textPanelH - totalTextH) / 2 + 18;
  for (let i = 0; i < wrappedLines.length; i++) {
    ctx.fillText(wrappedLines[i], canvasW / 2, textStartY + i * 28);
  }

  // Progress dots
  const dotY = boxY + boxH - 46;
  const totalDots = intro.lines.length;
  const dotSpacing = 12;
  const dotsStartX = canvasW / 2 - ((totalDots - 1) * dotSpacing) / 2;
  for (let i = 0; i < totalDots; i++) {
    ctx.beginPath();
    ctx.arc(dotsStartX + i * dotSpacing, dotY, i === intro.line ? 4 : 2, 0, Math.PI * 2);
    ctx.fillStyle = i === intro.line ? "#5a4820" : i < intro.line ? "#8a7a50" : "#b0a888";
    ctx.fill();
  }

  // Continue hint
  ctx.font = "11px 'Courier New', monospace";
  ctx.fillStyle = "#6a6050";
  ctx.textAlign = "center";
  const blink = Math.sin(Date.now() / 400) > 0;
  if (blink) {
    ctx.fillText(`Press E to continue (${intro.line + 1}/${totalDots})`, canvasW / 2, boxY + boxH - 14);
  }
}

function drawDialogueBox(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  name: string,
  text: string,
) {
  const boxH = 110;
  const boxW = canvasW - 40;
  const boxX = 20;
  const boxY = canvasH - boxH - 20;
  const r = 10;

  // Box shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.roundRect(boxX + 3, boxY + 3, boxW, boxH, r);
  ctx.fill();

  // Box background — warm cream
  ctx.fillStyle = "#c8bfa0";
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, r);
  ctx.fill();

  // Dark border
  ctx.strokeStyle = "#5a5040";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, r);
  ctx.stroke();

  // Inner highlight
  ctx.strokeStyle = "#ddd4b8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(boxX + 4, boxY + 4, boxW - 8, boxH - 8, r - 2);
  ctx.stroke();

  // Name tag — in a small raised tab
  const nameW = ctx.measureText(name).width + 24;
  ctx.font = "bold 14px 'Courier New', monospace";
  const nameTagW = Math.max(nameW, 100);
  ctx.fillStyle = "#b8a880";
  ctx.beginPath();
  ctx.roundRect(boxX + 12, boxY + 8, nameTagW, 24, 4);
  ctx.fill();
  ctx.strokeStyle = "#9a9080";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(boxX + 12, boxY + 8, nameTagW, 24, 4);
  ctx.stroke();
  ctx.fillStyle = "#3a3020";
  ctx.textAlign = "left";
  ctx.fillText(name, boxX + 22, boxY + 25);

  // Dialogue text — inner cream panel
  const textBoxX = boxX + 12;
  const textBoxY = boxY + 38;
  const textBoxW = boxW - 24;
  const textBoxH = boxH - 54;
  ctx.fillStyle = "#ede6d0";
  ctx.beginPath();
  ctx.roundRect(textBoxX, textBoxY, textBoxW, textBoxH, 6);
  ctx.fill();
  ctx.strokeStyle = "#a89878";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(textBoxX, textBoxY, textBoxW, textBoxH, 6);
  ctx.stroke();

  ctx.font = "13px 'Courier New', monospace";
  ctx.fillStyle = "#3a3020";
  ctx.textAlign = "left";
  ctx.fillText(text, textBoxX + 12, textBoxY + 22);

  // Continue hint
  ctx.font = "10px 'Courier New', monospace";
  ctx.fillStyle = "#6a6050";
  ctx.textAlign = "right";
  const blink = Math.sin(Date.now() / 400) > 0;
  if (blink) {
    ctx.fillText("Press E to continue ▶", boxX + boxW - 16, boxY + boxH - 10);
  }
}

// ── Agent Menu (light theme matching reference) ─────────────────────

function drawPixelAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  agent: AgentData,
) {
  const s = size / 32;
  ctx.save();

  // Avatar background — warm cream with subtle border
  ctx.fillStyle = "#d4c8a8";
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 6 * s);
  ctx.fill();
  ctx.strokeStyle = "#a89878";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 6 * s);
  ctx.stroke();

  const cx = x + size / 2;
  const baseY = y + 2 * s;

  // Hair
  ctx.fillStyle = agent.hairColor;
  ctx.fillRect(cx - 9 * s, baseY + 1 * s, 18 * s, 7 * s);
  // Hair top detail
  ctx.fillRect(cx - 7 * s, baseY - 1 * s, 14 * s, 4 * s);

  // Face / head
  ctx.fillStyle = agent.skinColor;
  ctx.fillRect(cx - 7 * s, baseY + 5 * s, 14 * s, 11 * s);

  // Ears
  ctx.fillRect(cx - 9 * s, baseY + 8 * s, 3 * s, 5 * s);
  ctx.fillRect(cx + 6 * s, baseY + 8 * s, 3 * s, 5 * s);

  // Eyes — white sclera + dark pupil
  ctx.fillStyle = "#fff";
  ctx.fillRect(cx - 5 * s, baseY + 9 * s, 4 * s, 3 * s);
  ctx.fillRect(cx + 1 * s, baseY + 9 * s, 4 * s, 3 * s);
  ctx.fillStyle = "#2d1b4e";
  ctx.fillRect(cx - 3 * s, baseY + 9.5 * s, 2 * s, 2.5 * s);
  ctx.fillRect(cx + 2 * s, baseY + 9.5 * s, 2 * s, 2.5 * s);

  // Mouth
  ctx.fillStyle = "#c47a5a";
  ctx.fillRect(cx - 2 * s, baseY + 13 * s, 4 * s, 1.5 * s);

  // Body / shirt
  ctx.fillStyle = agent.bodyColor;
  ctx.fillRect(cx - 10 * s, baseY + 16 * s, 20 * s, 12 * s);

  // Collar detail
  const lighter = lightenColor(agent.bodyColor, 30);
  ctx.fillStyle = lighter;
  ctx.fillRect(cx - 3 * s, baseY + 16 * s, 6 * s, 3 * s);

  ctx.restore();
}

function lightenColor(hex: string, amt: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + amt);
  const g = Math.min(255, ((num >> 8) & 0xff) + amt);
  const b = Math.min(255, (num & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}

function drawAgentMenu(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  menu: AgentMenuState,
) {
  ctx.save();

  // Dim background
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Panel dimensions
  const panelW = Math.min(520, canvasW - 40);
  const panelH = Math.min(420, canvasH - 40);
  const panelX = (canvasW - panelW) / 2;
  const panelY = (canvasH - panelH) / 2;
  const r = 12;

  // Panel shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.roundRect(panelX + 4, panelY + 4, panelW, panelH, r);
  ctx.fill();

  // Panel background — light cream like reference
  ctx.fillStyle = "#c8bfa0";
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, r);
  ctx.fill();

  // Panel border — dark outline
  ctx.strokeStyle = "#5a5040";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, r);
  ctx.stroke();

  // Inner border highlight
  ctx.strokeStyle = "#ddd4b8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(panelX + 4, panelY + 4, panelW - 8, panelH - 8, r - 2);
  ctx.stroke();

  // ── Tab bar ──
  const tabY = panelY;
  const tabH = 38;
  const tabs: { label: string; key: AgentMenuState["tab"] }[] = [
    { label: "Agents", key: "agents" },
    { label: "Shop", key: "shop" },
  ];
  const tabW = (panelW - 60) / tabs.length;

  for (let i = 0; i < tabs.length; i++) {
    const tx = panelX + 10 + i * (tabW + 6);
    const isActive = tabs[i].key === menu.tab;

    if (isActive) {
      // Active tab — raised look, connected to panel
      ctx.fillStyle = "#c8bfa0";
      ctx.beginPath();
      ctx.roundRect(tx, tabY - 6, tabW, tabH + 6, [8, 8, 0, 0]);
      ctx.fill();
      ctx.strokeStyle = "#5a5040";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tx, tabY + tabH);
      ctx.lineTo(tx, tabY - 4);
      ctx.quadraticCurveTo(tx, tabY - 6, tx + 8, tabY - 6);
      ctx.lineTo(tx + tabW - 8, tabY - 6);
      ctx.quadraticCurveTo(tx + tabW, tabY - 6, tx + tabW, tabY - 4);
      ctx.lineTo(tx + tabW, tabY + tabH);
      ctx.stroke();
      // Hide bottom border under active tab
      ctx.fillStyle = "#c8bfa0";
      ctx.fillRect(tx + 2, tabY - 1, tabW - 4, 6);
    } else {
      // Inactive tab
      ctx.fillStyle = "#a89878";
      ctx.beginPath();
      ctx.roundRect(tx, tabY + 2, tabW, tabH - 4, [6, 6, 0, 0]);
      ctx.fill();
      ctx.strokeStyle = "#7a6e58";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(tx, tabY + 2, tabW, tabH - 4, [6, 6, 0, 0]);
      ctx.stroke();
    }

    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.fillStyle = isActive ? "#3a3020" : "#5a5040";
    ctx.textAlign = "center";
    ctx.fillText(tabs[i].label, tx + tabW / 2, tabY + 22);
  }

  // ── Close button (X) ──
  const closeX = panelX + panelW - 36;
  const closeY = tabY + 6;
  ctx.fillStyle = "#4a7af5";
  ctx.beginPath();
  ctx.roundRect(closeX, closeY, 26, 26, 5);
  ctx.fill();
  ctx.strokeStyle = "#3560c0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(closeX, closeY, 26, 26, 5);
  ctx.stroke();
  ctx.font = "bold 16px 'Courier New', monospace";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText("X", closeX + 13, closeY + 19);

  // ── Content area ──
  const contentY = tabY + tabH + 12;
  const contentX = panelX + 16;
  const contentW = panelW - 32;

  if (menu.tab === "shop") {
    drawShopContent(ctx, contentX, contentY, contentW, panelY + panelH - 20);
  } else {
    drawAgentsContent(ctx, contentX, contentY, contentW, panelY + panelH - 20, menu);
  }

  // ── Hint bar at bottom ──
  ctx.font = "10px 'Courier New', monospace";
  ctx.fillStyle = "#6a6050";
  ctx.textAlign = "center";
  const blinkAgent = Math.sin(Date.now() / 400) > 0;
  if (blinkAgent) {
    ctx.fillText("B: Close    W/S: Navigate    Tab: Switch tabs", canvasW / 2, panelY + panelH - 8);
  }

  ctx.restore();
}

function drawAgentsContent(
  ctx: CanvasRenderingContext2D,
  contentX: number,
  contentY: number,
  contentW: number,
  maxY: number,
  menu: AgentMenuState,
) {
  const agents = MOCK_AGENTS;
  const avatarSize = 64;

  const getRowH = (agent: AgentData) => Math.max(80, 44 + agent.abilities.length * 16 + 24);
  let cumulY = 0;

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const rowH = getRowH(agent);
    const rowY = contentY + cumulY;
    if (rowY + rowH > maxY) break;
    cumulY += rowH + 6;
    const isSelected = i === menu.selectedAgent;

    // Row highlight
    if (isSelected) {
      ctx.fillStyle = "rgba(90, 80, 50, 0.12)";
      ctx.beginPath();
      ctx.roundRect(contentX - 6, rowY - 4, contentW + 12, rowH + 2, 8);
      ctx.fill();
      ctx.strokeStyle = "#8a7a50";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(contentX - 6, rowY - 4, contentW + 12, rowH + 2, 8);
      ctx.stroke();
    }

    // Avatar
    drawPixelAvatar(ctx, contentX, rowY, avatarSize, agent);

    // Name in input-style box
    const nameBoxX = contentX + avatarSize + 12;
    const nameBoxY = rowY + 2;
    const nameBoxW = contentW - avatarSize - 96;
    const nameBoxH = 28;

    ctx.fillStyle = "#e8e0c8";
    ctx.beginPath();
    ctx.roundRect(nameBoxX, nameBoxY, nameBoxW, nameBoxH, 4);
    ctx.fill();
    ctx.strokeStyle = "#9a9080";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(nameBoxX, nameBoxY, nameBoxW, nameBoxH, 4);
    ctx.stroke();

    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.fillStyle = "#3a3020";
    ctx.textAlign = "left";
    ctx.fillText(agent.name, nameBoxX + 8, nameBoxY + 19);

    // Hire button — prominent blue
    const btnW = 68;
    const btnH = 28;
    const btnX = contentX + contentW - btnW;
    const btnY = rowY + 2;
    // Button shadow
    ctx.fillStyle = "#3560c0";
    ctx.beginPath();
    ctx.roundRect(btnX + 2, btnY + 2, btnW, btnH, 6);
    ctx.fill();
    // Button face
    ctx.fillStyle = "#4a7af5";
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 6);
    ctx.fill();
    ctx.strokeStyle = "#3560c0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 6);
    ctx.stroke();
    // Button highlight
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.roundRect(btnX + 2, btnY + 2, btnW - 4, btnH / 2 - 2, [4, 4, 0, 0]);
    ctx.fill();

    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText("Hire", btnX + btnW / 2, btnY + 19);

    // Abilities box — white/cream with clean border
    if (agent.abilities.length > 0) {
      const listX = contentX + avatarSize + 12;
      const listY = rowY + 36;
      const listW = contentW - avatarSize - 16;
      const listH = 20 + agent.abilities.length * 16;

      ctx.fillStyle = "#ede6d0";
      ctx.beginPath();
      ctx.roundRect(listX, listY, listW, listH, 6);
      ctx.fill();
      ctx.strokeStyle = "#a89878";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(listX, listY, listW, listH, 6);
      ctx.stroke();

      // "Abilities" header
      ctx.font = "bold 12px 'Courier New', monospace";
      ctx.fillStyle = "#4a4030";
      ctx.textAlign = "left";
      ctx.fillText("Abilities", listX + 10, listY + 14);

      // Ability items
      ctx.font = "11px 'Courier New', monospace";
      for (let t = 0; t < agent.abilities.length; t++) {
        const taskY = listY + 28 + t * 16;
        // Dark square bullet
        ctx.fillStyle = "#6a6050";
        ctx.fillRect(listX + 12, taskY - 5, 6, 6);
        // Text
        ctx.fillStyle = "#5a5040";
        ctx.fillText(agent.abilities[t], listX + 24, taskY);
      }
    }
  }
}

function drawShopContent(
  ctx: CanvasRenderingContext2D,
  contentX: number,
  contentY: number,
  contentW: number,
  maxY: number,
) {
  // Money display — gold bar
  const moneyY = contentY + 4;
  ctx.fillStyle = "#e8d8a0";
  ctx.beginPath();
  ctx.roundRect(contentX, moneyY, contentW, 32, 6);
  ctx.fill();
  ctx.strokeStyle = "#a89060";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(contentX, moneyY, contentW, 32, 6);
  ctx.stroke();

  ctx.font = "bold 14px 'Courier New', monospace";
  ctx.fillStyle = "#5a4820";
  ctx.textAlign = "left";
  ctx.fillText("Money:", contentX + 12, moneyY + 21);
  ctx.fillStyle = "#8a6a10";
  ctx.textAlign = "right";
  ctx.fillText(`${playerMoney} coins`, contentX + contentW - 12, moneyY + 21);

  // Powers list
  const startY = moneyY + 46;
  const rowH = 72;

  for (let i = 0; i < SHOP_POWERS.length; i++) {
    const power = SHOP_POWERS[i];
    const rowY = startY + i * rowH;
    if (rowY + rowH > maxY) break;

    // Row bg — lighter cream
    ctx.fillStyle = "#ede6d0";
    ctx.beginPath();
    ctx.roundRect(contentX, rowY, contentW, rowH - 8, 6);
    ctx.fill();
    ctx.strokeStyle = "#a89878";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(contentX, rowY, contentW, rowH - 8, 6);
    ctx.stroke();

    // Icon
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.fillText(power.icon, contentX + 28, rowY + 36);

    // Name
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillStyle = "#3a3020";
    ctx.textAlign = "left";
    ctx.fillText(power.name, contentX + 52, rowY + 22);

    // Description
    ctx.font = "10px 'Courier New', monospace";
    ctx.fillStyle = "#7a7060";
    ctx.fillText(power.description, contentX + 52, rowY + 40);

    // Cost
    const canAfford = playerMoney >= power.cost;
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.fillStyle = canAfford ? "#8a6a10" : "#aa4444";
    ctx.textAlign = "right";
    ctx.fillText(`${power.cost} coins`, contentX + contentW - 78, rowY + 36);

    // Buy button
    const buyW = 56;
    const buyH = 24;
    const buyX = contentX + contentW - buyW - 10;
    const buyY = rowY + 14;
    // Shadow
    ctx.fillStyle = canAfford ? "#1a6040" : "#2a2a30";
    ctx.beginPath();
    ctx.roundRect(buyX + 2, buyY + 2, buyW, buyH, 5);
    ctx.fill();
    // Face
    ctx.fillStyle = canAfford ? "#2e8b57" : "#888";
    ctx.beginPath();
    ctx.roundRect(buyX, buyY, buyW, buyH, 5);
    ctx.fill();
    ctx.strokeStyle = canAfford ? "#1a6040" : "#666";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(buyX, buyY, buyW, buyH, 5);
    ctx.stroke();
    ctx.font = "bold 12px 'Courier New', monospace";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText("Buy", buyX + buyW / 2, buyY + 17);
  }
}
