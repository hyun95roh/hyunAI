fetch('data/pipeline.json')
  .then(res => res.json())
  .then(data => initGraph(data.steps));



function initGraph(stepsData) {
  const colorByDepth = d3.scaleOrdinal()
    .domain([0, 1, 2])
    .range(["#3b82f6", "#9333ea", "#ec4899"]);

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
  window.allNodes = stepsData.flatMap(d => [d, ...(d.children || [])]);



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
        g.append("circle")
          .attr("r", 24)
          .attr("stroke", "#fff")
          .attr("stroke-width", 2)
          .on("click", (_, d) => {
            if (d.children) toggleChildren(d);
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



    // ✅ Apply dynamic color to ALL node circles (not just new ones)
    nodeSelection.select("circle")
      .attr("fill", d => colorByDepth(d.depth ?? 0));
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



// Drag behavior for nodes
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
const sidebar = document.getElementById("sidebar");
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
const toggleBtn = document.getElementById("toggleBtn");
const closeBtn = document.getElementById("closeBtn");
toggleBtn.onclick = () => {
sidebar.classList.toggle("closed");  // ⬅️ Use 'closed' class
};

closeBtn.onclick = () => {
sidebar.classList.add("closed");     // ⬅️ Force hide
};


// Resizable right sidebar
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



// Resizable left sidebar
const leftSidebar = document.getElementById("left-sidebar");
const leftResizer = document.getElementById("leftResizer");
let isLeftResizing = false;


// Sidebar Collapse
document.getElementById("leftToggleBtn").onclick = () => {
    leftSidebar.classList.toggle("closed");
  };



// Sidebar Resize
leftResizer.addEventListener("mousedown", e => {
isLeftResizing = true;
document.body.style.cursor = "ew-resize";
});



document.addEventListener("mousemove", e => {
if (!isLeftResizing) return;
const newWidth = e.clientX;
leftSidebar.style.width = `${Math.max(newWidth, 200)}px`;
});



document.addEventListener("mouseup", () => {
isLeftResizing = false;
document.body.style.cursor = "";
});



// TAB SWITCHING (left sidebar)
document.querySelectorAll("#left-sidebar .tab").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll("#left-sidebar .tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll("#left-sidebar .tab-content").forEach(t => t.classList.add("hidden"));
      btn.classList.add("active");
      document.getElementById(`${btn.dataset.tab}-tab`).classList.remove("hidden");
    };

  });



// Search functionality - Filter nodes based on input
document.getElementById("searchBox").addEventListener("input", e => {
    const query = e.target.value.toLowerCase();
    const keywords = query.split(/\s+/).filter(Boolean); // split by space
    const resultBox = document.getElementById("searchResults");
    const matches = window.allNodes.filter(n => {
      const label = n.label?.toLowerCase() || "";
      return keywords.every(kw => label.includes(kw));
    }).slice(0, 10);


    resultBox.innerHTML = matches.map(m => {
      let label = m.label;

      keywords.forEach(kw => {
        const regex = new RegExp(`(${kw})`, "gi");
        label = label.replace(regex, "<mark>$1</mark>"); // Highlight matches
      });

      return `<div class="result" data-id="${m.id}">${label}</div>`;
    }).join("") || "<em>No results</em>";


  });



// Search functionality - Show node details on click
document.getElementById("searchResults").addEventListener("click", e => {
if (e.target.classList.contains("result")) {
    const id = e.target.dataset.id;
    const targetNode = window.allNodes.find(n => n.id == id);
    if (targetNode) showSidebar(targetNode);
}

});



// Chat functionality - Send message and get response
const historyEl = document.getElementById("chatHistory");
document.getElementById("chatSend").onclick = async () => {
  const input = document.getElementById("chatInput").value.trim();
  const out = document.getElementById("chatResponse");
  if (!input) return;

  historyEl.innerHTML += `<div class="chat-user">🧑‍💻 <strong>You:</strong> ${input}</div>`;
  out.innerHTML = `<em>Thinking...</em>`;
  document.getElementById("chatInput").value = "";

  try {
    const res = await fetch("https://hyunai.onrender.com/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input })
    });

    const data = await res.json();
    out.innerHTML = "";  // Clear final output box
    historyEl.innerHTML += `<div class="chat-bot">🤖 <strong>GPT:</strong> ${marked.parse(data.reply)}</div>`;
  } catch (err) {
    out.innerHTML = `<span style="color:red">❌ Chat failed</span>`;
  }

  historyEl.scrollTop = historyEl.scrollHeight;

};