/**
 * The built-in charges: SVG files in `public/cote-of-arms/charges`, drawn in black on white
 * so they can take any tincture. To add one, put the file in that folder and list it here.
 */
export interface LibraryCharge {
  /** File name in the charges folder. */
  readonly file: string;
  /** Label shown under the preview, and the name the charge gets on the shield. */
  readonly name: string;
}

/** Folder of the charge files, relative to the app's base href. */
export const CHARGE_LIBRARY_FOLDER = 'cote-of-arms/charges/';

/** Drag-and-drop data type that carries a library charge's file name. */
export const CHARGE_DRAG_TYPE = 'application/x-pendragon-charge';

export const CHARGE_LIBRARY: readonly LibraryCharge[] = [
  { file: 'lion-rampant.svg', name: 'Lion rampant' },
  { file: 'lion-passant.svg', name: 'Lion passant' },
  { file: 'lions-heads.svg', name: "Lion's head" },
  { file: 'eagle-displayed.svg', name: 'Eagle displayed' },
  { file: 'eagle-double-headed.svg', name: 'Double-headed eagle' },
  { file: 'dragon-rampant.svg', name: 'Dragon rampant' },
  { file: 'dragon-passant.svg', name: 'Dragon passant' },
  { file: 'dragon-head.svg', name: "Dragon's head" },
  { file: 'monsters-heads.svg', name: "Monster's head" },
  { file: 'serpent.svg', name: 'Serpent' },
  { file: 'boar.svg', name: 'Boar' },
  { file: 'boars-heads.svg', name: "Boar's head" },
  { file: 'wolf.svg', name: 'Wolf' },
  { file: 'cat.svg', name: 'Cat' },
  { file: 'swan.svg', name: 'Swan' },
  { file: 'wings.svg', name: 'Wings' },
  { file: 'cross-crosslets.svg', name: 'Cross crosslet' },
  { file: 'cross-flory.svg', name: 'Cross flory' },
  { file: 'crosses-seme.svg', name: 'Cross formy' },
  { file: 'fleurs-de-lis.svg', name: 'Fleur-de-lis' },
  { file: 'crowns.svg', name: 'Crown' },
  { file: 'grail.svg', name: 'Grail' },
  { file: 'keys.svg', name: 'Key' },
  { file: 'swords.svg', name: 'Sword' },
  { file: 'gonfanon.svg', name: 'Gonfanon' },
  { file: 'gloves.svg', name: 'Glove' },
  { file: 'arm-hand.svg', name: 'Arm and hand' },
  { file: 'castle.svg', name: 'Castle' },
  { file: 'tower.svg', name: 'Tower' },
  { file: 'ship.svg', name: 'Ship' },
  { file: 'sun-in-splendour.svg', name: 'Sun in splendour' },
  { file: 'crescents.svg', name: 'Crescent' },
  { file: 'mullets.svg', name: 'Mullet' },
  { file: 'pentangle.svg', name: 'Pentangle' },
  { file: 'annulets.svg', name: 'Annulet' },
  { file: 'roundels.svg', name: 'Roundel' },
  { file: 'lozenges.svg', name: 'Lozenge' },
  { file: 'pale.svg', name: 'Shield with a pale' },
];

const BY_FILE = new Map(CHARGE_LIBRARY.map((c) => [c.file, c]));

/** The library charge with this file name; anything not in the list is refused. */
export function libraryCharge(file: string | null | undefined): LibraryCharge | null {
  return (file && BY_FILE.get(file)) || null;
}

export function libraryChargeUrl(charge: LibraryCharge): string {
  return CHARGE_LIBRARY_FOLDER + charge.file;
}
