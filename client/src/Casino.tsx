import { useState, useEffect, useRef, useCallback } from "react";
import {
  TS, MW, MH, P, SOLID, INTERACT,
  buildMap, drawTile, drawChar, drawNametag, NPCS,
} from "./casinoMap";
import "./Casino.css";

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// ===== SLOT MACHINE MINI-GAME =====
const SYMS = ["7", "B", "C", "L", "S", "G"];
const PAYS: Record<string, number> = { "777": 50, BBB: 25, CCC: 15, GGG: 10, SSS: 8, LLL: 5 };
function rS() { return SYMS[Math.floor(Math.random() * SYMS.length)]; }

function SlotPopup({ coins, setCoins, onExit }: {
  coins: number; setCoins: React.Dispatch<React.SetStateAction<number>>; onExit: () => void;
}) {
  const [reels, setReels] = useState(["7", "7", "7"]);
  const [sp, setSp] = useState([false, false, false]);
  const [res, setRes] = useState(""); const [win, setWin] = useState(false);
  const [bet, setBet] = useState(5);
  const tmr = useRef<ReturnType<typeof setTimeout>[]>([]);
  const busy = sp.some(Boolean);
  useEffect(() => () => tmr.current.forEach(clearTimeout), []);

  const spin = useCallback(() => {
    if (busy || coins < bet) return;
    setCoins(c => c - bet); setRes(""); setWin(false);
    setSp([true, true, true]);
    const f = [rS(), rS(), rS()];
    const iv: ReturnType<typeof setInterval>[] = [];
    for (let i = 0; i < 3; i++)
      iv[i] = setInterval(() => setReels(p => { const n = [...p]; n[i] = rS(); return n; }), 55);
    [500, 850, 1200].forEach((d, i) => {
      tmr.current.push(setTimeout(() => {
        clearInterval(iv[i]);
        setReels(p => { const n = [...p]; n[i] = f[i]; return n; });
        setSp(p => { const n = [...p]; n[i] = false; return n; });
        if (i === 2) {
          const c = f.join(""), pay = PAYS[c];
          if (pay) { const w = pay * bet / 5; setCoins(v => v + w); setRes(`WIN +${w}!`); setWin(true); }
          else if (f[0] === f[1] || f[1] === f[2]) { setCoins(v => v + bet); setRes(`+${bet}`); setWin(true); }
          else { setRes("NO LUCK"); setWin(false); }
        }
      }, d));
    });
  }, [busy, coins, bet, setCoins]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); spin(); }
      if (e.key === "Escape") onExit();
      if (e.key === "ArrowUp") setBet(b => Math.min(b + 5, 50, coins));
      if (e.key === "ArrowDown") setBet(b => Math.max(b - 5, 1));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [spin, onExit, coins]);

  return (
    <div className="slot-overlay" onClick={onExit}>
      <div className="slot-box" onClick={e => e.stopPropagation()}>
        <div className="slot-title">SLOT MACHINE</div>
        <div className="slot-coins">COINS: <strong>{coins}</strong></div>
        <div className="slot-reels">
          {reels.map((s, i) => (
            <div className="slot-reel" key={i}>
              <span className={`slot-sym${sp[i] ? " spin" : ""}`}>{s}</span>
            </div>
          ))}
        </div>
        <div className={`slot-result${win ? " win" : ""}`}>{res}</div>
        <div className="slot-bet">BET: {bet}</div>
        <div className="slot-actions">
          <button className="slot-btn slot-btn-bet" onClick={() => setBet(b => Math.max(b - 5, 1))}>-5</button>
          <button className="slot-btn slot-btn-spin" onClick={spin} disabled={busy || coins < bet}>SPIN</button>
          <button className="slot-btn slot-btn-bet" onClick={() => setBet(b => Math.min(b + 5, 50, coins))}>+5</button>
          <button className="slot-btn slot-btn-exit" onClick={onExit}>EXIT</button>
        </div>
        <div className="slot-pay">
          <span>777 x50</span><span>BBB x25</span><span>CCC x15</span>
          <span>GGG x10</span><span>SSS x8</span><span>LLL x5</span>
        </div>
        <div className="slot-help">SPACE=SPIN  ESC=EXIT  UP/DN=BET</div>
      </div>
    </div>
  );
}

