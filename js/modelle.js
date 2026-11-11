// Tiermodelle aus einfachen Körpern, mit Gelenken zum Animieren.
// Alle Maße in Metern. Das Tier schaut in +x, die Seiten sind ±z.
import * as THREE from 'three';

const M = (farbe, extra = {}) => new THREE.MeshStandardMaterial(
  Object.assign({ color: farbe, roughness: 0.8, flatShading: false }, extra));

function teil(eltern, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  eltern.add(m);
  return m;
}
function gruppe(eltern, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  eltern.add(g);
  return g;
}
// Hängendes Glied: beginnt im Ursprung und zeigt nach unten
function gliedGeo(oben, unten, lang, seg = 8) {
  const g = new THREE.CylinderGeometry(oben, unten, lang, seg, 1);
  g.translate(0, -lang / 2, 0);
  return g;
}

/* Bein mit Knie. richtung: -1 Vorderbein (knickt nach hinten), +1 Hinterbein. */
function bein(eltern, fellM, hufM, pos, obenLang, untenLang, dick, richtung, vorne, seite) {
  const huefte = gruppe(eltern, pos[0], pos[1], pos[2]);
  teil(huefte, gliedGeo(dick * 1.15, dick * 0.8, obenLang), fellM);
  const knie = gruppe(huefte, 0, -obenLang, 0);
  teil(knie, new THREE.SphereGeometry(dick * 0.85, 8, 6), fellM);
  teil(knie, gliedGeo(dick * 0.72, dick * 0.52, untenLang), fellM);
  const fuss = gruppe(knie, 0, -untenLang, 0);
  const huf = teil(fuss, new THREE.SphereGeometry(dick * 0.78, 8, 6), hufM);
  huf.scale.set(1.25, 0.8, 1.0);
  return { huefte, knie, fuss, richtung, vorne, seite, lang: obenLang + untenLang };
}

/* Schwanz oder Hals als Kette aus Gliedern */
function kette(eltern, mat, start, glieder, lang, dickAnfang, dickEnde) {
  const teile = [];
  let el = gruppe(eltern, start[0], start[1], start[2]);
  const wurzel = el;
  for (let i = 0; i < glieder; i++) {
    const t = i / glieder;
    const d0 = dickAnfang + (dickEnde - dickAnfang) * t;
    const d1 = dickAnfang + (dickEnde - dickAnfang) * ((i + 1) / glieder);
    const g = new THREE.CylinderGeometry(d1, d0, lang, 7, 1);
    g.rotateZ(Math.PI / 2);          // zeigt jetzt nach -x
    g.translate(-lang / 2, 0, 0);
    teil(el, g, mat);
    const naechste = gruppe(el, -lang, 0, 0);
    teile.push(el);
    el = naechste;
  }
  return { wurzel, teile, spitze: el };
}

function auge(eltern, x, y, z, r, farbe = 0x120e0a) {
  const a = teil(eltern, new THREE.SphereGeometry(r, 8, 6), M(farbe, { roughness: 0.25 }), x, y, z);
  return a;
}

function fluegelGeo(lang, innen, aussen, pfeil = 0.12) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, -innen * 0.45, 0, 0, innen * 0.55,
    lang, 0, aussen * 0.55 - pfeil * lang, lang, 0, -aussen * 0.45 - pfeil * lang
  ], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 1, 0], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  return g;
}

/* Flügel mit Schulter- und Handgelenk, zeigt zur Seite */
function fluegel(eltern, federM, spitzeM, pos, seite, innenLang, aussenLang, breite) {
  const schulter = gruppe(eltern, pos[0], pos[1], pos[2] * seite);
  const dreh = gruppe(schulter);
  dreh.rotation.y = -seite * Math.PI / 2;      // Flügel zeigt zur Seite
  const arm = new THREE.Mesh(fluegelGeo(innenLang, breite, breite * 0.92), federM);
  arm.castShadow = true;
  dreh.add(arm);
  const hand = gruppe(dreh, innenLang, 0, 0);
  const schwinge = new THREE.Mesh(fluegelGeo(aussenLang, breite * 0.92, breite * 0.45, 0.3), spitzeM);
  schwinge.castShadow = true;
  hand.add(schwinge);
  return { schulter, hand, seite };
}



