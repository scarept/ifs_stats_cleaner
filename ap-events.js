const GLOBAL_MULTIPLIERS = [
  { id: "global_1x",   label: "1x AP (normal)",        value: 1 },
  { id: "global_1_25", label: "1.25x AP",              value: 1.25 },
  { id: "global_1_5",  label: "1.5x AP",               value: 1.5 },
  { id: "global_2x",   label: "2x AP (event)",         value: 2 },
  { id: "global_3x",   label: "3x AP (rare event)",    value: 3 },
];

const APEX_OPTIONS = [
  { id: "apex_none", label: "No APEX", multiplier: 1 },
  { id: "apex_2x",   label: "APEX 2x", multiplier: 2 },
  { id: "apex_3x",   label: "APEX 3x (special)", multiplier: 3 },
];

// Perfis de eventos: definem multiplicador base, multiplicador de APEX e overrides por ação
const AP_EVENT_PROFILES = [
  {
    id: "none",
    label: "No event",
    baseMultiplier: 1,
    apexMultiplier: 2,    // APEX normal: 2x
    overrides: {},        // sem overrides
  },
    {
    id: "ifs",
    label: "Ingress First Saturday",
    baseMultiplier: 2,    // se FS for global 2x; ajusta se necessário
    apexMultiplier: 2,
    overrides: {
      // se FS só alterar algumas ações, coloca overrides aqui.
    },
  },
  {
    id: "level8_week",
    label: "Level 8 Week",
    baseMultiplier: 2,    // global double AP
    apexMultiplier: 3,    // APEX mais forte (3x)
    overrides: {
      // se houver AP específicos por ação num certo ano,
      // podes colocá-los aqui (capturas, last reso, etc.)
      // ex: capture_portal: 4000,
    },
  },
];


function getBaseActionAP(actionId) {
  const action = AP_ACTIONS.find(a => a.id === actionId);
  return action ? action.ap : 0;
}

function getEventOverrideAP(actionId, eventProfile) {
  if (!eventProfile || !eventProfile.overrides) return null;
  const value = eventProfile.overrides[actionId];
  return typeof value === "number" ? value : null;
}

function getEffectiveActionAP(actionId, globalMultiplier, apexMultiplier, eventProfile) {
  const baseAP = getBaseActionAP(actionId);
  if (baseAP === 0) return 0;

  const eventAP = getEventOverrideAP(actionId, eventProfile);
  const apBeforeBoosts = eventAP !== null ? eventAP : baseAP;

  const totalMultiplier = (globalMultiplier || 1) * (apexMultiplier || 1);
  return apBeforeBoosts * totalMultiplier;
}

function computePackAPWithEvents(pack, globalMultiplier, apexMultiplier, eventProfile) {
  let total = 0;
  pack.actions.forEach(entry => {
    const ap = getEffectiveActionAP(entry.actionId, globalMultiplier, apexMultiplier, eventProfile);
    total += ap * entry.count;
  });
  return total;
}

//ALIAS for backward compatibility
function computePackAP(pack) {
  // AP base sem boosts
  return computePackAPWithEvents(pack, 1, 1, AP_EVENT_PROFILES.find(p => p.id === "none"));
}

function renderBoostOptions() {
  const globalContainer = document.getElementById("globalMultiplierOptions");
  const apexContainer = document.getElementById("apexOptions");
  const eventSelect = document.getElementById("eventProfileSelect");

  if (globalContainer) {
    globalContainer.innerHTML = "";
    GLOBAL_MULTIPLIERS.forEach(opt => {
      const label = document.createElement("label");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "globalMultiplier";
      radio.value = opt.id;
      radio.checked = opt.id === "global_1x";
      label.append(radio, document.createTextNode(opt.label));
      globalContainer.appendChild(label);
    });
  }

  if (apexContainer) {
    apexContainer.innerHTML = "";
    APEX_OPTIONS.forEach(opt => {
      const label = document.createElement("label");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "apexMultiplier";
      radio.value = opt.id;
      radio.checked = opt.id === "apex_none";
      label.append(radio, document.createTextNode(opt.label));
      apexContainer.appendChild(label);
    });
  }

  if (eventSelect) {
    eventSelect.innerHTML = "";
    AP_EVENT_PROFILES.forEach(profile => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = profile.label;
      eventSelect.appendChild(option);
    });
    eventSelect.value = "none";
  }
}

function getSelectedEventProfile() {
  const select = document.getElementById("eventProfileSelect");
  const id = select ? select.value : "none";
  const profile = AP_EVENT_PROFILES.find(p => p.id === id);
  return profile || AP_EVENT_PROFILES[0]; // "none"
}

function isApexActive() {
  const cb = document.getElementById("apexActiveCheckbox");
  return !!(cb && cb.checked);
}