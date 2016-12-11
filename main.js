"use strict";

var canvas = document.getElementById("gameCanvas");

var g_width = 0; // window.innerWidth;
var g_height = 0; // window.innerHeight;

var DEG2RAD = 0.01745329252;
var RAD2DEG = 1 / DEG2RAD;

console.log(g_width + " " + g_height);

function Rect(pos, size)
{
	this.pos = pos;
	this.size = size;
	this.left_upper = pos.subtract(size.divide(2));
	this.right_lower = pos.add(size.divide(2));
	this.doesIntersect = function(otherRect)
	{
		return (this.left_upper.x < otherRect.right_lower.x && this.right_lower.x > otherRect.left_upper.x &&
				this.left_upper.y < otherRect.right_lower.y && this.right_lower.y > otherRect.left_upper.y );
	}
}

var gl = canvas.getContext("webgl", {
		stencil: true,
		'preserveDrawingBuffer': true,
		'antialias': true,
		'alpha': false
	});

window.onload = function () {
	// code

	g_width = 1200; //gl.drawingBufferWidth;//window.innerWidth;
	g_height = 800; //gl.drawingBufferHeight;//window.innerHeight;

}

g_width = 800; //gl.drawingBufferWidth;//window.innerWidth;
g_height = 600; //gl.drawingBufferHeight;//window.innerHeight;

document.addEventListener("DOMContentLoaded", function (event) {
	// var canvas = document.getElementById("gameCanvas");

	// var g_width = window.innerWidth;
	// var g_height = window.innerHeight;

	// console.log(g_width + " " + g_height);

	// var gl = canvas.getContext("webgl", {
	// stencil: true,
	// 'preserveDrawingBuffer': true,
	// 'antialias': true,
	// 'alpha': false
	// });
	// var width = window.innerWidth;
	// var height = window.innerHeight;
	// g_width = gl.canvas.width = width; //window.innerWidth; // in pixels
	// g_height = gl.canvas.height = height; //window.innerHeight; // in pixels
});

// var width = window.innerWidth
// || document.documentElement.clientWidth
// || document.body.clientWidth;

// var height = window.innerHeight
// || document.documentElement.clientHeight
// || document.body.clientHeight;


var paddleVertexShader =
	"attribute vec4 a_position;" +
	"uniform mat4 p_matrix;" +
	"void main() {" +
	"  gl_Position = p_matrix * vec4(a_position);" +
	"}";
var paddleFragmentShader =
	"void main() {" +
	"  gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);" +
	"}";
	
	this.ballVertexShader =
		"precision mediump float; attribute vec4 a_position;" +
		"uniform mat4 p_matrix;\n" +
		"\n" +
		"void main() {" +
		"  gl_Position = p_matrix * vec4(a_position);" +
		"}";
	this.ballFragmentShader =
		"precision mediump float; \n" +
		"uniform vec4 u_ballCoord4; \n" +
		"void main() \n" +
		"{  gl_FragColor = u_ballCoord4; } \n";

function addShader(program, type, source) {
	var id = gl.createShader(type);
	gl.shaderSource(id, source);
	gl.compileShader(id);
	if (gl.getShaderParameter(id, gl.COMPILE_STATUS)) {
		gl.attachShader(program, id);
	} else {
		console.log("compileShader failed:", gl.getShaderInfoLog(id));
	}
}

function CreateRotatedVector(v, radians) {
	var ca = Math.cos(radians);
	var sa = Math.sin(radians);
	return new Vector(v.x * ca - v.y * sa, v.x * sa + ca * v.y);
}



function DrawableRect()
{
	this.program = null;
	this.vertexBuffer = null;
	this.attrPosition = null;
	
	this.initObject = function (vertexShader, fragmentShader, position, size) {
		this.size = size;
		this.position = position;
		this.program = this.initShader(vertexShader, fragmentShader);
		
	}
	
	this.initShader = function (vertexShader, fragmentShader) 
	{
			var program = gl.createProgram();
			this.vertexShader = vertexShader;
			this.fragmentShader = fragmentShader;
			addShader(program, gl.VERTEX_SHADER, vertexShader);
			addShader(program, gl.FRAGMENT_SHADER, fragmentShader);
			gl.linkProgram(program);
			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
				console.log("linkProgram failed:", gl.getProgramInfoLog(program));
			}
			//gl.useProgram(program);
			return program;
	}

	this.initVertexShaderData = function () {
		
		var uMatrix = gl.getUniformLocation(this.program, "p_matrix");
		var m = new Float32Array([  2 / g_width, 0, 0, 0,
									0, 2 / g_height, 0, 0, 
									0, 0, 1, 0, 
									-1,	-1, 0, 1]);
		gl.uniformMatrix4fv(uMatrix, false, m);
		this.vertexBuffer = gl.createBuffer();
	}

	this.draw = function () {
		gl.useProgram(this.program);
		this.attribPosition = gl.getAttribLocation(this.program, "a_position");
		
		this.initVertexShaderData(); //after call to gl.useProgram;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		
		gl.enableVertexAttribArray(this.attribPosition);
		gl.vertexAttribPointer(this.attribPosition, 2, gl.FLOAT, false, 0, 0);
		drawRect(this.position.x, this.position.y, this.size.x, this.size.y);
	}
}



