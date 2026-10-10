const keySender = require('./keySender');

/**
 * Flatten named macro sequences into a single step list.
 * Prefers sequences when present / when sequenceVersion is newer than saved.
 */
function resolveMacroSteps(macro, defaults) {
  const d = defaults || {};
  const m = macro || d;
  const savedVer = m.sequenceVersion != null ? m.sequenceVersion : 0;
  const defaultVer = d.sequenceVersion != null ? d.sequenceVersion : 0;
  const useDefaults =
    defaultVer > savedVer ||
    (!Array.isArray(m.sequences) &&
      !Array.isArray(m.steps) &&
      (d.sequences || d.steps));

  const source = useDefaults ? d : m;
  if (Array.isArray(source.sequences) && source.sequences.length) {
    return source.sequences.flatMap((seq) =>
      Array.isArray(seq.steps) ? seq.steps : [],
    );
  }
  if (Array.isArray(source.steps) && source.steps.length) return source.steps;
  if (Array.isArray(d.sequences) && d.sequences.length) {
    return d.sequences.flatMap((seq) =>
      Array.isArray(seq.steps) ? seq.steps : [],
    );
  }
  return Array.isArray(d.steps) ? d.steps : [];
}

/**
 * Build derived callsigns from settings.
 * Uses a single callsign string; Lincoln/Adam/David all use it.
 */
function getCallsigns(settings) {
  const s = settings.specialUnits || {};
  const c = settings.callsign;
  let cs = '';
  if (typeof c === 'string') {
    cs = c.trim();
  } else if (c && typeof c === 'object') {
    const div = c.division || '';
    const letter = (c.letter || '').toString();
    const num = c.number || '';
    cs = [div, letter, num].filter(Boolean).join('-');
  }
  const LincolnCallsign = cs || '228B';
  return {
    LincolnCallsign,
    AdamCallsign: LincolnCallsign,
    DavidCallsign: LincolnCallsign,
    SpecialCallsignTOM: `TOM-${s.TOMNumber || '21'}`,
    SpecialCallsignDAVID: `${s.DAVIDNumber || '12'}-DAVID`,
  };
}

/** Mechanic repair diagnosis: /do text describing what the vehicle needs. Repairs only. */
const MECH_REPAIR_DIAGNOSIS = {
  MechChangeTire: '/do the vehicle has a flat tire',
  MechRepairGasket: '/do the vehicle seems to have a blown gasket',
  MechOilChange: '/do the vehicle seems to be due for an oil change',
  MechHeadlights: '/do the vehicle has a broken headlight assembly',
  MechBrakes: '/do the vehicle has worn brake pads that need replacing',
  MechRadiator: '/do the vehicle has a leak in the radiator',
  MechBattery: '/do the vehicle has a dead or failing battery',
  MechWindshield: '/do the vehicle has a chip in the windshield',
  MechNewTires: '/do the vehicle has worn tires that need replacing',
  MechEngineDamage:
    '/do the vehicle has serious engine damage from overheating or neglect',
  MechTransmission:
    '/do the vehicle has transmission fluid issues and slipping gears',
  MechAlternator:
    '/do the vehicle has a dead alternator and is not charging the battery',
  MechStarter: '/do the vehicle has a faulty starter motor and will not crank',
  MechFuelPump:
    '/do the vehicle has a failing fuel pump and is not getting fuel',
  MechSparkPlugs: '/do the vehicle has fouled spark plugs and is misfiring',
  MechTimingBelt: '/do the vehicle has a worn or jumped timing belt',
  MechWaterPump: '/do the vehicle has a leaking water pump',
  MechClutch: '/do the vehicle has a worn clutch and is slipping',
  MechSuspension:
    '/do the vehicle has worn shock absorbers and is bouncing badly',
  MechPowerSteering: '/do the vehicle has a power steering fluid leak',
  MechSerpentineBelt: '/do the vehicle has a cracked or loose serpentine belt',
  MechAirFilter: '/do the vehicle has a dirty air filter restricting airflow',
  MechElectrical:
    '/do the vehicle has electrical issues, possibly a blown fuse or bad wiring',
};

