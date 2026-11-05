/**
 * Minimal typings for @3d-dice/dice-box, which ships without TypeScript declarations.
 * Only the parts of the API used by this app are described.
 */
declare module '@3d-dice/dice-box' {
  export interface DiceBoxConfig {
    /** CSS selector of the element the canvas is appended to. */
    container: string;
    /** Path to the copied `assets` folder, resolved against `origin`. */
    assetPath: string;
    origin?: string;
    id?: string;
    theme?: string;
    themeColor?: string;
    scale?: number;
    gravity?: number;
    mass?: number;
    friction?: number;
    restitution?: number;
    angularDamping?: number;
    linearDamping?: number;
    spinForce?: number;
    throwForce?: number;
    startingHeight?: number;
    settleTimeout?: number;
    delay?: number;
    offscreen?: boolean;
    enableShadows?: boolean;
    shadowTransparency?: number;
    lightIntensity?: number;
    suspendSimulation?: boolean;
    preloadThemes?: string[];
    onRollComplete?: (results: DiceBoxGroupResult[]) => void;
    onDieComplete?: (result: DiceBoxDieResult) => void;
    onBeforeRoll?: (notation: unknown) => void;
  }

  export interface DiceBoxDieResult {
    groupId: number;
    rollId: number;
    /** Die type such as `d6`, `d20` or `d100`. */
    sides: string | number;
    theme: string;
    themeColor: string;
    value: number;
  }

  export interface DiceBoxGroupResult {
    id: number;
    qty: number;
    sides: string | number;
    modifier: number;
    rolls: DiceBoxDieResult[];
    value: number;
  }

  export interface DiceBoxNotation {
    qty: number;
    sides: string | number;
    modifier?: number;
  }

  export type DiceBoxRollInput = string | DiceBoxNotation | Array<string | DiceBoxNotation>;

  export default class DiceBox {
    constructor(config: DiceBoxConfig);
    init(): Promise<this>;
    roll(notation: DiceBoxRollInput): Promise<DiceBoxDieResult[]>;
    add(notation: DiceBoxRollInput): Promise<DiceBoxDieResult[]>;
    clear(): this;
    hide(className?: string): this;
    show(): this;
    updateConfig(config: Partial<DiceBoxConfig>): Promise<void>;
    getRollResults(): DiceBoxGroupResult[];
    onRollComplete: (results: DiceBoxGroupResult[]) => void;
  }
}
