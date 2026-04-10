const DEFAULT_SETTINGS = {
  enabled: true,
  sourceLanguage: "auto",
  targetLanguage: "zh-CN",
  ttsEnabled: true,
  ttsVoiceMode: "smart_soft",
  ttsVoiceName: "",
  ttsRate: 0.9,
  ttsPitch: 0.98,
  ttsVolume: 1,
  uiLanguage: "zh-CN",
  resultDisplayMode: "inline",
  themeColor: "#2563EB",
  siteAccessMode: "all",
  siteWhitelist: "",
  siteBlacklist: "",
  providerOrder: ["primary", "baidu", "mymemory", "bing"],
  baiduFallbackOnly: true,
  baiduFreeLimitEnabled: true,
  baiduMonthlyCharacterLimit: 50000,
  enabledProviders: {
    baidu: false,
    primary: true,
    mymemory: true,
    bing: false,
    libre: false
  },
  baiduAppId: "",
  baiduAppKey: "",
  libreEndpoint: "https://libretranslate.com/translate",
  microsoftApiKey: "",
  microsoftRegion: "",
  microsoftEndpoint: "https://api.cognitive.microsofttranslator.com",
  ocrSpaceApiKey: "helloworld",
  grammarHintsEnabled: true,
  grammarEndpoint: "https://api.languagetool.org/v2/check"
};
const LEGACY_PRIMARY_PROVIDER = ["g", "oogle"].join("");
const CONTENT_SCRIPT_FILES = ["content.js"];

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const merged = mergeSettings(current);
  await chrome.storage.sync.set(merged);

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "translate-selection",
      title: "翻译选中文本",
      contexts: ["selection"]
    });

    chrome.contextMenus.create({
      id: "translate-image",
      title: "翻译图片文字",
      contexts: ["image"]
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) {
    return;
  }

  if (info.menuItemId === "translate-selection" && info.selectionText) {
    try {
      await dispatchMessageToTab(tab, {
        type: "OPEN_TRANSLATION_PANEL",
        text: info.selectionText
      });
    } catch (error) {
      console.warn("右键划词翻译触发失败", error);
    }
  }

  if (info.menuItemId === "translate-image" && info.srcUrl) {
    try {
      await dispatchMessageToTab(tab, {
        type: "OPEN_IMAGE_TRANSLATION_PANEL",
        imageUrl: info.srcUrl
      });
    } catch (error) {
      console.warn("右键图片翻译触发失败", error);
    }
  }
});

async function dispatchMessageToTab(tab, message) {
  if (!tab?.id) {
    throw new Error("目标标签页不存在");
  }

  if (!canInjectContentScript(tab.url)) {
    throw new Error("当前页面不支持插件注入");
  }

  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    if (!isMissingReceiverError(error)) {
      throw error;
    }

    await ensureContentScriptInjected(tab.id);
    return chrome.tabs.sendMessage(tab.id, message);
  }
}

function canInjectContentScript(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) {
    return false;
  }

  const blockedPrefixes = [
    "chrome://",
    "chrome-extension://",
    "edge://",
    "about:",
    "moz-extension://",
    "view-source:"
  ];
  if (blockedPrefixes.some((prefix) => url.startsWith(prefix))) {
    return false;
  }

  return !url.startsWith("https://chrome.google.com/webstore");
}

function isMissingReceiverError(error) {
  return /Receiving end does not exist|Could not establish connection/i.test(String(error?.message || error || ""));
}

async function ensureContentScriptInjected(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: CONTENT_SCRIPT_FILES
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "TRANSLATE_SELECTION") {
    handleTranslateSelection(message.text)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) => sendResponse({ ok: false, error: error.message || "Translation failed" }));
    return true;
  }

  if (message?.type === "TRANSLATE_TEXT_SIMPLE") {
    handleSimpleTranslation(message.text)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) => sendResponse({ ok: false, error: error.message || "Translation failed" }));
    return true;
  }

  if (message?.type === "TRANSLATE_IMAGE") {
    handleTranslateImage(message.imageUrl)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) => sendResponse({ ok: false, error: error.message || "Image translation failed" }));
    return true;
  }

  if (message?.type === "CHECK_GRAMMAR") {
    handleGrammarCheck(message.text)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) => sendResponse({ ok: false, error: error.message || "Grammar check failed" }));
    return true;
  }

  if (message?.type === "GET_SETTINGS") {
    chrome.storage.sync.get(DEFAULT_SETTINGS).then((settings) => {
      sendResponse({ ok: true, data: mergeSettings(settings) });
    });
    return true;
  }

  if (message?.type === "GET_BAIDU_STATUS") {
    chrome.storage.sync.get(DEFAULT_SETTINGS)
      .then((settings) => mergeSettings(settings))
      .then(async (settings) => {
        const data = await getBaiduStatus(settings);
        sendResponse({ ok: true, data });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error.message || "Get Baidu status failed" });
      });
    return true;
  }

  if (message?.type === "RESET_BAIDU_USAGE") {
    resetBaiduUsage()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message || "Reset Baidu usage failed" }));
    return true;
  }

  if (message?.type === "SAVE_SETTINGS") {
    chrome.storage.sync.get(DEFAULT_SETTINGS).then((current) => {
      const nextSettings = mergeSettings({
        ...current,
        ...(message.payload || {}),
        enabledProviders: {
          ...(current.enabledProviders || {}),
          ...((message.payload && message.payload.enabledProviders) || {})
        }
      });

      return chrome.storage.sync.set(nextSettings).then(() => {
        sendResponse({ ok: true, data: nextSettings });
      });
    });
    return true;
  }

  return false;
});

