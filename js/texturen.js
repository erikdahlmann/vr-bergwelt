// Texturen werden im Browser gezeichnet. Keine Bilddateien, alles läuft offline.
import * as THREE from 'three';
import { fbm } from './gelaende.js';

function leinwand(breite, hoehe) {
  const lw = document.createElement('canvas');
  lw.width = breite; lw.height = hoehe;
  return lw;
}

/* ---------- Körnung für den Boden ----------
   Zwei Leinwände: eine helle für die Farbe, eine harte für die Beulen. */
export function kornTextur(groesse = 256) {
  const farbe = leinwand(groesse, groesse);
  const hoehe = leinwand(groesse, groesse);
  const fg = farbe.getContext('2d'), hg = hoehe.getContext('2d');
  const fb = fg.createImageData(groesse, groesse);
  const hb = hg.createImageData(groesse, groesse);
  for (let y = 0; y < groesse; y++) {
    for (let x = 0; x < groesse; x++) {
      // nahtlos: Rauschen auf einem Ring, damit die Kacheln passen
      const u = x / groesse * Math.PI * 2, v = y / groesse * Math.PI * 2;
      const n = fbm(Math.cos(u) * 6 + 13, Math.sin(u) * 6 + Math.cos(v) * 6, 3) * 0.5
              + fbm(Math.sin(v) * 11 + 3, Math.cos(u) * 11 + 7, 2) * 0.5;
      const fein = fbm(Math.cos(u) * 23 + 2, Math.sin(v) * 23 + 9, 2);
      const i = (y * groesse + x) * 4;
      // Farbe: nur leicht, Mittelwert nahe weiß
      const f = Math.max(0, Math.min(255, 238 + (n - 0.5) * 46 + (fein - 0.5) * 26));
      fb.data[i] = fb.data[i + 1] = fb.data[i + 2] = f;
      fb.data[i + 3] = 255;
      // Höhe: voller Kontrast, nur für die Beulen
      const h = Math.max(0, Math.min(255, 128 + (n - 0.5) * 230 + (fein - 0.5) * 110));
      hb.data[i] = hb.data[i + 1] = hb.data[i + 2] = h;
      hb.data[i + 3] = 255;
    }
  }
  fg.putImageData(fb, 0, 0);
  hg.putImageData(hb, 0, 0);
  return { farbe, hoehe };
}

/* ---------- Normalenkarte aus einer Graustufen-Leinwand ---------- */
export function normalAus(lw, staerke = 2.4) {
  const n = lw.width;
  const q = lw.getContext('2d').getImageData(0, 0, n, n).data;
  const ziel = leinwand(n, n);
  const zg = ziel.getContext('2d');
  const aus = zg.createImageData(n, n);
  const h = (x, y) => q[(((y + n) % n) * n + ((x + n) % n)) * 4] / 255;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * staerke;
      const dy = (h(x, y + 1) - h(x, y - 1)) * staerke;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * n + x) * 4;
      aus.data[i] = ((-dx / l) * 0.5 + 0.5) * 255;
      aus.data[i + 1] = ((-dy / l) * 0.5 + 0.5) * 255;
      aus.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      aus.data[i + 3] = 255;
    }
  }
  zg.putImageData(aus, 0, 0);
  return ziel;
}

/* ---------- Grashalme mit durchsichtigem Rand ---------- */
export function grasTextur(groesse = 128) {
  const lw = leinwand(groesse, groesse);
  const g = lw.getContext('2d');
  g.clearRect(0, 0, groesse, groesse);
  const halme = 9;
  for (let i = 0; i < halme; i++) {
    const x0 = (i + 0.5) / halme * groesse + (Math.sin(i * 7.3) * 5);
    const hoch = groesse * (0.55 + 0.42 * Math.abs(Math.sin(i * 2.1)));
    const bieg = Math.sin(i * 3.7) * groesse * 0.16;
    const breit = groesse * 0.035 * (0.7 + 0.6 * Math.abs(Math.cos(i * 1.7)));
    const hell = 0.55 + 0.45 * Math.abs(Math.sin(i * 1.3));
    const grad = g.createLinearGradient(0, groesse, 0, groesse - hoch);
    grad.addColorStop(0, `rgb(${Math.round(76 * hell)},${Math.round(104 * hell)},${Math.round(44 * hell)})`);
    grad.addColorStop(1, `rgb(${Math.round(168 * hell)},${Math.round(192 * hell)},${Math.round(92 * hell)})`);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(x0 - breit, groesse);
    g.quadraticCurveTo(x0 - breit * 0.4 + bieg * 0.5, groesse - hoch * 0.6, x0 + bieg, groesse - hoch);
    g.quadraticCurveTo(x0 + breit * 0.5 + bieg * 0.5, groesse - hoch * 0.55, x0 + breit, groesse);
    g.closePath();
    g.fill();
  }
  return lw;
}

