import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";

/* SECTION - Scene Setup */

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

// Sizes
const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
};

window.addEventListener("resize", () => {
	// Update sizes
	sizes.width = window.innerWidth;
	sizes.height = window.innerHeight;

	// Update camera
	camera.aspect = sizes.width / sizes.height; // for Perspective camera
	camera.updateProjectionMatrix();

	// Update renderer
	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

window.addEventListener("dblclick", () => {
	if (!document.fullscreenElement) {
		console.log("go full");
		renderer.domElement.requestFullscreen();
	} else {
		console.log("leave full");
		document.exitFullscreen();
	}
});

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(-5, 10, 5);
scene.add(directionalLight);

// Camera
const camera = new THREE.PerspectiveCamera(
	75,
	sizes.width / sizes.height,
	0.1,
	100
);
camera.position.x = 0;
camera.position.y = 10;
camera.position.z = 0;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// Renderer
const renderer = new THREE.WebGLRenderer({
	canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/* SECTION - Objects */

let cubes = [];
for (let i = 0; i < 8; i++) {
	for (let j = 0; j < 16; j++) {
		const xCoordinate = j - 7.5;
		const zCoordinate = i - 3.5;
		const geometry = new THREE.BoxGeometry(0.9, 1, 0.8);
		const material = new THREE.MeshPhongMaterial({
			color: `hsl(${i * 16 + 180}, 100%, 80%)`,
			wireframe: false,
		});

		const cube = new THREE.Mesh(geometry, material);
		cube.position.x = xCoordinate;
		cube.position.y = 0;
		cube.position.z = zCoordinate;
		cubes.push(cube);
		scene.add(cube);
	}
}

let audioCubes = [];
for (let i = 0; i < 100; i++) {
	const geometry = new THREE.BoxGeometry(0.05, 0.05, 0.4);
	const material = new THREE.MeshPhongMaterial({
		color: 0xffffff,
	});
	const cube = new THREE.Mesh(geometry, material);
	cube.position.x = i / 10 - 5;
	cube.position.y = 0;
	cube.position.z = 6;
	audioCubes.push(cube);
	scene.add(cube);
}

/* SECTION - Initial render */

cubes.forEach((cube) => {
	cube.scale.y = 0.2;
});
renderer.render(scene, camera);

/* SECTION - Audio */

let animationFrameId;
let audioContext;

document.getElementById("audio").addEventListener("change", (event) => {
	// Stop any existing ongoing visualization
	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId);
		console.log("stopped");
		if (audioContext) {
			audioContext.close();
		}
		audioCubes.forEach((cube) => {
			cube.scale.set(1, 1, 1);
			cube.material.color.setHex(0xffffff);
		});
		renderer.render(scene, camera);
	}

	// Get the selected file
	const file = event.target.files[0];
	console.log(file);

	// Create a new FileReader instance
	const reader = new FileReader();

	// Add event listener to the FileReader instance
	reader.addEventListener("load", (event) => {
		// Get the array buffer from the file
		const arrayBuffer = event.target.result;
		console.log(arrayBuffer);

		// Create a new AudioContext instance
		audioContext = new (window.AudioContext || window.webkitAudioContext)();

		// Decode the audio data
		audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
			// Visualize the audio data
			visualize(audioBuffer, audioContext);
		});
	});

	// Read the file as an array buffer
	reader.readAsArrayBuffer(file);
});

/* SECTION - Visualize */

function visualize(audioBuffer, audioContext) {
	console.log(audioBuffer);

	const channel0Data = audioBuffer.getChannelData(0); //using single channel data only

	/* Visualizing the audio structure */
	const numberOfChunks = 100;
	const chunkSize = Math.ceil(channel0Data.length / numberOfChunks);

	for (let i = 0; i < numberOfChunks; i++) {
		const chunk = channel0Data.slice(i * chunkSize, (i + 1) * chunkSize);
		const min = Math.min(...chunk);
		const max = Math.max(...chunk);

		const cubeLength = (max - min) / 2;
		audioCubes[i].scale.z = cubeLength;
	}

	/* Visualizing the live audio waveform */
	const analyser = audioContext.createAnalyser();
	analyser.fftSize = 256;

	const frequencyBufferLength = analyser.frequencyBinCount;
	const frequencyData = new Uint8Array(frequencyBufferLength);

	const source = audioContext.createBufferSource();
	source.buffer = audioBuffer;
	source.connect(analyser);
	analyser.connect(audioContext.destination);
	source.start();
	let startTime = audioContext.currentTime;
	const totalDuration = audioBuffer.duration;

	function draw() {
		animationFrameId = requestAnimationFrame(draw);

		analyser.getByteFrequencyData(frequencyData);

		/* Visualizing audio progress */
		const elapsedTime = audioContext.currentTime - startTime;
		const percentageComplete = Math.floor((elapsedTime * 100) / totalDuration);
		if (percentageComplete > 1) {
			//because it seems to go faster
			audioCubes[percentageComplete - 1].material.color.set(0xffe957);
			audioCubes[percentageComplete - 1].material.opacity = 1;
		} else {
			audioCubes[percentageComplete].material.color.set(0xfedd00);
			audioCubes[percentageComplete].material.opacity = 1;
		}

		/* Visualizing live audio */
		for (let i = 0; i < frequencyBufferLength; i++) {
			cubes[i].scale.y = (frequencyData[i] * 7) / 256 + 0.1;
		}
		// Update controls
		controls.update();

		// Render
		renderer.render(scene, camera);
	}

	draw();

	gsap
		.to(camera.position, {
			duration: 4.5,
			delay: 8,
			y: 8,
			z: 10,
			overwrite: true,
		})
		.then(() => {
			gsap
				.to(camera.position, { duration: 4, y: 0, z: 12.5, overwrite: true })
				.then(() => {
					gsap.to(camera.position, {
						duration: 5,
						delay: 8,
						y: 8,
						z: 10,
						overwrite: true,
					});
				});
		});
}
