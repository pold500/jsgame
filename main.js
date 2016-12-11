"use strict";

var DEG2RAD = 0.01745329252;
var RAD2DEG = 1 / DEG2RAD;
var g_width = 0;
var g_height = 0;
var canvas = document.getElementById("gameCanvas");
var gl = canvas.getContext("webgl", {
		stencil: true,
		'preserveDrawingBuffer': true,
		'antialias': true,
		'alpha': false
});

function Rect(pos, size) {
	this.pos = pos;
	this.size = size;

	this.recalcRect = function (pos) {
		if (pos === null) {
			pos = this.pos;
		}
		var posCopy = createVector(pos);
		//don't forget to update pos variable!
		//this becomes diffucult to handle, need some refactoring..
		var sizeCopy = createVector(this.size);
		var halfSize = sizeCopy.divide(2);
		this.left_upper = posCopy.subtract(halfSize);
		posCopy = createVector(pos);
		sizeCopy = createVector(size);
		halfSize = sizeCopy.divide(2);
		this.right_lower = posCopy.add(halfSize);
	}

	this.update = function (pos) {
		this.recalcRect(pos);
	}

	//this.recalcRect();

	this.doesIntersect = function (otherRect) {
		var isInRange = function (value, range_low, range_up) {
			return value >= range_low && value <= range_up;
		};

		return (this.left_upper.x < otherRect.right_lower.x && this.right_lower.x > otherRect.left_upper.x &&
			this.left_upper.y < otherRect.right_lower.y && this.right_lower.y > otherRect.left_upper.y);
	}
}

var paddleVertexShader =
	"attribute vec4 a_position;" +
	"uniform mat4 p_matrix;" +
	"void main() {" +
	"  gl_Position = p_matrix * vec4(a_position);" +
	"}";
//55, 121, 229
var paddleFragmentShader =
	"void main() {" +
	"  gl_FragColor = vec4(55.0 / 256.0, 121.0 / 256.0, 229.0 / 256.0, 1.0);" +
	"}";

var ballVertexShader =
	"precision mediump float; attribute vec4 a_position;" +
	"uniform mat4 p_matrix;\n" +
	"\n" +
	"void main() {" +
	"  gl_Position = p_matrix * vec4(a_position);" +
	"}";

var ballFragmentShader =
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
};

function DrawableRect() {
	this.program = null;
	this.vertexBuffer = null;
	this.attrPosition = null;

	this.initObject = function (vertexShader, fragmentShader, position, size) {
		this.size = size;
		this.position = position;
		this.program = this.initShader(vertexShader, fragmentShader);

	}

	this.initShader = function (vertexShader, fragmentShader) {
		var program = gl.createProgram();
		this.vertexShader = vertexShader;
		this.fragmentShader = fragmentShader;
		addShader(program, gl.VERTEX_SHADER, vertexShader);
		addShader(program, gl.FRAGMENT_SHADER, fragmentShader);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.log("linkProgram failed:", gl.getProgramInfoLog(program));
		}

		return program;
	}

	this.initVertexShaderData = function () {


		var uMatrix = gl.getUniformLocation(this.program, "p_matrix");
		//this is an orthographic projection matrix
		var maxWidth = 1980;
		var maxHeight = 1080;
		var m = new Float32Array([2 / g_width, 0, 0, 0,
			0, 2 / g_height, 0, 0,
			0, 0, -2, 0,
		-1, -1, -1, 1]); //columns are rows of this array
		//we should rotate it
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

		var rotate = function (x, y, angle) {
			var rad = angle * DEG2RAD;
			x = x * Math.cos(rad) - y * Math.sin(rad);
			y = x * Math.sin(rad) + y * Math.cos(rad);
			return new Vector(Math.abs(x), Math.abs(y));
		};
		var posCopy = createVector(this.position);
		var sizeCopy = createVector(this.size);
		var rotatedPos = rotate(posCopy.x, posCopy.y, 0);
		var rotatedSize = rotate(sizeCopy.x, sizeCopy.y, -90);
		//drawRect(rotatedPos.x, rotatedPos.y, rotatedSize.x, rotatedSize.y);
		drawRect(this.position.x, this.position.y, this.size.x, this.size.y);
	}
	this.update = function () {

	}
};