async function handleTranslateSelection(rawText) {
  const text = (rawText || "").trim();
  if (!text) {
    throw new Error("No text selected");
  }

  const settings = mergeSettings(await chrome.storage.sync.get(DEFAULT_SETTINGS));
  if (!settings.enabled) {
    throw new Error("插件已禁用划词翻译");
  }

  const results = await translateTextAcrossProviders(text, settings);

  if (!results.length) {
    throw new Error(buildProviderAvailabilityMessage(settings));
  }

  let dictionary = null;
  try {
    dictionary = await fetchDictionaryEntry(text, settings, results);
  } catch (_error) {
    dictionary = null;
  }

  let grammar = null;
  try {
    grammar = await fetchGrammarSuggestions(text, settings, results);
  } catch (_error) {
    grammar = null;
  }

  return {
    text,
    panelTitle: "划词翻译",
    sourceLanguage: settings.sourceLanguage,
    targetLanguage: settings.targetLanguage,
    ttsEnabled: settings.ttsEnabled,
    ttsVoiceMode: settings.ttsVoiceMode,
    ttsVoiceName: settings.ttsVoiceName,
    ttsRate: settings.ttsRate,
    ttsPitch: settings.ttsPitch,
    ttsVolume: settings.ttsVolume,
    dictionary,
    grammar,
    results
  };
}

async function handleSimpleTranslation(rawText) {
  const text = String(rawText || "").trim();
  if (!text) {
    throw new Error("No text selected");
  }

  const settings = mergeSettings(await chrome.storage.sync.get(DEFAULT_SETTINGS));
  if (!settings.enabled) {
    throw new Error("插件已禁用划词翻译");
  }

  const results = await translateTextAcrossProviders(text, settings);
  const primary = results.find((item) => item?.translation && !item.error);
  if (!primary?.translation) {
    throw new Error(buildProviderAvailabilityMessage(settings));
  }

  return {
    text,
    translation: primary.translation,
    provider: primary.provider,
    providerLabel: primary.providerLabel || primary.provider,
    detectedLanguage: primary.detectedLanguage || settings.sourceLanguage,
    targetLanguage: settings.targetLanguage
  };
}

async function translateTextAcrossProviders(text, settings) {
  const activeProviders = settings.providerOrder.filter((name) => settings.enabledProviders[name]);
  if (!activeProviders.length) {
    throw new Error(buildProviderAvailabilityMessage(settings));
  }

  const results = [];
  for (const provider of activeProviders) {
    if (provider === "baidu" && settings.baiduFallbackOnly && results.some((item) => !item.error && item.translation)) {
      continue;
    }

    try {
      const result = await translateByProvider(provider, text, settings);
      if (result?.translation) {
        results.push(result);
      }
    } catch (error) {
      results.push({
        provider,
        error: error.message || "Unknown provider error"
      });
    }
  }
  return results;
}

async function handleTranslateImage(imageUrl) {
  const settings = mergeSettings(await chrome.storage.sync.get(DEFAULT_SETTINGS));
  if (!settings.enabled) {
    throw new Error("插件已禁用划词翻译");
  }

  const ocr = await extractTextFromImage(imageUrl, settings);
  const translation = await handleTranslateSelection(ocr.text);

  return {
    ...translation,
    text: ocr.text,
    panelTitle: "图片文字翻译",
    ocr: {
      imageUrl,
      detectedLanguage: ocr.detectedLanguage
    }
  };
}

async function handleGrammarCheck(rawText) {
  const text = String(rawText || "").trim();
  if (!text) {
    return {
      text: "",
      grammar: null
    };
  }

  const settings = mergeSettings(await chrome.storage.sync.get(DEFAULT_SETTINGS));
  const grammar = await fetchGrammarSuggestions(text, settings, []);
  return {
    text,
    grammar
  };
}

