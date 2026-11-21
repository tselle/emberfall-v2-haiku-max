"use strict";
/*
 * First-person view: a software raycaster on Canvas 2D. It knows nothing
 * about rules. The caller passes the camera, a cell lookup and the sprite
 * list; this module builds textures, casts columns with a DDA walk, shades
 * floors and ceilings, and projects depth-tested billboards.
 */
const View3D = (() => {
  const V = {};
  const TS = 64;                       // texture size
  const FOV = Math.PI / 3;             // 60 degrees
  const tex = {};                      // name -> Uint32Array(TS*TS)
  const svcColor = {
    inn: [0xb8, 0x3c, 0x2e], temple: [0xe8, 0xe0, 0xc4], hall: [0x33, 0x4b, 0x8c], training: [0x7a, 0x4a, 0x24],
    general: [0x3c, 0x7a, 0x3c], armory: [0x6b, 0x72, 0x7b], apothecary: [0x6a, 0x3c, 0x7a], tavern: [0xc8, 0x7a, 0x28],
  };
  let main = null;
  let mctx = null;
  let off = null;
  let octx = null;
  let zbuf = null;
  let fogRGB = [12, 13, 19];

  const pack = (r, g, b) => (255 << 24) | (Math.max(0, Math.min(255, b)) << 16) | (Math.max(0, Math.min(255, g)) << 8) | Math.max(0, Math.min(255, r));
  const hash2 = (x, y, s) => {
    let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // Procedural wall textures. Each returns a Uint32Array of TS*TS pixels.
  const makeTex = (name, fn) => {
    const a = new Uint32Array(TS * TS);
    for (let y = 0; y < TS; y++) {
      for (let x = 0; x < TS; x++) {
        const [r, g, b] = fn(x, y);
        a[y * TS + x] = pack(r, g, b);
      }
    }
    tex[name] = a;
  };
  const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const noise = (x, y, s, amp) => (hash2(x, y, s) - 0.5) * amp;

  const buildTextures = () => {
    if (tex.stone) return;
    makeTex("stone", (x, y) => {
      const row = Math.floor(y / 16);
      const off2 = (row % 2) * 16;
      const mortar = y % 16 < 2 || (x + off2) % 32 < 2;
      const base = mortar ? [44, 40, 36] : [110 + noise(x, y, 1, 30), 104 + noise(x, y, 2, 28), 96 + noise(x, y, 3, 26)];
      return base;
    });
    makeTex("brick", (x, y) => {
      const row = Math.floor(y / 8);
      const off2 = (row % 2) * 8;
      const mortar = y % 8 < 1 || (x + off2) % 16 < 1;
      return mortar ? [90, 82, 74] : [150 + noise(x, y, 4, 40), 70 + noise(x, y, 5, 18), 52 + noise(x, y, 6, 14)];
    });
    makeTex("timber", (x, y) => {
      const plank = Math.floor(x / 8);
      const seam = x % 8 === 0;
      const grain = Math.sin(y * 0.6 + plank * 1.7) * 10;
      if (seam) return [48, 32, 20];
      return [138 + grain + noise(x, y, 7, 14), 98 + grain * 0.7, 56 + grain * 0.4];
    });
    makeTex("crypt", (x, y) => {
      const block = (Math.floor(y / 21) + Math.floor(x / 21)) % 2;
      const crack = hash2(x, y, 9) > 0.985;
      if (crack) return [20, 20, 22];
      return [70 + block * 8 + noise(x, y, 8, 18), 72 + block * 6 + noise(x, y, 10, 16), 80 + noise(x, y, 11, 18)];
    });
    makeTex("mine", (x, y) => {
      const beam = x % 32 < 4 || y % 32 < 3;
      if (beam) return [88, 62, 36];
      return [76 + noise(x, y, 12, 40), 66 + noise(x, y, 13, 34), 58 + noise(x, y, 14, 30)];
    });
    makeTex("keep", (x, y) => {
      const row = Math.floor(y / 32);
      const joint = y % 32 < 2 || (x + (row % 2) * 32) % 64 < 2;
      return joint ? [60, 60, 66] : [120 + noise(x, y, 15, 24), 118 + noise(x, y, 16, 22), 124 + noise(x, y, 17, 22)];
    });
    makeTex("cave", (x, y) => {
      const n = hash2(x >> 1, y >> 1, 18);
      return [96 + n * 48, 84 + n * 40, 74 + n * 34];
    });
    makeTex("door", (x, y) => {
      const plank = Math.floor(x / 8);
      const seam = x % 8 === 0;
      const band = x > 10 && x < 54 && (y === 14 || y === 46);
      const iron = (x === 6 || x === 56) && y > 4 && y < 58;
      if (band || iron) return [62, 62, 66];
      if (seam) return [40, 26, 14];
      const g = Math.sin(y * 0.5 + plank) * 8;
      return [124 + g, 82 + g * 0.6, 44 + g * 0.3];
    });
    makeTex("lock", (x, y) => {
      const bars = x % 10 < 2 && y > 6 && y < 58;
      const plate = x > 8 && x < 56 && y > 8 && y < 56;
      if (bars) return [50, 50, 55];
      if (plate) return [96 + noise(x, y, 19, 14), 96, 104];
      return [28, 26, 30];
    });
    makeTex("gate", (x, y) => {
      const bar = x % 8 < 2 || y % 10 < 2;
      if (bar) return [40, 40, 44];
      return [22, 20, 24];
    });
    makeTex("facade", (x, y) => {
      // Wood with an awning band at the top; the colour is set per service in facadeFor().
      const plank = Math.floor(x / 8);
      const seam = x % 8 === 0;
      if (y < 12) return [120, 90, 60];
      if (seam) return [40, 26, 14];
      const g = Math.sin(y * 0.5 + plank) * 6;
      return [110 + g, 74 + g * 0.6, 40 + g * 0.3];
    });
    makeTex("bush", (x, y) => [40 + noise(x, y, 20, 20), 90 + noise(x, y, 21, 30), 40 + noise(x, y, 22, 16)]);
    // Facade variants: a coloured awning stripe per service kind.
    for (const k of Object.keys(svcColor)) {
      const col = svcColor[k];
      const name = "svc_" + k;
      makeTex(name, (x, y) => {
        if (y < 16) {
          const stripe = Math.floor(x / 8) % 2;
          return stripe ? [col[0], col[1], col[2]] : [col[0] * 0.6 + 40, col[1] * 0.6 + 30, col[2] * 0.6 + 30];
        }
        const plank = Math.floor(x / 8);
        const seam = x % 8 === 0;
        if (seam) return [40, 26, 14];
        const g = Math.sin(y * 0.5 + plank) * 6;
        return [116 + g, 80 + g * 0.6, 44 + g * 0.3];
      });
    }
  };

  // Chooses a wall texture for a cell character on a given map.
  const wallName = (ch, map) => {
    if (ch === "#" || ch === "S") return map && map.wall ? wallKey(map.wall) : "stone";
    if (ch === "H") return "timber";
    if (ch === "B") return "brick";
    if (ch === "D") return "door";
    if (ch === "L") return "lock";
    if (ch === "G") return "gate";
    if (ch >= "1" && ch <= "9") {
      const svc = map && map.svc && map.svc[ch] ? map.svc[ch].svc : "hall";
      return "svc_" + (svcColor[svc] ? svc : "hall");
    }
    return "stone";
  };
  const wallKey = (w) => (w === "timber" || w === "brick" || w === "crypt" || w === "mine" || w === "keep" || w === "cave" ? w : "stone");

  const isWallish = (c) => c === "#" || c === "H" || c === "B" || c === "S" || c === "D" || c === "L" || c === "G" || (c >= "1" && c <= "9");

  // Floor colours by floor tag and cell char.
  const floorColor = (ch, map, cx, cy) => {
    const n = hash2(cx, cy, 31) - 0.5;
    if (ch === "," || (map && map.outdoor && ch !== "." && ch !== "<" && ch !== ">")) {
      return [50 + n * 18, 96 + n * 26, 46 + n * 14];
    }
    if (map && map.floor === "flags") return [84 + n * 22, 78 + n * 20, 70 + n * 18];
    if (map && map.floor === "dirt") return [104 + n * 22, 84 + n * 18, 60 + n * 14];
    return [94 + n * 20, 90 + n * 18, 88 + n * 16];
  };

  // Draws the framebuffer for one view. state = {px,py,ang,cellAt,map,sprites,outdoorSky,night,quality}
  V.init = (canvas) => {
    main = canvas;
    mctx = main.getContext("2d");
    off = document.createElement("canvas");
    octx = off.getContext("2d");
    buildTextures();
    return V;
  };

  // Overlay sprite textures (small canvases) for props.
  const propCache = {};
  const prop = (kind) => {
    if (propCache[kind]) return propCache[kind];
    const c = document.createElement("canvas");
    c.width = 96;
    c.height = 96;
    const g = c.getContext("2d");
    if (kind === "chest") {
      g.fillStyle = "#6b4a2b";
      g.fillRect(14, 48, 68, 36);
      g.fillStyle = "#4a3320";
      g.fillRect(14, 40, 68, 10);
      g.fillStyle = "#e3b54a";
      g.fillRect(44, 56, 8, 10);
    } else if (kind === "loot") {
      g.fillStyle = "#c8a46a";
      g.beginPath();
      g.ellipse(48, 66, 26, 20, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#8a6038";
      g.fillRect(40, 40, 16, 12);
    } else if (kind === "stairs") {
      g.fillStyle = "#2b2b33";
      for (let i = 0; i < 6; i++) g.fillRect(10 + i * 12, 90 - i * 10, 12, 10);
      g.fillStyle = "#e3b54a";
      g.fillRect(40, 10, 4, 30);
    } else if (kind === "tree") {
      g.fillStyle = "#4a3320";
      g.fillRect(44, 56, 8, 36);
      g.fillStyle = "#2f6b3a";
      g.beginPath();
      g.arc(48, 44, 34, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#3f8a4a";
      g.beginPath();
      g.arc(40, 36, 16, 0, Math.PI * 2);
      g.fill();
    } else if (kind === "fountain") {
      g.fillStyle = "#6b6f78";
      g.beginPath();
      g.ellipse(48, 74, 38, 14, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#9bd0ff";
      g.beginPath();
      g.ellipse(48, 70, 30, 9, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#8a8f98";
      g.fillRect(44, 36, 8, 34);
      g.beginPath();
      g.arc(48, 34, 12, 0, Math.PI * 2);
      g.fill();
    } else if (kind === "trap") {
      g.strokeStyle = "#e05a4a";
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(24, 24);
      g.lineTo(72, 72);
      g.moveTo(72, 24);
      g.lineTo(24, 72);
      g.stroke();
    }
    propCache[kind] = c;
    return c;
  };

  // Projects and draws billboards after the walls. zbuf holds the wall depth per column.
  const drawSprites = (st, W, H, camPlane) => {
    const { px, py, dx, dy, plx, ply } = camPlane;
    const list = (st.sprites || []).slice();
    const invDet = 1 / (plx * dy - dx * ply);
    const scored = [];
    for (const s of list) {
      const sx = s.x + 0.5 - px;
      const sy = s.y + 0.5 - py;
      const tY = invDet * (-ply * sx + plx * sy);
      const tX = invDet * (dy * sx - dx * sy);
      if (tY <= 0.2 || tY > 22) continue;
      scored.push({ s, tX, tY });
    }
    scored.sort((a, b) => b.tY - a.tY);
    for (const { s, tX, tY } of scored) {
      const img = s.img || prop(s.prop || "loot");
      const hgt = Math.abs(H / tY) * (s.scale || 0.8);
      const wdt = hgt * (img.width / img.height);
      const sxScreen = (W / 2) * (1 + tX / tY);
      const top = H / 2 - hgt / 2 + (s.lift || 0) * (H / tY);
      const drawStart = Math.floor(sxScreen - wdt / 2);
      const drawEnd = Math.floor(sxScreen + wdt / 2);
      octx.save();
      if (s.alpha !== undefined) octx.globalAlpha = s.alpha;
      const sw = img.width / Math.max(1, drawEnd - drawStart);
      for (let stripe = Math.max(0, drawStart); stripe < Math.min(W, drawEnd); stripe++) {
        if (tY >= zbuf[stripe]) continue;
        const srcX = (stripe - drawStart) * sw;
        octx.drawImage(img, srcX, 0, Math.max(1, sw), img.height, stripe, top, 1, hgt);
      }
      octx.restore();
    }
  };

  // Render the view. Returns nothing; draws onto the main canvas.
  V.render = (st) => {
    if (!main) return;
    buildTextures();
    const map = st.map || {};
    const cssW = main.clientWidth || 640;
    const cssH = main.clientHeight || 400;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const q = st.quality || 1;
    // Fit the internal framebuffer to the stage at 1280x800 nominal, capped.
    let W = Math.max(160, Math.round(Math.min(1280, cssW * dpr) * q));
    let H = Math.max(120, Math.round(Math.min(800, cssH * dpr) * q));
    if (main.width !== Math.round(cssW * dpr) || main.height !== Math.round(cssH * dpr)) {
      main.width = Math.round(cssW * dpr);
      main.height = Math.round(cssH * dpr);
    }
    if (off.width !== W || off.height !== H) {
      off.width = W;
      off.height = H;
    }
    const img = octx.createImageData(W, H);
    const buf = new Uint32Array(img.data.buffer);
    zbuf = new Float32Array(W);
    const ang = st.ang;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const plen = Math.tan(FOV / 2);
    const plx = -dy * plen, ply = dx * plen;
    const px = st.px, py = st.py;
    const cellAt = st.cellAt;
    const outdoor = !!map.outdoor;
    const night = !!st.night;
    const fogK = night ? 0.22 : 0.14;
    const fogC = night ? [6, 7, 14] : outdoor ? [40, 36, 46] : [10, 10, 14];
    // Sky and ceiling (upper half), gradient rows.
    const horizon = H / 2;
    for (let y = 0; y < H; y++) {
      if (y < horizon) {
        const t = y / horizon;
        let r, g, b;
        if (outdoor) {
          r = night ? 6 + t * 10 : 40 + t * 120;
          g = night ? 8 + t * 10 : 60 + t * 80;
          b = night ? 22 + t * 20 : 110 + t * 20 - t * 60;
        } else {
          const cc = map.ceil === "vault" ? [22, 20, 26] : [26, 24, 22];
          r = cc[0] + t * 6; g = cc[1] + t * 6; b = cc[2] + t * 6;
        }
        const col = pack(r, g, b);
        for (let x = 0; x < W; x++) buf[y * W + x] = col;
        if (outdoor && night && y < horizon * 0.7) {
          for (let s = 0; s < 6; s++) {
            const sx = Math.floor(hash2(s, y, 77) * W);
            if (hash2(sx, y, 3) > 0.995) buf[y * W + sx] = pack(220, 220, 255);
          }
        }
      } else {
        // Floor: perspective floor casting.
        const rowDist = (H * 0.5) / (y - horizon + 0.0001);
        const fx0 = px + rowDist * (dx - plx), fy0 = py + rowDist * (dy - ply);
        const fx1 = px + rowDist * (dx + plx), fy1 = py + rowDist * (dy + ply);
        const stepX = (fx1 - fx0) / W, stepY = (fy1 - fy0) / W;
        let fxp = fx0, fyp = fy0;
        const fogF = Math.min(1, rowDist * fogK);
        for (let x = 0; x < W; x++) {
          const cx = Math.floor(fxp), cy = Math.floor(fyp);
          const ch = cellAt(cx, cy);
          let c = floorColor(ch, map, cx, cy);
          const check = ((cx + cy) & 1) ? 0.94 : 1;
          let r = c[0] * check, g = c[1] * check, b = c[2] * check;
          const shadeF = 1 - fogF;
          r = r * shadeF + fogC[0] * fogF;
          g = g * shadeF + fogC[1] * fogF;
          b = b * shadeF + fogC[2] * fogF;
          buf[y * W + x] = pack(r, g, b);
          fxp += stepX;
          fyp += stepY;
        }
      }
    }
    // Walls.
    for (let x = 0; x < W; x++) {
      const cam = 2 * x / W - 1;
      const rdx = dx + plx * cam, rdy = dy + ply * cam;
      let mapX = Math.floor(px), mapY = Math.floor(py);
      const ddX = rdx === 0 ? 1e30 : Math.abs(1 / rdx);
      const ddY = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
      let stepX, stepY, sideX, sideY;
      if (rdx < 0) { stepX = -1; sideX = (px - mapX) * ddX; } else { stepX = 1; sideX = (mapX + 1 - px) * ddX; }
      if (rdy < 0) { stepY = -1; sideY = (py - mapY) * ddY; } else { stepY = 1; sideY = (mapY + 1 - py) * ddY; }
      let hit = null, side = 0, guard = 0;
      while (!hit && guard++ < 96) {
        if (sideX < sideY) { sideX += ddX; mapX += stepX; side = 0; } else { sideY += ddY; mapY += stepY; side = 1; }
        const c = cellAt(mapX, mapY);
        if (isWallish(c)) hit = c;
      }
      if (!hit) { zbuf[x] = 1e9; continue; }
      const dist = side === 0 ? (mapX - px + (1 - stepX) / 2) / rdx : (mapY - py + (1 - stepY) / 2) / rdy;
      const d = Math.max(0.05, dist);
      zbuf[x] = d;
      const lineH = Math.floor(H / d);
      const top = Math.max(0, Math.floor(-lineH / 2 + H / 2));
      const bot = Math.min(H - 1, Math.floor(lineH / 2 + H / 2));
      let wallX = side === 0 ? py + dist * rdy : px + dist * rdx;
      wallX -= Math.floor(wallX);
      let tx = Math.floor(wallX * TS);
      if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) tx = TS - tx - 1;
      const T = tex[wallName(hit, map)] || tex.stone;
      const fogF = Math.min(1, d * fogK);
      const sideK = side === 1 ? 0.72 : 1;
      const dark = (1 - fogF) * sideK;
      for (let y = top; y <= bot; y++) {
        const ty = Math.min(TS - 1, Math.max(0, Math.floor(((y - (-lineH / 2 + H / 2)) / lineH) * TS)));
        const sample = T[ty * TS + tx];
        const sr = sample & 255, sg = (sample >>> 8) & 255, sb = (sample >>> 16) & 255;
        const r = sr * dark + fogC[0] * fogF, g = sg * dark + fogC[1] * fogF, b = sb * dark + fogC[2] * fogF;
        buf[y * W + x] = pack(r, g, b);
      }
    }
    octx.putImageData(img, 0, 0);
    // Billboards.
    const sprites = st.sprites || [];
    if (sprites.length) drawSprites({ sprites }, W, H, { px, py, dx, dy, plx, ply });
    mctx.imageSmoothingEnabled = true;
    mctx.drawImage(off, 0, 0, main.width, main.height);
  };

  // Projection helper for the game: a billboard image for a figure or prop.
  V.propImage = (kind) => prop(kind);
  V.facadeFor = (svc) => (svcColor[svc] ? "svc_" + svc : "svc_hall");
  V.dirVec = (dir) => [[0, -1], [1, 0], [0, 1], [-1, 0]][((dir % 4) + 4) % 4];

  return V;
})();
