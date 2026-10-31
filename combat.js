// ==========================
// combat.js · Kampf:  Leben, Schade, Angriff
// ==========================

// Komponente Health: Zählt die Schutzzeit (invuln) jeden Schritt herunter
// Solange invuln > 0, kann die Figur keinen Schaden nehmen.
class Health {
  update(e,dt) {
    e.invuln = Math.max(0,(e.invuln || 0) - dt);
  }
}


// Schaden für alle Treffer. (dcol, drow): Richtung des Treffers, für den Rückstoss.
// Liefert true, wenn der Treffer zählt.
// TODO Trigger Hurt sprites or Death sprites
function damage(t, amount, dcol = 0, drow = 0) {
  if (t.hp <= 0 || t.invuln > 0) return false;   // schon bei 0 oder gerade geschützt
  t.hp = Math.max(0, t.hp - amount);
  t.wasHit = true;                                // der Gegner merkt das beim Wahrnehmen
  burst(t.x + TILE / 2, t.y + TILE / 2, t.hitFx || SPARKS);  // Teilchen je nach Ziel, nur Darstellung
  if (t === player) t.hurts = (t.hurts || 0) + 1; // Screenshake wenn der Held getroffen wird
  t.invuln = t.invulnTime || 0;                   // Schutzzeit, falls die Figur eine hat
  if (t.hp <= 0) die(t);                          // tot: kein Rückstoss mehr, die Beute fällt an Ort und Stelle
  else knockback(t, dcol, drow);
  return true;
}

// Rückstoss: ein Feld in Trefferrichtung, wenn dort frei ist.
// Nutzt dieselbe Kollision wie das Gehen, hält also an Hindernissen an.
function knockback(t, dcol, drow) {
  if (dcol === 0 && drow === 0) return;   // Treffer ohne Richtung, z. B. eine Falle
  tryMove(t, dcol, drow);
}

// Tod: Das Objekt wird nur markiert und erst nach dem Schritt entfernt.
// Beim Tod des Helden wird der Spielstatus verändert
function die(t) {
  if (t === player) {
    game.state = 'dead';   // Spielstatus Tot -> // TODO: Weitere Spielstatusoptionen hinzufügen und Bildschirm entsprechend anpassen (Game Over Screen, Mainmenu, Optionen etc.)
    return;
  }
  t.dead = true;
}

//

const ATTACK_TIME = 0.32 // Zeit, die der Angriff dauert (Animation)
const HIT_AT = 0.12      // nach 0.12 s wird der Schaden ausgelöst, danach noch 0.2 s Animation
const MELEE_DAMAGE = 1   // ein Hieb kostet 1 Trefferpunkt


// Komponente AttackControl: Schwerthieb in Blickrichtung
class AttackControl {
  constructor() {
    this.timer = 0;             // läuft während des Hiebs von ATTACK_TIME herunter
    this.hitDone = true;        // true = Schaden schon ausgelöst, false = noch nicht
    }
    update(e,dt) {
        // Neuer Angriff, wenn noch keiner läuft
        if (input.attack && this.timer <= 0) {
            this.timer = ATTACK_TIME;
            this.hitDone = false;
        }
        // Angriff läuft, Timer runterzählen
        if (this.timer > 0) {
            this.timer -= dt;
            // Schaden auslösen, wenn noch nicht geschehen und Zeit erreicht
            if (!this.hitDone && ATTACK_TIME - this.timer >= HIT_AT) {
                this.hitDone = true;
                meleeHit(e); // Schaden auslösen
            }
        }
        e.attacking = this.timer > 0; // true, solange der Angriff läuft
        e.attackAnim = e.attacking ? 1 - this.timer / ATTACK_TIME : 0 ; // Fortschritt 0 bis 1
    }
}

// Trifft die Zelle vor der Figur, wenn dort ein Gegner steht, bekommt er Schaden.
function meleeHit(e) {
  const [dcol,drow] = DIRV[e.facing];
  const t = blockerAt(e.col + dcol, e.row + drow, e);
  if (t && t.hp !== undefined) damage(t, MELEE_DAMAGE, dcol, drow); 
}


// Fernkampf

//------ Fulgur Blitz -------
const BOLT_SPEED = 480;   // px/s
const BOLT_SIZE = 8;      // Kantenlänge in px
const BOLT_DAMAGE = 1;
const SUBSTEPS = 4;       // Teilsprünge pro Schritt, gegen Tunneln

class Projectile {
  constructor(dcol, drow, speed, owner, amount) {
    this.dcol = dcol;           // Flugrichtung
    this.drow = drow;
    this.speed = speed;         // px/s
    this.owner = owner;         // den eigenen Schützen trifft es nie
    this.amount = amount;       // Schaden
  }
  update(e, dt) {
    for (let i = 0; i < SUBSTEPS; i++) {
      e.x += this.dcol * this.speed * dt / SUBSTEPS;
      e.y += this.drow * this.speed * dt / SUBSTEPS;
      const cx = e.x + e.size / 2, cy = e.y + e.size / 2;           // Mitte des Geschosses
      const col = Math.floor(cx / TILE), row = Math.floor(cy / TILE);
      const wall = isWall(col, row);
      const t = wall ? null : blockerAt(col, row, this.owner);
      if (wall || t) {
        if (t && t.hp !== undefined) damage(t, this.amount, this.dcol, this.drow);
        else burst(cx, cy, SPARKS);                                   // Wand: Funken
        e.dead = true;                                                // removeDead räumt es weg
        return;
      }
    }
  }
}

// Der Blitz startet in der Mitte des Helden, dort wo man ihn gerade sieht
function makeBolt(hero) {
  const [dcol, drow] = DIRV[hero.facing];
  const b = new Entity(hero.col, hero.row);
  b.kind = 'bolt';
  b.size = BOLT_SIZE;
  b.x = b.prevX = hero.x + (TILE - BOLT_SIZE) / 2;
  b.y = b.prevY = hero.y + (TILE - BOLT_SIZE) / 2;
  b.add(new Projectile(dcol, drow, BOLT_SPEED, hero, BOLT_DAMAGE));
  b.draw = (ctx, x, y) => drawPixel(ctx, PIX.bolt, x - 4, y - 4);   // 8 px Raster, doppelt gross, mittig
  return b;
}

// Komponente BoltControl: Fulgur Blitz
class BoltControl {
  constructor(cooldown) {
    this.cooldown = cooldown;   // Sekunden bis zum nächsten Blitz
    this.timer = 0;
  }
  update(e, dt) {
    this.timer = Math.max(0, this.timer - dt);
    e.boltReady = 1 - this.timer / this.cooldown;   // 0 bis 1, für die Anzeige
    if (!input.cast || this.timer > 0 || e.attacking) return;
    this.timer = this.cooldown;
    objects.push(makeBolt(e));
  }
}
