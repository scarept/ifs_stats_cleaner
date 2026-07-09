// ap-planner.js

function unitWeight(unit) {
  // unit.type: "pack" ou "action"
  // unit.ref.category / unit.ref.priority: aquilo que já tens
  if (unit.type === "pack" && unit.ref.category === "build") return 1;
  if (unit.type === "action" && ["create_link", "create_field"].includes(unit.id)) return 2;
  if (unit.type === "pack" && unit.ref.category === "field") return 3;
  if (unit.type === "action" && ["hack_faction"].includes(unit.id)) return 4;
  if (unit.type === "action" && unit.id.startsWith("recharge")) return 5;
  if (unit.type === "action" && ["capture_portal"].includes(unit.id)) return 6;
  if (unit.type === "action" && ["deploy_resonator"].includes(unit.id)) return 7;
  if (unit.type === "action" && ["deploy_mod"].includes(unit.id)) return 8;
  if (unit.type === "action" && ["deploy_beacon"].includes(unit.id)) return 9;
  if (unit.type === "action" && ["hack_enemy"].includes(unit.id)) return 10;
  if (unit.type === "action" && ["upgrade_resonator"].includes(unit.id)) return 11;
  if (unit.type === "action" && ["last_resonator"].includes(unit.id)) return 12;
  if (unit.type === "action" && unit.ref && unit.ref.category === "destroy") return 15;
  // fallback
  return 20;
}

function isActionAllowedByContext(action, context) {
  switch (action.id) {
    case "destroy_resonator":
      return context.canDestroyReso;
    case "destroy_mod":
      return context.canDestroyReso;
    case "destroy_link":
      return context.canDestroyLink;
    case "destroy_field":
      return context.canDestroyField;

    case "hack_faction":
    case "hack_enemy":
      return context.canHack;

    case "recharge_near":
    case "recharge_far":
      return context.canRecharge;

    case "upload_scan":
      return context.canScan;

    case "deploy_beacon":
    case "deploy_firework":
      return context.canUseBeacons;

    case "deploy_frakker":
      return context.canUseFrackers;

    case "capture_portal":
      return context.canCapture;

    case "capture_machina":
      return context.canMachina;

    case "create_link":
      return context.canLink;
    case "create_field":
      return context.canField;

    default:
      return true;
  }
}

function findEquivalenceGroupForAction(actionId) {
  if (!AP_EQUIVALENCE_GROUPS) return null;
  for (const group of AP_EQUIVALENCE_GROUPS) {
    if (group.members.includes(actionId)) {
      return group;
    }
  }
  return null;
}

function renderContextOptions() {
  const container = document.getElementById("contextOptionsContainer");
  if (!container) return;

  container.innerHTML = "";

  CONTEXT_OPTIONS.forEach(opt => {
    const label = document.createElement("label");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.classList.add("context-checkbox");
    cb.dataset.id = opt.id;
    cb.checked = opt.default;

    const span = document.createElement("span");
    span.textContent = opt.label;

    label.append(cb, span);
    container.appendChild(label);
  });
}

// Escolher packs utilizáveis com base no contexto
function getUsablePacks(context) {
  return AP_PACKS.filter(pack => {
    if (pack.category === "build" && !context.canCapture) return false;
    if (pack.category === "field" && (!context.canField || !context.canLink)) return false;
    return true;
  }).sort((a, b) => a.priority - b.priority);
}

// Planner automático: tenta resolver delta AP com packs + ações
function suggestPlan(currentAP, targetAP, context) {
  const delta = targetAP - currentAP;

  if (!targetAP || delta <= 0) {
    return {
      delta,
      exact: false,
      items: [],
      message: "Set a higher target AP.",
      totalAPFromPlan: 0,
      finalAP: currentAP,
    };
  }

  const eventProfile = getSelectedEventProfile();
  const apexActive = isApexActive();

  const usablePacks = getUsablePacks(context);
  const units = [];

  // Packs
  usablePacks.forEach(pack => {
    units.push({
      type: "pack",
      id: pack.id,
      label: pack.label,
      ap: computePackAPWithEvents(pack, eventProfile, apexActive),
      ref: pack,
    });
  });

  // Ações básicas (com equivalência)
  const addedActionIds = new Set();

  AP_ACTIONS.forEach(action => {
    if (!action.visible) return;
    if (!isActionAllowedByContext(action, context)) return;

    // Ver se esta ação pertence a um grupo de equivalência
    const group = findEquivalenceGroupForAction(action.id);

    if (group) {
      // Se já adicionámos este grupo como unidade, não adicionar de novo
      if (addedActionIds.has(group.id)) return;

      // Escolher um representante válido
      const representative = group.members
        .map(id => AP_ACTIONS.find(a => a.id === id))
        .find(a => a && a.visible && isActionAllowedByContext(a, context));

      if (!representative) return;

      units.push({
        type: "equiv-group",
        id: group.id,
        label: group.label,
        ap: getEffectiveActionAP(representative.id, eventProfile, apexActive),
        ref: group,
      });

      addedActionIds.add(group.id);
    } else {
      // Ação normal (não pertencente a grupo)
      units.push({
        type: "action",
        id: action.id,
        label: action.label,
        ap: getEffectiveActionAP(action.id, eventProfile, apexActive),
        ref: action,
      });
    }
  });

  // Ordenar unidades por prioridade + AP para orientar a busca
  const sortedUnits = units.slice().sort((a, b) => {
    const pa = a.ref && typeof a.ref.priority === "number" ? a.ref.priority : 5;
    const pb = b.ref && typeof b.ref.priority === "number" ? b.ref.priority : 5;
    if (pa !== pb) return pa - pb;
    return b.ap - a.ap;
  });

  const solutions = searchExactPlan(delta, sortedUnits, 50);

  if (solutions.length === 0) {
    return {
      delta,
      exact: false,
      items: [],
      message: `No exact plan found with available units and context (delta ${delta.toLocaleString()} AP).`,
      totalAPFromPlan: 0,
      finalAP: currentAP,
    };
  }

  // Escolher solução com score mínimo
  solutions.sort((a, b) => a.score - b.score);
  const best = solutions[0];

  const totalAPFromPlan = delta; // por definição, é exacto
  const finalAP = currentAP + totalAPFromPlan;

  return {
    delta,
    exact: true,
    items: best.items,
    message:
      `Exact plan found (score ${best.score}). Current AP: ${currentAP.toLocaleString()}, ` +
      `Target AP: ${targetAP.toLocaleString()}, Plan AP: ${totalAPFromPlan.toLocaleString()}.`,
    totalAPFromPlan,
    finalAP,
  };
}

