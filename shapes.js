/**
 * Draw smooth curves using besier, quadratic, or line as appropriate.
 */
if (drawingToolByName['Lines Smooth']) {
	drawingToolByName['Shapes Smooth'] = cloneOneLevel(drawingToolByName['Lines Smooth'], {
		name: 'Shapes Smooth',
		contextColors: ['strokeStyle', 'fillStyle'],
		baseMouseDown: drawingToolByName['Lines Smooth']['mouseDown'],
		handleShapeEnd: function(paintLayer) {
			// close to the starting point
			var lastPointAdjusted = false;
			if (paintLayer.coordinates.length) {
				var lastPoint = paintLayer.coordinates[paintLayer.coordinates.length - 1];
				var deltaX = Math.abs(paintLayer.startingPoint[0] - lastPoint[lastPoint.length - 2]);
				var deltaY = Math.abs(paintLayer.startingPoint[1] - lastPoint[lastPoint.length - 1]);

				// If it is close enough just replace the last point!
				if ((2>=deltaX) && (2>=deltaY)) {
					lastPoint[lastPoint.length - 2] = paintLayer.startingPoint[0];
					lastPoint[lastPoint.length - 1] = paintLayer.startingPoint[1];
					lastPointAdjusted = true;
				}
			}
			if (!lastPointAdjusted) {
				this.mouseDrawPoint(paintLayer, 0, paintLayer.startingPoint[0], paintLayer.startingPoint[1]);
			}
			paintLayer.addCommand(paintLayer.context.closePath, []);
			paintLayer.startingPoint = [];
		},
		mouseDown: function(paintLayer, button, x, y) {
			// For a button other tha 0 (left) close out the current shape and start a new one.
			if (button && paintLayer.startingPoint.length) this.handleShapeEnd(paintLayer);
			paintLayer.startingPoint = [x, y];
			this.baseMouseDown(paintLayer, button, x, y);
		},
		mouseUp: function(paintLayer, button, x, y) {
			if (!button) this.handleShapeEnd(paintLayer);
		},
		endLayer: function(paintLayer) {
			if (paintLayer.contextConfig.fillStyle) paintLayer.context.fill();
			paintLayer.context.closePath();
			paintLayer.context.stroke();
		}
	});
}

if (drawingToolByName['Lines Straight']) {
	drawingToolByName['Shapes Straight'] = cloneOneLevel(drawingToolByName['Lines Straight'], {
		name: 'Shapes Straight',
		contextColors: ['strokeStyle', 'fillStyle'],
		baseMouseDown: drawingToolByName['Lines Straight']['mouseDown'],
		mouseDown: function(paintLayer, button, x, y) {
			// For a button other than 0 (left) just place a line, don't close the shape.
			if (!button) paintLayer.startingPoint = [x, y];
			this.baseMouseDown(paintLayer, button, x, y);
		},
		mouseUp: function(paintLayer, button, x, y) {
			// For a button other than 0 (left) just place a line, don't close the shape.
			if (!button) {
				// close to the starting point
				var lastPointAdjusted = false;
				if (paintLayer.coordinates.length) {
					var lastPoint = paintLayer.coordinates[paintLayer.coordinates.length - 1];
					var deltaX = Math.abs(paintLayer.startingPoint[0] - lastPoint[lastPoint.length - 2]);
					var deltaY = Math.abs(paintLayer.startingPoint[1] - lastPoint[lastPoint.length - 1]);

					// If it is close enough just replace the last point!
					if ((5>=deltaX) && (5>=deltaY)) {
						lastPoint[lastPoint.length - 2] = paintLayer.startingPoint[0];
						lastPoint[lastPoint.length - 1] = paintLayer.startingPoint[1];
						lastPointAdjusted = true;
					}
				}
				if (!lastPointAdjusted) paintLayer.addCommand(paintLayer.context.lineTo, paintLayer.startingPoint);
				paintLayer.addCommand(paintLayer.context.closePath, []);
				paintLayer.startingPoint = [];
			}
		},
		endLayer: function(paintLayer) {
			if (paintLayer.contextConfig.fillStyle) paintLayer.context.fill();
			paintLayer.context.closePath();
			paintLayer.context.stroke();
		}
	});
}

/**
 * Draw rectangles.
 */
drawingToolByName['Shapes Rectangles'] = {
	name: 'Shapes Rectangles',
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
 * Draw Shapes Circles
 */
drawingToolByName['Shapes Circles'] =  {
	fullCircle: 2.0 * Math.PI,
	name: 'Shapes Circles',
	contextColors: ['strokeStyle', 'fillStyle'],
	/* SmoothCurves and StraightLKines use the same palette */
	paletteMarkup: drawingToolByName['Shapes Rectangles'].paletteMarkup,
	paletteInit: drawingToolByName['Shapes Rectangles'].paletteInit,

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

