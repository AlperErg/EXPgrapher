

var graphCanvas = document.getElementById("graphCanvas");
var ctx = graphCanvas.getContext("2d");
ctx.translate(0.5, 0.5);
window.scatterChart = null;

var xMax = null;
var xMin = null;
var xStep = null;
var yMax = null;
var yMin = null;
var yStep = null;
var dataToGraph = [];
var uncToGraph = [];
var allData = [];

var xPixelBuffer = null;
var yPixelBuffer = null;
var xUnit2Pixel = null;
var yUnit2Pixel = null;

var xMajorGrid = 10; //just defaults
var xMinorGrid = 2;
var yMajorGrid = 10;
var yMinorGrid = 2;

var xSigFigs = 1; //how many significant figures are present in the data. Calculated in the drawGraph() method, then constant until another table update is made
var ySigFigs = 1;
var graphSettingsLiveTimer = null;

let last = +new Date(); //part of the timer for the line drag function
var editLine = null; //this is to keep track of any lines that the user is dragging

var graphDrawFramePending = false;
var graphAndFeedbackFramePending = false;

function onNextFrame(callback) {
	if (typeof window.requestAnimationFrame === "function") {
		window.requestAnimationFrame(callback);
	} else {
		setTimeout(callback, 16);
	}
}

function scheduleGraphDraw() {
	if (graphDrawFramePending) {
		return;
	}
	graphDrawFramePending = true;
	onNextFrame(function() {
		graphDrawFramePending = false;
		drawGraph();
	});
}

function scheduleGraphAndFeedbackUpdate() {
	if (graphAndFeedbackFramePending) {
		return;
	}
	graphAndFeedbackFramePending = true;
	onNextFrame(function() {
		graphAndFeedbackFramePending = false;
		drawGraph();
		if (typeof window.evaluate === "function") {
			window.evaluate();
		}
	});
}

window.scheduleGraphDraw = scheduleGraphDraw;
window.scheduleGraphAndFeedbackUpdate = scheduleGraphAndFeedbackUpdate;

(function() {
	var graphCanvas = document.getElementById("graphCanvas");

	// resize the canvas to fill browser window dynamically
	window.addEventListener("resize", resizeCanvas, false);

	function resizeCanvas() {       
		/**
         * Your drawings need to be inside this function otherwise they will be reset when 
         * you resize the browser window and the canvas goes will be cleared.
         */
		scheduleGraphDraw(); 
	}
	resizeCanvas();

    
})();

