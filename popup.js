const enabledInput = document.getElementById("enabled");
const targetLanguageSelect = document.getElementById("targetLanguage");
const ttsEnabledInput = document.getElementById("ttsEnabled");
const grammarHintsEnabledInput = document.getElementById("grammarHintsEnabled");
const resultDisplayModeSelect = document.getElementById("resultDisplayMode");
const openOptionsButton = document.getElementById("openOptions");
const statusNode = document.getElementById("status");
const DEFAULT_THEME_COLOR = "#2563EB";
const I18N = {
  "zh-CN": {
    heroTitle: "网页划词翻译",
    heroTabPrimary: "翻译",
    heroTabSecondary: "语法",
    heroChipModeInline: "默认页内",
    heroChipModeSplit: "分隔模式",
    heroChipGrammarOn: "语法已启用",
    heroChipGrammarOff: "语法已关闭",
    heroSummaryInline: "默认页内显示翻译与语法提示。",
    heroSummarySplit: "在右侧分隔面板显示结果。",
    labelEnabled: "启用划词翻译",
    labelTargetLanguage: "目标语言",
    labelTtsEnabled: "启用 TTS 播报",
    labelGrammarHints: "启用语法提示",
    labelResultDisplayMode: "结果展示方式",
    openOptions: "打开高级设置",
    saveSuccess: "设置已保存",
    saveError: "保存失败",
    loadError: "读取配置失败",
    inlineMode: "页内模式",
    splitMode: "分隔模式"
  },
  en: {
    heroTitle: "Select to Translate",
    heroTabPrimary: "Translating",
    heroTabSecondary: "Grammar",
    heroChipModeInline: "Inline first",
    heroChipModeSplit: "Split panel",
    heroChipGrammarOn: "Grammar on",
    heroChipGrammarOff: "Grammar off",
    heroSummaryInline: "Show translation and grammar inline.",
    heroSummarySplit: "Show results in the right split panel.",
    labelEnabled: "Enable Selection Translate",
    labelTargetLanguage: "Target Language",
    labelTtsEnabled: "Enable TTS",
    labelGrammarHints: "Enable Grammar Hints",
    labelResultDisplayMode: "Result Display Mode",
    openOptions: "Open Advanced Settings",
    saveSuccess: "Settings saved",
    saveError: "Save failed",
    loadError: "Failed to load settings",
    inlineMode: "Inline Mode",
    splitMode: "Split Mode"
  }
};

initialize();

async function initialize() {
  const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  if (!response?.ok) {
    statusNode.textContent = I18N["zh-CN"].loadError;
    return;
  }

  const settings = response.data;
  applyThemeColor(settings.themeColor || settings.themePreset || DEFAULT_THEME_COLOR);
  applyLanguage(settings.uiLanguage || "zh-CN");
  enabledInput.checked = Boolean(settings.enabled);
  targetLanguageSelect.value = settings.targetLanguage || "zh-CN";
  ttsEnabledInput.checked = Boolean(settings.ttsEnabled);
  grammarHintsEnabledInput.checked = Boolean(settings.grammarHintsEnabled);
  resultDisplayModeSelect.value = settings.resultDisplayMode === "split" ? "split" : "inline";
  syncHeroState();

  enabledInput.addEventListener("change", persist);
  targetLanguageSelect.addEventListener("change", persist);
  ttsEnabledInput.addEventListener("change", persist);
  grammarHintsEnabledInput.addEventListener("change", () => {
    syncHeroState();
    void persist();
  });
  resultDisplayModeSelect.addEventListener("change", () => {
    syncHeroState();
    void persist();
  });
  openOptionsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") {
      return;
    }
    if ("themeColor" in changes || "themePreset" in changes) {
      applyThemeColor(changes.themeColor?.newValue || changes.themePreset?.newValue || DEFAULT_THEME_COLOR);
    }
    if ("uiLanguage" in changes) {
      applyLanguage(changes.uiLanguage.newValue || "zh-CN");
    }
    if ("grammarHintsEnabled" in changes) {
      grammarHintsEnabledInput.checked = Boolean(changes.grammarHintsEnabled.newValue);
      syncHeroState();
    }
    if ("resultDisplayMode" in changes) {
      resultDisplayModeSelect.value = changes.resultDisplayMode.newValue === "split" ? "split" : "inline";
      syncHeroState();
    }
  });
}

