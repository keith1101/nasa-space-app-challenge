import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Eye, Flame, RotateCcw, Satellite, X } from 'lucide-react';
import { cx } from '../ui';

// Representative global high-FRP clusters [lat, lon, label, frpMW]
const GLOBAL_HOTSPOTS: Array<[number, number, string, number]> = [
  [-3.46, -62.21, 'Amazon Basin (Brazil)', 850],
  [-9.5, -55.8, 'Cerrado Deforestation Front', 420],
  [-12.5, 23.5, 'Central Africa (DR Congo)', 920],
  [-8.8, 20.4, 'Angola Miombo Savanna', 680],
  [6.5, 20.8, 'Central African Republic', 510],
  [16.2, 107.5, 'Central Vietnam Forest', 340],
  [10.5, 106.8, 'Mekong Delta Biome', 290],
  [21.2, 103.8, 'Northern Vietnam Highlands', 380],
  [-0.5, 114.0, 'Borneo Peatlands (Indonesia)', 750],
  [-25.2, 133.7, 'Northern Territory (Australia)', 490],
  [-17.8, 128.5, 'Kimberley Bushfire Front', 360],
  [38.5, -121.5, 'California Sierra Foothills', 620],
  [53.5, -113.5, 'Alberta Boreal Forest (Canada)', 580],
  [-14.2, -59.5, 'Pantanal Wetland Border', 440],
];

// Convert Lat/Lon to 3D Cartesian on Sphere of radius R
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

// Helper: Cleanly dispose all geometries & materials inside a Three.js Group
function disposeThreeGroup(group: THREE.Group) {
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else if (mesh.material) {
        mesh.material.dispose();
      }
    }
  });
}

// 3D Procedural Craft: MODIS Spacecraft (EOS Terra / Aqua)
// Characteristics: Gold MLI Kapton thermal bus, single articulated solar wing, HGA dish, nadir scanning swath
function createModisCraft(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'MODIS_CRAFT';

  // 1. Gold MLI main bus
  const busGeo = new THREE.BoxGeometry(0.046, 0.024, 0.028);
  const busMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.88,
    roughness: 0.22,
  });
  const busMesh = new THREE.Mesh(busGeo, busMat);
  group.add(busMesh);

  // 2. Space-facing thermal radiator panel (-Z)
  const radGeo = new THREE.BoxGeometry(0.044, 0.022, 0.002);
  const radMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.8,
    roughness: 0.2,
  });
  const radMesh = new THREE.Mesh(radGeo, radMat);
  radMesh.position.set(0, 0, -0.015);
  group.add(radMesh);

  // 3. Single articulated solar array wing (+X)
  const armGeo = new THREE.CylinderGeometry(0.0015, 0.0015, 0.025, 8);
  const armMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
  const armMesh = new THREE.Mesh(armGeo, armMat);
  armMesh.rotation.z = Math.PI / 2;
  armMesh.position.set(0.035, 0, 0);
  group.add(armMesh);

  const solarGeo = new THREE.BoxGeometry(0.075, 0.002, 0.038);
  const solarMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    emissive: 0x071b40,
    metalness: 0.7,
    roughness: 0.25,
  });
  const solarMesh = new THREE.Mesh(solarGeo, solarMat);
  solarMesh.position.set(0.082, 0, 0);
  group.add(solarMesh);

  // 4. High-Gain Communications Dish (HGA)
  const dishGeo = new THREE.ConeGeometry(0.012, 0.006, 16, 1, true);
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.7,
    roughness: 0.3,
    side: THREE.DoubleSide,
  });
  const dishMesh = new THREE.Mesh(dishGeo, dishMat);
  dishMesh.position.set(-0.018, 0.016, -0.01);
  dishMesh.rotation.x = -Math.PI * 0.4;
  group.add(dishMesh);

  // 5. MODIS optical scanner aperture (Nadir +Z)
  const sensorGeo = new THREE.BoxGeometry(0.02, 0.014, 0.01);
  const sensorMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    metalness: 0.9,
    roughness: 0.1,
  });
  const sensorMesh = new THREE.Mesh(sensorGeo, sensorMat);
  sensorMesh.position.set(0, 0, 0.018);
  group.add(sensorMesh);

  // 6. Amber/Rose Nadir Scanning Swath Cone (projecting towards Earth along +Z)
  const beamGeo = new THREE.ConeGeometry(0.08, 0.16, 4, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xf43f5e,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamMesh.position.set(0, 0, 0.095);
  beamMesh.rotation.x = Math.PI / 2;
  group.add(beamMesh);
  group.userData.beamMesh = beamMesh;

  // 7. Beacon Light
  const beacon = new THREE.PointLight(0xfbbf24, 0.9, 0.35);
  beacon.position.set(0, 0, 0.02);
  group.add(beacon);

  return group;
}

