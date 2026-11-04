const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d', { alpha: false });
const end = document.querySelector('.end');
const film = document.querySelector('.film');
const stage = document.querySelector('.frame');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = x => Math.min(1, Math.max(0, x));
const range = (t, a, b) => clamp((t - a) / (b - a));
const ease = (t, a, b) => {
  const x = range(t, a, b);
  return x * x * (3 - 2 * x);
};
const mix = (a, b, t) => a + (b - a) * t;
function random(seed) {
  const n = Math.sin(seed * 27.419 + 46.123) * 13758.5453;
  return n - Math.floor(n);
}

const stars = Array.from({ length: 420 }, (_, i) => ({
  x: random(i * 5), y: random(i * 5 + 1),
  radius: .24 + random(i * 5 + 2) ** 3 * 1.15,
  threshold: random(i * 5 + 3), light: .18 + random(i * 5 + 4) * .75, tint: i % 4
}));
const splinters = Array.from({ length: 77 }, (_, i) => ({
  angle: random(i * 7 + 300) * Math.PI * 2,
  speed: .17 + random(i * 7 + 301) ** 2 * 1.8,
  size: .7 + random(i * 7 + 302) ** 3 * 14,
  spin: (random(i * 7 + 303) - .5) * 17,
  light: .13 + random(i * 7 + 304) * .77
}));
const treeAspect = 16/9;
const plateAspect = 1.5;
const GOLD = '#f0b83c', GOLD2 = '#ffd98a', BLUE = '#3d7bff', BLUE2 = '#8db6ff';
const tints = ['255,255,255','255,217,138','141,182,255','255,255,255'];