function drawGraph() {
	// Grid is initialized asynchronously in table.js on document ready.
	if (!window.grid || typeof window.grid.getColumns !== "function") {
		return;
	}

	//wipe the old graph
	if (window.scatterChart != null) {
		this.scatterChart.destroy();
		dataToGraph = [];
		uncToGraph = [];
		allData = [];
	}
    
	//get the field names
	var xData = window.grid.getColumns()[0]["field"];
	var xUnc = window.grid.getColumns()[1]["field"];
	var yData = window.grid.getColumns()[2]["field"];
	var yUnc = window.grid.getColumns()[3]["field"];

	//get the domain and range
	//also format the data for chart.js
	xMax = xMin = yMax = yMin = null;

	for (var row = 0; row < window.grid.getDataLength(); row++) {
		var dataRow = window.grid.getDataItem(row);
		var xd, xu, yd, yu;
		if (dataRow[xData] != null) {
			xd = window.toNumber(dataRow[xData]);
			xd = Number(xd.operand * Math.pow(xd.base, xd.power));

			if (dataRow[xUnc] == null) { xu = 0; }
			else {
				xu = window.toNumber(dataRow[xUnc]);
				if (xu.percentage == true) {
					//convert from percentage to absolute
					xu = Number(xu.operand * Math.pow(xu.base, xu.power))*xd/100;
				} else {
					//xu is a regular number
					xu = Number(xu.operand * Math.pow(xu.base, xu.power));
				}
			}
            
			if (xMax == null) { xMax = xd + xu; }
			else if (xMax < xd + xu) { xMax = xd + xu; }

			if (xMin == null) { xMin = xd - xu; }
			else if (xMin > xd - xu) { xMin = xd - xu; }
		}
		if (dataRow[yData] != null) {
			yd = window.toNumber(dataRow[yData]);
			yd = Number(yd.operand * Math.pow(yd.base, yd.power));
            
			if (dataRow[yUnc] == null) { yu = 0; }
			else {
				yu = window.toNumber(dataRow[yUnc]);
				if (yu.percentage == true) {
					//convert from percentage to absolute
					yu = Number(yu.operand * Math.pow(yu.base, yu.power))*yd/100;
				} else {
					//xu is a regular number
					yu = Number(yu.operand * Math.pow(yu.base, yu.power));
				}
                
			}



			if (yMax == null) { yMax = yd + yu; }
			else if (yMax < yd + yu) { yMax = yd + yu; }

			if (yMin == null) { yMin = yd - yu; }
			else if (yMin > yd - yu) { yMin = yd - yu; }
            
		}
		if (dataRow[xData] != null && dataRow[yData] != null) {
			//add to the dataset
			dataToGraph.push({x: xd, y: yd});
			uncToGraph.push({x: xu, y: yu});
		}
	}


	//default if bad data
	if (xMax == null) {xMax = 10;}
	if (xMin == null) {xMin = 0;}
	if (yMax == null) {yMax = 10;}
	if (yMin == null) {yMin = 0;}

	//auto-determine origin
	if (xMin > 0 && Math.abs(xMax-xMin) > xMin) {xMin = 0;}
	else if (xMax < 0 && Math.abs(xMin-xMax) > Math.abs(xMax)) {xMax = 0;}
	if (yMin > 0 && Math.abs(yMax-yMin) > yMin) {yMin = 0;}
	else if (yMax < 0 && Math.abs(yMin-yMax) > Math.abs(yMax)) {yMax = 0;}
    
	//set the gridscale
	//beautify the scale with nice round numbers
	var xFactor = Math.max(Math.abs(xMax), Math.abs(xMin));
	xMajorGrid = Math.pow(10, Math.ceil(Math.log10(xFactor)));
	xMinorGrid = Math.min(xMajorGrid / 10, Math.pow(10, Math.ceil(Math.log10((xMax - xMin)/10)))/2);
	var yFactor = Math.max(Math.abs(yMax), Math.abs(yMin));
	yMajorGrid = Math.pow(10, Math.ceil(Math.log10(yFactor)));
	yMinorGrid = Math.min(yMajorGrid / 10, Math.pow(10, Math.ceil(Math.log10((yMax - yMin)/10)))/2);

	if (xMax % xMinorGrid != 0) {xMax = Math.ceil(xMax / xMinorGrid) * xMinorGrid;}
	if (xMin % xMinorGrid != 0) {xMin = Math.floor(xMin / xMinorGrid) * xMinorGrid;}
	if (yMax % yMinorGrid != 0) {yMax = Math.ceil(yMax / yMinorGrid) * yMinorGrid;}
	if (yMin % yMinorGrid != 0) {yMin = Math.floor(yMin / yMinorGrid) * yMinorGrid;}
	xStep = xMinorGrid;
	yStep = yMinorGrid;
	//apply the steps as a buffer to the grid
	xMax += xStep;
	xMin -= xStep;
	yMax += yStep;
	yMin -= yStep;
    
	//Set the pixel Scale
	xPixelBuffer = graphCanvas.width/10;
	yPixelBuffer = graphCanvas.height/10;
	var xPixelWidth = graphCanvas.width - 2*xPixelBuffer;
	var yPixelHeight = graphCanvas.height - 2*yPixelBuffer;
	xUnit2Pixel = xPixelWidth / Math.abs(xMax - xMin);
	yUnit2Pixel = yPixelHeight / Math.abs(yMax - yMin);

	//build the dataset for graphing
	//compute the significant figures (used for reporting trendlines)
	xSigFigs = 0;
	ySigFigs = 0;
	for (var dataIndex = 0; dataIndex < dataToGraph.length; dataIndex++) {
		xSigFigs += countSigFigs(dataToGraph[dataIndex].x);
		ySigFigs += countSigFigs(dataToGraph[dataIndex].y);
	}
	xSigFigs = Math.ceil(xSigFigs/dataToGraph.length);
	ySigFigs = Math.ceil(ySigFigs/dataToGraph.length);

	//add the raw data to the graph
	allData.push({label: "NAScatter Dataset", fill: false, showLine: false, data: dataToGraph});
	if (dataToGraph.length > 1) {
		//compute and push the linear regression of the data
		var sX = 0;
		var sY = 0;
		var sXY = 0;
		var sX2 = 0;
		for (var coord = 0; coord < dataToGraph.length; coord++)
		{
			sX += Number(dataToGraph[coord].x);
			sY += Number(dataToGraph[coord].y);
			sXY += Number(dataToGraph[coord].x) * Number(dataToGraph[coord].y);
			sX2 += Number(dataToGraph[coord].x) * Number(dataToGraph[coord].x);
		}
		//slope = (NÎ£XY - (Î£X)(Î£Y)) / (NÎ£X2 - (Î£X)2)
		var slope = (dataToGraph.length*sXY - sX*sY) / (dataToGraph.length*sX2 - sX*sX);
		//Intercept(a) = (Î£Y - b(Î£X)) / N
		var intercept = (sY - slope*sX) / dataToGraph.length;
		//compute and push the maximum and minimum trendline
		//initialize
		var maxSlope = slope;
		var maxIntercept = intercept;
		var maxFails = evaluateLine(maxSlope, maxIntercept);
		var minSlope = slope;
		var minIntercept = intercept;
		var minFails = evaluateLine(minSlope, minIntercept);

		for (var coord1 = 0; coord1 < dataToGraph.length - 1; coord1++) {
			for (var dX1 = -1;dX1 <= 1; dX1 += 2)
			{
				for (var dY1 = -1; dY1 <= 1; dY1 += 2){
					//test every corner of every point
					for (var coord2 = 1; coord2 < dataToGraph.length; coord2++) {
						for (var dX2 = -1;dX2 <= 1; dX2 += 2)
						{
							for (var dY2 = -1; dY2 <= 1; dY2 += 2){
								//against every other corner of all other data
								var newSlope = (((Number(dataToGraph[coord2].y) + dY2*Number(uncToGraph[coord2].y)) -
                                                 (Number(dataToGraph[coord1].y) + dY1*Number(uncToGraph[coord1].y)) ) /
                                                ((Number(dataToGraph[coord2].x) + dX2*Number(uncToGraph[coord2].x)) -
                                                 (Number(dataToGraph[coord1].x) + dX1*Number(uncToGraph[coord1].x))));
								var newIntercept = (Number(dataToGraph[coord1].y) + dY1*Number(uncToGraph[coord1].y)) -
                                                    newSlope * (Number(dataToGraph[coord1].x) + dX1*Number(uncToGraph[coord1].x));
                                
								//compare fails:
								var newFails = evaluateLine(newSlope, newIntercept);
								if (newFails.fails <= maxFails.fails && newSlope > maxSlope) {
									//this is a better max fit
									maxSlope = newSlope;
									maxIntercept = newIntercept;
									maxFails = newFails;
								}
								if (newFails.fails <= minFails.fails && newSlope < minSlope) {
									//this is a better min fit
									minSlope = newSlope;
									minIntercept = newIntercept;
									minFails = newFails;
								}
							}                        
						}
					}
				}
			}
		}
		allData.push({label:"Linear Regression:  "+graphYSymbol+" = " + Number.parseFloat(slope).toPrecision(Math.max(xSigFigs,ySigFigs)) + graphXSymbol+" + " + Number.parseFloat(intercept).toPrecision(Math.max(xSigFigs,ySigFigs)), data: [{x:xMin, y: slope*xMin+intercept},{x: xMax, y: slope*xMax + intercept}], fill: false, radius: 0, borderColor: "rgba(0,0,0,255)", borderWidth: 1, userMade: false});
		allData.push({label:"Maximum Linear Fit:  "+graphYSymbol+" = " + Number.parseFloat(maxSlope).toPrecision(Math.max(xSigFigs,ySigFigs)) + graphXSymbol+" + " + Number.parseFloat(maxIntercept).toPrecision(Math.max(xSigFigs,ySigFigs)),data: [{x:xMin, y: maxSlope*xMin+maxIntercept},{x: xMax, y: maxSlope*xMax + maxIntercept}], fill: false, radius: 0, borderColor: "rgba(255,100,100,255)", borderWidth: 1, userMade: false});
		allData.push({label:"Minimum Linear Fit:  "+graphYSymbol+" = " + Number.parseFloat(minSlope).toPrecision(Math.max(xSigFigs,ySigFigs)) + graphXSymbol+" + " + Number.parseFloat(minIntercept).toPrecision(Math.max(xSigFigs,ySigFigs)),data: [{x:xMin, y: minSlope*xMin+minIntercept},{x: xMax, y: minSlope*xMax + minIntercept}], fill: false, radius: 0, borderColor: "rgba(100,100,255,255)", borderWidth: 1, userMade: false});
    
		//overwrite with incomming data if it exists:
		if (incommingData == true) {
			incommingData = false;
			//edit the trendlines:
			for (var lineOrder = 1; lineOrder <= 3; lineOrder++) {
				var line = allData[lineOrder];//allData[1] is the trendline, 2 and 3 are the max and min lines
				line.data = trendlineData[lineOrder-1].data;
			}
		}
        
		//overwrite with user-defined graph scale details if present
		if (incommingScaleData == true) {
			incommingScaleData = false;
			xMax = Number(scaleData.xMax);   
			xMin = Number(scaleData.xMin);   
			xStep = Number(scaleData.xStep);   
			yMax = Number(scaleData.yMax);   
			yMin = Number(scaleData.yMin);   
			yStep = Number(scaleData.yStep);   

		}
	}
	//compute and push all error bars
	//notch sizes
	var xNotch = (xMax - xMin)/100;
	var yNotch = (yMax - yMin)/50;
	for (var coordi = 0; coordi < dataToGraph.length; coordi++) {
		//v bar, vtop, vbottom, h bar, h left, h right
		allData.push({label: "NAV" + coordi, data: [{x:Number(dataToGraph[coordi].x), y: Number(dataToGraph[coordi].y) - Number(uncToGraph[coordi].y)},{x:Number(dataToGraph[coordi].x), y: Number(dataToGraph[coordi].y) + Number(uncToGraph[coordi].y)}], fill: false, radius: 0, borderColor: "rgba(100,100,100,255)", borderWidth: 1});
		allData.push({label: "NAT" + coordi, data: [{x:Number(dataToGraph[coordi].x) - xNotch, y: Number(dataToGraph[coordi].y) + Number(uncToGraph[coordi].y)},{x:Number(dataToGraph[coordi].x) + xNotch, y: Number(dataToGraph[coordi].y) + Number(uncToGraph[coordi].y)}], fill: false, radius: 0, borderColor: "rgba(100,100,100,255)", borderWidth: 1});
		allData.push({label: "NAB" + coordi, data: [{x:Number(dataToGraph[coordi].x) - xNotch, y: Number(dataToGraph[coordi].y) - Number(uncToGraph[coordi].y)},{x:Number(dataToGraph[coordi].x) + xNotch, y: Number(dataToGraph[coordi].y) - Number(uncToGraph[coordi].y)}], fill: false, radius: 0, borderColor: "rgba(100,100,100,255)", borderWidth: 1});
		allData.push({label: "NAH" + coordi, data: [{x:Number(dataToGraph[coordi].x) - Number(uncToGraph[coordi].x), y: Number(dataToGraph[coordi].y)},{x:Number(dataToGraph[coordi].x) + Number(uncToGraph[coordi].x), y: Number(dataToGraph[coordi].y)}], fill: false, radius: 0, borderColor: "rgba(100,100,100,255)", borderWidth: 1});
		allData.push({label: "NAL" + coordi, data: [{x:Number(dataToGraph[coordi].x) - Number(uncToGraph[coordi].x), y: Number(dataToGraph[coordi].y) + yNotch},{x:Number(dataToGraph[coordi].x) - Number(uncToGraph[coordi].x), y: Number(dataToGraph[coordi].y) - yNotch}], fill: false, radius: 0, borderColor: "rgba(100,100,100,255)", borderWidth: 1});
		allData.push({label: "NAR" + coordi, data: [{x:Number(dataToGraph[coordi].x) + Number(uncToGraph[coordi].x), y: Number(dataToGraph[coordi].y) + yNotch},{x:Number(dataToGraph[coordi].x) + Number(uncToGraph[coordi].x), y: Number(dataToGraph[coordi].y) - yNotch}], fill: false, radius: 0, borderColor: "rgba(100,100,100,255)", borderWidth: 1});
	}

	graphCanvas.style.backgroundColor = "rgba(255,255,255,255)";
	makeGraph();
	graphCanvas.onpointerdown = down_handler;
	graphCanvas.onpointerup = up_handler;
	graphCanvas.onpointermove = move_handler;
	graphCanvas.onpointerleave = up_handler;

}

