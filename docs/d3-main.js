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

  let nodes = stepsData.map(d => ({ ...d, depth: 0 }));
  // only main nodes initially
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


        const colorByDepth = d3.scaleOrdinal()
            .domain([0, 1, 2])
            .range(["#3b82f6", "#9333ea", "#ec4899"]);
        g.append("circle")
          .attr("r", 24)
          .attr("fill", d => colorByDepth(d.depth ?? 0))
          .attr("stroke", "#fff")
          .attr("stroke-width", 2)
          .on("click", (_, d) => {
            if (d.children) {
              toggleChildren(d);
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


  function toggleChildren(parentNode) {
    if (!parentNode.children) return;
  
    if (parentNode._expanded) {
      // Collapse: remove child nodes & links
      const childIds = new Set(parentNode.children.map(c => c.id));
      nodes = nodes.filter(n => !childIds.has(n.id));
      links = links.filter(l =>
        !childIds.has(typeof l.target === 'object' ? l.target.id : l.target)
      );
      parentNode._expanded = false;
    } else {
      // Expand
      const newNodes = parentNode.children.map(child => ({ ...child, depth: 1 }));
      const newLinks = newNodes.map(child => ({
        source: parentNode.id,
        target: child.id
      }));
      nodes.push(...newNodes);
      links.push(...newLinks);
      parentNode._expanded = true;
    }
  
    // ⬇️ Corrected usage of lKey()
    nodeSelection = nodeGroup.selectAll("g").data(nodes, d => d.id);
    linkSelection = linkGroup.selectAll("line").data(links, l => lKey(l));
    draw();
  }
  
  
  // Unique key for link data join
  function lKey(link) {
    const s = typeof link.source === "object" ? link.source.id : link.source;
    const t = typeof link.target === "object" ? link.target.id : link.target;
    return `${s}-${t}`;
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

// Sidebar: auto-show on node click
function showSidebar(d) {
    const content = document.getElementById("content");
    sidebar.classList.remove("closed");  // ⬅️ Always open when a node is clicked
  
    content.innerHTML = `
      <h2>${d.label}</h2>
      ${marked.parse(d.desc || "*Coming soon*")}
      ${d.code ? `<h3>Code Snippet</h3><pre><code>${d.code}</code></pre>` : ""}
      ${d.links?.length ? `<h3>Articles</h3><ul>${d.links.map(l =>
        `<li><a href="${l.url}" target="_blank">${l.text}</a></li>`
      ).join("")}</ul>` : ""}
    `;
  }

// Sidebar: toggle visibility
const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("toggleBtn");
const closeBtn = document.getElementById("closeBtn");
toggleBtn.onclick = () => {
sidebar.classList.toggle("closed");  // ⬅️ Use 'closed' class
};

closeBtn.onclick = () => {
sidebar.classList.add("closed");     // ⬅️ Force hide
};

// Resizable sidebar
const resizer = document.getElementById("resizer");
let isResizing = false;

resizer.addEventListener("mousedown", e => {
  isResizing = true;
  document.body.style.cursor = "ew-resize";
  document.body.style.userSelect = "none";
});

document.addEventListener("mousemove", e => {
  if (!isResizing) return;
  const newWidth = window.innerWidth - e.clientX;
  sidebar.style.width = `${Math.max(newWidth, 200)}px`; // min width = 200px
});

document.addEventListener("mouseup", () => {
  if (isResizing) {
    isResizing = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }
});