/* Mehrere Geometrien zu einer verschmelzen – spart Zeichenaufrufe.
   stuecke: [{geo, pos?, rot?, scale?}] */
function verschmelze(stuecke) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const pos = [], norm = [], uv = [];
  for (const st of stuecke) {
    const g = (st.geo.index ? st.geo.toNonIndexed() : st.geo.clone());
    e.set(...(st.rot || [0, 0, 0]));
    q.setFromEuler(e);
    m.compose(
      new THREE.Vector3(...(st.pos || [0, 0, 0])), q,
      new THREE.Vector3(...(st.scale || [1, 1, 1])));
    g.applyMatrix4(m);
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i++) pos.push(p[i]);
    for (let i = 0; i < n.length; i++) norm.push(n[i]);
    const u = g.attributes.uv ? g.attributes.uv.array : null;
    for (let i = 0; i < p.length / 3 * 2; i++) uv.push(u ? u[i] : 0);
    g.dispose();
  }
  const ganz = new THREE.BufferGeometry();
  ganz.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  ganz.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  ganz.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return ganz;
}

/* Hals als Glied vom Rumpf zum Kopf. neigung: wie steil der Hals steht. */
function halsKopf(eltern, mat, basis, lang, dickUnten, dickOben, neigung) {
  const hals = gruppe(eltern, basis[0], basis[1], basis[2]);
  hals.rotation.z = neigung;
  const geo = new THREE.CylinderGeometry(dickOben, dickUnten, lang, 9, 1);
  geo.rotateZ(-Math.PI / 2);         // zeigt jetzt nach +x
  geo.translate(lang / 2, 0, 0);
  teil(hals, geo, mat);
  const kopf = gruppe(hals, lang, 0, 0);
  kopf.rotation.z = -neigung;        // Kopf steht wieder waagerecht
  return { hals, kopf, halsBasis: neigung, kopfBasis: -neigung };
}

/* ---------------- Alpensteinbock ---------------- */
function steinbock() {
  const g = new THREE.Group();
  const fell = M(0x8d7556), bauch = M(0xa89477), dunkel = M(0x4b3d2c);
  const horn = M(0x5f5648, { roughness: 0.6 }), huf = M(0x2e2823);
  const rumpf = teil(g, verschmelze([
    { geo: new THREE.SphereGeometry(0.3, 16, 12), pos: [-0.02, 0, 0], scale: [2.35, 0.95, 0.82] },
    { geo: new THREE.SphereGeometry(0.26, 12, 9), pos: [0.34, 0.08, 0], scale: [1.0, 1.05, 0.98] },
    { geo: new THREE.SphereGeometry(0.25, 12, 9), pos: [-0.42, 0.08, 0], scale: [0.95, 1.0, 0.95] }
  ]), fell, 0, 0.84, 0);
  const b = teil(g, new THREE.SphereGeometry(0.27, 12, 9), bauch, -0.04, 0.76, 0);
  b.scale.set(2.0, 0.76, 0.88);
  // Hals und Kopf
  const hk = halsKopf(g, fell, [0.48, 1.0, 0], 0.5, 0.2, 0.13, 0.85);
  const hals = hk.hals, kopf = hk.kopf;
  const schaedel = teil(kopf, new THREE.SphereGeometry(0.14, 12, 9), fell, 0.04, 0, 0);
  schaedel.scale.set(1.7, 1.0, 0.92);
  teil(kopf, new THREE.SphereGeometry(0.07, 9, 7), dunkel, 0.26, -0.03, 0).scale.set(1.1, 0.85, 0.9);
  const augen = [auge(kopf, 0.1, 0.05, 0.1, 0.028), auge(kopf, 0.1, 0.05, -0.1, 0.028)];
  const bart = teil(kopf, new THREE.ConeGeometry(0.05, 0.22, 7), dunkel, -0.02, -0.14, 0);
  bart.rotation.z = 0.25;
  const ohren = [];
  for (const s of [1, -1]) {
    // Horn: ein Netz aus Bögen, nach hinten dünner, mit Knoten
    const bogen = Math.PI * 1.5, stufen = 8, stuecke = [];
    for (let k = 0; k < stufen; k++) {
      const u = k / stufen;
      const dicke = 0.095 * (1 - 0.7 * u);
      stuecke.push({
        geo: new THREE.TorusGeometry(0.4, dicke, 7, 6, (bogen / stufen) * 1.1),
        rot: [0, 0, (bogen / stufen) * k], scale: [1, 0.82, 1]
      });
      if (k < stufen - 1) {
        const w = (bogen / stufen) * (k + 1);
        stuecke.push({
          geo: new THREE.TorusGeometry(dicke * 1.02, dicke * 0.3, 5, 9),
          pos: [Math.cos(w) * 0.4, Math.sin(w) * 0.4 * 0.82, 0],
          rot: [Math.PI / 2, 0, w]
        });
      }
    }
    const hornNetz = teil(kopf, verschmelze(stuecke), horn, -0.32, 0.09, s * 0.075);
    hornNetz.rotation.y = s * 0.16;
    const o = gruppe(kopf, -0.05, 0.03, s * 0.12);
    const om = teil(o, new THREE.SphereGeometry(0.055, 8, 6), fell, 0, 0, s * 0.03);
    om.scale.set(0.55, 1.1, 1.7);
    ohren.push({ dreh: o, seite: s });
  }
  const beine = [
    bein(g, fell, huf, [0.42, 0.76, 0.15], 0.34, 0.34, 0.078, -1, true, 1),
    bein(g, fell, huf, [0.42, 0.76, -0.15], 0.34, 0.34, 0.078, -1, true, -1),
    bein(g, fell, huf, [-0.42, 0.78, 0.16], 0.36, 0.34, 0.086, 1, false, 1),
    bein(g, fell, huf, [-0.42, 0.78, -0.16], 0.36, 0.34, 0.086, 1, false, -1)
  ];
  const schwanz = kette(g, dunkel, [-0.62, 0.9, 0], 2, 0.1, 0.05, 0.03);
  schwanz.wurzel.rotation.z = -0.5;
  return {
    gruppe: g, typ: 'vierbeiner', beine, hals, kopf, augen, ohren, schwanz,
    rumpf, widerrist: 1.0, hitRadius: 0.95, hitHoehe: 0.85,
    halsBasis: hk.halsBasis, kopfBasis: hk.kopfBasis
  };
}

