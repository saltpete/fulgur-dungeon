// ============================================================
// Map-Gen.js · Generierung der Level
// ============================================================



// Zufallsgenerator mit Seed


function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // 32-bit
    };
}
// Rauschen mit Schwelle: Jede Kachel wird mit Wahrscheinlichkeit wallChance Wand.
// Die Höhlen entstehen erst danach beim Glätten.
const WALL_CHANCE = 0.45;        // normale Ebene: 45 % Wand vor dem Glätten
const BOSS_WALL_CHANCE = 0.35;   // Bossebene: weniger Wand, mehr Boden

function fillRandom(rng, wallChance) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (x < 2 || y < 2 || x >= COLS - 2 || y >= ROWS - 2) map[y][x] = 1;   // Rand 2 Kacheln dick: HUD und wallRow
      else map[y][x] = rng() < wallChance ? 1 : 0;                         // sonst Zufall: Wand oder Boden
    }
  }
}

// 4-5-Regel (RogueBasin): Wand, wenn im 3x3-Block mindestens 5 Wände liegen. Das Feld selbst zählt mit.
function smooth45() {
  const next = map.map(row => row.slice());
  for (let y = 2; y < ROWS - 2; y++) {          // der Rand bleibt Wand
    for (let x = 2; x < COLS - 2; x++) {
      let walls = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (map[y + dy][x + dx] === 1) walls++;
        }
      }
      next[y][x] = walls >= 5 ? 1 : 0;
    }
  }
  for (let y = 0; y < ROWS; y++) map[y] = next[y];   // neue Reihen übernehmen
}

// Breitensuche ab (sx, sy). steps[y][x] = Schritte ab dem Start, -1 heisst nicht erreichbar.
// cells = alle erreichten Felder, sortiert nach Abstand. Das letzte ist das weiteste.

function floodFill(sx, sy, blocked = isWall) {   // blocked: was als Hindernis gilt, Standard nur Wände
  const steps = map.map(row => row.map(() => -1));
  const cells = [[sx, sy]];
  steps[sy][sx] = 0;
  for (let i = 0; i < cells.length; i++) {                         // cells ist zugleich die Warteschlange
    const [x, y] = cells[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {   // 4 Nachbarn: der Held läuft nicht diagonal
      const nextX = x + dx, nextY = y + dy;
      if (!blocked(nextX, nextY) && steps[nextY][nextX] === -1) {
        steps[nextY][nextX] = steps[y][x] + 1;
        cells.push([nextX, nextY]);
      }
    }
  }
  return { steps, cells };
}
const MIN_AREA = 0.4;   // Fläche des Helden mindestens 40 % der Innenfläche
const MIN_PATH = 20;    // Weg vom Held zur Treppe mindestens 20 Schritte

// Erzeugen und prüfen (PVA 4.5): Seeds der Reihe nach, bis eine Karte beide Prüfungen besteht.
// Bleibt reproduzierbar: Ein Seed scheitert immer gleich und landet immer beim selben Ersatz.
function generateMap(seed, wallChance) {
  const inner = (COLS - 4) * (ROWS - 4);   // Fläche ohne den Rand
  for (let s = seed; s < seed + 1000; s++) {
    const rng = mulberry32(s);
    fillRandom(rng, wallChance);
    for (let i = 0; i < 4; i++) smooth45();   // viermal glätten wie in PVA 4.4

    // alle Bodenfelder sammeln, der Held kommt auf eines davon
    const floor = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (map[y][x] === 0) floor.push([x, y]);
      }
    }
    if (floor.length === 0) continue;
    const hero = floor[Math.floor(rng() * floor.length)];

    // Breitensuche ab dem Held. Das letzte Feld ist das weiteste, dort kommt die Treppe hin
    const fromHero = floodFill(...hero);
    const stairs = fromHero.cells[fromHero.cells.length - 1];

    // Prüfen: Weg zu kurz oder Fläche zu klein? Dann nächster Seed
    const way = fromHero.steps[stairs[1]][stairs[0]];
    if (way < MIN_PATH || fromHero.cells.length < MIN_AREA * inner) continue;

    // Bestanden: Was der Held nicht erreicht, wird Wand
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (fromHero.steps[y][x] === -1) map[y][x] = 1;
      }
    }
    return { rng, hero, stairs, fromHero };   // rng läuft für die Objekte weiter, so hängen auch sie am Seed
  }
  return null;   // nach 1000 Versuchen keine Karte, kam im Test nie vor
}


// Objekte setzen: Treppe, Kiste, Ork, Schleim - Anzahl dirigieren. Treppe am weitesten Punkt vom Start. 
const MIN_STEPS = 11;     // Gegner starten mindestens 11 Schritte vom Held entfernt
const CRATE_COUNT = 3;    // Anzahl Kisten, später entscheidet der Director (Block 5)

