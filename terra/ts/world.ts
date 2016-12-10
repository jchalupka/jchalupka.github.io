// Copyright (c) 2016 by Mike Linkovich

import {$e} from './util'
import {difAngle} from './gmath'
import {Vec3, Color} from './vec'
import * as logger from './logger'
import * as input from './input'
import {Assets} from './loader'
import * as skydome from './skydome'
import * as heightfield from './heightfield'
type Heightfield = heightfield.Heightfield
import * as grass from './grass'
import * as terrain from './terrain'
import * as terramap from './terramap'
import * as water from './water'
import Player from './camera'
import {FPSMonitor} from './fps'

const VIEW_DEPTH = 2000.0

const MAX_TIMESTEP = 67 // max 67 ms/frame

const HEIGHTFIELD_SIZE = 3072.0
const HEIGHTFIELD_HEIGHT = 180.0

const LIGHT_DIR = Vec3.create(0.0, 1.0, -1.0)
Vec3.normalize(LIGHT_DIR, LIGHT_DIR)

const FOG_COLOR = Color.create(0.74, 0.77, 0.91) //(0.92, 0.94, 0.98)
const GRASS_COLOR_LOW = Color.create(0.34, 0.37, 0.18)
const GRASS_COLOR_HIGH = Color.create(0.48, 0.46, 0.18)

const WATER_LEVEL = 10
const WATER_COLOR = Color.create(0.6, 0.7, 0.85) // THREE.Color(0.2, 0.36, 0.51)

const MAX_GLARE = 0.25 // max glare effect amount
const GLARE_RANGE = 1.1 // angular range of effect
const GLARE_YAW = Math.PI * 1.5 // yaw angle when looking directly at sun
const GLARE_PITCH = 0.2 // pitch angle looking at sun
const GLARE_COLOR = Color.create(1.0, 1.0, 0.75) // 0xFFF844

const INTRO_FADE_DUR = 2000

export interface IWorld {
	doFrame() : void
	resize(w: number, h: number) : void
}

interface MeshSet {
	terrain: THREE.Mesh
	grass: THREE.Mesh
	sky: THREE.Mesh
	water: THREE.Mesh
	sunFlare: THREE.Mesh
	fade: THREE.Mesh // used for intro fade from white
	mesh: THREE.Mesh
}

///////////////////////////////////////////////////////////////////////
/**
 * Create a World instance
 */