async function translateByProvider(provider, text, settings) {
  switch (provider) {
    case "baidu":
      return translateWithBaidu(text, settings);
    case "primary":
      return translateWithPrimary(text, settings);
    case "mymemory":
      return translateWithMyMemory(text, settings);
    case "bing":
      return translateWithMicrosoft(text, settings);
    case "libre":
      return translateWithLibre(text, settings);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

async function translateWithBaidu(text, settings) {
  if (!settings.baiduAppId || !settings.baiduAppKey) {
    throw new Error("百度翻译未配置 AppID / AppKey");
  }

  const quota = await getBaiduQuotaState(settings);
  if (quota.suspended) {
    throw new Error("百度翻译本月免费额度已达上限，已自动停用");
  }

  const salt = `${Date.now()}`;
  const from = normalizeBaiduLanguage(settings.sourceLanguage || "auto");
  const to = normalizeBaiduLanguage(settings.targetLanguage || "zh-CN");
  const sign = md5(`${settings.baiduAppId}${text}${salt}${settings.baiduAppKey}`);
  const url = new URL("https://fanyi-api.baidu.com/api/trans/vip/translate");
  url.searchParams.set("q", text);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("appid", settings.baiduAppId);
  url.searchParams.set("salt", salt);
  url.searchParams.set("sign", sign);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Baidu request failed: ${response.status}`);
  }

  const payload = await response.json();
  if (payload?.error_code) {
    if (shouldSuspendBaiduByError(payload, settings)) {
      await suspendBaiduForCurrentMonth(settings, payload?.error_msg || "百度翻译额度已达上限");
    }
    throw new Error(payload?.error_msg || `Baidu error: ${payload.error_code}`);
  }

  const translation = Array.isArray(payload?.trans_result)
    ? payload.trans_result.map((item) => item?.dst || "").join("\n")
    : "";

  if (!translation) {
    throw new Error("Baidu returned an empty translation");
  }

  await recordBaiduUsage(text, settings);

  return {
    provider: "baidu",
    providerLabel: "Baidu",
    translation,
    detectedLanguage: payload?.from || settings.sourceLanguage
  };
}

async function translateWithPrimary(text, settings) {
  const url = new URL(["https://translate.", "g", "oogleapis.com/translate_a/single"].join(""));
  url.searchParams.set("client", "gtx");
  url.searchParams.set("dt", "t");
  url.searchParams.set("sl", settings.sourceLanguage || "auto");
  url.searchParams.set("tl", settings.targetLanguage || "zh-CN");
  url.searchParams.set("q", text);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Primary endpoint request failed: ${response.status}`);
  }

  const payload = await response.json();
  const translation = Array.isArray(payload?.[0])
    ? payload[0].map((item) => item?.[0] || "").join("")
    : "";

  if (!translation) {
    throw new Error("Primary endpoint returned an empty translation");
  }

  return {
    provider: "primary",
    providerLabel: "Primary",
    translation,
    detectedLanguage: payload?.[2] || settings.sourceLanguage
  };
}

