# KWAAI's RP DESK (Electron)

PD, SD & Mechanic duty overlay for law enforcement RP in GTA V (Eclipse/RAGE). Sidebar UI with **Ctrl + Arrow keys** to navigate; runs commands in the game via **PowerShell** (focus + SendKeys) and Electron’s clipboard. No native Node addons—works with any Electron/Node version.

## Features

- **Department switch**: PD (Police Department) or SD (Sheriff's Department) in Settings
- **Configurable badge number** and **unit/callsign** (division, letter, number; Adam/David change; special units: FLD, RED, TOM, DAVID, AIR)
- **Pronouns** for /me and /do (e.g. he/his)
- **Target exe**: default `GTA5.exe`; change in Settings if needed
- **Navigation**: Ctrl+Up/Down move selection, Ctrl+Right enter/run, Ctrl+Left back, Enter runs selected action
- **Modals** for actions that need input: Issue Citation, 10-15 to DOC, Injured 10-15, Custom Unit

## Requirements

- Node.js 16+
- Windows (focus and send keys via PowerShell + System.Windows.Forms.SendKeys)

## Quick Start

1. **Clone & install**
   ```bash
   git clone https://github.com/YOUR_USERNAME/PD-AHK-Duty-Menu.git
   cd PD-AHK-Duty-Menu/New-RP-Menu
   npm install
   ```

2. **Run the app**
   ```bash
   npm start
   ```

3. **First-time setup**: Open **Settings** (⚙), set your department (PD/SD/Mechanic), badge, callsign, and target exe (`GTA5.exe` by default).

4. **In-game**: Start GTA V or FiveM. Focus the game window; the app sends commands there. Use **Ctrl+Arrow keys** to navigate the menu.

5. **Pull updates**:
   ```bash
   git pull
   npm install
   ```

---

## Install & run

```bash
cd New-RP-Menu
npm install
npm start
```

If `npm install` fails (e.g. 404 or auth), try:

```bash
npm install --registry https://registry.npmjs.org/
```

## Build exe (optional)

```bash
npm run build
```

Output in `dist/`.

## Settings (gear icon)

- **Department**: PD or SD (affects radio labels and pursuit megaphone text)
- **Department full name**: e.g. LSPD / LSSD (used in pursuit: "LSPD, STOP THE VEHICLE...")
- **Badge number**
- **Callsign**: Division, Letter, Number; Adam change (partner unit A); David change (SWAT D)
- **Special units**: FLD, RED, TOM, DAVID, AIR + TOM number, DAVID number
- **Pronouns**: subject (he) and possessive (his) for /me and /do
- **Target exe**: Game process name, default `GTA5.exe`

## Menu structure

- Start/End Watch (Start Watch, Start Adam Watch, End Watch)
- Change Unit (Lincoln, Adam, David, Resume Lincoln, Custom, Special units)
- Traffic Stop / Arrest (Traffic Stop, Felony Stop, Arrest, Scene Management, Inmate Processing, Tow Vehicle)
- Departmental Radio (PD/SD to DOC, to MD, 10-15 to DOC, HVT, Injured 10-15)
- Pursuit Force
- Animations (Favorites, Dances, Stances, Sit, Emotions, Interaction)
- Utility (VOIP Reset, Clear GPS, Mini MDC)

All actions send the appropriate /me, /do, /r, /deplow, /m, /anim, /createunit, etc. to the game after focusing the game window.

**Note:** This app uses only PowerShell and Electron’s clipboard for sending keys (no robotjs or other native addons), so you don’t need Windows build tools or to rebuild for Electron.
