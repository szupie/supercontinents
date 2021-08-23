import { select, selectAll } from 'https://cdn.skypack.dev/d3-selection@3';
import { geoPath, geoOrthographic, geoGraticule } from 'https://cdn.skypack.dev/d3-geo@3';

import { init as initTextureGlobe, setRedrawCallback } from './webgl-globe.js';
import * as mapSelector from './map-selector.js';

let diameter = Math.min(window.innerWidth, window.innerHeight, 600);

const projection = geoOrthographic()
	.translate([diameter/2, diameter/2])
	.scale(diameter/2);

const globeContainer = document.getElementById('globe');
const textureCanvas = document.getElementById('globe-texture');
textureCanvas.setAttribute('width', diameter);
textureCanvas.setAttribute('height', diameter);

const overlayCanvas = document.getElementById('globe-overlay');
overlayCanvas.setAttribute('width', diameter);
overlayCanvas.setAttribute('height', diameter);
const ctx = overlayCanvas.getContext('2d');

const canvasPathGenerator = geoPath()
	.projection(projection)
	.context(ctx);

const svgPathGenerator = geoPath()
	.projection(projection)
	.pointRadius(5);

const svgNode = select('#globe-data')
	.attr('width', diameter)
	.attr('height', diameter);

fetch('./cities-time.json')
	.then(response=>response.json())
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
	svgNode.selectAll('.city')
		.attr('visibility', d=>{
			return svgPathGenerator(d) ? 'visible' : 'hidden';
		})
		.attr('transform', d=>{
			let coords = d.properties[`coord-${mapSelector.currentMya}-mya`];
			if (!coords) {
				// if (currentMya == 0) {
					coords = d.geometry.coordinates;
				// }
			}
			return `translate(${projection(coords)})`; 
		});
}

function setRenderFunction(json) {
	svgNode.append('g').attr('class', 'cities')
		.selectAll(null).data(json.features)
		.enter().append('circle')
			.classed('city', true)
			.attr('r', 5)
			.attr('data-name', function(d) { return d.properties.name });

	redrawCallback = function() {
		ctx.clearRect(0, 0, diameter, diameter);
		drawGraticule();
		updateCityPositions();
	};

	redrawCallback();
	setRedrawCallback(redrawCallback);
}

initTextureGlobe(textureCanvas, globeContainer, projection, diameter, redrawCallback);
mapSelector.init(document.getElementById('maps-list'));
