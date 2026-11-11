// Tiere: Platzierung, Verhalten (scheu!) und Bewegung.
import * as THREE from 'three';
import { hoeheBei, neigungBei, flussAbstand, imAreal, SPIELRADIUS } from './gelaende.js';
import { versteckplaetze } from './natur.js';
import { TIERARTEN } from './daten.js';
import { BAUER } from './modelle.js';

const V = new THREE.Vector3();
const V2 = new THREE.Vector3();

function zufallGeber(saat) {
  let s = saat | 0;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}
const zuf = zufallGeber(770411);

function passtLebensraum(art, x, z) {
  const h = hoeheBei(x, z), n = neigungBei(x, z), d = flussAbstand(x, z);
  switch (art) {
    case 'fels': return h > 11 || n > 0.5;
    case 'hang': return h > 4 && h < 26;
    case 'wiese': return h > 1.5 && h < 15 && n < 0.38 && d > 8;
    case 'busch': return h > 1 && h < 20 && d > 4;
    case 'bach': return d > 1.8 && d < 6.5 && h > -2;
    case 'luft': return true;
    default: return true;
  }
}

function zufallsOrt(art, weitVon = null, minAbstand = 0) {
  for (let i = 0; i < 400; i++) {
    const w = zuf() * Math.PI * 2;
    const r = Math.sqrt(zuf()) * (SPIELRADIUS - 6);
    const x = Math.cos(w) * r, z = Math.sin(w) * r;
    if (!passtLebensraum(art, x, z)) continue;
    if (weitVon && Math.hypot(x - weitVon.x, z - weitVon.z) < minAbstand) continue;
    return new THREE.Vector3(x, hoeheBei(x, z), z);
  }
  return new THREE.Vector3(0, hoeheBei(0, 0), 0);
}

function nahesVersteck(von, art, wegVon) {
  let best = null, bestWert = Infinity;
  for (const vp of versteckplaetze) {
    if (vp.art !== art && !(art === 'fels' && vp.art === 'spalte')) continue;
    const d = von.distanceTo(vp.pos);
    if (d > 40) continue;
    let wert = d;
    if (wegVon) {
      // Verstecke hinter dem Tier (weg vom Kind) sind besser
      const nachSpieler = V.copy(wegVon).sub(von).setY(0).normalize();
      const nachVersteck = V2.copy(vp.pos).sub(von).setY(0).normalize();
      wert += nachSpieler.dot(nachVersteck) * 25;
    }
    if (wert < bestWert) { bestWert = wert; best = vp; }
  }
  return best;
}

