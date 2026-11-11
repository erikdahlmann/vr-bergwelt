// Tiermodelle aus einfachen Körpern. Jedes Tier hat echte Maße in Metern.
import * as THREE from 'three';

const M = (farbe, extra = {}) => new THREE.MeshStandardMaterial(
  Object.assign({ color: farbe, roughness: 0.82, flatShading: false }, extra));

function teil(gruppe, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  gruppe.add(m);
  return m;
}
function bein(gruppe, mat, x, y, z, lang, dick) {
  const huefte = new THREE.Group();
  huefte.position.set(x, y, z);
  const geo = new THREE.CylinderGeometry(dick * 0.7, dick, lang, 8, 1);
  geo.translate(0, -lang / 2, 0);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  huefte.add(m);
  gruppe.add(huefte);
  return huefte;
}
function fluegelGeo(lang, innen, aussen) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, -innen / 2, 0, 0, innen / 2,
    lang, 0, aussen / 2, lang, 0, -aussen / 2
  ], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  return g;
}
function hornGeo(radius) {
  const g = new THREE.TorusGeometry(radius, radius * 0.16, 6, 14, Math.PI * 1.15);
  return g;
}

/* ---------------- Steinbock ---------------- */
function steinbock() {
  const g = new THREE.Group();
  const fell = M(0x8a7254), dunkel = M(0x4a3c2b), horn = M(0x5d5346);
  const koerper = teil(g, new THREE.SphereGeometry(0.48, 16, 12), fell, 0, 0.78, 0);
  koerper.scale.set(1.45, 0.92, 0.95);
  const hals = teil(g, new THREE.CylinderGeometry(0.17, 0.22, 0.52, 8), fell, 0.6, 1.02, 0);
  hals.rotation.z = -0.55;
  const kopf = new THREE.Group();
  kopf.position.set(0.85, 1.22, 0);
  g.add(kopf);
  const schaedel = teil(kopf, new THREE.SphereGeometry(0.17, 10, 8), fell, 0, 0, 0);
  schaedel.scale.set(1.5, 0.95, 0.9);
  teil(kopf, new THREE.SphereGeometry(0.035, 6, 5), dunkel, 0.2, 0.03, 0.08);
  teil(kopf, new THREE.SphereGeometry(0.035, 6, 5), dunkel, 0.2, 0.03, -0.08);
  teil(kopf, new THREE.ConeGeometry(0.06, 0.26, 6), dunkel, -0.05, -0.16, 0).rotation.x = 0.3;
  for (const s of [1, -1]) {
    const h = teil(kopf, hornGeo(0.40), horn, -0.30, 0.13, s * 0.085);
    h.rotation.set(0, s * 0.14, 0);
    h.scale.set(1, 0.78, 1);
    const ohr = teil(kopf, new THREE.SphereGeometry(0.07, 6, 5), fell, -0.04, 0.0, s * 0.16);
    ohr.scale.set(0.5, 1, 1.5);
  }
  const beine = [
    bein(g, dunkel, 0.42, 0.68, 0.26, 0.68, 0.075),
    bein(g, dunkel, 0.42, 0.68, -0.26, 0.68, 0.075),
    bein(g, dunkel, -0.45, 0.68, 0.26, 0.68, 0.08),
    bein(g, dunkel, -0.45, 0.68, -0.26, 0.68, 0.08)
  ];
  const schwanz = teil(g, new THREE.ConeGeometry(0.07, 0.22, 6), dunkel, -0.68, 0.9, 0);
  schwanz.rotation.z = 1.2;
  return { gruppe: g, beine, kopf, schwanz, fluegel: [], koerper, hitRadius: 0.95, hitHoehe: 0.8 };
}

