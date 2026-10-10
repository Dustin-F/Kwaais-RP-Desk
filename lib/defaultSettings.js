/**
 * Default settings schema.
 * Department: PD (Police Dept) or SD (Sheriff Dept) - affects labels and megaphone text.
 * All callsign/unit fields are configurable.
 */
module.exports = {
  department: 'PD',
  departmentFullName: 'LSPD',
  /** When true, Admin role is visible (unlocked via secret hotkey + password). */
  adminUnlocked: false,
  badgeNumber: '24195',
  /** Your callsign (e.g. 228B, 3-K-22, RED) */
  callsign: '228B',
  /** Override displayed unit (e.g. RED, 228B) when user Joins or Renames. Falls back to callsign when unset. */
  displayUnit: null,
  pronouns: {
    subject: 'he',
    possessive: 'his',
  },
  targetExe: 'FiveM_GTAProcess.exe',
  windowPosition: 'right',
  debugging: false,
  /** When true, mouse passes through app to game; use Ctrl+arrows to navigate. Disabled when a modal is open. */
  mousePassThrough: false,
  /** Borderless (frameless) window — apply on next launch */
  borderless: false,
  windowWidth: 320,
  windowHeight: 560,
  /** 0–100, 100 = fully opaque */
  windowOpacity: 100,
  /** Auto-collapse sidebar to narrow strip after idle (configurable seconds). Disable to keep expanded. Ctrl+Left at main menu can still collapse manually. */
  sidebarAutoCollapse: false,
  /** Seconds of no navigation before sidebar collapses (when sidebarAutoCollapse is on). */
  sidebarCollapseSeconds: 10,
  /** Up to 6 action IDs for quick bar (e.g. ['Cuff', 'Uncuff', 'IssueCitation']) */
  quickBar: [],
  /** Show action log panel */
  actionLogEnabled: true,
  /** Max entries in action log */
  actionLogMax: 20,
  /** Custom /me and /do RP phrases: { id, type: 'me'|'do', title, text } */
  customRp: [],
  /** Useful links: { id, title, url } — copy to clipboard or open in browser */
  usefulLinks: [],
  /** BBCODE templates for reports/emails: { id, title, content } — copy from app, paste on site */
  bbcodeTemplates: [],
  /** UI theme: 'dark' | 'light' */
  theme: 'dark',
  /** Accent color (hex) for highlights and buttons */
  accentColor: '#5b7cfa',
  /** Compact list: smaller font and tighter rows */
  compactList: false,
  /** Play short sound when an action is sent */
  soundOnAction: true,
  /** Volume for action sounds, 0–100 */
  soundVolume: 60,
  /** Seconds between /me lines in mechanic RP (repairs, mods, tow). Default 5. */
  mechanicRPDelaySeconds: 5,
  /**
   * SD Uniform/Equipment key macros. Each: { delayMs, steps: [{ key, count }] }.
   * Supported keys: enter, down, up, left, right, backspace, escape, tab, space.
   */
  clockInMacros: {
    uniform: {
      /** Bump when the default sequence / timing changes so old saved values get replaced. */
      sequenceVersion: 2,
      /** Open outfit/equipment UI before key sequence (T → paste → Enter). */
      openMenuCommand: '/fl',
      openMenuPauseMs: 2000,
      delayMs: 100,
      /** Fast scroll for long lists (e.g. jump2 ×65). */
      arrowDelayMs: 5,
      enterSettleMs: 900,
      backspaceSettleMs: 700,
      initialPauseMs: 600,
      /** First downs (navigate to Uniform) stay a bit slower. */
      openingArrowCount: 1,
      openingArrowDelayMs: 200,
      /**
       * Named sequences run in order after /fl:
       * 1) Clothes  2) Uniform  3) Select jump2
       */
      sequences: [
        {
          name: 'Clothes',
          steps: [{ key: 'enter', count: 1 }],
        },
        {
          name: 'Uniform',
          steps: [
            { key: 'down', count: 1 },
            { key: 'enter', count: 1 },
          ],
        },
        {
          name: 'Select jump2',
          steps: [
            { key: 'down', count: 64 },
            { key: 'enter', count: 1 },
          ],
        },
      ],
    },
    weapons: {
      /** Bump when the default sequence / timing changes so old saved values get replaced. */
      sequenceVersion: 5,
      /** Open outfit/equipment UI before key sequence (T → paste → Enter). */
      openMenuCommand: '/fl',
      openMenuPauseMs: 2000,
      delayMs: 100,
      arrowDelayMs: 160,
      enterSettleMs: 900,
      backspaceSettleMs: 900,
      initialPauseMs: 700,
      openingArrowCount: 2,
      openingArrowDelayMs: 220,
      /**
       * Named sequences run in order. Each: { name, steps: [{ key, count }] }
       * 0) Chat: /fl (opens menu)
       * 1) Select weapons category (Down ×1, Enter)
       * 2) Clear defaults (Enter)
       * 3–6) Equip items (down to item → enter → enter → backspace)
       */
      sequences: [
        {
          name: 'Select weapons menu',
          steps: [
            { key: 'down', count: 1 },
            { key: 'enter', count: 1 },
          ],
        },
        {
          name: 'Remove all default weapons',
          steps: [{ key: 'enter', count: 1 }],
        },
        {
          name: 'Select stungun',
          steps: [
            { key: 'down', count: 1 },
            { key: 'enter', count: 1 },
            { key: 'enter', count: 1 },
            { key: 'backspace', count: 1 },
          ],
        },
        {
          name: 'Select night stick',
          steps: [
            { key: 'down', count: 2 },
            { key: 'enter', count: 1 },
            { key: 'enter', count: 1 },
            { key: 'backspace', count: 1 },
          ],
        },
        {
          name: 'Select pistol .50',
          steps: [
            { key: 'down', count: 5 },
            { key: 'enter', count: 1 },
            { key: 'enter', count: 1 },
            { key: 'backspace', count: 1 },
          ],
        },
        {
          name: 'Select bump shotgun',
          steps: [
            { key: 'down', count: 17 },
            { key: 'enter', count: 1 },
            { key: 'enter', count: 1 },
            { key: 'backspace', count: 1 },
          ],
        },
      ],
    },
    /** Timing for Uniform + Weapons combined run (slower than solo macros). */
    uniformAndWeapons: {
      afterUniformPauseMs: 1000,
      bridgeBackspaceSettleMs: 900,
      afterBridgePauseMs: 900,
      afterWeaponsPauseMs: 1500,
      /** Combo only: weapons runs inside existing /fl menu (no second /fl). */
      weaponsInitialPauseMs: 250,
      weaponsArrowDelayMs: 160,
      weaponsEnterSettleMs: 900,
      weaponsBackspaceSettleMs: 900,
    },
  },
  /** Custom keybinds (Electron accelerator: Control+Up, etc.) */
  navUpAccel: 'Control+Up',
  navDownAccel: 'Control+Down',
  navLeftAccel: 'Control+Left',
  navRightAccel: 'Control+Right',
  expandAccel: 'Control+Shift+Right',
  /** When false, quick bar slot hotkeys are disabled (no global shortcuts for slots) */
  quickBarHotkeysEnabled: true,
  /** Quick bar slot hotkeys (accelerator per slot, empty = none) */
  quickBarKeys: ['Alt+1', 'Alt+2', 'Alt+3', 'Alt+4', 'Alt+5', 'Alt+6'],
  /** Development/sandbox mode: actions show preview instead of sending to game. Use to test without GTA running. */
  devMode: false,
  /** When dev mode is on: true = timed simulator (countdown between steps), false = show all RP at once */
  devModeTimedPreview: true,
  /** Admin menu category order (ids). Null = use default. */
  adminMenuOrder: null,
  /** Per-submenu item order: { [parentItemId]: [childIds] } */
  subMenuOrders: {},
  /** Main menu category order (ids). */
  menuOrder: [
    'duty',
    'custom-rp',
    'bbcode-templates',
    'information',
    'rp',
    'detective-rp',
    'radio',
    'pursuit',
    'animations',
    'useful-links',
    'utility',
  ],
};
