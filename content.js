const PANEL_ID = "selective-translate-panel";
const STYLE_ID = "selective-translate-style";
const INPUT_HINT_ID = "selective-translate-input-hint";
const LOGO_URL = chrome.runtime.getURL("assets/icons/icon-32.png");
const PANEL_GAP = 12;
const PANEL_EDGE = 12;
const DOCK_OPEN_WIDTH = 420;
const DOCK_COLLAPSED_WIDTH = 52;
const DOCK_LAYOUT_STORAGE_KEY = "dockLayout";
const INLINE_TRANSLATION_ATTR = "data-st-inline-translation";
let activeSelectionText = "";
let dismissedSelectionText = "";
let currentSpeech = null;
let dragState = null;
let splitDragState = null;
let currentAnchorRect = null;
let lastImageContext = null;
let dockAdjustedElements = [];
let dockMutationObserver = null;
let dockResyncTimer = null;
let dockLayoutState = {
  loaded: false,
  paneState: "open",
  width: DOCK_OPEN_WIDTH
};
let currentLayoutMode = resolveSiteLayoutMode(window.location.hostname);
let currentDockCompensationMode = resolveDockCompensationMode(window.location.hostname);
let pageActivationState = {
  ready: false,
  enabled: true
};
let grammarHintState = {
  target: null,
  text: "",
  timer: null,
  requestId: 0
};

injectStyles();
void loadDockLayoutState();
void refreshPageActivationState();
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }
  if (!("enabled" in changes) && !("siteAccessMode" in changes) && !("siteWhitelist" in changes) && !("siteBlacklist" in changes)) {
    return;
  }
  void refreshPageActivationState();
});

document.addEventListener("mouseup", handleMouseUp, true);
document.addEventListener("focusin", handleFocusIn, true);
document.addEventListener("focusout", handleFocusOut, true);
document.addEventListener("input", handleTextInput, true);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    removePanel();
    hideInputGrammarHint();
  }
});
document.addEventListener("mousedown", (event) => {
  const panel = getPanel();
  if (panel && !panel.contains(event.target)) {
    removePanel();
  }
}, true);
document.addEventListener("contextmenu", handleContextMenu, true);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OPEN_TRANSLATION_PANEL" && message.text) {
    if (!isExtensionActiveOnPage()) {
      return;
    }
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    void translateSelectionInline(message.text, range);
  }

  if (message?.type === "OPEN_IMAGE_TRANSLATION_PANEL" && message.imageUrl) {
    if (!isExtensionActiveOnPage()) {
      return;
    }
    const rect = lastImageContext?.imageUrl === message.imageUrl
      ? lastImageContext.rect
      : getViewportCenterRect();
    openPanel(message.imageUrl, rect, {
      requestType: "TRANSLATE_IMAGE",
      imageUrl: message.imageUrl,
      panelTitle: "图片文字翻译",
      sourcePreview: lastImageContext?.altText || "图片内容识别中…",
      loadingMessage: "正在识别图片文字并翻译..."
    });
  }

  return false;
});

function handleContextMenu(event) {
  if (!isExtensionActiveOnPage()) {
    lastImageContext = null;
    return;
  }

  const image = event.target instanceof Element ? event.target.closest("img") : null;
  if (!image) {
    lastImageContext = null;
    return;
  }

  const rect = image.getBoundingClientRect();
  lastImageContext = {
    imageUrl: image.currentSrc || image.src || "",
    altText: image.alt || "",
    rect: {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    }
  };
}

function handleMouseUp() {
  if (!isExtensionActiveOnPage()) {
    return;
  }

  if (isEditableSelectionTarget(document.activeElement)) {
    return;
  }

  window.setTimeout(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || "";
    if (!text) {
      dismissedSelectionText = "";
      return;
    }
    if (text !== dismissedSelectionText) {
      dismissedSelectionText = "";
    }
    if (text === dismissedSelectionText || text === activeSelectionText) {
      return;
    }

    const range = selection.rangeCount ? selection.getRangeAt(0) : null;
    const rect = range?.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) {
      return;
    }

    void translateSelectionInline(text, range);
  }, 20);
}

function handleFocusIn(event) {
  if (!isExtensionActiveOnPage()) {
    hideInputGrammarHint();
    return;
  }

  const target = getEditableTarget(event.target);
  if (!target) {
    hideInputGrammarHint();
    return;
  }

  grammarHintState.target = target;
  scheduleGrammarHintCheck(target);
}

function handleFocusOut(event) {
  const target = getEditableTarget(event.target);
  if (!target) {
    return;
  }

  window.setTimeout(() => {
    const hint = document.getElementById(INPUT_HINT_ID);
    if (document.activeElement === target || (hint && hint.contains(document.activeElement))) {
      return;
    }
    hideInputGrammarHint();
  }, 120);
}

function handleTextInput(event) {
  if (!isExtensionActiveOnPage()) {
    hideInputGrammarHint();
    return;
  }

  const target = getEditableTarget(event.target);
  if (!target) {
    return;
  }

  grammarHintState.target = target;
  scheduleGrammarHintCheck(target);
}

async function openPanel(text, rect, options = {}) {
  if (!isExtensionActiveOnPage()) {
    return;
  }

  const preservedScrollX = window.scrollX;
  const preservedScrollY = window.scrollY;
  activeSelectionText = options.imageUrl || text;
  currentAnchorRect = rect;
  const panel = ensurePanel();
  panel.dataset.locked = "false";
  positionPanel(panel, rect);
  panel.innerHTML = renderLoading(options.sourcePreview || text, options);
  initializePanelLayout(panel);

  try {
    const response = options.requestType === "TRANSLATE_IMAGE"
      ? await chrome.runtime.sendMessage({
          type: "TRANSLATE_IMAGE",
          imageUrl: options.imageUrl
        })
      : await chrome.runtime.sendMessage({
          type: "TRANSLATE_SELECTION",
          text
        });

    if (!response?.ok) {
      throw new Error(response?.error || "Translation request failed");
    }

    activeSelectionText = response.data.text || text;
    panel.innerHTML = renderResults(response.data.text || text, response.data);
    initializePanelLayout(panel);
    bindActions(panel, response.data);
    adjustPanelAfterContentChange(panel);
    restoreViewportScroll(preservedScrollX, preservedScrollY);
  } catch (error) {
    panel.innerHTML = renderError(options.sourcePreview || text, error.message || "Translation failed", options);
    initializePanelLayout(panel);
    bindActions(panel, {
      results: [],
      dictionary: null,
      ttsEnabled: false,
      ttsVoiceMode: "smart_soft",
      ttsVoiceName: "",
      ttsRate: 0.9,
      ttsPitch: 0.98,
      ttsVolume: 1,
      panelTitle: options.panelTitle || "划词翻译"
    });
    adjustPanelAfterContentChange(panel);
    restoreViewportScroll(preservedScrollX, preservedScrollY);
  }
}

function ensurePanel() {
  let panel = getPanel();
  if (panel) {
    return panel;
  }

  panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-live", "polite");
  panel.dataset.layoutMode = currentLayoutMode;
  panel.dataset.paneState = dockLayoutState.paneState || "open";
  panel.style.setProperty("--st-dock-width", `${clampDockWidth(dockLayoutState.width || DOCK_OPEN_WIDTH)}px`);
  document.documentElement.appendChild(panel);
  bindDrag(panel);
  return panel;
}

function getPanel() {
  return document.getElementById(PANEL_ID);
}

function removePanel() {
  stopSpeech();
  dismissedSelectionText = activeSelectionText;
  dragState = null;
  splitDragState = null;
  getPanel()?.remove();
  clearDockLayout();
  activeSelectionText = "";
  currentAnchorRect = null;
}

function positionPanel(panel, rect) {
  panel.dataset.layoutMode = currentLayoutMode;
  if (currentLayoutMode === "overlay") {
    positionOverlayPanel(panel, rect);
    clearDockLayout();
    return;
  }

  const width = getPanelDockWidth(panel);
  panel.style.top = "0";
  panel.style.right = "0";
  panel.style.bottom = "0";
  panel.style.left = "auto";
  panel.style.width = `${width}px`;
  panel.style.transform = "none";
  syncDockLayout(panel);
}

function adjustPanelAfterContentChange(panel) {
  positionPanel(panel, getActiveAnchorRect() || currentAnchorRect || getViewportCenterRect());
}

function positionOverlayPanel(panel, rect) {
  const panelRect = panel.getBoundingClientRect();
  const panelWidth = Math.min(
    Math.max(320, Math.ceil(panelRect.width || 0), 360),
    window.innerWidth - PANEL_EDGE * 2
  );
  const estimatedHeight = Math.min(
    window.innerHeight - PANEL_EDGE * 2,
    Math.max(180, Math.ceil(panelRect.height || 0), 280)
  );
  const candidates = [
    { top: PANEL_EDGE, left: window.innerWidth - panelWidth - PANEL_EDGE, rank: "top-right" },
    { top: PANEL_EDGE, left: PANEL_EDGE, rank: "top-left" },
    { top: window.innerHeight - estimatedHeight - PANEL_EDGE, left: window.innerWidth - panelWidth - PANEL_EDGE, rank: "bottom-right" },
    { top: window.innerHeight - estimatedHeight - PANEL_EDGE, left: PANEL_EDGE, rank: "bottom-left" }
  ].map((item) => ({
    ...item,
    top: clampViewportTop(item.top, estimatedHeight),
    left: clampViewportLeft(item.left, panelWidth)
  }));

  const best = candidates
    .map((candidate, index) => ({
      ...candidate,
      index,
      overlap: computeRectOverlap(rect, {
        left: candidate.left,
        top: candidate.top,
        right: candidate.left + panelWidth,
        bottom: candidate.top + estimatedHeight
      })
    }))
    .sort((leftCandidate, rightCandidate) => {
      if (leftCandidate.overlap !== rightCandidate.overlap) {
        return leftCandidate.overlap - rightCandidate.overlap;
      }
      return leftCandidate.index - rightCandidate.index;
    })[0];

  panel.style.position = "fixed";
  panel.style.top = `${best.top}px`;
  panel.style.left = `${best.left}px`;
  panel.style.right = "auto";
  panel.style.bottom = "auto";
  panel.style.width = `${panelWidth}px`;
  panel.style.transform = "none";
}

