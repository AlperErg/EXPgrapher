
var graphTitle = "My Graph";
var graphXAxis = "X-Axis";
var graphXAxisUnits = "units";
var graphYAxis = "Y-Axis";
var graphYAxisUnits = "units";
var graphXSymbol = "x";
var graphYSymbol = "y";
var trendlineData = [];
var incommingData = false; //a flag to set when data has been imported (ie, from URL)
var scaleData = {};
var incommingScaleData = false; //a flag for when there is user-defined scaling to apply


//adapted from: https://6pac.github.io/SlickGrid/examples/example-excel-compatible-spreadsheet.html
//also required: comment out this line from init in slick.cellexternalcopymanager.js
/*cellSelectionModel.onSelectedRangesChanged.subscribe(function(e, args){
        _grid.focus();
      });
      */ 

var resizer;
var grid;
var data = [];

var commandQueue = [];
var commandCtr = 0;



//undo/redo stuff
//TODO: include graph title, axis title, and trendline shifts in the undo/redo buffer
function queueAndExecuteCommand(item, column, editCommand) {
	commandQueue[commandCtr] = editCommand;
	commandCtr++;
	editCommand.execute();
}

var undoRedoBuffer = {


	queueAndExecuteCommand : function(editCommand) {
		commandQueue[commandCtr] = editCommand;
		commandCtr++;
		editCommand.execute();
	},

	undo : function() {
		if (commandCtr == 0) { return; }

		commandCtr--;
		var command = commandQueue[commandCtr];

		if (command && Slick.GlobalEditorLock.cancelCurrentEdit()) {
			command.undo();
		}
	},
	redo : function() {
		if (commandCtr >= commandQueue.length) { return; }
		var command = commandQueue[commandCtr];
		commandCtr++;
		if (command && Slick.GlobalEditorLock.cancelCurrentEdit()) {
			command.execute();
		}
	}
};

// undo shortcut
$(document).keydown(function(e)
{
	if (e.which == 90 && (e.ctrlKey || e.metaKey)) {    // CTRL + (shift) + Z
		if (e.shiftKey){
			undoRedoBuffer.redo();
		} else {
			undoRedoBuffer.undo();
		}
	} else if (e.which == 8 || e.which == 46) {
		//delete selection
		var selectedRange = grid.getSelectionModel().getSelectedRanges()[0];
		//only delete if a range of cells is selected. this is to keep from wiping datat that the user is currently typing, but backspaces
		if (selectedRange != null) {
			if (selectedRange.fromRow != selectedRange.toRow || selectedRange.fromCell != selectedRange.toCell) {
				for (var rowToDelete = selectedRange.fromRow; rowToDelete <= selectedRange.toRow; rowToDelete++){
					for (var cellToDelete = selectedRange.fromCell; cellToDelete <= selectedRange.toCell; cellToDelete++) {
						//if the deleted cell is the uncertainty term of a filled datum, replace with 0, rather than null
						var emptyValue = null;
						if (cellToDelete == 1 || cellToDelete == 3) {
							if (data[rowToDelete][window.grid.getColumns()[cellToDelete-1]["name"]] != null) {
								emptyValue = "0";
							}
						}
						data[rowToDelete][window.grid.getColumns()[cellToDelete]["name"]] = emptyValue;
					}
				}
				grid.invalidateAllRows();
				grid.render();  
      

				//redraw graph
				window.drawGraph();
				//re-generate feedback;
				window.evaluate(); 
      
			}   
		}
	}
});

var newRowIds = 0;

var pluginOptions = {
	clipboardCommandHandler: function(editCommand){ undoRedoBuffer.queueAndExecuteCommand.call(undoRedoBuffer,editCommand); },
	readOnlyMode : false,
	includeHeaderWhenCopying : false,
	newRowCreator: function(count) {
		for (var i = 0; i < count; i++) {
			var item = {
				id: "newRow_" + newRowIds++
			};
			grid.getData().addItem(item);
		}
	}
};