export function World ( assets: Assets,
	numGrassBlades: number, grassPatchRadius: number,
	displayWidth: number, displayHeight: number,
	antialias: boolean
) : IWorld {

	const canvas = $e('app_canvas') as HTMLCanvasElement

	// Make canvas transparent so it isn't rendered as black for 1 frame at startup
	const renderer = new THREE.WebGLRenderer({
		canvas: canvas, antialias: antialias, clearColor: 0xFFFFFF, clearAlpha: 1, alpha: true
	})
	if (!renderer) {
		console.error("Failed to create THREE.WebGLRenderer")
		return null
	}

	// Setup some render values based on provided configs
	const fogDist = grassPatchRadius * 20.0
	const grassFogDist = grassPatchRadius * 2.0
	const camera = new THREE.PerspectiveCamera(
		45, displayWidth / displayHeight, 1.0, VIEW_DEPTH
	)
	const meshes: MeshSet = {
		terrain: null, grass: null, sky: null, water: null, sunFlare: null, fade: null, mesh: null
	}

	const scene = new THREE.Scene()
	scene.fog = new THREE.Fog(Color.to24bit(FOG_COLOR), 0.1, fogDist)

	// Setup the camera so Z is up.
	// Then we have cartesian X,Y coordinates along ground plane.
	camera.rotation.order = "ZXY"
	camera.rotation.x = Math.PI * 0.5
	camera.rotation.y = Math.PI * 0.5
	camera.rotation.z = Math.PI
	camera.up.set(0.0, 0.0, 1.0)

	// Put camera in an object so we can transform it normally
	const camHolder = new THREE.Object3D()
	camHolder.rotation.order = "ZYX"
	camHolder.add(camera)

	scene.add(camHolder)

	// Prevent three from sorting objs, we'll add them to the scene
	// in the order we want them drawn, because we know grass is in front
	// of everything, ground in front of sky, and transparent fullscreen
	// overlays get drawn last.
	renderer.sortObjects = false

	// Setup heightfield
	//let hfImg = assets.textures['heightmap'].image as HTMLImageElement
	let hfImg = assets.images['heightmap']
	const hfCellSize = HEIGHTFIELD_SIZE / hfImg.width
	const heightMapScale = Vec3.create(
		1.0 / HEIGHTFIELD_SIZE,
		1.0 / HEIGHTFIELD_SIZE,
		HEIGHTFIELD_HEIGHT
	)
	const heightField = heightfield.create({
		cellSize: hfCellSize,
		minHeight: 0.0,
		maxHeight: heightMapScale.z,
		image: hfImg
	})
	hfImg = null

	const terraMap = terramap.createTexture(heightField, LIGHT_DIR)

	// Create a large patch of grass to fill the foreground
	meshes.grass = grass.createMesh({
		lightDir: LIGHT_DIR,
		numBlades: numGrassBlades,
		radius: grassPatchRadius,
		texture: assets.textures['grass'],
		vertScript: assets.text['grass.vert'],
		fragScript: assets.text['grass.frag'],
		heightMap: terraMap,
		heightMapScale: heightMapScale,
		fogColor: FOG_COLOR,
		fogFar: fogDist,
		grassFogFar: grassFogDist,
		grassColorLow: GRASS_COLOR_LOW,
		grassColorHigh: GRASS_COLOR_HIGH
	})
	scene.add(meshes.grass)

	// Create repeating-textured ground plane with
	// custom fog to blend with grass in distance
	//meshes.terrain = terrain.createMesh({
	const terra = terrain.create({
		texture: assets.textures['ground'],
		vertScript: assets.text['terrain.vert'],
		fragScript: assets.text['terrain.frag'],
		heightMap: terraMap,
		heightMapScale: heightMapScale,
		fogColor: FOG_COLOR,
		fogFar: fogDist,
		grassFogFar: grassFogDist,
		grassColorLow: GRASS_COLOR_LOW,
		grassColorHigh: GRASS_COLOR_HIGH
	})
	meshes.terrain = terra.mesh
	meshes.terrain.receiveShadow = true
	scene.add(meshes.terrain)

	// Skydome
	meshes.sky = skydome.createMesh(assets.textures['skydome'], VIEW_DEPTH * 0.95, VIEW_DEPTH * 0.95)
	scene.add(meshes.sky)
	meshes.sky.position.z = -25.0

	meshes.water = water.createMesh({
		envMap: assets.textures['skydome'],
		vertScript: assets.text['water.vert'],
		fragScript: assets.text['water.frag'],
		waterLevel: WATER_LEVEL,
		waterColor: WATER_COLOR,
		fogColor: FOG_COLOR,
		fogNear: 1.0,
		fogFar: fogDist
	})
	/*new THREE.Mesh(
		new THREE.PlaneBufferGeometry(100000.0, 100000.0),
		new THREE.MeshBasicMaterial({color: WATER_COLOR.getHex(), fog: true})
	)*/
	scene.add(meshes.water)
	meshes.water.position.z = WATER_LEVEL;

	// White plane to cover screen for fullscreen fade-in from white
	meshes.fade = new THREE.Mesh(
		new THREE.PlaneBufferGeometry(6.0, 4.0, 1, 1),
		new THREE.MeshBasicMaterial({
			color: 0xFFFFFF, fog: false, transparent: true, opacity: 1.0,
			depthTest: false, depthWrite: false
		})
	)
	meshes.fade.position.x = 2.0  // place directly in front of camera
	meshes.fade.rotation.y = Math.PI * 1.5
	camHolder.add(meshes.fade)

	// Bright yellow plane for sun glare using additive blending
	// to blow out the colours
	meshes.sunFlare = new THREE.Mesh(
		new THREE.PlaneBufferGeometry(6.0, 4.0, 1, 1),
		new THREE.MeshBasicMaterial({
			color: Color.to24bit(GLARE_COLOR), fog: false, transparent: true, opacity: 0.0,
			depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
		})
	)
	meshes.sunFlare.position.x = 2.05
	meshes.sunFlare.rotation.y = Math.PI * 1.5
	//meshes.sunFlare.visible = true
	camHolder.add(meshes.sunFlare)


	// Create a Player instance
	const player = Player(heightField, WATER_LEVEL)

	// For timing
	let prevT = Date.now() // prev frame time (ms)
	let simT = 0 // total running time (ms)

	resize(displayWidth, displayHeight)

	// toggle logger on ` press
	input.setKeyPressListener(192, function() {
		logger.toggle()
	})

	input.setKeyPressListener('O'.charCodeAt(0), function() {
		player.state.pos.x = 0
		player.state.pos.y = 0
	});

	var geometry = new THREE.BoxGeometry( 50, 50, 500 );
	var material = new THREE.MeshPhongMaterial( { color: 0x0033ff, specular: 0x555555, shininess: 30 } );
	
	meshes.mesh = new THREE.Mesh( geometry, material )
	meshes.mesh.position.z =  heightfield.heightAt( heightField, 0, 0 )
	//scene.add(meshes.mesh)


	createPlane(scene)

	const aLight = new THREE.AmbientLight(0x404040);
	scene.add(aLight);


	//Create a light for the sun
	const light = new THREE.DirectionalLight( 0x404040 )
	light.position.x = -300  // These values are just hard coded for what looks right
	light.position.y = -1800
	light.position.z = 200
	light.intensity = 0.5;
	light.target = meshes.mesh
	light.shadowDarkness = 200;
	light.castShadow = true
	light.shadowCameraFov = 5000;
	scene.add(light)

	var helper = new THREE.CameraHelper( light.shadow.camera );
	scene.add( helper );

	const fpsMon = FPSMonitor()

	///////////////////////////////////////////////////////////////////
	// Public World instance methods

	/**
	 * Call every frame
	 */
	function doFrame() {
		const curT = Date.now()
		let dt = curT - prevT
		fpsMon.update(dt)

		if (dt > 0) {
			// only do computations if time elapsed
			if (dt > MAX_TIMESTEP) {
				// don't exceed max timestep
				dt = MAX_TIMESTEP
				prevT = curT - MAX_TIMESTEP
			}
			// update sim
			update(dt)
			// render it
			render()
			// remember prev frame time
			prevT = curT
		}
	}

	/** Handle window resize events */
	function resize(w: number, h: number) {
		displayWidth = w
		displayHeight = h
		renderer.setSize(displayWidth, displayHeight)
		camera.aspect = displayWidth / displayHeight
		camera.updateProjectionMatrix()
	}

	///////////////////////////////////////////////////////////////////
	// Private instance methods

	const _hinfo = heightfield.HInfo.create()

	/**
	 * Logic update
	 */
	function update (dt: number) {
		//airplane.pilot.updateHairs();
		airplane.propeller.rotation.x += 0.3;
		airplane.mesh.rotation.y += 0.05;
		airplane.mesh.rotation.z += 0.05
		// airplane.mesh.position.x += dt * 0.05
		// airplane.mesh.position.y += Math.sin(Date.now()/200)
		// airplane.mesh.position.z += Math.sin(Date.now()/400) * 4


		scene.getObjectByName('pivot').rotation.y += 3
		pivot.rotation.x += 10
		//console.log(airplane.pivot)

		// Intro fade from white
		if (simT < INTRO_FADE_DUR) {
			updateFade(dt)
		}

		simT += dt
		const t = simT * 0.001

		// Move player (viewer)
		player.update(dt)
		const ppos = player.state.pos
		const pyaw = player.state.yaw
		const ppitch = player.state.pitch
		const proll = player.state.roll

		heightfield.infoAt(heightField, ppos.x, ppos.y, true, _hinfo)
		const groundHeight = _hinfo.z

		if (logger.isVisible()) {
			logger.setText(
				"state.yaw:" + player.state.yaw.toFixed(4) + 
				" x mesh:" + meshes.mesh.position.x.toFixed(4) + 
				" y mesh:" + meshes.mesh.position.y.toFixed(4) +
				" z mesh:" + meshes.mesh.position.z.toFixed(4) +  
				" x:" + ppos.x.toFixed(4) +
				" y:" + ppos.y.toFixed(4) +
				" z:" + ppos.z.toFixed(4) +
				" height:"+groundHeight.toFixed(4) +
				" i:"+_hinfo.i +
				" fps:"+fpsMon.fps()
			)
		}

		// Move skydome with player
		meshes.sky.position.x = ppos.x
		meshes.sky.position.y = ppos.y
		meshes.mesh.position.x = 10
		meshes.mesh.position.y = 0
		meshes.mesh.position.z = heightfield.heightAt( heightField, 0, 0 )

		// Update grass.
		// Here we specify the centre position of the square patch to
		// be drawn. That would be directly in front of the camera, the
		// distance from centre to edge of the patch.
		grass.update(
			meshes.grass, t,
			ppos.x + Math.cos(pyaw) * grassPatchRadius,
			ppos.y + Math.sin(pyaw) * grassPatchRadius
		)

		terrain.update(terra, ppos.x, ppos.y)

		water.update(meshes.water, ppos)

		// Update camera location/orientation
		Vec3.copy(ppos, camHolder.position)
		//camHolder.position.z = ppos.z + groundHeight
		camHolder.rotation.z = pyaw
		// Player considers 'up' pitch positive, but cam pitch (about Y) is reversed
		camHolder.rotation.y = -ppitch
		camHolder.rotation.x = proll

		// Update sun glare effect
		updateGlare()
	}

	/** Update how much glare effect by how much we're looking at the sun */
	function updateGlare() {
		const dy = Math.abs(difAngle(GLARE_YAW, player.state.yaw))
		const dp = Math.abs(difAngle(GLARE_PITCH, player.state.pitch)) * 1.375
		const sunVisAngle = Math.sqrt(dy * dy + dp * dp)
		if (sunVisAngle < GLARE_RANGE) {
			const glare = MAX_GLARE * Math.pow((GLARE_RANGE - sunVisAngle) / (1.0 + MAX_GLARE), 0.75)
			meshes.sunFlare.material.opacity = Math.max(0.0, glare)
			meshes.sunFlare.visible = true
		} else {
			meshes.sunFlare.visible = false
		}
	}

	/** Update intro fullscreen fade from white */
	function updateFade(dt: number) {
		if (simT + dt >= INTRO_FADE_DUR) {
			// fade is complete - hide cover
			meshes.fade.material.opacity = 0.0
			meshes.fade.visible = false
		} else {
			// update fade opacity
			meshes.fade.material.opacity = 1.0 - Math.pow(simT / INTRO_FADE_DUR, 2.0)
		}
	}

	function render () {
		renderer.shadowMap.enabled = true;
		renderer.render(scene, camera)
	}

	///////////////////////////////////////////////////////////////////
	// Return public interface
	return {
		doFrame: doFrame,
		resize: resize
	}
}

