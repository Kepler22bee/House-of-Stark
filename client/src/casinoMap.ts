// Pokémon Game Corner — GBC pixel-art tiles
// Every object: 1px black outline → fill → highlight → shadow → detail

export const TS = 16;
export const MW = 22;
export const MH = 18;

// ===== BRIGHT GBC PALETTE =====
export const P = {
  bg: '#181828',
  // Walls — warm cream
  wall: '#f0e0c0', wallDk: '#c8b090', wallLt: '#f8f0e0', trim: '#a08060',
  // Carpet — bright red pattern
  carp: '#e04858', carpDk: '#c03040', carpLt: '#f06878',
  // Carpet gold
  carpG: '#e8c838', carpGDk: '#c8a828',
  // Machine — bright blue
  mch: '#4880d0', mchDk: '#3060a8', mchLt: '#68a0f0',
  // Felt — bright green
  flt: '#40c860', fltDk: '#28a848', fltBd: '#209038',
  // Wood
  wd: '#c88040', wdDk: '#986030', wdLt: '#e0a060',
  // Gold
  gld: '#f8d840', gldDk: '#d0b028', gldLt: '#ffe868',
  // Red accent
  red: '#e84848', redDk: '#c03030',
  // Neon
  nP: '#ff58a0', nG: '#48f878', nB: '#58a0ff', nY: '#f8f848',
  // Characters
  skin: '#f8d098', skDk: '#d8a870',
  // Grays
  wh: '#f8f8f0', lt: '#c8c8c0', md: '#909088', dk: '#505050', bk: '#181828',
};

// ===== TILES =====
export const T = {
  VOID: 0, WALL: 1, FLOOR: 2,
  CARP: 3, SLOT: 4, STOOL: 5,
  POKER: 6, BJACK: 7, ROUL: 8, CHAIR: 9,
  BAR: 10, PLANT: 11, DOOR: 12,
  PRIZE: 13, LAMP: 14, HEART: 15, SPADE: 16,
  DIAM: 17, CLUB: 18, NEON: 19, SIGN: 20,
};

export const SOLID = new Set([
  T.WALL, T.SLOT, T.POKER, T.BJACK, T.ROUL, T.CHAIR,
  T.BAR, T.PLANT, T.PRIZE,
  T.LAMP, T.HEART, T.SPADE, T.DIAM, T.CLUB, T.NEON, T.SIGN,
]);
export const INTERACT: Record<number, string> = {
  [T.SLOT]: 'slot', [T.POKER]: 'poker', [T.BJACK]: 'blackjack', [T.ROUL]: 'roulette',
};

type Ctx = CanvasRenderingContext2D;
const f = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col; c.fillRect(x, y, w, h);
};

// Carpet background for all carpet tiles
function carpBg(c: Ctx, x: number, y: number) {
  f(c, x, y, TS, TS, P.carp);
  // Cross pattern
  c.fillStyle = P.carpDk;
  c.fillRect(x + 7, y, 2, TS);
  c.fillRect(x, y + 7, TS, 2);
  // Corner diamonds
  c.fillStyle = P.carpLt;
  c.fillRect(x + 3, y + 3, 2, 2);
  c.fillRect(x + 11, y + 3, 2, 2);
  c.fillRect(x + 3, y + 11, 2, 2);
  c.fillRect(x + 11, y + 11, 2, 2);
}

// Wall base with trim
function wallBase(c: Ctx, x: number, y: number) {
  f(c, x, y, TS, TS, P.wall);
  f(c, x, y, TS, 1, P.wallLt);
  // Trim / wainscoting
  f(c, x, y + 12, TS, 1, P.trim);
  f(c, x, y + 13, TS, 3, P.wallDk);
  f(c, x, y + 13, TS, 1, P.trim);
}