var columns = [
	{id: "XData", name: "X Data", field: "X Data", width: 120, cssClass: "cell-title", editor: Slick.Editors.Text},
	{id: "XUncertainty", name: "X Uncertainty", field: "X Uncertainty", width: 120, cssClass: "cell-title", editor: Slick.Editors.Text},
	{id: "YData", name: "Y Data", field: "Y Data", width: 120, cssClass: "cell-title", editor: Slick.Editors.Text},
	{id: "YUncertainty", name: "Y Uncertainty", field: "Y Uncertainty", width: 120, cssClass: "cell-title", editor: Slick.Editors.Text},
];

var options = {
	editable: true,
	enableAddRow: true,
	enableCellNavigation: true,
	asyncEditorLoading: false,
	autoEdit: true, //required to keep selection viable
	editCommandHandler: queueAndExecuteCommand,
	forceFitColumns: true,

	enableColumnReorder: false
  
};

function toNumber(n) {
	//check for null and empty string
	if (n == null || n == "") {
		return {validNumber: false, operand: 0, base: 10, power: 0, entry: n, percentage: false, failMsg: "(Failure toNumber code 11) nothing to compute: \"" + n + "\""};
	}
	n = String(n).replace(/\s/g,""); //remove all whitespace. treat as string.
	var operand = "";
	var base = "";
	var power = "";
    
	//check for a percentage    
	var percentage = false;
	if ((new RegExp("[%]").test(n))) {
		//has a percent sign. is in the right place?
		if (n[n.length - 1] == "%") {
			percentage = true;
			//truncate the percent sign
			n = n.substring(0, n.length -1);
		} else {
			//the percent sign is in the wrong place. abort
			return {validNumber: false, operand: 1, base: 10, power: 0, entry: n, percentage: percentage, failMsg: "(Failure toNumber code 12) the entry contains a '%' sign, but is not expressed as a percentage, ie: 12%: " + n[digit]};
		}
	}
    
	//check for sign or a digit, or decimal at start
	if ((new RegExp("[+-.0-9]").test(n[0]))){
		if (n[0] != "+") {
			operand += n[0];
		}
		var digit = 1;
		while (digit < n.length && !(new RegExp("[eExX*]")).test(n[digit])){
			if ((new RegExp("[.0-9]")).test(n[digit])){
				operand += n[digit];
			} else if ((new RegExp("[,]")).test(n[digit])) {
				//do nothing
			} else {
				//not valid entry
				return {validNumber: false, operand: 1, base: 10, power: 0, entry: n, percentage: percentage, failMsg: "(Failure toNumber code 1) the entry contains a character that is not recognised as part of a number: " + n[digit]};
			}
			digit++;
		}
		//check for base
		if (digit >= n.length) {
			//there is no scientific notation
			base = 10;
		} else if ((new RegExp("[eE]")).test(n[digit])){
			base = 10;
			digit++;
		} else if (digit < n.length && (new RegExp("[xX*]")).test(n[digit])){
			digit++;
			//read the base
			if (n[digit]=="-") {
				return {validNumber: false, operand: 1, base: 10, power: 0, entry: n, percentage: percentage, failMsg: "(Failure toNumber code 10) the base of the exponent is not allowed to be negative: " + n};
			}
			while (digit < n.length && n[digit]!="^" && !(new RegExp("[eE]")).test(n[digit])){
				if ((new RegExp("[.0-9]")).test(n[digit])){
					base += n[digit];
				} else if ((new RegExp("[,]")).test(n[digit])) {
					//do nothing
				} else {
					//not valid entry
					return {validNumber: false, operand: 1, base: 10, power: 0, entry: n, percentage: percentage, failMsg: "(Failure toNumber code 2) the base contains a character that is not recognised as part of a number: " + n[digit]};
				}
				digit++;
			} 
			//check for power
			if (base.length == 0) { 
				return {validNumber: false, operand: 1, base: 10, power: 0, entry: n, percentage: percentage, failMsg:"(Failure toNumber code 3) the entry is in scientific notation form, but does not contain a base"};
			} else if (digit < n.length) {
				if (n[digit]=="^" || (new RegExp("[eE]")).test(n[digit])){
					digit++;  
				} else {
					//assume base ^ 0
					power = 0;
				}
			} else {
				//assume base^0
				power = 0;
			}
		}else {
			return {validNumber: false, operand: 1, base: 10, power: 0, entry: n, percentage: percentage, failMsg:"(Failure toNumber code 4) the entry contains a character that is not recognised as part of a number: " + n[digit]};
		}
		//check for power
		if (digit >= n.length) {
			power = 0;
		} else if ((new RegExp("[+-.0-9\(\)]")).test(n[digit])){
			if (n[digit] != "+" && n[digit] != "(" && n[digit] != ")") {
				power += n[digit];
			}
			digit++;
		} else {
			return {validNumber: false, operand: 1, base: 10, power: 0, entry: n, percentage: percentage, failMsg:"(Failure toNumber code 5) the power contains a character that is not recognised as part of a number: " + n[digit]};
		}
		while (digit < n.length){
			if ((new RegExp("[-.0-9]")).test(n[digit])){
				power += n[digit];
			} else if ((new RegExp("[,\(\)]")).test(n[digit])) {
				//do nothing
			} else {
				//not valid entry
				return {validNumber: false, operand: 1, base: 10, power: 0, entry: n, percentage: percentage, failMsg: "(Failure toNumber code 6) the exponent contains a character that is not recognised as part of a number: " + n[digit]};
			}
			digit++;
		}
		if (isNaN(operand)) {
			return {validNumber: false, operand: 1, base: 10, power: 0, entry: n, percentage: percentage, failMsg: "(Failure toNumber code 7) the entry cannot be interpreted as a number: " + operand};
		} else if (isNaN(base)) {
			return {validNumber: false, operand: 1, base: 10, power: 0, entry: n, percentage: percentage, failMsg: "(Failure toNumber code 8) the base cannot be interpreted as a number: " + base};
		} else if (isNaN(power)) {
			return {validNumber: false, operand: 1, base: 10, power: 0, entry: n, percentage: percentage, failMsg: "(Failure toNumber code 9) the exponent cannot be interpreted as a number: " + power};
		}

		//it's a valid number!
		if (base != 10) {
			//bases other than 10 are not supported, convert to decimal base 10
			return {validNumber: true, operand: operand * Math.pow(base, power), base: 10, power: 0, entry: n, percentage: percentage, failMsg: null};
		}
		return {validNumber: true, operand: operand, base: base, power: power, entry: n, percentage: percentage, failMsg: null};
	}
	else {
		return {validNumber: false, operand: 1, base: 10, power: 0, entry: n, percentage: percentage, failMsg:"(Failure toNumber code 10) the entry contains a character that is not recognised as part of a number: " + n[digit]};
	}
}