/* ---------------- Gämse ---------------- */
function gaemse() {
  const g = new THREE.Group();
  const fell = M(0x6b4f33), hell = M(0xd9cdb4), dunkel = M(0x2a2119);
  const horn = M(0x332f2a, { roughness: 0.5 }), huf = M(0x241f1a);
  const rumpf = teil(g, verschmelze([
    { geo: new THREE.SphereGeometry(0.25, 16, 12), pos: [-0.02, 0, 0], scale: [2.4, 0.95, 0.78] },
    { geo: new THREE.SphereGeometry(0.22, 12, 9), pos: [0.3, 0.08, 0], scale: [1.0, 1.05, 0.95] }
  ]), fell, 0, 0.82, 0);
  const bauch = teil(g, new THREE.SphereGeometry(0.22, 12, 9), M(0x8a6a44), -0.04, 0.76, 0);
  bauch.scale.set(2.0, 0.75, 0.84);
  const hk = halsKopf(g, fell, [0.42, 0.95, 0], 0.46, 0.15, 0.085, 1.0);
  const hals = hk.hals, kopf = hk.kopf;
  const schaedel = teil(kopf, new THREE.SphereGeometry(0.105, 12, 9), hell, 0.04, 0, 0);
  schaedel.scale.set(1.8, 1.0, 0.88);
  teil(kopf, new THREE.SphereGeometry(0.055, 9, 7), dunkel, 0.22, -0.02, 0).scale.set(1.0, 0.85, 0.9);
  const augen = [auge(kopf, 0.08, 0.05, 0.08, 0.024), auge(kopf, 0.08, 0.05, -0.08, 0.024)];
  for (const s of [1, -1]) {
    const st = teil(kopf, new THREE.BoxGeometry(0.22, 0.05, 0.016), dunkel, 0.07, 0.03, s * 0.082);
    st.rotation.z = 0.12;
  }
  const ohren = [];
  for (const s of [1, -1]) {
    const h = teil(kopf, new THREE.CylinderGeometry(0.011, 0.028, 0.2, 7), horn, -0.04, 0.14, s * 0.055);
    const hak = teil(kopf, new THREE.TorusGeometry(0.05, 0.011, 6, 12, Math.PI * 0.85), horn, -0.04, 0.2, s * 0.055);
    hak.rotation.set(0, 0, Math.PI / 2);
    const o = gruppe(kopf, -0.06, 0.02, s * 0.1);
    const om = teil(o, new THREE.SphereGeometry(0.05, 8, 6), fell, 0, 0, s * 0.03);
    om.scale.set(0.45, 1.5, 1.1);
    ohren.push({ dreh: o, seite: s });
  }
  const beine = [
    bein(g, dunkel, huf, [0.36, 0.74, 0.12], 0.33, 0.33, 0.058, -1, true, 1),
    bein(g, dunkel, huf, [0.36, 0.74, -0.12], 0.33, 0.33, 0.058, -1, true, -1),
    bein(g, dunkel, huf, [-0.38, 0.76, 0.13], 0.35, 0.33, 0.063, 1, false, 1),
    bein(g, dunkel, huf, [-0.38, 0.76, -0.13], 0.35, 0.33, 0.063, 1, false, -1)
  ];
  const schwanz = kette(g, dunkel, [-0.54, 0.86, 0], 2, 0.08, 0.04, 0.025);
  schwanz.wurzel.rotation.z = -0.7;
  return {
    gruppe: g, typ: 'vierbeiner', beine, hals, kopf, augen, ohren, schwanz,
    rumpf, widerrist: 0.95, hitRadius: 0.9, hitHoehe: 0.8,
    halsBasis: hk.halsBasis, kopfBasis: hk.kopfBasis
  };
}