// Busca exata com DFS + poda
function searchExactPlan(delta, units, maxSolutions = 100) {
  const solutions = [];
  const n = units.length;

  function maxCountForUnit(unit, remainingDelta) {
    return Math.min(20, Math.floor(remainingDelta / unit.ap));
  }

  function dfs(index, remainingDelta, currentItems, currentScore) {
    if (remainingDelta === 0) {
      solutions.push({
        items: currentItems.slice(),
        score: currentScore,
      });
      return solutions.length >= maxSolutions;
    }

    if (index >= n) {
      return false;
    }

    const unit = units[index];
    const maxCount = maxCountForUnit(unit, remainingDelta);

    for (let count = maxCount; count >= 0; count--) {
      const apUsed = count * unit.ap;
      const newRemaining = remainingDelta - apUsed;
      if (newRemaining < 0) continue;

      if (count > 0) {
        currentItems.push({
          type: unit.type,
          id: unit.id,
          label: unit.label,
          ap: unit.ap,
          count,
          totalAP: apUsed,
        });
      }

      const newScore = currentScore + count * unitWeight(unit);

      const maxAPRemaining = units
        .slice(index + 1)
        .reduce((sum, u) => sum + maxCountForUnit(u, newRemaining) * u.ap, 0);

      if (maxAPRemaining >= newRemaining) {
        const stop = dfs(index + 1, newRemaining, currentItems, newScore);
        if (stop) return true;
      }

      if (count > 0) {
        currentItems.pop();
      }
    }

    return false;
  }

  dfs(0, delta, [], 0);

  return solutions;
}

function renderAutoPlan(plan) {
  const tbody = document.getElementById("autoPlanBody");
  const summaryEl = document.getElementById("autoPlanSummary");

  if (!tbody || !summaryEl) return;

  tbody.innerHTML = "";
  summaryEl.textContent = plan.message || "";

  if (plan.items && plan.items.length > 0) {
    plan.items.forEach(item => {
      const tr = document.createElement("tr");

      const typeTd = document.createElement("td");
      if (item.type === "pack") {
        typeTd.textContent = "Pack";
      } else if (item.type === "equiv-group") {
        typeTd.textContent = "Equivalent actions";
      } else {
        typeTd.textContent = "Action";
      }

      const labelTd = document.createElement("td");
      if (item.type === "equiv-group") {
        const group = AP_EQUIVALENCE_GROUPS.find(g => g.id === item.id);
        if (group) {
          const membersLabels = group.members
            .map(id => {
              const a = AP_ACTIONS.find(action => action.id === id);
              return a ? a.label : id;
            })
            .join(" / ");
          labelTd.textContent = membersLabels;
        } else {
          labelTd.textContent = item.label;
        }
      } else {
        labelTd.textContent = item.label;
      }

      const apTd = document.createElement("td");
      apTd.textContent = item.ap;

      const qtyTd = document.createElement("td");
      qtyTd.textContent = item.count;

      const totalTd = document.createElement("td");
      totalTd.textContent = item.totalAP;

      tr.append(typeTd, labelTd, apTd, qtyTd, totalTd);
      tbody.appendChild(tr);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderContextOptions();

  const autoPlanBtn = document.getElementById("autoPlanBtn");
  if (autoPlanBtn) {
    autoPlanBtn.addEventListener("click", () => {
      const currentAP = Number(document.getElementById("currentAP").value || 0);
      const targetAP = Number(document.getElementById("targetAP").value || 0);
      const context = buildContextFromUI();

      const plan = suggestPlan(currentAP, targetAP, context);
      renderAutoPlan(plan);
    });
  }
});