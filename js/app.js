var getElemDistance = function ( elem ) {
    var location = {x:0, y:0};
    if (elem.offsetParent) {
        do {
            location.y += elem.offsetTop;
            location.x += elem.offsetLeft;
            elem = elem.offsetParent;
        } while (elem);
    }
    return location;
};

var App = function(targetElementId, viewWidth, viewHeight, squaresX, squaresY){
	
	var me = this;
	// Grab the canvas
	me.canvas = document.getElementById(targetElementId);
	me.ctx = me.canvas.getContext("2d");

	// Grab the start button
	me.button = document.getElementById("start");

	// Initialize page styles
	var body = document.getElementsByTagName('body')[0];
	body.style.margin = '0px';
	body.style.overflow = "hidden";

	// Set height and width to window inner height
	viewWidth = me.canvas.width = viewWidth;
  	viewHeight = me.canvas.height = viewHeight;

  	squaresX = squaresX;
  	squaresY = squaresY;

  	var _squareWidth = me.canvas.width/squaresX;
  	var _squareHeight = me.canvas.height/squaresY;//me.canvas.height/squaresY;

  	var grid = new Grid(squaresX, squaresY);

  	// Handle Click events
	var _mouseDown = true;
	var handleClick = function(event){
		var x = event.pageX - getElemDistance(me.canvas).x;
		var y = event.pageY - getElemDistance(me.canvas).y;
		
		var i = Math.floor(x/_squareWidth);
		var j = Math.floor(y/_squareHeight);

		grid.getCell(i, j).isAlive = true;
		return;
	};

	var _startSim = true;

	/*window.onkeydown = function(ev){
		_startSim = !_startSim;
	};*/

	window.onresize = function(ev){
		viewWidth =  me.canvas.width =  viewWidth;
  		viewHeight =  me.canvas.height =  viewHeight;
	};

	me.canvas.addEventListener('mousemove', handleClick);
/*
	me.canvas.addEventListener('mouseup', function(event){
		_mouseDown = false;
		me.canvas.removeEventListener('mousemove', handleClick);
	});*/

	me.start = function(){
		setInterval(function(){
			me.update();
			me.draw();
		}, 60);

	};

	me.update = function(){
		if(_startSim){
			grid.updateLiving();	
		}
	};

	me.draw = function(){
		var colors = [ 'red' ];
		var random_color = colors[Math.floor(Math.random() * colors.length)];
		// Erase previous draw
		me.ctx.fillStyle = 'white';
		me.ctx.globalAlpha = 0.2;
	 	me.ctx.fillRect(0,0,me.canvas.width,me.canvas.height);

	 	// Draw living squares
	 	grid.filter(function(cell){
	 		return cell.isAlive;
	 	}).forEach(function(cell){
	 		me.ctx.fillStyle = random_color;
	 		me.ctx.fillRect(cell.x * _squareWidth, cell.y * _squareHeight, _squareWidth, _squareHeight);
	 	});



	 	// Draw grid
	 	
	 	// me.ctx.fillStyle = 'this does nothing';
	 	// for(var x = 0; x <= viewWidth; x+=_squareWidth){
	 	// 	me.ctx.beginPath();
	 	// 	me.ctx.moveTo(x, 0);
	 	// 	me.ctx.lineTo(x, viewHeight);
	 	// 	me.ctx.stroke();
	 	// };

	 	// for(var y = 0; y <= viewHeight; y+= _squareHeight){
	 	// 	me.ctx.beginPath();
	 	// 	me.ctx.moveTo(0, y);
	 	// 	me.ctx.lineTo(viewWidth, y);
	 	// 	me.ctx.stroke();	
	 	// };
	};

	return me;
};

var app = new App("game", window.innerWidth, window.innerHeight, Math.round(window.innerWidth/10), Math.round(window.innerHeight/10));
app.start();

