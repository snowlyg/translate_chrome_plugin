const fields = {
  uiLanguage: document.getElementById("uiLanguage"),
  sourceLanguage: document.getElementById("sourceLanguage"),
  targetLanguage: document.getElementById("targetLanguage"),
  ttsEnabled: document.getElementById("ttsEnabled"),
  grammarHintsEnabled: document.getElementById("grammarHintsEnabled"),
  resultDisplayMode: document.getElementById("resultDisplayMode"),
  themeColor: document.getElementById("themeColor"),
  themeColorText: document.getElementById("themeColorText"),
  siteAccessMode: document.getElementById("siteAccessMode"),
  siteWhitelist: document.getElementById("siteWhitelist"),
  siteBlacklist: document.getElementById("siteBlacklist"),
  ttsVoiceMode: document.getElementById("ttsVoiceMode"),
  ttsVoiceName: document.getElementById("ttsVoiceName"),
  ttsRate: document.getElementById("ttsRate"),
  ttsPitch: document.getElementById("ttsPitch"),
  ttsVolume: document.getElementById("ttsVolume"),
  ttsPreviewText: document.getElementById("ttsPreviewText"),
  provider_baidu: document.getElementById("provider_baidu"),
  provider_primary: document.getElementById("provider_primary"),
  provider_mymemory: document.getElementById("provider_mymemory"),
  provider_bing: document.getElementById("provider_bing"),
  provider_libre: document.getElementById("provider_libre"),
  microsoftApiKey: document.getElementById("microsoftApiKey"),
  microsoftRegion: document.getElementById("microsoftRegion"),
  microsoftEndpoint: document.getElementById("microsoftEndpoint"),
  baiduAppId: document.getElementById("baiduAppId"),
  baiduAppKey: document.getElementById("baiduAppKey"),
  baiduFallbackOnly: document.getElementById("baiduFallbackOnly"),
  baiduFreeLimitEnabled: document.getElementById("baiduFreeLimitEnabled"),
  baiduMonthlyCharacterLimit: document.getElementById("baiduMonthlyCharacterLimit"),
  libreEndpoint: document.getElementById("libreEndpoint")
};

