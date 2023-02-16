import { select, selectAll, pointer } from './d3-modules.js';
import { bisector } from './d3-modules.js';
import { clamp } from './common-utils.js';

export {
	init,
	mapsReadyPromise, // when ready, returns: myaToPercent, setMapToMya, myaAt100Percent
	MapTypes,
	TextureRes,
	EARTH_FORMATION_MYA,
	
	currentMya,
	currentMapType,

	getCurrentTexture,
	currentTextureIsCached,

	getCurrentReconstructionData,
	getCurrentMapCenter
}

const EARTH_FORMATION_MYA = 4600;

let currentMapIndex;
let currentMya = 0;

let lastScrollMya;

const MapTypes = Object.freeze({
	NONE: 0,
	TEXTURE: 1,
	VECTOR: 2
});
let currentMapType = MapTypes.TEXTURE;

const TextureRes = Object.freeze({
	LO: 512,
	HI: 3600
});

/*
  Fetch map data
*/
let textureMapDates, oldestTextureMya;
const textureMapListRequest = fetch('./assets/data/map-dates.json')
	.then(response=>response.json())
	.then(data=>{
		textureMapDates = data;
		oldestTextureMya = Math.max(...textureMapDates.map(d=>d['mya']));
		document.body.style.setProperty(
			'--zoomed-timeline-proportion', 
			`${oldestTextureMya/EARTH_FORMATION_MYA*100}%`
		);
	});

let reconstructionsData, oldestVectorMya, youngestVectorMya;
const cratonRotationsRequest = fetch('./assets/data/craton-rotations.json')
	.then(response=>response.json())
	.then(data=>{
		reconstructionsData = data;
		const myas = reconstructionsData.map(d=>d['mya']);
		oldestVectorMya = Math.max(...myas);
		youngestVectorMya = Math.min(...myas);
	});

let allMapsList;
const mapsReadyPromise = Promise.all(
	[textureMapListRequest, cratonRotationsRequest]
).then(()=>{
	allMapsList = textureMapDates.concat(reconstructionsData);

	const myaAt100Percent = oldestTextureMya;
	return {myaToPercent, setMapToMya, myaAt100Percent};
});

let mapsListNode;

let updateCallback = ()=>{};
function init(containerNode, mapUpdateCallback) {
	mapsListNode = containerNode;
	updateCallback = mapUpdateCallback;

	mapsReadyPromise.then(()=>{
		createMapIndicators();

		document.addEventListener('scroll', handleScrollChange);
		window.addEventListener('resize', e=>{
			// preserve scroll position and map on resize
			if (lastScrollMya > 0 && lastScrollMya < EARTH_FORMATION_MYA) {
				setScrollToMya(lastScrollMya);
			}
		});
		handleScrollChange();
	
		setUpKeyboardHandler();
		setUpPointerHandler();

		// requestReconstructedPositions([-6,17]);
	});
}