function computeRectOverlap(first, second) {
  const overlapWidth = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
  const overlapHeight = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
  return overlapWidth * overlapHeight;
}

function getActiveAnchorRect() {
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  return range?.getBoundingClientRect() || currentAnchorRect;
}

function clampViewportTop(top, panelHeight) {
  return Math.min(
    window.innerHeight - panelHeight - PANEL_EDGE,
    Math.max(PANEL_EDGE, top)
  );
}

function clampViewportLeft(left, panelWidth) {
  return Math.min(
    window.innerWidth - panelWidth - PANEL_EDGE,
    Math.max(PANEL_EDGE, left)
  );
}

function clampCurrentPanelPosition(panel) {
  const rect = panel.getBoundingClientRect();
  const left = clampViewportLeft(rect.left, rect.width);
  const top = clampViewportTop(rect.top, rect.height);
  panel.style.left = `${left + window.scrollX}px`;
  panel.style.top = `${top + window.scrollY}px`;
  panel.style.transform = "none";
}

function getViewportCenterRect() {
  return {
    left: window.innerWidth / 2 - 180,
    top: window.innerHeight / 2 - 40,
    right: window.innerWidth / 2 + 180,
    bottom: window.innerHeight / 2,
    width: 0,
    height: 0
  };
}

function restoreViewportScroll(x, y) {
  window.requestAnimationFrame(() => {
    window.scrollTo(x, y);
  });
}

async function translateSelectionInline(rawText, range) {
  const text = String(rawText || "").trim();
  if (!text) {
    return;
  }

  const targetBlock = findSelectionInsertionTarget(range);
  if (!targetBlock) {
    return;
  }

  closeTransientUi();

  try {
    const response = await chrome.runtime.sendMessage({
      type: "TRANSLATE_TEXT_SIMPLE",
      text
    });
    if (!response?.ok || !response.data?.translation) {
      return;
    }

    insertInlineTranslation(targetBlock, response.data.translation, response.data.providerLabel);
    activeSelectionText = text;
  } catch (_error) {
    // Ignore inline translation failure for selection-triggered mode.
  }
}

function closeTransientUi() {
  removePanel();
  hideInputGrammarHint();
}

function findSelectionInsertionTarget(range) {
  if (!range) {
    return null;
  }

  const baseNode = range.commonAncestorContainer instanceof Element
    ? range.commonAncestorContainer
    : range.commonAncestorContainer?.parentElement;
  if (!baseNode) {
    return null;
  }

  const direct = baseNode.closest("p, li, blockquote, h1, h2, h3, h4, h5, h6");
  if (isInlineTranslationBlock(direct)) {
    return direct;
  }

  const fallback = baseNode.closest("div, section, article, main");
  if (isInlineTranslationBlock(fallback)) {
    return fallback;
  }

  return null;
}

function isInlineTranslationBlock(node) {
  if (!(node instanceof HTMLElement) || node.closest(`#${PANEL_ID}`) || node.closest(`#${INPUT_HINT_ID}`)) {
    return false;
  }
  if (node.closest("nav, header, footer, aside, form, pre, code, table, figure, button, input, textarea, select, [contenteditable=''], [contenteditable='true']")) {
    return false;
  }

  const text = getInlineTranslationBlockText(node);
  if (!text || text.length < 18 || text.length > 900) {
    return false;
  }

  const rect = node.getBoundingClientRect();
  if (rect.width < 180 || rect.height < 16) {
    return false;
  }

  return !/^[\d\s.,:;()[\]{}\-_/\\|+=*&^%$#@!?"'`~]+$/.test(text);
}

function getInlineTranslationBlockText(node) {
  return String(node.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
}

function insertInlineTranslation(node, translation, providerLabel) {
  const translationNode = node.nextElementSibling?.getAttribute?.(INLINE_TRANSLATION_ATTR) === "true"
    ? node.nextElementSibling
    : document.createElement("div");
  translationNode.className = "st-inline-translation";
  translationNode.setAttribute(INLINE_TRANSLATION_ATTR, "true");
  translationNode.innerHTML = `
    <div class="st-inline-kicker">译文${providerLabel ? ` · ${escapeHtml(providerLabel)}` : ""}</div>
    <div class="st-inline-text">${escapeHtml(translation)}</div>
  `;

  if (translationNode !== node.nextElementSibling) {
    node.insertAdjacentElement("afterend", translationNode);
  }
}

function resolveSiteLayoutMode(hostname) {
  void hostname;
  return "dock";
}

function resolveDockCompensationMode(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (host === "x.com" || host === "twitter.com") {
    return "none";
  }
  return "push";
}

async function refreshPageActivationState() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
    const settings = response?.ok ? response.data : null;
    pageActivationState.ready = true;
    pageActivationState.enabled = isPageEnabledByRules(settings, window.location.href);
  } catch (_error) {
    pageActivationState.ready = true;
    pageActivationState.enabled = true;
  }

  if (!pageActivationState.enabled) {
    removePanel();
    hideInputGrammarHint();
  }
}

function isExtensionActiveOnPage() {
  return !pageActivationState.ready || pageActivationState.enabled;
}

