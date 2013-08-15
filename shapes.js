/**
 * Draw rectangles.
 */
drawingToolByName['Rectangles'] = {
	name: 'Rectangles',
	paletteMarkup: [
		palette.colorPaletteMarkup,
		'<div>'+
			'<label class="label" for="line_width">Line Width: </label>'+
			'<input id="line_width" type="number" min="1" max="50" value ="1" oninput="palette.changed(event, \'lineWidth\');"/>'+
			'<label class="label" for="line_cap">Line Cap: </label>'+
			'<select id="line_cap" value="butt" onchange="palette.changed(event, \'lineCap\');">'+
				'<option value="butt">butt</option>'+
				'<option value="round">round</option>'+
				'<option value="square">square</option>'+
			'</select>'+
			'<label class="label" for="grid_size">Grid Size: </label>'+
			'<input id="grid_size" type="number" min="0" max="50" value ="0" step="2" oninput="palette.changed(event, \'_gridSpacing\');">'+
		'</div>'
	], 
	paletteInit: function() {
		document.getElementById("line_width").value = paint.contextConfig.lineWidth;
		document.getElementById("line_cap").value = paint.contextConfig.lineCap;
		document.getElementById("drawing_tool").value = paint.getCurrentLayer().getDrawingToolName();

		palette.initColorControl(['strokeStyle', 'fillStyle']);
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
		paintLayer.addCommand(paintLayer.context.stroke, paintLayer.lastPoints);
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

