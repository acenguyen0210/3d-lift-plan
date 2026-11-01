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
  Maximize2
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
  boomAngle = 60,
  hookElevation = 6,
  loadElevation = 1.5,
  loadConfig,
  riggingConfig,
  outriggerReactions,
  soilCapacityTonsPerM2 = 25,
  matLength = 2.2,
  matWidth = 2.2,
  obstacles = [],
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

  const [activePreset, setActivePreset] = useState(defaultPreset);

  // Synchronize activePreset whenever defaultPreset changes on opening
  useEffect(() => {
    setActivePreset(defaultPreset);
  }, [defaultPreset, isOpen]);

  const setCameraPreset = (view) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    setActivePreset(view);

    switch (view) {
      case 'top':
        // 0.1 offset avoids polar gimbal lock in OrbitControls
        cam.position.set(0.1, Math.max(boomLength * 1.35, 32), 0.1);
        ctrl.target.set(0, 0, 0);
        break;
      case 'side':
        cam.position.set(0.1, Math.max(boomLength * 0.35, 10), Math.max(boomLength * 1.05, 28));
        ctrl.target.set(0, 7, 0);
        break;
      case 'front':
        cam.position.set(Math.max(boomLength * 1.05, 28), Math.max(boomLength * 0.35, 10), 0.1);
        ctrl.target.set(0, 7, 0);
        break;
      case 'load':
        cam.position.set(workingRadius + 4, (loadElevation || 1.5) + 2, 4);
        ctrl.target.set(workingRadius, loadElevation || 1.5, 0);
        break;
      case '3d':
      default:
        cam.position.set(18, 14, 22);
        ctrl.target.set(0, 5, 0);
        break;
    }
    ctrl.update();
  };

  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 480;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1120');
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
    const hemiLight = new THREE.HemisphereLight('#bae6fd', '#334155', 1.0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 2.0);
    dirLight.position.set(30, 45, 25);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight('#38bdf8', 0.8);
    fillLight.position.set(-25, 20, -20);
    scene.add(fillLight);

    // 6. Ground & CAD Grid
    const groundGeo = new THREE.PlaneGeometry(240, 240);
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

    const gridHelper = new THREE.GridHelper(120, 120, '#38bdf8', '#1e293b');
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // 7. Build Obstacles (Safely wrapped)
    let obsBuilder = null;
    try {
      obsBuilder = new Obstacle3DBuilder(scene);
      obstacleBuilderRef.current = obsBuilder;
      if (obstacles && Array.isArray(obstacles)) {
        obstacles.forEach((obs) => {
          if (obs && obs.enabled !== false) {
            obsBuilder.buildObstacle(obs);
          }
        });
      }
    } catch (e) {
      console.warn('Error building obstacles in modal:', e);
    }

    // 8. Build Crane (Safely wrapped)
    let craneBuilder = null;
    try {
      craneBuilder = new CraneSceneBuilder(scene);
      craneBuilderRef.current = craneBuilder;
      if (crane) {
        craneBuilder.buildCrane(crane, {
          matLength: matLength || 2.2,
          matWidth: matWidth || 2.2,
          loadType: loadConfig?.type || 'box',
          loadDims: loadConfig?.dims || { l: 4.0, w: 2.4, h: 2.6 },
          slingAngleDeg: riggingConfig?.slingAngleDeg || 60,
          slingType: riggingConfig?.slingType || 'wire_rope',
          slingLegs: riggingConfig?.slingLegs !== undefined ? riggingConfig.slingLegs : 4
        });
        craneBuilder.updateKinematics({
          slewAngleDeg: slewAngle || 0,
          boomAngleDeg: boomAngle || 60,
          boomLength: boomLength || 23,
          minBoomLength: crane?.specs?.minBoomLength || 10,
          maxBoomLength: crane?.specs?.maxBoomLength || 40,
          hookElevation: hookElevation !== undefined ? hookElevation : 6,
          loadElevation: loadElevation !== undefined ? loadElevation : 1.5,
          outriggerReactions: outriggerReactions || {},
          soilCapacityTonsPerM2: soilCapacityTonsPerM2 || 25,
          matArea: (matLength || 2.2) * (matWidth || 2.2)
        });
      }
    } catch (e) {
      console.warn('Error building crane in modal:', e);
    }

    // 9. Set initial camera preset smoothly
    setCameraPreset(defaultPreset);

    // 10. Animation render loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // 11. Handle Resizing with ResizeObserver for perfect dimension tracking
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

    // Initial frame resize check after layout mounts
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

          <button
            type="button"
            onClick={() => setCameraPreset(defaultPreset)}
            className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw size={12} /> Đặt lại
          </button>
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