/** Mechanic multi-step RP sequences (5s between each /me) */
function getMechanicSteps(actionId, delay) {
  const d = delay || 5000;
  const introSteps = [
    {
      text: '/me walks around the vehicle and tinkers around checking for the issue',
      delayAfter: d,
    },
  ];
  const diagnosis = MECH_REPAIR_DIAGNOSIS[actionId];
  const repairSteps = {
    MechChangeTire: [
      {
        text: '/me jacks up the vehicle using the hydraulic jack',
        delayAfter: d,
      },
      {
        text: '/me unscrews the lug nuts and removes the flat tire',
        delayAfter: d,
      },
      {
        text: '/me grabs a new tire from the rack and aligns it onto the hub',
        delayAfter: d,
      },
      {
        text: '/me tightens the lug nuts in a star pattern and lowers the jack',
        delayAfter: 0,
      },
    ],
    MechRepairGasket: [
      {
        text: '/me opens the hood and locates the blown gasket',
        delayAfter: d,
      },
      {
        text: '/me scrapes off the old gasket material and cleans the mating surfaces',
        delayAfter: d,
      },
      {
        text: '/me applies sealant and presses the new gasket into place',
        delayAfter: d,
      },
      {
        text: '/me reassembles the components and torques the bolts to spec',
        delayAfter: 0,
      },
    ],
    MechOilChange: [
      {
        text: '/me positions the drain pan and unscrews the oil drain plug',
        delayAfter: d,
      },
      {
        text: '/me removes the old oil filter and wipes the housing clean',
        delayAfter: d,
      },
      {
        text: '/me screws on the new filter and threads the drain plug back in',
        delayAfter: d,
      },
      {
        text: '/me pours fresh oil into the engine and checks the dipstick',
        delayAfter: 0,
      },
    ],
    MechHeadlights: [
      {
        text: '/me disconnects the wiring harness from the broken headlight assembly',
        delayAfter: d,
      },
      { text: '/me unbolts and removes the damaged housing', delayAfter: d },
      {
        text: '/me slots in the new headlight and reconnects the wiring',
        delayAfter: d,
      },
      {
        text: '/me secures the housing and adjusts the beam alignment',
        delayAfter: 0,
      },
    ],
    MechBrakes: [
      {
        text: '/me removes the wheel and pulls off the old brake pads',
        delayAfter: d,
      },
      {
        text: '/me compresses the caliper piston and slides in the new pads',
        delayAfter: d,
      },
      {
        text: '/me bleeds the brake lines to remove air from the system',
        delayAfter: d,
      },
      {
        text: '/me reattaches the wheel and tests the brake pedal feel',
        delayAfter: 0,
      },
    ],
    MechRadiator: [
      {
        text: '/me drains the coolant and locates the leak in the radiator',
        delayAfter: d,
      },
      {
        text: '/me applies epoxy sealant to the crack and lets it cure',
        delayAfter: d,
      },
      {
        text: '/me refills the radiator with fresh coolant and checks the hoses',
        delayAfter: d,
      },
      {
        text: '/me starts the engine and verifies no more leaks',
        delayAfter: 0,
      },
    ],
    MechBattery: [
      {
        text: '/me loosens the terminal clamps and removes the battery',
        delayAfter: d,
      },
      {
        text: '/me cleans the terminals with a wire brush and baking soda',
        delayAfter: d,
      },
      {
        text: '/me reconnects the cables and tightens the clamps firmly',
        delayAfter: 0,
      },
    ],
    MechWindshield: [
      {
        text: '/me cleans the chip and injects resin into the crack',
        delayAfter: d,
      },
      {
        text: '/me places the curing film over the repair and uses the UV lamp',
        delayAfter: d,
      },
      {
        text: '/me scrapes off the excess resin and polishes the surface',
        delayAfter: 0,
      },
    ],
    MechNewTires: [
      {
        text: '/me jacks up the vehicle and removes all four wheels',
        delayAfter: d,
      },
      {
        text: '/me mounts the new tires onto the rims and balances each one',
        delayAfter: d,
      },
      {
        text: '/me reattaches the wheels and torques the lug nuts to spec',
        delayAfter: d,
      },
      {
        text: '/me lowers the jack and does a final check on the pressure',
        delayAfter: 0,
      },
    ],
    MechEngineDamage: [
      {
        text: '/me opens the hood and checks the oil and coolant levels',
        delayAfter: d,
      },
      {
        text: '/me uses a compression tester and scans for codes with the OBD reader',
        delayAfter: d,
      },
      {
        text: '/me orders replacement gaskets and seals, then begins disassembling the top end',
        delayAfter: d,
      },
      {
        text: '/me cleans the mating surfaces, installs the new head gasket, and torque sequences the bolts',
        delayAfter: d,
      },
      {
        text: '/me reassembles the components and refills fluids before running a test',
        delayAfter: 0,
      },
    ],
    MechTransmission: [
      {
        text: '/me lifts the vehicle and locates the transmission drain plug',
        delayAfter: d,
      },
      {
        text: '/me drains the old fluid and drops the transmission pan to replace the filter',
        delayAfter: d,
      },
      {
        text: '/me refills with fresh transmission fluid and checks the level with the dipstick',
        delayAfter: d,
      },
      {
        text: '/me takes the vehicle for a short test drive to verify smooth shifting',
        delayAfter: 0,
      },
    ],
    MechAlternator: [
      {
        text: '/me disconnects the battery and loosens the serpentine belt',
        delayAfter: d,
      },
      {
        text: '/me unbolts the old alternator and pulls it from the bracket',
        delayAfter: d,
      },
      {
        text: '/me mounts the new alternator and reinstalls the belt with proper tension',
        delayAfter: d,
      },
      {
        text: '/me reconnects the battery and checks the charging voltage with a multimeter',
        delayAfter: 0,
      },
    ],
    MechStarter: [
      {
        text: '/me disconnects the battery and locates the starter under the vehicle',
        delayAfter: d,
      },
      {
        text: '/me unbolts the starter and disconnects the wiring harness',
        delayAfter: d,
      },
      {
        text: '/me installs the new starter and reconnects the cables',
        delayAfter: d,
      },
      {
        text: '/me reconnects the battery and turns the key to verify it cranks properly',
        delayAfter: 0,
      },
    ],
    MechFuelPump: [
      {
        text: '/me relieves the fuel pressure and disconnects the fuel lines at the tank',
        delayAfter: d,
      },
      {
        text: '/me drops the fuel tank and removes the old pump from the sending unit',
        delayAfter: d,
      },
      {
        text: '/me installs the new fuel pump and seals it into the tank',
        delayAfter: d,
      },
      {
        text: '/me reconnects the lines and turns the key to prime the system',
        delayAfter: 0,
      },
    ],
    MechSparkPlugs: [
      {
        text: '/me removes the ignition coils and pulls the old spark plugs with a socket',
        delayAfter: d,
      },
      {
        text: '/me gaps the new plugs and threads them in by hand before torquing',
        delayAfter: d,
      },
      {
        text: '/me reinstalls the coils and connects the wiring',
        delayAfter: d,
      },
      {
        text: '/me starts the engine and listens for a smooth idle',
        delayAfter: 0,
      },
    ],
    MechTimingBelt: [
      {
        text: '/me removes the timing cover and aligns the crank and cam to top dead center',
        delayAfter: d,
      },
      {
        text: '/me slides off the old belt and installs the new timing belt on the sprockets',
        delayAfter: d,
      },
      {
        text: '/me tensions the belt and reinstalls the water pump and idler',
        delayAfter: d,
      },
      {
        text: '/me replaces the cover and turns the engine over by hand to verify timing',
        delayAfter: 0,
      },
    ],
    MechWaterPump: [
      {
        text: '/me drains the coolant and removes the serpentine belt',
        delayAfter: d,
      },
      {
        text: '/me unbolts the old water pump and cleans the mounting surface',
        delayAfter: d,
      },
      {
        text: '/me applies gasket maker and installs the new water pump',
        delayAfter: d,
      },
      {
        text: '/me refills the coolant and runs the engine to check for leaks',
        delayAfter: 0,
      },
    ],
    MechClutch: [
      {
        text: '/me lifts the vehicle and removes the driveshaft and transmission',
        delayAfter: d,
      },
      {
        text: '/me unbolts the pressure plate and removes the old clutch and flywheel',
        delayAfter: d,
      },
      {
        text: '/me resurfaces the flywheel and installs the new clutch kit',
        delayAfter: d,
      },
      {
        text: '/me reinstalls the transmission and test drives to feel the bite point',
        delayAfter: 0,
      },
    ],
    MechSuspension: [
      {
        text: '/me jacks up the vehicle and supports the control arms',
        delayAfter: d,
      },
      {
        text: '/me unbolts the old struts and compresses them to remove',
        delayAfter: d,
      },
      {
        text: '/me installs the new struts and torque specifications the mount bolts',
        delayAfter: d,
      },
      {
        text: '/me lowers the vehicle and bounces each corner to test the dampening',
        delayAfter: 0,
      },
    ],
    MechPowerSteering: [
      {
        text: '/me locates the power steering reservoir and traces the leak',
        delayAfter: d,
      },
      {
        text: '/me replaces the leaking hose or pump and flushes the old fluid',
        delayAfter: d,
      },
      {
        text: '/me refills with fresh power steering fluid and bleeds the system',
        delayAfter: d,
      },
      {
        text: '/me turns the wheel lock to lock to verify smooth operation',
        delayAfter: 0,
      },
    ],
    MechSerpentineBelt: [
      {
        text: '/me releases the belt tensioner and slides the old belt off the pulleys',
        delayAfter: d,
      },
      {
        text: '/me routes the new belt around all the accessories per the diagram',
        delayAfter: d,
      },
      {
        text: '/me tensions the belt and checks the alignment of all pulleys',
        delayAfter: d,
      },
      {
        text: '/me starts the engine and listens for any squealing or slippage',
        delayAfter: 0,
      },
    ],
    MechAirFilter: [
      {
        text: '/me opens the airbox and removes the old filter',
        delayAfter: d,
      },
      {
        text: '/me wipes out the housing and slots in the new filter',
        delayAfter: d,
      },
      { text: '/me closes the airbox and clips the lid shut', delayAfter: 0 },
    ],
    MechElectrical: [
      {
        text: '/me opens the fuse box and checks for blown fuses with a test light',
        delayAfter: d,
      },
      {
        text: '/me traces the wiring harness for shorts and inspects the grounds',
        delayAfter: d,
      },
      {
        text: '/me replaces the blown fuse or repairs the broken wire with heat shrink',
        delayAfter: d,
      },
      {
        text: '/me tests the circuit to confirm the issue is resolved',
        delayAfter: 0,
      },
    ],
  };
  const modSteps = {
    MechSprayCar: [
      {
        text: '/me sands down the old paint and masks off the trim',
        delayAfter: d,
      },
      { text: '/me applies primer and lets it flash off', delayAfter: d },
      { text: '/me sprays the base coat in even passes', delayAfter: d },
      {
        text: '/me adds the clear coat and buffs the finish to a shine',
        delayAfter: 0,
      },
    ],
    MechChangeLights: [
      {
        text: '/me removes the old light housings and disconnects the wiring',
        delayAfter: d,
      },
      {
        text: '/me routes the new LED harness through the engine bay',
        delayAfter: d,
      },
      {
        text: '/me installs the new light units and plugs in the connectors',
        delayAfter: d,
      },
      {
        text: '/me secures the lights and checks they function properly',
        delayAfter: 0,
      },
    ],
    MechBodyKit: [
      {
        text: '/me lines up the front lip and marks the drill points',
        delayAfter: d,
      },
      {
        text: '/me bolts the bumper extension and side skirts into place',
        delayAfter: d,
      },
      {
        text: '/me attaches the rear diffuser and checks the fitment',
        delayAfter: d,
      },
      {
        text: '/me tightens all fasteners and gaps the panels evenly',
        delayAfter: 0,
      },
    ],
    MechSpoiler: [
      {
        text: '/me measures and marks where the spoiler mounts on the trunk',
        delayAfter: d,
      },
      {
        text: '/me drills the holes and applies sealant to prevent rust',
        delayAfter: d,
      },
      {
        text: '/me bolts the spoiler down and torque wrenches the nuts',
        delayAfter: 0,
      },
    ],
    MechUnderglow: [
      {
        text: '/me runs the power cable from the battery to the interior',
        delayAfter: d,
      },
      {
        text: '/me clips the LED strips under the rocker panels and along the sides',
        delayAfter: d,
      },
      {
        text: '/me connects the controller and tests each color mode',
        delayAfter: 0,
      },
    ],
    MechExhaust: [
      {
        text: '/me unbolts the old exhaust from the headers and mid-pipe',
        delayAfter: d,
      },
      {
        text: '/me hangs the new system and aligns the hangers',
        delayAfter: d,
      },
      {
        text: '/me tightens the flanges and checks for exhaust leaks',
        delayAfter: 0,
      },
    ],
    MechTint: [
      {
        text: '/me cleans the window and applies the soap solution',
        delayAfter: d,
      },
      {
        text: '/me lays the tint film on the glass and squeegees out the bubbles',
        delayAfter: d,
      },
      {
        text: '/me trims the edges and heats the film to shrink and seal',
        delayAfter: 0,
      },
    ],
  };
  if (repairSteps[actionId]) {
    const diagnosis = MECH_REPAIR_DIAGNOSIS[actionId];
    const diagnosisStep = diagnosis ? [{ text: diagnosis, delayAfter: d }] : [];
    return [...introSteps, ...diagnosisStep, ...repairSteps[actionId]];
  }
  return modSteps[actionId] || [];
}

