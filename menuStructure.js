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

function applySubMenuOrders(items, subMenuOrders) {
  if (!subMenuOrders || !items || !items.length) return items;
  return items.map((item) => {
    if (!item.children || !item.children.length) return item;
    const order = subMenuOrders[item.id];
    let children = item.children;
    if (order && order.length) {
      const byId = Object.fromEntries(children.map((c) => [c.id, c]));
      const ordered = order.filter((id) => byId[id]).map((id) => byId[id]);
      const rest = children.filter((c) => !order.includes(c.id));
      children = [...ordered, ...rest];
    }
    return { ...item, children: applySubMenuOrders(children, subMenuOrders) };
  });
}

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

  const uniformEquipment = {
    id: 'uniform-equipment',
    label: 'Uniform/Equipment Macros',
    children: [
      { id: 'Uniform', label: 'Uniform', actionId: 'Uniform' },
      { id: 'Weapons', label: 'Weapons', actionId: 'Weapons' },
      {
        id: 'UniformAndWeapons',
        label: 'Uniform + Weapons',
        actionId: 'UniformAndWeapons',
      },
      {
        id: 'UniformWeaponsStartWatch',
        label: 'Uniform + Weapons + Start Watch',
        actionId: 'UniformWeaponsStartWatch',
      },
    ],
  };

  const duty = {
    id: 'duty',
    label: 'Duty',
    children: dept === 'SD' ? [watch, unit, uniformEquipment] : [watch, unit],
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

  const detectiveGsr = {
    id: 'detective-gsr',
    label: 'GSR',
    children: [
      {
        id: 'DetectiveGsrHands',
        label: 'GSR — Hands (.50)',
        actionId: 'DetectiveGsrHands',
      },
      {
        id: 'DetectiveGsrHeavy',
        label: 'GSR — Heavy Weapons',
        actionId: 'DetectiveGsrHeavy',
      },
    ],
  };

  const detectiveRp = {
    id: 'detective-rp',
    label: 'Detective RP',
    children: [
      {
        id: 'DetectiveFingerprints',
        label: 'Fingerprints',
        actionId: 'DetectiveFingerprints',
      },
      {
        id: 'DetectivePortablePrints',
        label: 'Portable Fingerprint Scanner',
        actionId: 'DetectivePortablePrints',
      },
      detectiveGsr,
      {
        id: 'DetectiveFieldTest',
        label: 'Swab (Collect Fluid)',
        actionId: 'DetectiveFieldTest',
      },
      {
        id: 'DetectiveTrace',
        label: 'Trace',
        actionId: 'DetectiveTrace',
      },
      {
        id: 'DetectiveBallistics',
        label: 'Ballistics Comparison',
        actionId: 'DetectiveBallistics',
      },
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

  const usefulLinksList = settings.usefulLinks || [];
  const usefulLinksChildren = [
    { id: 'manage-links', label: 'Manage Links', actionId: 'OpenManageLinks' },
    ...usefulLinksList.map((e) => ({
      id: e.id,
      label: e.title,
      actionId: 'Link',
      linkUrl: e.url,
    })),
  ];
  const usefulLinksCategory = {
    id: 'useful-links',
    label: 'Useful Links',
    children: usefulLinksChildren,
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

  const adminNewPlayer = {
    id: 'admin-new-player',
    label: 'New Player',
    children: [
      {
        id: 'AdminWelcome',
        label: 'Welcome',
        actionId: 'CustomRP',
        rpText: '/rm Welcome to ECRP, We glad to have you here, if there is anything I can help you with before you start please let me know',
      },
      {
        id: 'AdminHowToRespond',
        label: 'How to Respond',
        actionId: 'CustomRP',
        rpText: '/rm To respond to me press T and type /rm followed by your message',
      },
      {
        id: 'AdminClosingNewPlayer',
        label: 'Closing Message',
        actionId: 'CustomRP',
        rpText: '/rm If you need anything please hit T and type /report and a member of staff will help you. Welcome to ECRP',
      },
    ],
  };

  const adminGeneral = {
    id: 'admin-general',
    label: 'General',
    children: [
      {
        id: 'AdminGreeting',
        label: 'Greeting',
        actionId: 'CustomRP',
        rpText: '/rm Good day, you are now in the hands of KwaaiNaai and Ill do my best to solve your issue',
      },
      {
        id: 'AdminRulesQuery',
        label: 'Rules Query',
        actionId: 'CustomRP',
        rpText: '/rm Unfortunately we are not able to tell you whether a specific action is allowed or not. Please read the server rules and use your best judgement',
      },
      {
        id: 'AdminClosing',
        label: 'Closing',
        actionId: 'CustomRP',
        rpText: '/rm I hope you have the most amazing day and remeber dont be a Naai be Kwaai',
      },
    ],
  };

  const adminReports = {
    id: 'admin-reports',
    label: 'Reports',
    children: [adminGeneral, adminNewPlayer],
  };

  const rootItems =
    dept === 'Mechanic'
      ? [
          mechanicInvoice,
          mechanicRepairs,
          mechanicMods,
          mechanicTow,
          customRpCategory,
          usefulLinksCategory,
        ]
      : dept === 'Admin'
      ? [
          adminReports,
          customRpCategory,
          bbcodeTemplatesCategory,
          usefulLinksCategory,
          utility,
        ]
      : [
          duty,
          customRpCategory,
          bbcodeTemplatesCategory,
          informationCategory,
          rp,
          detectiveRp,
          radio,
          pursuit,
          animations,
          usefulLinksCategory,
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
          'useful-links',
        ]
      : dept === 'Admin'
      ? settings.adminMenuOrder || ['admin-reports', 'custom-rp', 'bbcode-templates', 'useful-links', 'utility']
      : settings.menuOrder || rootItems.map((x) => x.id);
  const byId = Object.fromEntries(rootItems.map((x) => [x.id, x]));
  const ordered = order.filter((id) => byId[id]).map((id) => byId[id]);
  const rest = rootItems.filter((x) => !order.includes(x.id));
  return applySubMenuOrders([...ordered, ...rest], settings.subMenuOrders);
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
