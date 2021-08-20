import { select } from "https://cdn.skypack.dev/d3-selection@3";
import { geoPath, geoOrthographic, geoGraticule } from "https://cdn.skypack.dev/d3-geo@3";

import * as textureGlobe from './webgl-globe.js';
import { mapDates } from './map-dates.js';

let diameter = Math.min(window.innerWidth, window.innerHeight);

const projection = geoOrthographic()
	.translate([diameter/2, diameter/2])
	.scale(diameter/2);

const canvasNode = document.getElementById("globe-texture");
canvasNode.setAttribute('width', diameter);
canvasNode.setAttribute('height', diameter);

const overlayCanvas = document.getElementById("globe-overlay");
overlayCanvas.setAttribute('width', diameter);
overlayCanvas.setAttribute('height', diameter);
const ctx = overlayCanvas.getContext('2d');

const canvasPathGenerator = geoPath()
	.projection(projection)
	.context(ctx);

const svgPathGenerator = geoPath()
	.projection(projection)
	.pointRadius(5);

const svgNode = select("#globe-data")
	.attr("width", diameter)
	.attr("height", diameter);

fetch("./cities-time.json")
.then(response => response.json())
.then(setRenderFunction);
let redrawCallback;

const graticule = geoGraticule();
function drawGraticule() {
	ctx.beginPath();
	ctx.strokeStyle = '#fff';
	canvasPathGenerator(graticule());
	ctx.stroke();
}

function updateCityPositions() {
	svgNode.selectAll(".city")
		.attr("visibility", d=>{
			return svgPathGenerator(d) ? "visible" : "hidden";
		})
		.attr("transform", d=>{
			let coords = d.properties[`coord-${currentMya}-mya`];
			if (!coords) {
				// if (currentMya == 0) {
					coords = d.geometry.coordinates;
				// }
			}
			return `translate(${projection(coords)})`; 
		});
}

function setRenderFunction(json) {
	svgNode.append("g").attr("class", "cities")
		.selectAll("g").data(json.features)
		.enter().append("circle")
			.attr("class", "city")
			.attr('r', 5)
			.attr("data-name", function(d) { return d.properties.name });

	redrawCallback = function() {
		ctx.clearRect(0, 0, diameter, diameter);
		drawGraticule();
		updateCityPositions();
	};

	redrawCallback();
	textureGlobe.setRedrawCallback(redrawCallback);
}


let currentMapIndex = 0;
let currentMya = 0;
document.addEventListener('keydown', handleKeyboard, false);
function handleKeyboard(e) {
	let direction = 0;
	if (e.key === 'ArrowRight') {
		direction = 1;
	}
	if (e.key === 'ArrowLeft') {
		direction = -1;
	}
	if (direction !== 0) {
		nextMap(direction)
	}
}

function nextMap(direction) {
	// increment/decrement and wrap
	currentMapIndex = (currentMapIndex + direction + mapDates.length)%mapDates.length;
	loadMapImage(mapDates[currentMapIndex]['file']);
	currentMya = mapDates[currentMapIndex]['mya'];
}

function loadMapImage(name) {
	var image = new Image;
	image.src = `./map-textures/${name}.jpg`;
	image.onload = e=>{
		textureGlobe.setTexture(image);
	};
}

textureGlobe.init(canvasNode, projection, diameter, redrawCallback);
loadMapImage(mapDates[currentMapIndex]['file']);
