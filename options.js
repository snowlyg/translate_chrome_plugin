const fields = {
  sourceLanguage: document.getElementById("sourceLanguage"),
  targetLanguage: document.getElementById("targetLanguage"),
  ttsEnabled: document.getElementById("ttsEnabled"),
  grammarHintsEnabled: document.getElementById("grammarHintsEnabled"),
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
let statusTimer = null;

initialize();

async function initialize() {
  await populateVoices();

  const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  if (!response?.ok) {
    showStatus("读取配置失败", "error", false);
    return;
  }

  const settings = response.data;
  fields.sourceLanguage.value = settings.sourceLanguage || "auto";
  fields.targetLanguage.value = settings.targetLanguage || "zh-CN";
  fields.ttsEnabled.value = String(settings.ttsEnabled !== false);
  fields.grammarHintsEnabled.value = String(settings.grammarHintsEnabled !== false);
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
  syncTtsLabels();
  syncVoiceFieldState();
  await refreshBaiduStatus();
}

saveButton.addEventListener("click", async () => {
  const response = await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    payload: {
      sourceLanguage: fields.sourceLanguage.value,
      targetLanguage: fields.targetLanguage.value,
      ttsEnabled: fields.ttsEnabled.value === "true",
      grammarHintsEnabled: fields.grammarHintsEnabled.value === "true",
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

  showStatus(response?.ok ? "设置已保存" : "保存失败", response?.ok ? "success" : "error");
  if (response?.ok) {
    await refreshBaiduStatus();
  }
});

fields.ttsVoiceMode.addEventListener("change", syncVoiceFieldState);
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
    `<option value="">系统默认音色</option>`,
    recommendedOptions.length ? `<optgroup label="推荐音色">${recommendedOptions.join("")}</optgroup>` : "",
    `<optgroup label="全部系统音色">${allOptions.join("")}</optgroup>`
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