function isPageEnabledByRules(settings, rawUrl) {
  if (!settings || settings.enabled === false) {
    return false;
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch (_error) {
    return true;
  }

  const blacklist = parseSiteRules(settings.siteBlacklist);
  if (matchesSiteRules(blacklist, url)) {
    return false;
  }

  if (settings.siteAccessMode === "whitelist") {
    const whitelist = parseSiteRules(settings.siteWhitelist);
    return matchesSiteRules(whitelist, url);
  }

  return true;
}

function parseSiteRules(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function matchesSiteRules(rules, url) {
  return rules.some((rule) => matchesSiteRule(rule, url));
}

function matchesSiteRule(rule, url) {
  const normalizedRule = String(rule || "").trim();
  if (!normalizedRule) {
    return false;
  }

  const lowerRule = normalizedRule.toLowerCase();
  const lowerHost = url.hostname.toLowerCase();
  const lowerUrl = url.href.toLowerCase();

  if (!/[*/]/.test(lowerRule) && !lowerRule.includes("://") && !lowerRule.includes("/")) {
    const domainRule = lowerRule.replace(/^\.+/, "");
    return lowerHost === domainRule || lowerHost.endsWith(`.${domainRule}`);
  }

  const escaped = lowerRule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const pattern = new RegExp(`^${escaped}$`, "i");
  return pattern.test(lowerUrl) || pattern.test(lowerHost);
}

function getEditableTarget(node) {
  if (!(node instanceof Element)) {
    return null;
  }

  if (node instanceof HTMLTextAreaElement) {
    return node;
  }

  if (node instanceof HTMLInputElement) {
    const supportedTypes = new Set(["text", "search", "email", "url"]);
    return supportedTypes.has((node.type || "text").toLowerCase()) ? node : null;
  }

  const editable = node.closest("[contenteditable=''], [contenteditable='true'], [contenteditable='plaintext-only']");
  return editable instanceof HTMLElement ? editable : null;
}

function isEditableSelectionTarget(target) {
  return Boolean(getEditableTarget(target));
}

function scheduleGrammarHintCheck(target) {
  const text = getEditableText(target);
  const normalized = normalizeInputGrammarText(text);
  grammarHintState.text = normalized;

  if (grammarHintState.timer) {
    window.clearTimeout(grammarHintState.timer);
  }

  if (!normalized) {
    hideInputGrammarHint();
    return;
  }

  showInputGrammarHintLoading(target);
  grammarHintState.timer = window.setTimeout(() => {
    grammarHintState.timer = null;
    void requestGrammarHint(target, normalized);
  }, 420);
}

async function requestGrammarHint(target, text) {
  const requestId = ++grammarHintState.requestId;

  try {
    const response = await chrome.runtime.sendMessage({
      type: "CHECK_GRAMMAR",
      text
    });

    if (requestId !== grammarHintState.requestId || grammarHintState.target !== target) {
      return;
    }

    if (!response?.ok) {
      showInputGrammarHintError(target, response?.error || "Grammar check failed");
      return;
    }

    renderInputGrammarHint(target, text, response.data?.grammar || null);
  } catch (error) {
    if (requestId !== grammarHintState.requestId || grammarHintState.target !== target) {
      return;
    }
    showInputGrammarHintError(target, error?.message || "Grammar check failed");
  }
}

function renderInputGrammarHint(target, sourceText, grammar) {
  const hint = ensureInputGrammarHint();
  const issueCount = grammar?.issues?.length || 0;
  const correctedText = issueCount ? applyGrammarCorrections(sourceText, grammar.issues) : sourceText;
  const status = issueCount ? `发现 ${issueCount} 处可优化表达` : "语法状态良好";
  const statusClass = issueCount ? "has-issues" : "is-clean";
  const diffMarkup = issueCount ? renderDiffMarkup(sourceText, correctedText) : `<span class="st-input-plain">${escapeHtml(sourceText)}</span>`;
  const copyAction = issueCount
    ? `<button class="st-input-copy" type="button" data-action="copy-grammar" aria-label="复制修正文本" title="复制修正文本">
         <svg viewBox="0 0 24 24" aria-hidden="true">
           <path d="M9 9.75C9 8.50736 10.0074 7.5 11.25 7.5H17.25C18.4926 7.5 19.5 8.50736 19.5 9.75V17.25C19.5 18.4926 18.4926 19.5 17.25 19.5H11.25C10.0074 19.5 9 18.4926 9 17.25V9.75Z" fill="none" stroke="currentColor" stroke-width="1.8"/>
           <path d="M6.75 15.75C5.50736 15.75 4.5 14.7426 4.5 13.5V6.75C4.5 5.50736 5.50736 4.5 6.75 4.5H13.5C14.7426 4.5 15.75 5.50736 15.75 6.75" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
         </svg>
       </button>`
    : "";
  const explanations = issueCount
    ? grammar.issues.map((issue) => `
        <section class="st-input-issue">
          <div class="st-input-issue-title">${escapeHtml(issue.shortMessage || issue.message || "Possible issue")}</div>
          ${issue.contextText ? `<div class="st-input-issue-context">${escapeHtml(issue.contextText)}</div>` : ""}
          ${issue.replacements?.length ? `<div class="st-input-issue-fix">建议：${escapeHtml(issue.replacements.join(", "))}</div>` : ""}
        </section>
      `).join("")
    : `<div class="st-input-empty">当前句子没有发现明显的英文语法问题。</div>`;

  hint.innerHTML = `
    <div class="st-input-hint-card">
      <div class="st-input-head">
        <img class="st-input-logo" src="${LOGO_URL}" alt="极简翻译 logo">
        <div class="st-input-status ${statusClass}">${escapeHtml(status)}</div>
      </div>
      <div class="st-input-shell">
        <section class="st-input-panel">
          <div class="st-input-panel-label">原句</div>
          <div class="st-input-preview">${diffMarkup}</div>
        </section>
        <section class="st-input-panel st-input-panel-main">
          <div class="st-input-panel-top">
            <div class="st-input-panel-label">语法提示</div>
            ${copyAction}
          </div>
          <div class="st-input-explain">${explanations}</div>
        </section>
      </div>
    </div>
  `;
  hint.querySelector("[data-action='copy-grammar']")?.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });
  hint.querySelector("[data-action='copy-grammar']")?.addEventListener("click", async () => {
    const copied = await copyTextToClipboard(correctedText);
    const button = hint.querySelector("[data-action='copy-grammar']");
    if (button) {
      button.classList.toggle("copied", copied);
      button.setAttribute("title", copied ? "已复制" : "复制失败");
      button.setAttribute("aria-label", copied ? "复制成功" : "复制失败");
      button.innerHTML = copied ? renderSuccessIcon() : renderCopyIcon();
      window.setTimeout(() => {
        button.classList.remove("copied");
        button.setAttribute("title", "复制修正文本");
        button.setAttribute("aria-label", "复制修正文本");
        button.innerHTML = renderCopyIcon();
      }, 1200);
    }
  });
  positionInputGrammarHint(hint, target);
  hint.dataset.visible = "true";
}

function showInputGrammarHintLoading(target) {
  const hint = ensureInputGrammarHint();
  hint.innerHTML = `
    <div class="st-input-hint-card">
      <div class="st-input-head">
        <img class="st-input-logo" src="${LOGO_URL}" alt="极简翻译 logo">
        <div class="st-input-status">正在检查英文语法...</div>
      </div>
    </div>
  `;
  positionInputGrammarHint(hint, target);
  hint.dataset.visible = "true";
}

function showInputGrammarHintError(target, message) {
  const hint = ensureInputGrammarHint();
  hint.innerHTML = `
    <div class="st-input-hint-card">
      <div class="st-input-head">
        <img class="st-input-logo" src="${LOGO_URL}" alt="极简翻译 logo">
        <div class="st-input-status has-error">${escapeHtml(message)}</div>
      </div>
    </div>
  `;
  positionInputGrammarHint(hint, target);
  hint.dataset.visible = "true";
}

function ensureInputGrammarHint() {
  let hint = document.getElementById(INPUT_HINT_ID);
  if (hint) {
    return hint;
  }

  hint = document.createElement("div");
  hint.id = INPUT_HINT_ID;
  document.documentElement.appendChild(hint);
  return hint;
}

function hideInputGrammarHint() {
  if (grammarHintState.timer) {
    window.clearTimeout(grammarHintState.timer);
    grammarHintState.timer = null;
  }

  grammarHintState.target = null;
  grammarHintState.text = "";
  const hint = document.getElementById(INPUT_HINT_ID);
  if (hint) {
    hint.dataset.visible = "false";
    hint.remove();
  }
  if (!getPanel()) {
    clearDockLayout();
  }
}

function positionInputGrammarHint(hint, target) {
  void target;
  const width = clampDockWidth(DOCK_OPEN_WIDTH);
  document.documentElement.dataset.stDocked = "true";
  document.documentElement.style.setProperty("--st-dock-width", `${width}px`);
  hint.style.width = `${width}px`;
  hint.style.top = "0";
  hint.style.right = "0";
  hint.style.bottom = "0";
  hint.style.left = "auto";
}

function getEditableText(target) {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return target.value || "";
  }

  return target.textContent || "";
}

async function copyTextToClipboard(text) {
  const value = String(text || "");
  if (!value) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch (_error) {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    textarea.style.top = "0";
    textarea.style.left = "0";
    document.documentElement.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (_copyError) {
      copied = false;
    }
    textarea.remove();
    return copied;
  }
}

function renderCopyIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 9.75C9 8.50736 10.0074 7.5 11.25 7.5H17.25C18.4926 7.5 19.5 8.50736 19.5 9.75V17.25C19.5 18.4926 18.4926 19.5 17.25 19.5H11.25C10.0074 19.5 9 18.4926 9 17.25V9.75Z" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path d="M6.75 15.75C5.50736 15.75 4.5 14.7426 4.5 13.5V6.75C4.5 5.50736 5.50736 4.5 6.75 4.5H13.5C14.7426 4.5 15.75 5.50736 15.75 6.75" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `;
}

function renderSuccessIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.75 12.75L10.25 16.25L17.25 8.75" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

function normalizeInputGrammarText(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length < 6 || normalized.length > 800) {
    return "";
  }
  if (!looksLikeEnglishInput(normalized)) {
    return "";
  }
  return normalized;
}

function looksLikeEnglishInput(text) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return false;
  }

  if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff]/.test(normalized)) {
    return false;
  }

  const letters = normalized.match(/[A-Za-z]/g) || [];
  if (letters.length < 3) {
    return false;
  }

  const visibleChars = normalized.replace(/\s+/g, "");
  return letters.length / Math.max(visibleChars.length, 1) >= 0.55;
}

function applyGrammarCorrections(sourceText, issues) {
  const ordered = (issues || [])
    .filter((issue) => Number.isFinite(issue.offset) && Number.isFinite(issue.length))
    .slice()
    .sort((left, right) => left.offset - right.offset);

  let result = "";
  let cursor = 0;

  for (const issue of ordered) {
    const start = Math.max(cursor, issue.offset);
    const end = Math.max(start, issue.offset + issue.length);
    if (start > sourceText.length) {
      continue;
    }
    result += sourceText.slice(cursor, start);
    result += issue.replacements?.[0] || sourceText.slice(start, end);
    cursor = Math.min(sourceText.length, end);
  }

  result += sourceText.slice(cursor);
  return result;
}

function renderDiffMarkup(sourceText, correctedText) {
  const parts = diffText(sourceText, correctedText);
  return parts.map((part) => {
    if (part.type === "equal") {
      return `<span class="st-input-plain">${escapeHtml(part.value)}</span>`;
    }
    if (part.type === "delete") {
      return `<span class="st-input-delete">${escapeHtml(part.value)}</span>`;
    }
    return `<span class="st-input-add">${escapeHtml(part.value)}</span>`;
  }).join("");
}

function diffText(sourceText, correctedText) {
  const sourceChars = Array.from(sourceText);
  const targetChars = Array.from(correctedText);
  const rows = sourceChars.length + 1;
  const cols = targetChars.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = rows - 2; i >= 0; i -= 1) {
    for (let j = cols - 2; j >= 0; j -= 1) {
      matrix[i][j] = sourceChars[i] === targetChars[j]
        ? matrix[i + 1][j + 1] + 1
        : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    }
  }

  const parts = [];
  let i = 0;
  let j = 0;

  while (i < sourceChars.length && j < targetChars.length) {
    if (sourceChars[i] === targetChars[j]) {
      pushDiffPart(parts, "equal", sourceChars[i]);
      i += 1;
      j += 1;
      continue;
    }

    if (matrix[i + 1][j] >= matrix[i][j + 1]) {
      pushDiffPart(parts, "delete", sourceChars[i]);
      i += 1;
    } else {
      pushDiffPart(parts, "add", targetChars[j]);
      j += 1;
    }
  }

  while (i < sourceChars.length) {
    pushDiffPart(parts, "delete", sourceChars[i]);
    i += 1;
  }

  while (j < targetChars.length) {
    pushDiffPart(parts, "add", targetChars[j]);
    j += 1;
  }

  return parts;
}