/* ---------------- Alpenmurmeltier ---------------- */
function murmeltier() {
  const g = new THREE.Group();
  const fell = M(0x9d7d50), bauch = M(0xc6a87a), dunkel = M(0x4a3922), nase = M(0x33281c);
  const rumpf = teil(g, new THREE.SphereGeometry(0.2, 14, 11), fell, 0, 0.21, 0);
  rumpf.scale.set(1.7, 1.05, 1.12);
  const b = teil(g, new THREE.SphereGeometry(0.17, 11, 9), bauch, 0.04, 0.17, 0);
  b.scale.set(1.45, 0.78, 0.98);
  const hk = halsKopf(g, fell, [0.24, 0.24, 0], 0.08, 0.1, 0.09, 0.25);
  const hals = hk.hals, kopf = hk.kopf;
  const schaedel = teil(kopf, new THREE.SphereGeometry(0.11, 12, 9), fell, 0.02, 0, 0);
  schaedel.scale.set(1.3, 0.98, 1.0);
  const schnauze = teil(kopf, new THREE.SphereGeometry(0.06, 9, 7), fell, 0.12, -0.02, 0);
  schnauze.scale.set(1.2, 0.85, 0.9);
  teil(kopf, new THREE.SphereGeometry(0.022, 7, 6), nase, 0.18, -0.01, 0);
  const augen = [auge(kopf, 0.08, 0.045, 0.055, 0.022), auge(kopf, 0.08, 0.045, -0.055, 0.022)];
  const ohren = [];
  for (const s of [1, -1]) {
    const o = gruppe(kopf, -0.02, 0.085, s * 0.075);
    const om = teil(o, new THREE.SphereGeometry(0.035, 8, 6), dunkel);
    om.scale.set(0.45, 1, 1);
    ohren.push({ dreh: o, seite: s });
  }
  const beine = [
    bein(g, fell, fell, [0.16, 0.19, 0.1], 0.08, 0.08, 0.04, -1, true, 1),
    bein(g, fell, fell, [0.16, 0.19, -0.1], 0.08, 0.08, 0.04, -1, true, -1),
    bein(g, fell, fell, [-0.15, 0.2, 0.11], 0.09, 0.09, 0.048, 1, false, 1),
    bein(g, fell, fell, [-0.15, 0.2, -0.11], 0.09, 0.09, 0.048, 1, false, -1)
  ];
  const schwanz = kette(g, dunkel, [-0.3, 0.22, 0], 3, 0.09, 0.045, 0.02);
  schwanz.wurzel.rotation.z = -0.35;
  return {
    gruppe: g, typ: 'vierbeiner', beine, hals, kopf, augen, ohren, schwanz,
    rumpf, widerrist: 0.3, hitRadius: 0.55, hitHoehe: 0.3, kannSitzen: true,
    halsBasis: hk.halsBasis, kopfBasis: hk.kopfBasis
  };
}