/* ---------------- Gämse ---------------- */
function gaemse() {
  const g = new THREE.Group();
  const fell = M(0x6a4f32), dunkel = M(0x2a211a), hell = M(0xd8cdb6), horn = M(0x33302c);
  const koerper = teil(g, new THREE.SphereGeometry(0.4, 16, 12), fell, 0, 0.72, 0);
  koerper.scale.set(1.4, 0.88, 0.85);
  const hals = teil(g, new THREE.CylinderGeometry(0.1, 0.16, 0.5, 8), fell, 0.48, 1.0, 0);
  hals.rotation.z = -0.35;
  const kopf = new THREE.Group();
  kopf.position.set(0.68, 1.2, 0);
  g.add(kopf);
  const schaedel = teil(kopf, new THREE.SphereGeometry(0.13, 10, 8), hell, 0, 0, 0);
  schaedel.scale.set(1.6, 0.95, 0.85);
  teil(kopf, new THREE.SphereGeometry(0.03, 6, 5), dunkel, 0.14, 0.02, 0.07);
  teil(kopf, new THREE.SphereGeometry(0.03, 6, 5), dunkel, 0.14, 0.02, -0.07);
  const streif = teil(kopf, new THREE.BoxGeometry(0.3, 0.07, 0.02), dunkel, 0.05, 0.03, 0.075);
  streif.rotation.z = 0.1;
  teil(kopf, new THREE.BoxGeometry(0.3, 0.07, 0.02), dunkel, 0.05, 0.03, -0.075).rotation.z = 0.1;
  for (const s of [1, -1]) {
    const h = teil(kopf, new THREE.CylinderGeometry(0.012, 0.03, 0.26, 5), horn, -0.04, 0.2, s * 0.06);
    h.rotation.z = -0.1 * s;
    const hak = teil(kopf, hornGeo(0.055), horn, -0.04, 0.275, s * 0.06);
    hak.rotation.set(0, 0, Math.PI / 2);
    const ohr = teil(kopf, new THREE.SphereGeometry(0.06, 6, 5), fell, -0.06, 0.04, s * 0.13);
    ohr.scale.set(0.4, 1.4, 0.9);
  }
  const beine = [
    bein(g, dunkel, 0.34, 0.64, 0.2, 0.66, 0.055),
    bein(g, dunkel, 0.34, 0.64, -0.2, 0.66, 0.055),
    bein(g, dunkel, -0.36, 0.64, 0.2, 0.66, 0.06),
    bein(g, dunkel, -0.36, 0.64, -0.2, 0.66, 0.06)
  ];
  const schwanz = teil(g, new THREE.ConeGeometry(0.05, 0.18, 6), dunkel, -0.56, 0.85, 0);
  schwanz.rotation.z = 1.4;
  return { gruppe: g, beine, kopf, schwanz, fluegel: [], koerper, hitRadius: 0.9, hitHoehe: 0.75 };
}

/* ---------------- Murmeltier ---------------- */
function murmeltier() {
  const g = new THREE.Group();
  const fell = M(0x9a7b4f), bauch = M(0xc2a476), dunkel = M(0x4b3a24);
  const koerper = teil(g, new THREE.SphereGeometry(0.2, 16, 12), fell, 0, 0.21, 0);
  koerper.scale.set(1.55, 1.0, 1.1);
  const bauchT = teil(g, new THREE.SphereGeometry(0.17, 10, 8), bauch, 0.03, 0.16, 0);
  bauchT.scale.set(1.3, 0.7, 0.95);
  const kopf = new THREE.Group();
  kopf.position.set(0.28, 0.26, 0);
  g.add(kopf);
  const schaedel = teil(kopf, new THREE.SphereGeometry(0.12, 10, 8), fell, 0, 0, 0);
  schaedel.scale.set(1.25, 0.95, 1.0);
  teil(kopf, new THREE.SphereGeometry(0.022, 6, 5), dunkel, 0.12, 0.03, 0.055);
  teil(kopf, new THREE.SphereGeometry(0.022, 6, 5), dunkel, 0.12, 0.03, -0.055);
  teil(kopf, new THREE.SphereGeometry(0.03, 6, 5), dunkel, 0.15, -0.02, 0);
  for (const s of [1, -1]) {
    const ohr = teil(kopf, new THREE.SphereGeometry(0.04, 6, 5), dunkel, -0.03, 0.09, s * 0.09);
    ohr.scale.set(0.4, 1, 1);
  }
  const beine = [
    bein(g, fell, 0.16, 0.14, 0.12, 0.14, 0.04),
    bein(g, fell, 0.16, 0.14, -0.12, 0.14, 0.04),
    bein(g, fell, -0.16, 0.15, 0.13, 0.15, 0.05),
    bein(g, fell, -0.16, 0.15, -0.13, 0.15, 0.05)
  ];
  const schwanz = teil(g, new THREE.ConeGeometry(0.06, 0.26, 6), dunkel, -0.33, 0.22, 0);
  schwanz.rotation.z = 1.9;
  return { gruppe: g, beine, kopf, schwanz, fluegel: [], koerper, hitRadius: 0.55, hitHoehe: 0.3, kannSitzen: true };
}

