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
  ChevronDown,
  Sun,
  Moon,
  Sliders,
  Building2,
  Factory,
  Zap,
  Disc,
  Fence,
  X
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
  setLiftPoints,
  pickPoint,
  setPoint,
  isSimulating,
  setIsSimulating,
  captureRef,
  onOpenVideoModal,
  viewportTheme = 'dark',
  onToggleViewportTheme
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
  const hemiLightRef = useRef(null);
  const dirLightRef = useRef(null);
  const fillLightRef = useRef(null);
  const compassRingMatRef = useRef(null);

  const [localTheme, setLocalTheme] = useState(() => {
    try {
      return localStorage.getItem('3d_lift_plan_viewport_theme') || 'dark';
    } catch (e) {
      return 'dark';
    }
  });
  const currentTheme = viewportTheme || localTheme;
  const isLight = currentTheme === 'light';

  const handleToggleTheme = () => {
    if (onToggleViewportTheme) {
      onToggleViewportTheme();
    } else {
      setLocalTheme((prev) => {
        const next = prev === 'dark' ? 'light' : 'dark';
        try {
          localStorage.setItem('3d_lift_plan_viewport_theme', next);
        } catch (e) {}
        return next;
      });
    }
  };

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
  const [activeDragTarget, setActiveDragTarget] = useState({
    type: 'load', // 'load' | 'obstacle' | 'waypoint'
    id: 'load',
    name: 'Kiện tải cẩu'
  });
  const [isTargetMenuOpen, setIsTargetMenuOpen] = useState(false);
  const [gizmoMode, setGizmoMode] = useState('translate'); // 'translate' | 'rotate'
  const activeDragTargetRef = useRef(activeDragTarget);
  const gizmoModeRef = useRef(gizmoMode);
  const obstaclesRef = useRef(obstacles);
  const setObstaclesRef = useRef(setObstacles);
  const liftPointsRef = useRef(liftPoints);
  const setLiftPointsRef = useRef(setLiftPoints);
  const setLoadRotationRef = useRef(setLoadRotation);
  const dragStartPosRef = useRef({ x: 0, z: 0 });
  const initialBoundaryPointsRef = useRef([]);

  useEffect(() => {
    activeDragTargetRef.current = activeDragTarget;
  }, [activeDragTarget]);

  useEffect(() => {
    gizmoModeRef.current = gizmoMode;
  }, [gizmoMode]);

  useEffect(() => {
    obstaclesRef.current = obstacles;
    setObstaclesRef.current = setObstacles;
    liftPointsRef.current = liftPoints;
    setLiftPointsRef.current = setLiftPoints;
    setLoadRotationRef.current = setLoadRotation;
  }, [obstacles, setObstacles, liftPoints, setLiftPoints, setLoadRotation]);

  const getObstacleIcon = (type, size = 13, className = '') => {
    switch (type) {
      case 'cylinder':
        return <Disc size={size} className={className || 'text-cyan-400 shrink-0'} />;
      case 'power_pole':
        return <Zap size={size} className={className || 'text-amber-400 shrink-0'} />;
      case 'workshop':
        return <Factory size={size} className={className || 'text-emerald-400 shrink-0'} />;
      case 'wall':
        return <Fence size={size} className={className || 'text-blue-400 shrink-0'} />;
      case 'trench':
        return <AlertTriangle size={size} className={className || 'text-rose-400 shrink-0'} />;
      case 'building':
      default:
        return <Building2 size={size} className={className || 'text-indigo-400 shrink-0'} />;
    }
  };

  const handleRotateTarget = (deltaDeg = 45) => {
    if (activeDragTarget.type === 'obstacle') {
      const obsId = activeDragTarget.id;
      if (setObstaclesRef.current) {
        setObstaclesRef.current((prev) =>
          prev.map((o) => {
            if (o.id !== obsId) return o;
            const nextRot = ((o.rotationY || 0) + deltaDeg) % 360;
            return { ...o, rotationY: nextRot };
          })
        );
      }
    } else if (activeDragTarget.type === 'load') {
      if (setLoadRotationRef.current) {
        setLoadRotationRef.current(((loadRotationRef.current || 0) + deltaDeg) % 360);
      }
    }
  };

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
    scene.background = new THREE.Color(isLight ? '#f0f4f8' : '#0b1120'); // Light daylight vs Dark slate CAD background
    scene.fog = new THREE.FogExp2(isLight ? '#f0f4f8' : '#0b1120', isLight ? 0.005 : 0.008);
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
    const hemiLight = new THREE.HemisphereLight(
      isLight ? '#ffffff' : '#bae6fd',
      isLight ? '#94a3b8' : '#1e293b',
      isLight ? 1.1 : 0.85
    );
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const dirLight = new THREE.DirectionalLight(isLight ? '#fffbeb' : '#ffffff', isLight ? 2.2 : 1.8);
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
    dirLightRef.current = dirLight;

    // Subtle blue accent light
    const fillLight = new THREE.DirectionalLight(isLight ? '#93c5fd' : '#38bdf8', isLight ? 0.55 : 0.5);
    fillLight.position.set(-25, 20, -20);
    scene.add(fillLight);
    fillLightRef.current = fillLight;

    // 6. Ground & Grid
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: isLight ? '#cbd5e1' : '#0f172a',
      roughness: isLight ? 0.85 : 0.9,
      metalness: 0.1
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    groundMesh.position.y = -0.01;
    scene.add(groundMesh);
    groundMeshRef.current = groundMesh;

    // Engineering CAD Grid
    const gridCenterColor = isLight ? '#0284c7' : '#38bdf8';
    const gridLineColor = isLight ? '#94a3b8' : '#1e293b';
    const gridHelper = new THREE.GridHelper(120, 120, gridCenterColor, gridLineColor);
    gridHelper.position.y = 0;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;
    currentGridSizeRef.current = 120;

    // Compass Labels on Ground (N, S, E, W)
    const circleMat = new THREE.MeshBasicMaterial({
      color: isLight ? '#64748b' : '#334155',
      side: THREE.DoubleSide
    });
    compassRingMatRef.current = circleMat;
    const createCompass = () => {
      const compGroup = new THREE.Group();
      const circleGeo = new THREE.RingGeometry(24.8, 25.2, 64);
      circleGeo.rotateX(-Math.PI / 2);
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
      if (event.value && dummyTargetRef.current) {
        dragStartPosRef.current = {
          x: dummyTargetRef.current.position.x,
          z: dummyTargetRef.current.position.z
        };
        const currentTarget = activeDragTargetRef.current;
        if (currentTarget?.type === 'obstacle') {
          const obs = (obstaclesRef.current || []).find((o) => o.id === currentTarget.id);
          if (obs?.boundaryPoints) {
            initialBoundaryPointsRef.current = JSON.parse(JSON.stringify(obs.boundaryPoints));
          }
        }
      }
    });

    tc.addEventListener('change', () => {
      if (!tc.dragging || !dummyTargetRef.current) return;

      const currentTarget = activeDragTargetRef.current;
      const x = dummyTargetRef.current.position.x;
      const z = dummyTargetRef.current.position.z;
      const y = dummyTargetRef.current.position.y;
      const isRotateMode = tc.mode === 'rotate';

      // ----------------------------------------------------
      // CASE 1: CRANE LOAD
      // ----------------------------------------------------
      if (!currentTarget || currentTarget.type === 'load') {
        if (isRotateMode) {
          let rotDeg = Math.round((dummyTargetRef.current.rotation.y * 180) / Math.PI);
          while (rotDeg < 0) rotDeg += 360;
          while (rotDeg >= 360) rotDeg -= 360;
          if (setLoadRotationRef.current) {
            setLoadRotationRef.current(rotDeg);
          }
          return;
        }

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

      // ----------------------------------------------------
      // CASE 2: OBSTACLE / SITE STRUCTURE
      // ----------------------------------------------------
      else if (currentTarget.type === 'obstacle') {
        const obsList = obstaclesRef.current || [];
        const obs = obsList.find((o) => o.id === currentTarget.id);
        if (!obs) return;

        if (isRotateMode) {
          let rotDeg = Math.round((dummyTargetRef.current.rotation.y * 180) / Math.PI);
          while (rotDeg < 0) rotDeg += 360;
          while (rotDeg >= 360) rotDeg -= 360;
          if (setObstaclesRef.current) {
            setObstaclesRef.current((prev) =>
              prev.map((o) => (o.id === obs.id ? { ...o, rotationY: rotDeg } : o))
            );
          }
          if (obstacleBuilderRef.current?.obstaclesGroup) {
            const meshGroup = obstacleBuilderRef.current.obstaclesGroup.children.find(
              (c) => c.name === obs.id
            );
            if (meshGroup) {
              meshGroup.rotation.y = dummyTargetRef.current.rotation.y;
            }
          }
          return;
        }

        // Translate mode
        const newX = Math.round(x * 10) / 10;
        const newZ = Math.round(z * 10) / 10;

        // Keep dummy target Y pinned at obstacle mid-height
        dummyTargetRef.current.position.y = (obs.height || 10.0) * 0.5;

        // Multi-point fence
        if (obs.type === 'wall' && obs.boundaryPoints && obs.boundaryPoints.length >= 2) {
          const totalDx = x - dragStartPosRef.current.x;
          const totalDz = z - dragStartPosRef.current.z;
          const initialPts = initialBoundaryPointsRef.current || [];
          if (initialPts.length > 0 && setObstaclesRef.current) {
            setObstaclesRef.current((prev) =>
              prev.map((o) => {
                if (o.id !== obs.id) return o;
                return {
                  ...o,
                  boundaryPoints: initialPts.map((p) => ({
                    ...p,
                    x: Math.round((p.x + totalDx) * 10) / 10,
                    z: Math.round((p.z + totalDz) * 10) / 10
                  }))
                };
              })
            );
          }
        } else {
          // Standard obstacle
          if (setObstaclesRef.current) {
            setObstaclesRef.current((prev) =>
              prev.map((o) => (o.id === obs.id ? { ...o, posX: newX, posZ: newZ } : o))
            );
          }
          if (obstacleBuilderRef.current?.obstaclesGroup) {
            const meshGroup = obstacleBuilderRef.current.obstaclesGroup.children.find(
              (c) => c.name === obs.id
            );
            if (meshGroup) {
              meshGroup.position.set(newX, 0, newZ);
            }
          }
        }
      }

      // ----------------------------------------------------
      // CASE 3: WAYPOINT (PICK, SET, AVOIDANCE POINT)
      // ----------------------------------------------------
      else if (currentTarget.type === 'waypoint') {
        let r = Math.hypot(x, z);
        r = Math.max(1.5, Math.min(65.0, Math.round(r * 10) / 10));

        let worldAngle = (Math.atan2(z, x) * 180) / Math.PI;
        if (worldAngle < 0) worldAngle += 360;
        let s = worldAngle - (craneHeadingRef.current || 0);
        while (s < 0) s += 360;
        while (s >= 360) s -= 360;
        s = Math.round(s);

        const loadH = loadConfigRef.current?.dims?.h || 2.6;
        const elev = Math.max(0.2, Math.round((y - loadH * 0.5) * 10) / 10);

        if (setLiftPointsRef.current) {
          setLiftPointsRef.current((prev) =>
            prev.map((pt, idx) => {
              if (
                pt.id === currentTarget.id ||
                (currentTarget.index !== undefined && idx === currentTarget.index)
              ) {
                return { ...pt, radius: r, slew: s, elevation: elev };
              }
              return pt;
            })
          );
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
      const centerColor = isLight ? '#0284c7' : '#38bdf8';
      const gridLineColor = isLight ? '#94a3b8' : '#1e293b';
      const newGrid = new THREE.GridHelper(requiredGridSize, divisions, centerColor, gridLineColor);
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
        const baseDensity = isLight ? 0.005 : 0.008;
        scene.fog.density = Math.max(0.0015, baseDensity * (120 / requiredGridSize));
      }
    }
  }, [obstacles, boomLength, workingRadius, liftPoints, isLight]);

  // Dynamic 3D Viewport Theme Switching (Dark Mode vs Light Mode)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // 1. Background & Fog
    scene.background = new THREE.Color(isLight ? '#f0f4f8' : '#0b1120');
    scene.fog = new THREE.FogExp2(isLight ? '#f0f4f8' : '#0b1120', isLight ? 0.005 : 0.008);

    // 2. Ground Material
    if (groundMeshRef.current && groundMeshRef.current.material) {
      groundMeshRef.current.material.color.set(isLight ? '#cbd5e1' : '#0f172a');
      groundMeshRef.current.material.roughness = isLight ? 0.85 : 0.9;
    }

    // 3. Compass Ring
    if (compassRingMatRef.current) {
      compassRingMatRef.current.color.set(isLight ? '#64748b' : '#334155');
    }

    // 4. Lights
    if (hemiLightRef.current) {
      hemiLightRef.current.color.set(isLight ? '#ffffff' : '#bae6fd');
      hemiLightRef.current.groundColor.set(isLight ? '#94a3b8' : '#1e293b');
      hemiLightRef.current.intensity = isLight ? 1.1 : 0.85;
    }
    if (dirLightRef.current) {
      dirLightRef.current.color.set(isLight ? '#fffbeb' : '#ffffff');
      dirLightRef.current.intensity = isLight ? 2.2 : 1.8;
    }
    if (fillLightRef.current) {
      fillLightRef.current.color.set(isLight ? '#93c5fd' : '#38bdf8');
      fillLightRef.current.intensity = isLight ? 0.55 : 0.5;
    }

    // 5. Grid Helper Colors
    if (gridHelperRef.current) {
      const gridSize = currentGridSizeRef.current || 120;
      const divisions = gridSize <= 200 ? gridSize : Math.round(gridSize / 2);
      scene.remove(gridHelperRef.current);
      gridHelperRef.current.geometry.dispose();
      if (Array.isArray(gridHelperRef.current.material)) {
        gridHelperRef.current.material.forEach((m) => m.dispose());
      } else {
        gridHelperRef.current.material.dispose();
      }

      const centerColor = isLight ? '#0284c7' : '#38bdf8';
      const gridLineColor = isLight ? '#94a3b8' : '#1e293b';
      const newGrid = new THREE.GridHelper(gridSize, divisions, centerColor, gridLineColor);
      newGrid.position.y = 0;
      scene.add(newGrid);
      gridHelperRef.current = newGrid;
    }
  }, [currentTheme, isLight]);

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
      sphere.userData = {
        isWaypoint: true,
        pointId: pt.id || `pt-${idx}`,
        pointIndex: idx,
        pointName: pt.name || `Điểm ${idx + 1}`
      };
      group.add(sphere);

      // Outer halo ring around waypoint sphere
      const haloGeo = new THREE.RingGeometry(0.6, 0.72, 32);
      haloGeo.rotateX(-Math.PI / 2);
      const haloMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(pos);
      halo.userData = sphere.userData;
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

  // Update TransformControls Mode & Constraints based on Target & Mode
  useEffect(() => {
    const tc = transformControlsRef.current;
    if (!tc) return;

    tc.setMode(gizmoMode);

    if (gizmoMode === 'rotate') {
      tc.showX = false;
      tc.showY = true;
      tc.showZ = false;
    } else {
      if (activeDragTarget?.type === 'obstacle') {
        tc.showX = true;
        tc.showY = false;
        tc.showZ = true;
      } else {
        tc.showX = true;
        tc.showY = true;
        tc.showZ = true;
      }
    }
  }, [gizmoMode, activeDragTarget]);

  // Sync Dummy Target position & rotation when not actively dragging
  useEffect(() => {
    if (transformControlsRef.current?.dragging || !dummyTargetRef.current) return;

    const target = activeDragTarget;
    const loadH = loadConfig?.dims?.h || 2.6;

    if (!target || target.type === 'load') {
      const sRad = ((slewAngle + (craneHeading || 0)) * Math.PI) / 180;
      dummyTargetRef.current.position.set(
        workingRadius * Math.cos(sRad),
        (loadElevation !== undefined ? loadElevation : 1.5) + loadH * 0.5,
        workingRadius * Math.sin(sRad)
      );
      dummyTargetRef.current.rotation.set(0, ((loadRotation || 0) * Math.PI) / 180, 0);
    } else if (target.type === 'obstacle') {
      const obs = (obstacles || []).find((o) => o.id === target.id);
      if (obs) {
        if (obs.type === 'wall' && obs.boundaryPoints && obs.boundaryPoints.length >= 2) {
          let avgX = 0;
          let avgZ = 0;
          obs.boundaryPoints.forEach((p) => {
            avgX += p.x;
            avgZ += p.z;
          });
          avgX /= obs.boundaryPoints.length;
          avgZ /= obs.boundaryPoints.length;
          dummyTargetRef.current.position.set(avgX, (obs.height || 2.8) * 0.5, avgZ);
          dummyTargetRef.current.rotation.set(0, 0, 0);
        } else {
          const obsH = obs.height || 10.0;
          dummyTargetRef.current.position.set(obs.posX || 0, obsH * 0.5, obs.posZ || 0);
          dummyTargetRef.current.rotation.set(0, ((obs.rotationY || 0) * Math.PI) / 180, 0);
        }
      }
    } else if (target.type === 'waypoint') {
      const pt =
        (liftPoints || []).find((p) => p.id === target.id) ||
        (liftPoints || [])[target.index || 0];
      if (pt) {
        const sRad = (((pt.slew || 0) + (craneHeading || 0)) * Math.PI) / 180;
        dummyTargetRef.current.position.set(
          pt.radius * Math.cos(sRad),
          (pt.elevation !== undefined ? pt.elevation : 1.5) + loadH * 0.5,
          pt.radius * Math.sin(sRad)
        );
        dummyTargetRef.current.rotation.set(0, 0, 0);
      }
    }
  }, [
    activeDragTarget,
    workingRadius,
    slewAngle,
    loadElevation,
    loadRotation,
    loadConfig?.dims?.h,
    craneHeading,
    obstacles,
    liftPoints
  ]);

  // Interactive 3D Click Selection & Cursor Hover Feedback (Raycasting on Load, Obstacles, Waypoints)
  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;
    const dom = rendererRef.current.domElement;
    if (!dom) return;

    const pointerDownCoord = { x: 0, y: 0 };

    const handlePointerDown = (e) => {
      pointerDownCoord.x = e.clientX;
      pointerDownCoord.y = e.clientY;
    };

    const handlePointerMove = (e) => {
      if (pickingFencePoint || transformControlsRef.current?.dragging) return;
      const camera = cameraRef.current;
      if (!camera) return;

      const rect = dom.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      let isHovered = false;

      // 1. Hover check waypoints
      if (trajectoryGroupRef.current) {
        const hits = raycaster.intersectObjects(trajectoryGroupRef.current.children, true);
        if (
          hits.some((h) => {
            let cur = h.object;
            while (cur && cur !== trajectoryGroupRef.current) {
              if (cur.userData?.isWaypoint) return true;
              cur = cur.parent;
            }
            return false;
          })
        ) {
          isHovered = true;
        }
      }

      // 2. Hover check load / hook
      if (!isHovered && craneBuilderRef.current) {
        const loadObjs = [
          craneBuilderRef.current.loadGroup,
          craneBuilderRef.current.hookGroup
        ].filter(Boolean);
        if (raycaster.intersectObjects(loadObjs, true).length > 0) {
          isHovered = true;
        }
      }

      // 3. Hover check obstacles
      if (!isHovered && obstacleBuilderRef.current?.obstaclesGroup) {
        if (
          raycaster.intersectObjects(obstacleBuilderRef.current.obstaclesGroup.children, true)
            .length > 0
        ) {
          isHovered = true;
        }
      }

      dom.style.cursor = isHovered ? 'pointer' : 'default';
    };

    const handlePointerUp = (e) => {
      if (pickingFencePoint || transformControlsRef.current?.dragging) return;
      const dx = Math.abs(e.clientX - pointerDownCoord.x);
      const dy = Math.abs(e.clientY - pointerDownCoord.y);
      if (dx > 6 || dy > 6) return; // Orbit/pan drag, not a direct click

      const camera = cameraRef.current;
      if (!camera) return;

      const rect = dom.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // 1. Check Waypoint markers in trajectoryGroup
      if (trajectoryGroupRef.current) {
        const hits = raycaster.intersectObjects(trajectoryGroupRef.current.children, true);
        for (const hit of hits) {
          let obj = hit.object;
          while (obj && !obj.userData?.isWaypoint && obj !== trajectoryGroupRef.current) {
            obj = obj.parent;
          }
          if (obj && obj.userData?.isWaypoint) {
            const { pointId, pointIndex, pointName } = obj.userData;
            setActiveDragTarget({
              type: 'waypoint',
              id: pointId,
              index: pointIndex,
              name: pointName
            });
            setIsGizmoActive(true);
            return;
          }
        }
      }

      // 2. Check Load / Hook
      if (craneBuilderRef.current) {
        const loadObjs = [
          craneBuilderRef.current.loadGroup,
          craneBuilderRef.current.hookGroup
        ].filter(Boolean);
        const hits = raycaster.intersectObjects(loadObjs, true);
        if (hits.length > 0) {
          setActiveDragTarget({
            type: 'load',
            id: 'load',
            name: 'Kiện tải cẩu'
          });
          setIsGizmoActive(true);
          return;
        }
      }

      // 3. Check Obstacles in obstaclesGroup
      if (obstacleBuilderRef.current?.obstaclesGroup) {
        const hits = raycaster.intersectObjects(
          obstacleBuilderRef.current.obstaclesGroup.children,
          true
        );
        if (hits.length > 0) {
          let topObsGroup = hits[0].object;
          while (
            topObsGroup &&
            topObsGroup.parent &&
            topObsGroup.parent !== obstacleBuilderRef.current.obstaclesGroup
          ) {
            topObsGroup = topObsGroup.parent;
          }
          if (topObsGroup && topObsGroup.name) {
            const obs = (obstaclesRef.current || []).find((o) => o.id === topObsGroup.name);
            if (obs) {
              setActiveDragTarget({
                type: 'obstacle',
                id: obs.id,
                name: obs.name || 'Vật cản'
              });
              setIsGizmoActive(true);
              return;
            }
          }
        }
      }
    };

    dom.addEventListener('pointerdown', handlePointerDown);
    dom.addEventListener('pointermove', handlePointerMove);
    dom.addEventListener('pointerup', handlePointerUp);

    return () => {
      dom.removeEventListener('pointerdown', handlePointerDown);
      dom.removeEventListener('pointermove', handlePointerMove);
      dom.removeEventListener('pointerup', handlePointerUp);
    };
  }, [pickingFencePoint]);

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
    <div
      className={`relative w-full h-full select-none overflow-hidden rounded-xl border shadow-2xl flex flex-col transition-colors duration-300 ${
        isLight ? 'border-slate-300 bg-slate-100' : 'border-slate-700 bg-slate-950'
      }`}
    >
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

      {/* Top Overlay Bar: Desktop Mode (md and up) */}
      <div className="hidden md:flex absolute top-3 left-3 right-3 items-center justify-between pointer-events-none gap-2 z-20">
        {/* Crane & Model Tag */}
        <div
          className={`backdrop-blur-md px-3.5 py-2 rounded-lg border shadow-lg flex items-center gap-3 pointer-events-auto transition-colors ${
            isLight
              ? 'bg-white/95 border-slate-300 text-slate-800'
              : 'bg-slate-900/85 border-slate-700/80 text-slate-200'
          }`}
        >
          <div className="w-3 h-3 rounded-full animate-pulse shrink-0" style={{ backgroundColor: liftCategory.color }} />
          <div>
            <div className={`text-xs font-semibold tracking-wide ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
              {crane?.name || 'Chưa chọn cẩu'}
            </div>
            <div className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Bán kính: <span className={isLight ? 'text-sky-700 font-bold' : 'text-sky-400 font-bold'}>{workingRadius.toFixed(1)}m</span> | Góc cần:{' '}
              <span className={isLight ? 'text-amber-700 font-bold' : 'text-amber-400 font-bold'}>{boomAngle.toFixed(1)}°</span> | Cần:{' '}
              <span className={isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold'}>{boomLength.toFixed(1)}m</span>
            </div>
          </div>
        </div>

        {/* Live Safety Lift Percentage Pill */}
        <div
          className="px-4 py-2 rounded-lg backdrop-blur-md border shadow-lg flex items-center gap-3 pointer-events-auto shrink-0 transition-colors"
          style={{
            backgroundColor: isLight ? '#fffffffa' : liftCategory.bgColor,
            borderColor: liftCategory.color
          }}
        >
          <div className="text-right">
            <div className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>
              Khả năng tải (Lift %)
            </div>
            <div className="text-lg font-black font-mono tracking-tight" style={{ color: liftCategory.color }}>
              {liftPercentage > 0 ? `${liftPercentage.toFixed(1)}%` : 'NGOÀI BẢNG TẢI'}
            </div>
          </div>
          <div className={`h-8 w-px ${isLight ? 'bg-slate-300' : 'bg-slate-700/60'}`} />
          <div className="text-left text-xs font-mono">
            <div className={isLight ? 'text-slate-700' : 'text-slate-300'}>
              Tổng tải: <span className={`font-bold ${isLight ? 'text-slate-950' : 'text-white'}`}>{grossLoad.toFixed(2)}t</span>
            </div>
            <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Tải cho phép: <span className={`font-bold ${isLight ? 'text-sky-700' : 'text-sky-300'}`}>{ratedCapacity.toFixed(2)}t</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Overlay Bar: Mobile Mode (< md) */}
      <div className="md:hidden absolute top-2 left-2 right-2 flex items-start justify-between pointer-events-none gap-1.5 z-20">
        {/* Camera Selector Dropdown Pill */}
        <div className="relative pointer-events-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsCameraMenuOpen(!isCameraMenuOpen)}
            className={`backdrop-blur-md px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 shadow-xl active:scale-95 transition-all ${
              isLight
                ? 'bg-white/95 border-slate-300 text-slate-800'
                : 'bg-slate-900/95 border-slate-700/90 text-slate-200'
            }`}
          >
            <Camera size={13} className={isLight ? 'text-sky-600 shrink-0' : 'text-sky-400 shrink-0'} />
            <span>
              {activeCameraView === '3d' && '3D Tự do'}
              {activeCameraView === 'top' && 'Mặt bằng'}
              {activeCameraView === 'side' && 'Mặt bên'}
              {activeCameraView === 'cab' && 'Buồng lái'}
              {activeCameraView === 'load' && 'Tải cẩu'}
            </span>
            <ChevronDown size={12} className={`${isLight ? 'text-slate-500' : 'text-slate-400'} transition-transform ${isCameraMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isCameraMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={() => setIsCameraMenuOpen(false)}
              />
              <div
                className={`absolute left-0 top-full mt-1 backdrop-blur-md p-2 rounded-xl border shadow-2xl flex flex-col gap-1.5 min-w-[210px] max-w-[230px] z-50 animate-in fade-in duration-150 transition-colors ${
                  isLight
                    ? 'bg-white/95 border-slate-300 text-slate-800'
                    : 'bg-slate-900/95 border-slate-700 text-slate-200'
                }`}
              >
                {/* Camera View Angle Presets in 2-Column Grid */}
                <div className="text-[9px] font-bold text-slate-400 px-1 uppercase tracking-wider font-mono">
                  Góc nhìn camera:
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => { setCameraPreset('3d'); setIsCameraMenuOpen(false); }}
                    className={`px-2 py-1.5 rounded-lg font-medium text-left flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeCameraView === '3d'
                        ? (isLight ? 'bg-sky-600 text-white font-bold' : 'bg-sky-500 text-white font-bold')
                        : (isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800')
                    }`}
                  >
                    <Compass size={12} className="shrink-0" />
                    <span className="truncate">3D Tự do</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setCameraPreset('top'); setIsCameraMenuOpen(false); }}
                    className={`px-2 py-1.5 rounded-lg font-medium text-left flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeCameraView === 'top'
                        ? (isLight ? 'bg-sky-600 text-white font-bold' : 'bg-sky-500 text-white font-bold')
                        : (isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800')
                    }`}
                  >
                    <Layers size={12} className="shrink-0" />
                    <span className="truncate">Mặt bằng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setCameraPreset('side'); setIsCameraMenuOpen(false); }}
                    className={`px-2 py-1.5 rounded-lg font-medium text-left flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeCameraView === 'side'
                        ? (isLight ? 'bg-sky-600 text-white font-bold' : 'bg-sky-500 text-white font-bold')
                        : (isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800')
                    }`}
                  >
                    <Sliders size={12} className="shrink-0" />
                    <span className="truncate">Mặt bên</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setCameraPreset('cab'); setIsCameraMenuOpen(false); }}
                    className={`px-2 py-1.5 rounded-lg font-medium text-left flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeCameraView === 'cab'
                        ? (isLight ? 'bg-sky-600 text-white font-bold' : 'bg-sky-500 text-white font-bold')
                        : (isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800')
                    }`}
                  >
                    <Eye size={12} className="shrink-0" />
                    <span className="truncate">Buồng lái</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setCameraPreset('load'); setIsCameraMenuOpen(false); }}
                    className={`col-span-2 px-2 py-1.5 rounded-lg font-medium text-left flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeCameraView === 'load'
                        ? (isLight ? 'bg-sky-600 text-white font-bold' : 'bg-sky-500 text-white font-bold')
                        : (isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800')
                    }`}
                  >
                    <Box size={12} className="shrink-0" />
                    <span className="truncate">Bám sát tải cẩu</span>
                  </button>
                </div>

                <div className={`h-px my-0.5 ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />

                {/* Quick Utilities in 2-Column Grid */}
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => { setIsGizmoActive(!isGizmoActive); setIsCameraMenuOpen(false); }}
                    className={`px-2 py-1.5 rounded-lg font-medium text-left flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isGizmoActive
                        ? 'bg-rose-600 text-white font-bold'
                        : (isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800')
                    }`}
                  >
                    <Move3d size={12} className="shrink-0" />
                    <span className="truncate">{isGizmoActive ? 'Tắt kéo' : 'Kéo 3D'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { handleToggleTheme(); setIsCameraMenuOpen(false); }}
                    className={`px-2 py-1.5 rounded-lg font-bold text-left flex items-center gap-1.5 cursor-pointer transition-colors ${
                      isLight
                        ? 'text-slate-800 bg-slate-100 hover:bg-slate-200'
                        : 'text-sky-300 bg-sky-950/70 hover:bg-sky-900/70'
                    }`}
                  >
                    {isLight ? <Moon size={12} className="text-slate-700 shrink-0" /> : <Sun size={12} className="text-amber-400 shrink-0" />}
                    <span className="truncate">{isLight ? 'Nền Tối' : 'Nền Sáng'}</span>
                  </button>
                </div>
              </div>
          </>
        )}
      </div>

        {/* Compact Mobile Telemetry Card */}
        <div
          className={`backdrop-blur-md px-2 py-1 rounded-lg border shadow-lg text-[10px] font-mono pointer-events-auto text-right transition-colors ${
            isLight
              ? 'bg-white/95 border-slate-300 text-slate-800'
              : 'bg-slate-900/90 border-slate-700/80 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-1 justify-end">
            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>R:</span>
            <b className={isLight ? 'text-sky-700' : 'text-sky-400'}>{workingRadius.toFixed(1)}m</b>
            <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>|</span>
            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Góc:</span>
            <b className={isLight ? 'text-amber-700' : 'text-amber-400'}>{boomAngle.toFixed(0)}°</b>
            <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>|</span>
            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Cần:</span>
            <b className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>{boomLength.toFixed(0)}m</b>
          </div>
          <div className="flex items-center gap-1 justify-end text-[9px] mt-0.5">
            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>
              Tải: <b className={isLight ? 'text-slate-900' : 'text-slate-200'}>{grossLoad.toFixed(1)}t</b> / <b className={isLight ? 'text-sky-700' : 'text-sky-300'}>{ratedCapacity.toFixed(1)}t</b>
            </span>
            <span
              className="px-1 py-0.2 rounded font-bold ml-1"
              style={{
                backgroundColor: liftCategory.bgColor,
                color: liftCategory.color
              }}
            >
              {liftPercentage > 0 ? `${liftPercentage.toFixed(0)}%` : 'NGOÀI'}
            </span>
          </div>
        </div>
      </div>

      {/* Floating 3D Drag Target Selector HUD Banner */}
      {isGizmoActive && (
        <div
          className={`absolute top-12 sm:top-3.5 left-1/2 -translate-x-1/2 z-35 backdrop-blur-md px-2 sm:px-3 py-1.5 rounded-xl border shadow-2xl flex items-center gap-1.5 sm:gap-2 max-w-[calc(100%-1rem)] pointer-events-auto transition-colors ${
            isLight
              ? 'bg-white/95 border-rose-300 text-slate-800 shadow-rose-900/10'
              : 'bg-slate-900/95 border-rose-500/50 text-slate-100 shadow-black/70'
          }`}
        >
          {/* Target Selector Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTargetMenuOpen(!isTargetMenuOpen)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                isLight
                  ? 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100'
                  : 'bg-rose-950/60 border-rose-500/60 text-rose-200 hover:bg-rose-900/60'
              }`}
              title="Nhấp để đổi đối tượng kéo chuột 3D (Tải cẩu, Vật cản, Điểm cẩu)"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse inline-block" />
              {activeDragTarget.type === 'load' && <Box size={13} className="text-sky-400 shrink-0" />}
              {activeDragTarget.type === 'waypoint' && <MapPin size={13} className="text-amber-400 shrink-0" />}
              {activeDragTarget.type === 'obstacle' &&
                getObstacleIcon(obstacles.find((o) => o.id === activeDragTarget.id)?.type, 13)}
              <span className="max-w-[110px] sm:max-w-[170px] truncate text-[11px] sm:text-xs">
                {activeDragTarget.type === 'load'
                  ? 'Kiện tải cẩu'
                  : activeDragTarget.type === 'obstacle'
                  ? obstacles.find((o) => o.id === activeDragTarget.id)?.name || activeDragTarget.name
                  : liftPoints.find((p) => p.id === activeDragTarget.id)?.name || activeDragTarget.name}
              </span>
              <ChevronDown
                size={12}
                className={`transition-transform shrink-0 ${isTargetMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {isTargetMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsTargetMenuOpen(false)}
                />
                <div
                  className={`absolute top-full left-0 sm:left-1/2 sm:-translate-x-1/2 mt-1.5 w-64 sm:w-80 max-h-84 overflow-y-auto rounded-xl border shadow-2xl z-50 p-1.5 flex flex-col gap-1 text-xs backdrop-blur-md transition-colors ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800 shadow-slate-400/30'
                      : 'bg-slate-900 border-slate-700 text-slate-200 shadow-black/80'
                  }`}
                >
                  <div
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 font-mono border-b ${
                      isLight ? 'text-slate-500 border-slate-200' : 'text-slate-400 border-slate-800'
                    }`}
                  >
                    Chọn đối tượng kéo chuột 3D
                  </div>

                  {/* 1. Kiện tải */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDragTarget({ type: 'load', id: 'load', name: 'Kiện tải cẩu' });
                      setIsTargetMenuOpen(false);
                    }}
                    className={`w-full px-2 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                      activeDragTarget.type === 'load'
                        ? isLight
                          ? 'bg-rose-100 text-rose-900 font-bold'
                          : 'bg-rose-950/70 text-rose-200 font-bold border border-rose-500/40'
                        : isLight
                        ? 'hover:bg-slate-100 text-slate-700'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Box size={13} className="text-sky-400 shrink-0" />
                      <span className="truncate font-medium">Kiện tải cẩu</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-60 ml-2 shrink-0">
                      R:{workingRadius.toFixed(1)}m | {Math.round(slewAngle)}°
                    </span>
                  </button>

                  {/* 2. Danh sách Vật cản & Công trình */}
                  <div
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 pt-1.5 pb-0.5 font-mono ${
                      isLight ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Vật cản &amp; Công trình ({obstacles.length})
                  </div>
                  {obstacles.map((obs) => {
                    const isSelected = activeDragTarget.type === 'obstacle' && activeDragTarget.id === obs.id;
                    return (
                      <button
                        key={obs.id}
                        type="button"
                        onClick={() => {
                          setActiveDragTarget({
                            type: 'obstacle',
                            id: obs.id,
                            name: obs.name || 'Vật cản'
                          });
                          setIsTargetMenuOpen(false);
                        }}
                        className={`w-full px-2 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                          isSelected
                            ? isLight
                              ? 'bg-rose-100 text-rose-900 font-bold'
                              : 'bg-rose-950/70 text-rose-200 font-bold border border-rose-500/40'
                            : isLight
                            ? 'hover:bg-slate-100 text-slate-700'
                            : 'hover:bg-slate-800 text-slate-300'
                        } ${!obs.enabled ? 'opacity-40' : ''}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {getObstacleIcon(obs.type, 13)}
                          <span className="truncate">{obs.name}</span>
                          {!obs.enabled && <span className="text-[9px] text-slate-500">(Ẩn)</span>}
                        </div>
                        <span className="text-[10px] font-mono opacity-60 ml-2 shrink-0">
                          X:{(obs.posX || 0).toFixed(1)}m, Z:{(obs.posZ || 0).toFixed(1)}m
                        </span>
                      </button>
                    );
                  })}

                  {/* 3. Danh sách Điểm cẩu quỹ đạo */}
                  {liftPoints && liftPoints.length > 0 && (
                    <>
                      <div
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 pt-1.5 pb-0.5 font-mono ${
                          isLight ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        Điểm cẩu quỹ đạo ({liftPoints.length})
                      </div>
                      {liftPoints.map((pt, idx) => {
                        const isSelected =
                          activeDragTarget.type === 'waypoint' &&
                          (activeDragTarget.id === pt.id || activeDragTarget.index === idx);
                        return (
                          <button
                            key={pt.id || idx}
                            type="button"
                            onClick={() => {
                              setActiveDragTarget({
                                type: 'waypoint',
                                id: pt.id,
                                index: idx,
                                name: pt.name || `Điểm ${idx + 1}`
                              });
                              setIsTargetMenuOpen(false);
                            }}
                            className={`w-full px-2 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                              isSelected
                                ? isLight
                                  ? 'bg-rose-100 text-rose-900 font-bold'
                                : 'bg-rose-950/70 text-rose-200 font-bold border border-rose-500/40'
                                : isLight
                                ? 'hover:bg-slate-100 text-slate-700'
                                : 'hover:bg-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <MapPin size={13} className="text-amber-400 shrink-0" />
                              <span className="truncate">{pt.name || `Điểm ${idx + 1}`}</span>
                            </div>
                            <span className="text-[10px] font-mono opacity-60 ml-2 shrink-0">
                              R:{(pt.radius || 0).toFixed(1)}m | {Math.round(pt.slew || 0)}°
                            </span>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Coordinates readout badge */}
          <div
            className={`hidden sm:flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded border ${
              isLight
                ? 'bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-slate-950/60 border-slate-800 text-slate-300'
            }`}
          >
            {activeDragTarget.type === 'load' && (
              <>
                <span className="opacity-70">R:</span>
                <b className={isLight ? 'text-sky-700' : 'text-sky-400'}>{workingRadius.toFixed(1)}m</b>
                <span className="opacity-30">|</span>
                <span className="opacity-70">Góc:</span>
                <b className={isLight ? 'text-amber-700' : 'text-amber-400'}>{Math.round(slewAngle)}°</b>
                <span className="opacity-30">|</span>
                <span className="opacity-70">Cao:</span>
                <b className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>{(loadElevation || 0).toFixed(1)}m</b>
              </>
            )}
            {activeDragTarget.type === 'obstacle' && (() => {
              const currentObs = obstacles.find((o) => o.id === activeDragTarget.id);
              if (!currentObs) return null;
              return (
                <>
                  <span className="opacity-70">X:</span>
                  <b className={isLight ? 'text-sky-700' : 'text-sky-400'}>{(currentObs.posX || 0).toFixed(1)}m</b>
                  <span className="opacity-30">|</span>
                  <span className="opacity-70">Z:</span>
                  <b className={isLight ? 'text-sky-700' : 'text-sky-400'}>{(currentObs.posZ || 0).toFixed(1)}m</b>
                  <span className="opacity-30">|</span>
                  <span className="opacity-70">Góc:</span>
                  <b className={isLight ? 'text-amber-700' : 'text-amber-400'}>{Math.round(currentObs.rotationY || 0)}°</b>
                </>
              );
            })()}
            {activeDragTarget.type === 'waypoint' && (() => {
              const currentPt =
                liftPoints.find((p) => p.id === activeDragTarget.id) ||
                liftPoints[activeDragTarget.index || 0];
              if (!currentPt) return null;
              return (
                <>
                  <span className="opacity-70">R:</span>
                  <b className={isLight ? 'text-sky-700' : 'text-sky-400'}>{(currentPt.radius || 0).toFixed(1)}m</b>
                  <span className="opacity-30">|</span>
                  <span className="opacity-70">Góc:</span>
                  <b className={isLight ? 'text-amber-700' : 'text-amber-400'}>{Math.round(currentPt.slew || 0)}°</b>
                  <span className="opacity-30">|</span>
                  <span className="opacity-70">Cao:</span>
                  <b className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>{(currentPt.elevation || 0).toFixed(1)}m</b>
                </>
              );
            })()}
          </div>

          {/* Gizmo Mode Toggle (Translate vs Rotate) */}
          <div
            className={`flex items-center rounded-lg border p-0.5 text-[11px] ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-950/80 border-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={() => setGizmoMode('translate')}
              title="Chế độ di chuyển (Mũi tên X, Z, Y)"
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 font-medium transition-colors cursor-pointer ${
                gizmoMode === 'translate'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:bg-slate-200'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Move3d size={11} className="shrink-0" />
              <span className="hidden sm:inline">Dời</span>
            </button>
            <button
              type="button"
              onClick={() => setGizmoMode('rotate')}
              title="Chế độ xoay góc 3D"
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 font-medium transition-colors cursor-pointer ${
                gizmoMode === 'rotate'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:bg-slate-200'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <RotateCw size={11} className="shrink-0" />
              <span className="hidden sm:inline">Xoay</span>
            </button>
          </div>

          {/* Quick Rotate +45° Button (Obstacles & Load) */}
          {(activeDragTarget.type === 'obstacle' || activeDragTarget.type === 'load') && (
            <button
              type="button"
              onClick={() => handleRotateTarget(45)}
              title="Xoay nhanh +45° quanh trục thẳng đứng"
              className={`px-1.5 py-0.5 rounded border text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                isLight
                  ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-emerald-700'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400'
              }`}
            >
              <RotateCw size={10} className="shrink-0" />
              <span>+45°</span>
            </button>
          )}

          {/* Quick Return to Load button if obstacle or waypoint is active */}
          {activeDragTarget.type !== 'load' && (
            <button
              type="button"
              onClick={() => setActiveDragTarget({ type: 'load', id: 'load', name: 'Kiện tải cẩu' })}
              title="Chuyển nhanh về Kiện tải cẩu"
              className={`hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] cursor-pointer transition-colors ${
                isLight
                  ? 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
                  : 'bg-sky-950/50 border-sky-800/60 text-sky-300 hover:bg-sky-900/50'
              }`}
            >
              <Box size={11} className="shrink-0" />
              <span>Về Tải</span>
            </button>
          )}

          {/* Close Gizmo Button */}
          <button
            type="button"
            onClick={() => setIsGizmoActive(false)}
            title="Tắt kéo chuột 3D (Đóng Gizmo)"
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              isLight
                ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <X size={13} className="shrink-0" />
          </button>
        </div>
      )}

      {/* Floating Camera View Switcher Buttons */}
      {/* Desktop Mode (md and up): docked on left side */}
      <div
        className={`hidden md:flex absolute left-3 top-20 z-30 backdrop-blur-md p-1.5 rounded-xl border shadow-2xl flex-col gap-1 pointer-events-auto min-w-[110px] transition-colors ${
          isLight
            ? 'bg-white/95 border-slate-300 text-slate-800'
            : 'bg-slate-900/90 border-slate-700/80 text-slate-200'
        }`}
      >
        <div
          className={`text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider font-mono border-b text-center select-none ${
            isLight ? 'text-slate-500 border-slate-200' : 'text-slate-400 border-slate-800'
          }`}
        >
          Góc nhìn
        </div>
        <button
          onClick={() => setCameraPreset('3d')}
          title="Góc nhìn 3D Tự do"
          className={`w-full px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeCameraView === '3d'
              ? (isLight ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30' : 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/25')
              : (isLight ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white')
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
              ? (isLight ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30' : 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/25')
              : (isLight ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white')
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
              ? (isLight ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30' : 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/25')
              : (isLight ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white')
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
              ? (isLight ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30' : 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/25')
              : (isLight ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white')
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
              ? (isLight ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30' : 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/25')
              : (isLight ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white')
          }`}
        >
          <Box size={14} className="shrink-0" />
          <span>Tải cẩu</span>
        </button>

        <div className={`h-px my-0.5 ${isLight ? 'bg-slate-200' : 'bg-slate-700/60'}`} />

        <button
          onClick={() => setIsGizmoActive(!isGizmoActive)}
          title="Bật/Tắt mũi tên kéo thả 3D trực tiếp bằng chuột để chỉnh bán kính, góc quay toa và cao độ"
          className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            isGizmoActive
              ? 'bg-rose-600 text-white shadow-lg animate-pulse'
              : (isLight ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white')
          }`}
        >
          <Move3d size={14} className="shrink-0" />
          <span>{isGizmoActive ? 'Đang kéo 3D' : 'Kéo chuột'}</span>
        </button>

        <div className={`h-px my-0.5 ${isLight ? 'bg-slate-200' : 'bg-slate-700/60'}`} />

        {/* 3D Viewport Theme Toggle (Light / Dark) */}
        <button
          type="button"
          onClick={handleToggleTheme}
          title={isLight ? 'Chuyển sang Chế độ Nền Tối CAD (Dark Mode)' : 'Chuyển sang Chế độ Nền Sáng Ban ngày (Light Mode)'}
          className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-sm'
              : 'bg-sky-950/70 hover:bg-sky-900/70 text-sky-300 border border-sky-800/60 shadow-sm'
          }`}
        >
          {isLight ? (
            <>
              <Moon size={14} className="text-slate-700 shrink-0" />
              <span>Nền Tối CAD</span>
            </>
          ) : (
            <>
              <Sun size={14} className="text-amber-400 shrink-0" />
              <span>Nền Sáng</span>
            </>
          )}
        </button>
      </div>

      {/* Trajectory Simulation & Play Controls + Real-Time Load Rotation */}
      <div
        className={`absolute bottom-2.5 sm:bottom-4 right-2 sm:right-4 z-30 backdrop-blur-md p-1 sm:p-1.5 rounded-xl border shadow-2xl flex items-center gap-1 sm:gap-2 shrink-0 max-w-[calc(100%-1rem)] pointer-events-auto transition-colors ${
          isLight
            ? 'bg-white/95 border-slate-300 text-slate-800'
            : 'bg-slate-900/95 border-slate-700/80 text-slate-200'
        }`}
      >
        {/* Real-time Direct Load Rotation Quick Control */}
        <div
          className={`flex items-center gap-1 sm:gap-1.5 border rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs transition-colors ${
            isLight
              ? 'bg-slate-100 border-slate-300 text-slate-800'
              : 'bg-slate-950/70 border-slate-700/60 text-slate-200'
          }`}
        >
          <RotateCw size={12} className={isLight ? 'text-emerald-600 shrink-0' : 'text-emerald-400 shrink-0'} />
          <span className={`text-[11px] font-medium hidden sm:inline ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Xoay tải:
          </span>
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
            className={`w-12 sm:w-14 border rounded px-1 py-0.5 text-[11px] sm:text-xs font-mono font-bold text-center focus:border-emerald-500 ${
              isLight
                ? 'bg-white border-slate-300 text-emerald-700'
                : 'bg-slate-900 border-slate-700 text-emerald-400'
            }`}
          />
          <div className="hidden sm:flex items-center gap-0.5">
            {[0, 90, 180, 270].map((deg) => (
              <button
                key={deg}
                type="button"
                onClick={() => {
                  if (setLoadRotation) setLoadRotation(deg);
                }}
                className={`text-[9px] font-mono px-1 py-0.5 rounded border transition-colors cursor-pointer ${
                  (loadRotation || 0) === deg
                    ? (isLight
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold')
                    : (isLight
                        ? 'bg-white text-slate-600 border-slate-300 hover:text-slate-900'
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300')
                }`}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setIsSimulating(!isSimulating)}
          className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold rounded-lg flex items-center gap-1 sm:gap-1.5 shadow transition-all whitespace-nowrap cursor-pointer ${
            isSimulating
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {isSimulating ? <Pause size={13} className="shrink-0" /> : <Play size={13} className="shrink-0" />}
          <span className="hidden sm:inline">{isSimulating ? 'Tạm dừng mô phỏng' : 'Chạy thử đường cẩu (Pick → Set)'}</span>
          <span className="sm:hidden">{isSimulating ? 'Dừng' : 'Mô phỏng'}</span>
        </button>

        {/* Short Video Export Button */}
        {onOpenVideoModal && (
          <button
            onClick={onOpenVideoModal}
            className="px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold rounded-lg flex items-center gap-1 sm:gap-1.5 shadow transition-all whitespace-nowrap cursor-pointer bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
            title="Xuất video ngắn mô phỏng nâng hạ 3D (MP4 / Full HD)"
          >
            <Video size={13} className="shrink-0" />
            <span className="hidden sm:inline">Quay video 3D</span>
            <span className="sm:hidden">Video</span>
          </button>
        )}
      </div>

      {/* Floating Outrigger Pressure Legend (Right-aligned stacked above simulation toolbar) */}
      <div
        className={`absolute bottom-16 sm:bottom-18 right-2 sm:right-4 z-20 backdrop-blur-md px-2.5 py-1 rounded-lg border text-[10px] sm:text-[11px] flex items-center gap-2.5 pointer-events-none hidden md:flex transition-colors select-none shadow-md ${
          isLight
            ? 'bg-white/95 border-slate-300 text-slate-700 shadow-slate-200/50'
            : 'bg-slate-900/90 border-slate-700/80 text-slate-300 shadow-black/40'
        }`}
      >
        <span className="font-semibold text-slate-400">Chân chống:</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0 ring-1 ring-emerald-500/30" />
          <span>An toàn (&lt;85%)</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block shrink-0 ring-1 ring-amber-500/30" />
          <span>Cảnh báo (85-100%)</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shrink-0 ring-1 ring-rose-500/30" />
          <span>Lún sụt (&gt;100%)</span>
        </span>
      </div>
    </div>
  );
}

