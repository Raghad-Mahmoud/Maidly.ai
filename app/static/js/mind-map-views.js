
  
  // Function to initialize the first view
  function initializeFirstView(gojs_model) {
    const mindMapModel = new go.Diagram("mind", {
      "undoManager.isEnabled": true,
      layout: new go.TreeLayout({ angle: 90, layerSpacing: 35 }),
    });

    mindMapModel.nodeTemplate = new go.Node("Spot", {
      background: "transparent",
      click: function (e, obj) {
        const nodeData = obj.part.data;
        generate_subtopic_window(nodeData.name, obj);        
        handling_summ_req(nodeData.paragraph, appUrl);
      }
    })
      .add(
        new go.Shape("Circle", {
          width: 80, height: 80,
          fill: "white", strokeWidth: 2, stroke: "black"
        })
          .bind("fill", "color"),
        new go.TextBlock("Default Text", {
          font: "bold 10px sans-serif",
          stroke: "black",
          textAlign: "center",
          verticalAlignment: go.Spot.Center,
          margin: 0,
          wrap: go.TextBlock.WrapFit,
          width: 70
        })
          .bind("text", "name")
      );

    mindMapModel.model = new go.TreeModel(gojs_model);
  }

  // Function to initialize the second view
  function initializeSecondView(gojs_model) {
    function init() {
      myDiagram = new go.Diagram('mind', {
        // when the user drags a node, also move/copy/delete the whole subtree starting with that node
        'commandHandler.copiesTree': true,
        'commandHandler.copiesParentKey': true,
        'commandHandler.deletesTree': true,
        'draggingTool.dragsTree': true,
        'undoManager.isEnabled': true
      });
  
      // when the document is modified, add a "*" to the title and enable the "Save" button
      myDiagram.addDiagramListener('Modified', (e) => {
        var button = document.getElementById('SaveButton');
        if (button) button.disabled = !myDiagram.isModified;
        var idx = document.title.indexOf('*');
        if (myDiagram.isModified) {
          if (idx < 0) document.title += '*';
        } else {
          if (idx >= 0) document.title = document.title.slice(0, idx);
        }
      });
  
      // a node consists of some text with a line shape underneath
      myDiagram.nodeTemplate = new go.Node('Vertical', {
        selectionObjectName: 'TEXT',
        click: function (e, obj) {
          const nodeData = obj.part.data;
          generate_subtopic_window(nodeData.name, obj); // Adjusted key from "name" to "text"
          handling_summ_req(nodeData.paragraph, appUrl);
        }
      })
        // remember the locations of each node in the node data
        .bindTwoWay('location', 'loc', go.Point.parse, go.Point.stringify)
        // make sure text "grows" in the desired direction
        .bind('locationSpot', 'dir', (d) => spotConverter(d, false))
        .add(
          new go.TextBlock({
            name: 'TEXT',
            minSize: new go.Size(30, 15),
            editable: true
          })
            .bindTwoWay('text','name')
            .bindTwoWay('scale')
            .bindTwoWay('font'),
          new go.Shape('LineH', {
            stretch: go.Stretch.Horizontal,
            strokeWidth: 3,
            height: 3,
            // this line shape is the port -- what links connect with
            portId: '',
            fromSpot: go.Spot.LeftRightSides,
            toSpot: go.Spot.LeftRightSides
          })
            .bind('stroke', 'brush')
            // make sure links come in from the proper direction and go out appropriately
            .bind('fromSpot', 'dir', (d) => spotConverter(d, true))
            .bind('toSpot', 'dir', (d) => spotConverter(d, false))
        );
  
      // selected nodes show a button for adding children
      myDiagram.nodeTemplate.selectionAdornmentTemplate = new go.Adornment('Spot')
        .add(
          new go.Panel('Auto')
            .add(
              // this Adornment has a rectangular blue Shape around the selected node
              new go.Shape({
                fill: null,
                stroke: 'dodgerblue',
                strokeWidth: 3
              }),
              new go.Placeholder({ margin: new go.Margin(4, 4, 0, 4) })
            ),
          // and this Adornment has a Button to the right of the selected node
          go.GraphObject.build('Button', {
            alignment: go.Spot.Right,
            alignmentFocus: go.Spot.Left,
            click: addNodeAndLink // define click behavior for this Button in the Adornment
          })
            .add( // the Button content
              new go.TextBlock('+', { font: 'bold 8pt sans-serif' })
            )
        );
  
      // the context menu allows users to change the font size and weight,
      // and to perform a limited tree layout starting at that node
      myDiagram.nodeTemplate.contextMenu = go.GraphObject.build('ContextMenu')
        .add(
          go.GraphObject.build('ContextMenuButton')
            .add(
              new go.TextBlock('Bigger', { click: (e, obj) => changeTextSize(obj, 1.1) })
            ),
          go.GraphObject.build('ContextMenuButton')
            .add(
              new go.TextBlock('Smaller', { click: (e, obj) => changeTextSize(obj, 1 / 1.1) })
            ),
          go.GraphObject.build('ContextMenuButton')
            .add(
              new go.TextBlock('Bold/Normal', { click: (e, obj) => toggleTextWeight(obj) })
            ),
          go.GraphObject.build('ContextMenuButton')
            .add(
              new go.TextBlock('Copy', { click: (e, obj) => e.diagram.commandHandler.copySelection() })
            ),
          go.GraphObject.build('ContextMenuButton')
            .add(
              new go.TextBlock('Delete', { click: (e, obj) => e.diagram.commandHandler.deleteSelection() })
            ),
          go.GraphObject.build('ContextMenuButton')
            .add(
              new go.TextBlock('Undo', { click: (e, obj) => e.diagram.commandHandler.undo() })
            ),
          go.GraphObject.build('ContextMenuButton')
            .add(
              new go.TextBlock('Redo', { click: (e, obj) => e.diagram.commandHandler.redo() })
            ),
          go.GraphObject.build('ContextMenuButton')
            .add(
              new go.TextBlock('Layout', {
                click: (e, obj) => {
                  var adorn = obj.part;
                  adorn.diagram.startTransaction('Subtree Layout');
                  layoutTree(adorn.adornedPart);
                  adorn.diagram.commitTransaction('Subtree Layout');
                }
              })
            )
        );
  
      // a link is just a Bezier-curved line of the same color as the node to which it is connected
      myDiagram.linkTemplate = new go.Link({
        curve: go.Curve.Bezier,
        fromShortLength: -2,
        toShortLength: -2,
        selectable: false
      })
        .add(
          new go.Shape({ strokeWidth: 3 })
            .bindObject('stroke', 'toNode', (n) => {
              if (n.data.brush) return n.data.brush;
              return 'black';
            })
        );
  
      // the Diagram's context menu just displays commands for general functionality
      myDiagram.contextMenu = go.GraphObject.build('ContextMenu')
        .add(
          go.GraphObject.build('ContextMenuButton', {
              click: (e, obj) => e.diagram.commandHandler.pasteSelection(e.diagram.toolManager.contextMenuTool.mouseDownPoint)
            })
            .bindObject('visible', '',
              (o) => {
                return o.diagram && o.diagram.commandHandler.canPasteSelection(o.diagram.toolManager.contextMenuTool.mouseDownPoint)
              }
            )
            .add(
              new go.TextBlock('Paste')
            ),
          go.GraphObject.build('ContextMenuButton', {
              click: (e, obj) => e.diagram.commandHandler.undo()
            })
            .bindObject('visible', '', (o) => o.diagram && o.diagram.commandHandler.canUndo())
            .add(
              new go.TextBlock('Undo')
            ),
          go.GraphObject.build('ContextMenuButton', {
              click: (e, obj) => e.diagram.commandHandler.redo()
            })
            .bindObject('visible', '', (o) => o.diagram && o.diagram.commandHandler.canRedo())
            .add(
              new go.TextBlock('Redo')
            ),
          go.GraphObject.build('ContextMenuButton')
            .add(
              new go.TextBlock('Save', { click: (e, obj) => save() })
            ),
          go.GraphObject.build('ContextMenuButton')
            .add(
              new go.TextBlock('Load', { click: (e, obj) => load() })
            )
        );
  
      myDiagram.addDiagramListener('SelectionMoved', (e) => {
        var rootX = myDiagram.findNodeForKey(0).location.x;
        myDiagram.selection.each((node) => {
          if (node.data.parent !== 0) return; // Only consider nodes connected to the root
          var nodeX = node.location.x;
          if (rootX < nodeX && node.data.dir !== 'right') {
            updateNodeDirection(node, 'right');
          } else if (rootX > nodeX && node.data.dir !== 'left') {
            updateNodeDirection(node, 'left');
          }
          layoutTree(node);
        });
      });
  
      myDiagram.model = new go.TreeModel(gojs_model);
    }
  
    function spotConverter(dir, from) {
      if (dir === 'left') {
        return from ? go.Spot.Left : go.Spot.Right;
      } else {
        return from ? go.Spot.Right : go.Spot.Left;
      }
    }
  
    function changeTextSize(obj, factor) {
      var adorn = obj.part;
      adorn.diagram.startTransaction('Change Text Size');
      var node = adorn.adornedPart;
      var tb = node.findObject('TEXT');
      tb.scale *= factor;
      adorn.diagram.commitTransaction('Change Text Size');
    }
  
    function toggleTextWeight(obj) {
      var adorn = obj.part;
      adorn.diagram.startTransaction('Change Text Weight');
      var node = adorn.adornedPart;
      var tb = node.findObject('TEXT');
      // assume "bold" is at the start of the font specifier
      var idx = tb.font.indexOf('bold');
      if (idx < 0) {
        tb.font = 'bold ' + tb.font;
      } else {
        tb.font = tb.font.slice(idx + 5);
      }
      adorn.diagram.commitTransaction('Change Text Weight');
    }
  
    function updateNodeDirection(node, dir) {
      myDiagram.model.setDataProperty(node.data, 'dir', dir);
      // recursively update the direction of the child nodes
      var chl = node.findTreeChildrenNodes(); // gives us an iterator of the child nodes related to this particular node
      while (chl.next()) {
        updateNodeDirection(chl.value, dir);
      }
    }
  
    function addNodeAndLink(e, obj) {
      var adorn = obj.part;
      var diagram = adorn.diagram;
      diagram.startTransaction('Add Node');
      var oldnode = adorn.adornedPart;
      var olddata = oldnode.data;
      // copy the brush and direction to the new node data
      var newdata = { text: 'idea', brush: olddata.brush, dir: olddata.dir, parent: olddata.key };
      diagram.model.addNodeData(newdata);
      layoutTree(oldnode);
      diagram.commitTransaction('Add Node');
  
      // if the new node is off-screen, scroll the diagram to show the new node
      var newnode = diagram.findNodeForData(newdata);
      if (newnode !== null) diagram.scrollToRect(newnode.actualBounds);
    }
  
    function layoutTree(node) {
      if (node.isTreeRoot) {  // is this a root node?
        // adding to the root?
        layoutAll(); // lay out everything
      } else {
        // otherwise lay out only the subtree starting at this parent node
        var parts = node.findTreeParts();
        layoutAngle(parts, node.data.dir === 'left' ? 180 : 0);
      }
    }
  
    function layoutAngle(parts, angle) {
      var layout = new go.TreeLayout({
        angle: angle,
        arrangement: go.TreeArrangement.FixedRoots,
        nodeSpacing: 5,
        layerSpacing: 20,
        setsPortSpot: false, // don't set port spots since we're managing them with our spotConverter function
        setsChildPortSpot: false
      });
      layout.doLayout(parts);
    }
  
    function layoutAll() {
      var root = myDiagram.findTreeRoots().first();
      if (root === null) return;
      myDiagram.startTransaction('Layout');
      // split the nodes and links into two collections
      var rightward = new go.Set(/*go.Part*/);
      var leftward = new go.Set(/*go.Part*/);
      root.findLinksConnected().each((link) => {
        var child = link.toNode;
        if (child.data.dir === 'left') {
          leftward.add(root); // the root node is in both collections
          leftward.add(link);
          leftward.addAll(child.findTreeParts());
        } else {
          rightward.add(root); // the root node is in both collections
          rightward.add(link);
          rightward.addAll(child.findTreeParts());
        }
      });
      // do one layout and then the other without moving the shared root node
      layoutAngle(rightward, 0);
      layoutAngle(leftward, 180);
      myDiagram.commitTransaction('Layout');
    }
  
    // Show the diagram's model in JSON format
    function save() {
      document.getElementById('mySavedModel').value = myDiagram.model.toJson();
      myDiagram.isModified = false;
    }
  
    function load() {
      myDiagram.model = go.Model.fromJson(document.getElementById('mySavedModel').value);
      // if any nodes don't have locations assigned from the model, force a layout of everything
      if (myDiagram.nodes.any(n => !n.location.isReal())) layoutAll();
    }
    
    init();
  }
  

  // Function to initialize the third view
  function initializeThirdView(gojs_model) {
    function init() {
    var $ = go.GraphObject.make;  // for conciseness in defining templates
    var nodeDataArray = gojs_model;

    // Create the Diagram
    var diagram = $(go.Diagram, "mind", {
      layout: $(go.TreeLayout, { angle: 90, layerSpacing: 35 })
    });

    // Define the Node template
    diagram.nodeTemplate =
      $(go.Node, "Auto",
        {
          click: function (e, obj) {
            const nodeData = obj.part.data;
            generate_subtopic_window(nodeData.name, obj);
            console.log(nodeData);
            
            handling_summ_req(nodeData.paragraph, appUrl);
          }
        },
        $(go.Shape, "RoundedRectangle", { strokeWidth: 0 },
          new go.Binding("fill", "color")),
        $(go.TextBlock, { margin: 8, font: "bold 12px sans-serif" },
          new go.Binding("text", "name"))
      );

    // Define the Link template
    diagram.linkTemplate =
      $(go.Link,
        $(go.Shape));

    // Create the model using the node data array
    diagram.model = new go.TreeModel(nodeDataArray);

    // Function to get a random color
    function getRandomColor() {
      return colors[Math.floor(Math.random() * colors.length)];
    }
  }
  init();
  }


  // Function to clear the diagram
  function clearDiagram(divId) {
    let diagram = go.Diagram.fromDiv(divId);
    if (diagram) {
        diagram.div = null;
    }
}

  // Function to format the data for the first view
  function firstViewFormat(data) {
    let gojs_model = [];
    let title = data["mainTitle"];
    let title_key = "1";
    gojs_model.push({ "key": title_key, "name": title });

    const colors = ["#f1916d", "#473e66", "#bd83b8", "#f5d7db"];
    data["subtitles"].forEach((subtitle, idx) => {
      let subtitle_key = (idx + 2).toString();
      gojs_model.push({
        "key": subtitle_key,
        "parent": title_key,
        "name": subtitle["subtitle"],
        "color": colors[idx % colors.length],
        "paragraph": subtitle["paragraphs"].join(""),
      });
    });

    return gojs_model;
  }


  // Function to apply the first view
  function applyFirstView() {
    clearDiagram("mind");
    let gojs_model = firstViewFormat(output);
    initializeFirstView(gojs_model);
  }

  // Function to format the data for the second view
  function secondViewFormat(data) {
    let gojs_model = [];
    let main_title = data["mainTitle"];
    let subtitles = data["subtitles"];

    // Predefined list of colors
    let colors = ["skyblue", "darkseagreen", "palevioletred", "coral", "gold", "lightgreen", "lightsalmon"];

    gojs_model = [{"key": 0, "text": main_title, "loc": "0 0"}];
    
    // The radius of the circle around the main title
    let radius = 200;
    // Equal angle spacing between nodes
    let angle_step = 360 / subtitles.length;
    // Increase horizontal margin  
    let horizontal_offset = 200;

    let key = 1;
    for (let index = 0; index < subtitles.length; index++) {
        const angle = (index * angle_step) * (Math.PI / 180);
        const x = (radius + horizontal_offset) * Math.cos(angle);
        const y = radius * Math.sin(angle);
        const color = colors[Math.floor(Math.random() * colors.length)];
        gojs_model.push({
            "key": key,
            "parent": 0,
            "name": subtitles[index]["subtitle"],
            "brush": color,
            "loc": `${x} ${y}`,
            "paragraph": subtitles[index]["paragraphs"].join("")
        });
        key += 1;
    }
    return gojs_model;
}


