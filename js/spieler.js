// Bewegung: zeigen und klicken (Teleport), dazu Maus/Tastatur zum Testen am Rechner.
import * as THREE from 'three';
import { hoeheBei, imAreal, SPIELRADIUS, wasserY } from './gelaende.js';
import { hindernisse, brocken } from './natur.js';

const AUGENHOEHE = 1.35;      // Grundschulkind
const SPRUNG_MAX = 30;        // Meter pro Teleport

/* Steht dieser Punkt in einem Felsbrocken? Dann würde man im Stein stehen. */
function imFels(x, z) {
  for (const b of brocken) {
    const dx = x - b.x, dz = z - b.z;
    if (dx * dx + dz * dz < b.r * b.r) return true;
  }
  return false;
}

export class Spieler {
  constructor(renderer, szene, kamera, gelaende, tiere, beiTierKlick) {
    this.renderer = renderer;
    this.szene = szene;
    this.kamera = kamera;
    this.gelaende = gelaende;
    this.tiere = tiere;
    this.beiTierKlick = beiTierKlick;

    this.rig = new THREE.Group();
    this.rig.add(kamera);
    szene.add(this.rig);
    this.setzeAuf(0, 24);

    this.gier = Math.PI;      // Blick links/rechts (nur am Rechner)
    this.nick = -0.05;
    this.tasten = {};
    this.strahler = new THREE.Raycaster();
    this.strahler.far = 200;
    this.zeigerAktiv = false;
    this.zielPunkt = new THREE.Vector3();
    this.zielGueltig = false;
    this.zielTier = null;

    this.baueMarker();
    this.baueBlende();
    this.baueController();
    this.mausEvents();
    this.tastenEvents();
  }

  setzeAuf(x, z) {
    this.rig.position.set(x, hoeheBei(x, z), z);
  }