function SimpleBall(ballSize, ballSpeed) {
	this.program = null;
	this.vertexBuffer = null;
	this.aPosition = null;
	this.position = new Vector(0, 0);
	this.movementDirectionVector = new Vector(0, 0);
	this.ballSize = ballSize;
	this.ballSpeed = ballSpeed;
	
	this.initObject = function () {
		var screenCenter = new Vector(g_width / 2, g_height / 2);
		this.position = screenCenter;
		this.size = new Vector(this.ballSize, this.ballSize);
		this.collisionRect = new Rect(this.position, new Vector(this.size.x, this.size.y));
		this.drawableRect = new DrawableRect();
		this.drawableRect.initObject(ballVertexShader, ballFragmentShader, this.position, new Vector(this.ballSize, this.ballSize));
		this.program = this.drawableRect.program;
		this.INTERVAL = 1000;
		this.intervalID = setInterval(this.changeBallColor.bind(this), this.INTERVAL);
		var vectorRight = new Vector(1, 0);
		this.respawnBallInCenter();
		this.movementDirectionVector = vectorRight.multiply(this.ballSpeed);
	}

	this.onCollide = function(collider)
	{
		console.log("SimpleBall collided with smth");
	}
	
	this.changeBallColor = function () {
		gl.useProgram(this.program);
		this.u_colorLocation = gl.getUniformLocation(this.program, "u_ballCoord4");
		var r = Math.random();
		var g = Math.random();
		var b = Math.random();
		gl.uniform4f(this.u_colorLocation, r, g, b, 1);
	}


	this.drawBall = function () {
		this.drawableRect.position = this.position;
		//don't forget to switch the fragment shader!
		gl.useProgram(this.program); //use your own program
		this.drawableRect.draw();
	}
	
	this.reflectBall = function (dirVec) {
		var reflectUpside = Math.random() > 0.5;
		var maxUpDegree = Math.atan2(g_height - this.position.y,
				g_width) * RAD2DEG;
		var maxDownDegree = Math.atan2(this.position.y,
				g_width) * RAD2DEG;

		var angleThreshold = 5;
		
		var canReflectUpside = maxUpDegree > angleThreshold;
		var canReflectDownside = maxDownDegree > angleThreshold;

		if (!canReflectUpside) {
			reflectUpside = false;
		}
		if (!canReflectDownside) {
			reflectUpside = true;
		}
		
		console.log("maxUpDegree " + maxUpDegree + " maxDownDegree " + maxDownDegree);
		console.log("reflectUpside: " + reflectUpside);
		
		var maxDegree = reflectUpside ? maxUpDegree : maxDownDegree;
		var degree = Math.min(Math.random() * 100, maxDegree - 0.001);
		if (!reflectUpside)
			degree *= -1;
		var rotVec = CreateRotatedVector(dirVec, degree * DEG2RAD);
		this.movementDirectionVector = dirVec.add(rotVec).normalize().multiply(this.ballSpeed);
	}

	this.onCollisionWithWorldBounds = function () {
		var left_border = 0;
		var right_border = g_width;
		if (this.position.x < left_border) {
			var rightDirection = new Vector(1, 0);

			var dirVec = rightDirection;
			this.movementDirectionVector = dirVec.multiply(25);
			//this.reflectBall(dirVec);
		} else if (this.position.x > right_border) {
			var leftDirection = new Vector(-1, 0);
			var dirVec = leftDirection;
			this.movementDirectionVector = dirVec.multiply(25);
			//this.reflectBall(dirVec);
		}
	}

	this.checkWorldBounds = function (ballPosition) {
		if (ballPosition.x < 0 || ballPosition.x > g_width || ballPosition.y < 0 ||
			ballPosition.y > g_height) {
			this.respawnBallInCenter();
		}
	}

	this.respawnBallInCenter = function () {
		var screenCenter = new Vector(g_width / 2, g_height / 2);
		this.position = screenCenter;
		var vectorRight = new Vector(1, 0);
		this.movementDirectionVector = vectorRight.multiply(this.ballSpeed);
	}

	this.updateBallPosition = function () {
		var vectorRight = new Vector(1, 0);
		//this.checkWorldBounds(this.position);
		//this.movementDirectionVector = vectorRight.multiply(this.ballSpeed);
		alert("this.movementDirectionVector " + this.movementDirectionVector);
		this.position = this.position.add(this.movementDirectionVector);
		//this.checkWorldBounds(this.position);
		this.onCollisionWithWorldBounds();
	}

	this.onCollision = function (entity) {
		//Change the direction of the ball
	}

	this.update = function () {
		this.updateBallPosition();
		
	}
	this.draw = function () {
		this.drawBall();
	}
};