// ---------------------------------------------------------------------------
// Opening plate: an original circuit tree on a hill under a gold horizon,
// painted once per size into an offscreen canvas (1600 × 900 scene units).
// ---------------------------------------------------------------------------
let scene = null;
const pulses = [];
function paintScene(g) {
  const W = 1600, H = 900, horizon = 566;
  const sky = g.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#010208'); sky.addColorStop(.42,'#050c22'); sky.addColorStop(.62,'#0d1e4a');
  sky.addColorStop(.63,'#040917'); sky.addColorStop(1,'#010207');
  g.fillStyle = sky; g.fillRect(0,0,W,H);

  // Faint blueprint grid in the sky.
  g.strokeStyle = 'rgba(141,182,255,.045)'; g.lineWidth = 1;
  g.beginPath();
  for (let x=0;x<=W;x+=40) { g.moveTo(x,0); g.lineTo(x,horizon); }
  for (let y=0;y<horizon;y+=40) { g.moveTo(0,y); g.lineTo(W,y); }
  g.stroke();

  // Stars, a few constellation links, and Polaris with a four-point flare.
  for (let i=0;i<520;i++) {
    const x = random(i*3+7000)*W, y = random(i*3+7001)**1.4*horizon*.95;
    const r = .35 + random(i*3+7002)**4*1.6;
    g.fillStyle = `rgba(${tints[i%4]},${.25+random(i+7600)*.7})`;
    g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill();
  }
  const constellation = [[212,148],[268,120],[330,136],[372,184],[390,256],[318,214],[270,190]];
  g.strokeStyle = 'rgba(141,182,255,.22)'; g.lineWidth = .7;
  g.beginPath(); constellation.forEach(([x,y],i) => i ? g.lineTo(x,y) : g.moveTo(x,y)); g.stroke();
  for (const [x,y] of constellation) { g.strokeStyle='rgba(255,217,138,.5)'; g.strokeRect(x-2.5,y-2.5,5,5); }
  glow(g,390,256,46,'rgba(141,182,255,.55)');
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(390,226); g.lineTo(392,254); g.lineTo(420,256); g.lineTo(392,258); g.lineTo(390,286);
  g.lineTo(388,258); g.lineTo(360,256); g.lineTo(388,254); g.closePath(); g.fill();
  g.font = '9px Consolas, monospace'; g.fillStyle = 'rgba(255,217,138,.75)';
  g.fillText('α UMi · 90°N',404,284);

  // Gold sun on the horizon with targeting rings.
  glow(g,640,horizon,420,'rgba(240,184,60,.30)');
  glow(g,640,horizon,170,'rgba(255,190,80,.55)');
  g.save();
  g.beginPath(); g.rect(0,0,W,horizon); g.clip();
  const sun = g.createRadialGradient(640,horizon-10,0,640,horizon,92);
  sun.addColorStop(0,'#fff6dc'); sun.addColorStop(.45,GOLD2); sun.addColorStop(1,'#d48e1c');
  g.fillStyle = sun; g.beginPath(); g.arc(640,horizon,92,0,Math.PI*2); g.fill();
  g.fillStyle = '#0d1e4a';
  for (let k=0;k<6;k++) g.fillRect(540,horizon-8-k*13,200,1.2+k*.25);
  g.restore();
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(255,217,138,.55)'; g.beginPath(); g.arc(640,horizon,128,Math.PI*1.04,Math.PI*1.46); g.stroke();
  g.beginPath(); g.arc(640,horizon,128,Math.PI*1.54,Math.PI*1.96); g.stroke();
  g.setLineDash([2,6]); g.strokeStyle = 'rgba(141,182,255,.5)';
  g.beginPath(); g.arc(640,horizon,164,Math.PI,Math.PI*2); g.stroke(); g.setLineDash([]);
  g.strokeStyle = 'rgba(255,217,138,.6)';
  g.beginPath(); g.moveTo(640,horizon-140); g.lineTo(640,horizon-176); g.stroke();

  // Horizon line and perspective floor grid.
  const line = g.createLinearGradient(0,0,W,0);
  line.addColorStop(0,'rgba(141,182,255,0)'); line.addColorStop(.4,'rgba(255,217,138,.9)'); line.addColorStop(1,'rgba(141,182,255,0)');
  g.fillStyle = line; g.fillRect(0,horizon,W,1.4);
  g.strokeStyle = 'rgba(61,123,255,.28)'; g.lineWidth = 1;
  g.beginPath();
  for (let i=-30;i<=30;i++) { g.moveTo(800+i*12,horizon); g.lineTo(800+i*170,H); }
  for (let k=1;k<14;k++) { const y = horizon + (H-horizon)*(k/14)**2.1; g.moveTo(0,y); g.lineTo(W,y); }
  g.stroke();

  // Hill silhouette with topographic contours and a gold rim light.
  const hill = new Path2D('M0 768 C 230 720 470 650 640 636 C 720 626 800 616 860 620 C 1000 630 1160 690 1320 730 C 1450 760 1540 772 1600 780 L1600 900 L0 900 Z');
  const ground = g.createLinearGradient(0,600,0,900);
  ground.addColorStop(0,'#060b1b'); ground.addColorStop(1,'#010206');
  g.fillStyle = ground; g.fill(hill);
  g.save(); g.clip(hill);
  g.strokeStyle = 'rgba(61,123,255,.10)';
  for (let k=1;k<9;k++) {
    g.beginPath();
    g.ellipse(810,640+k*26,180+k*120,24+k*16,0,Math.PI,Math.PI*2);
    g.stroke();
  }
  g.restore();
  const rim = g.createLinearGradient(300,0,1400,0);
  rim.addColorStop(0,'rgba(240,184,60,0)'); rim.addColorStop(.32,'rgba(255,217,138,.9)');
  rim.addColorStop(.6,'rgba(141,182,255,.45)'); rim.addColorStop(1,'rgba(141,182,255,0)');
  g.strokeStyle = rim; g.lineWidth = 1.6; g.stroke(hill);

  // Grow the circuit tree: traces snap to 45° and end in solder pads.
  const traces = [], pads = [];
  const deg = Math.PI/180;
  function grow(x,y,angle,length,depth,seed,chain) {
    const a = Math.max(-180*deg,Math.min(0,angle));
    const L = length*(.8+random(seed)*.4);
    const nx = x+Math.cos(a)*L, ny = y+Math.sin(a)*L;
    traces.push({ pts: [[x,y],[nx,ny]], depth: Math.max(0,depth) });
    if (chain) chain.push([nx,ny]);
    if (depth <= 0) { pads.push([nx,ny,random(seed+1)]); return; }
    if (depth <= 2 && random(seed+2) < .5) pads.push([mix(x,nx,.5),mix(y,ny,.5),random(seed+3)]);
    const turn = random(seed+4) < .5 ? -1 : 1;
    grow(nx,ny,a+turn*45*deg,length*.74,depth-1,seed*2+11,chain);
    grow(nx,ny,a-turn*45*deg,length*.70,depth-1,seed*2+12,null);
    if (random(seed+5) < .28) grow(nx,ny,a,length*.6,depth-2,seed*2+13,null);
  }
  const strands = 7;
  for (let i=0;i<strands;i++) {
    const offset = (i-(strands-1)/2);
    const bx = 800+offset*9, by = 640, top = 470+Math.abs(offset)*16;
    const chain = [[bx,by],[bx,top]];
    traces.push({ pts: [[bx,by],[bx,top]], depth: 7 });
    const lean = offset*24*deg;
    const kx = bx+Math.sin(lean)*44, ky = top-Math.cos(lean)*44;
    traces.push({ pts: [[bx,top],[kx,ky]], depth: 6 });
    chain.push([kx,ky]);
    grow(kx,ky,-90*deg+Math.round(offset)*22.5*deg,82,5,i*97+5,chain);
    pulses.push(chain);
  }
  // Roots spread into the hill.
  for (let i=0;i<6;i++) {
    const side = i<3 ? -1 : 1, k = i%3;
    const sx = 800+side*(6+k*10), ex = sx+side*(60+k*70);
    traces.push({ pts: [[sx,640],[sx,650+k*8],[ex,690+k*22]], depth: 3 });
    pads.push([ex,690+k*22,.9]);
  }

  const colorFor = d => d >= 6 ? GOLD : d >= 4 ? GOLD2 : d >= 2 ? BLUE2 : BLUE;
  const widthFor = d => [1.1,1.4,1.8,2.2,2.8,3.4,3.6,4.2][d];
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const pass of [0,1]) {
    for (const tr of traces) {
      g.beginPath();
      tr.pts.forEach(([x,y],i) => i ? g.lineTo(x,y) : g.moveTo(x,y));
      g.strokeStyle = pass ? colorFor(tr.depth) : `rgba(${tr.depth>=4?'240,184,60':'61,123,255'},.16)`;
      g.lineWidth = pass ? widthFor(tr.depth) : widthFor(tr.depth)*5;
      g.stroke();
    }
  }
  for (const [x,y,r] of pads) {
    glow(g,x,y,14,r<.33?'rgba(255,217,138,.45)':'rgba(141,182,255,.45)');
    g.fillStyle = '#04070f';
    g.beginPath(); g.arc(x,y,3.6,0,Math.PI*2); g.fill();
    g.strokeStyle = r<.33 ? GOLD2 : r<.8 ? BLUE2 : '#fff'; g.lineWidth = 1.4; g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x,y,1.1,0,Math.PI*2); g.fill();
  }
  // Chips in the canopy.
  for (let i=0;i<9;i++) {
    const x = 660+random(i+8100)*280, y = 250+random(i+8200)*170, s = 8+random(i+8300)*10;
    g.fillStyle = 'rgba(5,9,20,.9)'; g.fillRect(x-s,y-s*.6,s*2,s*1.2);
    g.strokeStyle = 'rgba(255,217,138,.7)'; g.lineWidth = 1; g.strokeRect(x-s,y-s*.6,s*2,s*1.2);
  }

  // Data fragments carried off to the right, echoing scattering leaves.
  for (let i=0;i<340;i++) {
    const u = random(i*4+9000);
    const x = 900+u**.8*680, y = 140+random(i*4+9001)*360+(u*120-60)*random(i*4+9002);
    const s = (1.2+random(i*4+9003)**3*5.5)*(1.2-u*.6);
    g.save(); g.translate(x,y); g.rotate(i%3 ? Math.PI/4 : 0);
    g.fillStyle = `rgba(${tints[i%4]},${.25+(1-u)*.6})`;
    g.fillRect(-s/2,-s/2,s,s);
    g.restore();
  }
}
function glow(g,x,y,r,color) {
  const gr = g.createRadialGradient(x,y,0,x,y,r);
  gr.addColorStop(0,color); gr.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(x-r,y-r,r*2,r*2);
}
function buildScene(pixelWidth) {
  const width = Math.round(Math.min(4096,Math.max(800,pixelWidth)));
  if (scene && Math.abs(scene.width-width)/width < .2) return;
  const c = document.createElement('canvas');
  c.width = width; c.height = Math.round(width/treeAspect);
  const g = c.getContext('2d');
  g.scale(width/1600,width/1600);
  pulses.length = 0;
  paintScene(g);
  scene = c;
}