// ===== DRAW TILE =====
export function drawTile(c: Ctx, t: number, x: number, y: number) {
  switch (t) {
    case T.VOID:
      f(c, x, y, TS, TS, P.bg); break;

    case T.WALL:
      wallBase(c, x, y);
      // Brick lines
      c.fillStyle = P.wallDk;
      c.fillRect(x, y + 4, TS, 1);
      c.fillRect(x, y + 8, TS, 1);
      c.fillRect(x + 8, y, 1, 4);
      c.fillRect(x + 4, y + 4, 1, 4);
      c.fillRect(x + 12, y + 4, 1, 4);
      c.fillRect(x + 8, y + 8, 1, 4);
      break;

    case T.FLOOR:
      f(c, x, y, TS, TS, P.wallLt);
      c.fillStyle = P.wall;
      c.fillRect(x + 15, y, 1, TS);
      c.fillRect(x, y + 15, TS, 1);
      c.fillStyle = P.wallDk;
      c.fillRect(x + 7, y + 7, 2, 2);
      break;

    case T.CARP:
      carpBg(c, x, y);
      break;

    case T.SLOT: {
      carpBg(c, x, y);
      // Shadow under machine
      f(c, x + 3, y + 14, 10, 2, '#00000025');
      // OUTLINE
      f(c, x + 3, y + 0, 10, 15, P.bk);
      // Body fill
      f(c, x + 4, y + 1, 8, 13, P.mch);
      // Left highlight
      f(c, x + 4, y + 1, 1, 13, P.mchLt);
      // Top highlight
      f(c, x + 4, y + 1, 8, 1, P.mchLt);
      // Right shadow
      f(c, x + 11, y + 1, 1, 13, P.mchDk);
      // Screen (outlined)
      f(c, x + 5, y + 3, 6, 5, P.bk);
      // Screen bg
      f(c, x + 6, y + 4, 4, 3, '#102030');
      // 3 reel symbols
      f(c, x + 6, y + 4, 1, 3, P.nG);
      f(c, x + 8, y + 4, 1, 3, P.gldLt);
      f(c, x + 10, y + 4, 1, 3, P.nP);
      // Screen glow line
      f(c, x + 5, y + 7, 6, 1, P.mchDk);
      // Body section
      f(c, x + 5, y + 9, 6, 1, P.mchDk);
      // Coin slot
      f(c, x + 7, y + 10, 2, 1, P.gld);
      // Button
      f(c, x + 6, y + 12, 4, 1, P.red);
      f(c, x + 7, y + 12, 2, 1, P.gldLt);
      // Lever (right side)
      f(c, x + 13, y + 2, 1, 4, P.md);
      f(c, x + 13, y + 1, 1, 2, P.red);
      break;
    }

    case T.STOOL:
      carpBg(c, x, y);
      // Stool outline
      f(c, x + 5, y + 4, 6, 8, P.bk);
      // Seat
      f(c, x + 6, y + 5, 4, 3, P.wdLt);
      f(c, x + 6, y + 5, 4, 1, P.gldLt);
      // Leg
      f(c, x + 7, y + 8, 2, 3, P.wdDk);
      // Base
      f(c, x + 6, y + 11, 4, 1, P.wdDk);
      break;

    case T.POKER: {
      carpBg(c, x, y);
      // Table outline
      f(c, x + 1, y + 1, 14, 14, P.bk);
      // Table fill
      f(c, x + 2, y + 2, 12, 12, P.flt);
      // Border
      f(c, x + 2, y + 2, 12, 1, P.fltBd);
      f(c, x + 2, y + 13, 12, 1, P.fltBd);
      f(c, x + 2, y + 2, 1, 12, P.fltBd);
      f(c, x + 13, y + 2, 1, 12, P.fltBd);
      // Inner highlight
      f(c, x + 3, y + 3, 10, 1, P.fltDk);
      // Chips (stacked)
      f(c, x + 4, y + 5, 3, 3, P.bk);
      f(c, x + 5, y + 5, 2, 2, P.red);
      f(c, x + 4, y + 5, 2, 2, P.redDk);
      f(c, x + 9, y + 8, 3, 3, P.bk);
      f(c, x + 9, y + 8, 2, 2, P.gld);
      // Cards
      f(c, x + 7, y + 5, 2, 3, P.wh);
      f(c, x + 7, y + 6, 1, 1, P.red);
      break;
    }

    case T.BJACK: {
      carpBg(c, x, y);
      // Table outline (semicircle)
      f(c, x + 1, y + 3, 14, 12, P.bk);
      f(c, x + 3, y + 1, 10, 2, P.bk);
      // Fill
      f(c, x + 2, y + 4, 12, 10, P.flt);
      f(c, x + 4, y + 2, 8, 2, P.flt);
      // Border
      f(c, x + 4, y + 2, 8, 1, P.fltBd);
      f(c, x + 2, y + 4, 1, 10, P.fltBd);
      f(c, x + 13, y + 4, 1, 10, P.fltBd);
      f(c, x + 2, y + 13, 12, 1, P.fltBd);
      // Card positions
      f(c, x + 4, y + 7, 2, 3, P.wh);
      f(c, x + 8, y + 7, 2, 3, P.wh);
      f(c, x + 4, y + 8, 1, 1, P.red);
      f(c, x + 8, y + 8, 1, 1, P.bk);
      // "BJ" text
      f(c, x + 6, y + 4, 4, 2, P.fltDk);
      break;
    }

    case T.ROUL: {
      carpBg(c, x, y);
      // Table outline
      f(c, x + 1, y + 1, 14, 14, P.bk);
      // Fill
      f(c, x + 2, y + 2, 12, 12, P.flt);
      f(c, x + 2, y + 2, 12, 1, P.fltBd);
      f(c, x + 2, y + 13, 12, 1, P.fltBd);
      f(c, x + 2, y + 2, 1, 12, P.fltBd);
      f(c, x + 13, y + 2, 1, 12, P.fltBd);
      // Wheel outline
      f(c, x + 4, y + 4, 8, 8, P.bk);
      // Wheel fill
      f(c, x + 5, y + 5, 6, 6, P.wdDk);
      // Center
      f(c, x + 7, y + 7, 2, 2, P.gld);
      // Red/black segments
      f(c, x + 5, y + 5, 2, 2, P.red);
      f(c, x + 9, y + 5, 2, 2, P.bk);
      f(c, x + 5, y + 9, 2, 2, P.bk);
      f(c, x + 9, y + 9, 2, 2, P.red);
      f(c, x + 7, y + 5, 2, 1, P.wh);
      f(c, x + 5, y + 7, 1, 2, P.wh);
      break;
    }

    case T.CHAIR:
      carpBg(c, x, y);
      f(c, x + 4, y + 4, 8, 9, P.bk);
      f(c, x + 5, y + 5, 6, 7, P.redDk);
      f(c, x + 5, y + 5, 6, 2, P.red);
      f(c, x + 6, y + 7, 4, 3, P.wdDk);
      break;

    case T.BAR:
      f(c, x, y, TS, TS, P.wallLt);
      // Counter outline
      f(c, x, y + 2, TS, 13, P.bk);
      // Counter fill
      f(c, x + 1, y + 3, 14, 11, P.wd);
      // Top surface
      f(c, x + 1, y + 3, 14, 2, P.wdLt);
      f(c, x + 1, y + 3, 14, 1, P.gldLt);
      // Wood grain
      c.fillStyle = P.wdDk;
      c.fillRect(x + 1, y + 7, 14, 1);
      c.fillRect(x + 1, y + 11, 14, 1);
      // Grate bars
      c.fillStyle = P.md;
      for (let i = 0; i < 5; i++) c.fillRect(x + 2 + i * 3, y + 5, 1, 2);
      break;

    case T.PLANT:
      carpBg(c, x, y);
      // Pot outline
      f(c, x + 4, y + 9, 8, 6, P.bk);
      f(c, x + 5, y + 10, 6, 5, P.wd);
      f(c, x + 5, y + 10, 6, 1, P.wdLt);
      // Leaves outline
      f(c, x + 2, y + 2, 12, 8, P.bk);
      f(c, x + 3, y + 3, 10, 6, '#38b060');
      f(c, x + 5, y + 1, 6, 3, '#38b060');
      f(c, x + 1, y + 4, 3, 4, '#38b060');
      f(c, x + 12, y + 4, 3, 4, '#38b060');
      // Leaf highlights
      f(c, x + 4, y + 3, 3, 2, '#58d880');
      f(c, x + 9, y + 4, 3, 2, '#58d880');
      f(c, x + 6, y + 1, 2, 2, '#58d880');
      break;

    case T.DOOR:
      carpBg(c, x, y);
      // Door mat effect
      f(c, x + 3, y + 0, 10, 1, P.wdDk);
      f(c, x + 3, y + 15, 10, 1, P.wdDk);
      break;

    case T.PRIZE:
      wallBase(c, x, y);
      // Case outline
      f(c, x + 1, y + 1, 14, 11, P.bk);
      // Case fill
      f(c, x + 2, y + 2, 12, 9, P.mchDk);
      // Glass
      f(c, x + 2, y + 2, 12, 6, '#182838');
      // Shelf
      f(c, x + 2, y + 8, 12, 1, P.md);
      // Prize items
      f(c, x + 3, y + 3, 3, 4, P.gld); // trophy
      f(c, x + 4, y + 2, 1, 1, P.gldLt);
      f(c, x + 8, y + 4, 3, 3, P.nP); // plush
      f(c, x + 9, y + 3, 1, 1, P.nP);
      // Counter
      f(c, x + 2, y + 9, 12, 2, P.wdLt);
      f(c, x + 2, y + 9, 12, 1, P.gldLt);
      break;

    // === WALL DECORATIONS ===
    case T.LAMP:
      wallBase(c, x, y);
      // Bracket
      f(c, x + 7, y + 3, 2, 2, P.gldDk);
      // Lamp shade outline
      f(c, x + 4, y + 5, 8, 5, P.bk);
      f(c, x + 5, y + 5, 6, 4, P.gldLt);
      f(c, x + 5, y + 5, 6, 1, P.gld);
      // Glow
      f(c, x + 3, y + 9, 10, 2, P.gldLt + '30');
      f(c, x + 5, y + 9, 6, 2, P.gldLt + '50');
      break;

    case T.HEART:
      wallBase(c, x, y);
      c.fillStyle = P.red;
      c.fillRect(x + 4, y + 4, 3, 3); c.fillRect(x + 9, y + 4, 3, 3);
      c.fillRect(x + 3, y + 5, 10, 3);
      c.fillRect(x + 4, y + 8, 8, 1);
      c.fillRect(x + 5, y + 9, 6, 1);
      c.fillRect(x + 6, y + 10, 4, 1);
      c.fillRect(x + 7, y + 11, 2, 1);
      break;

    case T.SPADE:
      wallBase(c, x, y);
      c.fillStyle = P.bk;
      c.fillRect(x + 7, y + 3, 2, 1);
      c.fillRect(x + 6, y + 4, 4, 1);
      c.fillRect(x + 5, y + 5, 6, 1);
      c.fillRect(x + 4, y + 6, 8, 2);
      c.fillRect(x + 3, y + 8, 10, 1);
      c.fillRect(x + 4, y + 9, 3, 1); c.fillRect(x + 9, y + 9, 3, 1);
      c.fillRect(x + 7, y + 9, 2, 2);
      c.fillRect(x + 6, y + 11, 4, 1);
      break;

    case T.DIAM:
      wallBase(c, x, y);
      c.fillStyle = P.red;
      c.fillRect(x + 7, y + 3, 2, 1);
      c.fillRect(x + 6, y + 4, 4, 1);
      c.fillRect(x + 5, y + 5, 6, 1);
      c.fillRect(x + 4, y + 6, 8, 2);
      c.fillRect(x + 5, y + 8, 6, 1);
      c.fillRect(x + 6, y + 9, 4, 1);
      c.fillRect(x + 7, y + 10, 2, 1);
      break;

    case T.CLUB:
      wallBase(c, x, y);
      c.fillStyle = P.bk;
      c.fillRect(x + 7, y + 3, 2, 2);
      c.fillRect(x + 6, y + 4, 4, 2);
      c.fillRect(x + 4, y + 6, 3, 3); c.fillRect(x + 9, y + 6, 3, 3);
      c.fillRect(x + 5, y + 7, 6, 2);
      c.fillRect(x + 7, y + 9, 2, 2);
      c.fillRect(x + 5, y + 10, 6, 1);
      break;

    case T.NEON:
      wallBase(c, x, y);
      // Sign bg
      f(c, x + 2, y + 1, 12, 10, P.bk);
      // Neon $ outline
      c.fillStyle = P.nY;
      c.fillRect(x + 6, y + 2, 4, 1);
      c.fillRect(x + 5, y + 3, 2, 1);
      c.fillRect(x + 7, y + 2, 2, 8);
      c.fillRect(x + 5, y + 5, 6, 1);
      c.fillRect(x + 9, y + 6, 2, 1);
      c.fillRect(x + 5, y + 8, 6, 1);
      c.fillRect(x + 5, y + 9, 2, 1);
      // Glow halo
      c.fillStyle = P.nY + '28';
      c.fillRect(x + 3, y + 1, 10, 10);
      break;

    case T.SIGN:
      wallBase(c, x, y);
      f(c, x + 1, y + 2, 14, 8, P.bk);
      f(c, x + 2, y + 3, 12, 6, P.wdDk);
      f(c, x + 2, y + 3, 12, 1, P.wdLt);
      // "GAME" text (simplified)
      c.fillStyle = P.gldLt;
      // G
      c.fillRect(x + 3, y + 5, 2, 3);
      c.fillRect(x + 3, y + 5, 3, 1);
      c.fillRect(x + 3, y + 7, 3, 1);
      c.fillRect(x + 5, y + 6, 1, 2);
      // $
      c.fillRect(x + 8, y + 5, 3, 1);
      c.fillRect(x + 8, y + 6, 1, 1);
      c.fillRect(x + 8, y + 6, 3, 1);
      c.fillRect(x + 10, y + 7, 1, 1);
      c.fillRect(x + 8, y + 7, 3, 1);
      break;

    default:
      carpBg(c, x, y);
  }
}

