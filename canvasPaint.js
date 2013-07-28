/**********
Tested events
	onmousemove
	onmouseup
**********/
capture = {
	element: null,
	handlers: {},
	xOffset: 0,
	yOffset: 0,

	set: function(event, element, handlers, opt_context) {
		event.preventDefault();	// No selecting while capturing!

		this.xOffset = event.screenX - event.layerX;
		this.yOffset = event.screenY - event.layerY;

		var context = opt_context || window;

		// hook all on... functions
		this.handlers = handlers;

		var onmouseupSet = false;
		for (var i in handlers) {
			window['on' + i] = function(ev) {capture.eventWrap(ev, context);};
			if ('mouseup' == i) onmouseupSet = true;
		}
		if (!onmouseupSet) {
			window.onmouseup = function(event) {capture.eventWrap(event);};
			this.handlers['mouseup'] = true;
		}
		if (!this.handlers['contextmenu']) {
			// Prevent the context menu
			window.oncontextmenu =  function (evt) {evt.preventDefault();};
			this.handlers['contextmenu'] = true;
		}

		this.element = element;

		if (-1 == this.element.className.search(/\bcapturing\b/)) {
			this.element.className = this.element.className + ' capturing';
		}
	},
	clear: function() {
		for (var i in this.handlers) window[i] = null;
		this.handlers = {};

		if (this.element && this.element.className) {
			this.element.className = this.element.className.replace(/\s*\bcapturing\b/, '');
		}
		this.element = null;
		xOffset = yOffset = -1;
	},
	adjustXAndY: function(x, y) {
		if (this.element) {
			x -= this.xOffset;
			if (0 > x) {
				x = 0;
			} else if (x > this.element.offsetWidth) {
				x = this.element.offsetWidth;
			}
			y -= this.yOffset;
			if (0 > y) {
				y = 0;
			} else if (y > this.element.offsetHeight) {
				y = this.element.offsetHeight;
			}
		}
		return [x, y];
	},
	eventWrap: function(event, opt_context) {
		var coord = ('layerX' in event) ? this.adjustXAndY(event.screenX, event.screenY) : [0, 0];
		var button = event.button || 0;
		try {
			if (opt_context) this.handlers[event.type].call(opt_context, this.element, button, coord[0], coord[1]);
		} catch (e) {
			// If the functions have gone away, clear the capture!
			this.clear();
			return;
		}
		event.preventDefault();

		if ('mouseup' == event.type && 0 == event.button) {
			this.clear();
		}
	}
};

paint = {
	contextConfig: {lineWidth: 1, strokeStyle: "#000", lineCap: "butt"},
	layers: [],
	currentLayer: -1,
	canvas: null,
	context: null,

	init: function() {
		window.onkeypress = function(event) {this.keypressOnCanvas(event);}
		this.palette = document.getElementById("command-palette");
		this.canvas = document.getElementById("drawing-area");
		this.context = this.canvas.getContext("2d");
		if (!this.layers.length) {
			this.currentLayer = 0;
			this.layers.push(new PaintLayer(new SmoothCurves()));
		}

		this.canvas.width = document.body.offsetWidth;
		this.canvas.height = document.body.offsetHeight;
	},
	redraw: function(opt_skipClear) {
		if (!opt_skipClear) this.context.clearRect (0, 0, this.canvas.width, this.canvas.height);

		for (var i=0; i<this.layers.length; i++) {
			this.layers[i].draw();
		}
	},
	mouseDownOnCanvas: function(event) {
		if (0 <= this.currentLayer && this.layers.length > this.currentLayer) {
			if (0 == event.button) {
				capture.set(event, this.canvas, {mousemove: this.drawOnCanvas, mouseup: this.mouseUpOnCanvas}, paint);
			}
			this.layers[this.currentLayer].mouseDown(event.button, event.layerX, event.layerY);
			this.layers[this.currentLayer].draw();
			event.preventDefault();
		}
	},
	paletteMouseDown: function(event) {
		// Don't let the event propigate to the canvas!
		event.stopPropagation();
	},
	drawOnCanvas: function(canvas, button, x, y) {
		this.context.clearRect (0, 0, canvas.width, canvas.height);
		if (0 <= this.currentLayer && this.layers.length > this.currentLayer) {
			this.layers[this.currentLayer].mouseDrawPoint(button, x, y);
		}

		for (var i=0; i<this.layers.length; i++) {
			this.layers[i].draw();
		}
	},
	mouseUpOnCanvas: function(canvas, button, x, y) {
		if (0 <= this.currentLayer && this.layers.length > this.currentLayer) {
			this.layers[this.currentLayer].mouseUp(button, x, y);
		}

		for (var i=0; i<this.layers.length; i++) {
			this.layers[i].draw();
		}
	},
	keypressOnCanvas: function(event) {
		switch (event.charCode) {
			case 49: // '1' new SmoothCurves
				this.currentLayer = this.layers.length;
				this.layers.push(new PaintLayer(smoothCurves));
				break;
			case 50: // '2' new StraightLines
				this.currentLayer = this.layers.length;
				this.layers.push(new PaintLayer(straightLines));
				break;
			case 108: // 'l' new layer
				if (this.layers.length) {
					this.layers.push(new PaintLayer(this.layers[this.currentLayer].drawingSupport));
					this.currentLayer = this.layers.length-1;
				}
				break;
			case 112: // 'p' toggle the palette
				this.palette.className = this.palette.className.replace(/(\s*hidden)|($)/, function(match) {
					if (match && match.length) return '';
					return ' hidden';
				})
				break;
		}
		event.stopPropagation();
	}
};