/* ---------- Wellenmuster fürs Wasser ---------- */
export function wasserNormal(groesse = 256) {
  const lw = leinwand(groesse, groesse);
  const g = lw.getContext('2d');
  const bild = g.createImageData(groesse, groesse);
  for (let y = 0; y < groesse; y++) {
    for (let x = 0; x < groesse; x++) {
      const u = x / groesse * Math.PI * 2, v = y / groesse * Math.PI * 2;
      const w = Math.sin(u * 3 + Math.sin(v * 2) * 1.2) * 0.5
              + Math.sin(v * 5 - Math.cos(u * 3) * 0.8) * 0.3
              + Math.sin((u + v) * 7) * 0.2;
      const i = (y * groesse + x) * 4;
      const c = Math.max(0, Math.min(255, 128 + w * 90));
      bild.data[i] = bild.data[i + 1] = bild.data[i + 2] = c;
      bild.data[i + 3] = 255;
    }
  }
  g.putImageData(bild, 0, 0);
  return normalAus(lw, 1.6);
}

/* ---------- Himmel mit Wolken ---------- */
export function himmelTextur(breite = 1024, hoehe = 512) {
  const lw = leinwand(breite, hoehe);
  const g = lw.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, hoehe);
  grad.addColorStop(0.00, '#1d5aa8');
  grad.addColorStop(0.30, '#4f8dcc');
  grad.addColorStop(0.52, '#a8cbe8');
  grad.addColorStop(0.66, '#d9e7f2');
  grad.addColorStop(1.00, '#e9e3d6');
  g.fillStyle = grad;
  g.fillRect(0, 0, breite, hoehe);
  // Wolken: flache Schleier, nahtlos über den Rand gezeichnet
  const wolken = 30;
  for (let i = 0; i < wolken; i++) {
    const mx = ((i * 97.3) % 360) / 360 * breite;
    const my = hoehe * (0.17 + 0.23 * Math.abs(Math.sin(i * 2.3)));
    const gr = breite * (0.010 + 0.016 * Math.abs(Math.cos(i * 1.7)));
    const ballen = 5 + (i % 4);
    const deck = 0.3 + 0.35 * Math.abs(Math.sin(i * 0.9));
    for (let b = 0; b < ballen; b++) {
      const bx = mx + (b - ballen / 2) * gr * 1.7 + Math.sin(b * 2.1 + i) * gr;
      const by = my + Math.cos(b * 3.3 + i) * gr * 0.25;
      const br = gr * (0.45 + 0.55 * Math.abs(Math.sin(b * 1.9 + i)));
      for (const versatz of [-breite, 0, breite]) {
        g.save();
        g.translate(bx + versatz, by);
        g.scale(2.4, 0.75);
        const rg = g.createRadialGradient(0, 0, 0, 0, 0, br);
        rg.addColorStop(0, `rgba(255,255,255,${deck})`);
        rg.addColorStop(0.5, `rgba(250,252,255,${deck * 0.45})`);
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg;
        g.beginPath();
        g.arc(0, 0, br, 0, 6.3);
        g.fill();
        g.restore();
      }
    }
  }
  return lw;
}

/* ---------- Sonnenschein ---------- */
export function sonnenTextur(groesse = 256) {
  const lw = leinwand(groesse, groesse);
  const g = lw.getContext('2d');
  const m = groesse / 2;
  const rg = g.createRadialGradient(m, m, 0, m, m, m);
  rg.addColorStop(0.00, 'rgba(255,255,248,1)');
  rg.addColorStop(0.12, 'rgba(255,250,225,0.95)');
  rg.addColorStop(0.28, 'rgba(255,238,190,0.45)');
  rg.addColorStop(0.60, 'rgba(255,230,180,0.12)');
  rg.addColorStop(1.00, 'rgba(255,225,170,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, groesse, groesse);
  return lw;
}

/* ---------- Hilfe: Leinwand zu Textur ---------- */
export function textur(lw, wiederholung = 1, farbraum = false) {
  const t = new THREE.CanvasTexture(lw);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(wiederholung, wiederholung);
  t.anisotropy = 4;
  if (farbraum) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- weicher Fleck für Bodenschatten ---------- */
export function fleckTextur(groesse = 128) {
  const lw = leinwand(groesse, groesse);
  const g = lw.getContext('2d');
  const m = groesse / 2;
  const rg = g.createRadialGradient(m, m, 0, m, m, m);
  rg.addColorStop(0.00, 'rgba(0,0,0,0.75)');
  rg.addColorStop(0.45, 'rgba(0,0,0,0.42)');
  rg.addColorStop(1.00, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, groesse, groesse);
  return lw;
}
