/**********
canvasPaint.js
	This is the framework for the canvas based paint component.  The paint tools are implemented by plugins.
**********/

drawingToolByName = {};

function log() {
	if (console && console.log) {
		for (var i =0; i<arguments.length; i++) console.log(arguments[i]);
	}
}

function logError(err) {
	var errorStr = '';
	if (err.message) {
		errorStr = err.message
	} else if (err.toString) {
		errorStr = err.toString();
	}
	if (err.fileName) errorStr += '  FileName: ' + err.fileName;
	if (err.lineNumber) errorStr += '  Line: ' + err.lineNumber;
	if (err.columnNumber) errorStr += '  Col: ' + err.columnNumber;

	log(errorStr);
};

function cloneOneLevel(obj) {
	var clone = {};
	for (var i in obj) clone[i] = obj[i];
	return clone;
}


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

		if (event.targetTouches && event.targetTouches.length) {
			var touch = event.targetTouches[0];
			if (!event.button) event.button = event.targetTouches.length -1;
			this.xOffset = touch.screenX - touch.clientX;
			this.yOffset = touch.screenY - touch.clientY;
		} else {
			this.xOffset = event.screenX - event.layerX;
			this.yOffset = event.screenY - event.layerY;
		}

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
		var x = event.screenX;
		var y = event.screenY;
		if (event.targetTouches && event.targetTouches.length) {
			var touch = event.targetTouches[0];
			if (!event.button) event.button = event.targetTouches.length -1;
			x = touch.screenX;
			y = touch.screenY;
		}
		var coord = ('layerX' in event) ? this.adjustXAndY(x, y) : [0, 0];
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
	},
	isSetForElement: function(element) {
		return this.element == element;
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

	init: function(toolName) {
		window.onkeydown = paint.paletteKey.bind(paint);
		this.palette = document.getElementById("command-palette");
		this.canvas = document.getElementById("drawing-area");
		this.context = this.canvas.getContext("2d");
		if (!this.layers.length) {
			this.currentLayer = 0;
			this.layers.push(new PaintLayer(drawingToolByName[toolName]));
		}

		this.canvas.width = document.body.offsetWidth;
		this.canvas.height = document.body.offsetHeight;

		this.load();
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
			var x = event.layerX;
			var y = event.layerY;
			if (event.targetTouches && event.targetTouches.length) {
				if (3 <= event.targetTouches.length) {
					// Patch for touch - 3 point touch will toggle the palette
					this.showPalette();
					event.preventDefault();
					return;
				}
				var touch = event.targetTouches[0];
				if (!event.button) event.button = event.targetTouches.length - 1;
				// HACK for second press down - pretend it is button #1
				if (!event.button && capture.isSetForElement(event.target)) event.button = 1;
				x = touch.clientX;
				y = touch.clientY;
			}
			if (0 == event.button) {
				capture.set(event, this.canvas, {mousemove: this.drawOnCanvas, mouseup: this.mouseUpOnCanvas,
						touchmove: this.drawOnCanvas, touchend: this.mouseUpOnCanvas}, paint);
			}
			this.layers[this.currentLayer].mouseDown(event.button, x, y);
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
	showPalette: function() {
		var context = this;
		this.palette.className = this.palette.className.replace(/(\s*hidden)|($)/, function(match) {
			if (match && match.length) {
				var layer = context.getCurrentLayer();
				var toolName = (layer) ? layer.getDrawingToolName() : '';
				palette.resetForDrawingTool(toolName);
				return '';
			}
			return ' hidden';
		});
	},
	paletteKey: function(event) {
		switch (event.keyCode) {
			case 27:
				this.showPalette();
				event.stopPropagation();
				break;
			case 90: 	// Ctrl+z
				if (event.ctrlKey) {
					var layer = this.getCurrentLayer();
					if (layer) {
						layer.undo();
						event.stopPropagation();
					}
				}
				break;
			case 89: 	// Ctrl+y
				if (event.ctrlKey) {
					var layer = this.getCurrentLayer();
					if (layer) {
						layer.redo();
						event.stopPropagation();
					}
				}
				break;
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
	},
	eraseAll: function() {
		var drawingTool = this.getCurrentLayer();
		drawingTool = (drawingTool) ? drawingTool.drawingTool : drawingToolByName['SmoothCurves'];
		this.layers = [];
		this.layers.push(new PaintLayer(drawingTool));

		this.redraw();
	}
};

// Palette has a lot of color contorl handling. It may be better to separate the color control handling out.
// handlers for the color separations
palette = {
	colors: [0, 0, 0],
	noReinter: false,
	colorPaletteMarkup: 
		'<div>'+
			'<label class="label" for="color_for">Color For: </label>'+
			'<select id="color_for" value="strokeStyle" onchange="palette.setColorDestination(event);">'+
			'</select>'+
		'</div>'+
		'<div class="color-table">'+
			'<div id="color-sep-frame" class="color-sep-frame">'+
				'<div class="color-sep-container">'+
					'<div class="color-sep-bar sep0" tabindex="3" onmousedown="palette.mouseDown(event);">'+
						'<div id="sep-slider0" class="color-sep-slider"></div>'+
					'</div>'+
					'<input id="color-display0" class="color-sep-sample" type="number" min="0" max="255" value ="1"'+
					'oninput="palette.colorSepChanged(event);"/>'+
				'</div>'+
				'<div class="color-sep-container">'+
					'<div class="color-sep-bar sep1" tabindex="4" onmousedown="palette.mouseDown(event);">'+
						'<div id="sep-slider1" class="color-sep-slider"></div>'+
					'</div>'+
					'<input id="color-display1" class="color-sep-sample" type="number" min="0" max="255" value ="1"'+
					'oninput="palette.colorSepChanged(event);"/>'+
				'</div>'+
				'<div class="color-sep-container">'+
					'<div class="color-sep-bar sep2" tabindex="5" onmousedown="palette.mouseDown(event);">'+
						'<div id="sep-slider2" class="color-sep-slider"></div>'+
					'</div>'+
					'<input id="color-display2" class="color-sep-sample" type="number" min="0" max="255" value ="1"'+
					'oninput="palette.colorSepChanged(event);"/>'+
				'</div>'+
			'</div>'+
			'<div id="color-display" class="color-sep-sample large"></div>'+
		'</div>',

	makePaletteMarkupString: function(item) {
		var markup = '';
		if (item) {
			if (('string' != typeof item) && (0 < item.length)) {
				// 0 < item.length - non empty and array like 
				for (var i=0; i<item.length; i++) markup += this.makePaletteMarkupString(item[i]);
			} else if ('function' == typeof item) {
				// A function call it and send its result through makePaletteMarkupString.
				markup += this.makePaletteMarkupString(item());
			} else {
				try {
					markup += item.toString(10);
				} catch (e) {logError(e)}
			}
		}
		return markup;
	},

	resetForDrawingTool: function(drawintToolName) {
		try {
			var tool = drawingToolByName[drawintToolName];
			var content = '<option value="-new-">New Layer</option>';
			for (var i in drawingToolByName) {
				content += '<option value="' + i + '">' + i + '</option>';
			}
			var drawingToolElement = document.getElementById('drawing_tool')
			drawingToolElement.innerHTML = content;

			var layer = paint.getCurrentLayer();
			var toolName = (layer) ? layer.getDrawingToolName() : '';
			drawingToolElement.value = toolName

			document.getElementById('palettePluginContent').innerHTML = this.makePaletteMarkupString(tool.paletteMarkup);
			tool.paletteInit();
		} catch (e) {logError(e)}

	},

	/*
	 * Adjust the conor on a changed color property.
	 */
	initNewColorProperty: function(colorProperty) {
		var context = this;
		paint.contextConfig[colorProperty].replace(/(\d+)\D+(\d+)\D+(\d+)/, function(match, r, g, b) {
			for (var i=0; i<3; i++) {
				context.adjustColor(document.getElementById("color-display"+i), 
						arguments[i+1], i, true);
			}
		});

		// Must layout to update the positions.
		window.setTimeout(this.adjustSlider.bind(this), 0);
	},

	setColorDestination: function(event) {
		var colorProperty = event.target.value;
		this.initNewColorProperty(colorProperty);
	},
	/*
	 * contextColors string or an array of cavas context color settings.
	 */
	initColorControl: function(contextColors) {
		if ('string' == typeof contextColors) contextColors = [contextColors];

		this.initNewColorProperty(contextColors[0]);

		var options = '';
		for (var i=0; i<contextColors.length; i++) {
			options += '<option value="' + contextColors[i] + '">' + contextColors[i] + '</option>';
		}

		var colorForElement = document.getElementById('color_for');
		colorForElement.innerHTML = options;
		colorForElement.value = contextColors[0];

	},
	mouseDown: function(event) {
		var el = event.target;
		capture.set(event, el, {mousemove: palette.mouseMove, touchmove: this.drawOnCanvas}, palette);
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
		// The palette may not exist!
		if (document.getElementById('color-sep-frame')) {
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
		}
		return false;
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
		if (!opt_paletteOnly) {
			var contextConfig = {};
			contextConfig[document.getElementById('color_for').value] = color;
			paint.setContextConfig(contextConfig, true);
		}
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
			var isSame = false;
			if (drawingToolName == '-new-') {
				isSame = true;
				drawingToolName = current;
			}
			paint.layers.push(new PaintLayer(drawingToolByName[drawingToolName]));
			paint.currentLayer = paint.layers.length - 1;

			// REbuild the palette if the tool
			if (!isSame) palette.resetForDrawingTool(drawingToolName);
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

	/*
	 * For undo and redo
	 */
	this.undoCmds = [];
	this.undoCoordinates = [];

	/**
	 * A working array for the drawing command
	 */
	this.scratchCmdArgs = [];

	/**
	 * If you need closed shapes
	 */
	this.startingPoint = [];

	if (drawingSupportOrSave.cmds && drawingSupportOrSave.coordinates) {
		// Convert the strings back to function pointers
		var cmds = drawingSupportOrSave.cmds;
		for (var i=0; i<cmds.length; i++) this.cmds.push(paint.context[cmds[i]]);

		this.coordinates = drawingSupportOrSave.coordinates;
		this.scratchCmdArgs = drawingSupportOrSave.scratchCmdArgs;
		this.gridSpacing = drawingSupportOrSave.gridSpacing;
		opt_contextConfig = drawingSupportOrSave.contextConfig;
		this.drawingTool = drawingToolByName[drawingSupportOrSave.name];
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
	// Duplicate the array, so a scratch/working array like this,lastPoints can be reused
	if (coordinates) this.coordinates.push(coordinates.slice(0));

};

/**
 * Replace the coordinates of the last command
 */
PaintLayer.prototype.replaceCoordinates = function(coordinates) {
	this.coordinates.pop();
	// Duplicate the array, so a scratch/working array like this,lastPoints can be reused
	this.coordinates.push(coordinates.slice(0));

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
 * Call setDrawingContextProperties before this.drawingTool.endLayer
 */
PaintLayer.prototype.setDrawingContextProperties = function() {
	for (var i in this.contextConfig) {
		if (i[0] != '_') this.context[i] = this.contextConfig[i];
	}
};

/**
 * Draw the layer 
 */
PaintLayer.prototype.draw = function() {
	this.drawingTool.startLayer(this);
	for (var i=0; i<this.cmds.length; i++) {
		if (this.context.stroke == this.cmds[i]) {
			// Use endLayer & startLayer instead of the raw stroke to make usre all context parameters are set.
			this.setDrawingContextProperties();
			this.drawingTool.endLayer(this);
			if (i <this.cmds.length-1) this.drawingTool.startLayer(this);
		} else {
			this.cmds[i].apply(this.context, this.coordinates[i]);
		}
	}
	this.setDrawingContextProperties();
	this.drawingTool.endLayer(this);
};

PaintLayer.prototype.undo = function() {
	if (this.drawingTool.undo) {
		try {
			this.drawingTool.undo(this);
		} catch (e) {logError(e)}
	} else 	if (this.cmds.length) {
		this.undoCmds.push(this.cmds.pop());
		this.undoCoordinates.push(this.coordinates.pop());
	}

	paint.redraw();
};

PaintLayer.prototype.redo = function() {
	if (this.drawingTool.redo) {
		try {
			this.drawingTool.redo(this);
		} catch (e) {logError(e)}
	} else if (this.undoCmds.length) {
		this.cmds.push(this.undoCmds.pop());
		this.coordinates.push(this.undoCoordinates.pop());
	}

	paint.redraw();
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
			lastPoints: this.scratchCmdArgs, contextConfig: this.contextConfig,
			name: this.drawingTool.name};
};




drawingToolByName = {};

/**********
Setting up a drawing tool:

drawingToolByName[NAME] = {
	name: NAME,
	paletteMarkup: STRING or ARRAY,
	paletteInit: function() {},
	startPaintLayer: function(paintLayer) {),
	mouseDown: function(paintLayer, button, x, y) {),
	mouseUp: function(paintLayer, button, x, y) {},
	mouseDrawPoint: function(paintLayer, button, x, y) {},
	startLayer: function(paintLayer) {},
	endLayer: function(paintLayer) {},
	undo: null or function(paintLayer) {},	
	redo: null or function(paintLayer) {}
};

NOTE:  For paletteMarkup if it is an array each element is handled this way:
		1) Falsy
			Nothing is concatinated to the string.
		2) Not a function, and not an array like object.
			.toString(10) is concatinated onto the output.  (The 10 only applies to numbers; it makes the output base 10.) 
		3) A function
			The function is called and its output is passed through this list again.
		4) An array like object
			Each elemet goes throught the above tests
**********/