export class Tier {
  constructor(art, nummer) {
    this.art = art;
    this.nummer = nummer;
    this.modell = BAUER[art.id]();
    this.wurzel = new THREE.Group();
    this.neige = new THREE.Group();
    this.wurzel.add(this.neige);
    this.neige.add(this.modell.gruppe);
    this.flieger = !!this.modell.flieger;

    // großzügige Klickkugel, damit Kinder treffen
    const treffer = new THREE.Mesh(
      new THREE.SphereGeometry(this.modell.hitRadius, 10, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    treffer.position.y = this.modell.hitHoehe;
    treffer.userData.tier = this;
    this.wurzel.add(treffer);
    this.treffer = treffer;

    const start = zufallsOrt(art.lebensraum, new THREE.Vector3(0, 0, 0), 22);
    this.pos = start.clone();
    this.ziel = zufallsOrt(art.lebensraum);
    this.blick = zuf() * 6.28;
    this.zustand = 'ruhen';
    this.zustandZeit = 0;
    this.ruhigZeit = 0;
    this.phase = zuf() * 6.28;
    this.tempo = 0;
    this.gefunden = false;
    this.sichtbar = true;
    this.versteckDauer = 0;
    this.flughoehe = 18 + zuf() * 14;
    this.kreisWinkel = zuf() * 6.28;
    this.kreisMitte = new THREE.Vector3(zuf() * 60 - 30, 0, zuf() * 60 - 30);
    this.tiefflug = 6 + zuf() * 8;
    this.wurzel.position.copy(this.pos);
  }

  neuesZiel(spieler) {
    this.ziel = zufallsOrt(this.art.lebensraum, spieler, this.art.radiusWachsam);
  }

  zeigeDich(an) {
    if (this.sichtbar === an) return;
    this.sichtbar = an;
    this.modell.gruppe.visible = an;
    this.treffer.visible = an;
  }

  /* ---- Zustandswechsel ---- */
  setze(zustand) {
    if (this.zustand === zustand) return;
    this.zustand = zustand;
    this.zustandZeit = 0;
  }

  aktualisiere(dt, spielerPos, alleTiere) {
    const a = this.art;
    this.zustandZeit += dt;
    this.phase += dt;
    const abstand = Math.hypot(this.pos.x - spielerPos.x, this.pos.z - spielerPos.z);
    const hoehenAbstand = Math.abs(this.pos.y - spielerPos.y);
    const naehe = Math.hypot(abstand, hoehenAbstand * 0.6);

    if (this.flieger) { this.adlerLogik(dt, spielerPos, naehe); this.setzeHaltung(dt); return; }

    /* ---------- versteckt ---------- */
    if (this.zustand === 'versteckt') {
      this.versteckDauer -= dt;
      if (this.versteckDauer <= 0 && naehe > 14) {
        const neu = zufallsOrt(a.lebensraum, spielerPos, Math.max(26, a.radiusWachsam));
        this.pos.copy(neu);
        this.wurzel.position.copy(neu);
        this.ziel = zufallsOrt(a.lebensraum, spielerPos, a.radiusWachsam);
        this.zeigeDich(true);
        this.setze('ruhen');
      }
      this.setzeHaltung(dt);
      return;
    }

    /* ---------- Gefahr einschätzen ---------- */
    if (naehe < a.radiusVerstecken && this.zustand !== 'verstecken') {
      const vp = nahesVersteck(this.pos, a.versteckArt, spielerPos);
      if (vp) { this.versteckZiel = vp; this.setze('verstecken'); }
      else this.setze('fliehen');
      this.alarmiereGruppe(alleTiere);
    } else if (naehe < a.radiusFlucht && this.zustand !== 'fliehen' && this.zustand !== 'verstecken') {
      if (this.art.id === 'schneehase' && this.zustand === 'ducken' && naehe > a.radiusFlucht * 0.6) {
        // Hase bleibt noch flach liegen
      } else {
        this.setze('fliehen');
        this.fluchtZiel = this.fluchtRichtung(spielerPos);
        this.alarmiereGruppe(alleTiere);
      }
    } else if (naehe < a.radiusWachsam && (this.zustand === 'ruhen' || this.zustand === 'wandern')) {
      this.setze(this.art.id === 'schneehase' ? 'ducken' : 'wachsam');
    }

    if (naehe > a.radiusWachsam * 1.25) this.ruhigZeit += dt; else this.ruhigZeit = 0;

    /* ---------- Zustände ausführen ---------- */
    switch (this.zustand) {
      case 'ruhen':
        this.tempo = 0;
        if (this.zustandZeit > a.ruheZeit[0] + zuf() * (a.ruheZeit[1] - a.ruheZeit[0])) {
          this.neuesZiel(spielerPos);
          this.setze('wandern');
        }
        break;
      case 'wandern': {
        const fertig = this.geheZu(this.ziel, a.tempoGehen, dt);
        if (fertig || this.zustandZeit > 30) this.setze('ruhen');
        break;
      }
      case 'wachsam':
        this.tempo = 0;
        this.blickZu(spielerPos, dt, 2.5);
        if (this.ruhigZeit > 2.5) this.setze('ruhen');
        break;
      case 'ducken':
        this.tempo = 0;
        this.blickZu(spielerPos, dt, 1.2);
        if (this.ruhigZeit > 3) this.setze('ruhen');
        break;
      case 'fliehen': {
        if (!this.fluchtZiel || this.zustandZeit % 2.4 < dt) this.fluchtZiel = this.fluchtRichtung(spielerPos);
        const da = this.geheZu(this.fluchtZiel, a.tempoFlucht, dt);
        if (da) this.fluchtZiel = this.fluchtRichtung(spielerPos);
        if (this.ruhigZeit > a.ruhigNach * 0.4 || this.zustandZeit > 18) {
          this.setze('wachsam');
        }
        break;
      }
      case 'verstecken': {
        const ziel = this.versteckZiel ? this.versteckZiel.pos : this.fluchtRichtung(spielerPos);
        const da = this.geheZu(ziel, a.tempoFlucht * 0.95, dt);
        if (da) {
          this.zeigeDich(false);
          this.versteckDauer = 12 + zuf() * 16;
          this.setze('versteckt');
        } else if (this.zustandZeit > 14) {
          this.setze('fliehen');
        }
        break;
      }
    }
    this.setzeHaltung(dt);
  }

  alarmiereGruppe(alleTiere) {
    if (!this.art.gruppenalarm && !['gaemse', 'alpendohle'].includes(this.art.id)) return;
    for (const t of alleTiere) {
      if (t === this || t.art.id !== this.art.id) continue;
      if (t.zustand === 'versteckt' || t.zustand === 'fliehen' || t.zustand === 'verstecken') continue;
      if (t.pos.distanceTo(this.pos) < 45) {
        t.setze('fliehen');
        t.fluchtZiel = null;
      }
    }
  }

  fluchtRichtung(spielerPos) {
    const weg = V.set(this.pos.x - spielerPos.x, 0, this.pos.z - spielerPos.z);
    if (weg.lengthSq() < 0.01) weg.set(1, 0, 0);
    weg.normalize();
    const streu = (zuf() - 0.5) * 0.9;
    const c = Math.cos(streu), s = Math.sin(streu);
    const dx = weg.x * c - weg.z * s, dz = weg.x * s + weg.z * c;
    const weite = 22 + zuf() * 16;
    let x = this.pos.x + dx * weite, z = this.pos.z + dz * weite;
    // im Areal bleiben
    const r = Math.hypot(x, z);
    if (r > SPIELRADIUS - 8) { const f = (SPIELRADIUS - 8) / r; x *= f; z *= f; }
    return new THREE.Vector3(x, hoeheBei(x, z), z);
  }

  geheZu(ziel, tempo, dt) {
    const dx = ziel.x - this.pos.x, dz = ziel.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.8) { this.tempo = 0; return true; }
    const ux = dx / d, uz = dz / d;
    // Steigung bremst
    const neig = neigungBei(this.pos.x, this.pos.z);
    const bremse = this.art.lebensraum === 'fels' || this.art.lebensraum === 'hang'
      ? 1 : 1 / (1 + neig * 1.6);
    const schritt = Math.min(d, tempo * bremse * dt);
    let nx = this.pos.x + ux * schritt, nz = this.pos.z + uz * schritt;
    if (!imAreal(nx, nz)) { nx = this.pos.x; nz = this.pos.z; }
    this.pos.set(nx, hoeheBei(nx, nz), nz);
    this.tempo = schritt / dt;
    const zielBlick = Math.atan2(-uz, ux);
    this.blick = dreheSanft(this.blick, zielBlick, dt * 4.5);
    return false;
  }

  blickZu(p, dt, geschw) {
    const zielBlick = Math.atan2(-(p.z - this.pos.z), p.x - this.pos.x);
    this.blick = dreheSanft(this.blick, zielBlick, dt * geschw);
  }

  /* ---- Adler kreist und steigt bei Nähe ---- */
  adlerLogik(dt, spielerPos, naehe) {
    const a = this.art;
    const scheu = naehe < a.radiusWachsam;
    const zielHoehe = scheu ? 42 : this.tiefflug + (Math.sin(this.phase * 0.08) + 1) * 9;
    this.flughoehe += (zielHoehe - this.flughoehe) * Math.min(1, dt * (scheu ? 0.5 : 0.18));
    const radius = scheu ? 55 : 26 + Math.sin(this.phase * 0.05) * 10;
    this.kreisWinkel += dt * (a.tempoGehen / Math.max(8, radius)) * (scheu ? 2.2 : 1.4);
    const x = this.kreisMitte.x + Math.cos(this.kreisWinkel) * radius;
    const z = this.kreisMitte.z + Math.sin(this.kreisWinkel) * radius;
    const boden = hoeheBei(x, z);
    this.pos.set(x, boden + Math.max(3, this.flughoehe), z);
    // Flugrichtung ist die Tangente am Kreis
    const dx = -Math.sin(this.kreisWinkel), dz = Math.cos(this.kreisWinkel);
    this.blick = Math.atan2(-dz, dx);
    this.tempo = 6;
    this.zustand = scheu ? 'fliehen' : 'kreisen';
  }

  /* ---- Haltung und Beinbewegung ---- */
  setzeHaltung(dt) {
    const m = this.modell;
    this.wurzel.position.lerp(this.pos, Math.min(1, dt * 12));
    this.wurzel.rotation.y = this.blick;

    if (!this.flieger) {
      // an den Hang anlegen
      const e = 0.7;
      const vor = V.set(Math.cos(this.blick), 0, -Math.sin(this.blick));
      const hV = hoeheBei(this.pos.x + vor.x * e, this.pos.z + vor.z * e);
      const hH = hoeheBei(this.pos.x - vor.x * e, this.pos.z - vor.z * e);
      const nick = Math.atan2(hV - hH, 2 * e);
      this.neige.rotation.z = -nick * 0.85;
    }

    const lauf = Math.min(1, this.tempo / Math.max(0.5, this.art.tempoFlucht));
    const takt = this.phase * (6 + lauf * 16);

    if (m.beine.length === 4) {
      m.beine.forEach((b, i) => {
        const vers = (i === 0 || i === 3) ? 0 : Math.PI;
        b.rotation.x = Math.sin(takt + vers) * 0.5 * Math.max(0.03, lauf);
      });
    } else if (m.beine.length === 2) {
      m.beine.forEach((b, i) => {
        b.rotation.x = Math.sin(takt + i * Math.PI) * 0.4 * Math.max(0.02, lauf);
      });
    }

    // Körperhaltung je Zustand
    const z = this.zustand;
    if (m.kannSitzen) {
      const sitzt = (z === 'wachsam') ? 1 : 0;
      this.neige.rotation.z += (sitzt * -0.95 - 0) * 0.0;
      this.modell.gruppe.rotation.z = dreheSanft(this.modell.gruppe.rotation.z, sitzt * -0.9, dt * 3);
      this.modell.gruppe.position.y = sitzt * 0.12;
    }
    if (m.huepft) {
      const duckt = (z === 'ducken') ? 1 : 0;
      this.modell.gruppe.scale.y = 1 - duckt * 0.42;
      this.modell.gruppe.position.y = duckt * -0.05 + (lauf > 0.35 ? Math.max(0, Math.sin(takt * 0.7)) * 0.35 * lauf : 0);
      if (m.ohren) m.ohren.forEach((o, i) => { o.rotation.x = duckt * 1.2 + Math.sin(this.phase * 2 + i) * 0.08; });
    }
    if (m.schlaengelt && m.segmente) {
      m.segmente.forEach((s, i) => {
        s.position.z = Math.sin(this.phase * (3 + lauf * 6) - i * 0.7) * 0.055 * (0.4 + lauf);
      });
      if (m.zunge) m.zunge.scale.x = 0.4 + Math.abs(Math.sin(this.phase * 3)) * 1.4;
    }
    if (m.watschelt) {
      this.modell.gruppe.rotation.y = Math.sin(this.phase * 2.5) * 0.12 * (0.3 + lauf);
    }
    if (m.fluegel.length) {
      const schlag = this.flieger
        ? (this.zustand === 'fliehen' ? 2.6 : 0.9)
        : (lauf > 0.2 ? 9 : 0.6);
      const amp = this.flieger
        ? (this.zustand === 'fliehen' ? 0.55 : 0.16)
        : (lauf > 0.2 ? 0.9 : 0.05);
      m.fluegel.forEach(f => {
        f.rotation.x = Math.sin(this.phase * schlag) * amp * f.userData.seite * -1;
        f.rotation.z = (this.flieger ? 0.08 : 0) * f.userData.seite;
      });
    }
    // Kopf senken beim Grasen
    if (m.kopf && !this.flieger) {
      const grast = (z === 'ruhen' && !m.schlaengelt) ? 1 : 0;
      const ziel = grast ? 0.55 + Math.sin(this.phase * 1.3) * 0.12 : 0;
      m.kopf.rotation.z = dreheSanft(m.kopf.rotation.z, ziel, dt * 2);
      m.kopf.position.y = m.kopf.userData.y0 ?? (m.kopf.userData.y0 = m.kopf.position.y);
      m.kopf.position.y = m.kopf.userData.y0 - grast * (this.art.groesse * 0.35);
    }
  }
}

function dreheSanft(ist, soll, t) {
  let d = soll - ist;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return ist + d * Math.min(1, t);
}

export function erzeugeTiere(szene, sparsam = false) {
  const liste = [];
  for (const art of TIERARTEN) {
    // Auf Brille und Handy je Art ein Tier weniger, das spart Rechenzeit
    const anzahl = sparsam ? Math.max(1, art.anzahl - 1) : art.anzahl;
    for (let i = 0; i < anzahl; i++) {
      const t = new Tier(art, i);
      szene.add(t.wurzel);
      liste.push(t);
    }
  }
  return liste;
}
