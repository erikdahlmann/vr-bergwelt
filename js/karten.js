// Tierkarten: gezeichnete Karte mit Bild, Regal unten rechts, dazu ein Regal in VR.
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

/* ---------- Tierbilder laden (gezeichnet, von ChatGPT) ---------- */
const BILDER = {};
export function ladeBilder() {
  return Promise.all(TIERARTEN.map(a => new Promise(fertig => {
    const b = new Image();
    b.onload = () => { BILDER[a.id] = b; fertig(true); };
    b.onerror = () => fertig(false);
    b.src = `bilder/${a.id}.webp`;
  })));
}

/* ---------- Ersatz: kleines Bild aus dem 3D-Modell ---------- */
let miniRenderer = null, miniSzene = null, miniKamera = null;
function miniAufbau() {
  miniRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  miniRenderer.setSize(420, 420, false);
  miniRenderer.setClearColor(0x000000, 0);
  miniSzene = new THREE.Scene();
  miniKamera = new THREE.PerspectiveCamera(32, 1, 0.01, 60);
  const himmel = new THREE.HemisphereLight(0xdfeaf7, 0x6b6450, 1.6);
  const sonne = new THREE.DirectionalLight(0xfff3dd, 2.4);
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

function rundeck(g, x, y, b, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + b, y, x + b, y + h, r);
  g.arcTo(x + b, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + b, y, r);
  g.closePath();
}

export function zeichneKarte(art, lw, fortschritt, hinweis) {
  lw = lw || document.createElement('canvas');
  lw.width = 1024; lw.height = 800;
  const g = lw.getContext('2d');
  g.fillStyle = art.kartenfarbe;
  g.fillRect(0, 0, 1024, 800);
  g.fillStyle = '#fbf8f2';
  g.fillRect(18, 18, 988, 764);
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
  // Bild rechts
  const bx = 612, by = 158, bs = 372;
  g.save();
  rundeck(g, bx, by, bs, bs, 18);
  g.clip();
  g.fillStyle = '#eceadf';
  g.fillRect(bx, by, bs, bs);
  const bild = BILDER[art.id];
  if (bild) {
    g.drawImage(bild, bx, by, bs, bs);
  } else {
    try { g.drawImage(tierBild(art), bx, by, bs, bs); } catch (e) { /* ohne Bild weiter */ }
  }
  g.restore();
  rundeck(g, bx, by, bs, bs, 18);
  g.strokeStyle = 'rgba(0,0,0,0.12)';
  g.lineWidth = 3;
  g.stroke();
  // Steckbrief links
  g.fillStyle = '#2d2a24';
  g.font = '27px Georgia, serif';
  let y = 196;
  for (const z of art.steckbrief) { y = umbrechen(g, '• ' + z, 52, y, 530, 38) + 6; }
  y += 10;
  g.font = 'bold 30px Georgia, serif';
  g.fillText('So lebt es', 52, y); y += 44;
  g.font = '27px Georgia, serif';
  y = umbrechen(g, art.lebensweise, 52, y, 530, 38);
  y = Math.max(y, 592);
  g.fillStyle = art.kartenfarbe;
  g.fillRect(52, y - 10, 920, 3);
  y += 42;
  g.fillStyle = '#4a4336';
  g.font = 'bold 28px Georgia, serif';
  g.fillText('Wusstest du?', 52, y);
  g.font = '27px Georgia, serif';
  g.fillStyle = '#2d2a24';
  umbrechen(g, art.wissen, 52, y + 38, 920, 36);
  if (hinweis) {
    g.textAlign = 'center';
    g.font = '24px Georgia, serif';
    g.fillStyle = 'rgba(45,42,36,0.55)';
    g.fillText(hinweis, 512, 772);
    g.textAlign = 'left';
  }
  return lw;
}

/* ---------- Kachel fürs VR-Regal ---------- */
function kachelLeinwand(art, gefunden) {
  const lw = document.createElement('canvas');
  lw.width = lw.height = 192;
  const g = lw.getContext('2d');
  g.fillStyle = gefunden ? '#fbf8f2' : 'rgba(30,36,44,0.55)';
  rundeck(g, 4, 4, 184, 184, 22);
  g.fill();
  if (gefunden) {
    const bild = BILDER[art.id];
    g.save();
    rundeck(g, 10, 10, 172, 172, 18);
    g.clip();
    if (bild) g.drawImage(bild, 10, 10, 172, 172);
    else { try { g.drawImage(tierBild(art), 10, 10, 172, 172); } catch (e) {} }
    g.restore();
    g.strokeStyle = '#e0a93b';
    g.lineWidth = 6;
    rundeck(g, 6, 6, 180, 180, 20);
    g.stroke();
  } else {
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.font = 'bold 86px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('?', 96, 128);
    g.strokeStyle = 'rgba(255,255,255,0.3)';
    g.lineWidth = 4;
    g.setLineDash([10, 8]);
    rundeck(g, 8, 8, 176, 176, 20);
    g.stroke();
    g.setLineDash([]);
  }
  return lw;
}