// ===== CHARACTER SPRITES =====
export function drawChar(
  c: Ctx, x: number, y: number,
  dir: number, frame: number, moving: boolean,
  hair: string, shirt: string, hat?: string
) {
  // Shadow
  c.fillStyle = '#00000020';
  c.fillRect(x + 3, y + 14, 10, 2);
  // OUTLINE entire character
  c.fillStyle = P.bk;
  // Head outline
  c.fillRect(x + 3, y + 1, 10, 8);
  // Body outline
  c.fillRect(x + 3, y + 8, 10, 6);
  // Legs outline
  const lo = moving && frame === 1 ? 1 : 0;
  c.fillRect(x + 4 - lo, y + 13, 4, 3);
  c.fillRect(x + 8 + lo, y + 13, 4, 3);

  // HEAD fill
  c.fillStyle = P.skin;
  c.fillRect(x + 4, y + 3, 8, 5);
  // Ears
  c.fillRect(x + 3, y + 4, 1, 2);
  c.fillRect(x + 12, y + 4, 1, 2);

  // HAIR fill
  c.fillStyle = hair;
  c.fillRect(x + 4, y + 2, 8, 3);
  if (dir === 1) c.fillRect(x + 4, y + 4, 8, 3); // back of head
  else {
    c.fillRect(x + 3, y + 2, 2, 3);
    c.fillRect(x + 11, y + 2, 2, 3);
  }
  // Hat
  if (hat) {
    c.fillStyle = hat;
    c.fillRect(x + 2, y + 0, 12, 3);
    c.fillRect(x + 4, y + 2, 8, 2);
  }

  // EYES
  if (dir !== 1) {
    c.fillStyle = P.wh;
    if (dir === 0) {
      c.fillRect(x + 5, y + 5, 2, 2); c.fillRect(x + 9, y + 5, 2, 2);
      c.fillStyle = P.bk;
      c.fillRect(x + 6, y + 5, 1, 2); c.fillRect(x + 10, y + 5, 1, 2);
    } else if (dir === 2) {
      c.fillRect(x + 4, y + 5, 2, 2);
      c.fillStyle = P.bk;
      c.fillRect(x + 4, y + 5, 1, 2);
    } else {
      c.fillRect(x + 10, y + 5, 2, 2);
      c.fillStyle = P.bk;
      c.fillRect(x + 11, y + 5, 1, 2);
    }
  }

  // BODY fill
  c.fillStyle = shirt;
  c.fillRect(x + 4, y + 8, 8, 5);
  // Shirt collar
  c.fillStyle = P.wh;
  c.fillRect(x + 6, y + 8, 4, 1);
  // Arms (skin)
  c.fillStyle = P.skDk;
  c.fillRect(x + 3, y + 9, 1, 3);
  c.fillRect(x + 12, y + 9, 1, 3);

  // LEGS fill
  c.fillStyle = P.dk;
  c.fillRect(x + 5 - lo, y + 13, 2, 2);
  c.fillRect(x + 9 + lo, y + 13, 2, 2);
  // Shoes
  c.fillStyle = '#483828';
  c.fillRect(x + 5 - lo, y + 14, 2, 1);
  c.fillRect(x + 9 + lo, y + 14, 2, 1);
}

