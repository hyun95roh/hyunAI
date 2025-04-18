/************* 1. Step metadata *************/
const steps = [
    {
      id: 1, label: "1 · Data Acquisition", colorIndex: 0,
      desc: `Collect raw data from multiple sources (DB dumps, APIs, web-scraping, sensors, …).
  
  **Potential issues:** access rate limits, inconsistent formats, missing fields.  
  **Diagnosis tools:** data profiler, schema validator.  
  **Resolutions:** caching layer, schema inference, automated retries.`,
      links: [
        { text: "Article – Best Practices for Data Ingestion", url: "https://example.com/ingestion" }
      ],
      code: `# Example: incremental dump via Airbyte\nairbyte run --connection-id XXXXX`
    },
    { id: 2, label: "2 · Data Pre-processing", colorIndex: 1, desc: "…" },
    { id: 3, label: "3 · Feature Engineering", colorIndex: 2, desc: "…" },
    { id: 4, label: "4 · Model Selection", colorIndex: 3, desc: "…" },
    { id: 5, label: "5 · Training", colorIndex: 4, desc: "…" },
    { id: 6, label: "6 · Evaluation", colorIndex: 5, desc: "…" },
    { id: 7, label: "7 · Testing", colorIndex: 6, desc: "…" },
    { id: 8, label: "8 · Perf Comparison", colorIndex: 7, desc: "…" }
  ];
  
  const edges = steps.slice(0, -1).map(s => ({ from: s.id, to: s.id + 1, arrows: 'to' }));
  
  /************* 2. Build and render network *************/
  const nodeColors = getComputedStyle(document.documentElement)
    .getPropertyValue('--steps').split(',').map(c => c.trim());
  
  const nodes = new vis.DataSet(
    steps.map(s => ({
      id: s.id,
      label: s.label,
      font: { multi: true },
      color: { background: nodeColors[s.colorIndex], border: "#fff" },
      borderWidth: 2,
      shape: "box",
      margin: 10
    }))
  );
  
  const network = new vis.Network(
    document.getElementById("mynetwork"),
    { nodes, edges: new vis.DataSet(edges) },
    {
      layout: {
        hierarchical: {
          direction: "LR",
          levelSeparation: 160,
          nodeSpacing: 200
        }
      },
      physics: false,
      interaction: { hover: true }
    }
  );
  
  /************* 3. Sidebar interaction *************/
  const sidebar = document.getElementById("sidebar");
  const closeBtn = document.getElementById("closeBtn");
  const contentEl = document.getElementById("content");
  const toggleBtn = document.getElementById("toggleBtn");
  
  // Open sidebar with step content
  function openSidebarByStep(step) {
    sidebar.classList.add("open");
    contentEl.innerHTML = `
      <h2>${step.label}</h2>
      ${marked.parse(step.desc || "*Coming soon*")}
      ${step.code ? `<h3>Code Snippet</h3><pre><code>${step.code}</code></pre>` : ""}
      ${step.links?.length ? `<h3>Articles</h3><ul>${step.links.map(l => `<li><a href="${l.url}" target="_blank">${l.text}</a></li>`).join('')}</ul>` : ""}
    `;
  }
  
  // Handle node clicks → update hash
  network.on("click", params => {
    if (!params.nodes.length) return;
    location.hash = `#step${params.nodes[0]}`; // triggers hashchange listener
  });
  
  // Toggle button to expand/collapse sidebar
  toggleBtn.onclick = () => {
    sidebar.classList.toggle("open");
  };
  
  // Manual close button
  closeBtn.onclick = () => sidebar.classList.remove("open");
  
  // Optional: close sidebar when clicking outside
  document.addEventListener("click", e => {
    if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
      sidebar.classList.remove("open");
    }
  });
  
  // Optional: close with Esc key
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") sidebar.classList.remove("open");
  });
  
  /************* 4. Hash-based routing for step deep-links *************/
  function handleHashChange() {
    const stepId = parseInt(location.hash.replace('#step', ''));
    if (isNaN(stepId)) return;
    const step = steps.find(s => s.id === stepId);
    if (step) openSidebarByStep(step);
  }
  window.addEventListener("hashchange", handleHashChange);
  window.dispatchEvent(new Event("hashchange")); // support initial deep link
  