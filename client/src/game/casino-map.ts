import { TileType as T } from "./tiles";
import { NPC } from "./map";

// Shorthand aliases
const cc = T.CASINO_CARPET;
const ct = T.CASINO_TABLE;
const sm = T.SLOT_MACHINE;
const cb = T.CASINO_BAR;
const cs = T.CASINO_STOOL;
const ce = T.CASINO_EXIT;
const cr = T.CASINO_RUG;
const co = T.CASINO_COLUMN;
const ck = T.CASINO_CHIP_RACK;
const cv = T.CASINO_VELVET;
const cw = T.CASINO_WALL;
const ln = T.LANTERN;
const np = T.NEON_PINK;
const nb = T.NEON_BLUE;
const st = T.CASINO_STAIRS;

export const CASINO_MAP_WIDTH = 30;
export const CASINO_MAP_HEIGHT = 20;

// 30x20 compact casino interior
export const casinoMap: number[][] = [
// Row 0 — top wall with stairs entrance
  [ cw, cw, cw, np, cw, cw, cw, cw, cw, cw, cw, cw, cw, st, st, st, st, cw, cw, cw, cw, cw, cw, cw, cw, cw, np, cw, cw, cw ],
// Row 1 — bar + cashier + stairs area
  [ cw, cb, cb, cb, cb, cb, cw, ln, cc, cc, cc, cc, cv, cc, cc, cc, cv, cc, cc, cc, cc, cc, ln, cw, cb, cb, cb, cb, ck, cw ],
// Row 2 — bar stools
  [ cw, cs, cc, cs, cc, cs, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cs, cc, cs, cc, cs, cw ],
// Row 3 — open floor + columns
  [ np, cc, cc, cc, cc, cc, co, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, co, cc, cc, cc, cc, cc, nb ],
// Row 4 — slot machines
  [ cw, cc, sm, cc, sm, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, sm, cc, sm, cc, cw ],
// Row 5 — rug top + tables start
  [ cw, cc, cc, cc, cc, cc, cr, cr, cr, cr, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cr, cr, cr, cr, cc, cc, cc, cc, cc, cw ],
// Row 6 — COIN TOSS tables (left) + PRICE PREDICTION tables (right)
  [ cw, cc, cc, ct, ct, cc, cr, cc, ln, cr, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cr, ln, cc, cr, cc, ct, ct, cc, cc, cw ],
// Row 7 — tables row 2
  [ np, cc, cc, ct, ct, cc, cr, cc, cc, cr, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cr, cc, cc, cr, cc, ct, ct, cc, cc, nb ],
// Row 8 — rug bottom
  [ cw, cc, cc, cc, cc, cc, cr, cr, cr, cr, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cr, cr, cr, cr, cc, cc, cc, cc, cc, cw ],
// Row 9 — open floor
  [ cw, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cw ],
// Row 10 — VIP rug top
  [ cw, cc, cc, cc, cc, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cc, cc, cc, cc, cw ],
// Row 11 — VIP tables
  [ np, cc, cc, cc, cc, cr, cc, cc, ct, ct, cc, cc, ln, cc, cc, cc, cc, ln, cc, cc, ct, ct, cc, cc, cr, cc, cc, cc, cc, nb ],
// Row 12 — VIP rug bottom
  [ cw, cc, cc, cc, cc, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cr, cc, cc, cc, cc, cw ],
// Row 13 — open floor + columns
  [ cw, cc, sm, cc, cc, cc, co, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, co, cc, cc, cc, sm, cc, cw ],
// Row 14 — open floor
  [ cw, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cw ],
// Row 15 — velvet ropes
  [ np, cc, cc, cc, cc, cc, cv, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cv, cc, cc, cc, cc, cc, nb ],
// Row 16 — lanterns near entrance
  [ cw, ln, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, ln, cw ],
// Row 17 — entrance hallway with exit
  [ cw, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, ce, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cw ],
// Row 18 — open floor near exit
  [ cw, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cc, cw ],
// Row 19 — bottom wall
  [ cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw, cw ],
];