/* ---------------- Steinadler ---------------- */
function steinadler() {
  const g = new THREE.Group();
  const feder = M(0x4a3a2a, { side: THREE.DoubleSide }), hell = M(0x8d7352, { side: THREE.DoubleSide });
  const schnabel = M(0xd9b03c), dunkel = M(0x241c14);
  const koerper = teil(g, new THREE.SphereGeometry(0.17, 16, 12), feder, 0, 0, 0);
  koerper.scale.set(2.1, 0.95, 0.95);
  const kopf = new THREE.Group();
  kopf.position.set(0.36, 0.06, 0);
  g.add(kopf);
  const schaedel = teil(kopf, new THREE.SphereGeometry(0.1, 10, 8), hell, 0, 0, 0);
  schaedel.scale.set(1.1, 0.95, 0.9);
  const sn = teil(kopf, new THREE.ConeGeometry(0.045, 0.16, 6), schnabel, 0.14, -0.01, 0);
  sn.rotation.z = -Math.PI / 2 - 0.25;
  teil(kopf, new THREE.SphereGeometry(0.018, 6, 5), dunkel, 0.07, 0.04, 0.06);
  teil(kopf, new THREE.SphereGeometry(0.018, 6, 5), dunkel, 0.07, 0.04, -0.06);
  const fluegel = [];
  for (const s of [1, -1]) {
    const dreh = new THREE.Group();
    dreh.position.set(0.02, 0.06, s * 0.1);
    const innen = new THREE.Group();
    innen.rotation.y = -s * Math.PI / 2;   // Flügel zeigt zur Seite
    const fl = new THREE.Mesh(fluegelGeo(0.95, 0.52, 0.24), feder);
    fl.castShadow = true;
    innen.add(fl);
    const spitze = new THREE.Mesh(fluegelGeo(0.22, 0.24, 0.09), dunkel);
    spitze.position.set(0.95, 0, 0);
    innen.add(spitze);
    dreh.add(innen);
    dreh.userData.seite = s;
    g.add(dreh);
    fluegel.push(dreh);
  }
  const schwanz = new THREE.Mesh(fluegelGeo(0.42, 0.12, 0.34), hell);
  schwanz.rotation.y = Math.PI;
  schwanz.position.set(-0.3, 0.02, 0);
  g.add(schwanz);
  for (const s of [1, -1]) {
    const kl = teil(g, new THREE.CylinderGeometry(0.02, 0.02, 0.14, 5), schnabel, 0.02, -0.12, s * 0.07);
    kl.rotation.x = 0.4;
  }
  return { gruppe: g, beine: [], kopf, schwanz, fluegel, koerper, hitRadius: 1.1, hitHoehe: 0, flieger: true };
}