function Paddle(pos, size) {
	this.drawableRect = new DrawableRect();
	this.size = size;
	this.position = pos;
	this.init = function()
	{
		this.collisionRect = new Rect(this.position, new Vector(this.size.x, this.size.y));
		this.drawableRect = new DrawableRect();
		this.drawableRect.initObject(paddleVertexShader, paddleFragmentShader, this.position, this.size);
		this.program = this.drawableRect.program;
	}
	
	this.init();
	
	this.draw = function () {
		this.drawableRect.position = this.position;
		//don't forget to switch the fragment shader!
		gl.useProgram(this.program); //use your own program
		this.drawableRect.draw();
	}
	this.onCollide = function(collider)
	{
		console.log("Paddle collided with smth");
	}
	this.update = function () {}
};

function AIPaddle(pos, size)
{
	this.drawableRect = new DrawableRect();
	this.size = size;
	this.position = pos;
	this.init = function()
	{
		this.drawableRect = new DrawableRect();
		this.drawableRect.initObject(paddleVertexShader, paddleFragmentShader, this.position, this.size);
		this.program = this.drawableRect.program;
	}
	
	this.init();
	
	this.draw = function () {
		this.drawableRect.position = this.position;
		//don't forget to switch the fragment shader!
		gl.useProgram(this.program); //use your own program
		this.drawableRect.draw();
	}

	this.update = function () {}
};

function GameManager() {
	this.entities = [];
	this.isPaused = false;
	this.addEntity = function (entity) {
		this.entities.push(entity);
	}
	this.updateGame = function () {
		if (!this.isPaused) {
			this.entities.forEach(entity => {
				entity.update();
				entity.draw();
			});
		}
	}
	this.pauseGame = function () {
		this.isPaused = !this.isPaused;
	}
}

function drawRect(x, y, w, h) {
	var x1 = x - w / 2;
	var x2 = x + w / 2;
	var y1 = y - h / 2;
	var y2 = y + h / 2;
	var verts = new Float32Array([
				x1, y1,
				x2, y1,
				x1, y2,
				x1, y2,
				x2, y1,
				x2, y2
			]);
	gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
}



function collistionTest(entities)
{
	entities.forEach(function(entity) {
		entities.forEach(function(subEntity) {
			if(subEntity!== entity)
			{
				if(entity.collisionRect && subEntity.collisionRect &&
					subEntity.collisionRect.doesIntersect(entity.collisionRect) && subEntity.onCollide)
				{
					subEntity.onCollide(entity);
				}
			}
		});
	});
}


var gm = new GameManager();
var simpleBall = new SimpleBall(50, 25);
simpleBall.initObject();
gm.addEntity(simpleBall);


var paddleSize = new Vector(20, 180);
var userPaddle = new Paddle(new Vector(0 + paddleSize.x / 2 + 5, g_height / 2), paddleSize);

userPaddle.onMouseMove = function(e)
{
//	console.log(e.pageY);
//	userPaddle.position.y = Math.min(g_height - e.pageY, g_height);
};

var aiPaddle = new AIPaddle(new Vector(0 + paddleSize.x, g_height / 2), paddleSize);

gm.addEntity(userPaddle);
//gm.addEntity(aiPaddle);

function onMouseMove(e) {
	//go through entites and send them a message
	if(!gm.isPaused)
	{
		gm.entities.forEach(entity => {
			if(entity.onMouseMove)
				entity.onMouseMove(e);
			});
	}
}

canvas.addEventListener("mousemove", onMouseMove, false);


var fps = 60;
setInterval(onTimerTick, 1000 / fps); // 33 milliseconds = ~ 30 frames per sec

function cleanGLContext() {
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
}

function onTimerTick() {
	// Do stuff.
	
	try {
		if(!gm.isPaused)
		{
			cleanGLContext();
			gm.updateGame();
			collistionTest(gm.entities);
		}

	} catch (e) {

		alert('Error ' + e.name + ":" + e.message + "\n" + e.stack); // (3) <--

	}

	//drawRect(0, 0, width, height);

}

function onResize() {
	//gl.canvas.width = window.innerWidth;
	//gl.canvas.height = window.innerHeight;
}
document.body.addEventListener('keydown', function (e) {
	//'P button'
	if (e.keyCode == 80);{
		gm.pauseGame();
	}
});

window.onresize = onResize();