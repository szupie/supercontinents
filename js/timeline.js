import { 
	mapsReadyPromise, currentMapType, MapTypes, EARTH_FORMATION_MYA 
} from './map-selector.js';
import { clamp, addPointerListener } from './common-utils.js';

export {
	init
}

const timelineNode = document.getElementById('timeline');
const mapsListNode = document.getElementById('maps-list');
const lifeEventsNode = document.getElementById('life-events-list');
const supercontinentsNode = document.getElementById('supercontinents-list');
const periodsNode = document.getElementById('periods-list');
const expansionButton = document.getElementById('timeline-toggle');

let mapsSelectorData;

function init() {
	mapsReadyPromise.then(funcs=>{
		mapsSelectorData = funcs;

		createMyaLabels();

		positionSupercontinents();
		positionPeriods();
		positionLifeEvents();
	});

	setUpListeners();
}

function createMyaLabels() {
	const labelsContainerNode = document.createElement('div');
	labelsContainerNode.classList.add('axis-labels');

	// create labels at intervals
	const interval = 200;
	const allLabelNodes = [];
	for (let mya=0; mya<=EARTH_FORMATION_MYA; mya+=interval) {
		const labelNode = document.createElement('span');
		labelNode.classList.add('label');
		
		if (mya > mapsSelectorData.myaAt100Percent) {
			labelNode.classList.add('full-timeline');
		}

		labelNode.textContent = mya;

		labelsContainerNode.appendChild(labelNode);
		labelNode.style.top = `${mapsSelectorData.myaToPercent(mya)}%`;

		allLabelNodes.push(labelNode);
	}

	const axisTitleNode = document.createElement('span');
	axisTitleNode.textContent = 'million years ago'
	axisTitleNode.classList.add('title');
	axisTitleNode.classList.add('label');
	labelsContainerNode.appendChild(axisTitleNode);

	allLabelNodes.push(axisTitleNode);

	// create label that follows cursor
	const cursorNode = document.createElement('span');
	cursorNode.classList.add('label');
	cursorNode.classList.add('cursor');
	labelsContainerNode.appendChild(cursorNode);

	// update cursor label text and position
	addPointerListener(mapsListNode, 'pointermove', handlePointerMove);
	addPointerListener(mapsListNode, 'pointerdown', handlePointerMove);
	function handlePointerMove(e) {
		if (e.target == mapsListNode) {
			// clamp timeline cursor to current min/max
			let cursorMaxY = mapsListNode.clientHeight;
			if (currentMapType != MapTypes.TEXTURE) {
				cursorMaxY *=
					EARTH_FORMATION_MYA / mapsSelectorData.myaAt100Percent;
			}
			const cursorClamped = clamp(e.offsetY, 0, cursorMaxY);

			// calculate mya at cursor
			const mya = cursorClamped *
				mapsSelectorData.myaAt100Percent / mapsListNode.clientHeight;

			// check if any labels are being covered
			const threshold = (currentMapType == MapTypes.TEXTURE) ? 20 : 100;
			const intervalDist = Math.min(mya%interval, interval-mya%interval);

			const nearestLabelIndex = Math.round(mya/interval);
			const labelIndexInBounds = nearestLabelIndex < allLabelNodes.length;

			allLabelNodes.forEach(node => node.classList.remove('obscured'));
			if (intervalDist < threshold && labelIndexInBounds) {
				allLabelNodes[nearestLabelIndex].classList.add('obscured');
			}

			// check if cursor covers mya scale label at bottom
			const vertMargin = (window.innerHeight - timelineNode.getBoundingClientRect().height)/2;
			const bottomDist = window.innerHeight-vertMargin - e.clientY;
			if (bottomDist < 16) {
				axisTitleNode.classList.add('obscured');
			}

			// set label text and position
			cursorNode.textContent = Math.round(mya/10)*10; // round to 10s
			cursorNode.style.transform = 
				`translateY(calc(${cursorClamped}px - 50%))`;
		}
	}

	timelineNode.appendChild(labelsContainerNode);
}

