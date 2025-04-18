fetch('data/pipeline.json')
  .then(res => res.json())
  .then(data => renderGraph(data.steps));

function renderGraph(nodesData) {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const linksData = nodesData.slice(0, -1).map((node, i) => ({
    source: node.id,
    target: nodesData[i + 1].id
  }));

  const svg = d3.select("#graph")
    .attr("viewBox", [0, 0, width, height])
    .call(d3.zoom().on("zoom", (event) => {
      svgGroup.attr("transform", event.transform);
    }));

  const svgGroup = svg.append("g");

  // Arrowhead marker
  svg.append("defs").append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 25)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#999");

  // Simulation
  const simulation = d3.forceSimulation(nodesData)
    .force("link", d3.forceLink(linksData).id(d => d.id).distance(200))
    .force("charge", d3.forceManyBody().strength(-500))
    .force("center", d3.forceCenter(width / 2, height / 2));

  // Links
  const link = svgGroup.append("g")
    .attr("stroke", "#aaa")
    .attr("stroke-width", 2)
    .selectAll("line")
    .data(linksData)
    .join("line")
    .attr("class", "link")
    .attr("marker-end", "url(#arrowhead)");

  // Nodes
  const node = svgGroup.append("g")
    .selectAll("g")
    .data(nodesData)
    .join("g")
    .attr("class", "node")
    .call(drag(simulation));

  node.append("circle")
    .attr("r", 24)
    .attr("fill", "#3b82f6")
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .on("click", (_, d) => showSidebar(d));

  node.append("text")
    .text(d => d.label)
    .attr("y", 40)
    .attr("text-anchor", "middle")
    .attr("fill", "#fff")
    .style("font-size", "12px");

  simulation.on("tick", () => {
    node.attr("transform", d => `translate(${d.x},${d.y})`);
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);
  });
}

// Drag behavior
function drag(simulation) {
  return d3.drag()
    .on("start", (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on("drag", (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on("end", (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    });
}

// Sidebar logic
function showSidebar(d) {
  const sidebar = document.getElementById("sidebar");
  const content = document.getElementById("content");
  sidebar.classList.add("open");

  content.innerHTML = `
    <h2>${d.label}</h2>
    ${marked.parse(d.desc || "*Coming soon*")}
    ${d.code ? `<h3>Code Snippet</h3><pre><code>${d.code}</code></pre>` : ""}
    ${d.links?.length ? `<h3>Articles</h3><ul>${d.links.map(l =>
      `<li><a href="${l.url}" target="_blank">${l.text}</a></li>`
    ).join("")}</ul>` : ""}
  `;
}

// Sidebar toggles
document.getElementById("closeBtn").onclick = () =>
  document.getElementById("sidebar").classList.remove("open");

document.getElementById("toggleBtn").onclick = () =>
  document.getElementById("sidebar").classList.toggle("open");
