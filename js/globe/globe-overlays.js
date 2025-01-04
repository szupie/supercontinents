import {
	select, selectAll,
	geoPath, geoGraticule, geoDistance, geoCircle, geoInterpolate
} from '../vendor-loader.js';

import {
	transitionToCoord,
	getCurrentRotation,
	isNorthUp,
	getDragCoords,
	isTrackingToLand,
	setTrackToLand
} from './rotation-control.js';
import * as mapSelector from '../map-selector.js';

import { 
	initInstance as initVectorMapInstance,
	bindReconstructionDataToSelection,
	offsetRotator as vectorMapOffsetRotator
} from './craton-drawer.js';

import { clamp, easeInOut, addPointerListener } from '../common-utils.js';

export {
	init,
	handleMyaUpdate,
	redraw,
	bindReverseMapToNode,
}


let overlay;
let projection, reverseProjection;

let reverseVectorMapNode;

const svgPathGenerator = geoPath().pointRadius(5);
const dragCircleGen = geoCircle().radius(3);

let overlayTweenStartMya;
let overlayTweenStartTime = false;
const overlayTweenDuration = 300;

let redrawReconstruction = ()=>{};
let getCratonCenters = ()=>{};

let textureContinentLabelsData;
let supercontinentsData;
let dataReady;


let trackedCratonLabel;
const supercontinentsShown = new Set();

let vectorMapPromise;
function init(theProjection, overlayNode) {
	projection = theProjection;
	svgPathGenerator.projection(projection);
	overlay = select(overlayNode);

	overlay.append('g').attr('class', 'continent-labels');

	const cratonRequest = fetch('./assets/data/craton-label-positions.json')
		.then(response=>response.json())
		.then(data=>{
			textureContinentLabelsData = data.features;
			bindDataToCratonLabels(getTextureLabelsDataForMya(0));
		});

	const supercontinentRequest = fetch('./assets/data/supercontinent-positions.json')
		.then(response=>response.json())
		.then(data=>{
			supercontinentsData = data;
			overlay.select('.continent-labels').append('text')
				.classed('supercontinent label', true)
				.datum({'coordinates': undefined});
			updateSupercontinentDataForMya(0);
		});
	dataReady = Promise.all([cratonRequest, supercontinentRequest]);

	createConstantOverlays();


	// tracked craton label deselection listener
	addPointerListener(overlay.node().parentNode, 'pointerdown', e=>{
		if (trackedCratonLabel) {
			trackedCratonLabel.classList.remove('tracked');
			trackedCratonLabel = false;
		}
	});


	vectorMapPromise = initVectorMapInstance(
		svgPathGenerator, overlayNode
	);
	vectorMapPromise.then(methods=>{
		redrawReconstruction = methods.redrawReconstruction;
		getCratonCenters = methods.getCratonCenters;
	});


	// handle pointer events
	let clickStartTarget;
	overlay.on('mousedown', e=>{
		clickStartTarget = e.target;
		e.preventDefault(); // prevent unintended text selection (ios safari 12)
	});
	overlay.on('click', e=>{
		if (clickStartTarget && e.target == clickStartTarget) {
			const name = getTargetCratonName(e);
			if (name != null) {
				// handle click on craton label
				setTrackingToLabel(overlayNode.querySelector(
					`.continent-labels [data-craton-name="${name}"]`
				));
			} else if (e.target.matches('.supercontinent.label')) {
				// handle click on supercontinent label
				setTrackToLand(true);
				transitionToMapCenter();
			}
		}
	});
	// listen on container, which captures pointer on drag
	addPointerListener(overlay.node().parentNode, 'pointermove', e=>{
		// do not track to craton if label is dragged
		clickStartTarget = undefined;

		// update hovering
		overlay.selectAll('[data-craton-name]').classed('hovering', false);

		const name = getTargetCratonName(e);
		if (name != null) {
			overlay.selectAll(`[data-craton-name="${name}"]`)
				.classed('hovering', true);
		}

		// prevent scrolling while manipulating globe (ios safari 12)
		if (!CSS.supports('user-select: none')) {
			e.preventDefault();
		}
	});
	overlay.on('mouseout', e=>{
		overlay.selectAll('[data-craton-name]').classed('hovering', false);
	});

	// get craton name from labels and shapes
	function getTargetCratonName(e) {
		const targetCratonParent = e.target.closest('[data-craton-name]');
		if (targetCratonParent) {
			return targetCratonParent.getAttribute('data-craton-name');
		}
		return null;
	}
}