function positionSupercontinents() {
	const nodes = supercontinentsNode.children;

	for (let i=0; i<nodes.length; i++) {
		const end = nodes[i].getAttribute('data-break-mya');
		const start = nodes[i].getAttribute('data-form-mya');
		nodes[i].style.top = `${mapsSelectorData.myaToPercent(end)}%`;
		nodes[i].style.bottom = 
			`${100 - mapsSelectorData.myaToPercent(start)}%`;

		const prestart = nodes[i].getAttribute('data-form-start-mya');
		if (prestart) {
			const height = (prestart-start) / (start-end);
			nodes[i].style.setProperty('--pre-height', `${height*100}%`);
		}
		const postend = nodes[i].getAttribute('data-break-end-mya');
		if (postend) {
			const height = (end-postend) / (start-end);
			nodes[i].style.setProperty('--post-height', `${height*100}%`);
		}
	}
}

function positionPeriods() {
	const nodes = periodsNode.children;

	for (let i=0; i<nodes.length; i++) {
		nodes[i].style.top = `${mapsSelectorData.myaToPercent(
			nodes[i].getAttribute('data-end-mya')
		)}%`;
		nodes[i].style.bottom = `${100 - mapsSelectorData.myaToPercent(
			nodes[i].getAttribute('data-start-mya')
		)}%`;
	}
}

function positionLifeEvents() {
	lifeEventsNode.querySelectorAll('li').forEach(node=>{
		node.style.top = 
			`${mapsSelectorData.myaToPercent(node.getAttribute('data-mya'))}%`;
		node.firstElementChild.addEventListener('click', handleAnchorClick);
	});
}

function handleAnchorClick(e) {
	const scrollTarget = document.querySelector(e.currentTarget.hash);
	scrollTarget.scrollIntoView();

	// for browsers without scroll-margin support, adjust scroll with js
	if (!CSS.supports('scroll-margin-top: 0px')) {
		const scrollOffset = -Number.parseFloat(getComputedStyle(scrollTarget).getPropertyValue('scroll-snap-margin-top'));
		window.scrollBy(0, scrollOffset);
	}

	e.preventDefault(); // prevent url change
	document.querySelector('#stories').classList.add('switching');
	setTimeout(e=>{
		document.querySelector('#stories').classList.remove('switching');
	}, 300);
	setTimelineExpandedOverlay(false);
}

