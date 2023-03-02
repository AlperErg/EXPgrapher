

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
//this is an array of all things to chart. The data, it's error bars, the trendline, and the max and min slopes
var allData = [];
/* it is of this format:

        [
                {
                    label: 'Scatter Dataset',
                    fill:false,
                    showLine: false,
                    data: dataToGraph
                },
                {
                    label: 'trendline',
                    data: [{x:0, y:0},{x:20, y:20}],
                    fill: false,
                    radius: 0,
                    backgroundColor: "rgba(0,0,0,0.1)"
                }
        ]

and consists of the following datasets:

        the data to graph
        the trendline
        the max trendline
        the min trendline
        the error bars for each data point consisting of:
            the vertical line
            the top bar of the vertical line
            the bottom bar of the vertical line
            the horizonal line
            the left bar of the horizontal line
            the right bar of the horizontal line
*/

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

let last = +new Date(); //part of the timer for the line drag function
var editLine = null; //this is to keep track of any lines that the user is dragging
// {line:line, intersection:intersection, order: 1 2 or 3}

(function() {
	var graphCanvas = document.getElementById("graphCanvas");

	// resize the canvas to fill browser window dynamically
	window.addEventListener("resize", resizeCanvas, false);

	function resizeCanvas() {       
		/**
         * Your drawings need to be inside this function otherwise they will be reset when 
         * you resize the browser window and the canvas goes will be cleared.
         */
		drawGraph(); 
	}
	resizeCanvas();

    
})();