// ---------------------------------------------------------------------------
// Monitor plate, drawn as vectors in 1536 × 1024 plate units so it stays sharp
// at every zoom level. The HUD boots up as the camera pulls back.
// ---------------------------------------------------------------------------
function drawPlate(px,py,pw,t) {
  const g = context, k = pw/1536;
  const boot = ease(t,.70,.80);
  g.save();
  g.translate(px,py); g.scale(k,k);
  const wall = g.createRadialGradient(768,440,0,768,440,900);
  wall.addColorStop(0,'#0a1638'); wall.addColorStop(.55,'#040818'); wall.addColorStop(1,'#010207');
  g.fillStyle = wall; g.fillRect(-3000,-3000,7536,7024);
  g.strokeStyle = 'rgba(141,182,255,.06)'; g.lineWidth = 1;
  g.beginPath();
  for (let x=-960;x<=2496;x+=48) { g.moveTo(x,-480); g.lineTo(x,840); }
  for (let y=-480;y<=840;y+=48) { g.moveTo(-960,y); g.lineTo(2496,y); }
  g.stroke();
  glow(g,768,456,640,'rgba(31,79,255,.55)');
  glow(g,768,170,420,'rgba(240,184,60,.10)');

  // Holographic side panels.
  g.globalAlpha = boot;
  g.font = '500 13px Consolas, monospace';
  g.textBaseline = 'top';
  const panel = (x,title) => {
    g.strokeStyle = 'rgba(141,182,255,.35)'; g.strokeRect(x,250,170,400);
    g.fillStyle = 'rgba(8,16,40,.5)'; g.fillRect(x,250,170,400);
    g.fillStyle = GOLD; g.fillRect(x,250,170,3);
    g.fillStyle = GOLD2; g.fillText(title,x+14,266);
  };
  panel(60,'NAV / 01');
  for (let i=0;i<9;i++) {
    const v = (.25+random(i+500)*.75)*ease(t,.71+i*.01,.77+i*.01);
    g.fillStyle = i%3 ? 'rgba(141,182,255,.75)' : GOLD;
    g.fillRect(76+i*16,600-v*230,10,v*230);
  }
  g.fillStyle = 'rgba(244,246,255,.7)';
  g.fillText('SYS  ONLINE',74,300); g.fillText('PWR  '+String(Math.round(boot*100)).padStart(3,'0')+'%',74,320);
  panel(1306,'TRK / 02');
  g.lineWidth = 3; g.strokeStyle = 'rgba(141,182,255,.25)';
  g.beginPath(); g.arc(1391,400,52,0,Math.PI*2); g.stroke();
  g.strokeStyle = GOLD; g.beginPath(); g.arc(1391,400,52,-Math.PI/2,-Math.PI/2+boot*Math.PI*1.8); g.stroke();
  g.lineWidth = 1;
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(Math.round(boot*90)+'°N',1391,393); g.textAlign = 'left';
  g.fillStyle = 'rgba(244,246,255,.7)';
  g.fillText('HEADING 000°',1320,490); g.fillText('TARGET  α UMi',1320,512); g.fillText('LOCK    '+(boot>.95?'■ OK':'···'),1320,534);
  g.globalAlpha = 1;

  // Desk, reflection and LED edge.
  const desk = g.createLinearGradient(0,840,0,1024);
  desk.addColorStop(0,'#070b17'); desk.addColorStop(1,'#010206');
  g.fillStyle = desk; g.fillRect(-3000,840,7536,3000);
  glow(g,768,860,520,'rgba(61,123,255,.22)');
  const edge = g.createLinearGradient(0,0,1536,0);
  edge.addColorStop(0,'rgba(61,123,255,0)'); edge.addColorStop(.3,BLUE2); edge.addColorStop(.5,GOLD2); edge.addColorStop(.7,BLUE2); edge.addColorStop(1,'rgba(61,123,255,0)');
  g.fillStyle = edge; g.fillRect(0,839,1536,2);

  // Stand and base.
  g.fillStyle = '#0b0f1c';
  g.beginPath(); g.moveTo(732,724); g.lineTo(804,724); g.lineTo(792,862); g.lineTo(744,862); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,217,138,.55)'; g.beginPath(); g.moveTo(732,724); g.lineTo(744,862); g.stroke();
  g.fillStyle = '#0d1222';
  g.beginPath(); g.moveTo(636,862); g.lineTo(900,862); g.lineTo(924,880); g.lineTo(612,880); g.closePath(); g.fill();
  g.fillStyle = GOLD; g.fillRect(636,861,264,1.2);

  // Keyboard with underglow.
  glow(g,768,940,300,'rgba(61,123,255,.2)');
  g.fillStyle = '#080b15'; g.fillRect(500,900,536,52);
  g.strokeStyle = 'rgba(141,182,255,.35)'; g.strokeRect(500.5,900.5,535,51);
  g.strokeStyle = 'rgba(141,182,255,.12)';
  g.beginPath();
  for (let r=1;r<4;r++) { g.moveTo(506,900+r*13); g.lineTo(1030,900+r*13); }
  for (let c=1;c<33;c++) { g.moveTo(500+c*16.25,904); g.lineTo(500+c*16.25,948); }
  g.stroke();
  g.fillStyle = 'rgba(255,217,138,.6)'; g.fillRect(690,940,156,2);

  // Monitor bezel with gold hairline, corner brackets and badge.
  g.fillStyle = '#05070d'; g.fillRect(272,188,994,536);
  g.strokeStyle = 'rgba(255,217,138,.55)'; g.lineWidth = 1.5; g.strokeRect(272.5,188.5,993,535);
  g.fillStyle = '#000'; g.fillRect(286,202,965,508);
  g.strokeStyle = GOLD; g.lineWidth = 3;
  for (const [x,y,sx,sy] of [[258,174,1,1],[1280,174,-1,1],[258,738,1,-1],[1280,738,-1,-1]]) {
    g.beginPath(); g.moveTo(x,y+sy*44); g.lineTo(x,y); g.lineTo(x+sx*44,y); g.stroke();
  }
  g.lineWidth = 1;
  g.fillStyle = 'rgba(255,217,138,.8)'; g.font = '500 9px Consolas, monospace'; g.textAlign = 'center';
  g.fillText('PØLÆRIS',768,713); g.textAlign = 'left';
  g.fillStyle = BLUE2; g.beginPath(); g.arc(1244,717,2.4,0,Math.PI*2); g.fill();
  g.restore();
}
// The screen opening in the photographic plate, in source-image fractions.
const glass = { left: 286/1536, top: 202/1024, right: 1251/1536, bottom: 710/1024 };
let w = 0, h = 0, frame = 0, position = 0, previousTime = 0;

