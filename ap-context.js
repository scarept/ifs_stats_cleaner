// Estrutura de contexto com flags que representam o que é possível neste cenário
const DEFAULT_CONTEXT = {
  canCapture: true,
  canField: true,
  canLink: true,
  canHack: true,
  canRecharge: true,
  canDestroyReso: true,
  canDestroyLink: true,
  canDestroyField: true,
  canScan: true,
  canUseBeacons: true,
  canUseFrackers: true,
  canMachina: true,
};

// Lista de opções para a UI (checkboxes)
const CONTEXT_OPTIONS = [
  { id: "canCapture",      label: "I can capture portals",         default: true },
  { id: "canLink",         label: "I can create links",            default: true },
  { id: "canField",        label: "I can create fields",           default: true },
  { id: "canHack",         label: "I can hack portals",            default: true },
  { id: "canRecharge",     label: "I can recharge portals",        default: true },
  { id: "canDestroyReso",  label: "I can destroy resonators",      default: true },
  { id: "canDestroyLink",  label: "I can destroy links",           default: true },
  { id: "canDestroyField", label: "I can destroy fields",          default: true },
  { id: "canScan",         label: "I can upload portal scans",     default: true },
  { id: "canUseBeacons",   label: "I can use beacons/fireworks",   default: true },
  { id: "canUseFrackers",  label: "I can use frakkers",            default: true },
  { id: "canMachina",      label: "I can capture Machina portals", default: true },
];

// Função para construir um contexto a partir das checkboxes da UI
function buildContextFromUI() {
  const context = { ...DEFAULT_CONTEXT };

  CONTEXT_OPTIONS.forEach(opt => {
    const cb = document.querySelector(`.context-checkbox[data-id="${opt.id}"]`);
    if (cb) {
      context[opt.id] = cb.checked;
    }
  });

  return context;
}