function makeGraph() {
	window.scatterChart = new Chart(ctx, {
		type: "line",
		data: {
			datasets: allData
		},
		options: {
			title: {
				display: true,
				text: window.graphTitle,
				fontSize: 16 // modify the font size here
			},
			scales: {
				xAxes: [{
					type: "linear",
					position: "bottom",
					scaleLabel: {
						display: true,
						labelString: window.graphXAxis + (window.graphXAxisUnits==""?"":" /" + window.graphXAxisUnits),
						fontSize: 16
					},
					ticks: {
						max: xMax,
						min: xMin,
						stepSize: xStep
					}                    
				}],
				yAxes: [{
					scaleLabel: {
						display: true,
						labelString: window.graphYAxis + (window.graphYAxisUnits==""?"":" /" + window.graphYAxisUnits),
						fontSize: 16
					},
					ticks: {
						max: yMax,
						min: yMin,
						stepSize: yStep
					}  
				}]
			},
			legend: {
				labels: {
					fontSize: 14,
					filter: function(item, chart) {
						return item.text == null || !item.text.includes("NA");
					}
				}
			},
			responsive: true,
			maintainAspectRatio: false,
			animation: {
				duration: 0
			},
			hover: {
				animationDuration: 0
			},
		}
	});
}

//count how many error bars a line (y=mx+b) passes through
function evaluateLine(m, b) {
	var fails = 0;
	var failList = [];
	var overUnder = null;
	var overUnderCount = 0;
	for (var coord = 0; coord < dataToGraph.length; coord++) {
		var over = false;
		var under = false;

		//check for wobble around the line
		var coordx = Number(dataToGraph[coord].x);
		var coordy = Number(dataToGraph[coord].y);
		var lineY = m*coordx + b;
		if (lineY == coordy) {overUnderCount++;}
		else {
			if (overUnder == null) {overUnder = (coordy >= lineY);}
			else if ((coordy >= lineY) != overUnder) {
				overUnder = !overUnder;
				overUnderCount++;
			}
		}
        
		for (var dX = -1;dX <= 1; dX += 2)
		{
			for (var dY = -1; dY <= 1; dY += 2){
				//test every corner of every point. 
				//to pass, one must be on or above the line, and one must be on or below the line
				coordx = Number(dataToGraph[coord].x) + dX*Number(uncToGraph[coord].x);
				coordy = Number(dataToGraph[coord].y) + dY*Number(uncToGraph[coord].y);
				lineY = m*coordx + b;
				if (coordy >= lineY) { over = true;}
				if (coordy <= lineY) { under = true;}
			}
		}
		if (over == false || under == false) {
			fails++;
			failList.push({x: Number(dataToGraph[coord].x), y: Number(dataToGraph[coord].y)});
		}
	}
	return {fails: fails, failList: failList, overUnderPercentage: overUnderCount/dataToGraph.length};
}

