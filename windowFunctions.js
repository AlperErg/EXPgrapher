function copyTable() {
	var rows = [];
	var sourceRows = Array.isArray(window.dataset) ? window.dataset : [];

	for (var copyRow = 0; copyRow < sourceRows.length; copyRow++) {
		var row = sourceRows[copyRow];
		if (!row) {
			continue;
		}

		var values = [row.litx, row.litdx, row.lity, row.litdy];
		for (var i = 0; i < values.length; i++) {
			if (values[i] == null) {
				values[i] = "";
			} else {
				values[i] = String(values[i]);
			}
		}

		if ((values[0] + values[1] + values[2] + values[3]).trim() === "") {
			continue;
		}

		rows.push(values.join("\t"));
	}

	copyToClipboard(rows.join("\n"));
	popupSnackbar("Table Copied!");
}

function saveGraph() {
	//get the base64 image of the graph
	var graph = $("#graphCanvas")[0].toDataURL();

	//save the file
	saveBase64AsFile(graph, `${window.graphTitle}.png`);
}

function saveBase64AsFile(base64, fileName) {
	var link = document.createElement("a");

	document.body.appendChild(link); //for firefox

	link.setAttribute("href", base64);
	link.setAttribute("download", fileName);
	link.click();
}

//Reminder. This code and website linked below is licensed under CC BY-NC-SA 4.0 . Modify accordingly.
function copyDoc() {
	try {
		var url = new URL("https://graph.ergune.dev");
		//load the data item by item
		url.searchParams.append("dataLength", window.dataset.length);
		for (var copyRow = 0; copyRow < window.dataset.length; copyRow++) {
			url.searchParams.append("x" + copyRow, window.dataset[copyRow].litx);
			url.searchParams.append("dx" + copyRow, window.dataset[copyRow].litdx);
			url.searchParams.append("y" + copyRow, window.dataset[copyRow].lity);
			url.searchParams.append("dy" + copyRow, window.dataset[copyRow].litdy);
		}
		//add the labels
		url.searchParams.append("graphTitle", window.graphTitle);
		url.searchParams.append("graphXAxis", window.graphXAxis);
		url.searchParams.append("graphYAxis", window.graphYAxis);
		url.searchParams.append("graphXAxisUnits", window.graphXAxisUnits);
		url.searchParams.append("graphYAxisUnits", window.graphYAxisUnits);
		url.searchParams.append("graphXSymbol", window.graphXSymbol);
		url.searchParams.append("graphYSymbol", window.graphYSymbol);

		//add the trendlines:
		for (var lineOrder = 1; lineOrder <= 3; lineOrder++) {
			var line = window.allData[lineOrder];//allData[1] is the trendline, 2 and 3 are the max and min lines
			url.searchParams.append("line"+lineOrder+"data0x", line.data[0].x);
			url.searchParams.append("line"+lineOrder+"data0y", line.data[0].y);
			url.searchParams.append("line"+lineOrder+"data1x", line.data[1].x);
			url.searchParams.append("line"+lineOrder+"data1y", line.data[1].y);
		}
		return url.href;
	} catch (err) {
		window.alert("Error: " + err);
	}
}


function copyToClipboard(text) {
	const listener = function(ev) {
		ev.preventDefault();
		ev.clipboardData.setData("text/plain", text);
	};
	document.addEventListener("copy", listener);
	document.execCommand("copy");
	document.removeEventListener("copy", listener);

}

function popupSnackbar(msg) {
	//make a short message appear at the bottom of the screen
	var snack = document.getElementById("snackbar");
	snack.innerHTML = msg;

	// Add the "show" class to DIV
	snack.className = "show";

	// After 3 seconds, remove the show class from DIV
	setTimeout(function(){ snack.className = snack.className.replace("show", ""); }, 3000);
}