export function drawNametag(c: Ctx, x: number, y: number, name: string, isPlayer = false) {
  c.font = '5px monospace';
  c.textAlign = 'center';
  const w = c.measureText(name).width + 8;
  const tx = x + TS / 2;
  const ty = y - 1;
  c.fillStyle = '#000000cc';
  c.fillRect(Math.round(tx - w / 2), ty - 6, Math.round(w), 8);
  if (isPlayer) {
    c.fillStyle = '#48ff88';
    c.fillRect(Math.round(tx - w / 2 + 2), ty - 4, 3, 3);
  }
  c.fillStyle = isPlayer ? P.wh : '#c0c0b8';
  c.fillText(name, Math.round(tx + (isPlayer ? 2 : 0)), ty + 1);
}

// ===== NPCs =====
export interface NPC {
  x: number; y: number; dir: number;
  name: string; hair: string; shirt: string; hat?: string;
  lines: string[];
}
export const NPCS: NPC[] = [
  // Cashier
  { x: 10, y: 2, dir: 0, name: 'Cashier', hair: '#483020', shirt: '#4878c8',
    lines: ['Welcome to the Game Corner!', 'Need coins? Step right up!'] },
  // Slot gamblers (dir 1 = facing up/machine)
  { x: 2, y: 5, dir: 1, name: 'Gambler', hair: '#c87040', shirt: '#c04040',
    lines: ['Almost had triple 7s...', 'One more spin!'] },
  { x: 6, y: 5, dir: 1, name: 'Lucky', hair: P.gldLt, shirt: '#40a060',
    lines: ['This is MY machine!', 'I can feel a jackpot!'] },
  { x: 4, y: 8, dir: 1, name: 'Gramps', hair: P.lt, shirt: '#806040',
    lines: ['Been here since \'96...', 'Coins were cheaper then.'] },
  { x: 8, y: 8, dir: 1, name: 'Rookie', hair: '#302838', shirt: '#f0c080',
    lines: ['How does this work?', 'Is it broken?'] },
  { x: 2, y: 11, dir: 1, name: 'Hilda', hair: '#a83040', shirt: P.wh, hat: P.red,
    lines: ['Shh! Concentrating!', 'Triple bars, c\'mon!'] },
  { x: 6, y: 14, dir: 1, name: 'Ace', hair: P.bk, shirt: P.bk,
    lines: ['Patience is the key.', '...and lots of coins.'] },
  // Table players
  { x: 12, y: 6, dir: 3, name: 'High Roller', hair: '#302838', shirt: '#181828', hat: P.gldDk,
    lines: ['Raise. Again.', 'You have a poker face.'] },
  { x: 18, y: 6, dir: 2, name: 'Bluffer', hair: P.gldLt, shirt: '#c04848',
    lines: ['I never lose. OK sometimes.', 'All in!'] },
  { x: 12, y: 10, dir: 3, name: 'Sharp', hair: P.bk, shirt: '#3060a0',
    lines: ['Card counting? Never.', 'Hit me.'] },
  // Dealers
  { x: 15, y: 5, dir: 0, name: 'Dealer', hair: P.bk, shirt: '#181828',
    lines: ['Place your bets.', 'No touching the chips.'] },
  { x: 15, y: 9, dir: 0, name: 'Croupier', hair: '#483020', shirt: '#181828',
    lines: ['Round and round!', 'Rien ne va plus!'] },
  // Prize vendor
  { x: 20, y: 4, dir: 2, name: 'Vendor', hair: '#a83050', shirt: '#4878c8',
    lines: ['Check our prizes!', 'Save up those coins!'] },
  // Wanderers
  { x: 10, y: 15, dir: 0, name: 'Tourist', hair: '#c87040', shirt: '#f8a848', hat: '#48a8f8',
    lines: ['Wow, this place!', 'I just got here!'] },
  { x: 5, y: 16, dir: 3, name: '???', hair: '#302838', shirt: '#383830',
    lines: ['...', 'Move along.', 'Nothing suspicious here.'] },
];