function pushDiffPart(parts, type, value) {
  const last = parts[parts.length - 1];
  if (last && last.type === type) {
    last.value += value;
    return;
  }

  parts.push({ type, value });
}

function bindActions(panel, payload) {
  const results = payload.results || [];
  panel.querySelector("[data-action='close']")?.addEventListener("click", () => removePanel());
  panel.querySelector("[data-action='toggle-pane']")?.addEventListener("click", () => {
    const nextState = panel.dataset.paneState === "collapsed" ? "open" : "collapsed";
    setPanelPaneState(panel, nextState);
  });
  panel.querySelector("[data-action='close-pane']")?.addEventListener("click", () => {
    setPanelPaneState(panel, "closed");
  });
  panel.querySelector("[data-action='reopen-pane']")?.addEventListener("click", () => {
    setPanelPaneState(panel, "open");
  });
  panel.querySelector("[data-action='open-settings']")?.addEventListener("click", async () => {
    try {
      await chrome.runtime.openOptionsPage();
    } catch (_error) {
      // Keep the panel open even if the settings page cannot be opened.
    }
  });
  panel.querySelector("[data-action='reset-position']")?.addEventListener("click", () => {
    panel.dataset.locked = "false";
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const rect = range?.getBoundingClientRect() || currentAnchorRect || getViewportCenterRect();
    positionPanel(panel, rect);
  });
  panel.querySelector("[data-action='play']")?.addEventListener("click", async () => {
    await playSelection(panel, payload);
  });

  panel.querySelectorAll("[data-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      const provider = button.dataset.provider;
      const entry = results.find((item) => item.provider === provider);
      if (!entry) {
        return;
      }

      panel.querySelectorAll("[data-provider]").forEach((node) => {
        node.classList.toggle("active", node.dataset.provider === provider);
      });

      const body = panel.querySelector("[data-role='body']");
      if (body) {
        body.innerHTML = renderBody(entry, payload.dictionary, payload.grammar);
        syncPaneControls(panel);
        adjustPanelAfterContentChange(panel);
      }
    });
  });

  const divider = panel.querySelector("[data-role='pane-divider']");
  divider?.addEventListener("pointerdown", (event) => {
    if (panel.dataset.paneState !== "open") {
      return;
    }

    event.preventDefault();
    splitDragState = {
      pointerId: event.pointerId,
      panel
    };
    divider.setPointerCapture(event.pointerId);
    panel.classList.add("resizing");
  });
}

function renderLoading(text, options = {}) {
  return `
    <div class="st-divider" data-role="pane-divider" aria-hidden="true"></div>
    <div class="st-head">
      <div class="st-drag-handle">
        <img class="st-logo" src="${LOGO_URL}" alt="极简翻译 logo">
        <div class="st-title">${escapeHtml(options.panelTitle || "翻译中")}</div>
        <div class="st-grip" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
      </div>
      <div class="st-head-actions">
        <button class="st-mini-action" data-action="toggle-pane" aria-label="收起右侧" title="收起右侧">⇢</button>
        <button class="st-mini-action" data-action="close-pane" aria-label="关闭右侧" title="关闭右侧">⊟</button>
        <button class="st-mini-action" data-action="reopen-pane" aria-label="打开右侧" title="打开右侧">⟫</button>
        <button class="st-mini-action" data-action="reset-position" aria-label="Reset position" title="恢复自动定位">↺</button>
        <button class="st-close" data-action="close" aria-label="Close">×</button>
      </div>
    </div>
    <section class="st-dock-body">
      <div class="st-pane-label">原文</div>
      <div class="st-source">${escapeHtml(text)}</div>
      <div class="st-pane-label">状态</div>
      <div class="st-loading">${escapeHtml(options.loadingMessage || "正在请求翻译服务...")}</div>
    </section>
  `;
}

function renderError(text, error, options = {}) {
  return `
    <div class="st-divider" data-role="pane-divider" aria-hidden="true"></div>
    <div class="st-head">
      <div class="st-drag-handle">
        <img class="st-logo" src="${LOGO_URL}" alt="极简翻译 logo">
        <div class="st-title">${escapeHtml(options.panelTitle || "翻译失败")}</div>
        <div class="st-grip" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
      </div>
      <div class="st-head-actions">
        <button class="st-mini-action" data-action="toggle-pane" aria-label="收起右侧" title="收起右侧">⇢</button>
        <button class="st-mini-action" data-action="close-pane" aria-label="关闭右侧" title="关闭右侧">⊟</button>
        <button class="st-mini-action" data-action="reopen-pane" aria-label="打开右侧" title="打开右侧">⟫</button>
        <button class="st-mini-action" data-action="reset-position" aria-label="Reset position" title="恢复自动定位">↺</button>
        <button class="st-close" data-action="close" aria-label="Close">×</button>
      </div>
    </div>
    <section class="st-dock-body">
      <div class="st-pane-label">原文</div>
      <div class="st-source">${escapeHtml(text)}</div>
      <div class="st-pane-label">状态</div>
      <div class="st-error">${escapeHtml(error)}</div>
      <div class="st-actions">
        <button class="st-secondary-action" data-action="open-settings" type="button">打开设置</button>
      </div>
    </section>
  `;
}

function renderResults(text, payload) {
  const results = payload.results || [];
  const primary = results.find((item) => !item.error) || results[0];
  const tabs = results.map((item) => {
    const label = item.providerLabel || item.provider;
    return `<button class="st-tab ${item.provider === primary?.provider ? "active" : ""}" data-provider="${escapeHtml(item.provider)}">${escapeHtml(label)}</button>`;
  }).join("");
  const actions = payload.ttsEnabled
    ? `<div class="st-actions">
         <button class="st-icon-action" data-action="play" aria-label="播放原文" title="播放原文">
           <svg viewBox="0 0 24 24" aria-hidden="true">
             <path d="M5 10.5V13.5H8.4L12.8 17V7L8.4 10.5H5Z" fill="currentColor"/>
             <path d="M15.2 9.2C16.4 10 17.1 11.2 17.1 12.5C17.1 13.8 16.4 15 15.2 15.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
             <path d="M17 6.7C19 8.1 20.2 10.2 20.2 12.5C20.2 14.8 19 16.9 17 18.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
           </svg>
         </button>
       </div>`
    : "";
  const body = renderBody(primary, payload.dictionary, payload.grammar);

  return `
    <div class="st-divider" data-role="pane-divider" aria-hidden="true"></div>
    <div class="st-head">
      <div class="st-drag-handle">
        <img class="st-logo" src="${LOGO_URL}" alt="极简翻译 logo">
        <div class="st-title">${escapeHtml(payload.panelTitle || "划词翻译")}</div>
        <div class="st-grip" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
      </div>
      <div class="st-head-actions">
        <button class="st-mini-action" data-action="toggle-pane" aria-label="收起右侧" title="收起右侧">⇢</button>
        <button class="st-mini-action" data-action="close-pane" aria-label="关闭右侧" title="关闭右侧">⊟</button>
        <button class="st-mini-action" data-action="reopen-pane" aria-label="打开右侧" title="打开右侧">⟫</button>
        <button class="st-mini-action" data-action="reset-position" aria-label="Reset position" title="恢复自动定位">↺</button>
        <button class="st-close" data-action="close" aria-label="Close">×</button>
      </div>
    </div>
    <section class="st-dock-body">
      <div class="st-pane-label">原文</div>
      <div class="st-source">${escapeHtml(text)}</div>
      <div class="st-main-top">
        <div class="st-main-top-left">
          <div class="st-pane-label">结果</div>
          <div class="st-tabs">${tabs}</div>
        </div>
        ${actions}
      </div>
      <div data-role="body">${body}</div>
    </section>
  `;
}

function renderBody(entry, dictionary, grammar) {
  if (!entry) {
    return `<div class="st-error">没有可展示的翻译结果</div>`;
  }

  if (entry.error) {
    return `<div class="st-error">${escapeHtml(entry.error)}</div>`;
  }

  return `
    <div class="st-body-scroll">
      <section class="st-reading-block">
        <div class="st-kicker">译文</div>
        <div class="st-translation">${escapeHtml(entry.translation || "")}</div>
        <div class="st-meta">来源：${escapeHtml(entry.providerLabel || "")}${entry.detectedLanguage ? ` · 识别语言：${escapeHtml(entry.detectedLanguage)}` : ""}</div>
      </section>
      ${renderGrammar(grammar)}
      ${renderDictionary(dictionary)}
    </div>
  `;
}

function renderGrammar(grammar) {
  if (!grammar?.issues?.length) {
    return "";
  }

  return `
    <div class="st-grammar">
      <div class="st-grammar-title">英文语法提示</div>
      <div class="st-grammar-list">
        ${grammar.issues.map((issue) => `
          <section class="st-grammar-item">
            <div class="st-grammar-message">${escapeHtml(issue.shortMessage || issue.message || "Possible issue")}</div>
            ${issue.contextText ? `<div class="st-grammar-context">${escapeHtml(highlightContext(issue.contextText, issue.contextOffset, issue.contextLength))}</div>` : ""}
            ${issue.replacements?.length ? `<div class="st-grammar-suggestion">建议：${escapeHtml(issue.replacements.join(", "))}</div>` : ""}
            ${issue.category ? `<div class="st-grammar-meta">${escapeHtml(issue.category)}</div>` : ""}
          </section>
        `).join("")}
      </div>
    </div>
  `;
}