const saveButton = document.getElementById("saveButton");
const statusNode = document.getElementById("status");
const baiduStatusNode = document.getElementById("baiduStatus");
const resetBaiduUsageButton = document.getElementById("resetBaiduUsage");
const previewVoiceButton = document.getElementById("previewVoice");
const stopPreviewButton = document.getElementById("stopPreview");
const ttsRateValue = document.getElementById("ttsRateValue");
const ttsPitchValue = document.getElementById("ttsPitchValue");
const ttsVolumeValue = document.getElementById("ttsVolumeValue");
const presetButtons = Array.from(document.querySelectorAll("[data-theme-color]"));
let statusTimer = null;
const DEFAULT_THEME_COLOR = "#2563EB";
const I18N = {
  "zh-CN": {
    heroEyebrow: "Translate Plugin",
    pageTitle: "高级设置",
    heroDescription: "默认先尝试首选免费接口；如果首选免费接口在当前网络环境不可用，可自动回退到百度翻译或其他已启用翻译源。",
    heroTagRealtime: "实时翻译",
    heroTagFallback: "多源回退",
    heroTagInline: "划词即译",
    heroPreviewKicker: "翻译已就绪",
    heroPreviewText: "你好，欢迎使用极简翻译",
    sectionBasicTitle: "基础设置",
    labelSourceLanguage: "源语言",
    labelTargetLanguage: "目标语言",
    labelTtsEnabled: "TTS 播报",
    labelGrammarHints: "英文语法提示",
    labelResultDisplayMode: "结果展示方式",
    labelThemeColor: "主题配色",
    sectionSiteRulesTitle: "网站生效范围",
    siteRulesHint: "黑名单优先级高于白名单。域名规则支持 example.com，URL 规则支持 https://example.com/docs/*，每行一条。",
    labelSiteAccessMode: "默认策略",
    labelSiteWhitelist: "白名单",
    labelSiteBlacklist: "黑名单",
    sectionVoiceTitle: "语音设置",
    voiceHint: "如果默认音色听起来生硬，先试试“智能推荐”模式；它会优先选择系统里更自然、增强版的语音。你也可以手动改成任意系统音色，并微调语速和音高。",
    labelTtsVoiceMode: "推荐模式",
    labelTtsVoiceName: "手动音色",
    labelTtsRate: "语速",
    labelTtsPitch: "音高",
    labelTtsVolume: "音量",
    labelTtsPreviewText: "试听文本",
    previewVoice: "试听音色",
    stopPreview: "停止试听",
    ttsModeSoft: "智能推荐 · 柔和",
    ttsModeNatural: "智能推荐 · 自然",
    ttsModeClear: "智能推荐 · 清晰",
    ttsModeDeep: "智能推荐 · 沉稳",
    ttsModeManual: "手动指定音色",
    ttsVoiceDefault: "系统默认音色",
    ttsVoiceRecommendedGroup: "推荐音色",
    ttsVoiceAllGroup: "全部系统音色",
    sectionProvidersTitle: "翻译源",
    providerBaiduLabel: "百度翻译开放平台",
    providerPrimaryLabel: "首选免费接口",
    providerMymemoryLabel: "公共备用接口",
    providerBingLabel: "商业翻译接口",
    providerLibreLabel: "自定义公共端点",
    sectionBaiduTitle: "百度翻译开放平台",
    baiduHintPrimary: "推荐中国大陆环境优先接入。开通“通用文本翻译 API”后，填写 AppID 与 AppKey 即可使用。",
    labelBaiduFallbackOnly: "调用策略",
    labelBaiduFreeLimitEnabled: "免费额度保护",
    labelBaiduMonthlyCharacterLimit: "月度字符上限",
    baiduHintSecondary: "建议保留“仅回退 + 免费额度保护”。这样首选免费接口正常可用时不会额外消耗百度字符数，达到月度上限后也会自动跳过百度。",
    resetBaiduUsage: "重置百度本月额度状态",
    sectionMicrosoftTitle: "商业翻译接口",
    microsoftHintPrimary: "如果你想启用商业翻译接口，请先创建对应的翻译资源，并选择免费 F0 定价层。创建完成后，到资源页的 Keys and Endpoint 复制 Key、Region、Endpoint，再填到下面。",
    microsoftHintSecondary: "教程文档：docs/azure-translator-f0-guide.md",
    sectionLibreTitle: "自定义公共翻译端点",
    sectionGrammarTitle: "英文语法提示",
    grammarHintDescription: "当前默认接入公共语法检测接口。它适合做轻量提示，不适合作为强一致的专业校对结果。",
    labelUiLanguage: "界面语言",
    enabledOption: "启用",
    disabledOption: "禁用",
    inlineMode: "页内模式",
    splitMode: "分隔模式",
    siteModeAll: "默认全部网页生效",
    siteModeWhitelist: "仅白名单网页生效",
    statusCopy: "修改后点击保存立即生效",
    saveButton: "保存设置",
    saveSuccess: "设置已保存",
    saveError: "保存失败",
    loadError: "读取配置失败",
    uiLanguageZh: "中文",
    uiLanguageEn: "English"
  },
  en: {
    heroEyebrow: "Translate Plugin",
    pageTitle: "Advanced Settings",
    heroDescription: "The extension tries the primary free endpoint first. If it is unavailable in the current network environment, it can automatically fall back to Baidu or other enabled providers.",
    heroTagRealtime: "Real-time",
    heroTagFallback: "Fallback routing",
    heroTagInline: "Inline translate",
    heroPreviewKicker: "Translation ready",
    heroPreviewText: "Hello, welcome to Minimal Translate",
    sectionBasicTitle: "Basics",
    labelSourceLanguage: "Source Language",
    labelTargetLanguage: "Target Language",
    labelTtsEnabled: "TTS Playback",
    labelGrammarHints: "English Grammar Hints",
    labelResultDisplayMode: "Result Display Mode",
    labelThemeColor: "Theme Color",
    sectionSiteRulesTitle: "Site Access Rules",
    siteRulesHint: "Blacklist rules override whitelist rules. Domain rules support example.com and URL rules support https://example.com/docs/*, one per line.",
    labelSiteAccessMode: "Default Policy",
    labelSiteWhitelist: "Whitelist",
    labelSiteBlacklist: "Blacklist",
    sectionVoiceTitle: "Voice Settings",
    voiceHint: "If the default voice sounds stiff, start with Smart modes. They prefer more natural and enhanced system voices. You can also switch to any installed voice manually and fine-tune rate and pitch.",
    labelTtsVoiceMode: "Voice Mode",
    labelTtsVoiceName: "Manual Voice",
    labelTtsRate: "Rate",
    labelTtsPitch: "Pitch",
    labelTtsVolume: "Volume",
    labelTtsPreviewText: "Preview Text",
    previewVoice: "Preview Voice",
    stopPreview: "Stop Preview",
    ttsModeSoft: "Smart · Soft",
    ttsModeNatural: "Smart · Natural",
    ttsModeClear: "Smart · Clear",
    ttsModeDeep: "Smart · Clear Voice",
    ttsModeManual: "Manual Voice",
    ttsVoiceDefault: "System Default Voice",
    ttsVoiceRecommendedGroup: "Recommended Voices",
    ttsVoiceAllGroup: "All System Voices",
    sectionProvidersTitle: "Providers",
    providerBaiduLabel: "Baidu Translate",
    providerPrimaryLabel: "Primary Free Provider",
    providerMymemoryLabel: "Public Backup Provider",
    providerBingLabel: "Commercial Translator",
    providerLibreLabel: "Custom Public Endpoint",
    sectionBaiduTitle: "Baidu Translate",
    baiduHintPrimary: "Recommended for mainland China network environments. After enabling the General Text Translation API, fill in AppID and AppKey here.",
    labelBaiduFallbackOnly: "Request Policy",
    labelBaiduFreeLimitEnabled: "Free Limit Guard",
    labelBaiduMonthlyCharacterLimit: "Monthly Character Limit",
    baiduHintSecondary: "Keeping fallback-only plus free-limit guard is recommended. When the primary free provider works, Baidu quota will not be consumed. After the monthly limit is reached, Baidu will be skipped automatically.",
    resetBaiduUsage: "Reset Baidu Monthly Usage",
    sectionMicrosoftTitle: "Commercial Translator",
    microsoftHintPrimary: "If you want to enable the commercial translator, create the resource first and choose the free F0 pricing tier. Then copy Key, Region and Endpoint from the Keys and Endpoint page into the fields below.",
    microsoftHintSecondary: "Guide: docs/azure-translator-f0-guide.md",
    sectionLibreTitle: "Custom Public Endpoint",
    sectionGrammarTitle: "English Grammar Hints",
    grammarHintDescription: "The extension uses a public grammar service by default. It is suitable for lightweight suggestions, not strict professional proofreading.",
    labelUiLanguage: "Interface Language",
    enabledOption: "Enabled",
    disabledOption: "Disabled",
    inlineMode: "Inline Mode",
    splitMode: "Split Mode",
    siteModeAll: "Enable on all sites",
    siteModeWhitelist: "Whitelist only",
    statusCopy: "Changes take effect after saving",
    saveButton: "Save Settings",
    saveSuccess: "Settings saved",
    saveError: "Save failed",
    loadError: "Failed to load settings",
    uiLanguageZh: "中文",
    uiLanguageEn: "English"
  }
};