/**
 * Step-by-step mode: wrap the key sender so every chat line waits on
 * stepGate({ index, text }) before sending. The gate resolves to
 * { action: 'next' | 'skip', text } — 'next' sends the (possibly edited)
 * text for this send only; 'skip' sends nothing. Delays between chat lines
 * are dropped because the user sets the pace; explicit sleeps and key
 * macros (menu timing) are left untouched.
 */
function withStepGate(ks, stepGate, signal) {
  let index = 0;
  const sendToChat = async (text, enter = true, targetExe) => {
    if (signal?.aborted) throw Object.assign(new Error('Cancelled'), { name: 'AbortError' });
    const result = await stepGate({ index: index++, text: String(text ?? '') });
    const out = String(result?.text ?? '').trim();
    if (result?.action !== 'next' || !out) return;
    await ks.sendToChat(out, enter, targetExe);
  };
  return {
    ...ks,
    sendToChat,
    runSequence: async (steps, targetExe) => {
      for (const step of steps) {
        await sendToChat(step.text, step.enter !== false, targetExe);
      }
    },
  };
}

/**
 * Run an action by id with optional params. Uses settings for badge, callsigns, department, pronouns.
 * @param {AbortSignal} [signal] - Optional abort signal; when triggered, multi-step RPs stop (e.g. Escape key).
 * @param {Object} [opts] - Optional: { preview, previewSteps } - when preview, collects steps instead of executing.
 */
