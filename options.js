const storage = chrome.storage.sync;
const SETTINGS_KEY = "redirectRules";

const RESOURCE_TYPES = [
  ["main_frame", "Main window (address bar)"],
  ["sub_frame", "IFrames"],
  ["stylesheet", "Stylesheets"],
  ["script", "Scripts"],
  ["image", "Images"],
  ["xmlhttprequest", "XMLHttpRequest (Ajax/fetch)"],
  ["font", "Fonts"],
  ["media", "Media"],
  ["websocket", "WebSocket"],
  ["other", "Other"]
];

const defaultResourceTypes = ["main_frame", "sub_frame", "xmlhttprequest"];

const form = document.getElementById("rule-form");
const rulesList = document.getElementById("rules-list");
const emptyState = document.getElementById("empty-state");
const statusEl = document.getElementById("status");
const resetButton = document.getElementById("reset-form");
const resourceTypesContainer = document.getElementById("resource-types");

let rules = [];
let editingIndex = -1;

function renderResourceCheckboxes() {
  resourceTypesContainer.innerHTML = "";

  RESOURCE_TYPES.forEach(([value, label]) => {
    const wrapper = document.createElement("label");
    wrapper.className = "inline";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = value;
    checkbox.name = "resourceTypes";

    if (defaultResourceTypes.includes(value)) {
      checkbox.checked = true;
    }

    wrapper.appendChild(checkbox);
    wrapper.append(label);
    resourceTypesContainer.appendChild(wrapper);
  });
}

function getSelectedResourceTypes() {
  return [...document.querySelectorAll('input[name="resourceTypes"]:checked')].map(
    (element) => element.value
  );
}

function setSelectedResourceTypes(values) {
  const selected = new Set(values);
  document.querySelectorAll('input[name="resourceTypes"]').forEach((element) => {
    element.checked = selected.has(element.value);
  });
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b42318" : "#067647";
}

function sanitizeRuleFromForm() {
  return {
    enabled: document.getElementById("enabled").checked,
    description: document.getElementById("description").value.trim(),
    exampleUrl: document.getElementById("exampleUrl").value.trim(),
    includePattern: document.getElementById("includePattern").value.trim(),
    redirectTo: document.getElementById("redirectTo").value.trim(),
    patternType: document.getElementById("patternType").value,
    excludePattern: document.getElementById("excludePattern").value.trim(),
    resourceTypes: getSelectedResourceTypes()
  };
}

function validateRule(rule) {
  if (!rule.description || !rule.includePattern || !rule.redirectTo) {
    return "Description, include pattern, and redirect target are required.";
  }

  if (rule.resourceTypes.length === 0) {
    return "Select at least one resource type.";
  }

  if (rule.patternType === "regex") {
    try {
      new RegExp(rule.includePattern);
      if (rule.excludePattern) {
        new RegExp(rule.excludePattern);
      }
    } catch {
      return "Invalid regular expression in include/exclude pattern.";
    }
  }

  return "";
}

function resetForm() {
  form.reset();
  setSelectedResourceTypes(defaultResourceTypes);
  document.getElementById("enabled").checked = true;
  editingIndex = -1;
}

function fillForm(rule, index) {
  editingIndex = index;
  document.getElementById("enabled").checked = rule.enabled;
  document.getElementById("description").value = rule.description;
  document.getElementById("exampleUrl").value = rule.exampleUrl || "";
  document.getElementById("includePattern").value = rule.includePattern;
  document.getElementById("redirectTo").value = rule.redirectTo;
  document.getElementById("patternType").value = rule.patternType;
  document.getElementById("excludePattern").value = rule.excludePattern || "";
  setSelectedResourceTypes(rule.resourceTypes || defaultResourceTypes);
  showStatus(`Editing rule: ${rule.description}`);
}

async function saveRules() {
  await storage.set({ [SETTINGS_KEY]: rules });
}

function renderRules() {
  rulesList.innerHTML = "";
  emptyState.style.display = rules.length === 0 ? "block" : "none";

  rules.forEach((rule, index) => {
    const item = document.createElement("li");

    const header = document.createElement("div");
    header.className = "rule-header";
    header.innerHTML = `<span>${rule.description}</span><span>${rule.enabled ? "Enabled" : "Disabled"}</span>`;

    const details = document.createElement("div");
    details.className = "rule-details";
    details.innerHTML = `
      <div><strong>Type:</strong> ${rule.patternType}</div>
      <div><strong>Include:</strong> ${rule.includePattern}</div>
      <div><strong>Redirect:</strong> ${rule.redirectTo}</div>
      ${rule.excludePattern ? `<div><strong>Exclude:</strong> ${rule.excludePattern}</div>` : ""}
      <div><strong>Apply to:</strong> ${rule.resourceTypes.join(", ")}</div>
    `;

    const actions = document.createElement("div");
    actions.className = "rule-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.className = "secondary";
    editButton.addEventListener("click", () => fillForm(rule, index));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", async () => {
      rules.splice(index, 1);
      await saveRules();
      renderRules();
      showStatus("Rule deleted.");
      if (editingIndex === index) {
        resetForm();
      }
    });

    actions.append(editButton, deleteButton);
    item.append(header, details, actions);
    rulesList.append(item);
  });
}

async function loadRules() {
  const result = await storage.get(SETTINGS_KEY);
  rules = Array.isArray(result[SETTINGS_KEY]) ? result[SETTINGS_KEY] : [];
  renderRules();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const rule = sanitizeRuleFromForm();

  const validationError = validateRule(rule);
  if (validationError) {
    showStatus(validationError, true);
    return;
  }

  if (editingIndex >= 0) {
    rules[editingIndex] = rule;
    showStatus("Rule updated.");
  } else {
    rules.push(rule);
    showStatus("Rule added.");
  }

  await saveRules();
  renderRules();
  resetForm();
});

resetButton.addEventListener("click", resetForm);

renderResourceCheckboxes();
loadRules();
