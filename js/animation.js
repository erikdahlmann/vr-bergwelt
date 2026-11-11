// Bewegungsphasen der Tiere: Gangarten, Flügelschlag, Schlängeln, Leerlauf.
import * as THREE from 'three';

const TAU = Math.PI * 2;
function glatt(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function naehere(ist, soll, t) { return ist + (soll - ist) * Math.min(1, t); }
function dreheSanft(ist, soll, t) {
  let d = soll - ist;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return ist + d * Math.min(1, t);
}

/* Versatz im Gangzyklus je Bein */
function versatz(gangart, b) {
  const rechts = b.seite > 0;
  if (gangart === 'galopp') {
    if (!b.vorne) return rechts ? 0.0 : 0.08;
    return rechts ? 0.45 : 0.53;
  }
  if (gangart === 'trab') {
    return (b.vorne === rechts) ? 0 : 0.5;   // diagonale Paare
  }
  // Schritt: hinten rechts, vorne rechts, hinten links, vorne links
  if (!b.vorne && rechts) return 0;
  if (b.vorne && rechts) return 0.25;
  if (!b.vorne && !rechts) return 0.5;
  return 0.75;
}

/* Winkel für ein Bein aus dem Zyklus */
function beinWinkel(q, weite, knick, standAnteil) {
  let hufte, knie;
  if (q < standAnteil) {                 // Fuß steht am Boden
    const u = q / standAnteil;
    hufte = weite * (1 - 2 * u);
    knie = knick * 0.12 * Math.sin(u * Math.PI);
  } else {                               // Fuß schwingt nach vorn
    const u = (q - standAnteil) / (1 - standAnteil);
    hufte = -weite + 2 * weite * u;
    knie = knick * Math.sin(u * Math.PI);
  }
  return { hufte, knie };
}

/* ---------------- Vierbeiner ---------------- */
function vierbeiner(tier, dt, zeit) {
  const m = tier.modell, a = tier.art;
  const lauf = Math.min(1, tier.tempo / Math.max(0.6, a.tempoFlucht));
  const schnell = tier.tempo;
  let gangart = 'stand';
  if (schnell > 0.15) gangart = 'schritt';
  if (lauf > 0.42) gangart = 'trab';
  if (lauf > 0.72) gangart = 'galopp';

  // Zyklus läuft mit der Geschwindigkeit, nicht mit der Zeit
  const schrittLang = Math.max(0.22, (m.widerrist || 0.6) * 1.15);
  tier.gangPhase = (tier.gangPhase || 0) + (schnell / schrittLang) * dt * (gangart === 'galopp' ? 0.55 : 1);
  const p = tier.gangPhase % 1;

  const weite = gangart === 'galopp' ? 0.85 : gangart === 'trab' ? 0.6 : 0.42;
  const knick = gangart === 'galopp' ? 1.25 : gangart === 'trab' ? 0.9 : 0.6;
  const stand = gangart === 'galopp' ? 0.38 : gangart === 'trab' ? 0.5 : 0.62;

  const ruht = schnell < 0.12;
  const sitzt = m.kannSitzen && (tier.zustand === 'wachsam') ? 1 : 0;
  const duckt = m.huepft && tier.zustand === 'ducken' ? 1 : 0;

  for (const b of m.beine) {
    let hufte = 0, knie = 0;
    if (!ruht) {
      const q = (p + versatz(gangart, b)) % 1;
      const w = beinWinkel(q, weite, knick, stand);
      hufte = w.hufte; knie = w.knie;
      if (m.huepft && gangart !== 'stand') {        // Hase: Hinterbeine zusammen
        const q2 = (p + (b.vorne ? 0.35 : 0)) % 1;
        const w2 = beinWinkel(q2, b.vorne ? 0.7 : 1.0, b.vorne ? 0.9 : 1.5, 0.3);
        hufte = w2.hufte; knie = w2.knie;
      }
    } else {
      // Stehen: leichtes Spiel, Vorderbein scharrt selten
      hufte = Math.sin(zeit * 0.7 + b.seite) * 0.02;
      knie = 0.05;
      if (sitzt && b.vorne) { hufte = -0.9; knie = 1.6; }
      if (duckt) { hufte = 0.25; knie = 1.5; }
    }
    b.huefte.rotation.z = naehere(b.huefte.rotation.z, hufte, dt * 14);
    b.knie.rotation.z = naehere(b.knie.rotation.z, b.richtung * Math.abs(knie), dt * 14);
    b.fuss.rotation.z = -b.knie.rotation.z * 0.5;
  }

  // Rumpf: Wippen, Nicken, Aufrichten
  const wippe = ruht ? 0 : (gangart === 'galopp' ? 0.1 : 0.03) * Math.abs(Math.sin(p * TAU));
  const atem = Math.sin(zeit * (ruht ? 1.1 : 3.4)) * 0.012;
  m.gruppe.position.y = naehere(m.gruppe.position.y, wippe + sitzt * 0.1 - duckt * 0.07, dt * 10);
  m.gruppe.rotation.z = naehere(m.gruppe.rotation.z,
    (gangart === 'galopp' ? Math.sin(p * TAU) * 0.12 : 0) - sitzt * 0.85, dt * 8);
  m.rumpf.scale.y = (m.rumpf.userData.sy ?? (m.rumpf.userData.sy = m.rumpf.scale.y)) * (1 + atem);
  if (duckt) m.gruppe.scale.y = naehere(m.gruppe.scale.y, 0.6, dt * 8);
  else m.gruppe.scale.y = naehere(m.gruppe.scale.y, 1, dt * 6);

  // Hals und Kopf (um ihre Ruhelage herum)
  const hb = m.halsBasis || 0, kb = m.kopfBasis || 0;
  const grast = (tier.zustand === 'ruhen' && ruht) ? 1 : 0;
  const halsZiel = hb + (grast ? -1.75 : (sitzt ? 0.35 : (lauf > 0.5 ? -0.3 : 0)));
  m.hals.rotation.z = naehere(m.hals.rotation.z, halsZiel, dt * 2.2);
  const kauen = grast ? Math.sin(zeit * 7) * 0.09 : 0;
  m.kopf.rotation.z = naehere(m.kopf.rotation.z, kb + (grast ? -0.45 + kauen : (sitzt ? -0.15 : 0)), dt * 3);
  // Kopf dreht sich zum Kind
  const wach = (tier.zustand === 'wachsam' || tier.zustand === 'ducken') ? 1 : 0;
  m.kopf.rotation.y = dreheSanft(m.kopf.rotation.y, wach ? tier.kopfDreh || 0 : 0, dt * 3);

  // Ohren
  for (const o of m.ohren) {
    const zuck = Math.sin(zeit * 2.1 + o.seite * 2) > 0.985 ? 0.3 : 0;
    const ziel = wach ? -0.25 : (lauf > 0.6 ? 0.5 : 0) ;
    o.dreh.rotation.x = naehere(o.dreh.rotation.x, (o.ruhe ? o.ruhe.x : 0) + o.seite * (0.05 + zuck) + ziel * 0.3 * o.seite, dt * 8);
    o.dreh.rotation.z = naehere(o.dreh.rotation.z, (o.ruhe ? o.ruhe.z : 0) + (duckt ? 1.15 : ziel * 0.4), dt * 6);
  }

  // Schwanz
  if (m.schwanz) {
    m.schwanz.teile.forEach((t, i) => {
      const s = Math.sin(zeit * (2 + lauf * 5) - i * 0.8) * (0.1 + lauf * 0.2);
      t.rotation.y = naehere(t.rotation.y, s, dt * 10);
      t.rotation.z = naehere(t.rotation.z, i === 0 ? (lauf > 0.6 ? -0.5 : 0) : s * 0.4, dt * 6);
    });
  }
  blinzeln(m, zeit);
}

/* ---------------- Vögel ---------------- */
function vogel(tier, dt, zeit) {
  const m = tier.modell;
  const fliegt = tier.flieger ? true : (tier.zustand === 'fliehen' && tier.tempo > 2);
  const scheu = tier.zustand === 'fliehen';

  if (fliegt) {
    const tempo = tier.flieger ? (scheu ? 2.4 : 0.85) : 7;
    const amp = tier.flieger ? (scheu ? 0.62 : 0.13) : 0.9;
    const s = Math.sin(zeit * tempo);
    const s2 = Math.sin(zeit * tempo - 0.7);
    for (const f of m.fluegel) {
      f.schulter.rotation.x = -f.seite * (s * amp + 0.05);
      f.schulter.rotation.y = 0;
      f.schulter.rotation.z = 0;
      f.hand.rotation.y = 0;
      f.hand.rotation.x = -f.seite * s2 * amp * 0.6;
      f.hand.rotation.z = s2 * 0.12;
    }
    for (const b of m.beine) {
      b.huefte.rotation.z = naehere(b.huefte.rotation.z, 1.5, dt * 5);
      b.knie.rotation.z = naehere(b.knie.rotation.z, -2.2, dt * 5);
    }
    m.schwanzDreh.rotation.z = naehere(m.schwanzDreh.rotation.z, scheu ? 0.1 : -0.05, dt * 3);
    m.schwanzDreh.rotation.y = Math.sin(zeit * 0.6) * 0.12;
    m.gruppe.rotation.x = naehere(m.gruppe.rotation.x, Math.sin(zeit * 0.5) * 0.35, dt * 2);
    m.gruppe.position.y = 0;
  } else {
    // sitzt: Flügel angelegt
    for (const f of m.fluegel) {
      f.schulter.rotation.x = naehere(f.schulter.rotation.x, -f.seite * 0.12, dt * 6);
      f.schulter.rotation.z = naehere(f.schulter.rotation.z, -0.1, dt * 6);
      f.hand.rotation.y = naehere(f.hand.rotation.y, -2.25, dt * 6);
      f.hand.rotation.x = 0;
    }
    const huepft = tier.tempo > 0.2;
    const p = (tier.gangPhase = (tier.gangPhase || 0) + tier.tempo * dt * 2.2) % 1;
    for (const b of m.beine) {
      const w = huepft ? beinWinkel(p, 0.75, 1.2, 0.45) : { hufte: 0, knie: 0.15 };
      b.huefte.rotation.z = naehere(b.huefte.rotation.z, w.hufte, dt * 16);
      b.knie.rotation.z = naehere(b.knie.rotation.z, -Math.abs(w.knie), dt * 16);
    }
    m.gruppe.position.y = huepft ? Math.max(0, Math.sin(p * TAU)) * 0.08 : 0;
    m.gruppe.rotation.x = naehere(m.gruppe.rotation.x, 0, dt * 4);
    m.gruppe.rotation.z = naehere(m.gruppe.rotation.z, huepft ? -0.1 : 0.12, dt * 4);
    m.schwanzDreh.rotation.z = naehere(m.schwanzDreh.rotation.z, 0.35, dt * 4);
    // Picken und Umschauen
    const pickt = !huepft && Math.sin(zeit * 0.9 + tier.nummer) > 0.7;
    m.hals.rotation.z = naehere(m.hals.rotation.z, (m.halsBasis || 0) + (pickt ? -1.1 : 0), dt * 4);
    m.kopf.rotation.y = dreheSanft(m.kopf.rotation.y, Math.sin(zeit * 1.3 + tier.nummer * 2) * 0.6, dt * 3);
  }
  blinzeln(m, zeit);
}

/* ---------------- Schlange ---------------- */
function schlange(tier, dt, zeit) {
  const m = tier.modell;
  const lauf = Math.min(1, tier.tempo / Math.max(0.3, tier.art.tempoFlucht));
  const welle = 2.2 + lauf * 4;
  const amp = 0.055 + lauf * 0.05;
  m.segmente.forEach((s, i) => {
    s.netz.position.z = Math.sin(zeit * welle - i * 0.52) * amp * (1 - i / (m.segmente.length * 2.4));
    s.netz.position.y = 0.026 + s.r * 0.25 + (lauf > 0.3 ? Math.abs(Math.sin(zeit * welle - i * 0.52)) * 0.004 : 0);
  });
  const wach = tier.zustand === 'wachsam' || tier.zustand === 'fliehen';
  m.hals.rotation.z = naehere(m.hals.rotation.z, (m.halsBasis || 0) + (wach ? 0.55 : 0.06), dt * 3);
  m.kopf.rotation.y = dreheSanft(m.kopf.rotation.y, Math.sin(zeit * 0.8) * 0.25 + (wach ? tier.kopfDreh || 0 : 0), dt * 2.5);
  if (m.zunge) {
    const raus = Math.sin(zeit * 2.3) > 0.88 ? 1 : 0;
    m.zunge.scale.x = naehere(m.zunge.scale.x, 0.25 + raus * 1.6, dt * 14);
  }
}

/* ---------------- Lurch (Salamander) ---------------- */
function lurch(tier, dt, zeit) {
  const m = tier.modell;
  const lauf = Math.min(1, tier.tempo / Math.max(0.2, tier.art.tempoFlucht));
  const takt = zeit * (1.6 + lauf * 5);
  // Körper schlängelt seitlich
  m.gruppe.rotation.y = Math.sin(takt) * 0.16 * (0.4 + lauf);
  m.hals.rotation.y = Math.sin(takt + 0.9) * 0.2;
  m.schwanz.teile.forEach((t, i) => {
    t.rotation.y = Math.sin(takt - 1.1 - i * 0.6) * 0.3 * (0.4 + lauf);
  });
  // Kriechgang: diagonale Paare
  m.beine.forEach(b => {
    const q = ((takt / TAU) + ((b.vorne === (b.seite > 0)) ? 0 : 0.5)) % 1;
    const w = beinWinkel(q, 0.55 * (0.3 + lauf), 0.5, 0.55);
    b.huefte.rotation.z = naehere(b.huefte.rotation.z, w.hufte, dt * 12);
    b.knie.rotation.z = naehere(b.knie.rotation.z, b.richtung * Math.abs(w.knie), dt * 12);
  });
  blinzeln(m, zeit);
}

/* ---------------- Blinzeln ---------------- */
function blinzeln(m, zeit) {
  if (!m.augen || !m.augen.length) return;
  const z = (zeit * 0.37 + (m.blinzelVersatz ?? (m.blinzelVersatz = Math.random() * 10))) % 1;
  const zu = z > 0.965 ? 0.1 : 1;
  for (const a of m.augen) a.scale.y = naehere(a.scale.y, zu, 0.4);
}

export function belebe(tier, dt, zeit) {
  switch (tier.modell.typ) {
    case 'vierbeiner': vierbeiner(tier, dt, zeit); break;
    case 'vogel': vogel(tier, dt, zeit); break;
    case 'schlange': schlange(tier, dt, zeit); break;
    case 'lurch': lurch(tier, dt, zeit); break;
  }
}
