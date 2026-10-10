const { clipboard } = require('electron');
const { execFile, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const DEFAULT_TARGET = 'FiveM_GTAProcess.exe';
const KEYEVENTF_KEYUP = 0x0002;

// Virtual key codes (Windows)
const VK = {
  T: 0x54,
  V: 0x56,
  M: 0x4d,
  Return: 0x0d,
  Control: 0x11,
  Shift: 0x10,
  Menu: 0x12, // Alt
  F7: 0x76,
  F8: 0x77,
};

function getTempScriptPath(name) {
  const dir = os.tmpdir();
  return path.join(
    dir,
    `rpduty-${name}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.ps1`,
  );
}

/** Run a command without blocking the Electron main process. */
function execFileAsync(file, args, options) {
  return new Promise((resolve, reject) => {
    execFile(file, args, options, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

/**
 * Resolve the real game process name.
 * FiveM uses build-specific names like FiveM_b3889_GTAProcess.exe.
 * Returns process name without .exe
 */
async function resolveGameProcName(targetExe = DEFAULT_TARGET) {
  const wanted = String(targetExe || DEFAULT_TARGET)
    .replace(/\.exe$/i, '')
    .trim();
  if (process.platform !== 'win32') return wanted || 'FiveM_GTAProcess';

  const isRunning = async (imageName) => {
    try {
      // CSV so long FiveM_*_GTAProcess.exe names are not truncated
      const out = await execFileAsync(
        'tasklist',
        ['/FI', `IMAGENAME eq ${imageName}`, '/FO', 'CSV', '/NH'],
        {
          encoding: 'utf8',
          timeout: 2500,
          windowsHide: true,
        },
      );
      const lower = out.toLowerCase();
      const base = imageName.replace(/\.exe$/i, '').toLowerCase();
      return (
        lower.includes(imageName.toLowerCase()) ||
        lower.includes(`"${base}.exe"`) ||
        (lower.includes(base) && !lower.includes('info:'))
      );
    } catch (_) {
      return false;
    }
  };

  if (wanted && (await isRunning(`${wanted}.exe`))) return wanted;

  // Auto-detect FiveM GTA process (build number changes with updates)
  try {
    const out = await execFileAsync('tasklist', ['/FO', 'CSV', '/NH'], {
      encoding: 'utf8',
      timeout: 3000,
      windowsHide: true,
    });
    const match = out.match(/"(FiveM_[^"]*GTAProcess)\.exe"/i);
    if (match) return match[1];
  } catch (_) {}

  if (await isRunning('GTA5.exe')) return 'GTA5';
  return wanted || 'FiveM_GTAProcess';
}

/**
 * Write a PowerShell script to a temp file and run it with -File (no quoting issues).
 */
async function runPsFile(scriptContent, args = [], timeoutMs = 15000) {
  const scriptPath = getTempScriptPath('run');
  fs.writeFileSync(scriptPath, scriptContent, 'utf8');
  try {
    await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-WindowStyle',
        'Hidden',
        '-File',
        scriptPath,
        ...args,
      ],
      { timeout: timeoutMs, windowsHide: true },
    );
  } finally {
    try {
      fs.unlinkSync(scriptPath);
    } catch (_) {}
  }
}

/**
 * Focus the game window by process name (Windows).
 */
async function focusWindow(processName = DEFAULT_TARGET) {
  if (process.platform !== 'win32') return;
  const procName = await resolveGameProcName(processName);
  const script = `
param([string]$ProcName = "GTA5")
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
$proc = Get-Process -Name $ProcName -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } |
  Select-Object -First 1
if ($proc) {
  [Win32]::ShowWindow($proc.MainWindowHandle, 9)
  [Win32]::SetForegroundWindow($proc.MainWindowHandle)
  Start-Sleep -Milliseconds 300
}
`;
  await runPsFile(script, ['-ProcName', procName]);
}

const ABORT_ERR = Object.assign(new Error('Cancelled'), { name: 'AbortError' });

function sleep(ms, signal) {
  if (signal?.aborted) return Promise.reject(ABORT_ERR);
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(id);
      signal?.removeEventListener('abort', onAbort);
      reject(ABORT_ERR);
    };
    signal?.addEventListener('abort', onAbort);
  });
}