// Handlers to show/hide full-width timeline with period and event labels
function setUpListeners() {

	// hover or tap on period indicator lines to show labels
	periodsNode.addEventListener('mouseenter', e=>{
		setTimelineExpandedOverlay(true);
	});
	addPointerListener(periodsNode, 'pointerdown', e=>{
		setTimelineExpandedOverlay(true);
	});

	// press and hold on timeline to expand
	let mapsListHoldDelayTimer;
	mapsListNode.addEventListener('mousedown', e=>{
		if (!mapsListHoldDelayTimer) {
			mapsListHoldDelayTimer = setTimeout(e=>{
				setTimelineExpandedOverlay(true);
			}, 500);
		}
	});

	// handle hover exit
	timelineNode.addEventListener('mouseleave', e=>{
		const threshold = 20;
		// show periods if cursor moves past edge (Fitts law)
		if (e.clientX + threshold > document.documentElement.clientWidth) {
			setTimelineExpandedOverlay(true);
		}
		// collapse if cursor exits left
		if (e.offsetX - threshold < 0) {
			setTimelineExpandedOverlay(false);
		}
	});

	// handle click release
	addPointerListener(document, 'pointerup', e=>{
		cancelPeriodsTimer();
		// collapse after any click outside timeline
		if (!timelineNode.contains(e.target)) {
			setTimelineExpandedOverlay(false);
		}
	});
	function cancelPeriodsTimer() {
		clearTimeout(mapsListHoldDelayTimer);
		mapsListHoldDelayTimer = false;
	}

	// Show life events on hover (narrow screens)
	let eventsHoverDelayTimer;
	// use mouseenter instead of :hover for better timing control
	// and more accurate hover feature detection
	lifeEventsNode.addEventListener('mouseenter', e=>{
		if (window.matchMedia('(hover: hover)').matches) {
			lifeEventsNode.classList.add('hovering');
			clearTimeout(eventsHoverDelayTimer);
		}
	})
	lifeEventsNode.addEventListener('mouseleave', e=>{
		eventsHoverDelayTimer = setTimeout(e=>{
			lifeEventsNode.classList.remove('hovering');
		}, 1000);
	})

	// toggle button (narrow screens)
	expansionButton.addEventListener('click', e=>{
		if (!timelineNode.classList.contains('expanded-overlay')) {
			setTimelineExpandedOverlay(true);
		} else {
			setTimelineExpandedOverlay(false);
		}
	});

	// handling drag to expand/collapse: on pointer down, up, and move
	let dragStartX, dragStartExpansion;
	const expandThreshold = 0.5;
	const snappingDistance = 10;
	function handleDragStart(e) {
		timelineNode.classList.add('dragging');
		// scrub through timeline only if press started NOT on expansion toggle
		if (!document.getElementById('timeline-toggle').contains(e.target)) {
			timelineNode.classList.add('scrubbing');
			if (!CSS.supports('user-select: none')) {
				e.preventDefault(); // prevent unintended text selection (ios safari 12)
			}
		}
		dragStartExpansion = timelineNode.style.getPropertyValue('--expansion-percent');
		dragStartX = e.clientX;
	}
	addPointerListener(mapsListNode, 'pointerdown', handleDragStart);
	addPointerListener(expansionButton, 'pointerdown', handleDragStart);
	addPointerListener(document, 'pointerup', e=>{
		if (timelineNode.classList.contains('dragging')) {
			timelineNode.classList.remove('dragging');
			if (timelineNode.classList.contains('expanded-overlay')) {
				setTimelineExpandedOverlay(true);
			} else {
				setTimelineExpandedOverlay(false);
			}
		} else if (e.target === timelineNode) {
			// since timeline node has pointer-events: none,
			// this can only be triggered by shade pseudoelement
			setTimelineExpandedOverlay(false);
		}
		timelineNode.classList.remove('scrubbing');
	});
	addPointerListener(document, 'pointermove', e=>{
		if (timelineNode.classList.contains('dragging')) {
			const dragChange = dragStartX - e.clientX;
			const newOffset = dragChange + getExpansionX()*dragStartExpansion;
			let dragPercentage = newOffset / getExpansionX();

			// snap to edges
			if (Math.abs(dragChange) < snappingDistance) {
				dragPercentage = Math.round(dragPercentage);
			}
			// clamp position to edges
			// reset dragStartX to regain grip upon reversing direction
			if (dragPercentage > 1) {
				dragPercentage = 1;
				dragStartExpansion = 1;
				dragStartX = Math.max(
					e.clientX, 
					document.documentElement.clientWidth - mapsListNode.offsetWidth
				);
			} else if (dragPercentage < 0) {
				dragPercentage = 0;
				dragStartExpansion = 0;
				dragStartX = e.clientX;
			}

			// set expansion state
			if (dragPercentage > expandThreshold) {
				setTimelineExpandedOverlay(true, { preventPercentReset: true });
			} else {
				setTimelineExpandedOverlay(false, {preventPercentReset: true});
			}
			timelineNode.style.setProperty(
				'--expansion-percent', dragPercentage
			);
		}
	});
	
	// collapse on selecting a life event
	lifeEventsNode.addEventListener('mouseup', e=>{
		setTimelineExpandedOverlay(false);
	});

	// anchor link to cambrian timeline: prevent URL change
	document.getElementById('cambrian-anchor').addEventListener('click', handleAnchorClick);
}

// returns change in x position in expanded state
function getExpansionX() {
	return mapsListNode.offsetWidth + 
		parseInt(getComputedStyle(mapsListNode).left, 10);
}

function setTimelineExpandedOverlay(expand, {preventPercentReset=false}={} ) {
	if (!preventPercentReset) {
		timelineNode.style.setProperty('--expansion-percent', expand ? 1 : 0);
	}
	// only update classes and attributes if state changed
	if (timelineNode.classList.contains('expanded-overlay') !== expand) {
		if (expand) {
			timelineNode.classList.add('expanded-overlay');
		} else {
			timelineNode.classList.remove('expanded-overlay');
		}
		setExpansionButtonState(expand);
	}
}

function setExpansionButtonState(expand) {
	expansionButton.setAttribute('aria-expanded', expand);
	expansionButton.querySelector('.expand-label')
		.setAttribute('aria-hidden', expand);
	expansionButton.querySelector('.collapse-label')
		.setAttribute('aria-hidden', !expand);
}
