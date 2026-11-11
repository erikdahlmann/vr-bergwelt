// Bäume, Felsen, Büsche, Gras, Blumen, Baumstämme – und die Versteckplätze.
import * as THREE from 'three';
import { hoeheBei, neigungBei, flussAbstand, rauschen, fbm, SPIELRADIUS } from './gelaende.js';
import { grasTextur, kornTextur, normalAus, fleckTextur, textur } from './texturen.js';

// Wind: eine Zahl, die die Hauptschleife hochzählt
export const windZeit = { value: 0 };

function windMachen(mat, staerke = 0.22, tempo = 1.7) {
  mat.onBeforeCompile = (schatten) => {
    schatten.uniforms.uZeit = windZeit;
    schatten.vertexShader = 'uniform float uZeit;\n' + schatten.vertexShader;
    schatten.vertexShader = schatten.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       float wx = instanceMatrix[3].x, wz = instanceMatrix[3].z;
       float kraft = uv.y * uv.y * ${staerke.toFixed(3)};
       transformed.x += sin(uZeit * ${tempo.toFixed(2)} + wx * 0.35 + wz * 0.2) * kraft;
       transformed.z += cos(uZeit * ${(tempo * 0.77).toFixed(2)} + wx * 0.22 - wz * 0.31) * kraft * 0.6;`);
  };
  mat.customProgramCacheKey = () => 'wind' + staerke + tempo;
  return mat;
}

// einfacher, wiederholbarer Zufall
function zufallGeber(saat) {
  let s = saat | 0;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

export const versteckplaetze = [];   // {pos, art:'fels'|'busch'|'loch'|'spalte', radius}
export const hindernisse = [];       // Netze, die die Sicht versperren
export const brocken = [];           // große Felsen: {pos, radius} – da darf niemand hineinspringen
const schattenFlecken = [];          // weiche Flecken unter Bäumen und Felsen

// Steinkörnung einmal bauen und überall benutzen
let steinKarten = null;
function stein(wiederholung) {
  if (!steinKarten) {
    const k = kornTextur(256);
    steinKarten = { farbe: k.farbe, normal: normalAus(k.hoehe, 2.6) };
  }
  const f = textur(steinKarten.farbe, wiederholung);
  f.colorSpace = THREE.NoColorSpace;
  return { map: f, normalMap: textur(steinKarten.normal, wiederholung) };
}

function setze(ziel, anzahl, pruef, zuf) {
  let versuche = 0;
  while (ziel.length < anzahl && versuche < anzahl * 60) {
    versuche++;
    const w = zuf() * Math.PI * 2;
    const r = Math.sqrt(zuf()) * (SPIELRADIUS - 3);
    const x = Math.cos(w) * r, z = Math.sin(w) * r;
    const h = hoeheBei(x, z), n = neigungBei(x, z), d = flussAbstand(x, z);
    if (pruef(x, z, h, n, d)) ziel.push({ x, z, h, n, d, r: zuf() });
  }
  return ziel;
}

/* ---------- Fichtenwald ---------- */
function fichten(gruppe, zuf, menge) {
  const plaetze = setze([], menge, (x, z, h, n, d) =>
    h > 1.2 && h < 17 && n < 0.45 && d > 8 && fbm(x * 0.03 + 5, z * 0.03 + 9, 2) > 0.42, zuf);
  const anz = plaetze.length;
  const stammG = new THREE.CylinderGeometry(0.17, 0.26, 1, 6, 1);
  stammG.translate(0, 0.5, 0);
  const kroneG = [];
  for (let k = 0; k < 3; k++) {
    const g = new THREE.ConeGeometry(1, 1, 9, 1);
    g.translate(0, 0.5, 0);
    kroneG.push(g);
  }
  const stammM = new THREE.MeshStandardMaterial(Object.assign({
    color: 0x6a5540, roughness: 0.95
  }, stein(1.2)));
  const nadelM = [0x44663a, 0x4d7140, 0x3a5c35].map(c =>
    windMachen(new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true }), 0.022, 0.9));
  const stamm = new THREE.InstancedMesh(stammG, stammM, anz);
  const kronen = kroneG.map((g, i) => new THREE.InstancedMesh(g, nadelM[i], anz));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  plaetze.forEach((pl, i) => {
    const hoch = 4.5 + pl.r * 5.5;
    const breit = 0.9 + pl.r * 0.5;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), zuf() * 6.28);
    p.set(pl.x, pl.h - 0.25, pl.z);
    s.set(breit, hoch * 0.32, breit);
    stamm.setMatrixAt(i, m.compose(p, q, s));
    const stufen = [[0.30, 1.00, 0.42], [0.58, 0.78, 0.34], [0.80, 0.52, 0.26]];
    schattenFlecken.push({ x: pl.x, z: pl.z, h: pl.h, r: breit * 1.9 });
    stufen.forEach((st, k) => {
      p.set(pl.x, pl.h + hoch * st[0], pl.z);
      s.set(breit * st[1] * 1.5, hoch * st[2] * 1.5, breit * st[1] * 1.5);
      kronen[k].setMatrixAt(i, m.compose(p, q, s));
    });
  });
  const baumFarbe = new THREE.Color();
  plaetze.forEach((pl, i) => {
    const t = (zuf() * 0.5 + pl.r * 0.5);
    baumFarbe.setRGB(0.8 + t * 0.4, 0.88 + t * 0.3, 0.76 + t * 0.36);
    kronen.forEach(k => k.setColorAt(i, baumFarbe));
  });
  [stamm, ...kronen].forEach(im => { im.castShadow = true; im.receiveShadow = false; gruppe.add(im); hindernisse.push(im); });
  return plaetze;
}

/* ---------- Felsen ---------- */
function felsGeometrie(variante, zuf) {
  // Mehr Flächen und mehrere Rauschstufen: Kanten, Bänder, keine Beulenkugel
  const g = new THREE.IcosahedronGeometry(1, 2);
  const pos = g.attributes.position;
  const hoch = 0.8 + 0.4 * zuf();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const grob = rauschen(x * 1.3 + variante * 11, z * 1.3 + y * 0.9 + variante * 3);
    const mittel = rauschen(x * 3.1 + 5, z * 3.1 + y * 2.2);
    const fein = rauschen(x * 7.3 + 2, z * 7.3 + y * 5.1);
    // Schichtbänder waagerecht, wie bei geschichtetem Gestein
    const band = Math.sin(y * 7.5 + grob * 3) * 0.035;
    const f = 0.72 + 0.42 * grob + 0.16 * mittel + 0.06 * fein + band;
    pos.setXYZ(i, x * f, y * f * hoch, z * f);
  }
  g.computeVertexNormals();
  return g;
}
function felsen(gruppe, zuf, menge) {
  const plaetze = setze([], menge, (x, z, h, n, d) => (d > 3.2 || h > 6) && n < 0.72, zuf);
  const varianten = 5;
  const geos = [];
  for (let v = 0; v < varianten; v++) geos.push(felsGeometrie(v, zuf));
  const mats = [0x9a958c, 0x857f77, 0xa8a399, 0x746e67, 0x8f8a80].map(c =>
    new THREE.MeshStandardMaterial(Object.assign({
      color: c, roughness: 1, flatShading: true,
      normalScale: new THREE.Vector2(1.1, 1.1)
    }, stein(2.5))));
  const listen = Array.from({ length: varianten }, () => []);
  plaetze.forEach(pl => listen[Math.floor(zuf() * varianten) % varianten].push(pl));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const e = new THREE.Euler();
  const felsFarbe = new THREE.Color();
  listen.forEach((liste, v) => {
    const im = new THREE.InstancedMesh(geos[v], mats[v], Math.max(1, liste.length));
    liste.forEach((pl, i) => {
      const gr = 0.5 + Math.pow(pl.r, 2.2) * 4.2 + (pl.h > 16 ? 1.2 : 0);
      e.set(zuf() * 0.5 - 0.25, zuf() * 6.28, zuf() * 0.5 - 0.25);
      q.setFromEuler(e);
      p.set(pl.x, pl.h - gr * (0.03 + Math.min(0.2, pl.n * 0.28)), pl.z);
      s.set(gr, gr * (0.92 + zuf() * 0.2), gr * (0.85 + zuf() * 0.4));
      im.setMatrixAt(i, m.compose(p, q, s));
      const fh = 0.78 + zuf() * 0.42;
      if (gr > 0.9) schattenFlecken.push({ x: pl.x, z: pl.z, h: pl.h, r: gr * 1.1 });
      if (gr > 0.8) brocken.push({ x: pl.x, z: pl.z, r: gr * 0.95 });
      felsFarbe.setRGB(fh * (0.98 + zuf() * 0.06), fh, fh * (0.94 + zuf() * 0.08));
      im.setColorAt(i, felsFarbe);
      if (gr > 1.6) versteckplaetze.push({
        pos: new THREE.Vector3(pl.x, pl.h, pl.z), art: 'fels', radius: gr
      });
    });
    im.count = liste.length;
    im.castShadow = true; im.receiveShadow = true;
    gruppe.add(im);
    hindernisse.push(im);
  });
  return plaetze;
}

/* ---------- Büsche (Latschen, Alpenrosen) ---------- */
function buesche(gruppe, zuf, menge) {
  const plaetze = setze([], menge, (x, z, h, n, d) => h > 0.8 && h < 21 && d > 4 && n < 0.62, zuf);
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const f = 0.75 + 0.45 * rauschen(x * 3 + 2, z * 3 + y);
    pos.setXYZ(i, x * f, y * f * 0.85, z * f);
  }
  geo.computeVertexNormals();
  const mats = [0x4a6b36, 0x587c3e, 0x6b7138].map(c =>
    windMachen(new THREE.MeshStandardMaterial(Object.assign({
      color: c, roughness: 0.95, flatShading: false,
      normalScale: new THREE.Vector2(1.6, 1.6)
    }, stein(3.5))), 0.03, 1.2));
  const listen = [[], [], []];
  plaetze.forEach(pl => listen[Math.floor(zuf() * 3) % 3].push(pl));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const buschFarbe = new THREE.Color();
  listen.forEach((liste, v) => {
    const im = new THREE.InstancedMesh(geo, mats[v], Math.max(1, liste.length));
    liste.forEach((pl, i) => {
      const gr = 0.6 + pl.r * 1.3;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), zuf() * 6.28);
      p.set(pl.x, pl.h + gr * 0.3, pl.z);
      s.set(gr * 1.1, gr * 0.72, gr * (0.9 + zuf() * 0.4));
      im.setMatrixAt(i, m.compose(p, q, s));
      const bt = zuf();
      schattenFlecken.push({ x: pl.x, z: pl.z, h: pl.h, r: gr * 1.1 });
      buschFarbe.setRGB(0.78 + bt * 0.45, 0.86 + bt * 0.3, 0.7 + bt * 0.35);
      im.setColorAt(i, buschFarbe);
      if (gr > 1.4) versteckplaetze.push({
        pos: new THREE.Vector3(pl.x, pl.h, pl.z), art: 'busch', radius: gr
      });
    });
    im.count = liste.length;
    im.castShadow = true;
    gruppe.add(im);
  });
  return plaetze;
}

/* ---------- Grasbüschel ---------- */
function grasGeometrie() {
  const geo = new THREE.BufferGeometry();
  const pos = [], uv = [], nor = [], idx = [];
  const breit = 0.42, hoch = 0.46;
  for (let k = 0; k < 3; k++) {
    const w = (k / 3) * Math.PI;
    const cx = Math.cos(w), cz = Math.sin(w);
    const b = pos.length / 3;
    pos.push(-cx * breit / 2, 0, -cz * breit / 2);
    pos.push(cx * breit / 2, 0, cz * breit / 2);
    pos.push(cx * breit / 2, hoch, cz * breit / 2);
    pos.push(-cx * breit / 2, hoch, -cz * breit / 2);
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    for (let n = 0; n < 4; n++) nor.push(0, 1, 0);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}
function gras(gruppe, zuf, menge) {
  const plaetze = setze([], menge, (x, z, h, n, d) => h > 0.6 && h < 19 && n < 0.75 && d > 3, zuf);
  const geo = grasGeometrie();
  const karte = textur(grasTextur(128), 1, true);
  const mat = windMachen(new THREE.MeshStandardMaterial({
    map: karte, alphaTest: 0.42, transparent: false, roughness: 1,
    side: THREE.DoubleSide
  }), 0.16, 1.8);
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, plaetze.length));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sv = new THREE.Vector3();
  const farbe = new THREE.Color();
  plaetze.forEach((pl, i) => {
    const gr = 0.75 + pl.r * 0.95;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), zuf() * 6.28);
    p.set(pl.x, pl.h - 0.03, pl.z);
    sv.set(gr, gr * (0.75 + zuf() * 0.7), gr);
    im.setMatrixAt(i, m.compose(p, q, sv));
    const t = zuf();
    farbe.setRGB(0.78 + t * 0.4, 0.86 + t * 0.28, 0.68 + t * 0.34);
    im.setColorAt(i, farbe);
  });
  im.count = plaetze.length;
  im.castShadow = false;
  im.receiveShadow = true;
  gruppe.add(im);
}

/* ---------- Blumen ---------- */
function blumen(gruppe, zuf, menge) {
  const plaetze = setze([], menge, (x, z, h, n, d) => h > 1 && h < 16 && n < 0.4 && d > 4, zuf);
  const geo = new THREE.SphereGeometry(0.075, 6, 4);
  const mats = [0xf0e6a0, 0xd8d0e8, 0xe8b0c0, 0xf2f2f2].map(c =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
  const listen = [[], [], [], []];
  plaetze.forEach(pl => listen[Math.floor(zuf() * 4) % 4].push(pl));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  listen.forEach((liste, v) => {
    const im = new THREE.InstancedMesh(geo, mats[v], Math.max(1, liste.length));
    liste.forEach((pl, i) => {
      p.set(pl.x, pl.h + 0.22, pl.z);
      im.setMatrixAt(i, m.compose(p, q, s));
    });
    im.count = liste.length;
    gruppe.add(im);
  });
}

/* ---------- Murmeltierlöcher ---------- */
function loecher(gruppe, zuf, menge) {
  const plaetze = setze([], menge, (x, z, h, n, d) =>
    h > 2 && h < 18 && n < 0.35 && d > 9, zuf);
  const geo = new THREE.CircleGeometry(0.3, 14);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1d1813, roughness: 1 });
  const huegelG = new THREE.SphereGeometry(0.95, 12, 7, 0, 6.3, 0, 1.0);
  const huegelM = new THREE.MeshStandardMaterial({ color: 0x6b5a44, roughness: 1, flatShading: true });
  plaetze.forEach(pl => {
    const hu = new THREE.Mesh(huegelG, huegelM);
    hu.position.set(pl.x, pl.h - 0.08, pl.z);
    hu.scale.set(0.95, 0.32, 0.95);
    hu.receiveShadow = true;
    gruppe.add(hu);
    const lo = new THREE.Mesh(geo, mat);
    lo.position.set(pl.x, pl.h + 0.19, pl.z);
    gruppe.add(lo);
    versteckplaetze.push({ pos: new THREE.Vector3(pl.x, pl.h, pl.z), art: 'loch', radius: 0.9 });
  });
  return plaetze;
}

/* ---------- Totholz ---------- */
function totholz(gruppe, zuf, menge) {
  const plaetze = setze([], menge, (x, z, h, n, d) => h > 1 && h < 16 && n < 0.4 && d > 5, zuf);
  const geo = new THREE.CylinderGeometry(0.22, 0.3, 1, 7, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0x6a5a46, roughness: 1 });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const e = new THREE.Euler();
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, plaetze.length));
  plaetze.forEach((pl, i) => {
    const lang = 2 + pl.r * 3;
    e.set(Math.PI / 2 + (zuf() - 0.5) * 0.2, zuf() * 6.28, 0);
    q.setFromEuler(e);
    p.set(pl.x, pl.h + 0.25, pl.z);
    s.set(1, lang, 1);
    im.setMatrixAt(i, m.compose(p, q, s));
    versteckplaetze.push({ pos: new THREE.Vector3(pl.x, pl.h, pl.z), art: 'busch', radius: 1.2 });
  });
  im.count = plaetze.length;
  im.castShadow = true;
  gruppe.add(im);
  hindernisse.push(im);
}

/* ---------- Geröll in der Höhe ---------- */
function geroell(gruppe, zuf, menge) {
  const plaetze = setze([], menge, (x, z, h, n, d) => (h > 11 || n > 0.45) && d > 3, zuf);
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    pos.setXYZ(i, x * (0.8 + rauschen(x * 3, z * 3) * 0.5), y * 0.55, z * (0.8 + rauschen(z * 4, x * 2) * 0.5));
  }
  geo.computeVertexNormals();
  const mats = [0x9c978f, 0x7d786f, 0xb0aaa0].map(c =>
    new THREE.MeshStandardMaterial(Object.assign({
      color: c, roughness: 1, flatShading: true
    }, stein(1.6))));
  const listen = [[], [], []];
  plaetze.forEach(pl => listen[Math.floor(zuf() * 3) % 3].push(pl));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sv = new THREE.Vector3();
  const e = new THREE.Euler();
  listen.forEach((liste, v) => {
    const im = new THREE.InstancedMesh(geo, mats[v], Math.max(1, liste.length));
    liste.forEach((pl, i) => {
      const gr = 0.13 + Math.pow(pl.r, 2) * 0.55;
      e.set(zuf() * 0.6 - 0.3, zuf() * 6.28, zuf() * 0.6 - 0.3);
      q.setFromEuler(e);
      p.set(pl.x, pl.h + gr * 0.12, pl.z);
      sv.set(gr, gr, gr * (0.8 + zuf() * 0.5));
      im.setMatrixAt(i, m.compose(p, q, sv));
    });
    im.count = liste.length;
    im.receiveShadow = true;
    gruppe.add(im);
  });
}

/* ---------- weiche Flecken auf dem Boden ---------- */
function bodenFlecken(gruppe) {
  if (!schattenFlecken.length) return;
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: textur(fleckTextur(128), 1), transparent: true, opacity: 0.22,
    color: 0x14160f, depthWrite: false
  });
  const im = new THREE.InstancedMesh(geo, mat, schattenFlecken.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sv = new THREE.Vector3();
  schattenFlecken.forEach((f, i) => {
    p.set(f.x, hoeheBei(f.x, f.z) + 0.07, f.z);
    sv.set(f.r * 1.8, 1, f.r * 1.8);
    im.setMatrixAt(i, m.compose(p, q, sv));
  });
  im.renderOrder = 1;
  gruppe.add(im);
}

/* ---------- alles zusammen ---------- */
export function erzeugeNatur(sparsam = false) {
  const gruppe = new THREE.Group();
  gruppe.name = 'natur';
  const zuf = zufallGeber(20261111);
  versteckplaetze.length = 0;
  hindernisse.length = 0;
  schattenFlecken.length = 0;
  brocken.length = 0;
  fichten(gruppe, zuf, sparsam ? 110 : 170);
  felsen(gruppe, zuf, sparsam ? 170 : 260);
  buesche(gruppe, zuf, sparsam ? 130 : 200);
  loecher(gruppe, zuf, 7);
  totholz(gruppe, zuf, 14);
  geroell(gruppe, zuf, sparsam ? 700 : 1300);
  gras(gruppe, zuf, sparsam ? 2600 : 5200);
  blumen(gruppe, zuf, sparsam ? 300 : 650);
  bodenFlecken(gruppe);
  return gruppe;
}