function rect(x,y,width,height,color) {
  context.fillStyle = color;
  context.fillRect(x,y,width,height);
}

function bloom(x, y, radius, color, opacity) {
  if (radius < .1 || opacity <= 0) return;
  context.save();
  context.globalAlpha *= opacity;
  const g = context.createRadialGradient(x,y,0,x,y,radius);
  g.addColorStop(0,color);
  g.addColorStop(.07,color);
  g.addColorStop(.60,'transparent');
  g.addColorStop(1,'transparent');
  rect(x-radius,y-radius,radius*2,radius*2,g);
  context.restore();
}

function line(points, color, visible = 1) {
  const lengths = points.slice(1).map(([x,y],i) => Math.hypot(x-points[i][0],y-points[i][1]));
  let remaining = lengths.reduce((sum,length) => sum + length,0) * visible;
  context.beginPath();
  context.moveTo(...points[0]);
  lengths.forEach((length,i) => {
    if (remaining <= 0 || length === 0) return;
    const t = Math.min(1,remaining/length);
    context.lineTo(mix(points[i][0],points[i+1][0],t),mix(points[i][1],points[i+1][1],t));
    remaining -= length;
  });
  context.strokeStyle = color;
  context.stroke();
}

const leaves = Array.from({ length: 48 }, (_, i) => ({
  x: .428 + random(i*8+610)*.18,
  y: .265 + random(i*8+611)*.225,
  release: .012 + random(i*8+612)*.13,
  size: .0025 + random(i*8+613)**2*.008,
  depth: .45 + random(i*8+614)*.75,
  drift: random(i*8+615)-.27,
  phase: random(i*8+616)*Math.PI*2,
  color: [GOLD2,BLUE2,'#ffffff',GOLD][i%4]
}));

