const storage = chrome.storage.sync;
const dnr = chrome.declarativeNetRequest;

const DEFAULT_RULE = {
  enabled: true,
  description: "Old innersource URL to new GitLab",
  exampleUrl:
    "https://innersource.example.com/group/project/-/tree/main/path/to/folder",
  includePattern: "https://innersource.example.com/(.*)",
  redirectTo: "https://gitlab.example.com/$1",
  patternType: "regex",
  excludePattern: "",
  resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest"]
};

const SETTINGS_KEY = "redirectRules";

function wildcardToRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return `^${escaped}$`;
}

function nextRuleId(index) {
  return 1000 + index;
}

function normalizeResourceTypes(resourceTypes) {
  if (!Array.isArray(resourceTypes) || resourceTypes.length === 0) {
    return ["main_frame", "sub_frame", "xmlhttprequest"];
  }

  const supportedTypes = new Set([
    "main_frame",
    "sub_frame",
    "stylesheet",
    "script",
    "image",
    "font",
    "object",
    "xmlhttprequest",
    "ping",
    "csp_report",
    "media",
    "websocket",
    "webtransport",
    "webbundle",
    "other"
  ]);

  return resourceTypes.filter((type) => supportedTypes.has(type));
}

function toDnrRule(rule, index) {
  const regexFilter =
    rule.patternType === "wildcard"
      ? wildcardToRegex(rule.includePattern)
      : rule.includePattern;

  const condition = {
    regexFilter,
    resourceTypes: normalizeResourceTypes(rule.resourceTypes)
  };

  if (rule.excludePattern) {
    condition.excludedRegexFilter =
      rule.patternType === "wildcard"
        ? wildcardToRegex(rule.excludePattern)
        : rule.excludePattern;
  }

  return {
    id: nextRuleId(index),
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        regexSubstitution: rule.redirectTo
      }
    },
    condition
  };
}

async function getConfiguredRules() {
  const result = await storage.get(SETTINGS_KEY);
  const rules = result[SETTINGS_KEY];

  if (Array.isArray(rules) && rules.length > 0) {
    return rules;
  }

  return [DEFAULT_RULE];
}

async function storeDefaultRuleIfMissing() {
  const result = await storage.get(SETTINGS_KEY);
  if (!Array.isArray(result[SETTINGS_KEY]) || result[SETTINGS_KEY].length === 0) {
    await storage.set({ [SETTINGS_KEY]: [DEFAULT_RULE] });
  }
}

async function syncDynamicRules() {
  const allConfiguredRules = await getConfiguredRules();
  const activeRules = allConfiguredRules.filter((rule) => rule.enabled);
  const dynamicRules = activeRules.map((rule, index) => toDnrRule(rule, index));

  const existing = await dnr.getDynamicRules();
  const removeRuleIds = existing.map((rule) => rule.id);

  await dnr.updateDynamicRules({
    removeRuleIds,
    addRules: dynamicRules
  });
}

function safeSyncDynamicRules() {
  syncDynamicRules().catch(async (error) => {
    console.error("Failed to update redirect rules", error);
    await dnr.updateDynamicRules({
      removeRuleIds: (await dnr.getDynamicRules()).map((rule) => rule.id)
    });
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  await storeDefaultRuleIfMissing();
  safeSyncDynamicRules();
});

chrome.runtime.onStartup.addListener(() => {
  safeSyncDynamicRules();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes[SETTINGS_KEY]) {
    safeSyncDynamicRules();
  }
});