initialize();

async function initialize() {
  await populateVoices();

  const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  if (!response?.ok) {
    showStatus(I18N["zh-CN"].loadError, "error", false);
    return;
  }

  const settings = response.data;
  fields.uiLanguage.value = settings.uiLanguage || "zh-CN";
  fields.sourceLanguage.value = settings.sourceLanguage || "auto";
  fields.targetLanguage.value = settings.targetLanguage || "zh-CN";
  fields.ttsEnabled.value = String(settings.ttsEnabled !== false);
  fields.grammarHintsEnabled.value = String(settings.grammarHintsEnabled !== false);
  fields.resultDisplayMode.value = settings.resultDisplayMode === "split" ? "split" : "inline";
  const themeColor = normalizeThemeColor(settings.themeColor || settings.themePreset || DEFAULT_THEME_COLOR);
  fields.themeColor.value = themeColor;
  fields.themeColorText.value = themeColor.toUpperCase();
  fields.siteAccessMode.value = settings.siteAccessMode === "whitelist" ? "whitelist" : "all";
  fields.siteWhitelist.value = settings.siteWhitelist || "";
  fields.siteBlacklist.value = settings.siteBlacklist || "";
  fields.ttsVoiceMode.value = settings.ttsVoiceMode || "smart_soft";
  fields.ttsVoiceName.value = settings.ttsVoiceName || "";
  fields.ttsRate.value = String(settings.ttsRate ?? 0.9);
  fields.ttsPitch.value = String(settings.ttsPitch ?? 0.98);
  fields.ttsVolume.value = String(settings.ttsVolume ?? 1);
  fields.provider_baidu.checked = Boolean(settings.enabledProviders.baidu);
  fields.provider_primary.checked = Boolean(settings.enabledProviders.primary);
  fields.provider_mymemory.checked = Boolean(settings.enabledProviders.mymemory);
  fields.provider_bing.checked = Boolean(settings.enabledProviders.bing);
  fields.provider_libre.checked = Boolean(settings.enabledProviders.libre);
  fields.microsoftApiKey.value = settings.microsoftApiKey || "";
  fields.microsoftRegion.value = settings.microsoftRegion || "";
  fields.microsoftEndpoint.value = settings.microsoftEndpoint || "https://api.cognitive.microsofttranslator.com";
  fields.baiduAppId.value = settings.baiduAppId || "";
  fields.baiduAppKey.value = settings.baiduAppKey || "";
  fields.baiduFallbackOnly.value = String(settings.baiduFallbackOnly !== false);
  fields.baiduFreeLimitEnabled.value = String(settings.baiduFreeLimitEnabled !== false);
  fields.baiduMonthlyCharacterLimit.value = String(settings.baiduMonthlyCharacterLimit ?? 50000);
  fields.libreEndpoint.value = settings.libreEndpoint || "https://libretranslate.com/translate";
  applyThemeColor(themeColor);
  applyLanguage(fields.uiLanguage.value);
  syncTtsLabels();
  syncVoiceFieldState();
  updateHeroPreviewDirection();
  await refreshBaiduStatus();
}

