fetch('data/pipeline.json')
  .then(res => res.json())
  .then(data => initGraph(data.steps));

function initGraph(stepsData) {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const svg = d3.select("#graph")
    .attr("viewBox", [0, 0, width, height])
    .call(d3.zoom().on("zoom", e => svgGroup.attr("transform", e.transform)));

  const svgGroup = svg.append("g");

  svg.append("defs").append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 24)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#999");

  let nodes = [...stepsData]; // only main nodes initially
  let links = stepsData.slice(0, -1).map((d, i) => ({
    source: d.id,
    target: stepsData[i + 1].id
  }));

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(200))
    .force("charge", d3.forceManyBody().strength(-400))
    .force("center", d3.forceCenter(width / 2, height / 2));

  const linkGroup = svgGroup.append("g").attr("stroke", "#aaa").attr("stroke-width", 2);
  const nodeGroup = svgGroup.append("g");

  let linkSelection = linkGroup.selectAll("line").data(links, d => `${d.source}-${d.target}`);
  let nodeSelection = nodeGroup.selectAll("g").data(nodes, d => d.id);

  draw();

  function draw() {
    linkSelection = linkSelection.join("line")
      .attr("marker-end", "url(#arrowhead)");

    nodeSelection = nodeSelection.join(
      enter => {
        const g = enter.append("g").attr("class", "node").call(drag(simulation));

        g.append("circle")
          .attr("r", 24)
          .attr("fill", "#3b82f6")
          .attr("stroke", "#fff")
          .attr("stroke-width", 2)
          .on("click", (_, d) => {
            if (d.children && !d._expanded) {
              revealChildren(d);
            }
            showSidebar(d);
          });

        g.append("text")
          .attr("y", 40)
          .attr("text-anchor", "middle")
          .attr("fill", "#fff")
          .style("font-size", "12px")
          .text(d => d.label);

        return g;
      }
    );

    simulation.nodes(nodes);
    simulation.force("link").links(links);
    simulation.alpha(1).restart();

    simulation.on("tick", () => {
      nodeSelection.attr("transform", d => `translate(${d.x},${d.y})`);
      linkSelection
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
    });
  }

  function revealChildren(parentNode) {
    parentNode._expanded = true;

    const newNodes = parentNode.children || [];
    const newLinks = newNodes.map(child => ({
      source: parentNode.id,
      target: child.id
    }));

    nodes.push(...newNodes);
    links.push(...newLinks);

    // Update selections
    nodeSelection = nodeGroup.selectAll("g").data(nodes, d => d.id);
    linkSelection = linkGroup.selectAll("line").data(links, d => `${d.source}-${d.target}`);
    draw();
  }
}

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

document.getElementById("closeBtn").onclick = () =>
  document.getElementById("sidebar").classList.remove("open");

document.getElementById("toggleBtn").onclick = () =>
  document.getElementById("sidebar").classList.toggle("open");