/**
 * Open in-game chat (t), paste from clipboard, optionally Enter.
 * Releases Ctrl/Shift/Alt first — Ctrl+Arrow activate often leaves Control held,
 * which breaks T / Ctrl+V / Enter in FiveM.
 */
async function sendToChat(text, pressEnter = true, targetExe = DEFAULT_TARGET) {
  clipboard.writeText(String(text ?? ''));
  await sleep(50);
  if (process.platform !== 'win32') return;
  const procName = await resolveGameProcName(targetExe);
  // Give physical Ctrl from Ctrl+Arrow time to release before we inject keys
  await sleep(180);
  // Keep this script simple: AttachThreadInput deadlocks Electron and Alt-tap
  // opens GTA UI and blocks chat.
  const script = `
param([string]$ProcName = "GTA5", [int]$PressEnter = 1)
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Keybd {
  [DllImport("user32.dll")]
  public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
$UP = [uint32]2
$proc = Get-Process -Name $ProcName -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } |
  Select-Object -First 1
if (-not $proc) { exit 1 }
$hwnd = $proc.MainWindowHandle
[Keybd]::ShowWindow($hwnd, 9)
[Keybd]::SetForegroundWindow($hwnd)
Start-Sleep -Milliseconds 350

# Force-release modifiers left held from overlay hotkeys (Ctrl+Arrow, etc.)
foreach ($vk in @(0x11, 0xA2, 0xA3, 0x10, 0xA0, 0xA1, 0x12, 0xA4, 0xA5)) {
  [Keybd]::keybd_event([byte]$vk, 0, $UP, [UIntPtr]::Zero)
}
Start-Sleep -Milliseconds 100

# T - open chat
[Keybd]::keybd_event(0x54, 0x14, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 50
[Keybd]::keybd_event(0x54, 0x14, $UP, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 280

# Ctrl+V - paste
[Keybd]::keybd_event(0x11, 0x1D, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 30
[Keybd]::keybd_event(0x56, 0x2F, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 40
[Keybd]::keybd_event(0x56, 0x2F, $UP, [UIntPtr]::Zero)
[Keybd]::keybd_event(0x11, 0x1D, $UP, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 120

if ($PressEnter -eq 1) {
  [Keybd]::keybd_event(0x0D, 0x1C, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 40
  [Keybd]::keybd_event(0x0D, 0x1C, $UP, [UIntPtr]::Zero)
}
`;
  try {
    await runPsFile(script, [
      '-ProcName',
      procName,
      '-PressEnter',
      pressEnter ? '1' : '0',
    ]);
  } catch (err) {
    throw new Error(
      `Game window not found (tried ${procName}). Is FiveM running and focused?`,
    );
  }
  await sleep(30);
}

async function runSequence(steps, targetExe = DEFAULT_TARGET, signal) {
  for (const step of steps) {
    if (signal?.aborted) throw ABORT_ERR;
    await sendToChat(step.text, step.enter !== false, targetExe);
    if (step.delayAfter) await sleep(step.delayAfter, signal);
  }
}

/** Map key name to VK code and optional modifier. Returns { vk } or { vk, modifier }. */
function getVkCode(key) {
  const k = key.toLowerCase().replace(/^key\./, '');
  if (k === 'f7') return { vk: 0x76 };
  if (k === 'f8') return { vk: 0x77 };
  if (k === 'enter') return { vk: 0x0d };
  if (k === 'm') return { vk: 0x4d };
  if (k.includes('+')) {
    const parts = k.split('+').map((s) => s.trim());
    const isCtrl = parts.some(
      (p) => p === 'control' || p === 'ctrl' || p === 'leftcontrol',
    );
    const keyPart = parts.find(
      (p) => !['control', 'ctrl', 'leftcontrol', 'shift', 'alt'].includes(p),
    );
    if (isCtrl && keyPart) {
      const vk = keyPart === 'm' ? 0x4d : keyPart === 'v' ? 0x56 : null;
      if (vk !== null) return { vk, modifier: 0x11 };
    }
  }
  return null;
}

