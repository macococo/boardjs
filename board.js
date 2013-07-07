(function($) {

	$.fn.extend({
		board: function(options) {
			var board = new Board(this, options);
			this.data('board', board);
			return board;
		}
	});

	var Board = function($canvas, options) {
		this.init($canvas, options);
		this.autoLoad().done((function() {
			this.onEvents();	
		}).bind(this));
	};

	Board.prototype = {

		init: function($canvas, options) {
			this.$canvas = $canvas;
			this.canvas = this.$canvas.get(0);
			this.options = options = options || {};
			this.states = [];
			this.statesIndex = 0;
			this.drawMode = 1;
			this.oldX = 0;
			this.oldY = 0;

			options.autoSave = !!options.autoSave;
			options.drawStrokeStyle = options.drawStrokeStyle || 'rgba(255, 0, 0, 1)';
			options.drawLineWidth = options.drawLineWidth || 5;
			options.eraseStrokeStyle = options.eraseStrokeStyle || 'rgba(0, 0, 0, 0)';
			options.eraseLineWidth = options.eraseLineWidth || 10;
		},

		destroy: function() {
			this.offEvents();
			this.data('board', null);
			this.$canvas.remove();
		},

		enable: function() {
			this.onEvents();
		},

		disable: function() {
			this.offEvents();
		},

		getContext: function() {
			return this.canvas.getContext('2d');
		},

		setDrawMode: function() {
			this.drawMode = 1;
		},

		setEraseMode: function() {
			this.drawMode = 2;
		},

		setDrawColor: function(color) {
			this.options.drawStrokeStyle = color;
		},

		toDataURL: function(type) {
			return this.canvas.toDataURL(type || 'image/png');
		},

		clear: function() {
			this.clearAll();
			this.addStates(this.toDataURL());
		},

		onEvents: function() {
			this.$canvas.on('touchstart', (function(e) {
				e = e.originalEvent.changedTouches[0];
				var offset = this.$canvas.offset();
				this.drawing = true;
				this.oldX = e.pageX - offset.left;
				this.oldY = e.pageY - offset.top;
			}).bind(this));
			this.$canvas.on('touchend', (function(e) {
				this.drawing = false;
				this.addStates(this.toDataURL());
			}).bind(this));
			this.$canvas.on('touchmove', (function(e) {
				this.drawLine(e);
				return false;
			}).bind(this));
		},

		offEvents: function() {
			this.$canvas.off();
		},

		drawLine: function(e) {
			if (!this.drawing) return;

			e = e.originalEvent.changedTouches[0];
			var offset = this.$canvas.offset(),
				x = e.pageX - offset.left,
				y = e.pageY - offset.top,
				context = this.getContext();

			context.lineJoin = 'round';
			context.lineCap = 'round';
			context.globalCompositeOperation = 'copy';

			if (this.drawMode === 2) {
				context.strokeStyle = this.options.eraseStrokeStyle;
				context.lineWidth = this.options.eraseLineWidth;
			} else {
				context.strokeStyle = this.options.drawStrokeStyle;
				context.lineWidth = this.options.drawLineWidth;
			}

			context.beginPath();
			context.moveTo(this.oldX, this.oldY);
			context.lineTo(x, y);
			context.stroke();
			context.closePath();

			this.oldX = x;
			this.oldY = y;
		},
		drawData: function(data) {
			var deferred = $.Deferred(),
				context = this.getContext(),
				img = document.createElement('img');

			this.clearAll();

			img.src = data;
			img.onload = function() {
				context.drawImage(img, 0, 0);
				deferred.resolve();
			};

			return deferred.promise();
		},

		clearAll: function() {
			this.getContext().clearRect(0, 0, this.$canvas.width(), this.$canvas.height());
		},

		autoLoad: function() {
			var deferred = $.Deferred();

			if (this.options.autoSave && localStorage) {
				var data = localStorage.getItem('board-data');
				if (data) {
					this.drawData(data).done((function() {
						this.addStates(data);
						deferred.resolve();
					}).bind(this));
				} else {
					deferred.resolve();
				}
			} else {
				deferred.resolve();
			}

			return deferred.promise();
		},

		autoSave: function() {
			if (this.options.autoSave && localStorage) {
				localStorage.setItem('board-data', this.toDataURL());
			}
		},

		addStates: function(data) {
			if (this.states.length - 1 > this.statesIndex) {
				this.states = this.states.slice(0, this.statesIndex + 1);
			}

			this.states.push(data);
			this.statesIndex = this.states.length - 1;

			this.autoSave();
		},

		canUndo: function() {
			return this.states.length > 1 && this.statesIndex > 0;
		},

		canRedo: function() {
			return this.states.length > 1 && this.statesIndex < this.states.length - 1;
		},

		undo: function() {
			if (this.canUndo()) {
				this.statesIndex = this.statesIndex - 1;
				this.drawData(this.states[this.statesIndex]);
			}
		},

		redo: function() {
			if (this.canRedo()) {
				this.statesIndex = this.statesIndex + 1;
				this.drawData(this.states[this.statesIndex]);
			}
		}
	}

})(jQuery);