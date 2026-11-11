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

/* ---------- Zellrauschen (für Risse und Kiesel), nahtlos ---------- */
function zellen(groesse, anzahl, saat) {
  let z = saat | 0;
  const zuf = () => { z = (z * 1103515245 + 12345) & 0x7fffffff; return z / 0x7fffffff; };
  const px = [], py = [], pf = [];
  for (let i = 0; i < anzahl; i++) { px.push(zuf()); py.push(zuf()); pf.push(zuf()); }
  const d1 = new Float32Array(groesse * groesse);
  const d2 = new Float32Array(groesse * groesse);
  const id = new Float32Array(groesse * groesse);
  for (let y = 0; y < groesse; y++) {
    for (let x = 0; x < groesse; x++) {
      const ux = x / groesse, uy = y / groesse;
      let a = 9, b = 9, best = 0;
      for (let i = 0; i < anzahl; i++) {
        let dx = Math.abs(ux - px[i]), dy = Math.abs(uy - py[i]);
        if (dx > 0.5) dx = 1 - dx;        // über den Rand hinweg
        if (dy > 0.5) dy = 1 - dy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < a) { b = a; a = d; best = pf[i]; } else if (d < b) b = d;
      }
      const k = y * groesse + x;
      d1[k] = a; d2[k] = b; id[k] = best;
    }
  }
  return { d1, d2, id };
}

/* ---------- Wiese: viele kleine Halme ---------- */
export function wieseTextur(groesse = 512) {
  const lw = leinwand(groesse, groesse);
  const g = lw.getContext('2d');
  // Grundfarbe mit weichen Flecken
  g.fillStyle = '#5f7a39';
  g.fillRect(0, 0, groesse, groesse);
  for (let i = 0; i < 90; i++) {
    const u = (i * 97.3 % 360) / 360, v = (i * 211.7 % 360) / 360;
    const r = groesse * (0.05 + 0.12 * Math.abs(Math.sin(i * 1.7)));
    const hell = Math.sin(i * 2.3) > 0 ? 'rgba(130,152,70,0.5)' : 'rgba(62,86,42,0.45)';
    for (const ox of [-groesse, 0, groesse]) for (const oy of [-groesse, 0, groesse]) {
      const rg = g.createRadialGradient(u * groesse + ox, v * groesse + oy, 0, u * groesse + ox, v * groesse + oy, r);
      rg.addColorStop(0, hell);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.beginPath(); g.arc(u * groesse + ox, v * groesse + oy, r, 0, 6.3); g.fill();
    }
  }
  // Halme
  let z = 12345;
  const zuf = () => { z = (z * 1103515245 + 12345) & 0x7fffffff; return z / 0x7fffffff; };
  g.lineCap = 'round';
  for (let i = 0; i < 4200; i++) {
    const x = zuf() * groesse, y = zuf() * groesse;
    const lang = groesse * (0.012 + zuf() * 0.03);
    const w = zuf() * Math.PI * 2;
    const t = zuf();
    const h = 70 + t * 85, sat = 95 + t * 40;
    g.strokeStyle = `rgb(${Math.round(h * 0.78)},${Math.round(sat)},${Math.round(45 + t * 35)})`;
    g.lineWidth = groesse * (0.0018 + zuf() * 0.0022);
    g.globalAlpha = 0.55 + zuf() * 0.45;
    for (const ox of [-groesse, 0, groesse]) for (const oy of [-groesse, 0, groesse]) {
      g.beginPath();
      g.moveTo(x + ox, y + oy);
      g.lineTo(x + ox + Math.cos(w) * lang, y + oy + Math.sin(w) * lang);
      g.stroke();
    }
  }
  g.globalAlpha = 1;
  // ein paar winzige Blüten
  for (let i = 0; i < 90; i++) {
    const x = zuf() * groesse, y = zuf() * groesse;
    g.fillStyle = ['#e8e2b0', '#dcd2e2', '#e8c6cc', '#f2f2ee'][Math.floor(zuf() * 4) % 4];
    for (const ox of [-groesse, 0, groesse]) for (const oy of [-groesse, 0, groesse]) {
      g.beginPath(); g.arc(x + ox, y + oy, groesse * 0.0035, 0, 6.3); g.fill();
    }
  }
  return lw;
}

