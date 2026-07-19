function createItem(text) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    starred: false,
  };
}

function addItem(list, text) {
  const trimmed = text.trim();
  if (!trimmed) return list;
  return [...list, createItem(trimmed)];
}

function removeItem(list, id) {
  return list.filter((item) => item.id !== id);
}

function toggleStar(list, id) {
  return list.map((item) =>
    item.id === id ? { ...item, starred: !item.starred } : item
  );
}

// Best-effort conversion of a gerund ("gambling") to its base verb form
// ("gamble") so headings can read "When I gamble" / "When I don't gamble".
// English -ing spelling rules aren't fully regular, so this covers the
// common cases well but won't be perfect for every possible word.
const DEGERUND_SPECIAL_CASES = {
  lying: "lie",
  dying: "die",
  tying: "tie",
  binging: "binge",
};

function degerund(word) {
  const lower = word.toLowerCase();
  if (DEGERUND_SPECIAL_CASES[lower]) return DEGERUND_SPECIAL_CASES[lower];
  if (!lower.endsWith("ing") || lower.length < 5) return lower;

  const stem = lower.slice(0, -3);
  const VOWELS = new Set(["a", "e", "i", "o", "u"]);
  const DOUBLING_CONSONANTS = new Set(["b", "d", "g", "k", "m", "n", "p", "r", "t"]);
  const last = stem[stem.length - 1];
  const secondLast = stem[stem.length - 2];
  const thirdLast = stem[stem.length - 3];

  // English never ends a word in a bare "v" (starving -> starv -> starve).
  if (last === "v") return `${stem}e`;

  // running -> runn -> run; shopping -> shopp -> shop
  if (secondLast && last === secondLast && DOUBLING_CONSONANTS.has(last)) {
    return stem.slice(0, -1);
  }

  // gambling -> gambl -> gamble; handling -> handl -> handle
  if (last === "l" && secondLast && !VOWELS.has(secondLast) && secondLast !== "l") {
    return `${stem}e`;
  }

  // purging -> purg -> purge; judging -> judg -> judge (but not singing -> sing)
  if (last === "g" && secondLast && !VOWELS.has(secondLast) && secondLast !== "n" && secondLast !== "g") {
    return `${stem}e`;
  }

  // smoking -> smok -> smoke; but not eating -> eat (vowel-digraph stems)
  if (!VOWELS.has(last) && secondLast && VOWELS.has(secondLast) && (!thirdLast || !VOWELS.has(thirdLast))) {
    return `${stem}e`;
  }

  return stem;
}

function verbPhraseFromBehavior(text) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const [firstWord, ...rest] = trimmed.split(/\s+/);
  const verb = degerund(firstWord);
  return rest.length ? `${verb} ${rest.join(" ")}` : verb;
}

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function createEmptyAnalysis() {
  return {
    behavior: "",
    date: todayISO(),
    doBenefits: [],
    doCosts: [],
    dontBenefits: [],
    dontCosts: [],
    reflection: "",
  };
}

function serialize(analysis) {
  return JSON.stringify(analysis);
}

function deserialize(json) {
  const parsed = JSON.parse(json);
  const empty = createEmptyAnalysis();
  return { ...empty, ...parsed };
}

function createArchiveEntry(analysis) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    // Deep-copy so later edits to the live draft (which mutates analysis.*
    // properties in place) can't retroactively change an already-saved entry.
    analysis: JSON.parse(JSON.stringify(analysis)),
  };
}

function addArchiveEntry(archive, analysis) {
  return [...archive, createArchiveEntry(analysis)];
}

function serializeArchive(archive) {
  return JSON.stringify(archive);
}

function deserializeArchive(json) {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createAnalysisTab() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    analysis: createEmptyAnalysis(),
  };
}

function addAnalysisTab(tabs) {
  return [...tabs, createAnalysisTab()];
}

function removeAnalysisTab(tabs, id) {
  return tabs.filter((t) => t.id !== id);
}

function hasAnalysisContent(analysis) {
  return Boolean(
    analysis.behavior ||
      analysis.reflection ||
      LIST_KEYS.some((key) => analysis[key].length > 0)
  );
}

function createAnalysesState() {
  const tab = createAnalysisTab();
  return { activeId: tab.id, analyses: [tab] };
}

function serializeAnalyses(state) {
  return JSON.stringify(state);
}

function deserializeAnalyses(json) {
  if (!json) return createAnalysesState();
  try {
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.analyses) || parsed.analyses.length === 0) {
      return createAnalysesState();
    }
    return { activeId: parsed.activeId ?? parsed.analyses[0].id, analyses: parsed.analyses };
  } catch {
    return createAnalysesState();
  }
}

