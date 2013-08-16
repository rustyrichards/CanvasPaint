/**
 * Draw smooth curves using besier, quadratic, or line as appropriate.
 */
if (drawingToolByName['SmoothCurves']) {
	drawingToolByName['SmoothShape'] = cloneOneLevel(drawingToolByName['SmoothCurves']);
	drawingToolByName['SmoothShape']['name'] = 'SmoothShape';
	drawingToolByName['SmoothShape']['contextColors'] = ['strokeStyle', 'fillStyle'];
	drawingToolByName['SmoothShape']['baseMouseDown'] = drawingToolByName['SmoothCurves']['mouseDown'];
	drawingToolByName['SmoothShape']['mouseDown'] = function(paintLayer, button, x, y) {
		paintLayer.startingPoint = [x, y];
		this.baseMouseDown(paintLayer, button, x, y);
	};
	drawingToolByName['SmoothShape']['mouseUp'] = function(paintLayer, button, x, y) {
		// close to the starting point
		var lastPointAdjusted = false;
		if (this.coordinates.length) {
			var lastPoint = this.coordinates[this.coordinates.length - 1];
			var deltaX = Math.abs(x - lastPoint[lastPoint.length - 2]);
			var deltaY = Math.abs(y - lastPoint[lastPoint.length - 1]);

			// If it is close enough just replace the last point!
			if ((2>=x) && (2>=y)) {
				lastPoint[lastPoint.length - 2] = paintLayer.startingPoint[0];
				lastPoint[lastPoint.length - 1] = paintLayer.startingPoint[1];
				lastPointAdjusted = true;
			}
		}
		if (!lastPointAdjusted) this.mouseDrawPoint(paintLayer, button, paintLayer.startingPoint[0], paintLayer.startingPoint[1]);
		paintLayer.addCommand(paintLayer.context.closePath, []);

	};
	drawingToolByName['SmoothShape']['endLayer'] = function(paintLayer) {
		if (paintLayer.contextConfig.fillStyle) paintLayer.context.fill();
		paintLayer.context.closePath();
		paintLayer.context.stroke();
	};
}

if (drawingToolByName['StraightLines']) {
	drawingToolByName['StraightShape'] = cloneOneLevel(drawingToolByName['StraightLines']);
	drawingToolByName['StraightShape']['name'] = 'StraightShape';
	drawingToolByName['StraightShape']['contextColors'] = ['strokeStyle', 'fillStyle'];
	drawingToolByName['StraightShape']['baseMouseDown'] = drawingToolByName['StraightLines']['mouseDown'];
	drawingToolByName['StraightShape']['mouseDown'] = function(paintLayer, button, x, y) {
		paintLayer.startingPoint = [x, y];
		this.baseMouseDown(paintLayer, button, x, y);
	};
	drawingToolByName['StraightShape']['mouseUp'] = function(paintLayer, button, x, y) {
		// close to the starting point
		var lastPointAdjusted = false;
		if (this.coordinates.length) {
			var lastPoint = this.coordinates[this.coordinates.length - 1];
			var deltaX = Math.abs(x - lastPoint[lastPoint.length - 2]);
			var deltaY = Math.abs(y - lastPoint[lastPoint.length - 1]);

			// If it is close enough just replace the last point!
			if ((5>=x) && (5>=y)) {
				lastPoint[lastPoint.length - 2] = paintLayer.startingPoint[0];
				lastPoint[lastPoint.length - 1] = paintLayer.startingPoint[1];
				lastPointAdjusted = true;
			}
		}
		if (!lastPointAdjusted) this.mouseDrawPoint(paintLayer, button, paintLayer.startingPoint[0], paintLayer.startingPoint[1]);
		paintLayer.addCommand(paintLayer.context.closePath, []);
	};
	drawingToolByName['StraightShape']['endLayer'] = function(paintLayer) {
		if (paintLayer.contextConfig.fillStyle) paintLayer.context.fill();
		paintLayer.context.closePath();
		paintLayer.context.stroke();
	};
}

