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
			if ('onmouseup' == i) onmouseupSet = true;
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
		for (var i in this.handlers) window['on' + i] = null;
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

// contextConfig conventions
//		All members that begin with _ do not get set to the canvas.context

paint = {
	contextConfig: {lineWidth: 1, strokeStyle: "rgb(0, 0, 0)", lineCap: "butt", _gridSpacing: 0},
	layers: [],
	currentLayer: -1,
	canvas: null,
	context: null,

	init: function() {
		window.onkeypress = function(event) {this.paletteKey(event);}
		this.palette = document.getElementById("command-palette");
		this.canvas = document.getElementById("drawing-area");
		this.context = this.canvas.getContext("2d");
		if (!this.layers.length) {
			this.currentLayer = 0;
			this.layers.push(new PaintLayer(smoothCurves));
		}

		this.canvas.width = document.body.offsetWidth;
		this.canvas.height = document.body.offsetHeight;
	},
	getCurrentLayer: function() {
		var layer = null;
		if (-1 < this.currentLayer) layer = this.layers[this.currentLayer];
		return layer;
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
	paletteKey: function(event) {
		if ( 27 == event.keyCode) {
			this.palette.className = this.palette.className.replace(/(\s*hidden)|($)/, function(match) {
					if (match && match.length) {
						palette.init();
						return '';
					}
					return ' hidden';
			});
			event.stopPropagation();
		}
	},
	setContextConfig: function(cfg, opt_skipErase) {
		for (var i in cfg) {
			this.contextConfig[i] = cfg[i];
			if (0 <= this.currentLayer) {this.layers[this.currentLayer].contextConfig[i] = cfg[i]}
		}
		this.redraw(opt_skipErase);
	},
	save: function() {
		var temp = [];
		for (var i=0; i<this.layers.length; i++) temp.push(this.layers[i].toSaveObj());

		window.localStorage.setItem('paint', JSON.stringify(temp));
	},
	load: function() {
		var objStr = window.localStorage.getItem('paint');
		if (objStr) {
			var array = JSON.parse(objStr);
			if (array && array.length) {
				this.layers = [];
				for (var i=0; i<array.length; i++) {
					this.layers.push(new PaintLayer(array[i]));
				}
				this.currentLayer = array.length - 1;

				var lastPaintContext = array[array.length - 1].contextConfig;
				for (var i in lastPaintContext) this.contextConfig[i] = lastPaintContext[i];

				this.redraw(true);
			}
		}
	}
};

// handlers for the color separations
palette = {
	colors: [0, 0, 0],
	noReinter: false,
	init: function() {
		var context = this;
		paint.contextConfig.strokeStyle.replace(/(\d+)\D+(\d+)\D+(\d+)/, function(match, r, g, b) {
			for (var i=0; i<3; i++) {
				context.adjustColor(document.getElementById("color-display"+i), 
						arguments[i+1], i, true);
			}
		});
		document.getElementById("line_width").value = paint.contextConfig.lineWidth;
		document.getElementById("line_cap").value = paint.contextConfig.lineCap;
		document.getElementById("drawing_tool").value = paint.getCurrentLayer().getDrawingToolName();

		// Must layout to update the positions.
		var context = this;
		window.setTimeout(function() {
			context.adjustSlider();
		}, 0);
	},
	mouseDown: function(event) {
		var el = event.target;
		capture.set(event, el, {mousemove: palette.mouseMove}, palette);
		this.mouseMove(el, el.button, event.layerX, event.layerY);
	},
	mouseMove: function(el, button, x, y) {
		if (el.offsetWidth < x) {
			debugger;
		}
		var colorVal =  Math.floor((255.99 * x) / el.offsetWidth);
		var index = parseInt(el.className.replace(/[^0-9]*([0-9]).*/, '$1'), 10);
		var sampleColor = [0,0,0];
		el.firstElementChild.style.left = x -2 + 'px';
		var colorDisplay = document.getElementById("color-display"+index);
		colorDisplay.value = colorVal;
		this.adjustColor(colorDisplay, colorVal, index);
	},
	colorSepChanged: function(event) {
		var el = event.target;
		var colorVal =  el.value;
		var index = parseInt(el.id.replace(/[^0-9]*([0-9]).*/, '$1'), 10);
		event.preventDefault();
		this.adjustColor(document.getElementById("color-display"+index), colorVal, index);
	},
	adjustSlider: function(opt_index) {
		var i = opt_index || 0;
		for (var i = opt_index || 0; i <= (opt_index || 2); i++ ) {
			var slider = document.getElementById("sep-slider" + i);
			if (!slider.parentNode.offsetWidth) return false;	// Not layed out!

			var sliderPos = parseInt(slider.style.left, 10) + 2;
			var currentColorVal =  Math.floor((255.99 * sliderPos) / slider.parentNode.offsetWidth);
			if (currentColorVal != this.colors[i]) {
				var pos = Math.floor(this.colors[i] * slider.parentNode.offsetWidth / 255.99);
				slider.style.left = pos - 2 + "px";
			}
		}
		return true;
	},
	adjustColor: function(el, colorVal, index, opt_paletteOnly) {
		var sampleColor = [0,0,0];
		sampleColor[index] = this.colors[index] = colorVal;
		if (el.value != colorVal) el.value = colorVal;
		el.style.backgroundColor = 'rgb(' + sampleColor[0] + ',' +
			sampleColor[1] + ',' + sampleColor[2] + ')';
		var color = 'rgb(' + this.colors[0] + ',' + this.colors[1] + ',' + this.colors[2] + ')';

		this.adjustSlider(index);

		document.getElementById("color-display").style.backgroundColor = color;
		if (!opt_paletteOnly) paint.setContextConfig({strokeStyle: color}, true);
	},
	// handlers for line styles
	changed: function(event, name) {
		var config = {};
		config[name] = event.target.value;
		paint.setContextConfig(config);
	},
	newLayer: function(event) {
		var drawingToolName = event.target.value;
		var current = paint.layers[paint.currentLayer].drawingTool.name;
		if (current != drawingToolName) {
			if (drawingToolName == '-new-') drawingToolName = current;
			paint.layers.push(new PaintLayer(drawingSupportByName[drawingToolName]));
			paint.currentLayer = paint.layers.length - 1;
		}
	}
};

/**
 *
 */
function PaintLayer(drawingSupportOrSave, opt_context, opt_contextConfig) {
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

	if (drawingSupportOrSave.cmds && drawingSupportOrSave.coordinates) {
		// Convert the strings back to function pointers
		var cmds = drawingSupportOrSave.cmds;
		for (var i=0; i<cmds.length; i++) this.cmds.push(paint.context[cmds[i]]);

		this.coordinates = drawingSupportOrSave.coordinates;
		this.lastPoints = drawingSupportOrSave.lastPoints;
		this.gridSpacing = drawingSupportOrSave.gridSpacing;
		opt_contextConfig = drawingSupportOrSave.contextConfig;
		this.drawingTool = drawingSupportByName[drawingSupportOrSave.name];
	} else {
		this.drawingTool = drawingSupportOrSave;
	}

	if (!opt_contextConfig) opt_contextConfig = paint.contextConfig;
	this.contextConfig = {}
	for (var i in opt_contextConfig) this.contextConfig[i] = opt_contextConfig[i];

	if (!opt_context) opt_context = paint.context;
	this.context = opt_context;

	this.drawingTool.startPaintLayer(this);
};

PaintLayer.prototype.getDrawingToolName = function() {
	return this.drawingTool ? this.drawingTool.name : '';
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
	if (this.drawingOn) {
		var coord = Array.prototype.slice.call(arguments, 1);
		this.adjustCoordinates(coord);

		this.drawingTool.mouseDrawPoint(this, button, coord[0], coord[1]);
	}
};

PaintLayer.prototype.adjustCoordinates = function(coord) {
	var spacing = this.contextConfig._gridSpacing;
	if (spacing) {
		for (var i=0; i<coord.length; i++) {
			var adj = coord[i] % spacing;
			if (adj + adj < spacing) coord[i] -= adj;
			else coord[i] += spacing - adj;
		}
	}
};

PaintLayer.prototype.mouseDown = function(button, x, y) {
	this.drawingOn = true;

	var coord = Array.prototype.slice.call(arguments, 1);
	this.adjustCoordinates(coord);

	this.drawingTool.mouseDown(this, button, coord[0], coord[1]);
};

PaintLayer.prototype.mouseUp = function(button, x, y) {
	if (0 == button) this.drawingOn = false;

	var coord = Array.prototype.slice.call(arguments, 1);
	this.adjustCoordinates(coord);

	this.drawingTool.mouseUp(this, button, coord[0], coord[1]);
};

/**
 * Draw the layer 
 */
PaintLayer.prototype.draw = function() {
	this.drawingTool.startLayer(this);
	for (var i=0; i<this.cmds.length; i++) {
		this.cmds[i].apply(this.context, this.coordinates[i]);
	}
	for (var i in this.contextConfig) {
		if (i[0] != '_') this.context[i] = this.contextConfig[i];
	}
	this.drawingTool.endLayer(this);
};

/**
 * Generate the data to store.
 */
PaintLayer.prototype.toSaveObj = function() {
	var convertedCommands = [];
	for (var i=0; i<this.cmds.length; i++) {
		convertedCommands.push(this.cmds[i].name);
	}
	return {cmds: convertedCommands, coordinates: this.coordinates,
			lastPoints: this.lastPoints, contextConfig: this.contextConfig,
			name: this.drawingTool.name};
};


/**
 * Draw smooth curves using besier, quadratic, ro line as appropriate.
 */
smoothCurves = {
	name: 'SmoothCurves',
	/**
	 * The last 2 points for drawing
	 */
	startPaintLayer: function(paintLayer) {
		paintLayer.lastPoints = [-1, -1, -1, -1];
	},

	mouseDown: function(paintLayer, button, x, y) {
		// First point do a moveTo
		paintLayer.lastPoints = [-1, -1, x, y];
		paintLayer.addCommand(paintLayer.context.moveTo, paintLayer.lastPoints.slice(2));
	},

	mouseUp: function(paintLayer, button, x, y) {
	},

	mouseDrawPoint: function(paintLayer, button, x, y) {
		// If the distance from the first to the second point is grater than the distance from the first to the third
		// point then we have an acute angle, so it should be be kept sharp; don't do a spline curve.
		var magnitude01 = Math.sqrt(Math.pow(paintLayer.lastPoints[0] - paintLayer.lastPoints[2], 2) + 
				Math.pow(paintLayer.lastPoints[1] - paintLayer.lastPoints[3], 2));
		var magnitude02x2 = Math.sqrt(Math.pow(paintLayer.lastPoints[0] - x, 2) + 
				Math.pow(paintLayer.lastPoints[1] - y, 2));

		var canSmoothOut = -1 != paintLayer.lastPoints[0] || magnitude01 < magnitude02x2;

		if (canSmoothOut && paintLayer.cmds[paintLayer.cmds.length -1] == paintLayer.context.lineTo) {
			paintLayer.lastPoints.shift();
			paintLayer.lastPoints.shift();
			paintLayer.lastPoints.push(x, y);
			paintLayer.addCommand(paintLayer.context.quadraticCurveTo, paintLayer.lastPoints.slice(0), true);	//Dup the array the 2 points for the spline curve
		} else if (canSmoothOut && paintLayer.cmds[paintLayer.cmds.length -1] == paintLayer.context.quadraticCurveTo) {
			paintLayer.lastPoints.push(x, y);
			paintLayer.addCommand(paintLayer.context.bezierCurveTo, paintLayer.lastPoints.slice(0), true);	//Dup the array the 3 points for the spline curve
			paintLayer.lastPoints.shift();
			paintLayer.lastPoints.shift();
			paintLayer.lastPoints[0] = paintLayer.lastPoints[1] = -1;	// Consume the used up points
		} else {
			// Just a lineto
			paintLayer.addCommand(paintLayer.context.lineTo, [x, y]);
			paintLayer.lastPoints.shift();
			paintLayer.lastPoints.shift();
			paintLayer.lastPoints.push(x, y);
		}
	},

	startLayer: function(paintLayer) {
		paintLayer.context.beginPath();
	},
	endLayer: function(paintLayer) {
		paintLayer.context.stroke();
	}
};

/**
 * Draw straight lines 
 */
straightLines = {
	name: 'StraightLines',

	startPaintLayer: function(paintLayer) {
	},

	mouseDown: function(paintLayer, button, x, y) {
		// First point add a moveTo all other times add a lineTo
		if (0 == button) {
			paintLayer.addCommand(paintLayer.context.moveTo, [x, y]);
		} else {
			paintLayer.addCommand(paintLayer.context.lineTo, [x, y]);
		}
	},

	mouseUp: function(paintLayer, button, x, y) {
	},

	mouseDrawPoint: function(paintLayer, button, x, y) {
		if (paintLayer.cmds[paintLayer.cmds.length - 1] == paintLayer.context.lineTo) {
			paintLayer.replaceCoordinates([x, y]);	// Replace the last line
		} else {
			paintLayer.addCommand(paintLayer.context.lineTo, [x, y]);
		}
	},

	startLayer: function(paintLayer) {
		paintLayer.context.beginPath();
	},
	endLayer: function(paintLayer) {
		paintLayer.context.stroke();
	}
};

drawingSupportByName = {};
drawingSupportByName[smoothCurves.name] = smoothCurves;
drawingSupportByName[straightLines.name] = straightLines;



function paintInit() {
	window.onkeydown = function(event) {paint.paletteKey(event);}
	paint.palette = document.getElementById("command-palette");
	paint.canvas = document.getElementById("drawing-area");
	paint.context = paint.canvas.getContext("2d");
	if (!paint.layers.length) {
		paint.currentLayer = 0;
		paint.layers.push(new PaintLayer(smoothCurves));
	}

	paint.canvas.width = document.body.offsetWidth;
	paint.canvas.height = document.body.offsetHeight;

	paint.load();
};