// handlers for the color separations
colorSep = {
	colors: [0, 0, 0],
	noReinter: false,
	mouseDown: function(event) {
		var el = event.target;
		capture.set(event, el, {mousemove: colorSep.mouseMove}, colorSep);
		this.mouseMove(el, event.layerX, event.layerY);
	},
	mouseMove: function(el, button, x, y) {
		if (el.offsetWidth < x) {
			debugger;
		}
		var colorVal =  Math.floor((255.99 * x) / el.offsetWidth);
		var index = parseInt(el.className.replace(/[^0-9]*([0-9]).*/, '$1'), 10);
		var sampleColor = [0,0,0];
		el.firstElementChild.style.left = x -2 + 'px';
		var colordisplay = document.getElementById("color-display"+index);
		colordisplay.value = colorVal;
		this.adjustColor(el, colorVal, index);
	},
	colorSepChanged: function(event) {
		var el = event.target;
		var colorVal =  el.value;
		var index = parseInt(el.id.replace(/[^0-9]*([0-9]).*/, '$1'), 10);
		event.preventDefault();
	},
	adjustColor: function(el, colorVal, index) {
		var sampleColor = [0,0,0];
		sampleColor[index] = this.colors[index] = colorVal;
		el.style.backgroundColor = 'rgb(' + sampleColor[0] + ',' +
			sampleColor[1] + ',' + sampleColor[2] + ')';
		var color = 'rgb(' + this.colors[0] + ',' + this.colors[1] + ',' + this.colors[2] + ')';
		document.getElementById("color-display").style.backgroundColor = color;
		paint.contextConfig.strokeStyle = color;
		if (0 <= paint.currentLayer) paint.layers[paint.currentLayer].contextConfig.strokeStyle = color;
		paint.redraw(true);
	}
};

// handlers for line styles
lineStyle = {
	widthChanged: function(event) {
		var el = event.target;
		paint.contextConfig.lineWidth = el.value;
		if (0 <= paint.currentLayer) paint.layers[paint.currentLayer].contextConfig.lineWidth = paint.contextConfig.lineWidth;
		paint.redraw();
	},
	capChanged: function(event) {
		var el = event.target;
		paint.contextConfig.lineCap = el.value;
		if (0 <= paint.currentLayer) paint.layers[paint.currentLayer].contextConfig.lineCap = paint.contextConfig.lineCap;
		paint.redraw();
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
PaintLayer.prototype.mouseDrawPoint = function(button, x, y) {
	if (this.drawingOn) this.drawingSupport.mouseDrawPoint(this, button, x, y);
};

PaintLayer.prototype.mouseDown = function(button, x, y) {
	this.drawingOn = true;

	this.drawingSupport.mouseDown(this, button, x, y);
};

PaintLayer.prototype.mouseUp = function(button, x, y) {
	if (0 == button) this.drawingOn = false;

	this.drawingSupport.mouseUp(this, button, x, y);
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

SmoothCurves.prototype.mouseDown = function(paintLayer, button, x, y) {
	// First point do a moveTo
	paintLayer.lastPoints = [-1, -1, x, y];
	paintLayer.addCommand(paintLayer.context.moveTo, paintLayer.lastPoints.slice(2));
};

SmoothCurves.prototype.mouseUp = function(paintLayer, button, x, y) {
};

SmoothCurves.prototype.mouseDrawPoint = function(paintLayer, button, x, y) {
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
};

smoothCurves = new SmoothCurves();

/**
 * Draw straight lines 
 */
StraightLines = function() {};

StraightLines.prototype.startPaintLayer = function(paintLayer) {
};

StraightLines.prototype.mouseDown = function(paintLayer, button, x, y) {
	// First point add a moveTo all other times add a lineTo
	if (0 == button) {
		paintLayer.addCommand(paintLayer.context.moveTo, [x, y]);
	} else {
		paintLayer.addCommand(paintLayer.context.lineTo, [x, y]);
	}
};

StraightLines.prototype.mouseUp = function(paintLayer, button, x, y) {
};

StraightLines.prototype.mouseDrawPoint = function(paintLayer, button, x, y) {
	if (paintLayer.cmds[paintLayer.cmds.length - 1] == paintLayer.context.lineTo) {
		paintLayer.replaceCoordinates([x, y]);	// Replace the last line
	} else {
		paintLayer.addCommand(paintLayer.context.lineTo, [x, y]);
	}
};

straightLines = new StraightLines();


function paintInit() {
	window.onkeypress = function(event) {paint.keypressOnCanvas(event);}
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