function opening(t) {
  if (!scene) return;
  const gaze = ease(t,.016,.30);
  const darkness = ease(t,.024,.357);
  const width = Math.max(w,h*treeAspect)*(1+gaze*.11);
  const height = width/treeAspect;
  const imageX = (w-width)/2;
  const imageY = (h-height)/2 + h*.048*gaze;
  // Composite the plate once. Subpixel overlaps between individually alpha-blended
  // scanlines caused the horizontal bands in the former renderer.
  context.drawImage(scene,imageX,imageY,width,height);
  const drawnWidth = width;
  const drawnHeight = height;
  const unit = width/1600;

  // Power pulses race up the circuit tree as the scroll advances.
  context.save();
  context.lineCap = 'round';
  pulses.forEach((chain,i) => {
    const head = (t*7.5 + i*.37) % 1.25;
    const lengths = chain.slice(1).map(([x,y],k) => Math.hypot(x-chain[k][0],y-chain[k][1]));
    const total = lengths.reduce((a,b) => a+b,0);
    let at = head*total, before = 0;
    for (let k=0;k<lengths.length;k++) {
      if (at <= before+lengths[k]) {
        const f = (at-before)/lengths[k];
        const [ax,ay] = chain[k], [bx,by] = chain[k+1];
        const x = imageX+mix(ax,bx,f)*unit, y = imageY+mix(ay,by,f)*unit;
        const tx = imageX+mix(ax,bx,Math.max(0,f-36/lengths[k]))*unit, ty = imageY+mix(ay,by,Math.max(0,f-36/lengths[k]))*unit;
        const g = context.createLinearGradient(tx,ty,x,y);
        g.addColorStop(0,'rgba(255,217,138,0)'); g.addColorStop(1,'#fff');
        context.strokeStyle = g; context.lineWidth = Math.max(1.2,2.4*unit);
        context.beginPath(); context.moveTo(tx,ty); context.lineTo(x,y); context.stroke();
        bloom(x,y,Math.max(10,26*unit),i%2 ? GOLD2 : BLUE2,.8);
        break;
      }
      before += lengths[k];
    }
  });
  context.restore();
  rect(0,0,w,h,`rgba(0,0,0,${darkness})`);
  if (darkness > 0 && darkness < 1) {
    rect(0,0,w,h,`rgba(4,12,40,${Math.sin(darkness*Math.PI)*.22})`);
  }

  for (const leaf of leaves) {
    const age = range(t,leaf.release,leaf.release+.23);
    if (age === 0 || age === 1) continue;
    const flutter = age*13 + leaf.phase;
    const x = imageX + drawnWidth*leaf.x + w*(age*leaf.drift*.28 + Math.sin(flutter)*age*.03);
    const y = imageY + drawnHeight*leaf.y + h*(gaze*.075+age**1.6*.76*leaf.depth);
    const size = Math.max(1.25,Math.min(w,h)*leaf.size*leaf.depth);
    context.save();
    context.globalAlpha = (1-darkness)*ease(age,0,.10)*(1-ease(age,.80,1))*.85;
    context.translate(x,y);
    context.rotate(flutter*.62);
    context.scale(.2+.8*Math.abs(Math.cos(flutter)),1);
    context.fillStyle = leaf.color;
    context.fillRect(-size*.7,-size*.7,size*1.4,size*1.4);
    context.strokeStyle = leaf.color;
    context.globalAlpha *= .35;
    context.strokeRect(-size*1.3,-size*1.3,size*2.6,size*2.6);
    context.restore();
  }
}
function viewport(t) {
  if (t <= .694) return { x: 0, y: 0, width: w, height: h };
  const pull = ease(t,.694,.791);
  const plateRatio = plateAspect;
  const innerWidth = glass.right-glass.left;
  const innerHeight = glass.bottom-glass.top;
  const fit = Math.min(w/(plateRatio*.92),h);
  const fitWidth = fit * plateRatio;
  const finalX = (w-fitWidth)/2;
  const finalY = (h-fit)/2;
  const startHeight = Math.max(w/(plateRatio*innerWidth),h/innerHeight) * 1.01;
  const plateHeight = startHeight * (fit/startHeight) ** pull;
  const plateWidth = plateHeight * plateRatio;
  const centerX = mix(w/2,finalX+(glass.left+glass.right)*fitWidth/2,pull);
  const centerY = mix(h/2,finalY+(glass.top+glass.bottom)*fit/2,pull);
  const plateX = centerX - (glass.left+glass.right)*plateWidth/2;
  const plateY = centerY - (glass.top+glass.bottom)*plateHeight/2;
  drawPlate(plateX,plateY,plateWidth,t);
  // Expand the star field to the viewport before the first bezel pixel enters.
  const blend = ease(t,.694,.714);
  const width = mix(w,plateWidth*innerWidth,blend);
  const height = mix(h,plateHeight*innerHeight,blend);
  return { x: centerX-width/2, y: centerY-height/2, width, height };
}

