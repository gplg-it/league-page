<script>
	import { onMount, onDestroy } from 'svelte';

	let canvas = $state();
	let animId;
	let renderer, scene, camera;

	onMount(async () => {
		const THREE = await import('three');

		scene = new THREE.Scene();
		scene.fog = new THREE.FogExp2(0x0a0a0f, 0.012);

		camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
		camera.position.set(0, 35, 65);
		camera.lookAt(0, 0, 0);

		renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
		renderer.setSize(canvas.clientWidth, canvas.clientHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.shadowMap.enabled = true;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 0.8;

		// field
		const fieldGeo = new THREE.PlaneGeometry(53.3, 100, 1, 1);
		const fieldMat = new THREE.MeshStandardMaterial({ color: 0x1a5c1a, roughness: 0.9, metalness: 0 });
		const field = new THREE.Mesh(fieldGeo, fieldMat);
		field.rotation.x = -Math.PI / 2;
		field.receiveShadow = true;
		scene.add(field);

		// yard lines
		for (let i = -45; i <= 45; i += 5) {
			const lineGeo = new THREE.PlaneGeometry(53.3, 0.15);
			const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: i % 10 === 0 ? 0.6 : 0.25 });
			const line = new THREE.Mesh(lineGeo, lineMat);
			line.rotation.x = -Math.PI / 2;
			line.position.set(0, 0.01, i);
			scene.add(line);
		}

		// sidelines
		for (const x of [-26.65, 26.65]) {
			const sideGeo = new THREE.PlaneGeometry(0.15, 100);
			const sideMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
			const sideLine = new THREE.Mesh(sideGeo, sideMat);
			sideLine.rotation.x = -Math.PI / 2;
			sideLine.position.set(x, 0.01, 0);
			scene.add(sideLine);
		}

		// end zones
		for (const z of [-50, 50]) {
			const ezGeo = new THREE.PlaneGeometry(53.3, 10);
			const ezMat = new THREE.MeshStandardMaterial({ color: 0x920505, roughness: 0.8 });
			const ez = new THREE.Mesh(ezGeo, ezMat);
			ez.rotation.x = -Math.PI / 2;
			ez.position.set(0, 0.005, z > 0 ? z + 5 : z - 5);
			scene.add(ez);
		}

		// stadium walls
		const wallColor = 0x1a1a2e;
		const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.5, metalness: 0.3 });

		for (const x of [-35, 35]) {
			const wallGeo = new THREE.BoxGeometry(8, 18, 130);
			const wall = new THREE.Mesh(wallGeo, wallMat);
			wall.position.set(x, 9, 0);
			wall.castShadow = true;
			scene.add(wall);
		}

		for (const z of [-72, 72]) {
			const wallGeo = new THREE.BoxGeometry(78, 14, 8);
			const wall = new THREE.Mesh(wallGeo, wallMat);
			wall.position.set(0, 7, z);
			wall.castShadow = true;
			scene.add(wall);
		}

		// bleacher rows
		const bleacherMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3e, roughness: 0.6 });
		for (let row = 0; row < 5; row++) {
			for (const x of [-35, 35]) {
				const side = x > 0 ? 1 : -1;
				const geo = new THREE.BoxGeometry(6, 1.5, 120);
				const bleacher = new THREE.Mesh(geo, bleacherMat);
				bleacher.position.set(x + side * (4 + row * 1.5), 2 + row * 3, 0);
				scene.add(bleacher);
			}
		}

		// light towers
		const towerPositions = [
			[-32, 0, -58], [32, 0, -58], [-32, 0, 58], [32, 0, 58],
			[-32, 0, -20], [32, 0, -20], [-32, 0, 20], [32, 0, 20],
		];

		const towerMat = new THREE.MeshStandardMaterial({ color: 0x444466, metalness: 0.8, roughness: 0.3 });

		for (const [tx, ty, tz] of towerPositions) {
			const poleCyl = new THREE.CylinderGeometry(0.3, 0.4, 30, 6);
			const pole = new THREE.Mesh(poleCyl, towerMat);
			pole.position.set(tx, 15, tz);
			scene.add(pole);

			const headGeo = new THREE.BoxGeometry(3, 1, 2);
			const headMat = new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffcc, emissiveIntensity: 0.5 });
			const head = new THREE.Mesh(headGeo, headMat);
			head.position.set(tx, 30.5, tz);
			scene.add(head);

			const spot = new THREE.SpotLight(0xffeedd, 60, 120, Math.PI / 5, 0.5, 1);
			spot.position.set(tx, 30, tz);
			spot.target.position.set(tx > 0 ? tx - 20 : tx + 20, 0, tz);
			spot.castShadow = true;
			scene.add(spot);
			scene.add(spot.target);
		}

		// ground lights (subtle up-lights)
		const groundLight = new THREE.PointLight(0x920505, 15, 60);
		groundLight.position.set(0, 1, 0);
		scene.add(groundLight);

		const ambientLight = new THREE.AmbientLight(0x1a1a3e, 0.3);
		scene.add(ambientLight);

		const hemiLight = new THREE.HemisphereLight(0x1a1a3e, 0x0a0a0f, 0.4);
		scene.add(hemiLight);

		// floating trophy
		const trophyGroup = new THREE.Group();

		const cupGeo = new THREE.CylinderGeometry(1.2, 0.6, 3, 16);
		const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a84c, metalness: 0.9, roughness: 0.15, emissive: 0xc9a84c, emissiveIntensity: 0.1 });
		const cup = new THREE.Mesh(cupGeo, goldMat);
		cup.position.y = 2;
		trophyGroup.add(cup);

		const baseGeo = new THREE.CylinderGeometry(0.8, 1.0, 1, 16);
		const base = new THREE.Mesh(baseGeo, goldMat);
		base.position.y = 0;
		trophyGroup.add(base);

		const handleGeo = new THREE.TorusGeometry(1.0, 0.12, 8, 16, Math.PI);
		for (const side of [-1, 1]) {
			const handle = new THREE.Mesh(handleGeo, goldMat);
			handle.position.set(side * 1.2, 2.5, 0);
			handle.rotation.z = side * Math.PI / 2;
			handle.rotation.y = Math.PI / 2;
			trophyGroup.add(handle);
		}

		trophyGroup.position.set(0, 12, 0);
		scene.add(trophyGroup);

		const trophyLight = new THREE.PointLight(0xc9a84c, 20, 30);
		trophyLight.position.set(0, 15, 0);
		scene.add(trophyLight);

		// particles
		const particleCount = 600;
		const particleGeo = new THREE.BufferGeometry();
		const positions = new Float32Array(particleCount * 3);
		const velocities = [];

		for (let i = 0; i < particleCount; i++) {
			positions[i * 3] = (Math.random() - 0.5) * 100;
			positions[i * 3 + 1] = Math.random() * 50;
			positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
			velocities.push({
				x: (Math.random() - 0.5) * 0.03,
				y: (Math.random() - 0.5) * 0.02 + 0.01,
				z: (Math.random() - 0.5) * 0.03,
			});
		}

		particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		const particleMat = new THREE.PointsMaterial({
			color: 0xffeedd,
			size: 0.3,
			transparent: true,
			opacity: 0.6,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
		});
		const particles = new THREE.Points(particleGeo, particleMat);
		scene.add(particles);

		// red accent particles
		const redParticleCount = 200;
		const redGeo = new THREE.BufferGeometry();
		const redPositions = new Float32Array(redParticleCount * 3);
		const redVelocities = [];

		for (let i = 0; i < redParticleCount; i++) {
			redPositions[i * 3] = (Math.random() - 0.5) * 80;
			redPositions[i * 3 + 1] = Math.random() * 40;
			redPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
			redVelocities.push({
				x: (Math.random() - 0.5) * 0.05,
				y: Math.random() * 0.03 + 0.01,
				z: (Math.random() - 0.5) * 0.05,
			});
		}

		redGeo.setAttribute('position', new THREE.BufferAttribute(redPositions, 3));
		const redMat = new THREE.PointsMaterial({
			color: 0x920505,
			size: 0.4,
			transparent: true,
			opacity: 0.4,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
		});
		const redParticles = new THREE.Points(redGeo, redMat);
		scene.add(redParticles);

		// animation
		let time = 0;
		const animate = () => {
			animId = requestAnimationFrame(animate);
			time += 0.003;

			// orbit camera
			camera.position.x = Math.sin(time * 0.3) * 55;
			camera.position.z = Math.cos(time * 0.3) * 55 + 10;
			camera.position.y = 25 + Math.sin(time * 0.5) * 8;
			camera.lookAt(0, 5, 0);

			// float trophy
			trophyGroup.rotation.y += 0.008;
			trophyGroup.position.y = 12 + Math.sin(time * 2) * 1.5;

			// pulse trophy light
			trophyLight.intensity = 20 + Math.sin(time * 3) * 8;
			groundLight.intensity = 15 + Math.sin(time * 2) * 5;

			// animate particles
			const posArr = particleGeo.attributes.position.array;
			for (let i = 0; i < particleCount; i++) {
				posArr[i * 3] += velocities[i].x;
				posArr[i * 3 + 1] += velocities[i].y;
				posArr[i * 3 + 2] += velocities[i].z;
				if (posArr[i * 3 + 1] > 50) {
					posArr[i * 3 + 1] = 0;
					posArr[i * 3] = (Math.random() - 0.5) * 100;
					posArr[i * 3 + 2] = (Math.random() - 0.5) * 100;
				}
			}
			particleGeo.attributes.position.needsUpdate = true;

			const redArr = redGeo.attributes.position.array;
			for (let i = 0; i < redParticleCount; i++) {
				redArr[i * 3] += redVelocities[i].x;
				redArr[i * 3 + 1] += redVelocities[i].y;
				redArr[i * 3 + 2] += redVelocities[i].z;
				if (redArr[i * 3 + 1] > 40) {
					redArr[i * 3 + 1] = 0;
					redArr[i * 3] = (Math.random() - 0.5) * 80;
					redArr[i * 3 + 2] = (Math.random() - 0.5) * 80;
				}
			}
			redGeo.attributes.position.needsUpdate = true;

			renderer.render(scene, camera);
		};
		animate();

		const handleResize = () => {
			if (!canvas) return;
			const w = canvas.clientWidth;
			const h = canvas.clientHeight;
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			renderer.setSize(w, h);
		};
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	onDestroy(() => {
		if (animId) cancelAnimationFrame(animId);
		if (renderer) renderer.dispose();
	});
</script>

<style>
	canvas {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
</style>

<canvas bind:this={canvas}></canvas>