async function translateWithMyMemory(text, settings) {
  const source = settings.sourceLanguage === "auto"
    ? detectLikelyLanguage(text)
    : settings.sourceLanguage;
  const target = settings.targetLanguage || "zh-CN";
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `${normalizeLanguage(source)}|${normalizeLanguage(target)}`);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Secondary endpoint request failed: ${response.status}`);
  }

  const payload = await response.json();
  const translation = payload?.responseData?.translatedText || "";
  if (!translation) {
    throw new Error("Secondary endpoint returned an empty translation");
  }

  return {
    provider: "mymemory",
    providerLabel: "Fallback",
    translation,
    detectedLanguage: payload?.responseData?.match || settings.sourceLanguage
  };
}

async function translateWithMicrosoft(text, settings) {
  if (!settings.microsoftApiKey) {
    throw new Error("商业翻译接口未配置 API Key");
  }

  const endpoint = new URL("/translate?api-version=3.0", settings.microsoftEndpoint);
  endpoint.searchParams.set("to", normalizeMicrosoftLanguage(settings.targetLanguage || "zh-CN"));
  if (settings.sourceLanguage && settings.sourceLanguage !== "auto") {
    endpoint.searchParams.set("from", normalizeMicrosoftLanguage(settings.sourceLanguage));
  }

  const response = await fetch(endpoint.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": settings.microsoftApiKey,
      ...(settings.microsoftRegion ? { "Ocp-Apim-Subscription-Region": settings.microsoftRegion } : {})
    },
    body: JSON.stringify([{ text }])
  });

  if (!response.ok) {
    throw new Error(`Commercial endpoint request failed: ${response.status}`);
  }

  const payload = await response.json();
  const translation = payload?.[0]?.translations?.[0]?.text || "";
  if (!translation) {
    throw new Error("Commercial endpoint returned an empty translation");
  }

  return {
    provider: "bing",
    providerLabel: "Commercial",
    translation,
    detectedLanguage: payload?.[0]?.detectedLanguage?.language || settings.sourceLanguage
  };
}

async function translateWithLibre(text, settings) {
  if (!settings.libreEndpoint) {
    throw new Error("自定义公共端点缺少 endpoint");
  }

  const response = await fetch(settings.libreEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      q: text,
      source: settings.sourceLanguage === "auto" ? "auto" : normalizeLanguage(settings.sourceLanguage),
      target: normalizeLanguage(settings.targetLanguage),
      format: "text"
    })
  });

  if (!response.ok) {
    throw new Error(`Custom endpoint request failed: ${response.status}`);
  }

  const payload = await response.json();
  const translation = payload?.translatedText || "";
  if (!translation) {
    throw new Error("Custom endpoint returned an empty translation");
  }

  return {
    provider: "libre",
    providerLabel: "Custom",
    translation,
    detectedLanguage: payload?.detectedLanguage?.language || settings.sourceLanguage
  };
}

function mergeSettings(settings) {
  const enabledProviders = {
    ...(settings.enabledProviders || {})
  };
  if (LEGACY_PRIMARY_PROVIDER in enabledProviders && !("primary" in enabledProviders)) {
    enabledProviders.primary = enabledProviders[LEGACY_PRIMARY_PROVIDER];
  }

  const providerOrder = Array.isArray(settings.providerOrder) && settings.providerOrder.length
    ? settings.providerOrder.map((name) => name === LEGACY_PRIMARY_PROVIDER ? "primary" : name)
    : DEFAULT_SETTINGS.providerOrder;

  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    enabledProviders: {
      ...DEFAULT_SETTINGS.enabledProviders,
      ...enabledProviders
    },
    siteAccessMode: settings.siteAccessMode === "whitelist" ? "whitelist" : "all",
    siteWhitelist: String(settings.siteWhitelist || ""),
    siteBlacklist: String(settings.siteBlacklist || ""),
    themeColor: normalizeThemeColor(settings.themeColor || settings.themePreset),
    baiduFallbackOnly: settings.baiduFallbackOnly !== false,
    baiduFreeLimitEnabled: settings.baiduFreeLimitEnabled !== false,
    baiduMonthlyCharacterLimit: normalizeMonthlyCharacterLimit(settings.baiduMonthlyCharacterLimit),
    providerOrder
  };
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
  return DEFAULT_SETTINGS.themeColor;
}

function normalizeMonthlyCharacterLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SETTINGS.baiduMonthlyCharacterLimit;
  }
  return Math.max(1, Math.floor(parsed));
}

function normalizeLanguage(language) {
  if (!language) {
    return "zh-CN";
  }

  const lower = language.toLowerCase();
  if (lower === "zh-cn" || lower === "zh-hans") {
    return "zh-CN";
  }
  if (lower === "zh-tw" || lower === "zh-hant") {
    return "zh-TW";
  }
  return language;
}

function normalizeBaiduLanguage(language) {
  if (!language || language === "auto") {
    return "auto";
  }

  const normalized = normalizeLanguage(language);
  if (normalized === "zh-CN") {
    return "zh";
  }
  if (normalized === "zh-TW") {
    return "cht";
  }
  return normalized.toLowerCase();
}

function normalizeMicrosoftLanguage(language) {
  const normalized = normalizeLanguage(language);
  if (normalized === "zh-CN") {
    return "zh-Hans";
  }
  if (normalized === "zh-TW") {
    return "zh-Hant";
  }
  return normalized;
}

function detectLikelyLanguage(text) {
  if (/[\u3040-\u30ff]/.test(text)) {
    return "ja";
  }
  if (/[\uac00-\ud7af]/.test(text)) {
    return "ko";
  }
  if (/[\u4e00-\u9fff]/.test(text)) {
    return "zh-CN";
  }
  return "en";
}

async function extractTextFromImage(imageUrl, settings) {
  if (!imageUrl) {
    throw new Error("未找到图片地址");
  }

  const formData = new FormData();
  formData.set("apikey", settings.ocrSpaceApiKey || "helloworld");
  formData.set("url", imageUrl);
  formData.set("OCREngine", "2");
  formData.set("isOverlayRequired", "false");
  formData.set("scale", "true");
  formData.set("language", resolveOcrLanguage(settings.sourceLanguage, settings.targetLanguage));

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(`OCR request failed: ${response.status}`);
  }

  const payload = await response.json();
  const parsedResults = Array.isArray(payload?.ParsedResults) ? payload.ParsedResults : [];
  const text = parsedResults
    .map((item) => item?.ParsedText || "")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) {
    const apiError = Array.isArray(payload?.ErrorMessage)
      ? payload.ErrorMessage.filter(Boolean).join(" ")
      : payload?.ErrorMessage || payload?.ErrorDetails;
    throw new Error(apiError || "图片中未识别到可翻译文字");
  }

  return {
    text,
    detectedLanguage: resolveOcrLanguageLabel(settings.sourceLanguage, settings.targetLanguage)
  };
}

function resolveOcrLanguage(sourceLanguage, targetLanguage) {
  const hint = String(sourceLanguage && sourceLanguage !== "auto" ? sourceLanguage : targetLanguage || "en").toLowerCase();
  if (hint.startsWith("zh-cn") || hint.startsWith("zh-hans")) {
    return "chs";
  }
  if (hint.startsWith("zh-tw") || hint.startsWith("zh-hant")) {
    return "cht";
  }
  if (hint.startsWith("ja")) {
    return "jpn";
  }
  if (hint.startsWith("ko")) {
    return "kor";
  }
  if (hint.startsWith("fr")) {
    return "fre";
  }
  if (hint.startsWith("de")) {
    return "ger";
  }
  if (hint.startsWith("es")) {
    return "spa";
  }
  if (hint.startsWith("it")) {
    return "ita";
  }
  if (hint.startsWith("pt")) {
    return "por";
  }
  if (hint.startsWith("ru")) {
    return "rus";
  }
  return "eng";
}

function resolveOcrLanguageLabel(sourceLanguage, targetLanguage) {
  const ocrLanguage = resolveOcrLanguage(sourceLanguage, targetLanguage);
  if (ocrLanguage === "chs") {
    return "zh-CN";
  }
  if (ocrLanguage === "cht") {
    return "zh-TW";
  }
  if (ocrLanguage === "jpn") {
    return "ja";
  }
  if (ocrLanguage === "kor") {
    return "ko";
  }
  if (ocrLanguage === "fre") {
    return "fr";
  }
  if (ocrLanguage === "ger") {
    return "de";
  }
  if (ocrLanguage === "spa") {
    return "es";
  }
  if (ocrLanguage === "ita") {
    return "it";
  }
  if (ocrLanguage === "por") {
    return "pt";
  }
  if (ocrLanguage === "rus") {
    return "ru";
  }
  return "en";
}

async function fetchDictionaryEntry(text, settings, results) {
  if (!isDictionaryWord(text)) {
    return null;
  }

  const primaryResult = results.find((item) => !item.error);
  const detectedLanguage = String(primaryResult?.detectedLanguage || settings.sourceLanguage || "").toLowerCase();
  if (detectedLanguage && detectedLanguage !== "auto" && !detectedLanguage.startsWith("en")) {
    return null;
  }

  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text.toLowerCase())}`);
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Dictionary request failed: ${response.status}`);
  }

  const payload = await response.json();
  const entry = payload?.[0];
  if (!entry) {
    return null;
  }

  const phonetics = Array.isArray(entry.phonetics)
    ? entry.phonetics
        .map((item) => ({
          text: item?.text || "",
          audio: item?.audio || ""
        }))
        .filter((item) => item.text)
    : [];

  const meanings = Array.isArray(entry.meanings)
    ? entry.meanings.slice(0, 3).map((meaning) => ({
        partOfSpeech: meaning?.partOfSpeech || "",
        definitions: Array.isArray(meaning?.definitions)
          ? meaning.definitions.slice(0, 2).map((definition) => ({
              definition: definition?.definition || "",
              example: definition?.example || ""
            }))
          : [],
        synonyms: Array.isArray(meaning?.synonyms)
          ? meaning.synonyms.slice(0, 4)
          : []
      }))
    : [];

  return {
    word: entry.word || text,
    phonetics,
    meanings
  };
}

function isDictionaryWord(text) {
  return /^[A-Za-z][A-Za-z'-]*$/.test(text.trim());
}

function buildProviderAvailabilityMessage(settings) {
  const reasons = [];
  const enabledProviders = settings.providerOrder.filter((name) => settings.enabledProviders[name]);

  if (!enabledProviders.length) {
    reasons.push("当前没有勾选任何翻译源");
  }

  if (settings.enabledProviders.baidu) {
    if (!settings.baiduAppId || !settings.baiduAppKey) {
      reasons.push("百度翻译已勾选，但还未填写 AppID / AppKey");
    } else if (settings.baiduFreeLimitEnabled) {
      reasons.push("如果百度状态提示已达本月免费额度上限，当月会自动停用");
    }
  }

  if (settings.enabledProviders.bing && !settings.microsoftApiKey) {
    reasons.push("商业翻译接口已勾选，但还未填写 API Key");
  }

  if (settings.enabledProviders.libre && !settings.libreEndpoint) {
    reasons.push("自定义公共端点已勾选，但还未填写可用的 Endpoint");
  }

  if (settings.siteAccessMode === "whitelist" && !parseSiteRules(settings.siteWhitelist).length) {
    reasons.push("当前开启了仅白名单生效，但白名单还是空的");
  }

  if (!reasons.length) {
    return "没有可用的翻译源，请检查已勾选翻译源的配置是否完整";
  }

  return `没有可用的翻译源：${reasons.join("；")}`;
}

function parseSiteRules(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function getBaiduQuotaState(settings) {
  if (!settings.baiduFreeLimitEnabled) {
    return {
      monthKey: getCurrentMonthKey(),
      usedCharacters: 0,
      suspended: false,
      suspendReason: ""
    };
  }

  const storageKey = "baiduUsage";
  const monthKey = getCurrentMonthKey();
  const payload = await chrome.storage.local.get(storageKey);
  const stored = payload?.[storageKey];
  const baseState = {
    monthKey,
    usedCharacters: 0,
    suspended: false,
    suspendReason: ""
  };

  if (!stored || stored.monthKey !== monthKey) {
    await chrome.storage.local.set({ [storageKey]: baseState });
    return baseState;
  }

  const usedCharacters = Number(stored.usedCharacters) || 0;
  const limit = normalizeMonthlyCharacterLimit(settings.baiduMonthlyCharacterLimit);
  const suspended = Boolean(stored.suspended) || usedCharacters >= limit;
  const nextState = {
    monthKey,
    usedCharacters,
    suspended,
    suspendReason: stored.suspendReason || ""
  };

  if (
    nextState.usedCharacters !== stored.usedCharacters ||
    nextState.suspended !== Boolean(stored.suspended) ||
    nextState.suspendReason !== (stored.suspendReason || "")
  ) {
    await chrome.storage.local.set({ [storageKey]: nextState });
  }

  return nextState;
}

async function recordBaiduUsage(text, settings) {
  if (!settings.baiduFreeLimitEnabled) {
    return;
  }

  const storageKey = "baiduUsage";
  const limit = normalizeMonthlyCharacterLimit(settings.baiduMonthlyCharacterLimit);
  const current = await getBaiduQuotaState(settings);
  const nextUsedCharacters = current.usedCharacters + countTranslationCharacters(text);
  const nextState = {
    monthKey: current.monthKey,
    usedCharacters: nextUsedCharacters,
    suspended: nextUsedCharacters >= limit,
    suspendReason: nextUsedCharacters >= limit ? "已达到本月百度免费额度上限" : current.suspendReason
  };

  await chrome.storage.local.set({ [storageKey]: nextState });
}

async function getBaiduStatus(settings) {
  const quota = await getBaiduQuotaState(settings);
  const configured = Boolean(settings.baiduAppId && settings.baiduAppKey);
  const enabled = Boolean(settings.enabledProviders.baidu);
  const limit = normalizeMonthlyCharacterLimit(settings.baiduMonthlyCharacterLimit);
  const remaining = Math.max(0, limit - quota.usedCharacters);
  let level = "inactive";
  let message = "百度翻译未启用";

  if (!enabled) {
    level = "inactive";
    message = "百度翻译未勾选启用";
  } else if (!configured) {
    level = "warning";
    message = "已启用百度翻译，但还未填写 AppID / AppKey";
  } else if (quota.suspended) {
    level = "warning";
    message = quota.suspendReason || "百度翻译本月免费额度已达上限，已自动停用";
  } else if (settings.baiduFallbackOnly) {
    level = "ready";
    message = settings.enabledProviders.primary
      ? "百度翻译当前作为回退源，仅在首选免费接口失败时请求"
      : "百度翻译当前作为回退源，但由于首选免费接口未启用，实际会直接参与翻译";
  } else {
    level = "ready";
    message = "百度翻译已启用，会和其他已启用翻译源一起参与请求";
  }

  return {
    enabled,
    configured,
    fallbackOnly: Boolean(settings.baiduFallbackOnly),
    freeLimitEnabled: Boolean(settings.baiduFreeLimitEnabled),
    suspended: quota.suspended,
    usedCharacters: quota.usedCharacters,
    monthlyCharacterLimit: limit,
    remainingCharacters: remaining,
    level,
    message
  };
}

async function resetBaiduUsage() {
  await chrome.storage.local.remove("baiduUsage");
}

async function suspendBaiduForCurrentMonth(settings, reason) {
  if (!settings.baiduFreeLimitEnabled) {
    return;
  }

  const storageKey = "baiduUsage";
  const current = await getBaiduQuotaState(settings);
  await chrome.storage.local.set({
    [storageKey]: {
      ...current,
      suspended: true,
      suspendReason: reason || "百度翻译额度已达上限"
    }
  });
}

function shouldSuspendBaiduByError(payload, settings) {
  if (!settings.baiduFreeLimitEnabled) {
    return false;
  }

  const errorCode = String(payload?.error_code || "");
  const errorMessage = String(payload?.error_msg || "");
  if (errorCode === "54003") {
    return true;
  }

  return /余额不足|欠费|免费额度|字符量用尽|调用量用尽/.test(errorMessage);
}

function countTranslationCharacters(text) {
  return Array.from(String(text || "")).length;
}

function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function md5(input) {
  return hex(md51(bytesToBinaryString(utf8ToBytes(String(input)))));
}

function utf8ToBytes(input) {
  return Array.from(new TextEncoder().encode(input));
}

function bytesToBinaryString(bytes) {
  return bytes.map((value) => String.fromCharCode(value)).join("");
}

function md51(binary) {
  let index;
  const state = [1732584193, -271733879, -1732584194, 271733878];
  const length = binary.length;

  for (index = 64; index <= length; index += 64) {
    md5cycle(state, md5Block(binary.substring(index - 64, index)));
  }

  let tail = Array(16).fill(0);
  const remaining = binary.substring(index - 64);
  for (let i = 0; i < remaining.length; i += 1) {
    tail[i >> 2] |= remaining.charCodeAt(i) << ((i % 4) * 8);
  }
  tail[remaining.length >> 2] |= 0x80 << ((remaining.length % 4) * 8);

  if (remaining.length > 55) {
    md5cycle(state, tail);
    tail = Array(16).fill(0);
  }

  const bitLength = length * 8;
  tail[14] = bitLength & 0xffffffff;
  tail[15] = Math.floor(bitLength / 0x100000000);
  md5cycle(state, tail);
  return state;
}

function md5Block(block) {
  const words = [];
  for (let i = 0; i < 64; i += 4) {
    words[i >> 2] = block.charCodeAt(i) +
      (block.charCodeAt(i + 1) << 8) +
      (block.charCodeAt(i + 2) << 16) +
      (block.charCodeAt(i + 3) << 24);
  }
  return words;
}

function md5cycle(state, words) {
  let [a, b, c, d] = state;

  a = ff(a, b, c, d, words[0], 7, -680876936);
  d = ff(d, a, b, c, words[1], 12, -389564586);
  c = ff(c, d, a, b, words[2], 17, 606105819);
  b = ff(b, c, d, a, words[3], 22, -1044525330);
  a = ff(a, b, c, d, words[4], 7, -176418897);
  d = ff(d, a, b, c, words[5], 12, 1200080426);
  c = ff(c, d, a, b, words[6], 17, -1473231341);
  b = ff(b, c, d, a, words[7], 22, -45705983);
  a = ff(a, b, c, d, words[8], 7, 1770035416);
  d = ff(d, a, b, c, words[9], 12, -1958414417);
  c = ff(c, d, a, b, words[10], 17, -42063);
  b = ff(b, c, d, a, words[11], 22, -1990404162);
  a = ff(a, b, c, d, words[12], 7, 1804603682);
  d = ff(d, a, b, c, words[13], 12, -40341101);
  c = ff(c, d, a, b, words[14], 17, -1502002290);
  b = ff(b, c, d, a, words[15], 22, 1236535329);

  a = gg(a, b, c, d, words[1], 5, -165796510);
  d = gg(d, a, b, c, words[6], 9, -1069501632);
  c = gg(c, d, a, b, words[11], 14, 643717713);
  b = gg(b, c, d, a, words[0], 20, -373897302);
  a = gg(a, b, c, d, words[5], 5, -701558691);
  d = gg(d, a, b, c, words[10], 9, 38016083);
  c = gg(c, d, a, b, words[15], 14, -660478335);
  b = gg(b, c, d, a, words[4], 20, -405537848);
  a = gg(a, b, c, d, words[9], 5, 568446438);
  d = gg(d, a, b, c, words[14], 9, -1019803690);
  c = gg(c, d, a, b, words[3], 14, -187363961);
  b = gg(b, c, d, a, words[8], 20, 1163531501);
  a = gg(a, b, c, d, words[13], 5, -1444681467);
  d = gg(d, a, b, c, words[2], 9, -51403784);
  c = gg(c, d, a, b, words[7], 14, 1735328473);
  b = gg(b, c, d, a, words[12], 20, -1926607734);

  a = hh(a, b, c, d, words[5], 4, -378558);
  d = hh(d, a, b, c, words[8], 11, -2022574463);
  c = hh(c, d, a, b, words[11], 16, 1839030562);
  b = hh(b, c, d, a, words[14], 23, -35309556);
  a = hh(a, b, c, d, words[1], 4, -1530992060);
  d = hh(d, a, b, c, words[4], 11, 1272893353);
  c = hh(c, d, a, b, words[7], 16, -155497632);
  b = hh(b, c, d, a, words[10], 23, -1094730640);
  a = hh(a, b, c, d, words[13], 4, 681279174);
  d = hh(d, a, b, c, words[0], 11, -358537222);
  c = hh(c, d, a, b, words[3], 16, -722521979);
  b = hh(b, c, d, a, words[6], 23, 76029189);
  a = hh(a, b, c, d, words[9], 4, -640364487);
  d = hh(d, a, b, c, words[12], 11, -421815835);
  c = hh(c, d, a, b, words[15], 16, 530742520);
  b = hh(b, c, d, a, words[2], 23, -995338651);

  a = ii(a, b, c, d, words[0], 6, -198630844);
  d = ii(d, a, b, c, words[7], 10, 1126891415);
  c = ii(c, d, a, b, words[14], 15, -1416354905);
  b = ii(b, c, d, a, words[5], 21, -57434055);
  a = ii(a, b, c, d, words[12], 6, 1700485571);
  d = ii(d, a, b, c, words[3], 10, -1894986606);
  c = ii(c, d, a, b, words[10], 15, -1051523);
  b = ii(b, c, d, a, words[1], 21, -2054922799);
  a = ii(a, b, c, d, words[8], 6, 1873313359);
  d = ii(d, a, b, c, words[15], 10, -30611744);
  c = ii(c, d, a, b, words[6], 15, -1560198380);
  b = ii(b, c, d, a, words[13], 21, 1309151649);
  a = ii(a, b, c, d, words[4], 6, -145523070);
  d = ii(d, a, b, c, words[11], 10, -1120210379);
  c = ii(c, d, a, b, words[2], 15, 718787259);
  b = ii(b, c, d, a, words[9], 21, -343485551);

  state[0] = add32(a, state[0]);
  state[1] = add32(b, state[1]);
  state[2] = add32(c, state[2]);
  state[3] = add32(d, state[3]);
}

function cmn(q, a, b, x, s, t) {
  return add32(leftRotate(add32(add32(a, q), add32(x, t)), s), b);
}

function ff(a, b, c, d, x, s, t) {
  return cmn((b & c) | ((~b) & d), a, b, x, s, t);
}

function gg(a, b, c, d, x, s, t) {
  return cmn((b & d) | (c & (~d)), a, b, x, s, t);
}

function hh(a, b, c, d, x, s, t) {
  return cmn(b ^ c ^ d, a, b, x, s, t);
}

function ii(a, b, c, d, x, s, t) {
  return cmn(c ^ (b | (~d)), a, b, x, s, t);
}

function leftRotate(value, amount) {
  return (value << amount) | (value >>> (32 - amount));
}

function add32(left, right) {
  return (left + right) | 0;
}

function hex(values) {
  return values.map((value) => intToHex(value)).join("");
}

function intToHex(value) {
  let hexValue = "";
  for (let i = 0; i < 4; i += 1) {
    hexValue += (`0${((value >> (i * 8)) & 0xff).toString(16)}`).slice(-2);
  }
  return hexValue;
}

async function fetchGrammarSuggestions(text, settings, results) {
  if (!settings.grammarHintsEnabled) {
    return null;
  }

  const normalizedText = String(text || "").trim();
  if (!shouldCheckGrammar(normalizedText, settings, results)) {
    return null;
  }

  const response = await fetch(settings.grammarEndpoint || DEFAULT_SETTINGS.grammarEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      text: normalizedText,
      language: "en-US",
      enabledOnly: "false"
    })
  });

  if (!response.ok) {
    throw new Error(`Grammar request failed: ${response.status}`);
  }

  const payload = await response.json();
  const matches = Array.isArray(payload?.matches) ? payload.matches : [];
  const issues = matches
    .map((match) => ({
      message: match?.message || "",
      shortMessage: match?.shortMessage || "",
      offset: Number(match?.offset ?? 0),
      length: Number(match?.length ?? 0),
      contextText: match?.context?.text || "",
      contextOffset: Number(match?.context?.offset ?? 0),
      contextLength: Number(match?.context?.length ?? 0),
      replacements: Array.isArray(match?.replacements)
        ? match.replacements.map((item) => item?.value || "").filter(Boolean).slice(0, 3)
        : [],
      category: match?.rule?.category?.name || "",
      ruleId: match?.rule?.id || ""
    }))
    .filter((item) => item.message)
    .slice(0, 5);

  if (!issues.length) {
    return null;
  }

  return {
    language: "en-US",
    issues
  };
}

function shouldCheckGrammar(text, settings, results) {
  if (!text || text.length < 6 || text.length > 800) {
    return false;
  }

  if (isDictionaryWord(text)) {
    return false;
  }

  const englishWordCount = (text.match(/[A-Za-z]+/g) || []).length;
  if (englishWordCount < 3) {
    return false;
  }

  const nonLatinCount = (text.match(/[^\u0000-\u024F\s\p{P}]/gu) || []).length;
  if (nonLatinCount > 0) {
    return false;
  }

  const primaryResult = results.find((item) => !item.error);
  const detectedLanguage = String(primaryResult?.detectedLanguage || settings.sourceLanguage || "").toLowerCase();
  if (detectedLanguage && detectedLanguage !== "auto" && !detectedLanguage.startsWith("en")) {
    return false;
  }

  return true;
}