// Function to apply the second view
  function applySecondView() {
    clearDiagram("mind");
    let gojs_model = secondViewFormat(output);
    initializeSecondView(gojs_model);
}

  // Function to format the data for the third view
  function thirdViewFormat(data) {
    let gojs_model = [];
    let main_title = data["mainTitle"]
    let subtitles = data["subtitles"]
    //  Predefined list of colors
    let colors =  ["skyblue", "darkseagreen", "palevioletred", "coral", "gold", "lightgreen", "lightsalmon"]
    gojs_model = [{"key": 1, "name": main_title , "color": "lightblue"}]
    let key = 2
    subtitles.forEach((subtitle, index) => {
      const color = colors[Math.floor(Math.random() * colors.length)];
      gojs_model.push({
        "key": key,
        "parent": 1,
        "name": subtitle["subtitle"],
        "color": color,
        "paragraph": subtitle["paragraphs"].join("")
      });
      key += 1;
    });
    return gojs_model; 
}

  // Function to apply the third view
  function applyThirdView() {
    clearDiagram("mind");
    let gojs_model = thirdViewFormat(output);
    initializeThirdView(gojs_model);
  }
  
  
  // Add event listeners to the buttons
  window.onload=function(){
    document.getElementById('firstView').addEventListener('click', () => {
        applyFirstView();
    });
  
    document.getElementById('secondView').addEventListener('click', () => {
        applySecondView();
    });
  
    document.getElementById('thirdView').addEventListener('click', () => {
        applyThirdView();
    });
  
  }