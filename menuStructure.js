/**
 * Build menu tree from settings. Used by renderer only.
 * getCallsigns duplicated here for display (no Node deps in renderer).
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

/** Animation list: Favorites + a subset of categories for the menu. */
const ANIM_FAVORITES = [
  'spiderman',
  'crawl',
  'airplane',
  'finger',
  'celebrate',
  'shakeoff',
  'prone',
  'wave',
  'sitchair4',
];
const ANIM_DANCES = [
  'Dance',
  'Dance2',
  'Dance3',
  'Dance4',
  'Dance5',
  'Dance6',
  'Dance7',
  'Dance8',
  'Dance9',
  'Dance10',
  'Dance11',
  'Dance12',
  'Dance13',
  'Dance14',
];
const ANIM_STANCES = [
  'Cop',
  'CrossArms',
  'Idle',
  'Lean',
  'Think',
  'Wait',
  'Superhero',
];
const ANIM_SIT = ['Sit', 'Sit2', 'Sit3', 'Crouch', 'Kneel', 'Meditate'];
const ANIM_EMOTIONS = [
  'Angry',
  'FacePalm',
  'Nervous',
  'Scared',
  'Shrug',
  'ThumbsUp',
  'ThumbsDown',
];
const ANIM_INTERACTION = [
  'Wave',
  'Point',
  'Salute',
  'Handshake',
  'Hug',
  'Photo',
  'ThumbsUp',
  'ThumbsUp2',
];

