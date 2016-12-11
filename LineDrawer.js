function LineDrawer3D( )
{
	
	this.initClass = function()
	{
		/*=========================Shaders========================*/
      
         // vertex shader source code
        var vertCode =
            "attribute vec3 coordinates;\
			void main(void) { \
            gl_Position = vec4(coordinates, 1.0);\
            gl_PointSize = 10.0; \
        }";
         
         // Create a vertex shader object
         var vertShader = gl.createShader(gl.VERTEX_SHADER);

         // Attach vertex shader source code
         gl.shaderSource(vertShader, vertCode);

         // Compile the vertex shader
         gl.compileShader(vertShader);

         // fragment shader source code
         var fragCode =
            'void main(void) {' +
               ' gl_FragColor = vec4(0.0, 0.0, 0.0, 0.1);' +
            '}';
         
         // Create fragment shader object
         var fragShader = gl.createShader(gl.FRAGMENT_SHADER);

         // Attach fragment shader source code
         gl.shaderSource(fragShader, fragCode);
      
         // Compile the fragmentt shader
         gl.compileShader(fragShader);

         // Create a shader program object to store
         // the combined shader program
         this.shaderProgram = gl.createProgram();

         // Attach a vertex shader
         gl.attachShader(this.shaderProgram, vertShader); 
 
         // Attach a fragment shader
         gl.attachShader(this.shaderProgram, fragShader);

         // Link both programs
         gl.linkProgram(this.shaderProgram);
	}

	this.drawLine = function () {
		
         var vertices = [
            -0.5,0.5,0.0,
            0.0,0.5,0.0,
            -0.25,0.25,0.0
         ];
         
         // Create an empty buffer object to store the vertex buffer
         var vertex_buffer = gl.createBuffer();

         //Bind appropriate array buffer to it
         gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
      
         // Pass the vertex data to the buffer
         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

         // Unbind the buffer
         gl.bindBuffer(gl.ARRAY_BUFFER, null);


         

         // Use the combined shader program object
         gl.useProgram(this.shaderProgram);

         /*======== Associating shaders to buffer objects ========*/

         // Bind vertex buffer object
         gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

         // Get the attribute location
         var coord = gl.getAttribLocation(this.shaderProgram, "coordinates");

         // Point an attribute to the currently bound VBO
         gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);

         // Enable the attribute
         gl.enableVertexAttribArray(coord);

         /*============= Drawing the primitive ===============*/

        //  <!-- // Clear the canvas -->
        //  <!-- gl.clearColor(0.0, 0.0, 0.0, 1.0); -->

        //  <!-- // Enable the depth test -->
        //  <!-- gl.enable(gl.DEPTH_TEST); -->
 
        //  <!-- // Clear the color buffer bit -->
        //  <!-- gl.clear(gl.COLOR_BUFFER_BIT); -->

        //  <!-- // Set the view port -->
        //  <!-- gl.viewport(0,0,canvas.width,canvas.height); -->

         // Draw the triangle
         gl.drawArrays(gl.LINE_LOOP, 0, 3);
	}

	this.update = function() {
		this.drawLine();
	}

};