async function runAction(actionId, params = {}, settings, signal, opts = {}) {
  const targetExe = settings.targetExe || 'FiveM_GTAProcess.exe';
  const badge = settings.badgeNumber;
  const sex1 = settings.pronouns?.subject || 'he';
  const sex2 = settings.pronouns?.possessive || 'his';
  const dept = settings.department || 'PD';
  const deptName =
    settings.departmentFullName || (dept === 'SD' ? 'LSSD' : 'LSPD');
  const calls = getCallsigns(settings);

  const previewSteps = opts.preview ? (opts.previewSteps || []) : null;
  const ks =
    opts.preview
      ? {
          runSequence: async (steps) => previewSteps.push(...steps),
          sendToChat: async (text, enter = true) =>
            previewSteps.push({ text, enter: enter !== false, delayAfter: 0 }),
          sleep: async () => {},
          focusWindow: async () => {},
          sendKeys: async () => {},
          sendKeyMacro: async (steps, delayMs) => {
            const n = keySender.countMacroKeys(steps);
            const delay = Math.max(0, Number(delayMs) || 0);
            previewSteps.push({
              text: `[key macro: ${n} key(s), ${delay}ms delay]`,
              enter: false,
              delayAfter: n * delay,
            });
          },
        }
      : opts.stepGate
        ? withStepGate(keySender, opts.stepGate, signal)
        : keySender;
  const run = (steps) => ks.runSequence(steps, targetExe, signal);
  const paste = (text, enter = true) => ks.sendToChat(text, enter, targetExe);

  if (
    actionId === 'Uniform' ||
    actionId === 'Weapons' ||
    actionId === 'UniformAndWeapons' ||
    actionId === 'UniformWeaponsStartWatch'
  ) {
    const allDefaults = require('./defaultSettings').clockInMacros;
    const runNamedMacro = async (macroKey) => {
      const defaults = allDefaults[macroKey];
      const macro = settings.clockInMacros?.[macroKey] || defaults;
      const useDefaultsTiming =
        (defaults.sequenceVersion || 0) > (macro.sequenceVersion || 0);
      const timingSrc = useDefaultsTiming ? defaults : macro;
      const steps = resolveMacroSteps(macro, defaults);
      const delayMs =
        timingSrc.delayMs != null ? timingSrc.delayMs : defaults.delayMs;
      const openCmd =
        timingSrc.openMenuCommand != null
          ? timingSrc.openMenuCommand
          : defaults.openMenuCommand;
      const openPause = Math.max(
        0,
        timingSrc.openMenuPauseMs != null
          ? timingSrc.openMenuPauseMs
          : defaults.openMenuPauseMs ?? 1200,
      );
      // T → /fl → Enter, then wait for the equipment menu before key navigation
      if (openCmd) {
        await paste(String(openCmd));
        await ks.sleep(openPause, signal);
      }
      await ks.sendKeyMacro(steps, delayMs, targetExe, signal, {
        arrowDelayMs:
          timingSrc.arrowDelayMs != null
            ? timingSrc.arrowDelayMs
            : defaults.arrowDelayMs,
        enterSettleMs:
          timingSrc.enterSettleMs != null
            ? timingSrc.enterSettleMs
            : defaults.enterSettleMs,
        backspaceSettleMs:
          timingSrc.backspaceSettleMs != null
            ? timingSrc.backspaceSettleMs
            : defaults.backspaceSettleMs,
        initialPauseMs:
          timingSrc.initialPauseMs != null
            ? timingSrc.initialPauseMs
            : defaults.initialPauseMs,
        openingArrowCount:
          timingSrc.openingArrowCount != null
            ? timingSrc.openingArrowCount
            : defaults.openingArrowCount,
        openingArrowDelayMs:
          timingSrc.openingArrowDelayMs != null
            ? timingSrc.openingArrowDelayMs
            : defaults.openingArrowDelayMs,
      });
    };

    const runUniformAndWeaponsCombo = async () => {
      const comboDefaults = allDefaults.uniformAndWeapons || {};
      const combo =
        settings.clockInMacros?.uniformAndWeapons || comboDefaults;
      const afterUniform =
        combo.afterUniformPauseMs != null
          ? combo.afterUniformPauseMs
          : comboDefaults.afterUniformPauseMs ?? 1000;
      const bridgeSettle =
        combo.bridgeBackspaceSettleMs != null
          ? combo.bridgeBackspaceSettleMs
          : comboDefaults.bridgeBackspaceSettleMs ?? 900;
      const afterBridge =
        combo.afterBridgePauseMs != null
          ? combo.afterBridgePauseMs
          : comboDefaults.afterBridgePauseMs ?? 900;

      // 1) Uniform alone opens /fl + clothes/uniform/jump2
      await runNamedMacro('uniform');
      await ks.sleep(afterUniform, signal);

      // 2) Back out to /fl root (still in menu — do NOT send /fl again)
      await ks.sendKeyMacro(
        [{ key: 'backspace', count: 2 }],
        100,
        targetExe,
        signal,
        {
          backspaceSettleMs: bridgeSettle,
          enterSettleMs: bridgeSettle,
          arrowDelayMs: 120,
          initialPauseMs: 200,
          skipFocus: true,
        },
      );
      await ks.sleep(afterBridge, signal);

      // 3) Weapons key sequence only (no /fl, no re-focus — stay in open menu)
      const wDefaults = allDefaults.weapons;
      const wMacro = settings.clockInMacros?.weapons || wDefaults;
      const useDefaultWeapons =
        (wDefaults.sequenceVersion || 0) > (wMacro.sequenceVersion || 0);
      const wTiming = useDefaultWeapons ? wDefaults : wMacro;
      const wSteps = resolveMacroSteps(wMacro, wDefaults);
      await ks.sendKeyMacro(
        wSteps,
        wTiming.delayMs != null ? wTiming.delayMs : wDefaults.delayMs,
        targetExe,
        signal,
        {
          arrowDelayMs:
            combo.weaponsArrowDelayMs != null
              ? combo.weaponsArrowDelayMs
              : wTiming.arrowDelayMs != null
                ? wTiming.arrowDelayMs
                : wDefaults.arrowDelayMs ?? 160,
          enterSettleMs:
            combo.weaponsEnterSettleMs != null
              ? combo.weaponsEnterSettleMs
              : wTiming.enterSettleMs != null
                ? wTiming.enterSettleMs
                : wDefaults.enterSettleMs ?? 900,
          backspaceSettleMs:
            combo.weaponsBackspaceSettleMs != null
              ? combo.weaponsBackspaceSettleMs
              : wTiming.backspaceSettleMs != null
                ? wTiming.backspaceSettleMs
                : wDefaults.backspaceSettleMs ?? 900,
          initialPauseMs:
            combo.weaponsInitialPauseMs != null
              ? combo.weaponsInitialPauseMs
              : comboDefaults.weaponsInitialPauseMs ?? 250,
          openingArrowCount:
            wTiming.openingArrowCount != null
              ? wTiming.openingArrowCount
              : wDefaults.openingArrowCount ?? 2,
          openingArrowDelayMs:
            wTiming.openingArrowDelayMs != null
              ? wTiming.openingArrowDelayMs
              : wDefaults.openingArrowDelayMs ?? 220,
          skipFocus: true,
        },
      );
    };

    if (
      actionId === 'UniformAndWeapons' ||
      actionId === 'UniformWeaponsStartWatch'
    ) {
      await runUniformAndWeaponsCombo();

      if (actionId === 'UniformWeaponsStartWatch') {
        const comboDefaults = allDefaults.uniformAndWeapons || {};
        const combo =
          settings.clockInMacros?.uniformAndWeapons || comboDefaults;
        const afterWeapons =
          combo.afterWeaponsPauseMs != null
            ? combo.afterWeaponsPauseMs
            : comboDefaults.afterWeaponsPauseMs ?? 1500;

        // Exit /fl (still open after weapons) then Start Watch chat RP
        await ks.sleep(afterWeapons, signal);
        const exitSettle =
          combo.bridgeBackspaceSettleMs != null
            ? combo.bridgeBackspaceSettleMs
            : comboDefaults.bridgeBackspaceSettleMs ?? 800;
        await ks.sendKeyMacro(
          [{ key: 'backspace', count: 2 }],
          100,
          targetExe,
          signal,
          {
            backspaceSettleMs: exitSettle,
            enterSettleMs: exitSettle,
            arrowDelayMs: 100,
            initialPauseMs: 400,
            skipFocus: true,
          },
        );
        await ks.sleep(1000, signal);

        await run([
          {
            text: `/melow takes off ${sex2} civilian clothes and puts them in their locker`,
            delayAfter: 380,
          },
          { text: `/melow puts on ${sex2} duty uniform`, delayAfter: 380 },
          {
            text: `/melow grabs a body cam from the locker, afixes it to ${sex2} chest and turns it on`,
            delayAfter: 380,
          },
          {
            text: '/dolow the light would start blinking green',
            delayAfter: 380,
          },
          { text: '/time', delayAfter: 380 },
          {
            text: `/rlow ${badge} show me start of watch under ${calls.LincolnCallsign}`,
            delayAfter: 380,
          },
          { text: `/createunit ${calls.LincolnCallsign}`, delayAfter: 0 },
        ]);
      }
      return;
    }

    await runNamedMacro(actionId === 'Weapons' ? 'weapons' : 'uniform');
    return;
  }

  if (actionId === 'MechOffer') {
    const type = (params && params.type) != null ? String(params.type) : '1';
    let amount = params && params.amount ? String(params.amount).trim() : '';
    if (amount) {
      const num = parseFloat(amount);
      if (type === '0' && !Number.isNaN(num)) {
        amount = Math.round(num * 0.2).toString();
      }
      await run([
        { text: `/mechoffer ${type} ${amount}`, delayAfter: 2500 },
        {
          text: '/me types out the details and sends off an invoice',
          delayAfter: 0,
        },
      ]);
    }
    return;
  }

  const MECH_DELAY =
    Math.max(1, Math.min(60, settings.mechanicRPDelaySeconds ?? 5)) * 1000;
  const mechanicActions = [
    'MechChangeTire',
    'MechRepairGasket',
    'MechOilChange',
    'MechHeadlights',
    'MechBrakes',
    'MechRadiator',
    'MechBattery',
    'MechWindshield',
    'MechNewTires',
    'MechEngineDamage',
    'MechTransmission',
    'MechAlternator',
    'MechStarter',
    'MechFuelPump',
    'MechSparkPlugs',
    'MechTimingBelt',
    'MechWaterPump',
    'MechClutch',
    'MechSuspension',
    'MechPowerSteering',
    'MechSerpentineBelt',
    'MechAirFilter',
    'MechElectrical',
    'MechSprayCar',
    'MechChangeLights',
    'MechBodyKit',
    'MechSpoiler',
    'MechUnderglow',
    'MechExhaust',
    'MechTint',
  ];
  if (mechanicActions.includes(actionId)) {
    const steps = getMechanicSteps(actionId, MECH_DELAY);
    if (steps.length) {
      await run(steps);
      return;
    }
  }

  switch (actionId) {
    case 'StartWatch': {
      await run([
        {
          text: `/melow takes off ${sex2} civilian clothes and puts them in their locker`,
          delayAfter: 380,
        },
        { text: `/melow puts on ${sex2} duty uniform`, delayAfter: 380 },
        {
          text: `/melow grabs a body cam from the locker, afixes it to ${sex2} chest and turns it on`,
          delayAfter: 380,
        },
        {
          text: '/dolow the light would start blinking green',
          delayAfter: 380,
        },
        { text: '/time', delayAfter: 380 },
        {
          text: `/rlow ${badge} show me start of watch under ${calls.LincolnCallsign}`,
          delayAfter: 380,
        },
        { text: `/createunit ${calls.LincolnCallsign}`, delayAfter: 0 },
      ]);
      return;
    }
    case 'StartWatchAdam': {
      await run([
        {
          text: `/melow takes off ${sex2} civilian clothes and puts them in their locker`,
          delayAfter: 380,
        },
        { text: `/melow puts on ${sex2} duty uniform`, delayAfter: 380 },
        {
          text: `/melow grabs a body cam from the locker, afixes it to ${sex2} chest and turns it on`,
          delayAfter: 380,
        },
        {
          text: '/dolow the light would start blinking green',
          delayAfter: 380,
        },
        { text: '/time', delayAfter: 380 },
        {
          text: `/rlow ${badge} show me start of watch under ${calls.AdamCallsign}`,
          delayAfter: 380,
        },
        { text: `/createunit ${calls.AdamCallsign}`, delayAfter: 0 },
      ]);
      return;
    }
    case 'EndWatch': {
      await run([
        { text: `/rlow ${badge} is ending watch`, delayAfter: 320 },
        { text: '/disbandunit', delayAfter: 280 },
        { text: '/leaveunit', delayAfter: 0 },
      ]);
      return;
    }

    case 'RenameToLincoln':
      await run([
        { text: `/renameunit ${calls.LincolnCallsign}`, delayAfter: 280 },
        {
          text: `/rlow ${badge} renaming unit to ${calls.LincolnCallsign}.`,
          delayAfter: 0,
        },
      ]);
      return;
    case 'RenameToAdam':
      await run([
        { text: `/renameunit ${calls.AdamCallsign}`, delayAfter: 280 },
        {
          text: `/rlow ${badge} show me renaming unit to ${calls.AdamCallsign}.`,
          delayAfter: 0,
        },
      ]);
      return;
    case 'RenameToDavid':
      await run([
        { text: `/renameunit ${calls.DavidCallsign}`, delayAfter: 280 },
        {
          text: `/rlow ${badge} show me renaming unit to ${calls.DavidCallsign}.`,
          delayAfter: 0,
        },
      ]);
      return;
    case 'ResumeLincoln':
      await run([
        { text: '/leaveunit', delayAfter: 280 },
        { text: `/createunit ${calls.LincolnCallsign}`, delayAfter: 280 },
        {
          text: `/rlow ${badge} show me continuing under ${calls.LincolnCallsign}.`,
          delayAfter: 0,
        },
      ]);
      return;
    case 'CustomUnit':
    case 'JoinUnit': {
      const joinCallSign = (params.callSign || '').trim();
      if (!joinCallSign) return;
      await run([
        { text: '/disbandunit', delayAfter: 280 },
        { text: '/leaveunit', delayAfter: 280 },
        { text: `/joinunit ${joinCallSign}`, delayAfter: 280 },
        {
          text: `/rlow ${badge} show me joining ${joinCallSign}`,
          delayAfter: 0,
        },
      ]);
      return;
    }
    case 'RenameUnit': {
      const renameCallSign = (params.callSign || '').trim();
      if (!renameCallSign) return;
      await run([
        { text: `/renameunit ${renameCallSign}`, delayAfter: 280 },
        {
          text: `/rlow ${badge} show me renaming unit to ${renameCallSign}.`,
          delayAfter: 0,
        },
      ]);
      return;
    }
    case 'RenameToAIR':
      await run([
        { text: '/renameunit AIR-1', delayAfter: 280 },
        {
          text: `/rlow ${badge} show me continuing under AIR-1.`,
          delayAfter: 0,
        },
      ]);
      return;
    case 'RenameToTOM':
      await run([
        { text: `/renameunit ${calls.SpecialCallsignTOM}`, delayAfter: 280 },
        {
          text: `/rlow ${badge} show me continuing under ${calls.SpecialCallsignTOM}.`,
          delayAfter: 0,
        },
      ]);
      return;
    case 'RenameToDAVID':
      await run([
        { text: `/renameunit ${calls.SpecialCallsignDAVID}`, delayAfter: 280 },
        {
          text: `/rlow ${badge} show me continuing under ${calls.SpecialCallsignDAVID}.`,
          delayAfter: 0,
        },
      ]);
      return;
    case 'RenameToFLD':
      await run([
        { text: '/renameunit FLD', delayAfter: 500 },
        {
          text: `/rlow ${badge} show me renaming unit to FLD.`,
          delayAfter: 0,
        },
      ]);
      return;
    case 'JoinFLD':
      await run([
        { text: '/disbandunit', delayAfter: 450 },
        { text: '/joinunit FLD', delayAfter: 450 },
        {
          text: `/rlow ${badge} show me joining FLD.`,
          delayAfter: 0,
        },
      ]);
      return;
    case 'RenameToRED':
      await run([
        { text: '/renameunit RED', delayAfter: 500 },
        {
          text: `/rlow ${badge} show me renaming unit to RED.`,
          delayAfter: 0,
        },
      ]);
      return;
    case 'JoinRED':
      await run([
        { text: '/disbandunit', delayAfter: 450 },
        { text: '/joinunit RED', delayAfter: 450 },
        {
          text: `/rlow ${badge} show me joining RED.`,
          delayAfter: 0,
        },
      ]);
      return;
  }

  // Traffic stop / arrest
  if (actionId === 'ViewLicense') {
    await paste(`/melow takes out the individual's phone and looks it over, checking their ID details`);
    return;
  }
  if (actionId === 'HandCitation') {
    await paste(`/melow offers the citation to the driver`);
    return;
  }
  if (actionId === 'IssueCitation') {
    const {
      citationType,
      generalCitationType,
      demeritSuspend,
      licenseType,
      playerId,
    } = params;
    if (!citationType && !generalCitationType) return;
    const steps = [];
    if (citationType) {
      steps.push({
        text: `/melow logs into the MDC and adds a "${citationType}" to the individual's record`,
        delayAfter: 1350,
      });
      if (demeritSuspend === 'Yes' && playerId) {
        steps.push({ text: `/warndriver ${playerId}`, delayAfter: 1100 });
        steps.push({
          text: `/melow adds a demerit to the driver's record`,
          delayAfter: 1450,
        });
      } else if (
        demeritSuspend === 'Demerit and Suspension' &&
        playerId &&
        licenseType
      ) {
        steps.push({ text: `/warndriver ${playerId}`, delayAfter: 1100 });
        steps.push({
          text: `/melow adds a demerit to the driver's record`,
          delayAfter: 750,
        });
        if (licenseType === 'Driver') {
          steps.push({
            text: `/suspend ${playerId} driver 1`,
            delayAfter: 320,
          });
          steps.push({
            text: `/melow logs into the DMV database and issues a 24 hour suspension on the individual's driver's license`,
            delayAfter: 1350,
          });
        } else if (licenseType === 'Driver and Trucker') {
          steps.push({
            text: `/suspend ${playerId} driver 1`,
            delayAfter: 320,
          });
          steps.push({
            text: `/suspend ${playerId} trucker 1`,
            delayAfter: 320,
          });
          steps.push({
            text: `/melow logs into the DMV database and issues a 24 hour suspension on both the individual's driver's and trucker's license`,
            delayAfter: 1350,
          });
        }
      }
      steps.push({
        text: '/melow prints out the citation and grabs it from the printer',
        delayAfter: 0,
      });
    } else if (generalCitationType) {
      steps.push({
        text: `/melow logs into the MDC and adds a "${generalCitationType}" citation to the individual's record`,
        delayAfter: 1350,
      });
      steps.push({
        text: '/melow prints out a citation and grabs it from the printer',
        delayAfter: 0,
      });
    }
    if (steps.length) await run(steps);
    return;
  }

  if (actionId === 'TowVehicle') {
    const towDelay = MECH_DELAY;
    await run([
      {
        text: '/melow opens the control panel, pulls down a lever, and lowers the ramp',
        delayAfter: towDelay,
      },
      {
        text: '/melow deploys the winch cables and securely attaches the cables to the front of the vehicle',
        delayAfter: towDelay,
      },
      {
        text: '/melow pulls another lever on the control panel and starts the winch',
        delayAfter: towDelay,
      },
      {
        text: '/melow secures the vehicle by its tires to the flatbed and lifts the ramp',
        delayAfter: 0,
      },
    ]);
    return;
  }

  // Felony stop
  if (actionId === 'FelonyStop1')
    await paste(
      '/m Driver, take your keys out of the ignition and toss them out of the window.',
    );
  if (actionId === 'FelonyStop2')
    await paste(
      '/m Driver, place both hands outside of the window. Reach down and open the door with your right hand.',
    );
  if (actionId === 'FelonyStop3')
    await paste(
      '/m Driver, exit the vehicle slowly. No sudden movements and keep your hands in the air. Face away from us at all times.',
    );
  if (actionId === 'FelonyStop4')
    await paste(
      '/m Grab your shirt by the neck, lift it high, and turn around a full 360 so we can see your waistline.',
    );
  if (actionId === 'FelonyStop5')
    await paste(
      '/m Walk backwards towards my voice until you are told to stop.',
    );
  if (actionId === 'LethalPursuit')
    await paste(`/m ${deptName}, STOP THE VEHICLE NOW OR FORCE MAY BE USED`);

  // Arrest
  if (actionId === 'Cuff')
    await paste(
      `/melow grabs a pair of cuffs from ${sex2} duty belt and attempts to put them around the individual's wrists`,
    );
  if (actionId === 'Uncuff')
    await paste(
      '/melow takes the handcuff key from my duty belt and attempts to uncuff the individual',
    );
  if (actionId === 'Frisk')
    await paste(
      '/melow puts on a pair of non-latex gloves and attempts to frisk the individual',
    );
  if (actionId === 'FriskLicense')
    await run([
      { text: '/melow attempts to locate the individual\'s phone', delayAfter: 500 },
      { text: `/dolow Would ${sex1} find one?`, delayAfter: 0 },
    ]);
  if (actionId === 'FriskKeys')
    await run([
      { text: '/melow attempts to locate a set of keys', delayAfter: 500 },
      { text: `/dolow would ${sex1} find any?`, delayAfter: 0 },
    ]);
  if (actionId === 'UnlockCuffedCar')
    await paste(
      '/melow takes the keys out, clicks the unlock button and puts them back where they were',
    );
  if (actionId === 'ViewCuffedLicense')
    await paste('/melow takes out the individual\'s phone and carefully reads it over');

  // Scene
  if (actionId === 'GrabBarriers')
    await paste(
      `/melow grabs some barriers from the trunk of the cruiser, placing them under ${sex2} arms`,
    );
  if (actionId === 'GatherBarriers') {
    await paste(
      `/melow gathers all the blockades one by one and places them under ${sex2} arms`,
    );
    await ks.sleep(250, signal);
    await paste('/RemoveAllBlockades');
  }
  if (actionId === 'StoreBarriers')
    await paste('/melow places the barriers in the trunk of the cruiser');
  if (actionId === 'GrabBLS')
    await paste('/melow grabs a BLS kit from the trunk of the cruiser');
  if (actionId === 'InitialBLS') {
    await paste('/anim medic');
    await ks.sleep(250, signal);
    await paste(
      "/melow sets the BLS kit on the groud and begins looking over the individual's injuries",
    );
    await ks.sleep(450, signal);
    await paste(`/dolow What would ${sex1} see?`);
  }
  if (actionId === 'GrabBodyBag')
    await paste('/melow grabs a body bag from the trunk of the cruiser');
  if (actionId === 'LoadBodyBag') {
    await run([
      {
        text: '/melow sets the body bag next to the body and unzips it',
        delayAfter: 320,
      },
      {
        text: '/melow rolls the body over into the body bag, ensuring the head, arms, and feet are all clear of the zipper',
        delayAfter: 950,
      },
      { text: '/melow zips up the body bag', delayAfter: 0 },
    ]);
  }

  // Inmate
  if (actionId === 'ReleaseForm') {
    await run([
      {
        text: `/melow takes a pen out from ${sex2} breast pocket and flips through the prisoner transfer forms`,
        delayAfter: 320,
      },
      {
        text: '/melow finds a blank prisoner transfer form and signs it',
        delayAfter: 0,
      },
    ]);
  }
  if (actionId === 'Mugshot') {
    await ks.focusWindow(targetExe);
    await ks.sleep(450, signal);
    await ks.sendKeys(['F7', 'delay', 'F8', 'delay', 'F7'], targetExe);
    await ks.sleep(450, signal);
    await paste('/record');
    await ks.sleep(450, signal);
    await paste(
      '/melow takes a mugshot of the individual and uploads it to the PD database',
    );
    await ks.sleep(1200, signal);
    await paste('/dolow The upload would be successful');
    await ks.sleep(450, signal);
    await paste('/record');
    return;
  }
  if (actionId === 'Fingerprints') {
    await paste('/collectprints ', false);
    // User must press Enter in-game; then we send the RP sequence. For now we send the sequence after a delay (user presses enter manually).
    await ks.sleep(2000, signal);
    await run([
      {
        text: '/melow takes each of the fingers from their left hand and slowly rolls them over the scanner',
        delayAfter: 2250,
      },
      {
        text: '/melow checks the clarity of the fingerprints on the MDC before submitting',
        delayAfter: 2150,
      },
      {
        text: '/melow submits the left hand fingerprints in the MDC',
        delayAfter: 1750,
      },
      {
        text: '/dolow the prints would be clear enough to be accepted by the database',
        delayAfter: 1750,
      },
      {
        text: '/dolow the MDC would prompt to scan the right hand fingerprints',
        delayAfter: 1550,
      },
      {
        text: '/melow takes each of the fingers from their right hand and slowly rolls them over the scanner',
        delayAfter: 1755,
      },
      {
        text: '/melow checks the clarity of the fingerprints on the MDC before submitting',
        delayAfter: 2550,
      },
      {
        text: '/melow submits the right hand fingerprints in the MDC',
        delayAfter: 1650,
      },
      {
        text: '/dolow the prints would be clear enough to be accepted by the database',
        delayAfter: 1150,
      },
      { text: '/melow uploads the prints to the database', delayAfter: 750 },
      { text: '/dolow the upload would be successful', delayAfter: 0 },
    ]);
    return;
  }

  // Detective RP (PD / SD) — same chat path as other /melow sequences
  const DET_D = 1400;
  if (actionId === 'DetectiveFingerprints') {
    await run([
      {
        text: `/melow lays ${sex2} fingerprint testing kit to the side and takes out a zephyr style brush`,
        delayAfter: DET_D,
      },
      {
        text: `/melow uncaps the testing powder container and dips ${sex2} brush into it, shaking off the excess powder`,
        delayAfter: DET_D,
      },
      {
        text: '/melow brushes the surface gently in a circular motion looking for print formation',
        delayAfter: DET_D,
      },
      {
        text: `/melow tears a piece of lifting tape off ${sex2} roll and places it over the powdered print area`,
        delayAfter: DET_D,
      },
      {
        text: `/melow uses ${sex2} finger to gently smooth it over`,
        delayAfter: DET_D,
      },
      {
        text: '/melow prepares a semi transparent lifting plate and gently peels the tape off, transferring it to the plate',
        delayAfter: DET_D,
      },
      {
        text: '/melow slots the plate into the MDC and scans for prints',
        delayAfter: 0,
      },
    ]);
    return;
  }
  if (actionId === 'DetectivePortablePrints') {
    const SCAN_D = 4500;
    await run([
      {
        text: `/melow takes a portable fingerprint scanner from ${sex2} kit`,
        delayAfter: SCAN_D,
      },
      {
        text: `/melow takes the individual's hand and places it onto the portable fingerprint scanner`,
        delayAfter: SCAN_D,
      },
      {
        text: `/melow holds their hand steady on the scanner until the prints are captured`,
        delayAfter: SCAN_D,
      },
      {
        text: `/melow checks the scanner display to make sure the prints came through clear enough`,
        delayAfter: SCAN_D,
      },
      {
        text: `/melow connects the portable scanner to the MDC and uploads the captured fingerprints`,
        delayAfter: SCAN_D,
      },
      {
        text: `/melow opens the fingerprint database on the MDC and runs a comparison search against the scanned prints`,
        delayAfter: SCAN_D,
      },
      {
        text: `/melow waits for the search to finish and looks over the results for a possible match`,
        delayAfter: 0,
      },
    ]);
    return;
  }
  if (
    actionId === 'DetectiveGsrHands' ||
    actionId === 'DetectiveGsrHeavy'
  ) {
    const GSR_D = 4500;
    const brushArea =
      actionId === 'DetectiveGsrHands'
        ? "grabs cotton from the GSR kit and brushes the suspect's hands"
        : "grabs cotton from the GSR kit and brushes the suspect's shoulders, fingers, and surrounding areas";
    await run([
      { text: `/melow ${brushArea}`, delayAfter: GSR_D },
      {
        text: `/melow takes out a vial from the kit and places the cotton into it`,
        delayAfter: GSR_D,
      },
      {
        text: '/melow uses the dropper to drip enough solution onto the cotton',
        delayAfter: GSR_D,
      },
      {
        text: '/melow seals the vial and waits for the results',
        delayAfter: GSR_D,
      },
      {
        text: '/dolow If the color changes to brown or blue, that means the test is positive. Would it be positive?',
        delayAfter: 0,
      },
    ]);
    return;
  }
  if (actionId === 'DetectiveFieldTest') {
    const SWAB_D = 4500;
    await run([
      {
        text: `/melow takes out a swab from ${sex2} kit and carefully swabs the area to collect any liquid or fluid`,
        delayAfter: SWAB_D,
      },
      {
        text: `/melow places the swab into a vial from ${sex2} kit`,
        delayAfter: SWAB_D,
      },
      {
        text: '/melow seals the vial and labels it as evidence',
        delayAfter: 0,
      },
    ]);
    return;
  }
  if (actionId === 'DetectiveTrace') {
    await run([
      {
        text: '/melow opens the tracing software on the MDC and starts entering the person number',
        delayAfter: DET_D,
      },
      {
        text: '/melow clicks submit and looks to see if there is an active trace',
        delayAfter: 0,
      },
    ]);
    return;
  }
  if (actionId === 'DetectiveBallistics') {
    const BAL_D = 4500;
    await run([
      {
        text: `/melow carefully mounts both bullets side by side on the comparison microscope stage`,
        delayAfter: BAL_D,
      },
      {
        text: `/melow adjusts the magnification and lighting until the land and groove impressions on each bullet come into clear view`,
        delayAfter: BAL_D,
      },
      {
        text: `/melow slowly rotates both bullets, lining up the rifling marks to compare the width, depth, and twist of the lands and grooves`,
        delayAfter: BAL_D,
      },
      {
        text: `/melow examines the striation patterns along the bearing surfaces, looking for matching individual characteristic marks left by the barrel`,
        delayAfter: BAL_D,
      },
      {
        text: `/melow checks the base of each bullet for firing pin impressions and breech face marks, noting any shared tooling signatures`,
        delayAfter: BAL_D,
      },
      {
        text: `/melow compares deformities, skid marks, and jacket damage on both projectiles to see if they show consistent class and individual characteristics`,
        delayAfter: BAL_D,
      },
      {
        text: `/melow documents ${sex2} findings from the ballistic comparison and prepares the bullets for evidence storage`,
        delayAfter: 0,
      },
    ]);
    return;
  }

  // Departmental radio - PD/SD aware
  const radioPrefix = dept === 'SD' ? '/deplow SD to' : '/deplow PD to';
  if (actionId === 'RadioPDtoDOC') await paste(`${radioPrefix} DOC, how copy?`);
  if (actionId === 'RadioPDtoMD') await paste(`${radioPrefix} MD, how copy?`);
  if (actionId === 'Radio1015') {
    const { count, eta } = params;
    if (!count || !eta) return;
    const minWord = parseInt(eta, 10) > 1 ? 'minutes' : 'minute';
    await paste(
      `${radioPrefix} DOC, en route with ${count}x 10-15. ETA of ${eta} ${minWord}.  Are you able to receive?`,
    );
  }
  if (actionId === 'Radio1015HVT') {
    const { count, eta } = params;
    if (!count || !eta) return;
    const minWord = parseInt(eta, 10) > 1 ? 'minutes' : 'minute';
    await paste(
      `${radioPrefix} DOC, en route with ${count}x 10-15 HVT through the gates. ETA of ${eta} ${minWord}.  Are you able to receive?`,
    );
  }
  if (actionId === 'RadioInjured1015') {
    await paste('t/backup FOR MD');
    await ks.sleep(2000, signal);
    const { injuredCount, backupNumber } = params;
    if (!injuredCount || !backupNumber) return;
    await paste(
      `${radioPrefix} MD, ${injuredCount}x injured 10-15 at ${backupNumber}. Are you able to assist?`,
    );
  }
  if (actionId === 'DepCallingToPD') {
    const toDept = dept === 'SD' ? 'PD' : 'SD';
    await paste(`${radioPrefix} ${toDept} JTAC1`);
  }

  if (actionId === 'PayToll') {
    await paste('/paytoll');
  }

  // Utility — open chat (T), paste command, Enter
  if (actionId === 'VOIPReset') {
    await paste('/vr 1');
    return;
  }
  if (actionId === 'ClearGPS') {
    await paste('/setcall -1');
    return;
  }
  if (actionId === 'Resync') {
    await paste('/resync');
    return;
  }

  // Animations: actionId is "anim:<name>"
  if (actionId === 'CustomRP') {
    const text = params && params.text ? String(params.text).trim() : '';
    if (text) await paste(text, true);
    return;
  }

  if (actionId.startsWith('anim:')) {
    const animName = actionId.slice(5);
    await paste(`/anim ${animName}`);
  }
}

module.exports = { runAction, getCallsigns };