function createTracker(label) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    startDate: null,
    createdAt: new Date().toISOString(),
  };
}

function addTracker(trackers, label) {
  const trimmed = label.trim();
  if (!trimmed) return trackers;
  return [...trackers, createTracker(trimmed)];
}

function removeTracker(trackers, id) {
  return trackers.filter((t) => t.id !== id);
}

function startTracker(tracker) {
  return { ...tracker, startDate: todayISO() };
}

function resetTracker(tracker) {
  return { ...tracker, startDate: null };
}

function daysElapsed(startDate, today = todayISO()) {
  // Parse as local midnight (not UTC) so the day count doesn't shift
  // depending on the user's timezone.
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${today}T00:00:00`);
  const diffDays = Math.round((end - start) / 86400000);
  return diffDays + 1;
}

function createTrackersState() {
  return { activeId: null, trackers: [] };
}

function serializeTrackers(state) {
  return JSON.stringify(state);
}

function deserializeTrackers(json) {
  if (!json) return createTrackersState();
  try {
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.trackers)) return createTrackersState();
    return { activeId: parsed.activeId ?? null, trackers: parsed.trackers };
  } catch {
    return createTrackersState();
  }
}

const ANALYSES_KEY = "cba-analyses-v1";
const LEGACY_STORAGE_KEY = "cba-analysis-v1";
const ARCHIVE_KEY = "cba-archive-v1";
const TRACKERS_KEY = "cba-trackers-v1";
const LIST_KEYS = ["doBenefits", "doCosts", "dontBenefits", "dontCosts"];

function loadAnalyses() {
  const raw = localStorage.getItem(ANALYSES_KEY);
  if (raw) return deserializeAnalyses(raw);

  // One-time migration: fold the old single-analysis storage into the
  // first tab so nobody's existing draft disappears on this update.
  const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacyRaw) {
    try {
      const legacyAnalysis = deserialize(legacyRaw);
      const tab = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, analysis: legacyAnalysis };
      return { activeId: tab.id, analyses: [tab] };
    } catch {
      // fall through to a fresh state
    }
  }

  return createAnalysesState();
}

let analysesState = loadAnalyses();

function getActiveAnalysis() {
  const tab = analysesState.analyses.find((t) => t.id === analysesState.activeId) || analysesState.analyses[0];
  return tab.analysis;
}

const behaviorInput = document.getElementById("behavior");
const dateInput = document.getElementById("date");
const reflectionInput = document.getElementById("reflection");
const saveStatus = document.getElementById("saveStatus");
const resetAnalysisBtn = document.getElementById("resetAnalysis");
const saveToArchiveBtn = document.getElementById("saveToArchive");
const analysisTabsEl = document.getElementById("analysisTabs");
const doHeading = document.getElementById("doHeading");
const dontHeading = document.getElementById("dontHeading");

function saveAnalyses() {
  localStorage.setItem(ANALYSES_KEY, serializeAnalyses(analysesState));
  saveStatus.textContent = `Saved ${new Date().toLocaleTimeString()}`;
}

function renderList(listKey) {
  const analysis = getActiveAnalysis();
  const container = document.querySelector(`[data-list="${listKey}"] .item-list`);
  container.innerHTML = "";
  for (const item of analysis[listKey]) {
    const li = document.createElement("li");
    li.className = item.starred ? "starred" : "";

    const starBtn = document.createElement("button");
    starBtn.type = "button";
    starBtn.className = `star-btn${item.starred ? " active" : ""}`;
    starBtn.title = "Toggle long-term (star)";
    starBtn.textContent = item.starred ? "★" : "☆";
    starBtn.addEventListener("click", () => {
      const current = getActiveAnalysis();
      current[listKey] = toggleStar(current[listKey], item.id);
      renderList(listKey);
      saveAnalyses();
    });

    const text = document.createElement("span");
    text.className = "item-text";
    text.textContent = item.text;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.title = "Remove";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      const current = getActiveAnalysis();
      current[listKey] = removeItem(current[listKey], item.id);
      renderList(listKey);
      saveAnalyses();
    });

    li.append(starBtn, text, removeBtn);
    container.appendChild(li);
  }
}

function renderBehaviorHeadings() {
  const analysis = getActiveAnalysis();
  const verbPhrase = verbPhraseFromBehavior(analysis.behavior);
  doHeading.textContent = verbPhrase ? `When I ${verbPhrase}` : "When I";
  dontHeading.textContent = verbPhrase ? `When I don't ${verbPhrase}` : "When I don't";
}

