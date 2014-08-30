/*!
 * jQuery waterfall v1.1
 *
 * Copyright 2012, E-Mail: yanguanwei@qq.com, QQ: 176013294
 * Date: 2012-8-21
 */
(function($) {

//ie indexOf fix
if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function(elt /*, from*/) {
		var len = this.length >>> 0;

		var from = Number(arguments[1]) || 0;
		from = (from < 0) ? Math.ceil(from) : Math.floor(from);
		if (from < 0)
			from += len;

		for (; from < len; from++) {
			if (from in this &&
			this[from] === elt)
			return from;
		}
		return -1;
	};
}

var Waterfall = function(container, options) {
	this.colNum = 2;
	this.colWidth = 0;
	
	this.container = container;
	this.grids = container.children('.' + options.gridClass).hide();
	
	if (options.colWidth == 0 && this.grids.length > 0) {
		this.colWidth = this.grids.first().outerWidth(true);
	} else {
		this.colWidth = options.colWidth || 200;
	}
		
	this.options = options;
	
	this.options.onConstruct.call(this);
	
	this.isBusy = false;
	this.setArray = [];
	
	this.page = 1;
	
	var self = this;
	
	this.getMinHeight = function() {
		return Math.min.apply( Math, this.cols );
	};
	
	this.getMaxHeight = function() {
		return Math.max.apply( Math, this.cols );
	};
	
	this.getMinIndex = function() {
		return this.cols.indexOf( this.getMinHeight() );
	};
	
	this.getMaxIndex = function() {
		return this.cols.indexOf( this.getMaxHeight() );
	};
	
	this.setCol = function( grid, i ) {	//设置 grid 到第 i 列中
		this.cols[i] += parseInt( grid.outerHeight(true) );
		grid.data('isseted', true);
	};
	
	this.setMinCol = function( grid ) {	// 设置 grid　到高度最小的列中
		this.setCol( grid, this.getMinIndex() );
	};
	
	this.addGrid = function( grid ) {	// 添加 grid 到 this.grids 对象数组中，并添加到容器中，但是其状态是隐藏的且没有设置位置坐标
		this.grids = this.grids.add( grid.appendTo(this.container) );
	};
	
	this.move = function( grid, i ) {
		var left = i * this.colWidth,
			top = this.cols[i];
			
		if ( $.browser.msie && grid.is(":visible") ) {
			grid.stop(true, true).animate({
				'top': top,
				'left': left					  
			}, 800);
		} else {
			grid.css({
				'top': top,
				'left': left
			});
		}
	};
	
	this.setPosition = function( grid,  i ) {
		this.move( grid, i );
		this.setCol( grid, i );
	};
	
	this.reset = function() {
		var colNum = $.isFunction(this.options.colNum) ? this.options.colNum.call(this) : this.options.colNum;
		
		if (this.colNum == colNum)	// 如果列数没有变，就不需要调整
			return false;
			
		this.cols = [];
		this.colNum = colNum;
		for (var i = 0; i < this.colNum; i++)
			this.cols[i] = 0;
		
		this.grids.each(function() { $(this).data('isseted', false); });
	};
	
	this.resize = function( finish ) {
		if ( false !== this.reset() ) {
			this.options.onResize.call( this );
			this.set( this.grids.toArray(), finish); 
		}
	};
	
	this.finish = function() {
		this.container
			.height( this.getMaxHeight() )
			.width( this.colNum * this.colWidth );
			
		if ( this.setArray.length > 0) {
			var o = this.setArray.shift();
			this.set(o.grids, o.finish, true);
			return ;
		} else {
			this.isBusy = false;	
		}
		
		this.options.onFinish.call( this );
	};
	
	this.set = function( grids, finish, force ) {
		if ( this.isBusy && !force ) {
			if ( grids ) {
				this.setArray.push({
					grids: grids,
					finish: finish
				});
			}
			return false;
		}
		
		this.isBusy = true;
		
		var appear = function( grid, index ) {
			if ( !grid .data('isseted') ) {
				this.setCol( grid, index );	
			}
		};
		
		var loop = function( i ) {
			if ( i < grids.length ) {
				var grid = $(grids[i]);
				var index = self.getMinIndex();
				
				if ( !grid.data('isseted') ) {
					self.move( grid,  index );
				}
				
				if ( grid.is(":hidden") ) {
					grid
						.css('position', 'absolute')
						.fadeIn(150, function() {
							appear.call( self, grid, index )
							loop( i+1 );
						});
				} else {
					appear.call( self, grid, index )
					loop( i+1 );
				}
			} else {
				self.finish();
				finish && finish.call( self );
			}
		};
		loop( 0 );
	};
	
	this.load = function() {
		if ( this.isBusy ) 
			return false;
			
		var url = this.options.url.call( this, this.page++ );
		this.options.beforeLoad.call( this, url );
		
		$.ajax( $.extend({}, this.options.ajax || {}, {
			dataType	: 'json',
			url			: url,
			success		: function(response) {
				var grids = self.options.onLoad.call(self, response);
				if ( grids ) {
					$.each(grids, function(i, grid) {
						self.addGrid( grid );					   
					});
					self.set( grids );
				}
			},
			complete	: function(XMLHttpRequest, response) {
				self.options.afterLoad.call( this, response );
			}
		}) );
	};
};

$.waterfall = function( container, options ) {
	var wf = new Waterfall( container, $.extend({}, $.waterfall.defaults, options) ),
		$window = $(window),
		winWidth = $window.width();
	
	$window.resize(function() {
		var curWinWidth = $window.width();
		if (curWinWidth !== winWidth) {
			winWidth = 	curWinWidth;
			wf.resize();
		} 
	});
	
	$window.scroll(function() {
		if ( $(this).scrollTop() + $(this).height() >=  wf.getMaxHeight() - wf.options.threshold ) {
			wf.load();
		}
	});
	
	wf.resize( function() {
		if ( wf.page == 1)
			wf.load();
	});
};

$.waterfall.defaults = {
	gridClass	: 'grid',
	colWidth	: 0,		//每小格的宽度，0表示从容器中取第一个已经存在的小格，取其宽度
	page		: 1,		//从第几页开始
	threshold	: 0,
	ajax		: {},
	onConstruct	: function() {},
	colNum		: function() { return 2; },
	onResize	: function() {},
	beforeLoad	: function( url ) {},
	onLoad		: function( response ) {},
	onFinish	: function() {},
	url			: function( page ) {}
};

$.fn.waterfall = function( options ) {
	this.each(function() {
		$.waterfall( $(this), options ); 
	});
};

})(jQuery);