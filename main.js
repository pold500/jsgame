"use strict";

var canvas = document.getElementById("gameCanvas");
var gl = canvas.getContext("webgl", {
		stencil: true,
		'preserveDrawingBuffer': true,
		'antialias': true,
		'alpha': false
	});

var vertexShader =
	"attribute vec4 a_position;" +
	"uniform mat4 p_matrix;" +
	"void main() {" +
	"  gl_Position = p_matrix * vec4(a_position);" +
	"}";
var fragmentShader =
	"void main() {" +
	"  gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);" +
	"}";


	
var paddle1X = 20;
var paddle1Y = 400;
var paddle2X = 1260;
var paddle2Y = 400;
var ballX = 640;
var ballY = 400;
var ballVX = (Math.random() < 0.5) ? 6 : -6;
var ballVY = Math.random() * 8 - 4;
	

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



function SimpleBall() {
	this.program = null;
	this.vertexBuffer = null;
	this.aPosition = null;

	this.ballVertexShader =
	"precision mediump float; attribute vec4 a_position;" +
	"uniform mat4 p_matrix;\n" +
	"\n"+
	"void main() {" +
	"  gl_Position = p_matrix * vec4(a_position);" +
	"}";
	this.ballFragmentShader =
	"precision mediump float; \n" +
	"uniform vec4 u_ballCoord4; \n" +
	"void main() \n" + 
	"{  gl_FragColor = u_ballCoord4; } \n";
	

	
	
	
	
	this.initObject = function()
	{
		this.program = this.initShader(this.ballVertexShader, this.ballFragmentShader);
		this.u_colorLocation = gl.getUniformLocation(this.program, "u_ballCoord4");
		this.initVertexShaderData();
		this.changeBallColor();
		this.INTERVAL = 1000;
		this.intervalID = setInterval(this.changeBallColor.bind(this), this.INTERVAL);
	}
	
	this.changeBallColor = function()
	{
		console.log("do smth");
		console.log("u_colorLocation " + this.u_colorLocation)
		var r = Math.random();
		var g = Math.random();
		var b = Math.random();
		gl.uniform4f(this.u_colorLocation, r, g, b, 1);
	}
	
	this.initShader = function (vertexShader, fragmentShader) {
		var program = gl.createProgram();
		addShader(program, gl.VERTEX_SHADER, vertexShader);
		addShader(program, gl.FRAGMENT_SHADER, fragmentShader);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.log("linkProgram failed:", gl.getProgramInfoLog(program));
		}
		//gl.useProgram(program);
		gl.useProgram(program);
		return program;
	}

	this.initVertexShaderData = function () {
		this.aPosition = gl.getUniformLocation(this.program, "a_position");
		var uMatrix = gl.getUniformLocation(this.program, "p_matrix");
		var m = new Float32Array([2 / 1280, 0, 0, 0, 0, 2 / 800, 0, 0, 0, 0, 1, 0, -1, -1, 0, 1]);
		gl.uniformMatrix4fv(uMatrix, false, m);
		this.vertexBuffer = gl.createBuffer();
	}
	
	this.update = function (timeStamp) {
		
		//this.changeColorTimer.update();
		ballX += ballVX;
		ballY += ballVY;
		if (ballY < 10 || ballY > 790) {
			ballVY *= -1;
		}
		// TODO is this /too/ stupid to not be using the paddleX position here?
		if (Math.abs(ballY - paddle1Y) < 55 && (ballX > 15 && ballX < 25)) {
			ballVX *= -1.075;
			ballVY = (ballY - paddle1Y) / 5;
		}
		if (Math.abs(ballY - paddle2Y) < 55 && (ballX > 1255 && ballX < 1265)) {
			ballVX *= -1.075;
			ballVY = (ballY - paddle2Y) / 5;
		}

		if (ballX < 0 || ballX > 1280) {
			ballX = 640;
			ballY = 400;
			ballVX = (Math.random() < 0.5) ? 6 : -6;
			ballVY = Math.random() * 8 - 4;
		}

		var dy = ballY - paddle2Y;
		if (dy < -6) {
			dy = -6;
		}
		if (dy > 6) {
			dy = 6;
		}
		paddle2Y += dy;
		if (paddle2Y < 50) {
			paddle2Y = 50;
		}
		if (paddle2Y > 750) {
			paddle2Y = 750;
		}

		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.enableVertexAttribArray(this.aPosition);
		gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, 0, 0);
		drawRect(ballX, ballY, 10, 10);
		drawRect(paddle1X, paddle1Y, 10, 100);
		drawRect(paddle2X, paddle2Y, 10, 100);

	}



};



function GameManager()
{
	this.entities = [];

	this.addEntity = function(entity)
	{
		this.entities.push(entity);
	}
	this.updateGame = function()
	{
		this.entities.forEach(entity => { entity.update(); });
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

function onMouseMove(e) {
	paddle1Y = 800 - e.pageY;
	if (paddle1Y < 50) {
		paddle1Y = 50;
	}
	if (paddle1Y > 750) {
		paddle1Y = 750;
	}
}

canvas.addEventListener("mousemove", onMouseMove, false);

var gm = new GameManager();
var simpleBall = new SimpleBall();
simpleBall.initObject();
gm.addEntity(simpleBall);

var fps = 60;
setInterval(onTimerTick, 1000 / fps); // 33 milliseconds = ~ 30 frames per sec

function onTimerTick() {
    // Do stuff.
	gm.updateGame();
}
