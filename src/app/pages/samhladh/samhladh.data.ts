/**
 * Samhladh (clan animal spirit) data from Beyond the Wall, Samhladh listing (pp. 40–46).
 */

export type HolyDayId =
  | 'winter-solstice'
  | 'imbolc'
  | 'spring-equinox'
  | 'beltaine'
  | 'summer-solstice'
  | 'lugnasadh'
  | 'autumn-equinox'
  | 'samhain';

export interface HolyDay {
  id: HolyDayId;
  name: string;
  /** 1-based month and day of month. */
  month: number;
  day: number;
  /** Position on the wheel, degrees clockwise from North (top). */
  angle: number;
  /** The hour this holy day maps to (Winter Solstice = midnight). */
  hour: number;
  direction: string;
}

export const HOLY_DAYS: readonly HolyDay[] = [
  {
    id: 'winter-solstice',
    name: 'Winter Solstice',
    month: 12,
    day: 21,
    angle: 0,
    hour: 0,
    direction: 'N',
  },
  { id: 'imbolc', name: 'Imbolc', month: 2, day: 1, angle: 45, hour: 3, direction: 'NE' },
  {
    id: 'spring-equinox',
    name: 'Spring Equinox',
    month: 3,
    day: 21,
    angle: 90,
    hour: 6,
    direction: 'E',
  },
  { id: 'beltaine', name: 'Beltaine', month: 5, day: 1, angle: 135, hour: 9, direction: 'SE' },
  {
    id: 'summer-solstice',
    name: 'Summer Solstice',
    month: 6,
    day: 21,
    angle: 180,
    hour: 12,
    direction: 'S',
  },
  { id: 'lugnasadh', name: 'Lugnasadh', month: 8, day: 1, angle: 225, hour: 15, direction: 'SW' },
  {
    id: 'autumn-equinox',
    name: 'Autumn Equinox',
    month: 9,
    day: 21,
    angle: 270,
    hour: 18,
    direction: 'W',
  },
  { id: 'samhain', name: 'Samhain', month: 11, day: 1, angle: 315, hour: 21, direction: 'NW' },
];

export interface Samhladh {
  id: string;
  name: string;
  description: string;
  geasa: string[];
  trait: string;
  day: HolyDayId;
  bonus: string;
  /** The bonus is the standard aid applied to the named skills or stats. */
  standard?: boolean;
}

