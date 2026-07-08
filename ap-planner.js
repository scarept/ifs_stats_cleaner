// ap-planner.js

function unitWeight(unit) {
  // unit.type: "pack" ou "action"
  // unit.ref.category / unit.ref.priority: aquilo que já tens
  if (unit.type === "pack" && unit.ref.category === "build") return 1;
  if (unit.type === "action" && ["create_link", "create_field"].includes(unit.id)) return 2;
  if (unit.type === "pack" && unit.ref.category === "field") return 3;
  if (unit.type === "action" && ["hack_faction"].includes(unit.id)) return 4;
  if (unit.type === "action" && ["hack_enemy"].includes(unit.id)) return 5;
  if (unit.type === "action" && unit.id.startsWith("recharge")) return 6;
  
  if (unit.type === "action" && unit.ref && unit.ref.category === "destroy") return 10;
  // fallback
  return 7;
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
    case "capture_machina":
      return context.canCapture;

    case "create_link":
      return context.canLink;
    case "create_field":
      return context.canField;

    default:
      return true;
  }
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

// Função utilitária: AP total de um pack
function getPackAP(pack) {
  return computePackAP(pack);
}

// Escolher packs utilizáveis com base no contexto
function getUsablePacks(context) {
  return AP_PACKS.filter(pack => {
    // Podemos usar lógica mais fina mais tarde.
    // Por agora: se for categoria "build", precisa de canCapture.
    if (pack.category === "build" && !context.canCapture) return false;
    if (pack.category === "field" && (!context.canField || !context.canLink)) return false;
    // Podemos adicionar outras regras aqui.
    return true;
  }).sort((a, b) => a.priority - b.priority);
}

// Modo simples: tentar resolver delta AP com packs + ações básicas (hacks) 
function suggestPlan(currentAP, targetAP, context) {
  const delta = targetAP - currentAP;

  if (!targetAP || delta <= 0) {
    return { delta, exact: false, items: [], message: "Set a higher target AP.", totalAPFromPlan: 0, finalAP: currentAP };
  }

  const usablePacks = getUsablePacks(context);
  const units = [];

  usablePacks.forEach(pack => {
    units.push({
      type: "pack",
      id: pack.id,
      label: pack.label,
      ap: getPackAP(pack),
      ref: pack,
    });
  });

  // adicionar ações básicas (hack, recharge, etc.) como unidades
  AP_ACTIONS.forEach(action => {  
    if (!action.visible) return;

    if (!isActionAllowedByContext(action, context)) return;

    units.push({
        type: "action",
        id: action.id,
        label: action.label,
        ap: action.ap,
        ref: action,
    });
    });

  // Ordenar por priority + ap como antes, para dar ordem de exploração
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

function searchExactPlan(delta, units, maxSolutions = 100) {
  const solutions = [];
  const n = units.length;

  // Limites de contagem por unidade (podes ajustar por tipo)
  function maxCountForUnit(unit, remainingDelta) {
    return Math.min(20, Math.floor(remainingDelta / unit.ap)); // por ex. máximo 20 de cada
  }

  function dfs(index, remainingDelta, currentItems, currentScore) {
    if (remainingDelta === 0) {
      // Encontrámos plano exato
      solutions.push({
        items: currentItems.slice(),
        score: currentScore,
      });
      return solutions.length >= maxSolutions; // parar se já temos muitos
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

      // Atualizar itens
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

      // Poda simples: se newRemaining > 0 mas não há AP suficiente nos restantes para resolver
      const maxAPRemaining = units
        .slice(index + 1)
        .reduce((sum, u) => sum + maxCountForUnit(u, newRemaining) * u.ap, 0);
      if (maxAPRemaining >= newRemaining) {
        const stop = dfs(index + 1, newRemaining, currentItems, newScore);
        if (stop) return true;
      }

      // backtrack
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
      typeTd.textContent = item.type === "pack" ? "Pack" : "Action";

      const labelTd = document.createElement("td");
      labelTd.textContent = item.label;

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
  // Renderizar opções de contexto
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