/* ---------------- Steinadler ---------------- */
function steinadler() {
  const g = new THREE.Group();
  const feder = M(0x4b3a29, { side: THREE.DoubleSide });
  const spitzen = M(0x2b2219, { side: THREE.DoubleSide });
  const nacken = M(0x96794f), schnabelM = M(0xd9ae38), klaue = M(0xe0b94a);
  const rumpf = teil(g, new THREE.SphereGeometry(0.15, 14, 11), feder, 0, 0, 0);
  rumpf.scale.set(2.3, 1.0, 0.95);
  const brust = teil(g, new THREE.SphereGeometry(0.13, 11, 9), nacken, 0.17, -0.01, 0);
  brust.scale.set(1.0, 0.95, 0.95);
  const hk = halsKopf(g, nacken, [0.28, 0.03, 0], 0.07, 0.085, 0.075, 0.15);
  const hals = hk.hals, kopf = hk.kopf;
  const schaedel = teil(kopf, new THREE.SphereGeometry(0.085, 11, 9), nacken, 0, 0, 0);
  schaedel.scale.set(1.15, 1.0, 0.92);
  const sn = teil(kopf, new THREE.ConeGeometry(0.042, 0.15, 8), schnabelM, 0.12, -0.005, 0);
  sn.rotation.z = -Math.PI / 2 - 0.3;
  const augen = [auge(kopf, 0.06, 0.04, 0.058, 0.019, 0xc9a23a), auge(kopf, 0.06, 0.04, -0.058, 0.019, 0xc9a23a)];
  const fluegelPaar = [
    fluegel(g, feder, spitzen, [0.02, 0.07, 0.1], 1, 0.62, 0.5, 0.42),
    fluegel(g, feder, spitzen, [0.02, 0.07, 0.1], -1, 0.62, 0.5, 0.42)
  ];
  const schwanzM = new THREE.Mesh(fluegelGeo(0.46, 0.14, 0.4, -0.05), nacken);
  schwanzM.rotation.y = Math.PI;
  const schwanzDreh = gruppe(g, -0.3, 0.01, 0);
  schwanzDreh.add(schwanzM);
  const beine = [];
  for (const s of [1, -1]) {
    const b = bein(g, nacken, klaue, [0.05, -0.09, s * 0.07], 0.08, 0.07, 0.022, -1, true, s);
    beine.push(b);
  }
  return {
    gruppe: g, typ: 'vogel', beine, hals, kopf, augen, ohren: [],
    fluegel: fluegelPaar, schwanzDreh, rumpf,
    hitRadius: 1.1, hitHoehe: 0, flieger: true, spannweite: 2.24,
    halsBasis: hk.halsBasis, kopfBasis: hk.kopfBasis
  };
}

/* ---------------- Alpendohle ---------------- */
function alpendohle() {
  const g = new THREE.Group();
  const feder = M(0x2c2c31, { side: THREE.DoubleSide });
  const glanz = M(0x3b3b44, { side: THREE.DoubleSide, roughness: 0.55 });
  const schnabelM = M(0xe3c53c), fussM = M(0xb04a3c);
  const rumpf = teil(g, new THREE.SphereGeometry(0.082, 12, 9), feder, 0, 0.14, 0);
  rumpf.scale.set(2.0, 1.05, 1.0);
  const hk = halsKopf(g, feder, [0.12, 0.17, 0], 0.05, 0.05, 0.045, 0.45);
  const hals = hk.hals, kopf = hk.kopf;
  teil(kopf, new THREE.SphereGeometry(0.055, 10, 8), feder).scale.set(1.15, 1, 0.98);
  const sn = teil(kopf, new THREE.ConeGeometry(0.018, 0.085, 7), schnabelM, 0.085, -0.004, 0);
  sn.rotation.z = -Math.PI / 2 - 0.12;
  const augen = [auge(kopf, 0.035, 0.025, 0.04, 0.012, 0x120d08), auge(kopf, 0.035, 0.025, -0.04, 0.012, 0x120d08)];
  const fluegelPaar = [
    fluegel(g, feder, glanz, [0.0, 0.17, 0.055], 1, 0.2, 0.17, 0.2),
    fluegel(g, feder, glanz, [0.0, 0.17, 0.055], -1, 0.2, 0.17, 0.2)
  ];
  const schwanzM = new THREE.Mesh(fluegelGeo(0.2, 0.1, 0.19, -0.06), feder);
  schwanzM.rotation.y = Math.PI;
  const schwanzDreh = gruppe(g, -0.15, 0.14, 0);
  schwanzDreh.add(schwanzM);
  const beine = [];
  for (const s of [1, -1]) {
    beine.push(bein(g, fussM, fussM, [0.02, 0.09, s * 0.042], 0.045, 0.04, 0.012, -1, true, s));
  }
  return {
    gruppe: g, typ: 'vogel', beine, hals, kopf, augen, ohren: [],
    fluegel: fluegelPaar, schwanzDreh, rumpf,
    hitRadius: 0.42, hitHoehe: 0.16, spannweite: 0.78, huepfer: true,
    halsBasis: hk.halsBasis, kopfBasis: hk.kopfBasis
  };
}