saveButton.addEventListener("click", async () => {
  const response = await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    payload: {
      uiLanguage: fields.uiLanguage.value,
      sourceLanguage: fields.sourceLanguage.value,
      targetLanguage: fields.targetLanguage.value,
      ttsEnabled: fields.ttsEnabled.value === "true",
      grammarHintsEnabled: fields.grammarHintsEnabled.value === "true",
      resultDisplayMode: fields.resultDisplayMode.value,
      themeColor: normalizeThemeColor(fields.themeColor.value),
      siteAccessMode: fields.siteAccessMode.value,
      siteWhitelist: fields.siteWhitelist.value.trim(),
      siteBlacklist: fields.siteBlacklist.value.trim(),
      ttsVoiceMode: fields.ttsVoiceMode.value,
      ttsVoiceName: fields.ttsVoiceName.value,
      ttsRate: Number(fields.ttsRate.value),
      ttsPitch: Number(fields.ttsPitch.value),
      ttsVolume: Number(fields.ttsVolume.value),
      enabledProviders: {
        baidu: fields.provider_baidu.checked,
        primary: fields.provider_primary.checked,
        mymemory: fields.provider_mymemory.checked,
        bing: fields.provider_bing.checked,
        libre: fields.provider_libre.checked
      },
      baiduAppId: fields.baiduAppId.value.trim(),
      baiduAppKey: fields.baiduAppKey.value.trim(),
      baiduFallbackOnly: fields.baiduFallbackOnly.value === "true",
      baiduFreeLimitEnabled: fields.baiduFreeLimitEnabled.value === "true",
      baiduMonthlyCharacterLimit: Number(fields.baiduMonthlyCharacterLimit.value) || 50000,
      microsoftApiKey: fields.microsoftApiKey.value.trim(),
      microsoftRegion: fields.microsoftRegion.value.trim(),
      microsoftEndpoint: fields.microsoftEndpoint.value.trim(),
      libreEndpoint: fields.libreEndpoint.value.trim()
    }
  });

  showStatus(
    response?.ok ? getCopy("saveSuccess") : getCopy("saveError"),
    response?.ok ? "success" : "error"
  );
  if (response?.ok) {
    await refreshBaiduStatus();
  }
});

fields.ttsVoiceMode.addEventListener("change", syncVoiceFieldState);
fields.uiLanguage.addEventListener("change", () => applyLanguage(fields.uiLanguage.value));
fields.themeColor.addEventListener("input", () => syncThemeInputs(fields.themeColor.value));
fields.themeColorText.addEventListener("input", () => {
  const normalized = normalizeThemeColor(fields.themeColorText.value, false);
  if (!normalized) {
    return;
  }
  syncThemeInputs(normalized);
});
fields.themeColorText.addEventListener("blur", () => {
  syncThemeInputs(normalizeThemeColor(fields.themeColorText.value));
});
presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const color = button.getAttribute("data-theme-color");
    syncThemeInputs(color || DEFAULT_THEME_COLOR);
  });
});
fields.sourceLanguage.addEventListener("change", updateHeroPreviewDirection);
fields.targetLanguage.addEventListener("change", updateHeroPreviewDirection);
fields.ttsRate.addEventListener("input", syncTtsLabels);
fields.ttsPitch.addEventListener("input", syncTtsLabels);
fields.ttsVolume.addEventListener("input", syncTtsLabels);
previewVoiceButton.addEventListener("click", previewVoice);
stopPreviewButton.addEventListener("click", () => window.speechSynthesis.cancel());