//overload for two point form
function evaluateLineTwo(pkg) {
	return evaluateLine((pkg[1].y-pkg[0].y)/(pkg[1].x-pkg[0].x), pkg[0].y-pkg[0].x*(pkg[1].y-pkg[0].y)/(pkg[1].x-pkg[0].x));
}


function down_handler(event) {
	editLine = null; //clean the slate
    
    
	//hunt for intersections with the trendlines
	var location = pixel2Point(event.offsetX, event.offsetY);

	for (var lineOrder = 1; lineOrder <= 3; lineOrder++) {
		var line = allData[lineOrder];//allData[1] is the trendline, 2 and 3 are the max and min lines
		var intersection = intersectsLine(location, line); 
		if (intersection.intersects == true) {
			line.userMade = true;
			editLine = {line: line, intersection: intersection, order: lineOrder, mouseLocation: {x: event.offsetX, y: event.offsetY}};
			break;
		}
	}
}

function openGraphSettingsModal() {
	var modal = document.getElementById("myModal");
	var modalContent = document.getElementById("modalContent");
	var esc = function(value) {
		return String(value)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	};

	var line1 = allData[1] && allData[1].data ? allData[1] : {data: [{x: 0, y: 0}, {x: 0, y: 0}]};
	var line2 = allData[2] && allData[2].data ? allData[2] : {data: [{x: 0, y: 0}, {x: 0, y: 0}]};
	var line3 = allData[3] && allData[3].data ? allData[3] : {data: [{x: 0, y: 0}, {x: 0, y: 0}]};

	modal.style.display = "block";
	modalContent.innerHTML = ""
		+ "<div class='settings-shell'>"
		+ "  <div class='settings-title-wrap'>"
		+ "    <h3>Graph Settings</h3>"
		+ "    <p>Each field below includes a short explanation so you can tune the graph with confidence.</p>"
		+ "  </div>"
		+ "  <div class='settings-layout'>"
		+ "    <div class='settings-main'>"
		+ "      <section class='settings-card'>"
		+ "        <h4>Names and Symbols</h4>"
		+ "        <div class='settings-field'><label for='newGraphTitle'>Graph title</label><input type='text' id='newGraphTitle' name='newGraphTitle' value='" + esc(graphTitle) + "'><p class='settings-hint'>Displayed at the top of the chart area and in exports.</p></div>"
		+ "        <div class='settings-field'><label for='newXSymbol'>Independent variable symbol</label><input type='text' id='newXSymbol' name='newXSymbol' value='" + esc(graphXSymbol) + "'><p class='settings-hint'>Used in best-fit equations, usually a short symbol like x.</p></div>"
		+ "        <div class='settings-field'><label for='newYSymbol'>Dependent variable symbol</label><input type='text' id='newYSymbol' name='newYSymbol' value='" + esc(graphYSymbol) + "'><p class='settings-hint'>Used in best-fit equations, usually a short symbol like y.</p></div>"
		+ "        <div class='settings-subgrid'>"
		+ "          <div class='axis-block'>"
		+ "            <h5>Horizontal axis text</h5>"
		+ "            <div class='settings-field'><label for='newHLabel'>Axis label</label><input type='text' id='newHLabel' name='newHLabel' value='" + esc(graphXAxis) + "'></div>"
		+ "            <div class='settings-field'><label for='newHLabelUnits'>Units</label><input type='text' id='newHLabelUnits' name='newHLabelUnits' value='" + esc(graphXAxisUnits) + "'></div>"
		+ "          </div>"
		+ "          <div class='axis-block'>"
		+ "            <h5>Vertical axis text</h5>"
		+ "            <div class='settings-field'><label for='newVLabel'>Axis label</label><input type='text' id='newVLabel' name='newVLabel' value='" + esc(graphYAxis) + "'></div>"
		+ "            <div class='settings-field'><label for='newVLabelUnits'>Units</label><input type='text' id='newVLabelUnits' name='newVLabelUnits' value='" + esc(graphYAxisUnits) + "'></div>"
		+ "          </div>"
		+ "        </div>"
		+ "      </section>"
		+ "      <section class='settings-card'>"
		+ "        <h4>Axis Ranges</h4>"
		+ "        <p class='settings-section-hint'>Set minimum, maximum, and major step values for each axis. Use numbers only.</p>"
		+ "        <div class='axis-range-grid'>"
		+ "          <div class='axis-range-card'><h5>Horizontal (X)</h5><label for='newHmin'>Minimum</label><input type='text' id='newHmin' name='newHmin' value='" + esc(xMin) + "' placeholder='e.g. 0'><label for='newHmax'>Maximum</label><input type='text' id='newHmax' name='newHmax' value='" + esc(xMax) + "' placeholder='e.g. 100'><label for='newHstep'>Step size</label><input type='text' id='newHstep' name='newHstep' value='" + esc(xStep) + "' placeholder='e.g. 10'></div>"
		+ "          <div class='axis-range-card'><h5>Vertical (Y)</h5><label for='newVmin'>Minimum</label><input type='text' id='newVmin' name='newVmin' value='" + esc(yMin) + "' placeholder='e.g. 0'><label for='newVmax'>Maximum</label><input type='text' id='newVmax' name='newVmax' value='" + esc(yMax) + "' placeholder='e.g. 100'><label for='newVstep'>Step size</label><input type='text' id='newVstep' name='newVstep' value='" + esc(yStep) + "' placeholder='e.g. 10'></div>"
		+ "        </div>"
		+ "      </section>"
		+ "      <section class='settings-card'>"
		+ "        <h4>Fit Line Endpoints</h4>"
		+ "        <p class='settings-section-hint'>Each line is controlled by two points: start (x1, y1) and end (x2, y2).</p>"
		+ "        <div class='line-stack'>"
		+ "          <div class='line-block'><h5>Best fit line</h5><div class='line-input-grid'><label for='line1data0x'>Start X</label><input type='text' id='line1data0x' name='line1data0x' value='" + esc(line1.data[0].x) + "'><label for='line1data0y'>Start Y</label><input type='text' id='line1data0y' name='line1data0y' value='" + esc(line1.data[0].y) + "'><label for='line1data1x'>End X</label><input type='text' id='line1data1x' name='line1data1x' value='" + esc(line1.data[1].x) + "'><label for='line1data1y'>End Y</label><input type='text' id='line1data1y' name='line1data1y' value='" + esc(line1.data[1].y) + "'></div></div>"
		+ "          <div class='line-block'><h5>Maximum fit line</h5><div class='line-input-grid'><label for='line2data0x'>Start X</label><input type='text' id='line2data0x' name='line2data0x' value='" + esc(line2.data[0].x) + "'><label for='line2data0y'>Start Y</label><input type='text' id='line2data0y' name='line2data0y' value='" + esc(line2.data[0].y) + "'><label for='line2data1x'>End X</label><input type='text' id='line2data1x' name='line2data1x' value='" + esc(line2.data[1].x) + "'><label for='line2data1y'>End Y</label><input type='text' id='line2data1y' name='line2data1y' value='" + esc(line2.data[1].y) + "'></div></div>"
		+ "          <div class='line-block'><h5>Minimum fit line</h5><div class='line-input-grid'><label for='line3data0x'>Start X</label><input type='text' id='line3data0x' name='line3data0x' value='" + esc(line3.data[0].x) + "'><label for='line3data0y'>Start Y</label><input type='text' id='line3data0y' name='line3data0y' value='" + esc(line3.data[0].y) + "'><label for='line3data1x'>End X</label><input type='text' id='line3data1x' name='line3data1x' value='" + esc(line3.data[1].x) + "'><label for='line3data1y'>End Y</label><input type='text' id='line3data1y' name='line3data1y' value='" + esc(line3.data[1].y) + "'></div></div>"
		+ "        </div>"
		+ "      </section>"
		+ "    </div>"
		+ "    <aside class='settings-side'>"
		+ "      <section class='settings-card settings-note-card'>"
		+ "        <h4>Quick Guide</h4>"
		+ "        <p class='settings-note-item'><strong>Labels:</strong> control how your graph is named and presented in reports.</p>"
		+ "        <p class='settings-note-item'><strong>Axis ranges:</strong> use wider min/max for more context, tighter values for detail.</p>"
		+ "        <p class='settings-note-item'><strong>Step size:</strong> smaller steps create denser ticks and grid spacing.</p>"
		+ "        <p class='settings-note-item'><strong>Fit lines:</strong> move endpoints to test alternative best/max/min interpretations.</p>"
		+ "        <h4>Redraw Graph</h4>"
		+ "        <p class='settings-note-item'>Use this if you want to refresh the graph manually.</p>"
		+ "        <button type='button' class='settings-btn settings-btn-secondary' onclick='startup()'>Redraw graph</button>"
		+ "      </section>"
		+ "    </aside>"
		+ "  </div>"
		+ "  <div class='settings-actions'>"
		+ "    <button type='button' class='settings-btn settings-btn-primary' onclick='updateLabels(true)'>Done</button>"
		+ "    <button type='button' class='settings-btn settings-btn-secondary' onclick='closeModal()'>Cancel</button>"
		+ "  </div>"
		+ "</div>";

	wireGraphSettingsLiveUpdates();
}