/* ---------------- Schneehase ---------------- */
function schneehase() {
  const g = new THREE.Group();
  const fell = M(0x9c9185), hell = M(0xe8e4dc), dunkel = M(0x3a342d), nase = M(0xa8807c);
  const rumpf = teil(g, new THREE.SphereGeometry(0.145, 14, 11), fell, 0, 0.21, 0);
  rumpf.scale.set(1.95, 0.95, 0.84);
  const b = teil(g, new THREE.SphereGeometry(0.12, 11, 9), hell, 0.02, 0.17, 0);
  b.scale.set(1.5, 0.7, 0.92);
  const hk = halsKopf(g, fell, [0.18, 0.25, 0], 0.07, 0.08, 0.07, 0.45);
  const hals = hk.hals, kopf = hk.kopf;
  const schaedel = teil(kopf, new THREE.SphereGeometry(0.082, 12, 9), fell, 0.02, 0, 0);
  schaedel.scale.set(1.45, 1.0, 0.92);
  teil(kopf, new THREE.SphereGeometry(0.02, 7, 6), nase, 0.14, -0.012, 0);
  const augen = [auge(kopf, 0.055, 0.05, 0.062, 0.019), auge(kopf, 0.055, 0.05, -0.062, 0.019)];
  const ohren = [];
  for (const s of [1, -1]) {
    const o = gruppe(kopf, -0.02, 0.07, s * 0.045);
    const om = teil(o, new THREE.CylinderGeometry(0.026, 0.042, 0.2, 9), fell, 0, 0.1, 0);
    om.scale.set(1, 1, 0.34);
    const innen = teil(o, new THREE.CylinderGeometry(0.017, 0.03, 0.185, 8), M(0xc9b6a6), 0, 0.098, s * 0.01);
    innen.scale.set(0.85, 1, 0.3);
    const spitze = teil(o, new THREE.SphereGeometry(0.028, 8, 6), dunkel, 0, 0.195, 0);
    spitze.scale.set(1, 0.55, 0.34);
    o.rotation.set(s * 0.28, 0, 0.34);
    ohren.push({ dreh: o, seite: s, ruhe: new THREE.Euler(s * 0.28, 0, 0.34) });
  }
  const beine = [
    bein(g, fell, fell, [0.14, 0.17, 0.08], 0.07, 0.07, 0.028, -1, true, 1),
    bein(g, fell, fell, [0.14, 0.17, -0.08], 0.07, 0.07, 0.028, -1, true, -1),
    bein(g, fell, fell, [-0.11, 0.21, 0.095], 0.12, 0.11, 0.045, 1, false, 1),
    bein(g, fell, fell, [-0.11, 0.21, -0.095], 0.12, 0.11, 0.045, 1, false, -1)
  ];
  const schwanz = kette(g, hell, [-0.24, 0.22, 0], 1, 0.07, 0.05, 0.04);
  return {
    gruppe: g, typ: 'vierbeiner', beine, hals, kopf, augen, ohren, schwanz,
    rumpf, widerrist: 0.3, hitRadius: 0.45, hitHoehe: 0.25, huepft: true,
    halsBasis: hk.halsBasis, kopfBasis: hk.kopfBasis
  };
}