function SimpleBall(ballSize, ballSpeed, userPaddle) {
	this.program = null;
	this.vertexBuffer = null;
	this.aPosition = null;
	this.position = new Vector(0, 0);
	this.movementDirectionVector = new Vector(0, 0);
	this.ballSize = ballSize;
	this.ballSpeed = ballSpeed;
	this.bindToPlayerRacket = true;
	this.racket = userPaddle;
	//this.lineDrawer = LineDrawer3D();
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

		// this.respawnBallInCenter();
		// var vectorLeft = new Vector(-1, 0);
		// this.movementDirectionVector = vectorLeft.multiply(this.ballSpeed);
	}

	this.respawnOnPlayersRaсket = function () {
		this.bindToPlayerRacket = true;
		this.position = createVector(this.racket.position).add(new Vector(this.racket.size.x, 0).divide(2));
		this.movementDirectionVector = new Vector(0, 0);
	}

	this.updatePositionOnRacket = function () {
		if (this.bindToPlayerRacket) {
			this.position = createVector(this.racket.position).add(new Vector(this.racket.size.x, 0).divide(2)).add(new Vector(this.ballSize / 2, 0));
			this.movementDirectionVector = new Vector(0, 0);
		}
	}


	this.onMouseClick = function (e) {
		if (this.bindToPlayerRacket) {
			this.bindToPlayerRacket = false;
			var rightDirection = new Vector(1, 0);
			var dirVec = rightDirection;
			var movementDirectionVector = dirVec.multiply(this.ballSpeed);
			this.reflectBallInRandomAngle(movementDirectionVector);
		}
	}

	this.onCollide = function (collider) {
		console.log("SimpleBall collided with smth");
		//reflect ball!
		this.changeMovementDirectionOnCollide();
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

		//this.lineDrawer.drawLine();

	}

	this.reflectBallInRandomAngle = function (dirVec) {
		var shouldReflectUpside = false; //Math.random() > 0.5;
		var maxUpDegree = Math.atan2(g_height - this.position.y,
			g_width) * RAD2DEG;
		var maxDownDegree = Math.atan2(this.position.y,
			g_width) * RAD2DEG;

		var angleThreshold = 5;

		var canReflectUpside = maxUpDegree > angleThreshold;
		var canReflectDownside = maxDownDegree > angleThreshold;

		if (!canReflectUpside) {
			shouldReflectUpside = false;
		}
		if (!canReflectDownside) {
			shouldReflectUpside = true;
		}

		console.log("maxUpDegree " + maxUpDegree + " maxDownDegree " + maxDownDegree);
		console.log("reflectUpside: " + shouldReflectUpside);

		var maxDegree = shouldReflectUpside ? maxUpDegree : maxDownDegree;
		var degree = Math.min(Math.random() * 100, maxDegree - 0.001);
		if (shouldReflectUpside)
			degree *= -1;
		var rotVec = CreateRotatedVector(dirVec, degree * DEG2RAD);
		this.movementDirectionVector = dirVec.add(rotVec).normalize().multiply(this.ballSpeed);
	}

	this.respawnBallInCenter = function () {
		var screenCenter = new Vector(g_width / 2, g_height / 2);
		this.position = screenCenter;
		var vectorLeft = new Vector(-1, 0);
		this.movementDirectionVector = vectorLeft.multiply(this.ballSpeed);
	}

	this.updateBallPosition = function () {
		var vectorRight = new Vector(1, 0);
		//this.checkWorldBounds(this.position);
		//this.movementDirectionVector = vectorRight.multiply(this.ballSpeed);

		this.position = this.position.add(this.movementDirectionVector);
		//this.checkWorldBounds(this.position);
		//this.onCollisionWithWorldBounds();
	}

	this.update = function () {
		if (this.bindToPlayerRacket) {
			this.updatePositionOnRacket();
		} else {
			this.updateBallPosition();
		}

		this.collisionRect.update(this.position);

	}
	this.draw = function () {
		this.drawBall();
		
	}
};

