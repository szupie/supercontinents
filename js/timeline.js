import { mapsReadyPromise } from './map-selector.js';

import { bisector } from 'https://cdn.skypack.dev/d3-array@3';

export {
	init
}

const timelineNode = document.getElementById('timeline');
const mapsListNode = document.getElementById('maps-list');
const lifeEventsNode = document.getElementById('life-events-list');
const supercontinentsNode = document.getElementById('supercontinents-list');
const periodsNode = document.getElementById('periods-list');

let mapsSelector;

function init() {
	mapsReadyPromise.then(funcs=>{
		mapsSelector = funcs;

		createMyaLabels();

		positionSupercontinents();
		positionPeriods();
		positionLifeEvents();

		document.addEventListener('scroll', setMapToScrollPosition);
		setMapToScrollPosition();
	});

	setUpExpansionListeners();
}


const storyNodes = document.querySelectorAll('#stories article');
const yBisector = bisector(node => node.offsetTop).right;

// for each major event, show corresponding map when scrolled to story
// between stories, interpolate target year based on percentage scrolled
function setMapToScrollPosition() {
	const prevStoryIndex = yBisector(storyNodes, Math.round(window.scrollY))-1;
	if (prevStoryIndex < 0) {
		mapsSelector.setMapToMya(0);
	} else {
		const prevStory = storyNodes[prevStoryIndex];
		const nextStory = storyNodes[prevStoryIndex+1];

		const storiesDiffY = nextStory.offsetTop - prevStory.offsetTop;
		const scrollPastPrev = window.scrollY - prevStory.offsetTop;

		const prevMya = Number.parseFloat(prevStory.getAttribute('data-mya'));
		const nextMya = Number.parseFloat(nextStory.getAttribute('data-mya'));
		const storiesDiffMya = nextMya - prevMya;

		const targetMya = prevMya + storiesDiffMya*scrollPastPrev/storiesDiffY;
		mapsSelector.setMapToMya(targetMya);
	}
	// TO DO: handle maps beyond oldest event
}

function createMyaLabels() {
	const labelsContainerNode = document.createElement('div');
	labelsContainerNode.classList.add('axis-labels');

	// create labels at intervals
	const interval = 200;
	const allLabelNodes = [];
	for (let mya=0; mapsSelector.myaToPercent(mya)<=100; mya+=interval) {
		const labelNode = document.createElement('span');
		labelNode.classList.add('label');

		labelNode.textContent = mya;

		labelsContainerNode.appendChild(labelNode);
		labelNode.style.top = `${mapsSelector.myaToPercent(mya)}%`;

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
	mapsListNode.addEventListener('mousemove', e=>{
		if (e.target == mapsListNode) {
			const mya = mapsSelector.oldestMya*e.offsetY/e.target.clientHeight;
			const threshold = 20;
			const intervalDist = Math.min(mya%interval, interval-mya%interval);
			const bottomDist = mapsSelector.oldestMya-mya;

			allLabelNodes.forEach(node => node.classList.remove('obscured'));
			if (intervalDist < threshold || bottomDist < threshold) {
				const nearestLabelIndex = Math.round(mya/interval);
				allLabelNodes[nearestLabelIndex].classList.add('obscured');
			}
			cursorNode.textContent = Math.round(mya/10)*10; // round to 10s
			cursorNode.style.transform = `translateY(calc(${e.offsetY}px - 50%))`;
		}
	});

	timelineNode.appendChild(labelsContainerNode);
}

function positionSupercontinents() {
	const nodes = supercontinentsNode.children;

	for (let i=0; i<nodes.length; i++) {
		const end = nodes[i].getAttribute('data-break-mya');
		const start = nodes[i].getAttribute('data-form-mya');
		nodes[i].style.top = `${mapsSelector.myaToPercent(end)}%`;
		nodes[i].style.bottom = `${100 - mapsSelector.myaToPercent(start)}%`;

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
		nodes[i].style.top = `${mapsSelector.myaToPercent(
			nodes[i].getAttribute('data-end-mya')
		)}%`;
		nodes[i].style.bottom = `${100 - mapsSelector.myaToPercent(
			nodes[i].getAttribute('data-start-mya')
		)}%`;
	}
}

function positionLifeEvents() {
	lifeEventsNode.querySelectorAll('li').forEach(node=>{
		node.style.top = `${mapsSelector.myaToPercent(node.getAttribute('data-mya'))}%`;
	});
}

let expansionDelayTimer;
function setUpExpansionListeners() {
	function cancelExpansionTimer() {
		clearTimeout(expansionDelayTimer);
		expansionDelayTimer = false;
	}
	function expand() {
		timelineNode.classList.add('expanded');
		cancelExpansionTimer();
	}
	function collapse() {
		timelineNode.classList.remove('expanded');
		cancelExpansionTimer();
	}
	periodsNode.addEventListener('mouseenter', expand);
	mapsListNode.addEventListener('mousedown', e=>{
		if (!expansionDelayTimer) {
			expansionDelayTimer = setTimeout(expand, 500);
		}
	});

	timelineNode.addEventListener('mouseleave', e=>{
		// expand if cursor moves past edge (Fitts law)
		if (e.clientX >= document.documentElement.clientWidth) {
			expand();
		} else {
			collapse();
		}
	});
	document.addEventListener('mouseup', e=>{
		cancelExpansionTimer();
	});
}