// dev util function to fetch reconstructed positions at the time of each map
// for a given modern coordinate
function requestReconstructedPositions(coord) {
	const queries = [];
	const results = {};
	textureMapDates.slice(-5).forEach(item=>{ // test oldest 5 only
	// textureMapDates.forEach(item=>{
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

/*
  MYA calculations
*/
function myaToPercent(mya) {
	return mya/oldestTextureMya*100;
}

function getCurrentMaxMya() {
	if (currentMapType == MapTypes.TEXTURE) {
		return oldestTextureMya;
	} else {
		return oldestVectorMya;
	}
}

const myaBisector = bisector(d=>d['mya']);
function getClosestMapAtMya(mya) {
	if (mya > oldestVectorMya + 200) {
		return allMapsList.length;
	} else {
		return myaBisector.center(allMapsList, mya);
	}
}

function setMapToMya(targetMya) {
	lastScrollMya = targetMya;

	const closestIndex = getClosestMapAtMya(targetMya);
	const noMap = (closestIndex >= allMapsList.length);

	if (currentMapIndex != closestIndex || noMap) { // avoid redraw if no change
		currentMapIndex = closestIndex;

		const prevMya = currentMya;

		if (noMap) {
			currentMapType = MapTypes.NONE;
			currentMya = Math.round(targetMya/100)*100;
			// update rough time indicator position in timeline
			document.getElementById('no-map-indicator').style.top = 
				`${myaToPercent(targetMya)}%`;
		} else if (currentMapIndex < textureMapDates.length) {
			currentMapType = MapTypes.TEXTURE;
			currentMya = textureMapDates[currentMapIndex]['mya'];
		} else {
			currentMapType = MapTypes.VECTOR;
			currentMya = reconstructionsData[
				getVectorMapIndex(currentMapIndex)
			]['mya'];
		}

		// highlight indicator for current map
		resetClassForAllMaps('selected', currentMapIndex);

		// trigger redraw
		updateCallback(prevMya, currentMya);	
	}
}


/*
  Scroll sync calculations
*/
const storyNodes = document.getElementById('stories').querySelectorAll('[data-mya]');
const timelineEventNodes = document.getElementById('life-events-list').children;
const yBisector = bisector(node => getViewY(node)+window.scrollY);

// For each major event, show corresponding map when scrolled to story
// Between stories, interpolate target year based on percentage scrolled
function handleScrollChange() {
	const correctedScrollY = window.scrollY +
		Number.parseFloat(getComputedStyle(storyNodes[0]).scrollMarginTop);
	setMapToScroll(correctedScrollY);
	highlightTimelineEvent(correctedScrollY);
}
function setMapToScroll(scrollY) {
	const prevStoryIndex = yBisector.right(storyNodes, scrollY)-1;
	if (prevStoryIndex < 0) {
		// clamp date to most recent event
		setMapToMya(0);
	} else if (prevStoryIndex+1 >= storyNodes.length) {
		// clamp date to oldest event
		setMapToMya(storyNodes[storyNodes.length-1].getAttribute('data-mya'));
	} else {
		const prevStory = storyNodes[prevStoryIndex];
		const nextStory = storyNodes[prevStoryIndex+1];

		const storiesDiffY = getViewY(nextStory) - getViewY(prevStory);
		const scrollPastPrev = scrollY - (getViewY(prevStory)+window.scrollY);

		const prevMya = Number.parseFloat(prevStory.getAttribute('data-mya'));
		const nextMya = Number.parseFloat(nextStory.getAttribute('data-mya'));
		const storiesDiffMya = nextMya - prevMya;

		const targetMya = prevMya + storiesDiffMya*scrollPastPrev/storiesDiffY;
		setMapToMya(targetMya);
	}
}
// highlight life event in timeline corresponding to current scroll position
function highlightTimelineEvent(scrollY) {
	for (let node of timelineEventNodes) {
		node.classList.remove('current');
	}

	const closestStoryNode = storyNodes[yBisector.center(storyNodes, scrollY)];
	const offset = getViewY(closestStoryNode)+window.scrollY - scrollY;
	const correspondingTimelineLinkNode = document.querySelector(
		`a[href="#${closestStoryNode.id}"]`
	);
	if (Math.abs(offset) < 200 && correspondingTimelineLinkNode) {
		correspondingTimelineLinkNode.parentNode.classList.add('current');
	}
}

const myaAttrBisector = bisector(node => 
	Number.parseFloat(node.getAttribute('data-mya'))
).left;
	
function setScrollToMya(mya) {
	const prevStoryIndex = clamp(myaAttrBisector(storyNodes, mya)-1, 0, storyNodes.length-2);
	const prevStory = storyNodes[prevStoryIndex];
	const nextStory = storyNodes[prevStoryIndex+1];

	const prevMya = Number.parseFloat(prevStory.getAttribute('data-mya'));
	const nextMya = Number.parseFloat(nextStory.getAttribute('data-mya'));

	const percent = (mya - prevMya) / (nextMya - prevMya);
	const scrollMargin = Number.parseFloat(getComputedStyle(storyNodes[0]).scrollMarginTop);
	const newScroll = window.scrollY + getViewY(prevStory) - scrollMargin + 
		percent*(getViewY(nextStory) - getViewY(prevStory));
	window.scrollTo({
		top: newScroll,
		behavior: 'instant'
	});
}
function getViewY(node) {
	return node.getBoundingClientRect().y;
}


/*
  DOM operations
*/
function createMapIndicators() {
	select(mapsListNode)
		.selectAll('li').data(allMapsList).join('li')
			.style('top', d=>`${myaToPercent(d['mya'])}%`)
			.append('a')
				.text(d=>`${d['mya']} MYA`)
				.classed('map-indicator', true)
				.classed('texture-map', d=>(d['mya']<=oldestTextureMya))
				.attr('href', d=>getTexturePath(d['file']))
				.on('click', e=>{
					if (!e.ctrlKey && !e.metaKey) {
						e.preventDefault();
					}
				});

	// create indicator for oldest times when no map is available
	const indicatorNode = document.createElement('li');
	indicatorNode.id = 'no-map-indicator';
	indicatorNode.classList.add('map-indicator');
	mapsListNode.appendChild(indicatorNode);
}

// removes specified className from all map indicator nodes
// if an index is provided, that indicator becomes only node with className
function resetClassForAllMaps(className, index) {
	const indicatorNodes = mapsListNode.querySelectorAll('.map-indicator');
	indicatorNodes.forEach(node=>{
		node.classList.remove(className)
	});
	if (typeof indicatorNodes[index] !== 'undefined') {
		indicatorNodes[index].classList.add(className);
	}
}


/*
  Texture map
*/
function getTexturePath(name, resolution) {
	if (name) {
		return `./assets/map-textures/${resolution}/${name}.jpg`;
	} else {
		return null;
	}
}

function getCurrentTexture(resolution) {
	return new Promise((resolve, reject) => {
		if (currentMapIndex >= textureMapDates.length) {
			reject('requested texture map out of bounds');
		}
		const image = new Image;
		image.onload = e=>{
			resolve(image);
		};
		image.onerror = e=>{
			reject();
		};
		image.src = getTexturePath(
			textureMapDates[currentMapIndex]['file'], 
			resolution
		);
	}).catch(e=>{
		if (e) console.error(e);
		return null;
	});
}

function currentTextureIsCached(resolution) {
	const image = new Image;
	image.src = getTexturePath(
		textureMapDates[currentMapIndex]['file'], 
		resolution
	);
	const cached = image.complete;
	image.src = '';
	return cached;
}


/*
  Vector map
*/
function getCurrentReconstructionData() {
	const index = getVectorMapIndex(currentMapIndex);
	if (index < reconstructionsData.length) {
		return reconstructionsData[index]['rotations'];
	} else {
		return null;
	}
}

function getVectorMapIndex(index) {
	return index - textureMapDates.length;
}


/*
  Returns center coordinates of hemisphere with more land
*/
const textureCenters = [
	{ minMya: 150, center: [37, 0] },
	{ minMya: 280, center: [37, -33] },
	{ minMya: 380, center: [73, -30] },
	{ minMya: 405, center: [73, -62] },
	{ minMya: 425, center: [129, -58] },
	{ minMya: 435, center: [164, -41] },
	{ minMya: 445, center: [180, -37] },
	{ minMya: 600, center: [180, -20] },
	{ minMya: 700, center: [180, 0] }
]
const minMyaBisector = bisector(entry => entry['minMya']).left;
function getCurrentMapCenter() {
	if (currentMapIndex < textureMapDates.length) {
		// texture map (centers defined by time ranges)
		const currentMya = textureMapDates[currentMapIndex]['mya'];

		// no center for most recent maps
		if (currentMya <= textureCenters[0]['minMya']) {
			return null;
		}

		const index = minMyaBisector(textureCenters, currentMya) - 1;
		return textureCenters[index]['center'].slice();
	} else {
		// vector map (centers defined per map)
		const index = getVectorMapIndex(currentMapIndex);
		if (index < reconstructionsData.length) {
			return reconstructionsData[index]['map-center'].slice();
		}
	}
	return null;
}


/*
  Controls
*/
function setUpKeyboardHandler() {
	document.addEventListener('keydown', e=>{
		let direction = 0;
		if (e.key === 'j') {
			direction = 1;
		}
		if (e.key === 'k') {
			direction = -1;
		}
		if (direction !== 0) {
			// increment/decrement
			const newIndex = currentMapIndex + direction;
			if (newIndex < 0 || newIndex >= allMapsList.length) {
				// do nothing if out of bounds
				return;
			}

			let newMya;
			if (newIndex < textureMapDates.length) {
				newMya = textureMapDates[newIndex]['mya'];
			} else {
				newMya = reconstructionsData[getVectorMapIndex(newIndex)]['mya'];
			}
			setScrollToMya(newMya);
			// also update map manually in case scroll distance is too small
			setMapToMya(newMya);
			
			resetClassForAllMaps('hovering');
		}
	});
}

function setUpPointerHandler() {
	mapsListNode.addEventListener('pointerdown', e=>{
		handleDrag(e);
	});
	document.addEventListener('pointermove', e=>{
		if (mapsListNode.parentNode.classList.contains('scrubbing')) {
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
	const mya = yPercent*oldestTextureMya;
	return getClosestMapAtMya(mya);
}
function handleDrag(e) {
	const yPercent = pointer(e, mapsListNode)[1] / mapsListNode.clientHeight;
	const targetMya = clamp(
		yPercent*oldestTextureMya, 
		0, EARTH_FORMATION_MYA
	);
	if (currentMapType == MapTypes.TEXTURE && targetMya > youngestVectorMya) {
		// show intro when selecting precambrian time from cambrian timeline
		document.getElementById('precambrian-intro').scrollIntoView();
	} else {
		setScrollToMya(targetMya);
	}
}