/* ---------------- Alpendohle ---------------- */
function alpendohle() {
  const g = new THREE.Group();
  const feder = M(0x2b2b30, { side: THREE.DoubleSide }), schnabel = M(0xe0c13a), fuss = M(0xb3453a);
  const koerper = teil(g, new THREE.SphereGeometry(0.09, 10, 8), feder, 0, 0.13, 0);
  koerper.scale.set(1.8, 1.0, 1.0);
  const kopf = new THREE.Group();
  kopf.position.set(0.16, 0.21, 0);
  g.add(kopf);
  teil(kopf, new THREE.SphereGeometry(0.06, 8, 7), feder, 0, 0, 0);
  const sn = teil(kopf, new THREE.ConeGeometry(0.02, 0.09, 5), schnabel, 0.09, -0.01, 0);
  sn.rotation.z = -Math.PI / 2;
  teil(kopf, new THREE.SphereGeometry(0.012, 5, 4), M(0x111111), 0.045, 0.025, 0.04);
  teil(kopf, new THREE.SphereGeometry(0.012, 5, 4), M(0x111111), 0.045, 0.025, -0.04);
  const fluegel = [];
  for (const s of [1, -1]) {
    const dreh = new THREE.Group();
    dreh.position.set(0.0, 0.15, s * 0.055);
    const innen = new THREE.Group();
    innen.rotation.y = -s * Math.PI / 2;
    const fl = new THREE.Mesh(fluegelGeo(0.3, 0.22, 0.09), feder);
    fl.castShadow = true;
    innen.add(fl);
    dreh.add(innen);
    dreh.userData.seite = s;
    g.add(dreh);
    fluegel.push(dreh);
  }
  const schwanz = new THREE.Mesh(fluegelGeo(0.2, 0.08, 0.14), feder);
  schwanz.rotation.y = Math.PI;
  schwanz.position.set(-0.16, 0.13, 0);
  g.add(schwanz);
  const beine = [
    bein(g, fuss, 0.03, 0.07, 0.04, 0.09, 0.012),
    bein(g, fuss, 0.03, 0.07, -0.04, 0.09, 0.012)
  ];
  return { gruppe: g, beine, kopf, schwanz, fluegel, koerper, hitRadius: 0.4, hitHoehe: 0.16, flattert: true };
}

/* ---------------- Schneehase ---------------- */
function schneehase() {
  const g = new THREE.Group();
  const fell = M(0x9a9287), hell = M(0xe4e0d8), dunkel = M(0x3b352e);
  const koerper = teil(g, new THREE.SphereGeometry(0.15, 14, 11), fell, 0, 0.19, 0);
  koerper.scale.set(1.5, 1.0, 1.0);
  const kopf = new THREE.Group();
  kopf.position.set(0.22, 0.26, 0);
  g.add(kopf);
  const schaedel = teil(kopf, new THREE.SphereGeometry(0.085, 9, 8), fell, 0, 0, 0);
  schaedel.scale.set(1.3, 0.95, 0.9);
  teil(kopf, new THREE.SphereGeometry(0.018, 6, 5), dunkel, 0.07, 0.03, 0.055);
  teil(kopf, new THREE.SphereGeometry(0.018, 6, 5), dunkel, 0.07, 0.03, -0.055);
  teil(kopf, new THREE.SphereGeometry(0.02, 6, 5), M(0xb08880), 0.11, -0.02, 0);
  const ohren = [];
  for (const s of [1, -1]) {
    const o = teil(kopf, new THREE.CylinderGeometry(0.02, 0.034, 0.19, 6), fell, -0.035, 0.125, s * 0.05);
    o.scale.z = 0.45;
    o.rotation.set(s * 0.2, 0, 0.3);
    const innen = teil(kopf, new THREE.CylinderGeometry(0.012, 0.021, 0.16, 5), M(0xc9b8ad), -0.03, 0.125, s * 0.062);
    innen.scale.z = 0.4;
    innen.rotation.set(s * 0.2, 0, 0.3);
    ohren.push(o);
  }
  const beine = [
    bein(g, fell, 0.14, 0.12, 0.09, 0.12, 0.028),
    bein(g, fell, 0.14, 0.12, -0.09, 0.12, 0.028),
    bein(g, fell, -0.13, 0.15, 0.1, 0.15, 0.045),
    bein(g, fell, -0.13, 0.15, -0.1, 0.15, 0.045)
  ];
  const schwanz = teil(g, new THREE.SphereGeometry(0.05, 7, 6), hell, -0.24, 0.2, 0);
  return { gruppe: g, beine, kopf, schwanz, ohren, fluegel: [], koerper, hitRadius: 0.45, hitHoehe: 0.25, huepft: true };
}