function starfield(box,t,time) {
  const {x,y,width,height} = box;
  context.save();
  context.beginPath();
  context.rect(x,y,width,height);
  context.clip();
  const opacity = 1-ease(t,.884,.905);
  const reach = ease(t,.590,.690);
  if (reach > 0) {
    for (const s of stars) {
      const light = ease(reach,s.threshold*.76,s.threshold*.76+.23)*s.light*opacity;
      if (light < .015) continue;
      const ratio = Math.min(width/w,height/h);
      const px = x + width*s.x;
      const py = y + height*s.y;
      const r = Math.max(.25,s.radius * ratio);
      context.fillStyle = `rgba(${tints[s.tint]},${light})`;
      context.beginPath();
      context.arc(px,py,r,0,Math.PI*2);
      context.fill();
    }
  }
  const intensity = ease(t,.361,.425)*opacity;
  const twinkle = .91 + .06*Math.sin(time*.0027) + .03*Math.sin(time*.0062);
  const px=x+width/2, py=y+height/2;
  const radius=mix(.65,2.1,ease(t,.37,.63));
  const halo = ease(t,.37,.49)*(1-ease(t,.56,.70));
  bloom(px,py,Math.min(w,h)*.11,GOLD,intensity*halo*.14);
  bloom(px,py,radius*12,'#fff7e9',intensity*.37);
  context.fillStyle = `rgba(255,255,255,${intensity*twinkle})`;
  context.beginPath();
  context.arc(px,py,radius,0,Math.PI*2);
  context.fill();
  context.restore();
}

