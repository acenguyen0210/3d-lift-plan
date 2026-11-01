import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { CraneSceneBuilder } from '../utils/threeCraneBuilder';
import { Obstacle3DBuilder } from '../utils/obstacle3DBuilder';
import {
  Camera,
  Maximize2,
  Compass,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Layers,
  Box,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Move3d,
  MousePointerClick,
  MapPin,
  RotateCw,
  Video,
  ChevronDown
} from 'lucide-react';
import WheelNumberInput from './WheelNumberInput';

export default function ThreeViewport({
  crane,
  boomLength,
  setBoomLength,
  workingRadius,
  setWorkingRadius,
  slewAngle,
  setSlewAngle,
  craneHeading = 0,
  setCraneHeading,
  boomAngle,
  hookElevation,
  loadElevation,
  setLoadElevation,
  loadRotation = 0,
  setLoadRotation,
  liftPercentage,
  liftCategory,
  ratedCapacity,
  grossLoad,
  outriggerReactions,
  soilCapacityTonsPerM2,
  matLength,
  matWidth,
  loadConfig,
  riggingConfig,
  obstacles = [],
  setObstacles,
  pickingFencePoint,
  setPickingFencePoint,
  liftPoints = [],
  pickPoint,
  setPoint,
  isSimulating,
  setIsSimulating,
  captureRef,
  onOpenVideoModal
}) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const craneBuilderRef = useRef(null);
  const obstacleBuilderRef = useRef(null);
  const trajectoryGroupRef = useRef(null);
  const transformControlsRef = useRef(null);
  const dummyTargetRef = useRef(null);
  const pickPreviewRef = useRef(null);
  const groundMeshRef = useRef(null);
  const gridHelperRef = useRef(null);
  const currentGridSizeRef = useRef(120);
  const downCoordRef = useRef({ x: 0, y: 0 });
  const hoverCoordRef = useRef(null);
  const [pickCoordText, setPickCoordText] = useState(null);
  const animFrameRef = useRef(null);

  const craneRef = useRef(crane);
  const boomLengthRef = useRef(boomLength);
  const setBoomLengthRef = useRef(setBoomLength);
  const setWorkingRadiusRef = useRef(setWorkingRadius);
  const setSlewAngleRef = useRef(setSlewAngle);
  const craneHeadingRef = useRef(craneHeading);
  const setLoadElevationRef = useRef(setLoadElevation);
  const loadRotationRef = useRef(loadRotation);
  const loadConfigRef = useRef(loadConfig);
  const riggingConfigRef = useRef(riggingConfig);

  useEffect(() => {
    craneRef.current = crane;
    boomLengthRef.current = boomLength;
    setBoomLengthRef.current = setBoomLength;
    setWorkingRadiusRef.current = setWorkingRadius;
    setSlewAngleRef.current = setSlewAngle;
    craneHeadingRef.current = craneHeading;
    setLoadElevationRef.current = setLoadElevation;
    loadRotationRef.current = loadRotation;
    loadConfigRef.current = loadConfig;
    riggingConfigRef.current = riggingConfig;
  }, [crane, boomLength, setBoomLength, setWorkingRadius, setSlewAngle, craneHeading, setLoadElevation, loadRotation, loadConfig, riggingConfig]);

  const [activeCameraView, setActiveCameraView] = useState('3d'); // '3d', 'top', 'side', 'cab', 'load'
  const [isCameraMenuOpen, setIsCameraMenuOpen] = useState(false);
  const [isGizmoActive, setIsGizmoActive] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showClearance, setShowClearance] = useState(true);
  const [simulationProgress, setSimulationProgress] = useState(0);

  // Setup Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1120'); // Dark slate high-tech engineering background
    scene.fog = new THREE.FogExp2('#0b1120', 0.008);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500);
    camera.position.set(24, 18, 28);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minPolarAngle = 0.02; // Critical: prevents lock at phi=0 in Top view
    controls.maxPolarAngle = Math.PI / 2 + 0.02; // Don't go below ground
    controls.minDistance = 5;
    controls.maxDistance = 180;
    controls.target.set(0, 5, 0);
    controlsRef.current = controls;

    // 5. Lighting
    const hemiLight = new THREE.HemisphereLight('#bae6fd', '#1e293b', 0.85);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 1.8);
    dirLight.position.set(30, 45, 25);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 150;
    const shadowD = 35;
    dirLight.shadow.camera.left = -shadowD;
    dirLight.shadow.camera.right = shadowD;
    dirLight.shadow.camera.top = shadowD;
    dirLight.shadow.camera.bottom = -shadowD;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Subtle blue accent light
    const fillLight = new THREE.DirectionalLight('#38bdf8', 0.5);
    fillLight.position.set(-25, 20, -20);
    scene.add(fillLight);

    // 6. Ground & Grid
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.9,
      metalness: 0.1
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    groundMesh.position.y = -0.01;
    scene.add(groundMesh);
    groundMeshRef.current = groundMesh;

    // Engineering CAD Grid
    const gridHelper = new THREE.GridHelper(120, 120, '#38bdf8', '#1e293b');
    gridHelper.position.y = 0;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;
    currentGridSizeRef.current = 120;

    // Compass Labels on Ground (N, S, E, W)
    const createCompass = () => {
      const compGroup = new THREE.Group();
      const circleGeo = new THREE.RingGeometry(24.8, 25.2, 64);
      circleGeo.rotateX(-Math.PI / 2);
      const circleMat = new THREE.MeshBasicMaterial({ color: '#334155', side: THREE.DoubleSide });
      const ring = new THREE.Mesh(circleGeo, circleMat);
      compGroup.add(ring);
      scene.add(compGroup);
    };
    createCompass();

    // 7. Crane Builder
    const builder = new CraneSceneBuilder(scene);
    craneBuilderRef.current = builder;

    // 8. Obstacle 3D Builder
    const obsBuilder = new Obstacle3DBuilder(scene);
    obstacleBuilderRef.current = obsBuilder;

    // 9. Interactive 3D Dragging TransformControls
    const dummy = new THREE.Group();
    scene.add(dummy);
    dummyTargetRef.current = dummy;

    // 10. Multi-Waypoint 3D Trajectory Group
    const trajGroup = new THREE.Group();
    scene.add(trajGroup);
    trajectoryGroupRef.current = trajGroup;

    // 11. Interactive Mouse Pick Fence Post Indicator (Ghost preview on ground)
    const pickPreview = new THREE.Group();
    pickPreview.visible = false;

    // Vertical beacon post
    const pickPostGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.2, 12);
    const pickPostMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.85,
      roughness: 0.2
    });
    const pickPost = new THREE.Mesh(pickPostGeo, pickPostMat);
    pickPost.position.y = 1.6;
    pickPreview.add(pickPost);

    // Warning beacon sphere on top
    const pickTopGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const pickTopMat = new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      emissive: '#f59e0b',
      emissiveIntensity: 0.95
    });
    const pickTop = new THREE.Mesh(pickTopGeo, pickTopMat);
    pickTop.position.y = 3.2;
    pickPreview.add(pickTop);

    // Ground target bullseye ring
    const pickRingGeo = new THREE.RingGeometry(0.6, 0.85, 32);
    pickRingGeo.rotateX(-Math.PI / 2);
    const pickRingMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const pickRing = new THREE.Mesh(pickRingGeo, pickRingMat);
    pickRing.position.y = 0.05;
    pickPreview.add(pickRing);

    const pickDotGeo = new THREE.CircleGeometry(0.2, 16);
    pickDotGeo.rotateX(-Math.PI / 2);
    const pickDot = new THREE.Mesh(pickDotGeo, pickRingMat);
    pickDot.position.y = 0.055;
    pickPreview.add(pickDot);

    scene.add(pickPreview);
    pickPreviewRef.current = pickPreview;

    const tc = new TransformControls(camera, renderer.domElement);
    tc.size = 0.75;
    tc.setMode('translate');
    scene.add(tc.getHelper());
    transformControlsRef.current = tc;

    tc.addEventListener('dragging-changed', (event) => {
      if (controlsRef.current) {
        controlsRef.current.enabled = !event.value;
      }
    });

    tc.addEventListener('change', () => {
      if (tc.dragging && dummyTargetRef.current) {
        const x = dummyTargetRef.current.position.x;
        const z = dummyTargetRef.current.position.z;
        const y = dummyTargetRef.current.position.y;

        const currentCrane = craneRef.current;
        const currentBoomLength = boomLengthRef.current || 20.0;
        const maxBoomLength = currentCrane?.specs?.maxBoomLength || 50.0;
        const minBoomLength = currentCrane?.specs?.minBoomLength || 10.0;
        const boomSteps = currentCrane?.specs?.boomSteps || [];
        const pivotY = currentCrane?.specs?.boomOffsetPivotY || 2.45;
        const pivotOffsetForward = 1.0;

        const loadDims = loadConfigRef.current?.dims || { l: 4.0, w: 2.4, h: 2.6 };
        const loadH = loadDims.h || 2.6;
        const slingH = 2.5;
        const riggingHeadroom = 1.5;
        const totalRiggingStack = loadH + slingH + riggingHeadroom;

        // 1. Tính toán bán kính và góc quay
        let r = Math.hypot(x, z);
        let worldAngle = (Math.atan2(z, x) * 180) / Math.PI;
        if (worldAngle < 0) worldAngle += 360;
        let s = worldAngle - (craneHeadingRef.current || 0);
        while (s < 0) s += 360;
        while (s >= 360) s -= 360;

        const maxReachableRadius = Math.max(3.0, maxBoomLength - 0.5);
        r = Math.max(3.0, Math.min(maxReachableRadius, r));
        const effectiveRadius = Math.max(0.5, r - pivotOffsetForward);

        // 2. Cao độ đáy tải mong muốn khi kéo chuột
        const requestedElevation = Math.max(0.2, y - loadH * 0.5);

        // 3. Độ cao đỉnh cần tối thiểu để treo được tải ở cao độ này
        const neededTipHeight = requestedElevation + totalRiggingStack;
        const neededDeltaY = Math.max(0, neededTipHeight - pivotY);

        // 4. Chiều dài cần tối thiểu để đạt tới (effectiveRadius, neededDeltaY)
        const neededBoomLength = Math.hypot(effectiveRadius, neededDeltaY);
        const minReqBoom = Math.max(r + 1.2, neededBoomLength);

        let activeBoomLength = currentBoomLength;

        // 5. Tự động kéo dài cần nếu cần hiện tại quá ngắn (nhưng không vượt quá maxBoomLength)
        if (minReqBoom > activeBoomLength) {
          if (minReqBoom <= maxBoomLength) {
            let targetBoomLength = minReqBoom;
            if (boomSteps && boomSteps.length > 0) {
              const suitableStep = boomSteps.find((step) => step >= minReqBoom);
              targetBoomLength = suitableStep || maxBoomLength;
            } else {
              targetBoomLength = Math.min(maxBoomLength, Math.round(minReqBoom * 10) / 10);
            }
            activeBoomLength = targetBoomLength;
            boomLengthRef.current = targetBoomLength;
            if (setBoomLengthRef.current) {
              setBoomLengthRef.current(targetBoomLength);
            }
          } else {
            activeBoomLength = maxBoomLength;
            boomLengthRef.current = maxBoomLength;
            if (setBoomLengthRef.current && currentBoomLength < maxBoomLength) {
              setBoomLengthRef.current(maxBoomLength);
            }
          }
        }

        // 6. Tính chiều cao đỉnh cần lớn nhất có thể đạt được với chiều dài cần hiện tại (hoặc cần max)
        let maxReachableTipHeight = pivotY;
        if (effectiveRadius < activeBoomLength) {
          maxReachableTipHeight = pivotY + Math.sqrt(Math.max(0, activeBoomLength * activeBoomLength - effectiveRadius * effectiveRadius));
        }

        // 7. Giới hạn cao độ tải: KHÔNG ĐƯỢC LỚN HƠN ĐỘ CAO MAX CỦA CẦN
        const maxAllowedElevation = Math.max(0.2, maxReachableTipHeight - totalRiggingStack);
        const finalElevation = Math.max(0.2, Math.min(requestedElevation, maxAllowedElevation));

        // 8. Căn chỉnh lại vị trí Gizmo 3D vừa khít với giới hạn vật lý để chuột không bị trôi
        const totalSlewRad = ((s + (craneHeadingRef.current || 0)) * Math.PI) / 180;
        dummyTargetRef.current.position.set(
          r * Math.cos(totalSlewRad),
          finalElevation + loadH * 0.5,
          r * Math.sin(totalSlewRad)
        );

        // 9. Cập nhật state
        if (setWorkingRadiusRef.current) {
          setWorkingRadiusRef.current(Math.round(r * 10) / 10);
        }
        if (setSlewAngleRef.current) {
          setSlewAngleRef.current(Math.round(s));
        }
        if (setLoadElevationRef.current) {
          setLoadElevationRef.current(Math.round(finalElevation * 10) / 10);
        }
      }
    });

    // 10. Resize Handler (Window resize + Container ResizeObserver)
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w <= 0 || h <= 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(container);
    }

    // 11. Animation Loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (tc) tc.dispose();
      if (obsBuilder) obsBuilder.clear();
      if (trajGroup) scene.remove(trajGroup);
      if (pickPreview) scene.remove(pickPreview);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Rebuild Crane when model or mat sizes change
  useEffect(() => {
    if (!craneBuilderRef.current || !crane) return;
    craneBuilderRef.current.buildCrane(crane, {
      matLength,
      matWidth,
      loadType: loadConfig?.type || 'box',
      loadDims: loadConfig?.dims || { l: 4.0, w: 2.4, h: 2.6 },
      slingAngleDeg: riggingConfig?.slingAngleDeg || 60,
      slingType: riggingConfig?.slingType || 'wire_rope',
      slingLegs: riggingConfig?.slingLegs !== undefined ? riggingConfig.slingLegs : 4
    });

    // Immediately synchronize kinematics so hook and load are placed at the boom tip
    craneBuilderRef.current.updateKinematics({
      craneHeading,
      slewAngleDeg: slewAngle,
      boomAngleDeg: boomAngle,
      boomLength,
      minBoomLength: crane.specs.minBoomLength,
      maxBoomLength: crane.specs.maxBoomLength,
      hookElevation,
      loadElevation,
      loadRotationDeg: loadRotation,
      outriggerReactions,
      soilCapacityTonsPerM2,
      matArea: matLength * matWidth
    });
  }, [
    crane,
    matLength,
    matWidth,
    loadConfig?.type,
    loadConfig?.dims?.l,
    loadConfig?.dims?.w,
    loadConfig?.dims?.h,
    riggingConfig?.slingAngleDeg,
    riggingConfig?.slingType,
    riggingConfig?.slingLegs
  ]);

  // Update Dynamic Kinematics & Colors
  useEffect(() => {
    if (!craneBuilderRef.current || !crane) return;

    craneBuilderRef.current.updateKinematics({
      craneHeading,
      slewAngleDeg: slewAngle,
      boomAngleDeg: boomAngle,
      boomLength,
      minBoomLength: crane.specs.minBoomLength,
      maxBoomLength: crane.specs.maxBoomLength,
      hookElevation,
      loadElevation,
      loadRotationDeg: loadRotation,
      outriggerReactions,
      soilCapacityTonsPerM2,
      matArea: matLength * matWidth
    });
  }, [
    craneHeading,
    slewAngle,
    boomAngle,
    boomLength,
    loadRotation,
    hookElevation,
    loadElevation,
    outriggerReactions,
    soilCapacityTonsPerM2,
    matLength,
    matWidth,
    crane
  ]);

  // Multi-Obstacles 3D Rendering
  useEffect(() => {
    if (!obstacleBuilderRef.current || !obstacles) return;
    obstacleBuilderRef.current.clear();
    obstacles.forEach((obs) => {
      if (obs.enabled) {
        obstacleBuilderRef.current.buildObstacle(obs);
      }
    });
  }, [obstacles]);

  // Dynamic Ground & CAD Grid auto-expansion when objects/obstacles exceed default boundary
  useEffect(() => {
    if (!sceneRef.current || !groundMeshRef.current || !gridHelperRef.current) return;

    let maxDist = 55; // Default half-extent for 120m grid

    // 1. Crane Working Radius & Boom Length
    if (workingRadius) maxDist = Math.max(maxDist, workingRadius + 15);
    if (boomLength) maxDist = Math.max(maxDist, boomLength + 15);

    // 2. Multi-waypoint Trajectory Points
    if (liftPoints && Array.isArray(liftPoints)) {
      liftPoints.forEach((pt) => {
        if (pt.radius) maxDist = Math.max(maxDist, pt.radius + 15);
      });
    }

    // 3. Obstacles (Buildings, Workshops, Power Lines, Trenches, Fences)
    if (obstacles && Array.isArray(obstacles)) {
      obstacles.forEach((obs) => {
        if (obs.enabled === false) return;
        if (obs.type === 'wall' && obs.boundaryPoints && Array.isArray(obs.boundaryPoints)) {
          obs.boundaryPoints.forEach((p) => {
            const d = Math.hypot(p.x, p.z) + 12;
            if (d > maxDist) maxDist = d;
          });
        } else {
          const halfDim =
            Math.max(
              obs.width || 0,
              obs.length || 0,
              obs.diameter || 0,
              obs.wireSpan || 0
            ) * 0.5;
          const d = Math.hypot(obs.posX || 0, obs.posZ || 0) + halfDim + 12;
          if (d > maxDist) maxDist = d;
        }
      });
    }

    // Calculate required grid size rounded to multiples of 20m (minimum 120m)
    const requiredGridSize = Math.max(120, Math.ceil((maxDist * 2) / 20) * 20);

    // If size changed, rebuild grid & ground plane smoothly
    if (currentGridSizeRef.current !== requiredGridSize) {
      currentGridSizeRef.current = requiredGridSize;
      const scene = sceneRef.current;

      // 1. Rebuild GridHelper
      scene.remove(gridHelperRef.current);
      gridHelperRef.current.geometry.dispose();
      if (Array.isArray(gridHelperRef.current.material)) {
        gridHelperRef.current.material.forEach((m) => m.dispose());
      } else {
        gridHelperRef.current.material.dispose();
      }

      const divisions = requiredGridSize <= 200 ? requiredGridSize : Math.round(requiredGridSize / 2);
      const newGrid = new THREE.GridHelper(requiredGridSize, divisions, '#38bdf8', '#1e293b');
      newGrid.position.y = 0;
      scene.add(newGrid);
      gridHelperRef.current = newGrid;

      // 2. Rebuild Ground Plane
      const groundSize = Math.max(requiredGridSize * 1.6, 250);
      if (groundMeshRef.current) {
        groundMeshRef.current.geometry.dispose();
        const newGeo = new THREE.PlaneGeometry(groundSize, groundSize);
        newGeo.rotateX(-Math.PI / 2);
        groundMeshRef.current.geometry = newGeo;
      }

      // 3. Adjust Camera distance limits and fog
      if (controlsRef.current) {
        controlsRef.current.maxDistance = Math.max(180, groundSize * 1.2);
      }
      if (cameraRef.current) {
        cameraRef.current.far = Math.max(500, groundSize * 2.5);
        cameraRef.current.updateProjectionMatrix();
      }
      if (scene.fog) {
        scene.fog.density = Math.max(0.0015, 0.008 * (120 / requiredGridSize));
      }
    }
  }, [obstacles, boomLength, workingRadius, liftPoints]);

  // Multi-Waypoint 3D Trajectory Curve & Spatial Markers
  useEffect(() => {
    if (!trajectoryGroupRef.current || !sceneRef.current) return;
    const group = trajectoryGroupRef.current;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    const points =
      liftPoints && liftPoints.length >= 2
        ? liftPoints
        : pickPoint && setPoint
        ? [
            { radius: pickPoint.radius, slew: pickPoint.slew, elevation: pickPoint.elevation },
            { radius: setPoint.radius, slew: setPoint.slew, elevation: setPoint.elevation }
          ]
        : [];

    if (points.length < 2) return;

    const loadH = loadConfig?.dims?.h || 2.6;
    const loadCenterOffsetY = loadH * 0.5;

    // Helper: calculate 3D world position from cylindrical coordinates (R, Slew, Elev)
    // In Three.js: Slew angle 0° = +X (Front), 90° = +Z (Right), 180° = -X (Rear), 270° = -Z (Left)
    const getPointWorldPos = (r, sDeg, elev) => {
      const sRad = (((sDeg || 0) + (craneHeading || 0)) * Math.PI) / 180;
      return new THREE.Vector3(
        r * Math.cos(sRad),
        (elev !== undefined ? elev : 1.5) + loadCenterOffsetY,
        r * Math.sin(sRad)
      );
    };

    // 1. Generate polar trajectory path points (Cylindrical crane rotation path matching actual simulation)
    const path3DPoints = [];
    const groundTrackPoints = [];
    const stepsPerSegment = 24;

    for (let i = 0; i < points.length - 1; i++) {
      const pA = points[i];
      const pB = points[i + 1];

      // Handle shortest circular slew angle traversal
      let slewDiff = pB.slew - pA.slew;
      if (slewDiff > 180) slewDiff -= 360;
      if (slewDiff < -180) slewDiff += 360;

      for (let s = 0; s <= stepsPerSegment; s++) {
        // Avoid duplicate vertices at segment joints
        if (i > 0 && s === 0) continue;

        const t = s / stepsPerSegment;
        // Cosine easing matching physical crane simulation kinematics
        const easeT = 0.5 - 0.5 * Math.cos(t * Math.PI);

        const r = pA.radius + (pB.radius - pA.radius) * easeT;
        const slew = (pA.slew + slewDiff * easeT + 360) % 360;
        const elev = pA.elevation + (pB.elevation - pA.elevation) * easeT;

        const pos3D = getPointWorldPos(r, slew, elev);
        path3DPoints.push(pos3D);
        groundTrackPoints.push(new THREE.Vector3(pos3D.x, 0.05, pos3D.z));
      }
    }

    // 2. Render 3D Flight Path Tube (Glowing 3D ribbon/tube clearly visible from all angles)
    if (path3DPoints.length >= 2) {
      try {
        const curve = new THREE.CatmullRomCurve3(path3DPoints, false, 'catmullrom', 0.1);
        const tubeGeo = new THREE.TubeGeometry(curve, 128, 0.08, 8, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: '#38bdf8',
          emissive: '#0284c7',
          emissiveIntensity: 0.65,
          roughness: 0.3,
          metalness: 0.4,
          transparent: true,
          opacity: 0.85
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        group.add(tubeMesh);
      } catch (err) {
        console.warn('TubeGeometry fallback:', err);
      }

      // High-contrast Centerline
      const pathGeo = new THREE.BufferGeometry().setFromPoints(path3DPoints);
      const pathMat = new THREE.LineBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.85
      });
      const pathLine = new THREE.Line(pathGeo, pathMat);
      group.add(pathLine);

      // Ground track projection line (shadow of flight path on floor)
      const groundGeo = new THREE.BufferGeometry().setFromPoints(groundTrackPoints);
      const groundMat = new THREE.LineDashedMaterial({
        color: '#0284c7',
        dashSize: 0.5,
        gapSize: 0.3,
        transparent: true,
        opacity: 0.7
      });
      const groundLine = new THREE.Line(groundGeo, groundMat);
      groundLine.computeLineDistances();
      group.add(groundLine);
    }

    // 3. Render Waypoint Markers (Pin Spheres, Halos, Plumb Drop Lines, Ground Footprints)
    points.forEach((pt, idx) => {
      const pos = getPointWorldPos(pt.radius, pt.slew, pt.elevation);
      const isStart = idx === 0;
      const isEnd = idx === points.length - 1;
      const color = isStart ? '#10b981' : isEnd ? '#ef4444' : '#f59e0b';

      // 3D Waypoint Pin/Sphere (positioned precisely at the center of the load)
      const sphereGeo = new THREE.SphereGeometry(0.4, 20, 20);
      const sphereMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.85,
        roughness: 0.2
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.copy(pos);
      group.add(sphere);

      // Outer halo ring around waypoint sphere
      const haloGeo = new THREE.RingGeometry(0.6, 0.72, 32);
      haloGeo.rotateX(-Math.PI / 2);
      const haloMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(pos);
      group.add(halo);

      // Vertical plumb drop line to ground
      const dropGeo = new THREE.BufferGeometry().setFromPoints([
        pos,
        new THREE.Vector3(pos.x, 0.05, pos.z)
      ]);
      const dropLine = new THREE.Line(
        dropGeo,
        new THREE.LineDashedMaterial({
          color,
          dashSize: 0.4,
          gapSize: 0.3,
          transparent: true,
          opacity: 0.7
        })
      );
      dropLine.computeLineDistances();
      group.add(dropLine);

      // Ground footprint ring & dot
      const ringGeo = new THREE.RingGeometry(0.5, 0.7, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(pos.x, 0.06, pos.z);
      group.add(ring);

      const dotGeo = new THREE.CircleGeometry(0.2, 16);
      dotGeo.rotateX(-Math.PI / 2);
      const dot = new THREE.Mesh(dotGeo, ringMat);
      dot.position.set(pos.x, 0.065, pos.z);
      group.add(dot);
    });
  }, [liftPoints, pickPoint, setPoint, loadConfig?.dims?.h, craneHeading]);

  // TransformControls Gizmo Toggle & Attachment
  useEffect(() => {
    if (!transformControlsRef.current || !dummyTargetRef.current) return;
    if (isGizmoActive) {
      transformControlsRef.current.attach(dummyTargetRef.current);
      transformControlsRef.current.enabled = true;
    } else {
      transformControlsRef.current.detach();
      transformControlsRef.current.enabled = false;
    }
  }, [isGizmoActive]);

  // Sync Dummy Target position when not actively dragging
  useEffect(() => {
    if (!transformControlsRef.current?.dragging && dummyTargetRef.current) {
      const sRad = ((slewAngle + (craneHeading || 0)) * Math.PI) / 180;
      const loadH = loadConfig?.dims?.h || 2.6;
      dummyTargetRef.current.position.set(
        workingRadius * Math.cos(sRad),
        (loadElevation !== undefined ? loadElevation : 1.5) + loadH * 0.5,
        workingRadius * Math.sin(sRad)
      );
    }
  }, [workingRadius, slewAngle, loadElevation, loadConfig?.dims?.h, craneHeading]);

  // Interactive Mouse Picking for Fence Boundary Points on 3D Ground
  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;
    const dom = rendererRef.current.domElement;
    if (!dom) return;

    if (!pickingFencePoint) {
      if (pickPreviewRef.current) pickPreviewRef.current.visible = false;
      setPickCoordText(null);
      return;
    }

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPt = new THREE.Vector3();

    const handlePointerMove = (e) => {
      const rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      if (raycaster.ray.intersectPlane(groundPlane, intersectPt)) {
        const snapX = Math.round(intersectPt.x * 2) / 2; // snap 0.5m
        const snapZ = Math.round(intersectPt.z * 2) / 2;
        hoverCoordRef.current = { x: snapX, z: snapZ };

        if (pickPreviewRef.current) {
          pickPreviewRef.current.position.set(snapX, 0, snapZ);
          pickPreviewRef.current.visible = true;
        }
        setPickCoordText(`X: ${snapX.toFixed(1)}m | Z: ${snapZ.toFixed(1)}m`);
      }
    };

    const handlePointerDown = (e) => {
      downCoordRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e) => {
      const dx = Math.abs(e.clientX - downCoordRef.current.x);
      const dy = Math.abs(e.clientY - downCoordRef.current.y);
      if (dx > 6 || dy > 6) return;

      if (hoverCoordRef.current && setObstacles) {
        const { x, z } = hoverCoordRef.current;
        const { obsId, pointId, mode } = pickingFencePoint;

        setObstacles((prev) =>
          prev.map((obs) => {
            if (obs.id !== obsId) return obs;
            const pts = obs.boundaryPoints || [];

            if (mode === 'add') {
              const nextNum = pts.length + 1;
              const newPoint = {
                id: `bp-${Date.now()}-${nextNum}`,
                name: `Mốc ${nextNum}`,
                x,
                z
              };
              return {
                ...obs,
                boundaryPoints: [...pts, newPoint]
              };
            } else if (pointId) {
              return {
                ...obs,
                boundaryPoints: pts.map((p) =>
                  p.id === pointId ? { ...p, x, z } : p
                )
              };
            }
            return obs;
          })
        );

        if (pointId && setPickingFencePoint) {
          setPickingFencePoint(null);
        }
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && setPickingFencePoint) {
        setPickingFencePoint(null);
      }
    };

    dom.addEventListener('pointermove', handlePointerMove);
    dom.addEventListener('pointerdown', handlePointerDown);
    dom.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      dom.removeEventListener('pointermove', handlePointerMove);
      dom.removeEventListener('pointerdown', handlePointerDown);
      dom.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pickingFencePoint, setObstacles, setPickingFencePoint]);

  // Camera Presets
  const setCameraPreset = (view) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    setActiveCameraView(view);

    switch (view) {
      case 'top':
        // 0.1 offset prevents polar gimbal lock singularity in OrbitControls
        cam.position.set(0.1, 55, 0.1);
        ctrl.target.set(0, 0, 0);
        break;
      case 'side':
        cam.position.set(0, 12, 45);
        ctrl.target.set(0, 8, 0);
        break;
      case 'cab':
        // Inside crane operator cab, oriented with crane heading
        const cabAngleRad = (-(craneHeading || 0) * Math.PI) / 180;
        const cabLocalX = 1.5;
        const cabLocalZ = 2.0;
        const cabWorldX = cabLocalX * Math.cos(cabAngleRad) - cabLocalZ * Math.sin(cabAngleRad);
        const cabWorldZ = cabLocalX * Math.sin(cabAngleRad) + cabLocalZ * Math.cos(cabAngleRad);
        cam.position.set(cabWorldX, 3.5, cabWorldZ);
        const boomTipAngleRad = (((slewAngle || 0) + (craneHeading || 0)) * Math.PI) / 180;
        ctrl.target.set(workingRadius * 0.8 * Math.cos(boomTipAngleRad), hookElevation, workingRadius * 0.8 * Math.sin(boomTipAngleRad));
        break;
      case 'load':
        // Close-up on the lifted load and rigging assembly
        if (craneBuilderRef.current?.loadGroup) {
          const lp = craneBuilderRef.current.loadGroup.position;
          const totalSlewRad = (-((craneHeading || 0) + (slewAngle || 0)) * Math.PI) / 180;
          const camOffsetX = 5.5 * Math.cos(totalSlewRad + Math.PI / 3);
          const camOffsetZ = 5.5 * Math.sin(totalSlewRad + Math.PI / 3);
          cam.position.set(lp.x + camOffsetX, lp.y + 3.0, lp.z + camOffsetZ);
          ctrl.target.set(lp.x, lp.y + 1.2, lp.z);
        } else {
          cam.position.set(workingRadius + 6, loadElevation + 3, 6);
          ctrl.target.set(workingRadius, loadElevation, 0);
        }
        break;
      case '3d':
      default:
        cam.position.set(24, 18, 28);
        ctrl.target.set(0, 5, 0);
        break;
    }
    ctrl.update();
  };

  // Viewport Capture Handle for Engineering Reports (Multi-view screenshots)
  useEffect(() => {
    if (captureRef) {
      captureRef.current = {
        setPreset: (view) => {
          setCameraPreset(view);
        },
        captureCurrentView: () => {
          if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return null;
          rendererRef.current.render(sceneRef.current, cameraRef.current);
          return rendererRef.current.domElement.toDataURL('image/jpeg', 0.92);
        },
        captureAllViews: () => {
          if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !controlsRef.current) {
            return null;
          }
          const renderer = rendererRef.current;
          const scene = sceneRef.current;
          const cam = cameraRef.current;
          const ctrl = controlsRef.current;

          // Save current camera state
          const origPos = cam.position.clone();
          const origTarget = ctrl.target.clone();
          const origUp = cam.up.clone();

          // 1. Current View (whatever angle the user has oriented to)
          renderer.render(scene, cam);
          const currentView = renderer.domElement.toDataURL('image/jpeg', 0.92);

          // 2. 3D Isometric View (closer framing for clearer details)
          const isoDist = Math.max(boomLength * 0.85, 24);
          cam.position.set(isoDist * 0.72, isoDist * 0.55, isoDist * 0.78);
          cam.up.set(0, 1, 0);
          ctrl.target.set(0, Math.min(loadElevation + 2, 8), 0);
          cam.lookAt(ctrl.target);
          ctrl.update();
          renderer.render(scene, cam);
          const isoView = renderer.domElement.toDataURL('image/jpeg', 0.92);

          // 3. Top / Plan CAD View (closer, tight bounding of crane + outriggers + load)
          const topH = Math.max(boomLength * 1.35, 32);
          cam.position.set(0, topH, 0.001); // tiny offset prevents gimbal singularity
          cam.up.set(0, 0, -1);
          ctrl.target.set(0, 0, 0);
          cam.lookAt(0, 0, 0);
          ctrl.update();
          renderer.render(scene, cam);
          const topView = renderer.domElement.toDataURL('image/jpeg', 0.92);

          // 4. Side Elevation View (closer framing)
          const sideDist = Math.max(boomLength * 1.05, 28);
          cam.position.set(0, Math.max(boomLength * 0.35, 10), sideDist);
          cam.up.set(0, 1, 0);
          ctrl.target.set(0, Math.max(boomLength * 0.25, 7), 0);
          cam.lookAt(ctrl.target);
          ctrl.update();
          renderer.render(scene, cam);
          const sideView = renderer.domElement.toDataURL('image/jpeg', 0.92);

          // Restore camera state to user's view
          cam.position.copy(origPos);
          cam.up.copy(origUp);
          ctrl.target.copy(origTarget);
          cam.lookAt(origTarget);
          ctrl.update();
          renderer.render(scene, cam);

          return { isoView, topView, sideView, currentView, customView: currentView };
        },
        getCanvas: () => rendererRef.current?.domElement,
        startOrbit: (speed = 4.5) => {
          if (controlsRef.current) {
            controlsRef.current.autoRotate = true;
            controlsRef.current.autoRotateSpeed = speed;
          }
        },
        stopOrbit: () => {
          if (controlsRef.current) {
            controlsRef.current.autoRotate = false;
          }
        }
      };
    }
  }, [boomLength, loadElevation, captureRef]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl flex flex-col">
      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        style={{ touchAction: 'none' }}
        className={`w-full flex-1 relative ${
          pickingFencePoint ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Active Mouse Picking Mode Banner */}
      {pickingFencePoint && (
        <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 bg-cyan-950/95 border-2 border-cyan-400 text-cyan-100 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 sm:gap-3.5 z-40 pointer-events-auto backdrop-blur-md animate-pulse max-w-[95%]">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center shrink-0 text-cyan-300">
            <MousePointerClick size={16} />
          </div>
          <div className="text-xs min-w-0">
            <div className="font-bold text-white uppercase tracking-wide flex items-center gap-1.5 flex-wrap">
              <span className="truncate">
                {pickingFencePoint.mode === 'add'
                  ? 'Chấm Cọc Mốc Mới'
                  : 'Định Vị Cọc Mốc Chuột'}
              </span>
              {pickCoordText && (
                <span className="bg-cyan-900 border border-cyan-500/60 text-cyan-300 font-mono text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded font-black">
                  {pickCoordText}
                </span>
              )}
            </div>
            <div className="text-cyan-200/90 text-[10px] sm:text-[11px] mt-0.5 truncate hidden sm:block">
              Nhấp chuột trên mặt đất 3D để đặt mốc (Bắt dính 0.5m). Phím Esc để hủy.
            </div>
          </div>
          <button
            onClick={() => setPickingFencePoint(null)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 shadow"
          >
            Xong
          </button>
        </div>
      )}

      {/* Top Overlay Bar: Status & Key Telemetry */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none gap-2">
        {/* Crane & Model Tag */}
        <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-lg border border-slate-700/80 shadow-lg flex items-center gap-3 pointer-events-auto">
          <div className="w-3 h-3 rounded-full animate-pulse shrink-0" style={{ backgroundColor: liftCategory.color }} />
          <div>
            <div className="text-xs font-semibold text-slate-200 tracking-wide">{crane?.name || 'Chưa chọn cẩu'}</div>
            <div className="text-[11px] text-slate-400 font-mono">
              Bán kính: <span className="text-sky-400 font-bold">{workingRadius.toFixed(1)}m</span> | Góc cần:{' '}
              <span className="text-amber-400 font-bold">{boomAngle.toFixed(1)}°</span> | Cần:{' '}
              <span className="text-emerald-400 font-bold">{boomLength.toFixed(1)}m</span>
            </div>
          </div>
        </div>

        {/* Live Safety Lift Percentage Pill */}
        <div
          className="px-4 py-2 rounded-lg backdrop-blur-md border shadow-lg flex items-center gap-3 pointer-events-auto shrink-0"
          style={{
            backgroundColor: liftCategory.bgColor,
            borderColor: liftCategory.color
          }}
        >
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Khả năng tải (Lift %)</div>
            <div className="text-lg font-black font-mono tracking-tight" style={{ color: liftCategory.color }}>
              {liftPercentage > 0 ? `${liftPercentage.toFixed(1)}%` : 'NGOÀI BẢNG TẢI'}
            </div>
          </div>
          <div className="h-8 w-px bg-slate-700/60" />
          <div className="text-left text-xs font-mono">
            <div className="text-slate-300">
              Tổng tải: <span className="font-bold text-white">{grossLoad.toFixed(2)}t</span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Tải cho phép: <span className="font-bold text-sky-300">{ratedCapacity.toFixed(2)}t</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Camera View Switcher Buttons */}
      {/* Desktop Mode (md and up): docked on left side */}
      <div className="hidden md:flex absolute left-3 top-20 z-30 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl flex-col gap-1 pointer-events-auto min-w-[110px]">
        <div className="text-[9px] font-bold text-slate-400 px-2 py-0.5 uppercase tracking-wider font-mono border-b border-slate-800 text-center select-none">
          Góc nhìn
        </div>
        <button
          onClick={() => setCameraPreset('3d')}
          title="Góc nhìn 3D Tự do"
          className={`w-full px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeCameraView === '3d'
              ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/25'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Camera size={14} className="shrink-0" />
          <span>3D Tự do</span>
        </button>
        <button
          onClick={() => setCameraPreset('top')}
          title="Góc nhìn mặt bằng (Plan View CAD)"
          className={`w-full px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeCameraView === 'top'
              ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/25'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Compass size={14} className="shrink-0" />
          <span>Mặt bằng</span>
        </button>
        <button
          onClick={() => setCameraPreset('side')}
          title="Góc nhìn mặt cắt đứng (Elevation View)"
          className={`w-full px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeCameraView === 'side'
              ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/25'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Layers size={14} className="shrink-0" />
          <span>Mặt bên</span>
        </button>
        <button
          onClick={() => setCameraPreset('cab')}
          title="Góc nhìn buồng lái thợ cẩu"
          className={`w-full px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeCameraView === 'cab'
              ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/25'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Eye size={14} className="shrink-0" />
          <span>Buồng lái</span>
        </button>
        <button
          onClick={() => setCameraPreset('load')}
          title="Góc nhìn bám sát tải cẩu"
          className={`w-full px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeCameraView === 'load'
              ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/25'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Box size={14} className="shrink-0" />
          <span>Tải cẩu</span>
        </button>

        <div className="h-px bg-slate-700/60 my-0.5" />

        <button
          onClick={() => setIsGizmoActive(!isGizmoActive)}
          title="Bật/Tắt mũi tên kéo thả 3D trực tiếp bằng chuột để chỉnh bán kính, góc quay toa và cao độ"
          className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            isGizmoActive
              ? 'bg-rose-600 text-white shadow-lg animate-pulse'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Move3d size={14} className="shrink-0" />
          <span>{isGizmoActive ? 'Đang kéo 3D' : 'Kéo chuột'}</span>
        </button>
      </div>

      {/* Mobile Mode (under md): Compact Collapsible Pill Dropdown */}
      <div className="md:hidden absolute left-2 top-14 z-30 pointer-events-auto">
        <button
          onClick={() => setIsCameraMenuOpen(!isCameraMenuOpen)}
          className="bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700/90 text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 shadow-lg active:scale-95 transition-transform"
        >
          <Camera size={13} className="text-sky-400 shrink-0" />
          <span>
            {activeCameraView === '3d' && '3D Tự do'}
            {activeCameraView === 'top' && 'Mặt bằng'}
            {activeCameraView === 'side' && 'Mặt bên'}
            {activeCameraView === 'cab' && 'Buồng lái'}
            {activeCameraView === 'load' && 'Tải cẩu'}
          </span>
          <ChevronDown size={12} className={`text-slate-400 transition-transform ${isCameraMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {isCameraMenuOpen && (
          <div className="mt-1 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 shadow-2xl flex flex-col gap-1 min-w-[125px] animate-in fade-in duration-150">
            <button
              onClick={() => { setCameraPreset('3d'); setIsCameraMenuOpen(false); }}
              className={`px-2.5 py-1.5 text-xs rounded-lg text-left flex items-center gap-2 ${activeCameraView === '3d' ? 'bg-sky-500 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <Camera size={13} /> 3D Tự do
            </button>
            <button
              onClick={() => { setCameraPreset('top'); setIsCameraMenuOpen(false); }}
              className={`px-2.5 py-1.5 text-xs rounded-lg text-left flex items-center gap-2 ${activeCameraView === 'top' ? 'bg-sky-500 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <Compass size={13} /> Mặt bằng
            </button>
            <button
              onClick={() => { setCameraPreset('side'); setIsCameraMenuOpen(false); }}
              className={`px-2.5 py-1.5 text-xs rounded-lg text-left flex items-center gap-2 ${activeCameraView === 'side' ? 'bg-sky-500 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <Layers size={13} /> Mặt bên
            </button>
            <button
              onClick={() => { setCameraPreset('cab'); setIsCameraMenuOpen(false); }}
              className={`px-2.5 py-1.5 text-xs rounded-lg text-left flex items-center gap-2 ${activeCameraView === 'cab' ? 'bg-sky-500 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <Eye size={13} /> Buồng lái
            </button>
            <button
              onClick={() => { setCameraPreset('load'); setIsCameraMenuOpen(false); }}
              className={`px-2.5 py-1.5 text-xs rounded-lg text-left flex items-center gap-2 ${activeCameraView === 'load' ? 'bg-sky-500 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <Box size={13} /> Tải cẩu
            </button>
            <div className="h-px bg-slate-800 my-0.5" />
            <button
              onClick={() => { setIsGizmoActive(!isGizmoActive); setIsCameraMenuOpen(false); }}
              className={`px-2.5 py-1.5 text-xs rounded-lg text-left flex items-center gap-2 ${isGizmoActive ? 'bg-rose-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <Move3d size={13} /> {isGizmoActive ? 'Tắt kéo 3D' : 'Bật kéo 3D'}
            </button>
          </div>
        )}
      </div>

      {/* Trajectory Simulation & Play Controls + Real-Time Load Rotation */}
      <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 z-30 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-xl flex items-center gap-2 shrink-0">
        {/* Real-time Direct Load Rotation Quick Control */}
        <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-700/60 rounded-lg px-2 py-1 text-xs">
          <RotateCw size={13} className="text-emerald-400 shrink-0" />
          <span className="text-[11px] text-slate-300 font-medium hidden sm:inline">Xoay tải:</span>
          <WheelNumberInput
            value={loadRotation || 0}
            onChange={(val) => {
              if (setLoadRotation) setLoadRotation(Math.round(val));
            }}
            min={0}
            max={360}
            step={5}
            wrapAround={true}
            unit="°"
            className="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-xs text-emerald-400 font-mono font-bold text-center focus:border-emerald-500"
          />
          <div className="hidden sm:flex items-center gap-0.5">
            {[0, 90, 180, 270].map((deg) => (
              <button
                key={deg}
                type="button"
                onClick={() => {
                  if (setLoadRotation) setLoadRotation(deg);
                }}
                className={`text-[9px] font-mono px-1 py-0.5 rounded border transition-colors ${
                  (loadRotation || 0) === deg
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                    : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setIsSimulating(!isSimulating)}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-all whitespace-nowrap cursor-pointer ${
            isSimulating
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {isSimulating ? <Pause size={14} className="shrink-0" /> : <Play size={14} className="shrink-0" />}
          <span className="hidden sm:inline">{isSimulating ? 'Tạm dừng mô phỏng' : 'Chạy thử đường cẩu (Pick → Set)'}</span>
          <span className="sm:hidden">{isSimulating ? 'Dừng' : 'Mô phỏng'}</span>
        </button>

        {/* Short Video Export Button */}
        {onOpenVideoModal && (
          <button
            onClick={onOpenVideoModal}
            className="px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-all whitespace-nowrap cursor-pointer bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
            title="Xuất video ngắn mô phỏng nâng hạ 3D (MP4 / Full HD)"
          >
            <Video size={14} className="shrink-0" />
            <span className="hidden sm:inline">Quay video 3D</span>
            <span className="sm:hidden">Video</span>
          </button>
        )}
      </div>

      {/* Floating Bottom Center: Outrigger Pressure Legend */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-800 text-[11px] text-slate-400 flex items-center gap-4 pointer-events-none hidden md:flex">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Áp lực an toàn (&lt;85%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Cảnh báo (85-100%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Nguy cơ lún sụt (&gt;100%)
        </span>
      </div>
    </div>
  );
}

