// ap-config.js

// Ações base com AP, ordenadas por uso típico (sequência pensada)
const AP_ACTIONS = [
  // Hacks
  { id: "hack_faction",        label: "Hack Faction Portal",           ap: 100,   visible: true},
  { id: "hack_enemy",          label: "Hack Enemy Portal",             ap: 200,   visible: true},
  
  // Portal control / tuning
  { id: "capture_portal",      label: "Capture Portal",                ap: 675,   visible: false},
  { id: "capture_machina",     label: "Capture Machina Portal",        ap: 1331,   visible: true},

  // Deploy / upgrade
  { id: "deploy_resonator",    label: "Deploy Resonator",              ap: 125,   visible: true},
  { id: "last_resonator",      label: "Last Resonator on Portal",      ap: 250,   visible: true},
  { id: "upgrade_resonator",   
    label: "Upgrade Resonator",
    ap: 65,   
    visible: true,
    warning: true,
    warningMessage: "Upgrade only gives AP on resonators deployed by other agents."
  },

  // Mods / beacons / scans
  { id: "deploy_mod",          label: "Deploy Mod",                    ap: 125,   visible: true},
  { id: "deploy_beacon",       label: "Deploy Beacon",                 ap: 500,   visible: true},
  { id: "deploy_firework",     label: "Deploy Firework",               ap: 500,   visible: true},
  { id: "deploy_frakker",      label: "Deploy Frakker",                ap: 500,   visible: true},
  { id: "upload_scan",         label: "Upload Portal Scan",            ap: 500,   visible: true},

  // Links & fields
  { id: "create_link",         label: "Create Link",                   ap: 313,   visible: true},
  { id: "create_field",        
    label: "Create Control Field",          
    ap: 1250,   
    visible: true, 
    warning: true,
    warningMessage: "To create a field you need at least one link. Plan links accordingly."
  },

  // Destroy / neutralize
  { id: "destroy_resonator",   label: "Destroy Resonator",             ap: 75,   visible: true},
  { id: "destroy_mod",         label: "Destroy Mod",                   ap: 80,   visible: true},
  { id: "destroy_link",        label: "Destroy Link",                  ap: 185,   visible: true},
  { id: "destroy_field",       label: "Destroy Control Field",         ap: 750,   visible: true},

  // Recharge
  { id: "recharge_near",       label: "Single Recharge (nearby <1km)",        ap: 10,   visible: true},
  { id: "recharge_far",        label: "Single Recharge (<300km)",             ap: 9,   visible: true},
];

// Packs comuns de ações (para tuning em “operações completas”)
const AP_PACKS = [
  {
    id: "capture_plus_one_reso",
    label: "Capture + 1 Resonator (800 AP)",
    actions: [
      { actionId: "capture_portal",   count: 1 },
      { actionId: "deploy_resonator", count: 1 },
    ],
    priority: 1,
    category: "build", 
    visible: true,
    },
  {
    id: "complete_portal",
    label: "Complete Portal (capture + 8 resonators + 2 mods)",
    actions: [
      { actionId: "capture_portal",    count: 1 },
      { actionId: "deploy_resonator",  count: 8 },
      { actionId: "last_resonator",    count: 1 },
      { actionId: "deploy_mod",        count: 2 },
    ],
    priority: 1,
    category: "build",
    visible: true,
  },
  {
    id: "link_plus_fields",
    label: "1 Link + 1 Field (1,563 AP)",
    actions: [
      { actionId: "create_link",    count: 1 },
      { actionId: "create_field",  count: 1 },
    ],
    priority: 2,
    category: "field",
    visible: false,
  },
  {
    id: "link_plus_two_fields",
    label: "1 Link + 2 Field (2,813 AP)",
    actions: [
      { actionId: "create_link",    count: 1 },
      { actionId: "create_field",  count: 2 },
    ],
    priority: 2,
    category: "field",
    visible: false,
  },
];

// Utilitário para calcular AP total de um pack com base na tabela de ações
function computePackAP(pack) {
  let total = 0;
  pack.actions.forEach(entry => {
    const action = AP_ACTIONS.find(a => a.id === entry.actionId);
    if (action) {
      total += action.ap * entry.count;
    }
  });
  return total;
}