// ap-events.js

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
      // ex: capture_portal: 4000,
    },
  },
];

// AP base por ação
function getBaseActionAP(actionId) {
  const action = AP_ACTIONS.find(a => a.id === actionId);
  return action ? action.ap : 0;
}

// Override específico do evento (se existir)
function getEventOverrideAP(actionId, eventProfile) {
  if (!eventProfile || !eventProfile.overrides) return null;
  const value = eventProfile.overrides[actionId];
  return typeof value === "number" ? value : null;
}

// AP efectivo de uma ação, dado evento + apexActive
function getEffectiveActionAP(actionId, eventProfile, apexActive) {
  const baseAP = getBaseActionAP(actionId);
  if (!baseAP || typeof baseAP !== "number") return 0;

  const eventAP = getEventOverrideAP(actionId, eventProfile);
  const apBeforeMult = eventAP !== null ? eventAP : baseAP;

  const baseMult =
    eventProfile && typeof eventProfile.baseMultiplier === "number"
      ? eventProfile.baseMultiplier
      : 1;

  const apexMult =
    apexActive && eventProfile && typeof eventProfile.apexMultiplier === "number"
      ? eventProfile.apexMultiplier
      : 1;

  const effective = apBeforeMult * baseMult * apexMult;
  return isFinite(effective) ? effective : 0;
}

// AP efectivo de um pack (combina ações)
function computePackAPWithEvents(pack, eventProfile, apexActive) {
  let total = 0;
  if (!pack || !Array.isArray(pack.actions)) return 0;

  pack.actions.forEach(entry => {
    const ap = getEffectiveActionAP(entry.actionId, eventProfile, apexActive);
    if (!ap || typeof ap !== "number") return;
    total += ap * entry.count;
  });

  return total;
}

// Renderizar dropdown de evento e checkbox de APEX
function renderBoostOptions() {
  const eventSelect = document.getElementById("eventProfileSelect");
  const apexCheckbox = document.getElementById("apexActiveCheckbox");

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

  if (apexCheckbox) {
    apexCheckbox.checked = false; // por defeito: APEX off
  }
}

// Helpers para ler selecção actual
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