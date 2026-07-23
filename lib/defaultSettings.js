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
  targetExe: 'GTA5.exe',
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
  soundOnAction: false,
  /** Seconds between /me lines in mechanic RP (repairs, mods, tow). Default 5. */
  mechanicRPDelaySeconds: 5,
  /**
   * SD Uniform/Equipment key macros. Each: { delayMs, steps: [{ key, count }] }.
   * Supported keys: enter, down, up, left, right, backspace, escape, tab, space.
   */
  clockInMacros: {
    uniform: {
      delayMs: 100,
      arrowDelayMs: 10,
      enterSettleMs: 700,
      backspaceSettleMs: 400,
      initialPauseMs: 1000,
      /** First N arrow presses after start — slower so the menu can keep up */
      openingArrowCount: 2,
      openingArrowDelayMs: 150,
      steps: [
        { key: 'enter', count: 1 },
        { key: 'down', count: 2 },
        { key: 'enter', count: 1 },
        { key: 'down', count: 58 },
        { key: 'enter', count: 1 },
      ],
    },
    weapons: {
      delayMs: 100,
      arrowDelayMs: 80,
      enterSettleMs: 500,
      backspaceSettleMs: 500,
      steps: [
        { key: 'down', count: 1 },
        { key: 'enter', count: 1 },
        { key: 'down', count: 1 },
        { key: 'enter', count: 1 },
        { key: 'down', count: 1 },
        { key: 'enter', count: 1 },
        { key: 'down', count: 1 },
        { key: 'enter', count: 1 },
        { key: 'backspace', count: 1 },
        { key: 'down', count: 3 },
        { key: 'enter', count: 1 },
        { key: 'down', count: 1 },
        { key: 'enter', count: 1 },
        { key: 'backspace', count: 1 },
        { key: 'down', count: 6 },
        { key: 'enter', count: 1 },
        { key: 'down', count: 1 },
        { key: 'enter', count: 1 },
        { key: 'backspace', count: 1 },
        { key: 'down', count: 16 },
        { key: 'enter', count: 1 },
        { key: 'down', count: 1 },
        { key: 'enter', count: 1 },
      ],
    },
    /** Timing for Uniform + Weapons combined run (slower than solo macros). */
    uniformAndWeapons: {
      afterUniformPauseMs: 1000,
      bridgeBackspaceSettleMs: 800,
      afterBridgePauseMs: 900,
      afterWeaponsPauseMs: 1500,
      weaponsArrowDelayMs: 120,
      weaponsEnterSettleMs: 700,
      weaponsBackspaceSettleMs: 700,
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
    'radio',
    'pursuit',
    'animations',
    'useful-links',
    'utility',
  ],
};