$(function () {
	//try to get data from the URL
	var url = new URL(window.location.href);
	var dataLength = url.searchParams.get("dataLength");

	//fill in data from the URL if it exists
	if (dataLength != null) {
		var pasteRow = 0;
		for (pasteRow = 0; pasteRow < dataLength; pasteRow++) {
			var d = (data[pasteRow] = {});

			d["X Data"] = String(url.searchParams.get("x"+pasteRow));
			d["X Uncertainty"] = String(url.searchParams.get("dx"+pasteRow));
			d["Y Data"] = String(url.searchParams.get("y"+pasteRow));
			d["Y Uncertainty"] = String(url.searchParams.get("dy"+pasteRow));
		}
		//fill in the remaining blank rows
		for (;pasteRow < 50; pasteRow++) {
			var d = (data[pasteRow] = {});
		}

	} else {
		//otherwise, fill in sample data
		for (var i = 0; i < 50; i++) {
			var d = (data[i] = {});


			//otherwise, fill in sample data
			if (i < 5) {

				d["X Data"] = String(10*(i+1)) + ".";
				d["X Uncertainty"] = String(i+1);
				d["Y Data"] = String(30*(i+1));
				d["Y Uncertainty"] = String(10);
			}
		}
	}
	//get the labels, if they exist
	if (url.searchParams.get("graphTitle") != null) {
		graphTitle = url.searchParams.get("graphTitle");
	}
	if (url.searchParams.get("graphXAxis") != null) {
		graphXAxis = url.searchParams.get("graphXAxis");
	}
	if (url.searchParams.get("graphYAxis") != null) {
		graphYAxis = url.searchParams.get("graphYAxis");
	}
	if (url.searchParams.get("graphXAxisUnits") != null) {
		graphXAxisUnits = url.searchParams.get("graphXAxisUnits");
	}
	if (url.searchParams.get("graphYAxisUnits") != null) {
		graphYAxisUnits = url.searchParams.get("graphYAxisUnits");
	}
	if (url.searchParams.get("graphXSymbol") != null) {
		graphXSymbol = url.searchParams.get("graphXSymbol");
	}
	if (url.searchParams.get("graphYSymbol") != null) {
		graphYSymbol = url.searchParams.get("graphYSymbol");
	}
    
	//grab the trendlines:
	trendlineData=[];
	trendlineData.push({data: [{x:0, y:0},{x:0, y:0}]});
	trendlineData.push({data: [{x:0, y:0},{x:0, y:0}]});
	trendlineData.push({data: [{x:0, y:0},{x:0, y:0}]});
	for (var lineOrder = 1; lineOrder <= 3; lineOrder++) {
		if (url.searchParams.get("line"+lineOrder+"data0x")!=null) {
			incommingData = true;
			trendlineData[lineOrder-1].data[0].x = url.searchParams.get("line"+lineOrder+"data0x");
		}
		if (url.searchParams.get("line"+lineOrder+"data0y")!=null) {
			incommingData = true;
			trendlineData[lineOrder-1].data[0].y = url.searchParams.get("line"+lineOrder+"data0y");
		}
		if (url.searchParams.get("line"+lineOrder+"data1x")!=null) {
			incommingData = true;
			trendlineData[lineOrder-1].data[1].x = url.searchParams.get("line"+lineOrder+"data1x");
		}
		if (url.searchParams.get("line"+lineOrder+"data1y")!=null) {
			incommingData = true;
			trendlineData[lineOrder-1].data[1].y = url.searchParams.get("line"+lineOrder+"data1y");
		}
	}
    
	grid = new Slick.Grid("#myGrid", data, columns, options);

	//event handler adapted from: https://github.com/mleibman/SlickGrid/blob/gh-pages/examples/example7-events.html
	//and here: https://stackoverflow.com/questions/6253320/validation-on-oncellchange-with-slickgrid
	//and here: https://stackoverflow.com/questions/17644478/resetting-slickgrid-for-new-data#17723454
    
	grid.onCellChange.subscribe(function (e, args) {
		//data validation
		//TODO: remove negative uncertianties
		//get the data and its location
		const xData = window.grid.getColumns()[0]["name"];
		const xUnc = window.grid.getColumns()[1]["name"];
		const yData = window.grid.getColumns()[2]["name"];
		const yUnc = window.grid.getColumns()[3]["name"];
		var row = args.row;
		var col = args.cell;
		var dataToValidate = toNumber(data[row][window.grid.getColumns()[col]["name"]]);
        
		//check for percentages. they are only allowed in the uncertainty columns
		if (dataToValidate.percentage == true && col % 2 == 0) {
			//percentages don't belong in this column. remove the percentage property
			dataToValidate.percentage = false;
		}
        
		if (dataToValidate.validNumber == false) {
			console.log(dataToValidate.failMsg);
			//if the new entry is not a number, wipe it, unless it is an uncertainty term of of a filled in datum
			if (col == 1 || col == 3) {
				if (data[row][window.grid.getColumns()[col-1]["name"]] != null) {
					//if there is a measurement associated with this uncertainty, then set the uncertianty to 0
					data[row][window.grid.getColumns()[col]["name"]] = "0";
				} else {
					//otherwise, just wipe the cell
					data[row][window.grid.getColumns()[col]["name"]] = null;
				}
			} else {
				//if the non-number is a measurement, wipe the cell
				data[row][window.grid.getColumns()[col]["name"]] = null;
			}
			grid.invalidateAllRows();
			grid.render();        
		} else {
			//otherwise, format it

			//if this measurment's power is null, make it zero
			if (col == 0 || col == 2) {
				if (data[row][window.grid.getColumns()[col+1]["name"]] == null) {
					data[row][window.grid.getColumns()[col+1]["name"]] = "0";
				}
			}

			//if the uncertainty is negative, make it positive
			if (col == 1 || col == 3) {       
				if (dataToValidate.operand < 0) {
					dataToValidate.operand = Math.abs(dataToValidate.operand);
				}
			}
			//for power == 0, present as a decimal number
			if (dataToValidate.power == 0) {
				data[row][window.grid.getColumns()[col]["name"]] = dataToValidate.operand + (dataToValidate.percentage==true?"%":"");
				grid.invalidateAllRows();
				grid.render();
			} else {
				//otherwise, present in scientific notation
				data[row][window.grid.getColumns()[col]["name"]] = dataToValidate.operand+"x"+dataToValidate.base+"^"+dataToValidate.power + (dataToValidate.percentage==true?"%":"");
				grid.invalidateAllRows();
				grid.render();
			}
		}


		/* console.log("number:");
      console.log(toNumber(dataToValidate));

      if (isNaN(dataToValidate) || dataToValidate == "") {
        //if the new entry is not a number, wipe it
        data[row][window.grid.getColumns()[col]["name"]] = null;
        grid.invalidateAllRows();
        grid.render();
      }
      */

		//redraw graph
		window.drawGraph();
        
		//re-generate feedback;
		window.evaluate();
	});

	//this de-selected cells when the focus is lost to re-enable drag-selection of the table
	grid.onMouseLeave.subscribe(function(e, args){
		if (grid.getActiveCell()) {
			var activeRow = grid.getActiveCell().row;
			var activeCell = grid.getActiveCell().cell;
			grid.gotoCell(activeRow, activeCell, false);
			//console.log(data[activeRow][window.grid.getColumns()[activeCell]["name"]]);
			grid.resetActiveCell();
			//grid.setSelectedRows([]);
			//grid.invalidateAllRows();
			//grid.setSelectionModel(new Slick.CellSelectionModel());
			//grid.setSelectedRows([]);
			//grid.render();  
		}
	});

	//from: https://github.com/6pac/SlickGrid/blob/master/examples/example15-auto-resize.html
	// create the Resizer plugin
	// you need to provide a DOM element container for the plugin to calculate available space
	resizer = new Slick.Plugins.Resizer({
		container: "#myGrid", // DOM element selector, can be an ID or a class

		// optionally define some padding and dimensions
		rightPadding: 0,    // defaults to 0
		bottomPadding: 20,  // defaults to 20
		minHeight: 150,     // defaults to 180
		minWidth: 300,      // defaults to 300

		// you can also add some max values (none by default)
		// maxHeight: 1000
		//Resize table from here, with maxHeight
		maxWidth: 300,
		maxHeight: 400,
	}
		// the 2nd argument is an object and is optional
		// you could pass fixed dimensions, you can pass both height/width or a single dimension (passing both would obviously disable the auto-resize completely)
		// for example if we pass only the height (as shown below), it will use a fixed height but will auto-resize only the width
		// { height: 300 }
	);
	grid.registerPlugin(resizer);

	grid.setSelectionModel(new Slick.CellSelectionModel());
	grid.registerPlugin(new Slick.AutoTooltips());

	// set keyboard focus on the grid
	grid.getCanvasNode().focus();

	grid.registerPlugin(new Slick.CellExternalCopyManager(pluginOptions));

	grid.onAddNewRow.subscribe(function (e, args) {
		var item = args.item;
		var column = args.column;
		grid.invalidateRow(data.length);
		data.push(item);
		grid.updateRowCount();
		grid.render();
	});
    
    
});