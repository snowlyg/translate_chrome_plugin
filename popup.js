const targetLanguageSelect = document.getElementById("targetLanguage");
const ttsEnabledInput = document.getElementById("ttsEnabled");
const grammarHintsEnabledInput = document.getElementById("grammarHintsEnabled");
const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));
const themeButtons = Array.from(document.querySelectorAll("[data-theme-color]"));
const openOptionsButton = document.getElementById("openOptions");
const statusNode = document.getElementById("status");
const DEFAULT_THEME_COLOR = "#2563EB";
const I18N = {
  "zh-CN": {
    heroTitle: "网页划词翻译",
    heroTabPrimary: "翻译",
    heroTabSecondary: "语法",
    heroChipModeInline: "默认页内",
    heroChipModeSplit: "默认侧边",
    heroChipGrammarOn: "语法已启用",
    heroChipGrammarOff: "语法已关闭",
    heroSummaryInline: "默认页内显示翻译与语法提示。",
    heroSummarySplit: "默认在右侧侧边面板显示结果。",
    labelThemeColor: "主题配色",
    labelTargetLanguage: "目标语言",
    labelResultDisplayMode: "结果展示方式",
    modeSplit: "侧边模式",
    modeInline: "页内模式",
    labelTtsEnabled: "启用 TTS 播报",
    labelGrammarHints: "启用语法提示",
    openOptions: "打开高级设置",
    saveSuccess: "设置已保存",
    saveError: "保存失败",
    loadError: "读取配置失败",
    splitMode: "分隔模式"
  },
  en: {
    heroTitle: "Select to Translate",
    heroTabPrimary: "Translating",
    heroTabSecondary: "Grammar",
    heroChipModeInline: "Inline first",
    heroChipModeSplit: "Side panel",
    heroChipGrammarOn: "Grammar on",
    heroChipGrammarOff: "Grammar off",
    heroSummaryInline: "Show translation and grammar inline.",
    heroSummarySplit: "Show results in the right side panel by default.",
    labelThemeColor: "Theme",
    labelTargetLanguage: "Target Language",
    labelResultDisplayMode: "Result Display Mode",
    modeSplit: "Side Panel",
    modeInline: "Inline",
    labelTtsEnabled: "Enable TTS",
    labelGrammarHints: "Enable Grammar Hints",
    openOptions: "Open Advanced Settings",
    saveSuccess: "Settings saved",
    saveError: "Save failed",
    loadError: "Failed to load settings",
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
  const themeColor = normalizeThemeColor(settings.themeColor || settings.themePreset || DEFAULT_THEME_COLOR);
  applyThemeColor(themeColor);
  applyLanguage(settings.uiLanguage || "zh-CN");
  syncThemeButtons(themeColor);
  targetLanguageSelect.value = settings.targetLanguage || "zh-CN";
  ttsEnabledInput.checked = Boolean(settings.ttsEnabled);
  grammarHintsEnabledInput.checked = Boolean(settings.grammarHintsEnabled);
  syncDisplayMode(settings.resultDisplayMode === "inline" ? "inline" : "split");

  targetLanguageSelect.addEventListener("change", persist);
  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const themeColor = normalizeThemeColor(button.dataset.themeColor);
      applyThemeColor(themeColor);
      syncThemeButtons(themeColor);
      void persist();
    });
  });
  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      syncDisplayMode(button.dataset.mode === "inline" ? "inline" : "split");
      void persist();
    });
  });
  ttsEnabledInput.addEventListener("change", persist);
  grammarHintsEnabledInput.addEventListener("change", () => {
    syncHeroState();
    void persist();
  });
  openOptionsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") {
      return;
    }
    if ("themeColor" in changes || "themePreset" in changes) {
      const themeColor = normalizeThemeColor(changes.themeColor?.newValue || changes.themePreset?.newValue || DEFAULT_THEME_COLOR);
      applyThemeColor(themeColor);
      syncThemeButtons(themeColor);
    }
    if ("uiLanguage" in changes) {
      applyLanguage(changes.uiLanguage.newValue || "zh-CN");
    }
    if ("grammarHintsEnabled" in changes) {
      grammarHintsEnabledInput.checked = Boolean(changes.grammarHintsEnabled.newValue);
      syncHeroState();
    }
    if ("resultDisplayMode" in changes) {
      syncDisplayMode(changes.resultDisplayMode.newValue === "inline" ? "inline" : "split");
    }
  });
}

async function persist() {
  const response = await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    payload: {
      targetLanguage: targetLanguageSelect.value,
      themeColor: getCurrentThemeColor(),
      resultDisplayMode: getCurrentDisplayMode(),
      ttsEnabled: ttsEnabledInput.checked,
      grammarHintsEnabled: grammarHintsEnabledInput.checked
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
  setText("labelThemeColor", copy.labelThemeColor);
  setText("labelTargetLanguage", copy.labelTargetLanguage);
  setText("labelResultDisplayMode", copy.labelResultDisplayMode);
  setText("modeSplit", copy.modeSplit);
  setText("modeInline", copy.modeInline);
  setText("labelTtsEnabled", copy.labelTtsEnabled);
  setText("labelGrammarHints", copy.labelGrammarHints);
  setText("openOptions", copy.openOptions);
  syncHeroState();
}

function syncHeroState(mode) {
  const copy = I18N[document.documentElement.lang === "en" ? "en" : "zh-CN"];
  const currentMode = mode || document.documentElement.dataset.popupDisplayMode || "split";
  document.documentElement.dataset.popupDisplayMode = currentMode;
  setText(
    "heroChipMode",
    currentMode === "split" ? copy.heroChipModeSplit : copy.heroChipModeInline
  );
  setText(
    "heroChipGrammar",
    grammarHintsEnabledInput.checked ? copy.heroChipGrammarOn : copy.heroChipGrammarOff
  );
  setText(
    "heroSummary",
    currentMode === "split" ? copy.heroSummarySplit : copy.heroSummaryInline
  );
}

function syncDisplayMode(mode) {
  const currentMode = mode === "inline" ? "inline" : "split";
  modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === currentMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  syncHeroState(currentMode);
}

function getCurrentDisplayMode() {
  return document.documentElement.dataset.popupDisplayMode === "inline" ? "inline" : "split";
}

function syncThemeButtons(color) {
  const currentColor = normalizeThemeColor(color);
  themeButtons.forEach((button) => {
    const isActive = normalizeThemeColor(button.dataset.themeColor) === currentColor;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  document.documentElement.dataset.popupThemeColor = currentColor;
}

function getCurrentThemeColor() {
  return normalizeThemeColor(document.documentElement.dataset.popupThemeColor || DEFAULT_THEME_COLOR);
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
