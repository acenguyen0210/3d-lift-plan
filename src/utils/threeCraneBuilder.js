import * as THREE from 'three';

/**
 * Procedural 3D Crane and Scene Builder for Three.js
 */
export class CraneSceneBuilder {
  constructor(scene) {
    this.scene = scene;
    this.craneGroup = new THREE.Group();
    this.scene.add(this.craneGroup);

    this.outriggerPads = [];
    this.mats = [];
    this.telescopicSections = [];
    this.hoistCables = [];
    this.slings = [];
  }

  /**
   * Recursively dispose a Three.js group/object and its children
   */
  _clearGroup(group) {
    if (!group) return;
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      this._clearGroup(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m && m.dispose && m.dispose());
        } else if (child.material.dispose) {
          child.material.dispose();
        }
      }
    }
  }

  /**
   * Build complete 3D crane based on model configuration
   */
  buildCrane(craneConfig, options = {}) {
    // 1. Thoroughly remove and dispose any old scene objects if they exist
    [
      this.hookGroup,
      this.cableMesh,
      this.loadGroup,
      this.radiusRing,
      this.radiusLine,
      this.radiusDisk,
      this.groundTarget,
      this.radiusGroup,
      this.tailSwingRing
    ].forEach((obj) => {
      if (obj) {
        this.scene.remove(obj);
        if (this.craneGroup) this.craneGroup.remove(obj);
        this._clearGroup(obj);
        if (obj.geometry) obj.geometry.dispose();
      }
    });

    this.hookGroup = null;
    this.cableMesh = null;
    this.loadGroup = null;
    this.radiusRing = null;
    this.radiusLine = null;
    this.radiusDisk = null;
    this.groundTarget = null;
    this.radiusGroup = null;
    this.tailSwingRing = null;

    // 2. Clear old crane parts inside craneGroup
    this._clearGroup(this.craneGroup);

    this.outriggerPads = [];
    this.mats = [];
    this.telescopicSections = [];
    this.hoistCables = [];
    this.slings = [];

    const specs = craneConfig.specs;
    const colors = specs.colorScheme || {
      body: '#eab308',
      boom: '#ca8a04',
      cabin: '#1e293b',
      chassis: '#334155'
    };

    // Shared materials
    this.materials = {
      body: new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.35, metalness: 0.4 }),
      boom: new THREE.MeshStandardMaterial({ color: colors.boom, roughness: 0.3, metalness: 0.45 }),
      boomInner: new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.25, metalness: 0.6 }),
      chassis: new THREE.MeshStandardMaterial({ color: colors.chassis, roughness: 0.6, metalness: 0.3 }),
      cabin: new THREE.MeshStandardMaterial({ color: colors.cabin, roughness: 0.4, metalness: 0.2 }),
      cargoBed: new THREE.MeshStandardMaterial({ color: colors.cargoBed || '#94a3b8', roughness: 0.5, metalness: 0.4 }),
      aluminum: new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.25, metalness: 0.85 }),
      leather: new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.9, metalness: 0.05 }),
      lightLens: new THREE.MeshStandardMaterial({ color: '#fef08a', emissive: '#fef08a', emissiveIntensity: 0.7 }),
      rearLamp: new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 0.7 }),
      glass: new THREE.MeshPhysicalMaterial({
        color: '#38bdf8',
        transmission: 0.85,
        opacity: 0.7,
        transparent: true,
        roughness: 0.1,
        ior: 1.5
      }),
      tire: new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.85, metalness: 0.1 }),
      rim: new THREE.MeshStandardMaterial({ color: '#d4d4d8', roughness: 0.3, metalness: 0.8 }),
      chrome: new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.15, metalness: 0.95 }),
      steel: new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.4, metalness: 0.7 }),
      cable: new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.9, metalness: 0.5 }),
      hook: new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.4, metalness: 0.6 }),
      counterweight: new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7, metalness: 0.2 }),
      matDefault: new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.8, metalness: 0.1 }), // Gỗ/thép tấm lót
      warningStripes: new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.5 })
    };

    // 1. CARRIER / CHASSIS
    this.carrierGroup = new THREE.Group();
    this.craneGroup.add(this.carrierGroup);

    if (craneConfig.type === 'crawler') {
      this._buildCrawlerUndercarriage(specs);
    } else if (craneConfig.type === 'tower') {
      this._buildTowerBase(specs);
    } else if (craneConfig.type === 'truck') {
      this._buildTruckCargoChassis(specs, craneConfig);
    } else {
      this._buildWheelChassis(specs);
    }

    // 2. OUTRIGGERS & MATS (for mobile, rough terrain, truck)
    if (craneConfig.type !== 'crawler' && craneConfig.type !== 'tower') {
      this._buildOutriggersAndMats(specs, options.matLength || 2.0, options.matWidth || 2.0);
    }

    // 3. SUPERSTRUCTURE (TURNTABLE / TOA QUAY)
    this.superstructureGroup = new THREE.Group();
    const pivotY = specs.boomOffsetPivotY || 2.45;
    this.superstructureGroup.position.set(0, pivotY * 0.55, 0);
    this.craneGroup.add(this.superstructureGroup);

    if (craneConfig.type === 'truck') {
      this._buildTruckSuperstructure(specs, craneConfig);
    } else {
      this._buildSuperstructureBody(specs);
    }

    // 4. BOOM SYSTEM (CẦN CẨU)
    this.boomAssemblyGroup = new THREE.Group();
    // Pivot joint is located at forward offset of turntable (1.0m to match crane kinematics exactly)
    const pivotX = specs.boomOffsetPivotX !== undefined ? specs.boomOffsetPivotX : 1.0;
    this.boomAssemblyGroup.position.set(pivotX, pivotY * 0.45, 0);
    this.superstructureGroup.add(this.boomAssemblyGroup);

    if (craneConfig.type === 'crawler') {
      this._buildLatticeBoom(specs);
    } else if (craneConfig.type === 'tower') {
      this._buildTowerJib(specs);
    } else if (craneConfig.type === 'truck') {
      this._buildTruckTelescopicBoom(specs, craneConfig);
    } else {
      this._buildTelescopicBoom(specs);
    }

    // 5. HYDRAULIC LUFFING CYLINDERS (only for mobile, truck, rough terrain)
    if (craneConfig.type !== 'crawler' && craneConfig.type !== 'tower') {
      if (craneConfig.type === 'truck') {
        this._buildTruckLuffingCylinders(specs, craneConfig);
      } else {
        this._buildLuffingCylinders(specs);
      }
    }

    // 6. HOOK BLOCK, CABLES & LOAD
    this._buildHookAndLoad(options);

    // 7. RADIUS GROUND CIRCLE INDICATOR
    this._buildRadiusRing();

    // 8. TAIL SWING CLEARANCE CIRCLE
    this._buildTailSwingRing(specs.tailSwingRadius || 4.0);

    return {
      superstructure: this.superstructureGroup,
      boomAssembly: this.boomAssemblyGroup,
      hookBlock: this.hookGroup,
      loadGroup: this.loadGroup,
      mats: this.mats
    };
  }

  // --- CARRIER TYPES ---
  _buildWheelChassis(specs) {
    const L = specs.outriggerLength || 7.5;
    const W = 2.6;
    const H = 1.1;

    // Main carrier box
    const chassisGeo = new THREE.BoxGeometry(L * 1.1, H, W);
    const chassisMesh = new THREE.Mesh(chassisGeo, this.materials.chassis);
    chassisMesh.position.set(0, 1.0, 0);
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    this.carrierGroup.add(chassisMesh);

    // Driver cab in front
    const cabGeo = new THREE.BoxGeometry(1.8, 1.2, W * 0.96);
    const cabMesh = new THREE.Mesh(cabGeo, this.materials.body);
    cabMesh.position.set(L * 0.55 - 0.9, 1.6, 0);
    cabMesh.castShadow = true;
    this.carrierGroup.add(cabMesh);

    // Windshield
    const winGeo = new THREE.BoxGeometry(0.1, 0.7, W * 0.9);
    const winMesh = new THREE.Mesh(winGeo, this.materials.glass);
    winMesh.position.set(L * 0.55 - 0.05, 1.7, 0);
    this.carrierGroup.add(winMesh);

    // Axles & Tires (3 to 5 axles based on crane size)
    const numAxles = specs.tareWeight > 50 ? 5 : specs.tareWeight > 35 ? 3 : 2;
    const tireRadius = 0.65;
    const tireWidth = 0.45;
    const tireGeo = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 24);
    tireGeo.rotateX(Math.PI / 2);

    const rimGeo = new THREE.CylinderGeometry(tireRadius * 0.6, tireRadius * 0.6, tireWidth + 0.02, 16);
    rimGeo.rotateX(Math.PI / 2);

    const startX = -L * 0.48;
    const spacing = (L * 0.95) / (numAxles - 1);

    for (let i = 0; i < numAxles; i++) {
      const axX = startX + i * spacing;
      // Left tire
      const tL = new THREE.Mesh(tireGeo, this.materials.tire);
      const rL = new THREE.Mesh(rimGeo, this.materials.rim);
      tL.add(rL);
      tL.position.set(axX, tireRadius, -W * 0.55);
      tL.castShadow = true;
      this.carrierGroup.add(tL);

      // Right tire
      const tR = new THREE.Mesh(tireGeo, this.materials.tire);
      const rR = new THREE.Mesh(rimGeo, this.materials.rim);
      tR.add(rR);
      tR.position.set(axX, tireRadius, W * 0.55);
      tR.castShadow = true;
      this.carrierGroup.add(tR);
    }
  }

  _buildCrawlerUndercarriage(specs) {
    const cL = specs.crawlerLength || 9.0;
    const cW = specs.crawlerWidth || 7.5;
    const sW = specs.shoeWidth || 1.2;
    const trackH = 1.35;

    // Carbody center frame
    const centerFrameGeo = new THREE.BoxGeometry(cL * 0.6, 0.9, cW - sW * 1.5);
    const centerFrame = new THREE.Mesh(centerFrameGeo, this.materials.chassis);
    centerFrame.position.set(0, 1.1, 0);
    centerFrame.castShadow = true;
    this.carrierGroup.add(centerFrame);

    // Left & Right Track sideframes
    [-cW * 0.5 + sW * 0.5, cW * 0.5 - sW * 0.5].forEach((posZ) => {
      const trackSide = new THREE.Group();
      trackSide.position.set(0, 0, posZ);

      // Main track body
      const bodyGeo = new THREE.BoxGeometry(cL, trackH, sW);
      const bodyMesh = new THREE.Mesh(bodyGeo, this.materials.tire);
      bodyMesh.position.set(0, trackH * 0.5 + 0.1, 0);
      bodyMesh.castShadow = true;
      trackSide.add(bodyMesh);

      // Tumbler / Idler tumblers at ends
      const endWheelGeo = new THREE.CylinderGeometry(trackH * 0.45, trackH * 0.45, sW * 1.02, 16);
      endWheelGeo.rotateX(Math.PI / 2);
      const wheelFront = new THREE.Mesh(endWheelGeo, this.materials.steel);
      wheelFront.position.set(cL * 0.45, trackH * 0.5 + 0.1, 0);
      const wheelRear = new THREE.Mesh(endWheelGeo, this.materials.steel);
      wheelRear.position.set(-cL * 0.45, trackH * 0.5 + 0.1, 0);
      trackSide.add(wheelFront, wheelRear);

      this.carrierGroup.add(trackSide);
    });
  }

  _buildTowerBase(specs) {
    // Concrete anchor pad
    const padGeo = new THREE.BoxGeometry(8, 1.2, 8);
    const padMesh = new THREE.Mesh(padGeo, this.materials.chassis);
    padMesh.position.set(0, 0.6, 0);
    this.carrierGroup.add(padMesh);

    // Vertical mast lattice tower
    const mastH = specs.boomOffsetPivotY || 35.0;
    const mastW = 2.2;
    const mastGeo = new THREE.BoxGeometry(mastW, mastH, mastW);
    const mastMesh = new THREE.Mesh(mastGeo, this.materials.body);
    mastMesh.position.set(0, mastH * 0.5 + 1.2, 0);
    mastMesh.castShadow = true;
    this.carrierGroup.add(mastMesh);
  }

  _buildTruckCargoChassis(specs, craneConfig) {
    const is4Axle = specs.tareWeight > 16 || (craneConfig.id && craneConfig.id.includes('320'));
    const totalL = 11.4;

    // 1. Heavy Dual Chassis Longitudinal Rails (Chassis dầm chữ U thép chịu lực)
    const railGeo = new THREE.BoxGeometry(totalL, 0.28, 0.08);
    [-0.44, 0.44].forEach((posZ) => {
      const rail = new THREE.Mesh(railGeo, this.materials.chassis);
      rail.position.set(-1.0, 0.92, posZ);
      rail.castShadow = true;
      rail.receiveShadow = true;
      this.carrierGroup.add(rail);
    });

    // Crossmembers connecting chassis rails
    const crossXs = [4.2, 2.5, 0.8, -0.8, -2.5, -4.5, -6.3];
    crossXs.forEach((x) => {
      const cmGeo = new THREE.BoxGeometry(0.12, 0.2, 0.8);
      const cmMesh = new THREE.Mesh(cmGeo, this.materials.chassis);
      cmMesh.position.set(x, 0.92, 0);
      this.carrierGroup.add(cmMesh);
    });

    // Side underrun protection bars (Thanh bảo vệ sườn xe chống va chạm hai bên)
    [-1.24, 1.24].forEach((posZ) => {
      const guardGeo = new THREE.BoxGeometry(2.4, 0.08, 0.04);
      const guardMesh = new THREE.Mesh(guardGeo, this.materials.chassis);
      guardMesh.position.set(-1.6, 0.65, posZ);
      this.carrierGroup.add(guardMesh);
    });

    // 2. Front Driver Cab (Cabin xe tải đầu bằng phía trước)
    const cabGroup = new THREE.Group();
    // Cab main box (Dài 2.6m, rộng 2.42m, cao 2.2m)
    const cabGeo = new THREE.BoxGeometry(2.6, 2.2, 2.42);
    const cabMesh = new THREE.Mesh(cabGeo, this.materials.cabin);
    cabMesh.position.set(3.1, 2.15, 0);
    cabMesh.castShadow = true;
    cabGroup.add(cabMesh);

    // Aerodynamic sun visor on cab roof (Tấm che nắng mui)
    const visorGeo = new THREE.BoxGeometry(0.35, 0.12, 2.38);
    const visorMesh = new THREE.Mesh(visorGeo, this.materials.chassis);
    visorMesh.position.set(4.38, 3.12, 0);
    cabGroup.add(visorMesh);

    // Front windshield (Kính chắn gió cabin)
    const windGeo = new THREE.BoxGeometry(0.08, 1.05, 2.22);
    const windMesh = new THREE.Mesh(windGeo, this.materials.glass);
    windMesh.position.set(4.41, 2.45, 0);
    cabGroup.add(windMesh);

    // Side door windows (Kính cửa sổ hai bên tài & phụ)
    [-1.22, 1.22].forEach((posZ) => {
      const sideWinGeo = new THREE.BoxGeometry(1.3, 0.75, 0.06);
      const sideWinMesh = new THREE.Mesh(sideWinGeo, this.materials.glass);
      sideWinMesh.position.set(3.4, 2.45, posZ);
      cabGroup.add(sideWinMesh);

      // Rearview mirror brackets & housings (Gương chiếu hậu vươn dài)
      const mirrorArmGeo = new THREE.BoxGeometry(0.25, 0.04, 0.22);
      const mirrorArm = new THREE.Mesh(mirrorArmGeo, this.materials.chassis);
      mirrorArm.position.set(4.15, 2.45, posZ + (posZ > 0 ? 0.1 : -0.1));
      cabGroup.add(mirrorArm);

      const mirrorGeo = new THREE.BoxGeometry(0.12, 0.42, 0.18);
      const mirrorMesh = new THREE.Mesh(mirrorGeo, this.materials.chassis);
      mirrorMesh.position.set(4.25, 2.4, posZ + (posZ > 0 ? 0.22 : -0.22));
      cabGroup.add(mirrorMesh);

      // Boarding access stirrups (Bậc lên xuống)
      const stepGeo = new THREE.BoxGeometry(0.35, 0.05, 0.18);
      [0.55, 0.78].forEach((stepY) => {
        const step = new THREE.Mesh(stepGeo, this.materials.steel);
        step.position.set(3.8, stepY, posZ);
        cabGroup.add(step);
      });
    });

    // Front radiator grille (Mặt ca-lăng tản nhiệt)
    const grilleGeo = new THREE.BoxGeometry(0.06, 0.7, 1.7);
    const grilleMesh = new THREE.Mesh(grilleGeo, this.materials.chassis);
    grilleMesh.position.set(4.42, 1.55, 0);
    cabGroup.add(grilleMesh);

    // Horizontal chrome grille slats (Thanh mạ c-rôm sáng bóng)
    [1.45, 1.55, 1.65].forEach((slatY) => {
      const slatGeo = new THREE.BoxGeometry(0.08, 0.04, 1.62);
      const slatMesh = new THREE.Mesh(slatGeo, this.materials.aluminum);
      slatMesh.position.set(4.42, slatY, 0);
      cabGroup.add(slatMesh);
    });

    // Headlight clusters (Cụm đèn pha halogen/LED & xi nhan)
    [-0.92, 0.92].forEach((posZ) => {
      const hlGeo = new THREE.BoxGeometry(0.08, 0.22, 0.32);
      const hlMesh = new THREE.Mesh(hlGeo, this.materials.lightLens);
      hlMesh.position.set(4.42, 1.25, posZ);
      cabGroup.add(hlMesh);
    });

    // Front heavy steel bumper (Cản trước kim loại bảo vệ)
    const bumperGeo = new THREE.BoxGeometry(0.35, 0.45, 2.46);
    const bumperMesh = new THREE.Mesh(bumperGeo, this.materials.chassis);
    bumperMesh.position.set(4.45, 0.85, 0);
    bumperMesh.castShadow = true;
    cabGroup.add(bumperMesh);

    // License plate (Biển số xe)
    const plateGeo = new THREE.BoxGeometry(0.02, 0.16, 0.5);
    const plateMesh = new THREE.Mesh(plateGeo, this.materials.aluminum);
    plateMesh.position.set(4.63, 0.8, 0);
    cabGroup.add(plateMesh);

    this.carrierGroup.add(cabGroup);

    // 3. Equipment between Cab & Bed (Khoang thiết bị cẩu & xe tải)
    // Crane subframe mounting plate (Đế phụ gia cường bệ cẩu)
    const subframePlateGeo = new THREE.BoxGeometry(1.6, 0.12, 1.8);
    const subframePlate = new THREE.Mesh(subframePlateGeo, this.materials.chassis);
    subframePlate.position.set(0, 1.12, 0);
    subframePlate.castShadow = true;
    this.carrierGroup.add(subframePlate);

    // Hydraulic oil reservoir tank for crane (Thùng dầu thủy lực cẩu - Bên trái Z < 0)
    const hydTankGeo = new THREE.BoxGeometry(0.75, 0.65, 0.45);
    const hydTank = new THREE.Mesh(hydTankGeo, this.materials.body);
    hydTank.position.set(0.5, 1.05, -1.05);
    hydTank.castShadow = true;
    this.carrierGroup.add(hydTank);

    // Oil level sight gauge & filler cap
    const sightGeo = new THREE.BoxGeometry(0.04, 0.3, 0.04);
    const sightMesh = new THREE.Mesh(sightGeo, this.materials.lightLens);
    sightMesh.position.set(0.5, 1.05, -1.28);
    this.carrierGroup.add(sightMesh);

    // Diesel fuel tank (Thùng dầu diesel xe tải - Bên phải Z > 0)
    const fuelGeo = new THREE.CylinderGeometry(0.28, 0.28, 1.2, 20);
    fuelGeo.rotateZ(Math.PI / 2);
    const fuelTank = new THREE.Mesh(fuelGeo, this.materials.aluminum);
    fuelTank.position.set(-1.8, 0.85, 1.05);
    fuelTank.castShadow = true;
    this.carrierGroup.add(fuelTank);

    // Dual stainless straps on fuel tank
    [-0.35, 0.35].forEach((strapX) => {
      const strapGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.05, 20);
      strapGeo.rotateZ(Math.PI / 2);
      const strapMesh = new THREE.Mesh(strapGeo, this.materials.chassis);
      strapMesh.position.set(-1.8 + strapX, 0.85, 1.05);
      this.carrierGroup.add(strapMesh);
    });

    // Compressed air brake tanks (2 bình tích khí nén phanh hơi)
    [-0.15, 0.15].forEach((tankY) => {
      const airGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 16);
      airGeo.rotateZ(Math.PI / 2);
      const airTank = new THREE.Mesh(airGeo, this.materials.chassis);
      airTank.position.set(-1.8, 0.85 + tankY, -0.85);
      this.carrierGroup.add(airTank);
    });

    // Battery storage box (Hộp bình ắc-quy)
    const batGeo = new THREE.BoxGeometry(0.5, 0.35, 0.4);
    const batBox = new THREE.Mesh(batGeo, this.materials.chassis);
    batBox.position.set(-2.6, 0.85, -0.85);
    this.carrierGroup.add(batBox);

    // 4. Rear Cargo Bed (Thùng lửng chở hàng tiêu chuẩn)
    const bedGroup = new THREE.Group();
    // Cargo floor plate (Sàn thép phẳng)
    const floorGeo = new THREE.BoxGeometry(5.7, 0.08, 2.4);
    const floorMesh = new THREE.Mesh(floorGeo, this.materials.cargoBed);
    floorMesh.position.set(-3.65, 1.24, 0);
    floorMesh.receiveShadow = true;
    floorMesh.castShadow = true;
    bedGroup.add(floorMesh);

    // Front Headboard (Bửng trước vách bảo vệ cabin)
    const headboardGeo = new THREE.BoxGeometry(0.08, 1.18, 2.4);
    const headboardMesh = new THREE.Mesh(headboardGeo, this.materials.cargoBed);
    headboardMesh.position.set(-0.82, 1.82, 0);
    headboardMesh.castShadow = true;
    bedGroup.add(headboardMesh);

    // Protective cab guard frame on headboard
    const guardFrameGeo = new THREE.BoxGeometry(0.04, 0.5, 1.8);
    const guardFrame = new THREE.Mesh(guardFrameGeo, this.materials.chassis);
    guardFrame.position.set(-0.84, 2.05, 0);
    bedGroup.add(guardFrame);

    // Side Drop-Sides (Bửng hông 2 bên - Mở lật)
    [-1.2, 1.2].forEach((posZ) => {
      const sideBedGeo = new THREE.BoxGeometry(5.7, 0.65, 0.06);
      const sideBedMesh = new THREE.Mesh(sideBedGeo, this.materials.cargoBed);
      sideBedMesh.position.set(-3.65, 1.57, posZ);
      sideBedMesh.castShadow = true;
      bedGroup.add(sideBedMesh);

      // Vertical stake posts (Trụ bửng thép thẳng đứng)
      [-0.82, -2.7, -4.6, -6.5].forEach((postX) => {
        const postGeo = new THREE.BoxGeometry(0.08, 0.72, 0.08);
        const postMesh = new THREE.Mesh(postGeo, this.materials.steel);
        postMesh.position.set(postX, 1.57, posZ);
        postMesh.castShadow = true;
        bedGroup.add(postMesh);
      });
    });

    // Tailgate (Bửng sau mở lật)
    const tailGeo = new THREE.BoxGeometry(0.06, 0.65, 2.4);
    const tailMesh = new THREE.Mesh(tailGeo, this.materials.cargoBed);
    tailMesh.position.set(-6.5, 1.57, 0);
    tailMesh.castShadow = true;
    bedGroup.add(tailMesh);

    // Rear tandem mudguards (Vè chắn bùn bánh xe sau)
    [-1.18, 1.18].forEach((posZ) => {
      const fenderGeo = new THREE.BoxGeometry(2.3, 0.12, 0.45);
      const fenderMesh = new THREE.Mesh(fenderGeo, this.materials.chassis);
      fenderMesh.position.set(-4.45, 1.15, posZ);
      bedGroup.add(fenderMesh);
    });

    // Rear crash bumper with hazard chevron pattern (Cản sau bảo vệ)
    const rearBumperGeo = new THREE.BoxGeometry(0.12, 0.22, 2.42);
    const rearBumper = new THREE.Mesh(rearBumperGeo, this.materials.chassis);
    rearBumper.position.set(-6.58, 0.65, 0);
    bedGroup.add(rearBumper);

    // Taillights & turn signals (Cụm đèn hậu đỏ phản quang)
    [-0.85, 0.85].forEach((posZ) => {
      const lampGeo = new THREE.BoxGeometry(0.04, 0.14, 0.35);
      const lampMesh = new THREE.Mesh(lampGeo, this.materials.rearLamp);
      lampMesh.position.set(-6.65, 0.65, posZ);
      bedGroup.add(lampMesh);
    });

    this.carrierGroup.add(bedGroup);

    // 5. Axles & Tire Configuration (Trục bánh xe tải thực tế)
    const tireRadius = 0.52;
    const tireWidth = 0.28;
    const rimRadius = 0.32;

    const tireGeo = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 24);
    tireGeo.rotateX(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, tireWidth + 0.02, 16);
    rimGeo.rotateX(Math.PI / 2);
    const hubGeo = new THREE.CylinderGeometry(rimRadius * 0.45, rimRadius * 0.45, tireWidth + 0.05, 12);
    hubGeo.rotateX(Math.PI / 2);

    const createWheel = (x, y, z) => {
      const tire = new THREE.Mesh(tireGeo, this.materials.tire);
      const rim = new THREE.Mesh(rimGeo, this.materials.rim);
      const hub = new THREE.Mesh(hubGeo, this.materials.chassis);
      tire.add(rim);
      tire.add(hub);
      tire.position.set(x, y, z);
      tire.castShadow = true;
      this.carrierGroup.add(tire);
    };

    const addSingleAxle = (axX) => {
      createWheel(axX, tireRadius, -1.05);
      createWheel(axX, tireRadius, 1.05);
    };

    const addDualAxle = (axX) => {
      createWheel(axX, tireRadius, -0.92);
      createWheel(axX, tireRadius, -1.24);
      createWheel(axX, tireRadius, 0.92);
      createWheel(axX, tireRadius, 1.24);
    };

    if (is4Axle) {
      // Hyundai HD320 (8x4 - 4 chân: 2 cầu trước dẫn hướng, 2 cầu sau chịu tải)
      addSingleAxle(3.6);
      addSingleAxle(2.2);
      addDualAxle(-3.8);
      addDualAxle(-5.1);
    } else {
      // Hino 500 FL (6x2 - 3 chân: 1 cầu trước dẫn hướng, 2 cầu sau chịu tải)
      addSingleAxle(3.3);
      addDualAxle(-3.7);
      addDualAxle(-5.0);
    }
  }

  // --- OUTRIGGERS & MATS ---
  _buildOutriggersAndMats(specs, matL = 2.0, matW = 2.0) {
    const oL = (specs.outriggerLength || 7.0) * 0.5;
    const oW = (specs.outriggerWidth || 6.4) * 0.5;

    const corners = [
      { id: 'FL', x: oL, z: -oW, label: 'FL (Trước - Trái)' },
      { id: 'FR', x: oL, z: oW, label: 'FR (Trước - Phải)' },
      { id: 'RL', x: -oL, z: -oW, label: 'RL (Sau - Trái)' },
      { id: 'RR', x: -oL, z: oW, label: 'RR (Sau - Phải)' }
    ];

    corners.forEach((c) => {
      const outGroup = new THREE.Group();
      outGroup.position.set(c.x, 0.7, 0);

      // Horizontal beam
      const beamGeo = new THREE.BoxGeometry(0.35, 0.35, Math.abs(c.z));
      const beamMesh = new THREE.Mesh(beamGeo, this.materials.steel);
      beamMesh.position.set(0, 0, c.z * 0.5);
      beamMesh.castShadow = true;
      outGroup.add(beamMesh);

      // Vertical hydraulic jack cylinder
      const jackGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.75, 16);
      const jackMesh = new THREE.Mesh(jackGeo, this.materials.chrome);
      jackMesh.position.set(0, -0.2, c.z);
      outGroup.add(jackMesh);

      // Steel outrigger pad float
      const padGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.08, 16);
      const padMesh = new THREE.Mesh(padGeo, this.materials.steel);
      padMesh.position.set(0, -0.6, c.z);
      outGroup.add(padMesh);
      this.outriggerPads.push(padMesh);

      // Outrigger Mat (Tấm lót chân cẩu - Gỗ hoặc thép dày)
      const matGeo = new THREE.BoxGeometry(matL, 0.1, matW);
      const matMat = new THREE.MeshStandardMaterial({
        color: '#0284c7',
        roughness: 0.7,
        metalness: 0.3
      });
      const matMesh = new THREE.Mesh(matGeo, matMat);
      matMesh.position.set(0, -0.65, c.z);
      matMesh.receiveShadow = true;
      matMesh.userData = { id: c.id, label: c.label };
      outGroup.add(matMesh);
      this.mats.push(matMesh);

      this.carrierGroup.add(outGroup);
    });
  }

  // --- SUPERSTRUCTURE BODY ---
  _buildSuperstructureBody(specs) {
    // Slewing ring
    const ringGeo = new THREE.CylinderGeometry(1.6, 1.7, 0.3, 32);
    const ringMesh = new THREE.Mesh(ringGeo, this.materials.steel);
    ringMesh.position.set(0, 0.15, 0);
    this.superstructureGroup.add(ringMesh);

    // Upper turntable deck
    const deckGeo = new THREE.BoxGeometry(4.8, 1.4, 2.7);
    const deckMesh = new THREE.Mesh(deckGeo, this.materials.body);
    deckMesh.position.set(-0.6, 0.9, 0);
    deckMesh.castShadow = true;
    this.superstructureGroup.add(deckMesh);

    // Crane Operator Cab (buồng lái cẩu nghiêng)
    const cabGroup = new THREE.Group();
    cabGroup.position.set(1.1, 1.5, 1.45);

    const cabBodyGeo = new THREE.BoxGeometry(1.9, 1.7, 1.1);
    const cabBodyMesh = new THREE.Mesh(cabBodyGeo, this.materials.cabin);
    cabGroup.add(cabBodyMesh);

    // Large glass viewing windows
    const winGeo = new THREE.BoxGeometry(1.7, 1.2, 0.05);
    const winFront = new THREE.Mesh(winGeo, this.materials.glass);
    winFront.position.set(0, 0.1, 0.55);
    cabGroup.add(winFront);

    // Safety strobe light on cab roof
    const beaconGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 12);
    const beaconMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', emissive: '#f59e0b', emissiveIntensity: 0.8 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 0.95, 0);
    cabGroup.add(beacon);

    this.superstructureGroup.add(cabGroup);

    // Counterweight Tray & Slabs at rear
    const cwTons = specs.defaultCounterweight || 9.0;
    const numSlabs = Math.max(1, Math.min(8, Math.ceil(cwTons / 6)));
    const cwGroup = new THREE.Group();
    cwGroup.position.set(-2.8, 1.1, 0);

    for (let i = 0; i < numSlabs; i++) {
      const slabGeo = new THREE.BoxGeometry(1.1, 0.35, 2.5);
      const slabMesh = new THREE.Mesh(slabGeo, this.materials.counterweight);
      slabMesh.position.set(0, i * 0.38, 0);
      slabMesh.castShadow = true;
      cwGroup.add(slabMesh);
    }
    this.superstructureGroup.add(cwGroup);
  }

  _buildTruckSuperstructure(specs, craneConfig) {
    // 1. Slewing ring bearing gear (Mâm quay bệ cẩu)
    const ringGeo = new THREE.CylinderGeometry(0.72, 0.75, 0.22, 24);
    const ringMesh = new THREE.Mesh(ringGeo, this.materials.steel);
    ringMesh.position.set(0, 0.11, 0);
    this.superstructureGroup.add(ringMesh);

    // 2. Heavy Kingpost / Column (Trụ tháp cẩu quay)
    const colGeo = new THREE.BoxGeometry(0.72, 1.45, 0.82);
    const colMesh = new THREE.Mesh(colGeo, this.materials.body);
    colMesh.position.set(0, 0.85, 0);
    colMesh.castShadow = true;
    this.superstructureGroup.add(colMesh);

    // Side reinforcement gussets (Gân tăng cứng chân bệ cẩu)
    [-0.38, 0.38].forEach((posZ) => {
      const gusGeo = new THREE.BoxGeometry(0.55, 0.6, 0.06);
      const gusMesh = new THREE.Mesh(gusGeo, this.materials.body);
      gusMesh.position.set(0, 0.5, posZ);
      this.superstructureGroup.add(gusMesh);
    });

    // 3. Top-Seat Operator Platform (Ghế ngồi điều khiển trên cao)
    const seatPlatformGroup = new THREE.Group();
    seatPlatformGroup.position.set(0.05, 0.85, 0.82);

    // Platform grating floor (Sàn đứng thao tác)
    const floorGeo = new THREE.BoxGeometry(0.85, 0.05, 0.75);
    const floorMesh = new THREE.Mesh(floorGeo, this.materials.steel);
    floorMesh.castShadow = true;
    seatPlatformGroup.add(floorMesh);

    // Safety perimeter handrails (Lan can bảo vệ quanh ghế)
    const railMat = this.materials.chassis;
    const railFront = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.04, 0.04), railMat);
    railFront.position.set(0, 0.7, 0.36);
    seatPlatformGroup.add(railFront);

    const railBack = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.04, 0.04), railMat);
    railBack.position.set(0, 0.7, -0.36);
    seatPlatformGroup.add(railBack);

    const railSide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.75), railMat);
    railSide.position.set(0.41, 0.7, 0);
    seatPlatformGroup.add(railSide);

    // Ergonomic Operator Bucket Seat (Ghế ngồi người vận hành)
    const seatBaseGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.22, 12);
    const seatBase = new THREE.Mesh(seatBaseGeo, this.materials.steel);
    seatBase.position.set(0, 0.14, 0);
    seatPlatformGroup.add(seatBase);

    // Seat cushion
    const cushionGeo = new THREE.BoxGeometry(0.42, 0.08, 0.42);
    const cushion = new THREE.Mesh(cushionGeo, this.materials.leather);
    cushion.position.set(0, 0.28, 0);
    seatPlatformGroup.add(cushion);

    // Backrest
    const backGeo = new THREE.BoxGeometry(0.08, 0.45, 0.42);
    const backrest = new THREE.Mesh(backGeo, this.materials.leather);
    backrest.position.set(-0.2, 0.52, 0);
    seatPlatformGroup.add(backrest);

    // Headrest
    const headGeo = new THREE.BoxGeometry(0.08, 0.18, 0.28);
    const headrest = new THREE.Mesh(headGeo, this.materials.leather);
    headrest.position.set(-0.2, 0.82, 0);
    seatPlatformGroup.add(headrest);

    // Hydraulic Control Console & Multi-spool Levers (Dàn tay trang điều khiển thủy lực)
    const consoleGeo = new THREE.BoxGeometry(0.24, 0.45, 0.45);
    const consoleMesh = new THREE.Mesh(consoleGeo, this.materials.chassis);
    consoleMesh.position.set(0.32, 0.45, 0);
    seatPlatformGroup.add(consoleMesh);

    // 5 Control levers (Tay trang có núm màu sắc phân biệt)
    const leverColors = ['#dc2626', '#eab308', '#2563eb', '#16a34a', '#f97316'];
    [-0.16, -0.08, 0, 0.08, 0.16].forEach((lz, idx) => {
      const rodGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.18, 8);
      rodGeo.rotateX(Math.PI / 12);
      const rodMesh = new THREE.Mesh(rodGeo, this.materials.chrome);
      rodMesh.position.set(0.32, 0.72, lz);
      seatPlatformGroup.add(rodMesh);

      const knobGeo = new THREE.SphereGeometry(0.025, 8, 8);
      const knobMat = new THREE.MeshStandardMaterial({ color: leverColors[idx % leverColors.length] });
      const knobMesh = new THREE.Mesh(knobGeo, knobMat);
      knobMesh.position.set(0.32, 0.81, lz);
      seatPlatformGroup.add(knobMesh);
    });

    // Foldable Weather Canopy Roof (Mái che nắng mưa trên cao)
    const canopyStemsGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8);
    [-0.32, 0.32].forEach((stemZ) => {
      const stem = new THREE.Mesh(canopyStemsGeo, this.materials.steel);
      stem.position.set(-0.35, 1.3, stemZ);
      seatPlatformGroup.add(stem);
    });

    const canopyRoofGeo = new THREE.BoxGeometry(0.85, 0.04, 0.8);
    const canopyRoof = new THREE.Mesh(canopyRoofGeo, this.materials.body);
    canopyRoof.position.set(-0.05, 1.9, 0);
    canopyRoof.castShadow = true;
    seatPlatformGroup.add(canopyRoof);

    this.superstructureGroup.add(seatPlatformGroup);

    // 4. Main Hoist Winch System at Rear of Kingpost (Cụm tời nâng hàng phía sau trụ cẩu)
    const winchGroup = new THREE.Group();
    winchGroup.position.set(-0.52, 0.82, 0);

    // Cable drum cylinder
    const drumGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.42, 16);
    drumGeo.rotateX(Math.PI / 2);
    const drumMesh = new THREE.Mesh(drumGeo, this.materials.cable);
    winchGroup.add(drumMesh);

    // Hydraulic winch motor & brake housing
    const motorGeo = new THREE.BoxGeometry(0.22, 0.25, 0.2);
    const motorMesh = new THREE.Mesh(motorGeo, this.materials.chassis);
    motorMesh.position.set(0, 0, 0.32);
    winchGroup.add(motorMesh);

    // Guide roller bracket
    const rollerGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.44, 12);
    rollerGeo.rotateX(Math.PI / 2);
    const roller = new THREE.Mesh(rollerGeo, this.materials.steel);
    roller.position.set(0.12, 0.28, 0);
    winchGroup.add(roller);

    this.superstructureGroup.add(winchGroup);

    // 5. Compact Rear Valve Housing (Đuôi cẩu gọn gàng - Tail swing nhỏ)
    const valveGeo = new THREE.BoxGeometry(0.35, 0.45, 0.7);
    const valveBox = new THREE.Mesh(valveGeo, this.materials.chassis);
    valveBox.position.set(-0.68, 0.38, 0);
    valveBox.castShadow = true;
    this.superstructureGroup.add(valveBox);
  }

  // --- BOOM SYSTEMS ---
  _buildTelescopicBoom(specs) {
    const minL = specs.minBoomLength || 11.3;
    const maxL = specs.maxBoomLength || 38.0;
    const baseSectionLength = minL;

    // Base Boom Section (Section 1 - Cần gốc)
    const bGeo = new THREE.BoxGeometry(baseSectionLength, 0.95, 0.85);
    bGeo.translate(baseSectionLength * 0.5, 0, 0);
    this.baseBoomMesh = new THREE.Mesh(bGeo, this.materials.boom);
    this.baseBoomMesh.castShadow = true;
    this.boomAssemblyGroup.add(this.baseBoomMesh);

    // Hydraulic cylinder mounting lugs on underside of base boom
    this.boomCylinderLugs = [];
    [-0.55, 0.55].forEach((posZ) => {
      const lug = new THREE.Group();
      lug.position.set(2.6, -0.48, posZ);

      const lugGeo = new THREE.BoxGeometry(0.3, 0.3, 0.15);
      const lugMesh = new THREE.Mesh(lugGeo, this.materials.boom);
      lug.add(lugMesh);

      this.baseBoomMesh.add(lug);
      this.boomCylinderLugs.push(lug);
    });

    // Telescoping Inner Sections (Sections 2, 3, 4)
    this.telescopicSections = [];
    const numSections = 3;
    const secLen = (maxL - minL) / numSections + 1.5;

    for (let i = 0; i < numSections; i++) {
      const scale = 0.88 - i * 0.08;
      const sGeo = new THREE.BoxGeometry(secLen, 0.95 * scale, 0.85 * scale);
      sGeo.translate(secLen * 0.5, 0, 0);
      const sMesh = new THREE.Mesh(sGeo, i % 2 === 0 ? this.materials.boomInner : this.materials.boom);
      sMesh.position.set(minL - secLen, 0, 0);
      sMesh.castShadow = true;
      this.boomAssemblyGroup.add(sMesh);
      this.telescopicSections.push({ mesh: sMesh, secLen, index: i });
    }

    // Boom Head with Pulleys (Đầu cần cẩu & Puly)
    // Direct child of boomAssemblyGroup so its position is always exactly boomLength along the boom
    this.boomHeadGroup = new THREE.Group();
    this.boomHeadGroup.position.set(minL, 0, 0);

    const headGeo = new THREE.BoxGeometry(0.8, 0.7, 0.65);
    headGeo.translate(0.35, 0, 0);
    const headMesh = new THREE.Mesh(headGeo, this.materials.boom);
    this.boomHeadGroup.add(headMesh);

    // Sheaves (Puly đỉnh cần) - centered at (0, 0, 0) of boomHeadGroup
    const sheaveGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.45, 20);
    sheaveGeo.rotateX(Math.PI / 2);
    const sheaveMesh = new THREE.Mesh(sheaveGeo, this.materials.chrome);
    sheaveMesh.position.set(0, 0, 0);
    this.boomHeadGroup.add(sheaveMesh);

    this.boomAssemblyGroup.add(this.boomHeadGroup);
  }

  _buildLatticeBoom(specs) {
    const boomLen = specs.minBoomLength || 15.0;
    this.minLatticeBoomLen = boomLen;
    // Build lattice truss frame
    const trussGroup = new THREE.Group();
    this.latticeTrussGroup = trussGroup;
    
    // Main 4 chord tubes
    const chordMat = this.materials.boom;
    const chordRadius = 0.08;
    const w = 1.3;
    const h = 1.3;

    [
      { y: h * 0.5, z: w * 0.5 },
      { y: h * 0.5, z: -w * 0.5 },
      { y: -h * 0.5, z: w * 0.5 },
      { y: -h * 0.5, z: -w * 0.5 }
    ].forEach((pos) => {
      const tubeGeo = new THREE.CylinderGeometry(chordRadius, chordRadius, boomLen, 12);
      tubeGeo.rotateZ(Math.PI / 2);
      tubeGeo.translate(boomLen * 0.5, pos.y, pos.z);
      const tube = new THREE.Mesh(tubeGeo, chordMat);
      tube.castShadow = true;
      trussGroup.add(tube);
    });

    // Lattice diagonal braces
    const numBays = Math.floor(boomLen / 1.5);
    for (let i = 0; i < numBays; i++) {
      const x0 = i * 1.5;
      const x1 = (i + 1) * 1.5;
      
      const diagGeo = new THREE.CylinderGeometry(0.04, 0.04, Math.hypot(1.5, h), 8);
      diagGeo.rotateZ(Math.PI / 4);
      diagGeo.translate((x0 + x1) * 0.5, 0, w * 0.5);
      const diag1 = new THREE.Mesh(diagGeo, this.materials.boomInner);
      trussGroup.add(diag1);
    }

    this.boomAssemblyGroup.add(trussGroup);

    // Boom Head
    this.boomHeadGroup = new THREE.Group();
    this.boomHeadGroup.position.set(boomLen, 0, 0);
    const sheaveGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 20);
    sheaveGeo.rotateX(Math.PI / 2);
    const sheave = new THREE.Mesh(sheaveGeo, this.materials.chrome);
    sheave.position.set(0, 0, 0);
    this.boomHeadGroup.add(sheave);
    this.boomAssemblyGroup.add(this.boomHeadGroup);
  }

  _buildTowerJib(specs) {
    const jibLen = 45.0;
    const jibGroup = new THREE.Group();

    // Horizontal triangular lattice jib
    const chordMat = this.materials.boom;
    const w = 1.2;
    const h = 1.4;

    [
      { y: h * 0.5, z: 0 },
      { y: -h * 0.5, z: w * 0.5 },
      { y: -h * 0.5, z: -w * 0.5 }
    ].forEach((pos) => {
      const tubeGeo = new THREE.CylinderGeometry(0.06, 0.06, jibLen, 8);
      tubeGeo.rotateZ(Math.PI / 2);
      tubeGeo.translate(jibLen * 0.5, pos.y, pos.z);
      jibGroup.add(new THREE.Mesh(tubeGeo, chordMat));
    });

    // Counter-jib at rear
    const cJibLen = 14.0;
    const cGeo = new THREE.BoxGeometry(cJibLen, 0.8, 1.2);
    cGeo.translate(-cJibLen * 0.5, 0, 0);
    const cMesh = new THREE.Mesh(cGeo, this.materials.boom);
    jibGroup.add(cMesh);

    // Counterweight blocks at rear
    const cwMesh = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 1.4), this.materials.counterweight);
    cwMesh.position.set(-cJibLen + 2.0, 0.6, 0);
    jibGroup.add(cwMesh);

    this.boomAssemblyGroup.add(jibGroup);

    // Trolley
    this.boomHeadGroup = new THREE.Group();
    this.boomHeadGroup.position.set(20.0, -0.6, 0);
    const trolleyMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.0), this.materials.steel);
    this.boomHeadGroup.add(trolleyMesh);
    this.boomAssemblyGroup.add(this.boomHeadGroup);
  }

  _buildLuffingCylinders(specs) {
    this.luffingRams = [];

    const cylinderMat = this.materials.steel;
    const rodMat = this.materials.chrome;

    const basePivotX = 0.5;
    const basePivotY = 0.35;
    const barrelLength = 2.2;
    const rodLength = 2.4;

    [-0.55, 0.55].forEach((posZ, idx) => {
      const ramGroup = new THREE.Group();
      ramGroup.position.set(basePivotX, basePivotY, posZ);

      // Base clevis mounting bracket
      const bracketGeo = new THREE.BoxGeometry(0.35, 0.35, 0.25);
      const bracketMesh = new THREE.Mesh(bracketGeo, this.materials.chassis);
      bracketMesh.position.set(0, 0, 0);
      ramGroup.add(bracketMesh);

      // 1. Outer cylinder barrel (vỏ xi lanh nâng cần)
      const barrelGeo = new THREE.CylinderGeometry(0.16, 0.16, barrelLength, 16);
      barrelGeo.rotateZ(-Math.PI / 2);
      barrelGeo.translate(barrelLength * 0.5, 0, 0);
      const barrel = new THREE.Mesh(barrelGeo, cylinderMat);
      barrel.castShadow = true;
      ramGroup.add(barrel);

      // 2. Inner chrome piston rod (ti ben mạ crom)
      const rodGroup = new THREE.Group();
      const rodGeo = new THREE.CylinderGeometry(0.11, 0.11, rodLength, 16);
      rodGeo.rotateZ(-Math.PI / 2);
      rodGeo.translate(rodLength * 0.5, 0, 0);
      const rod = new THREE.Mesh(rodGeo, rodMat);
      rod.castShadow = true;
      rodGroup.add(rod);

      // Rod top pin connecting to the boom lug
      const pinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.28, 12);
      pinGeo.rotateX(Math.PI / 2);
      const pin = new THREE.Mesh(pinGeo, this.materials.steel);
      pin.position.set(rodLength, 0, 0);
      rodGroup.add(pin);

      ramGroup.add(rodGroup);
      this.superstructureGroup.add(ramGroup);

      this.luffingRams.push({
        ramGroup,
        rodGroup,
        basePivotX,
        basePivotY,
        posZ,
        barrelLength,
        rodLength,
        lugIndex: idx
      });
    });
  }

  _buildTruckTelescopicBoom(specs, craneConfig) {
    const minL = specs.minBoomLength || 5.6;
    const maxL = specs.maxBoomLength || 20.7;
    const baseSectionLength = minL;

    // Base Boom Section (Section 1 - Cần gốc tiết diện lục giác)
    const bGeo = new THREE.BoxGeometry(baseSectionLength, 0.62, 0.52);
    bGeo.translate(baseSectionLength * 0.5, 0, 0);
    this.baseBoomMesh = new THREE.Mesh(bGeo, this.materials.boom);
    this.baseBoomMesh.castShadow = true;
    this.boomAssemblyGroup.add(this.baseBoomMesh);

    // Underside lug for central hydraulic luffing ram
    this.boomCylinderLugs = [];
    const lug = new THREE.Group();
    lug.position.set(1.6, -0.32, 0);

    const lugGeo = new THREE.BoxGeometry(0.32, 0.28, 0.2);
    const lugMesh = new THREE.Mesh(lugGeo, this.materials.steel);
    lug.add(lugMesh);

    this.baseBoomMesh.add(lug);
    this.boomCylinderLugs.push(lug);

    // Telescoping Inner Sections (4 đốt trong tạo thành cần 5 đoạn thực tế)
    this.telescopicSections = [];
    const numSections = 4;
    const secLen = (maxL - minL) / numSections + 1.2;
    const scales = [0.86, 0.74, 0.63, 0.53];

    for (let i = 0; i < numSections; i++) {
      const scale = scales[i];
      const sGeo = new THREE.BoxGeometry(secLen, 0.62 * scale, 0.52 * scale);
      sGeo.translate(secLen * 0.5, 0, 0);
      const sMesh = new THREE.Mesh(sGeo, i % 2 === 0 ? this.materials.boomInner : this.materials.boom);
      sMesh.position.set(minL - secLen, 0, 0);
      sMesh.castShadow = true;
      this.boomAssemblyGroup.add(sMesh);
      this.telescopicSections.push({ mesh: sMesh, secLen, index: i });
    }

    // Boom Head with Dual Pulleys (Đầu cần cẩu & Puly đôi)
    this.boomHeadGroup = new THREE.Group();
    this.boomHeadGroup.position.set(minL, 0, 0);

    const headGeo = new THREE.BoxGeometry(0.65, 0.52, 0.45);
    const headMesh = new THREE.Mesh(headGeo, this.materials.boom);
    this.boomHeadGroup.add(headMesh);

    // Dual sheave wheels (Puly cáp)
    const sheaveGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16);
    sheaveGeo.rotateX(Math.PI / 2);
    [-0.1, 0.1].forEach((posZ) => {
      const sheave = new THREE.Mesh(sheaveGeo, this.materials.steel);
      sheave.position.set(0.35, 0.05, posZ);
      this.boomHeadGroup.add(sheave);
    });

    // Anti-two-block limit switch weight (Quả tạ chống cọ mỏ hàn/chập tải)
    const atbGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.22, 12);
    const atbMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.6, roughness: 0.3 });
    const atbMesh = new THREE.Mesh(atbGeo, atbMat);
    atbMesh.position.set(0.35, -0.22, 0.16);
    this.boomHeadGroup.add(atbMesh);

    this.boomAssemblyGroup.add(this.boomHeadGroup);
  }

  _buildTruckLuffingCylinders(specs, craneConfig) {
    this.luffingRams = [];

    const cylinderMat = this.materials.steel;
    const rodMat = this.materials.chrome;

    const basePivotX = 0.22;
    const basePivotY = 0.2;
    const posZ = 0;
    const barrelLength = 1.35;
    const rodLength = 1.45;

    const ramGroup = new THREE.Group();
    ramGroup.position.set(basePivotX, basePivotY, posZ);

    // Heavy base clevis bracket on kingpost
    const bracketGeo = new THREE.BoxGeometry(0.32, 0.32, 0.25);
    const bracketMesh = new THREE.Mesh(bracketGeo, this.materials.chassis);
    ramGroup.add(bracketMesh);

    // 1. Outer hydraulic cylinder barrel (Vỏ xi lanh nâng cần ben thủy lực)
    const barrelGeo = new THREE.CylinderGeometry(0.13, 0.13, barrelLength, 16);
    barrelGeo.rotateZ(-Math.PI / 2);
    barrelGeo.translate(barrelLength * 0.5, 0, 0);
    const barrel = new THREE.Mesh(barrelGeo, cylinderMat);
    barrel.castShadow = true;
    ramGroup.add(barrel);

    // 2. Inner chrome piston rod (Ti ben nâng cần mạ crom)
    const rodGroup = new THREE.Group();
    const rodGeo = new THREE.CylinderGeometry(0.09, 0.09, rodLength, 16);
    rodGeo.rotateZ(-Math.PI / 2);
    rodGeo.translate(rodLength * 0.5, 0, 0);
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.castShadow = true;
    rodGroup.add(rod);

    // Rod top connecting pin
    const pinGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.24, 12);
    pinGeo.rotateX(Math.PI / 2);
    const pin = new THREE.Mesh(pinGeo, this.materials.steel);
    pin.position.set(rodLength, 0, 0);
    rodGroup.add(pin);

    ramGroup.add(rodGroup);
    this.superstructureGroup.add(ramGroup);

    this.luffingRams.push({
      ramGroup,
      rodGroup,
      basePivotX,
      basePivotY,
      posZ,
      barrelLength,
      rodLength,
      lugIndex: 0
    });
  }

  // --- HOOK BLOCK & LOAD ---
  _buildHookAndLoad(options = {}) {
    this.hookGroup = new THREE.Group();
    this.craneGroup.add(this.hookGroup);

    // Sheave block
    const blockGeo = new THREE.BoxGeometry(0.55, 0.8, 0.4);
    const blockMesh = new THREE.Mesh(blockGeo, this.materials.hook);
    blockMesh.castShadow = true;
    this.hookGroup.add(blockMesh);

    // Crane Hook (torus + cone curve)
    const hookTorusGeo = new THREE.TorusGeometry(0.22, 0.07, 12, 24, Math.PI * 1.3);
    hookTorusGeo.rotateZ(-Math.PI * 0.4);
    const hookTorus = new THREE.Mesh(hookTorusGeo, this.materials.steel);
    hookTorus.position.set(0, -0.6, 0);
    this.hookGroup.add(hookTorus);

    // Hoist line cables (lines connecting boom tip down to hook block)
    const cableGeo = new THREE.CylinderGeometry(0.015, 0.015, 1, 6);
    this.cableMesh = new THREE.Mesh(cableGeo, this.materials.cable);
    this.craneGroup.add(this.cableMesh);

    // Load Group
    this.loadGroup = new THREE.Group();
    this.craneGroup.add(this.loadGroup);

    this.rebuildLoadMesh(
      options.loadType || 'box',
      options.loadDims || { l: 4.0, w: 2.4, h: 2.6 },
      options.slingAngleDeg || 60,
      options.slingType || 'wire_rope',
      options.slingLegs !== undefined ? options.slingLegs : 4
    );
  }

  /**
   * Rebuild the 3D load object (Box, Tank, Vessel, Pipe Spool) with dynamic Rigging Slings
   */
  rebuildLoadMesh(
    type = 'box',
    dims = { l: 4.0, w: 2.4, h: 2.6 },
    slingAngleDeg = 60,
    slingType = 'wire_rope',
    slingLegs = 4
  ) {
    if (!this.loadGroup) return;
    this._clearGroup(this.loadGroup);

    this.currentLoadDims = dims;
    this.currentLoadType = type;
    this.currentSlingType = slingType || 'wire_rope';
    this.currentSlingLegs = Number(slingLegs) || 4;
    this.currentSlingAngleDeg = Number(slingAngleDeg) || 60;

    const isCylindrical = (type === 'tank' || type === 'cylinder' || type === 'vessel');
    // For horizontal cylinder, circular radius in Y-Z plane is half of diameter
    const cylRadius = Math.min(dims.w, dims.h) * 0.5;

    // Calculate sling height based on pick points spread and sling angle
    const rad = (this.currentSlingAngleDeg * Math.PI) / 180;
    let padSpreadR = 0;

    if (isCylindrical) {
      const halfL = type === 'vessel' ? dims.l * 0.28 : dims.l * 0.35;
      if (this.currentSlingLegs === 1) {
        padSpreadR = 0;
        this.currentSlingHeight = 2.0;
      } else if (this.currentSlingLegs === 2) {
        padSpreadR = halfL;
        this.currentSlingHeight = Math.max(1.5, padSpreadR * Math.tan(rad));
      } else {
        const zOff = cylRadius * Math.sin((32 * Math.PI) / 180);
        padSpreadR = Math.hypot(halfL, zOff);
        this.currentSlingHeight = Math.max(1.5, padSpreadR * Math.tan(rad));
      }
    } else {
      const halfL = dims.l * 0.45;
      const halfW = dims.w * 0.45;
      if (this.currentSlingLegs === 1) {
        padSpreadR = 0;
        this.currentSlingHeight = 2.0;
      } else if (this.currentSlingLegs === 2) {
        padSpreadR = halfL;
        this.currentSlingHeight = Math.max(1.5, padSpreadR * Math.tan(rad));
      } else {
        padSpreadR = Math.hypot(halfL, halfW);
        this.currentSlingHeight = Math.max(1.5, padSpreadR * Math.tan(rad));
      }
    }

    const loadMat = new THREE.MeshStandardMaterial({
      color: '#0284c7', // Industrial cyan/blue
      roughness: 0.35,
      metalness: 0.55
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: '#334155', // Dark structural steel
      roughness: 0.5,
      metalness: 0.65
    });
    const brightSteelMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1', // Machined flange face & galvanized bolts
      roughness: 0.22,
      metalness: 0.85
    });
    const innerPipeMat = new THREE.MeshStandardMaterial({
      color: '#0f172a', // Dark oxidized steel pipe interior
      roughness: 0.85,
      metalness: 0.3,
      side: THREE.DoubleSide
    });
    const timberMat = new THREE.MeshStandardMaterial({
      color: '#92400e', // Hardwood timber dunnage blocks
      roughness: 0.88,
      metalness: 0.05
    });

    const mesh = new THREE.Group();

    if (type === 'vessel') {
      // ============================================================
      // 1. BÌNH ÁP LỰC CHỎM CẦU TIÊU CHUẨN (ASME SECTION VIII VESSEL)
      // ============================================================
      const radius = cylRadius;
      // ASME 2:1 Ellipsoidal Head Depth = radius * 0.55
      const headDepth = radius * 0.55;
      const bodyLen = Math.max(1.0, dims.l - 2 * headDepth);

      // Main cylindrical shell body (open-ended to fuse seamlessly with dished heads)
      const cylGeo = new THREE.CylinderGeometry(radius, radius, bodyLen, 36, 1, true);
      cylGeo.rotateZ(Math.PI / 2);
      const cylMesh = new THREE.Mesh(cylGeo, loadMat);
      mesh.add(cylMesh);

      // Two authentic 2:1 Ellipsoidal Dished Heads (Chỏm cầu 2:1 lồi ra ngoài)
      // Right dish head: bulges toward +X
      const capGeoR = new THREE.SphereGeometry(radius, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5);
      capGeoR.rotateZ(-Math.PI / 2);
      const capR = new THREE.Mesh(capGeoR, loadMat);
      capR.scale.set(0.55, 1, 1);
      capR.position.set(bodyLen * 0.5, 0, 0);

      // Left dish head: bulges toward -X
      const capGeoL = new THREE.SphereGeometry(radius, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5);
      capGeoL.rotateZ(Math.PI / 2);
      const capL = new THREE.Mesh(capGeoL, loadMat);
      capL.scale.set(0.55, 1, 1);
      capL.position.set(-bodyLen * 0.5, 0, 0);

      mesh.add(capR, capL);

      // Tangent-line circumferential butt weld seams (Mối hàn giáp mối chỏm cầu)
      [-bodyLen * 0.5, bodyLen * 0.5].forEach((wx) => {
        const weldGeo = new THREE.TorusGeometry(radius + 0.008, 0.012, 6, 36);
        weldGeo.rotateY(Math.PI / 2);
        const weldMesh = new THREE.Mesh(weldGeo, darkSteelMat);
        weldMesh.position.set(wx, 0, 0);
        mesh.add(weldMesh);
      });

      // Circumferential Shell Stiffener Rings (Vòng gân gia cường vỏ bồn chống xẹp)
      [-bodyLen * 0.20, bodyLen * 0.20].forEach((sx) => {
        const stiffenerGeo = new THREE.TorusGeometry(radius + 0.024, 0.024, 8, 36);
        stiffenerGeo.rotateY(Math.PI / 2);
        const stiffenerMesh = new THREE.Mesh(stiffenerGeo, darkSteelMat);
        stiffenerMesh.position.set(sx, 0, 0);
        mesh.add(stiffenerMesh);
      });

      // Heavy Bolted Manway (Cửa người chui có nắp bích mù và bu lông)
      const manwayX = -bodyLen * 0.25;
      const manwayR = Math.min(0.36, radius * 0.32);
      const manwayH = 0.32;

      // Manway neck
      const mNeckGeo = new THREE.CylinderGeometry(manwayR, manwayR, manwayH, 24);
      const mNeck = new THREE.Mesh(mNeckGeo, loadMat);
      mNeck.position.set(manwayX, radius + manwayH * 0.5, 0);

      // Heavy welding neck flange
      const mFlangeGeo = new THREE.CylinderGeometry(manwayR * 1.35, manwayR * 1.35, 0.07, 24);
      const mFlange = new THREE.Mesh(mFlangeGeo, brightSteelMat);
      mFlange.position.set(manwayX, radius + manwayH + 0.035, 0);

      // Bolted blind cover
      const mCoverGeo = new THREE.CylinderGeometry(manwayR * 1.35, manwayR * 1.35, 0.05, 24);
      const mCover = new THREE.Mesh(mCoverGeo, loadMat);
      mCover.position.set(manwayX, radius + manwayH + 0.095, 0);

      // Circle of hex bolts on manway
      const numMBolts = 12;
      const boltCircleR = manwayR * 1.18;
      const boltGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.09, 8);
      for (let i = 0; i < numMBolts; i++) {
        const bAngle = (i / numMBolts) * Math.PI * 2;
        const bMesh = new THREE.Mesh(boltGeo, brightSteelMat);
        bMesh.position.set(
          manwayX + Math.cos(bAngle) * boltCircleR,
          radius + manwayH + 0.07,
          Math.sin(bAngle) * boltCircleR
        );
        mesh.add(bMesh);
      }

      // Davit Hinge Arm (Bản lề đỡ nắp cửa thăm)
      const davitGeo = new THREE.BoxGeometry(0.06, 0.28, 0.06);
      const davitMesh = new THREE.Mesh(davitGeo, darkSteelMat);
      davitMesh.position.set(manwayX + manwayR * 1.38, radius + manwayH + 0.08, 0);
      mesh.add(mNeck, mFlange, mCover, davitMesh);

      // Process Nozzle 1: Relief valve nozzle with raised-face flange
      const noz1X = bodyLen * 0.22;
      const noz1R = Math.min(0.18, radius * 0.16);
      const noz1H = 0.35;
      const noz1Neck = new THREE.Mesh(new THREE.CylinderGeometry(noz1R, noz1R, noz1H, 18), loadMat);
      noz1Neck.position.set(noz1X, radius + noz1H * 0.5, 0);
      const noz1Flange = new THREE.Mesh(new THREE.CylinderGeometry(noz1R * 1.5, noz1R * 1.5, 0.06, 18), brightSteelMat);
      noz1Flange.position.set(noz1X, radius + noz1H + 0.03, 0);
      const noz1Face = new THREE.Mesh(new THREE.CylinderGeometry(noz1R * 1.1, noz1R * 1.1, 0.02, 18), brightSteelMat);
      noz1Face.position.set(noz1X, radius + noz1H + 0.07, 0);

      // Process Nozzle 2: Instrument / Inlet nozzle
      const noz2X = 0;
      const noz2R = Math.min(0.14, radius * 0.12);
      const noz2H = 0.28;
      const noz2Neck = new THREE.Mesh(new THREE.CylinderGeometry(noz2R, noz2R, noz2H, 18), loadMat);
      noz2Neck.position.set(noz2X, radius + noz2H * 0.5, 0);
      const noz2Flange = new THREE.Mesh(new THREE.CylinderGeometry(noz2R * 1.5, noz2R * 1.5, 0.05, 18), brightSteelMat);
      noz2Flange.position.set(noz2X, radius + noz2H + 0.025, 0);

      mesh.add(noz1Neck, noz1Flange, noz1Face, noz2Neck, noz2Flange);

      // Fabricated Pressure Vessel Saddles with Triangular Gusset Ribs (Chân đỡ bồn áp lực có sườn tăng cứng)
      const saddleSpacing = bodyLen * 0.34;
      [-saddleSpacing, saddleSpacing].forEach((sx) => {
        const saddleGroup = new THREE.Group();
        saddleGroup.position.set(sx, 0, 0);

        // Curved wear pad plate (tấm đệm lót thân bồn)
        const wearPlateGeo = new THREE.CylinderGeometry(radius + 0.015, radius + 0.015, 0.34, 24, 1, true, Math.PI * 0.8, Math.PI * 1.4);
        wearPlateGeo.rotateZ(Math.PI / 2);
        const wearPlate = new THREE.Mesh(wearPlateGeo, darkSteelMat);
        saddleGroup.add(wearPlate);

        // Saddle vertical web plate
        const webH = radius * 0.65;
        const webW = radius * 1.45;
        const web = new THREE.Mesh(new THREE.BoxGeometry(0.04, webH, webW), darkSteelMat);
        web.position.set(0, -radius * 0.68, 0);
        saddleGroup.add(web);

        // Saddle bottom base plate
        const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, webW * 1.08), darkSteelMat);
        basePlate.position.set(0, -radius * 1.0, 0);
        saddleGroup.add(basePlate);

        // 4 Triangular gusset stiffeners (sườn tăng cứng tam giác)
        [-webW * 0.42, -webW * 0.16, webW * 0.16, webW * 0.42].forEach((gz) => {
          const gusset = new THREE.Mesh(new THREE.BoxGeometry(0.30, webH * 0.85, 0.024), darkSteelMat);
          gusset.position.set(0, -radius * 0.62, gz);
          saddleGroup.add(gusset);
        });

        mesh.add(saddleGroup);
      });

    } else if (type === 'cylinder') {
      // ============================================================
      // 2. ỐNG THÉP CÔNG NGHIỆP / PIPE SPOOL (RỖNG HAI ĐẦU + MẶT BÍCH HÀN)
      // ============================================================
      const radius = cylRadius;
      const wallThick = Math.max(0.06, radius * 0.14);
      const innerRadius = radius - wallThick;

      // Outer steel pipe shell (mặt ngoài ống)
      const outerGeo = new THREE.CylinderGeometry(radius, radius, dims.l, 36, 1, true);
      outerGeo.rotateZ(Math.PI / 2);
      const outerMesh = new THREE.Mesh(outerGeo, loadMat);
      mesh.add(outerMesh);

      // Dark interior pipe bore (thành trong ống rỗng thấy rõ lõi)
      const innerGeo = new THREE.CylinderGeometry(innerRadius, innerRadius, dims.l, 36, 1, true);
      innerGeo.rotateZ(Math.PI / 2);
      const innerMesh = new THREE.Mesh(innerGeo, innerPipeMat);
      mesh.add(innerMesh);

      // Annular end rim plates at both ends
      [-dims.l * 0.5, dims.l * 0.5].forEach((ex) => {
        const rimGeo = new THREE.RingGeometry(innerRadius, radius, 36);
        rimGeo.rotateY(Math.PI / 2);
        const rimMesh = new THREE.Mesh(rimGeo, brightSteelMat);
        rimMesh.position.set(ex, 0, 0);
        mesh.add(rimMesh);
      });

      // Heavy ASME B16.5 Welding Neck Flanges at both ends (Mặt bích hàn hai đầu)
      const flangeR = radius * 1.32;
      const flangeThick = 0.12;
      [-dims.l * 0.5 + flangeThick * 0.5, dims.l * 0.5 - flangeThick * 0.5].forEach((fx) => {
        // Outer flange rim (open-ended cylinder)
        const fRimGeo = new THREE.CylinderGeometry(flangeR, flangeR, flangeThick, 36, 1, true);
        fRimGeo.rotateZ(Math.PI / 2);
        const fRim = new THREE.Mesh(fRimGeo, brightSteelMat);
        fRim.position.set(fx, 0, 0);
        mesh.add(fRim);

        // Front hollow flange face ring
        const isFarRight = fx > 0;
        const frontFaceX = isFarRight ? dims.l * 0.5 : -dims.l * 0.5;
        const fFaceGeo = new THREE.RingGeometry(innerRadius, flangeR, 36);
        fFaceGeo.rotateY(isFarRight ? Math.PI / 2 : -Math.PI / 2);
        const fFace = new THREE.Mesh(fFaceGeo, brightSteelMat);
        fFace.position.set(frontFaceX, 0, 0);
        mesh.add(fFace);

        // Raised face lip (gờ mặt gương tiếp xúc gioăng đệm)
        const rfGeo = new THREE.RingGeometry(innerRadius, radius * 1.12, 36);
        rfGeo.rotateY(isFarRight ? Math.PI / 2 : -Math.PI / 2);
        const rfMesh = new THREE.Mesh(rfGeo, darkSteelMat);
        rfMesh.position.set(frontFaceX + (isFarRight ? 0.008 : -0.008), 0, 0);
        mesh.add(rfMesh);

        // Welding neck taper hub (cổ côn nối ống)
        const hubDir = fx > 0 ? -1 : 1;
        const hubGeo = new THREE.CylinderGeometry(radius, flangeR * 0.90, 0.16, 36, 1, true);
        hubGeo.rotateZ(Math.PI / 2);
        const hub = new THREE.Mesh(hubGeo, loadMat);
        hub.position.set(fx + hubDir * 0.14, 0, 0);
        mesh.add(hub);

        // Circle of 16 heavy studs/bolts through the flange
        const numBolts = 16;
        const boltCircleR = (radius * 1.14 + flangeR) * 0.5;
        const studGeo = new THREE.CylinderGeometry(0.018, 0.018, flangeThick * 1.4, 8);
        studGeo.rotateZ(Math.PI / 2);
        for (let i = 0; i < numBolts; i++) {
          const bAng = (i / numBolts) * Math.PI * 2;
          const stud = new THREE.Mesh(studGeo, darkSteelMat);
          stud.position.set(
            fx,
            Math.cos(bAng) * boltCircleR,
            Math.sin(bAng) * boltCircleR
          );
          mesh.add(stud);
        }
      });

      // Circumferential Butt Welds along pipe (Mối hàn giáp mối ống)
      [-dims.l * 0.24, dims.l * 0.24].forEach((wx) => {
        const weldGeo = new THREE.TorusGeometry(radius + 0.008, 0.012, 6, 36);
        weldGeo.rotateY(Math.PI / 2);
        const weldMesh = new THREE.Mesh(weldGeo, brightSteelMat);
        weldMesh.position.set(wx, 0, 0);
        mesh.add(weldMesh);
      });

      // Welded Branch Tee Nozzle with Flange (Cổ nhánh rẽ chữ T đặc trưng của Pipe Spool)
      const branchR = radius * 0.48;
      const branchH = radius * 0.70;
      const bPipe = new THREE.Mesh(new THREE.CylinderGeometry(branchR, branchR, branchH, 24), loadMat);
      bPipe.position.set(0, radius + branchH * 0.5 - 0.04, 0);

      const bFlangeR = branchR * 1.35;
      const bFlange = new THREE.Mesh(new THREE.CylinderGeometry(bFlangeR, bFlangeR, 0.08, 24), brightSteelMat);
      bFlange.position.set(0, radius + branchH + 0.01, 0);

      const saddlePad = new THREE.Mesh(new THREE.CylinderGeometry(branchR * 1.32, branchR * 1.32, 0.025, 24), darkSteelMat);
      saddlePad.position.set(0, radius + 0.012, 0);
      mesh.add(bPipe, bFlange, saddlePad);

      // Hardwood Timber Dunnage Blocks (Gối gỗ kê chống lăn ống trên công trường)
      const dunnageSpacing = dims.l * 0.32;
      [-dunnageSpacing, dunnageSpacing].forEach((dx) => {
        const timberGroup = new THREE.Group();
        timberGroup.position.set(dx, 0, 0);

        // Main heavy timber beam sleeper on ground
        const beamW = radius * 1.6;
        const beamH = 0.22;
        const beamL = 0.36;
        const beam = new THREE.Mesh(new THREE.BoxGeometry(beamL, beamH, beamW), timberMat);
        beam.position.set(0, -radius - beamH * 0.5, 0);
        timberGroup.add(beam);

        // Two 45-degree angled wooden wedges (con kê gỗ chống lăn ống)
        [-radius * 0.55, radius * 0.55].forEach((wz) => {
          const wedge = new THREE.Mesh(new THREE.BoxGeometry(beamL * 0.85, 0.16, 0.18), timberMat);
          wedge.position.set(0, -radius + 0.04, wz);
          wedge.rotation.x = wz > 0 ? -0.42 : 0.42;
          timberGroup.add(wedge);
        });

        mesh.add(timberGroup);
      });

    } else if (type === 'tank') {
      // ============================================================
      // 3. BỒN CHỨA TRỤ NẰM NGANG (HORIZONTAL STORAGE TANK)
      // ============================================================
      const radius = cylRadius;
      const geo = new THREE.CylinderGeometry(radius, radius, dims.l, 36);
      geo.rotateZ(Math.PI / 2);
      const tankBody = new THREE.Mesh(geo, loadMat);
      mesh.add(tankBody);

      // Top Dome Inspection Hatch (Nắp vòm thăm bồn với bản lề và tay nắm)
      const hatchR = Math.min(0.38, radius * 0.35);
      const hatchH = 0.18;
      const hatchDome = new THREE.Mesh(new THREE.CylinderGeometry(hatchR, hatchR * 1.05, hatchH, 24), darkSteelMat);
      hatchDome.position.set(-dims.l * 0.15, radius + hatchH * 0.5, 0);

      const hatchCover = new THREE.Mesh(new THREE.CylinderGeometry(hatchR * 1.1, hatchR * 1.1, 0.05, 24), brightSteelMat);
      hatchCover.position.set(-dims.l * 0.15, radius + hatchH + 0.025, 0);

      // Hatch Handle
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.016, 6, 12, Math.PI), brightSteelMat);
      handle.position.set(-dims.l * 0.15, radius + hatchH + 0.06, 0);
      handle.rotateX(Math.PI / 2);
      mesh.add(hatchDome, hatchCover, handle);

      // Gooseneck Breather / Vent Pipe (Ống thở chữ U cong ngược thông áp)
      const ventR = 0.06;
      const ventH = 0.42;
      const ventStem = new THREE.Mesh(new THREE.CylinderGeometry(ventR, ventR, ventH, 16), darkSteelMat);
      ventStem.position.set(dims.l * 0.22, radius + ventH * 0.5, 0);

      const ventCap = new THREE.Mesh(new THREE.TorusGeometry(0.12, ventR, 8, 16, Math.PI), darkSteelMat);
      ventCap.position.set(dims.l * 0.22 + 0.12, radius + ventH, 0);
      mesh.add(ventStem, ventCap);

      // Top filling nozzle with flange
      const fillNoz = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 16), loadMat);
      fillNoz.position.set(0, radius + 0.125, 0);
      const fillFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.05, 16), brightSteelMat);
      fillFlange.position.set(0, radius + 0.25, 0);
      mesh.add(fillNoz, fillFlange);

      // Fabricated Storage Tank Saddles
      const saddleSpacing = dims.l * 0.35;
      [-saddleSpacing, saddleSpacing].forEach((sx) => {
        const saddleGeo = new THREE.BoxGeometry(0.32, radius * 0.55, radius * 1.45);
        const saddleMesh = new THREE.Mesh(saddleGeo, darkSteelMat);
        saddleMesh.position.set(sx, -radius * 0.72, 0);
        mesh.add(saddleMesh);
      });

    } else {
      // ============================================================
      // 4. KHỐI HỘP / CONTAINER / MODULE MÁY MÓC (BOX / MODULE)
      // ============================================================
      const geo = new THREE.BoxGeometry(dims.l, dims.h, dims.w);
      const boxMesh = new THREE.Mesh(geo, loadMat);
      mesh.add(boxMesh);

      // ISO Container Corner Castings (Gù góc container)
      const cornerGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
      const halfX = dims.l * 0.5 - 0.11;
      const halfY = dims.h * 0.5 - 0.11;
      const halfZ = dims.w * 0.5 - 0.11;

      [-halfX, halfX].forEach((cx) => {
        [-halfY, halfY].forEach((cy) => {
          [-halfZ, halfZ].forEach((cz) => {
            const corner = new THREE.Mesh(cornerGeo, darkSteelMat);
            corner.position.set(cx, cy, cz);
            mesh.add(corner);
          });
        });
      });
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.loadGroup.add(mesh);

    // Rigging slings connecting hook to load
    this._rebuildRiggingSlings(dims, type, this.currentSlingHeight, this.currentSlingType, this.currentSlingLegs);
  }

  _rebuildRiggingSlings(dims, type, slingHeight, slingType = 'wire_rope', slingLegs = 4) {
    // 1. Engineering Materials
    const steelMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8', // Silver metallic wire rope / galvanized steel
      roughness: 0.25,
      metalness: 0.85
    });
    const brightSteelMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0', // Polished swaged aluminum/steel ferrule sleeve
      roughness: 0.2,
      metalness: 0.9
    });
    const g80RedMat = new THREE.MeshStandardMaterial({
      color: '#dc2626', // Grade 80 alloy forged safety red
      roughness: 0.3,
      metalness: 0.65
    });
    const syntheticMat = new THREE.MeshStandardMaterial({
      color: '#f59e0b', // High-vis golden/amber woven polyester webbing strap
      roughness: 0.85,
      metalness: 0.05
    });
    const wearSleeveMat = new THREE.MeshStandardMaterial({
      color: '#1e293b', // Heavy-duty black/charcoal protective anti-abrasion sleeve
      roughness: 0.95,
      metalness: 0.0
    });
    const blueTagMat = new THREE.MeshStandardMaterial({
      color: '#2563eb', // Safety blue CE/ASME certification tag
      roughness: 0.8,
      metalness: 0.1
    });
    const chainMat = new THREE.MeshStandardMaterial({
      color: '#334155', // Dark manganese alloy steel chain links
      roughness: 0.35,
      metalness: 0.8
    });

    const isCylindrical = (type === 'tank' || type === 'cylinder' || type === 'vessel');
    const cylRadius = Math.min(dims.w, dims.h) * 0.5;

    // Sling Apex Y (above top crest of load)
    const topCrestY = isCylindrical ? cylRadius : dims.h * 0.5;
    const slingApexY = topCrestY + slingHeight;
    const startPoint = new THREE.Vector3(0, slingApexY, 0);

    // 2. Pick Points according to shape and number of legs
    let pickPoints = [];

    if (isCylindrical) {
      // For horizontal cylinders / tanks:
      // Lengthwise positioning along the cylindrical body (well clear of dish heads)
      const halfL = type === 'vessel' ? dims.l * 0.28 : dims.l * 0.35;

      if (slingLegs === 1) {
        // 1 leg: Single top-center lifting lug right on the crest (x=0, y=R, z=0)
        pickPoints = [{ x: 0, y: cylRadius, z: 0, nx: 0, ny: 1, nz: 0, rotX: 0 }];
      } else if (slingLegs === 2) {
        // 2 legs: Two lifting lugs along the top crest line (y=R, z=0)
        pickPoints = [
          { x: halfL, y: cylRadius, z: 0, nx: 0, ny: 1, nz: 0, rotX: 0 },
          { x: -halfL, y: cylRadius, z: 0, nx: 0, ny: 1, nz: 0, rotX: 0 }
        ];
      } else {
        // 4 legs: 4 pad-eyes welded on the cylindrical shell at angle θ from vertical
        const thetaDeg = 32; // 32 degrees from top vertical crest
        const thetaRad = (thetaDeg * Math.PI) / 180;
        const zOff = cylRadius * Math.sin(thetaRad);
        const yOff = cylRadius * Math.cos(thetaRad); // exactly on cylinder surface: y^2 + z^2 = R^2!
        const ny = Math.cos(thetaRad);
        const nz = Math.sin(thetaRad);

        pickPoints = [
          { x: halfL, y: yOff, z: zOff, nx: 0, ny: ny, nz: nz, rotX: thetaRad },
          { x: halfL, y: yOff, z: -zOff, nx: 0, ny: ny, nz: -nz, rotX: -thetaRad },
          { x: -halfL, y: yOff, z: zOff, nx: 0, ny: ny, nz: nz, rotX: thetaRad },
          { x: -halfL, y: yOff, z: -zOff, nx: 0, ny: ny, nz: -nz, rotX: -thetaRad }
        ];
      }
    } else {
      // For box / container / rectangular load:
      const halfL = dims.l * 0.45;
      const halfW = dims.w * 0.45;
      const topY = dims.h * 0.5;

      if (slingLegs === 1) {
        pickPoints = [{ x: 0, y: topY, z: 0, nx: 0, ny: 1, nz: 0, rotX: 0 }];
      } else if (slingLegs === 2) {
        pickPoints = [
          { x: halfL, y: topY, z: 0, nx: 0, ny: 1, nz: 0, rotX: 0 },
          { x: -halfL, y: topY, z: 0, nx: 0, ny: 1, nz: 0, rotX: 0 }
        ];
      } else {
        pickPoints = [
          { x: halfL, y: topY, z: halfW, nx: 0, ny: 1, nz: 0, rotX: 0 },
          { x: halfL, y: topY, z: -halfW, nx: 0, ny: 1, nz: 0, rotX: 0 },
          { x: -halfL, y: topY, z: halfW, nx: 0, ny: 1, nz: 0, rotX: 0 },
          { x: -halfL, y: topY, z: -halfW, nx: 0, ny: 1, nz: 0, rotX: 0 }
        ];
      }
    }

    pickPoints.forEach((pt) => {
      // 2a. Welded Doubler / Reinforcement Pad Base Plate (Bản mã lót tai cẩu)
      // Sits 100% flush on the surface of the load with zero air gap
      const basePlateGeo = new THREE.BoxGeometry(0.24, 0.024, 0.18);
      const basePlate = new THREE.Mesh(basePlateGeo, steelMat);
      basePlate.position.set(pt.x, pt.y + 0.012 * pt.ny, pt.z + 0.012 * pt.nz);
      if (pt.rotX) basePlate.rotation.x = pt.rotX;
      this.loadGroup.add(basePlate);

      // 2b. Heavy-Duty Pad-Eye / Lifting Lug (Tai cẩu hàn liền bản mã)
      // Lug stands outward normal to the surface
      const lugGroup = new THREE.Group();
      lugGroup.position.set(pt.x, pt.y + 0.024 * pt.ny, pt.z + 0.024 * pt.nz);
      if (pt.rotX) lugGroup.rotation.x = pt.rotX;

      const lugBodyGeo = new THREE.BoxGeometry(0.18, 0.09, 0.03);
      const lugBody = new THREE.Mesh(lugBodyGeo, steelMat);
      lugBody.position.set(0, 0.045, 0);
      lugGroup.add(lugBody);

      const lugEyeGeo = new THREE.TorusGeometry(0.065, 0.026, 8, 16);
      const lugEye = new THREE.Mesh(lugEyeGeo, steelMat);
      lugEye.position.set(0, 0.095, 0);
      lugGroup.add(lugEye);
      this.loadGroup.add(lugGroup);

      // Pad-eye pin hole center
      const pinHole = new THREE.Vector3(
        pt.x,
        pt.y + (0.024 + 0.095) * pt.ny,
        pt.z + (0.024 + 0.095) * pt.nz
      );

      // Unit vector from pin hole towards sling apex
      const toApex = new THREE.Vector3().subVectors(startPoint, pinHole).normalize();

      // 2c. Shackle Pin through pad-eye hole
      const pinGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.12, 10);
      const pinMesh = new THREE.Mesh(pinGeo, steelMat);
      pinMesh.position.copy(pinHole);
      if (pt.rotX) pinMesh.rotation.x = pt.rotX;
      this.loadGroup.add(pinMesh);

      // Shackle bow extends naturally from pin towards sling apex
      const shackleBowCenter = new THREE.Vector3().copy(pinHole).addScaledVector(toApex, 0.075);
      const shackleGeo = new THREE.TorusGeometry(0.068, 0.022, 8, 18);
      const shackleMesh = new THREE.Mesh(shackleGeo, steelMat);
      shackleMesh.position.copy(shackleBowCenter);
      const up = new THREE.Vector3(0, 1, 0);
      shackleMesh.quaternion.setFromUnitVectors(up, toApex);
      this.loadGroup.add(shackleMesh);

      // Shackle connection point at the crown of the bow
      const endPoint = new THREE.Vector3().copy(pinHole).addScaledVector(toApex, 0.14);
      const distance = startPoint.distanceTo(endPoint);
      if (distance <= 0.01) return;

      const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
      const midpoint = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);

      // 2d. Visual Sling Representation based on slingType
      if (slingType === 'synthetic') {
        // --- SYNTHETIC WEBBING STRAP (Cáp vải bản dẹt) ---
        const strapGeo = new THREE.BoxGeometry(0.08, distance, 0.016);
        const strapMesh = new THREE.Mesh(strapGeo, syntheticMat);
        strapMesh.position.copy(midpoint);
        strapMesh.quaternion.copy(quaternion);
        this.loadGroup.add(strapMesh);

        // Heavy-duty black protective sleeve near bottom
        if (distance > 0.8) {
          const sleeveLen = Math.min(0.65, distance * 0.35);
          const sleeveGeo = new THREE.BoxGeometry(0.096, sleeveLen, 0.028);
          const sleeveMesh = new THREE.Mesh(sleeveGeo, wearSleeveMat);
          sleeveMesh.position.copy(startPoint).addScaledVector(direction, distance * 0.65);
          sleeveMesh.quaternion.copy(quaternion);
          this.loadGroup.add(sleeveMesh);
        }

        // Blue safety certification tag stitched near top
        if (distance > 0.6) {
          const tagGeo = new THREE.BoxGeometry(0.065, 0.12, 0.005);
          const tagMesh = new THREE.Mesh(tagGeo, blueTagMat);
          const tagPos = new THREE.Vector3().copy(startPoint).addScaledVector(direction, 0.35);
          tagMesh.position.copy(tagPos);
          tagMesh.position.x += 0.045;
          tagMesh.quaternion.copy(quaternion);
          this.loadGroup.add(tagMesh);
        }

      } else if (slingType === 'chain') {
        // --- ALLOY CHAIN G80/G100 (Xích cẩu hợp kim) ---
        const linkPitch = 0.075;
        const numLinks = Math.max(3, Math.floor(distance / linkPitch));
        const actualPitch = distance / numLinks;
        const chainLinkGeo = new THREE.TorusGeometry(0.038, 0.013, 8, 14);

        for (let i = 0; i < numLinks; i++) {
          const linkMesh = new THREE.Mesh(chainLinkGeo, chainMat);
          const linkPos = new THREE.Vector3().copy(startPoint).addScaledVector(direction, (i + 0.5) * actualPitch);
          linkMesh.position.copy(linkPos);
          linkMesh.quaternion.copy(quaternion);
          // Alternate rotation by 90 degrees around length axis for interlocking chain links
          if (i % 2 === 1) {
            linkMesh.rotateY(Math.PI / 2);
          }
          this.loadGroup.add(linkMesh);
        }

        // Grade 80 Red Hammerlock coupling link at top
        const topHammerlock = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.018, 8, 16), g80RedMat);
        topHammerlock.position.copy(startPoint).addScaledVector(direction, 0.09);
        topHammerlock.quaternion.copy(quaternion);
        this.loadGroup.add(topHammerlock);

        // Grade 80 Red Clevis hook at bottom pad-eye
        const botHook = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.02, 8, 16), g80RedMat);
        botHook.position.copy(endPoint).addScaledVector(direction, -0.06);
        botHook.quaternion.copy(quaternion);
        this.loadGroup.add(botHook);

      } else {
        // --- STEEL WIRE ROPE (Cáp thép bấm chì tiêu chuẩn) ---
        const ropeGeo = new THREE.CylinderGeometry(0.02, 0.02, distance, 10);
        const ropeMesh = new THREE.Mesh(ropeGeo, steelMat);
        ropeMesh.position.copy(midpoint);
        ropeMesh.quaternion.copy(quaternion);
        this.loadGroup.add(ropeMesh);

        // Swaged aluminum ferrules (ống bấm đầu cốt chì) at top & bottom
        if (distance > 0.8) {
          const ferruleGeo = new THREE.CylinderGeometry(0.034, 0.034, 0.15, 12);
          const topFerrule = new THREE.Mesh(ferruleGeo, brightSteelMat);
          topFerrule.position.copy(startPoint).addScaledVector(direction, 0.2);
          topFerrule.quaternion.copy(quaternion);
          this.loadGroup.add(topFerrule);

          const botFerrule = new THREE.Mesh(ferruleGeo, brightSteelMat);
          botFerrule.position.copy(endPoint).addScaledVector(direction, -0.2);
          botFerrule.quaternion.copy(quaternion);
          this.loadGroup.add(botFerrule);
        }
      }
    });

    // 3. Master Link Assembly at Sling Apex
    if (slingType === 'chain') {
      // Grade 80 Safety Red Master Link Assembly
      const mainRingGeo = new THREE.TorusGeometry(0.18, 0.04, 12, 24);
      const mainRing = new THREE.Mesh(mainRingGeo, g80RedMat);
      mainRing.position.set(0, slingApexY, 0);
      this.loadGroup.add(mainRing);

      if (slingLegs === 4) {
        // Quad sling sub-rings (bộ vòng khuyên mẹ con)
        const subRingGeo = new THREE.TorusGeometry(0.11, 0.026, 10, 20);
        const subRing1 = new THREE.Mesh(subRingGeo, g80RedMat);
        subRing1.position.set(0.08, slingApexY - 0.12, 0);
        subRing1.rotateY(Math.PI / 4);
        const subRing2 = new THREE.Mesh(subRingGeo, g80RedMat);
        subRing2.position.set(-0.08, slingApexY - 0.12, 0);
        subRing2.rotateY(-Math.PI / 4);
        this.loadGroup.add(subRing1, subRing2);
      }
    } else {
      // High-strength Forged Alloy Master Ring
      const ringGeo = new THREE.TorusGeometry(0.16, 0.038, 12, 24);
      const ringMesh = new THREE.Mesh(ringGeo, steelMat);
      ringMesh.position.set(0, slingApexY, 0);
      this.loadGroup.add(ringMesh);
    }
  }

  // --- VISUAL INDICATORS ---
  _buildRadiusRing() {
    this.radiusGroup = new THREE.Group();
    this.craneGroup.add(this.radiusGroup);

    // 1. Working Radius Circle on Ground (Vòng tròn bán kính làm việc)
    // Points generated directly in X-Z plane: (cos(theta), 0.05, sin(theta))
    const segments = 128;
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta), 0.05, Math.sin(theta)));
    }
    const ringGeo = new THREE.BufferGeometry().setFromPoints(points);
    const ringMat = new THREE.LineBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.85
    });
    this.radiusRing = new THREE.Line(ringGeo, ringMat);
    this.radiusGroup.add(this.radiusRing);

    // 2. Semi-transparent working envelope ground disk (Vùng quét bán kính)
    const diskGeo = new THREE.CircleGeometry(1.0, 64);
    diskGeo.rotateX(-Math.PI / 2);
    const diskMat = new THREE.MeshBasicMaterial({
      color: '#0284c7',
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.radiusDisk = new THREE.Mesh(diskGeo, diskMat);
    this.radiusDisk.position.y = 0.02;
    this.radiusGroup.add(this.radiusDisk);

    // 3. Radial direction line connecting crane center (0,0) to current boom tip ground projection
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.05, 0),
      new THREE.Vector3(1, 0.05, 0)
    ]);
    const lineMat = new THREE.LineDashedMaterial({
      color: '#38bdf8',
      dashSize: 0.6,
      gapSize: 0.3
    });
    this.radiusLine = new THREE.Line(lineGeo, lineMat);
    this.radiusGroup.add(this.radiusLine);

    // 4. Ground Target Bullseye directly below hook/load
    this.groundTarget = new THREE.Group();
    const bullseyeGeo = new THREE.RingGeometry(0.5, 0.65, 32);
    bullseyeGeo.rotateX(-Math.PI / 2);
    const bullseyeMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    this.groundTarget.add(new THREE.Mesh(bullseyeGeo, bullseyeMat));

    const dotGeo = new THREE.CircleGeometry(0.18, 16);
    dotGeo.rotateX(-Math.PI / 2);
    this.groundTarget.add(new THREE.Mesh(dotGeo, bullseyeMat));

    this.groundTarget.position.y = 0.055;
    this.radiusGroup.add(this.groundTarget);
  }

  _buildTailSwingRing(radius = 4.0) {
    const geo = new THREE.RingGeometry(radius - 0.08, radius + 0.08, 64);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: '#ef4444',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4
    });
    this.tailSwingRing = new THREE.Mesh(geo, mat);
    this.tailSwingRing.position.y = 0.04;
    this.craneGroup.add(this.tailSwingRing);
  }

  /**
   * Update dynamic crane kinematics in real time
   */
  updateKinematics({
    craneHeading = 0,
    slewAngleDeg,
    boomAngleDeg,
    boomLength,
    minBoomLength,
    maxBoomLength,
    hookElevation,
    loadElevation,
    loadRotationDeg,
    outriggerReactions,
    soilCapacityTonsPerM2,
    matArea
  }) {
    // 0. Crane Carrier Orientation (Hướng đỗ thân xe cẩu trên công trường)
    const headingRad = (-craneHeading * Math.PI) / 180;
    if (this.carrierGroup) {
      this.carrierGroup.rotation.y = headingRad;
    }

    // 1. Slewing rotation (Góc quay toa kết hợp với hướng đỗ xe cẩu)
    const totalSlewDeg = craneHeading + slewAngleDeg;
    const totalSlewRad = (-totalSlewDeg * Math.PI) / 180;
    if (this.superstructureGroup) {
      this.superstructureGroup.rotation.y = totalSlewRad;
    }

    // 2. Boom Luffing angle
    const boomRad = (boomAngleDeg * Math.PI) / 180;
    if (this.boomAssemblyGroup) {
      this.boomAssemblyGroup.rotation.z = boomRad;
    }

    // 2.1 Update Hydraulic Luffing Cylinders (Ống dầu / xi lanh nâng hạ cần)
    if (this.luffingRams && this.luffingRams.length > 0 && this.boomCylinderLugs && this.boomCylinderLugs.length > 0) {
      this.craneGroup.updateMatrixWorld(true);

      this.luffingRams.forEach((ram, idx) => {
        const lug = this.boomCylinderLugs[idx];
        if (lug) {
          const lugWorld = new THREE.Vector3();
          lug.getWorldPosition(lugWorld);

          const lugLocal = this.superstructureGroup.worldToLocal(lugWorld.clone());

          const dx = lugLocal.x - ram.basePivotX;
          const dy = lugLocal.y - ram.basePivotY;
          const dist = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx);

          // Rotate cylinder barrel directly towards boom lug
          ram.ramGroup.rotation.z = angle;

          // Extend/retract chrome piston rod so the pin precisely meets the boom lug
          ram.rodGroup.position.x = dist - ram.rodLength;
        }
      });
    }

    // 3. Boom Telescoping expansion & Boom Head positioning
    if (this.telescopicSections && this.telescopicSections.length > 0) {
      const minL = minBoomLength || 11.3;
      const ext = Math.max(0, boomLength - minL);
      const numSec = this.telescopicSections.length;
      const extPerSec = ext / numSec;

      this.telescopicSections.forEach((item) => {
        const tipOfSec = minL + (item.index + 1) * extPerSec;
        const startOfSec = tipOfSec - item.secLen;
        item.mesh.position.x = startOfSec;
      });
    }

    if (this.latticeTrussGroup && this.minLatticeBoomLen) {
      this.latticeTrussGroup.scale.x = boomLength / this.minLatticeBoomLen;
    }

    // Sheave head is located precisely at distance boomLength along the boom
    if (this.boomHeadGroup) {
      this.boomHeadGroup.position.set(boomLength, 0, 0);
    }

    // 4. Update Hook & Cable Positions
    if (this.boomHeadGroup && this.hookGroup && this.cableMesh) {
      // Force update world matrix to guarantee latest transforms are applied
      this.craneGroup.updateMatrixWorld(true);

      const boomTipWorld = new THREE.Vector3();
      this.boomHeadGroup.getWorldPosition(boomTipWorld);

      // Working radius is horizontal distance from crane center (0,0)
      const currentRadius = Math.hypot(boomTipWorld.x, boomTipWorld.z);

      const dims = this.currentLoadDims || { l: 4.0, w: 2.4, h: 2.6 };
      const slingH = this.currentSlingHeight || 2.5;

      // 1. Calculate realistic physical load and hook elevations
      // loadElevation is the height of the bottom of the load above ground
      const minClearance = 0.2;
      // Headroom safety: load can never exceed boom tip height minus rigging stack
      const maxAllowedBottomY = Math.max(minClearance, boomTipWorld.y - (dims.h + slingH + 1.4));
      const targetLoadBottomY = Math.max(minClearance, Math.min(maxAllowedBottomY, loadElevation !== undefined ? loadElevation : 1.0));
      const targetLoadCenterY = targetLoadBottomY + dims.h * 0.5;
      const targetLoadTopY = targetLoadBottomY + dims.h;

      // The hook bowl sits exactly on the sling master ring at (targetLoadTopY + slingH)
      // Hook block center is 0.82m above the hook bowl
      const idealHookY = targetLoadTopY + slingH + 0.82;

      // Ensure load center is always precisely at targetLoadCenterY so it aligns 100% with the 3D trajectory path
      const actualLoadCenterY = targetLoadCenterY;
      const actualHookY = Math.max(actualLoadCenterY + dims.h * 0.5 + slingH + 0.82, idealHookY);

      // 2. Position Hook Block vertically under boom tip
      const effectiveLoadRotDeg = loadRotationDeg !== undefined ? loadRotationDeg : totalSlewDeg;
      const loadRotRad = (-effectiveLoadRotDeg * Math.PI) / 180;

      this.hookGroup.position.set(boomTipWorld.x, actualHookY, boomTipWorld.z);
      this.hookGroup.rotation.y = loadRotRad;

      // 3. Position Load Object directly under hook block and orient with custom load rotation
      if (this.loadGroup) {
        this.loadGroup.position.set(boomTipWorld.x, actualLoadCenterY, boomTipWorld.z);
        this.loadGroup.rotation.y = loadRotRad;
      }

      // 4. Hoist Cable connects from boom tip sheave down to top of hook block (hookY + 0.4)
      const hookTopY = actualHookY + 0.4;
      const cableLength = Math.max(0.1, boomTipWorld.y - hookTopY);
      this.cableMesh.scale.set(1, cableLength, 1);
      this.cableMesh.position.set(boomTipWorld.x, hookTopY + cableLength * 0.5, boomTipWorld.z);

      // 5. Update Working Radius Ground Indicators
      if (this.radiusRing && currentRadius > 0.5) {
        // True circular scale in both X and Z (no ellipse distortion!)
        this.radiusRing.scale.set(currentRadius, 1, currentRadius);

        if (this.radiusDisk) {
          this.radiusDisk.scale.set(currentRadius, 1, currentRadius);
        }

        // Update radial line from crane center (0,0) to boom tip ground projection (boomTipWorld.x, boomTipWorld.z)
        if (this.radiusLine) {
          const linePositions = new Float32Array([
            0, 0.05, 0,
            boomTipWorld.x, 0.05, boomTipWorld.z
          ]);
          this.radiusLine.geometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
          this.radiusLine.computeLineDistances();
        }

        // Ground Target Bullseye placed precisely under hook & load center
        if (this.groundTarget) {
          this.groundTarget.position.set(boomTipWorld.x, 0.055, boomTipWorld.z);
        }
      }
    }

    // 5. Update Outrigger Mat Pressure Colors
    if (this.mats && outriggerReactions) {
      this.mats.forEach((mat) => {
        const id = mat.userData.id;
        const reaction = outriggerReactions[id] || 0;
        const pressure = reaction / (matArea || 4.0);
        const ratio = pressure / (soilCapacityTonsPerM2 || 25.0);

        // Dynamic color indication
        if (ratio > 1.0) {
          mat.material.color.setHex(0xef4444); // Red: Exceeded!
        } else if (ratio > 0.85) {
          mat.material.color.setHex(0xf97316); // Orange: Warning
        } else if (ratio > 0.6) {
          mat.material.color.setHex(0xeab308); // Yellow
        } else {
          mat.material.color.setHex(0x22c55e); // Green: Safe
        }
      });
    }
  }

  /**
   * Set Mat Dimensions
   */
  updateMatDimensions(length, width) {
    if (this.mats) {
      this.mats.forEach((mat) => {
        mat.scale.set(length / 2.0, 1, width / 2.0);
      });
    }
  }

  /**
   * Clean up and dispose all crane 3D assets from scene
   */
  dispose() {
    [
      this.hookGroup,
      this.cableMesh,
      this.loadGroup,
      this.radiusRing,
      this.radiusLine,
      this.radiusDisk,
      this.groundTarget,
      this.radiusGroup,
      this.tailSwingRing
    ].forEach((obj) => {
      if (obj) {
        if (this.scene) this.scene.remove(obj);
        if (this.craneGroup) this.craneGroup.remove(obj);
        this._clearGroup(obj);
        if (obj.geometry) obj.geometry.dispose();
      }
    });

    if (this.craneGroup) {
      if (this.scene) this.scene.remove(this.craneGroup);
      this._clearGroup(this.craneGroup);
    }
  }
}