function renderDictionary(dictionary) {
  if (!dictionary) {
    return "";
  }

  const phonetics = dictionary.phonetics?.length
    ? `<div class="st-phonetics">${dictionary.phonetics
        .map((item) => `<span class="st-chip">${escapeHtml(item.text || item.audio || "")}</span>`)
        .join("")}</div>`
    : "";

  const meanings = dictionary.meanings?.length
    ? `<div class="st-dictionary-list">${dictionary.meanings.map((meaning) => `
        <section class="st-dictionary-item">
          <div class="st-pos">${escapeHtml(meaning.partOfSpeech || "meaning")}</div>
          ${meaning.definitions.map((definition) => `
            <div class="st-definition">${escapeHtml(definition.definition || "")}</div>
            ${definition.example ? `<div class="st-example">例句：${escapeHtml(definition.example)}</div>` : ""}
          `).join("")}
          ${meaning.synonyms?.length ? `<div class="st-synonyms">近义词：${escapeHtml(meaning.synonyms.join(", "))}</div>` : ""}
        </section>
      `).join("")}</div>`
    : "";

  return `
    <div class="st-dictionary">
      <div class="st-dictionary-title">词典注释 · ${escapeHtml(dictionary.word || "")}</div>
      ${phonetics}
      ${meanings}
    </div>
  `;
}

function initializePanelLayout(panel) {
  if (!panel.dataset.paneState) {
    panel.dataset.paneState = dockLayoutState.paneState || "open";
  }
  if (!panel.style.getPropertyValue("--st-dock-width")) {
    panel.style.setProperty("--st-dock-width", `${clampDockWidth(dockLayoutState.width || DOCK_OPEN_WIDTH)}px`);
  }
  syncPaneControls(panel);
  syncDockLayout(panel);
}

function syncPaneControls(panel) {
  const paneState = panel.dataset.paneState || "open";
  const toggleButton = panel.querySelector("[data-action='toggle-pane']");
  const reopenButton = panel.querySelector("[data-action='reopen-pane']");
  const closeButton = panel.querySelector("[data-action='close-pane']");

  if (toggleButton) {
    if (paneState === "collapsed") {
      toggleButton.textContent = "⇠";
      toggleButton.title = "展开右侧";
      toggleButton.setAttribute("aria-label", "展开右侧");
    } else {
      toggleButton.textContent = "⇢";
      toggleButton.title = "收起右侧";
      toggleButton.setAttribute("aria-label", "收起右侧");
    }
  }

  if (reopenButton) {
    reopenButton.title = "打开右侧";
    reopenButton.setAttribute("aria-label", "打开右侧");
  }

  if (closeButton) {
    closeButton.title = "关闭右侧";
    closeButton.setAttribute("aria-label", "关闭右侧");
  }
}

function setPanelPaneState(panel, paneState) {
  panel.dataset.paneState = paneState;
  dockLayoutState.paneState = paneState;
  if (paneState === "open") {
    const currentWidth = parseFloat(panel.style.getPropertyValue("--st-dock-width")) || DOCK_OPEN_WIDTH;
    const nextWidth = clampDockWidth(currentWidth);
    panel.style.setProperty("--st-dock-width", `${nextWidth}px`);
    dockLayoutState.width = nextWidth;
  }
  void persistDockLayoutState();
  syncPaneControls(panel);
  adjustPanelAfterContentChange(panel);
}

function clampDockWidth(desiredWidth) {
  const viewportMax = Math.max(320, window.innerWidth - 240);
  return Math.min(viewportMax, Math.max(320, desiredWidth));
}

function getPanelDockWidth(panel) {
  const paneState = panel.dataset.paneState || "open";
  if (paneState === "closed") {
    return 0;
  }
  if (paneState === "collapsed") {
    return DOCK_COLLAPSED_WIDTH;
  }
  const stored = parseFloat(panel.style.getPropertyValue("--st-dock-width")) || DOCK_OPEN_WIDTH;
  return clampDockWidth(stored);
}

function syncDockLayout(panel) {
  const width = getPanelDockWidth(panel);
  const root = document.documentElement;
  const effectiveWidth = currentDockCompensationMode === "push" ? width : 0;
  root.dataset.stDocked = effectiveWidth > 0 ? "true" : "false";
  root.style.setProperty("--st-dock-width", `${effectiveWidth}px`);
  applyDockCompensation(effectiveWidth);
  if (width > 0) {
    ensureDockMutationObserver();
  } else {
    disconnectDockMutationObserver();
  }
}

function clearDockLayout() {
  const root = document.documentElement;
  delete root.dataset.stDocked;
  root.style.removeProperty("--st-dock-width");
  restoreDockCompensation();
  disconnectDockMutationObserver();
}

async function loadDockLayoutState() {
  try {
    const payload = await chrome.storage.local.get(DOCK_LAYOUT_STORAGE_KEY);
    const stored = payload?.[DOCK_LAYOUT_STORAGE_KEY];
    dockLayoutState = {
      loaded: true,
      paneState: normalizeDockPaneState(stored?.paneState),
      width: clampDockWidth(Number(stored?.width) || DOCK_OPEN_WIDTH)
    };
  } catch (_error) {
    dockLayoutState = {
      loaded: true,
      paneState: "open",
      width: DOCK_OPEN_WIDTH
    };
  }
}

async function persistDockLayoutState() {
  try {
    await chrome.storage.local.set({
      [DOCK_LAYOUT_STORAGE_KEY]: {
        paneState: normalizeDockPaneState(dockLayoutState.paneState),
        width: clampDockWidth(dockLayoutState.width || DOCK_OPEN_WIDTH)
      }
    });
  } catch (_error) {
    // Ignore storage errors and keep the in-memory layout state.
  }
}

function normalizeDockPaneState(value) {
  return value === "collapsed" || value === "closed" ? value : "open";
}

function applyDockCompensation(width) {
  restoreDockCompensation();
  if (!width) {
    return;
  }

  const primary = findPrimaryContentRoot();
  if (primary) {
    rememberInlineStyle(primary, "maxWidth");
    rememberInlineStyle(primary, "width");
    rememberInlineStyle(primary, "marginRight");
    rememberInlineStyle(primary, "boxSizing");
    primary.style.boxSizing = "border-box";
    primary.style.maxWidth = `calc(100vw - ${width}px)`;
    if (isLikelyFullWidth(primary)) {
      primary.style.width = `calc(100vw - ${width}px)`;
    }
    primary.style.marginRight = `${width}px`;
    dockAdjustedElements.push(primary);
  }

  const fixedCandidates = findDockAwareFixedElements();
  fixedCandidates.forEach((element) => {
    rememberInlineStyle(element, "right");
    const computed = window.getComputedStyle(element);
    const currentRight = parseFloat(computed.right);
    const nextRight = Number.isFinite(currentRight) ? currentRight + width : width;
    element.style.right = `${nextRight}px`;
    dockAdjustedElements.push(element);
  });
}

function restoreDockCompensation() {
  dockAdjustedElements.forEach((element) => {
    restoreInlineStyle(element, "maxWidth");
    restoreInlineStyle(element, "width");
    restoreInlineStyle(element, "marginRight");
    restoreInlineStyle(element, "boxSizing");
    restoreInlineStyle(element, "right");
  });
  dockAdjustedElements = [];
}

function findPrimaryContentRoot() {
  const hostnameMatches = getHostnameSpecificContentSelectors(window.location.hostname);
  for (const selector of hostnameMatches) {
    const node = document.querySelector(selector);
    if (isGoodDockCandidate(node)) {
      return node;
    }
  }

  const directMatches = [
    "main",
    "[role='main']",
    "article",
    "article main",
    "#content",
    "#main",
    "#__next main",
    "#app main",
    "#root main",
    ".container main",
    ".main",
    ".content",
    ".main-content",
    ".content-wrapper",
    ".article-content",
    ".article",
    ".docMainContainer",
    ".docItemContainer",
    ".vitepress-doc",
    ".VPDoc.has-aside .content",
    ".VPDoc .container .content",
    ".md-content",
    ".md-main__inner",
    ".theme-default-content",
    ".markdown-body",
    ".theme-doc-markdown",
    ".docs-wrapper",
    ".post-content"
  ];

  for (const selector of directMatches) {
    const node = document.querySelector(selector);
    if (isGoodDockCandidate(node)) {
      return node;
    }
  }

  const candidates = Array.from(document.body.querySelectorAll("div, section, article, main"))
    .filter((node) => isGoodDockCandidate(node))
    .map((node) => ({ node, score: scoreDockCandidate(node) }))
    .sort((left, right) => right.score - left.score);

  return candidates[0]?.node || null;
}