/**
 * Send raw keys via keybd_event (e.g. F7, F8, Ctrl+M).
 * keys: array of 'f7', 'f8', 'delay', 'control+m', etc.
 */
async function sendKeys(keys, targetExe = DEFAULT_TARGET) {
  await focusWindow(targetExe);
  await sleep(200);
  if (process.platform !== 'win32') return;
  const procName = await resolveGameProcName(targetExe);
  const keyCodes = [];
  for (const k of keys) {
    if (k === 'delay') keyCodes.push('delay');
    else {
      const info = getVkCode(k);
      if (info)
        keyCodes.push(info.modifier != null ? `ctrl+${info.vk}` : `${info.vk}`);
    }
  }
  const keyArg = keyCodes.join(',');
  const script = `
param([string]$ProcName = "GTA5", [string]$Keys = "")
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Keybd {
  [DllImport("user32.dll")]
  public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
$UP = [uint32]2
$proc = Get-Process -Name $ProcName -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $proc -or $proc.MainWindowHandle -eq [IntPtr]::Zero) { exit 1 }
[Keybd]::ShowWindow($proc.MainWindowHandle, 9)
[Keybd]::SetForegroundWindow($proc.MainWindowHandle)
Start-Sleep -Milliseconds 300
foreach ($vk in @(0x11, 0xA2, 0xA3, 0x10, 0xA0, 0xA1, 0x12, 0xA4, 0xA5)) {
  [Keybd]::keybd_event([byte]$vk, 0, $UP, [UIntPtr]::Zero)
}
Start-Sleep -Milliseconds 80

foreach ($token in $Keys -split ',') {
  if ($token -eq 'delay') { Start-Sleep -Milliseconds 150; continue }
  if ($token -match '^ctrl\+(\d+)$') {
    $vk = [byte][int]$Matches[1]
    [Keybd]::keybd_event(0x11, 0, 0, [UIntPtr]::Zero)
    [Keybd]::keybd_event($vk, 0, 0, [UIntPtr]::Zero)
    [Keybd]::keybd_event($vk, 0, 2, [UIntPtr]::Zero)
    [Keybd]::keybd_event(0x11, 0, 2, [UIntPtr]::Zero)
  } else {
    $vk = [byte][int]$token
    [Keybd]::keybd_event($vk, 0, 0, [UIntPtr]::Zero)
    [Keybd]::keybd_event($vk, 0, 2, [UIntPtr]::Zero)
  }
  Start-Sleep -Milliseconds 50
}
`;
  await runPsFile(script, ['-ProcName', procName, '-Keys', keyArg]);
  await sleep(50);
}

/** Virtual keys for editable navigation macros (uniform/equipment, etc.). */
const MACRO_VK = {
  enter: 0x0d,
  return: 0x0d,
  down: 0x28,
  up: 0x26,
  left: 0x25,
  right: 0x27,
  backspace: 0x08,
  bksp: 0x08,
  escape: 0x1b,
  esc: 0x1b,
  tab: 0x09,
  space: 0x20,
};

/**
 * Expand macro steps into a flat list of key names.
 * steps: [{ key: 'enter'|'down'|..., count?: number }, ...]
 */
function expandMacroSteps(steps) {
  const out = [];
  for (const step of steps || []) {
    if (!step || step.key == null) continue;
    const key = String(step.key).toLowerCase().trim();
    if (MACRO_VK[key] == null) continue;
    // Normalize aliases to canonical names used by the PowerShell sender
    const canonical =
      key === 'return'
        ? 'enter'
        : key === 'bksp'
          ? 'backspace'
          : key === 'esc'
            ? 'escape'
            : key;
    const count = Math.max(1, Math.min(200, parseInt(step.count, 10) || 1));
    for (let i = 0; i < count; i++) out.push(canonical);
  }
  return out;
}

