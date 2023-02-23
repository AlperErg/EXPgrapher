var dataset = []; //the whole set for formatted and checked data

//called by the DOMContentLoaded event AND when the table is loaded
function evaluate() {
	dataset = [];

	var div = document.getElementById("feedbackBoxid");


	//compile messages
	var feedback = [];

	//get the header names
	var xData = window.grid.getColumns()[0]["name"];
	var xUnc = window.grid.getColumns()[1]["name"];
	var yData = window.grid.getColumns()[2]["name"];
	var yUnc = window.grid.getColumns()[3]["name"];

	//collect, format, and count the data
	var dataCount = 0;
	for (var row = 0; row < window.grid.getDataLength(); row++) {
		var dataRow = window.grid.getDataItem(row);    
		var x, dx, y, dy;
		if (dataRow[xData]==null || dataRow[yData]==null) {continue;}
		else {
			var x = window.toNumber(dataRow[xData]);
			var y = window.toNumber(dataRow[yData]);
		} 
		if (dataRow[xUnc] == null) {dx=window.toNumber("0"); console.log(dx);} else {var dx = window.toNumber(dataRow[xUnc]);}
		if (dataRow[yUnc] == null) {dy=window.toNumber("0");} else {var dy = window.toNumber(dataRow[yUnc]);}
            
		dataCount++;

		dataset.push({x: x, dx: dx, y: y, dy: dy, litx : dataRow[xData], litdx: dataRow[xUnc], lity: dataRow[yData], litdy: dataRow[yUnc], dataRow: row});
	}

	//check labels
	var labelerror = false;
	if (window.graphXSymbol == "x") {
		labelerror = true;
		feedback.push({severity: 50, msg: "Currently, you're using 'x' to represent your independent variable. Consider using another symbol that is more closely tied to the quantity you are expressing. For example, 'm' for mass."});
	}
	if (window.graphYSymbol == "y") {
		labelerror = true;
		feedback.push({severity: 50, msg: "Currently, you're using 'y' to represent your independent variable. Consider using another symbol that is more closely tied to the quantity you are expressing. For example, 'm' for mass."});
	}
	if (labelerror == true) {
		feedback.push({severity: 0, msg: "You can edit the labels and units by clicking!"});
	}
    
    
	//check exponents
	var xdPowMode = [];
	var ydPowMode = [];
	var xuPowMode = [];
	var yuPowMode = [];
	for (var row = 0; row < dataset.length; row++) {
		xdPowMode.push(dataset[row].x.power);
		ydPowMode.push(dataset[row].y.power);
		xuPowMode.push(dataset[row].dx.power);
		yuPowMode.push(dataset[row].dy.power);
	}
	xdPowMode = modeFind(xdPowMode);
	ydPowMode = modeFind(ydPowMode);
	xuPowMode = modeFind(xuPowMode);
	yuPowMode = modeFind(yuPowMode);
	var powerOutliers = [];
	for (var row = 0; row < dataset.length; row++) {
		if (dataset[row].x.power != xdPowMode ||
            dataset[row].y.power != ydPowMode ||
            dataset[row].dx.power != xuPowMode ||
            dataset[row].dy.power != yuPowMode) {
			var msg = "";
			if (dataset[row].x.power != xdPowMode) {msg += " expected " + dataset[row].x.base + "^" + xdPowMode + " but found " + dataset[row].x.base + "^" + dataset[row].x.power + ",";}
			if (dataset[row].y.power != ydPowMode) {msg += " expected " + dataset[row].y.base + "^" + ydPowMode + " but found " + dataset[row].y.base + "^" + dataset[row].y.power + ",";}
			if (dataset[row].dx.power != xuPowMode) {msg += " expected " + dataset[row].dx.base + "^" + xuPowMode + " but found " + dataset[row].dx.base + "^" + dataset[row].dx.power + ",";}
			if (dataset[row].dy.power != yuPowMode) {msg += " expected " + dataset[row].dy.base + "^" + yuPowMode + " but found " + dataset[row].dy.base + "^" + dataset[row].dy.power + ",";}
			msg += " in the datum: (" + dataset[row].litx + " +/- " + dataset[row].litdx + ", " + dataset[row].lity + " +/- " + dataset[row].litdy + ")";
			powerOutliers.push({row: dataset[row], msg: msg});
		}
	}   
	if (powerOutliers.length > 0) {
		var msg = "Some data is expressed in scientific notation, but is not represented with a consistent power across all datum:";
		for (var row = 0; row < powerOutliers.length; row++) {
			msg += powerOutliers[row].msg;
		}
		feedback.push({severity: 100*powerOutliers.length/dataset.length, msg: msg});
	}

	//check bases
	var xdbaseMode = [];
	var ydbaseMode = [];
	var xubaseMode = [];
	var yubaseMode = [];
	for (var row = 0; row < dataset.length; row++) {
		xdbaseMode.push(dataset[row].x.base);
		ydbaseMode.push(dataset[row].y.base);
		xubaseMode.push(dataset[row].dx.base);
		yubaseMode.push(dataset[row].dy.base);
	}
	xdbaseMode = modeFind(xdbaseMode);
	ydbaseMode = modeFind(ydbaseMode);
	xubaseMode = modeFind(xubaseMode);
	yubaseMode = modeFind(yubaseMode);
	var baseOutliers = [];   
	for (var row = 0; row < dataset.length; row++) {
		if (dataset[row].x.base != xdbaseMode ||
            dataset[row].y.base != ydbaseMode ||
            dataset[row].dx.base != xubaseMode ||
            dataset[row].dy.base != yubaseMode) {
			var msg = "";
			if (dataset[row].x.base != xdbaseMode) {msg += " expected " + xdbaseMode + "^" + dataset[row].x.power + " but found " + dataset[row].x.base + "^" + dataset[row].x.power + ",";}
			if (dataset[row].y.base != ydbaseMode) {msg += " expected " + ydbaseMode + "^" + dataset[row].y.power + " but found " + dataset[row].y.base + "^" + dataset[row].y.power + ",";}
			if (dataset[row].dx.base != xubaseMode) {msg += " expected " + xubaseMode + "^" + dataset[row].dx.power + " but found " + dataset[row].dx.base + "^" + dataset[row].dx.power + ",";}
			if (dataset[row].dy.base != yubaseMode) {msg += " expected " + yubaseMode + "^" + dataset[row].dy.power + " but found " + dataset[row].dy.base + "^" + dataset[row].dy.power + ",";}
			msg += " in the datum: (" + dataset[row].litx + " +/- " + dataset[row].litdx + ", " + dataset[row].lity + " +/- " + dataset[row].litdy + ")";
			baseOutliers.push({row: dataset[row], msg: msg});
		}
	}   
	if (baseOutliers.length > 0) {
		var msg = "Some data is expressed in scientific notation, but is not represented with a consistent base across all datum:";
		for (var row = 0; row < baseOutliers.length; row++) {
			msg += baseOutliers[row].msg;
		}
		feedback.push({severity: 100*baseOutliers.length/dataset.length, msg: msg});
	}

	//check the sig figs in uncertianty
	var msg = "Uncertainties should be expressed to one significant figure (or up to two, if the first digit is 1):";
	var xerrorCount = 0;
	var yerrorCount = 0;
	for (var row = 0; row < dataset.length; row++) {
		var error = false;
		var dxSigFigs = window.countSigFigs(dataset[row].dx.operand);
		if (dxSigFigs > 2 || (dxSigFigs == 2 && String(dataset[row].dx.operand)[0] != "1")) { 
			xerrorCount++;
			error = true;
			msg += " " + dataset[row].dx.operand + " has " + dxSigFigs + " significant figures"; 
		}
		var dySigFigs = window.countSigFigs(dataset[row].dy.operand);
		if (dySigFigs > 2 || (dySigFigs == 2 && String(dataset[row].dy.operand)[0] != "1")) { 
			yerrorCount++;
			if (error == true) {msg += " and";}
			error = true;
			msg += " " + dataset[row].dy.operand + " has " + dySigFigs + " significant figures"; 
		}
		if  (error == true) {
			msg += " in the datum: (" + dataset[row].litx + " +/- " + dataset[row].litdx + ", " + dataset[row].lity + " +/- " + dataset[row].litdy + ")."; 
		}
	} 
	if (xerrorCount + yerrorCount > 0) {
		feedback.push({severity: 100*(xerrorCount + yerrorCount)/(dataset.length), msg: msg});
	}  

	//check that the power of the measurment matches the power of the uncertainty
	var msg = "Uncertainties in Scientific Notation should be formatted so they have the same power of ten as their associated measurement: ";
	var xerrorCount = 0;
	var yerrorCount = 0;
	for (var row = 0; row < dataset.length; row++) {
		var error = false;
		if (dataset[row].dx.power != 0 && dataset[row].x.power != 0 && dataset[row].dx.power != dataset[row].x.power) { 
			xerrorCount++;
			error = true;
			msg += " measurement " + dataset[row].litx + " has power 10^" + dataset[row].x.power + " but its uncertainty "  + dataset[row].litdx + " has power 10^" + dataset[row].dx.power + ","; 
		}
		if (dataset[row].dy.power != 0 && dataset[row].y.power != 0 && dataset[row].dy.power != dataset[row].y.power) { 
			yerrorCount++;
			if (error == true) {msg += " and";}
			error = true;
			msg += " measurement " + dataset[row].lity + " has power 10^" + dataset[row].y.power + " but its uncertainty "  + dataset[row].litdy + " has power 10^" + dataset[row].dy.power + ","; 
		}
		if  (error == true) {
			msg += " in the datum: (" + dataset[row].litx + " +/- " + dataset[row].litdx + ", " + dataset[row].lity + " +/- " + dataset[row].litdy + ")."; 
		}
	} 
	if (xerrorCount + yerrorCount > 0) {
		feedback.push({severity: 100*(xerrorCount + yerrorCount)/(2*dataset.length), msg: msg});
	} 

	//check that the spread over the domain of data is appropriate (not imbalanced low or high)
	//first, get the min, max, and middle of the domain
	if (dataset.length>=5) {
		var domain = [];
		domain.push(dataset[0].x.operand * Math.pow(dataset[0].x.base, dataset[0].x.power));
		var domainMin = domain[0];
		var domainMax = domain[0];
		for (var row = 1; row < dataset.length; row++) {
			domain.push(dataset[row].x.operand * Math.pow(dataset[row].x.base, dataset[row].x.power));
			if (domain[row] < domainMin) { domainMin = domain[row];}
			if (domain[row] > domainMax) { domainMax = domain[row];}
		}
		var domainMiddle = (domainMax + domainMin) / 2;

		//check the balance
		var numAbove = 0;
		var numBelow = 0;
		for (var row = 0; row < domain.length; row++) {
			if (domain[row] > domainMiddle) { numAbove ++;}
			else {numBelow++;}
		}

		//prepare error messages
		if (numAbove < domain.length * 0.4) {
			feedback.push({severity: 50, msg: "The selection of values you tested is bunched up on the left side of the graph's domain. Consider taking more data to fill in the right side."});
		} else if (numBelow < domain.length * 0.4) {
			feedback.push({severity: 50, msg: "The selection of values you tested is bunched up on the right side of the graph's domain. Consider taking more data to fill in the left side."});
		}
	}

	//check that the precision of the data is consistent
	//and
	//check that the precision of uncertainties match the precision of the data
	//first, get the modal precision
	var inconsistentPrecisionMsg = "Measurements of the same type should all be expressed to the same precision, except where their uncertainties prohibit higher precision:";
	var xPrecisions = [];
	var yPrecisions = [];
	var xdPrecisions = [];
	var ydPrecisions = [];
	var msg = "The position of least significant digit of a measurement's uncertainty should match the position of the least significant digit of the measurement itself:";
	for (var row = 0; row < dataset.length; row++) {
		var error = false;
		//get the precision of the measurments and their uncertainties
		var xPrecision = String(dataset[row].litx);
		if (xPrecision.includes("x")) {
			//get the literal operand
			xPrecision = xPrecision.substr(0, xPrecision.indexOf("x"));
		}
		xPrecisions.push(leastSiginificantDigit(xPrecision) * Math.pow(dataset[row].x.base, dataset[row].x.power));
		var yPrecision = String(dataset[row].lity);
		if (yPrecision.includes("x")) {
			//get the literal operand
			yPrecision = yPrecision.substr(0, yPrecision.indexOf("x"));
		}
		yPrecisions.push(leastSiginificantDigit(yPrecision) * Math.pow(dataset[row].y.base, dataset[row].y.power));
		var xdPrecision = String(dataset[row].litdx);
		if (xdPrecision.includes("x")) {
			//get the literal operand
			xdPrecision = xdPrecision.substr(0, xdPrecision.indexOf("x"));
		}
		xdPrecisions.push(leastSiginificantDigit(xdPrecision) * Math.pow(dataset[row].dx.base, dataset[row].dx.power));
		var ydPrecision = String(dataset[row].litdy);
		if (ydPrecision.includes("x")) {
			//get the literal operand
			ydPrecision = ydPrecision.substr(0, ydPrecision.indexOf("x"));
		}
		ydPrecisions.push(leastSiginificantDigit(ydPrecision) * Math.pow(dataset[row].dy.base, dataset[row].dy.power));
	}
	var xPrecisionMode = modeFind(xPrecisions);
	var yPrecisionMode = modeFind(yPrecisions);
	var xerrorCount = 0;
	var yerrorCount = 0;
	var xerrorCount2 = 0;
	var yerrorCount2 = 0;
	for (var row = 0; row < dataset.length; row++) {
		var error = false;
		var roundingError = false;

		//ignore precision of percentages
		if (!new RegExp("[%]").test(String(dataset[row].litdx))) {
			//prepare the warnings for precision mis-match between measurement and uncertainty
			if (xPrecisions[row] != xdPrecisions[row]) { 
				if (xPrecisions[row] == xPrecisionMode) {
					xerrorCount++;
					error = true;
					msg += " measurement " + dataset[row].litx + " has precision that doesn't match its uncertainty's precision " + dataset[row].litdx; 
				} else {
					xerrorCount2++;
					roundingError = true;
					inconsistentPrecisionMsg += " measurement " + dataset[row].litx + " has precision that doesn't match the rest of the measurements of the same type"; 
				}
			}
		}
		//ignore precision of percentages
		if (!new RegExp("[%]").test(String(dataset[row].litdy))) {
			if (yPrecisions[row] != ydPrecisions[row]) { 
				if (yPrecisions[row] == yPrecisionMode) {
					yerrorCount++;
					if (error == true) {msg += " and";}
					error = true;
					msg += " measurement " + dataset[row].lity + " has precision that doesn't match its uncertainty's precision " + dataset[row].litdy; 
				} else {
					yerrorCount2++;
					if (roundingError == true) {inconsistentPrecisionMsg += " and";}
					roudningError = true;
					inconsistentPrecisionMsg += " measurement " + dataset[row].lity + " has precision that doesn't match the rest of the measurements of the same type"; 
				}
			}
		}
		if  (error == true) {
			msg += " in the datum: (" + dataset[row].litx + " +/- " + dataset[row].litdx + ", " + dataset[row].lity + " +/- " + dataset[row].litdy + ").";             
		} 
		if (roundingError == true) {
			inconsistentPrecisionMsg += " in the datum: (" + dataset[row].litx + " +/- " + dataset[row].litdx + ", " + dataset[row].lity + " +/- " + dataset[row].litdy + ").";             
		}
        
	} 
	if (xerrorCount + yerrorCount > 0) {
		feedback.push({severity: 100*(xerrorCount + yerrorCount)/(2* dataset.length), msg: msg});
	}
	if (xerrorCount2 + yerrorCount2 > 0) {
		feedback.push({severity: 100*(xerrorCount2 + yerrorCount2)/(2* dataset.length), msg: inconsistentPrecisionMsg});
	} 

	//check against uncertainties being 0
	//first, see if the whole column is 0
	var skipx = true;
	var skipy = true;
	for (var row = 0; row < dataset.length; row++) {
		if (dataset[row].dx.operand != 0) {
			skipx = false;
		}
		if (dataset[row].dy.operand != 0) {
			skipy = false;
		}
	}
	//look for 0's in uncertainties
	var lone0msg = "It is very unusual for some measurements to have an uncertainty, but not others of the same type. Double check that these data should have no uncertainty:";
	var double0msg = "Both measurements cannot have negligable uncertainty or else you will have a hard time explaining differences between your findings and your expectations. Double check that both of these measurements should have no uncertianty: ";
	var xerrorCount = 0;
	var yerrorCount = 0;
	var doubleErrorCount = 0;
	for (var row = 0; row < dataset.length; row++) {
		var error = 0;
		if (dataset[row].dx.operand == 0 && dataset[row].dy.operand == 0) {
			doubleErrorCount++;
			error = -1;
			double0msg += " both " + dataset[row].litx + " and " + dataset[row].lity + " have no uncertainty";
		} //only check single zeros on uncertianties if they aren't both zero
		if (dataset[row].dx.operand == 0 && skipx == false && error >= 0) { 
			xerrorCount++;
			error++;
			lone0msg += " " + dataset[row].litx + " has no uncertianty"; 
		}
		if (dataset[row].dy.operand == 0 && skipy == false && error >= 0) { 
			yerrorCount++;
			if (error == 1) {msg += " and";}
			error++;
			lone0msg += " " + dataset[row].lity + " has no uncertianty"; 
		}
		if  (error > 0) {
			lone0msg += " in the datum: (" + dataset[row].litx + " +/- " + dataset[row].litdx + ", " + dataset[row].lity + " +/- " + dataset[row].litdy + ")."; 
		}
		if (error == -1) {
			double0msg += " in the datum: (" + dataset[row].litx + " +/- " + dataset[row].litdx + ", " + dataset[row].lity + " +/- " + dataset[row].litdy + ")."; 
		}
	} 
	if (xerrorCount + yerrorCount > 0) {
		feedback.push({severity: 100*(xerrorCount + yerrorCount)/(2*dataset.length), msg: lone0msg});
	}
	if (doubleErrorCount > 0) {
		feedback.push({severity: 80, msg: double0msg});
	}  


	//examine the size of the error bars. 
	//Check if the x error bars are too big
	var msg = "Some uncertainties on the independent variable are so large that they cross over adjacent data. Consider ways to reduce the measurement uncertainty or increase the separation of the values you collect for your independent variable: ";
	var xerrorCount = 0;
	var severity = 20;
	for (var row = 0; row < dataset.length-1; row++) {
		for (var row2 = row+1; row2 < dataset.length; row2++) {
			var error = false;

			var point1 = dataset[row].x.operand * Math.pow(dataset[row].x.base, dataset[row].x.power);
			var point1unc = dataset[row].dx.operand * Math.pow(dataset[row].dx.base, dataset[row].dx.power) * (dataset[row].dx.percentage==true?point1/100:1);
			var min1 = point1 - point1unc;
			var max1 = point1 + point1unc;

			var point2 = dataset[row2].x.operand * Math.pow(dataset[row2].x.base, dataset[row2].x.power);
			var point2unc = dataset[row2].dx.operand * Math.pow(dataset[row2].dx.base, dataset[row2].dx.power) * (dataset[row2].dx.percentage==true?point2/100:1);
			var min2 = point2 - point2unc;
			var max2 = point2 + point2unc;

			if ((min1 < max2) != (max1 < min2)) {
				if (((min1 < point2) != (max1 < point2))){
					//the data overlap with adjacent error bars!
					severity = 80;
					error = true;
					xerrorCount++;
					msg += " measurement " + dataset[row2].litx + " lies within measurement " + dataset[row].litx + "'s uncertainty"; 
				} else if ((min2 < point1) != (max2 < point1)) {
					//the data overlap with adjacent error bars!
					severity = 80;
					error = true;
					xerrorCount++;
					msg += " measurement " + dataset[row].litx + " lies within measurement " + dataset[row2].litx + "'s uncertainty"; 
				} else {
					//the error bars overlap
					error = true;
					xerrorCount++;
					msg += " measurement " + dataset[row].litx + "'s uncertainty overlaps with  measurement " + dataset[row2].litx + "'s uncertainty"; 
				}
			}

			if  (error == true) {
				msg += " for the data: (" + dataset[row].litx + " +/- " + dataset[row].litdx + ", " + dataset[row].lity + " +/- " + dataset[row].litdy + ")"; 
				msg += " and (" + dataset[row2].litx + " +/- " + dataset[row2].litdx + ", " + dataset[row2].lity + " +/- " + dataset[row2].litdy + ")"; 
			}
		}
	} 
	if (xerrorCount > 0) {
		feedback.push({severity: severity, msg: msg});
	}     
	//Check if the y error bars are too big
	//EDIT: Disabling this check because it catches on cases where the data levels out or is otherwise non-linear
	/*    var msg = "Some uncertainties on the dependent variable are so large that they cross over adjacent data. Consider ways to reduce the measurement uncertainty or increase the separation of the values you collect for your dependent variable: ";
    var yerrorCount = 0;
    var severity = 20;
    for (var row = 0; row < dataset.length-1; row++) {
        for (var row2 = row+1; row2 < dataset.length; row2++) {
            var error = false;

            var point1 = dataset[row].y.operand * Math.pow(dataset[row].y.base, dataset[row].y.power);
            var point1unc = dataset[row].dy.operand * Math.pow(dataset[row].dy.base, dataset[row].dy.power);
            var min1 = point1 - point1unc;
            var max1 = point1 + point1unc;

            var point2 = dataset[row2].y.operand * Math.pow(dataset[row2].y.base, dataset[row2].y.power);
            var point2unc = dataset[row2].dy.operand * Math.pow(dataset[row2].dy.base, dataset[row2].dy.power);
            var min2 = point2 - point2unc;
            var max2 = point2 + point2unc;

            if ((min1 < max2) != (max1 < min2)) {
                if (((min1 < point2) != (max1 < point2))){
                    //the data overlap with adjacent error bars!
                    severity = 80;
                    error = true;
                    yerrorCount++;
                    msg += " measurement " + dataset[row2].lity + " lies within measurement " + dataset[row].lity + "'s uncertainty"; 
                } else if ((min2 < point1) != (max2 < point1)) {
                    //the data overlap with adjacent error bars!
                    severity = 80;
                    error = true;
                    yerrorCount++;
                    msg += " measurement " + dataset[row].lity + " lies within measurement " + dataset[row2].lity + "'s uncertainty"; 
                } else {
                    //the error bars overlap
                    error = true;
                    yerrorCount++;
                    msg += " measurement " + dataset[row].lity + "'s uncertainty overlaps with  measurement " + dataset[row2].lity + "'s uncertainty"; 
                }
            }

            if  (error == true) {
                msg += " for the data: (" + dataset[row].lity + " +/- " + dataset[row].litdy + ", " + dataset[row].lity + " +/- " + dataset[row].litdy + ")"; 
                msg += " and (" + dataset[row2].lity + " +/- " + dataset[row2].litdy + ", " + dataset[row2].lity + " +/- " + dataset[row2].litdy + ")"; 
            }
        }
    } 
    if (yerrorCount > 0) {
        feedback.push({severity: severity, msg: msg});
    } */

	//check that the dependent variable list is in consistent order (ascending or descending)
	if (dataset.length > 2) {
		var error = false;
		var order = dataset[0].x.operand * Math.pow(dataset[0].x.base, dataset[0].x.power) > dataset[1].x.operand * Math.pow(dataset[1].x.base, dataset[1].x.power);
		for (var row = 1; row < dataset.length -1; row++) {
			var newOrder = dataset[row].x.operand * Math.pow(dataset[row].x.base, dataset[row].x.power) > dataset[row+1].x.operand * Math.pow(dataset[row+1].x.base, dataset[row+1].x.power); 
			if (order != newOrder) {
				error = true;
				break;
			}
		}
		if (error == true) {
			feedback.push({severity: 30, msg: "Data for your dependent variable should be presented in either ascending or descending order, but should usually not be in a jumbled or oscillating order. Consider re-ordering your data."});
		}
	}

	//check the data count
	if (dataCount == 0) {
		feedback.push({severity: 100, msg: "No data found! Enter your data in the table to the left."});
	} else if (dataCount == 1) {
		feedback.push({severity: 100, msg: "You must have more than one datum to create a trend."});
	} else if (dataCount <= 4) {
		feedback.push({severity: 200/dataCount, msg: "It is strongly recommended to collect at least 5 items of data."});
	} 

	//check the quality of the trendline
	//only perform this check if a linear regression succeeded. (can fail in cases where there are 1 or 0 data)
	if (dataset.length >= 2) {
		for (var lineNumber = 1; lineNumber<=3; lineNumber++) {

			var f = window.evaluateLineTwo(window.allData[lineNumber].data);

			//only mention positive features of the best-fit line
			if (f.fails <= dataCount * 0.6 && lineNumber == 1) {
				var adj;
				if (f.fails <= dataCount * 0.2) { adj = "strong";}
				else if (f.fails <= dataCount * 0.4) { adj = "middling";}
				else if (f.fails <= dataCount * 0.6) { adj = "weak";}
				feedback.push({severity: 100*(f.fails/dataCount), msg: window.allData[lineNumber].label + " passes through the error bars of " + (dataCount - f.fails) + " data points. This is " + adj + " evidence that the trendline fits."});
			}
			if (f.fails > 0) {
				if (window.allData[lineNumber].userMade == true) {
					//message for custom trendlines
					feedback.push({severity: 100*f.fails/dataCount, msg: window.allData[lineNumber].label + " does NOT pass through the error bars of " + f.fails + " data points. Consider whether there may be a better choice for the position of this line (you can drag the line to adjust it). Data points that did not get intersected by the trendline: "});
                    
					for (var badpoints = 0; badpoints < f.fails; badpoints++) {
						feedback[feedback.length-1].msg += "(" + f.failList[badpoints].x + ", " + f.failList[badpoints].y + ") ";
					}
				} else if (lineNumber == 1) {
					//message for best fit line
					feedback.push({severity: 100*f.fails/dataCount, msg: window.allData[lineNumber].label + " does NOT pass through the error bars of " + f.fails + " data points. This could be evidence that the trend in the data is not linear, or that there is more random error in your data than you are reporting in your uncertainties. Data points that did not get intersected by the trendline: "});
                    
					for (var badpoints = 0; badpoints < f.fails; badpoints++) {
						feedback[feedback.length-1].msg += "(" + f.failList[badpoints].x + ", " + f.failList[badpoints].y + ") ";
					}
            
				}
        
			}
		}
	}

    



	//TODO:
	//test whether the data is curved

    
	//look for blank lines in the table
	if (dataset.length >= 2) {
		var errorCount = 0;
		var msg = "The data in the table should not have incomplete rows. ";
		var nextRowPtr = 0;
		var incRow = 0;
		while (incRow < dataset[dataset.length-1].dataRow) {
			//var dataRow = window.grid.getDataItem(row);    
			if (incRow != dataset[nextRowPtr].dataRow) {
				if (errorCount == 0) {
					msg += " row " + (incRow + 1);
				} else {
					msg += ", row " + (incRow + 1);
				}
				errorCount++;
			} else {
				nextRowPtr++;
			}
			incRow++;
		}
		if (errorCount > 0) {
			if (errorCount == 1) {
				msg += " has incomplete data.";
			} else {
				msg += " have incomplete data.";
			}
			feedback.push({severity: 20, msg: msg});
		}
	}

	//display the messages
	for (var feedbackIndex = 0; feedbackIndex < feedback.length; feedbackIndex++) {
		div.innerHTML += "<p style=\"color:rgb("+ Math.floor(255*feedback[feedbackIndex].severity/100) +", 0, 0)\">"+(feedbackIndex+1) + ") " + feedback[feedbackIndex].msg+"</p>";        
	}

}
    
function modeAndOutliers(list) {
	var mode = modeFind(list);
	var outliers = [];
	for (listi = 0; listi < list.length; listi++) {
		if (list[listi] != mode) { outliers.push(listi);}
	}
	return {mode: mode, outliers: outliers};
}

function modeFind(list) {
	var safelist = JSON.parse(JSON.stringify(list));
	return safelist.sort((a,b) =>
		safelist.filter(v => v===a).length -
        safelist.filter(v => v===b).length
	).pop();
}

function leastSiginificantDigit(n) {
	var nS = String(n);
	var result = "";

	//check for case, 0. We'll treat this as least significant digit, 1
	if (nS == "0") {return Number(1);}

	//first, see if trailing zeros should be ignored
	var trim = nS.length;
	if (!nS.includes(".")) {
		while (trim > 0 && nS[trim-1] == "0") { trim--;}
		nS = nS.substr(0, trim);
	}

	for (var nSi = 0; nSi < nS.length-1; nSi++) {
		if ((new RegExp("[0-9]")).test(nS[nSi])){
			result += 0;
		} else {
			result += nS[nSi];
		}
	}
	result += "1";
	//put back the trimmed zeros
	while (trim < String(n).length) {
		result += "0";
		trim++;
	}

	return Number(result);
}