export const SAMHLADHS: readonly Samhladh[] = [
  {
    id: 'badger',
    name: 'Badger',
    description:
      'Lives in a burrow (set). Careful abroad, ferocious when attacked at home; grants speed and fighting skill only in defence.',
    geasa: [
      'Never surrender if attacked',
      'Do not start feuds, but end them as soon as possible, no matter the cost',
    ],
    trait: 'Prudent',
    day: 'winter-solstice',
    bonus: 'Movement or (Weapon) Attack',
    standard: true,
  },
  {
    id: 'bear',
    name: 'Bear',
    description:
      'Prizes solitude; only the Fortrenn clan is adopted. Bear folk are big, strong, lazy in winter and fiercely loyal.',
    geasa: [
      'Be loyal to your friends (not necessarily their friends)',
      'Never allow a child to come to harm',
    ],
    trait: 'Suspicious',
    day: 'lugnasadh',
    bonus: '+1 STR, or +5 Grapple, or +1 Healing Rate with +10 Lazy until healed',
  },
  {
    id: 'blackbird',
    name: 'Blackbird',
    description:
      'Best singer of the Otherworld, found in the tangled forest. Its clans are singers and skilled hunters, especially at hiding.',
    geasa: [
      'Never fail to join in a song when invited',
      'Share the fruits of the hunt with those less fortunate',
    ],
    trait: 'Modest',
    day: 'imbolc',
    bonus: '+10 Singing or +5 Hunting',
  },
  {
    id: 'boar',
    name: 'Boar',
    description:
      'Lives deep in the Otherworld forest. Boar clans are quick to anger, stubborn and hold long grudges.',
    geasa: ['Never stand aside for another', 'Do not share anything outside the clan'],
    trait: 'Indulgent',
    day: 'samhain',
    bonus: 'STR or CON',
    standard: true,
  },
  {
    id: 'bull',
    name: 'Bull',
    description:
      'Lives in a green pasture among the spirits of his cows. Bull clans are known for their promiscuity.',
    geasa: [
      'Do not refuse when sex is freely offered',
      'Guard the women of the clan with your life',
    ],
    trait: 'Lustful',
    day: 'summer-solstice',
    bonus: 'STR or CON (standard), or Fertility: +5 on the Childbirth table',
  },
  {
    id: 'crow',
    name: 'Crow',
    description:
      'Scavenges from the leaves of the Tree of Life and speaks with the dead. Children get one chance at the test; failure means exile.',
    geasa: ['Do not feed those outside your clan', 'Do not pass up an opportunity to loot'],
    trait: 'Greedy',
    day: 'winter-solstice',
    bonus: 'Intrigue or Awareness',
    standard: true,
  },
  {
    id: 'dog',
    name: 'Dog',
    description:
      'Lives in a comfortable Otherworld house, fed the choicest meats by giants. Dog clans are known for honesty and deep friendship once a pact is made.',
    geasa: ['Never abuse a friendship', 'Never betray your family'],
    trait: 'Loyalty (Lord/Clan)',
    day: 'spring-equinox',
    bonus: 'Hunting or Awareness',
    standard: true,
  },
  {
    id: 'golden-eagle',
    name: 'Golden Eagle',
    description:
      'Lives in the topmost branches of the World Tree yet sees its deepest roots. Eagle clans are the proudest of the Picts.',
    geasa: ['Never lie', 'Never give in to oppression', 'Eat fish at least once a week'],
    trait: 'Proud',
    day: 'summer-solstice',
    bonus: 'STR or Awareness',
    standard: true,
  },
  {
    id: 'goose',
    name: 'Goose',
    description:
      'Migrates between Otherworld ponds and eats the Hazelnuts of Wisdom at the Well of Segais; hears grass grow. Goose clans migrate between homes.',
    geasa: ['Never live in one place for more than one year'],
    trait: 'Temperate',
    day: 'winter-solstice',
    bonus: 'CON or Awareness',
    standard: true,
  },
  {
    id: 'hare',
    name: 'Hare',
    description:
      'Shy; lives in tunnels reaching all parts of the Otherworld and flees trouble, but fights ferociously when cornered. Hare clans live in dug-in homes.',
    geasa: ['Do not start fights or feuds'],
    trait: 'Prudent',
    day: 'spring-equinox',
    bonus: 'Movement Rate, DEX or Awareness',
    standard: true,
  },
  {
    id: 'hawk',
    name: 'Hawk',
    description:
      "Soars the middle branches of the World Tree, keen-eyed with a long memory; guides the way to the clan's ancestors. Hawk clans excel at hit-and-run raids.",
    geasa: ['Take no more than you need'],
    trait: 'Temperate',
    day: 'beltaine',
    bonus: '(Weapon) Attack or Awareness',
    standard: true,
  },
  {
    id: 'horse',
    name: 'Horse',
    description:
      'Weak in the Highlands, strong in Ireland; its few clans are lowlanders. Guides and carries travellers in the Otherworld.',
    geasa: [
      'Never cut your hair; let it flow like a mane',
      "Never shirk a day's work",
      'Do not avoid battle',
    ],
    trait: 'Energetic',
    day: 'samhain',
    bonus: 'Movement Rate, Horsemanship or CON',
    standard: true,
  },
  {
    id: 'osprey',
    name: 'Osprey',
    description:
      'The Sea Eagle, living in a pine above the Otherworld sea. Osprey clans rival the Golden Eagle clans in pride.',
    geasa: ['Eat fish at least three times a week', 'Never stoop to insults or crude behaviour'],
    trait: 'Honor',
    day: 'autumn-equinox',
    bonus: 'Movement Rate, DEX or STR',
    standard: true,
  },
  {
    id: 'otter',
    name: 'Otter',
    description:
      'Plays in the Seven Rivers from the Well of Segais and has never eaten the Hazels of Wisdom. Famous for lack of sexual appetite; Otter clans are thought prudish.',
    geasa: ['Do not pass up an opportunity to have fun', 'Do not engage in promiscuous sex'],
    trait: 'Reckless',
    day: 'autumn-equinox',
    bonus: 'Chaste, Swimming or Hunting (Hiding)',
    standard: true,
  },
  {
    id: 'ram',
    name: 'Ram',
    description:
      'Rules the high pastures with his harem of sheep; aggressive toward rivals. Ram clans are renowned for appetite and prowess.',
    geasa: ['Do not refuse sex if freely offered', 'Actively pursue vengeance against rivals'],
    trait: 'Lustful',
    day: 'spring-equinox',
    bonus: '+1d6 Damage or +5 (Weapon) Attack',
  },
  {
    id: 'raven',
    name: 'Raven',
    description:
      'Eats the Hazelnuts of Prescience in the leaves of the Tree of Life. Raven clans are perceptive and foresighted; children who fail the test are exiled at once.',
    geasa: [
      'Attack those carrying or wearing black',
      'Do not foretell for those outside your clan',
    ],
    trait: 'Love (Family)',
    day: 'winter-solstice',
    bonus: 'Intrigue or Awareness',
    standard: true,
  },
  {
    id: 'reindeer',
    name: 'Reindeer',
    description:
      'Roams the high Otherworld moors with a large family, changing coat to hide. Reindeer clans moderate their behaviour so they rule their own fate.',
    geasa: [
      'Do not fight over a woman',
      'Have no trait over 15 other than those your Samhladh dictates',
    ],
    trait: 'Temperate',
    day: 'winter-solstice',
    bonus: '−3 to a non-religious trait, or +1 Movement Rate, or +5 Hunting',
  },
  {
    id: 'salmon',
    name: 'Salmon',
    description:
      'Swims the seven streams to and from the Well of Segais, eating the Hazelnuts of Wisdom. Salmon clans never give in to adversity.',
    geasa: ['Eat no fish', 'Do not give up'],
    trait: 'Energetic',
    day: 'winter-solstice',
    bonus: '+5 Swimming, or Longevity: roll 3d6 on the Aging Table and keep any two',
  },
  {
    id: 'seal',
    name: 'Seal',
    description:
      'Lives in the broad Otherworld waters among a chorus of descendants. Seal clans of the west and north coasts are big and sing in chorus.',
    geasa: ['Defend your land', 'Return to your birth-land at least once a year'],
    trait: 'Trusting',
    day: 'beltaine',
    bonus: '+5 Singing, or +5 Swimming, or +1 SIZ',
  },
  {
    id: 'sow',
    name: 'Sow',
    description:
      'Lives with the Boar but forages beneath the World Tree for the Acorns of Inspiration. Sow clans are poets and physically strong.',
    geasa: ['Never insult a poet or bard'],
    trait: 'Modest',
    day: 'samhain',
    bonus: '+1 STR, or +3 Compose, or +3 Play (instrument)',
  },
  {
    id: 'stag',
    name: 'Stag',
    description:
      'Proud and jealous lord of a harem of hinds in a lush pasture. Stag clan men guard their women carefully.',
    geasa: ['Keep other men away from your wife'],
    trait: 'Energetic',
    day: 'samhain',
    bonus: '+1 Movement Rate, or +5 Awareness, or Fertility (as Bull)',
  },
  {
    id: 'wild-cat',
    name: 'Wild Cat',
    description:
      'Lives on the Otherworld crags, suspicious and fierce; other animal spirits avoid him. Cat clans distrust strangers and marry within the greater clan.',
    geasa: ['Owe no allegiance to a non-Cat clan ruler'],
    trait: 'Suspicious',
    day: 'samhain',
    bonus: '(Weapon) Attack or Hunting (standard), or +1d6 Damage',
  },
  {
    id: 'wolf',
    name: 'Wolf',
    description:
      'Roams and hunts every region of the Otherworld. Wolf clans are ferocious, travel far and fast, and obey their chiefs until a younger challenger rises.',
    geasa: ['Hunt your own food', 'Have no pity for the weak'],
    trait: 'Greedy',
    day: 'winter-solstice',
    bonus: '+5 Hunting or +5 Awareness',
  },
];

export function holyDay(id: HolyDayId): HolyDay {
  return HOLY_DAYS.find((d) => d.id === id)!;
}