// Casino interior NPCs — positions scaled to 30x20 map
export const casinoNpcs: NPC[] = [
  {
    x: 4 * 32 + 8,
    y: 7 * 32 + 8,
    name: "Coin Toss Dealer",
    dialogue: [
      "Welcome to the Coin Toss table!",
      "Call heads or tails. Double or nothing.",
      "Simple rules. Pure luck. Big payouts.",
      "Place your bet when you're ready.",
    ],
    color: "#e94560",
    hairColor: "#1a1a2e",
    icon: "🪙",
  },
  {
    x: 26 * 32 + 8,
    y: 7 * 32 + 8,
    name: "Price Dealer",
    dialogue: [
      "This is the Price Prediction table.",
      "A price chart moves in real time.",
      "Bet UP or DOWN on the next candle.",
      "Read the trend. Trust your instincts.",
    ],
    color: "#3498db",
    hairColor: "#2c3e50",
    icon: "📈",
  },
  {
    x: 15 * 32 + 8,
    y: 2 * 32 + 8,
    name: "Bartender Jin",
    dialogue: [
      "Hey there, fresh face! Welcome to the Dragon.",
      "You wanna play? Head to the LEFT side of the floor.",
      "The Coin Toss tables are over there. Can't miss 'em.",
      "Walk up to a green table and press E to start a game.",
      "Win enough coins and the boss might let you try the right side...",
      "That's where the Price Prediction tables are. Big money.",
    ],
    color: "#f39c12",
    hairColor: "#ecf0f1",
    icon: "🍶",
  },
  {
    x: 28 * 32 + 8,
    y: 2 * 32 + 8,
    name: "Cashier Mae",
    dialogue: [
      "Need chips? I handle all exchanges here.",
      "Coins in, chips out. Simple as that.",
      "Come back when your pockets are heavy!",
    ],
    color: "#9b59b6",
    hairColor: "#fdd835",
    icon: "💰",
  },
  {
    x: 15 * 32 + 8,
    y: 11 * 32 + 8,
    name: "VIP Host Rena",
    dialogue: [
      "Welcome to the VIP section, high roller.",
      "These tables have higher limits...",
      "Only the best players make it here.",
      "Prove yourself and unlock AI Agents.",
    ],
    color: "#e91e63",
    hairColor: "#fdd835",
    icon: "👑",
  },
  {
    x: 12 * 32 + 8,
    y: 2 * 32 + 8,
    name: "Bouncer Kaz",
    dialogue: ["..."],
    color: "#2c3e50",
    hairColor: "#1a1a1a",
    icon: "🚫",
  },
  {
    x: 10 * 32 + 8,
    y: 15 * 32 + 8,
    name: "Gambler Ryo",
    dialogue: [
      "Psst... wanna know a secret?",
      "The Price Prediction table... it's not random.",
      "If you study the patterns, you can win big.",
      "Don't tell anyone I told you that.",
    ],
    color: "#607d8b",
    hairColor: "#455a64",
    icon: "🤫",
  },
];

// Tile interactions inside the casino
export const casinoTileInteractions: Record<number, string[]> = {
  [T.CASINO_TABLE]: [
    "A green felt table with chips stacked high.",
    "The game awaits... step closer to play.",
  ],
  [T.SLOT_MACHINE]: [
    "A classic slot machine — three reels of fortune.",
    "Insert a coin to try your luck!",
  ],
  [T.CASINO_CHIP_RACK]: [
    "Stacks of red, green, and gold chips.",
    "Exchange your coins here.",
  ],
  [T.CASINO_EXIT]: [
    "The exit back to Fortune Falls.",
    "Leaving so soon?",
  ],
  [T.CASINO_STAIRS]: [
    "Stairs to the upper floor.",
    "Only high rollers with 5000+ points may enter.",
  ],
};
