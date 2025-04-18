fetch('data/pipeline.json')
  .then(res => res.json())
  .then(data => renderGraph(data.steps));

function renderGraph(nodesData) {
  const svg = d3.select("#graph");
  const width = window.innerWidth;
  const height = window.innerHeight;

  svg.append("defs").append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "-0 -5 10 10")
    .attr("refX", 22)
    .attr("refY", 0)
    .attr("orient", "auto")
    .attr("markerWidth", 8)
    .attr("markerHeight", 8)
    .attr("xoverflow", "visible")
    .append("svg:path")
    .attr("d", "M 0,-5 L 10,0 L 0,5")
    .attr("fill", "#999");

  const edgesData = nodesData.slice(0, -1).map((d, i) => ({
    source: d.id,
    target: nodesData[i + 1].id
  }));

  const simulation = d3.forceSimulation(nodesData)
    .force("link", d3.forceLink(edgesData).id(d => d.id).distance(180))
    .force("charge", d3.forceManyBody().strength(-500))
    .force("center", d3.forceCenter(width / 2, height / 2));

  const link = svg.append("g")
    .attr("stroke", "#999")
    .selectAll("path")
    .data(edgesData)
    .join("path")
    .attr("class", "link");

  const node = svg.append("g")
    .selectAll("g")
    .data(nodesData)
    .join("g")
    .attr("class", "node")
    .call(drag(simulation));

  node.append("circle")
    .attr("r", 20)
    .on("click", (_, d) => showSidebar(d));

  node.append("text")
    .attr("dy", 4)
    .attr("y", 30)
    .text(d => d.label);

  simulation.on("tick", () => {
    node.attr("transform", d => `translate(${d.x},${d.y})`);
    link.attr("d", d => {
      const dx = d.target.x - d.source.x;
      const dy = d.target.y - d.source.y;
      const dr = Math.sqrt(dx * dx + dy * dy);
      return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`;
    });
  });
}

// Dragging behavior
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
    ${d.code ? `<h3>Code Snippet</h3><pre><code>${d.code}</code></pre>` : ''}
    ${d.links?.length ? `<h3>Articles</h3><ul>${d.links.map(l => `<li><a href="${l.url}" target="_blank">${l.text}</a></li>`).join('')}</ul>` : ''}
  `;
}

document.getElementById("closeBtn").onclick = () => {
  document.getElementById("sidebar").classList.remove("open");
};
document.getElementById("toggleBtn").onclick = () => {
  document.getElementById("sidebar").classList.toggle("open");
};
