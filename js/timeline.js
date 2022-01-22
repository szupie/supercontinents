import { myaToPercent } from './map-selector.js';

export {
	init
}

const timelineNode = document.getElementById('timeline');
const mapsListNode = document.getElementById('maps-list');
const lifeEventsNode = document.getElementById('life-events-list');
const supercontinentsNode = document.getElementById('supercontinents-list');
const periodsNode = document.getElementById('periods-list');

function init() {
	createMyaLabels();

	positionSupercontinents();
	positionPeriods();
	positionLifeEvents();

	setUpExpansionListeners();
}

function createMyaLabels() {
	const labelsContainerNode = document.createElement('div');
	labelsContainerNode.classList.add('axis-labels');

	// create labels at intervals
	for (let labelValue=0; myaToPercent(labelValue)<=100; labelValue+=200) {
		const labelNode = document.createElement('span');
		labelNode.classList.add('label');

		labelNode.textContent = labelValue;

		labelsContainerNode.appendChild(labelNode);
		labelNode.style.top = `${myaToPercent(labelValue)}%`;
	}

	const axisTitleNode = document.createElement('span');
	axisTitleNode.textContent = 'million years ago'
	axisTitleNode.classList.add('title');
	axisTitleNode.classList.add('label');
	labelsContainerNode.appendChild(axisTitleNode);

	timelineNode.appendChild(labelsContainerNode);
}

function positionSupercontinents() {
	const nodes = supercontinentsNode.children;

	for (let i=0; i<nodes.length; i++) {
		const end = nodes[i].getAttribute('data-break-mya');
		const start = nodes[i].getAttribute('data-form-mya');
		nodes[i].style.top = `${myaToPercent(end)}%`;
		nodes[i].style.bottom = `${100 - myaToPercent(start)}%`;

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
		nodes[i].style.top = `${myaToPercent(
			nodes[i].getAttribute('data-end-mya')
		)}%`;
		nodes[i].style.bottom = `${100 - myaToPercent(
			nodes[i].getAttribute('data-start-mya')
		)}%`;
	}
}

function positionLifeEvents() {
	lifeEventsNode.querySelectorAll('li').forEach(node=>{
		node.style.top = `${myaToPercent(node.getAttribute('data-mya'))}%`;
	})
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

	mapsListNode.addEventListener('mouseleave', collapse);
	document.addEventListener('mouseup', e=>{
		cancelExpansionTimer();
	});
}