// Gegner mit Budget (PVA 4.2): Je tiefer die Ebene, desto grösser das Budget, desto mehr Gegner
// Die Gegnerarten und ihre Preise stehen in ENEMY_TYPES (world.js)

function enemyWave(depth, rng) {
  let budget = Math.min(4 + depth, 20);   // höchstens 20, sonst wird die Karte zu voll
  const list = [];
  while (true) {
    const fitting = Object.keys(ENEMY_TYPES).filter(k => ENEMY_TYPES[k].cost <= budget);   // wer passt noch ins Restbudget?
    if (fitting.length === 0) break;                         // keiner mehr: Welle fertig
    const kind = fitting[Math.floor(rng() * fitting.length)];
    list.push(kind);
    budget -= ENEMY_TYPES[kind].cost;
  }
  return list;
}


// Gibt ein Objekt zurück, das gleich aufgebaut ist wie LEVEL
function generateLevel(seed, depth) {
  const wallChance = isBossLevel(depth) ? BOSS_WALL_CHANCE : WALL_CHANCE;
  const { rng, hero, stairs, fromHero } = generateMap(seed, wallChance);
  const area = fromHero.cells;   // alle Felder, die der Held erreicht
  const key = ([x, y]) => y * COLS + x;                         // ein Feld als eine Zahl, für das Set
  const taken = new Set();                                      // schon belegte Felder
  const pick = list => list[Math.floor(rng() * list.length)];   // zufälliges Feld, hängt am Seed

  // freies Feld aus list nehmen. Ist list voll, irgendein freies Feld der Fläche
  function place(list) {
    let free = list.filter(c => !taken.has(key(c)));
    if (free.length === 0) free = area.filter(c => !taken.has(key(c)));
    const c = pick(free);
    taken.add(key(c));
    return c;
  }

  // Held und Treppe kommen schon aus generateMap, ihre Felder sind belegt
  taken.add(key(hero));
  taken.add(key(stairs));
  map[stairs[1]][stairs[0]] = 2;   // die Karte zeichnet die Treppe, makeStairs löst den Wechsel aus

  // Gegner starten nur auf Feldern mit Mindestabstand zum Held
  const far = fromHero.cells.filter(([x, y]) => fromHero.steps[y][x] >= MIN_STEPS);
  const enemies = [];
  for (const kind of enemyWave(depth, rng)) {   // so viele Gegner, wie das Budget hergibt
    const [col, row] = place(far);
    enemies.push({ kind, col, row });
  }

  // Kisten nur mitten in einen Raum (alle 4 Nachbarn Boden)
  const open = area.filter(([x, y]) =>
    !isWall(x - 1, y) && !isWall(x + 1, y) && !isWall(x, y - 1) && !isWall(x, y + 1));
  const crates = [];
  for (let i = 0; i < CRATE_COUNT; i++) crates.push(place(open));

  return { hero, stairs, enemies, crates };
}

// Welt benutzen.

// Ebene 1 bleibt die Handkarte. Nach einem Tod muss sie zurück in map.
// TODO: Seedstart einbauen, dafür jedoch Seedeingabe im Menü, sonst ist es nicht reproduzierbar
function useLevel1() {
  for (let y = 0; y < ROWS; y++) map[y] = LEVEL1_MAP[y].slice();
  return LEVEL;
}

// Grösster Seed: 6 Ziffern wie im Seed-Feld
const MAX_SEED = 999999;

// Seed für einen neuen Durchlauf: aus dem Seed-Feld, sonst aus Index-HTML-Feld, sonst zufällig
function newRunSeed() {
  const typed = document.getElementById('seed').value.trim();   // Seed-Feld über dem Spielfeld
  const fixed = typed !== '' ? typed : new URLSearchParams(location.search).get('seed');

  const seed = parseInt(fixed, 10);                    // leer, null oder Buchstaben: NaN

  if (seed >= 0 && seed <= MAX_SEED) return seed;      // NaN besteht keinen Vergleich
  return Math.floor(Math.random() * (MAX_SEED + 1));   // sonst Zufall: nur der Startwert ist zufällig, alles andere folgt daraus
}


// Alle 5 Level: Bossraum --> Grössere Flächenotwendig -> Anderes Tilesets für Stimmung? 

function isBossLevel(depth) {
  return depth % 5 === 0;
}




// In frame() direkt nach drawMap() aufrufen: färbt nur die Karte, die Figuren kommen danach
function drawMood() {
  if (!isBossLevel(game.depth)) return;
  ctx.fillStyle = 'rgba(140, 20, 20, 0.18)';
  ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);
}


