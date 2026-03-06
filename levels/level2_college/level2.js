/**
 * level2.js  –  PALLOTTI COLLEGE CAMPUS
 * A real Indian college campus:
 *   Block A (main academic), Block B (science wing),
 *   Library, Canteen, Chapel, Playground, Notice Board,
 *   Main Gate with security cabin, Boundary wall
 * Guards patrol realistic routes, CCTV at key points
 * Objective: Find ID card in Library → reach Main Gate
 */
export class Level2 {
  constructor(scene, camera, renderer) {
    this.scene = scene; this.camera = camera; this.renderer = renderer;
    this.meta = { id:'level2', name:'Pallotti College Campus', timeLimit:300, color:'#f39c12' };
    this.spawnPoint = { x:0, y:0.9, z:55 };
    this.bounds = 70;

    this.objectives = [
      { id:'find_card',   text:'Find your Student ID Card in the Library', done:false, active:true  },
      { id:'avoid_guard', text:'Avoid security guards & CCTV cameras',     done:false, active:true  },
      { id:'reach_gate',  text:'Show ID at Main Gate and ESCAPE',          done:false, active:false },
    ];

    this._guards = [];
    this._cctvCameras = [];
    this._hasCard = false;
    this._cardMesh = null;
    this._gateMesh = null;
    this._exitPos = new THREE.Vector3(0, 0, -60);

    this._guardRoutes = [
      // Guard A: patrols between Block A and Library
      [ new THREE.Vector3(-30,0,20), new THREE.Vector3(-30,0,-20), new THREE.Vector3(0,0,-20), new THREE.Vector3(0,0,20) ],
      // Guard B: patrols near canteen and Block B
      [ new THREE.Vector3(30,0,30), new THREE.Vector3(30,0,-10), new THREE.Vector3(10,0,-10), new THREE.Vector3(10,0,30) ],
      // Guard C: gate area
      [ new THREE.Vector3(-8,0,-50), new THREE.Vector3(8,0,-50), new THREE.Vector3(8,0,-40), new THREE.Vector3(-8,0,-40) ],
    ];
  }

  _tag(o){ o.userData.levelObject=true; return o; }

  async init() {
    this._buildGround();
    this._buildBoundaryWall();
    this._buildBlockA();
    this._buildBlockB();
    this._buildLibrary();
    this._buildCanteen();
    this._buildChapel();
    this._buildMainGate();
    this._buildPaths();
    this._buildTrees();
    this._buildFurniture();
    this._buildGuards();
    this._buildCCTV();
    this._buildIDCard();
    this._setupLighting();
    this._setupFog();
    setTimeout(()=> window.GAME?.gameManager?.showAlert('📍 Go to the LIBRARY — find your Student ID Card!', 5000), 1500);
  }

  // ── GROUND ─────────────────────────────────────────────────
  _buildGround() {
    const s = this.scene;
    // Main grass
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(150,150),
      new THREE.MeshStandardMaterial({color:0x3d7a2f, roughness:1.0}));
    grass.rotation.x = -Math.PI/2; grass.receiveShadow = true;
    this._tag(grass); s.add(grass);

