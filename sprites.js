// ============================================================
// sprites.js · Pixelgrafik für die Objekte aus Block 3
// ============================================================

const PALETTE = {
  k: '#1d1720',   // Kontur
  b: '#8b5a2b',   // Holz
  B: '#b07a40',   // Holz hell
  d: '#5e3b1e',   // Holz dunkel
  r: '#b5482b',   // Fass rot
  R: '#7c2a1c',   // Fass rot dunkel
  m: '#aeb6c4',   // Metall hell
  M: '#5b6475',   // Metall dunkel
  y: '#f2c14e',   // Gold
  Y: '#b8862b',   // Gold dunkel
  w: '#fff6d5',   // Glanz
  c: '#cfe8f0',   // Glas
  p: '#e04555',   // Trank rot
  P: '#9c1f33',   // Trank rot dunkel
  s: '#d6dbe4',   // Stachel hell
  S: '#7a8294',   // Stachel dunkel
  g: '#3b3f4c',   // Bodenplatte
  e: '#3a3346',    // leeres Herz
  p: '#e04555',   // Herz rot
  w: '#fff6d5',   // Glanz
  e: '#3a3346',    // leeres Herz
  y: '#f2c14e',   // Gold
  Y: '#b8862b'    // Gold dunkel
};

const PIX = {
  crate: [
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kBBBBBBBBBBBBk.',
    '.kBBddddddddBBk.',
    '.kBdBbbbbbbBdBk.',
    '.kBdbBbbbbBbdBk.',
    '.kBdbbBbbBbbdBk.',
    '.kBdbbbBBbbbdBk.',
    '.kBdbbbBBbbbdBk.',
    '.kBdbbBbbBbbdBk.',
    '.kBdbBbbbbBbdBk.',
    '.kBdBbbbbbbBdBk.',
    '.kBBddddddddBBk.',
    '.kBBBBBBBBBBBBk.',
    '.kkkkkkkkkkkkkk.',
    '................'
  ],
    heart: [
    '.kkk.kkk.',
    'kpppkpwpk',
    'kpppppwpk',
    'kpppppppk',
    '.kpppppk.',
    '..kpppk..',
    '...kpk...',
    '....k....'
  ],
  heartEmpty: [
    '.kkk.kkk.',
    'keeekeeek',
    'keeeeeeek',
    'keeeeeeek',
    '.keeeeek.',
    '..keeek..',
    '...kek...',
    '....k....'
  ],
    coin: [
    '................',
    '................',
    '................',
    '......kkkk......',
    '.....kyyyyk.....',
    '....kywwyyYk....',
    '....kywyyyYk....',
    '....kyyyyyYk....',
    '....kyyyyyYk....',
    '....kyyyyYYk....',
    '.....kYYYYk.....',
    '......kkkk......',
    '................',
    '................',
    '................',
    '................'
  ],
};

// Raster einmal in ein kleines Canvas malen und merken (Cache)
const pixCache = new Map();
function pixImage(art) {
  if (pixCache.has(art)) return pixCache.get(art);
  const c = document.createElement('canvas');
  c.width = art[0].length; c.height = art.length;
  const g = c.getContext('2d');
  art.forEach((line, y) => {
    for (let x = 0; x < line.length; x++) {
      const ch = line[x];
      if (ch === '.') continue;
      g.fillStyle = PALETTE[ch];
      g.fillRect(x, y, 1, 1);
    }
  });
  pixCache.set(art, c);
  return c;
}

// Zeichnet ein Raster an (x, y), Standard: doppelte Grösse wie die Kacheln
function drawPixel(ctx, art, x, y, scale = SCALE) {
  const img = pixImage(art);
  ctx.drawImage(img, Math.round(x), Math.round(y), img.width * scale, img.height * scale);
}