function telemetry(x,y,t) {
  const trace = ease(t,.795,.846);
  const text = ease(t,.838,.856);
  const opacity = 1-ease(t,.868,.883);
  if (trace <= 0 || opacity <= 0) return;
  const size = Math.min(110, w*.27);
  const elbow = Math.min(65,w*.15);
  const diagonal = Math.min(43,w*.10);
  const left = x+elbow+diagonal;
  const top = y-diagonal-14;
  context.save();
  context.globalAlpha = opacity;
  const blue = GOLD;
  line([[x+6,y],[x+elbow,y],[left,y-diagonal]],blue,trace);
  context.globalAlpha *= text;
  rect(left,top,size,28,'#060b1c');
  context.strokeStyle = blue;
  context.strokeRect(left+.5,top+.5,size-1,27);
  context.fillStyle = '#fff';
  context.font = '11px Consolas, monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('PØLÆRIS',left+size/2,top+14,size-10);
  context.restore();
}

function breach(box,x,y,t) {
  const crack = ease(t,.877,.899);
  const advance = range(t,.889,.953);
  if (crack <= 0 || advance >= 1) return;
  const flight = advance ** 2.8;
  const fade = 1 - ease(advance,.55,.95);
  const span = Math.max(w,h);
  context.save();
  context.beginPath();
  context.rect(box.x,box.y,box.width,box.height);
  context.clip();
  context.lineWidth = .64;
  for (let i=0;i<15;i++) {
    const angle = i*Math.PI*2/15 + random(i+81)*.27;
    const reach = box.width*(.10+random(i+4)*.39);
    const points = [[x,y]];
    for (let k=1;k<=6;k++) {
      const bend = angle + (random(i*9+k+900)-.5)*.18;
      points.push([x+Math.cos(bend)*reach*k/6,y+Math.sin(bend)*reach*k/6]);
    }
    line(points,`rgba(223,226,230,${fade*(.2+random(i+32)*.53)})`,crack);
    const [sx,sy] = points[2+i%3];
    line([[sx,sy],[sx+Math.cos(angle+.8)*reach*.28,sy+Math.sin(angle+.8)*reach*.28]],`rgba(255,255,255,${fade*.45})`,ease(crack,.4,1));
  }
  context.restore();
  for (const shard of splinters) {
    const distance = span * shard.speed * (advance*.09 + flight);
    const sx = x + Math.cos(shard.angle)*distance;
    const sy = y + Math.sin(shard.angle)*distance*.8;
    const r = shard.size * (.2 + flight*2.9);
    context.save();
    context.translate(sx,sy);
    context.rotate(shard.angle+advance*shard.spin);
    context.beginPath();
    context.moveTo(-r,0);
    context.lineTo(r*.45,-r*.30);
    context.lineTo(r,r*.36);
    context.closePath();
    context.fillStyle = `rgba(222,227,231,${shard.light*fade*crack*.29})`;
    context.fill();
    context.strokeStyle = `rgba(248,248,247,${shard.light*fade*crack*.8})`;
    context.lineWidth = .6;
    context.stroke();
    context.restore();
  }
  const radius = 3 + flight*span*1.8;
  bloom(x,y,radius*2.4,'#fff',.7*crack);
  bloom(x,y,radius*.72,'#fff',crack);
  const ray = Math.min(w*.47,radius*.85);
  context.globalAlpha = fade*.78*crack;
  line([[x-ray,y],[x+ray,y]],'#fff');
  line([[x,y-ray*.36],[x,y+ray*.36]],'#fff');
  context.globalAlpha = 1;
}

const motes = Array.from({length: 290}, (_,i) => ({
  angle: random(i*4+3020)*Math.PI*2,
  radius: .09+random(i*4+3021)**.65*1.1,
  depth: .5+random(i*4+3022)*2.7,
  light: .23+random(i*4+3023)*.73,
  tint: tints[i%4]
}));