function renderAll() {
  const analysis = getActiveAnalysis();
  behaviorInput.value = analysis.behavior;
  dateInput.value = analysis.date;
  reflectionInput.value = analysis.reflection;
  for (const key of LIST_KEYS) renderList(key);
  renderBehaviorHeadings();
}

function wireAddForms() {
  for (const key of LIST_KEYS) {
    const form = document.querySelector(`[data-list="${key}"] .add-form`);
    const input = form.querySelector("input");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const analysis = getActiveAnalysis();
      analysis[key] = addItem(analysis[key], input.value);
      input.value = "";
      renderList(key);
      saveAnalyses();
    });
  }
}

behaviorInput.addEventListener("input", () => {
  getActiveAnalysis().behavior = behaviorInput.value;
  saveAnalyses();
  renderAnalysisTabs();
  renderBehaviorHeadings();
});

dateInput.addEventListener("input", () => {
  getActiveAnalysis().date = dateInput.value;
  saveAnalyses();
});

reflectionInput.addEventListener("input", () => {
  getActiveAnalysis().reflection = reflectionInput.value;
  saveAnalyses();
});

function switchToTab(id) {
  analysesState.activeId = id;
  saveAnalyses();
  renderAll();
  renderAnalysisTabs();
}

// If `analysis` has content, ask to archive it before proceeding, then ask
// again to confirm proceeding without saving. Only calls `proceed()` once
// the user has actually chosen to continue (or there was nothing to lose).
function offerSaveThenRun(analysis, proceed) {
  if (!hasAnalysisContent(analysis)) {
    proceed();
    return;
  }
  const shouldSave = confirm(
    "This analysis has content. Save it to the archive first?\n\nClick OK to save it, or Cancel to continue without saving."
  );
  if (shouldSave) {
    const archive = deserializeArchive(localStorage.getItem(ARCHIVE_KEY));
    localStorage.setItem(ARCHIVE_KEY, serializeArchive(addArchiveEntry(archive, analysis)));
    proceed();
    return;
  }
  if (!confirm("Continue without saving? This cannot be undone.")) return;
  proceed();
}

function renderAnalysisTabs() {
  analysisTabsEl.innerHTML = "";
  for (const tab of analysesState.analyses) {
    const tabEl = document.createElement("div");
    tabEl.className = `analysis-tab${tab.id === analysesState.activeId ? " active" : ""}`;

    const label = document.createElement("button");
    label.type = "button";
    label.className = "analysis-tab-label";
    label.textContent = tab.analysis.behavior || "Untitled";
    label.addEventListener("click", () => switchToTab(tab.id));

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "tab-close";
    closeBtn.title = "Close this analysis";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => {
      if (analysesState.analyses.length === 1) {
        alert("You need at least one analysis tab open.");
        return;
      }
      offerSaveThenRun(tab.analysis, () => {
        analysesState.analyses = removeAnalysisTab(analysesState.analyses, tab.id);
        if (analysesState.activeId === tab.id) {
          analysesState.activeId = analysesState.analyses[0].id;
        }
        saveAnalyses();
        renderAll();
        renderAnalysisTabs();
      });
    });

    tabEl.append(label, closeBtn);
    analysisTabsEl.appendChild(tabEl);
  }

  const addTabBtn = document.createElement("button");
  addTabBtn.type = "button";
  addTabBtn.className = "analysis-tab-add";
  addTabBtn.title = "New analysis";
  addTabBtn.textContent = "+";
  addTabBtn.addEventListener("click", addNewAnalysisTab);
  analysisTabsEl.appendChild(addTabBtn);
}

function addNewAnalysisTab() {
  analysesState.analyses = addAnalysisTab(analysesState.analyses);
  const newTab = analysesState.analyses[analysesState.analyses.length - 1];
  analysesState.activeId = newTab.id;
  saveAnalyses();
  renderAll();
  renderAnalysisTabs();
}

resetAnalysisBtn.addEventListener("click", () => {
  offerSaveThenRun(getActiveAnalysis(), () => {
    const activeTab = analysesState.analyses.find((t) => t.id === analysesState.activeId);
    activeTab.analysis = createEmptyAnalysis();
    saveAnalyses();
    renderAll();
    renderAnalysisTabs();
  });
});

