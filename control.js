const { dialog } = require('electron').remote;
const fs = require('fs');

/*
var popedNodes;
var popedLink;

d3.interval(function() {
   popedNodes = data.nodes.pop();
   popedLink = data.links.pop();
   restart();
 }, 5000, d3.now());
 
 d3.interval(function() {
   data.nodes.push(popedNodes);
   data.links.push(popedLink);
   restart();
 }, 5000, d3.now() + 3000);
*/

 $("#add_node_to_diagram").click(function() {
   $(".add_node_modal").show();
 });

 $("#cancle_add_node").click(function() {
   $("#new_node_name").val("");
   M.updateTextFields();
   $(".add_node_modal").hide();
 });

$("#add_node").click(function(){
   var nodeName = $("#new_node_name").val();

   if(nodeName.length > 0) {
      var largestId = Math.max(Math.max.apply(Math, data.nodes.map(function(node) { return node.id; })),-1);
      var newLargestId = largestId + 1;
  
      var newNode = {
          "id": newLargestId,
          "name": nodeName,
          "frequency": 1
       };
  
     data.nodes.push(newNode);
  
     indexNodes();
     restart();
   }

   $("#new_node_name").val("");
   M.updateTextFields();
   $(".add_node_modal").hide();
});

   $("#add_dependent_data").click(function (){
      var selectedNodeId = $("#selected_system").attr("data-selected-system-id");
      $(".remote_node").remove();
      $("#new_data").val("");
      $('input[name="data_direction"]').prop('checked', false);

      data.nodes.forEach(node => {
         if(node.id != selectedNodeId) {
            $("#node_selection").append(`<option class="remote_node" value="` + node.id + `">` + node.name + `</option>`);
         }
      });
      $("#node_selection").prop('selectedIndex', 0);
      M.FormSelect.init(document.querySelectorAll('select'));
      $(".add_dependency_modal").show();
   });

 $("#cancle_add_dependency").click(function() {
   $("#new_data").val("");
   M.updateTextFields();
   $(".add_dependency_modal").hide();
 });

 $("#add_dependency").click(function() {
   var selectedNodeId = $("#selected_system").attr("data-selected-system-id");
   

   var dataDirection = $("input[name='data_direction']:checked").val();
   var dataValue = $("#new_data").val();
   var nodeSelection = $( "#node_selection" ).val();

   if(dataDirection !== undefined && nodeSelection >= 0 && dataValue.length > 0) {

      var source, target;
      if("in" == dataDirection) {
         source = parseInt(nodeSelection);
         target = parseInt(selectedNodeId);
      }
      else if("out" == dataDirection) {
         source = parseInt(selectedNodeId);
         target = parseInt(nodeSelection);
      }

      if(nodes_are_linked_directed[source + "-" + target]) {
         data.links.forEach(link => {
            if(link.source == source && link.target == target) {
               link.dataflow.push(dataValue);
               link.cooccurrence++;
            }
         });
      }
      else {
         data.links.push({
            "source": source,
            "target": target,
            "cooccurrence": 1,
            "dataflow": [dataValue]
         });     
      }

      nodes_by_id[source].frequency++;
      nodes_by_id[target].frequency++;

      // data.links.push({"source": 1, "target": 3, "cooccurrence": 4});
      
      indexNodes();
   }

   M.updateTextFields();
   $(".add_dependency_modal").hide();

   resetNodeSelected();
   nodeSelected(nodes_by_id[selectedNodeId]);
   highlight(nodes_by_id[selectedNodeId]);

   restart();
 });

 function getConnectedNodesAndDataflow(nodeId) {

    var connectedNodes = new Set([]);;
    var dataFlow = {"out": [], "in": []};

    data.links.forEach(link => {
       if(link.source == nodeId) {
         connectedNodes.add(link.target);
         var remoteNode = nodes_by_id[link.target];
         link.dataflow.forEach(df => {
            dataFlow.out.push({
               "id": link.target,
               "data": df,
               "remote": remoteNode.name
            });
         });
       }
       else if(link.target == nodeId) {
         connectedNodes.add(link.source);
         var remoteNode = nodes_by_id[link.source];
         link.dataflow.forEach(df => {
            dataFlow.in.push({
               "id": link.source,
               "data": df,
               "remote": remoteNode.name
            });
         });
       }
    });

    return [Array.from(connectedNodes), dataFlow];
 }

 function nodeSelected(node) {
    $("#selected_system").text(node.name);
    $("#selected_system").attr("data-selected-system-id", node.id);
    
    showDependentSystems(node.id);
    $("#selected_system_ghost").hide();
    $("#selected_system").show();
 }

 function resetNodeSelected() {
    $("#selected_system").text(" ");
    $("#selected_system").attr("data-selected-system-id", "");
    $(".actual-node").remove();
    $(".actual-data").remove();
    $("#selected_system_ghost").show();
    $("#selected_system").hide();
    $("#dependent_system_ghost").show();
    $("#dependent_data_ghost").show();
    $("#add_dependent_data").hide();
 }

 function showDependentSystems(nodeId) {
    $("#dependent_system_ghost").hide();
    $("#dependent_data_ghost").hide();
    $("#add_dependent_data").show();
    var dependentSystems = getConnectedNodesAndDataflow(nodeId);
    var selectedNodeId = $("#selected_system").attr("data-selected-system-id");
    
    dependentSystems[0].forEach(entry => {
        var node = nodes_by_id[entry];
        $( "#dependent_systems_pane > .collection" ).append( "<a href=\"#!\" class=\"collection-item actual-node\" data-remote-id=\"" + node.id + "\" onClick=\"selectDependentSystems(" + node.id + ")\">" + node.name + "</a>" );
    });
   
    dependentSystems[1].out.forEach(entry => {
      $( "#dependent_data_pane > .collection" ).append( `
      <li class="collection-item  actual-data" data-remote-id="` + entry.id + `">
         <div class="data_direction"><i class="material-icons">flight_takeoff</i></div>
         <div>
               ` + entry.data + `
               <a class="waves-effect waves-red btn-flat remove_dependent_data"><i class="material-icons" onclick="deleteDependency(`+selectedNodeId +`, `+selectedNodeId+`, `+entry.id +`, '`+entry.data+`')">delete</i></a>
         </div>
         <div class="system_info">
            ` + entry.remote + `
         </div>
      </li>
      ` );
    });

    dependentSystems[1].in.forEach(entry => {
      $( "#dependent_data_pane > .collection" ).append( `
      <li class="collection-item  actual-data" data-remote-id="` + entry.id + `">
         <div class="data_direction"><i class="material-icons">flight_land</i></div>
         <div>
               ` + entry.data + `
               <a class="waves-effect waves-red btn-flat remove_dependent_data"><i class="material-icons" onclick="deleteDependency(`+selectedNodeId +`, `+entry.id+`, `+selectedNodeId +`, '`+entry.data+`')">delete</i></a>
         </div>
         <div class="system_info">
            ` + entry.remote + `
         </div>
      </li>
      ` );
   });
 }

