data = {
   "nodes": [],
   "links": []
};





// ========================================
// SVG manipulations
// ========================================

var height_offset = 20;
var radial_offset = 150;

// Define colors
var min_values_color = '#04A6D3',
    max_values_color = '#F000F4',
    fade_out_color = '#4A5163',
    background_color = '#353A47';

// Define scale functions
var freqs = d3.extent(data.nodes, node => node.frequency);
var coocs = d3.extent(data.links, link => link.cooccurrence);
freqs = [1,1];
coocs = [1,1];
var node_radius = d3.scaleLog().domain(freqs).range([12, 12]);
var node_color = d3.scaleLog().domain(freqs).range([min_values_color, max_values_color]);
var link_color = d3.scaleLog().domain(coocs).range([min_values_color, max_values_color]);
var link_size = d3.scaleLog().domain(coocs).range([1, 3]);

// ========================================
// Data manipulations
// ========================================

// Index nodes and connections by id to speed up lookups
var nodes_are_linked = {},
    nodes_by_id = {},
    nodes_are_linked_directed = {};

function indexNodes() {
   nodes_are_linked = {};
   nodes_by_id = {};
   nodes_are_linked_directed = {};

   data.links.forEach(link => {
      nodes_are_linked[`${link.source}-${link.target}`] = true;
      nodes_are_linked[`${link.target}-${link.source}`] = true;
      nodes_are_linked_directed[`${link.source}-${link.target}`] = true;
   })
   data.nodes.forEach(node => {
      nodes_are_linked[`${node.id}-${node.id}`] = true;
      nodes_by_id[node.id] = node;
   })

   freqs = d3.extent(data.nodes, node => node.frequency);
   coocs = d3.extent(data.links, link => link.cooccurrence);
   node_color = d3.scaleLog().domain(freqs).range([min_values_color, max_values_color]);
   link_color = d3.scaleLog().domain(coocs).range([min_values_color, max_values_color]);
   link_size = d3.scaleLog().domain(coocs).range([1, 3]);
}

indexNodes();

var resizeId;
window.addEventListener('resize', function() {
   $("#viz svg").hide();
   clearTimeout(resizeId);
   resizeId = setTimeout(doneResizing, 500);
});

function doneResizing(){
   var width = $("#viz").width();
   var height = $("#viz").height() - height_offset;

   $("#viz svg").width(width);
   $("#viz svg").height(height);
   svg.attr("transform", `translate(${width / 2}, ${height / 2})`);
   restart();
   $("#viz svg").show();
}

var width = $("#viz").width(),
    height = $("#viz").height() - height_offset;

// Define the parent SVG
var svg = d3.select("#viz")
   .append("svg")
   .attr("width", width)
   .attr("height", height)
   .style("background-color", background_color)
   .append('g')
   .attr("transform", `translate(${width / 2}, ${height / 2})`);

// Start the force simulation
var simulation = d3.forceSimulation(data.nodes)
   .force('center', d3.forceCenter())
   .force('charge', d3.forceManyBody().strength(0))
   .force('collision', d3.forceCollide().radius(d => node_radius(d.frequency) + 3))
   .force('radial', d3.forceRadial((Math.min($("#viz").width(), $("#viz").height()) / 2) - radial_offset))
   .on('tick', tick);

// Define the links
var links = svg.selectAll('.link')
   .data(data.links)
   .enter()
   .append('path')
   .attr('class', 'link')
   .style('fill', 'none')
   .style('stroke', d => link_color(d.cooccurrence))
   .style('stroke-width', d => link_size(d.cooccurrence));

// Define the nodes
var nodes = svg.selectAll('.node')
   .data(data.nodes)
   .enter()
   .append('circle')
   .attr('class', 'node')
   .attr('r', d => node_radius(d.frequency))
   .style('fill', d => node_color(d.frequency))
   .style('stroke', d => d3.color(node_color(d.frequency)).darker())
   .style('stroke-width', 0.5)
   .on('mouseover', mouseover_node)
   .on('mouseout', mouseout_node)
   .on('click', click_node);


// Define the node labels (shown on mouseover/click)
var texts = svg.selectAll('text')
   .data(data.nodes)
   .enter()
   .append('text')
   .attr("pointer-events", "none")
   .attr("alignment-baseline", "middle")
   .attr('visibility', 'visible')
   .style("font-family", "Helvetica")
   .style("font-size", "12")
   .style('fill', 'white')
   .text(d => d.name);


// Update and restart the simulation.
restart();

// ========================================
// Functions
// ========================================

function tick() {
   function rotate_text(d_node) {
      var alpha = Math.atan2(-d_node.y, d_node.x),
          distance = node_radius(d_node.frequency) + 10,
          x = d_node.x + Math.cos(alpha)*(distance),
          y = d_node.y - Math.sin(alpha)*(distance),
          to_degrees = angle => angle * 180 / Math.PI,
          rotation = d_node.x < 0 ? 180 - to_degrees(alpha) : 360 - to_degrees(alpha);
      return `translate(${x}, ${y})rotate(${rotation})`;
   }
   
   function link_path(d_link) {
      var source = nodes_by_id[d_link.source],
          target = nodes_by_id[d_link.target],
          p = d3.path();
      p.moveTo(source.x, source.y);
      p.quadraticCurveTo(0, 0, target.x, target.y);
      return p.toString();
   }

   texts
      .attr("text-anchor", d => d.x < 0 ? 'end' : 'start')
      .attr('transform', rotate_text);

   nodes
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

   links
      .attr('d', link_path);
}