saveToArchiveBtn.addEventListener("click", () => {
  const archive = deserializeArchive(localStorage.getItem(ARCHIVE_KEY));
  const updated = addArchiveEntry(archive, getActiveAnalysis());
  localStorage.setItem(ARCHIVE_KEY, serializeArchive(updated));
  saveStatus.textContent = `Saved to archive at ${new Date().toLocaleTimeString()}`;
});

wireAddForms();
renderAll();
renderAnalysisTabs();

function loadTrackers() {
  return deserializeTrackers(localStorage.getItem(TRACKERS_KEY));
}

function saveTrackers(state) {
  localStorage.setItem(TRACKERS_KEY, serializeTrackers(state));
}

let trackersState = loadTrackers();

const trackerTabsEl = document.getElementById("trackerTabs");
const trackerPanelEl = document.getElementById("trackerPanel");
const showTrackerFormBtn = document.getElementById("showTrackerForm");
const newTrackerForm = document.getElementById("newTrackerForm");
const newTrackerInput = document.getElementById("newTrackerInput");

function renderTrackers() {
  trackerTabsEl.innerHTML = "";
  for (const tracker of trackersState.trackers) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `tracker-tab${tracker.id === trackersState.activeId ? " active" : ""}`;
    tab.textContent = tracker.label;
    tab.addEventListener("click", () => {
      trackersState.activeId = tracker.id;
      saveTrackers(trackersState);
      renderTrackers();
    });
    trackerTabsEl.appendChild(tab);
  }

  trackerPanelEl.innerHTML = "";
  const active = trackersState.trackers.find((t) => t.id === trackersState.activeId);

  if (!active) {
    const empty = document.createElement("p");
    empty.className = "tracker-empty";
    empty.textContent =
      trackersState.trackers.length === 0
        ? "No trackers yet. Add one below to start counting days."
        : "Select a tracker above.";
    trackerPanelEl.appendChild(empty);
    return;
  }

  const label = document.createElement("h3");
  label.className = "tracker-label";
  label.textContent = active.label;
  trackerPanelEl.appendChild(label);

  const countEl = document.createElement("div");
  countEl.className = "tracker-day-count";
  countEl.textContent = active.startDate ? `Day ${daysElapsed(active.startDate)}` : "Not started";
  trackerPanelEl.appendChild(countEl);

  if (active.startDate) {
    const since = document.createElement("p");
    since.className = "tracker-since";
    since.textContent = `Started ${active.startDate}`;
    trackerPanelEl.appendChild(since);
  }

  const actions = document.createElement("div");
  actions.className = "tracker-actions";

  if (!active.startDate) {
    const startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.className = "primary";
    startBtn.textContent = "Start";
    startBtn.addEventListener("click", () => {
      trackersState.trackers = trackersState.trackers.map((t) => (t.id === active.id ? startTracker(t) : t));
      saveTrackers(trackersState);
      renderTrackers();
    });
    actions.appendChild(startBtn);
  } else {
    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "danger";
    resetBtn.textContent = "Reset";
    resetBtn.addEventListener("click", () => {
      if (!confirm(`Reset "${active.label}" back to Day 0? This clears its start date.`)) return;
      trackersState.trackers = trackersState.trackers.map((t) => (t.id === active.id ? resetTracker(t) : t));
      saveTrackers(trackersState);
      renderTrackers();
    });
    actions.appendChild(resetBtn);
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "danger";
  deleteBtn.textContent = "Delete Tracker";
  deleteBtn.addEventListener("click", () => {
    if (!confirm(`Delete the "${active.label}" tracker? This cannot be undone.`)) return;
    trackersState.trackers = removeTracker(trackersState.trackers, active.id);
    if (trackersState.activeId === active.id) {
      trackersState.activeId = trackersState.trackers.length > 0 ? trackersState.trackers[0].id : null;
    }
    saveTrackers(trackersState);
    renderTrackers();
  });
  actions.appendChild(deleteBtn);

  trackerPanelEl.appendChild(actions);
}

showTrackerFormBtn.addEventListener("click", () => {
  newTrackerForm.hidden = !newTrackerForm.hidden;
  if (!newTrackerForm.hidden) newTrackerInput.focus();
});

newTrackerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const label = newTrackerInput.value.trim();
  if (!label) return;
  trackersState.trackers = addTracker(trackersState.trackers, label);
  trackersState.activeId = trackersState.trackers[trackersState.trackers.length - 1].id;
  newTrackerInput.value = "";
  newTrackerForm.hidden = true;
  saveTrackers(trackersState);
  renderTrackers();
});

renderTrackers();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