var Colors = {
	red:0xf25346,
	white:0xd8d0d1,
	brown:0x59332e,
	pink:0xF5986E,
	brownDark:0x23190f,
	blue:0x68c3c0,
};

class AirPlane extends THREE.Object3D {
	
	propeller:THREE.Object3D;
	mesh: THREE.Object3D;
	pilot: Pilot

	constructor() {
		super()
		this.pilot = new Pilot();
		this.mesh = new THREE.Object3D();
		// Create the cabin
		var geomCockpit = new THREE.BoxGeometry(80,50,50,1,1,1);
		var matCockpit = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
		// we can access a specific vertex of a shape through 
		// the vertices array, and then move its x, y and z property:
		geomCockpit.vertices[4].y-=10;
		geomCockpit.vertices[4].z+=20;
		geomCockpit.vertices[5].y-=10;
		geomCockpit.vertices[5].z-=20;
		geomCockpit.vertices[6].y+=30;
		geomCockpit.vertices[6].z+=20;
		geomCockpit.vertices[7].y+=30;
		geomCockpit.vertices[7].z-=20;
		
		var cockpit = new THREE.Mesh(geomCockpit, matCockpit);
		cockpit.castShadow = true;
		cockpit.receiveShadow = true;
		this.mesh.add(cockpit);
		
		// Create the engine
		var geomEngine = new THREE.BoxGeometry(20,50,50,1,1,1);
		var matEngine = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
		var engine = new THREE.Mesh(geomEngine, matEngine);
		engine.position.x = 40;
		engine.castShadow = true;
		engine.receiveShadow = true;
		this.mesh.add(engine);
		
		// Create the tail
		var geomTailPlane = new THREE.BoxGeometry(15,20,5,1,1,1);
		var matTailPlane = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
		var tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
		tailPlane.position.set(-35,25,0);
		tailPlane.castShadow = true;
		tailPlane.receiveShadow = true;
		this.mesh.add(tailPlane);
		
		// Create the wing
		var geomSideWing = new THREE.BoxGeometry(40,8,150,1,1,1);
		var matSideWing = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
		var sideWing = new THREE.Mesh(geomSideWing, matSideWing);
		sideWing.castShadow = true;
		sideWing.receiveShadow = true;
		this.mesh.add(sideWing);
		
		// propeller
		var geomPropeller = new THREE.BoxGeometry(20,10,10,1,1,1);
		var matPropeller = new THREE.MeshPhongMaterial({color:Colors.brown, shading:THREE.FlatShading});
		this.propeller = new THREE.Mesh(geomPropeller, matPropeller);
		this.propeller.castShadow = true;
		this.propeller.receiveShadow = true;
		
		// blades
		var geomBlade = new THREE.BoxGeometry(1,100,20,1,1,1);
		var matBlade = new THREE.MeshPhongMaterial({color:Colors.brownDark, shading:THREE.FlatShading});
		
		var blade = new THREE.Mesh(geomBlade, matBlade);
		blade.position.set(8,0,0);
		blade.castShadow = true;
		blade.receiveShadow = true;
		this.propeller.add(blade);
		this.propeller.position.set(50,0,0);
		this.mesh.add(this.propeller);


		this.mesh.add(this.pilot)
		// this.pilot.position.x = 0
		// this.pilot.position.y = 0
		// this.pilot.position.z = 125
		this.mesh.rotateX(Math.PI/2)

	}

	
};