// 3D Procedural Craft: VIIRS Spacecraft (Suomi-NPP / NOAA-20 / NOAA-21)
// Characteristics: Modern silver/white bus, dual solar array wings, Rotating Telescope Assembly (RTA), cyan scanning swath
function createViirsCraft(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'VIIRS_CRAFT';

  // 1. Sleek modern silver/white bus
  const busGeo = new THREE.BoxGeometry(0.042, 0.026, 0.026);
  const busMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.82,
    roughness: 0.22,
  });
  const busMesh = new THREE.Mesh(busGeo, busMat);
  group.add(busMesh);

  // 2. Instrument deck (dark carbon composite) on nadir side
  const deckGeo = new THREE.BoxGeometry(0.044, 0.028, 0.005);
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.5,
    roughness: 0.6,
  });
  const deckMesh = new THREE.Mesh(deckGeo, deckMat);
  deckMesh.position.set(0, 0, 0.014);
  group.add(deckMesh);

  // 3. Symmetrical dual-wing solar arrays (-X and +X)
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    metalness: 0.65,
    roughness: 0.22,
  });

  const leftGeo = new THREE.BoxGeometry(0.05, 0.002, 0.032);
  const leftMesh = new THREE.Mesh(leftGeo, panelMat);
  leftMesh.position.set(-0.052, 0, 0);
  group.add(leftMesh);

  const rightGeo = new THREE.BoxGeometry(0.05, 0.002, 0.032);
  const rightMesh = new THREE.Mesh(rightGeo, panelMat);
  rightMesh.position.set(0.052, 0, 0);
  group.add(rightMesh);

  // 4. VIIRS Rotating Telescope Assembly (RTA hood pointing Nadir in +Z)
  const rtaGeo = new THREE.CylinderGeometry(0.007, 0.009, 0.015, 16);
  const rtaMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    metalness: 0.88,
    roughness: 0.15,
  });
  const rtaMesh = new THREE.Mesh(rtaGeo, rtaMat);
  rtaMesh.rotation.x = Math.PI / 2;
  rtaMesh.position.set(0, 0, 0.022);
  group.add(rtaMesh);

  // 5. Communications Antennas Boom (-Z)
  const boomGeo = new THREE.CylinderGeometry(0.001, 0.001, 0.018, 8);
  const boomMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
  const boomMesh = new THREE.Mesh(boomGeo, boomMat);
  boomMesh.position.set(0.014, 0.018, -0.01);
  group.add(boomMesh);

  // 6. Cyan high-resolution scanning swath cone (along +Z)
  const beamGeo = new THREE.ConeGeometry(0.065, 0.22, 4, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamMesh.position.set(0, 0, 0.11);
  beamMesh.rotation.x = Math.PI / 2;
  group.add(beamMesh);
  group.userData.beamMesh = beamMesh;

  // 7. Beacon Light
  const beacon = new THREE.PointLight(0x06b6d4, 0.9, 0.35);
  beacon.position.set(0, 0, 0.02);
  group.add(beacon);

  return group;
}

export interface CinematicEarthProps {
  className?: string;
}

