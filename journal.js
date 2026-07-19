function createJournalEntry(text) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    createdAt: new Date().toISOString(),
  };
}

function addJournalEntry(entries, text) {
  const trimmed = text.trim();
  if (!trimmed) return entries;
  return [...entries, createJournalEntry(trimmed)];
}

function removeJournalEntry(entries, id) {
  return entries.filter((entry) => entry.id !== id);
}

function serializeJournal(entries) {
  return JSON.stringify(entries);
}

function deserializeJournal(json) {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const JOURNAL_KEY = "cba-journal-v1";

const journalListEl = document.getElementById("journalList");
const emptyStateEl = document.getElementById("emptyState");
const entryInput = document.getElementById("entryInput");
const saveEntryBtn = document.getElementById("saveEntry");

function loadJournal() {
  return deserializeJournal(localStorage.getItem(JOURNAL_KEY));
}

function saveJournal(entries) {
  localStorage.setItem(JOURNAL_KEY, serializeJournal(entries));
}

function formatCreatedAt(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildJournalEntryPdf(entry) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  function ensureSpace(lineHeight) {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function addTitle(text, size) {
    ensureSpace(size + 8);
    doc.setFont(undefined, "bold");
    doc.setFontSize(size);
    doc.text(text, margin, y);
    y += size + 8;
    doc.setFont(undefined, "normal");
  }

  function addParagraph(text) {
    doc.setFontSize(10.5);
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      ensureSpace(14);
      doc.text(line, margin, y);
      y += 14;
    }
  }

  addTitle("Journal Entry", 18);
  addParagraph(formatCreatedAt(entry.createdAt));
  y += 10;
  addParagraph(entry.text);

  return doc;
}

function buildEntryCard(entry) {
  const card = document.createElement("article");
  card.className = "journal-entry";

  const meta = document.createElement("div");
  meta.className = "journal-entry-meta";
  meta.textContent = formatCreatedAt(entry.createdAt);

  const text = document.createElement("p");
  text.className = "journal-entry-text";
  text.textContent = entry.text;

  const downloadBtn = document.createElement("button");
  downloadBtn.type = "button";
  downloadBtn.className = "primary download-btn";
  downloadBtn.textContent = "Download PDF";
  downloadBtn.addEventListener("click", () => {
    const doc = buildJournalEntryPdf(entry);
    const dateStamp = entry.createdAt ? entry.createdAt.slice(0, 10) : "undated";
    doc.save(`journal-entry-${dateStamp}.pdf`);
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "danger";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => {
    if (!confirm("Delete this journal entry? This cannot be undone.")) return;
    saveJournal(removeJournalEntry(loadJournal(), entry.id));
    render();
  });

  card.append(meta, text, downloadBtn, deleteBtn);
  return card;
}

function render() {
  const entries = loadJournal()
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  journalListEl.innerHTML = "";
  emptyStateEl.hidden = entries.length > 0;
  for (const entry of entries) {
    journalListEl.appendChild(buildEntryCard(entry));
  }
}

saveEntryBtn.addEventListener("click", () => {
  const text = entryInput.value;
  if (!text.trim()) return;
  saveJournal(addJournalEntry(loadJournal(), text));
  entryInput.value = "";
  render();
});

const downloadAllBtn = document.getElementById("downloadAll");
downloadAllBtn.addEventListener("click", () => {
  const entries = loadJournal();
  if (entries.length === 0) {
    alert("No journal entries to back up yet.");
    return;
  }
  const dateStamp = new Date().toISOString().slice(0, 10);
  downloadBlob(JSON.stringify(entries, null, 2), `journal-backup-${dateStamp}.json`, "application/json");
});

render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
