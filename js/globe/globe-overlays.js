import { select, selectAll } from '../d3-modules.js';
import { 
	geoPath,
	geoGraticule,
	geoDistance,
	geoCircle
} from '../d3-modules.js';

import {
	transitionToCoord,
	getCurrentRotation,
	isNorthUp,
	getDragCoords
} from './rotation-control.js';
import * as mapSelector from '../map-selector.js';

export {
	init,
	setRadius,
	handleMapUpdate,
	redraw
}


let overlay;
let projection;
let radius;

const svgPathGenerator = geoPath().pointRadius(5);
const dragCircleGen = geoCircle().radius(3);

function init(theProjection, overlayNode, theRadius) {
	projection = theProjection;
	svgPathGenerator.projection(projection);
	overlay = select(overlayNode);
	setRadius(theRadius);

	fetch('./assets/data/continent-positions.json')
		.then(response=>response.json())
		.then(initContinents);

	createGlobeOverlays();
}

function setRadius(newRadius) {
	radius = newRadius;
}

function handleMapUpdate() {
	updateContinentPositions();

	if (trackedContinent) {
		transitionToCoord(getCoordsFromData(select(trackedContinent).datum()));
	}
}

function redraw() {
	updateConstantOverlays();
	updateContinentPositions();
}


function createGlobeOverlays() {
	// create meridian and equator
	const lines = {
		'meridian': geoGraticule().step([180, 0]),
		'equator': geoGraticule().step([0, 360])
	}
	const graticuleContainer = overlay.select('.graticule');
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
	const poleContainers = overlay.append('g').attr('class', 'poles')
		.selectAll(null).data(poles)
		.enter().append('g')
		.attr('data-label', d=>d.label);
	poleContainers.append('polyline').attr('class', 'stroke');
	poleContainers.append('polyline');
	poleContainers.append("text")
		.attr("class", "label")
		.text(d=>d.label);
	updatePoles();

	overlay.append('path')
		.attr('id', "drag-indicator");
}

function updateContinentPositions() {
	overlay.selectAll('.continent')
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
	overlay.append('g').attr('class', 'continents')
		.selectAll(null).data(json.features)
		.enter().append('text')
			.classed('continent label', true)
			.text(d=>d.properties.name)
			.on('click', function(e, d) {
				trackedContinent = this;
				trackedContinent.classList.add('tracked');
				transitionToCoord(getCoordsFromData(d));
				// TO DO: prevent tracking on drag
			});

	// deselection listener
	overlay.node().parentNode.addEventListener('pointerdown', e=>{
		if (trackedContinent) {
			trackedContinent.classList.remove('tracked');
			trackedContinent = false;
		}
	});

	updateContinentPositions();
}

function updateConstantOverlays() {
	overlay.selectAll('.graticule path').attr('d', svgPathGenerator);
	adjustEquatorLabel();
	updatePoles();

	// update drag indicator position
	const dragCoords = getDragCoords();
	if (dragCoords) {
		overlay.select('#drag-indicator')
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
	overlay.selectAll('.poles g')
		.attr('visibility', d=>{
			return coordsVisible(d.coordinates) ? 'visible' : 'hidden';
		})
		.each(positionPoles);

	// if both pole labels are visible, show only top-most one for simplicity
	const visibleLabels = document.querySelectorAll(
		'#globe-overlay .poles g[visibility="visible"]'
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

function coordsVisible(coords, threshold=1) {
	const currentCenter = getCurrentRotation().map(val=>-val);
	return geoDistance(coords, currentCenter) <= Math.PI/2*threshold;
}
