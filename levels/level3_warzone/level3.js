/**
 * level3.js  –  WARZONE (Attendance 40-74%)
 * Real destroyed city: collapsed buildings, craters, burnt vehicles,
 * sandbag bunkers, barbed wire, distant fires, drone patrols,
 * searchlights. Extraction zone = helicopter landing pad.
 */
export class Level3 {
  constructor(scene,camera,renderer){
    this.scene=scene; this.camera=camera; this.renderer=renderer;
    this.meta={id:'level3',name:'Warzone — Urban Combat Zone',timeLimit:240,color:'#e74c3c'};
    this.spawnPoint={x:0,y:0.9,z:55};
    this.bounds=75;
    this.objectives=[
      {id:'survive',    text:'Stay alive — avoid drones, searchlights & explosions', done:false, active:true},
      {id:'extraction', text:'Reach the HELICOPTER PAD (green smoke, north end)',    done:false, active:true},
    ];
    this._drones=[]; this._searchlights=[]; this._particles=[]; this._fires=[];
    this._nextExplosion=5+Math.random()*8;
    this._extractPos=new THREE.Vector3(0,0,-60);
  }

  _tag(o){o.userData.levelObject=true;return o;}

  async init(){
    this._buildGround();
    this._buildRoads();
    this._buildDestroyedBuildings();
    this._buildRubbleAndCraters();
    this._buildBurnedVehicles();
    this._buildSandbagBunkers();
    this._buildBarbedWire();
    this._buildExtractionZone();
    this._buildDrones();
    this._buildSearchlights();
    this._buildAmbientFires();
    this._setupLighting();
    this._setupFog();
    setTimeout(()=>window.GAME?.gameManager?.showAlert('🚁 Reach the HELICOPTER PAD at the north end — GREEN SMOKE!',5000),1500);
  }

  // ── GROUND ────────────────────────────────────────────────
  _buildGround(){
    const s=this.scene;
    // Cracked dark asphalt
    const road=new THREE.Mesh(new THREE.PlaneGeometry(160,160),
      new THREE.MeshStandardMaterial({color:0x1a1812,roughness:0.95}));
    road.rotation.x=-Math.PI/2; road.receiveShadow=true;
    this._tag(road); s.add(road);
    // Dusty patches
    const dustM=new THREE.MeshStandardMaterial({color:0x2a2418,roughness:1.0});
    [[15,20],[-30,-10],[40,35],[-20,40],[10,-30]].forEach(([x,z])=>{
      const d=new THREE.Mesh(new THREE.CircleGeometry(8+Math.random()*6,10),dustM.clone());
      d.rotation.x=-Math.PI/2; d.position.set(x,0.01,z);
      this._tag(d); s.add(d);
    });
  }

  // ── CRACKED ROADS ─────────────────────────────────────────
  _buildRoads(){
    const s=this.scene;
    const rM=new THREE.MeshStandardMaterial({color:0x222018,roughness:0.9});
    // Main road lines (faded yellow)
    const lineM=new THREE.MeshStandardMaterial({color:0x888844,roughness:0.9});
    for(let z=-60;z<60;z+=8){
      const l=new THREE.Mesh(new THREE.PlaneGeometry(0.3,4),lineM.clone());
      l.rotation.x=-Math.PI/2; l.position.set(0,0.015,z);
      this._tag(l); s.add(l);
    }
    // Cracked line overlay (dark cracks)
    const crackM=new THREE.MeshStandardMaterial({color:0x0a0a08,roughness:1.0});
    for(let i=0;i<12;i++){
      const c=new THREE.Mesh(new THREE.PlaneGeometry(0.08,6+Math.random()*8),crackM.clone());
      c.rotation.x=-Math.PI/2; c.rotation.z=Math.random()*Math.PI;
      c.position.set((Math.random()-0.5)*80,0.016,(Math.random()-0.5)*120);
      this._tag(c); s.add(c);
    }
  }

