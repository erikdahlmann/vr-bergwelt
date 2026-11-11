// Tierkarten: Bild aus dem 3D-Modell, Karte als Leinwand, Anzeige am Rechner und in VR.
import * as THREE from 'three';
import { TIERARTEN } from './daten.js';
import { BAUER } from './modelle.js';

const TIPPS = {
  fels: 'oben in den Felsen',
  hang: 'am Berghang',
  wiese: 'auf der Bergwiese',
  busch: 'bei den Büschen',
  bach: 'am Bach',
  luft: 'hoch in der Luft'
};

/* ---------- kleines Bild vom Tier ---------- */
let miniRenderer = null, miniSzene = null, miniKamera = null;
function miniAufbau() {
  miniRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  miniRenderer.setSize(360, 360, false);
  miniRenderer.setClearColor(0x000000, 0);
  miniSzene = new THREE.Scene();
  miniKamera = new THREE.PerspectiveCamera(32, 1, 0.01, 60);
  const himmel = new THREE.HemisphereLight(0xdfeaf7, 0x6b6450, 1.5);
  const sonne = new THREE.DirectionalLight(0xfff3dd, 2.2);
  sonne.position.set(2, 3, 2.5);
  miniSzene.add(himmel, sonne);
}
export function tierBild(art) {
  if (!miniRenderer) miniAufbau();
  while (miniSzene.children.length > 2) miniSzene.remove(miniSzene.children[2]);
  const einst = (typeof art === 'string' ? null : art.bild)
    || { drehung: -0.9, richtung: [1.0, 0.5, 1.45], zoom: 0.95 };
  const id = typeof art === 'string' ? art : art.id;
  const modell = BAUER[id]();
  const g = modell.gruppe;
  g.rotation.y = einst.drehung;
  miniSzene.add(g);
  const kugel = new THREE.Box3().setFromObject(g).getBoundingSphere(new THREE.Sphere());
  const fov = miniKamera.fov * Math.PI / 180;
  const abstand = (kugel.radius / Math.sin(fov / 2)) * einst.zoom;
  const richt = new THREE.Vector3(...einst.richtung).normalize().multiplyScalar(abstand);
  miniKamera.position.copy(kugel.center).add(richt);
  miniKamera.lookAt(kugel.center);
  miniRenderer.render(miniSzene, miniKamera);
  return miniRenderer.domElement;
}

/* ---------- Karte zeichnen ---------- */
function umbrechen(g, text, x, y, breite, zeile) {
  const worte = text.split(' ');
  let linie = '';
  for (const w of worte) {
    const probe = linie ? linie + ' ' + w : w;
    if (g.measureText(probe).width > breite && linie) {
      g.fillText(linie, x, y); y += zeile; linie = w;
    } else linie = probe;
  }
  if (linie) { g.fillText(linie, x, y); y += zeile; }
  return y;
}

export function zeichneKarte(art, lw, fortschritt) {
  lw = lw || document.createElement('canvas');
  lw.width = 1024; lw.height = 730;
  const g = lw.getContext('2d');
  g.fillStyle = art.kartenfarbe;
  g.fillRect(0, 0, 1024, 730);
  g.fillStyle = '#fbf8f2';
  g.fillRect(18, 18, 988, 694);
  // Kopf
  g.fillStyle = art.kartenfarbe;
  g.fillRect(18, 18, 988, 116);
  g.fillStyle = '#ffffff';
  g.font = 'bold 58px Georgia, serif';
  g.fillText(art.name, 48, 92);
  g.font = 'italic 27px Georgia, serif';
  g.fillStyle = 'rgba(255,255,255,0.82)';
  g.fillText(art.lateinisch, 50, 122);
  if (fortschritt) {
    g.textAlign = 'right';
    g.font = 'bold 30px Georgia, serif';
    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.fillText(fortschritt, 972, 92);
    g.textAlign = 'left';
  }
  // Bild
  try {
    const bild = tierBild(art);
    g.fillStyle = '#eceadf';
    g.fillRect(700, 160, 290, 290);
    g.drawImage(bild, 700, 160, 290, 290);
  } catch (e) { /* ohne Bild weiter */ }
  // Steckbrief
  g.fillStyle = '#2d2a24';
  g.font = '28px Georgia, serif';
  let y = 200;
  for (const z of art.steckbrief) { g.fillText('• ' + z, 52, y); y += 44; }
  y += 14;
  g.font = 'bold 30px Georgia, serif';
  g.fillText('So lebt es', 52, y); y += 44;
  g.font = '27px Georgia, serif';
  y = umbrechen(g, art.lebensweise, 52, y, 620, 38);
  y = Math.max(y, 486);
  g.fillStyle = art.kartenfarbe;
  g.fillRect(52, y - 8, 938, 3);
  y += 44;
  g.fillStyle = '#4a4336';
  g.font = 'bold 28px Georgia, serif';
  g.fillText('Wusstest du?', 52, y);
  g.font = '27px Georgia, serif';
  g.fillStyle = '#2d2a24';
  umbrechen(g, art.wissen, 52, y + 40, 920, 36);
  return lw;
}

