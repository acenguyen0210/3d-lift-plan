import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CraneSceneBuilder } from '../utils/threeCraneBuilder';
import { Obstacle3DBuilder } from '../utils/obstacle3DBuilder';
import {
  Camera,
  Compass,
  Layers,
  Eye,
  Box,
  CheckCircle,
  X,
  RotateCcw,
  Maximize2,
  Sun,
  Moon
} from 'lucide-react';

export default function Report3DAdjustModal({
  isOpen,
  onClose,
  viewKey,
  viewName,
  defaultPreset = '3d',
  crane,
  boomLength = 23,
  workingRadius = 8,
  slewAngle = 35,
  craneHeading = 0,
  boomAngle = 60,
  hookElevation = 6,
  loadElevation = 1.5,
  loadRotation = 0,
  loadConfig,
  riggingConfig,
  outriggerReactions,
  soilCapacityTonsPerM2 = 25,
  matLength = 2.2,
  matWidth = 2.2,
  obstacles = [],
  liftPoints = [],
  onSaveView,
  onSwitchToExternal
}) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameRef = useRef(null);
  const craneBuilderRef = useRef(null);
  const obstacleBuilderRef = useRef(null);
  const trajectoryGroupRef = useRef(null);
  const groundMeshRef = useRef(null);
  const gridHelperRef = useRef(null);
  const currentGridSizeRef = useRef(120);
  const hemiLightRef = useRef(null);
  const dirLightRef = useRef(null);
  const fillLightRef = useRef(null);

  const [modalTheme, setModalTheme] = useState(() => {
    try {
      return localStorage.getItem('3d_lift_plan_viewport_theme') || 'dark';
    } catch (e) {
      return 'dark';
    }
  });
  const isLight = modalTheme === 'light';
  const isLightRef = useRef(isLight);
  isLightRef.current = isLight;

  const [activePreset, setActivePreset] = useState(defaultPreset);

  // Sync theme and activePreset whenever modal opens or defaultPreset changes
  useEffect(() => {
    if (isOpen) {
      setActivePreset(defaultPreset);
      try {
        const saved = localStorage.getItem('3d_lift_plan_viewport_theme');
        if (saved) setModalTheme(saved);
      } catch (e) {}
    }
  }, [defaultPreset, isOpen]);

  const setCameraPreset = (view) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    setActivePreset(view);
    cam.up.set(0, 1, 0);

    switch (view) {
      case 'top':
        // 0.1 offset avoids polar gimbal lock in OrbitControls
        cam.position.set(0.1, Math.max(boomLength * 1.35, 32), 0.1);
        ctrl.target.set(0, 0, 0);
        break;
      case 'side':
        cam.position.set(0.1, Math.max(boomLength * 0.35, 10), Math.max(boomLength * 1.05, 28));
        ctrl.target.set(0, Math.max(boomLength * 0.25, 7), 0);
        break;
      case 'front':
        cam.position.set(Math.max(boomLength * 1.05, 28), Math.max(boomLength * 0.35, 10), 0.1);
        ctrl.target.set(0, Math.max(boomLength * 0.25, 7), 0);
        break;
      case 'load': {
        if (craneBuilderRef.current?.loadGroup) {
          const lp = craneBuilderRef.current.loadGroup.position;
          const totalSlewRad = (-((craneHeading || 0) + (slewAngle || 0)) * Math.PI) / 180;
          const camOffsetX = 5.5 * Math.cos(totalSlewRad + Math.PI / 3);
          const camOffsetZ = 5.5 * Math.sin(totalSlewRad + Math.PI / 3);
          cam.position.set(lp.x + camOffsetX, lp.y + 3.0, lp.z + camOffsetZ);
          ctrl.target.set(lp.x, lp.y + 1.2, lp.z);
        } else {
          const totalRad = (((craneHeading || 0) + (slewAngle || 0)) * Math.PI) / 180;
          const lx = workingRadius * Math.cos(totalRad);
          const lz = workingRadius * Math.sin(totalRad);
          const ly = (loadElevation !== undefined ? loadElevation : 1.5) + (loadConfig?.dims?.h || 2.6) * 0.5;
          cam.position.set(lx + 4.5, ly + 2.5, lz + 4.5);
          ctrl.target.set(lx, ly, lz);
        }
        break;
      }
      case '3d':
      case 'iso':
      case 'current':
      default: {
        const isoDist = Math.max(boomLength * 0.85, 24);
        cam.position.set(isoDist * 0.72, isoDist * 0.55, isoDist * 0.78);
        ctrl.target.set(0, Math.min((loadElevation !== undefined ? loadElevation : 1.5) + 2, 8), 0);
        break;
      }
    }
    ctrl.update();
  };

  // Setup Three.js WebGL Scene when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 480;
    const lightMode = isLightRef.current;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(lightMode ? '#f0f4f8' : '#0b1120');
    scene.fog = new THREE.FogExp2(lightMode ? '#f0f4f8' : '#0b1120', lightMode ? 0.005 : 0.008);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 600);
    camera.position.set(24, 18, 28);
    cameraRef.current = camera;

    // 3. Renderer with preserveDrawingBuffer for high-res snapshot
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (err) {
      console.error('Failed to initialize WebGLRenderer in modal:', err);
      return;
    }

    // 4. OrbitControls with minPolarAngle to completely prevent gimbal lock
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minPolarAngle = 0.02; // Critical: prevents lock at phi=0
    controls.maxPolarAngle = Math.PI / 2 + 0.02; // Ground limit
    controls.minDistance = 3;
    controls.maxDistance = 250;
    controls.target.set(0, 5, 0);
    controlsRef.current = controls;

    // 5. Lighting
    const hemiLight = new THREE.HemisphereLight(
      lightMode ? '#ffffff' : '#bae6fd',
      lightMode ? '#94a3b8' : '#334155',
      lightMode ? 1.15 : 1.0
    );
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const dirLight = new THREE.DirectionalLight(lightMode ? '#fffbeb' : '#ffffff', lightMode ? 2.3 : 2.0);
    dirLight.position.set(30, 45, 25);
    dirLight.castShadow = true;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    const fillLight = new THREE.DirectionalLight(lightMode ? '#93c5fd' : '#38bdf8', lightMode ? 0.6 : 0.8);
    fillLight.position.set(-25, 20, -20);
    scene.add(fillLight);
    fillLightRef.current = fillLight;

    // 6. Ground & CAD Grid (dynamically sized to fit crane + obstacles + liftPoints)
    const groundGeo = new THREE.PlaneGeometry(240, 240);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: lightMode ? '#cbd5e1' : '#0f172a',
      roughness: lightMode ? 0.85 : 0.9,
      metalness: 0.1
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    groundMesh.position.y = -0.01;
    scene.add(groundMesh);
    groundMeshRef.current = groundMesh;

    const gridCenter = lightMode ? '#0284c7' : '#38bdf8';
    const gridLines = lightMode ? '#94a3b8' : '#1e293b';
    const gridHelper = new THREE.GridHelper(120, 120, gridCenter, gridLines);
    gridHelper.position.y = 0;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;
    currentGridSizeRef.current = 120;

    // 7. Builders & Trajectory Group
    const obsBuilder = new Obstacle3DBuilder(scene);
    obstacleBuilderRef.current = obsBuilder;

    const craneBuilder = new CraneSceneBuilder(scene);
    craneBuilderRef.current = craneBuilder;

    const trajGroup = new THREE.Group();
    scene.add(trajGroup);
    trajectoryGroupRef.current = trajGroup;

    // 8. Animation render loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // 9. Handle Resizing with ResizeObserver for perfect dimension tracking
    const updateSize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w > 0 && h > 0) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    };

    let resizeObserver = null;
    if (window.ResizeObserver && container) {
      resizeObserver = new ResizeObserver(() => {
        updateSize();
      });
      resizeObserver.observe(container);
    }
    window.addEventListener('resize', updateSize);

    setTimeout(updateSize, 50);

    return () => {
      window.removeEventListener('resize', updateSize);
      if (resizeObserver) resizeObserver.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (controlsRef.current) {
        try {
          controlsRef.current.dispose();
        } catch (e) {}
      }
      if (obsBuilder) {
        try {
          obsBuilder.clear();
        } catch (e) {}
      }
      if (craneBuilder) {
        try {
          craneBuilder.dispose();
        } catch (e) {}
      }
      if (trajGroup) {
        scene.remove(trajGroup);
      }
      if (rendererRef.current) {
        try {
          if (rendererRef.current.domElement && rendererRef.current.domElement.parentNode) {
            rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
          }
          rendererRef.current.dispose();
        } catch (e) {}
      }
    };
  }, [isOpen]);

  // Build Crane & Sync Kinematics (including craneHeading & loadRotation)
  useEffect(() => {
    if (!isOpen || !craneBuilderRef.current || !crane) return;
    try {
      craneBuilderRef.current.buildCrane(crane, {
        matLength: matLength || 2.2,
        matWidth: matWidth || 2.2,
        loadType: loadConfig?.type || 'box',
        loadDims: loadConfig?.dims || { l: 4.0, w: 2.4, h: 2.6 },
        slingAngleDeg: riggingConfig?.slingAngleDeg || 60,
        slingType: riggingConfig?.slingType || 'wire_rope',
        slingLegs: riggingConfig?.slingLegs !== undefined ? riggingConfig.slingLegs : 4
      });
      craneBuilderRef.current.updateKinematics({
        craneHeading: craneHeading || 0,
        slewAngleDeg: slewAngle || 0,
        boomAngleDeg: boomAngle || 60,
        boomLength: boomLength || 23,
        minBoomLength: crane?.specs?.minBoomLength || 10,
        maxBoomLength: crane?.specs?.maxBoomLength || 40,
        hookElevation: hookElevation !== undefined ? hookElevation : 6,
        loadElevation: loadElevation !== undefined ? loadElevation : 1.5,
        loadRotationDeg: loadRotation,
        outriggerReactions: outriggerReactions || {},
        soilCapacityTonsPerM2: soilCapacityTonsPerM2 || 25,
        matArea: (matLength || 2.2) * (matWidth || 2.2)
      });
    } catch (e) {
      console.warn('Error syncing crane in Report3DAdjustModal:', e);
    }
  }, [
    isOpen,
    crane,
    matLength,
    matWidth,
    loadConfig,
    riggingConfig,
    craneHeading,
    slewAngle,
    boomAngle,
    boomLength,
    hookElevation,
    loadElevation,
    loadRotation,
    outriggerReactions,
    soilCapacityTonsPerM2
  ]);

  // Build Obstacles in Modal
  useEffect(() => {
    if (!isOpen || !obstacleBuilderRef.current) return;
    try {
      obstacleBuilderRef.current.clear();
      if (obstacles && Array.isArray(obstacles)) {
        obstacles.forEach((obs) => {
          if (obs && obs.enabled !== false) {
            obstacleBuilderRef.current.buildObstacle(obs);
          }
        });
      }
    } catch (e) {
      console.warn('Error building obstacles in modal:', e);
    }
  }, [isOpen, obstacles]);

  // Build Multi-Waypoint Trajectory Curve & Point Markers (Pick / Waypoints / Set)
  useEffect(() => {
    if (!isOpen || !trajectoryGroupRef.current || !sceneRef.current) return;
    const group = trajectoryGroupRef.current;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    const points = Array.isArray(liftPoints) ? liftPoints : [];
    if (points.length === 0) return;

    const loadH = loadConfig?.dims?.h || 2.6;
    const loadCenterOffsetY = loadH * 0.5;

    const getPointWorldPos = (r, sDeg, elev) => {
      const sRad = (((sDeg || 0) + (craneHeading || 0)) * Math.PI) / 180;
      return new THREE.Vector3(
        r * Math.cos(sRad),
        (elev !== undefined ? elev : 1.5) + loadCenterOffsetY,
        r * Math.sin(sRad)
      );
    };

    if (points.length >= 2) {
      const path3DPoints = [];
      const groundTrackPoints = [];
      const stepsPerSegment = 24;

      for (let i = 0; i < points.length - 1; i++) {
        const pA = points[i];
        const pB = points[i + 1];

        let slewDiff = (pB.slew || 0) - (pA.slew || 0);
        if (slewDiff > 180) slewDiff -= 360;
        if (slewDiff < -180) slewDiff += 360;

        for (let s = 0; s <= stepsPerSegment; s++) {
          if (i > 0 && s === 0) continue;

          const t = s / stepsPerSegment;
          const easeT = 0.5 - 0.5 * Math.cos(t * Math.PI);

          const r = (pA.radius || 0) + ((pB.radius || 0) - (pA.radius || 0)) * easeT;
          const slew = ((pA.slew || 0) + slewDiff * easeT + 360) % 360;
          const elev = (pA.elevation ?? 1.5) + ((pB.elevation ?? 1.5) - (pA.elevation ?? 1.5)) * easeT;

          const pos3D = getPointWorldPos(r, slew, elev);
          path3DPoints.push(pos3D);
          groundTrackPoints.push(new THREE.Vector3(pos3D.x, 0.05, pos3D.z));
        }
      }

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
          console.warn('TubeGeometry fallback in modal:', err);
        }

        const pathGeo = new THREE.BufferGeometry().setFromPoints(path3DPoints);
        const pathMat = new THREE.LineBasicMaterial({
          color: '#ffffff',
          transparent: true,
          opacity: 0.85
        });
        const pathLine = new THREE.Line(pathGeo, pathMat);
        group.add(pathLine);

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
    }

    // Waypoint Pin Markers, Halos, Plumb Drop Lines, Ground Footprints
    points.forEach((pt, idx) => {
      const pos = getPointWorldPos(pt.radius || 0, pt.slew || 0, pt.elevation);
      const isStart = idx === 0;
      const isEnd = idx === points.length - 1;
      const color = isStart ? '#10b981' : isEnd && points.length > 1 ? '#ef4444' : '#f59e0b';

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

      const haloGeo = new THREE.RingGeometry(0.6, 0.72, 32);
      haloGeo.rotateX(-Math.PI / 2);
      const haloMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(pos);
      group.add(halo);

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
  }, [isOpen, liftPoints, loadConfig?.dims?.h, craneHeading]);

  // Dynamic Ground & Grid sizing + Theme color sync without resetting camera angle
  useEffect(() => {
    if (!isOpen || !sceneRef.current || !groundMeshRef.current || !gridHelperRef.current) return;
    const scene = sceneRef.current;

    let maxDist = 55;
    if (workingRadius) maxDist = Math.max(maxDist, workingRadius + 15);
    if (boomLength) maxDist = Math.max(maxDist, boomLength + 15);
    if (Array.isArray(liftPoints)) {
      liftPoints.forEach((pt) => {
        if (pt?.radius) maxDist = Math.max(maxDist, pt.radius + 15);
      });
    }
    if (Array.isArray(obstacles)) {
      obstacles.forEach((obs) => {
        if (obs?.enabled === false) return;
        if (obs.type === 'wall' && Array.isArray(obs.boundaryPoints)) {
          obs.boundaryPoints.forEach((p) => {
            const d = Math.hypot(p.x, p.z) + 12;
            if (d > maxDist) maxDist = d;
          });
        } else {
          const halfDim =
            Math.max(obs.width || 0, obs.length || 0, obs.diameter || 0, obs.wireSpan || 0) * 0.5;
          const d = Math.hypot(obs.posX || 0, obs.posZ || 0) + halfDim + 12;
          if (d > maxDist) maxDist = d;
        }
      });
    }

    const requiredGridSize = Math.max(120, Math.ceil((maxDist * 2) / 20) * 20);
    currentGridSizeRef.current = requiredGridSize;
    const divisions = requiredGridSize <= 200 ? requiredGridSize : Math.round(requiredGridSize / 2);
    const groundSize = Math.max(requiredGridSize * 1.6, 250);

    // Update theme colors in-place
    scene.background = new THREE.Color(isLight ? '#f0f4f8' : '#0b1120');
    if (scene.fog) {
      scene.fog.color.set(isLight ? '#f0f4f8' : '#0b1120');
      const baseDensity = isLight ? 0.005 : 0.008;
      scene.fog.density = Math.max(0.0015, baseDensity * (120 / requiredGridSize));
    }

    if (hemiLightRef.current) {
      hemiLightRef.current.color.set(isLight ? '#ffffff' : '#bae6fd');
      hemiLightRef.current.groundColor.set(isLight ? '#94a3b8' : '#334155');
      hemiLightRef.current.intensity = isLight ? 1.15 : 1.0;
    }
    if (dirLightRef.current) {
      dirLightRef.current.color.set(isLight ? '#fffbeb' : '#ffffff');
      dirLightRef.current.intensity = isLight ? 2.3 : 2.0;
    }
    if (fillLightRef.current) {
      fillLightRef.current.color.set(isLight ? '#93c5fd' : '#38bdf8');
      fillLightRef.current.intensity = isLight ? 0.6 : 0.8;
    }

    if (groundMeshRef.current) {
      groundMeshRef.current.geometry.dispose();
      const newGeo = new THREE.PlaneGeometry(groundSize, groundSize);
      newGeo.rotateX(-Math.PI / 2);
      groundMeshRef.current.geometry = newGeo;
      groundMeshRef.current.material.color.set(isLight ? '#cbd5e1' : '#0f172a');
      groundMeshRef.current.material.roughness = isLight ? 0.85 : 0.9;
    }

    scene.remove(gridHelperRef.current);
    gridHelperRef.current.geometry.dispose();
    if (Array.isArray(gridHelperRef.current.material)) {
      gridHelperRef.current.material.forEach((m) => m.dispose());
    } else {
      gridHelperRef.current.material.dispose();
    }
    const gridCenter = isLight ? '#0284c7' : '#38bdf8';
    const gridLines = isLight ? '#94a3b8' : '#1e293b';
    const newGrid = new THREE.GridHelper(requiredGridSize, divisions, gridCenter, gridLines);
    newGrid.position.y = 0;
    scene.add(newGrid);
    gridHelperRef.current = newGrid;

    if (controlsRef.current) {
      controlsRef.current.maxDistance = Math.max(250, groundSize * 1.2);
    }
    if (cameraRef.current) {
      cameraRef.current.far = Math.max(600, groundSize * 2.5);
      cameraRef.current.updateProjectionMatrix();
    }
  }, [isOpen, modalTheme, isLight, obstacles, boomLength, workingRadius, liftPoints]);

  // Apply initial camera preset when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setCameraPreset(defaultPreset);
  }, [isOpen, defaultPreset]);

  const handleCaptureAndSave = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    try {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      const dataUrl = rendererRef.current.domElement.toDataURL('image/jpeg', 0.94);
      if (onSaveView && viewKey) {
        onSaveView(viewKey, dataUrl);
      }
    } catch (e) {
      console.error('Error capturing modal view:', e);
    }
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 select-none">
      <div className="bg-slate-900 border-2 border-amber-400/90 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
              <Camera size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>CĂN CHỈNH GÓC NHÌN BẢN VẼ:</span>
                <span className="text-amber-300 underline font-semibold">{viewName}</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                🖱️ <b>Chuột trái:</b> Xoay 360° | <b>Chuột phải:</b> Kéo di chuyển | <b>Con lăn:</b> Zoom phóng to/thu nhỏ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchToExternal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToExternal(viewKey, viewName, activePreset);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Mở toàn màn hình không gian 3D bên ngoài"
              >
                <Maximize2 size={13} />
                <span className="hidden sm:inline">Toàn màn hình 3D</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Quick Camera Presets Toolbar */}
        <div className="px-5 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-mono mr-1">Góc chuẩn:</span>
            <button
              type="button"
              onClick={() => setCameraPreset('top')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                activePreset === 'top'
                  ? 'bg-sky-500 text-white font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Compass size={12} /> Mặt bằng (Top)
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('3d')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                activePreset === '3d'
                  ? 'bg-sky-500 text-white font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Layers size={12} /> 3D Phối cảnh
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('side')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                activePreset === 'side'
                  ? 'bg-sky-500 text-white font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Eye size={12} /> Mặt bên (Side)
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('front')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                activePreset === 'front'
                  ? 'bg-sky-500 text-white font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Compass size={12} /> Mặt trước (Front)
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('load')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                activePreset === 'load'
                  ? 'bg-sky-500 text-white font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Box size={12} /> Cận cảnh Tải
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                isLight
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
              }`}
              title="Chuyển đổi nền ảnh chụp: Nền Sáng / Nền Tối CAD"
            >
              {isLight ? <Moon size={12} className="text-slate-700" /> : <Sun size={12} className="text-amber-400" />}
              <span>{isLight ? 'Nền Tối CAD' : 'Nền Sáng'}</span>
            </button>

            <button
              type="button"
              onClick={() => setCameraPreset(defaultPreset)}
              className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw size={12} /> Đặt lại
            </button>
          </div>
        </div>

        {/* 3D Interactive Canvas Container with definite height */}
        <div className="relative w-full h-[450px] sm:h-[500px] md:h-[540px] bg-slate-950 overflow-hidden cursor-grab active:cursor-grabbing">
          <div ref={containerRef} className="w-full h-full" />
          <div className="absolute bottom-2.5 left-3 text-[10px] text-slate-300 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded pointer-events-none backdrop-blur-sm shadow-md">
            💡 <b>Kéo chuột trực tiếp</b> trên khung hình để xoay căn góc chụp
          </div>
        </div>

        {/* Modal Footer Bar */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400">
            Khung hình bạn đang nhìn thấy sẽ được chụp nguyên vẹn và đưa vào bản vẽ Thuyết minh.
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleCaptureAndSave}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <CheckCircle size={15} /> Chụp & Lưu góc này vào Bản vẽ
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
