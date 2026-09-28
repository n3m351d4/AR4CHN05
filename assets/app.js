const PLOT_LAYOUT = {
  paper_bgcolor: "#121e21",
  plot_bgcolor: "#121e21",
  font: { color: "#f0e8d1", family: "Inter, system-ui, sans-serif", size: 13 },
  margin: { l: 80, r: 24, t: 24, b: 60 },
};

const PLOT_CONFIG = {
  responsive: true,
  displayModeBar: false,
  scrollZoom: false,
  doubleClick: false,
};

const COLORSCALE = [
  [0, "#0c1517"],
  [0.2, "#152022"],
  [0.45, "#2d4346"],
  [0.65, "#6a8478"],
  [0.85, "#b8a888"],
  [1, "#e0d4bc"],
];

let report = null;
let currentStatus = "all";

async function loadReport() {
  const res = await fetch("data/exposure.json");
  if (!res.ok) throw new Error(`Failed to load exposure.json (${res.status})`);
  report = await res.json();
  renderSummary();
  renderFilters();
  renderAll();
}

function heatmaps() {
  return report.heatmaps || {
    ext_repo_type: report.heatmap,
    repo_type_status: { all: { x: [], y: [], z: [] } },
    ext_status: { all: { x: [], y: [], z: [] } },
  };
}

function renderSummary() {
  const s = report.summary;
  const grid = document.getElementById("summary");
  const cards = [
    { label: "Total hits", value: s.total_keys.toLocaleString() },
    { label: "Repositories", value: s.unique_repos.toLocaleString() },
    { label: "Valid", value: (s.by_status.valid || 0).toLocaleString(), cls: "valid" },
    { label: "Invalid", value: (s.by_status.invalid || 0).toLocaleString(), cls: "invalid" },
    { label: "Quarantined", value: (s.by_status.quarantined || 0).toLocaleString(), cls: "quarantine" },
  ];
  grid.innerHTML = cards
    .map(
      (c) => `
    <div class="stat-card ${c.cls || ""}">
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
    </div>`
    )
    .join("");

  const m = report.meta || {};
  const rt = report.summary.by_repo_type || {};
  const extra = document.getElementById("repo-type-summary");
  if (extra) {
    extra.innerHTML = [
      ["personal", "Personal"],
      ["org", "Organization"],
      ["unknown", "Unknown"],
    ]
      .filter(([k]) => (rt[k] || 0) > 0)
      .map(([k, label]) => {
        const n = rt[k] || 0;
        return `<span class="rt-pill">${label}: <strong>${n.toLocaleString()}</strong></span>`;
      })
      .join("");
  }
  document.getElementById("generated").textContent =
    `Generated ${new Date(report.generated_at).toUTCString()} · ${s.total_keys.toLocaleString()} keys · ${s.unique_repos.toLocaleString()} repositories`;
}

function renderFilters() {
  const el = document.getElementById("status-filters");
  const statuses = ["all", "valid", "invalid", "quarantined"];
  el.innerHTML = statuses
    .map(
      (s) =>
        `<button type="button" data-status="${s}" class="${s === currentStatus ? "active" : ""}">${s}</button>`
    )
    .join("");
  el.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentStatus = btn.dataset.status;
      el.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
      renderAll();
    });
  });
}

function renderInsight(prefix, insight) {
  if (!insight) return;
  const q = document.getElementById(`${prefix}-question`);
  const b = document.getElementById(`${prefix}-basis`);
  const f = document.getElementById(`${prefix}-finding`);
  if (q) q.textContent = insight.question || "";
  if (b) b.textContent = insight.basis || "";
  if (f) f.textContent = insight.finding || "";
}

