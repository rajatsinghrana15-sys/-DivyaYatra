import { api } from "./api";

export const INDIAN_LANGUAGES = [
  ["en", "English"], ["as", "অসমীয়া — Assamese"], ["bn", "বাংলা — Bengali"],
  ["bho", "भोजपुरी — Bhojpuri"], ["doi", "डोगरी — Dogri"], ["gu", "ગુજરાતી — Gujarati"],
  ["hi", "हिन्दी — Hindi"], ["kn", "ಕನ್ನಡ — Kannada"], ["gom", "कोंकणी — Konkani"],
  ["mai", "मैथिली — Maithili"], ["ml", "മലയാളം — Malayalam"], ["mr", "मराठी — Marathi"],
  ["mni-Mtei", "মেইতেই — Manipuri"], ["lus", "Mizo"], ["ne", "नेपाली — Nepali"],
  ["or", "ଓଡ଼ିଆ — Odia"], ["pa", "ਪੰਜਾਬੀ — Punjabi"], ["sa", "संस्कृतम् — Sanskrit"],
  ["sd", "سنڌي — Sindhi"], ["ta", "தமிழ் — Tamil"], ["te", "తెలుగు — Telugu"], ["ur", "اردو — Urdu"],
];

const textSources = new WeakMap();
const attrSources = new WeakMap();
const translationCache = new Map();
const loadedLanguages = new Set();
let observer;
let currentLanguage = "en";
let running = false;
let rerun = false;
let queued = false;

function getTextSource(node) {
  const current = node.nodeValue;
  const record = textSources.get(node);
  if (record && current === record.last) return record.source;
  const source = current;
  textSources.set(node, { source, last: current });
  return source;
}

function getAttrSource(element, name) {
  let record = attrSources.get(element);
  if (!record) { record = {}; attrSources.set(element, record); }
  const current = element.getAttribute(name) || "";
  if (record[name] && current === record[name].last) return record[name].source;
  record[name] = { source: current, last: current };
  return current;
}

function cacheKey(language, source) { return `${language}\u0000${source}`; }
function eligible(value) {
  const clean = value.trim();
  return clean.length > 1 && /[A-Za-z\u00C0-\u024F]/.test(clean) && !/^https?:\/\//i.test(clean);
}
function skipText(node) {
  const parent = node.parentElement;
  if (!parent || parent.closest("script,style,noscript,textarea,input,[contenteditable=true],[data-no-translate],.accountMenuUser,.myBookingInfo,.adminTableWrap td,.toast,a[href^='tel:'],a[href^='mailto:']")) return true;
  return false;
}

async function translateSources(sources, language) {
  if (!loadedLanguages.has(language)) {
    loadedLanguages.add(language);
    try {
      const saved = JSON.parse(localStorage.getItem(`yatra_translations_${language}`) || "{}");
      Object.entries(saved).forEach(([source, translation]) => translationCache.set(cacheKey(language, source), translation));
    } catch { /* Keep a session-only translation cache when storage is unavailable. */ }
  }
  const unique = [...new Set(sources)];
  const missing = unique.filter((source) => !translationCache.has(cacheKey(language, source)));
  for (let start = 0; start < missing.length; start += 100) {
    const batch = missing.slice(start, start + 100);
    const result = await api("/translate", { method: "POST", body: { target: language, texts: batch } });
    batch.forEach((source, index) => translationCache.set(cacheKey(language, source), result.translations[index] || source));
    try {
      const saved = Object.fromEntries([...translationCache].filter(([key]) => key.startsWith(`${language}\u0000`)).map(([key, value]) => [key.slice(language.length + 1), value]));
      localStorage.setItem(`yatra_translations_${language}`, JSON.stringify(saved));
    } catch { /* Quota or private browsing can fall back to the in-memory cache. */ }
  }
  return new Map(unique.map((source) => [source, translationCache.get(cacheKey(language, source)) || source]));
}

async function scanAndApply(language) {
  if (!document.body) return;
  const nodeRecords = [];
  const attrRecords = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (skipText(node)) continue;
    const raw = getTextSource(node);
    const source = raw.trim();
    if (eligible(source)) nodeRecords.push({ node, raw, source });
  }
  const attrSelector = "[placeholder],[title],[aria-label],[data-label]";
  document.body.querySelectorAll(attrSelector).forEach((element) => {
    if (element.closest("[data-no-translate],.accountMenuUser,.myBookingInfo,.adminTableWrap td,.toast,a[href^='tel:'],a[href^='mailto:']")) return;
    ["placeholder", "title", "aria-label", "data-label"].forEach((name) => {
      if (!element.hasAttribute(name)) return;
      const source = getAttrSource(element, name).trim();
      if (eligible(source)) attrRecords.push({ element, name, source });
    });
  });
  const sources = [...nodeRecords.map((record) => record.source), ...attrRecords.map((record) => record.source)];
  if (language === "en") {
    nodeRecords.forEach(({ node, raw }) => { const record = textSources.get(node); if (record) record.last = raw; node.nodeValue = raw; });
    attrRecords.forEach(({ element, name }) => { const record = attrSources.get(element)?.[name]; if (record) { record.last = record.source; element.setAttribute(name, record.source); } });
    return;
  }
  const translated = await translateSources(sources, language);
  if (language !== currentLanguage) return;
  nodeRecords.forEach(({ node, raw, source }) => {
    if (!node.isConnected) return;
    const value = translated.get(source) || source;
    const target = `${raw.slice(0, raw.indexOf(source))}${value}${raw.slice(raw.indexOf(source) + source.length)}`;
    node.nodeValue = target;
    const record = textSources.get(node);
    if (record) record.last = target;
  });
  attrRecords.forEach(({ element, name, source }) => {
    if (!element.isConnected) return;
    const value = translated.get(source) || source;
    element.setAttribute(name, value);
    const record = attrSources.get(element)?.[name];
    if (record) record.last = value;
  });
}

function scheduleScan() {
  if (queued) return;
  queued = true;
  queueMicrotask(async () => {
    queued = false;
    if (running) { rerun = true; return; }
    running = true;
    try { await scanAndApply(currentLanguage); }
    catch (error) { window.dispatchEvent(new CustomEvent("yatra-translation-error", { detail: error.message })); }
    finally { running = false; if (rerun) { rerun = false; scheduleScan(); } }
  });
}

export function setPageLanguage(language) {
  if (!INDIAN_LANGUAGES.some(([code]) => code === language)) language = "en";
  currentLanguage = language;
  document.documentElement.lang = language;
  if (!observer) {
    observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "title", "aria-label", "data-label"] });
  }
  if (running) { rerun = true; return Promise.resolve(); }
  running = true;
  return scanAndApply(language).finally(() => {
    running = false;
    if (rerun) { rerun = false; scheduleScan(); }
  });
}