// ===== MAP =====
export function buildMap(): number[][] {
  const m: number[][] = Array.from({ length: MH }, () => new Array(MW).fill(T.VOID));
  const fill = (x0: number, y0: number, w: number, h: number, t: number) => {
    for (let y = y0; y < y0 + h && y < MH; y++)
      for (let x = x0; x < x0 + w && x < MW; x++) m[y][x] = t;
  };
  const s = (x: number, y: number, t: number) => { if (y >= 0 && y < MH && x >= 0 && x < MW) m[y][x] = t; };

  // === BORDER WALLS ===
  fill(0, 0, MW, MH, T.WALL);

  // === TOP WALL DECO (row 1) ===
  s(1, 1, T.LAMP); s(3, 1, T.HEART); s(5, 1, T.NEON);
  s(8, 1, T.SIGN); s(9, 1, T.SIGN);
  s(12, 1, T.NEON); s(14, 1, T.SPADE);
  s(16, 1, T.DIAM); s(18, 1, T.NEON); s(20, 1, T.LAMP);

  // === FLOOR (rows 2-16) ===
  fill(1, 2, 20, 15, T.CARP);

  // === CASHIER COUNTER (row 2) ===
  fill(8, 2, 5, 1, T.BAR);
  s(1, 2, T.PLANT); s(7, 2, T.PLANT);
  s(14, 2, T.PLANT);

  // === LEFT: SLOT MACHINES (cols 2-8) ===
  // 4 rows of machines, each: machine row → stool row → walkway
  for (let row = 0; row < 4; row++) {
    const my = 4 + row * 3;
    for (let col = 0; col < 4; col++) {
      s(2 + col * 2, my, T.SLOT);
      s(2 + col * 2, my + 1, T.STOOL);
    }
  }
  // Wall lamps on left wall
  s(1, 4, T.LAMP); s(1, 7, T.HEART); s(1, 10, T.LAMP); s(1, 13, T.CLUB);

  // === CENTER-RIGHT: GAMING TABLES (cols 11-18) ===
  // Poker table row 1 (2x2)
  s(12, 4, T.POKER); s(13, 4, T.POKER);
  s(12, 5, T.POKER); s(13, 5, T.POKER);
  s(11, 4, T.CHAIR); s(14, 4, T.CHAIR);
  s(11, 5, T.CHAIR); s(14, 5, T.CHAIR);
  // Blackjack row 1
  s(16, 4, T.BJACK); s(17, 4, T.BJACK);
  s(16, 5, T.CHAIR); s(17, 5, T.CHAIR);

  // Roulette
  s(12, 8, T.ROUL); s(13, 8, T.ROUL);
  s(12, 9, T.ROUL); s(13, 9, T.ROUL);
  s(11, 8, T.CHAIR); s(14, 8, T.CHAIR);
  s(11, 9, T.CHAIR); s(14, 9, T.CHAIR);
  // Blackjack row 2
  s(16, 8, T.BJACK); s(17, 8, T.BJACK);
  s(16, 9, T.CHAIR); s(17, 9, T.CHAIR);

  // Poker table row 3
  s(12, 12, T.POKER); s(13, 12, T.POKER);
  s(12, 13, T.POKER); s(13, 13, T.POKER);
  s(11, 12, T.CHAIR); s(14, 12, T.CHAIR);
  s(11, 13, T.CHAIR); s(14, 13, T.CHAIR);
  // Blackjack row 3
  s(16, 12, T.BJACK); s(17, 12, T.BJACK);
  s(16, 13, T.CHAIR); s(17, 13, T.CHAIR);

  // Plants between table rows
  s(10, 7, T.PLANT); s(18, 7, T.PLANT);
  s(10, 11, T.PLANT); s(18, 11, T.PLANT);
  s(15, 7, T.PLANT);

  // === RIGHT: PRIZE COUNTER (cols 19-20) ===
  fill(19, 3, 2, 1, T.BAR);
  // Prize cases on right wall
  for (let r = 0; r < 6; r++) s(20, 4 + r * 2, T.PRIZE);
  s(20, 16, T.PRIZE);

  // === BOTTOM DECORATIONS (row 16) ===
  s(1, 16, T.PLANT); s(9, 16, T.PLANT);
  s(18, 16, T.PLANT);

  // Bottom wall deco
  s(3, 16, T.LAMP); s(7, 16, T.CLUB); s(14, 16, T.LAMP);

  // === ENTRANCE (bottom wall) ===
  s(10, 17, T.DOOR); s(11, 17, T.DOOR);

  return m;
}