async function handleMyaUpdate(prevMya, newMya) {
	await dataReady;

	overlayTweenStartMya = prevMya;
	overlayTweenStartTime = Date.now();

	// attach as attribute to persist over data() updates
	overlay.selectAll('.continent-labels .label')
		.filter(d=>(d && d['coordinates']))
		.attr('data-last-lat', d=>d['coordinates'][1])
		.attr('data-last-lon', d=>d['coordinates'][0]);

	if (mapSelector.currentMapType == mapSelector.MapTypes.TEXTURE) {
		if (textureContinentLabelsData) {
			bindDataToCratonLabels(getTextureLabelsDataForMya(newMya));
		}
	} else if (mapSelector.currentMapType == mapSelector.MapTypes.VECTOR) {
		await vectorMapPromise;
		bindReconstructionDataToSelection(
			mapSelector.getCurrentReconstructionData(),
			overlay
		);
		bindReconstructionDataToSelection(
			mapSelector.getCurrentReconstructionData(),
			select(reverseVectorMapNode)
		);
		redrawReconstruction();
		redrawReverseVectorMap();
		bindDataToCratonLabels(getCratonCenters());
	}

	const currentSuper = updateSupercontinentDataForMya(newMya);
	const superIsNew = currentSuper && !supercontinentsShown.has(currentSuper);
	if (currentSuper) {
		supercontinentsShown.add(currentSuper);
	}

	// Rotate map to center on hemisphere with more land
	// (only if map exists, and (new supercontinent or tracking to land))
	if ( mapSelector.currentMapType && (superIsNew || isTrackingToLand()) ) {
		transitionToMapCenter();
	}

	if (trackedCratonLabel) {
		transitionToCoord(select(trackedCratonLabel).datum()['coordinates']);
	}
}

function transitionToMapCenter() {
	let center = mapSelector.getCurrentMapCenter();
	if (center) {
		if (mapSelector.currentMapType == mapSelector.MapTypes.VECTOR) {
			center = vectorMapOffsetRotator(center);
		}
		transitionToCoord(center);
	}
}

function redraw() {
	if (mapSelector.currentMapType != mapSelector.MapTypes.NONE) {
		updateConstantOverlays();
		updateContinentLabelPositions();
	}
	if (mapSelector.currentMapType == mapSelector.MapTypes.VECTOR) {
		redrawReconstruction();
		redrawReverseVectorMap();
	}
}

let redrawReverseVectorMap = ()=>{};

function bindReverseMapToNode(node, theProjection) {
	reverseProjection = theProjection;
	reverseVectorMapNode = node;
	initVectorMapInstance(
		geoPath().projection(reverseProjection), 
		reverseVectorMapNode, 
		{simple: true}
	).then(methods=>{
		redrawReverseVectorMap = methods.redrawReconstruction;
	});
}


function createConstantOverlays() {
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

	overlay.append('text').attr('id', 'no-map-message')
		.attr('x', '50%')
		.attr('y', '50%')
		.text('Insufficient data for reconstruction');
}


/* 
  Continent labels
*/

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
			if (coordsVisible(coords, 0.8)) {
				this.removeAttribute('visibility'); 
			} else {
				this.setAttribute('visibility', 'hidden'); 
			}
			this.setAttribute('transform', `translate(${projection(coords)})`);

			// fix unknown paint-order bug in ios safari 12
			if (getComputedStyle(this).paintOrder === 'normal') {
				this.style.paintOrder = 'stroke';
			}
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
		.selectAll('text.continent').data(data, d=>d['name']).join('text')
			.text(d=>d['name'])
			.classed('continent label', true)
			.attr('data-craton-name', d=>d['name']);

	updateContinentLabelPositions();
}

function setTrackingToLabel(labelNode) {
	trackedCratonLabel = labelNode;
	trackedCratonLabel.classList.add('tracked');
	transitionToCoord(select(trackedCratonLabel).datum()['coordinates']);
}

// sets supercontinent label text and position according to mya
// returns name of supercontinent at mya if exists; otherwise false
function updateSupercontinentDataForMya(mya) {
	let name, coords;
	const showLabel = supercontinentsData.some(supercontinent=>{
		if (mya>=supercontinent['mya-min'] && mya<=supercontinent['mya-max']) {
			name = supercontinent['name'];
			if (supercontinent['coords-by-mya'][mya]) {
				coords = supercontinent['coords-by-mya'][mya];
				return true;
			}
		}
	})
	const label = overlay.select('.continent-labels .supercontinent.label');
	label.classed('shown', showLabel);
	// prevent label position tweening between different supercontinents
	if (label.text() != name) {
		label.attr('data-last-lat', null).attr('data-last-lon', null);
	}
	if (showLabel) {
		label.text(name).datum({'coordinates': coords});
		return name;
	}
	return false;
}


/*
  Graticules and poles
*/

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
	// increase offset as radius decreases while label stays constant size
	const labelOffsetAmount = 1800/projection.scale();
	graticuleLabel.setAttribute(
		'startOffset', `${(100 - labelOffsetAmount*labelOffsetSign) % 100}%`
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
	const radius = projection.scale();
	const axisLength = (polePoint[1]-radius)*0.04;
	const labelOffset = (polePoint[1] > radius) ? 16 : -8;
	const tipPoint = [radius, axisLength + polePoint[1]];

	select(this).selectAll('polyline')
		.attr('points', `${polePoint} ${tipPoint}`);

	select(this).selectAll('.label')
		.attr(
			'transform', 
			`translate(${radius}, ${labelOffset + polePoint[1]})`
		);
}

// helpers
function coordsVisible(coords, threshold=1) {
	if (coords == null) return false;
	const currentCenter = getCurrentRotation().map(val=>-val);
	return geoDistance(coords, currentCenter) <= Math.PI/2*threshold;
}
