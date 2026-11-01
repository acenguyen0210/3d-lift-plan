import * as THREE from 'three';

/**
 * Procedural 3D Obstacle & Infrastructure Builder
 */
export class Obstacle3DBuilder {
  constructor(scene) {
    this.scene = scene;
    this.obstaclesGroup = new THREE.Group();
    this.scene.add(this.obstaclesGroup);

    this.materials = {
      buildingWall: new THREE.MeshStandardMaterial({
        color: '#334155',
        roughness: 0.85,
        metalness: 0.2,
        transparent: true,
        opacity: 0.92
      }),
      buildingGlass: new THREE.MeshPhysicalMaterial({
        color: '#38bdf8',
        transmission: 0.8,
        opacity: 0.5,
        transparent: true,
        roughness: 0.1
      }),
      concrete: new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.9, metalness: 0.1 }),
      tankSteel: new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.4, metalness: 0.6 }),
      powerPylon: new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.3, metalness: 0.8 }),
      powerLine: new THREE.MeshBasicMaterial({ color: '#ef4444' }),
      insulator: new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.2 }),
      warningBorder: new THREE.LineBasicMaterial({ color: '#f59e0b', linewidth: 2 }),
      dangerZoneGround: new THREE.MeshBasicMaterial({
        color: '#ef4444',
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false
      }),
      dangerZoneBorder: new THREE.LineDashedMaterial({
        color: '#ef4444',
        dashSize: 0.8,
        gapSize: 0.4
      }),
      dangerHatch: new THREE.LineBasicMaterial({
        color: '#ef4444',
        transparent: true,
        opacity: 0.35
      }),
      trenchDirt: new THREE.MeshStandardMaterial({ color: '#3f2e1e', roughness: 0.95 }),
      barricade: new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.6 }),
      workshopWall: new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.6, metalness: 0.3 }),
      workshopRoof: new THREE.MeshStandardMaterial({ color: '#1e40af', roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide }),
      workshopTrim: new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.4, metalness: 0.5 }),
      workshopDoor: new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.3, metalness: 0.8 }),
      portalFrame: new THREE.LineBasicMaterial({ color: '#f59e0b', linewidth: 2 }),
      fencePanel: new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.5, metalness: 0.4 }),
      fencePost: new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.3, metalness: 0.8 }),
      fenceFooting: new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.9, metalness: 0.1 }),
      fenceWarning: new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.4, emissive: '#f59e0b', emissiveIntensity: 0.3 }),
      fenceCorner: new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.3, emissive: '#ef4444', emissiveIntensity: 0.5 })
    };
  }

  /**
   * Clear all obstacles from scene
   */
  clear() {
    while (this.obstaclesGroup.children.length > 0) {
      const child = this.obstaclesGroup.children[0];
      this.obstaclesGroup.remove(child);
      this._disposeNode(child);
    }
  }

  _disposeNode(node) {
    if (!node) return;
    if (node.children) {
      while (node.children.length > 0) {
        const sub = node.children[0];
        node.remove(sub);
        this._disposeNode(sub);
      }
    }
    if (node.geometry) node.geometry.dispose();
  }

  /**
   * Build an individual obstacle
   */
  buildObstacle(obs) {
    if (!obs || !obs.enabled) return null;

    const group = new THREE.Group();
    group.name = obs.id || 'obs';
    group.userData = { ...obs };

    switch (obs.type) {
      case 'cylinder':
        this._buildCylinder(group, obs);
        break;
      case 'power_pole':
        this._buildPowerPole(group, obs);
        break;
      case 'trench':
        this._buildTrench(group, obs);
        break;
      case 'wall':
        this._buildWall(group, obs);
        break;
      case 'workshop':
        this._buildWorkshop(group, obs);
        break;
      case 'building':
      default:
        this._buildBuilding(group, obs);
        break;
    }

    // Set position and rotation (wall with boundary points uses absolute site coordinates)
    if (obs.type === 'wall' && obs.boundaryPoints && obs.boundaryPoints.length >= 2) {
      group.position.set(0, 0, 0);
      group.rotation.y = 0;
    } else {
      group.position.set(obs.posX || 0, 0, obs.posZ || 0);
      group.rotation.y = ((obs.rotationY || 0) * Math.PI) / 180;
    }

    this.obstaclesGroup.add(group);
    return group;
  }

  // 1. Building / Construction Structure
  _buildBuilding(group, obs) {
    const W = obs.width || 8.0;
    const L = obs.length || 10.0;
    const H = obs.height || 16.0;

    // Main solid block
    const bGeo = new THREE.BoxGeometry(W, H, L);
    const bMesh = new THREE.Mesh(bGeo, this.materials.buildingWall);
    bMesh.position.set(0, H * 0.5, 0);
    bMesh.castShadow = true;
    bMesh.receiveShadow = true;
    group.add(bMesh);

    // Wireframe edges for CAD blueprint look
    const edgeGeo = new THREE.EdgesGeometry(bGeo);
    const wire = new THREE.LineSegments(edgeGeo, this.materials.warningBorder);
    wire.position.set(0, H * 0.5, 0);
    group.add(wire);

    // Floor lines (các tầng nhà)
    const floorH = 3.5;
    const numFloors = Math.floor(H / floorH);
    for (let i = 1; i < numFloors; i++) {
      const y = i * floorH;
      const floorEdgeGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-W * 0.5, y, -L * 0.5),
        new THREE.Vector3(W * 0.5, y, -L * 0.5),
        new THREE.Vector3(W * 0.5, y, L * 0.5),
        new THREE.Vector3(-W * 0.5, y, L * 0.5),
        new THREE.Vector3(-W * 0.5, y, -L * 0.5)
      ]);
      const floorLine = new THREE.Line(floorEdgeGeo, new THREE.LineBasicMaterial({ color: '#38bdf8' }));
      group.add(floorLine);
    }

    // Roof safety warning beacon
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.5, 12),
      new THREE.MeshStandardMaterial({ color: '#f59e0b', emissive: '#f59e0b', emissiveIntensity: 0.9 })
    );
    beacon.position.set(0, H + 0.25, 0);
    group.add(beacon);
  }

  // 2. Cylinder / Tank / Silo
  _buildCylinder(group, obs) {
    const dia = obs.diameter || obs.width || 6.0;
    const radius = dia * 0.5;
    const H = obs.height || 12.0;

    // Vertical cylinder body
    const cGeo = new THREE.CylinderGeometry(radius, radius, H, 32);
    const cMesh = new THREE.Mesh(cGeo, this.materials.tankSteel);
    cMesh.position.set(0, H * 0.5, 0);
    cMesh.castShadow = true;
    cMesh.receiveShadow = true;
    group.add(cMesh);

    // Conical roof cap
    const capGeo = new THREE.ConeGeometry(radius * 1.02, 1.2, 32);
    const capMesh = new THREE.Mesh(capGeo, this.materials.concrete);
    capMesh.position.set(0, H + 0.6, 0);
    group.add(capMesh);

    // Perimeter wire rings at top & bottom
    const ringGeo = new THREE.RingGeometry(radius - 0.05, radius + 0.05, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const topRing = new THREE.Mesh(ringGeo, this.materials.warningBorder);
    topRing.position.set(0, H, 0);
    group.add(topRing);
  }

  // 3. High-Voltage Power Pole & Overhead Cables (Cột điện cao thế & Dây điện)
  _buildPowerPole(group, obs) {
    const H = obs.height || 18.0;
    const armW = obs.width || 8.0;
    const spanL = obs.wireSpan || obs.length || 35.0;

    // Main pole (concrete or steel lattice pylon)
    const poleGeo = new THREE.CylinderGeometry(0.25, 0.5, H, 16);
    const poleMesh = new THREE.Mesh(poleGeo, this.materials.powerPylon);
    poleMesh.position.set(0, H * 0.5, 0);
    poleMesh.castShadow = true;
    group.add(poleMesh);

    // Horizontal cross-arms (xà đỡ dây điện)
    [H - 1.0, H - 3.5].forEach((armY) => {
      const armGeo = new THREE.BoxGeometry(armW, 0.25, 0.25);
      const arm = new THREE.Mesh(armGeo, this.materials.powerPylon);
      arm.position.set(0, armY, 0);
      group.add(arm);

      // Ceramic insulator strings & Power line conductors (dây cáp điện căng ngang nhịp)
      [-armW * 0.45, 0, armW * 0.45].forEach((insX) => {
        // Insulator string hanging down
        const insGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
        const insMesh = new THREE.Mesh(insGeo, this.materials.insulator);
        insMesh.position.set(insX, armY - 0.4, 0);
        group.add(insMesh);

        // High-voltage tensioned cable spanning across the jobsite
        const cableY = armY - 0.8;
        const cableGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(insX, cableY, -spanL * 0.5),
          new THREE.Vector3(insX, cableY - 0.4, 0), // Subtle catenary sag in middle
          new THREE.Vector3(insX, cableY, spanL * 0.5)
        ]);
        const cable = new THREE.Line(cableGeo, this.materials.powerLine);
        group.add(cable);
      });
    });

    // OSHA Minimum Approach Distance (MAD) - Vùng an toàn điện cao thế IN TRÊN MẶT ĐẤT (Ground safety zone)
    const clearance = 3.05; // 10ft OSHA minimum approach distance
    const corridorW = armW + clearance * 2;
    const corridorL = spanL + clearance;

    // 1. Vùng bóng đổ an toàn in trên mặt đất (Ground safety zone plane)
    const groundGeo = new THREE.PlaneGeometry(corridorW, corridorL);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMesh = new THREE.Mesh(groundGeo, this.materials.dangerZoneGround);
    groundMesh.position.set(0, 0.03, 0);
    group.add(groundMesh);

    // 2. Viền nét đứt cảnh báo ranh giới an toàn hành lang điện (Dashed perimeter boundary)
    const borderPoints = [
      new THREE.Vector3(-corridorW * 0.5, 0.04, -corridorL * 0.5),
      new THREE.Vector3(corridorW * 0.5, 0.04, -corridorL * 0.5),
      new THREE.Vector3(corridorW * 0.5, 0.04, corridorL * 0.5),
      new THREE.Vector3(-corridorW * 0.5, 0.04, corridorL * 0.5),
      new THREE.Vector3(-corridorW * 0.5, 0.04, -corridorL * 0.5)
    ];
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPoints);
    const borderLine = new THREE.Line(borderGeo, this.materials.dangerZoneBorder);
    borderLine.computeLineDistances();
    group.add(borderLine);

    // 3. Vòng tròn ranh giới an toàn quanh chân cột điện dưới đất (Base boundary circle on ground)
    const poleBaseRadius = armW * 0.5 + clearance;
    const circlePoints = [];
    for (let i = 0; i <= 48; i++) {
      const theta = (i / 48) * Math.PI * 2;
      circlePoints.push(
        new THREE.Vector3(
          poleBaseRadius * Math.cos(theta),
          0.045,
          poleBaseRadius * Math.sin(theta)
        )
      );
    }
    const circleGeo = new THREE.BufferGeometry().setFromPoints(circlePoints);
    const circleLine = new THREE.Line(circleGeo, this.materials.dangerZoneBorder);
    circleLine.computeLineDistances();
    group.add(circleLine);

    // 4. Vạch gạch chéo cảnh báo vùng nguy hiểm (Hazard hatch lines on ground)
    const hatchPoints = [];
    const stepL = 5.0;
    for (let z = -corridorL * 0.5 + stepL; z < corridorL * 0.5; z += stepL) {
      hatchPoints.push(new THREE.Vector3(-corridorW * 0.5, 0.035, z - 2.0));
      hatchPoints.push(new THREE.Vector3(corridorW * 0.5, 0.035, z + 2.0));
    }
    if (hatchPoints.length > 0) {
      const hatchGeo = new THREE.BufferGeometry().setFromPoints(hatchPoints);
      const hatchLines = new THREE.LineSegments(hatchGeo, this.materials.dangerHatch);
      group.add(hatchLines);
    }
  }

  // 4. Trench / Excavation Pit (Hố móng sâu)
  _buildTrench(group, obs) {
    const W = obs.width || 6.0;
    const L = obs.length || 8.0;
    const depth = obs.depth || 3.0;

    // Pit box (represented as dark dirt depression outline)
    const trenchFloorGeo = new THREE.PlaneGeometry(W, L);
    trenchFloorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(trenchFloorGeo, this.materials.trenchDirt);
    floorMesh.position.set(0, 0.02, 0);
    group.add(floorMesh);

    // Safety barricade fence around the pit rim (hàng rào cảnh báo sạt lở)
    const rimGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-W * 0.5, 1.0, -L * 0.5),
      new THREE.Vector3(W * 0.5, 1.0, -L * 0.5),
      new THREE.Vector3(W * 0.5, 1.0, L * 0.5),
      new THREE.Vector3(-W * 0.5, 1.0, L * 0.5),
      new THREE.Vector3(-W * 0.5, 1.0, -L * 0.5)
    ]);
    const rimLine = new THREE.Line(rimGeo, new THREE.LineDashedMaterial({ color: '#ef4444', dashSize: 0.6, gapSize: 0.3 }));
    rimLine.computeLineDistances();
    group.add(rimLine);
  }

  // 5. Perimeter Wall / Construction Site Fence (Hàng rào / Tường rào công trường)
  _buildFenceSegment(parentGroup, p1, p2, H = 2.8, T = 0.22) {
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.2) return;

    const midX = (p1.x + p2.x) * 0.5;
    const midZ = (p1.z + p2.z) * 0.5;
    const angle = Math.atan2(dx, dz);

    const segGroup = new THREE.Group();
    segGroup.position.set(midX, 0, midZ);
    segGroup.rotation.y = angle;

    // 1. Corrugated fence panel (Tấm tôn rào công trường màu xanh)
    const panelGeo = new THREE.BoxGeometry(T, H, len);
    const panel = new THREE.Mesh(panelGeo, this.materials.fencePanel);
    panel.position.set(0, H * 0.5, 0);
    panel.castShadow = true;
    panel.receiveShadow = true;
    segGroup.add(panel);

    // Panel wireframe edges
    const edgeGeo = new THREE.EdgesGeometry(panelGeo);
    const edgeLine = new THREE.LineSegments(
      edgeGeo,
      new THREE.LineBasicMaterial({ color: '#38bdf8' })
    );
    edgeLine.position.set(0, H * 0.5, 0);
    segGroup.add(edgeLine);

    // 2. Yellow warning stripe on top of the fence
    const stripeGeo = new THREE.BoxGeometry(T * 1.35, 0.15, len);
    const stripe = new THREE.Mesh(stripeGeo, this.materials.fenceWarning);
    stripe.position.set(0, H + 0.075, 0);
    segGroup.add(stripe);

    // 3. Periodic posts and concrete footings along this segment (mỗi 2.5m - 3.0m)
    const postSpacing = 2.5;
    const numPosts = Math.max(1, Math.floor(len / postSpacing));
    const actualSpacing = len / numPosts;

    for (let k = 0; k <= numPosts; k++) {
      const zLocal = -len * 0.5 + k * actualSpacing;

      // Vertical steel post extending slightly higher than panel
      const postGeo = new THREE.BoxGeometry(T * 1.4, H + 0.25, T * 1.4);
      const post = new THREE.Mesh(postGeo, this.materials.fencePost);
      post.position.set(0, (H + 0.25) * 0.5, zLocal);
      post.castShadow = true;
      segGroup.add(post);

      // Precast concrete ballast footing block on ground
      const footingGeo = new THREE.BoxGeometry(0.55, 0.3, 0.4);
      const footing = new THREE.Mesh(footingGeo, this.materials.fenceFooting);
      footing.position.set(0, 0.15, zLocal);
      footing.castShadow = true;
      segGroup.add(footing);
    }

    parentGroup.add(segGroup);
  }

  _buildWall(group, obs) {
    const H = obs.height || 2.8;
    const T = obs.thickness || obs.width || 0.22;
    const pts = obs.boundaryPoints;
    const isClosed = obs.isClosed !== false;

    // Check if multi-point enclosure mode
    if (pts && Array.isArray(pts) && pts.length >= 2) {
      // Build fence segments between consecutive points
      for (let i = 0; i < pts.length - 1; i++) {
        this._buildFenceSegment(group, pts[i], pts[i + 1], H, T);
      }

      // If closed loop, connect last point back to first point
      if (isClosed && pts.length >= 3) {
        this._buildFenceSegment(group, pts[pts.length - 1], pts[0], H, T);
      }

      // Add prominent corner boundary pins / poles at each vertex
      pts.forEach((pt, idx) => {
        const cornerGeo = new THREE.CylinderGeometry(0.12, 0.12, H + 0.5, 12);
        const cornerMesh = new THREE.Mesh(cornerGeo, this.materials.fenceCorner);
        cornerMesh.position.set(pt.x, (H + 0.5) * 0.5, pt.z);
        group.add(cornerMesh);

        // Top beacon sphere on corner post
        const sphereGeo = new THREE.SphereGeometry(0.2, 12, 12);
        const sphereMesh = new THREE.Mesh(sphereGeo, this.materials.fenceWarning);
        sphereMesh.position.set(pt.x, H + 0.5, pt.z);
        group.add(sphereMesh);
      });
    } else {
      // Single straight run mode
      const L = obs.length || 15.0;
      this._buildFenceSegment(group, { x: 0, z: -L * 0.5 }, { x: 0, z: L * 0.5 }, H, T);
    }
  }

  // 6. Pre-Engineered Steel Workshop / Factory (Nhà xưởng công nghiệp)
  _buildWorkshop(group, obs) {
    const W = obs.width || 18.0;
    const L = obs.length || 30.0;
    const Heave = obs.height || 8.5;
    const Hpitch = obs.roofPitch || 2.5;
    const Hridge = Heave + Hpitch;

    // 1. Lower Main Walls (Hộp thân tường xưởng)
    const wallGeo = new THREE.BoxGeometry(W, Heave, L);
    const wallMesh = new THREE.Mesh(wallGeo, this.materials.workshopWall);
    wallMesh.position.set(0, Heave * 0.5, 0);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    group.add(wallMesh);

    // Wall CAD wireframe edges
    const wallEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(wallGeo),
      this.materials.warningBorder
    );
    wallEdges.position.set(0, Heave * 0.5, 0);
    group.add(wallEdges);

    // 2. Gabled Triangular Roof (Mái dốc 2 mái chữ A)
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-W * 0.5, Heave);
    roofShape.lineTo(0, Hridge);
    roofShape.lineTo(W * 0.5, Heave);
    roofShape.closePath();

    const extrudeSettings = { depth: L, bevelEnabled: false };
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
    roofGeo.translate(0, 0, -L * 0.5);

    const roofMesh = new THREE.Mesh(roofGeo, this.materials.workshopRoof);
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    group.add(roofMesh);

    // Roof wireframe edges
    const roofEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(roofGeo),
      new THREE.LineBasicMaterial({ color: '#60a5fa' })
    );
    group.add(roofEdges);

    // 3. Roof Monitor / Ridge Ventilator (Cửa trời thông gió đỉnh nóc)
    const ventW = Math.max(2.0, W * 0.2);
    const ventH = 0.9;
    const ventL = L * 0.85;
    const ventGeo = new THREE.BoxGeometry(ventW, ventH, ventL);
    const ventMesh = new THREE.Mesh(ventGeo, this.materials.workshopTrim);
    ventMesh.position.set(0, Hridge + ventH * 0.5, 0);
    group.add(ventMesh);

    const ventEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(ventGeo),
      new THREE.LineBasicMaterial({ color: '#f59e0b' })
    );
    ventEdges.position.set(0, Hridge + ventH * 0.5, 0);
    group.add(ventEdges);

    // 4. Portal Frames (Các khung giàn thép tiền chế định hình không gian xưởng)
    const numBays = Math.max(2, Math.floor(L / 6));
    const baySpacing = L / numBays;
    for (let i = 0; i <= numBays; i++) {
      const z = -L * 0.5 + i * baySpacing;
      const framePoints = [
        new THREE.Vector3(-W * 0.5, 0.05, z),
        new THREE.Vector3(-W * 0.5, Heave, z),
        new THREE.Vector3(0, Hridge, z),
        new THREE.Vector3(W * 0.5, Heave, z),
        new THREE.Vector3(W * 0.5, 0.05, z)
      ];
      const frameGeo = new THREE.BufferGeometry().setFromPoints(framePoints);
      const frameLine = new THREE.Line(frameGeo, this.materials.portalFrame);
      group.add(frameLine);
    }

    // 5. Industrial Bay Doors (Cửa cuốn xe tải ra vào ở hai đầu hồi)
    const doorW = Math.min(5.0, W * 0.35);
    const doorH = Math.min(5.0, Heave * 0.7);
    const frontDoorGeo = new THREE.PlaneGeometry(doorW, doorH);
    const frontDoor = new THREE.Mesh(frontDoorGeo, this.materials.workshopDoor);
    frontDoor.position.set(0, doorH * 0.5, L * 0.5 + 0.02);
    group.add(frontDoor);

    const rearDoor = new THREE.Mesh(frontDoorGeo, this.materials.workshopDoor);
    rearDoor.rotation.y = Math.PI;
    rearDoor.position.set(0, doorH * 0.5, -L * 0.5 - 0.02);
    group.add(rearDoor);

    // Lintel warning border on front door
    const lintelGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-doorW * 0.5, doorH, L * 0.5 + 0.03),
      new THREE.Vector3(doorW * 0.5, doorH, L * 0.5 + 0.03)
    ]);
    const lintelLine = new THREE.Line(
      lintelGeo,
      new THREE.LineBasicMaterial({ color: '#f59e0b', linewidth: 3 })
    );
    group.add(lintelLine);

    // 6. Roof Safety Beacon on Ridge Peak
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.5, 12),
      new THREE.MeshStandardMaterial({
        color: '#f59e0b',
        emissive: '#f59e0b',
        emissiveIntensity: 0.9
      })
    );
    beacon.position.set(0, Hridge + ventH + 0.3, 0);
    group.add(beacon);
  }
}

