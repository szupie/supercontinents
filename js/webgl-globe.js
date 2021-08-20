/* 
Modified from Philippe Rivière’s “Mars on a WebGL globe”
https://bl.ocks.org/Fil/358e889380bfc9d8e4871cc9dc338cf9
Originally released under The MIT License

Copyright 2019, Philippe Rivière

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
import { select, pointer } from "https://cdn.skypack.dev/d3-selection@3";
import { scaleLinear } from "https://cdn.skypack.dev/d3-scale@4";
import { zoom } from "https://cdn.skypack.dev/d3-zoom@3";

export {
	init,
	resize,
	setTexture,
	setRedrawCallback
};

let context;
let texture;
let translateUniform, scaleUniform, rotateUniform;

let projection;
let scale, rotate;
let redrawCallback = ()=>{};

function init(canvas, theProjection, diameter) {
	initWebgl(canvas);

	resize(diameter);

	initPanning(diameter, theProjection);
}

function resize(diameter) {
	context.uniform2f(translateUniform, diameter / 2, diameter / 2);
	context.viewport(0, 0, diameter, diameter);
}

function setTexture(image) {
	context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, image);
	redraw();
}

function setRedrawCallback(callback) {
	redrawCallback = callback;
}


function initPanning(diameter, theProjection) {
	projection = theProjection;

	// The current rotation
	scale = projection.scale();
	rotate = [0, 0, 0];
	// let scale0 = scale;


	var lambda = scaleLinear()
		.domain([-diameter / 2, diameter / 2])
		.range([-180, 180]);

	var phi = scaleLinear()
		.domain([0, diameter])
		.range([90, -90]);

	var q, r, transform, d;

	var zoomHandler = zoom()
		.scaleExtent([.8, 1.5])
		.on("start", function (event) {
			q = rotate, d = [0, 0, 0]; // accumulate change in d
			r = pointer(event);
		})
		.on("zoom.redraw", function (event) {
			// scale = scale0 * event.transform.k;
			var p = pointer(event);
			var dr = [lambda(p[0]) - lambda(r[0]), phi(p[1]) - phi(r[1])];
			r = p;

			// inverse dr[0] if the mouse is beyond one of the poles
			var a = (phi(p[1]) - rotate[1]) * Math.PI / 180,
				ca = Math.cos(a),
				sa = Math.sin(a);

			d = [d[0] + dr[0] * (ca < 0 ? -1 : 1),
						d[1] + dr[1], d[2] + dr[0] * -sa];

			rotate = [q[0] + d[0], q[1] + d[1], q[2] + 0 * d[2]];

			redraw();
		});

	select("body")
		.call(zoomHandler);	
}

function redraw() {
	projection.scale(scale).rotate(rotate);

	context.uniform1f(scaleUniform, projection.scale());
	context.uniform3fv(rotateUniform, projection.rotate());
	// context.bindTexture(context.TEXTURE_2D, texture); // XXX Safari
	context.drawArrays(context.TRIANGLE_FAN, 0, 4);

	redrawCallback();
}


const vertexShaderScript = `
attribute vec2 a_position;

void main(void) {
	gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderScript = `
precision mediump float;

uniform sampler2D u_image;
uniform vec2 u_translate;  /*  width/2, height/2 */
uniform float u_scale;  /* in pixels ! */
uniform vec3 u_rotate;  /* rotation in degrees ! */

const float c_pi = 3.14159265358979323846264;
const float c_halfPi = c_pi * 0.5;
const float c_twoPi = c_pi * 2.0;

float phi0 = -u_rotate.y / 90.0 * c_halfPi;

float cosphi0 = cos(phi0);
float sinphi0 = sin(phi0);

void main(void) {
	float x = (gl_FragCoord.x - u_translate.x) / u_scale;
	float y = (u_translate.y - gl_FragCoord.y) / u_scale;

	// inverse orthographic projection
	float rho = sqrt(x * x + y * y);

	// color if the point (px, py) does not exist in the texture
	if (rho >= 1.0) {
		gl_FragColor = vec4(0);

	} else {

		float cosc = cos(asin(rho));
		float lambda = atan(x, cosc);
		float phi = asin(y);

		// inverse rotation
		float cosphi = cos(phi);
		float x0 = cos(lambda) * cosphi;
		float y0 = sin(lambda) * cosphi;
		float cosgamma = cos(u_rotate.z / 90.0 * c_halfPi);
		float singamma = sin(u_rotate.z / 90.0 * c_halfPi);
		float x1 = x0 * cosgamma - y0 * singamma;
		float y1 = y0 * cosgamma + x0 * singamma;
		float z1 = y;
		lambda = atan(y1, x1 * cosphi0 + z1 * sinphi0) - u_rotate.x / 90.0 * c_halfPi;
		phi = asin(z1 * cosphi0 - x1 * sinphi0);

		// pixels
		float px = (lambda + c_pi) / c_twoPi;
		float py = (phi + c_halfPi) / c_pi;

		float wrapped_px = px - 1.0*floor(px/1.0);

		gl_FragColor = texture2D(u_image, vec2(wrapped_px, py));

	}
}
`;
function initWebgl(canvas) {

	// Create the WebGL context, with fallback for experimental support.
	context = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

	// Compile the vertex shader.
	var vertexShader = context.createShader(context.VERTEX_SHADER);
	context.shaderSource(vertexShader, vertexShaderScript);
	context.compileShader(vertexShader);
	if (!context.getShaderParameter(vertexShader, context.COMPILE_STATUS)) throw new Error(context.getShaderInfoLog(vertexShader));

	// Compile the fragment shader.
	var fragmentShader = context.createShader(context.FRAGMENT_SHADER);
	context.shaderSource(fragmentShader, fragmentShaderScript);
	context.compileShader(fragmentShader);
	if (!context.getShaderParameter(fragmentShader, context.COMPILE_STATUS)) throw new Error(context.getShaderInfoLog(fragmentShader));

	// Link and use the program.
	var program = context.createProgram();
	context.attachShader(program, vertexShader);
	context.attachShader(program, fragmentShader);
	context.linkProgram(program);
	if (!context.getProgramParameter(program, context.LINK_STATUS)) throw new Error(context.getProgramInfoLog(program));
	context.useProgram(program);

	// Define the positions (as vec2) of the square that covers the canvas.
	var positionBuffer = context.createBuffer();
	context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
	context.bufferData(context.ARRAY_BUFFER, new Float32Array([
		-1.0, -1.0,
		+1.0, -1.0,
		+1.0, +1.0,
		-1.0, +1.0
	]), context.STATIC_DRAW);

	// Bind the position buffer to the position attribute.
	var positionAttribute = context.getAttribLocation(program, "a_position");
	context.enableVertexAttribArray(positionAttribute);
	context.vertexAttribPointer(positionAttribute, 2, context.FLOAT, false, 0, 0);

	// Extract the projection parameters.
	translateUniform = context.getUniformLocation(program, "u_translate");
	scaleUniform = context.getUniformLocation(program, "u_scale");
	rotateUniform = context.getUniformLocation(program, "u_rotate");


	texture = context.createTexture();
	context.bindTexture(context.TEXTURE_2D, texture);
	context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
	context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR_MIPMAP_LINEAR);

	context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
	context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
	context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
}