function countMacroKeys(steps) {
  return expandMacroSteps(steps).length;
}

/**
 * Send a key macro with a fixed delay between each keypress.
 * Runs PowerShell asynchronously so the Electron main process does not hang.
 * @param {Array<{key: string, count?: number}>} steps
 * @param {number} delayMs - default delay after each key
 * @param {object} [timing] - optional { arrowDelayMs, enterSettleMs, backspaceSettleMs }
 */
async function sendKeyMacro(
  steps,
  delayMs = 200,
  targetExe = DEFAULT_TARGET,
  signal,
  timing = {},
) {
  if (signal?.aborted) throw ABORT_ERR;
  const skipFocus = timing.skipFocus === true;
  if (!skipFocus) {
    await focusWindow(targetExe);
    await sleep(200, signal);
  }
  if (process.platform !== 'win32') return;

  const expanded = expandMacroSteps(steps);
  if (!expanded.length) return;

  const delay = Math.max(0, Math.min(5000, Number(delayMs) || 0));
  const arrowDelay = Math.max(
    0,
    Math.min(5000, Number(timing.arrowDelayMs != null ? timing.arrowDelayMs : 10) || 0),
  );
  const enterSettle = Math.max(
    0,
    Math.min(
      5000,
      Number(timing.enterSettleMs != null ? timing.enterSettleMs : 400) || 0,
    ),
  );
  const backspaceSettle = Math.max(
    0,
    Math.min(
      5000,
      Number(
        timing.backspaceSettleMs != null ? timing.backspaceSettleMs : 400,
      ) || 0,
    ),
  );
  const initialPause = Math.max(
    0,
    Math.min(
      5000,
      Number(timing.initialPauseMs != null ? timing.initialPauseMs : 300) || 0,
    ),
  );
  const openingArrowCount = Math.max(
    0,
    Math.min(
      50,
      parseInt(
        timing.openingArrowCount != null ? timing.openingArrowCount : 0,
        10,
      ) || 0,
    ),
  );
  const openingArrowDelay = Math.max(
    0,
    Math.min(
      5000,
      Number(
        timing.openingArrowDelayMs != null
          ? timing.openingArrowDelayMs
          : arrowDelay,
      ) || 0,
    ),
  );
  const procName = await resolveGameProcName(targetExe);
  const keyArg = expanded.join(',');
  const maxStepWait = Math.max(
    delay,
    arrowDelay,
    openingArrowDelay,
    enterSettle,
    backspaceSettle,
  );
  const timeoutMs = Math.min(
    180000,
    expanded.length * (maxStepWait + 100) + initialPause + 15000,
  );

  const script = `
param(
  [string]$ProcName = "GTA5",
  [string]$Keys = "",
  [int]$DelayMs = 200,
  [int]$ArrowDelayMs = 10,
  [int]$EnterSettleMs = 400,
  [int]$BackspaceSettleMs = 400,
  [int]$InitialPauseMs = 300,
  [int]$OpeningArrowCount = 0,
  [int]$OpeningArrowDelayMs = 150,
  [int]$SkipFocus = 0
)
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MacroKeybd {
  [DllImport("user32.dll")]
  public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
$EXT = [uint32]1
$UP = [uint32]2
$proc = Get-Process -Name $ProcName -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $proc -or $proc.MainWindowHandle -eq [IntPtr]::Zero) { exit 1 }
if ($SkipFocus -eq 0) {
  [MacroKeybd]::ShowWindow($proc.MainWindowHandle, 9)
  [MacroKeybd]::SetForegroundWindow($proc.MainWindowHandle)
}
Start-Sleep -Milliseconds $InitialPauseMs
foreach ($vk in @(0x11, 0xA2, 0xA3, 0x10, 0xA0, 0xA1, 0x12, 0xA4, 0xA5)) {
  [MacroKeybd]::keybd_event([byte]$vk, 0, $UP, [UIntPtr]::Zero)
}
Start-Sleep -Milliseconds 80

$keyMap = @{
  enter     = @{ vk = 0x0D; scan = 0x1C; ext = $false }
  down      = @{ vk = 0x28; scan = 0x50; ext = $true }
  up        = @{ vk = 0x26; scan = 0x48; ext = $true }
  left      = @{ vk = 0x25; scan = 0x4B; ext = $true }
  right     = @{ vk = 0x27; scan = 0x4D; ext = $true }
  backspace = @{ vk = 0x08; scan = 0x0E; ext = $false }
  escape    = @{ vk = 0x1B; scan = 0x01; ext = $false }
  tab       = @{ vk = 0x09; scan = 0x0F; ext = $false }
  space     = @{ vk = 0x20; scan = 0x39; ext = $false }
}

$arrowCount = 0
foreach ($token in $Keys -split ',') {
  if (-not $token) { continue }
  $name = $token.Trim().ToLower()
  $info = $keyMap[$name]
  if (-not $info) { continue }
  $vk = [byte]$info.vk
  $scan = [byte]$info.scan
  $downFlags = [uint32]0
  if ($info.ext) { $downFlags = $EXT }
  $upFlags = $downFlags -bor $UP
  [MacroKeybd]::keybd_event($vk, $scan, $downFlags, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 40
  [MacroKeybd]::keybd_event($vk, $scan, $upFlags, [UIntPtr]::Zero)
  $wait = $DelayMs
  if ($name -eq 'enter') { $wait = $EnterSettleMs }
  elseif ($name -eq 'backspace') { $wait = $BackspaceSettleMs }
  elseif ($name -match '^(down|up|left|right)$') {
    $arrowCount++
    if ($OpeningArrowCount -gt 0 -and $arrowCount -le $OpeningArrowCount) {
      $wait = $OpeningArrowDelayMs
    } else {
      $wait = $ArrowDelayMs
    }
  }
  if ($wait -gt 0) { Start-Sleep -Milliseconds $wait }
}
`;

  const scriptPath = getTempScriptPath('macro');
  fs.writeFileSync(scriptPath, script, 'utf8');

  try {
    if (signal?.aborted) throw ABORT_ERR;
    await new Promise((resolve, reject) => {
      const child = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-WindowStyle',
          'Hidden',
          '-File',
          scriptPath,
          '-ProcName',
          procName,
          '-Keys',
          keyArg,
          '-DelayMs',
          String(delay),
          '-ArrowDelayMs',
          String(arrowDelay),
          '-EnterSettleMs',
          String(enterSettle),
          '-BackspaceSettleMs',
          String(backspaceSettle),
          '-InitialPauseMs',
          String(initialPause),
          '-OpeningArrowCount',
          String(openingArrowCount),
          '-OpeningArrowDelayMs',
          String(openingArrowDelay),
          '-SkipFocus',
          skipFocus ? '1' : '0',
        ],
        { stdio: 'pipe', windowsHide: true },
      );

      let settled = false;
      const finish = (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onAbort);
        if (err) reject(err);
        else resolve();
      };

      const timer = setTimeout(() => {
        try {
          child.kill();
        } catch (_) {}
        finish(new Error('Macro timed out'));
      }, timeoutMs);

      const onAbort = () => {
        try {
          child.kill();
        } catch (_) {}
        finish(ABORT_ERR);
      };
      if (signal) {
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener('abort', onAbort);
      }

      child.on('error', (err) => finish(err));
      child.on('close', (code) => {
        if (code === 0 || code === null) finish();
        else finish(new Error('Macro failed (exit ' + code + ')'));
      });
    });
  } finally {
    try {
      fs.unlinkSync(scriptPath);
    } catch (_) {}
  }
  await sleep(50, signal);
}

module.exports = {
  focusWindow,
  sendToChat,
  runSequence,
  sendKeys,
  sendKeyMacro,
  expandMacroSteps,
  countMacroKeys,
  resolveGameProcName,
  MACRO_VK,
  sleep,
  DEFAULT_TARGET,
};