var airplane: AirPlane;
var pivot: THREE.Object3D;

function createPlane(scene : THREE.Scene){ 

	airplane = new AirPlane();
	airplane.mesh.scale.set(.25,.25,.25);
	airplane.mesh.position.z = 150;
	airplane.mesh.position.x = 100;
	airplane.mesh.position.y = 100;

	pivot = new THREE.Object3D()
	pivot.name = 'pivot'
	airplane.mesh.name = 'airplane'
	pivot.position.y = 10;
	pivot.add(airplane.mesh)
	console.log(pivot)
	scene.add(pivot)
	scene.add(airplane.mesh);
}

class Pilot extends THREE.Object3D {
	mesh: THREE.Object3D
	angleHairs: number
	hairsTop: THREE.Object3D
	updateHairs: Function
	constructor () {
		super()
		this.mesh = new THREE.Object3D();
		this.mesh.name = "pilot";
		
		// angleHairs is a property used to animate the hair later 
		this.angleHairs=0;

		// Body of the pilot
		var bodyGeom = new THREE.BoxGeometry(15,15,15);
		var bodyMat = new THREE.MeshPhongMaterial({color:Colors.brown, shading:THREE.FlatShading});
		var body = new THREE.Mesh(bodyGeom, bodyMat);
		body.position.set(2,-12,0);
		this.mesh.add(body);

		// Face of the pilot
		var faceGeom = new THREE.BoxGeometry(10,10,10);
		var faceMat = new THREE.MeshLambertMaterial({color:Colors.pink});
		var face = new THREE.Mesh(faceGeom, faceMat);
		this.mesh.add(face);

		// Hair element
		var hairGeom = new THREE.BoxGeometry(4,4,4);
		var hairMat = new THREE.MeshLambertMaterial({color:Colors.brown});
		var hair = new THREE.Mesh(hairGeom, hairMat);
		// Align the shape of the hair to its bottom boundary, that will make it easier to scale.
		hair.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0,2,0));
		
		// create a container for the hair
		var hairs = new THREE.Object3D();

		// create a container for the hairs at the top 
		// of the head (the ones that will be animated)
		this.hairsTop = new THREE.Object3D();

		// create the hairs at the top of the head 
		// and position them on a 3 x 4 grid
		for (var i=0; i<12; i++){
			var h = hair.clone();
			var col = i%3;
			var row = Math.floor(i/3);
			var startPosZ = -4;
			var startPosX = -4;
			h.position.set(startPosX + row*4, 0, startPosZ + col*4);
			this.hairsTop.add(h);
		}
		hairs.add(this.hairsTop);

		// create the hairs at the side of the face
		var hairSideGeom = new THREE.BoxGeometry(12,4,2);
		hairSideGeom.applyMatrix(new THREE.Matrix4().makeTranslation(-6,0,0));
		var hairSideR = new THREE.Mesh(hairSideGeom, hairMat);
		var hairSideL = hairSideR.clone();
		hairSideR.position.set(8,-2,6);
		hairSideL.position.set(8,-2,-6);
		hairs.add(hairSideR);
		hairs.add(hairSideL);

		// create the hairs at the back of the head
		var hairBackGeom = new THREE.BoxGeometry(2,8,10);
		var hairBack = new THREE.Mesh(hairBackGeom, hairMat);
		hairBack.position.set(-1,-4,0)
		hairs.add(hairBack);
		hairs.position.set(-5,5,0);

		this.mesh.add(hairs);

		var glassGeom = new THREE.BoxGeometry(5,5,5);
		var glassMat = new THREE.MeshLambertMaterial({color:Colors.brown});
		var glassR = new THREE.Mesh(glassGeom,glassMat);
		glassR.position.set(6,0,3);
		var glassL = glassR.clone();
		glassL.position.z = -glassR.position.z

		var glassAGeom = new THREE.BoxGeometry(11,1,11);
		var glassA = new THREE.Mesh(glassAGeom, glassMat);
		this.mesh.add(glassR);
		this.mesh.add(glassL);
		this.mesh.add(glassA);

		var earGeom = new THREE.BoxGeometry(2,3,2);
		var earL = new THREE.Mesh(earGeom,faceMat);
		earL.position.set(0,0,-6);
		var earR = earL.clone();
		earR.position.set(0,0,6);
		this.mesh.add(earL);
		this.mesh.add(earR);
	}
	
}

// move the hair
Pilot.prototype.updateHairs = function(){
	// get the hair
	var hairs = this.hairsTop.children;

	// update them according to the angle angleHairs
	var l = hairs.length;
	for (var i=0; i<l; i++){
		var h = hairs[i];
		// each hair element will scale on cyclical basis between 75% and 100% of its original size
		h.scale.y = .75 + Math.cos(this.angleHairs+i/3)*.25;
	}
	// increment the angle for the next frame
	this.angleHairs += 0.16;
}