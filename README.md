# Bergwelt – Tiere finden in VR

Live: https://erikdahlmann.github.io/vr-bergwelt/

WebGL-Lernspiel für die Grundschule. Die Kinder stehen in einem Bergtal von
200 × 200 m und suchen 8 Tierarten. Wer ein Tier anklickt, bekommt seine
Steckbriefkarte. Die Tiere sind scheu: sie werden wachsam, fliehen oder
verstecken sich.

## Starten

Die Seite braucht einen Server (ES-Module und WebXR laufen nicht per Doppelklick):

```bash
python3 -m http.server 8893 --directory .
```

Dann http://localhost:8893 öffnen. Vorschau-Name in Claude Code: `bergwelt-vr`.

Für die VR-Brille muss die Seite über **https** laufen (z. B. GitHub Pages).
Im Browser der Brille den Knopf „Mit VR-Brille starten“ drücken.

## Bedienung

| | Brille | Rechner |
|---|---|---|
| Umsehen | Kopf drehen | Maus ziehen |
| Gehen | auf den Boden zeigen, Trigger | auf den Boden klicken (oder W A S D) |
| Sammeln | auf ein Tier zeigen, Trigger | auf ein Tier klicken |
| Drehen | Stick links/rechts (30°-Schritte) | — |

Ein Sprung geht höchstens 30 m weit. Ins Wasser und aus dem Areal geht es nicht
(roter Ring).

## Tierkarten

Jede Karte zeigt eine gezeichnete Abbildung des Tieres (ChatGPT über Codex,
Prompts in `_planung/bildprompts.md`, Bilder in `bilder/*.webp`). Die Karte
bleibt offen, bis man sie wegklickt. Gefundene Tiere liegen unten rechts im
Regal und lassen sich jederzeit wieder anklicken – am Bildschirm und in der
Brille.

## Die 8 Tiere

Alpensteinbock, Gämse, Alpenmurmeltier, Steinadler, Alpendohle, Schneehase,
Alpensalamander, Kreuzotter. Alle Angaben in `js/daten.js`.

## Verhalten der Tiere

Jede Art hat drei Abstände (in `js/daten.js`):

* `radiusWachsam` – das Tier hört auf zu fressen und schaut her.
* `radiusFlucht` – es rennt weg, vom Kind fort.
* `radiusVerstecken` – es sucht ein Versteck (Loch, Fels, Busch) und verschwindet
  dort. Nach 12 bis 28 s kommt es an einer anderen Stelle wieder heraus.

Besonderheiten: Gämsen und Alpendohlen warnen ihre Gruppe. Der Schneehase
drückt sich erst flach auf den Boden und rennt erst spät los. Das Murmeltier
setzt sich auf die Hinterbeine, wenn es Wache hält. Der Steinadler kreist und
steigt höher, sobald jemand näher kommt. Ein Tier hinter einem Felsen oder Baum
kann man nicht anklicken.

## Dateien

```
index.html        Seite, Startfenster, Kartenregal
css/stil.css
js/texturen.js    alle Texturen, im Browser gezeichnet (keine Bilddateien)
js/gelaende.js    Höhenformel, Farben, Fluss, Himmel, Sonne, Fernberge
js/natur.js       Bäume, Felsen, Büsche, Geröll, Gras, Blumen, Verstecke
js/modelle.js     die 8 Tiermodelle aus einfachen Körpern
js/daten.js       Steckbriefe und Verhaltenswerte
js/tiere.js       Platzierung, Zustände, Bewegung, Animation
js/spieler.js     Zeiger, Teleport, Maus/Tastatur, VR-Controller
js/karten.js      Tierbild, Karte, Regal, VR-Tafel
js/vr.js          VR-Knopf
js/main.js        Aufbau und Schleife
lib/              three.js r186 (lokal, läuft offline)
test-tiere.html   alle 8 Modelle nebeneinander (zum Prüfen)
test-karten.html  alle 8 Karten nebeneinander (zum Prüfen)
```

## Aussehen

Alle Texturen zeichnet der Browser beim Start selbst (`js/texturen.js`), es gibt
keine Bilddateien:

* Boden mit Körnung und Beulen (Normalenkarte), Mulden sind leicht abgedunkelt.
* Gras sind kleine Büschel aus drei gekreuzten Flächen mit Halm-Textur. Gras,
  Büsche und Baumspitzen bewegen sich im Wind (im Shader, kostet fast nichts).
* Himmel mit Schleierwolken und einer Sonne, die zum Licht passt.
* Wasser mit wandernden Kräuseln und Glanz.
* Felsen, Geröll, Rinde und Büsche tragen dieselbe Steinkörnung.
* Unter Bäumen, Felsen und Büschen liegt ein weicher Fleck, damit nichts
  aufgeklebt wirkt.
* Felsen haben viele Flächen, Schichtbänder und eine Steinkörnung. In einen
  Felsen hinein kann man nicht springen.

## Bewegung der Tiere

`js/animation.js` rechnet die Bewegungsphasen. Jedes Bein hat ein Knie, der
Hals ein Gelenk, Schwänze und Ohren eigene Glieder. Je nach Tempo läuft ein
Tier im Schritt, im Trab oder im Galopp; die Beine sind dabei richtig versetzt
(Schritt: hinten rechts, vorne rechts, hinten links, vorne links). Dazu kommen
Atmen, Blinzeln, Ohrenzucken, Schwanzschlagen, Grasen mit Kauen, Aufrichten
beim Murmeltier, Flachdrücken beim Hasen, Flügelschlag mit Hand- und
Schultergelenk, Schlängeln der Otter und der Kriechgang des Salamanders.

Am Rechner rund 60 Bilder/s bei etwa 320 000 Dreiecken.

Das Gelände entsteht aus einer Formel (`hoeheBei`), nicht aus einer Datei.
Dieselbe Formel nutzen Tiere und Teleport. Mit `?sparsam` startet die Seite mit
weniger Pflanzen (für schwache Geräte); auf Quest und Handys passiert das
automatisch. Mit `?sofort` überspringt sie das Startfenster (zum Vorführen und
für Bildschirmfotos).

## Später

Wüste und Dschungel sollen dazukommen. Dafür müssen `gelaende.js`, `natur.js`,
`modelle.js` und `daten.js` je Szenario getauscht werden; `tiere.js`,
`spieler.js` und `karten.js` bleiben gleich.