export function CinematicEarth({ className }: CinematicEarthProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // User interactive state toggles
  const [satelliteMode, setSatelliteMode] = useState<'all' | 'modis' | 'viirs' | 'none'>('all');
  const [selectedSatellite, setSelectedSatellite] = useState<'MODIS' | 'VIIRS' | null>(null);
  const [showHotspots, setShowHotspots] = useState(true);
  const [isRotating, setIsRotating] = useState(true);

  // Internal Three.js handles
  const sceneRef = useRef<THREE.Scene | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const modisGroupRef = useRef<THREE.Group | null>(null);
  const viirsGroupRef = useRef<THREE.Group | null>(null);
  const modisOrbitRef = useRef<THREE.Line | null>(null);
  const viirsOrbitRef = useRef<THREE.Line | null>(null);
  const firePointsRef = useRef<THREE.Group | null>(null);
  const earthShaderMatRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 500;
    const height = containerRef.current.clientHeight || 500;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.8, 3.4);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // 2. Globe Group (Earth + Atmosphere + Satellites)
    const globeGroup = new THREE.Group();
    // Earth real axial tilt: 23.44 degrees
    globeGroup.rotation.z = (23.44 * Math.PI) / 180;
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // 3. Textures
    const textureLoader = new THREE.TextureLoader();
    const dayTexture = textureLoader.load('/textures/earth-blue-marble.jpg');
    const nightTexture = textureLoader.load('/textures/earth-night.jpg');
    const waterTexture = textureLoader.load('/textures/earth-water.png');
    const topologyTexture = textureLoader.load('/textures/earth-topology.png');

    dayTexture.colorSpace = THREE.SRGBColorSpace;
    nightTexture.colorSpace = THREE.SRGBColorSpace;

    // 4. Custom Day/Night & Specular Earth Shader
    const sunDirection = new THREE.Vector3(1.2, 0.3, 0.8).normalize();

    const earthShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uDayTexture: { value: dayTexture },
        uNightTexture: { value: nightTexture },
        uWaterTexture: { value: waterTexture },
        uTopologyTexture: { value: topologyTexture },
        uSunDirection: { value: sunDirection },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uDayTexture;
        uniform sampler2D uNightTexture;
        uniform sampler2D uWaterTexture;
        uniform sampler2D uTopologyTexture;
        uniform vec3 uSunDirection;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 sunDir = normalize(uSunDirection);

          // Sunlight incidence
          float sunDot = dot(normal, sunDir);

          // Smooth twilight terminator transition
          float dayMix = smoothstep(-0.25, 0.25, sunDot);

          vec3 dayColor = texture2D(uDayTexture, vUv).rgb;
          // Amplify city lights for high-tech sci-fi radiance
          vec3 nightColor = texture2D(uNightTexture, vUv).rgb * 2.2;

          // Specular reflection on water for sunny side
          float waterMask = texture2D(uWaterTexture, vUv).r;
          vec3 viewDir = normalize(-vPosition);
          vec3 halfVec = normalize(sunDir + viewDir);
          float specFactor = pow(max(dot(normal, halfVec), 0.0), 24.0) * waterMask * max(0.0, sunDot);
          vec3 specular = vec3(0.6, 0.85, 1.0) * specFactor * 0.9;

          // Final composite
          vec3 color = mix(nightColor, dayColor, dayMix) + specular;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    earthShaderMatRef.current = earthShaderMat;

    const earthGeo = new THREE.SphereGeometry(1.0, 64, 64);
    const earthMesh = new THREE.Mesh(earthGeo, earthShaderMat);
    globeGroup.add(earthMesh);

    // 5. Atmospheric Rayleigh Scattering / Fresnel Halo Shell
    const atmosphereMat = new THREE.ShaderMaterial({
      uniforms: {
        uGlowColor: { value: new THREE.Color('#38bdf8') }, // Electric cyan-blue
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 uGlowColor;

        void main() {
          // Fresnel rim lighting
          float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.8);
          gl_FragColor = vec4(uGlowColor, intensity * 0.85);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });

    const atmosphereGeo = new THREE.SphereGeometry(1.035, 64, 64);
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    globeGroup.add(atmosphereMesh);

    // 6. Active Fire Hotspot Thermal Beacons
    const fireGroup = new THREE.Group();
    firePointsRef.current = fireGroup;
    globeGroup.add(fireGroup);

    const fireBeaconGeo = new THREE.SphereGeometry(0.015, 16, 16);
    const fireBeaconMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#f97316'), // Bright fire orange
    });

    // Outer pulsating halo for fires
    const fireHaloGeo = new THREE.RingGeometry(0.012, 0.035, 24);

    GLOBAL_HOTSPOTS.forEach(([lat, lon]) => {
      const pos = latLonToVector3(lat, lon, 1.004);
      const beacon = new THREE.Mesh(fireBeaconGeo, fireBeaconMat);
      beacon.position.copy(pos);
      fireGroup.add(beacon);

      // Ring aligned tangentially to surface
      const haloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ef4444'),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      });
      const halo = new THREE.Mesh(fireHaloGeo, haloMat);
      halo.position.copy(pos.clone().multiplyScalar(1.001));
      halo.lookAt(pos.clone().multiplyScalar(2));
      halo.userData = { isPulse: true, seed: Math.random() * Math.PI };
      fireGroup.add(halo);
    });

    // 7. Dual LEO Satellite Constellation: MODIS & VIIRS
    // 7.1 MODIS Orbit Track (Terra/Aqua Sun-Synchronous, 705 km, 98.2 deg)
    const modisCurve = new THREE.EllipseCurve(0, 0, 1.18, 1.18, 0, 2 * Math.PI, false, 0);
    const modisPoints = modisCurve.getPoints(120);
    const modisOrbitGeo = new THREE.BufferGeometry().setFromPoints(
      modisPoints.map((p) => new THREE.Vector3(p.x, 0, p.y))
    );
    const modisOrbitMat = new THREE.LineDashedMaterial({
      color: 0xf43f5e, // Rose / Amber
      dashSize: 0.04,
      gapSize: 0.02,
      transparent: true,
      opacity: 0.5,
    });
    const modisOrbitLine = new THREE.Line(modisOrbitGeo, modisOrbitMat);
    modisOrbitLine.computeLineDistances();
    modisOrbitLine.rotation.x = (98.2 * Math.PI) / 180;
    modisOrbitLine.rotation.y = (32 * Math.PI) / 180;
    globeGroup.add(modisOrbitLine);
    modisOrbitRef.current = modisOrbitLine;

    // 7.2 VIIRS Orbit Track (Suomi-NPP / NOAA-20 Sun-Synchronous, 834 km, 98.7 deg, Staggered RAAN)
    const viirsCurve = new THREE.EllipseCurve(0, 0, 1.25, 1.25, 0, 2 * Math.PI, false, 0);
    const viirsPoints = viirsCurve.getPoints(120);
    const viirsOrbitGeo = new THREE.BufferGeometry().setFromPoints(
      viirsPoints.map((p) => new THREE.Vector3(p.x, 0, p.y))
    );
    const viirsOrbitMat = new THREE.LineDashedMaterial({
      color: 0x06b6d4, // Cyan / Emerald
      dashSize: 0.05,
      gapSize: 0.025,
      transparent: true,
      opacity: 0.55,
    });
    const viirsOrbitLine = new THREE.Line(viirsOrbitGeo, viirsOrbitMat);
    viirsOrbitLine.computeLineDistances();
    viirsOrbitLine.rotation.x = (98.7 * Math.PI) / 180;
    viirsOrbitLine.rotation.y = (128 * Math.PI) / 180;
    globeGroup.add(viirsOrbitLine);
    viirsOrbitRef.current = viirsOrbitLine;

    // 7.3 MODIS Craft Instance
    const modisCraft = createModisCraft();
    globeGroup.add(modisCraft);
    modisGroupRef.current = modisCraft;

    // 7.4 VIIRS Craft Instance
    const viirsCraft = createViirsCraft();
    globeGroup.add(viirsCraft);
    viirsGroupRef.current = viirsCraft;

    // 8. Distant Starfield Particles
    const starCount = 650;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 20;
      starPositions[i + 1] = (Math.random() - 0.5) * 20;
      starPositions[i + 2] = -4 - Math.random() * 10;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.04,
      transparent: true,
      opacity: 0.7,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 8.5 3D Meteorite & Fracture Explosion System
    interface ActiveMeteorite {
      group: THREE.Group;
      rockMesh: THREE.Mesh;
      velocity: THREE.Vector3;
      rotVelocity: THREE.Vector3;
      trailPoints: THREE.Points;
      history: THREE.Vector3[];
    }

    interface ExplosionShard {
      mesh: THREE.Mesh;
      velocity: THREE.Vector3;
      rotVelocity: THREE.Vector3;
      lifetime: number;
      maxLifetime: number;
    }

    interface ShockwaveRing {
      mesh: THREE.Mesh;
      currentRadius: number;
      expandSpeed: number;
      maxRadius: number;
      opacity: number;
    }

    interface SparkBurst {
      points: THREE.Points;
      velocities: Float32Array;
      positions: Float32Array;
      lifetime: number;
      maxLifetime: number;
    }

    interface FlashLight {
      light: THREE.PointLight;
      lifetime: number;
      maxLifetime: number;
    }

    const activeMeteors: ActiveMeteorite[] = [];
    const shards: ExplosionShard[] = [];
    const shockwaves: ShockwaveRing[] = [];
    const bursts: SparkBurst[] = [];
    const flashLights: FlashLight[] = [];

    // Load authentic NASA 3D Asteroid Bennu model (1999-rq36-asteroid)
    const gltfLoader = new GLTFLoader();
    let bennuGeometry: THREE.BufferGeometry | null = null;
    let bennuMaterial: THREE.Material | null = null;

    gltfLoader.load(
      '/models/asteroid-bennu.glb',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && !bennuGeometry) {
            const mesh = child as THREE.Mesh;
            bennuGeometry = mesh.geometry.clone();
            bennuGeometry.center();
            bennuGeometry.computeVertexNormals();

            bennuMaterial = new THREE.MeshStandardMaterial({
              color: 0x544c45,
              roughness: 0.92,
              metalness: 0.1,
              flatShading: false,
              emissive: new THREE.Color(0xff4500),
              emissiveIntensity: 0.25,
            });
          }
        });
      },
      undefined,
      (err) => {
        console.warn('Could not load Bennu GLB model, falling back to procedural mesh:', err);
      }
    );

    // Helper: Spawn authentic 3D meteorite (reduced size, reduced speed, non-colliding orbit)
    const spawnMeteorite = () => {
      if (activeMeteors.length >= 2) return;

      const meteorGroup = new THREE.Group();

      let rockMesh: THREE.Mesh;
      if (bennuGeometry) {
        // Authentic NASA Bennu Asteroid with reduced size (0.075 - 0.10 units)
        const scale = 0.075 + Math.random() * 0.025;
        rockMesh = new THREE.Mesh(bennuGeometry, bennuMaterial || new THREE.MeshStandardMaterial());
        rockMesh.scale.setScalar(scale);
      } else {
        // Fallback procedural jagged rock with reduced size (radius 0.08 - 0.10 units)
        const radius = 0.08 + Math.random() * 0.025;
        const rockGeo = new THREE.DodecahedronGeometry(radius, 1);
        const posAttr = rockGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
          const vx = posAttr.getX(i);
          const vy = posAttr.getY(i);
          const vz = posAttr.getZ(i);
          const noise = 1.0 + (Math.sin(vx * 18.0) + Math.cos(vy * 18.0) + Math.sin(vz * 18.0)) * 0.08;
          posAttr.setXYZ(i, vx * noise, vy * noise, vz * noise);
        }
        rockGeo.computeVertexNormals();

        const rockMat = new THREE.MeshStandardMaterial({
          color: 0x483e38,
          roughness: 0.9,
          metalness: 0.15,
          flatShading: true,
          emissive: new THREE.Color(0xff4500),
          emissiveIntensity: 0.35,
        });

        rockMesh = new THREE.Mesh(rockGeo, rockMat);
      }

      meteorGroup.add(rockMesh);

      // Thermal glow point light illuminating near space
      const meteorLight = new THREE.PointLight(0xff6600, 0.9, 1.4);
      meteorGroup.add(meteorLight);

      // 4 Orbital flyby paths safely passing OUTSIDE Earth's radius (R = 1.0, LEO = 1.22, min dist > 1.8)
      const paths = [
        // 1. High Foreground Flyby: Passes above Earth at Y ~ 2.2, Z ~ 1.3
        {
          start: new THREE.Vector3(-4.8, 2.3 + Math.random() * 0.3, 1.3),
          dest: new THREE.Vector3(4.8, 2.0 + Math.random() * 0.3, 1.1),
        },
        // 2. Low Foreground Flyby: Passes below Earth at Y ~ -2.2, Z ~ 1.3
        {
          start: new THREE.Vector3(4.8, -2.2 - Math.random() * 0.3, 1.2),
          dest: new THREE.Vector3(-4.8, -1.9 - Math.random() * 0.3, 1.4),
        },
        // 3. Right Flank Orbital Pass: Glides along right perimeter at X ~ 2.4, Z ~ 0.8
        {
          start: new THREE.Vector3(2.4 + Math.random() * 0.3, 3.4, 0.8),
          dest: new THREE.Vector3(2.2 + Math.random() * 0.3, -3.4, 0.7),
        },
        // 4. Deep Space Background Drift: Glides far behind Earth at Z ~ -1.9
        {
          start: new THREE.Vector3(-4.6, 1.5, -1.9),
          dest: new THREE.Vector3(4.6, -1.3, -1.9),
        },
      ];
      const selectedPath = paths[Math.floor(Math.random() * paths.length)];
      meteorGroup.position.copy(selectedPath.start);

      // Reduced velocity: 0.0055 - 0.0078 (3x slower, gentle cinematic glide)
      const speed = 0.0055 + Math.random() * 0.0023;
      const velocity = selectedPath.dest.clone().sub(selectedPath.start).normalize().multiplyScalar(speed);
      const rotVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.014,
        (Math.random() - 0.5) * 0.014,
        (Math.random() - 0.5) * 0.014
      );

      // Trailing fiery embers (subtle small embers)
      const trailCount = 14;
      const trailGeo = new THREE.BufferGeometry();
      const trailPos = new Float32Array(trailCount * 3);
      for (let i = 0; i < trailCount * 3; i += 3) {
        trailPos[i] = selectedPath.start.x;
        trailPos[i + 1] = selectedPath.start.y;
        trailPos[i + 2] = selectedPath.start.z;
      }
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
      const trailMat = new THREE.PointsMaterial({
        color: 0xff6622,
        size: 0.026,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      });
      const trailPoints = new THREE.Points(trailGeo, trailMat);
      scene.add(trailPoints);

      scene.add(meteorGroup);

      activeMeteors.push({
        group: meteorGroup,
        rockMesh,
        velocity,
        rotVelocity,
        trailPoints,
        history: [],
      });
    };

    // Helper: Trigger fracture explosion on click
    const explodeMeteorite = (meteor: ActiveMeteorite, hitPoint: THREE.Vector3) => {
      const idx = activeMeteors.indexOf(meteor);
      if (idx !== -1) {
        activeMeteors.splice(idx, 1);
      }
      scene.remove(meteor.group);
      scene.remove(meteor.trailPoints);
      meteor.rockMesh.geometry.dispose();
      (meteor.rockMesh.material as THREE.Material).dispose();
      meteor.trailPoints.geometry.dispose();
      (meteor.trailPoints.material as THREE.Material).dispose();

      // 1. Flash Light at core
      const flashLight = new THREE.PointLight(0xffaa44, 3.5, 2.5);
      flashLight.position.copy(hitPoint);
      scene.add(flashLight);
      flashLights.push({ light: flashLight, lifetime: 0, maxLifetime: 8 });

      // 2. Expanding Shockwave Ring
      const ringGeo = new THREE.RingGeometry(0.03, 0.06, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff7722,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(hitPoint);
      ringMesh.lookAt(camera.position);
      scene.add(ringMesh);
      shockwaves.push({
        mesh: ringMesh,
        currentRadius: 0.04,
        expandSpeed: 0.03,
        maxRadius: 0.65,
        opacity: 0.85,
      });

      // 3. 18 Tumbling Fiery 3D Shards (reduced scale 0.03)
      const shardGeo = new THREE.TetrahedronGeometry(0.028, 0);
      const shardMat = new THREE.MeshStandardMaterial({
        color: 0xff4500,
        emissive: 0xcc2200,
        roughness: 0.6,
        metalness: 0.3,
        flatShading: true,
      });

      const shardCount = 18;
      for (let i = 0; i < shardCount; i++) {
        const shard = new THREE.Mesh(shardGeo, shardMat.clone());
        shard.position.copy(hitPoint);

        const randomDir = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize();

        const speed = 0.03 + Math.random() * 0.05;
        const velocity = randomDir.multiplyScalar(speed).add(meteor.velocity.clone().multiplyScalar(0.2));
        const rotVelocity = new THREE.Vector3(
          (Math.random() - 0.5) * 0.22,
          (Math.random() - 0.5) * 0.22,
          (Math.random() - 0.5) * 0.22
        );

        scene.add(shard);
        shards.push({
          mesh: shard,
          velocity,
          rotVelocity,
          lifetime: 0,
          maxLifetime: 45 + Math.floor(Math.random() * 20),
        });
      }

      // 4. Fiery Sparks Spherical Burst (Additive Blending)
      const sparkCount = 50;
      const sparkGeo = new THREE.BufferGeometry();
      const sparkPositions = new Float32Array(sparkCount * 3);
      const sparkVelocities = new Float32Array(sparkCount * 3);
      const sparkColors = new Float32Array(sparkCount * 3);

      for (let i = 0; i < sparkCount; i++) {
        sparkPositions[i * 3] = hitPoint.x;
        sparkPositions[i * 3 + 1] = hitPoint.y;
        sparkPositions[i * 3 + 2] = hitPoint.z;

        const sDir = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize().multiplyScalar(0.035 + Math.random() * 0.06);

        sparkVelocities[i * 3] = sDir.x;
        sparkVelocities[i * 3 + 1] = sDir.y;
        sparkVelocities[i * 3 + 2] = sDir.z;

        sparkColors[i * 3] = 1.0;
        sparkColors[i * 3 + 1] = 0.45 + Math.random() * 0.45;
        sparkColors[i * 3 + 2] = 0.1;
      }

      sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
      sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));

      const sparkMat = new THREE.PointsMaterial({
        size: 0.035,
        vertexColors: true,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
      });

      const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
      scene.add(sparkPoints);
      bursts.push({
        points: sparkPoints,
        velocities: sparkVelocities,
        positions: sparkPositions,
        lifetime: 0,
        maxLifetime: 42,
      });
    };

    // Periodic Spawning: Initial spawn at 2.5s, then every 9.5s
    const firstSpawnTimeout = setTimeout(() => {
      spawnMeteorite();
    }, 2500);

    const spawnInterval = setInterval(() => {
      spawnMeteorite();
    }, 9500);

    // 9. Interactive Drag & Click-to-Explode Raycasting Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let downX = 0;
    let downY = 0;
    let downTime = 0;
    let velX = 0;
    let velY = 0;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      downX = e.clientX;
      downY = e.clientY;
      downTime = performance.now();
      velX = 0;
      velY = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDragging && globeGroupRef.current) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        velX = deltaX * 0.005;
        velY = deltaY * 0.005;

        globeGroupRef.current.rotation.y += velX;
        globeGroupRef.current.rotation.x += velY;
      } else if (canvasRef.current) {
        // Sci-Fi Reticle Cursor on Hover over Meteorite, Pointer on Satellite
        const rect = canvasRef.current.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        let isOverMeteor = false;
        for (let i = 0; i < activeMeteors.length; i++) {
          const hits = raycaster.intersectObject(activeMeteors[i].rockMesh, true);
          if (hits.length > 0) {
            isOverMeteor = true;
            break;
          }
        }

        let isOverSat = false;
        if (!isOverMeteor) {
          if (modisGroupRef.current && modisGroupRef.current.visible) {
            const hits = raycaster.intersectObjects(modisGroupRef.current.children, true);
            if (hits.length > 0) isOverSat = true;
          }
          if (!isOverSat && viirsGroupRef.current && viirsGroupRef.current.visible) {
            const hits = raycaster.intersectObjects(viirsGroupRef.current.children, true);
            if (hits.length > 0) isOverSat = true;
          }
        }

        canvasRef.current.style.cursor = isOverMeteor
          ? 'crosshair'
          : (isOverSat ? 'pointer' : (isDragging ? 'grabbing' : 'grab'));
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      const duration = performance.now() - downTime;

      // Click event detected: Check if clicked directly on an active meteorite or satellite
      if (dist < 8 && duration < 380 && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        let hitAction = false;
        for (let i = 0; i < activeMeteors.length; i++) {
          const meteor = activeMeteors[i];
          const hits = raycaster.intersectObject(meteor.rockMesh, true);
          if (hits.length > 0) {
            explodeMeteorite(meteor, hits[0].point);
            velX = 0;
            velY = 0;
            hitAction = true;
            break;
          }
        }

        // Check if clicked directly on MODIS or VIIRS craft
        if (!hitAction && modisGroupRef.current && modisGroupRef.current.visible) {
          const hits = raycaster.intersectObjects(modisGroupRef.current.children, true);
          if (hits.length > 0) {
            setSelectedSatellite((prev) => (prev === 'MODIS' ? null : 'MODIS'));
            hitAction = true;
          }
        }

        if (!hitAction && viirsGroupRef.current && viirsGroupRef.current.visible) {
          const hits = raycaster.intersectObjects(viirsGroupRef.current.children, true);
          if (hits.length > 0) {
            setSelectedSatellite((prev) => (prev === 'VIIRS' ? null : 'VIIRS'));
            hitAction = true;
          }
        }
      }
    };

    const canvas = canvasRef.current;
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 10. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Inertia & Auto-Rotation
      if (globeGroupRef.current) {
        if (!isDragging) {
          velX *= 0.95;
          velY *= 0.95;
          globeGroupRef.current.rotation.y += velX;
          globeGroupRef.current.rotation.x += velY;

          // Constant Earth rotation
          if (isRotating) {
            globeGroupRef.current.rotation.y += 0.0018;
          }
        }
      }

      // Dual Satellite Orbital Motions & Nadir Targeting
      // 1. MODIS (EOS Terra / Aqua, 705 km, 98.2 deg inclination)
      if (modisGroupRef.current) {
        const modisAngle = elapsed * 0.44;
        const radius = 1.18;
        const localX = radius * Math.cos(modisAngle);
        const localZ = radius * Math.sin(modisAngle);
        const satVec = new THREE.Vector3(localX, 0, localZ);
        satVec.applyEuler(new THREE.Euler((98.2 * Math.PI) / 180, (32 * Math.PI) / 180, 0));
        modisGroupRef.current.position.copy(satVec);
        modisGroupRef.current.lookAt(0, 0, 0);

        // Subtle pulsation of optical swath cone
        const beam = modisGroupRef.current.userData.beamMesh as THREE.Mesh;
        if (beam && beam.material) {
          (beam.material as THREE.MeshBasicMaterial).opacity = 0.18 + Math.sin(elapsed * 2.5) * 0.05;
        }
      }

      // 2. VIIRS (Suomi-NPP / NOAA-20/21, 834 km, 98.7 deg inclination, staggered RAAN)
      if (viirsGroupRef.current) {
        const viirsAngle = elapsed * 0.36 + 2.2;
        const radius = 1.25;
        const localX = radius * Math.cos(viirsAngle);
        const localZ = radius * Math.sin(viirsAngle);
        const satVec = new THREE.Vector3(localX, 0, localZ);
        satVec.applyEuler(new THREE.Euler((98.7 * Math.PI) / 180, (128 * Math.PI) / 180, 0));
        viirsGroupRef.current.position.copy(satVec);
        viirsGroupRef.current.lookAt(0, 0, 0);

        // Subtle pulsation of optical swath cone
        const beam = viirsGroupRef.current.userData.beamMesh as THREE.Mesh;
        if (beam && beam.material) {
          (beam.material as THREE.MeshBasicMaterial).opacity = 0.20 + Math.sin(elapsed * 3.0 + 1.0) * 0.06;
        }
      }

      // Pulsate Fire Hotspots
      if (fireGroup) {
        fireGroup.children.forEach((child) => {
          if (child.userData?.isPulse) {
            const scale = 1.0 + Math.sin(elapsed * 4.0 + child.userData.seed) * 0.35;
            child.scale.set(scale, scale, 1);
          }
        });
      }

      // Update 3D Active Meteorites
      for (let i = activeMeteors.length - 1; i >= 0; i--) {
        const m = activeMeteors[i];
        m.group.position.add(m.velocity);
        m.rockMesh.rotation.x += m.rotVelocity.x;
        m.rockMesh.rotation.y += m.rotVelocity.y;
        m.rockMesh.rotation.z += m.rotVelocity.z;

        // Update trail position history
        m.history.unshift(m.group.position.clone());
        if (m.history.length > 16) m.history.pop();

        const pAttr = m.trailPoints.geometry.attributes.position as THREE.BufferAttribute;
        for (let j = 0; j < m.history.length; j++) {
          pAttr.setXYZ(j, m.history[j].x, m.history[j].y, m.history[j].z);
        }
        pAttr.needsUpdate = true;

        // Out of viewport boundary check
        if (
          Math.abs(m.group.position.x) > 5.2 ||
          Math.abs(m.group.position.y) > 4.2 ||
          Math.abs(m.group.position.z) > 4.2
        ) {
          scene.remove(m.group);
          scene.remove(m.trailPoints);
          m.rockMesh.geometry.dispose();
          (m.rockMesh.material as THREE.Material).dispose();
          m.trailPoints.geometry.dispose();
          (m.trailPoints.material as THREE.Material).dispose();
          activeMeteors.splice(i, 1);
        }
      }

      // Update Tumbling Shards
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        s.mesh.position.add(s.velocity);
        s.mesh.rotation.x += s.rotVelocity.x;
        s.mesh.rotation.y += s.rotVelocity.y;
        s.lifetime++;

        const progress = s.lifetime / s.maxLifetime;
        const scale = Math.max(0.001, 1 - progress);
        s.mesh.scale.setScalar(scale);

        if (s.lifetime >= s.maxLifetime) {
          scene.remove(s.mesh);
          s.mesh.geometry.dispose();
          (s.mesh.material as THREE.Material).dispose();
          shards.splice(i, 1);
        }
      }

      // Update Shockwaves
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.currentRadius += sw.expandSpeed;
        const progress = sw.currentRadius / sw.maxRadius;
        const scale = 1 + sw.currentRadius * 6.5;
        sw.mesh.scale.set(scale, scale, 1);
        (sw.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, sw.opacity * (1 - progress));

        if (progress >= 1.0) {
          scene.remove(sw.mesh);
          sw.mesh.geometry.dispose();
          (sw.mesh.material as THREE.Material).dispose();
          shockwaves.splice(i, 1);
        }
      }

      // Update Spark Bursts
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.lifetime++;
        const pAttr = b.points.geometry.attributes.position as THREE.BufferAttribute;
        for (let j = 0; j < b.positions.length / 3; j++) {
          b.positions[j * 3] += b.velocities[j * 3];
          b.positions[j * 3 + 1] += b.velocities[j * 3 + 1];
          b.positions[j * 3 + 2] += b.velocities[j * 3 + 2];
          b.velocities[j * 3] *= 0.95;
          b.velocities[j * 3 + 1] *= 0.95;
          b.velocities[j * 3 + 2] *= 0.95;
        }
        pAttr.needsUpdate = true;
        (b.points.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - b.lifetime / b.maxLifetime);

        if (b.lifetime >= b.maxLifetime) {
          scene.remove(b.points);
          b.points.geometry.dispose();
          (b.points.material as THREE.Material).dispose();
          bursts.splice(i, 1);
        }
      }

      // Update Flash Lights
      for (let i = flashLights.length - 1; i >= 0; i--) {
        const fl = flashLights[i];
        fl.lifetime++;
        fl.light.intensity = Math.max(0, 4.5 * (1 - fl.lifetime / fl.maxLifetime));
        if (fl.lifetime >= fl.maxLifetime) {
          scene.remove(fl.light);
          flashLights.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 11. Responsive Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    // Cleanup on unmount
    return () => {
      clearTimeout(firstSpawnTimeout);
      clearInterval(spawnInterval);
      cancelAnimationFrame(animId);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      resizeObserver.disconnect();

      // Dispose active meteorites
      activeMeteors.forEach((m) => {
        scene.remove(m.group);
        scene.remove(m.trailPoints);
        m.rockMesh.geometry.dispose();
        (m.rockMesh.material as THREE.Material).dispose();
        m.trailPoints.geometry.dispose();
        (m.trailPoints.material as THREE.Material).dispose();
      });

      // Dispose active shards
      shards.forEach((s) => {
        scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
      });

      // Dispose shockwaves
      shockwaves.forEach((sw) => {
        scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        (sw.mesh.material as THREE.Material).dispose();
      });

      // Dispose bursts
      bursts.forEach((b) => {
        scene.remove(b.points);
        b.points.geometry.dispose();
        (b.points.material as THREE.Material).dispose();
      });

      flashLights.forEach((fl) => {
        scene.remove(fl.light);
      });

      renderer.dispose();
      earthGeo.dispose();
      atmosphereGeo.dispose();
      fireBeaconGeo.dispose();
      fireHaloGeo.dispose();
      modisOrbitGeo.dispose();
      modisOrbitMat.dispose();
      viirsOrbitGeo.dispose();
      viirsOrbitMat.dispose();
      if (modisGroupRef.current) disposeThreeGroup(modisGroupRef.current);
      if (viirsGroupRef.current) disposeThreeGroup(viirsGroupRef.current);
      starGeo.dispose();
      dayTexture.dispose();
      nightTexture.dispose();
      waterTexture.dispose();
      topologyTexture.dispose();
    };
  }, [isRotating]);

  // Synchronize dynamic visibility states
  useEffect(() => {
    const showModis = satelliteMode === 'all' || satelliteMode === 'modis';
    const showViirs = satelliteMode === 'all' || satelliteMode === 'viirs';

    if (modisOrbitRef.current) modisOrbitRef.current.visible = showModis;
    if (modisGroupRef.current) modisGroupRef.current.visible = showModis;

    if (viirsOrbitRef.current) viirsOrbitRef.current.visible = showViirs;
    if (viirsGroupRef.current) viirsGroupRef.current.visible = showViirs;
  }, [satelliteMode]);

  useEffect(() => {
    if (firePointsRef.current) firePointsRef.current.visible = showHotspots;
  }, [showHotspots]);

  // Reset rotation alignment
  const handleResetOrientation = () => {
    if (globeGroupRef.current) {
      globeGroupRef.current.rotation.set((23.44 * Math.PI) / 180, 0, 0);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cx(
        'relative w-full h-full min-h-[380px] rounded-2xl overflow-hidden border border-cyan-400/25 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950 shadow-2xl backdrop-blur-md group select-none',
        className,
      )}
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full contain-layout cursor-grab active:cursor-grabbing block"
      />

      {/* Top Telemetry HUD Overlay: Dual MODIS & VIIRS Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5">
        {/* MODIS Chip */}
        <button
          type="button"
          onClick={() => setSelectedSatellite((prev) => (prev === 'MODIS' ? null : 'MODIS'))}
          className={cx(
            'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono font-semibold transition-all backdrop-blur-md shadow-sm',
            selectedSatellite === 'MODIS'
              ? 'border-rose-400 bg-rose-950/90 text-rose-200 ring-1 ring-rose-400/50'
              : 'border-rose-500/30 bg-ink-950/80 text-rose-300 hover:border-rose-400/60 hover:bg-rose-950/40'
          )}
          title="View MODIS (Terra/Aqua) specs"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
          <span>MODIS · 705 KM</span>
        </button>

        {/* VIIRS Chip */}
        <button
          type="button"
          onClick={() => setSelectedSatellite((prev) => (prev === 'VIIRS' ? null : 'VIIRS'))}
          className={cx(
            'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono font-semibold transition-all backdrop-blur-md shadow-sm',
            selectedSatellite === 'VIIRS'
              ? 'border-cyan-400 bg-cyan-950/90 text-cyan-200 ring-1 ring-cyan-400/50'
              : 'border-cyan-500/30 bg-ink-950/80 text-cyan-300 hover:border-cyan-400/60 hover:bg-cyan-950/40'
          )}
          title="View VIIRS (SNPP/NOAA) specs"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>VIIRS · 834 KM</span>
        </button>
      </div>

      {/* Top Right Live Sun / Terminator Indicator */}
      <div className="absolute top-3 right-3 z-10 hidden sm:flex items-center gap-2 pointer-events-none">
        <div className="rounded-lg border border-line bg-ink-950/80 px-2.5 py-1 text-[10px] font-mono text-slate-300 backdrop-blur-md">
          <span>Solar Terminator: Active</span>
        </div>
      </div>

      {/* Active Satellite Telemetry Drawer / Card */}
      {selectedSatellite && (
        <div className="absolute top-12 left-3 right-3 sm:right-auto sm:w-84 z-20 rounded-xl border border-line/80 bg-ink-950/95 p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-2 border-b border-line/60 pb-2">
            <div className="flex items-center gap-2">
              <span
                className={cx(
                  'h-2 w-2 rounded-full',
                  selectedSatellite === 'MODIS' ? 'bg-rose-400 shadow-sm shadow-rose-500/50' : 'bg-cyan-400 shadow-sm shadow-cyan-500/50'
                )}
              />
              <span className="text-xs font-mono font-bold tracking-tight text-white">
                {selectedSatellite === 'MODIS'
                  ? 'MODIS SATELLITE (TERRA / AQUA)'
                  : 'VIIRS SATELLITE (SNPP / NOAA-20/21)'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSatellite(null)}
              className="rounded p-0.5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-2.5 space-y-2 text-[11px] font-mono leading-relaxed">
            <div className="flex justify-between border-b border-line/40 pb-1">
              <span className="text-slate-400">Orbit</span>
              <span className="text-slate-200 font-semibold">
                {selectedSatellite === 'MODIS' ? 'Sun-Synch LEO (705 km, 98.2°)' : 'Sun-Synch LEO (834 km, 98.7°)'}
              </span>
            </div>
            <div className="flex justify-between border-b border-line/40 pb-1">
              <span className="text-slate-400">Nadir Resolution</span>
              <span className={selectedSatellite === 'MODIS' ? 'text-rose-300 font-bold' : 'text-cyan-300 font-bold'}>
                {selectedSatellite === 'MODIS' ? '1,000 m (Thermal Ch21/31)' : '375 m (I-Band I4/I5)'}
              </span>
            </div>
            <div className="flex justify-between border-b border-line/40 pb-1">
              <span className="text-slate-400">Swath Width</span>
              <span className="text-slate-200">
                {selectedSatellite === 'MODIS' ? '2,330 km (±55° scan mirror)' : '3,040 km (Zero nadir gap)'}
              </span>
            </div>
            <div className="flex justify-between border-b border-line/40 pb-1">
              <span className="text-slate-400">Bowtie Effect</span>
              <span className="text-slate-300">
                {selectedSatellite === 'MODIS'
                  ? '10x pixel smear at 55° edge'
                  : '3:1 aggregation, capped at 2.1x'}
              </span>
            </div>
            <div className="pt-1 text-[10px] text-slate-400 italic">
              {selectedSatellite === 'MODIS'
                ? '✦ FIRMS Data: MWIR 3.96µm Ch21 (500K cap) captures megafires.'
                : '✦ FIRMS Data: I-band 3.74µm high sensitivity detects sub-pixel small fires.'}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Interactive Control HUD */}
      <div className="absolute bottom-3 inset-x-3 z-10 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 bg-ink-950/85 px-3 py-2 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          {/* Toggle Satellite Orbit Modes */}
          <button
            type="button"
            onClick={() => {
              setSatelliteMode((prev) => {
                if (prev === 'all') return 'modis';
                if (prev === 'modis') return 'viirs';
                if (prev === 'viirs') return 'none';
                return 'all';
              });
            }}
            className={cx(
              'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-all',
              satelliteMode !== 'none'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                : 'bg-ink-900 text-slate-400 border border-line hover:text-white',
            )}
            title="Cycle Satellite Mode (All / MODIS / VIIRS / Off)"
          >
            <Satellite className="h-3 w-3" />
            <span>
              {satelliteMode === 'all'
                ? 'Sats: Both'
                : satelliteMode === 'modis'
                ? 'MODIS (1)'
                : satelliteMode === 'viirs'
                ? 'VIIRS (1)'
                : 'Sats: Off'}
            </span>
          </button>

          {/* Toggle Active Fires */}
          <button
            type="button"
            onClick={() => setShowHotspots((v) => !v)}
            className={cx(
              'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-all',
              showHotspots
                ? 'bg-orange-500/20 text-orange-300 border border-orange-400/40'
                : 'bg-ink-900 text-slate-400 border border-line hover:text-white',
            )}
            title="Toggle Active Fire Embers"
          >
            <Flame className="h-3 w-3" />
            <span>Hotspots</span>
          </button>

          {/* Toggle Rotation */}
          <button
            type="button"
            onClick={() => setIsRotating((v) => !v)}
            className={cx(
              'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-all',
              isRotating
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                : 'bg-ink-900 text-slate-400 border border-line hover:text-white',
            )}
            title="Toggle Auto-Rotation"
          >
            <Eye className="h-3 w-3" />
            <span>{isRotating ? 'Spinning' : 'Paused'}</span>
          </button>
        </div>

        {/* Reset View Button */}
        <button
          type="button"
          onClick={handleResetOrientation}
          className="inline-flex items-center gap-1 rounded-md border border-line bg-ink-900 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          title="Reset Earth Orientation"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}