/* ---------------- Alpensalamander ---------------- */
function alpensalamander() {
  const g = new THREE.Group();
  const haut = M(0x1d1d21, { roughness: 0.38 });
  const rippen = [{ geo: new THREE.SphereGeometry(0.028, 12, 9), pos: [-0.01, 0, 0], scale: [3.6, 0.95, 1.25] }];
  for (let i = 0; i < 7; i++) {
    rippen.push({
      geo: new THREE.TorusGeometry(0.031, 0.004, 5, 10),
      pos: [0.055 - i * 0.021, 0.002, 0], rot: [0, Math.PI / 2, 0], scale: [1, 0.8, 1]
    });
  }
  const rumpf = teil(g, verschmelze(rippen), haut, 0, 0.03, 0);
  const hk = halsKopf(g, haut, [0.085, 0.032, 0], 0.02, 0.026, 0.024, 0);
  const hals = hk.hals, kopf = hk.kopf;
  const schaedel = teil(kopf, new THREE.SphereGeometry(0.026, 10, 8), haut);
  schaedel.scale.set(1.35, 0.78, 1.15);
  const augen = [auge(kopf, 0.018, 0.012, 0.017, 0.007), auge(kopf, 0.018, 0.012, -0.017, 0.007)];
  const schwanz = kette(g, haut, [-0.1, 0.031, 0], 4, 0.045, 0.024, 0.004);
  const beine = [
    bein(g, haut, haut, [0.06, 0.03, 0.033], 0.018, 0.016, 0.008, -1, true, 1),
    bein(g, haut, haut, [0.06, 0.03, -0.033], 0.018, 0.016, 0.008, -1, true, -1),
    bein(g, haut, haut, [-0.055, 0.03, 0.033], 0.018, 0.016, 0.008, 1, false, 1),
    bein(g, haut, haut, [-0.055, 0.03, -0.033], 0.018, 0.016, 0.008, 1, false, -1)
  ];
  beine.forEach(b => { b.huefte.rotation.x = b.seite * 0.95; });
  return {
    gruppe: g, typ: 'lurch', beine, hals, kopf, augen, ohren: [], schwanz,
    rumpf, widerrist: 0.07, hitRadius: 0.3, hitHoehe: 0.06,
    halsBasis: 0, kopfBasis: 0
  };
}

/* ---------------- Kreuzotter ---------------- */
function kreuzotter() {
  const g = new THREE.Group();
  const hell = M(0xa08f66, { roughness: 0.42 }), dunkel = M(0x3d3225, { roughness: 0.42 });
  const segmente = [];
  const anz = 20;
  let x = 0;
  for (let i = 0; i < anz; i++) {
    const t = i / (anz - 1);
    const r = 0.036 * (1 - 0.6 * Math.pow(t, 2.1)) * (i < 2 ? 1.12 : 1);
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 7), i % 2 ? dunkel : hell);
    s.scale.set(1.35, 0.76, 1.2);
    s.position.set(x, 0.026 + r * 0.25, 0);
    s.castShadow = true;
    g.add(s);
    segmente.push({ netz: s, r, x });
    x -= r * 1.45;
  }
  const hk = halsKopf(g, hell, [0.05, 0.029, 0], 0.018, 0.03, 0.03, 0);
  const hals = hk.hals, kopf = hk.kopf;
  const schaedel = teil(kopf, new THREE.SphereGeometry(0.042, 11, 8), hell);
  schaedel.scale.set(1.3, 0.62, 1.05);
  const augen = [auge(kopf, 0.024, 0.009, 0.021, 0.008, 0x8d2a16), auge(kopf, 0.024, 0.009, -0.021, 0.008, 0x8d2a16)];
  const zunge = teil(kopf, new THREE.BoxGeometry(0.055, 0.0035, 0.005), M(0xc33a46), 0.07, -0.006, 0);
  return {
    gruppe: g, typ: 'schlange', beine: [], hals, kopf, augen, ohren: [],
    segmente, zunge, rumpf: segmente[0].netz,
    hitRadius: 0.4, hitHoehe: 0.06, halsBasis: 0, kopfBasis: 0
  };
}

export const BAUER = {
  steinbock, gaemse, murmeltier, steinadler, alpendohle, schneehase, alpensalamander, kreuzotter
};
