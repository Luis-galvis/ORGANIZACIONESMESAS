// scene.js - 3D Wedding Ballroom and Table Visualization in Three.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class WeddingScene {
  constructor(canvasContainer, onSeatClick, onTableClick) {
    this.container = canvasContainer;
    this.onSeatClick = onSeatClick;
    this.onTableClick = onTableClick;

    this.tables = [];
    this.tableMeshes = new Map();
    this.chairMeshes = new Map(); // key: tableId-seatIdx
    this.guestMeshes = new Map(); // key: guestId
    this.labelElements = new Map(); // key: chairKey or tableKey -> DOM element

    this.showLabels = true;
    this.nightMode = true;

    this.initScene();
    this.initLights();
    this.initBallroom();
    this.initListeners();
    this.animate();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e1118);
    this.scene.fog = new THREE.FogExp2(0x0e1118, 0.015);

    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 200);
    this.camera.position.set(0, 18, 26);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);

    // Overlay layer for crisp 3D HTML floating labels
    this.labelOverlay = document.createElement('div');
    this.labelOverlay.className = 'label-overlay-layer';
    this.container.appendChild(this.labelOverlay);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03; // don't go below floor
    this.controls.minDistance = 4;
    this.controls.maxDistance = 60;
    this.controls.target.set(0, 1.2, 0);

    // Raycaster for 3D clicks
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.clock = new THREE.Clock();
  }

  initLights() {
    // Warm romantic ambient
    this.ambientLight = new THREE.AmbientLight(0xffeedd, 0.6);
    this.scene.add(this.ambientLight);

    // Main romantic chandelier warm light from above
    this.mainLight = new THREE.DirectionalLight(0xffdfb3, 1.2);
    this.mainLight.position.set(10, 25, 15);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 2048;
    this.mainLight.shadow.mapSize.height = 2048;
    this.mainLight.shadow.camera.near = 5;
    this.mainLight.shadow.camera.far = 60;
    this.mainLight.shadow.camera.left = -25;
    this.mainLight.shadow.camera.right = 25;
    this.mainLight.shadow.camera.top = 25;
    this.mainLight.shadow.camera.bottom = -25;
    this.mainLight.shadow.bias = -0.0005;
    this.scene.add(this.mainLight);

    // Secondary fill light for soft shadows
    this.fillLight = new THREE.DirectionalLight(0x99b4d1, 0.4);
    this.fillLight.position.set(-15, 20, -10);
    this.scene.add(this.fillLight);

    // Stage golden warm spotlight for head table
    this.stageSpot = new THREE.SpotLight(0xffd700, 2.5, 30, Math.PI / 6, 0.4, 1.5);
    this.stageSpot.position.set(0, 14, -14);
    this.stageSpot.target.position.set(0, 1, -16);
    this.scene.add(this.stageSpot);
    this.scene.add(this.stageSpot.target);
  }

  initBallroom() {
    // 1. Procedural luxury parquet floor texture
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const ctx = floorCanvas.getContext('2d');

    // Rich warm walnut wood pattern
    ctx.fillStyle = '#2c1e16';
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = '#3a271c';
    for (let x = 0; x < 512; x += 64) {
      for (let y = 0; y < 512; y += 32) {
        if ((x / 64 + y / 32) % 2 === 0) {
          ctx.fillRect(x, y, 62, 30);
        }
      }
    }

    ctx.strokeStyle = '#1b120c';
    ctx.lineWidth = 2;
    for (let x = 0; x <= 512; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(12, 12);

    const floorGeo = new THREE.PlaneGeometry(60, 50);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.25,
      metalness: 0.15
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    // Decorative dance floor in center
    const danceFloorGeo = new THREE.CircleGeometry(4.5, 48);
    const danceFloorMat = new THREE.MeshStandardMaterial({
      color: 0x1f1924,
      roughness: 0.15,
      metalness: 0.4
    });
    const danceFloor = new THREE.Mesh(danceFloorGeo, danceFloorMat);
    danceFloor.rotation.x = -Math.PI / 2;
    danceFloor.position.set(0, 0.02, 0);
    danceFloor.receiveShadow = true;
    this.scene.add(danceFloor);

    // Monogram in dance floor
    const ringGeo = new THREE.RingGeometry(4.3, 4.5, 48);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
    const ring = new THREE.Mesh(ringGeo, goldMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.03, 0);
    this.scene.add(ring);

    // 2. Romantic Wedding Stage & Backdrop (Fernando & Luisa)
    this.createBackdropStage();

    // 3. Hanging Fairy Lights (String lights / Guirnaldas)
    this.createFairyLights();

    // 4. Perimeter Walls & Luxury Drapes
    this.createBallroomWalls();
  }

  createBackdropStage() {
    const stageGroup = new THREE.Group();
    stageGroup.position.set(0, 0, -18);

    // Stage platform
    const platformGeo = new THREE.BoxGeometry(16, 0.35, 6);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(0, 0.175, 0);
    platform.receiveShadow = true;
    stageGroup.add(platform);

    // Floral Wedding Arch (Metallic gold circle arch with flowers)
    const archCurve = new THREE.TorusGeometry(3.5, 0.08, 16, 64, Math.PI);
    const goldArchMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 });
    const archMesh = new THREE.Mesh(archCurve, goldArchMat);
    archMesh.position.set(0, 3.5, -2);
    stageGroup.add(archMesh);

    // Flower clusters on the arch
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xfcf5ec, roughness: 0.7 });
    const blushMat = new THREE.MeshStandardMaterial({ color: 0xf4c2c2, roughness: 0.6 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4a6b48, roughness: 0.8 });

    for (let i = 0; i < 28; i++) {
      const angle = (i / 27) * Math.PI;
      const x = Math.cos(angle) * 3.5;
      const y = Math.sin(angle) * 3.5 + 3.5;
      const flower = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.22 + (i % 3) * 0.05),
        i % 2 === 0 ? flowerMat : blushMat
      );
      flower.position.set(x + (Math.random() - 0.5) * 0.2, y + (Math.random() - 0.5) * 0.2, -2);
      stageGroup.add(flower);
    }

    // Romantic Back Wall Neon/Sign "Fernando & Luisa"
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 1024;
    signCanvas.height = 256;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = 'rgba(0,0,0,0)';
    sCtx.clearRect(0, 0, 1024, 256);

    sCtx.font = 'bold 52px "Cinzel", Georgia, serif';
    sCtx.textAlign = 'center';
    sCtx.fillStyle = '#ffdf88';
    sCtx.shadowColor = '#d4af37';
    sCtx.shadowBlur = 18;
    sCtx.fillText('FERNANDO & LUISA', 512, 110);

    sCtx.font = 'italic 28px "Plus Jakarta Sans", sans-serif';
    sCtx.fillStyle = '#ffffff';
    sCtx.shadowBlur = 8;
    sCtx.fillText('Nuestra Boda • 2026', 512, 170);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const signPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 2),
      new THREE.MeshBasicMaterial({ map: signTex, transparent: true })
    );
    signPlane.position.set(0, 4.2, -2.1);
    stageGroup.add(signPlane);

    this.scene.add(stageGroup);
  }

  createFairyLights() {
    this.fairyLightGroup = new THREE.Group();
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2cc });

    for (let row = -14; row <= 16; row += 6) {
      for (let x = -18; x <= 18; x += 1.8) {
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), lightMat);
        const sag = Math.sin(((x + 18) / 36) * Math.PI) * 0.6;
        sphere.position.set(x, 6.5 - sag, row);
        this.fairyLightGroup.add(sphere);
      }
    }
    this.scene.add(this.fairyLightGroup);
  }

  createBallroomWalls() {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x141822, roughness: 0.85 });

    // Back wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(60, 12, 1), wallMat);
    backWall.position.set(0, 6, -24);
    this.scene.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1, 12, 50), wallMat);
    leftWall.position.set(-28, 6, 0);
    this.scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1, 12, 50), wallMat);
    rightWall.position.set(28, 6, 0);
    this.scene.add(rightWall);
  }

  /**
   * Builds 3D Tables, Chairs, and Avatars from table definitions
   */
  renderTables(tables, guests) {
    this.tables = tables;
    this.guests = guests;

    // Clean up previous meshes & labels
    this.tableMeshes.forEach(m => this.scene.remove(m));
    this.tableMeshes.clear();
    this.chairMeshes.clear();
    this.guestMeshes.clear();
    this.labelOverlay.innerHTML = '';
    this.labelElements.clear();

    tables.forEach((table, tableIndex) => {
      const tableGroup = new THREE.Group();
      tableGroup.position.set(table.position.x, 0, table.position.z);
      tableGroup.userData = { isTable: true, tableId: table.id, tableIndex };

      const isNoviosTable = table.isNoviosTable;
      const isPresidencial = table.isPresidencial;

      // 1. Table Top & Tablecloth
      const capacity = table.capacity;
      // For standard 10-person table: 2.15m. Scales smoothly up to 15 persons (up to 2.75m)
      const tableRadius = isNoviosTable ? 1.4 : (2.15 + Math.max(0, capacity - 10) * 0.12);
      const tableHeight = 0.88;

      // Tabletop cylinder
      const tableGeo = new THREE.CylinderGeometry(tableRadius, tableRadius, 0.08, 36);
      const tableMat = new THREE.MeshStandardMaterial({
        color: isNoviosTable ? 0xffffff : 0xf4f1eb,
        roughness: 0.35,
        metalness: isNoviosTable ? 0.15 : 0.05
      });
      const tableMesh = new THREE.Mesh(tableGeo, tableMat);
      tableMesh.position.y = tableHeight;
      tableMesh.castShadow = true;
      tableMesh.receiveShadow = true;
      tableGroup.add(tableMesh);

      // Gold rim
      const rimGeo = new THREE.TorusGeometry(tableRadius + 0.01, 0.025, 12, 36);
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7, roughness: 0.3 });
      const rim = new THREE.Mesh(rimGeo, goldMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = tableHeight + 0.02;
      tableGroup.add(rim);

      // Table cloth drape
      const drapeGeo = new THREE.CylinderGeometry(tableRadius * 0.98, tableRadius * 1.08, 0.75, 36, 1, true);
      const drapeMat = new THREE.MeshStandardMaterial({
        color: isNoviosTable ? 0xffffff : 0xfcfbfa,
        roughness: 0.55,
        side: THREE.DoubleSide
      });
      const drape = new THREE.Mesh(drapeGeo, drapeMat);
      drape.position.y = tableHeight - 0.375;
      drape.castShadow = true;
      tableGroup.add(drape);

      // Table leg / base
      const legGeo = new THREE.CylinderGeometry(0.14, 0.28, tableHeight, 16);
      const leg = new THREE.Mesh(legGeo, goldMat);
      leg.position.y = tableHeight / 2;
      tableGroup.add(leg);

      // 2. Floral Centerpiece with Candle
      const centerpiece = this.createTableCenterpiece(isNoviosTable);
      centerpiece.position.y = tableHeight + 0.04;
      tableGroup.add(centerpiece);

      // 3. Floating Table Name Sign / 3D Label Anchor
      this.createTableBadge(table, tableGroup);

      // 4. Chairs & Seated Avatars
      if (isNoviosTable) {
        // 2 chairs side by side facing the ballroom
        const noviosConfig = [
          { name: 'Fernando (Novio)', role: 'novio', x: -0.6, z: 0.2 },
          { name: 'Luisa (Novia)', role: 'novia', x: 0.6, z: 0.2 }
        ];

        noviosConfig.forEach((nc, sIdx) => {
          const chairGroup = new THREE.Group();
          chairGroup.position.set(nc.x, 0, nc.z);
          chairGroup.rotation.y = 0; // Face forward to guests
          chairGroup.userData = { isChair: true, tableId: table.id, seatIndex: sIdx, isNovio: true };

          // Royal bridal chair
          const chair = this.createChairModel();
          chairGroup.add(chair);

          // Bridal avatar
          const bridalAvatar = this.createNoviosAvatar(nc.role);
          chairGroup.add(bridalAvatar);

          // Floating 3D label above head
          this.createNoviosNameTag(nc.name, nc.role, table, sIdx, chairGroup);

          const chairKey = `${table.id}-${sIdx}`;
          this.chairMeshes.set(chairKey, chairGroup);
          tableGroup.add(chairGroup);
        });
      } else {
        // Guest round table (10 seats)
        const chairRadius = tableRadius + 0.62;
        const capacity = table.capacity;

        table.seats.forEach((seat, seatIdx) => {
          const angle = (seatIdx / capacity) * Math.PI * 2;
          const chairX = Math.sin(angle) * chairRadius;
          const chairZ = Math.cos(angle) * chairRadius;

          const chairGroup = new THREE.Group();
          chairGroup.position.set(chairX, 0, chairZ);
          chairGroup.rotation.y = angle + Math.PI; // Face the table center
          chairGroup.userData = {
            isChair: true,
            tableId: table.id,
            seatIndex: seatIdx,
            guestId: seat.guestId
          };

          // Chair model
          const chair = this.createChairModel();
          chairGroup.add(chair);

          // Seated guest avatar if occupied
          const assignedGuest = guests.find(g => g.id === seat.guestId);
          if (assignedGuest) {
            const avatar = this.createGuestAvatar(assignedGuest);
            chairGroup.add(avatar);

            // 3D Floating Name Label directly above head
            this.createGuestNameTag(assignedGuest, table, seatIdx, chairGroup);
          } else {
            // Empty chair placeholder marker
            const emptyMarker = this.createEmptySeatMarker(seatIdx + 1);
            chairGroup.add(emptyMarker);
          }

          const chairKey = `${table.id}-${seatIdx}`;
          this.chairMeshes.set(chairKey, chairGroup);
          tableGroup.add(chairGroup);
        });
      }

      this.scene.add(tableGroup);
      this.tableMeshes.set(table.id, tableGroup);
    });
  }

  createChairModel() {
    const chairGroup = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.6, roughness: 0.35 });
    const velvetMat = new THREE.MeshStandardMaterial({ color: 0xede8e1, roughness: 0.6 });

    // Seat cushion
    const seatGeo = new THREE.BoxGeometry(0.5, 0.08, 0.48);
    const seatMesh = new THREE.Mesh(seatGeo, velvetMat);
    seatMesh.position.y = 0.52;
    seatMesh.castShadow = true;
    chairGroup.add(seatMesh);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.52, 8);
    const legPositions = [
      [-0.2, 0.26, -0.2],
      [0.2, 0.26, -0.2],
      [-0.2, 0.26, 0.2],
      [0.2, 0.26, 0.2]
    ];
    legPositions.forEach(p => {
      const leg = new THREE.Mesh(legGeo, goldMat);
      leg.position.set(p[0], p[1], p[2]);
      leg.castShadow = true;
      chairGroup.add(leg);
    });

    // Chair Back
    const backBarGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.58, 8);
    const backLeft = new THREE.Mesh(backBarGeo, goldMat);
    backLeft.position.set(-0.2, 0.81, -0.22);
    chairGroup.add(backLeft);

    const backRight = new THREE.Mesh(backBarGeo, goldMat);
    backRight.position.set(0.2, 0.81, -0.22);
    chairGroup.add(backRight);

    // Horizontal top rail
    const topRailGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.44, 8);
    const topRail = new THREE.Mesh(topRailGeo, goldMat);
    topRail.rotation.z = Math.PI / 2;
    topRail.position.set(0, 1.08, -0.22);
    chairGroup.add(topRail);

    // Vertical spindles
    for (let s = -0.12; s <= 0.12; s += 0.08) {
      const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.48, 6), goldMat);
      spindle.position.set(s, 0.8, -0.22);
      chairGroup.add(spindle);
    }

    return chairGroup;
  }

  createTableCenterpiece(isPresidencial) {
    const centerGroup = new THREE.Group();

    // Vase
    const vaseGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.25, 16);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.75
    });
    const vase = new THREE.Mesh(vaseGeo, glassMat);
    vase.position.y = 0.125;
    centerGroup.add(vase);

    // Floral Bouquet
    const flowerMat = new THREE.MeshStandardMaterial({ color: isPresidencial ? 0xfff0f5 : 0xfcf5ec, roughness: 0.7 });
    const roseMat = new THREE.MeshStandardMaterial({ color: 0xe6b8b8, roughness: 0.6 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4a6b48, roughness: 0.8 });

    for (let i = 0; i < (isPresidencial ? 16 : 10); i++) {
      const angle = (i / 10) * Math.PI * 2;
      const radius = 0.18 + Math.random() * 0.12;
      const flower = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.14, 1),
        i % 2 === 0 ? flowerMat : roseMat
      );
      flower.position.set(Math.cos(angle) * radius, 0.28 + Math.random() * 0.1, Math.sin(angle) * radius);
      centerGroup.add(flower);
    }

    // Candle in center with flickering warm light
    const candleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.28, 12);
    const candleMat = new THREE.MeshStandardMaterial({ color: 0xfffdf2, roughness: 0.4 });
    const candle = new THREE.Mesh(candleGeo, candleMat);
    candle.position.y = 0.32;
    centerGroup.add(candle);

    // Candle flame (small golden glow)
    const flameGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 0.48;
    centerGroup.add(flame);

    // Candle light point
    const candleLight = new THREE.PointLight(0xffb84d, 0.8, 4);
    candleLight.position.y = 0.52;
    centerGroup.add(candleLight);

    return centerGroup;
  }

  createGuestAvatar(guest) {
    const avatarGroup = new THREE.Group();
    avatarGroup.position.set(0, 0.54, 0.02);

    // Dynamic color based on couple/family
    const groupColor = new THREE.Color(guest.colorSeed || '#4f6d7a');

    // 1. Shoulders & Formal Torso
    const torsoGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.48, 14);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: groupColor,
      roughness: 0.5,
      metalness: 0.15
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.24;
    torso.castShadow = true;
    avatarGroup.add(torso);

    // Collar / Lapel accent
    const lapelGeo = new THREE.BoxGeometry(0.16, 0.18, 0.06);
    const lapelMat = new THREE.MeshStandardMaterial({ color: 0x181e28, roughness: 0.4 });
    const lapel = new THREE.Mesh(lapelGeo, lapelMat);
    lapel.position.set(0, 0.36, 0.15);
    avatarGroup.add(lapel);

    // Golden accessory / Bowtie / Pendant
    const bowGeo = new THREE.BoxGeometry(0.06, 0.03, 0.02);
    const bowMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
    const bowtie = new THREE.Mesh(bowGeo, bowMat);
    bowtie.position.set(0, 0.44, 0.18);
    avatarGroup.add(bowtie);

    // 2. Neck
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.65 });
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 10), skinMat);
    neck.position.y = 0.52;
    avatarGroup.add(neck);

    // 3. Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), skinMat);
    head.position.y = 0.66;
    head.castShadow = true;
    avatarGroup.add(head);

    // 4. Hair / Hairstyle
    const isDarkHair = (guest.displayName.charCodeAt(0) % 2 === 0);
    const hairColor = isDarkHair ? 0x221a14 : 0x4d3319;
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.75 });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), hairMat);
    hair.position.y = 0.68;
    avatarGroup.add(hair);

    // 5. Place Setting on table (Porcelain plate + Champagne flute)
    const plateGeo = new THREE.CylinderGeometry(0.14, 0.13, 0.015, 20);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(0, 0.36, -0.45);
    avatarGroup.add(plate);

    // Gold plate rim
    const plateRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.135, 0.008, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 })
    );
    plateRim.rotation.x = Math.PI / 2;
    plateRim.position.set(0, 0.37, -0.45);
    avatarGroup.add(plateRim);

    // Crystal Champagne glass
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.2
    });
    const glassFlute = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.015, 0.12, 12), glassMat);
    glassFlute.position.set(0.14, 0.44, -0.42);
    avatarGroup.add(glassFlute);

    return avatarGroup;
  }

  createNoviosAvatar(role) {
    const avatarGroup = new THREE.Group();
    avatarGroup.position.set(0, 0.54, 0.02);

    const isNovio = role === 'novio';

    // Attire
    const torsoGeo = new THREE.CylinderGeometry(0.19, 0.23, 0.5, 12);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: isNovio ? 0x111318 : 0xffffff, // Black tuxedo vs pure white wedding gown
      roughness: isNovio ? 0.35 : 0.3,
      metalness: isNovio ? 0.2 : 0.1
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.25;
    torso.castShadow = true;
    avatarGroup.add(torso);

    // Boutonniere or Bride jewelry
    if (isNovio) {
      // Golden bowtie
      const bowGeo = new THREE.BoxGeometry(0.08, 0.04, 0.02);
      const goldBow = new THREE.Mesh(bowGeo, new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8 }));
      goldBow.position.set(0, 0.46, 0.19);
      avatarGroup.add(goldBow);
    } else {
      // White veil
      const veilGeo = new THREE.CylinderGeometry(0.12, 0.28, 0.65, 12, 1, true);
      const veilMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        roughness: 0.2,
        side: THREE.DoubleSide
      });
      const veil = new THREE.Mesh(veilGeo, veilMat);
      veil.position.set(0, 0.55, -0.06);
      avatarGroup.add(veil);
    }

    // Neck & Head
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe5b582, roughness: 0.65 });
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 10), skinMat);
    neck.position.y = 0.52;
    avatarGroup.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), skinMat);
    head.position.y = 0.66;
    head.castShadow = true;
    avatarGroup.add(head);

    // Hair
    const hairGeo = new THREE.SphereGeometry(0.145, 12, 12, 0, Math.PI * 2, 0, isNovio ? Math.PI * 0.55 : Math.PI * 0.75);
    const hairMat = new THREE.MeshStandardMaterial({ color: isNovio ? 0x1f1914 : 0x4a2e18, roughness: 0.8 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 0.68;
    avatarGroup.add(hair);

    return avatarGroup;
  }

  createNoviosNameTag(name, role, table, seatIdx, chairGroup) {
    const label = document.createElement('div');
    label.className = 'floating-3d-name-tag type-novio';
    label.id = `label-novio-${role}`;

    const icon = role === 'novio' ? '💍' : '👰';
    label.innerHTML = `
      <div class="name-tag-bubble" style="border-color:#ffd700; background:linear-gradient(135deg, rgba(30,22,10,0.95), rgba(45,34,14,0.95)); box-shadow:0 0 15px rgba(255,215,0,0.5);">
        <span class="guest-name-text" style="color:#ffd700; font-weight:700;">${icon} ${name}</span>
        <span class="tag-badge" style="background:#ffd700; color:#0b0d13;">Novios</span>
      </div>
      <div class="name-tag-pin" style="border-top-color:#ffd700;"></div>
    `;

    this.labelOverlay.appendChild(label);

    const labelKey = `novio-${role}`;
    this.labelElements.set(labelKey, {
      dom: label,
      mesh: chairGroup,
      offsetY: 1.6
    });
  }

  createEmptySeatMarker(seatNumber) {
    const markerGroup = new THREE.Group();
    markerGroup.position.set(0, 0.56, 0);

    const discGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16);
    const discMat = new THREE.MeshBasicMaterial({ color: 0x5a6375, transparent: true, opacity: 0.5 });
    const disc = new THREE.Mesh(discGeo, discMat);
    markerGroup.add(disc);

    return markerGroup;
  }

  /**
   * Generates DOM 3D Floating Name Tag positioned directly above each person's head!
   * Requirement: "y que salga el nombre de las personas encima de ellas"
   */
  createGuestNameTag(guest, table, seatIdx, chairGroup) {
    const label = document.createElement('div');
    label.className = `floating-3d-name-tag type-${guest.type}`;
    label.id = `label-guest-${guest.id}`;

    // Tag Content
    let badgeHtml = '';
    if (guest.displayBadge) {
      badgeHtml = `<span class="tag-badge">${guest.displayBadge}</span>`;
    } else if (guest.type === 'pareja') {
      badgeHtml = `<span class="tag-badge pareja">👥 Pareja</span>`;
    }

    label.innerHTML = `
      <div class="name-tag-bubble">
        <span class="guest-name-text">${escapeHtml(guest.displayName)}</span>
        ${badgeHtml}
      </div>
      <div class="name-tag-pin"></div>
    `;

    // Click handler on the floating name tag opens guest options
    label.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onSeatClick) {
        this.onSeatClick(table.id, seatIdx, guest);
      }
    });

    this.labelOverlay.appendChild(label);

    const labelKey = `guest-${guest.id}`;
    this.labelElements.set(labelKey, {
      dom: label,
      mesh: chairGroup,
      tableId: table.id,
      offsetY: 1.62
    });
  }

  /**
   * Generates Table Header Badge floating above centerpiece
   */
  createTableBadge(table, tableGroup) {
    const badge = document.createElement('div');
    badge.className = `table-floating-badge ${table.isPresidencial ? 'presidencial' : ''}`;
    badge.id = `label-table-${table.id}`;

    const occupied = table.seats.filter(s => s.guestId).length;
    badge.innerHTML = `
      <div class="table-badge-content">
        <span class="table-badge-title">${table.name}</span>
        <span class="table-badge-occupancy">${occupied}/${table.capacity}</span>
      </div>
    `;

    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      this.focusTable(table.id);
      if (this.onTableClick) {
        this.onTableClick(table);
      }
    });

    this.labelOverlay.appendChild(badge);

    const labelKey = `table-${table.id}`;
    this.labelElements.set(labelKey, {
      dom: badge,
      mesh: tableGroup,
      tableId: table.id,
      offsetY: 2.15
    });
  }

  /**
   * Projects 3D world coordinates onto screen coordinates to position HTML labels
   * Magnifies names of the active/focused table for maximum readability!
   */
  updateLabels() {
    if (!this.showLabels) {
      this.labelOverlay.style.display = 'none';
      return;
    }
    this.labelOverlay.style.display = 'block';

    const tempV = new THREE.Vector3();
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.labelElements.forEach((item) => {
      item.mesh.getWorldPosition(tempV);
      tempV.y += item.offsetY;

      // Project to 2D screen coordinates
      tempV.project(this.camera);

      // Check if behind the camera
      if (tempV.z > 1) {
        item.dom.style.display = 'none';
        return;
      }

      // Convert normalized device coordinates to pixels
      const x = (tempV.x * 0.5 + 0.5) * width;
      const y = (-(tempV.y * 0.5) + 0.5) * height;

      // Distance from camera for smooth depth scaling
      const dist = this.camera.position.distanceTo(item.mesh.position);
      const isFocused = Boolean(this.activeFocusedTableId && item.tableId === this.activeFocusedTableId);

      let scale = Math.max(0.72, Math.min(1.18, 22 / dist));
      if (isFocused) {
        scale *= 1.25;
        item.dom.classList.add('focused-active');
        item.dom.style.zIndex = '9999';
        item.dom.style.opacity = '1';
      } else {
        item.dom.classList.remove('focused-active');
        if (this.activeFocusedTableId) {
          item.dom.style.opacity = '0.35';
          item.dom.style.zIndex = Math.round((1 - tempV.z) * 100);
        } else if (dist > 40) {
          item.dom.style.opacity = Math.max(0, 1 - (dist - 40) / 10);
          item.dom.style.zIndex = Math.round((1 - tempV.z) * 1000);
        } else {
          item.dom.style.opacity = '1';
          item.dom.style.zIndex = Math.round((1 - tempV.z) * 1000);
        }
      }

      item.dom.style.display = 'block';
      item.dom.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px) scale(${scale})`;
    });
  }

  /**
   * Smoothly animates camera to focus on a selected table and spotlight its names
   */
  focusTable(tableId) {
    this.activeFocusedTableId = tableId;
    const tableMesh = this.tableMeshes.get(tableId);
    if (!tableMesh) return;

    const targetPos = new THREE.Vector3();
    tableMesh.getWorldPosition(targetPos);

    this.smoothMoveCamera(
      new THREE.Vector3(targetPos.x, targetPos.y + 5.2, targetPos.z + 5.6),
      new THREE.Vector3(targetPos.x, targetPos.y + 0.9, targetPos.z)
    );
  }

  /**
   * Preset Camera Views
   */
  setCameraPreset(preset) {
    if (preset !== 'novios') {
      this.activeFocusedTableId = null;
    }

    switch (preset) {
      case 'general':
        this.smoothMoveCamera(new THREE.Vector3(0, 18, 26), new THREE.Vector3(0, 1.2, 0));
        break;
      case 'topdown': // 2D/3D bird's-eye blueprint
        this.smoothMoveCamera(new THREE.Vector3(0, 36, 0.1), new THREE.Vector3(0, 0, 0));
        break;
      case 'novios': // Head table of Fernando & Luisa
        const headTable = this.tables.find(t => t.isNoviosTable) || this.tables[0];
        if (headTable) this.focusTable(headTable.id);
        break;
      case 'walk': // Eye-level perspective
        this.smoothMoveCamera(new THREE.Vector3(0, 2.2, 16), new THREE.Vector3(0, 1.6, -10));
        break;
    }
  }

  zoomIn() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.camera.position.addScaledVector(dir, 3);
    this.controls.update();
  }

  zoomOut() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.camera.position.addScaledVector(dir, -3);
    this.controls.update();
  }

  smoothMoveCamera(endPos, endTarget) {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    let progress = 0;

    const lerp = () => {
      progress += 0.04;
      if (progress >= 1) {
        this.camera.position.copy(endPos);
        this.controls.target.copy(endTarget);
        return;
      }
      // Ease in-out
      const ease = 0.5 - Math.cos(progress * Math.PI) / 2;
      this.camera.position.lerpVectors(startPos, endPos, ease);
      this.controls.target.lerpVectors(startTarget, endTarget, ease);
      requestAnimationFrame(lerp);
    };
    lerp();
  }

  initListeners() {
    window.addEventListener('resize', () => this.onWindowResize());

    // Canvas click raycaster
    this.renderer.domElement.addEventListener('click', (e) => this.onCanvasClick(e));
  }

  onCanvasClick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    for (const hit of intersects) {
      let obj = hit.object;
      while (obj && obj !== this.scene) {
        if (obj.userData && obj.userData.isChair) {
          const guest = this.guests.find(g => g.id === obj.userData.guestId);
          if (this.onSeatClick) {
            this.onSeatClick(obj.userData.tableId, obj.userData.seatIndex, guest);
          }
          return;
        }
        if (obj.userData && obj.userData.isTable) {
          const table = this.tables.find(t => t.id === obj.userData.tableId);
          if (this.onTableClick) {
            this.onTableClick(table);
          }
          return;
        }
        obj = obj.parent;
      }
    }
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  toggleLabels(visible) {
    this.showLabels = visible;
    this.updateLabels();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    this.controls.update();

    // Subtle gentle flame flicker for atmosphere
    if (this.stageSpot) {
      this.stageSpot.intensity = 2.4 + Math.sin(this.clock.getElapsedTime() * 3) * 0.15;
    }

    this.renderer.render(this.scene, this.camera);
    this.updateLabels();
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