  // ── DESTROYED BUILDINGS ──────────────────────────────────
  _buildDestroyedBuildings(){
    const s=this.scene;
    const wM=new THREE.MeshStandardMaterial({color:0x4a4438,roughness:0.95});
    const concM=new THREE.MeshStandardMaterial({color:0x666055,roughness:0.9});
    const burnM=new THREE.MeshStandardMaterial({color:0x1a1410,roughness:1.0});

    // Each building: partially standing walls with jagged tops
    const buildings=[
      {x:-35,z:10, w:18,h:12,d:14, side:'left'},
      {x:35, z:10, w:16,h:10,d:12, side:'right'},
      {x:-30,z:-20,w:14,h:9, d:12, side:'left'},
      {x:35, z:-25,w:18,h:14,d:15, side:'right'},
      {x:-10,z:-45,w:12,h:8, d:10, side:'mid'},
      {x:15, z:-45,w:10,h:7, d:10, side:'mid'},
      {x:-50,z:0,  w:10,h:11,d:18, side:'edge'},
      {x:50, z:0,  w:10,h:10,d:18, side:'edge'},
    ];

    buildings.forEach(b=>{
      // Standing back wall
      const backH=b.h*(0.5+Math.random()*0.5);
      const back=new THREE.Mesh(new THREE.BoxGeometry(b.w,backH,0.6),wM.clone());
      back.position.set(b.x,backH/2,b.z-b.d/2);
      back.castShadow=back.receiveShadow=true; this._tag(back); s.add(back);

      // Partial side walls
      const lH=b.h*(0.3+Math.random()*0.6);
      const lw=new THREE.Mesh(new THREE.BoxGeometry(0.6,lH,b.d*0.8),wM.clone());
      lw.position.set(b.x-b.w/2,lH/2,b.z); lw.castShadow=true; this._tag(lw); s.add(lw);

      const rH=b.h*(0.2+Math.random()*0.5);
      const rw=new THREE.Mesh(new THREE.BoxGeometry(0.6,rH,b.d*0.6),wM.clone());
      rw.position.set(b.x+b.w/2,rH/2,b.z); rw.castShadow=true; this._tag(rw); s.add(rw);

      // Floor slab (collapsed)
      const slab=new THREE.Mesh(new THREE.BoxGeometry(b.w*0.8,0.4,b.d*0.7),concM.clone());
      slab.position.set(b.x+(-0.5+Math.random())*3, b.h*0.3, b.z+1);
      slab.rotation.set((Math.random()-0.5)*0.3,0,(Math.random()-0.5)*0.4);
      slab.castShadow=true; this._tag(slab); s.add(slab);

      // Burn marks on walls
      const burn=new THREE.Mesh(new THREE.PlaneGeometry(4+Math.random()*4,3+Math.random()*3),burnM.clone());
      burn.position.set(b.x,backH*0.5,b.z-b.d/2+0.31);
      this._tag(burn); s.add(burn);

      // Exposed rebar (cylinders at broken top)
      for(let i=0;i<4;i++){
        const rebar=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.5+Math.random(),5),
          new THREE.MeshStandardMaterial({color:0x554433,metalness:0.4}));
        rebar.position.set(b.x+(Math.random()-0.5)*b.w*0.8, backH+0.5, b.z-b.d/2);
        rebar.rotation.z=(Math.random()-0.5)*0.5;
        this._tag(rebar); s.add(rebar);
      }

      // Window holes (dark squares)
      for(let f=1;f<=Math.min(2,Math.floor(backH/4));f++){
        for(let c=-1;c<=1;c++){
          const hole=new THREE.Mesh(new THREE.BoxGeometry(2,2.2,0.7),burnM.clone());
          hole.position.set(b.x+c*4.5, f*3.5, b.z-b.d/2);
          this._tag(hole); s.add(hole);
        }
      }
    });
  }

  // ── RUBBLE & CRATERS ──────────────────────────────────────
  _buildRubbleAndCraters(){
    const s=this.scene;
    const rubM=new THREE.MeshStandardMaterial({color:0x554843,roughness:1.0});
    const craterM=new THREE.MeshStandardMaterial({color:0x110e0c,roughness:1.0});

    // Scattered rubble piles
    const rubbleSpots=[[-25,5],[25,-15],[-10,25],[15,-35],[-35,-30],[40,20],[-45,15],[30,-50]];
    rubbleSpots.forEach(([x,z])=>{
      for(let i=0;i<8;i++){
        const r=new THREE.Mesh(
          new THREE.BoxGeometry(0.4+Math.random()*1.5,0.2+Math.random()*0.8,0.3+Math.random()*1.2),
          rubM.clone());
        r.position.set(x+(Math.random()-0.5)*6, Math.random()*0.5, z+(Math.random()-0.5)*5);
        r.rotation.set((Math.random()-0.5)*0.6,Math.random()*Math.PI,(Math.random()-0.5)*0.6);
        r.castShadow=r.receiveShadow=true; this._tag(r); s.add(r);
      }
    });

    // Bomb craters (concave circles)
    [[5,10],[-20,-25],[30,5],[-5,-50],[18,-15]].forEach(([x,z])=>{
      const r=3+Math.random()*2;
      const crater=new THREE.Mesh(new THREE.CircleGeometry(r,14),craterM.clone());
      crater.rotation.x=-Math.PI/2; crater.position.set(x,-0.05,z);
      this._tag(crater); s.add(crater);
      // Crater rim
      const rimM=new THREE.MeshStandardMaterial({color:0x2a2218,roughness:1.0});
      const rim=new THREE.Mesh(new THREE.TorusGeometry(r,0.5,4,14),rimM.clone());
      rim.rotation.x=-Math.PI/2; rim.position.set(x,0,z);
      this._tag(rim); s.add(rim);
    });
  }

  // ── BURNED VEHICLES ───────────────────────────────────────
  _buildBurnedVehicles(){
    const s=this.scene;
    const burnedM=new THREE.MeshStandardMaterial({color:0x1a1410,roughness:1.0,metalness:0.2});
    const rustM=new THREE.MeshStandardMaterial({color:0x5a3522,roughness:0.9,metalness:0.3});

    const vehicles=[
      {x:-22,z:2,ry:0.4},   // car sideways
      {x:22,z:-18,ry:-0.2},
      {x:-8,z:-42,ry:1.2},
      {x:40,z:40,ry:0.8},
    ];
    vehicles.forEach(v=>{
      // Car body
      const body=new THREE.Mesh(new THREE.BoxGeometry(4,1.4,2),burnedM.clone());
      body.position.set(v.x,0.7,v.z); body.rotation.y=v.ry;
      body.castShadow=body.receiveShadow=true; this._tag(body); s.add(body);
      // Roof (crushed)
      const roof=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.8,1.8),burnedM.clone());
      roof.position.set(v.x,1.8,v.z); roof.rotation.set((Math.random()-0.5)*0.2,v.ry,(Math.random()-0.5)*0.15);
      roof.castShadow=true; this._tag(roof); s.add(roof);
      // Wheels (melted/flat)
      [[-1.3,0,-1.1],[-1.3,0,1.1],[1.3,0,-1.1],[1.3,0,1.1]].forEach(([wx,wy,wz])=>{
        const wheel=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,0.25,10),
          new THREE.MeshStandardMaterial({color:0x111111,roughness:1.0}));
        wheel.rotation.z=Math.PI/2;
        wheel.position.set(v.x+wx*Math.cos(v.ry)-wz*Math.sin(v.ry),0.25,
          v.z+wx*Math.sin(v.ry)+wz*Math.cos(v.ry));
        this._tag(wheel); s.add(wheel);
      });
      // Fire emitter position
      this._fires.push({pos:new THREE.Vector3(v.x,1.5,v.z),t:Math.random()*10});
    });

    // Military truck carcass
    const truck=new THREE.Mesh(new THREE.BoxGeometry(7,2.5,3),rustM.clone());
    truck.position.set(-42,1.25,-10); truck.rotation.y=0.3;
    truck.castShadow=truck.receiveShadow=true; this._tag(truck); s.add(truck);
    const truckCab=new THREE.Mesh(new THREE.BoxGeometry(3,2.2,3),burnedM.clone());
    truckCab.position.set(-38.5,1.85,-10); truckCab.rotation.y=0.3;
    this._tag(truckCab); s.add(truckCab);
    this._fires.push({pos:new THREE.Vector3(-41,2.5,-10),t:0});
  }

  // ── SANDBAG BUNKERS ───────────────────────────────────────
  _buildSandbagBunkers(){
    const s=this.scene;
    const sandM=new THREE.MeshStandardMaterial({color:0x8a7a5a,roughness:1.0});
    const bunkers=[
      {x:-12,z:-30,ry:0},
      {x:12,z:-30,ry:Math.PI},
      {x:-30,z:35,ry:Math.PI/2},
      {x:30,z:35,ry:-Math.PI/2},
    ];
    bunkers.forEach(b=>{
      // Sandbag rows (stacked boxes)
      for(let row=0;row<2;row++){
        for(let col=-2;col<=2;col++){
          const bag=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.55,0.65),sandM.clone());
          bag.position.set(b.x+Math.cos(b.ry+Math.PI/2)*col*0.9,
            0.27+row*0.55,
            b.z+Math.sin(b.ry+Math.PI/2)*col*0.9);
          bag.rotation.y=b.ry+(Math.random()-0.5)*0.1;
          bag.castShadow=bag.receiveShadow=true;
          this._tag(bag); s.add(bag);
        }
      }
      // Corner sandbags
      for(let side=-1;side<=1;side+=2){
        for(let row=0;row<3;row++){
          const bag=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.55,0.65),sandM.clone());
          bag.position.set(b.x+Math.cos(b.ry)*2*side,0.27+row*0.55,b.z+Math.sin(b.ry)*2*side);
          bag.castShadow=true; this._tag(bag); s.add(bag);
        }
      }
    });
  }

  // ── BARBED WIRE ────────────────────────────────────────────
  _buildBarbedWire(){
    const s=this.scene;
    const postM=new THREE.MeshStandardMaterial({color:0x555544,metalness:0.5});
    const wireM=new THREE.MeshStandardMaterial({color:0x888877,metalness:0.6});
    [[-15,-38,18],[15,-38,18],[-40,-20,0,20],[40,-20,0,20]].forEach(([x,z,x2,z2])=>{
      const len=x2!==undefined?Math.sqrt((x2-x)**2+(z2-z)**2):18;
      const angle=x2!==undefined?Math.atan2(z2-z,x2-x):0;
      const cx=x2!==undefined?(x+x2)/2:x;
      const cz=z2!==undefined?(z+z2)/2:z;
      const wire=new THREE.Mesh(new THREE.BoxGeometry(len,0.06,0.06),wireM.clone());
      wire.position.set(cx,1,cz); wire.rotation.y=angle;
      this._tag(wire); s.add(wire);
      // Posts at each end
      [0,len/2,-len/2].forEach(offset=>{
        const post=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.2,5),postM.clone());
        post.position.set(cx+Math.cos(angle)*offset,0.6,cz+Math.sin(angle)*offset);
        this._tag(post); s.add(post);
      });
    });
  }

  // ── EXTRACTION ZONE ────────────────────────────────────────
  _buildExtractionZone(){
    const s=this.scene;
    // Helipad
    const padM=new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:0.8});
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(8,8,0.15,24),padM.clone());
    pad.position.set(0,0.07,-60); this._tag(pad); s.add(pad);

    // Helipad H marking
    const markM=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.9});
    const hV=new THREE.Mesh(new THREE.PlaneGeometry(1.5,6),markM.clone());
    hV.rotation.x=-Math.PI/2; hV.position.set(-2.5,0.12,-60); this._tag(hV); s.add(hV);
    const hV2=hV.clone(); hV2.position.x=2.5; this._tag(hV2); s.add(hV2);
    const hH=new THREE.Mesh(new THREE.PlaneGeometry(5,1.5),markM.clone());
    hH.rotation.x=-Math.PI/2; hH.position.set(0,0.12,-60); this._tag(hH); s.add(hH);

    // Helipad circle ring
    const ring=new THREE.Mesh(new THREE.TorusGeometry(7.5,0.4,4,32),
      new THREE.MeshStandardMaterial({color:0xffff00,emissive:0xaaaa00,emissiveIntensity:0.6}));
    ring.rotation.x=-Math.PI/2; ring.position.set(0,0.1,-60);
    this._tag(ring); s.add(ring);

    // Green smoke (cylinder with light)
    for(let i=0;i<3;i++){
      const smoke=new THREE.Mesh(new THREE.CylinderGeometry(0.3-i*0.08,0.5-i*0.05,3+i*1.5,8),
        new THREE.MeshStandardMaterial({color:0x00dd44,transparent:true,opacity:0.4-i*0.1,roughness:1.0}));
      smoke.position.set((Math.random()-0.5)*4,1.5+i*1.5,-60);
      this._tag(smoke); s.add(smoke); this._smokeColumns=(this._smokeColumns||[]);
      this._smokeColumns.push(smoke);
    }

    const gl=new THREE.PointLight(0x00ff44,3,20);
    gl.position.set(0,2,-60); this._tag(gl); s.add(gl); this._extractLight=gl;

    // Corner lights on helipad
    [[7,7],[7,-7],[-7,7],[-7,-7]].forEach(([dx,dz])=>{
      const bl=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.4,0.4),
        new THREE.MeshStandardMaterial({color:0xff4400,emissive:0xff2200,emissiveIntensity:1.5}));
      bl.position.set(dx,0.2,-60+dz); this._tag(bl); s.add(bl);
      const bpl=new THREE.PointLight(0xff4400,1,5);
      bpl.position.set(dx,0.5,-60+dz); this._tag(bpl); s.add(bpl);
    });

    // Partial helicopter wreck nearby (atmospheric)
    const hbM=new THREE.MeshStandardMaterial({color:0x2a2820,metalness:0.4,roughness:0.8});
    const hBody=new THREE.Mesh(new THREE.BoxGeometry(8,2.5,2.2),hbM.clone());
    hBody.position.set(15,1.25,-55); hBody.rotation.y=0.5;
    hBody.castShadow=true; this._tag(hBody); s.add(hBody);
    const hTail=new THREE.Mesh(new THREE.BoxGeometry(6,1,1),hbM.clone());
    hTail.position.set(17,2,-52); hTail.rotation.y=0.5;
    this._tag(hTail); s.add(hTail);
    const hBlade=new THREE.Mesh(new THREE.BoxGeometry(10,0.1,0.5),hbM.clone());
    hBlade.position.set(15,3,-55); hBlade.rotation.y=0.8;
    this._tag(hBlade); s.add(hBlade);
  }

  // ── DRONES ────────────────────────────────────────────────
  _buildDrones(){
    const droneM=new THREE.MeshStandardMaterial({color:0x1a1a22,metalness:0.7,roughness:0.3});
    const rotorM=new THREE.MeshStandardMaterial({color:0x333344,metalness:0.5});
    const routes=[
      {cx:-20,cz:-10,r:22,spd:0.7,h:12},
      {cx:20, cz:10, r:18,spd:-0.55,h:10},
      {cx:0,  cz:-35,r:15,spd:0.9,h:14},
    ];
    routes.forEach((r,i)=>{
      const g=new THREE.Group();
      const body=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.35,1.2),droneM.clone());
      g.add(body);
      // 4 arms + rotors
      [[0.7,0,0.7],[0.7,0,-0.7],[-0.7,0,0.7],[-0.7,0,-0.7]].forEach(([ax,ay,az])=>{
        const arm=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.08,0.08),droneM.clone());
        arm.position.set(ax*0.5,0,az*0.5); arm.rotation.y=Math.atan2(ax,az); g.add(arm);
        const rotor=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.6,0.04,8),rotorM.clone());
        rotor.position.set(ax,0.1,az); g.add(rotor);
      });
      // Red LED
      const led=new THREE.Mesh(new THREE.SphereGeometry(0.06,6,6),
        new THREE.MeshStandardMaterial({color:0xff0000,emissive:0xff0000,emissiveIntensity:1.5}));
      led.position.y=-0.2; g.add(led);
      // Spotlight
      const spot=new THREE.SpotLight(0xffff44,4,25,Math.PI/8,0.5,1.5);
      spot.position.set(0,-0.5,0); g.add(spot);
      const st=new THREE.Object3D(); st.position.set(0,-10,0); g.add(st);
      spot.target=st;
      // Sweep cone visual
      const cone=new THREE.Mesh(new THREE.ConeGeometry(4,12,8,1,true),
        new THREE.MeshBasicMaterial({color:0xffff44,transparent:true,opacity:0.05,side:THREE.DoubleSide}));
      cone.position.y=-6; g.add(cone);

      g.position.set(r.cx+r.r,r.h,r.cz);
      g.userData.levelObject=true; this.scene.add(g);
      this._drones.push({mesh:g,...r,angle:i*Math.PI*2/3,led,spot,rotors:[]});
    });
  }

  // ── SEARCHLIGHTS ──────────────────────────────────────────
  _buildSearchlights(){
    const towers=[{x:-55,z:-20},{x:55,z:-20}];
    towers.forEach(t=>{
      const s=this.scene;
      const towerM=new THREE.MeshStandardMaterial({color:0x3a3830,metalness:0.3});
      const tower=new THREE.Mesh(new THREE.BoxGeometry(1.5,18,1.5),towerM.clone());
      tower.position.set(t.x,9,t.z); tower.castShadow=true;
      this._tag(tower); s.add(tower);
      // Platform
      const platform=new THREE.Mesh(new THREE.BoxGeometry(4,0.4,4),towerM.clone());
      platform.position.set(t.x,18,t.z); this._tag(platform); s.add(platform);
      // Searchlight housing
      const housing=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.8,0.6,12),
        new THREE.MeshStandardMaterial({color:0x666655,metalness:0.6}));
      housing.position.set(t.x,18.8,t.z); this._tag(housing); s.add(housing);
      const spotlight=new THREE.SpotLight(0xffffff,8,60,Math.PI/10,0.3,1);
      spotlight.position.set(t.x,18.5,t.z);
      const target=new THREE.Object3D(); target.position.set(t.x,0,t.z-30);
      s.add(target); spotlight.target=target;
      this._tag(spotlight); s.add(spotlight);
      this._searchlights.push({light:spotlight,target,base:{x:t.x,z:t.z},angle:0,speed:(Math.random()>0.5?1:-1)*0.4});
    });
  }

  // ── AMBIENT FIRES ─────────────────────────────────────────
  _buildAmbientFires(){
    const s=this.scene;
    this._fires.forEach(f=>{
      const light=new THREE.PointLight(0xff6600,3,15);
      light.position.copy(f.pos);
      this._tag(light); s.add(light);
      f.light=light;
      // Fire mesh (animated emissive cone)
      const fireMesh=new THREE.Mesh(new THREE.ConeGeometry(0.4,1.5,8),
        new THREE.MeshStandardMaterial({color:0xff4400,emissive:0xff2200,emissiveIntensity:2,transparent:true,opacity:0.85}));
      fireMesh.position.copy(f.pos); this._tag(fireMesh); s.add(fireMesh);
      f.mesh=fireMesh;
    });
    // Extra fires scattered
    [[-28,2,8],[28,2,-22],[-5,2,-38],[42,2,18],[-48,2,-15]].forEach(([x,y,z])=>{
      const light=new THREE.PointLight(0xff5500,2.5,12);
      light.position.set(x,y,z); this._tag(light); this.scene.add(light);
      const fm=new THREE.Mesh(new THREE.ConeGeometry(0.35,1.2,8),
        new THREE.MeshStandardMaterial({color:0xff6600,emissive:0xff3300,emissiveIntensity:2,transparent:true,opacity:0.8}));
      fm.position.set(x,y,z); this._tag(fm); this.scene.add(fm);
      this._fires.push({pos:new THREE.Vector3(x,y,z),light,mesh:fm,t:Math.random()*10});
    });
  }

  // ── LIGHTING ─────────────────────────────────────────────
  _setupLighting(){
    const s=this.scene;
    const sun=new THREE.DirectionalLight(0xff7722,2.2);
    sun.position.set(-40,50,20); sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);
    sun.shadow.camera.left=-100; sun.shadow.camera.right=100;
    sun.shadow.camera.top=100; sun.shadow.camera.bottom=-100;
    this._tag(sun); s.add(sun);
    const ambient=new THREE.AmbientLight(0x8a5030,1.4);
    this._tag(ambient); s.add(ambient);
  }

  _setupFog(){
    this.scene.background=new THREE.Color(0x2a1808);
    this.scene.fog=new THREE.FogExp2(0x2a1808,0.012);
  }

  // ── UPDATE ────────────────────────────────────────────────
  update(delta){
    this._updateDrones(delta);
    this._updateSearchlights(delta);
    this._updateFires(delta);
    this._updateExplosions(delta);
    this._animateSmoke(delta);
    this._checkExtraction();
  }

  _updateDrones(delta){
    const gm=window.GAME?.gameManager, pc=window.GAME?.playerController;
    this._drones.forEach(d=>{
      d.angle+=d.spd*delta;
      d.mesh.position.set(d.cx+Math.cos(d.angle)*d.r, d.h+Math.sin(d.angle*2.1)*1.5, d.cz+Math.sin(d.angle)*d.r);
      d.mesh.rotation.y=d.angle+Math.PI/2;
      d.led.material.emissiveIntensity=0.6+Math.sin(Date.now()*0.008)*0.5;
      if(!pc) return;
      const toP=pc.position.clone().sub(d.mesh.position); toP.y=0;
      const dist=toP.length();
      if(dist<20){
        const dot=new THREE.Vector3(0,-1,0).dot(pc.position.clone().sub(d.mesh.position).normalize());
        if(dot>0.5){
          gm?.addDetection(delta*(pc.isCrouching?8:18));
          d.led.material.color.set(0xff8800);
          if(gm?.detection>60) gm?.showAlert('🚨 DRONE SPOTTED YOU!',1000);
        } else d.led.material.color.set(0xff0000);
      }
    });
  }

  _updateSearchlights(delta){
    const gm=window.GAME?.gameManager, pc=window.GAME?.playerController;
    this._searchlights.forEach(sl=>{
      sl.angle+=sl.speed*delta;
      const tx=sl.base.x+Math.sin(sl.angle)*50;
      const tz=sl.base.z-30+Math.cos(sl.angle)*15;
      sl.target.position.set(tx,0,tz);
      if(!pc) return;
      const dist=pc.position.distanceTo(new THREE.Vector3(tx,0,tz));
      if(dist<10) gm?.addDetection(delta*20);
    });
  }

  _updateFires(delta){
    this._fires.forEach(f=>{
      f.t=(f.t||0)+delta;
      if(f.light) f.light.intensity=2.5+Math.sin(f.t*6+f.pos.x)*1.2;
      if(f.mesh){
        f.mesh.scale.y=0.8+Math.sin(f.t*7)*0.35;
        f.mesh.scale.x=0.8+Math.sin(f.t*5+1)*0.2;
        f.mesh.rotation.y+=delta*3;
        f.mesh.material.emissiveIntensity=1.5+Math.sin(f.t*8)*0.8;
      }
    });
    // Pulse extraction light
    if(this._extractLight) this._extractLight.intensity=2.5+Math.sin(Date.now()*0.004)*1;
  }

  _animateSmoke(delta){
    if(!this._smokeColumns) return;
    this._smokeColumns.forEach((c,i)=>{
      c.position.y+=delta*0.8;
      c.material.opacity=Math.max(0, c.material.opacity-delta*0.08);
      if(c.position.y>8){ c.position.y=1+i*0.5; c.material.opacity=0.4-i*0.1; }
    });
  }

  _updateExplosions(delta){
    const gm=window.GAME?.gameManager, pc=window.GAME?.playerController;
    this._nextExplosion-=delta;
    if(this._nextExplosion<=0){
      this._nextExplosion=6+Math.random()*10;
      const ex=(Math.random()-0.5)*120, ez=(Math.random()-0.5)*100;
      // Flash
      const fl=new THREE.PointLight(0xff6600,15,40);
      fl.position.set(ex,2,ez); this._tag(fl); this.scene.add(fl);
      setTimeout(()=>this.scene.remove(fl),300);
      setTimeout(()=>{ fl.intensity=6; this.scene.add(fl); },350);
      setTimeout(()=>this.scene.remove(fl),600);
      window.GAME?.soundSystem?.explosion();
      gm?.showAlert('💥 EXPLOSION NEARBY!',1200);
      if(pc){
        const d=pc.position.distanceTo(new THREE.Vector3(ex,0,ez));
        if(d<15) gm?.takeDamage(8+Math.random()*12);
      }
    }
  }

  _checkExtraction(){
    const pc=window.GAME?.playerController, gm=window.GAME?.gameManager;
    if(!pc||!gm) return;
    if(pc.position.distanceTo(this._extractPos)<8){
      gm.completeObjective('extraction'); gm.triggerWin();
    }
  }

  onInteract(){}
  getGroundY(){ return 0.9; }
  destroy(){ this.scene.fog=null; this.scene.background=null; }
}