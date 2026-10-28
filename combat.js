// ==========================
// combat.js · Kampf: Trefferpunkte, Schaden, Invinzibilität
// ==========================

// Komponente Health: Zählt die Schutzzeit (invuln) jeden Schritt herunter
// Solange invuln > 0, kann die Figur keinen Schaden nehmen.
class Health {
  update(e,dt) {
    e.invuln = Math.max(0,(e.invuln || 0) - dt);
  }
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
            e.swings =  (e.swings || 0) + 1; // frame() lässt das Bild kurz wackeln
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
  if (t && t.hp !== undefined) t.hp= Math.max(0, t.hp - MELEE_DAMAGE); // Schaden zufügen
}
