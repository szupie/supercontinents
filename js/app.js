import { select, selectAll } from 'https://cdn.skypack.dev/d3-selection@3';
import { geoPath, geoOrthographic, geoGraticule, geoDistance } from 'https://cdn.skypack.dev/d3-geo@3';

import { init as initTextureGlobe, redraw as redrawGlobeTexture } from './webgl-globe.js';
import { init as initRotationControl, transitionToCoord } from './rotation-control.js';
import * as mapSelector from './map-selector.js';
import { init as initTimeline } from './timeline.js';

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
	.then(initCities);

function createGlobeOverlays() {
	// create meridian and equator
	const lines = {
		'meridian': geoGraticule().step([180, 0]),
		'equator': geoGraticule().step([0, 360])
	}
	const graticuleContainer = svgNode.select('.graticule');
	for (const line in lines) {
		graticuleContainer.append('path')
			.datum(lines[line])
			.attr('id', line)
			.attr('d', svgPathGenerator);
	}

	// create pole indicators
	const poles = [
		{
			'coordinates': [0, 90],
			'label': 'North Pole'
		}, { 
			'coordinates': [0, -90],
			'label': 'South Pole'
		}
	];
	const poleContainers = svgNode.append('g').attr('class', 'poles')
		.selectAll(null).data(poles)
		.enter().append('g')
		.attr('data-label', d=>d.label);
	poleContainers.append('polyline').attr('class', 'stroke');
	poleContainers.append('polyline');
	poleContainers.append("text")
		.attr("class", "label")
		.text(d=>d.label);
	updatePoles();
}
createGlobeOverlays();

function handleMapUpdate() {
	document.getElementById('mya-value').textContent = mapSelector.currentMya;
	updateCityPositions();

	if (trackedCity) {
		transitionToCoord(getCoordsFromData(select(trackedCity).datum()));
	}

}

function updateCityPositions() {
	svgNode.selectAll('.city')
		.attr('visibility', d=>{
			return coordsVisible(getCoordsFromData(d)) ? 'visible' : 'hidden';
		})
		.attr('transform', d=>`translate(${projection(getCoordsFromData(d))})`);
}
function getCoordsFromData(d) {
	let coords = d.properties['coords-by-mya'][mapSelector.currentMya];
	if (!coords) {
		if (mapSelector.currentMya == 0) {
			coords = d.geometry.coordinates;
		}
	}
	return coords;
}

let trackedCity;
function initCities(json) {
	svgNode.append('g').attr('class', 'cities')
		.selectAll(null).data(json.features)
		.enter().append('circle')
			.classed('city', true)
			.attr('data-name', d=>d.properties.name)
			.on('click', function(e, d) {
				trackedCity = this;
				trackedCity.classList.add('tracked');
				transitionToCoord(getCoordsFromData(d));
			});

	// deselection listener
	globeContainer.addEventListener('pointerdown', e=>{
		if (trackedCity) {
			trackedCity.classList.remove('tracked');
			trackedCity = false;
		}
	});

	updateCityPositions();
}

function updateSvgProjection() {
	svgNode.selectAll('.graticule path').attr('d', svgPathGenerator);
	updatePoles();
}
function updatePoles() {
	svgNode.selectAll('.poles g')
		.attr('visibility', d=>{
			return coordsVisible(d.coordinates) ? 'visible' : 'hidden';
		})
		.each(positionPoles);
}
function positionPoles(d) {
	const polePoint = projection(d.coordinates);
	const axisLength = (polePoint[1]-radius)*0.06;
	const labelOffset = (polePoint[1] > radius) ? 16 : -8;
	const tipPoint = [radius, axisLength + polePoint[1]];

	select(this).selectAll('polyline')
		.attr('points', `${polePoint} ${tipPoint}`);

	select(this).selectAll('.label')
		.attr(
			'transform', 
			`translate(${radius}, ${axisLength + labelOffset + polePoint[1]})`
		);
}
function redrawOverlays() {
	ctx.clearRect(0, 0, radius*2, radius*2);
	updateSvgProjection();
};

function redrawGlobe(rotation = false) {
	if (rotation && !isNaN(rotation[0]) && !isNaN(rotation[1])) {
		projection.rotate(rotation);
	}
	redrawOverlays();
	updateCityPositions();
	redrawGlobeTexture();
}


function coordsVisible(coords) {
	const currentCenter = projection.rotate().slice(0, 2).map(val=>-val);
	return geoDistance(coords, currentCenter) <= Math.PI/2;
}

initTextureGlobe(textureCanvas, globeContainer, projection, radius*2);
initRotationControl(projection, textureCanvas, redrawGlobe);

mapSelector.init(document.getElementById('maps-list'), handleMapUpdate);
initTimeline();

redrawGlobe();