fields.provider_baidu.addEventListener("change", refreshBaiduStatusPreview);
fields.baiduAppId.addEventListener("input", refreshBaiduStatusPreview);
fields.baiduAppKey.addEventListener("input", refreshBaiduStatusPreview);
fields.baiduFallbackOnly.addEventListener("change", refreshBaiduStatusPreview);
fields.baiduFreeLimitEnabled.addEventListener("change", refreshBaiduStatusPreview);
fields.baiduMonthlyCharacterLimit.addEventListener("input", refreshBaiduStatusPreview);
resetBaiduUsageButton?.addEventListener("click", resetBaiduUsage);

async function populateVoices() {
  const voices = await loadVoices();
  const recommended = voices
    .map((voice) => ({ voice, score: scoreVoice(voice, "smart_soft", "en-US") }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map((item) => item.voice);

  const seen = new Set();
  const recommendedOptions = recommended
    .filter((voice) => {
      const key = `${voice.name}:${voice.lang}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .map((voice) => renderVoiceOption(voice));

  const allOptions = voices
    .slice()
    .sort((left, right) => left.lang.localeCompare(right.lang) || left.name.localeCompare(right.name))
    .map((voice) => renderVoiceOption(voice));

  fields.ttsVoiceName.innerHTML = [
    `<option value="">${escapeHtml(getCopy("ttsVoiceDefault"))}</option>`,
    recommendedOptions.length ? `<optgroup label="${escapeHtml(getCopy("ttsVoiceRecommendedGroup"))}">${recommendedOptions.join("")}</optgroup>` : "",
    `<optgroup label="${escapeHtml(getCopy("ttsVoiceAllGroup"))}">${allOptions.join("")}</optgroup>`
  ].join("");
}

function loadVoices() {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      resolve(voices);
      return;
    }

    const handleVoicesChanged = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    window.setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    }, 800);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderVoiceOption(voice) {
  const badges = [];
  if (voice.default) {
    badges.push("默认");
  }
  if (voice.localService) {
    badges.push("本机");
  }
  const suffix = badges.length ? ` · ${badges.join(" / ")}` : "";
  return `<option value="${escapeHtml(voice.name)}">${escapeHtml(voice.name)} (${escapeHtml(voice.lang || "unknown")}${suffix})</option>`;
}

function syncTtsLabels() {
  ttsRateValue.textContent = Number(fields.ttsRate.value).toFixed(2);
  ttsPitchValue.textContent = Number(fields.ttsPitch.value).toFixed(2);
  ttsVolumeValue.textContent = Number(fields.ttsVolume.value).toFixed(2);
}

function syncVoiceFieldState() {
  fields.ttsVoiceName.disabled = fields.ttsVoiceMode.value !== "manual";
}

function getCopy(key) {
  const language = fields.uiLanguage?.value || "zh-CN";
  return I18N[language]?.[key] || I18N["zh-CN"][key] || "";
}

function applyLanguage(language) {
  const copy = I18N[language] || I18N["zh-CN"];
  document.documentElement.lang = language === "en" ? "en" : "zh-CN";
  const setText = (id, value) => {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = value;
    }
  };

  setText("heroEyebrow", copy.heroEyebrow);
  setText("pageTitle", copy.pageTitle);
  setText("heroDescription", copy.heroDescription);
  setText("heroTagRealtime", copy.heroTagRealtime);
  setText("heroTagFallback", copy.heroTagFallback);
  setText("heroTagInline", copy.heroTagInline);
  setText("heroPreviewKicker", copy.heroPreviewKicker);
  setText("heroPreviewText", copy.heroPreviewText);
  setText("sectionBasicTitle", copy.sectionBasicTitle);
  setText("labelSourceLanguage", copy.labelSourceLanguage);
  setText("labelTargetLanguage", copy.labelTargetLanguage);
  setText("labelTtsEnabled", copy.labelTtsEnabled);
  setText("labelGrammarHints", copy.labelGrammarHints);
  setText("labelResultDisplayMode", copy.labelResultDisplayMode);
  setText("labelThemeColor", copy.labelThemeColor);
  setText("sectionSiteRulesTitle", copy.sectionSiteRulesTitle);
  setText("labelSiteAccessMode", copy.labelSiteAccessMode);
  setText("labelSiteWhitelist", copy.labelSiteWhitelist);
  setText("labelSiteBlacklist", copy.labelSiteBlacklist);
  setText("sectionVoiceTitle", copy.sectionVoiceTitle);
  setText("voiceHint", copy.voiceHint);
  setText("labelTtsVoiceMode", copy.labelTtsVoiceMode);
  setText("labelTtsVoiceName", copy.labelTtsVoiceName);
  setText("labelTtsRate", copy.labelTtsRate);
  setText("labelTtsPitch", copy.labelTtsPitch);
  setText("labelTtsVolume", copy.labelTtsVolume);
  setText("labelTtsPreviewText", copy.labelTtsPreviewText);
  setText("previewVoice", copy.previewVoice);
  setText("stopPreview", copy.stopPreview);
  setText("sectionProvidersTitle", copy.sectionProvidersTitle);
  setText("providerBaiduLabel", copy.providerBaiduLabel);
  setText("providerPrimaryLabel", copy.providerPrimaryLabel);
  setText("providerMymemoryLabel", copy.providerMymemoryLabel);
  setText("providerBingLabel", copy.providerBingLabel);
  setText("providerLibreLabel", copy.providerLibreLabel);
  setText("sectionBaiduTitle", copy.sectionBaiduTitle);
  setText("baiduHintPrimary", copy.baiduHintPrimary);
  setText("labelBaiduFallbackOnly", copy.labelBaiduFallbackOnly);
  setText("labelBaiduFreeLimitEnabled", copy.labelBaiduFreeLimitEnabled);
  setText("labelBaiduMonthlyCharacterLimit", copy.labelBaiduMonthlyCharacterLimit);
  setText("baiduHintSecondary", copy.baiduHintSecondary);
  setText("resetBaiduUsage", copy.resetBaiduUsage);
  setText("sectionMicrosoftTitle", copy.sectionMicrosoftTitle);
  setText("sectionLibreTitle", copy.sectionLibreTitle);
  setText("sectionGrammarTitle", copy.sectionGrammarTitle);
  setText("grammarHintDescription", copy.grammarHintDescription);
  setText("labelUiLanguage", copy.labelUiLanguage);
  setText("statusCopy", copy.statusCopy);
  setText("saveButton", copy.saveButton);

  const siteRulesHint = document.getElementById("siteRulesHint");
  if (siteRulesHint) {
    siteRulesHint.innerHTML = copy.siteRulesHint
      .replace("example.com", "<code>example.com</code>")
      .replace("https://example.com/docs/*", "<code>https://example.com/docs/*</code>");
  }
  const microsoftHintPrimary = document.getElementById("microsoftHintPrimary");
  if (microsoftHintPrimary) {
    microsoftHintPrimary.innerHTML = copy.microsoftHintPrimary
      .replace("F0", "<strong>F0</strong>")
      .replace("Keys and Endpoint", "<strong>Keys and Endpoint</strong>");
  }
  const microsoftHintSecondary = document.getElementById("microsoftHintSecondary");
  if (microsoftHintSecondary) {
    microsoftHintSecondary.innerHTML = copy.microsoftHintSecondary
      .replace("docs/azure-translator-f0-guide.md", "<code>docs/azure-translator-f0-guide.md</code>");
  }

  const uiOptions = fields.uiLanguage.options;
  if (uiOptions.length >= 2) {
    uiOptions[0].textContent = copy.uiLanguageZh;
    uiOptions[1].textContent = copy.uiLanguageEn;
  }

  if (fields.ttsEnabled.options.length >= 2) {
    fields.ttsEnabled.options[0].textContent = copy.enabledOption;
    fields.ttsEnabled.options[1].textContent = copy.disabledOption;
  }
  if (fields.grammarHintsEnabled.options.length >= 2) {
    fields.grammarHintsEnabled.options[0].textContent = copy.enabledOption;
    fields.grammarHintsEnabled.options[1].textContent = copy.disabledOption;
  }
  if (fields.resultDisplayMode.options.length >= 2) {
    fields.resultDisplayMode.options[0].textContent = copy.inlineMode;
    fields.resultDisplayMode.options[1].textContent = copy.splitMode;
  }
  if (fields.siteAccessMode.options.length >= 2) {
    fields.siteAccessMode.options[0].textContent = copy.siteModeAll;
    fields.siteAccessMode.options[1].textContent = copy.siteModeWhitelist;
  }
  if (fields.ttsVoiceMode.options.length >= 5) {
    fields.ttsVoiceMode.options[0].textContent = copy.ttsModeSoft;
    fields.ttsVoiceMode.options[1].textContent = copy.ttsModeNatural;
    fields.ttsVoiceMode.options[2].textContent = copy.ttsModeClear;
    fields.ttsVoiceMode.options[3].textContent = copy.ttsModeDeep;
    fields.ttsVoiceMode.options[4].textContent = copy.ttsModeManual;
  }
  if (fields.baiduFallbackOnly.options.length >= 2) {
    fields.baiduFallbackOnly.options[0].textContent = language === "en"
      ? "Fallback only when upstream providers fail"
      : "仅在前置翻译源失败时作为回退";
    fields.baiduFallbackOnly.options[1].textContent = language === "en"
      ? "Join requests with other enabled providers"
      : "与其他翻译源一起参与请求";
  }
  if (fields.baiduFreeLimitEnabled.options.length >= 2) {
    fields.baiduFreeLimitEnabled.options[0].textContent = language === "en"
      ? "Enabled, stop automatically after limit is reached"
      : "启用，达到上限后当月自动停用";
    fields.baiduFreeLimitEnabled.options[1].textContent = language === "en"
      ? "Disabled, billing is handled by Baidu"
      : "禁用，由百度平台自行计费";
  }
  void populateVoices();

  updateHeroPreviewDirection();
}

function updateHeroPreviewDirection() {
  const directionNode = document.getElementById("heroPreviewDirection");
  if (!directionNode) {
    return;
  }

  const labelMap = {
    auto: "Auto",
    en: "English",
    "zh-CN": "Chinese",
    ja: "Japanese",
    ko: "Korean",
    fr: "French"
  };
  const source = labelMap[fields.sourceLanguage.value] || "English";
  const target = labelMap[fields.targetLanguage.value] || "Chinese";
  directionNode.textContent = `${source} to ${target}`;
}

function syncThemeInputs(color) {
  const normalized = normalizeThemeColor(color);
  fields.themeColor.value = normalized;
  fields.themeColorText.value = normalized.toUpperCase();
  syncPresetButtons(normalized);
  applyThemeColor(normalized);
}

function normalizeThemeColor(value, fallback = true) {
  const normalized = String(value || "").trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(normalized)) {
    return normalized;
  }
  return fallback ? DEFAULT_THEME_COLOR : "";
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
  root.style.setProperty("--bg", adjustColor(normalized, 0.92, 255));
  root.style.setProperty("--line", toRgbaString(rgb, 0.18));
  root.style.setProperty("--accent", normalized);
  root.style.setProperty("--accent-2", adjustColor(normalized, 0.18, 0));
  root.style.setProperty("--accent-soft", toRgbaString(rgb, 0.12));
  root.style.setProperty("--accent-glow", toRgbaString(rgb, 0.22));
}

function syncPresetButtons(color) {
  const normalized = normalizeThemeColor(color);
  presetButtons.forEach((button) => {
    const buttonColor = normalizeThemeColor(button.getAttribute("data-theme-color"));
    button.classList.toggle("is-active", buttonColor === normalized);
  });
}

async function refreshBaiduStatus() {
  const response = await chrome.runtime.sendMessage({ type: "GET_BAIDU_STATUS" });
  if (!response?.ok) {
    renderBaiduStatus({
      level: "warning",
      message: response?.error || "读取百度状态失败",
      freeLimitEnabled: false
    });
    return;
  }
  renderBaiduStatus(response.data);
}

function refreshBaiduStatusPreview() {
  const enabled = fields.provider_baidu.checked;
  const configured = Boolean(fields.baiduAppId.value.trim() && fields.baiduAppKey.value.trim());
  const fallbackOnly = fields.baiduFallbackOnly.value === "true";
  const freeLimitEnabled = fields.baiduFreeLimitEnabled.value === "true";
  const limit = Number(fields.baiduMonthlyCharacterLimit.value) || 50000;

  let level = "inactive";
  let message = "百度翻译未启用";
  if (!enabled) {
    message = "百度翻译未勾选启用";
  } else if (!configured) {
    level = "warning";
    message = "已勾选百度翻译，但还未填写完整的 AppID / AppKey";
  } else if (fallbackOnly) {
    level = "ready";
    message = "保存后百度将作为回退源，仅在前置翻译源失败时请求";
  } else {
    level = "ready";
    message = "保存后百度会和其他已启用翻译源一起参与请求";
  }

  renderBaiduStatus({
    level,
    message,
    freeLimitEnabled,
    monthlyCharacterLimit: limit,
    usedCharacters: null
  });
}

function renderBaiduStatus(status) {
  if (!baiduStatusNode) {
    return;
  }

  baiduStatusNode.dataset.level = status.level || "inactive";
  const meta = [];
  if (status.freeLimitEnabled) {
    if (typeof status.usedCharacters === "number" && typeof status.monthlyCharacterLimit === "number") {
      meta.push(`本月已用 ${status.usedCharacters} / ${status.monthlyCharacterLimit} 字符`);
    } else if (typeof status.monthlyCharacterLimit === "number") {
      meta.push(`免费额度保护已启用，上限 ${status.monthlyCharacterLimit} 字符 / 月`);
    }
  } else {
    meta.push("免费额度保护已关闭");
  }

  baiduStatusNode.innerHTML = `
    <div class="provider-status-title">${escapeHtml(status.message || "百度状态未知")}</div>
    ${meta.length ? `<div class="provider-status-meta">${escapeHtml(meta.join(" · "))}</div>` : ""}
  `;
}

function showStatus(message, type = "success", autoHide = true) {
  if (!statusNode) {
    return;
  }

  if (statusTimer) {
    window.clearTimeout(statusTimer);
    statusTimer = null;
  }

  statusNode.textContent = message;
  statusNode.dataset.state = type;
  statusNode.dataset.visible = "false";
  void statusNode.offsetWidth;
  statusNode.dataset.visible = "true";

  if (!autoHide) {
    return;
  }

  statusTimer = window.setTimeout(() => {
    statusNode.dataset.visible = "false";
    statusTimer = null;
  }, 1800);
}

async function resetBaiduUsage() {
  const response = await chrome.runtime.sendMessage({ type: "RESET_BAIDU_USAGE" });
  if (!response?.ok) {
    showStatus(response?.error || "重置百度额度状态失败", "error");
    return;
  }

  await refreshBaiduStatus();
  showStatus("已重置百度本月额度状态", "success");
}

async function previewVoice() {
  window.speechSynthesis.cancel();

  const previewText = fields.ttsPreviewText.value.trim() || "Hello, this is Selective Translate.";
  const utterance = new SpeechSynthesisUtterance(previewText);
  const voice = await resolveVoice(fields.ttsVoiceName.value, "en-US", fields.ttsVoiceMode.value);

  utterance.lang = voice?.lang || "en-US";
  utterance.rate = Number(fields.ttsRate.value);
  utterance.pitch = Number(fields.ttsPitch.value);
  utterance.volume = Number(fields.ttsVolume.value);
  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.speak(utterance);
}

async function resolveVoice(voiceName, lang, mode) {
  const voices = await loadVoices();
  if (mode === "manual" && voiceName) {
    const exact = voices.find((voice) => voice.name === voiceName);
    if (exact) {
      return exact;
    }
  }

  const ranked = voices
    .map((voice) => ({ voice, score: scoreVoice(voice, mode, lang) }))
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.voice || null;
}

function scoreVoice(voice, mode, lang) {
  const name = String(voice.name || "").toLowerCase();
  const voiceLang = String(voice.lang || "").toLowerCase();
  const normalizedLang = String(lang || "en-US").toLowerCase();
  let score = 0;

  if (voiceLang === normalizedLang) {
    score += 45;
  } else if (voiceLang.startsWith(normalizedLang.split("-")[0])) {
    score += 28;
  }

  if (voice.default) {
    score += 10;
  }
  if (voice.localService) {
    score += 6;
  }

  const qualityKeywords = ["natural", "enhanced", "premium", "neural", "siri", "studio", "cloud", "online"];
  const softKeywords = ["samantha", "ava", "victoria", "aria", "jenny", "xiaoxiao", "xiaoyi", "tingting", "mei-jia"];
  const deepKeywords = ["alex", "daniel", "fred", "thomas", "yunxi", "yunyang", "david", "lee"];
  const clearKeywords = ["zira", "serena", "allison", "karen", "moira", "kathy", "anna"];

  score += qualityKeywords.reduce((total, keyword) => total + (name.includes(keyword) ? 8 : 0), 0);

  if (mode === "smart_soft") {
    score += softKeywords.reduce((total, keyword) => total + (name.includes(keyword) ? 10 : 0), 0);
  } else if (mode === "smart_deep") {
    score += deepKeywords.reduce((total, keyword) => total + (name.includes(keyword) ? 10 : 0), 0);
  } else if (mode === "smart_clear") {
    score += clearKeywords.reduce((total, keyword) => total + (name.includes(keyword) ? 10 : 0), 0);
  } else {
    score += qualityKeywords.reduce((total, keyword) => total + (name.includes(keyword) ? 4 : 0), 0);
  }

  return score;
}
