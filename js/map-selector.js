import { select, selectAll, pointer } from './d3-modules.js';
import { bisector } from './d3-modules.js';

import { setTexture } from './webgl-globe.js';

export {
	init,
	currentMya,
	mapsReadyPromise
}

let selectedMapIndex;
let currentMya = 0;

let mapDates, oldestMya;
const mapsReadyPromise = fetch('./data/map-dates.json')
	.then(response=>response.json())
	.then(data=>{
		mapDates = data;
		oldestMya = mapDates[mapDates.length-1]['mya'];

		return {myaToPercent, setMapToMya, oldestMya};
	});

let mapsListNode;


let updateCallback = ()=>{};
function init(containerNode, mapUpdateCallback) {
	mapsListNode = containerNode;
	updateCallback = mapUpdateCallback;

	mapsReadyPromise.then(()=>{
		createMapIndicators();
		setMap(0);
	});
	
	setUpKeyboardHandler();
	setUpPointerHandler();
}

function myaToPercent(mya) {
	return mya/oldestMya*100;
}

const myaBisector = bisector(d=>d['mya']);
function getClosestMapAtMya(mya) {
	return myaBisector.center(mapDates, mya);
}

function setMapToMya(targetMya) {
	setMap(getClosestMapAtMya(targetMya));
}


/*
  DOM operations
*/
function createMapIndicators() {
	select(mapsListNode)
		.selectAll(null).data(mapDates).enter()
		.append('li')
			.style('top', d=>`${myaToPercent(d['mya'])}%`)
			.append('a')
				.text(d=>`${d['mya']} MYA`)
				.classed('map-link', true)
				.attr('href', d=>getTexturePath(d['file']))
				.on('click', e=>{
					if (!e.ctrlKey && !e.metaKey) {
						e.preventDefault();
					}
				});
}

// removes specified className from all map indicator nodes
// if an index is provided, that indicator becomes only node with className
function resetClassForAllMaps(className, index) {
	const indicatorNodes = mapsListNode.querySelectorAll('.map-link');
	indicatorNodes.forEach(node=>{
		node.classList.remove(className)
	});
	if (typeof index !== 'undefined') {
		indicatorNodes[index].classList.add(className);
	}
}


/*
  Update map texture
*/
function setMap(newIndex) {
	if (selectedMapIndex != newIndex) { // avoid redraw if no change
		selectedMapIndex = newIndex;

		loadMapImage(mapDates[selectedMapIndex]['file']).then(()=>{
			currentMya = mapDates[selectedMapIndex]['mya'];
			updateCallback();
		});

		// highlight indicator for current map
		resetClassForAllMaps('selected', newIndex);
	}
}

function getTexturePath(name) {
	return `./map-textures/${name}.jpg`;
}

function loadMapImage(name) {
	return new Promise((resolve, reject) => {
		const image = new Image;
		const requestTime = Date.now();
		image.onload = e=>{
			updateTexture(image, requestTime);
			resolve();
		};
		image.onerror = reject;
		image.src = getTexturePath(name);
	});
}

let lastUpdate = 0;
function updateTexture(image, requestTime) {
	// Multiple textures may be loading simultaneously.
	// Show textures as they become available, 
	// dropping any texture that were requested earlier than the last loaded one
	if (requestTime > lastUpdate) {
		lastUpdate = requestTime;

		setTexture(image);
	}
}


/*
  Controls
*/
function setUpKeyboardHandler() {
	document.addEventListener('keydown', e=>{
		let direction = 0;
		if (e.key === 'ArrowDown') {
			direction = 1;
		}
		if (e.key === 'ArrowUp') {
			direction = -1;
		}
		if (direction !== 0) {
			// increment/decrement and wrap
			const count = mapDates.length;
			const newIndex = (selectedMapIndex + direction + count) % count;
			setMap(newIndex);
		}
	});
}

let draggingMapsList = false;
function setUpPointerHandler() {
	document.addEventListener('mouseup', e=>{
		draggingMapsList = false;
	});
	mapsListNode.addEventListener('mousedown', e=>{
		e.preventDefault();
		draggingMapsList = true;
		handleDrag(e);
	});
	document.addEventListener('mousemove', e=>{
		if (draggingMapsList) {
			handleDrag(e);
		}
	});

	// highlight closest map while hovering
	mapsListNode.addEventListener('mousemove', e=>{
		resetClassForAllMaps('hovering', getClosestMapAtPointerEvent(e));
	});
}
function getClosestMapAtPointerEvent(e) {
	const yPercent = pointer(e, mapsListNode)[1] / mapsListNode.clientHeight;
	const mya = yPercent*oldestMya;
	return getClosestMapAtMya(mya);
}
function handleDrag(e) {
	setMap(getClosestMapAtPointerEvent(e));
}
