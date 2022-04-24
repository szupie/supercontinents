import { select, selectAll, pointer } from './d3-modules.js';
import { bisector } from './d3-modules.js';
import { clamp } from './common-utils.js';

export {
	init,
	currentMya,
	mapsReadyPromise,
	getClosestResolution,
	getImg,
	isCached
}

let selectedMapIndex;
let currentMya = 0;

let mapDates, oldestMya;
const mapsReadyPromise = fetch('./assets/data/map-dates.json')
	.then(response=>response.json())
	.then(data=>{
		mapDates = data;
		oldestMya = mapDates[mapDates.length-1]['mya'];

		return {myaToPercent, setMapToMya, oldestMya};
	});

let mapsListNode;
const resolutions = [
	256, 
	512, 
	1024, 
	2048,
	3600
];


let updateCallback = ()=>{};
function init(containerNode, mapUpdateCallback) {
	mapsListNode = containerNode;
	updateCallback = mapUpdateCallback;

	mapsReadyPromise.then(()=>{
		createMapIndicators();
		setMap(0);

		document.addEventListener('scroll', setMapToScrollPosition);
		setMapToScrollPosition();

		// requestReconstructedPositions([-6,17]);
	});
	
	// setUpKeyboardHandler();
	setUpPointerHandler();
}
function requestReconstructedPositions(coord) {
	const queries = [];
	const results = {};
	mapDates.slice(-5).forEach(item=>{ // test oldest 5 only
	// mapDates.forEach(item=>{
		queries.push(fetch(`https://gws.gplates.org/reconstruct/reconstruct_points/?points=${coord[0]},${coord[1]}&time=${item.mya}&model=PALEOMAP`)
			.then(response=>response.json())
			.then(data=>{
				results[`${item.mya}`] = data['coordinates'][0];
			}));
	});
	Promise.all(queries).then(a=>{
		const keys = Object.keys(results).sort((a,b)=>Number.parseFloat(a)>Number.parseFloat(b));
		const out = [];
		keys.forEach(key=>{out.push(`"${key}":[${results[key][0]},${results[key][1]}]`)});
		console.log(out.join(', '));
	});
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


const storyNodes = document.querySelectorAll('#stories article');
const yBisector = bisector(node => node.offsetTop).right;

// for each major event, show corresponding map when scrolled to story
// between stories, interpolate target year based on percentage scrolled
function setMapToScrollPosition() {
	const prevStoryIndex = yBisector(storyNodes, Math.round(window.scrollY))-1;
	if (prevStoryIndex < 0) {
		setMapToMya(0);
	} else if (prevStoryIndex+1 >= storyNodes.length) {
		setMapToMya(oldestMya);
	} else {
		const prevStory = storyNodes[prevStoryIndex];
		const nextStory = storyNodes[prevStoryIndex+1];

		const storiesDiffY = nextStory.offsetTop - prevStory.offsetTop;
		const scrollPastPrev = window.scrollY - prevStory.offsetTop;

		const prevMya = Number.parseFloat(prevStory.getAttribute('data-mya'));
		const nextMya = Number.parseFloat(nextStory.getAttribute('data-mya'));
		const storiesDiffMya = nextMya - prevMya;

		const targetMya = prevMya + storiesDiffMya*scrollPastPrev/storiesDiffY;
		setMapToMya(targetMya);
	}
}

const myaAttrBisector = bisector(node => node.getAttribute('data-mya')).left;
	
function setScrollToMya(mya) {
	const prevStoryIndex = clamp(myaAttrBisector(storyNodes, mya)-1, 0, storyNodes.length-2);
	const prevStory = storyNodes[prevStoryIndex];
	const nextStory = storyNodes[prevStoryIndex+1];

	const prevMya = Number.parseFloat(prevStory.getAttribute('data-mya'));
	const nextMya = Number.parseFloat(nextStory.getAttribute('data-mya'));

	const percent = (mya - prevMya) / (nextMya - prevMya)
	window.scrollTo({
		top: prevStory.offsetTop + percent*(nextStory.offsetTop - prevStory.offsetTop),
		behavior: 'instant'
	});
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

		const prevMya = currentMya;
		currentMya = mapDates[selectedMapIndex]['mya'];
		updateCallback(prevMya, currentMya);

		// highlight indicator for current map
		resetClassForAllMaps('selected', newIndex);
	}
}

function getTexturePath(name, resolution) {
	return `./assets/map-textures/${resolution}/${name}.jpg`;
}

const resBisector = bisector(val => val);
function getClosestResolution(target) {
	return resolutions[resBisector.center(resolutions, target)];
}

function getImg(resolution) {
	return new Promise((resolve, reject) => {
		const image = new Image;
		image.onload = e=>{
			resolve(image);
		};
		image.onerror = reject;
		image.src = getTexturePath(
			mapDates[selectedMapIndex]['file'], 
			resolution
		);
	});
}

function isCached(resolution) {
	const image = new Image;
	image.src = getTexturePath(
		mapDates[selectedMapIndex]['file'], 
		resolution
	);
	const cached = image.complete;
	image.src = '';
	return cached;
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
	const yPercent = pointer(e, mapsListNode)[1] / mapsListNode.clientHeight;
	const targetMya = yPercent*oldestMya;
	setScrollToMya(targetMya);
	// setMap(getClosestMapAtPointerEvent(e));
}