/**
 * Draw rectangles.
 */
drawingToolByName['Rectangles'] = {
	name: 'Rectangles',
	contextColors: ['strokeStyle', 'fillStyle'],
	paletteMarkup: [
		palette.colorPaletteMarkup,
		'<div>'+
			'<label class="label" for="line_width">Line Width: </label>'+
			'<input id="line_width" type="number" min="1" max="50" value ="1" oninput="palette.changed(event, \'lineWidth\');"/>'+
			'<div class="right">'+
				'<label class="label" for="grid_size">Grid Size: </label>'+
				'<input id="grid_size" type="number" min="0" max="50" value ="0" step="2" oninput="palette.changed(event, \'_gridSpacing\');">'+
			'</div>'+
		'</div>'
	], 
	paletteInit: function() {
		document.getElementById("line_width").value = paint.contextConfig.lineWidth;
		document.getElementById("drawing_tool").value = paint.getCurrentLayer().getDrawingToolName();

		palette.initColorControl(this.contextColors);
	},

	/**
	 * The rectangle always uses 2 points
	 */
	startPaintLayer: function(paintLayer) {
		paintLayer.lastPoints = [-1, -1, -1, -1];
	},

	mouseDown: function(paintLayer, button, x, y) {
		// First make the 0 sixe rectangle
		paintLayer.lastPoints = [x, y, 0, 0];
		paintLayer.addCommand(paintLayer.context.rect, paintLayer.lastPoints);
	},

	mouseUp: function(paintLayer, button, x, y) {
	},

	mouseDrawPoint: function(paintLayer, button, x, y) {
		paintLayer.lastPoints[2] = x - paintLayer.lastPoints[0];
		paintLayer.lastPoints[3] = y - paintLayer.lastPoints[1];
		paintLayer.replaceCoordinates(paintLayer.lastPoints);
	},

	startLayer: function(paintLayer) {
		paintLayer.context.beginPath();
	},

	endLayer: function(paintLayer) {
		if (paintLayer.contextConfig.fillStyle) paintLayer.context.fill();
		paintLayer.context.stroke();
	},
	undo: null,
	redo: null
};

/**
 * Draw circles
 */
drawingToolByName['Circles'] =  {
	fullCircle: 2.0 * Math.PI,
	name: 'Circles',
	/* SmoothCurves and StraightLKines use the same palette */
	paletteMarkup: drawingToolByName['Rectangles'].paletteMarkup,
	paletteInit: drawingToolByName['Rectangles'].paletteInit,

	/**
	 * lastPoints - the arc parameters  x, y, radius, arcStart, arcEnd, false
	 */
	startPaintLayer: function(paintLayer) {
		paintLayer.lastPoints = [-1, -1, 0, 0, this.fullCircle, false];
	},

	mouseDown: function(paintLayer, button, x, y) {
		// First point make a 1px circle
		paintLayer.lastPoints[0] = x;
		paintLayer.lastPoints[1] = y;
		paintLayer.lastPoints[2] = 0; // 0px circle

		paintLayer.addCommand(paintLayer.context.arc, paintLayer.lastPoints);
	},

	mouseUp: function(paintLayer, button, x, y) {
		paintLayer.addCommand(paintLayer.context.stroke, []);
	},

	mouseDrawPoint: function(paintLayer, button, x, y) {
		var xDelta = paintLayer.lastPoints[0] - x;
		var yDelta = paintLayer.lastPoints[1] - y;
		paintLayer.lastPoints[2] = Math.sqrt(xDelta*xDelta + yDelta*yDelta);
		paintLayer.replaceCoordinates(paintLayer.lastPoints);
	},

	startLayer: function(paintLayer) {
		paintLayer.context.beginPath();
	},
	endLayer: function(paintLayer) {
		if (paintLayer.contextConfig.fillStyle) paintLayer.context.fill();
		paintLayer.context.stroke();
	},
	undo: null,
	redo: null
};

