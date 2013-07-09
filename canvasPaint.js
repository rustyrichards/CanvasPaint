paint = {
	contextConfig: {lineWidth: 1, strokeStyle: "#000"},
	layers: [],
	currentLayer: -1,
	canvas: null,
	context: null,

	drawOnCanvas: function(event) {
		paint.context.clearRect (0, 0, paint.canvas.width, paint.canvas.height);
		if (0 <= paint.currentLayer && paint.layers.length > paint.currentLayer) {
			paint.layers[paint.currentLayer].mouseDrawPoint(event.layerX, event.layerY);
		}

		for (var i=0; i<paint.layers.length; i++) {
			paint.layers[i].draw();
		}
	},

	mouseDownOnCanvas: function(event) {
		if (0 <= paint.currentLayer && paint.layers.length > paint.currentLayer) {
			paint.layers[paint.currentLayer].mouseDown(event.layerX, event.layerY);
			paint.layers[paint.currentLayer].draw();
		}
	},

	mouseUpOnCanvas: function(event) {
		if (0 <= paint.currentLayer && paint.layers.length > paint.currentLayer) {
			paint.layers[paint.currentLayer].mouseUp(event.layerX, event.layerY);
		}

		for (var i=0; i<paint.layers.length; i++) {
			paint.layers[i].draw();
		}
	},

	keypressOnCanvas: function(event) {
		switch (event.charCode) {
			case 49: // '1' new SmoothCurves
				paint.currentLayer = paint.layers.length;
				paint.layers.push(new PaintLayer(smoothCurves));
				break;
			case 50: // '2' new StraightLines
				paint.currentLayer = paint.layers.length;
				paint.layers.push(new PaintLayer(straightLines));
				break;
			case 108: // 'l' new layer
				if (paint.layers.length) {
					paint.layers.push(new PaintLayer(paint.layers[paint.currentLayer].drawingSupport));
					paint.currentLayer = paint.layers.length-1;
				}
				break;
			case 112: // 'p' toggle the palette
				paint.palette.className = paint.palette.className.replace(/(\s*hidden)|($)/, function(match) {
					if (match && match.length) return '';
					return ' hidden';
				})
				break;
		}
	}
};

// handlers for the color separations
colorSep = {
	colors: [0, 0, 0],
	mouseDown: function(event) {
		var el = event.target;
		while (el && -1 == el.tabIndex ) el = el.parentElement;
		el.setAttribute('x-mouseisdown', 'true');
		el.setCapture(true);
		this.mouseMove(event);
	},
	mouseMove: function(event) {
		var el = event.target;
		while (el && -1 == el.tabIndex ) el = el.parentElement;
		if (el.getAttribute('x-mouseisdown')) {
			var colorVal =  Math.floor((255 * event.layerX) / el.offsetWidth + 0.5);
			var index = parseInt(el.className.replace(/[^0-9]*([0-9]).*/, '$1'), 10);
			var sampleColor = [0,0,0];
			sampleColor[index] = colorVal;
			this.colors[index] = colorVal;
			el.firstElementChild.style.left = event.layerX -2 + 'px';
			document.getElementById("color-display"+index).style.backgroundColor = 'rgb(' + sampleColor[0] + ',' +
				sampleColor[1] + ',' + sampleColor[2] + ')';
			var color = 'rgb(' + this.colors[0] + ',' + this.colors[1] + ',' + this.colors[2] + ')';
			document.getElementById("color-display").style.backgroundColor = color;
			paint.contextConfig.strokeStyle = color;
			if (0 <= paint.currentLayer) paint.layers[paint.currentLayer].contextConfig.strokeStyle = color;
			paint.drawOnCanvas({});
		}
	},
	mouseUp: function(event) {
		var el = event.target;
		while (el && -1 == el.tabIndex ) el = el.parentElement;
		el.setAttribute('x-mouseisdown', '')
	}
};

/**
 *
 */
function PaintLayer(drawingSupport, opt_context, opt_contextConfig) {
	this.drawingOn = false;

	/**
	 * context drawing methods
	 */
	this.cmds = [];

	/**
	 * coordinate parameters to the drawing method
	 */
	this.coordinates = [];

	/**
	 * The last few points if needed for drawing
	 */
	this.lastPoints = [];

	this.drawingSupport = drawingSupport;

	if (!opt_context) opt_context = paint.context;
	this.context = opt_context;

	if (!opt_contextConfig) opt_contextConfig = paint.contextConfig;
	this.contextConfig = {}
	for (var i in opt_contextConfig) this.contextConfig[i] = opt_contextConfig[i];

	this.drawingSupport.startPaintLayer(this);
};

/**
 * Add or replace a command with coordinates
 */
PaintLayer.prototype.addCommand = function(cmd, coordinates, opt_replaceLast) {
	if (opt_replaceLast) {
		if (cmd) this.cmds.pop();
		if (coordinates) this.coordinates.pop();
	}
	if (cmd) this.cmds.push(cmd);
	if (coordinates) this.coordinates.push(coordinates);

};

/**
 * Replace the coordinates of the last command
 */
PaintLayer.prototype.replaceCoordinates = function(coordinates) {
	this.coordinates.pop();
	this.coordinates.push(coordinates);

};

/**
 * drawing has pairs of drawing commands and coordinates
 */
