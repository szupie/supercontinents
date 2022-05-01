import { mapsReadyPromise } from './map-selector.js';

export {
	init
}

const timelineNode = document.getElementById('timeline');
const mapsListNode = document.getElementById('maps-list');
const lifeEventsNode = document.getElementById('life-events-list');
const supercontinentsNode = document.getElementById('supercontinents-list');
const periodsNode = document.getElementById('periods-list');
const expansionButton = document.getElementById('timeline-toggle');

let mapsSelector;

function init() {
	mapsReadyPromise.then(funcs=>{
		mapsSelector = funcs;

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
			if (mya > 0 && mya < mapsSelector.oldestMya) {
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
		node.addEventListener('click', e=>{
			document.querySelector(e.target.hash).scrollIntoView();
			e.preventDefault();
			document.querySelector('#stories').classList.add('switching');
			setTimeout(e=>{
				document.querySelector('#stories').classList.remove('switching');
			}, 300);
			setTimelineExpandedOverlay(false);
		});
	});
}

let periodsDragDelayTimer;
let eventsHoverDelayTimer;
function setUpListeners() {
	// Show/hide full-width timeline with periods
	function cancelPeriodsTimer() {
		clearTimeout(periodsDragDelayTimer);
		periodsDragDelayTimer = false;
	}
	function showPeriods() {
		timelineNode.classList.add('show-periods');
		cancelPeriodsTimer();
	}
	function hidePeriods() {
		timelineNode.classList.remove('show-periods');
		cancelPeriodsTimer();
	}
	periodsNode.addEventListener('mouseenter', showPeriods);
	mapsListNode.addEventListener('mousedown', e=>{
		if (!periodsDragDelayTimer) {
			periodsDragDelayTimer = setTimeout(showPeriods, 500);
		}
		setTimelineExpandedOverlay(false);
	});

	timelineNode.addEventListener('mouseleave', e=>{
		// show periods if cursor moves past edge (Fitts law)
		if (e.clientX >= document.documentElement.clientWidth) {
			showPeriods();
		} else {
			hidePeriods();
		}
	});
	document.addEventListener('mouseup', e=>{
		cancelPeriodsTimer();
	});

	// Show life events on hover
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

	// Expand/collapse timeline overlay on narrow screens
	expansionButton.addEventListener('click', e=>{
		if (!timelineNode.classList.contains('expanded-overlay')) {
			setTimelineExpandedOverlay(true);
		} else {
			setTimelineExpandedOverlay(false);
		}
	});
}

function setTimelineExpandedOverlay(expand) {
	if (expand) {
		timelineNode.classList.add('expanded-overlay');
	} else {
		timelineNode.classList.remove('expanded-overlay');
	}
	expansionButton.setAttribute('aria-expanded', expand);
	expansionButton.querySelector('.expand-label')
		.setAttribute('aria-hidden', expand);
	expansionButton.querySelector('.collapse-label')
		.setAttribute('aria-hidden', !expand);
}