// ========================================
// Required for update
// ========================================

function restart() {
  links = links.data(data.links);
  links.exit().remove();
  links = links.enter()
     .append('path')
     .attr('class', 'link')
     .style('fill', 'none')
     .style('stroke', d => link_color(d.cooccurrence))
     .style('stroke-width', d => link_size(d.cooccurrence))
     .merge(links);

  nodes = nodes.data(data.nodes);
  nodes.exit().remove();
  nodes = nodes.enter()
   .append('circle')
   .attr('class', 'node')
   .attr('r', d => node_radius(d.frequency))
   .style('fill', d => node_color(d.frequency))
   .style('stroke', d => d3.color(node_color(d.frequency)).darker())
   .style('stroke-width', 0.5)
   .on('mouseover', mouseover_node)
   .on('mouseout', mouseout_node)
   .on('click', click_node)
   .merge(nodes);

  texts = texts.data(data.nodes);
  texts.exit().remove();
  texts = texts.enter()
   .append('text')
   .attr("pointer-events", "none")
   .attr("alignment-baseline", "middle")
   .attr('visibility', 'visible')
   .style("font-family", "Helvetica")
   .style("font-size", "12")
   .style('fill', 'white')
   .text(d => d.name)
   .merge(texts);

  // Update and restart the simulation.
  simulation.nodes(data.nodes);
  simulation.force('center');
  simulation.force('charge')
  simulation.force('collision')
  simulation.force('radial', d3.forceRadial((Math.min($("#viz").width(), $("#viz").height()) / 2) - radial_offset));
  simulation.on('tick', tick);
  simulation.alpha(1).alphaDecay(0).velocityDecay(0.25).restart();

  d3.selectAll("circle").raise();
}

// ========================================
// User interaction events
// ========================================

function link_is_connected(node_data, link_data) {
   return node_data.id === link_data.source || node_data.id === link_data.target;
}

function node_is_connected(node_data, other_node_data) {
   return nodes_are_linked[`${node_data.id}-${other_node_data.id}`];
}


function mouseover_node(d_node) {
   resetNodeSelected();
   nodeSelectedByClick = false;
    links
       .style('stroke', d_link => link_is_connected(d_node, d_link) ? link_color(d_link.cooccurrence) : fade_out_color)
       .filter(d_link => link_is_connected(d_node, d_link)).raise();
 
    nodes
       .style('fill', d_other_node => node_is_connected(d_node, d_other_node) ? node_color(d_other_node.frequency) : fade_out_color)
       .style('stroke', d_other_node => node_is_connected(d_node, d_other_node) ? d3.color(node_color(d_other_node.frequency)).darker() : fade_out_color)
       .filter(d_other_node => node_is_connected(d_node, d_other_node)).raise();
 
    texts
       .attr('visibility', d_other_node => node_is_connected(d_node, d_other_node) ? 'visible' : 'visible')
       .raise();
 }
 
 function mouseout_node() {
    if (nodeSelectedByClick) {
       return;
    }
    links
       .style('stroke', d_link => link_color(d_link.cooccurrence));
 
    nodes
       .style('fill', d_node => node_color(d_node.frequency))
       .style('stroke', d_node => d3.color(node_color(d_node.frequency)).darker());
 
    texts
       .attr('visibility', 'visible');
 }
 
 var nodeSelectedByClick = false;

 function click_node(d_node) {
    if(nodeSelectedByClick) {
       return;
    }
      nodeSelected(d_node);
      nodeSelectedByClick = true;
     links
         .style('stroke', d_link => link_is_connected(d_node, d_link) ? link_color(d_link.cooccurrence) : fade_out_color)
         .filter(d_link => link_is_connected(d_node, d_link)).raise();
 
     nodes
         .style('fill', d_other_node => node_is_connected(d_node, d_other_node) ? node_color(d_other_node.frequency) : fade_out_color)
         .style('stroke', d_other_node => node_is_connected(d_node, d_other_node) ? d3.color(node_color(d_other_node.frequency)).darker() : fade_out_color)
         .filter(d_other_node => node_is_connected(d_node, d_other_node)).raise();
 
     texts
         .attr('visibility', d_other_node => node_is_connected(d_node, d_other_node) ? 'visible' : 'visible')
         .raise();
 }

 function highlight(d_node) {
   links
   .style('stroke', d_link => link_is_connected(d_node, d_link) ? link_color(d_link.cooccurrence) : fade_out_color)
   .filter(d_link => link_is_connected(d_node, d_link)).raise();

nodes
   .style('fill', d_other_node => node_is_connected(d_node, d_other_node) ? node_color(d_other_node.frequency) : fade_out_color)
   .style('stroke', d_other_node => node_is_connected(d_node, d_other_node) ? d3.color(node_color(d_other_node.frequency)).darker() : fade_out_color)
   .filter(d_other_node => node_is_connected(d_node, d_other_node)).raise();

texts
   .attr('visibility', d_other_node => node_is_connected(d_node, d_other_node) ? 'visible' : 'visible')
   .raise();
 }