/* ---------- Verwaltung ---------- */
export class KartenVerwaltung {
  constructor(szene, kamera) {
    this.gefunden = new Set();
    this.regal = document.getElementById('regal');
    this.zaehler = document.getElementById('zaehler');
    this.kartenFeld = document.getElementById('kartenfeld');
    this.kartenBild = document.getElementById('kartenbild');
    this.jubel = document.getElementById('jubel');
    this.uiZiele = [];
    this.baueRegal();
    this.baueVrTeile(kamera);
    document.getElementById('kartenzu').addEventListener('click', () => this.schliesse());
    this.kartenFeld.addEventListener('click', e => { if (e.target === this.kartenFeld) this.schliesse(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.schliesse(); });
  }

  /* --- Regal im Browser --- */
  baueRegal() {
    this.regal.innerHTML = '';
    this.felder = {};
    for (const art of TIERARTEN) {
      const f = document.createElement('button');
      f.className = 'feld';
      f.innerHTML = `<span class="emoji">${art.emoji}</span><span class="fname">?</span>`;
      f.title = 'Noch nicht gefunden – suche ' + TIPPS[art.lebensraum];
      f.addEventListener('click', () => { if (this.gefunden.has(art.id)) this.zeige(art); });
      this.regal.appendChild(f);
      this.felder[art.id] = f;
    }
    this.aktualisiereZaehler();
  }

  aktualisiereZaehler() {
    this.zaehler.textContent = `${this.gefunden.size} von ${TIERARTEN.length} Tieren`;
  }

  /* --- Karte und Regal in VR --- */
  baueVrTeile(kamera) {
    this.vrTeile = new THREE.Group();
    this.vrTeile.visible = false;
    kamera.add(this.vrTeile);

    // große Karte
    this.vrLw = document.createElement('canvas');
    this.vrLw.width = 1024; this.vrLw.height = 800;
    this.vrTex = new THREE.CanvasTexture(this.vrLw);
    this.vrTex.colorSpace = THREE.SRGBColorSpace;
    this.vrKarte = new THREE.Mesh(
      new THREE.PlaneGeometry(0.66, 0.516),
      new THREE.MeshBasicMaterial({ map: this.vrTex, transparent: true, fog: false, depthTest: false })
    );
    this.vrKarte.position.set(0, -0.03, -0.75);
    this.vrKarte.renderOrder = 30;
    this.vrKarte.visible = false;
    this.vrKarte.userData.klick = () => this.schliesse();
    this.vrTeile.add(this.vrKarte);

    // Regal unten rechts: 4 x 2 Kacheln
    this.vrRegal = new THREE.Group();
    this.vrRegal.position.set(0.3, -0.235, -0.62);
    this.vrRegal.rotation.set(-0.35, -0.3, 0);
    this.vrTeile.add(this.vrRegal);
    this.vrKacheln = {};
    TIERARTEN.forEach((art, i) => {
      const sp = i % 4, ze = Math.floor(i / 4);
      const tex = new THREE.CanvasTexture(kachelLeinwand(art, false));
      tex.colorSpace = THREE.SRGBColorSpace;
      const k = new THREE.Mesh(
        new THREE.PlaneGeometry(0.055, 0.055),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthTest: false })
      );
      k.position.set((sp - 1.5) * 0.062, (0.5 - ze) * 0.062, 0);
      k.renderOrder = 31;
      k.userData.klick = () => { if (this.gefunden.has(art.id)) this.zeige(art, true); };
      this.vrRegal.add(k);
      this.vrKacheln[art.id] = { netz: k, tex, art };
    });
    this.uiZiele = [this.vrKarte, ...Object.values(this.vrKacheln).map(k => k.netz)];
  }

  /* --- Fund --- */
  neuGefunden(art) {
    if (this.gefunden.has(art.id)) return false;
    this.gefunden.add(art.id);
    const f = this.felder[art.id];
    f.classList.add('da');
    f.querySelector('.fname').textContent = art.name;
    f.title = art.name + ' – Karte ansehen';
    const bild = BILDER[art.id];
    if (bild) {
      f.querySelector('.emoji').outerHTML = `<img class="minibild" src="bilder/${art.id}.webp" alt="">`;
    }
    const k = this.vrKacheln[art.id];
    k.tex.image = kachelLeinwand(art, true);
    k.tex.needsUpdate = true;
    this.aktualisiereZaehler();
    return true;
  }

  zeige(art, inVR = false) {
    const fort = `${this.gefunden.size} von ${TIERARTEN.length}`;
    if (inVR) {
      zeichneKarte(art, this.vrLw, fort, 'Zum Schließen auf die Karte zeigen und klicken');
      this.vrTex.needsUpdate = true;
      this.vrKarte.visible = true;
    } else {
      this.kartenBild.src = zeichneKarte(art, null, fort).toDataURL('image/png');
      this.kartenFeld.classList.add('offen');
    }
  }

  schliesse() {
    this.kartenFeld.classList.remove('offen');
    this.vrKarte.visible = false;
  }

  meldung(text, dauer = 2600) {
    this.jubel.textContent = text;
    this.jubel.classList.add('an');
    clearTimeout(this._t);
    this._t = setTimeout(() => this.jubel.classList.remove('an'), dauer);
  }

  aktualisiere(dt, inVR) {
    this.vrTeile.visible = !!inVR;
  }

  get fertig() { return this.gefunden.size >= TIERARTEN.length; }
}

export { TIPPS };