// ===== MAIN CASINO COMPONENT =====
export default function Casino({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapImgRef = useRef<HTMLCanvasElement | null>(null);
  const [coins, setCoins] = useState(500);
  const [showSlot, setShowSlot] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [speech, setSpeech] = useState("");

  const showSlotRef = useRef(false);
  const promptRef = useRef("");
  const g = useRef({
    px: 14, py: 3, tx: 14, ty: 3,
    vx: 14 * TS, vy: 3 * TS,
    dir: 0, frame: 0, moving: false, moveT: 0, animT: 0,
  });
  const keys = useRef(new Set<string>());
  const map = useRef(buildMap());
  const SCALE = 3;

  useEffect(() => { showSlotRef.current = showSlot; }, [showSlot]);

  // Pre-render map
  useEffect(() => {
    const mc = document.createElement("canvas");
    mc.width = MW * TS; mc.height = MH * TS;
    const ctx = mc.getContext("2d")!;
    for (let y = 0; y < MH; y++)
      for (let x = 0; x < MW; x++)
        drawTile(ctx, map.current[y][x], x * TS, y * TS);
    mapImgRef.current = mc;
  }, []);

  // Resize
  useEffect(() => {
    const cv = canvasRef.current!;
    const resize = () => {
      cv.width = Math.floor(window.innerWidth / SCALE);
      cv.height = Math.floor(window.innerHeight / SCALE);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Game loop
  useEffect(() => {
    const cv = canvasRef.current!;
    const ctx = cv.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    let prev = 0, running = true;

    function tryMove() {
      if (showSlotRef.current) return;
      const s = g.current;
      let dx = 0, dy = 0, dir = s.dir;
      if (keys.current.has("ArrowUp") || keys.current.has("w")) { dy = -1; dir = 1; }
      else if (keys.current.has("ArrowDown") || keys.current.has("s")) { dy = 1; dir = 0; }
      else if (keys.current.has("ArrowLeft") || keys.current.has("a")) { dx = -1; dir = 2; }
      else if (keys.current.has("ArrowRight") || keys.current.has("d")) { dx = 1; dir = 3; }
      if (!dx && !dy) return;
      s.dir = dir;
      const nx = s.px + dx, ny = s.py + dy;
      if (nx < 0 || nx >= MW || ny < 0 || ny >= MH) return;
      if (SOLID.has(map.current[ny][nx])) return;
      // Check NPC collision
      for (const npc of NPCS) if (npc.x === nx && npc.y === ny) return;
      s.tx = nx; s.ty = ny; s.moveT = 0; s.moving = true;
    }

    function checkNear() {
      const s = g.current;
      if (s.moving) return;
      const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      let found = "";
      for (const [dx, dy] of dirs) {
        const nx = s.px + dx, ny = s.py + dy;
        if (nx >= 0 && nx < MW && ny >= 0 && ny < MH) {
          const tile = map.current[ny][nx];
          if (INTERACT[tile]) { found = INTERACT[tile]; break; }
        }
      }
      if (!found) {
        for (const npc of NPCS) {
          if (Math.abs(npc.x - s.px) + Math.abs(npc.y - s.py) === 1) {
            found = "npc:" + npc.name; break;
          }
        }
      }
      if (found !== promptRef.current) {
        promptRef.current = found;
        if (found === "slot") setPrompt("[A] Play Slots");
        else if (found === "poker") setPrompt("[A] Poker - Coming Soon");
        else if (found === "blackjack") setPrompt("[A] Blackjack - Coming Soon");
        else if (found === "roulette") setPrompt("[A] Roulette - Coming Soon");
        else if (found.startsWith("npc:")) setPrompt("[A] Talk");
        else { setPrompt(""); setSpeech(""); }
      }
    }

    function update(dt: number) {
      const s = g.current;
      if (s.moving) {
        s.moveT += dt * 0.007;
        if (s.moveT >= 1) {
          s.px = s.tx; s.py = s.ty;
          s.vx = s.px * TS; s.vy = s.py * TS;
          s.moving = false; s.moveT = 1;
          tryMove();
        } else {
          s.vx = lerp(s.px * TS, s.tx * TS, s.moveT);
          s.vy = lerp(s.py * TS, s.ty * TS, s.moveT);
        }
      } else { tryMove(); }
      s.animT += dt;
      if (s.animT > 200) { s.animT -= 200; s.frame = (s.frame + 1) % 2; }
      checkNear();
    }

    function drawHUD(cw: number, ch: number) {
      const barH = 20;
      const barY = ch - barH;
      // Border line
      ctx.fillStyle = P.ltGray;
      ctx.fillRect(0, barY - 1, cw, 1);
      // BG
      ctx.fillStyle = P.black;
      ctx.fillRect(0, barY, cw, barH);
      // Coin icon
      ctx.fillStyle = P.gold;
      ctx.fillRect(3, barY + 4, 8, 8);
      ctx.fillStyle = P.goldDk;
      ctx.fillRect(5, barY + 6, 4, 4);
      ctx.fillStyle = P.goldLt;
      ctx.fillRect(5, barY + 5, 1, 1);
      // Coin text
      ctx.fillStyle = P.white;
      ctx.font = '6px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`COINS: ${coins}`, 14, barY + 12);
      // Location
      ctx.fillStyle = P.ltGray;
      ctx.textAlign = 'center';
      ctx.fillText('GAME CORNER', cw / 2, barY + 12);
      // Controls hint
      ctx.fillStyle = P.gray;
      ctx.textAlign = 'right';
      ctx.fillText('ARROWS MOVE  [A] ACT', cw - 4, barY + 12);
    }

    function render() {
      const s = g.current;
      const cw = cv.width, ch = cv.height;
      const cx = Math.round(s.vx + TS / 2 - cw / 2);
      const cy = Math.round(s.vy + TS / 2 - ch / 2);

      ctx.fillStyle = P.bg;
      ctx.fillRect(0, 0, cw, ch);

      // Map
      if (mapImgRef.current) {
        const mw = mapImgRef.current.width, mh = mapImgRef.current.height;
        const sx = Math.max(0, cx), sy = Math.max(0, cy);
        const dx = sx - cx, dy = sy - cy;
        const sw = Math.min(mw - sx, cw - dx);
        const sh = Math.min(mh - sy, ch - dy);
        if (sw > 0 && sh > 0) ctx.drawImage(mapImgRef.current, sx, sy, sw, sh, dx, dy, sw, sh);
      }

      // Collect all sprites (NPCs + player) and sort by Y for proper overlap
      const sprites: { y: number; draw: () => void }[] = [];

      for (const npc of NPCS) {
        const nx = npc.x * TS - cx, ny = npc.y * TS - cy;
        if (nx > -TS * 2 && nx < cw + TS && ny > -TS * 2 && ny < ch + TS) {
          const capturedNx = nx, capturedNy = ny, capturedNpc = npc;
          sprites.push({
            y: npc.y,
            draw: () => {
              drawChar(ctx, capturedNx, capturedNy, capturedNpc.dir, 0, false, capturedNpc.hair, capturedNpc.shirt, capturedNpc.hat);
              drawNametag(ctx, capturedNx, capturedNy, capturedNpc.name);
            }
          });
        }
      }

      const px = Math.round(s.vx - cx), py = Math.round(s.vy - cy);
      sprites.push({
        y: s.moving ? lerp(s.py, s.ty, s.moveT) : s.py,
        draw: () => {
          drawChar(ctx, px, py, s.dir, s.frame, s.moving, '#4a2a14', '#c83858');
          drawNametag(ctx, px, py, "You", true);
        }
      });

      sprites.sort((a, b) => a.y - b.y);
      sprites.forEach(s => s.draw());

      // Scanlines
      ctx.fillStyle = '#18101808';
      for (let y = 0; y < ch; y += 2) ctx.fillRect(0, y, cw, 1);

      // HUD bar
      drawHUD(cw, ch);
    }

    function loop(t: number) {
      if (!running) return;
      const dt = Math.min(t - prev, 50); prev = t;
      update(dt); render();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(t => { prev = t; loop(t); });
    return () => { running = false; };
  }, [coins]);

  // Input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.key);
      if (showSlotRef.current) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        const p = promptRef.current;
        if (p === "slot") { setShowSlot(true); setSpeech(""); }
        else if (p.startsWith("npc:")) {
          const npc = NPCS.find(n => n.name === p.slice(4));
          if (npc) setSpeech(`${npc.name}: "${npc.lines[Math.floor(Math.random() * npc.lines.length)]}"`);
        }
      }
      if (e.key === "Escape") {
        if (speech) setSpeech("");
        else onClose();
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [onClose, speech]);

  return (
    <div className="casino-world">
      <canvas ref={canvasRef} />
      {prompt && !showSlot && !speech && <div className="casino-prompt">{prompt}</div>}
      {speech && !showSlot && <div className="casino-speech">{speech}</div>}
      {showSlot && <SlotPopup coins={coins} setCoins={setCoins} onExit={() => setShowSlot(false)} />}
    </div>
  );
}
