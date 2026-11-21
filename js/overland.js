"use strict";
/*
 * Wilderness travel: a painted top-down region with a camera, one tile per
 * mile, terrain-timed steps, visibility by day and night, encounter rolls,
 * travellers, and sites. Shares the battle, shop and loot systems with
 * first-person play through Game and Combat.
 */
const Over = (() => {
  const O = {};
  const TILE = 40;                       // on-screen tile size (CSS px at 1x)
  const COST = { ".": 1, ",": 1, "=": 0.5, "+": 0.5, T: 2, n: 2, "%": 3 };
  const BASE = { ".": 0.05, ",": 0.05, "=": 0.035, "+": 0.035, T: 0.08, n: 0.07, "%": 0.09 };
  const DIRS = { 0: [0, -1], 1: [1, -1], 2: [1, 0], 3: [1, 1], 4: [0, 1], 5: [-1, 1], 6: [-1, 0], 7: [-1, -1] };
  let canvas = null;
  let ctx = null;
  let paintedFor = null;
  let painted = null;
  let anim = null;

  O.init = (c) => {
    canvas = c;
    ctx = canvas.getContext("2d");
    canvas.addEventListener("click", (e) => O.tap(e));
    return O;
  };

  // Walkable terrain: mountains and rivers are impassable; bridges and sites are fine.
  const passable = (ch) => ch !== "^" && ch !== "~";
  const isSiteChar = (map, ch) => !!(map.sites && map.sites[ch]);

  // Paint the whole region once on entry (only the active region is ever held).
  const paintRegion = (map) => {
    const H = map.grid.length, W = map.grid[0].length;
    const c = document.createElement("canvas");
    c.width = W * TILE;
    c.height = H * TILE;
    const g = c.getContext("2d");
    const col = map.colors || {};
    const rnd = (x, y, s) => {
      let h = (x * 374761393 + y * 668265263 + s * 1274126177) | 0;
      h = (h ^ (h >>> 13)) * 1274126177;
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = map.grid[y][x];
      const px = x * TILE, py = y * TILE;
      let base = "#5e8b4f";
      if (ch === "^") base = col.mountain || "#4a4f58";
      else if (ch === "~") base = col.water || "#23436b";
      else if (ch === "=" || ch === "+") base = col.road || "#9b8a62";
      else if (ch === "T") base = "#2f5e36";
      else if (ch === "n") base = "#7f8a5a";
      else if (ch === "%") base = "#4d5b3d";
      g.fillStyle = base;
      g.fillRect(px, py, TILE, TILE);
      if (ch === "." || ch === ",") {
        g.fillStyle = "rgba(20,50,20,0.25)";
        for (let i = 0; i < 4; i++) g.fillRect(px + rnd(x, y, i) * TILE, py + rnd(x, y, i + 9) * TILE, 2, 2);
      } else if (ch === "T") {
        g.fillStyle = "#1e4a28";
        g.beginPath();
        g.arc(px + TILE / 2, py + TILE / 2, TILE * 0.36, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#3f7a46";
        g.beginPath();
        g.arc(px + TILE / 2 - 4, py + TILE / 2 - 4, TILE * 0.2, 0, Math.PI * 2);
        g.fill();
      } else if (ch === "n") {
        g.fillStyle = "#6e7a4c";
        g.beginPath();
        g.ellipse(px + TILE / 2, py + TILE * 0.62, TILE * 0.42, TILE * 0.22, 0, 0, Math.PI * 2);
        g.fill();
      } else if (ch === "^") {
        g.fillStyle = "#6a707a";
        g.beginPath();
        g.moveTo(px + 2, py + TILE - 2);
        g.lineTo(px + TILE / 2, py + 4);
        g.lineTo(px + TILE - 2, py + TILE - 2);
        g.closePath();
        g.fill();
        g.fillStyle = "#c9ced6";
        g.beginPath();
        g.moveTo(px + TILE / 2 - 5, py + 12);
        g.lineTo(px + TILE / 2, py + 4);
        g.lineTo(px + TILE / 2 + 5, py + 12);
        g.closePath();
        g.fill();
      } else if (ch === "~") {
        g.strokeStyle = "#5c8fc4";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(px, py + TILE * 0.4);
        g.quadraticCurveTo(px + TILE / 2, py + TILE * 0.2, px + TILE, py + TILE * 0.4);
        g.stroke();
      } else if (ch === "%") {
        g.strokeStyle = "#8aa06a";
        g.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.moveTo(px + 8 + i * 10, py + TILE - 6);
          g.lineTo(px + 10 + i * 10, py + 8);
          g.stroke();
        }
      } else if (ch === "+") {
        g.fillStyle = "#6e4f2c";
        g.fillRect(px + 4, py, TILE - 8, TILE);
        g.strokeStyle = "#3e2a16";
        for (let i = 1; i < 5; i++) {
          g.beginPath();
          g.moveTo(px + 4, py + i * TILE / 5);
          g.lineTo(px + TILE - 4, py + i * TILE / 5);
          g.stroke();
        }
      } else if (ch === "=") {
        g.fillStyle = "#b09c6e";
        g.fillRect(px, py + TILE * 0.36, TILE, TILE * 0.28);
      }
      if (isSiteChar(map, ch)) {
        g.fillStyle = "rgba(10,10,14,0.55)";
        g.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
        g.fillStyle = "#e3b54a";
        g.font = "bold " + Math.floor(TILE * 0.5) + "px Georgia, serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(ch, px + TILE / 2, py + TILE / 2);
      }
    }
    return c;
  };

  O.enter = (mapId, x, y, dir) => {
    const map = Data.MAPS[mapId];
    if (paintedFor !== mapId) {
      painted = paintRegion(map);
      paintedFor = mapId;
    }
    // A fresh region: start knowing the roads and the ground near home.
    const W = map.grid[0].length, H = map.grid.length;
    if (!Game.G.seen[mapId]) {
      Game.seenMask(mapId, W, H);
      for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
        const ch = map.grid[yy][xx];
        const near = Math.hypot(xx - x, yy - y) <= 6;
        if (ch === "=" || ch === "+" || near) Game.setSeen(mapId, W, H, xx, yy);
      }
    }
    Game.G.x = x;
    Game.G.y = y;
    Game.G.dir = dir;
    O.revealHere();
    O.describe();
    UI.setMode("wild");
    O.render();
  };

  // Visibility radius: 4.2 by day or 2.2 by night; +2 on hills, -1.2 in woods and fen.
  O.radius = () => {
    const map = Data.MAPS[Game.G.map];
    const night = Game.isNight(Game.G.time);
    let r = night ? 2.2 : 4.2;
    const ch = Game.cellAt(map.id, Game.G.x, Game.G.y);
    if (ch === "n") r += 2;
    if (ch === "T" || ch === "%") r -= 1.2;
    return r;
  };
  O.revealHere = () => {
    const map = Data.MAPS[Game.G.map];
    const W = map.grid[0].length, H = map.grid.length;
    const r = O.radius();
    const R = Math.ceil(r);
    for (let yy = Game.G.y - R; yy <= Game.G.y + R; yy++) for (let xx = Game.G.x - R; xx <= Game.G.x + R; xx++) {
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      if (Math.hypot(xx - Game.G.x, yy - Game.G.y) <= r) Game.setSeen(map.id, W, H, xx, yy);
    }
  };
  O.visibleSet = () => {
    const map = Data.MAPS[Game.G.map];
    const W = map.grid[0].length, H = map.grid.length;
    const r = O.radius();
    const out = new Set();
    const R = Math.ceil(r);
    for (let yy = Game.G.y - R; yy <= Game.G.y + R; yy++) for (let xx = Game.G.x - R; xx <= Game.G.x + R; xx++) {
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      if (Math.hypot(xx - Game.G.x, yy - Game.G.y) <= r) out.add(yy * W + xx);
    }
    return out;
  };

  // Moves one tile in an absolute direction. Diagonals cost 1.4; the company slows when weary.
  O.step = (dx, dy) => {
    if (Game.mode !== "wild" || (anim && anim.busy)) return;
    const map = Data.MAPS[Game.G.map];
    const nx = Game.G.x + dx, ny = Game.G.y + dy;
    const W = map.grid[0].length, H = map.grid.length;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
    const ch = map.grid[ny][nx];
    if (!passable(ch)) {
      Game.log(ch === "^" ? "Sheer mountain blocks the way." : "The river is too wide to cross here.", "warn");
      return;
    }
    const diag = dx !== 0 && dy !== 0 ? 1.4 : 1;
    const minutes = O.stepMinutes(ch, diag);
    Game.G.x = nx;
    Game.G.y = ny;
    Game.G.dir = dx === 0 ? (dy < 0 ? 0 : 2) : dx > 0 ? 1 : 3;
    Game.advance(minutes);
    O.animateStep(dx, dy);
    O.revealHere();
    O.describe();
    // A site under the feet is announced; visiting is a separate choice.
    if (isSiteChar(map, ch)) O.arrivedAtSite(ch);
    else O.encounterRoll(ch, minutes);
    O.render();
    UI.refreshHUD();
    Game.autosaveIfDue();
  };
  O.stepMinutes = (ch, diag) => {
    const party = Game.conscious();
    const slow = party.length ? Math.min(...party.map((c) => Rules.derive(c, Game.G.time).mv)) : 12;
    const mult = COST[ch] !== undefined ? COST[ch] : 1;
    const weary = Game.G.march >= 600 ? 1.5 : 1;
    return Math.max(1, Math.round((600 / (2 * slow)) * mult * diag * weary));
  };
  O.animateStep = (dx, dy) => {
    const from = { x: Game.G.x - dx, y: Game.G.y - dy };
    const t0 = performance.now();
    const dur = 170;
    anim = { busy: true };
    const frame = () => {
      const t = Math.min(1, (performance.now() - t0) / dur);
      O.render({ fx: from.x + (Game.G.x - from.x) * t, fy: from.y + (Game.G.y - from.y) * t });
      if (t < 1) requestAnimationFrame(frame);
      else { anim.busy = false; O.render(); }
    };
    requestAnimationFrame(frame);
    setTimeout(() => { if (anim) anim.busy = false; }, dur + 80);
  };

  // Wandering encounter roll for a step: 1 - (1 - hourly * rate * night)^(minutes/60).
  O.encounterRoll = (ch, minutes) => {
    const map = Data.MAPS[Game.G.map];
    const base = BASE[ch] !== undefined ? BASE[ch] : 0.05;
    const night = Game.isNight(Game.G.time) ? 1.5 : 1;
    const rate = map.encRate || 1;
    const p = 1 - Math.pow(1 - base * rate * night, minutes / 60);
    if (Rules.rnd() >= p) return;
    // Friendly travellers come one time in four.
    if (map.travellers && map.travellers.length && Rules.rnd() < 0.25) return O.traveller(map);
    return O.hostile(map, ch);
  };
  O.traveller = async (map) => {
    const t = Rules.pick(map.travellers);
    if (t.rumor) {
      const rumor = Rules.pick(Data.RUMORS);
      Game.log(t.text + " “" + rumor + "”", "good");
      Game.note("Heard on the road: " + rumor, Game.G.module);
      return;
    }
    const choice = await UI.modal({ title: "Travellers", body: t.text, actions: [{ id: "trade", label: "Trade", primary: true }, { id: "pass", label: "Pass on" }] });
    if (choice === "trade") return UI.shopCustom("Travelling pedlar", t.goods || []);
  };

  // A hostile band on the road. Surprise on d10 (1-3 surprises) for each side.
  O.hostile = async (map, ch) => {
    const table = (map.enc || []).filter((e) => e.terrain && e.terrain.includes(ch) && (e.time === "any" || e.time === (Game.isNight(Game.G.time) ? "night" : "day")));
    const pool = table.length ? table : (map.enc || []);
    if (!pool.length) return;
    const total = pool.reduce((s, e) => s + (e.w || 1), 0);
    let roll = Rules.rnd() * total;
    let pick = pool[0];
    for (const e of pool) { roll -= e.w || 1; if (roll <= 0) { pick = e; break; } }
    const partySurprised = Rules.die(10) <= 3;
    const enemySurprised = Rules.die(10) <= 3;
    const surprise = partySurprised && !enemySurprised ? "party" : enemySurprised && !partySurprised ? "enemy" : "none";
    const body = (pick.text || "Something moves in the grass.") + (surprise === "party" ? " They are on you before you can draw." : surprise === "enemy" ? " You see them first." : "");
    const slowestEnemy = pick.mons.length ? Math.min(...pick.mons.map((m) => (Data.monster(m[0]) ? Data.monster(m[0]).mv : 12))) : 12;
    const party = Game.conscious();
    const pmv = party.length ? Math.min(...party.map((c) => Rules.derive(c, Game.G.time).mv)) : 12;
    const ranger = party.some((c) => c.cls === "R");
    const forestOrHills = ch === "T" || ch === "n" ? 10 : 0;
    const evadeChance = R_clamp(50 + 6 * (pmv - slowestEnemy) + forestOrHills + (ranger ? 10 : 0), 5, 95);
    const actions = [{ id: "fight", label: "Stand and fight", primary: true }, { id: "evade", label: "Slip away (" + evadeChance + "%)" }];
    if (pick.who || pick.mons.some((m) => /bandit|brigand/.test(m[0]))) actions.push({ id: "toll", label: "Parley (toll)" });
    const choice = surprise === "enemy" ? "fight" : await UI.modal({ title: "Trouble on the road", body, actions });
    if (choice === "evade") {
      if (Rules.die(100) <= evadeChance || surprise === "enemy") {
        Game.advance(30);
        Game.log("You slip away into the cover. It costs thirty minutes.", "good");
        return;
      }
      Game.log("They spot you before you can hide.", "bad");
    }
    if (choice === "toll") {
      const cha = party.length ? Math.max(...party.map((c) => c.cha)) : 10;
      const roll = Rules.die(10) * 2 + Rules.die(10) + Rules.chaMod(cha);
      if (roll >= 9 && Game.G.gold >= 5) {
        Game.G.gold -= 5;
        Game.log("They take a toll of 5 gp and wave you on.", "warn");
        return;
      }
      Game.log("The parley fails.", "bad");
    }
    const result = await Combat.start({ mons: pick.mons, arena: map.arena || "plains", title: map.name, surprise, text: body, mapId: map.id, letter: null, lightLevel: Game.isNight(Game.G.time) ? "night" : "day", overland: true });
    Game.afterWander(result);
  };
  const R_clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Sites: visiting is an explicit choice, announced on arrival.
  O.arrivedAtSite = (ch) => {
    const map = Data.MAPS[Game.G.map];
    const site = map.sites[ch];
    Game.log("You reach " + site.name + ". " + (site.text || ""), "good");
    if (site.kind === "road") return;
    O.describe();
    UI.refreshHUD();
  };
  O.visit = async () => {
    if (Game.mode !== "wild") return;
    const map = Data.MAPS[Game.G.map];
    const ch = map.grid[Game.G.y][Game.G.x];
    const site = map.sites && map.sites[ch];
    if (!site) return Game.log("There is nothing to visit here.", "");
    return O.visitSite(map, ch, site);
  };
  O.visitSite = async (map, ch, site) => {
    const key = "site:" + map.id + ":" + ch;
    if (site.requires && !Game.flag(site.requires)) {
      return Game.log(site.name + " is shut. Something must be done first.", "warn");
    }
    if (site.kind === "home" || site.enter) {
      const choice = await UI.modal({ title: site.name, body: site.text || "Enter?", actions: [{ id: "enter", label: "Enter " + site.name, primary: true }, { id: "no", label: "Not yet" }] });
      if (choice === "enter" && site.enter) Game.enter(site.enter.map, site.enter.x, site.enter.y, site.enter.dir, { reason: "gate" });
      return;
    }
    if (site.kind === "fight") {
      if (site.once && Game.flag(key + ":cleared")) return Game.log("The place is quiet now.", "");
      const choice = await UI.modal({ title: site.name, body: site.enc.text, actions: [{ id: "fight", label: "Approach and attack", primary: true }, { id: "scout", label: "Scout first" }, { id: "withdraw", label: "Withdraw" }] });
      if (choice === "withdraw" || !choice) return;
      if (choice === "scout") {
        Game.advance(20);
        Game.log("You count them: " + Game.bandName(site.enc) + ".", "warn");
        return;
      }
      const result = await Combat.start({ mons: site.enc.mons, arena: site.enc.arena || "plains", title: site.name, surprise: "none", text: site.enc.text, mapId: map.id, letter: null, lightLevel: "day", overland: true });
      if (result.result === "win") {
        Game.setFlag(key + ":cleared", true);
        if (site.cache) Game.gainGold(Rules.dice(site.cache.gold || "0"), "cache");
        if (site.enc.gold) Game.gainGold(Rules.dice(site.enc.gold), "spoils");
        for (const it of site.enc.items || []) Game.giveFirst(it);
        Game.splitXP(result.xp);
        Game.note("Cleared " + site.name + ".", Game.G.module);
        Game.autosave("battle");
      } else Game.afterWander(result);
      return O.render();
    }
    if (site.kind === "holy") {
      if (Game.flag(key + ":blessed")) return Game.log("You have been blessed here already.", "");
      Game.setFlag(key + ":blessed", true);
      if (site.bless) for (const c of Game.alive()) Rules.awardXP(c, site.bless.xp);
      Game.log(site.text + " You feel steadier for the road.", "good");
      Game.note("Blessed at " + site.name + ".", Game.G.module);
      return UI.refreshParty();
    }
    if (site.kind === "heal") {
      const last = Game.G.flags[key + ":healed"] || -1e9;
      if (Game.G.time - last < 7 * 1440) return Game.log("Mother Brina says to come back in a week.", "");
      Game.G.flags[key + ":healed"] = Game.G.time;
      for (const c of Game.alive()) { c.hp = c.maxhp; c.poison = null; }
      Game.log("Mother Brina lays herbs on each of you. Hit points are restored and the venom drawn out.", "good");
      Game.advance(60);
      UI.refreshParty();
      return;
    }
    if (site.kind === "hamlet") {
      const choice = await UI.modal({ title: site.name, body: site.text, actions: [{ id: "beds", label: "Beds for the night (1 gp each)", primary: true }, { id: "trade", label: "Trade" }, { id: "gossip", label: "Gossip" }, { id: "leave", label: "Leave" }] });
      if (choice === "beds") {
        const n = Game.party().length;
        if (Game.G.gold < n) return Game.log("You cannot afford the beds.", "warn");
        Game.G.gold -= n;
        Game.advance(600);
        for (const c of Game.alive()) c.hp = Math.min(c.maxhp, c.hp + 3);
        Game.G.march = 0;
        Game.log("A night in the hayloft. Everyone is a little better.", "good");
        UI.refreshHUD();
      } else if (choice === "trade") UI.shopCustom(site.name, ["ration", "bandage", "potion_cure_light", "torch", "rope"]);
      else if (choice === "gossip") Game.log(Rules.pick(Data.RUMORS), "good");
      return;
    }
    if (site.kind === "road" || site.kind === "text") return Game.log(site.text || "", "");
    return Game.log(site.text || "", "");
  };

  // Camping in the wild: eight hours; a sanctuary is safe, elsewhere the night may bring trouble.
  O.camp = async () => {
    const map = Data.MAPS[Game.G.map];
    const here = map.grid[Game.G.y][Game.G.x];
    const sanctuary = map.sites && map.sites[here] && map.sites[here].kind === "holy";
    if (!sanctuary && Rules.rnd() < 0.3) {
      Game.log("A snap of a twig wakes the camp. Something is out there.", "warn");
      return O.hostile(map, map.grid[Game.G.y][Game.G.x]);
    }
    Game.advance(480);
    for (const c of Game.alive()) {
      c.hp = Math.min(c.maxhp, c.hp + 1);
      c.layUsed = false;
      c.mem = Object.assign({}, c.prep);
    }
    Game.G.march = 0;
    Game.log("The company camps and is restored.", "good");
    UI.refreshParty();
    UI.refreshHUD();
    O.render();
  };

  // Notes on what stands under the party, for the HUD.
  O.describe = () => {
    const map = Data.MAPS[Game.G.map];
    const ch = map.grid[Game.G.y][Game.G.x];
    const names = { ".": "Grassland", ",": "Grassland", "=": "Road", "+": "Bridge", T: "Forest", n: "Hills", "%": "Fen" };
    const site = map.sites && map.sites[ch];
    const text = site ? site.name : names[ch] || "Open country";
    Game.G.meta.ahead = text;
    UI.hint(text + ". " + Game.clock(Game.G.time).text + (Game.isNight(Game.G.time) ? ", night" : ", day") + ".");
  };

  // Rendering: a camera window that follows the party, fog on unknown ground.
  O.render = (over) => {
    if (!canvas || !painted || Game.mode !== "wild") return;
    const map = Data.MAPS[Game.G.map];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth || 640, cssH = canvas.clientHeight || 420;
    if (canvas.width !== Math.round(cssW * dpr)) canvas.width = Math.round(cssW * dpr);
    if (canvas.height !== Math.round(cssH * dpr)) canvas.height = Math.round(cssH * dpr);
    const z = 1.5 * (Math.min(canvas.width, canvas.height) / 640);
    const fx = over && over.fx !== undefined ? over.fx : Game.G.x;
    const fy = over && over.fy !== undefined ? over.fy : Game.G.y;
    const vis = O.visibleSet();
    const W = map.grid[0].length, H = map.grid.length;
    const tile = TILE * z * 0.66;
    const cx = canvas.width / 2 - (fx + 0.5) * tile;
    const cy = canvas.height / 2 - (fy + 0.5) * tile;
    ctx.fillStyle = "#0b0c10";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.drawImage(painted, 0, 0, W * tile, H * tile);
    // Fog: unknown is dark, explored-but-not-visible is dim.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const known = Game.isSeen(map.id, W, H, x, y);
      const here = vis.has(y * W + x);
      if (!known) {
        ctx.fillStyle = "rgba(8,9,12,0.92)";
        ctx.fillRect(x * tile, y * tile, tile + 0.5, tile + 0.5);
      } else if (!here) {
        ctx.fillStyle = "rgba(8,9,12,0.42)";
        ctx.fillRect(x * tile, y * tile, tile + 0.5, tile + 0.5);
      }
    }
    ctx.restore();
    // Party token.
    const px = canvas.width / 2, py = canvas.height / 2;
    ctx.fillStyle = Game.isNight(Game.G.time) ? "rgba(10,12,30,0.35)" : "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffd27a";
    ctx.strokeStyle = "#0d0e13";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, py, tile * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Compass.
    ctx.fillStyle = "#e9e2cf";
    ctx.font = "bold 16px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("N", canvas.width - 28, 22);
    ctx.beginPath();
    ctx.moveTo(canvas.width - 28, 30);
    ctx.lineTo(canvas.width - 34, 46);
    ctx.lineTo(canvas.width - 22, 46);
    ctx.closePath();
    ctx.fill();
  };

  // Keyboard: absolute compass moves, Visit, camp, and the shared overlays.
  O.key = (e) => {
    const k = e.key;
    const lk = k.length === 1 ? k.toLowerCase() : k;
    const moves = { w: [0, -1], ArrowUp: [0, -1], s: [0, 1], ArrowDown: [0, 1], a: [-1, 0], ArrowLeft: [-1, 0], d: [1, 0], ArrowRight: [1, 0], q: [-1, -1], z: [-1, 1], e: [1, -1], c: [1, 1] };
    if (moves[k] || moves[lk]) { O.step(...(moves[k] || moves[lk])); return true; }
    if (lk === "enter" || k === " " || lk === "v") { O.visit(); return true; }
    if (lk === "r") { O.camp(); return true; }
    if (lk === "m") { UI.openFullMap(); return true; }
    if (lk === "j") { UI.openJournal(); return true; }
    if (lk === "b") { UI.openBestiary(); return true; }
    if (lk === "p") { UI.toggleParty(); return true; }
    if (k === "Escape") { UI.openMenu(); return true; }
    return false;
  };

  // Tap or click: one step toward the point.
  O.tap = (e) => {
    if (Game.mode !== "wild" || !canvas) return;
    const r = canvas.getBoundingClientRect();
    const px = (e.clientX - r.left) * (canvas.width / r.width);
    const py = (e.clientY - r.top) * (canvas.height / r.height);
    const map = Data.MAPS[Game.G.map];
    const z = 1.5 * (Math.min(canvas.width, canvas.height) / 640);
    const tile = TILE * z * 0.66;
    const tx = Math.floor((px - canvas.width / 2) / tile + Game.G.x + 0.5);
    const ty = Math.floor((py - canvas.height / 2) / tile + Game.G.y + 0.5);
    const dx = Math.sign(tx - Game.G.x), dy = Math.sign(ty - Game.G.y);
    if (dx === 0 && dy === 0) return O.visit();
    O.step(dx, dy);
  };

  return O;
})();