function renderHeatmap(elementId, hm, opts = {}) {
  if (!hm || !hm.z || !hm.z.length) return;

  const flat = hm.z.flat();
  const maxZ = Math.max(...flat, 1);
  const text = hm.z.map((row) => row.map((v) => (v > 0 ? v.toLocaleString() : "")));
  const yLabel = opts.yLabel || hm.y_label || "";
  const xLabel = opts.xLabel || hm.x_label || "";
  const rowHeight = opts.rowHeight || 28;
  const minHeight = opts.minHeight || 420;

  const hoverY = yLabel ? `${yLabel}: %{y}` : "%{y}";
  const hoverX = xLabel ? `${xLabel}: %{x}` : "%{x}";

  const data = [
    {
      type: "heatmap",
      x: hm.x,
      y: hm.y,
      z: hm.z,
      text,
      texttemplate: "%{text}",
      textfont: { color: "#f0e8d1", size: opts.fontSize || 10 },
      hovertemplate: `${hoverY}<br>${hoverX}<br>Count: %{z}<extra></extra>`,
      colorscale: COLORSCALE,
      zmin: 0,
      zmax: maxZ,
      hoverongaps: false,
      showscale: !opts.hideColorbar,
      colorbar: opts.hideColorbar
        ? undefined
        : { title: "Hits", tickcolor: "#8a9e98", titlefont: { color: "#f0e8d1" } },
    },
  ];

  const xSide = opts.xAxisSide || "top";
  const layout = {
    ...PLOT_LAYOUT,
    dragmode: false,
    height: Math.max(minHeight, hm.y.length * rowHeight + (opts.chartPadding || 100)),
    margin: {
      l: PLOT_LAYOUT.margin.l,
      r: PLOT_LAYOUT.margin.r,
      t: opts.marginTop ?? (xSide === "bottom" ? 24 : 40),
      b: opts.marginBottom ?? (xSide === "bottom" ? 56 : PLOT_LAYOUT.margin.b),
    },
    xaxis: {
      gridcolor: "#243538",
      side: xSide,
      fixedrange: true,
      tickfont: { size: opts.tickFontSize || 12 },
    },
    yaxis: {
      autorange: "reversed",
      gridcolor: "#243538",
      fixedrange: true,
      tickfont: { size: opts.tickFontSize || 12 },
    },
  };

  Plotly.newPlot(elementId, data, layout, PLOT_CONFIG);
}

function extRepoHeatmapData() {
  const hm = heatmaps().ext_repo_type || report.heatmap;
  if (currentStatus === "all") return hm.all;
  return hm.by_status?.[currentStatus] || hm.all;
}

function renderBarChart(elementId, items, labelKey) {
  const reversed = [...items].reverse();
  const data = [
    {
      type: "bar",
      orientation: "h",
      x: reversed.map((i) => i.count),
      y: reversed.map((i) => i[labelKey]),
      marker: { color: "#a89878" },
    },
  ];
  const layout = {
    ...PLOT_LAYOUT,
    dragmode: false,
    margin: { l: 100, r: 20, t: 10, b: 40 },
    xaxis: { gridcolor: "#243538", fixedrange: true },
    yaxis: { gridcolor: "#243538", fixedrange: true },
  };
  Plotly.newPlot(elementId, data, layout, PLOT_CONFIG);
}

function renderTopRepos() {
  const el = document.getElementById("top-repos");
  const rows = report.top_repos
    .map(
      (r, i) =>
        `<tr><td>${i + 1}</td><td>${escapeHtml(r.repository)}</td><td>${r.count.toLocaleString()}</td></tr>`
    )
    .join("");
  el.innerHTML = `<table>
    <thead><tr><th>#</th><th>Repository</th><th>Hits</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderAll() {
  const hms = heatmaps();

  renderHeatmap("heatmap-ext-repo", extRepoHeatmapData(), {
    yLabel: "File extension",
    xLabel: "Repository type",
  });
  renderInsight("heatmap-ext-repo", hms.ext_repo_type?.insight);

  renderHeatmap("heatmap-repo-status", hms.repo_type_status?.all, {
    yLabel: "Repository type",
    xLabel: "Validation status",
    minHeight: 240,
    rowHeight: 56,
    chartPadding: 60,
    xAxisSide: "bottom",
    marginTop: 16,
    marginBottom: 64,
    fontSize: 13,
    tickFontSize: 13,
    hideColorbar: true,
  });
  renderInsight("heatmap-repo-status", hms.repo_type_status?.insight);

  renderHeatmap("heatmap-ext-status", hms.ext_status?.all, {
    yLabel: "File extension",
    xLabel: "Validation status",
  });
  renderInsight("heatmap-ext-status", hms.ext_status?.insight);

  const paths = report.top_paths[currentStatus] || report.top_paths.all;
  const exts = report.top_extensions[currentStatus] || report.top_extensions.all;
  renderBarChart("chart-ext", exts, "ext");
  renderBarChart("chart-path", paths, "category");
  renderTopRepos();
}

loadReport().catch((err) => {
  document.body.innerHTML = `<div class="container" style="padding:2rem;color:#d4836f">
    <h1>Failed to load report</h1><p>${escapeHtml(err.message)}</p>
    <p>Run: <code>python3 analysis/build_exposure_pages.py --quick</code></p>
  </div>`;
});