function drawGraph() {
	//wipe the old graph
	if (window.scatterChart != null) {
		this.scatterChart.destroy();
		dataToGraph = [];
		uncToGraph = [];
		allData = [];
	}
    
	//get the header names
	var xData = window.grid.getColumns()[0]["name"];
	var xUnc = window.grid.getColumns()[1]["name"];
	var yData = window.grid.getColumns()[2]["name"];
	var yUnc = window.grid.getColumns()[3]["name"];

	//get the domain and range
	//also format the data for chart.js
	xMax = xMin = yMax = yMin = null;

	for (row = 0; row < window.grid.getDataLength(); row++) {
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

	// //paint the canvas white

	/*draws the minor gridlines
    for (var xpos = xMin + xMinorGrid ; xpos <= xMax - xMinorGrid ; xpos += xMinorGrid) {
        ctx.beginPath();
        var pt1 = point2Pixel(xpos, yMax);
        ctx.moveTo(pt1.xPixel, pt1.yPixel);
        var pt2 = point2Pixel(xpos, yMin);
        ctx.lineTo(pt2.xPixel, pt2.yPixel);
        ctx.strokeStyle = '#E0E0E0';
        ctx.stroke();
    }
    for (var ypos = yMin + yMinorGrid ; ypos <= yMax - yMinorGrid ; ypos += yMinorGrid) {
        ctx.beginPath();
        var pt1 = point2Pixel(xMax, ypos);
        ctx.moveTo(pt1.xPixel, pt1.yPixel);
        var pt2 = point2Pixel(xMin, ypos);
        ctx.lineTo(pt2.xPixel, pt2.yPixel);
        ctx.strokeStyle = '#E0E0E0';
        ctx.stroke();
    }*/

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
		//console.log("trend: y = " + maxSlope + "x + " + maxIntercept + " with fails: " + maxFails);   
        
		//todo: the max/min slopes don't handle some corner cases, such as:
		//10, 30
		//20, 60
		//30, 90
		//40, 120
		//8, 150

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
		//console.log("max: y = " + maxSlope + "x + " + maxIntercept + " with fails: " + maxFails);  
		//console.log("min: y = " + minSlope + "x + " + minIntercept + " with fails: " + minFails);   
        
		allData.push({label:"Linear Regression:  "+graphYSymbol+" = " + Number.parseFloat(slope).toPrecision(Math.max(xSigFigs,ySigFigs)) + graphXSymbol+" + " + Number.parseFloat(intercept).toPrecision(Math.max(xSigFigs,ySigFigs)), data: [{x:xMin, y: slope*xMin+intercept},{x: xMax, y: slope*xMax + intercept}], fill: false, radius: 0, borderColor: "rgba(0,0,0,255)", borderWidth: 1, userMade: false});
		allData.push({label:"Maximum Linear Fit:  "+graphYSymbol+" = " + Number.parseFloat(maxSlope).toPrecision(Math.max(xSigFigs,ySigFigs)) + graphXSymbol+" + " + Number.parseFloat(maxIntercept).toPrecision(Math.max(xSigFigs,ySigFigs)),data: [{x:xMin, y: maxSlope*xMin+maxIntercept},{x: xMax, y: maxSlope*xMax + maxIntercept}], fill: false, radius: 0, borderColor: "rgba(255,100,100,255)", borderWidth: 1, userMade: false});
		allData.push({label:"Minimum Linear Fit:  "+graphYSymbol+" = " + Number.parseFloat(minSlope).toPrecision(Math.max(xSigFigs,ySigFigs)) + graphXSymbol+" + " + Number.parseFloat(minIntercept).toPrecision(Math.max(xSigFigs,ySigFigs)),data: [{x:xMin, y: minSlope*xMin+minIntercept},{x: xMax, y: minSlope*xMax + minIntercept}], fill: false, radius: 0, borderColor: "rgba(100,100,255,255)", borderWidth: 1, userMade: false});
    
		//extension to origin can push trendlines outside the scale of the graph. adjust:
		/*if (intercept < yMin) {yMin = intercept;}
        if (maxIntercept < yMin) {yMin = maxIntercept;}
        if (minIntercept < yMin) {yMin = minIntercept;}
        if (intercept > yMax) {yMax = intercept;}
        if (maxIntercept > yMax) {yMax = maxIntercept;}
        if (minIntercept > yMax) {yMax = minIntercept;}*/
        
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

	//draw the data
	//console.log(dataToGraph);
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
				text: window.graphTitle
			},
			scales: {
				xAxes: [{
					type: "linear",
					position: "bottom",
					scaleLabel: {
						display: true,
						labelString: window.graphXAxis + (window.graphXAxisUnits==""?"":" /" + window.graphXAxisUnits)
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
						labelString: window.graphYAxis + (window.graphYAxisUnits==""?"":" /" + window.graphYAxisUnits)
					},
					ticks: {
						max: yMax,
						min: yMin,
						stepSize: yStep
					}  
				}]
			},
			//events: ['click', 'mousemove'],
			//onClick: clickEvt,
			//onHover: hoverEvt,
			//scrub unneeded labels from the legend
			legend: {
				labels: {
					filter: function(item, chart) {
						// Logic to remove a particular legend item goes here
						return item.text == null || !item.text.includes("NA");
					}
				}
			},
			// Boolean - whether or not the chart should be responsive and resize when the browser does.
			responsive: true,
			// Boolean - whether to maintain the starting aspect ratio or not when responsive, if set to false, will take up entire container
			maintainAspectRatio: false,
			animation: {
				duration: 0 // general animation time
			},
			hover: {
				animationDuration: 0 // duration of animations when hovering an item
			},
			//responsiveAnimationDuration: 0 // animation duration after a resize
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
			//grab the line
			console.log("grab the line");
			line.userMade = true;
			editLine = {line: line, intersection: intersection, order: lineOrder, mouseLocation: {x: event.offsetX, y: event.offsetY}};
			break;
		}
	}
	//otherwise, open up the label editor modal
	if (event.offsetY < window.scatterChart.chartArea.top || event.offsetY > window.scatterChart.chartArea.bottom || event.offsetX < window.scatterChart.chartArea.left || event.offsetX > window.scatterChart.chartArea.right) {
		console.log("launch modal");
		var modal = document.getElementById("myModal");
		var modalContent = document.getElementById("modalContent");
		modal.style.display = "block";
		console.log(allData);
		modalContent.innerHTML = "<h3>Graph Settings:</h3><h2><br><br>"+
            "Graph Title: <input type='text' id='newGraphTitle' name='newGraphTitle' value='"+graphTitle+"'><br>"+
            "Symbol for Independent Variable: <input type='text' id='newXSymbol' name='newXSymbol' value='"+graphXSymbol+"'><br>"+
            "Symbol for Dependent Variable: <input type='text' id='newYSymbol' name='newYSymbol' value='"+graphYSymbol+"'><br>"+
            "Horizontal Axis Label: <input type='text' id='newHLabel' name='newHLabel' value='"+graphXAxis+"'><br>"+
            "Horizontal Axis Units: <input type='text' id='newHLabelUnits' name='newHLabelUnits' value='"+graphXAxisUnits+"'><br>"+
            "Horizontal Axis: Min <input type='text' id='newHmin' name='newHmin' value='"+xMin+"'>, max <input type='text' id='newHmax' name='newHmax' value='"+xMax+"'>, step size <input type='text' id='newHstep' name='newHstep' value='"+xStep+"'><br>"+  
            "Vertical Axis Label: <input type='text' id='newVLabel' name='newVLabel' value='"+graphYAxis+"'><br> "+
            "Vertical Axis Units: <input type='text' id='newVLabelUnits' name='newVLabelUnits' value='"+graphYAxisUnits+"'><br>"+
            "Vertical Axis: Min <input type='text' id='newVmin' name='newVmin' value='"+yMin+"'>, max <input type='text' id='newVmax' name='newVmax' value='"+yMax+"'>, step size <input type='text' id='newVstep' name='newVstep' value='"+yStep+"'><br>"+  
            "Best Fit Line: start at (<input type='text' id='line1data0x' name='line1data0x' value='"+allData[1].data[0].x+"'>, <input type='text' id='line1data0y' name='line1data0y' value='"+allData[1].data[0].y+"'>), End at: (<input type='text' id='line1data1x' name='line1data1x' value='"+allData[1].data[1].x+"'>, <input type='text' id='line1data1y' name='line1data1y' value='"+allData[1].data[1].y+"'>)<br>"+
            "Max Fit Line: start at (<input type='text' id='line2data0x' name='line2data0x' value='"+allData[2].data[0].x+"'>, <input type='text' id='line2data0y' name='line2data0y' value='"+allData[2].data[0].y+"'>), End at: (<input type='text' id='line2data1x' name='line2data1x' value='"+allData[2].data[1].x+"'>, <input type='text' id='line2data1y' name='line2data1y' value='"+allData[2].data[1].y+"'>)<br>"+
            "Min Fit Line: start at (<input type='text' id='line3data0x' name='line3data0x' value='"+allData[3].data[0].x+"'>, <input type='text' id='line3data0y' name='line3data0y' value='"+allData[3].data[0].y+"'>), End at: (<input type='text' id='line3data1x' name='line3data1x' value='"+allData[3].data[1].x+"'>, <input type='text' id='line3data1y' name='line3data1y' value='"+allData[3].data[1].y+"'>)<br>"+
            "<button onclick='updateLabels()'>Apply</button><button onclick='closeModal()'>Cancel</button>";
	}
    
	//console.log(event);
	//console.log("coord: (" + event.offsetX + ", " + event.offsetY + ")");
	//console.log(window.scatterChart);
	//console.log(pixel2Point(event.offsetX, event.offsetY));
}