/* ---------- Anzeige am Rechner ---------- */
export class KartenVerwaltung {
  constructor(szene, kamera) {
    this.gefunden = new Set();
    this.regal = document.getElementById('regal');
    this.zaehler = document.getElementById('zaehler');
    this.kartenFeld = document.getElementById('kartenfeld');
    this.kartenBild = document.getElementById('kartenbild');
    this.baueRegal();
    this.baueVrKarte(kamera);
    document.getElementById('kartenzu').addEventListener('click', () => this.schliesse());
    this.kartenFeld.addEventListener('click', e => { if (e.target === this.kartenFeld) this.schliesse(); });
    this.jubel = document.getElementById('jubel');
  }

  baueRegal() {
    this.regal.innerHTML = '';
    this.felder = {};
    for (const art of TIERARTEN) {
      const f = document.createElement('button');
      f.className = 'feld';
      f.innerHTML = `<span class="emoji">${art.emoji}</span><span class="fname">?</span>`;
      f.title = 'Noch nicht gefunden – suche ' + TIPPS[art.lebensraum];
      f.addEventListener('click', () => {
        if (this.gefunden.has(art.id)) this.zeige(art);
      });
      this.regal.appendChild(f);
      this.felder[art.id] = f;
    }
    this.aktualisiereZaehler();
  }

  aktualisiereZaehler() {
    this.zaehler.textContent = `${this.gefunden.size} von ${TIERARTEN.length} Tieren`;
  }

  baueVrKarte(kamera) {
    this.vrLw = document.createElement('canvas');
    this.vrLw.width = 1024; this.vrLw.height = 730;
    this.vrTex = new THREE.CanvasTexture(this.vrLw);
    this.vrTex.colorSpace = THREE.SRGBColorSpace;
    this.vrKarte = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.442),
      new THREE.MeshBasicMaterial({ map: this.vrTex, transparent: true, fog: false, depthTest: false })
    );
    this.vrKarte.position.set(0, -0.04, -0.72);
    this.vrKarte.renderOrder = 20;
    this.vrKarte.visible = false;
    kamera.add(this.vrKarte);
    this.vrZeit = 0;
  }

  neuGefunden(art) {
    if (this.gefunden.has(art.id)) return false;
    this.gefunden.add(art.id);
    const f = this.felder[art.id];
    f.classList.add('da');
    f.querySelector('.fname').textContent = art.name;
    f.title = art.name + ' – Karte ansehen';
    this.aktualisiereZaehler();
    return true;
  }

  zeige(art, inVR = false) {
    const fort = `${this.gefunden.size} von ${TIERARTEN.length}`;
    const lw = inVR ? zeichneKarte(art, this.vrLw, fort) : zeichneKarte(art, null, fort);
    if (inVR) {
      this.vrTex.needsUpdate = true;
      this.vrKarte.visible = true;
      this.vrZeit = 14;
    } else {
      this.kartenBild.src = lw.toDataURL('image/png');
      this.kartenFeld.classList.add('offen');
    }
  }

  schliesse() {
    this.kartenFeld.classList.remove('offen');
    this.vrKarte.visible = false;
    this.vrZeit = 0;
  }

  meldung(text, dauer = 2600) {
    this.jubel.textContent = text;
    this.jubel.classList.add('an');
    clearTimeout(this._t);
    this._t = setTimeout(() => this.jubel.classList.remove('an'), dauer);
  }

  aktualisiere(dt) {
    if (this.vrZeit > 0) {
      this.vrZeit -= dt;
      if (this.vrZeit <= 0) this.vrKarte.visible = false;
    }
  }

  get fertig() { return this.gefunden.size >= TIERARTEN.length; }
}

export { TIPPS };
