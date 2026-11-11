// Bergwelt in VR – Hauptdatei.
import * as THREE from 'three';
import {
  erzeugeGelaende, erzeugeFluss, erzeugeHimmel, erzeugeFernberge, erzeugeSonne,
  hoeheBei, SPIELRADIUS
} from './gelaende.js';
import { erzeugeNatur, windZeit } from './natur.js';
import { sonnenTextur } from './texturen.js';
import { erzeugeTiere } from './tiere.js';
import { KartenVerwaltung } from './karten.js';
import { Spieler } from './spieler.js';
import { vrMoeglich, starteVR } from './vr.js';

const sparsam = /Quest|OculusBrowser|Android|iPhone|iPad/i.test(navigator.userAgent)
  || new URLSearchParams(location.search).has('sparsam');

const lw = document.getElementById('bild');
const renderer = new THREE.WebGLRenderer({ canvas: lw, antialias: !sparsam, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, sparsam ? 1 : 1.6));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.xr.enabled = true;

const szene = new THREE.Scene();
szene.fog = new THREE.Fog(0xbcd2e6, 110, 460);

const kamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1200);

/* ---------- Licht ---------- */
const himmelLicht = new THREE.HemisphereLight(0xd4e6f8, 0x96966f, 1.65);
szene.add(himmelLicht);
const sonne = new THREE.DirectionalLight(0xfff2de, 2.35);
sonne.position.set(60, 90, 40);
sonne.castShadow = true;
sonne.shadow.mapSize.set(sparsam ? 1024 : 2048, sparsam ? 1024 : 2048);
sonne.shadow.camera.near = 1;
sonne.shadow.camera.far = 260;
const S = 52;
sonne.shadow.camera.left = -S; sonne.shadow.camera.right = S;
sonne.shadow.camera.top = S; sonne.shadow.camera.bottom = -S;
sonne.shadow.bias = -0.0006;
sonne.shadow.normalBias = 0.05;
szene.add(sonne, sonne.target);

/* ---------- Welt ---------- */
const himmel = erzeugeHimmel();
szene.add(himmel);
const sonnenScheibe = erzeugeSonne(sonne.position.clone(), sonnenTextur(256));
szene.add(sonnenScheibe);
szene.add(erzeugeFernberge());
const gelaende = erzeugeGelaende();
szene.add(gelaende);
const wasser = erzeugeFluss();
szene.add(wasser);
szene.add(erzeugeNatur(sparsam));

// Grenzsteine, damit das Areal sichtbar begrenzt ist
(function grenze() {
  const geo = new THREE.ConeGeometry(0.55, 1.5, 7);
  const mat = new THREE.MeshStandardMaterial({ color: 0xb9b3a6, roughness: 1, flatShading: true });
  const anz = 96;
  const im = new THREE.InstancedMesh(geo, mat, anz);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < anz; i++) {
    const w = (i / anz) * Math.PI * 2;
    const x = Math.cos(w) * (SPIELRADIUS + 1.5), z = Math.sin(w) * (SPIELRADIUS + 1.5);
    p.set(x, hoeheBei(x, z) + 0.6, z);
    im.setMatrixAt(i, m.compose(p, q, s));
  }
  im.castShadow = true;
  szene.add(im);
})();

/* ---------- Tiere ---------- */
const tiere = erzeugeTiere(szene, sparsam);

/* ---------- Karten und Spieler ---------- */
const karten = new KartenVerwaltung(szene, kamera);

function tierGeklickt(tier) {
  const neu = karten.neuGefunden(tier.art);
  karten.zeige(tier.art, renderer.xr.isPresenting);
  if (neu) {
    karten.meldung(`${tier.art.emoji} ${tier.art.name} gefunden!`);
    if (karten.fertig) setTimeout(() => karten.meldung('Super! Du hast alle 8 Tiere gefunden. 🏔️', 7000), 2800);
  }
  // Das Tier merkt dich jetzt
  if (tier.zustand === 'ruhen' || tier.zustand === 'wandern') tier.setze('wachsam');
}

const spieler = new Spieler(renderer, szene, kamera, gelaende, tiere, tierGeklickt);

/* ---------- Start-Fenster ---------- */
const start = document.getElementById('start');
const losKnopf = document.getElementById('losknopf');
losKnopf.disabled = false;
losKnopf.textContent = 'Am Bildschirm starten';
// ?sofort überspringt das Startfenster (für Bildschirmfotos und zum Vorführen)
if (new URLSearchParams(location.search).has('sofort')) {
  setTimeout(() => {
    losKnopf.click();
    setTimeout(() => { start.style.display = 'none'; }, 600);
  }, 60);
}
losKnopf.addEventListener('click', () => {
  start.classList.add('weg');
  spieler.pause = false;
});
const vrKnopf = document.getElementById('vrknopf');
vrMoeglich().then(ok => {
  if (!ok) { vrKnopf.textContent = 'Keine VR-Brille gefunden'; return; }
  vrKnopf.disabled = false;
  vrKnopf.addEventListener('click', async () => {
    try {
      await starteVR(renderer);
      start.classList.add('weg');
      spieler.pause = false;
    } catch (e) { vrKnopf.textContent = 'VR-Start ging nicht: ' + e.message; }
  });
});
spieler.pause = true;

/* ---------- Schleife ---------- */
const uhr = new THREE.Clock();
const wasserPos = wasser.geometry.attributes.position;
const wasserBasis = Float32Array.from(wasserPos.array);
const wellenKarte = wasser.material.userData.wellenKarte;
const sonnenRichtung = sonne.position.clone().normalize();

function bild() {
  const dt = Math.min(0.05, uhr.getDelta());
  const t = uhr.elapsedTime;

  spieler.aktualisiere(dt);
  windZeit.value = t;
  const sp = spieler.rig.position;

  if (!spieler.pause) {
    for (const tier of tiere) tier.aktualisiere(dt, sp, tiere);
  }
  karten.aktualisiere(dt);

  // Wellen
  for (let i = 0; i < wasserPos.count; i++) {
    const x = wasserBasis[i * 3], z = wasserBasis[i * 3 + 2];
    wasserPos.array[i * 3 + 1] = wasserBasis[i * 3 + 1]
      + Math.sin(t * 2.2 + z * 0.8 + x * 0.4) * 0.035
      + Math.sin(t * 3.7 + z * 1.9) * 0.02;
  }
  wasserPos.needsUpdate = true;
  if (wellenKarte) {
    wellenKarte.offset.set(t * 0.012, -t * 0.045);
    wellenKarte.repeat.set(2.5, 9);
  }

  // Schatten folgen dem Kind
  sonne.position.set(sp.x + 60, sp.y + 90, sp.z + 40);
  sonne.target.position.copy(sp);
  himmel.position.set(sp.x, 0, sp.z);
  sonnenScheibe.position.copy(sonnenRichtung).multiplyScalar(780).add(new THREE.Vector3(sp.x, 0, sp.z));
  sonnenScheibe.lookAt(sp.x, sp.y + 1.4, sp.z);

  renderer.render(szene, kamera);
}
renderer.setAnimationLoop(bild);

window.addEventListener('resize', () => {
  kamera.aspect = window.innerWidth / window.innerHeight;
  kamera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Hilfe einblenden
document.getElementById('hilfeknopf').addEventListener('click', () => {
  document.getElementById('hilfe').classList.toggle('offen');
});
document.getElementById('ladetext').remove();

// Zum Testen und Vorführen erreichbar
window.welt = { szene, kamera, renderer, spieler, tiere, karten, sonne };
