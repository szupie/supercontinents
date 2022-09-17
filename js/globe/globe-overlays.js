import { select, selectAll } from '../d3-modules.js';
import { 
	geoPath,
	geoGraticule,
	geoDistance,
	geoCircle,
	geoInterpolate
} from '../d3-modules.js';

import {
	transitionToCoord,
	getCurrentRotation,
	isNorthUp,
	getDragCoords
} from './rotation-control.js';
import * as mapSelector from '../map-selector.js';

import { 
	initInstance as initVectorMapInstance
} from './craton-drawer.js';

import { clamp, easeInOut } from '../common-utils.js';

export {
	init,
	setRadius,
	handleMyaUpdate,
	redraw,
}


let overlay;
let projection;
let radius;

const svgPathGenerator = geoPath().pointRadius(5);
const dragCircleGen = geoCircle().radius(3);

let overlayTweenStartMya;
let overlayTweenStartTime = false;
const overlayTweenDuration = 300;

let setReconstructionData = ()=>{};
let redrawReconstruction = ()=>{};
let getCratonCenters = ()=>{};

let textureContinentLabelsData;
let trackedCratonLabel;

let vectorMapPromise;
function init(theProjection, overlayNode, theRadius) {
	projection = theProjection;
	svgPathGenerator.projection(projection);
	overlay = select(overlayNode);
	setRadius(theRadius);

	overlay.append('g').attr('class', 'continent-labels');
	fetch('./assets/data/craton-label-positions.json')
		.then(response=>response.json())
		.then(data=>{
			textureContinentLabelsData = data.features;
			bindDataToCratonLabels(getTextureLabelsDataForMya(0));
		});

	createGlobeOverlays();


	// tracked craton label deselection listener
	overlay.node().parentNode.addEventListener('pointerdown', e=>{
		if (trackedCratonLabel) {
			trackedCratonLabel.classList.remove('tracked');
			trackedCratonLabel = false;
		}
	});


	vectorMapPromise = initVectorMapInstance(
		projection, svgPathGenerator, overlayNode
	);
	vectorMapPromise.then(methods=>{
		setReconstructionData = methods.setReconstructionData;
		redrawReconstruction = methods.redrawReconstruction;
		getCratonCenters = methods.getCratonCenters;
	});
}

function setRadius(newRadius) {
	radius = newRadius;
}

async function handleMyaUpdate(prevMya, newMya) {
	overlayTweenStartMya = prevMya;
	overlayTweenStartTime = Date.now();

	// attach as attribute to persist over data() updates
	overlay.selectAll('.continent-labels .label')
		.attr('data-last-lat', d=>d['coordinates'][1])
		.attr('data-last-lon', d=>d['coordinates'][0]);

	if (mapSelector.currentMapType == mapSelector.MapTypes.TEXTURE) {
		if (textureContinentLabelsData) {
			bindDataToCratonLabels(getTextureLabelsDataForMya(newMya));
		}
	} else {
		await vectorMapPromise;
		const data = mapSelector.getCurrentReconstructionData();
		if (data) {
			setReconstructionData(data);
			redrawReconstruction();
			bindDataToCratonLabels(getCratonCenters());
		}
	}

	if (trackedCratonLabel) {
		transitionToCoord(select(trackedCratonLabel).datum()['coordinates']);
	}
}

function redraw() {
	updateConstantOverlays();
	updateContinentLabelPositions();
	if (mapSelector.currentMapType == mapSelector.MapTypes.VECTOR) {
		redrawReconstruction();
	}
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
		.selectAll('g').data(poles).join('g')
			.attr('data-label', d=>d.label);
	poleContainers.append('polyline').attr('class', 'stroke');
	poleContainers.append('polyline');
	poleContainers.append("text")
		.attr("class", "label")
		.text(d=>d.label);
	updatePoles();

	overlay.append('path').attr('id', "drag-indicator");
}

function updateContinentLabelPositions() {
	let percentage = 1;
	if (overlayTweenStartTime) {
		const elapsed = Date.now() - overlayTweenStartTime;
		percentage = clamp(elapsed/overlayTweenDuration, 0, 1);
	}
	overlay.selectAll('.continent-labels .label').each(function(d) {
		if (d['coordinates']) {
			let coords = d['coordinates'];
				const label = select(this);
				const prevCoords = [
					label.attr('data-last-lon'),
					label.attr('data-last-lat')
				];
				if (percentage < 1 && prevCoords[0] && prevCoords[1]) {
					coords = geoInterpolate(
						prevCoords,
						d['coordinates']
					)(easeInOut(percentage));
				}
			this.setAttribute('visibility', 
				coordsVisible(coords, 0.8) ? null : 'hidden'
			);
			this.setAttribute('transform', `translate(${projection(coords)})`);
		}
	});
	
	if (percentage < 1) {
		window.requestAnimationFrame(updateContinentLabelPositions);
	} else {
		overlayTweenStartTime = false;
	}
}
function getCoordsFromData(d, mya=false) {
	if (mya === false) {
		mya = mapSelector.currentMya;
	}
	let coords = d.properties['coords-by-mya'][mya];
	if (!coords) {
		if (mapSelector.currentMya == 0) {
			coords = d.geometry.coordinates;
		}
	}
	return coords;
}

function getTextureLabelsDataForMya(mya) {
	return textureContinentLabelsData.map(d=>({
		'name': d.properties.name,
		'coordinates': getCoordsFromData(d, mya)
	}));
}

function bindDataToCratonLabels(data) {
	overlay.select('.continent-labels')
		.selectAll('text').data(data, d=>d['name']).join('text')
			.text(d=>d['name'])
			.classed('continent label', true)
			.on('click', function(e, d) {
				trackedCratonLabel = this;
				trackedCratonLabel.classList.add('tracked');
				transitionToCoord(d['coordinates']);
				// TO DO: prevent tracking on drag
			});

	updateContinentLabelPositions();
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
	if (coords == null) return false;
	const currentCenter = getCurrentRotation().map(val=>-val);
	return geoDistance(coords, currentCenter) <= Math.PI/2*threshold;
}