    // Concrete courtyard center
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(30,40),
      new THREE.MeshStandardMaterial({color:0xa09a8a, roughness:0.8}));
    yard.rotation.x=-Math.PI/2; yard.position.set(0,0.01,0);
    this._tag(yard); s.add(yard);
  }

  // ── BOUNDARY WALL ─────────────────────────────────────────
  _buildBoundaryWall() {
    const s = this.scene;
    const wM = new THREE.MeshStandardMaterial({color:0xd4c4a8, roughness:0.85});
    const pillarM = new THREE.MeshStandardMaterial({color:0xc8b89a, roughness:0.8});
    const walls = [
      [0, 2.5, -65, 140, 5, 1.2],  // north
      [0, 2.5,  65, 140, 5, 1.2],  // south
      [-68, 2.5, 0, 1.2, 5, 130],  // west
      [68, 2.5,  0, 1.2, 5, 130],  // east
    ];
    walls.forEach(([x,y,z,w,h,d]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wM.clone());
      m.position.set(x,y,z); m.castShadow=m.receiveShadow=true;
      this._tag(m); s.add(m);
    });
    // Decorative pillars
    for(let x=-60;x<=60;x+=20){
      const p=new THREE.Mesh(new THREE.BoxGeometry(1.8,6,1.8),pillarM.clone());
      p.position.set(x,3,-65); this._tag(p); s.add(p);
      const p2=new THREE.Mesh(new THREE.BoxGeometry(1.8,6,1.8),pillarM.clone());
      p2.position.set(x,3,65); this._tag(p2); s.add(p2);
    }
    // Wall top coping
    const coping = new THREE.Mesh(new THREE.BoxGeometry(140,0.4,1.8),
      new THREE.MeshStandardMaterial({color:0xbb9966}));
    coping.position.set(0,5.2,-65); this._tag(coping); s.add(coping);
    const coping2 = coping.clone(); coping2.position.z=65; this._tag(coping2); s.add(coping2);
  }

  // ── BLOCK A (main academic building) ──────────────────────
  _buildBlockA() {
    const s = this.scene;
    const wallM  = new THREE.MeshStandardMaterial({color:0xd4b896, roughness:0.8}); // cream/terracotta
    const trimM  = new THREE.MeshStandardMaterial({color:0x8b4513, roughness:0.7}); // brown trim
    const glassM = new THREE.MeshStandardMaterial({color:0x88bbdd, roughness:0.1, metalness:0.4, transparent:true, opacity:0.7});
    const roofM  = new THREE.MeshStandardMaterial({color:0x8b6914, roughness:0.9}); // clay roof

    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(36,14,18), wallM.clone());
    body.position.set(-24,7,-5); body.castShadow=body.receiveShadow=true;
    this._tag(body); s.add(body);

    // Second floor overhang
    const overhang = new THREE.Mesh(new THREE.BoxGeometry(38,6,20), wallM.clone());
    overhang.position.set(-24,11,-5); overhang.castShadow=true;
    this._tag(overhang); s.add(overhang);

    // Roof parapet
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(38,1.5,20.5), trimM.clone());
    parapet.position.set(-24,14.75,-5); this._tag(parapet); s.add(parapet);

    // Roof water tank (very Indian college look)
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,2.5,12),
      new THREE.MeshStandardMaterial({color:0x555555,metalness:0.5}));
    tank.position.set(-20,16.5,-5); this._tag(tank); s.add(tank);

    // "BLOCK A" sign board
    const sign = new THREE.Mesh(new THREE.BoxGeometry(10,1.2,0.2),
      new THREE.MeshStandardMaterial({color:0x003366,emissive:0x001133,emissiveIntensity:0.4}));
    sign.position.set(-24,12.5,5.15); this._tag(sign); s.add(sign);

    // Windows (3 floors x 5 wide)
    for(let floor=0;floor<3;floor++){
      for(let col=-2;col<=2;col++){
        const win=new THREE.Mesh(new THREE.BoxGeometry(2.5,2.2,0.15),glassM.clone());
        win.position.set(-24+col*5.5, 3.5+floor*4, 4.15);
        this._tag(win); s.add(win);
        // Window frame
        const frame=new THREE.Mesh(new THREE.BoxGeometry(2.7,2.4,0.1),trimM.clone());
        frame.position.set(-24+col*5.5, 3.5+floor*4, 4.1);
        this._tag(frame); s.add(frame);
      }
    }

    // Entrance porch
    const porch = new THREE.Mesh(new THREE.BoxGeometry(8,5,4), wallM.clone());
    porch.position.set(-24,2.5,7); this._tag(porch); s.add(porch);
    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(9,0.5,5), roofM.clone());
    porchRoof.position.set(-24,5.25,7); this._tag(porchRoof); s.add(porchRoof);

    // Steps
    for(let i=0;i<4;i++){
      const step=new THREE.Mesh(new THREE.BoxGeometry(7,0.2,0.5),
        new THREE.MeshStandardMaterial({color:0xc0b090}));
      step.position.set(-24,0.1+i*0.2, 8.5-i*0.5);
      this._tag(step); s.add(step);
    }

    // Entrance door
    const door=new THREE.Mesh(new THREE.BoxGeometry(2.2,3.5,0.15),
      new THREE.MeshStandardMaterial({color:0x3b1a06,roughness:0.5,metalness:0.2}));
    door.position.set(-24,1.75,4.95); this._tag(door); s.add(door);

    // Pallotti name on building top
    const pallotti=new THREE.Mesh(new THREE.BoxGeometry(14,1.5,0.25),
      new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:0.3}));
    pallotti.position.set(-24,14.2,5.15); this._tag(pallotti); s.add(pallotti);

    // Ground floor corridor windows (back side)
    for(let col=-2;col<=2;col++){
      const win=new THREE.Mesh(new THREE.BoxGeometry(2.5,2.2,0.15),glassM.clone());
      win.position.set(-24+col*5.5, 3.5, -14.15);
      this._tag(win); s.add(win);
    }
  }

  // ── BLOCK B (science/computer wing) ────────────────────────
  _buildBlockB() {
    const s = this.scene;
    const wallM  = new THREE.MeshStandardMaterial({color:0xc8d4b8, roughness:0.8}); // light green-grey
    const trimM  = new THREE.MeshStandardMaterial({color:0x4a7a2a, roughness:0.7}); // green trim
    const glassM = new THREE.MeshStandardMaterial({color:0xaaddcc, roughness:0.1, metalness:0.3, transparent:true, opacity:0.75});

    const body=new THREE.Mesh(new THREE.BoxGeometry(28,12,16), wallM.clone());
    body.position.set(28,6,-5); body.castShadow=body.receiveShadow=true;
    this._tag(body); s.add(body);

    // Flat modern roof
    const roof=new THREE.Mesh(new THREE.BoxGeometry(30,0.8,17.5),
      new THREE.MeshStandardMaterial({color:0x888888,roughness:0.7}));
    roof.position.set(28,12.4,-5); this._tag(roof); s.add(roof);

    // Solar panels (very modern touch)
    for(let i=0;i<3;i++){
      const solar=new THREE.Mesh(new THREE.BoxGeometry(6,0.1,3.5),
        new THREE.MeshStandardMaterial({color:0x1a2a4a,metalness:0.7,roughness:0.2}));
      solar.position.set(28-6+i*6, 12.85, -5); solar.rotation.x=-0.2;
      this._tag(solar); s.add(solar);
    }

    // "BLOCK B" sign
    const sign=new THREE.Mesh(new THREE.BoxGeometry(8,1.2,0.2),
      new THREE.MeshStandardMaterial({color:0x1a4a1a,emissive:0x0a2a0a,emissiveIntensity:0.4}));
    sign.position.set(28,10,7.1); this._tag(sign); s.add(sign);

    // Windows (large modern glass panels)
    for(let floor=0;floor<2;floor++){
      for(let col=-2;col<=2;col++){
        const win=new THREE.Mesh(new THREE.BoxGeometry(3.5,3,0.15),glassM.clone());
        win.position.set(28+col*5, 3+floor*5, 8.1);
        this._tag(win); s.add(win);
      }
    }

    // Entrance
    const ent=new THREE.Mesh(new THREE.BoxGeometry(5,4.5,0.2),glassM.clone());
    ent.position.set(28,2.25,8.1); this._tag(ent); s.add(ent);

    // Steps
    for(let i=0;i<3;i++){
      const step=new THREE.Mesh(new THREE.BoxGeometry(5,0.18,0.5),
        new THREE.MeshStandardMaterial({color:0xb0a888}));
      step.position.set(28,0.09+i*0.18,9.5-i*0.5); this._tag(step); s.add(step);
    }

    // Computer lab sign
    const labSign=new THREE.Mesh(new THREE.BoxGeometry(5,0.6,0.15),
      new THREE.MeshStandardMaterial({color:0x004488,emissive:0x002255,emissiveIntensity:0.5}));
    labSign.position.set(28,7.2,8.05); this._tag(labSign); s.add(labSign);
  }

  // ── LIBRARY ─────────────────────────────────────────────────
  _buildLibrary() {
    const s = this.scene;
    const wallM = new THREE.MeshStandardMaterial({color:0xe8d5aa, roughness:0.85}); // warm sandy
    const trimM = new THREE.MeshStandardMaterial({color:0x774422, roughness:0.7});
    const glassM= new THREE.MeshStandardMaterial({color:0xccddff, roughness:0.05, metalness:0.3, transparent:true, opacity:0.8});
    const roofM = new THREE.MeshStandardMaterial({color:0x993322, roughness:0.8}); // red roof

    const body=new THREE.Mesh(new THREE.BoxGeometry(22,9,14), wallM.clone());
    body.position.set(-28,4.5,28); body.castShadow=body.receiveShadow=true;
    this._tag(body); s.add(body);

    // Pitched roof (iconic library look)
    const roofL=new THREE.Mesh(new THREE.BoxGeometry(24,0.5,16), roofM.clone());
    roofL.position.set(-28,9.25,28); this._tag(roofL); s.add(roofL);

    // Roof ridge
    const ridge=new THREE.Mesh(new THREE.BoxGeometry(23,0.8,0.5),
      new THREE.MeshStandardMaterial({color:0x771111}));
    ridge.position.set(-28,9.7,28); this._tag(ridge); s.add(ridge);

    // LIBRARY sign with glow
    const libSign=new THREE.Mesh(new THREE.BoxGeometry(12,1.4,0.25),
      new THREE.MeshStandardMaterial({color:0x8b0000,emissive:0x660000,emissiveIntensity:0.6}));
    libSign.position.set(-28,7.8,35.15); this._tag(libSign); s.add(libSign);

    // Glow for the library sign
    const lGlow=new THREE.PointLight(0xff4422,1.2,8);
    lGlow.position.set(-28,7.8,36); this._tag(lGlow); s.add(lGlow);

    // Large front windows
    for(let col=-1;col<=1;col++){
      const win=new THREE.Mesh(new THREE.BoxGeometry(4.5,5,0.15),glassM.clone());
      win.position.set(-28+col*6, 4.5, 35.1);
      this._tag(win); s.add(win);
      const wFrame=new THREE.Mesh(new THREE.BoxGeometry(4.7,5.2,0.1),trimM.clone());
      wFrame.position.set(-28+col*6,4.5,35.06); this._tag(wFrame); s.add(wFrame);
    }

    // Entrance door (glass double door)
    const lDoor=new THREE.Mesh(new THREE.BoxGeometry(2.8,4,0.15),glassM.clone());
    lDoor.position.set(-28,2,35.1); this._tag(lDoor); s.add(lDoor);

    // Entrance steps
    for(let i=0;i<4;i++){
      const step=new THREE.Mesh(new THREE.BoxGeometry(6,0.2,0.5),
        new THREE.MeshStandardMaterial({color:0xd0c090}));
      step.position.set(-28,0.1+i*0.2,36-i*0.5); this._tag(step); s.add(step);
    }

    // Library interior glimpse — bookshelf visible through window
    const shelf=new THREE.Mesh(new THREE.BoxGeometry(1.5,5,0.3),
      new THREE.MeshStandardMaterial({color:0x5c3317}));
    shelf.position.set(-22,4,35.2); this._tag(shelf); s.add(shelf);

    const shelf2=shelf.clone(); shelf2.position.x=-34; this._tag(shelf2); s.add(shelf2);

    // Notice board outside library
    const board=new THREE.Mesh(new THREE.BoxGeometry(3,2,0.15),
      new THREE.MeshStandardMaterial({color:0x5c3a1a}));
    board.position.set(-22,1.5,36.5); this._tag(board); s.add(board);
    const boardPaper=new THREE.Mesh(new THREE.PlaneGeometry(2.5,1.5),
      new THREE.MeshStandardMaterial({color:0xf5f0dc}));
    boardPaper.position.set(-22,1.5,36.6); this._tag(boardPaper); s.add(boardPaper);

    // ID Card position marker (glowing spot inside library entrance)
    const markerGlow=new THREE.PointLight(0x0088ff,2,5);
    markerGlow.position.set(-28,1,34); this._tag(markerGlow); s.add(markerGlow); this._cardGlow=markerGlow;
  }

  // ── CANTEEN ─────────────────────────────────────────────────
  _buildCanteen() {
    const s = this.scene;
    const wallM=new THREE.MeshStandardMaterial({color:0xf0e8d0,roughness:0.85});
    const roofM=new THREE.MeshStandardMaterial({color:0x2255aa,roughness:0.8}); // blue roof

    const body=new THREE.Mesh(new THREE.BoxGeometry(20,6,12), wallM.clone());
    body.position.set(30,3,30); body.castShadow=body.receiveShadow=true;
    this._tag(body); s.add(body);

    const roof=new THREE.Mesh(new THREE.BoxGeometry(22,0.5,14), roofM.clone());
    roof.position.set(30,6.25,30); this._tag(roof); s.add(roof);

    // CANTEEN sign
    const sign=new THREE.Mesh(new THREE.BoxGeometry(9,1,0.2),
      new THREE.MeshStandardMaterial({color:0xff6600,emissive:0xcc4400,emissiveIntensity:0.5}));
    sign.position.set(30,5.2,36.1); this._tag(sign); s.add(sign);

    // Outdoor eating area — tables & benches
    const tableM=new THREE.MeshStandardMaterial({color:0x8b4513,roughness:0.8});
    const benchM=new THREE.MeshStandardMaterial({color:0x6b3410,roughness:0.9});
    [[22,38],[30,38],[38,38],[22,43],[30,43],[38,43]].forEach(([x,z])=>{
      const t=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.1,0.9),tableM.clone());
      t.position.set(x,0.75,z); t.castShadow=true; this._tag(t); s.add(t);
      // Bench on each side
      [-0.8,0.8].forEach(bz=>{
        const b=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.08,0.4),benchM.clone());
        b.position.set(x,0.45,z+bz); this._tag(b); s.add(b);
        // Bench legs
        [-0.6,0.6].forEach(bx=>{
          const leg=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.45,0.05),benchM.clone());
          leg.position.set(x+bx,0.22,z+bz); this._tag(leg); s.add(leg);
        });
      });
      // Table legs
      [[-0.7,-0.35],[0.7,-0.35],[-0.7,0.35],[0.7,0.35]].forEach(([lx,lz])=>{
        const leg=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.75,0.05),tableM.clone());
        leg.position.set(x+lx,0.37,z+lz); this._tag(leg); s.add(leg);
      });
    });

    // Canteen window / serving counter
    const counter=new THREE.Mesh(new THREE.BoxGeometry(8,1.2,0.8),
      new THREE.MeshStandardMaterial({color:0xaaaaaa,metalness:0.5}));
    counter.position.set(30,0.6,36.4); this._tag(counter); s.add(counter);
  }

  // ── CHAPEL ───────────────────────────────────────────────────
  _buildChapel() {
    const s = this.scene;
    const wallM=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.7});
    const roofM=new THREE.MeshStandardMaterial({color:0x884422,roughness:0.8});

    const body=new THREE.Mesh(new THREE.BoxGeometry(12,10,18), wallM.clone());
    body.position.set(-52,5,0); body.castShadow=body.receiveShadow=true;
    this._tag(body); s.add(body);

    // Steeple
    const steeple=new THREE.Mesh(new THREE.BoxGeometry(3,6,3),wallM.clone());
    steeple.position.set(-52,13,0); this._tag(steeple); s.add(steeple);
    const spire=new THREE.Mesh(new THREE.ConeGeometry(2.2,5,4),roofM.clone());
    spire.position.set(-52,18.5,0); spire.rotation.y=Math.PI/4;
    this._tag(spire); s.add(spire);

    // Cross on steeple
    const crossV=new THREE.Mesh(new THREE.BoxGeometry(0.3,3.5,0.3),
      new THREE.MeshStandardMaterial({color:0xd4af37,metalness:0.8}));
    crossV.position.set(-52,22,0); this._tag(crossV); s.add(crossV);
    const crossH=new THREE.Mesh(new THREE.BoxGeometry(2,0.3,0.3),
      new THREE.MeshStandardMaterial({color:0xd4af37,metalness:0.8}));
    crossH.position.set(-52,21.5,0); this._tag(crossH); s.add(crossH);

    // Arched windows
    const archM=new THREE.MeshStandardMaterial({color:0x99ccff,transparent:true,opacity:0.7,metalness:0.2});
    [-5,0,5].forEach(z=>{
      const arch=new THREE.Mesh(new THREE.BoxGeometry(2.5,4,0.15),archM.clone());
      arch.position.set(-45.9,5,z); this._tag(arch); s.add(arch);
    });

    // CHAPEL sign (small, elegant)
    const sign=new THREE.Mesh(new THREE.BoxGeometry(5,0.8,0.15),
      new THREE.MeshStandardMaterial({color:0x004400,emissive:0x002200,emissiveIntensity:0.3}));
    sign.position.set(-52,10.5,9.1); this._tag(sign); s.add(sign);
  }

  // ── MAIN GATE ────────────────────────────────────────────────
  _buildMainGate() {
    const s = this.scene;
    const concreteM=new THREE.MeshStandardMaterial({color:0xd4c8b0,roughness:0.8});
    const metalM=new THREE.MeshStandardMaterial({color:0x2a2a2a,metalness:0.8,roughness:0.3});
    const goldM=new THREE.MeshStandardMaterial({color:0xd4af37,metalness:0.9,roughness:0.2});

    // Main gate pillars (grand)
    [-10,-4,4,10].forEach(x=>{
      const pillar=new THREE.Mesh(new THREE.BoxGeometry(2,8,2),concreteM.clone());
      pillar.position.set(x,4,-60); pillar.castShadow=true;
      this._tag(pillar); s.add(pillar);
      // Pillar cap
      const cap=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.8,2.5),goldM.clone());
      cap.position.set(x,8.4,-60); this._tag(cap); s.add(cap);
    });

    // Gate arch between main pillars
    const arch=new THREE.Mesh(new THREE.BoxGeometry(10,1.5,1),concreteM.clone());
    arch.position.set(0,8.5,-60); this._tag(arch); s.add(arch);

    // "PALLOTTI COLLEGE" on arch
    const archSign=new THREE.Mesh(new THREE.BoxGeometry(9,1.2,0.3),
      new THREE.MeshStandardMaterial({color:0x003366,emissive:0x001133,emissiveIntensity:0.5}));
    archSign.position.set(0,8.5,-59.5); this._tag(archSign); s.add(archSign);

    // Gate bars (open when player has ID)
    this._gateBarL=new THREE.Mesh(new THREE.BoxGeometry(4.5,6,0.3), metalM.clone());
    this._gateBarL.position.set(-4.5,3,-60);
    this._tag(this._gateBarL); s.add(this._gateBarL);

    this._gateBarR=new THREE.Mesh(new THREE.BoxGeometry(4.5,6,0.3), metalM.clone());
    this._gateBarR.position.set(4.5,3,-60);
    this._tag(this._gateBarR); s.add(this._gateBarR);

    // Gate vertical bars
    [-3,-1.5,0,1.5,3].forEach(x=>{
      const bar=new THREE.Mesh(new THREE.BoxGeometry(0.15,6,0.15),metalM.clone());
      bar.position.set(x-4.5,3,-60); bar.userData.levelObject=true; s.add(bar);
      const bar2=bar.clone(); bar2.position.x=x+4.5; s.add(bar2);
    });

    // Security cabin
    const cabinM=new THREE.MeshStandardMaterial({color:0xc8d0c8,roughness:0.8});
    const cabin=new THREE.Mesh(new THREE.BoxGeometry(4,4,4),cabinM.clone());
    cabin.position.set(14,2,-58); cabin.castShadow=cabin.receiveShadow=true;
    this._tag(cabin); s.add(cabin);
    const cabinRoof=new THREE.Mesh(new THREE.BoxGeometry(4.5,0.3,4.5),
      new THREE.MeshStandardMaterial({color:0x445544}));
    cabinRoof.position.set(14,4.15,-58); this._tag(cabinRoof); s.add(cabinRoof);
    const cabinWin=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.2,0.1),
      new THREE.MeshStandardMaterial({color:0x88aacc,transparent:true,opacity:0.8}));
    cabinWin.position.set(14,2.2,-55.9); this._tag(cabinWin); s.add(cabinWin);

    // EXIT sign above gate
    const exit=new THREE.Mesh(new THREE.BoxGeometry(5,1,0.2),
      new THREE.MeshStandardMaterial({color:0x00cc44,emissive:0x009933,emissiveIntensity:1.2}));
    exit.position.set(0,7.5,-59.8); this._tag(exit); s.add(exit);
    const eLight=new THREE.PointLight(0x00ff44,2,8); eLight.position.set(0,7,-59);
    this._tag(eLight); s.add(eLight); this._exitLight=eLight;

    // LOCKED indicator (red when no card)
    this._lockedLight=new THREE.PointLight(0xff2200,1.5,4);
    this._lockedLight.position.set(0,4,-59);
    this._tag(this._lockedLight); s.add(this._lockedLight);
  }

  // ── PATHS ────────────────────────────────────────────────────
  _buildPaths() {
    const s = this.scene;
    const pathM=new THREE.MeshStandardMaterial({color:0xb8ac96,roughness:0.9});
    const paths=[
      [0,0.02,0,   8,0.05,130],   // central north-south road
      [-28,0.02,5, 0.05,0.05,50], // to Block A
      [28,0.02,5,  0.05,0.05,50], // to Block B
      [-28,0.02,28,20,0.05,0.05], // to library
      [0,0.02,-20, 60,0.05,0.05], // cross path
      [0,0.02,30,  65,0.05,0.05], // front of canteen
    ];
    paths.forEach(([x,y,z,w,h,d])=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),pathM.clone());
      m.position.set(x,y,z); m.receiveShadow=true;
      this._tag(m); s.add(m);
    });

    // Painted crosswalk lines
    const crossM=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.9});
    for(let i=-3;i<=3;i++){
      const stripe=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.02,2.5),crossM.clone());
      stripe.position.set(i*1.2,0.03,-45); this._tag(stripe); s.add(stripe);
    }
  }

  // ── TREES & PLANTS ───────────────────────────────────────────
  _buildTrees() {
    const s = this.scene;
    const positions=[
      [-10,45],[-20,45],[10,45],[20,45],
      [-40,0],[-40,20],[-40,-20],
      [50,0],[50,20],[50,-20],
      [-45,-35],[45,-35],
      [-8,-30],[8,-30],
      [-15,15],[15,15],
      [5,45],[-5,45]
    ];
    positions.forEach(([x,z])=> this._spawnTree(x,z));

    // Flower bushes near entrance
    const bushM=new THREE.MeshStandardMaterial({color:0x1a8a2a,roughness:1.0});
    const flowerM=new THREE.MeshStandardMaterial({color:0xff6699,roughness:1.0});
    [[-5,55],[5,55],[-12,-60],[12,-60]].forEach(([x,z])=>{
      const bush=new THREE.Mesh(new THREE.SphereGeometry(1,7,7),bushM.clone());
      bush.position.set(x,0.8,z); bush.castShadow=true;
      this._tag(bush); s.add(bush);
      const flower=new THREE.Mesh(new THREE.SphereGeometry(0.4,6,6),flowerM.clone());
      flower.position.set(x,1.5,z); this._tag(flower); s.add(flower);
    });

    // Flagpole at center
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.08,12,8),
      new THREE.MeshStandardMaterial({color:0xd4d4d4,metalness:0.8}));
    pole.position.set(0,6,0); this._tag(pole); s.add(pole);
    const flag=new THREE.Mesh(new THREE.BoxGeometry(3,2,0.05),
      new THREE.MeshStandardMaterial({color:0xff9933}));
    flag.position.set(1.5,10.5,0); this._tag(flag); s.add(flag);
  }

  _spawnTree(x,z) {
    const s=this.scene;
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.35,4,7),
      new THREE.MeshStandardMaterial({color:0x4a2a0a,roughness:0.95}));
    trunk.position.set(x,2,z); trunk.castShadow=true;
    // Canopy layers (fluffy Indian tree)
    [[0,5,2.2],[0.5,3.8,1.6],[-0.4,4.2,1.4],[0.2,3.2,1.8]].forEach(([ox,oy,r])=>{
      const c=new THREE.Mesh(new THREE.SphereGeometry(r,7,6),
        new THREE.MeshStandardMaterial({color:0x1a7a1a+(Math.random()>0.5?0x002200:0),roughness:1.0}));
      c.position.set(ox,oy,0); c.castShadow=true; trunk.add(c);
    });
    this._tag(trunk); s.add(trunk);
  }

  // ── FURNITURE & DETAIL ───────────────────────────────────────
  _buildFurniture() {
    const s=this.scene;
    // Lamp posts along main path
    const lampM=new THREE.MeshStandardMaterial({color:0x333333,metalness:0.8});
    const lampPositions=[[5,-40],[-5,-40],[5,-20],[-5,-20],[5,0],[-5,0],[5,20],[-5,20],[5,40],[-5,40]];
    lampPositions.forEach(([x,z])=>{
      const post=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.13,6,7),lampM.clone());
      post.position.set(x,3,z); post.castShadow=true;
      this._tag(post); s.add(post);
      const arm=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.1,0.1),lampM.clone());
      arm.position.set(x+0.75,5.9,z); this._tag(arm); s.add(arm);
      const globe=new THREE.Mesh(new THREE.SphereGeometry(0.3,8,8),
        new THREE.MeshStandardMaterial({color:0xffffcc,emissive:0xffffaa,emissiveIntensity:0.8}));
      globe.position.set(x+1.5,5.9,z); this._tag(globe); s.add(globe);
      const pl=new THREE.PointLight(0xffeeaa,1.5,18);
      pl.position.set(x+1.5,5.8,z); this._tag(pl); s.add(pl);
    });

    // Bicycle stand near Block A
    const bikeM=new THREE.MeshStandardMaterial({color:0x666666,metalness:0.6});
    for(let i=0;i<5;i++){
      const bBar=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.8,0.6),bikeM.clone());
      bBar.position.set(-35+i*0.9,0.4,12); this._tag(bBar); s.add(bBar);
    }

    // Water fountain near courtyard
    const fBase=new THREE.Mesh(new THREE.CylinderGeometry(0.8,1,0.7,12),
      new THREE.MeshStandardMaterial({color:0x888888,roughness:0.4}));
    fBase.position.set(0,0.35,15); this._tag(fBase); s.add(fBase);
    const fBowl=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.4,0.3,12),
      new THREE.MeshStandardMaterial({color:0x99aacc,roughness:0.2,metalness:0.5}));
    fBowl.position.set(0,0.85,15); this._tag(fBowl); s.add(fBowl);
    const water=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,0.05,12),
      new THREE.MeshStandardMaterial({color:0x44aaff,transparent:true,opacity:0.7}));
    water.position.set(0,0.95,15); this._tag(water); s.add(water);

    // Dustbin near canteen
    const bin=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.22,0.9,8),
      new THREE.MeshStandardMaterial({color:0x226622,roughness:0.8}));
    bin.position.set(20,0.45,36); this._tag(bin); s.add(bin);

    // College signboard at entrance road
    const signPost1=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,3,6),
      new THREE.MeshStandardMaterial({color:0x555555}));
    signPost1.position.set(-4,1.5,52); this._tag(signPost1); s.add(signPost1);
    const signPost2=signPost1.clone(); signPost2.position.x=4; this._tag(signPost2); s.add(signPost2);
    const signBoard=new THREE.Mesh(new THREE.BoxGeometry(9,2,0.2),
      new THREE.MeshStandardMaterial({color:0x003366,emissive:0x001133,emissiveIntensity:0.4}));
    signBoard.position.set(0,2.8,52); this._tag(signBoard); s.add(signBoard);
  }

  // ── GUARDS ───────────────────────────────────────────────────
  _buildGuards() {
    this._guardRoutes.forEach((route,i)=>{
      const g=new THREE.Group();
      // Uniform (khaki)
      const body=new THREE.Mesh(new THREE.BoxGeometry(0.52,0.65,0.28),
        new THREE.MeshStandardMaterial({color:i<2?0x8a7c5a:0x4a5a6a,roughness:0.85}));
      body.position.y=0.55; body.castShadow=true; g.add(body);

      const head=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.36,0.32),
        new THREE.MeshStandardMaterial({color:0xb8865a,roughness:0.8}));
      head.position.y=1.1; head.castShadow=true; g.add(head);

      // Guard cap
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.24,0.16,8),
        new THREE.MeshStandardMaterial({color:0x221100}));
      cap.position.set(0,0.24,0); head.add(cap);
      const brim=new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.32,0.05,8),
        new THREE.MeshStandardMaterial({color:0x221100}));
      brim.position.set(0,0.15,0.05); head.add(brim);

      // Arms
      [-0.34,0.34].forEach(x=>{
        const arm=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.55,0.16),
          new THREE.MeshStandardMaterial({color:0x8a7c5a,roughness:0.85}));
        arm.position.set(x,0.35,0); g.add(arm);
      });
      // Legs
      [-0.13,0.13].forEach(x=>{
        const leg=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.6,0.2),
          new THREE.MeshStandardMaterial({color:0x333344}));
        leg.position.set(x,-0.1,0); g.add(leg);
        const shoe=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.1,0.32),
          new THREE.MeshStandardMaterial({color:0x111111,metalness:0.3}));
        shoe.position.set(x,-0.45,0.05); g.add(shoe);
      });

      // Walkie-talkie on belt
      const wt=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.18,0.06),
        new THREE.MeshStandardMaterial({color:0x222222,roughness:0.5}));
      wt.position.set(0.28,0.4,0.12); g.add(wt);

      // Vision cone
      const cone=new THREE.Mesh(new THREE.ConeGeometry(4,10,8,1,true),
        new THREE.MeshBasicMaterial({color:0xffdd44,transparent:true,opacity:0.06,side:THREE.DoubleSide}));
      cone.rotation.x=Math.PI/2; cone.position.z=-5;
      g.add(cone);

      g.position.copy(route[0]); g.position.y=0.9;
      this._tag(g); this.scene.add(g);
      this._guards.push({mesh:g,route,wpIndex:0,speed:3.5+i*0.4,cone,limb:0});
    });
  }

  // ── CCTV ────────────────────────────────────────────────────
  _buildCCTV() {
    const positions=[
      {x:-24,z:5.5,a:0},     // Block A entrance
      {x:28,z:8.5,a:Math.PI},{// Block B entrance
      x:-28,z:35.5,a:Math.PI/2}, // Library entrance
      {x:0,z:-45,a:0},       // Near gate
      {x:30,z:30,a:-Math.PI/2}, // Canteen
    ];
    positions.forEach(c=>{
      const hm=new THREE.MeshStandardMaterial({color:0x222222,metalness:0.7,roughness:0.3});
      const housing=new THREE.Mesh(new THREE.BoxGeometry(0.45,0.22,0.65),hm.clone());
      housing.position.set(c.x,8,c.z); housing.castShadow=true;
      this._tag(housing); this.scene.add(housing);

      const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,8,6),
        new THREE.MeshStandardMaterial({color:0x777777,metalness:0.7}));
      pole.position.set(c.x,4,c.z); this._tag(pole); this.scene.add(pole);

      const led=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,6),
        new THREE.MeshStandardMaterial({color:0xff0000,emissive:0xff0000,emissiveIntensity:1}));
      led.position.set(c.x+0.28,8.12,c.z); this._tag(led); this.scene.add(led);

      const sweep=new THREE.Mesh(new THREE.ConeGeometry(6,12,8,1,true),
        new THREE.MeshBasicMaterial({color:0xff4400,transparent:true,opacity:0.04,side:THREE.DoubleSide}));
      sweep.rotation.x=Math.PI/2; sweep.position.z=-6;
      housing.add(sweep);

      this._cctvCameras.push({housing,sweep,baseAngle:c.a,sweepTime:Math.random()*Math.PI*2,led});
    });
  }

  // ── ID CARD ──────────────────────────────────────────────────
  _buildIDCard() {
    const g=new THREE.Group();
    // Card body
    const card=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.01,0.28),
      new THREE.MeshStandardMaterial({color:0x003399,emissive:0x001166,emissiveIntensity:0.4,metalness:0.2}));
    g.add(card);
    // Photo square
    const photo=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.011,0.1),
      new THREE.MeshStandardMaterial({color:0xf5c090}));
    photo.position.set(-0.12,0,0); g.add(photo);
    // Pallotti logo strip
    const logo=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.011,0.05),
      new THREE.MeshStandardMaterial({color:0xd4af37,metalness:0.6}));
    logo.position.set(0,0,0.11); g.add(logo);
    // Lanyard hole
    const hole=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.02,8),
      new THREE.MeshStandardMaterial({color:0x888888}));
    hole.position.set(0,0.01,0.12); g.add(hole);

    g.position.set(-28,0.4,33.5);
    this._cardMesh=g;
    this._tag(g); this.scene.add(g);

    const cl=new THREE.PointLight(0x4488ff,2.5,4);
    cl.position.set(-28,1.2,33.5); this._tag(cl); this.scene.add(cl); this._cardLight=cl;
  }

  // ── LIGHTING ────────────────────────────────────────────────
  _setupLighting() {
    const s=this.scene;
    const sun=new THREE.DirectionalLight(0xfff5d8,2.8);
    sun.position.set(50,80,30); sun.castShadow=true;
    sun.shadow.mapSize.set(4096,4096);
    sun.shadow.camera.left=-100; sun.shadow.camera.right=100;
    sun.shadow.camera.top=100; sun.shadow.camera.bottom=-100;
    sun.shadow.camera.far=300; sun.shadow.bias=-0.0005;
    this._tag(sun); s.add(sun);

    const hemi=new THREE.HemisphereLight(0x88aaff,0x4a7a2a,0.9);
    this._tag(hemi); s.add(hemi);

    const ambient=new THREE.AmbientLight(0xaabbcc,0.8);
    this._tag(ambient); s.add(ambient);
  }

  _setupFog() {
    this.scene.background=new THREE.Color(0x87ceeb);
    this.scene.fog=new THREE.Fog(0x87ceeb,60,140);
  }

  // ── UPDATE ───────────────────────────────────────────────────
  update(delta) {
    this._updateGuards(delta);
    this._updateCCTV(delta);
    this._animateCard(delta);
    this._checkExit();
    this._pulseCardGlow();
  }

  _updateGuards(delta) {
    const gm=window.GAME?.gameManager, pc=window.GAME?.playerController;
    this._guards.forEach(g=>{
      const tgt=g.route[g.wpIndex];
      const dir=tgt.clone().sub(g.mesh.position); dir.y=0;
      if(dir.length()<0.6){
        g.wpIndex=(g.wpIndex+1)%g.route.length;
      } else {
        dir.normalize();
        g.mesh.position.addScaledVector(dir,g.speed*delta);
        g.mesh.rotation.y=Math.atan2(dir.x,dir.z);
      }
      g.mesh.position.y=0.9;
      // Walk animation
      g.limb=(g.limb||0)+delta*6;
      if(!pc) return;
      const toP=pc.position.clone().sub(g.mesh.position); toP.y=0;
      const d=toP.length();
      if(d<15){
        const fwd=new THREE.Vector3(Math.sin(g.mesh.rotation.y),0,Math.cos(g.mesh.rotation.y));
        const dot=fwd.dot(toP.normalize());
        if(dot>0.42){
          const rate=pc.isCrouching?5:d<5?30:15;
          gm?.addDetection(delta*rate);
          if(gm?.detection>65) g.mesh.position.addScaledVector(toP.normalize(),g.speed*2*delta);
        }
      }
    });
  }

  _updateCCTV(delta) {
    const gm=window.GAME?.gameManager, pc=window.GAME?.playerController;
    this._cctvCameras.forEach(cam=>{
      cam.sweepTime+=delta*0.5;
      cam.housing.rotation.y=cam.baseAngle+Math.sin(cam.sweepTime)*0.9;
      cam.led.material.emissiveIntensity=Math.sin(cam.sweepTime*4)>0?1.0:0.2;
      if(!pc) return;
      const wp=new THREE.Vector3(); cam.housing.getWorldPosition(wp);
      const toP=pc.position.clone().sub(wp); const d=toP.length();
      if(d<12){
        const a=cam.housing.rotation.y;
        const cd=new THREE.Vector3(Math.sin(a),0,Math.cos(a)).negate();
        const dot=cd.dot(toP.normalize());
        if(dot>0.55&&!pc.isCrouching){
          gm?.addDetection(delta*12);
          cam.led.material.color.set(0xff8800);
        } else cam.led.material.color.set(0xff0000);
      }
    });
  }

  _animateCard(delta) {
    if(this._cardMesh?.parent){
      this._cardMesh.rotation.y+=delta*2.5;
      this._cardMesh.position.y=0.4+Math.sin(Date.now()*0.003)*0.1;
    }
  }

  _pulseCardGlow() {
    if(this._cardLight) this._cardLight.intensity=1.8+Math.sin(Date.now()*0.004)*0.8;
    if(this._exitLight) this._exitLight.intensity=1.5+Math.sin(Date.now()*0.003)*0.6;
    if(this._lockedLight&&!this._hasCard)
      this._lockedLight.intensity=1+Math.sin(Date.now()*0.005)*0.6;
    else if(this._lockedLight) this._lockedLight.intensity=0;
  }

  _checkExit() {
    const pc=window.GAME?.playerController, gm=window.GAME?.gameManager;
    if(!pc||!gm) return;
    if(pc.position.distanceTo(this._exitPos)<4){
      if(this._hasCard){ gm.completeObjective('reach_gate'); gm.triggerWin(); }
      else gm.showAlert('🔒 GATE LOCKED — Get your ID Card from the Library first!',2000);
    }
  }

  onInteract(pos) {
    const gm=window.GAME?.gameManager;
    if(this._cardMesh?.parent && pos.distanceTo(this._cardMesh.position)<3){
      this._hasCard=true;
      this.scene.remove(this._cardMesh);
      if(this._cardLight) this._cardLight.intensity=0;
      this._gateBarL.position.x=-12; this._gateBarR.position.x=12; // open gates
      gm?.completeObjective('find_card');
      gm?.completeObjective('avoid_guard');
      gm?.setActiveObjective('reach_gate');
      gm?.showAlert('🪪 Student ID Card found! Head to the MAIN GATE!',4000);
      window.GAME?.soundSystem?.pickup();
      return;
    }
    gm?.showAlert('Nothing to pick up here',800);
  }

  getGroundY(){ return 0.9; }
  destroy(){ this.scene.fog=null; this.scene.background=null; }
}