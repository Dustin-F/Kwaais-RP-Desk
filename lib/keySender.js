const { clipboard } = require('electron');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const DEFAULT_TARGET = 'GTA5.exe';
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
  return path.join(dir, `rpduty-${name}-${process.pid}.ps1`);
}

/**
 * Write a PowerShell script to a temp file and run it with -File (no quoting issues).
 */
function runPsFile(scriptContent, args = []) {
  const scriptPath = getTempScriptPath('run');
  fs.writeFileSync(scriptPath, scriptContent, 'utf8');
  try {
    execFileSync(
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
      { stdio: 'pipe', timeout: 10000 },
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
  const procName = processName.replace(/\.exe$/i, '');
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
$proc = Get-Process -Name $ProcName -ErrorAction SilentlyContinue | Select-Object -First 1
if ($proc -and $proc.MainWindowHandle -ne [IntPtr]::Zero) {
  [Win32]::ShowWindow($proc.MainWindowHandle, 9)
  [Win32]::SetForegroundWindow($proc.MainWindowHandle)
  Start-Sleep -Milliseconds 300
}
`;
  runPsFile(script, ['-ProcName', procName]);
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
 * Uses keybd_event so games actually receive the keys.
 */
async function sendToChat(text, pressEnter = true, targetExe = DEFAULT_TARGET) {
  clipboard.writeText(text);
  await sleep(25);
  if (process.platform !== 'win32') return;
  const procName = targetExe.replace(/\.exe$/i, '');
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
$proc = Get-Process -Name $ProcName -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $proc -or $proc.MainWindowHandle -eq [IntPtr]::Zero) { exit 1 }
[Keybd]::ShowWindow($proc.MainWindowHandle, 9)
[Keybd]::SetForegroundWindow($proc.MainWindowHandle)
Start-Sleep -Milliseconds 220

# T - open chat
[Keybd]::keybd_event(0x54, 0, 0, [UIntPtr]::Zero)
[Keybd]::keybd_event(0x54, 0, 2, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 60

# Ctrl+V - paste
[Keybd]::keybd_event(0x11, 0, 0, [UIntPtr]::Zero)
[Keybd]::keybd_event(0x56, 0, 0, [UIntPtr]::Zero)
[Keybd]::keybd_event(0x56, 0, 2, [UIntPtr]::Zero)
[Keybd]::keybd_event(0x11, 0, 2, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 35

if ($PressEnter -eq 1) {
  [Keybd]::keybd_event(0x0D, 0, 0, [UIntPtr]::Zero)
  [Keybd]::keybd_event(0x0D, 0, 2, [UIntPtr]::Zero)
}
`;
  runPsFile(script, [
    '-ProcName',
    procName,
    '-PressEnter',
    pressEnter ? '1' : '0',
  ]);
  await sleep(10);
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
  const procName = targetExe.replace(/\.exe$/i, '');
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
$proc = Get-Process -Name $ProcName -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $proc -or $proc.MainWindowHandle -eq [IntPtr]::Zero) { exit 1 }
[Keybd]::ShowWindow($proc.MainWindowHandle, 9)
[Keybd]::SetForegroundWindow($proc.MainWindowHandle)
Start-Sleep -Milliseconds 300

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
  runPsFile(script, ['-ProcName', procName, '-Keys', keyArg]);
  await sleep(50);
}

module.exports = {
  focusWindow,
  sendToChat,
  runSequence,
  sendKeys,
  sleep,
};
