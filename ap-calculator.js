// ap-calculator.js

function renderActionsTable() {
  const tbody = document.getElementById("apActionsBody");
  tbody.innerHTML = "";

  // Primeiro os packs, depois as ações unitárias
  AP_PACKS.forEach(pack => {
    if (!pack.visible) return;
    const totalAP = computePackAP(pack);

    const tr = document.createElement("tr");
    tr.classList.add("pack-row");

    const useTd = document.createElement("td");
    const useCheckbox = document.createElement("input");
    useCheckbox.type = "checkbox";
    useCheckbox.checked = true;
    useCheckbox.classList.add("use-item");
    useCheckbox.dataset.type = "pack";
    useCheckbox.dataset.id = pack.id;
    useTd.appendChild(useCheckbox);

    const labelTd = document.createElement("td");
    labelTd.textContent = pack.label;

    const apTd = document.createElement("td");
    apTd.textContent = totalAP;

    const qtyTd = document.createElement("td");
    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.min = "0";
    qtyInput.value = "0";
    qtyInput.classList.add("qty-input");
    qtyInput.dataset.type = "pack";
    qtyInput.dataset.id = pack.id;
    qtyTd.appendChild(qtyInput);

    const totalTd = document.createElement("td");
    totalTd.textContent = "0";
    totalTd.dataset.type = "pack";
    totalTd.dataset.id = pack.id;
    totalTd.classList.add("total-ap");

    tr.append(useTd, labelTd, apTd, qtyTd, totalTd);
    tbody.appendChild(tr);
  });

  // Depois as ações unitárias
  AP_ACTIONS.forEach(action => {
    if (!action.visible) return;
    const tr = document.createElement("tr");

    const useTd = document.createElement("td");
    const useCheckbox = document.createElement("input");
    useCheckbox.type = "checkbox";
    useCheckbox.checked = true;
    useCheckbox.classList.add("use-item");
    useCheckbox.dataset.type = "action";
    useCheckbox.dataset.id = action.id;
    useTd.appendChild(useCheckbox);

    const labelTd = document.createElement("td");
    labelTd.textContent = action.label;

    // Ícone de aviso, se houver warning configurado
    if (action.warning) {
      const warnSpan = document.createElement("span");
      warnSpan.classList.add("warning-icon");
      warnSpan.textContent = "⚠"; // podes trocar por outro símbolo

      const tooltipDiv = document.createElement("div");
      tooltipDiv.classList.add("warning-tooltip");
      tooltipDiv.textContent = action.warningMessage || "Check the conditions for this action.";

      warnSpan.appendChild(tooltipDiv);
      labelTd.appendChild(warnSpan);
    }

    const apTd = document.createElement("td");
    apTd.textContent = action.ap;

    const qtyTd = document.createElement("td");
    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.min = "0";
    qtyInput.value = "0";
    qtyInput.classList.add("qty-input");
    qtyInput.dataset.type = "action";
    qtyInput.dataset.id = action.id;
    qtyTd.appendChild(qtyInput);

    const totalTd = document.createElement("td");
    totalTd.textContent = "0";
    totalTd.dataset.type = "action";
    totalTd.dataset.id = action.id;
    totalTd.classList.add("total-ap");

    tr.append(useTd, labelTd, apTd, qtyTd, totalTd);
    tbody.appendChild(tr);
  });
}

function recalcAP() {
  const currentAP = Number(document.getElementById("currentAP").value || 0);
  const targetAP = Number(document.getElementById("targetAP").value || 0);

  let totalAPFromPacks = 0;
  let totalAPFromActions = 0;

  // Packs
  AP_PACKS.forEach(pack => {
    const useCheckbox = document.querySelector(`.use-item[data-type="pack"][data-id="${pack.id}"]`);
    const qtyInput = document.querySelector(`.qty-input[data-type="pack"][data-id="${pack.id}"]`);
    const totalTd = document.querySelector(`.total-ap[data-type="pack"][data-id="${pack.id}"]`);

    const qty = useCheckbox && useCheckbox.checked ? Number(qtyInput.value || 0) : 0;
    const packAP = computePackAP(pack);
    const totalAP = qty * packAP;

    totalAPFromPacks += totalAP;
    totalTd.textContent = totalAP;
  });

  // Ações unitárias
  AP_ACTIONS.forEach(action => {
    const useCheckbox = document.querySelector(`.use-item[data-type="action"][data-id="${action.id}"]`);
    const qtyInput = document.querySelector(`.qty-input[data-type="action"][data-id="${action.id}"]`);
    const totalTd = document.querySelector(`.total-ap[data-type="action"][data-id="${action.id}"]`);

    const qty = useCheckbox && useCheckbox.checked ? Number(qtyInput.value || 0) : 0;
    const totalAP = qty * action.ap;

    totalAPFromActions += totalAP;
    totalTd.textContent = totalAP;
  });

  const totalAPFromAll = totalAPFromPacks + totalAPFromActions;
  const finalAP = currentAP + totalAPFromAll;
  const deltaToTarget = targetAP ? finalAP - targetAP : 0;

  const summaryEl = document.getElementById("apSummary");

  if (!targetAP) {
    summaryEl.textContent =
      `Total AP from actions: ${totalAPFromAll.toLocaleString()} (Final AP: ${finalAP.toLocaleString()}).`;
    summaryEl.className = "status";
  } else if (deltaToTarget === 0) {
    summaryEl.textContent =
      `Exact match! Final AP: ${finalAP.toLocaleString()} (Target: ${targetAP.toLocaleString()}).`;
    summaryEl.className = "status";
  } else if (deltaToTarget > 0) {
    summaryEl.textContent =
      `Over target by ${deltaToTarget.toLocaleString()} AP (Final: ${finalAP.toLocaleString()}, Target: ${targetAP.toLocaleString()}).`;
    summaryEl.className = "status error";
  } else {
    summaryEl.textContent =
      `Under target by ${Math.abs(deltaToTarget).toLocaleString()} AP (Final: ${finalAP.toLocaleString()}, Target: ${targetAP.toLocaleString()}).`;
    summaryEl.className = "status error";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderActionsTable();

  document.getElementById("currentAP").addEventListener("input", recalcAP);
  document.getElementById("targetAP").addEventListener("input", recalcAP);

  document.addEventListener("input", event => {
    if (
      event.target.classList.contains("qty-input") ||
      event.target.classList.contains("use-item")
    ) {
      recalcAP();
    }
  });

  document.addEventListener("click", event => {
  if (event.target.classList.contains("warning-icon")) {
    const tooltip = event.target.querySelector(".warning-tooltip");
    if (!tooltip) return;

    const isVisible = tooltip.style.display === "block";
    tooltip.style.display = isVisible ? "none" : "block";
  } else {
    // clicar fora fecha todos os tooltips
    document.querySelectorAll(".warning-tooltip").forEach(tt => {
      tt.style.display = "none";
    });
  }
});
});

