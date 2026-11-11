// Steckbriefe und Verhaltenswerte der Bergtiere.
// radiusWachsam: ab hier schaut das Tier her. radiusFlucht: ab hier läuft es weg.
// radiusVerstecken: ab hier sucht es ein Versteck.

export const TIERARTEN = [
  {
    id: 'steinbock',
    bild: { drehung: -0.8, richtung: [1.0, 0.45, 1.5], zoom: 0.92 },
    name: 'Alpensteinbock',
    lateinisch: 'Capra ibex',
    emoji: '🐐',
    kartenfarbe: '#8d6e4a',
    anzahl: 2,
    groesse: 1.0,
    lebensraum: 'fels',
    tempoGehen: 0.8, tempoFlucht: 4.2,
    radiusWachsam: 22, radiusFlucht: 13, radiusVerstecken: 7,
    ruheZeit: [5, 12], versteckArt: 'fels', ruhigNach: 9,
    steckbrief: [
      'Größe: bis 1,7 m lang, Männchen bis 100 kg',
      'Nahrung: Gräser, Kräuter, Flechten',
      'Zuhause: Felsen von 1800 bis 3200 m Höhe'
    ],
    lebensweise: 'Der Steinbock klettert sehr sicher auf steilen Felsen. Seine Hufe haben weiche Ränder, die sich an den Stein kleben. Am Tag frisst er Gras, in der Mittagshitze ruht er im Schatten.',
    wissen: 'Die Hörner des Bocks werden bis zu 1 m lang. Man kann an den Ringen sein Alter zählen.'
  },
  {
    id: 'gaemse',
    bild: { drehung: -0.8, richtung: [1.0, 0.45, 1.5], zoom: 0.92 },
    name: 'Gämse',
    lateinisch: 'Rupicapra rupicapra',
    emoji: '🦌',
    kartenfarbe: '#6b5236',
    anzahl: 3,
    groesse: 0.85,
    lebensraum: 'hang',
    tempoGehen: 1.1, tempoFlucht: 6.5,
    radiusWachsam: 28, radiusFlucht: 18, radiusVerstecken: 10,
    ruheZeit: [4, 9], versteckArt: 'fels', ruhigNach: 12,
    steckbrief: [
      'Größe: 1,1 bis 1,3 m lang, 25 bis 50 kg',
      'Nahrung: Gräser, Knospen, Blätter',
      'Zuhause: Bergwald und Felswiesen'
    ],
    lebensweise: 'Gämsen leben in Gruppen und halten gut Wache. Wird eine unruhig, pfeift sie laut. Dann rennt die ganze Gruppe weg. Sie springen bis 2 m hoch und 6 m weit.',
    wissen: 'Gämsen sind sehr scheu. Sie bemerken dich oft schon von weit weg.'
  },
  {
    id: 'murmeltier',
    bild: { drehung: -1.1, richtung: [1.0, 0.5, 1.4], zoom: 0.95 },
    name: 'Alpenmurmeltier',
    lateinisch: 'Marmota marmota',
    emoji: '🦫',
    kartenfarbe: '#9a7b4f',
    anzahl: 4,
    groesse: 0.5,
    lebensraum: 'wiese',
    tempoGehen: 0.6, tempoFlucht: 3.6,
    radiusWachsam: 26, radiusFlucht: 15, radiusVerstecken: 11,
    ruheZeit: [3, 8], versteckArt: 'loch', ruhigNach: 20,
    steckbrief: [
      'Größe: 50 cm lang, 3 bis 6 kg',
      'Nahrung: Gräser, Kräuter, Wurzeln',
      'Zuhause: Erdhöhlen auf Bergwiesen'
    ],
    lebensweise: 'Murmeltiere wohnen in großen Familien in einem Erdbau. Immer eines hält Wache und pfeift bei Gefahr. Von Oktober bis April schlafen alle zusammen den Winterschlaf.',
    wissen: 'Beim Winterschlaf schlägt das Herz nur noch 5 mal pro Minute.'
  },
  {
    id: 'steinadler',
    bild: { drehung: -0.35, richtung: [0.55, 0.75, 1.3], zoom: 0.78 },
    name: 'Steinadler',
    lateinisch: 'Aquila chrysaetos',
    emoji: '🦅',
    kartenfarbe: '#5a4a38',
    anzahl: 1,
    groesse: 1.0,
    lebensraum: 'luft',
    tempoGehen: 7.0, tempoFlucht: 11.0,
    radiusWachsam: 40, radiusFlucht: 28, radiusVerstecken: 0,
    ruheZeit: [0, 0], versteckArt: 'luft', ruhigNach: 10,
    steckbrief: [
      'Größe: 2,2 m Flügelspanne',
      'Nahrung: Murmeltiere, Hasen, junge Gämsen',
      'Zuhause: Nest in einer Felswand'
    ],
    lebensweise: 'Der Steinadler kreist stundenlang ohne Flügelschlag. Warme Luft trägt ihn nach oben. Von weit oben sieht er ein Murmeltier und stößt steil herab.',
    wissen: 'Er sieht 3 mal besser als du. Ein Hase ist für ihn aus 2 km Höhe noch gut zu sehen.'
  },
  {
    id: 'alpendohle',
    bild: { drehung: -0.9, richtung: [1.0, 0.5, 1.4], zoom: 0.95 },
    name: 'Alpendohle',
    lateinisch: 'Pyrrhocorax graculus',
    emoji: '🐦‍⬛',
    kartenfarbe: '#3b3b40',
    anzahl: 5,
    groesse: 0.35,
    lebensraum: 'fels',
    tempoGehen: 0.9, tempoFlucht: 7.5,
    radiusWachsam: 18, radiusFlucht: 9, radiusVerstecken: 5,
    ruheZeit: [2, 6], versteckArt: 'luft', ruhigNach: 7,
    steckbrief: [
      'Größe: 38 cm lang, gelber Schnabel',
      'Nahrung: Insekten, Beeren, Reste von Menschen',
      'Zuhause: Felsspalten, oft nahe Bergstationen'
    ],
    lebensweise: 'Alpendohlen fliegen in lauten Schwärmen. Sie sind neugierig und holen sich gern ein Brot von der Hütte. Im Flug spielen sie mit dem Wind.',
    wissen: 'Alpendohlen wurden schon am Gipfel des Mount Everest gesehen.'
  },
  {
    id: 'schneehase',
    bild: { drehung: -1.0, richtung: [1.0, 0.45, 1.4], zoom: 0.95 },
    name: 'Schneehase',
    lateinisch: 'Lepus timidus',
    emoji: '🐇',
    kartenfarbe: '#8f9298',
    anzahl: 3,
    groesse: 0.4,
    lebensraum: 'busch',
    tempoGehen: 0.5, tempoFlucht: 7.0,
    radiusWachsam: 20, radiusFlucht: 11, radiusVerstecken: 8,
    ruheZeit: [4, 10], versteckArt: 'busch', ruhigNach: 14,
    steckbrief: [
      'Größe: 50 cm lang, 3 kg',
      'Nahrung: Gräser, Rinde, Knospen',
      'Zuhause: Mulden unter Büschen und Steinen'
    ],
    lebensweise: 'Der Schneehase drückt sich bei Gefahr flach auf den Boden. Erst im letzten Moment springt er weg und macht dabei Haken. Im Winter wird sein Fell weiß.',
    wissen: 'Seine großen Hinterfüße wirken wie Schneeschuhe. So sinkt er nicht ein.'
  },
  {
    id: 'alpensalamander',
    bild: { drehung: -0.6, richtung: [0.7, 1.1, 1.0], zoom: 0.9 },
    name: 'Alpensalamander',
    lateinisch: 'Salamandra atra',
    emoji: '🦎',
    kartenfarbe: '#2b2b2e',
    anzahl: 3,
    groesse: 0.18,
    lebensraum: 'bach',
    tempoGehen: 0.2, tempoFlucht: 0.7,
    radiusWachsam: 8, radiusFlucht: 4, radiusVerstecken: 2.5,
    ruheZeit: [6, 14], versteckArt: 'fels', ruhigNach: 18,
    steckbrief: [
      'Größe: 14 cm lang, ganz schwarz',
      'Nahrung: Würmer, Schnecken, Spinnen',
      'Zuhause: feuchte Stellen am Bach, unter Steinen'
    ],
    lebensweise: 'Der Alpensalamander mag Regen. Bei Sonne bleibt er unter Steinen versteckt. Er legt keine Eier, sondern bringt 2 fertige Junge zur Welt.',
    wissen: 'Die Jungen bleiben bis zu 3 Jahre im Bauch der Mutter. Das ist Rekord unter den Lurchen.'
  },
  {
    id: 'kreuzotter',
    bild: { drehung: -0.5, richtung: [0.5, 1.3, 0.8], zoom: 0.9 },
    name: 'Kreuzotter',
    lateinisch: 'Vipera berus',
    emoji: '🐍',
    kartenfarbe: '#6e6248',
    anzahl: 2,
    groesse: 0.25,
    lebensraum: 'fels',
    tempoGehen: 0.3, tempoFlucht: 1.6,
    radiusWachsam: 10, radiusFlucht: 6, radiusVerstecken: 3.5,
    ruheZeit: [8, 16], versteckArt: 'fels', ruhigNach: 16,
    steckbrief: [
      'Größe: 65 cm lang',
      'Nahrung: Mäuse, Eidechsen, Frösche',
      'Zuhause: sonnige Steine, Heide, Moor'
    ],
    lebensweise: 'Am Morgen liegt die Kreuzotter auf einem warmen Stein. So wird ihr Körper warm. Bei Schritten verschwindet sie sofort in einer Spalte. Sie beißt nur, wenn man sie anfasst.',
    wissen: 'Am Rücken trägt sie ein Zickzack-Band. Daran erkennt man sie sicher.'
  }
];

export const TIERE_GESAMT = TIERARTEN.length;