/* ---------- Fels: Risse und Schichten ---------- */
export function felsTextur(groesse = 512) {
  const lw = leinwand(groesse, groesse);
  const g = lw.getContext('2d');
  const bild = g.createImageData(groesse, groesse);
  const z = zellen(groesse, 42, 7777);
  const z2 = zellen(groesse, 150, 991);
  for (let y = 0; y < groesse; y++) {
    for (let x = 0; x < groesse; x++) {
      const k = y * groesse + x;
      const u = x / groesse * Math.PI * 2, v = y / groesse * Math.PI * 2;
      const n = fbm(Math.cos(u) * 7 + 3, Math.sin(u) * 7 + Math.cos(v) * 7, 4);
      const fein = fbm(Math.cos(u) * 26 + 11, Math.sin(v) * 26 + 5, 2);
      // Risse zwischen den Zellen
      const riss = 1 - Math.min(1, (z.d2[k] - z.d1[k]) / 0.012);
      const riss2 = 1 - Math.min(1, (z2.d2[k] - z2.d1[k]) / 0.006);
      // Schichtbänder
      const band = 0.5 + 0.5 * Math.sin((y / groesse) * 26 + n * 4);
      let w = 132 + (n - 0.5) * 60 + (fein - 0.5) * 30 + band * 14 + (z.id[k] - 0.5) * 22;
      w -= riss * 42 + riss2 * 18;
      w = Math.max(28, Math.min(242, w));
      const i = k * 4;
      bild.data[i] = w * 1.02; bild.data[i + 1] = w; bild.data[i + 2] = w * 0.96;
      bild.data[i + 3] = 255;
    }
  }
  g.putImageData(bild, 0, 0);
  return lw;
}

/* ---------- Kies am Bach ---------- */
export function kiesTextur(groesse = 512) {
  const lw = leinwand(groesse, groesse);
  const g = lw.getContext('2d');
  const bild = g.createImageData(groesse, groesse);
  const z = zellen(groesse, 190, 4242);
  for (let y = 0; y < groesse; y++) {
    for (let x = 0; x < groesse; x++) {
      const k = y * groesse + x;
      const rund = Math.max(0, 1 - z.d1[k] / 0.045);     // Wölbung des Kiesels
      const fuge = 1 - Math.min(1, (z.d2[k] - z.d1[k]) / 0.01);
      const ton = 150 + (z.id[k] - 0.5) * 72;
      let w = ton + rund * 36 - fuge * 46;
      w = Math.max(40, Math.min(240, w));
      const i = k * 4;
      bild.data[i] = w * 1.06; bild.data[i + 1] = w * 1.0; bild.data[i + 2] = w * 0.9;
      bild.data[i + 3] = 255;
    }
  }
  g.putImageData(bild, 0, 0);
  return lw;
}

/* ---------- Rinde ---------- */
export function rindeTextur(groesse = 256) {
  const lw = leinwand(groesse, groesse);
  const g = lw.getContext('2d');
  const bild = g.createImageData(groesse, groesse);
  for (let y = 0; y < groesse; y++) {
    for (let x = 0; x < groesse; x++) {
      const u = x / groesse * Math.PI * 2;
      const laengs = fbm(Math.cos(u) * 9 + 2, y * 0.045 + 3, 3);
      const fein = fbm(Math.cos(u) * 30 + 7, y * 0.3 + 1, 2);
      const furche = Math.pow(Math.abs(Math.sin(laengs * 9)), 0.5);
      let w = 120 + (laengs - 0.5) * 50 + (fein - 0.5) * 40 - furche * 42;
      w = Math.max(30, Math.min(220, w));
      const i = (y * groesse + x) * 4;
      bild.data[i] = w * 1.12; bild.data[i + 1] = w * 0.95; bild.data[i + 2] = w * 0.8;
      bild.data[i + 3] = 255;
    }
  }
  g.putImageData(bild, 0, 0);
  return lw;
}

/* ---------- Großflächige Flecken gegen das Kachelmuster ---------- */
export function makroTextur(groesse = 256) {
  const lw = leinwand(groesse, groesse);
  const g = lw.getContext('2d');
  const bild = g.createImageData(groesse, groesse);
  for (let y = 0; y < groesse; y++) {
    for (let x = 0; x < groesse; x++) {
      const u = x / groesse * Math.PI * 2, v = y / groesse * Math.PI * 2;
      // weiches Rauschen auf dem Ring, damit die Kacheln passen
      const n1 = fbm(Math.cos(u) * 2.2 + 17, Math.sin(u) * 2.2 + Math.cos(v) * 2.2, 3);
      const n2 = fbm(Math.sin(v) * 4.5 + 5, Math.cos(u) * 4.5 + 31, 2);
      const w = Math.max(0, Math.min(255, 128 + (n1 - 0.5) * 210 + (n2 - 0.5) * 90));
      const i = (y * groesse + x) * 4;
      bild.data[i] = w; bild.data[i + 1] = w * 1.02; bild.data[i + 2] = w * 0.94;
      bild.data[i + 3] = 255;
    }
  }
  g.putImageData(bild, 0, 0);
  return lw;
}