function getHostnameSpecificContentSelectors(hostname) {
  const host = String(hostname || "").toLowerCase();

  if (host === "github.com") {
    return [
      "main .markdown-body",
      "main .Box-sc-g0xbh4-0",
      "main [data-testid='issue-viewer-issue-container']",
      "main [data-testid='issue-body']",
      "main .application-main"
    ];
  }

  if (host.endsWith("medium.com")) {
    return [
      "main article",
      "main section",
      "article section"
    ];
  }

  if (host.endsWith("juejin.cn")) {
    return [
      "main article",
      ".article-viewer",
      ".article-content",
      ".main-area"
    ];
  }

  if (host.endsWith("yuque.com")) {
    return [
      ".ne-doc-main",
      ".lake-content-area",
      ".article-content"
    ];
  }

  if (host.endsWith("notion.site")) {
    return [
      ".notion-frame",
      ".notion-page-content",
      ".notion-scroller"
    ];
  }

  if (host.endsWith("readthedocs.io")) {
    return [
      "[role='main']",
      ".wy-nav-content",
      ".document"
    ];
  }

  if (host.endsWith("gitbook.io")) {
    return [
      "main article",
      "[data-testid='page.content']",
      ".page-inner"
    ];
  }

  if (host.endsWith("vitejs.dev") || host.endsWith("vuejs.org") || host.endsWith("nuxt.com")) {
    return [
      ".VPContent .content-container",
      ".VPDoc .content",
      ".vp-doc"
    ];
  }

  if (host.endsWith("vercel.app") || host.endsWith("netlify.app")) {
    return [
      "main .prose",
      "main article",
      ".theme-doc-markdown",
      ".markdown"
    ];
  }

  if (host.endsWith("docusaurus.io") || host.endsWith("storybook.js.org")) {
    return [
      ".theme-doc-markdown",
      ".docMainContainer main",
      ".main-wrapper"
    ];
  }

  return [];
}

function isGoodDockCandidate(node) {
  if (!(node instanceof HTMLElement) || node.id === PANEL_ID || node.id === INPUT_HINT_ID) {
    return false;
  }

  const rect = node.getBoundingClientRect();
  if (rect.width < 280 || rect.height < 180) {
    return false;
  }

  const computed = window.getComputedStyle(node);
  if (computed.position === "fixed" || computed.position === "absolute" || computed.display === "none" || computed.visibility === "hidden") {
    return false;
  }

  if (node.childElementCount < 2 && (node.textContent || "").trim().length < 200) {
    return false;
  }

  return rect.top < window.innerHeight * 0.45;
}

function scoreDockCandidate(node) {
  const rect = node.getBoundingClientRect();
  const areaScore = rect.width * Math.min(rect.height, window.innerHeight * 1.2);
  const semanticBoost = /main|content|article|doc|post/i.test(`${node.id} ${node.className}`) ? 180000 : 0;
  const centralBoost = rect.left < window.innerWidth * 0.25 ? 80000 : 0;
  const proseBoost = /markdown|prose|article|doc|readme|post|content|body/i.test(`${node.id} ${node.className}`) ? 90000 : 0;
  const penalty = /nav|sidebar|toc|menu|footer|header|comment|toolbar|aside/i.test(`${node.id} ${node.className}`) ? 220000 : 0;
  return areaScore + semanticBoost + centralBoost + proseBoost - penalty;
}

function isLikelyFullWidth(node) {
  const rect = node.getBoundingClientRect();
  return rect.width >= window.innerWidth * 0.7;
}

function findDockAwareFixedElements() {
  return Array.from(document.body.querySelectorAll("*"))
    .filter((node) => {
      if (!(node instanceof HTMLElement) || node.id === PANEL_ID || node.id === INPUT_HINT_ID) {
        return false;
      }
      const computed = window.getComputedStyle(node);
      if (computed.position !== "fixed") {
        return false;
      }
      const rect = node.getBoundingClientRect();
      return rect.width > 80 && rect.right > window.innerWidth - 24;
    })
    .slice(0, 12);
}

function rememberInlineStyle(element, key) {
  const dataKey = `stOrig${key[0].toUpperCase()}${key.slice(1)}`;
  if (!(dataKey in element.dataset)) {
    element.dataset[dataKey] = element.style[key] || "";
  }
}

function restoreInlineStyle(element, key) {
  const dataKey = `stOrig${key[0].toUpperCase()}${key.slice(1)}`;
  if (!(dataKey in element.dataset)) {
    return;
  }

  const original = element.dataset[dataKey];
  if (original) {
    element.style[key] = original;
  } else {
    element.style.removeProperty(key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`));
  }
  delete element.dataset[dataKey];
}

function ensureDockMutationObserver() {
  if (dockMutationObserver) {
    return;
  }

  dockMutationObserver = new MutationObserver((mutations) => {
    const shouldResync = mutations.some((mutation) => {
      const target = mutation.target;
      if (!(target instanceof Element)) {
        return false;
      }
      return !target.closest(`#${PANEL_ID}`) && !target.closest(`#${INPUT_HINT_ID}`);
    });

    if (shouldResync) {
      scheduleDockResync();
    }
  });

  dockMutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "id"]
  });
}

function disconnectDockMutationObserver() {
  if (dockMutationObserver) {
    dockMutationObserver.disconnect();
    dockMutationObserver = null;
  }
  if (dockResyncTimer) {
    window.clearTimeout(dockResyncTimer);
    dockResyncTimer = null;
  }
}

function scheduleDockResync() {
  if (dockResyncTimer) {
    window.clearTimeout(dockResyncTimer);
  }

  dockResyncTimer = window.setTimeout(() => {
    dockResyncTimer = null;
    const panel = getPanel();
    if (panel) {
      syncDockLayout(panel);
    } else if (document.getElementById(INPUT_HINT_ID)) {
      const width = clampDockWidth(DOCK_OPEN_WIDTH);
      document.documentElement.dataset.stDocked = "true";
      document.documentElement.style.setProperty("--st-dock-width", `${width}px`);
      applyDockCompensation(width);
      ensureDockMutationObserver();
    }
  }, 120);
}

async function playSelection(panel, payload) {
  stopSpeech();

  const utterance = new SpeechSynthesisUtterance(activeSelectionText);
  const primary = (payload.results || []).find((item) => !item.error) || payload.results?.[0];
  const lang = normalizeSpeechLanguage(primary?.detectedLanguage || "en");
  const voice = await resolveVoice(payload.ttsVoiceName, lang, payload.ttsVoiceMode || "smart_soft");

  utterance.lang = voice?.lang || lang;
  utterance.rate = clampNumber(payload.ttsRate, 0.7, 1.2, 0.9);
  utterance.pitch = clampNumber(payload.ttsPitch, 0.8, 1.2, 0.98);
  utterance.volume = clampNumber(payload.ttsVolume, 0.4, 1, 1);
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onend = () => updateSpeechState(panel, false);
  utterance.onerror = () => updateSpeechState(panel, false);
  currentSpeech = utterance;
  updateSpeechState(panel, true);
  window.speechSynthesis.speak(utterance);
}

function stopSpeech() {
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }
  currentSpeech = null;
}

function updateSpeechState(panel, isPlaying) {
  panel.querySelector("[data-action='play']")?.classList.toggle("active", isPlaying);
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

function normalizeSpeechLanguage(language) {
  const lower = String(language || "en").toLowerCase();
  if (lower === "zh-cn" || lower === "zh-hans") {
    return "zh-CN";
  }
  if (lower === "zh-tw" || lower === "zh-hant") {
    return "zh-TW";
  }
  if (lower === "en") {
    return "en-US";
  }
  if (lower === "ja") {
    return "ja-JP";
  }
  if (lower === "ko") {
    return "ko-KR";
  }
  if (lower === "fr") {
    return "fr-FR";
  }
  return language;
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

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numeric));
}

function bindDrag(panel) {
  void panel;
}

function endDrag(event) {
  void event;
  dragState = null;
}

function endSplitDrag(event) {
  const panel = splitDragState?.panel;
  const divider = panel?.querySelector("[data-role='pane-divider']");
  if (!splitDragState || splitDragState.pointerId !== event.pointerId || !panel) {
    return;
  }

  panel.classList.remove("resizing");
  if (divider?.hasPointerCapture(event.pointerId)) {
    divider.releasePointerCapture(event.pointerId);
  }
  splitDragState = null;
  void persistDockLayoutState();
}

window.addEventListener("resize", () => {
  const panel = getPanel();
  if (panel) {
    adjustPanelAfterContentChange(panel);
    scheduleDockResync();
  }
  const hint = document.getElementById(INPUT_HINT_ID);
  if (hint && grammarHintState.target) {
    positionInputGrammarHint(hint, grammarHintState.target);
    scheduleDockResync();
  }
});

window.addEventListener("scroll", () => {
  const panel = getPanel();
  if (panel) {
    adjustPanelAfterContentChange(panel);
  }
  const hint = document.getElementById(INPUT_HINT_ID);
  if (hint && grammarHintState.target) {
    positionInputGrammarHint(hint, grammarHintState.target);
  }
}, true);

document.addEventListener("pointermove", (event) => {
  if (!splitDragState) {
    return;
  }

  const panel = splitDragState.panel;
  if (!panel || panel.dataset.paneState !== "open") {
    return;
  }

  const rect = panel.getBoundingClientRect();
  const nextWidth = clampDockWidth(window.innerWidth - event.clientX);
  panel.style.setProperty("--st-dock-width", `${nextWidth}px`);
  dockLayoutState.width = nextWidth;
  adjustPanelAfterContentChange(panel);
});

document.addEventListener("pointerup", endSplitDrag);
document.addEventListener("pointercancel", endSplitDrag);

function injectStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    html[data-st-docked="true"],
    html[data-st-docked="true"] body {
      width: calc(100vw - var(--st-dock-width, 0px)) !important;
      max-width: calc(100vw - var(--st-dock-width, 0px)) !important;
      min-width: 0 !important;
      margin-right: var(--st-dock-width, 0px) !important;
      overflow-x: hidden !important;
      transition: width 180ms ease, max-width 180ms ease, margin-right 180ms ease;
    }
    #${PANEL_ID} {
      position: fixed;
      z-index: 2147483647;
      top: 0;
      right: 0;
      bottom: 0;
      width: var(--st-dock-width, 420px);
      max-height: none;
      padding: 18px 18px 16px;
      border-radius: 0;
      border-left: 1px solid rgba(226, 232, 240, 0.95);
      border-top: 0;
      border-right: 0;
      border-bottom: 0;
      background:
        radial-gradient(circle at top right, rgba(191, 219, 254, 0.28), transparent 30%),
        linear-gradient(180deg, rgba(252, 253, 255, 0.99) 0%, rgba(255, 255, 255, 0.99) 100%);
      box-shadow:
        -14px 0 36px rgba(15, 23, 42, 0.08);
      color: #0f172a;
      font: 14px/1.6 "Iowan Old Style", "Palatino Linotype", "Noto Serif SC", "Source Han Serif SC", "Songti SC", serif;
      overflow: auto;
      backdrop-filter: blur(18px);
    }
    #${PANEL_ID}[data-layout-mode="overlay"] {
      position: fixed;
      width: min(520px, calc(100vw - 24px));
      max-height: calc(100vh - 24px);
      padding: 18px 18px 16px;
      border-radius: 22px;
      border: 1px solid rgba(226, 232, 240, 0.95);
      box-shadow:
        0 24px 60px rgba(15, 23, 42, 0.12),
        0 2px 10px rgba(15, 23, 42, 0.05);
      overflow: hidden;
    }
    #${PANEL_ID}[data-pane-state="closed"] {
      width: 0;
      padding: 0;
      border-left: 0;
      overflow: hidden;
      box-shadow: none;
    }
    #${PANEL_ID} * {
      box-sizing: border-box;
    }
    #${PANEL_ID} .st-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 10px;
      opacity: 0.58;
      transition: opacity 140ms ease;
    }
    #${PANEL_ID}:hover .st-head,
    #${PANEL_ID}:focus-within .st-head {
      opacity: 0.95;
    }
    #${PANEL_ID} .st-drag-handle {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      cursor: default;
    }
    #${PANEL_ID} .st-logo {
      width: 18px;
      height: 18px;
      border-radius: 5px;
      flex-shrink: 0;
      box-shadow: 0 6px 12px rgba(37, 99, 235, 0.16);
    }
    #${PANEL_ID} .st-head-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }
    #${PANEL_ID} .st-grip {
      display: inline-flex;
      gap: 3px;
      align-items: center;
    }
    #${PANEL_ID} .st-grip span {
      width: 3px;
      height: 3px;
      border-radius: 999px;
      background: rgba(100, 116, 139, 0.45);
    }
    #${PANEL_ID} .st-title {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: #64748b;
      transition: color 140ms ease;
    }
    #${PANEL_ID}:hover .st-title,
    #${PANEL_ID}:focus-within .st-title {
      color: #475569;
    }
    #${PANEL_ID} .st-mini-action,
    #${PANEL_ID} .st-close {
      border: 0;
      background: transparent;
      color: #53627a;
      cursor: pointer;
      padding: 0;
    }
    #${PANEL_ID} .st-mini-action {
      width: 22px;
      height: 22px;
      font-size: 11px;
      border-radius: 999px;
      background: rgba(248, 250, 252, 0.72);
      color: #64748b;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    #${PANEL_ID} .st-close {
      font-size: 16px;
      line-height: 1;
    }
    #${PANEL_ID} .st-source {
      max-height: min(52vh, 420px);
      overflow: auto;
      padding: 14px 14px 16px;
      border-radius: 16px;
      border: 1px solid rgba(226, 232, 240, 0.9);
      background: rgba(248, 250, 252, 0.76);
      color: #475569;
      font-size: 13px;
      line-height: 1.78;
      word-break: break-word;
    }
    #${PANEL_ID} .st-dock-body {
      min-width: 0;
    }
    #${PANEL_ID}[data-layout-mode="overlay"] .st-divider {
      display: none;
    }
    #${PANEL_ID} .st-main-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }
    #${PANEL_ID} .st-main-top-left {
      min-width: 0;
      flex: 1;
    }
    #${PANEL_ID} .st-pane-label {
      margin-bottom: 8px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #94a3b8;
    }
    #${PANEL_ID} .st-divider {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 12px;
      cursor: col-resize;
      transform: translateX(-50%);
    }
    #${PANEL_ID} .st-divider::before {
      content: "";
      position: absolute;
      left: 5px;
      top: 6px;
      bottom: 6px;
      width: 2px;
      border-radius: 999px;
      background: rgba(226, 232, 240, 0.96);
      transition: background 120ms ease;
    }
    #${PANEL_ID} .st-divider:hover::before,
    #${PANEL_ID}.resizing .st-divider::before {
      background: rgba(59, 130, 246, 0.65);
    }
    #${PANEL_ID}[data-pane-state="closed"] .st-divider {
      display: none;
    }
    #${PANEL_ID}[data-pane-state="collapsed"] {
      width: ${DOCK_COLLAPSED_WIDTH}px;
      padding: 16px 8px;
    }
    #${PANEL_ID}[data-pane-state="collapsed"] .st-dock-body,
    #${PANEL_ID}[data-pane-state="collapsed"] .st-title,
    #${PANEL_ID}[data-pane-state="collapsed"] .st-logo,
    #${PANEL_ID}[data-pane-state="collapsed"] .st-grip,
    #${PANEL_ID}[data-pane-state="collapsed"] [data-action="open-settings"],
    #${PANEL_ID}[data-pane-state="collapsed"] [data-action="reset-position"],
    #${PANEL_ID}[data-pane-state="collapsed"] [data-action="close"] {
      display: none;
    }
    #${PANEL_ID}[data-pane-state="open"] [data-action="reopen-pane"],
    #${PANEL_ID}[data-pane-state="collapsed"] [data-action="reopen-pane"] {
      display: none;
    }
    #${PANEL_ID}[data-pane-state="closed"] [data-action="toggle-pane"],
    #${PANEL_ID}[data-pane-state="closed"] [data-action="close-pane"] {
      display: none;
    }
    #${PANEL_ID} .st-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 0;
    }
    #${PANEL_ID} .st-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 14px;
      flex-shrink: 0;
    }
    #${PANEL_ID} .st-icon-action {
      border: 1px solid rgba(226, 232, 240, 0.96);
      background: rgba(255, 255, 255, 0.84);
      color: #475569;
      border-radius: 999px;
      width: 30px;
      height: 30px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      box-shadow: none;
      opacity: 0.86;
      transition: background 120ms ease, color 120ms ease, border-color 120ms ease, transform 120ms ease, opacity 120ms ease;
    }
    #${PANEL_ID} .st-icon-action svg {
      width: 16px;
      height: 16px;
    }
    #${PANEL_ID} .st-icon-action:hover {
      background: #f8fbff;
      color: #1e40af;
      border-color: rgba(191, 219, 254, 0.95);
      opacity: 1;
    }
    #${PANEL_ID} .st-icon-action:active {
      transform: translateY(1px);
    }
    #${PANEL_ID} .st-icon-action.active {
      background: #eff6ff;
      color: #1e40af;
      border-color: rgba(147, 197, 253, 0.95);
      opacity: 1;
    }
    #${PANEL_ID} .st-secondary-action {
      border: 1px solid rgba(191, 219, 254, 0.9);
      background: rgba(239, 246, 255, 0.9);
      color: #1d4ed8;
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
    }
    #${PANEL_ID} .st-secondary-action:hover {
      background: #dbeafe;
      border-color: rgba(96, 165, 250, 0.95);
      color: #1e40af;
    }
    #${PANEL_ID} .st-tab {
      border: 1px solid transparent;
      background: rgba(248, 250, 252, 0.74);
      color: #64748b;
      border-radius: 999px;
      padding: 5px 11px;
      cursor: pointer;
      font-size: 12px;
      line-height: 1.2;
    }
    #${PANEL_ID} .st-tab.active {
      border-color: rgba(191, 219, 254, 0.92);
      background: rgba(239, 246, 255, 0.98);
      color: #1e40af;
      box-shadow: none;
    }
    #${PANEL_ID} .st-translation {
      font-size: 17px;
      font-weight: 600;
      line-height: 1.82;
      letter-spacing: 0.01em;
      color: #111827;
      white-space: pre-wrap;
      word-break: break-word;
    }
    #${PANEL_ID} .st-reading-block {
      position: relative;
      padding-left: 14px;
    }
    #${PANEL_ID} .st-reading-block::before {
      content: "";
      position: absolute;
      left: 0;
      top: 4px;
      bottom: 4px;
      width: 1px;
      background: linear-gradient(180deg, rgba(191, 219, 254, 0.9) 0%, rgba(226, 232, 240, 0.65) 100%);
    }
    #${PANEL_ID} .st-kicker {
      margin-bottom: 8px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #94a3b8;
    }
    #${PANEL_ID} .st-body-scroll {
      overflow: visible;
      padding-right: 2px;
    }
    #${PANEL_ID} .st-meta,
    #${PANEL_ID} .st-loading,
    #${PANEL_ID} .st-error {
      margin-top: 12px;
      font-size: 12px;
      line-height: 1.65;
      color: #64748b;
    }
    #${PANEL_ID} .st-error {
      color: #b42318;
    }
    #${PANEL_ID} .st-dictionary {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(226, 232, 240, 0.92);
    }
    #${PANEL_ID} .st-grammar {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(226, 232, 240, 0.92);
    }
    #${PANEL_ID} .st-grammar-title {
      margin-bottom: 10px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    #${PANEL_ID} .st-grammar-title::before {
      content: "✓";
      margin-right: 6px;
      color: #60a5fa;
    }
    #${PANEL_ID} .st-grammar-list {
      display: grid;
      gap: 10px;
    }
    #${PANEL_ID} .st-grammar-item {
      padding: 12px 14px;
      border-radius: 16px;
      background: rgba(248, 250, 252, 0.85);
      border: 1px solid rgba(226, 232, 240, 0.92);
    }
    #${PANEL_ID} .st-grammar-message {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.6;
      color: #1e3a8a;
    }
    #${PANEL_ID} .st-grammar-context,
    #${PANEL_ID} .st-grammar-suggestion,
    #${PANEL_ID} .st-grammar-meta {
      margin-top: 6px;
      font-size: 12px;
      line-height: 1.7;
      color: #475569;
      white-space: pre-wrap;
      word-break: break-word;
    }
    #${PANEL_ID} .st-grammar-meta {
      color: #64748b;
    }
    #${PANEL_ID} .st-dictionary-title {
      margin-bottom: 10px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    #${PANEL_ID} .st-dictionary-title::before {
      content: "§";
      margin-right: 6px;
      color: #94a3b8;
    }
    #${PANEL_ID} .st-phonetics {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }
    #${PANEL_ID} .st-chip {
      display: inline-flex;
      align-items: center;
      padding: 4px 9px;
      border-radius: 999px;
      background: rgba(248, 250, 252, 0.96);
      color: #64748b;
      font-size: 12px;
    }
    #${PANEL_ID} .st-dictionary-list {
      display: grid;
      gap: 10px;
    }
    #${PANEL_ID} .st-dictionary-item {
      position: relative;
      padding: 0 0 0 14px;
      border-radius: 0;
      border: 0;
      background: transparent;
    }
    #${PANEL_ID} .st-dictionary-item::before {
      content: "";
      position: absolute;
      left: 0;
      top: 2px;
      bottom: 2px;
      width: 1px;
      background: rgba(226, 232, 240, 0.96);
    }
    #${PANEL_ID} .st-dictionary-item::after {
      content: "";
      position: absolute;
      left: -2px;
      top: 9px;
      width: 5px;
      height: 5px;
      border-radius: 999px;
      background: rgba(191, 219, 254, 0.95);
    }
    #${PANEL_ID} .st-pos {
      margin-bottom: 7px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.03em;
      color: #475569;
      text-transform: lowercase;
    }
    #${PANEL_ID} .st-definition,
    #${PANEL_ID} .st-example,
    #${PANEL_ID} .st-synonyms {
      font-size: 13px;
      line-height: 1.72;
      color: #334155;
    }
    #${PANEL_ID} .st-example,
    #${PANEL_ID} .st-synonyms {
      margin-top: 6px;
    }
    .st-inline-translation {
      margin: 6px 0 12px;
      padding: 9px 12px 10px;
      border-left: 3px solid rgba(37, 99, 235, 0.62);
      background: linear-gradient(180deg, rgba(239, 246, 255, 0.56) 0%, rgba(248, 250, 252, 0.78) 100%);
      border-radius: 0 10px 10px 0;
      color: #1f2937;
      font: 14px/1.8 "SF Pro Text", "PingFang SC", "Noto Sans SC", sans-serif;
    }
    .st-inline-kicker {
      margin-bottom: 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #2563eb;
    }
    .st-inline-text {
      white-space: pre-wrap;
      word-break: break-word;
      color: #334155;
    }
    #${INPUT_HINT_ID} {
      position: fixed;
      z-index: 2147483647;
      top: 0;
      right: 0;
      bottom: 0;
      width: var(--st-dock-width, 420px);
      padding: 18px 18px 16px;
      overflow: auto;
      background:
        radial-gradient(circle at top right, rgba(191, 219, 254, 0.24), transparent 30%),
        linear-gradient(180deg, rgba(252, 253, 255, 0.99) 0%, rgba(255, 255, 255, 0.99) 100%);
      border-left: 1px solid rgba(226, 232, 240, 0.95);
      box-shadow: -14px 0 36px rgba(15, 23, 42, 0.08);
    }
    #${INPUT_HINT_ID} .st-input-hint-card {
      padding: 0;
      color: #0f172a;
      font: 13px/1.7 "SF Pro Text", "PingFang SC", "Noto Sans SC", sans-serif;
    }
    #${INPUT_HINT_ID} .st-input-head {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #${INPUT_HINT_ID} .st-input-logo {
      width: 18px;
      height: 18px;
      border-radius: 5px;
      flex-shrink: 0;
      box-shadow: 0 6px 12px rgba(37, 99, 235, 0.16);
    }
    #${INPUT_HINT_ID} .st-input-status {
      font-size: 12px;
      font-weight: 600;
      color: #1d4ed8;
    }
    #${INPUT_HINT_ID} .st-input-status.is-clean {
      color: #15803d;
    }
    #${INPUT_HINT_ID} .st-input-status.has-error {
      color: #b42318;
    }
    #${INPUT_HINT_ID} .st-input-preview {
      padding: 10px 12px;
      border-radius: 12px;
      background: #f8fbff;
      border: 1px solid rgba(226, 232, 240, 0.92);
      white-space: pre-wrap;
      word-break: break-word;
      min-height: 88px;
    }
    #${INPUT_HINT_ID} .st-input-shell {
      display: grid;
      grid-template-columns: minmax(180px, 0.88fr) minmax(0, 1.32fr);
      gap: 14px;
      margin-top: 10px;
      align-items: start;
    }
    #${INPUT_HINT_ID} .st-input-panel {
      min-width: 0;
    }
    #${INPUT_HINT_ID} .st-input-panel-main {
      min-width: 0;
    }
    #${INPUT_HINT_ID} .st-input-panel-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
    }
    #${INPUT_HINT_ID} .st-input-panel-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #94a3b8;
    }
    #${INPUT_HINT_ID} .st-input-copy {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border: 1px solid rgba(191, 219, 254, 0.96);
      border-radius: 10px;
      background: #eff6ff;
      color: #2563eb;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    #${INPUT_HINT_ID} .st-input-copy svg {
      width: 16px;
      height: 16px;
    }
    #${INPUT_HINT_ID} .st-input-copy:hover {
      background: #dbeafe;
      color: #1d4ed8;
    }
    #${INPUT_HINT_ID} .st-input-copy.copied {
      background: #dcfce7;
      color: #15803d;
      border-color: rgba(134, 239, 172, 0.96);
    }
    #${INPUT_HINT_ID} .st-input-plain {
      color: #0f172a;
    }
    #${INPUT_HINT_ID} .st-input-delete {
      color: #dc2626;
      background: rgba(254, 226, 226, 0.75);
      text-decoration: line-through;
      border-radius: 4px;
    }
    #${INPUT_HINT_ID} .st-input-add {
      color: #15803d;
      background: rgba(220, 252, 231, 0.85);
      border-radius: 4px;
    }
    #${INPUT_HINT_ID} .st-input-explain {
      display: grid;
      gap: 8px;
    }
    #${INPUT_HINT_ID} .st-input-issue {
      padding-top: 8px;
      border-top: 1px solid rgba(226, 232, 240, 0.92);
    }
    #${INPUT_HINT_ID} .st-input-issue:first-child {
      border-top: 0;
      padding-top: 0;
    }
    #${INPUT_HINT_ID} .st-input-issue-title {
      font-size: 12px;
      font-weight: 600;
      color: #334155;
    }
    #${INPUT_HINT_ID} .st-input-issue-context,
    #${INPUT_HINT_ID} .st-input-issue-fix,
    #${INPUT_HINT_ID} .st-input-empty {
      margin-top: 4px;
      font-size: 12px;
      color: #64748b;
      white-space: pre-wrap;
      word-break: break-word;
    }
    @media (max-width: 720px) {
      html[data-st-docked="true"],
      html[data-st-docked="true"] body {
        padding-right: 0 !important;
      }
      #${PANEL_ID} {
        width: min(100vw, 420px);
      }
      #${INPUT_HINT_ID} {
        width: min(100vw, 420px);
      }
      #${PANEL_ID} .st-main-top,
      #${INPUT_HINT_ID} .st-input-shell {
        grid-template-columns: 1fr;
      }
      #${PANEL_ID} .st-main-top {
        flex-direction: column;
        align-items: stretch;
      }
      #${PANEL_ID} .st-actions {
        margin-bottom: 0;
      }
    }
  `;
  document.documentElement.appendChild(style);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function highlightContext(text, offset, length) {
  const safeText = String(text || "");
  const start = Math.max(0, Number(offset) || 0);
  const size = Math.max(0, Number(length) || 0);
  if (!size) {
    return safeText;
  }
  const end = Math.min(safeText.length, start + size);
  return `${safeText.slice(0, start)}[${safeText.slice(start, end)}]${safeText.slice(end)}`;
}
