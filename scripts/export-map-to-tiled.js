#!/usr/bin/env node
// Export the current gameMap from map.ts to a Tiled-compatible JSON file.
// Usage: node scripts/export-map-to-tiled.js

const fs = require("fs");
const path = require("path");

// ── Read map.ts and extract the gameMap array ──────────────────────
const mapSrc = fs.readFileSync(
  path.join(__dirname, "../client/src/game/map.ts"),
  "utf-8"
);

// TileType enum values (must match tiles.ts)
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

// Reverse map: id -> name
const idToName = {};
for (const [name, id] of Object.entries(TileType)) {
  idToName[id] = name;
}

// Parse the map array from the source
const mapMatch = mapSrc.match(/export const gameMap:\s*number\[\]\[\]\s*=\s*\[([\s\S]*?)\];/);
if (!mapMatch) {
  console.error("Could not find gameMap in map.ts");
  process.exit(1);
}

// Extract MAP_WIDTH and MAP_HEIGHT
const widthMatch = mapSrc.match(/export const MAP_WIDTH\s*=\s*(\d+)/);
const heightMatch = mapSrc.match(/export const MAP_HEIGHT\s*=\s*(\d+)/);
const MAP_WIDTH = parseInt(widthMatch[1]);
const MAP_HEIGHT = parseInt(heightMatch[1]);

// Build alias-to-value map from the const declarations
const aliasMap = {};
const aliasRegex = /const\s+(\w+)\s*=\s*T\.(\w+)/g;
let m;
while ((m = aliasRegex.exec(mapSrc)) !== null) {
  const alias = m[1];
  const enumName = m[2];
  if (TileType[enumName] !== undefined) {
    aliasMap[alias] = TileType[enumName];
  }
}

// Parse row arrays
const rowRegex = /\[([^\]]+)\]/g;
const mapBody = mapMatch[1];
const rows = [];
while ((m = rowRegex.exec(mapBody)) !== null) {
  const cells = m[1].split(",").map(c => c.trim()).filter(c => c.length > 0);
  const row = cells.map(cell => {
    // Try as alias
    if (aliasMap[cell] !== undefined) return aliasMap[cell];
    // Try as number
    const num = parseInt(cell);
    if (!isNaN(num)) return num;
    // Try as T.SOMETHING
    const tMatch = cell.match(/T\.(\w+)/);
    if (tMatch && TileType[tMatch[1]] !== undefined) return TileType[tMatch[1]];
    console.warn("Unknown tile:", cell);
    return 0;
  });
  rows.push(row);
}

console.log(`Parsed ${rows.length} rows, width ${MAP_WIDTH}`);

// ── Build Tiled JSON ───────────────────────────────────────────────
// Tiled uses 1-based tile IDs (0 = empty). Our tile IDs are 0-based.
// So we offset by +1 for Tiled, and the importer will subtract 1.
const tiledData = rows.flat().map(v => v + 1);

// Create a tileset with one tile per TileType
const maxTileId = Math.max(...Object.values(TileType));
const tilesetTiles = [];
for (let i = 0; i <= maxTileId; i++) {
  const name = idToName[i] || `TILE_${i}`;
  tilesetTiles.push({
    id: i,
    type: name,
  });
}

const tiledJson = {
  compressionlevel: -1,
  height: MAP_HEIGHT,
  infinite: false,
  layers: [
    {
      data: tiledData,
      height: MAP_HEIGHT,
      id: 1,
      name: "Tile Layer 1",
      opacity: 1,
      type: "tilelayer",
      visible: true,
      width: MAP_WIDTH,
      x: 0,
      y: 0,
    },
  ],
  nextlayerid: 2,
  nextobjectid: 1,
  orientation: "orthogonal",
  renderorder: "right-down",
  tiledversion: "1.10.2",
  tileheight: 16,
  tilewidth: 16,
  tilesets: [
    {
      columns: maxTileId + 1,
      firstgid: 1,
      name: "GameTiles",
      tilecount: maxTileId + 1,
      tileheight: 16,
      tilewidth: 16,
      tiles: tilesetTiles,
      // We'll generate a color-coded tileset image
    },
  ],
  type: "map",
  version: "1.10",
  width: MAP_WIDTH,
};

// Write the Tiled JSON
const outPath = path.join(__dirname, "../client/public/maps/overworld.json");
fs.writeFileSync(outPath, JSON.stringify(tiledJson, null, 2));
console.log(`Wrote Tiled map to ${outPath}`);

// ── Generate a color-coded tileset PNG ─────────────────────────────
// Create a simple 16px-per-tile strip image so Tiled can display tiles.
// Each tile is a colored 16x16 block.

