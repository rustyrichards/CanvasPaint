/**
 * Draw smooth curves using besier, quadratic, or line as appropriate.
 */
drawingToolByName['SmoothCurves'] = {
	name: 'SmoothCurves',
	contextColors: 'strokeStyle',
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
			'<div class="right">'+
				'<label class="label" for="grid_size">Grid Size: </label>'+
				'<input id="grid_size" type="number" min="0" max="50" value ="0" step="2" oninput="palette.changed(event, \'_gridSpacing\');">'+
			'</div>'+
		'</div>'
	], 
	paletteInit: function() {
		document.getElementById("line_width").value = paint.contextConfig.lineWidth;
		document.getElementById("line_cap").value = paint.contextConfig.lineCap;
		document.getElementById("drawing_tool").value = paint.getCurrentLayer().getDrawingToolName();

		palette.initColorControl(this.contextColors);
	},

	/**
	 * The last 2 points for drawing
	 */
	startPaintLayer: function(paintLayer) {
		paintLayer.scratchCmdArgs = [-1, -1, -1, -1];
	},

	mouseDown: function(paintLayer, button, x, y) {
		// First point do a moveTo
		paintLayer.scratchCmdArgs = [-1, -1, x, y];
		paintLayer.addCommand(paintLayer.context.moveTo, paintLayer.scratchCmdArgs.slice(2));
	},

	mouseUp: function(paintLayer, button, x, y) {
	},

	mouseDrawPoint: function(paintLayer, button, x, y) {
		// If the distance from the first to the second point is grater than the distance from the first to the third
		// point then we have an acute angle, so it should be be kept sharp; don't do a spline curve.
		var magnitude01 = Math.sqrt(Math.pow(paintLayer.scratchCmdArgs[0] - paintLayer.scratchCmdArgs[2], 2) + 
				Math.pow(paintLayer.scratchCmdArgs[1] - paintLayer.scratchCmdArgs[3], 2));
		var magnitude02x2 = Math.sqrt(Math.pow(paintLayer.scratchCmdArgs[0] - x, 2) + 
				Math.pow(paintLayer.scratchCmdArgs[1] - y, 2));

		var canSmoothOut = -1 != paintLayer.scratchCmdArgs[0] || magnitude01 < magnitude02x2;

		if (canSmoothOut && paintLayer.cmds[paintLayer.cmds.length -1] == paintLayer.context.lineTo) {
			paintLayer.scratchCmdArgs.shift();
			paintLayer.scratchCmdArgs.shift();
			paintLayer.scratchCmdArgs.push(x, y);
			paintLayer.addCommand(paintLayer.context.quadraticCurveTo, paintLayer.scratchCmdArgs.slice(0), true);	//Dup the array the 2 points for the spline curve
		} else if (canSmoothOut && paintLayer.cmds[paintLayer.cmds.length -1] == paintLayer.context.quadraticCurveTo) {
			paintLayer.scratchCmdArgs.push(x, y);
			paintLayer.addCommand(paintLayer.context.bezierCurveTo, paintLayer.scratchCmdArgs.slice(0), true);	//Dup the array the 3 points for the spline curve
			paintLayer.scratchCmdArgs.shift();
			paintLayer.scratchCmdArgs.shift();
			paintLayer.scratchCmdArgs[0] = paintLayer.scratchCmdArgs[1] = -1;	// Consume the used up points
		} else {
			// Just a lineto
			paintLayer.addCommand(paintLayer.context.lineTo, [x, y]);
			paintLayer.scratchCmdArgs.shift();
			paintLayer.scratchCmdArgs.shift();
			paintLayer.scratchCmdArgs.push(x, y);
		}
	},

	startLayer: function(paintLayer) {
		paintLayer.context.beginPath();
	},
	endLayer: function(paintLayer) {
		paintLayer.context.stroke();
	},
	undo: function(paintLayer) {
		if (paintLayer.cmds.length) {
			var cmd = paintLayer.cmds[paintLayer.cmds.length -1];
			paintLayer.undoCmds.push(cmd);
			paintLayer.undoCoordinates.push(paintLayer.coordinates[paintLayer.coordinates.length -1]);

			switch (cmd) {
				case paintLayer.context.bezierCurveTo:
					paintLayer.cmds[paintLayer.cmds.length -1] = paintLayer.context.quadraticCurveTo;
					break;
				case paintLayer.context.quadraticCurveTo:
					paintLayer.cmds[paintLayer.cmds.length -1] = paintLayer.context.lineTo;
					break;
				default:
					paintLayer.cmds.pop();
					paintLayer.coordinates.pop();
					break;
			}
		}

	},
	redo: function(paintLayer) {
		if (paintLayer.undoCmds.length) {
			var undoCmd = paintLayer.undoCmds.pop();
			var cmd = (paintLayer.cmds.length) ? paintLayer.cmds[paintLayer.cmds.length - 1] : undoCmd;
			var undoCoordinates = paintLayer.undoCoordinates.pop();
			var coordinates = (paintLayer.coordinates.length) ?  paintLayer.coordinates[paintLayer.undoCoordinates.length - 1] : [];

			var coordinatesMatched = false;
			if ((cmd != undoCmd) && (coordinates.length == undoCoordinates.length)) {
				var coordinatesMatched = true;
				for (var i=0; coordinatesMatched && i<coordinates.length; i++) coordinatesMatched = coordinates[i] == coordinatesMatched[i];
			}

			if (coordinatesMatched) {
				paintLayer.cmds[paintLayer.cmds.length -1] = undoCmd;
			} else {
				paintLayer.cmds.push(undoCmd);
				paintLayer.coordinates.push(undoCoordinates);
			}
		}
	}
};

/**
 * Draw straight lines 
 */
drawingToolByName['StraightLines'] =  {
	name: 'StraightLines',
	contextColors: 'strokeStyle',
	/* SmoothCurves and StraightLKines use the same palette */
	paletteMarkup: drawingToolByName['SmoothCurves'].paletteMarkup,
	paletteInit: drawingToolByName['SmoothCurves'].paletteInit,


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
	},
	undo: null,
	redo: null
};