function deleteDependency(selectedNodeId, source, target, dataValue) {
   var linkNowEmpty = -1;

   for (let index = 0; index < data.links.length; index++) {
      const link = data.links[index];
      
      if(link.source == source && link.target == target) {
         link.dataflow = jQuery.grep(link.dataflow, function(value) {
            return value != dataValue;
          });

          if (link.dataflow.length == 0) {
             linkNowEmpty = index;
          }
      }
   }

   if (linkNowEmpty > -1) {
      data.links.splice(linkNowEmpty,1);
   }

   indexNodes();
   resetNodeSelected();
   nodeSelected(nodes_by_id[selectedNodeId]);
   highlight(nodes_by_id[selectedNodeId]);
   restart();
}

function selectDependentSystems(systemId) {
   $("#clean_selected_dependent_system").show();
   $("#dependent_systems_pane > .collection > .actual-node").removeClass("selected_system");
   $("#dependent_data_pane > .collection > .actual-data").show();
   $("#dependent_systems_pane > .collection > .actual-node[data-remote-id = " + systemId + "]").addClass("selected_system");
   $("#dependent_data_pane > .collection > .actual-data[data-remote-id != " + systemId + "]").hide();
}
$("#clean_selected_dependent_system").click(function() {
   $("#clean_selected_dependent_system").hide();
   $("#dependent_systems_pane > .collection > .actual-node").removeClass("selected_system");
   $("#dependent_data_pane > .collection > .actual-data").show();
});

$("#open_diagram_data").click(function() {
   var filePath = dialog.showOpenDialogSync({ properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (filePath !== undefined) {
        d3.json(filePath[0]).then(file => {
         if(file.hasOwnProperty("nodes") && file.hasOwnProperty("links")) {
            if(Array.isArray(file.nodes) && Array.isArray(file.links)) {
               data = file;
               indexNodes();
               restart();
            }
            else {
               M.toast({html: 'Fields `nodes` or `links` are not array!'})
            }
         }
         else {
            M.toast({html: 'File you tried to open does not have a JSON with fields `nodes` or `links`!'})
         }
        });
    }
});

$("#save_diagram_data").click(function() {
   var filePath = dialog.showSaveDialogSync({ properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (filePath !== undefined) {
        let dataAsString = JSON.stringify(data, null, 2);
        fs.writeFileSync(filePath, dataAsString);
    }
});