function wireGraphSettingsLiveUpdates() {
	var modalContent = document.getElementById("modalContent");
	if (!modalContent) { return; }

	var inputs = modalContent.querySelectorAll("input");
	for (var i = 0; i < inputs.length; i++) {
		inputs[i].addEventListener("input", function() {
			if (graphSettingsLiveTimer != null) {
				clearTimeout(graphSettingsLiveTimer);
			}
			graphSettingsLiveTimer = setTimeout(function() {
				updateLabels(false);
			}, 120);
		});

		inputs[i].addEventListener("change", function() {
			updateLabels(false);
		});
	}
}

function up_handler(event) {
	if (editLine != null) {
		editLine = null;
		window.scatterChart.update();
		window.evaluate();
	}
}


function move_handler(event) {
	const now = +new Date();
	if (now - last > 50) {
		last = now;
		if (editLine != null) {
			if (event.offsetX != editLine.mouseLocation.x || event.offsetY != editLine.mouseLocation.y) {
				moveLine(event);
				editLine.mouseLocation = {x:event.offsetX, y:event.offsetY};
			}
		}
	}
    
}

function moveLine(event) {

	var newPoint = pixel2Point(event.offsetX, event.offsetY);

	var targetEndpoint;
	if (Math.abs(editLine.line.data[0].x-editLine.intersection.grabPoint.x) < Math.abs(editLine.line.data[1].x-editLine.intersection.grabPoint.x)) {
		targetEndpoint = editLine.line.data[0];
	} else {
		targetEndpoint = editLine.line.data[1];
	}

	var dragVector = {x: newPoint.x - editLine.intersection.grabPoint.x, y: newPoint.y - editLine.intersection.grabPoint.y};

	var domain = Math.abs(editLine.line.data[0].x - editLine.line.data[1].x);
	var dragFactor = (domain - Math.abs(targetEndpoint.x - editLine.intersection.grabPoint.x)) / (domain);
	dragVector.x = dragVector.x / dragFactor;
	dragVector.y = dragVector.y / dragFactor;

	//move the target endpoint by the dragVector
	targetEndpoint.x += dragVector.x;
	targetEndpoint.y += dragVector.y;
	editLine.intersection.grabPoint = newPoint;
    
	//update the label

	var slope = (editLine.line.data[0].y - editLine.line.data[1].y) / (editLine.line.data[0].x - editLine.line.data[1].x);
	var intercept = editLine.line.data[0].y - slope*editLine.line.data[0].x;
	editLine.line.label = "Linear Regression:  "+graphYSymbol+" = " + Number.parseFloat(slope).toPrecision(Math.max(xSigFigs,ySigFigs)) + graphXSymbol+" + " + Number.parseFloat(intercept).toPrecision(Math.max(xSigFigs,ySigFigs));

	window.scatterChart.update();

}