const tileColors = {
  0:  [90, 143, 60],    // GRASS - green
  1:  [194, 178, 128],  // PATH - tan
  2:  [64, 100, 180],   // WATER - blue
  3:  [101, 67, 33],    // TREE_TRUNK - brown
  4:  [34, 100, 34],    // TREE_TOP - dark green
  5:  [139, 90, 43],    // WALL - wood brown
  6:  [160, 82, 45],    // ROOF - roof brown
  7:  [80, 50, 20],     // DOOR - dark wood
  8:  [120, 80, 40],    // FENCE - fence brown
  9:  [220, 50, 50],    // FLOWER_RED - red
  10: [50, 100, 220],   // FLOWER_BLUE - blue
  11: [120, 160, 50],   // CROP - yellow-green
  12: [128, 128, 128],  // ROCK - grey
  13: [160, 120, 60],   // BRIDGE - bridge brown
  14: [70, 110, 50],    // DARK_GRASS - darker green
  15: [220, 200, 150],  // SAND - sand
  16: [180, 50, 40],    // ROOF_RED - red roof
  17: [100, 150, 200],  // WINDOW - light blue
  18: [150, 100, 50],   // STALL - stall brown
  19: [200, 180, 50],   // CHEST - gold
  20: [180, 140, 80],   // SIGN - sign
  21: [80, 130, 60],    // TALL_GRASS - tall grass green
  22: [140, 170, 200],  // WATER_EDGE - light water
  23: [180, 120, 60],   // MUSHROOM - mushroom
  24: [130, 90, 50],    // BENCH - bench wood
  25: [200, 200, 100],  // LAMP - lamp yellow
  26: [40, 40, 60],     // CASINO_WALL - dark
  27: [60, 20, 80],     // CASINO_ROOF - purple
  28: [200, 50, 80],    // CASINO_DOOR - neon red
  29: [255, 50, 150],   // NEON_PINK - pink
  30: [50, 150, 255],   // NEON_BLUE - blue neon
  31: [80, 40, 40],     // CASINO_FLOOR - dark red
  32: [200, 50, 30],    // TORII - red
  33: [250, 200, 50],   // LANTERN - lantern
  34: [100, 160, 80],   // BAMBOO - bamboo green
  35: [60, 60, 100],    // CASINO_WINDOW
  36: [50, 50, 70],     // CASINO_UPPER
  37: [255, 200, 50],   // CASINO_MARQUEE - gold
  38: [100, 80, 60],    // CASINO_PILLAR
  39: [180, 50, 50],    // CASINO_AWNING
  40: [70, 200, 200],   // CASINO_DISPLAY - cyan
  41: [150, 80, 60],    // CASINO_BRICK
  42: [180, 180, 150],  // STREET_LAMP
  43: [170, 170, 160],  // SIDEWALK - grey
};

// Generate a simple PNG (uncompressed)
const { createTilesetPNG } = (() => {
  function createTilesetPNG(tileCount, tileSize, colorMap) {
    const width = tileCount * tileSize;
    const height = tileSize;

    // Build raw RGBA pixel data
    const raw = Buffer.alloc((width * 4 + 1) * height); // +1 for filter byte per row
    for (let y = 0; y < height; y++) {
      const rowOffset = y * (width * 4 + 1);
      raw[rowOffset] = 0; // no filter
      for (let tileIdx = 0; tileIdx < tileCount; tileIdx++) {
        const color = colorMap[tileIdx] || [200, 200, 200];
        for (let tx = 0; tx < tileSize; tx++) {
          const x = tileIdx * tileSize + tx;
          const px = rowOffset + 1 + x * 4;
          // Add a 1px dark border on edges for visibility
          const border = tx === 0 || tx === tileSize - 1 || y === 0 || y === tileSize - 1;
          raw[px] = border ? Math.max(0, color[0] - 40) : color[0];
          raw[px + 1] = border ? Math.max(0, color[1] - 40) : color[1];
          raw[px + 2] = border ? Math.max(0, color[2] - 40) : color[2];
          raw[px + 3] = 255;
        }
      }
    }

    // Build PNG
    const zlib = require("zlib");
    const deflated = zlib.deflateSync(raw);

    function crc32(buf) {
      let c = ~0;
      for (let i = 0; i < buf.length; i++) {
        c ^= buf[i];
        for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
      return (~c) >>> 0;
    }

    function chunk(type, data) {
      const len = Buffer.alloc(4);
      len.writeUInt32BE(data.length);
      const typeAndData = Buffer.concat([Buffer.from(type), data]);
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(crc32(typeAndData));
      return Buffer.concat([len, typeAndData, crc]);
    }

    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // RGBA
    ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

    return Buffer.concat([
      sig,
      chunk("IHDR", ihdr),
      chunk("IDAT", deflated),
      chunk("IEND", Buffer.alloc(0)),
    ]);
  }
  return { createTilesetPNG };
})();

const tileCount = maxTileId + 1;
const png = createTilesetPNG(tileCount, 16, tileColors);
const tilesetPath = path.join(__dirname, "../client/public/maps/gametiles.png");
fs.writeFileSync(tilesetPath, png);
console.log(`Wrote tileset image to ${tilesetPath} (${tileCount} tiles)`);

// Update the JSON to reference the tileset image
tiledJson.tilesets[0].image = "gametiles.png";
tiledJson.tilesets[0].imageheight = 16;
tiledJson.tilesets[0].imagewidth = tileCount * 16;
fs.writeFileSync(outPath, JSON.stringify(tiledJson, null, 2));
console.log("Updated JSON with tileset image reference");
console.log("\nOpen overworld.json in Tiled to edit the map!");
console.log("Each colored tile = one TileType. Hover to see the type name.");