/* ---------------- Alpensalamander ---------------- */
function alpensalamander() {
  const g = new THREE.Group();
  const haut = M(0x1c1c20, { roughness: 0.45 });
  const koerper = teil(g, new THREE.SphereGeometry(0.03, 9, 7), haut, -0.01, 0.032, 0);
  koerper.scale.set(3.4, 0.82, 1.15);
  const kopf = new THREE.Group();
  kopf.position.set(0.105, 0.034, 0);
  g.add(kopf);
  const schaedel = teil(kopf, new THREE.SphereGeometry(0.026, 8, 6), haut, 0, 0, 0);
  schaedel.scale.set(1.2, 0.8, 1.1);
  teil(kopf, new THREE.SphereGeometry(0.006, 5, 4), M(0x000000), 0.02, 0.012, 0.016);
  teil(kopf, new THREE.SphereGeometry(0.006, 5, 4), M(0x000000), 0.02, 0.012, -0.016);
  const schwanz = teil(g, new THREE.ConeGeometry(0.024, 0.13, 7), haut, -0.155, 0.03, 0);
  schwanz.rotation.z = Math.PI / 2;
  const beine = [
    bein(g, haut, 0.06, 0.028, 0.032, 0.032, 0.008),
    bein(g, haut, 0.06, 0.028, -0.032, 0.032, 0.008),
    bein(g, haut, -0.06, 0.028, 0.032, 0.032, 0.008),
    bein(g, haut, -0.06, 0.028, -0.032, 0.032, 0.008)
  ];
  beine.forEach((b, i) => { b.rotation.x = (i % 2 ? 1 : -1) * 0.85; });
  return { gruppe: g, beine, kopf, schwanz, fluegel: [], koerper, hitRadius: 0.3, hitHoehe: 0.06, watschelt: true };
}

/* ---------------- Kreuzotter ---------------- */
function kreuzotter() {
  const g = new THREE.Group();
  const hell = M(0x9b8b63, { roughness: 0.55 }), dunkel = M(0x3a3024, { roughness: 0.55 });
  const segmente = [];
  const anz = 16;
  let x = 0;
  for (let i = 0; i < anz; i++) {
    const t = i / (anz - 1);
    const r = 0.036 * (1 - 0.55 * Math.pow(t, 2.0)) * (i === 0 ? 1.15 : 1);
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 9, 7), i % 2 ? dunkel : hell);
    s.scale.set(1.3, 0.78, 1.15);
    s.position.set(x, 0.027 + r * 0.2, Math.sin(i * 0.42) * 0.05);
    s.castShadow = true;
    g.add(s);
    segmente.push(s);
    x -= r * 1.55;
  }
  const kopf = new THREE.Group();
  kopf.position.set(0.055, 0.032, 0);
  g.add(kopf);
  const schaedel = teil(kopf, new THREE.SphereGeometry(0.042, 8, 7), hell, 0, 0, 0);
  schaedel.scale.set(1.2, 0.65, 1.0);
  teil(kopf, new THREE.SphereGeometry(0.008, 5, 4), M(0xbb2200), 0.025, 0.008, 0.018);
  teil(kopf, new THREE.SphereGeometry(0.008, 5, 4), M(0xbb2200), 0.025, 0.008, -0.018);
  const zunge = teil(kopf, new THREE.BoxGeometry(0.05, 0.004, 0.006), M(0xcc3344), 0.07, -0.005, 0);
  return { gruppe: g, beine: [], kopf, schwanz: null, segmente, zunge, fluegel: [], koerper: segmente[0], hitRadius: 0.4, hitHoehe: 0.06, schlaengelt: true };
}

export const BAUER = {
  steinbock, gaemse, murmeltier, steinadler, alpendohle, schneehase, alpensalamander, kreuzotter
};
