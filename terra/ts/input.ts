// LICENSE: MIT
// Copyright (c) 2016 by Mike Linkovich

export interface State {
	up: number
	down: number
	turnLeft: number
	turnRight: number
	straftLeft: number
	straftRight: number
	forward: number
	back: number
	pitchup: number
	pitchdown: number
}

export const state: State = {
	up: 0,
	down: 0,
	turnLeft: 0,
	turnRight: 0,
	straftLeft: 0,
	straftRight: 0,
	forward: 0,
	back: 0,
	pitchup: 0,
	pitchdown: 0
}

// Any listeners the app has set up
const keyPressListeners: {[id: string]: () => any} = {}

function setState (k: number, s: number) {
	const cs = state;
	// arrow keys L/R/F/B
	if (k === 37)
		cs.turnLeft = s
	else if (k === 39)
		cs.turnRight = s
	else if (k === 38)
		cs.forward = s
	else if (k === 40)
		cs.back = s
	else if (k === 65) // A
		cs.straftLeft = s
	else if (k === 68) // D
		cs.straftRight = s
	else if (k === 87) // W
		cs.forward = s
	else if (k === 83) // S
		cs.back = s
	else if (k === 81) // Q
		cs.pitchup = s
	else if (k === 69) // E
		cs.pitchdown = s
}

function onKeyDown (ev:KeyboardEvent) {
	setState(ev.keyCode, 1.0)
	const code = ev.keyCode.toString()
	if (keyPressListeners.hasOwnProperty(code)) {
		// TODO: Check if pressed (avoid key repeat events)
		keyPressListeners[code]()
	}
}

function onKeyUp (ev:KeyboardEvent) {
	setState(ev.keyCode, 0.0)
}

let initialized = false

export function init() {
	if (initialized) return
	document.addEventListener('keydown', onKeyDown, true)
	document.addEventListener('keyup', onKeyUp, true)
	initialized = true
}

export function setKeyPressListener(code: number, fn: () => void) {
	keyPressListeners[code.toString()] = fn
}
