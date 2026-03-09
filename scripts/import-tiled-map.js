#!/usr/bin/env node
// Import a Tiled JSON map back into map.ts gameMap array.
// Usage: node scripts/import-tiled-map.js [path-to-tiled.json]
// Default: client/public/maps/overworld.json

const fs = require("fs");
const path = require("path");

const tiledPath = process.argv[2] || path.join(__dirname, "../client/public/maps/overworld.json");
const mapTsPath = path.join(__dirname, "../client/src/game/map.ts");

// TileType enum (must match tiles.ts)
const TileType = {
  GRASS: 0, PATH: 1, WATER: 2, TREE_TRUNK: 3, TREE_TOP: 4,
  WALL: 5, ROOF: 6, DOOR: 7, FENCE: 8, FLOWER_RED: 9,
  FLOWER_BLUE: 10, CROP: 11, ROCK: 12, BRIDGE: 13,
  DARK_GRASS: 14, SAND: 15, ROOF_RED: 16, WINDOW: 17,
  STALL: 18, CHEST: 19, SIGN: 20, TALL_GRASS: 21,
  WATER_EDGE: 22, MUSHROOM: 23, BENCH: 24, LAMP: 25,
  CASINO_WALL: 26, CASINO_ROOF: 27, CASINO_DOOR: 28,
  NEON_PINK: 29, NEON_BLUE: 30, CASINO_FLOOR: 31,
  TORII: 32, LANTERN: 33, BAMBOO: 34, CASINO_WINDOW: 35,
  CASINO_UPPER: 36, CASINO_MARQUEE: 37, CASINO_PILLAR: 38,
  CASINO_AWNING: 39, CASINO_DISPLAY: 40, CASINO_BRICK: 41,
  STREET_LAMP: 42, SIDEWALK: 43,
};

// Alias map: TileType value -> short alias used in map.ts
const aliasForType = {
  0: "G", 1: "P", 2: "W", 3: "t", 4: "TT",
  5: "w", 6: "T.ROOF", 7: "D", 8: "F", 9: "f",
  10: "b", 11: "C", 12: "R", 13: "B", 14: "d",
  15: "S", 16: "rr", 17: "wi", 18: "st", 19: "ch",
  20: "si", 21: "tg", 22: "we", 23: "mu", 24: "be",
  25: "la", 26: "cw", 27: "cr", 28: "cd", 29: "np",
  30: "nb", 31: "cf", 32: "to", 33: "ln", 34: "ba",
  35: "xw", 36: "cu", 37: "cm", 38: "cp", 39: "ca",
  40: "cx", 41: "cb", 42: "sl", 43: "sw",
};

// Read Tiled JSON
const tiled = JSON.parse(fs.readFileSync(tiledPath, "utf-8"));
const layer = tiled.layers.find(l => l.type === "tilelayer");
if (!layer) {
  console.error("No tile layer found in Tiled JSON");
  process.exit(1);
}

const width = layer.width || tiled.width;
const height = layer.height || tiled.height;
const data = layer.data;

console.log(`Importing ${width}x${height} map from ${tiledPath}`);

// Convert Tiled data (1-based) back to 0-based tile IDs
const rows = [];
for (let y = 0; y < height; y++) {
  const row = [];
  for (let x = 0; x < width; x++) {
    const tiledId = data[y * width + x];
    row.push(Math.max(0, tiledId - 1)); // Tiled is 1-based
  }
  rows.push(row);
}

// Generate the gameMap array source code
function formatRow(row, rowIdx) {
  const cells = row.map(v => {
    const alias = aliasForType[v];
    if (alias) return alias.padStart(2, " ").padEnd(3, " ");
    return String(v).padStart(2, " ").padEnd(3, " ");
  });
  const rowStr = "[ " + cells.join(",") + " ]";
  return rowStr;
}

// Build column header
const colHeader = "// " + Array.from({ length: width }, (_, i) =>
  String(i).padStart(2, " ").padEnd(4, " ")
).join("");

let mapArraySrc = `export const gameMap: number[][] = [\n${colHeader}\n`;
for (let y = 0; y < height; y++) {
  mapArraySrc += formatRow(rows[y], y);
  mapArraySrc += y < height - 1 ? ",\n" : "\n";
}
mapArraySrc += "];";

// Read existing map.ts
let mapTs = fs.readFileSync(mapTsPath, "utf-8");

// Update MAP_WIDTH and MAP_HEIGHT
mapTs = mapTs.replace(
  /export const MAP_WIDTH\s*=\s*\d+/,
  `export const MAP_WIDTH = ${width}`
);
mapTs = mapTs.replace(
  /export const MAP_HEIGHT\s*=\s*\d+/,
  `export const MAP_HEIGHT = ${height}`
);

// Replace the gameMap array
const mapRegex = /export const gameMap:\s*number\[\]\[\]\s*=\s*\[[\s\S]*?\];/;
mapTs = mapTs.replace(mapRegex, mapArraySrc);

fs.writeFileSync(mapTsPath, mapTs);
console.log(`Updated ${mapTsPath}`);
console.log(`Map size: ${width}x${height}`);
console.log("Done! Run your dev server to see changes.");