function passage(p) {
  const step = range(p,.754,.978);
  const light = 1-ease(step,.035,.25);
  const dissolve = 1-ease(step,.68,.99);
  const settle = ease(step,.34,.93);
  const focal = Math.min(w,h);
  const cx = w/2 + Math.sin(step*Math.PI)*w*.045*(1-settle);
  const cy = h/2 - Math.sin(step*Math.PI)*h*.027;
  const twist = step*1.47;
  const sweep = ease(step,.03,.58);
  const density = ease(step,.04,.30)*dissolve;

  // Fly through a cloud of fragments, then let their projected paths organize
  // into an optical compass around the same point as the final team mark.
  for (const mote of motes) {
    const z = mote.depth - sweep*1.48;
    if (z < .16) continue;
    const angle = mote.angle + twist/mote.depth;
    const r = focal*mote.radius/z;
    const x = cx + Math.cos(angle)*r;
    const y = cy + Math.sin(angle)*r;
    const trail = r*(.018+sweep*.15)*(1-settle);
    if (x < -trail || x > w+trail || y < -trail || y > h+trail) continue;
    const alpha = mote.light*density*ease(z,.16,.53);
    context.strokeStyle = `rgba(${mote.tint},${alpha})`;
    context.lineWidth = Math.min(2,.38/z+.28);
    context.beginPath();
    context.moveTo(x-Math.cos(angle)*trail,y-Math.sin(angle)*trail);
    context.lineTo(x+.6,y+.3);
    context.stroke();
  }

  const reticle = ease(step,.23,.62)*(1-ease(step,.82,1));
  if (reticle > 0) {
    const r = focal*mix(.38,.127,settle);
    context.save();
    context.translate(w/2,h/2);
    context.rotate(-.55*(1-settle));
    context.lineWidth = .7;
    for (let i=0;i<4;i++) {
      const a = i*Math.PI/2;
      context.strokeStyle = `rgba(255,217,138,${reticle*.75})`;
      context.beginPath();
      context.arc(0,0,r,a+.11,a+mix(.11,1.45,reticle));
      context.stroke();
      context.strokeStyle = `rgba(141,182,255,${reticle*.45})`;
      context.beginPath();
      context.arc(0,0,r*1.18,a+.3,a+.3+reticle*.54);
      context.stroke();
    }
    for (let i=0;i<48;i++) {
      const a = i*Math.PI/24;
      const inner = r*(i%6 === 0 ? .89 : .96);
      line([[Math.cos(a)*inner,Math.sin(a)*inner],[Math.cos(a)*r,Math.sin(a)*r]],`rgba(${i%6===0?'255,217,138':'141,182,255'},${reticle*(i%6===0?.8:.35)})`);
    }
    context.restore();
  }
  bloom(cx,cy,focal*mix(.44,.09,settle),'#fff',density*.24);
  rect(0,0,w,h,`rgba(255,255,255,${light})`);
}

function draw(time) {
  frame = 0;
  const bounds = film.getBoundingClientRect();
  if (bounds.bottom <= 0) return;
  const duration = bounds.height - stage.clientHeight;
  const target = clamp(-bounds.top / Math.max(1,duration));
  // Keep scroll position authoritative while smoothing wheel/trackpad increments.
  const elapsed = previousTime ? Math.min(64,time-previousTime) : 64;
  previousTime = time;
  const delta = target-position;
  position = reduce.matches || Math.abs(delta) < .0003 || Math.abs(delta) > .22
    ? target : mix(position,target,1-Math.exp(-elapsed/42));
  const p = position;
  const t = reduce.matches ? p < .23 ? 0 : p < .47 ? .47 : .858 : p/.754*.953;
  context.lineWidth = 1;
  rect(0,0,w,h,'#000');
  if (!reduce.matches && p >= .754) {
    passage(p);
  } else if (t < .357) {
    opening(t);
  } else if (t >= .361) {
    const box = viewport(t);
    starfield(box,t,time);
    const x=box.x+box.width/2, y=box.y+box.height/2;
    telemetry(x,y,t);
    if (!reduce.matches) {
      breach(box,x,y,t);
      const flash = ease(p,.714,.751);
      rect(0,0,w,h,`rgba(255,255,255,${flash})`);
    }
  }

  const resolve = reduce.matches ? Number(p >= .75) : ease(p,.902,.986);
  if (reduce.matches && resolve) rect(0,0,w,h,'#000');
  end.style.opacity = resolve;
  end.style.transform = reduce.matches ? '' : `scale(${mix(.91,1,resolve)})`;
  if (!reduce.matches && (position !== target || (t >= .361 && t < .590))) schedule();
}
function schedule() {
  if (!frame) frame = requestAnimationFrame(draw);
}

function resize() {
  w = stage.clientWidth;
  h = stage.clientHeight;
  const ratio = Math.min(3, devicePixelRatio || 1, Math.sqrt(12000000 / Math.max(1,w*h)));
  buildScene(Math.max(w,h*treeAspect)*1.11*ratio);
  canvas.width = Math.round(w*ratio);
  canvas.height = Math.round(h*ratio);
  context.setTransform(ratio,0,0,ratio,0,0);
  schedule();
}

if (context) {
  const start = () => {
    if (!document.documentElement.classList.contains('ready')) {
      document.documentElement.classList.add('ready');
      resize();
    }
    schedule();
  };
  start();
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',resize);
  reduce.addEventListener('change',resize);
  new ResizeObserver(resize).observe(stage);
}