function buildMenu(settings) {
  const dept = settings.department || 'PD';

  const watch = {
    id: 'watch',
    label: 'Start/End Watch',
    children: [
      { id: 'StartWatch', label: 'Start Watch', actionId: 'StartWatch' },
      { id: 'EndWatch', label: 'End Watch', actionId: 'EndWatch' },
    ],
  };

  const unit = {
    id: 'unit',
    label: 'Change Unit',
    children: [
      {
        id: 'JoinUnit',
        label: 'Join',
        actionId: 'JoinUnit',
        needsInput: true,
      },
      {
        id: 'RenameUnit',
        label: 'Rename',
        actionId: 'RenameUnit',
        needsInput: true,
      },
    ],
  };

  const duty = {
    id: 'duty',
    label: 'Duty',
    children: [watch, unit],
  };

  const trafficStop = {
    id: 'traffic',
    label: 'Traffic Stop',
    children: [
      { id: 'ViewLicense', label: 'View License', actionId: 'ViewLicense' },
      {
        id: 'IssueCitation',
        label: 'Issue Citation',
        actionId: 'IssueCitation',
        needsInput: true,
      },
      { id: 'HandCitation', label: 'Hand Citation', actionId: 'HandCitation' },
    ],
  };
  const felonyStop = {
    id: 'felony',
    label: 'Felony Stop',
    children: [
      {
        id: 'FelonyStop1',
        label: 'Step 1: Toss keys',
        actionId: 'FelonyStop1',
      },
      {
        id: 'FelonyStop2',
        label: 'Step 2: Open door',
        actionId: 'FelonyStop2',
      },
      { id: 'FelonyStop3', label: 'Step 3: Step out', actionId: 'FelonyStop3' },
      { id: 'FelonyStop4', label: 'Step 4: Full 360', actionId: 'FelonyStop4' },
      {
        id: 'FelonyStop5',
        label: 'Step 5: Walk backwards',
        actionId: 'FelonyStop5',
      },
    ],
  };
  const arrest = {
    id: 'arrest',
    label: 'Arrest',
    children: [
      { id: 'Cuff', label: 'Cuff', actionId: 'Cuff' },
      { id: 'Uncuff', label: 'Uncuff', actionId: 'Uncuff' },
      { id: 'Frisk', label: 'Frisk', actionId: 'Frisk' },
      {
        id: 'FriskLicense',
        label: 'Frisk for License',
        actionId: 'FriskLicense',
      },
      { id: 'FriskKeys', label: 'Frisk for Keys', actionId: 'FriskKeys' },
      {
        id: 'UnlockCuffedCar',
        label: "Unlock Cuffed Person's Car",
        actionId: 'UnlockCuffedCar',
      },
      {
        id: 'ViewCuffedLicense',
        label: 'View Cuffed License',
        actionId: 'ViewCuffedLicense',
      },
    ],
  };
  const scene = {
    id: 'scene',
    label: 'Scene Management',
    children: [
      { id: 'GrabBarriers', label: 'Grab Barriers', actionId: 'GrabBarriers' },
      {
        id: 'GatherBarriers',
        label: 'Gather All Barriers',
        actionId: 'GatherBarriers',
      },
      {
        id: 'StoreBarriers',
        label: 'Store Barriers',
        actionId: 'StoreBarriers',
      },
      { id: 'GrabBLS', label: 'Grab BLS Kit', actionId: 'GrabBLS' },
      { id: 'InitialBLS', label: 'Initial BLS', actionId: 'InitialBLS' },
      { id: 'GrabBodyBag', label: 'Grab Body Bag', actionId: 'GrabBodyBag' },
      {
        id: 'LoadBodyBag',
        label: 'Load Into Body Bag',
        actionId: 'LoadBodyBag',
      },
    ],
  };
  const inmate = {
    id: 'inmate',
    label: 'Inmate Processing',
    children: [
      { id: 'UncuffInmate', label: 'Uncuff', actionId: 'Uncuff' },
      { id: 'ReleaseForm', label: 'Release form', actionId: 'ReleaseForm' },
      { id: 'Mugshot', label: 'Mugshot', actionId: 'Mugshot' },
      { id: 'Fingerprints', label: 'Fingerprints', actionId: 'Fingerprints' },
    ],
  };
  const rp = {
    id: 'rp',
    label: 'Traffic Stop / Arrest',
    children: [
      trafficStop,
      felonyStop,
      arrest,
      scene,
      inmate,
      { id: 'TowVehicle', label: 'Tow Vehicle', actionId: 'TowVehicle' },
    ],
  };

  const radioPrefix = dept === 'SD' ? 'SD to' : 'PD to';
  const radio = {
    id: 'radio',
    label: 'Departmental Radio',
    children: [
      { id: 'RadioPDtoDOC', label: `${dept} to DOC`, actionId: 'RadioPDtoDOC' },
      { id: 'RadioPDtoMD', label: `${dept} to MD`, actionId: 'RadioPDtoMD' },
      {
        id: 'Radio1015',
        label: '10-15 to DOC',
        actionId: 'Radio1015',
        needsInput: true,
      },
      {
        id: 'Radio1015HVT',
        label: '10-15 to DOC HVT',
        actionId: 'Radio1015HVT',
        needsInput: true,
      },
      {
        id: 'RadioInjured1015',
        label: 'Injured 10-15',
        actionId: 'RadioInjured1015',
        needsInput: true,
      },
    ],
  };

  const pursuitForce = {
    id: 'LethalPursuit',
    label: 'Pursuit Force',
    actionId: 'LethalPursuit',
  };
  const depCallingToPD = {
    id: 'DepCallingToPD',
    label: 'Calling JTAC to PD',
    actionId: 'DepCallingToPD',
  };
  const payToll = {
    id: 'PayToll',
    label: 'Pay Toll',
    actionId: 'PayToll',
  };
  const pursuit = {
    id: 'pursuit',
    label: 'Pursuit',
    children: [depCallingToPD, payToll, pursuitForce],
  };

  const animFav = {
    id: 'anim-fav',
    label: 'Favorites',
    children: ANIM_FAVORITES.map((a) => ({
      id: `anim:${a}`,
      label: a,
      actionId: `anim:${a}`,
    })),
  };
  const animDances = {
    id: 'anim-dances',
    label: 'Dances',
    children: ANIM_DANCES.map((a) => ({
      id: `anim:${a}`,
      label: a,
      actionId: `anim:${a}`,
    })),
  };
  const animStances = {
    id: 'anim-stances',
    label: 'Stances',
    children: ANIM_STANCES.map((a) => ({
      id: `anim:${a}`,
      label: a,
      actionId: `anim:${a}`,
    })),
  };
  const animSit = {
    id: 'anim-sit',
    label: 'Sit/Crouch/Kneel',
    children: ANIM_SIT.map((a) => ({
      id: `anim:${a}`,
      label: a,
      actionId: `anim:${a}`,
    })),
  };
  const animEmotions = {
    id: 'anim-emotions',
    label: 'Emotions',
    children: ANIM_EMOTIONS.map((a) => ({
      id: `anim:${a}`,
      label: a,
      actionId: `anim:${a}`,
    })),
  };
  const animInteraction = {
    id: 'anim-interaction',
    label: 'Interaction',
    children: ANIM_INTERACTION.map((a) => ({
      id: `anim:${a}`,
      label: a,
      actionId: `anim:${a}`,
    })),
  };
  const animations = {
    id: 'animations',
    label: 'Animations',
    children: [
      animFav,
      animDances,
      animStances,
      animSit,
      animEmotions,
      animInteraction,
    ],
  };

  const utility = {
    id: 'utility',
    label: 'Utility',
    children: [
      { id: 'VOIPReset', label: 'VOIP Reset', actionId: 'VOIPReset' },
      { id: 'ClearGPS', label: 'Clear GPS', actionId: 'ClearGPS' },
      { id: 'Resync', label: 'Resync', actionId: 'Resync' },
    ],
  };

  const customRpList = settings.customRp || [];
  const customRpChildren = [
    { id: 'manage-rp', label: 'Manage RP phrases', actionId: 'OpenManageRp' },
    ...customRpList.map((e) => ({
      id: e.id,
      label: e.title,
      actionId: 'CustomRP',
      rpText: e.text,
    })),
  ];
  const customRpCategory = {
    id: 'custom-rp',
    label: 'RP',
    children: customRpChildren,
  };

  const bbcodeTemplatesList = settings.bbcodeTemplates || [];
  const bbcodeChildren = [
    {
      id: 'manage-bbcode',
      label: 'Manage BBCODE templates',
      actionId: 'OpenManageBBCODE',
    },
    ...bbcodeTemplatesList.map((e) => ({
      id: e.id,
      label: e.title,
      actionId: 'CopyBBCODE',
      bbcodeContent: e.content || '',
    })),
  ];
  const bbcodeTemplatesCategory = {
    id: 'bbcode-templates',
    label: 'BBCODE Templates',
    children: bbcodeChildren,
  };

  const informationCategory = {
    id: 'information',
    label: 'Information',
    children: [
      { id: 'penal-code', label: 'Penal Code', actionId: 'OpenPenalCode' },
    ],
  };

  /** Mechanic profile: Repairs (fix broken), Mods (upgrades), Tow — multi-step /me with 5s delays */
  const MECHANIC_REPAIRS = [
    {
      id: 'MechChangeTire',
      label: 'Change flat tire',
      actionId: 'MechChangeTire',
    },
    {
      id: 'MechRepairGasket',
      label: 'Repair gasket',
      actionId: 'MechRepairGasket',
    },
    { id: 'MechOilChange', label: 'Oil change', actionId: 'MechOilChange' },
    {
      id: 'MechHeadlights',
      label: 'Repair broken headlights',
      actionId: 'MechHeadlights',
    },
    { id: 'MechBrakes', label: 'Repair brakes', actionId: 'MechBrakes' },
    {
      id: 'MechRadiator',
      label: 'Repair radiator leak',
      actionId: 'MechRadiator',
    },
    {
      id: 'MechBattery',
      label: 'Repair battery connection',
      actionId: 'MechBattery',
    },
    {
      id: 'MechWindshield',
      label: 'Repair windshield crack',
      actionId: 'MechWindshield',
    },
    { id: 'MechNewTires', label: 'Put on new tires', actionId: 'MechNewTires' },
    {
      id: 'MechEngineDamage',
      label: 'Repair engine damage',
      actionId: 'MechEngineDamage',
    },
    {
      id: 'MechTransmission',
      label: 'Repair transmission',
      actionId: 'MechTransmission',
    },
    {
      id: 'MechAlternator',
      label: 'Replace alternator',
      actionId: 'MechAlternator',
    },
    {
      id: 'MechStarter',
      label: 'Replace starter motor',
      actionId: 'MechStarter',
    },
    {
      id: 'MechFuelPump',
      label: 'Replace fuel pump',
      actionId: 'MechFuelPump',
    },
    {
      id: 'MechSparkPlugs',
      label: 'Replace spark plugs',
      actionId: 'MechSparkPlugs',
    },
    {
      id: 'MechTimingBelt',
      label: 'Replace timing belt',
      actionId: 'MechTimingBelt',
    },
    {
      id: 'MechWaterPump',
      label: 'Replace water pump',
      actionId: 'MechWaterPump',
    },
    { id: 'MechClutch', label: 'Replace clutch', actionId: 'MechClutch' },
    {
      id: 'MechSuspension',
      label: 'Replace suspension/struts',
      actionId: 'MechSuspension',
    },
    {
      id: 'MechPowerSteering',
      label: 'Repair power steering leak',
      actionId: 'MechPowerSteering',
    },
    {
      id: 'MechSerpentineBelt',
      label: 'Replace serpentine belt',
      actionId: 'MechSerpentineBelt',
    },
    {
      id: 'MechAirFilter',
      label: 'Replace air filter',
      actionId: 'MechAirFilter',
    },
    {
      id: 'MechElectrical',
      label: 'Repair electrical issues',
      actionId: 'MechElectrical',
    },
  ];
  const mechanicRepairs = {
    id: 'mechanic-repairs',
    label: 'Repairs',
    children: MECHANIC_REPAIRS,
  };

  const MECHANIC_MODS = [
    { id: 'MechSprayCar', label: 'Spray paint job', actionId: 'MechSprayCar' },
    {
      id: 'MechChangeLights',
      label: 'Upgrade lights',
      actionId: 'MechChangeLights',
    },
    { id: 'MechBodyKit', label: 'Add body kit', actionId: 'MechBodyKit' },
    { id: 'MechSpoiler', label: 'Add spoiler', actionId: 'MechSpoiler' },
    {
      id: 'MechUnderglow',
      label: 'Install underglow',
      actionId: 'MechUnderglow',
    },
    {
      id: 'MechExhaust',
      label: 'Install new exhaust',
      actionId: 'MechExhaust',
    },
    { id: 'MechTint', label: 'Add window tint', actionId: 'MechTint' },
  ];
  const mechanicMods = {
    id: 'mechanic-mods',
    label: 'Mods',
    children: MECHANIC_MODS,
  };

  const mechanicTow = {
    id: 'mechanic-tow',
    label: 'Tow',
    children: [
      { id: 'TowVehicle', label: 'Tow Vehicle', actionId: 'TowVehicle' },
    ],
  };

  const mechanicInvoice = {
    id: 'mechanic-invoice',
    label: 'Send Invoice',
    actionId: 'MechOffer',
    needsInput: true,
  };

  const rootItems =
    dept === 'Mechanic'
      ? [
          mechanicInvoice,
          mechanicRepairs,
          mechanicMods,
          mechanicTow,
          customRpCategory,
        ]
      : [
          duty,
          customRpCategory,
          bbcodeTemplatesCategory,
          informationCategory,
          rp,
          radio,
          pursuit,
          animations,
          utility,
        ];
  const order =
    dept === 'Mechanic'
      ? [
          'mechanic-invoice',
          'mechanic-repairs',
          'mechanic-mods',
          'mechanic-tow',
          'custom-rp',
        ]
      : settings.menuOrder || rootItems.map((x) => x.id);
  const byId = Object.fromEntries(rootItems.map((x) => [x.id, x]));
  const ordered = order.filter((id) => byId[id]).map((id) => byId[id]);
  const rest = rootItems.filter((x) => !order.includes(x.id));
  return [...ordered, ...rest];
}

/**
 * Flatten menu tree to list of actionable items with path (for search, quick bar, etc).
 * Each entry: { path: string[], item: { id, label, actionId?, needsInput? } }
 */
function flattenMenu(items, pathSoFar = []) {
  const out = [];
  if (!items || !Array.isArray(items)) return out;
  for (const item of items) {
    const path = [...pathSoFar, item.label];
    if (item.actionId) {
      out.push({ path, item: { ...item } });
    }
    if (item.children && item.children.length) {
      out.push(...flattenMenu(item.children, path));
    }
  }
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildMenu, getCallsigns, flattenMenu };
}
if (typeof window !== 'undefined') {
  window.buildMenu = buildMenu;
  window.getCallsigns = getCallsigns;
  window.flattenMenu = flattenMenu;
}
