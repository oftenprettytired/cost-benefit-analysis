function deserializeArchive(json) {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializeArchive(archive) {
  return JSON.stringify(archive);
}

function removeArchiveEntry(archive, id) {
  return archive.filter((entry) => entry.id !== id);
}

const ARCHIVE_KEY = "cba-archive-v1";
const LIST_SECTIONS = [
  { title: "When I do this behavior", benefits: "doBenefits", costs: "doCosts" },
  { title: "When I don't do this behavior", benefits: "dontBenefits", costs: "dontCosts" },
];

const archiveListEl = document.getElementById("archiveList");
const emptyStateEl = document.getElementById("emptyState");

function loadArchive() {
  return deserializeArchive(localStorage.getItem(ARCHIVE_KEY));
}

function saveArchive(archive) {
  localStorage.setItem(ARCHIVE_KEY, serializeArchive(archive));
}

function formatSavedAt(iso) {
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

function buildPdfDoc(analysis) {
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

  function addHeading(text) {
    ensureSpace(20);
    doc.setFont(undefined, "bold");
    doc.setFontSize(13);
    doc.text(text, margin, y);
    y += 18;
    doc.setFont(undefined, "normal");
  }

  const boxPadding = 10;
  const lineHeight = 13;
  const columnGap = 14;
  const colWidth = (maxWidth - columnGap) / 2;
  const innerWidth = colWidth - boxPadding * 2;

  function listLines(list) {
    if (list.length === 0) return ["(none)"];
    const lines = [];
    for (const item of list) {
      // jsPDF's standard fonts only support WinAnsi encoding, which has no
      // star glyph (it silently renders as a bullet) - use plain ASCII
      // markers so long-term items stay visually distinct in the PDF.
      const prefix = item.starred ? "* " : "- ";
      lines.push(...doc.splitTextToSize(prefix + item.text, innerWidth));
    }
    return lines;
  }

  function drawColumn(x, boxTop, title, lines) {
    doc.setFont(undefined, "bold");
    doc.setFontSize(10.5);
    doc.text(title, x + boxPadding, boxTop + boxPadding + 9);
    doc.setFont(undefined, "normal");

    doc.setFontSize(10);
    let lineY = boxTop + boxPadding + 9 + 16;
    for (const line of lines) {
      doc.text(line, x + boxPadding, lineY);
      lineY += lineHeight;
    }
  }

  function addSection(title, benefits, costs) {
    const benefitLines = listLines(benefits);
    const costLines = listLines(costs);
    const contentLines = Math.max(benefitLines.length, costLines.length);
    const boxHeight = boxPadding * 2 + 9 + 16 + contentLines * lineHeight;

    // Check space for the heading + its box together so the heading never
    // gets orphaned alone at the bottom of a page.
    ensureSpace(18 + boxHeight);

    doc.setFont(undefined, "bold");
    doc.setFontSize(13);
    doc.text(title, margin, y);
    y += 18;
    doc.setFont(undefined, "normal");

    const boxTop = y;
    const leftX = margin;
    const rightX = margin + colWidth + columnGap;

    doc.setDrawColor(180);
    doc.rect(leftX, boxTop, colWidth, boxHeight);
    doc.rect(rightX, boxTop, colWidth, boxHeight);

    drawColumn(leftX, boxTop, "Benefits", benefitLines);
    drawColumn(rightX, boxTop, "Costs", costLines);

    doc.setDrawColor(0);
    y = boxTop + boxHeight + 16;
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

  addTitle("Cost-Benefit Analysis", 18);
  addParagraph(`Behavior: ${analysis.behavior || "(not named)"}`);
  addParagraph(`Date: ${analysis.date || "(no date)"}`);
  addParagraph("Items marked with * are long-term.");
  y += 6;

  addSection("When I do this behavior", analysis.doBenefits, analysis.doCosts);
  addSection("When I don't do this behavior", analysis.dontBenefits, analysis.dontCosts);

  addHeading("Notes");
  addParagraph(analysis.reflection || "(no notes written)");

  return doc;
}

function renderReadOnlyList(list) {
  const ul = document.createElement("ul");
  ul.className = "item-list readonly";
  for (const item of list) {
    const li = document.createElement("li");
    li.className = item.starred ? "starred" : "";

    const star = document.createElement("span");
    star.className = "star-indicator";
    star.textContent = item.starred ? "★" : "☆";

    const text = document.createElement("span");
    text.className = "item-text";
    text.textContent = item.text;

    li.append(star, text);
    ul.appendChild(li);
  }
  return ul;
}

function buildDetail(analysis) {
  const detail = document.createElement("div");
  detail.className = "archive-card-detail";
  detail.hidden = true;

  for (const section of LIST_SECTIONS) {
    const block = document.createElement("div");
    block.className = "behavior-block";

    const h2 = document.createElement("h2");
    h2.textContent = section.title;
    block.appendChild(h2);

    const columns = document.createElement("div");
    columns.className = "columns";

    const benefitsCol = document.createElement("div");
    benefitsCol.className = "column";
    benefitsCol.innerHTML = `<h3>Benefits <span class="hint">(rewards or advantages)</span></h3>`;
    benefitsCol.appendChild(renderReadOnlyList(analysis[section.benefits]));

    const costsCol = document.createElement("div");
    costsCol.className = "column";
    costsCol.innerHTML = `<h3>Costs <span class="hint">(risks and disadvantages)</span></h3>`;
    costsCol.appendChild(renderReadOnlyList(analysis[section.costs]));

    columns.append(benefitsCol, costsCol);
    block.appendChild(columns);
    detail.appendChild(block);
  }

  const reflectionBlock = document.createElement("div");
  reflectionBlock.className = "reflection";
  const reflectionH2 = document.createElement("h2");
  reflectionH2.textContent = "Notes";
  const reflectionText = document.createElement("p");
  reflectionText.className = "reflection-text";
  reflectionText.textContent = analysis.reflection || "(no notes written)";
  reflectionBlock.append(reflectionH2, reflectionText);
  detail.appendChild(reflectionBlock);

  const downloadBtn = document.createElement("button");
  downloadBtn.type = "button";
  downloadBtn.className = "primary download-btn";
  downloadBtn.textContent = "Download PDF";
  downloadBtn.addEventListener("click", () => {
    const doc = buildPdfDoc(analysis);
    const dateForFilename = analysis.date || "undated";
    doc.save(`cost-benefit-analysis-${dateForFilename}.pdf`);
  });
  detail.appendChild(downloadBtn);

  return detail;
}

function buildCard(entry) {
  const card = document.createElement("article");
  card.className = "archive-card";
  card.dataset.id = entry.id;

  const summary = document.createElement("div");
  summary.className = "archive-card-summary";

  const info = document.createElement("div");
  const dateDiv = document.createElement("div");
  dateDiv.className = "archive-card-date";
  dateDiv.textContent = entry.analysis.date || "(no date)";
  const behaviorDiv = document.createElement("div");
  behaviorDiv.className = "archive-card-behavior";
  behaviorDiv.textContent = entry.analysis.behavior || "(no behavior named)";
  const metaDiv = document.createElement("div");
  metaDiv.className = "archive-card-meta";
  metaDiv.textContent = `Saved ${formatSavedAt(entry.savedAt)}`;
  info.append(dateDiv, behaviorDiv, metaDiv);

  const actions = document.createElement("div");
  actions.className = "archive-card-actions";

  const detail = buildDetail(entry.analysis);

  const viewBtn = document.createElement("button");
  viewBtn.type = "button";
  viewBtn.textContent = "View";
  viewBtn.addEventListener("click", () => {
    detail.hidden = !detail.hidden;
    viewBtn.textContent = detail.hidden ? "View" : "Hide";
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "danger";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => {
    if (!confirm("Delete this saved analysis? This cannot be undone.")) return;
    saveArchive(removeArchiveEntry(loadArchive(), entry.id));
    render();
  });

  actions.append(viewBtn, deleteBtn);
  summary.append(info, actions);
  card.append(summary, detail);
  return card;
}

function render() {
  const archive = loadArchive()
    .slice()
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

  archiveListEl.innerHTML = "";
  emptyStateEl.hidden = archive.length > 0;
  for (const entry of archive) {
    archiveListEl.appendChild(buildCard(entry));
  }
}

const downloadAllBtn = document.getElementById("downloadAll");
downloadAllBtn.addEventListener("click", () => {
  const archive = loadArchive();
  if (archive.length === 0) {
    alert("No saved analyses to back up yet.");
    return;
  }
  const dateStamp = new Date().toISOString().slice(0, 10);
  downloadBlob(
    JSON.stringify(archive, null, 2),
    `cost-benefit-analysis-backup-${dateStamp}.json`,
    "application/json"
  );
});

render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