function intersectsLine(point, line) {
	//determine if the point that's clicked is within the domain of the line
	if ((line.data[0].x < point.x && line.data[1].x > point.x) || (line.data[1].x < point.x && line.data[0].x > point.x)) {
		//determine if the point is within a percentage of the range of the point on the line
		var marginPercent = 0.03;
		var ymargin = Math.abs(window.scatterChart.scales["y-axis-0"].max - window.scatterChart.scales["y-axis-0"].min)*marginPercent;
		var lineY = Number(((line.data[0].y-line.data[1].y)/(line.data[0].x-line.data[1].x))*(point.x-line.data[0].x))+Number(line.data[0].y);
		if (lineY+ymargin > point.y && lineY-ymargin < point.y) {
			return {intersects: true, grabPoint: point};
		}
	}
	return {intersects: false, grabPoint: point};
}

//convert a pixel coordinate on the graph to a point coordinate in the graph's scale
function pixel2Point(xPixel, yPixel) {
	//set the scale
	var ytop = window.scatterChart.chartArea.top;
	var ybottom = window.scatterChart.chartArea.bottom;
	var ymin = window.scatterChart.scales["y-axis-0"].min;
	var ymax = window.scatterChart.scales["y-axis-0"].max;

	var xright = window.scatterChart.chartArea.right;
	var xleft = window.scatterChart.chartArea.left;
	var xmin = window.scatterChart.scales["x-axis-0"].min;
	var xmax = window.scatterChart.scales["x-axis-0"].max;

	if (ytop==ybottom || xright == xleft) { 
		return {yPoint: 0, xPoint: 0};
	} else {
		var yPoint = ymax - (Math.abs(ymax-ymin)/Math.abs(ytop - ybottom))*(yPixel-ytop);
		var xPoint = xmin + (Math.abs(xmax-xmin)/Math.abs(xright - xleft))*(xPixel-xleft);
		return {x: xPoint, y: yPoint};
	}
    
}