function up_handler(event) {
	if (editLine != null) {
		//moveLine(event);
		console.log(editLine);

		editLine = null;
		window.scatterChart.update();
		window.evaluate();
	}
}


//todo: replace the move event trigger with a call in a loop on a timer that cancels when the mouse is lifted so that you can hold to pull the line outside borders
function move_handler(event) {
	const now = +new Date();
	if (now - last > 50) { // milliseconds
		last = now;
		console.log("moved");
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

	//find which point to move:
	//console.log(editLine);
	var targetEndpoint;
	//console.log(Math.abs(editLine.line.data[0].x-editLine.intersection.grabPoint.x));
	//console.log(Math.abs(editLine.line.data[1].x-editLine.intersection.grabPoint.x));
	if (Math.abs(editLine.line.data[0].x-editLine.intersection.grabPoint.x) < Math.abs(editLine.line.data[1].x-editLine.intersection.grabPoint.x)) {
		//move point 0
		targetEndpoint = editLine.line.data[0];
	} else {
		//move point 1
		targetEndpoint = editLine.line.data[1];
	}
	//console.log(targetEndpoint);
    
	//compute the drag vector - graph distance the mouse was dragged:
	var dragVector = {x: newPoint.x - editLine.intersection.grabPoint.x, y: newPoint.y - editLine.intersection.grabPoint.y};
	console.log(dragVector);
    
	//scale the drag vector by the relative distance to the endpoint
	var domain = Math.abs(editLine.line.data[0].x - editLine.line.data[1].x);
	var dragFactor = (domain - Math.abs(targetEndpoint.x - editLine.intersection.grabPoint.x)) / (domain);
	dragVector.x = dragVector.x / dragFactor;
	dragVector.y = dragVector.y / dragFactor;
	console.log(dragVector);
    
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

    
	/*
    //deterine if the point is within a small rectangle around the endpoints of the line (2% of the scale in each dimension)
    var marginPercent = 0.02;
    var xmargin = Math.abs(window.scatterChart.scales['x-axis-0'].max - window.scatterChart.scales['x-axis-0'].min)*marginPercent;
    var ymargin = Math.abs(window.scatterChart.scales['y-axis-0'].max - window.scatterChart.scales['y-axis-0'].min)*marginPercent;

    //test if the point is on the wrong side of any of the margins
    for (var endpoint = 0; endpoint <= 1; endpoint++){
        var intersects = true;
        if (line[endpoint].y + ymargin < point.y) {intersects = false; }
        else if (line[endpoint].y - ymargin > point.y) {intersects = false;}
        else if (line[endpoint].x + xmargin < point.x) {intersects = false;}
        else if (line[endpoint].x - xmargin > point.x) {intersects = false;}
        if (intersects == true) {break;}
    }
    console.log(intersects);
    return {intersects: intersects, endpoint: endpoint};
    */
}

//click event handler
//adapted from: https://stackoverflow.com/questions/44959490/chart-js-2-0-current-mouse-coordinates-tooltip
//function clickEvt(c, i) {

//console.log("coord: (" + c.offsetX + ", " + c.offsetY + ")");
//console.log(window.scatterChart);
//console.log(pixel2Point(c.offsetX, c.offsetY));
//var x_value = this.data.labels[e._index];
//var y_value = this.data.datasets[0].data[e._index];
//console.log(x_value);
//console.log(y_value);
//}

//mouse move event handler
//function hoverEvt(c, i) {
//console.log("coord: (" + c.offsetX + ", " + c.offsetY + ")");

//}

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

//convert a point on the graph to a pixel location
/* depreciated
function point2Pixel(xUnit, yUnit) {
    var pixelPoint = {
        xPixel: Math.ceil((xUnit - xMin)*xUnit2Pixel + xPixelBuffer),
        yPixel: Math.ceil((yMax - yUnit)*yUnit2Pixel + yPixelBuffer)
    };
    // Return it
    return pixelPoint;

}*/

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

function updateLabels() {
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
	console.log(scaleData);
    
	//redraw graph
	window.drawGraph();
	//re-generate feedback;
	window.evaluate();
	//close the modal window
	closeModal();
}