  /* ---------- Zielring und Strahl ---------- */
  baueMarker() {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.62, 28),
      new THREE.MeshBasicMaterial({ color: 0xffe36b, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    const punkt = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    punkt.position.y = 0.05;
    const saeule = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe36b, transparent: true, opacity: 0.35 })
    );
    saeule.position.y = 0.55;
    this.marker = new THREE.Group();
    this.marker.add(ring, punkt, saeule);
    this.marker.visible = false;
    this.szene.add(this.marker);

    this.tierRing = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.72, 26),
      new THREE.MeshBasicMaterial({ color: 0x78e06a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, depthTest: false })
    );
    this.tierRing.visible = false;
    this.tierRing.renderOrder = 5;
    this.szene.add(this.tierRing);
  }

  baueBlende() {
    this.blende = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false, fog: false })
    );
    this.blende.renderOrder = 999;
    this.blende.visible = false;
    this.kamera.add(this.blende);
    this.blendeZeit = 0;
  }

  /* ---------- VR-Controller ---------- */
  baueController() {
    this.controller = [];
    const linieG = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)
    ]);
    for (let i = 0; i < 2; i++) {
      const c = this.renderer.xr.getController(i);
      const linie = new THREE.Line(linieG, new THREE.LineBasicMaterial({
        color: 0xffe36b, transparent: true, opacity: 0.8
      }));
      linie.scale.z = 8;
      linie.name = 'strahl';
      c.add(linie);
      const griff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.018, 0.1, 8),
        new THREE.MeshBasicMaterial({ color: 0xdddddd })
      );
      griff.rotation.x = -Math.PI / 2.4;
      c.add(griff);
      c.visible = false;
      c.addEventListener('connected', e => {
        c.visible = true;
        c.userData.hand = e.data.handedness;
        c.userData.quelle = e.data;
      });
      c.addEventListener('disconnected', () => { c.visible = false; c.userData.quelle = null; });
      c.addEventListener('selectstart', () => { this.aktiverController = c; this.klick(); });
      this.rig.add(c);
      this.controller.push(c);
    }
  }

  /* ---------- Maus und Tastatur ---------- */
  mausEvents() {
    const lw = this.renderer.domElement;
    this.maus = new THREE.Vector2(0, 0);
    this.ziehen = false;
    this.gezogen = 0;
    lw.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      this.ziehen = true; this.gezogen = 0;
      this.letzteMaus = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('pointerup', e => {
      if (!this.ziehen) return;
      this.ziehen = false;
      if (this.gezogen < 6 && !this.renderer.xr.isPresenting) this.klick();
    });
    lw.addEventListener('pointermove', e => {
      const b = lw.getBoundingClientRect();
      this.maus.x = ((e.clientX - b.left) / b.width) * 2 - 1;
      this.maus.y = -((e.clientY - b.top) / b.height) * 2 + 1;
      if (this.ziehen && this.letzteMaus) {
        const dx = e.clientX - this.letzteMaus.x, dy = e.clientY - this.letzteMaus.y;
        this.gezogen += Math.abs(dx) + Math.abs(dy);
        this.gier -= dx * 0.0042;
        this.nick = Math.max(-1.2, Math.min(0.9, this.nick - dy * 0.0035));
        this.letzteMaus = { x: e.clientX, y: e.clientY };
      }
    });
  }

  tastenEvents() {
    window.addEventListener('keydown', e => { this.tasten[e.code] = true; });
    window.addEventListener('keyup', e => { this.tasten[e.code] = false; });
  }

  /* ---------- Zeiger auswerten ---------- */
  aktualisiereZeiger() {
    const inVR = this.renderer.xr.isPresenting;
    let ursprung, richtung;
    if (inVR) {
      const c = this.controller.find(c => c.visible) || null;
      if (c) {
        ursprung = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
        richtung = new THREE.Vector3(0, 0, -1).applyQuaternion(
          new THREE.Quaternion().setFromRotationMatrix(c.matrixWorld)).normalize();
        this.aktiverController = c;
      } else {
        const kam = this.renderer.xr.getCamera();
        ursprung = new THREE.Vector3().setFromMatrixPosition(kam.matrixWorld);
        richtung = new THREE.Vector3(0, 0, -1).applyQuaternion(kam.quaternion).normalize();
      }
      this.strahler.set(ursprung, richtung);
    } else {
      this.strahler.setFromCamera(this.maus, this.kamera);
    }

    // zuerst die Bedienteile in VR (Karte, Regal)
    this.zielUi = null;
    const uiZiele = (this.uiZiele && this.uiZiele()) || [];
    if (uiZiele.length) {
      const uiTreffer = this.strahler.intersectObjects(uiZiele.filter(o => o.visible && o.parent && o.parent.visible), false);
      if (uiTreffer.length) {
        this.zielUi = uiTreffer[0].object;
        this.zielTier = null;
        this.zielGueltig = false;
        this.marker.visible = false;
        this.tierRing.visible = false;
        if (inVR && this.aktiverController) {
          const linie = this.aktiverController.getObjectByName('strahl');
          if (linie) linie.scale.z = uiTreffer[0].distance;
        }
        return;
      }
    }

    // dann Tiere
    const trefferflaechen = this.tiere.filter(t => t.sichtbar).map(t => t.treffer);
    const tierTreffer = this.strahler.intersectObjects(trefferflaechen, false);
    const bodenTreffer = this.strahler.intersectObject(this.gelaende, false);
    this.zielTier = tierTreffer.length ? tierTreffer[0].object.userData.tier : null;
    if (this.zielTier) {
      // Ein Tier hinter Fels, Baum oder Busch zählt nicht
      const weit = tierTreffer[0].distance;
      let verdeckt = bodenTreffer.length > 0 && bodenTreffer[0].distance < weit;
      if (!verdeckt) {
        const sicht = this.strahler.intersectObjects(hindernisse, false);
        verdeckt = sicht.length > 0 && sicht[0].distance < weit;
      }
      if (verdeckt) this.zielTier = null;
    }
    this.zielGueltig = false;
    if (this.zielTier) {
      this.tierRing.visible = true;
      this.tierRing.position.copy(this.zielTier.wurzel.position);
      this.tierRing.position.y += this.zielTier.modell.hitHoehe;
      this.tierRing.lookAt(this.strahler.ray.origin);
      // Der Ring bleibt auf dem Bildschirm immer gleich groß
      const weg = this.strahler.ray.origin.distanceTo(this.tierRing.position);
      const gr = Math.max(0.5, Math.min(4.5, weg * 0.085));
      this.tierRing.scale.setScalar(gr);
      this.marker.visible = false;
    } else {
      this.tierRing.visible = false;
      if (bodenTreffer.length) {
        const p = bodenTreffer[0].point.clone();
        const hier = this.rig.position;
        const dx = p.x - hier.x, dz = p.z - hier.z;
        const d = Math.hypot(dx, dz);
        if (d > SPRUNG_MAX) {
          const f = SPRUNG_MAX / d;
          p.set(hier.x + dx * f, 0, hier.z + dz * f);
          p.y = hoeheBei(p.x, p.z);
        }
        const nassIm = p.y < wasserY(p.z) - 0.1;
        this.zielGueltig = imAreal(p.x, p.z) && !nassIm && !imFels(p.x, p.z);
        this.zielPunkt.copy(p);
        this.marker.visible = true;
        this.marker.position.copy(p);
        this.marker.children[0].material.color.set(this.zielGueltig ? 0xffe36b : 0xff6b6b);
        this.marker.children[2].material.color.set(this.zielGueltig ? 0xffe36b : 0xff6b6b);
      } else {
        this.marker.visible = false;
      }
    }
    // Strahllänge anpassen
    if (inVR && this.aktiverController) {
      const linie = this.aktiverController.getObjectByName('strahl');
      if (linie) {
        const ziel = this.zielTier ? this.tierRing.position : (this.marker.visible ? this.marker.position : null);
        linie.scale.z = ziel ? this.strahler.ray.origin.distanceTo(ziel) : 12;
      }
    }
  }

  klick() {
    if (this.pause) return;
    if (this.zielUi && this.zielUi.userData.klick) { this.zielUi.userData.klick(); return; }
    if (this.zielTier) { this.beiTierKlick(this.zielTier); return; }
    if (this.zielGueltig) this.teleport(this.zielPunkt);
  }

  teleport(p) {
    this.blendeZiel = p.clone();
    this.blendeZeit = 0.001;
    this.blende.visible = true;
  }

  /* ---------- pro Bild ---------- */
  aktualisiere(dt) {
    // Blende und Sprung
    if (this.blendeZeit > 0) {
      this.blendeZeit += dt;
      const t = this.blendeZeit;
      const mat = this.blende.material;
      if (t < 0.13) mat.opacity = t / 0.13;
      else if (t < 0.16) {
        mat.opacity = 1;
        if (this.blendeZiel) { this.rig.position.set(this.blendeZiel.x, this.blendeZiel.y, this.blendeZiel.z); this.blendeZiel = null; }
      } else if (t < 0.32) mat.opacity = 1 - (t - 0.16) / 0.16;
      else { mat.opacity = 0; this.blende.visible = false; this.blendeZeit = 0; }
    }

    if (!this.renderer.xr.isPresenting) {
      this.kamera.rotation.set(this.nick, this.gier, 0, 'YXZ');
      this.kamera.position.set(0, AUGENHOEHE, 0);
      // Laufen mit WASD
      let vx = 0, vz = 0;
      if (this.tasten['KeyW'] || this.tasten['ArrowUp']) vz -= 1;
      if (this.tasten['KeyS'] || this.tasten['ArrowDown']) vz += 1;
      if (this.tasten['KeyA'] || this.tasten['ArrowLeft']) vx -= 1;
      if (this.tasten['KeyD'] || this.tasten['ArrowRight']) vx += 1;
      if (vx || vz) {
        const tempo = (this.tasten['ShiftLeft'] ? 9 : 3.4) * dt;
        const s = Math.sin(this.gier), c = Math.cos(this.gier);
        const dx = (vx * c - vz * s) * tempo;
        const dz = (vx * s + vz * c) * tempo;
        const nx = this.rig.position.x + dx, nz = this.rig.position.z + dz;
        if (imAreal(nx, nz)) this.rig.position.set(nx, hoeheBei(nx, nz), nz);
      }
    } else {
      // VR: Höhe dem Boden anpassen, Drehen mit dem Stick
      const p = this.rig.position;
      p.y += (hoeheBei(p.x, p.z) - p.y) * Math.min(1, dt * 8);
      this.stickDrehen(dt);
    }
    this.aktualisiereZeiger();
  }

  stickDrehen(dt) {
    for (const c of this.controller) {
      const q = c.userData.quelle;
      if (!q || !q.gamepad) continue;
      const ax = q.gamepad.axes;
      const dreh = ax.length > 2 ? ax[2] : ax[0];
      if (Math.abs(dreh) > 0.7) {
        if (!c.userData.gedreht) {
          this.rig.rotation.y -= Math.sign(dreh) * (Math.PI / 6);
          c.userData.gedreht = true;
        }
      } else c.userData.gedreht = false;
    }
  }
}
