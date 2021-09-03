import { select, selectAll } from 'https://cdn.skypack.dev/d3-selection@3';
import { geoPath, geoOrthographic, geoGraticule } from 'https://cdn.skypack.dev/d3-geo@3';

import { init as initTextureGlobe, redraw as redrawGlobeTexture } from './webgl-globe.js';
import { init as initRotationControl } from './rotation-control.js';
import * as mapSelector from './map-selector.js';

let radius = Math.min(window.innerWidth, window.innerHeight, 600)/2;

const projection = geoOrthographic()
	.translate([radius, radius])
	.scale(radius);

const globeContainer = document.getElementById('globe');
const textureCanvas = document.getElementById('globe-texture');
textureCanvas.setAttribute('width', radius*2);
textureCanvas.setAttribute('height', radius*2);

const overlayCanvas = document.getElementById('globe-overlay');
overlayCanvas.setAttribute('width', radius*2);
overlayCanvas.setAttribute('height', radius*2);
const ctx = overlayCanvas.getContext('2d');

const canvasPathGenerator = geoPath()
	.projection(projection)
	.context(ctx);

const svgPathGenerator = geoPath()
	.projection(projection)
	.pointRadius(5);

const svgNode = select('#globe-data')
	.attr('width', radius*2)
	.attr('height', radius*2);

fetch('./cities-time.json')
	.then(response=>response.json())
	.then(setRenderFunction);
let redrawCallback = ()=>{};

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
		ctx.clearRect(0, 0, radius*2, radius*2);
		drawGraticule();
		updateCityPositions();
	};

	redrawCallback();
}
function redrawGlobe(rotation = false) {
	if (rotation && !isNaN(rotation[0]) && !isNaN(rotation[1])) {
		projection.rotate(rotation);
	}
	redrawCallback();
	redrawGlobeTexture();
}

initTextureGlobe(textureCanvas, globeContainer, projection, radius*2, redrawCallback);
initRotationControl(projection, textureCanvas, redrawGlobe)
mapSelector.init(document.getElementById('maps-list'));