function countSigFigs(n) {
	n = String(n);
	var SigFigs = n.length;
	//cut trailing zeros if there is no decimal
	if (!n.includes(".")) {
		while (n[n.length-1]=="0" && n.length > 1) {
			n = n.substr(0, n.length - 1);
			SigFigs--;
		}
	}
	//never count leading zeros, sign characters, decimals, or commas
	var searchKey = "[1-9]";
	for (var ni = 0; ni < n.length; ni++) {
		if ((new RegExp(searchKey)).test(n[ni])) {
			//change the searchkey to include zeros only once a non-zero digit is found leading.
			searchKey = "[0-9]";
		} else {
			SigFigs--;
		}
	}
	return SigFigs;
}

function updateLabels(closeAfterApply) {
	if (closeAfterApply === undefined) {
		closeAfterApply = true;
	}

	if (!document.getElementById("newGraphTitle")) {
		return;
	}

	//apply the labels from the modal window
	graphTitle = document.getElementById("newGraphTitle").value;
	graphXAxis = document.getElementById("newHLabel").value;
	graphXAxisUnits = document.getElementById("newHLabelUnits").value;
	graphYAxis = document.getElementById("newVLabel").value;
	graphYAxisUnits = document.getElementById("newVLabelUnits").value;
	graphXSymbol = document.getElementById("newXSymbol").value;
	graphYSymbol = document.getElementById("newYSymbol").value;
    
	//grab the trendlines:
	incommingData = true; //queue for overwrite
	trendlineData=[];
	trendlineData.push({data: [{x:0, y:0},{x:0, y:0}]});
	trendlineData.push({data: [{x:0, y:0},{x:0, y:0}]});
	trendlineData.push({data: [{x:0, y:0},{x:0, y:0}]});
	for (var lineOrder = 1; lineOrder <= 3; lineOrder++) {
		trendlineData[lineOrder-1].data[0].x = document.getElementById("line"+lineOrder+"data0x").value;
		trendlineData[lineOrder-1].data[0].y = document.getElementById("line"+lineOrder+"data0y").value;
		trendlineData[lineOrder-1].data[1].x = document.getElementById("line"+lineOrder+"data1x").value;
		trendlineData[lineOrder-1].data[1].y = document.getElementById("line"+lineOrder+"data1y").value;
	}
    
	//grab the scale data
	incommingScaleData = true; //queue for overwrite
	scaleData = {};
	scaleData.xMin = document.getElementById("newHmin").value;
	scaleData.xMax = document.getElementById("newHmax").value;
	scaleData.xStep = document.getElementById("newHstep").value;
	scaleData.yMin = document.getElementById("newVmin").value;
	scaleData.yMax = document.getElementById("newVmax").value;
	scaleData.yStep = document.getElementById("newVstep").value;

	// Redraw and feedback generation are batched in one frame.
	window.scheduleGraphAndFeedbackUpdate();
	//close the modal window
	if (closeAfterApply) {
		closeModal();
	}
}
