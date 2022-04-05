import { select, selectAll } from 'https://cdn.skypack.dev/d3-selection@3';
import { geoPath, geoOrthographic, geoGraticule, geoDistance, geoCircle } from 'https://cdn.skypack.dev/d3-geo@3';

import { init as initTextureGlobe, redraw as redrawGlobeTexture } from './globe/webgl-globe.js';
import {
	init as initRotationControl,
	transitionToCoord,
	getCurrentRotation,
	isNorthUp,
	getDragCoords
} from './globe/rotation-control.js';
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

const dragCircleGen = geoCircle().radius(3);

fetch('./data/continent-positions.json')
	.then(response=>response.json())
	.then(initContinents);

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

	svgNode.append('path')
		.attr('id', "drag-indicator");
}

function handleMapUpdate() {
	document.getElementById('mya-value').textContent = mapSelector.currentMya;
	updateContinentPositions();

	if (trackedContinent) {
		transitionToCoord(getCoordsFromData(select(trackedContinent).datum()));
	}

}

function updateContinentPositions() {
	svgNode.selectAll('.continent')
		.attr('visibility', d=>{
			return coordsVisible(getCoordsFromData(d), 0.8) ? 'visible' : 'hidden';
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

let trackedContinent;
function initContinents(json) {
	svgNode.append('g').attr('class', 'continents')
		.selectAll(null).data(json.features)
		.enter().append('text')
			.classed('continent label', true)
			.text(d=>d.properties.name)
			.on('click', function(e, d) {
				trackedContinent = this;
				trackedContinent.classList.add('tracked');
				transitionToCoord(getCoordsFromData(d));
			});

	// deselection listener
	globeContainer.addEventListener('pointerdown', e=>{
		if (trackedContinent) {
			trackedContinent.classList.remove('tracked');
			trackedContinent = false;
		}
	});

	updateContinentPositions();
}

function updateSvgProjection() {
	svgNode.selectAll('.graticule path').attr('d', svgPathGenerator);
	adjustEquatorLabel();
	updatePoles();

	// update drag indicator position
	const dragCoords = getDragCoords();
	if (dragCoords) {
		svgNode.select('#drag-indicator')
			.attr('d', d=>svgPathGenerator(dragCircleGen.center(dragCoords)()));
	}
}

function adjustEquatorLabel() {
	const graticuleLabel = document.querySelector('.graticule .label textPath');
	const normalisedRotation = (getCurrentRotation()[0] + 360) % 360;
	let labelOffsetSign = 1;
	if (isNorthUp()) {
		// orient label correct-side up
		graticuleLabel.setAttribute('side', 'left');
		// move label to avoid text wrapping around globe
		if (normalisedRotation > 50 && normalisedRotation < 220) {
			labelOffsetSign = -1;
		}
	} else {
		graticuleLabel.setAttribute('side', 'right');
		if (normalisedRotation > 45 && normalisedRotation < 80) {
			labelOffsetSign = -1;
		}
	}
	graticuleLabel.setAttribute(
		'startOffset', `${(100 - 7*labelOffsetSign) % 100}%`
	);
}

function updatePoles() {
	svgNode.selectAll('.poles g')
		.attr('visibility', d=>{
			return coordsVisible(d.coordinates) ? 'visible' : 'hidden';
		})
		.each(positionPoles);

	// if both pole labels are visible, show only top-most one for simplicity
	const visibleLabels = document.querySelectorAll(
		'#globe-data .poles g[visibility="visible"]'
	);
	if (visibleLabels.length > 1) {
		if (isNorthUp()) {
			visibleLabels[1].setAttribute('visibility', 'hidden');
		} else {
			visibleLabels[0].setAttribute('visibility', 'hidden');
		}
	}
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
	updateContinentPositions();
	redrawGlobeTexture();
}


function coordsVisible(coords, threshold=1) {
	const currentCenter = projection.rotate().slice(0, 2).map(val=>-val);
	return geoDistance(coords, currentCenter) <= Math.PI/2*threshold;
}

initTextureGlobe(textureCanvas, globeContainer, projection, radius*2);
initRotationControl(projection, textureCanvas, redrawGlobe);

mapSelector.init(document.getElementById('maps-list'), handleMapUpdate);
initTimeline();

redrawGlobe();
createGlobeOverlays();