PaintLayer.prototype.mouseDrawPoint = function(x, y) {
	if (this.drawingOn) this.drawingSupport.mouseDrawPoint(this, x, y);
};

PaintLayer.prototype.mouseDown = function(x, y) {
	this.drawingOn = true;

	this.drawingSupport.mouseDown(this, x, y);
};

PaintLayer.prototype.mouseUp = function(x, y) {
	this.drawingOn = false;

	this.drawingSupport.mouseUp(this, x, y);
};

/**
 * Draw the layer 
 */
PaintLayer.prototype.draw = function() {
	this.context.beginPath();
	for (var i=0; i<this.cmds.length; i++) {
		this.cmds[i].apply(this.context, this.coordinates[i]);
	}
	for (var i in this.contextConfig) {
		this.context[i] = this.contextConfig[i];
	}
	this.context.stroke();
};

/**
 * Draw smooth curves using besier, quadratic, ro line as appropriate.
 */
function SmoothCurves() {};

/**
 * The last 2 points for drawing
 */
SmoothCurves.prototype.startPaintLayer = function(paintLayer) {
	paintLayer.lastPoints = [-1, -1, -1, -1];
};

SmoothCurves.prototype.mouseDown = function(paintLayer, x, y) {
	// First point do a moveTo
	paintLayer.lastPoints = [-1, -1, x, y];
	paintLayer.addCommand(paintLayer.context.moveTo, paintLayer.lastPoints.slice(2));
};

SmoothCurves.prototype.mouseUp = function(paintLayer, x, y) {
};

SmoothCurves.prototype.mouseDrawPoint = function(paintLayer, x, y) {
	// If the distance from the first to the second point is much grater than the distance from the first to the third
	// point then we have an acute angle, so it should be be kept sharp; don't do a spline curve.
	var magnitude01 = Math.sqrt(Math.pow(paintLayer.lastPoints[0] - paintLayer.lastPoints[2], 2) + 
			Math.pow(paintLayer.lastPoints[1] - paintLayer.lastPoints[3], 2));
	var magnitude02x2 = Math.sqrt(Math.pow(paintLayer.lastPoints[0] - x, 2) + 
			Math.pow(paintLayer.lastPoints[1] - y, 2)) * 2.0;

	var canSmoothOut = -1 == paintLayer.lastPoints[0] || magnitude01 > magnitude02x2;

	if (canSmoothOut && paintLayer.cmds[paintLayer.cmds.length -1] == paintLayer.context.lineTo) {
		paintLayer.lastPoints.shift();
		paintLayer.lastPoints.shift();
		paintLayer.lastPoints.push(x, y);
		paintLayer.addCommand(paintLayer.context.quadraticCurveTo, paintLayer.lastPoints.slice(0), true);	//Dup the array the 2 points for the spline curve
		console.log("quadraticCurveTo " + paintLayer.lastPoints);
	} else if (canSmoothOut && paintLayer.cmds[paintLayer.cmds.length -1] == paintLayer.context.quadraticCurveTo) {
		paintLayer.lastPoints.push(x, y);
		paintLayer.addCommand(paintLayer.context.bezierCurveTo, paintLayer.lastPoints.slice(0), true);	//Dup the array the 3 points for the spline curve
		console.log("bezierCurveTo " + paintLayer.lastPoints);
		paintLayer.lastPoints.shift();
		paintLayer.lastPoints.shift();
		paintLayer.lastPoints[0] = paintLayer.lastPoints[1] = -1;	// Consume the used up points
	} else {
		// Just a lineto
		paintLayer.addCommand(paintLayer.context.lineTo, [x, y]);
		paintLayer.lastPoints.shift();
		paintLayer.lastPoints.shift();
		paintLayer.lastPoints.push(x, y);
		console.log("lineTo " + x + " " +y);
	}
}

smoothCurves = new SmoothCurves();

/**
 * Draw straight lines 
 */
StraightLines = function() {};

StraightLines.prototype.startPaintLayer = function(paintLayer) {
};

StraightLines.prototype.mouseDown = function(paintLayer, x, y) {
	// First point add a moveTo all other times add a lineTo
	if (!paintLayer.cmds.length) paintLayer.addCommand(paintLayer.context.moveTo, [x, y]);
	paintLayer.addCommand(paintLayer.context.lineTo, [x, y]);
};

StraightLines.prototype.mouseUp = function(paintLayer, x, y) {
};

StraightLines.prototype.mouseDrawPoint = function(paintLayer, x, y) {
	if (paintLayer.cmds[paintLayer.cmds.length -1] == paintLayer.context.lineTo) {
		paintLayer.replaceCoordinates([x, y]);	// Replace the last line
	} else {
		paintLayer.addCommand(paintLayer.context.lineTo, [x, y]);
	}
}

straightLines = new StraightLines();


function paintInit() {
	paint.palette = document.getElementById("command-palette");
	paint.canvas = document.getElementById("drawing-area");
	paint.context = paint.canvas.getContext("2d");
	if (!paint.layers.length) {
		paint.currentLayer = 0;
		paint.layers.push(new PaintLayer(new SmoothCurves()));
	}

	paint.canvas.width = document.body.offsetWidth;
	paint.canvas.height = document.body.offsetHeight;
};

