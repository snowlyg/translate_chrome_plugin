const enabledInput = document.getElementById("enabled");
const targetLanguageSelect = document.getElementById("targetLanguage");
const ttsEnabledInput = document.getElementById("ttsEnabled");
const openOptionsButton = document.getElementById("openOptions");
const statusNode = document.getElementById("status");

initialize();

async function initialize() {
  const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  if (!response?.ok) {
    statusNode.textContent = "读取配置失败";
    return;
  }

  const settings = response.data;
  enabledInput.checked = Boolean(settings.enabled);
  targetLanguageSelect.value = settings.targetLanguage || "zh-CN";
  ttsEnabledInput.checked = Boolean(settings.ttsEnabled);

  enabledInput.addEventListener("change", persist);
  targetLanguageSelect.addEventListener("change", persist);
  ttsEnabledInput.addEventListener("change", persist);
  openOptionsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
}

async function persist() {
  const response = await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    payload: {
      enabled: enabledInput.checked,
      targetLanguage: targetLanguageSelect.value,
      ttsEnabled: ttsEnabledInput.checked
    }
  });

  statusNode.textContent = response?.ok ? "设置已保存" : "保存失败";
}