async function persist() {
  const response = await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    payload: {
      enabled: enabledInput.checked,
      targetLanguage: targetLanguageSelect.value,
      ttsEnabled: ttsEnabledInput.checked,
      grammarHintsEnabled: grammarHintsEnabledInput.checked,
      resultDisplayMode: resultDisplayModeSelect.value
    }
  });

  statusNode.textContent = response?.ok ? getCopy("saveSuccess") : getCopy("saveError");
}

function getCopy(key) {
  const lang = document.documentElement.lang === "en" ? "en" : "zh-CN";
  return I18N[lang]?.[key] || I18N["zh-CN"][key] || "";
}

function applyLanguage(language) {
  const lang = language === "en" ? "en" : "zh-CN";
  const copy = I18N[lang];
  document.documentElement.lang = lang;
  setText("heroTitle", copy.heroTitle);
  setText("heroTabPrimary", copy.heroTabPrimary);
  setText("heroTabSecondary", copy.heroTabSecondary);
  setText("labelEnabled", copy.labelEnabled);
  setText("labelTargetLanguage", copy.labelTargetLanguage);
  setText("labelTtsEnabled", copy.labelTtsEnabled);
  setText("labelGrammarHints", copy.labelGrammarHints);
  setText("labelResultDisplayMode", copy.labelResultDisplayMode);
  setText("openOptions", copy.openOptions);
  syncHeroState();
  const modeOptions = resultDisplayModeSelect.options;
  if (modeOptions.length >= 2) {
    modeOptions[0].textContent = copy.inlineMode;
    modeOptions[1].textContent = copy.splitMode;
  }
}

function syncHeroState() {
  const copy = I18N[document.documentElement.lang === "en" ? "en" : "zh-CN"];
  setText(
    "heroChipMode",
    resultDisplayModeSelect.value === "split" ? copy.heroChipModeSplit : copy.heroChipModeInline
  );
  setText(
    "heroChipGrammar",
    grammarHintsEnabledInput.checked ? copy.heroChipGrammarOn : copy.heroChipGrammarOff
  );
  setText(
    "heroSummary",
    resultDisplayModeSelect.value === "split" ? copy.heroSummarySplit : copy.heroSummaryInline
  );
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = value;
  }
}

function normalizeThemeColor(value) {
  const normalized = String(value || "").trim().toUpperCase();
  const legacyMap = {
    ocean: "#2563EB",
    forest: "#15803D",
    sunset: "#EA580C",
    rose: "#E11D48"
  };
  if (normalized.toLowerCase() in legacyMap) {
    return legacyMap[normalized.toLowerCase()];
  }
  if (/^#[0-9A-F]{6}$/.test(normalized)) {
    return normalized;
  }
  return DEFAULT_THEME_COLOR;
}

function hexToRgb(hexColor) {
  const normalized = normalizeThemeColor(hexColor);
  const value = normalized.slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function mixChannel(base, target, ratio) {
  return Math.round(base + (target - base) * ratio);
}

function toRgbaString(rgb, alpha) {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function toHex(value) {
  return value.toString(16).padStart(2, "0").toUpperCase();
}

function adjustColor(hexColor, ratio, target) {
  const rgb = hexToRgb(hexColor);
  const next = {
    r: mixChannel(rgb.r, target, ratio),
    g: mixChannel(rgb.g, target, ratio),
    b: mixChannel(rgb.b, target, ratio)
  };
  return `#${toHex(next.r)}${toHex(next.g)}${toHex(next.b)}`;
}

function applyThemeColor(color) {
  const normalized = normalizeThemeColor(color);
  const rgb = hexToRgb(normalized);
  const root = document.documentElement;
  root.style.setProperty("--bg", adjustColor(normalized, 0.9, 255));
  root.style.setProperty("--line", toRgbaString(rgb, 0.18));
  root.style.setProperty("--accent", normalized);
  root.style.setProperty("--accent-strong", adjustColor(normalized, 0.18, 0));
  root.style.setProperty("--accent-glow", toRgbaString(rgb, 0.28));
}