function Paddle(pos, size) {
	this.drawableRect = new DrawableRect();
	this.size = size;
	this.position = pos;
	this.init = function () {
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
	this.onCollide = function (collider) {
		console.log("Paddle collided with smth");
		var rightDirection = new Vector(1, 0);
		// var dirVec = rightDirection;
		// collider.movementDirectionVector = dirVec.multiply(collider.ballSpeed);
		collider.reflectBallInRandomAngle(rightDirection);
	}
	this.update = function () {
		this.collisionRect.update(this.position);
	}
	this.onMouseMove = function (e) {
		var pageYInv = g_height - e.pageY;
		//console.log(pageYInv);
		var maxYVal = g_height - this.size.y / 2;
		var minYVal = 0 + this.size.y / 2;
		if (pageYInv < g_height / 2) {
			this.position.y = Math.max(minYVal, pageYInv);
		}
		else {
			this.position.y = Math.min(maxYVal, pageYInv);
		}
	};
};

function AIPaddle(pos, size, ball) {
	this.drawableRect = new DrawableRect();
	this.size = size;
	this.position = pos;

	this.ball = ball;

	this.init = function () {

		this.drawableRect = new DrawableRect();
		this.drawableRect.initObject(paddleVertexShader, paddleFragmentShader, this.position, this.size);
		this.program = this.drawableRect.program;
		this.collisionRect = new Rect(this.position, new Vector(this.size.x, this.size.y));
	}

	this.init();

	this.draw = function () {
		this.drawableRect.position = this.position;
		//don't forget to switch the fragment shader!
		gl.useProgram(this.program); //use your own program
		this.drawableRect.draw();
	}
	this.onCollide = function (collider) {
		var leftDirection = new Vector(-1, 0);
		//var dirVec = leftDirection;
		// collider.movementDirectionVector = dirVec.multiply(collider.ballSpeed);
		collider.reflectBallInRandomAngle(leftDirection);
	}
	//if user lost, for example
	this.resetPosToCenter = function () {
		this.position.y = g_height / 2;
	}




	this.moveLogic = function () {
		if (this.ball.bindToPlayerRacket)
			return;

		var ballCoord = this.ball.position.y;

		if (Math.abs(this.position.y - this.ball.position.y) > this.size.y) {
			//interpolate
		}

		//console.log(ballCoord);
		var maxYVal = g_height - this.size.y / 2;
		var minYVal = 0 + this.size.y / 2;
		if (ballCoord < g_height / 2) {
			this.position.y = Math.max(minYVal, ballCoord);
		}
		else {
			this.position.y = Math.min(maxYVal, ballCoord);
		}
	}

	this.update = function () {
		this.moveLogic();
		this.collisionRect.update(this.position);
	}
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

//This class watches the gameplay rules, and counts the score
function RulesManager(ball, userPaddle, aiPaddle) {
	this.ball = ball;
	this.userPaddle = userPaddle;
	this.aiPaddle = aiPaddle;
	var scoreElement = document.getElementById("score");
	this.userScore = 0;
	this.aiScore = 0;

	this.checkBallPosition = function () {
		if (this.ball.position.x < this.userPaddle.position.x) {
			this.addAIScore();
			this.ball.respawnOnPlayersRaсket();
			this.aiPaddle.resetPosToCenter();
		}
		if (this.ball.position.x > this.aiPaddle.position.x) {
			this.addUserScore();
			this.ball.respawnOnPlayersRaсket();
			this.aiPaddle.resetPosToCenter();
		}
	}

	this.update = function () {
		//if ball went outside the screeen limits, reset it, and update the score
		//scoreElement.innerHTML = "Score: " + this.userScore + " " + this.aiScore;
		this.checkBallPosition();
	}
	this.addUserScore = function () {
		this.userScore++;
	}
	this.addAIScore = function () {
		this.aiScore++;
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

function collistionTest(entities) {
	entities.forEach(function (entity) {
		entities.forEach(function (subEntity) {
			if (subEntity !== entity) {
				if (entity.collisionRect && subEntity.collisionRect &&
					subEntity.collisionRect.doesIntersect(entity.collisionRect) && subEntity.onCollide) {
					//alert("collision!");
					subEntity.onCollide(entity);
				}
			}
		});
	});
}

document.addEventListener("DOMContentLoaded", function (event) {

	g_width = window.innerWidth; // in pixels
	g_height = window.innerHeight; // in pixels

	//init all other parts of the game
	var gm = new GameManager();

	var paddleSize = new Vector(15, 180);
	var userPaddle = new Paddle(new Vector(0 + paddleSize.x, g_height / 2), paddleSize);

	var simpleBall = new SimpleBall(25, 15, userPaddle);
	simpleBall.initObject();
	gm.addEntity(simpleBall);



	var aiPaddle = new AIPaddle(new Vector(g_width - paddleSize.x, g_height / 2), paddleSize, simpleBall);

	aiPaddle.position = new Vector(g_width - paddleSize.x, g_height / 2);
	userPaddle.position = new Vector(0 + paddleSize.x, g_height / 2);

	gm.addEntity(userPaddle);
	gm.addEntity(aiPaddle);


	// var drawableRect = new DrawableRect();
	// drawableRect.initObject(paddleVertexShader, paddleFragmentShader, new Vector(g_width / 2, g_height / 2), new Vector(600, 600));
	// gm.addEntity(drawableRect);

	//GameplayManager(ball, userPaddle, aiPaddle)
	var rulesMgr = new RulesManager(simpleBall, userPaddle, aiPaddle);

	function onMouseMove(e) {
		//go through entites and send them a message
		if (!gm.isPaused) {
			gm.entities.forEach(entity => {
				if (entity.onMouseMove) {
					entity.onMouseMove(e);
				}
			});
		}
	}

	function onMouseClick(e) {
		//go through entites and send them a message
		if (!gm.isPaused) {
			gm.entities.forEach(entity => {
				if (entity.onMouseClick)
					entity.onMouseClick(e);
			});
		}
	}

	canvas.addEventListener("click", onMouseClick);
	canvas.addEventListener("mousemove", onMouseMove, false);

	var fps = 60;
	setInterval(onTimerTick, 1000 / fps);

	function cleanGLContext() {
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
	}



	document.body.addEventListener('keydown', function (e) {
		//'P button'
		if (e.keyCode == 80); {
			gm.pauseGame();
		}
	});

	// window.onresize = function () {
	// 	g_width = gl.canvas.width = window.innerWidth; // in pixels
	// 	g_height = gl.canvas.height = window.innerHeight; // in pixels
	// 	aiPaddle.position = new Vector(g_width - paddleSize.x, g_height / 2);
	// 	userPaddle.position = new Vector(0 + paddleSize.x, g_height / 2);
	// 	//ball pos?
	// };
	function renderBorders() {
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		// Draw a 1 pixel border around the edge using 
		// the scissor test since it's easier than setting up
		// a lot of stuff
		gl.clearColor(1, 0, 0, 1);  // red
		gl.disable(gl.SCISSOR_TEST);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(1, 1, gl.canvas.width - 2, gl.canvas.height - 2);
		gl.clearColor(0, 0, 1, 1);  // blue
		gl.clear(gl.COLOR_BUFFER_BIT);
	};

	function resizeCanvas() {
		var width = canvas.clientWidth;
		var height = canvas.clientHeight;
		if (canvas.width != width ||
			canvas.height != height) {
			canvas.width = width;
			canvas.height = height;

			// in this case just render when the window is resized.
			renderBorders();
		}
	}
	window.addEventListener('resize', resizeCanvas);
	resizeCanvas();


	function onTimerTick() {
		try {
			if (!gm.isPaused) {
				cleanGLContext();
				gm.updateGame();
				collistionTest(gm.entities);
				rulesMgr.update();
				//renderBorders();
			}
		} catch (e) {
			console.log('Error ' + e.name + ":" + e.message + "\n" + e.stack);
		}
	}
});




