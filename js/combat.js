"use strict";
/*
 * Tactical combat on a 14x10 isometric board. Combat.start(spec) runs an
 * asynchronous battle and resolves with {result, xp, gold, left}. Player
 * turns wait on clicks or keys; monster turns and Auto-Battle use the same AI.
 * Only this module draws the board and resolves hits, spells and morale.
 */
const Combat = (() => {
  const CB = {};
  const W = 14, H = 10;
  const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const BLUNT = ["mace", "hammer", "flail", "club"];
  let canvas = null;
  let g = null;
  let S = null;            // current battle
  let rafId = 0;
  let geom = { ox: 0, oy: 0, hw: 30, hh: 15 };

  CB.init = (c) => {
    canvas = c;
    g = canvas.getContext("2d");
    canvas.addEventListener("pointerdown", (e) => CB.click(e));
    canvas.addEventListener("pointermove", (e) => CB.hover(e));
    return CB;
  };
  CB.active = () => !!S;

  // ----------------------------------------------------------- geometry ----
  const toScreen = (x, y) => ({ sx: geom.ox + (x - y) * geom.hw, sy: geom.oy + (x + y) * geom.hh });
  const fromScreen = (sx, sy) => {
    const a = (sx - geom.ox) / geom.hw, b = (sy - geom.oy) / geom.hh;
    return { x: Math.floor((a + b) / 2), y: Math.floor((b - a) / 2) };
  };
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

  // ------------------------------------------------------------ units ----
  const unitAt = (x, y) => S.units.find((u) => u.alive && u.x === x && u.y === y) || null;
  const blocked = (x, y) => !inside(x, y) || S.obstacles.has(x + "," + y) || !!unitAt(x, y);
  const isStanding = (u) => u.alive && !u.down && !u.asleep && !u.held && !u.fled;
  const enemiesOf = (u) => S.units.filter((o) => o.alive && o.side !== u.side && !o.fled);
  const alliesOf = (u) => S.units.filter((o) => o.alive && o.side === u.side && !o.fled);
  const dist = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const adjacent = (a, b) => dist(a, b) === 1;
  const cost = (dx, dy) => (dx && dy ? 3 : 2);

  // Half-square movement: flood over eight neighbours, cardinal 2, diagonal 3.
  const reach = (u) => {
    const best = new Map();
    const start = u.x + "," + u.y;
    best.set(start, { c: 0, px: null, py: null });
    const open = [{ x: u.x, y: u.y, c: 0 }];
    while (open.length) {
      open.sort((a, b) => a.c - b.c);
      const cur = open.shift();
      for (const [dx, dy] of D8) {
        const nx = cur.x + dx, ny = cur.y + dy;
        if (blocked(nx, ny)) continue;
        // Passing a foe's reach is not allowed through its tile; ZOC handled on leave.
        const nc = cur.c + cost(dx, dy);
        if (nc > u.moveAllow) continue;
        const key = nx + "," + ny;
        const have = best.get(key);
        if (have && have.c <= nc) continue;
        best.set(key, { c: nc, px: cur.x, py: cur.y });
        open.push({ x: nx, y: ny, c: nc });
      }
    }
    return best;
  };

  // Free melee attacks for leaving an able enemy's reach: once per threat per mover's turn.
  const provokeFrom = (u, tx, ty) => {
    for (const e of enemiesOf(u)) {
      if (!isStanding(e) || u.hidden || u.provokers?.has(e.id)) continue;
      if (Math.max(Math.abs(e.x - u.x), Math.abs(e.y - u.y)) === 1 && Math.max(Math.abs(e.x - tx), Math.abs(e.y - ty)) > 1) {
        u.provokers = u.provokers || new Set();
        u.provokers.add(e.id);
        log("A free strike as " + u.name + " slips away.", "warn");
        meleeAttack(e, u, { bonus: 2, free: true });
      }
    }
  };

  // ----------------------------------------------------------- logging ----
  const log = (text, cls) => {
    if (!S) return;
    S.log.push({ text, cls: cls || "" });
    if (S.log.length > 250) S.log.shift();
    UI.log(text, cls);
  };

  // ---------------------------------------------------------- building ----
  const monsterUnit = (id, n) => {
    const m = Data.monster(id);
    const hp = Math.max(1, Rules.dice(m.hp));
    const u = {
      id: S.nextId++, side: "mon", name: n ? m.name : m.name, def: m, key: id, size: m.size,
      x: 0, y: 0, hp, maxhp: hp, ac: m.ac, thac0: m.thac0, hit: 0, dmgs: null,
      halves: 2, moveAllow: m.mv, mv: m.mv, alive: true, down: false, asleep: false, held: false, fled: false,
      hidden: false, tags: m.tags, fig: Figs.descMon(m, null), spellsLeft: 0, morale: m.ml,
      leader: m.leader, rank: m.rank, tempHP: 0, buffs: [], charges: 0, fear: 0, regen: 0,
      speed: 0, sizeMod: m.size === "S" ? 0 : m.size === "M" ? 1 : m.size === "L" ? 2 : 3,
      cast: m.cast ? { lvl: m.cast.lvl, list: m.cast.list, spells: m.cast.spells.slice() } : null,
      poisonBurn: 0, bleeding: false, dead: false,
    };
    const regen = (m.sp || []).find((s) => s.startsWith("regen:"));
    if (regen) u.regen = parseInt(regen.split(":")[1], 10);
    if (m.rng) u.rng = m.rng;
    u.nameTag = n ? n : null;
    return u;
  };
  const pcUnit = (c) => {
    const d = Rules.derive(c, Game.G.time);
    const u = {
      id: S.nextId++, side: "pc", name: c.name, char: c, def: null, key: c.id, size: "M",
      x: 0, y: 0, hp: c.hp, maxhp: c.maxhp, ac: d.ac, thac0: d.thac0, hit: d.meleeHit,
      derived: d, halves: d.halves, moveAllow: 2 * Math.ceil(d.mv / 2), mv: d.mv,
      alive: !c.dead, down: c.hp <= 0 && !c.dead, asleep: false, held: false, fled: false,
      hidden: false, tags: [], fig: Figs.descChar(c, d), spellsLeft: 0, morale: 20,
      leader: false, rank: 0, tempHP: 0, buffs: [], fear: 0, regen: 0,
      speed: d.weapon ? d.weapon.spd || 5 : 1, sizeMod: 0, cast: null,
      mem: Object.assign({}, c.mem || {}), turnUsed: false, layReady: !c.layUsed && c.cls === "P",
      bleeding: false, dead: c.dead, provokers: null, poisonBurn: 0,
    };
    return u;
  };

  // Places the party on the left and the enemies on the right.
  const placeAll = () => {
    const pcs = S.units.filter((u) => u.side === "pc" && u.alive);
    const front = [[3, 3], [3, 5], [3, 7]], back = [[1, 3], [1, 5], [1, 7]];
    pcs.forEach((u, i) => {
      const spot = i < 3 ? front[i] : back[i - 3];
      u.x = spot ? spot[0] : 1;
      u.y = spot ? spot[1] : 2 + i;
    });
    const mons = S.units.filter((u) => u.side === "mon");
    const melee = mons.filter((u) => !u.rng && !u.cast);
    const ranged = mons.filter((u) => u.rng || u.cast);
    const slots = [];
    for (let y = 1; y < H - 1; y++) for (let x = 9; x <= 12; x++) slots.push([x, y]);
    const order = (list, want) => list.forEach((u, i) => {
      const s = want.shift();
      if (s) { u.x = s[0]; u.y = s[1]; }
    });
    const nearSpots = slots.filter(([x]) => x <= 10);
    const farSpots = slots.filter(([x]) => x >= 11);
    order(melee, nearSpots.slice());
    order(ranged, farSpots.slice());
    // Anything left over stands on the nearest free right-hand tile.
    for (const u of mons) {
      if (u.x && u.y && !unitAt(u.x, u.y) && !(u.x === 0)) continue;
      const free = slots.find(([x, y]) => !unitAt(x, y) && !S.obstacles.has(x + "," + y));
      if (free) { u.x = free[0]; u.y = free[1]; }
    }
  };

  // Obstacles by arena theme; kept off the start columns and checked for a path.
  const makeObstacles = (arena, rng) => {
    const set = new Set();
    const kind = arena || "dungeon";
    const count = /forest|trees/.test(kind) ? 12 : /hill|rock/.test(kind) ? 10 : /village|street/.test(kind) ? 7 : 8;
    let tries = 0;
    while (set.size < count && tries++ < 400) {
      const x = 4 + Math.floor(rng() * 5), y = 1 + Math.floor(rng() * 8);
      if (x === 4 && (y === 3 || y === 5 || y === 7)) continue;
      set.add(x + "," + y);
    }
    S.obstacleKind = kind;
    return set;
  };
  // Flood check: every standing PC tile can reach the enemy side.
  const pathOpen = (obs) => {
    const starts = [[3, 3], [1, 5]];
    const seen = new Set();
    const q = [starts[0]];
    seen.add(starts[0].join(","));
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of D8) {
        const nx = x + dx, ny = y + dy;
        const k = nx + "," + ny;
        if (!inside(nx, ny) || obs.has(k) || seen.has(k)) continue;
        seen.add(k);
        q.push([nx, ny]);
      }
    }
    return seen.has("11,5");
  };

  // Turns a spec's monster list into units.
  const buildUnits = (spec, party) => {
    S.units = [];
    for (const c of party) S.units.push(pcUnit(c));
    for (const [id, count] of spec.mons) {
      const n = Math.max(1, typeof count === "number" ? count : Rules.dice(count));
      for (let i = 0; i < Math.min(n, 12); i++) {
        const u = monsterUnit(id, null);
        u.name = Data.monster(id).name + (n > 1 ? " " + (i + 1) : "");
        S.units.push(u);
      }
    }
    // Leaders stand behind the line.
    const leaders = S.units.filter((u) => u.side === "mon" && u.leader);
    for (const u of leaders) u.morale = Math.max(u.morale, 16);
  };

  // ------------------------------------------------------------- start ----
  CB.start = (spec) => {
    if (S) return Promise.reject(new Error("A battle is already under way."));
    return new Promise((resolve) => {
      const party = Game.conscious().concat(Game.party().filter((c) => c.dead));
      const standing = Game.party().filter((c) => !c.dead);
      S = {
        spec, resolve, round: 0, nextId: 1, units: [], obstacles: new Set(), log: [], turnOrder: [],
        ended: false, auto: false, mode: null, target: null, pending: null, title: spec.title || "Battle",
        surprise: spec.surprise || "none", arena: spec.arena || "dungeon", result: null, xp: 0, gold: 0,
        prevMode: Game.mode, anims: [], floaters: [], selectedId: null, hover: null, mapId: spec.mapId,
        overland: !!spec.overland, fledIds: [], xpPool: 0,
        lightLevel: spec.lightLevel || "day", guardHits: 0,
      };
      let obs = makeObstacles(S.arena, Rules.mulberry32(Rules.hash(String(Game.G.time) + (spec.title || ""))));
      for (let i = 0; i < 4 && !pathOpen(obs); i++) obs = makeObstacles(S.arena, Math.random);
      S.obstacles = obs;
      buildUnits(spec, standing.length ? standing : party);
      placeAll();
      for (const u of S.units) if (u.side === "mon") Bestiary.sight(u.key);
      for (const u of S.units) if (u.side === "mon") Bestiary.fought(u.key);
      UI.enterCombat(S.title, spec.text || "Battle joined.");
      if (spec.text) log(spec.text, "warn");
      applySurprise();
      CB.loop().then((res) => {
        const out = Object.assign({ result: res.result, xp: S.xp, gold: S.gold, left: res.left || [] }, {});
        const finalize = () => {
          for (const u of S.units) {
            const c = u.char;
            if (c) {
              c.hp = Math.max(-10, Math.min(c.maxhp, u.hp));
              if (u.hp <= -10) c.dead = true;
              c.dead = c.dead || (u.dead && u.hp <= -10);
              c.mem = Object.assign({}, u.mem);
              if (u.layReady === false) c.layUsed = true;
            }
          }
          const r = out;
          S = null;
          cancelAnimationFrame(rafId);
          UI.exitCombat(out.result);
          resolve(r);
        };
        finalize();
      });
    });
  };

  // Surprise: the surprised side loses its first round, which is simulated by skipping its actions.
  const applySurprise = () => {
    if (S.surprise === "party") log("The company is caught off guard.", "bad");
    if (S.surprise === "enemy") log("The foe is caught unawares.", "good");
  };

  // ------------------------------------------------------------- loop ----
  // Runs rounds until a side wins, the party falls or flees, or the battle stalls.
  CB.loop = async () => {
    for (;;) {
      if (S.round >= 150) return { result: "fled", left: downedIds() };
      S.round++;
      S.turnOrder = S.units.filter((u) => u.alive && !u.fled).map((u) => ({ u, roll: Rules.die(10) + initBonus(u) }));
      S.turnOrder.sort((a, b) => a.roll - b.roll || (a.u.side === "mon" ? -1 : 1));
      for (const u of S.units) {
        u.halves = u.side === "pc" ? u.derived.halves : u.halves;
        u.attacksLeft = Rules.attacksThisRound(u.halves, S.round);
        u.moveLeft = u.moveAllow;
        u.acted = false;
        u.provokers = null;
        u.spellDone = false;
        u.hitThisRound = false;
      }
      renderLater();
      for (const t of S.turnOrder) {
        const u = t.u;
        if (!u.alive || u.fled) continue;
        if (S.round === 1 && S.surprise === "party" && u.side === "pc") continue;
        if (S.round === 1 && S.surprise === "enemy" && u.side === "mon") continue;
        S.active = u;
        renderLater();
        if (u.side === "pc" && !S.auto) {
          await playerTurn(u);
        } else {
          await aiTurn(u);
        }
        S.active = null;
        const verdict = checkEnd();
        if (verdict) return verdict;
      }
      endOfRound();
      const verdict = checkEnd();
      if (verdict) return verdict;
    }
  };
  const initBonus = (u) => (u.side === "pc" ? u.speed || 5 : u.sizeMod || 0);
  const downedIds = () => S.units.filter((u) => u.side === "pc" && u.down && !u.dead).map((u) => u.key);

  // Result check after each action.
  const checkEnd = () => {
    const pcs = S.units.filter((u) => u.side === "pc");
    const standing = pcs.filter((u) => u.alive && !u.fled && (u.hp > 0 || u.down));
    const foes = S.units.filter((u) => u.side === "mon" && u.alive && !u.fled);
    if (!foes.length) {
      const xp = S.units.filter((u) => u.side === "mon" && u.dead).reduce((s, u) => s + (u.def.xp || 0), 0);
      // Gold: each enemy rolls its own hoard, plus the encounter's gold.
      let gold = 0;
      for (const u of S.units) if (u.side === "mon" && u.dead && u.def.gold && u.def.gold !== "0") gold += Rules.dice(u.def.gold);
      if (S.spec.gold) gold += Rules.dice(S.spec.gold);
      S.xp = xp;
      S.gold = gold;
      log("The foe is defeated. Victory.", "good");
      return { result: "win" };
    }
    const able = pcs.filter((u) => u.alive && !u.fled && !u.dead && u.hp > 0);
    if (!able.length) {
      if (pcs.some((u) => u.fled)) return { result: "fled", left: downedIds() };
      log("No one stands. The company falls.", "bad");
      return { result: "lose" };
    }
    if (pcs.every((u) => u.fled || u.dead) && pcs.some((u) => u.fled)) return { result: "fled", left: downedIds() };
    return null;
  };

  // Tick effects at the round's end: bleeding, regeneration, poison, temporary effects.
  const endOfRound = () => {
    for (const u of S.units) {
      if (!u.alive) continue;
      if (u.side === "pc" && u.down && !u.dead) {
        if (u.bleeding) {
          u.hp -= 1;
          log(u.name + " bleeds.", "bad");
          if (u.hp <= -10) killUnit(u);
        }
      }
      if (u.regen && u.hp > 0 && u.hp < u.maxhp) {
        u.hp = Math.min(u.maxhp, u.hp + u.regen);
      }
      if (u.side === "pc" && u.char && u.char.poison && u.hp > 0) {
        // Venom ticks once a minute, not per round; combat only notes it.
      }
      if (u.hidden && u.side === "pc") { /* stays hidden until it acts */ }
      if (u.held && u.heldUntil && S.round >= u.heldUntil) { u.held = false; u.heldUntil = 0; }
      if (u.fear > 0) u.fear -= 1;
      u.buffs = u.buffs.filter((b) => (b.rounds === undefined ? true : (b.rounds -= 1) > 0));
    }
    // Break expiring spells such as Slow or Haste.
    for (const u of S.units) if (u.alive && u.slowed) u.slowed -= 1, u.slowed <= 0 && (u.slowed = 0);
    // Morale when the field thins.
    checkMorale();
    renderLater();
  };
  const checkMorale = () => {
    const foes = S.units.filter((u) => u.side === "mon" && u.alive && !u.fled);
    const total = S.units.filter((u) => u.side === "mon").length;
    if (!foes.length || total === 0) return;
    const leaderDown = S.units.some((u) => u.side === "mon" && u.leader && !u.alive);
    if (!leaderDown && foes.length > total / 2) return;
    for (const u of foes) {
      if (u.morale >= 20) continue;
      if (Rules.dice("2d10") > u.morale) {
        u.fled = true;
        log(u.name + " breaks and flees.", "warn");
      }
    }
  };

  // Kill or down a unit. Monsters die at 0 hit points; PCs fall at 0 and die at -10.
  const killUnit = (u) => {
    if (u.side === "mon") {
      u.alive = false;
      u.dead = true;
      Bestiary.slain(u.key, 1);
      log(u.name + " is slain.", "good");
      checkMorale();
      return;
    }
    u.alive = false;
    u.dead = true;
    u.down = false;
    u.hp = Math.min(u.hp, -10);
    log(u.name + " dies.", "bad");
  };
  const damage = (u, n, why) => {
    if (n <= 0) return 0;
    let remaining = n;
    if (u.tempHP > 0) {
      const t = Math.min(u.tempHP, remaining);
      u.tempHP -= t;
      remaining -= t;
    }
    if (remaining <= 0) return n;
    u.hp -= remaining;
    u.hitThisRound = true;
    if (u.side === "pc" && u.char) u.char.hp = u.hp;
    CB.floater(u, "-" + remaining, "#ff8a7a");
    if (u.side === "pc") {
      if (u.hp <= 0 && u.hp > -10) {
        u.down = true;
        u.bleeding = true;
        log(u.name + " falls and bleeds.", "bad");
      }
      if (u.hp <= -10) killUnit(u);
    } else if (u.hp <= 0) {
      killUnit(u);
    }
    return n;
  };
  CB.floater = (u, text, color) => {
    if (!S) return;
    S.floaters.push({ u: { x: u.x, y: u.y }, text, color, t0: performance.now() });
    renderLater();
  };

  // ----------------------------------------------------------- attacks ----
  // d20 + modifiers against THAC0 - target AC. Nat 1 misses, nat 20 hits, helpless targets are struck.
  const rollHit = (att, def, mod) => {
    if (def.asleep || def.held || def.down) return { hit: true, nat: 0 };
    const roll = Rules.die(20);
    if (roll === 1) return { hit: false, nat: 1, roll };
    if (roll === 20) return { hit: true, nat: 20, roll };
    const total = roll + (mod || 0);
    return { hit: total >= att.thac0 - def.ac, nat: 0, roll, total, need: att.thac0 - def.ac };
  };
  const weaponBlunt = (wpn) => !!wpn && BLUNT.includes(wpn.family);
  const weaponMagic = (wpn) => !!wpn && (!!wpn.magic || (wpn.bonus && (wpn.bonus.hit || 0) > 0) || wpn.ench > 0);
  const weaponSilver = (wpn) => !!wpn && (!!wpn.silver || weaponMagic(wpn));

  // A melee blow. opts: {bonus, free, backstab, weaponId, dmgOverride}
  const meleeAttack = (att, def, opts = {}) => {
    if (!def.alive) return false;
    const pc = att.side === "pc";
    const wpnId = pc ? att.char.eq.melee : null;
    const wpn = pc && wpnId ? Data.item(wpnId) : null;
    const d = pc ? att.derived : null;
    let mod = pc ? d.meleeHit : 0;
    mod += opts.bonus || 0;
    if (pc && att.blessed) mod += 1;
    if (pc && att.heroism) mod += 2;
    if (pc && att.aided) mod += 1;
    if (pc && att.favoured && def.tags.some((t) => (att.favoured || "").split(",").includes(t))) mod += 4;
    if (pc && d && d.favored && def.tags.includes(d.favored)) mod += 4;
    if (!pc && att.cursed) mod -= 1;
    const r = rollHit(att, def, mod);
    const roll = r.roll !== undefined ? "rolled " + r.roll + (r.total !== undefined ? " (" + r.total + " vs " + r.need + ")" : "") : "";
    if (!r.hit) {
      log(att.name + " misses " + def.name + ". " + roll, "");
      return false;
    }
    // Requirements.
    if (def.def && def.def.req) {
      const ok = def.def.req === "silver" ? weaponSilver(wpn) : weaponMagic(wpn);
      if (pc && !ok) {
        log(att.name + " strikes, but " + def.name + " is unharmed by ordinary steel.", "warn");
        return true;
      }
    }
    const big = def.size === "L" || def.size === "H" || def.size === "G";
    let expr = pc ? (big ? d.dmgLg : d.dmgSm) : att.def.atk[0];
    let dmg = pc ? Rules.dice(expr) : 0;
    if (pc) {
      dmg += d.meleeDmg;
      if (wpn && wpn.bonus && wpn.bonus.dmg) dmg += 0;
      if (opts.backstab) dmg = Rules.dice(expr.replace(/^(\d+)/, (m) => (+m) * opts.backstab)) + d.meleeDmg;
      if (d && d.favored && def.tags.includes(d.favored)) dmg += att.char ? att.char.lvl : 0;
    }
    if (pc && def.tags.includes("ogre") && wpn && wpn.family === "sword") dmg += 0;
    if (def.undead && def.def.sp && def.def.sp.includes("halfNonBlunt") && pc && !weaponBlunt(wpn)) dmg = Math.floor(dmg / 2);
    if (pc && d && d.racialHit) dmg += 0;
    if (pc && (att.char.race === "dwarf") && def.tags.some((t) => ["goblinoid", "orc", "gnoll"].includes(t))) dmg += 0;
    dmg = Math.max(1, dmg);
    log(att.name + " hits " + def.name + " for " + dmg + ". " + roll, "");
    damage(def, dmg, "blow");
    if (def.hp <= 0 && def.alive) killUnit(def);
    if (def.side === "mon" && def.alive) def.hit = true;
    return true;
  };

  // Monster blows, one attack entry per die expression.
  const monsterBlows = (m, target) => {
    for (const expr of m.def.atk) {
      if (!target.alive) return;
      const r = rollHit(m, target, 0);
      if (!r.hit) { log(m.name + " misses " + target.name + ".", ""); continue; }
      const dmg = Math.max(1, Rules.dice(expr));
      log(m.name + " hits " + target.name + " for " + dmg + ".", "bad");
      damage(target, dmg, "blow");
      if (target.side === "pc" && target.char && m.def.sp && m.def.sp.includes("paralysis") && target.char.race !== "elf" && Rules.die(20) <= 12) {
        target.held = true;
        target.heldUntil = S.round + 2;
        log(target.name + " is paralysed by the touch.", "bad");
      }
      if (target.side === "pc" && m.def.sp && m.def.sp.includes("poison") && Rules.die(20) <= 8 && target.char) {
        target.char.poison = { at: Game.G.time + 20 };
        log(target.name + " is poisoned.", "bad");
      }
      if (target.side === "pc" && m.def.sp && m.def.sp.some((s) => s === "drain") && target.char) {
        target.char.lvl = Math.max(1, target.char.lvl);
        log(target.name + " feels life drain away.", "bad");
      }
      if (!target.alive) return;
    }
  };

  // Ranged blows and missile attacks. Penalties: medium -2, long -5.
  const missileAttack = (att, def) => {
    const pc = att.side === "pc";
    const d = pc ? att.derived : null;
    const wpn = pc && att.char.eq.missile ? Data.item(att.char.eq.missile) : null;
    const band = (() => {
      const r = dist(att, def);
      if (pc && wpn && wpn.rng) {
        const [s, m, l] = wpn.rng.map((v) => v * 3);
        if (r <= s) return 0;
        if (r <= m) return -2;
        if (r <= l) return -5;
        return null;
      }
      return 0;
    })();
    if (band === null) return log(att.name + " is out of range.", "warn");
    let mod = (pc ? d.missileHit : 0) + band;
    if (pc && att.char.race === "halfling" && wpn && wpn.family === "sling") mod += 1;
    const r = rollHit(att, def, mod);
    const roll = r.roll !== undefined ? "rolled " + r.roll : "";
    if (!r.hit) return log(att.name + " misses " + def.name + ". " + roll, "");
    const expr = pc ? wpn && wpn.dmg ? (def.size === "L" || def.size === "H" || def.size === "G" ? wpn.dmg.lg : wpn.dmg.sm) : "1d2" : (att.def.rng ? att.def.rng.dmg : "1d6");
    const dmg = Math.max(1, Rules.dice(expr));
    log(att.name + " hits " + def.name + " for " + dmg + ". " + roll, "");
    damage(def, dmg, "missile");
    if (def.hp <= 0 && def.alive) killUnit(def);
  };

  // ------------------------------------------------------------ player ----
  // Waits for the player to act: move, attack, cast, turn, hide, use, bandage, flee or end.
  const playerTurn = (u) => {
    S.selectedId = u.id;
    S.reach = reach(u);
    S.pending = null;
    S.menu = null;
    u.attacksLeft = u.attacksLeft || 1;
    u.moveLeft = u.moveAllow;
    renderLater();
    return new Promise((resolve) => {
      S.turnResolve = resolve;
      S.turnUnit = u;
      showCommands(u);
    });
  };
  const endPlayerTurn = () => {
    const r = S.turnResolve;
    S.turnResolve = null;
    S.turnUnit = null;
    S.pending = null;
    S.reach = null;
    S.mode = null;
    if (r) r();
  };

  const showCommands = (u) => {
    const items = [];
    const foes = enemiesOf(u).filter((e) => e.alive && !e.fled);
    const adj = foes.filter((e) => adjacent(u, e));
    const canMelee = adj.length > 0 && u.attacksLeft > 0;
    const hasRanged = u.char.eq.missile && Data.item(u.char.eq.missile) && Data.item(u.char.eq.missile).kind === "missile";
    items.push({ id: "move", label: "Move", title: "Tap a blue tile to move", fn: () => { S.mode = "move"; renderLater(); }, disabled: u.moveLeft <= 0 });
    items.push({ id: "attack", label: "Attack", title: "Tap an adjacent foe (or a foe in missile range)", fn: () => { S.mode = "attack"; renderLater(); }, disabled: !(canMelee || (hasRanged && u.attacksLeft > 0)) });
    if (u.char.cls === "M" || u.char.cls === "C" || u.char.cls === "P") items.push({ id: "cast", label: "Cast", title: "Cast a memorised spell", fn: () => castMenu(u) });
    if ((u.char.cls === "C" || u.char.cls === "P") && !u.turnUsed) items.push({ id: "turn", label: "Turn", title: "Turn undead", fn: () => turnUndead(u) });
    if (u.char.cls === "P" && u.layReady) items.push({ id: "lay", label: "Lay on hands", title: "Heal yourself or an adjacent ally once per rest", fn: () => { S.mode = "lay"; renderLater(); } });
    if (u.char.cls === "T" && !u.hidden && !adj.length) items.push({ id: "hide", label: "Hide", title: "Hide in shadows", fn: () => hide(u) });
    items.push({ id: "use", label: "Use item", title: "Use a potion, scroll, device or bandage", fn: () => useMenu(u) });
    const down = alliesOf(u).filter((a) => a.down && adjacent(u, a) && a.bleeding);
    if (down.length) items.push({ id: "bandage", label: "Bandage", title: "Stop an adjacent companion from bleeding", fn: () => bandage(u, down[0]) });
    if (u.x === 0 || u.x === W - 1 || u.y === 0 || u.y === H - 1) items.push({ id: "flee", label: "Flee", title: "Leave by this edge", fn: () => flee(u) });
    items.push({ id: "end", label: "End turn", title: "End this company member's turn", fn: () => endPlayerTurn() });
    items.push({ id: "auto", label: "Auto-battle", title: "Let the AI fight for the company", fn: () => { S.auto = true; endPlayerTurn(); } });
    UI.cmd(items.map((i) => ({ id: i.id, label: i.label, title: i.title, fn: i.fn, disabled: !!i.disabled })));
    UI.hint(u.name + ": " + (u.moveLeft > 0 ? "move up to " + Math.floor(u.moveLeft / 2) + " squares, " : "") + (u.attacksLeft > 0 ? u.attacksLeft + " attack(s)" : "no attacks left") + ".");
    renderLater();
  };

  // Clicking the board: choose a move, attack, spell target, lay on hands or cancel.
  CB.click = (e) => {
    if (!S || !S.turnUnit) return;
    const r = canvas.getBoundingClientRect();
    const px = (e.clientX - r.left) * (canvas.width / r.width);
    const py = (e.clientY - r.top) * (canvas.height / r.height);
    const t = fromScreen(px, py);
    if (!inside(t.x, t.y)) return;
    const u = S.turnUnit;
    const target = unitAt(t.x, t.y);
    if (S.mode === "move" && S.reach && S.reach.has(t.x + "," + t.y) && !target) return doMove(u, t);
    if (S.mode === "attack" && target && target.side !== u.side) return doAttack(u, target);
    if (S.mode === "lay") return doLay(u, target);
    if (S.mode === "spell" && S.pending) return doSpell(u, t, target);
    if (S.mode === "turnTarget") return;
    if (target && target.side !== u.side && adjacent(u, target) && u.attacksLeft > 0) return doAttack(u, target);
    if (S.reach && S.reach.has(t.x + "," + t.y) && !target && u.moveLeft > 0) return doMove(u, t);
    if (S.mode) { S.mode = null; S.pending = null; renderLater(); }
  };
  CB.hover = (e) => {
    if (!S) return;
    const r = canvas.getBoundingClientRect();
    const px = (e.clientX - r.left) * (canvas.width / r.width);
    const py = (e.clientY - r.top) * (canvas.height / r.height);
    const t = fromScreen(px, py);
    const u = unitAt(t.x, t.y);
    S.hover = u ? { x: t.x, y: t.y } : null;
    if (u) {
      const hp = u.side === "pc" ? u.hp + "/" + u.maxhp : (u.alive ? "hp " + u.hp + "/" + u.maxhp : "slain");
      UI.hint(u.name + " — " + hp + ", AC " + u.ac + (u.side === "mon" ? ", " + u.def.atk.join(" / ") : ""));
    }
    renderLater();
  };

  const doMove = (u, t) => {
    const path = [];
    let cur = t.x + "," + t.y;
    const best = S.reach;
    if (!best.has(cur)) return;
    while (cur) {
      const p = best.get(cur);
      path.unshift(cur);
      cur = p.px !== null ? p.px + "," + p.py : null;
    }
    const cost0 = best.get(t.x + "," + t.y).c;
    // Walk the path, provoking as it leaves each reach.
    let prev = null;
    for (const step of path) {
      const [x, y] = step.split(",").map(Number);
      if (prev) provokeFrom(u, x, y);
      u.x = x;
      u.y = y;
      prev = [x, y];
      if (!u.alive) break;
    }
    u.moveLeft = Math.max(0, u.moveLeft - cost0);
    S.reach = u.moveLeft > 0 ? reach(Object.assign({}, u, { moveAllow: u.moveLeft })) : null;
    S.mode = null;
    renderLater();
    showCommands(u);
    if (!u.alive || u.down) endPlayerTurn();
  };

  const doAttack = (u, target) => {
    if (u.attacksLeft <= 0) return;
    u.attacksLeft -= 1;
    if (!u.alive) return;
    const r = dist(u, target);
    if (r === 1) {
      const backstab = u.char.cls === "T" && (u.hidden || alliesOf(u).some((a) => a !== u && a.alive && isOpposite(u, a, target)));
      const dmgOpts = { bonus: 0, free: false };
      if (backstab) {
        dmgOpts.backstab = Rules.backstabMult(u.char.lvl);
        dmgOpts.bonus = 4;
        log(u.name + " strikes from the shadows!", "good");
      }
      if (u.hidden) u.hidden = false;
      meleeAttack(u, target, dmgOpts);
    } else {
      if (!u.char.eq.missile) return log(u.name + " has no missile weapon readied.", "warn");
      missileAttack(u, target);
    }
    u.moveLeft = 0;
    S.mode = null;
    if (u.attacksLeft <= 0) return endPlayerTurn();
    renderLater();
    showCommands(u);
  };
  // An ally beside the target, on the far side from the attacker.
  const isOpposite = (u, ally, target) => adjacent(ally, target) && (ally.x - target.x) * (target.x - u.x) + (ally.y - target.y) * (target.y - u.y) > 0;

  // Cast: a menu of memorised copies; the chosen spell waits for a target.
  const castMenu = (u) => {
    const mem = u.mem || {};
    const list = Object.keys(mem).filter((id) => mem[id] > 0 && Data.SPELLS[id]);
    if (!list.length) return log(u.name + " has no spells memorised.", "warn");
    if (u.spellsCastRound === S.round && u.hitThisRound) return log("The spell is broken by the blow. " + u.name + " cannot cast this round.", "warn");
    const items = list.map((id) => ({ id: "sp_" + id, label: Data.SPELLS[id].name + " (" + mem[id] + ")", title: Data.SPELLS[id].desc, fn: () => { S.pending = { spell: id }; S.mode = "spell"; renderLater(); UI.hint("Choose a target for " + Data.SPELLS[id].name + "."); } }));
    items.push({ id: "back", label: "Back", fn: () => showCommands(u) });
    UI.cmd(items);
  };

  // Turn undead: one attempt per eligible cleric or paladin per battle.
  const turnUndead = (u) => {
    u.turnUsed = true;
    const lvl = u.char.cls === "P" ? u.char.lvl - 2 : u.char.lvl;
    if (lvl < 1) { log(u.name + " has not the skill to turn undead.", "warn"); return showCommands(u); }
    const foes = enemiesOf(u).filter((e) => e.tags.includes("undead") && dist(u, e) <= 6);
    foes.sort((a, b) => dist(u, a) - dist(u, b));
    let affected = 0;
    const roll = Rules.die(20);
    const undeadRank = foes.length ? Math.max(...foes.map((f) => f.rank || 1)) : 1;
    const res = Rules.turnResult(lvl, undeadRank, roll);
    if (res === "turn" || res === "destroy") {
      const count = Math.max(1, Rules.die(6) + Rules.die(6));
      for (const f of foes.slice(0, count)) {
        affected++;
        if (res === "destroy") { f.hp = 0; killUnit(f); } else { f.fled = true; log(f.name + " flees before " + u.name + "'s holy symbol.", "good"); }
      }
    }
    log(u.name + " turns undead: rolled " + roll + " " + (affected ? "and " + affected + " creature(s) are " + (res === "destroy" ? "destroyed" : "turned") + "." : "with no effect."), affected ? "good" : "");
    u.attacksLeft = u.attacksLeft || 0;
    endPlayerTurn();
  };

  // Hide: on success the thief is hidden until it strikes or casts.
  const hide = (u) => {
    const ch = Rules.thief(u.char).hs;
    if (Rules.die(100) <= ch) {
      u.hidden = true;
      log(u.name + " slips into the shadows.", "good");
    } else log(u.name + " fails to hide.", "warn");
    u.moveLeft = 0;
    endPlayerTurn();
  };

  // Lay on hands: paladins, once per rest.
  const doLay = (u, target) => {
    const t = target && target.side === "pc" && (target === u || adjacent(u, target)) ? target : u;
    if (!u.layReady) return;
    const amount = 2 * u.char.lvl;
    t.hp = Math.min(t.maxhp, t.hp + amount);
    if (t.char) t.char.hp = t.hp;
    t.down = t.hp > 0 ? false : t.down;
    t.bleeding = t.hp > 0 ? false : t.bleeding;
    u.layReady = false;
    u.char.layUsed = true;
    log(u.name + " lays on hands on " + t.name + " for " + amount + ".", "good");
    S.mode = null;
    endPlayerTurn();
  };

  const bandage = (u, t) => {
    t.bleeding = false;
    log(u.name + " bandages " + t.name + ". The bleeding stops.", "good");
    u.moveLeft = 0;
    endPlayerTurn();
  };

  // Flee by the edge: the character leaves the battle; allies left down are lost.
  const flee = (u) => {
    if (!(u.x === 0 || u.x === W - 1 || u.y === 0 || u.y === H - 1)) return;
    u.fled = true;
    log(u.name + " slips away by the edge of the field.", "warn");
    endPlayerTurn();
  };

  // Use item: potions, devices (charges in the id), scrolls, books and bandages.
  const useMenu = (u) => {
    const items = [];
    const inv = u.char.inv.slice();
    for (const id of inv) {
      const def = Data.item(id);
      if (!def) continue;
      if (def.type === "p") items.push({ id: "p_" + id, label: def.name, fn: () => drinkPotion(u, id), title: def.desc });
      if (def.type === "d" && Data.charges(id) > 0) items.push({ id: "d_" + id, label: Data.itemName(id), fn: () => useDevice(u, id), title: def.desc });
      if (def.type === "x") items.push({ id: "x_" + id, label: def.name, fn: () => readScroll(u, id), title: def.desc });
    }
    if (!items.length) return log(u.name + " has nothing usable.", "warn");
    items.push({ id: "back", label: "Back", fn: () => showCommands(u) });
    UI.cmd(items.map((i) => ({ id: i.id, label: i.label, title: i.title, fn: i.fn })));
  };
  const consume = (u, id) => {
    const i = u.char.inv.indexOf(id);
    if (i >= 0) u.char.inv.splice(i, 1);
  };
  const drinkPotion = (u, id) => {
    const def = Data.item(id);
    consume(u, id);
    if (def.heal) {
      const n = Rules.dice(def.heal);
      u.hp = Math.min(u.maxhp, u.hp + n);
      u.char.hp = u.hp;
      if (u.hp > 0) { u.down = false; u.bleeding = false; }
      log(u.name + " drinks " + def.name + " and recovers " + n + ".", "good");
    } else if (def.cure) {
      u.char.poison = null;
      log(u.name + " is cured.", "good");
    } else if (def.buff) {
      u.buffs.push({ id: def.buff, rounds: 8 });
      if (def.buff === "heroism") u.heroism = true;
      log(u.name + " feels the effect of " + def.name + ".", "good");
    } else if (def.harm) {
      damage(u, Rules.dice(def.harm), "potion");
    } else if (def.sleep) {
      u.asleep = true;
      log(u.name + " drinks and falls asleep.", "bad");
    }
    u.moveLeft = 0;
    endPlayerTurn();
  };
  const readScroll = (u, id) => {
    const def = Data.item(id);
    const sp = Data.SPELLS[def.spell];
    if (!sp) return;
    const ok = (sp.c === "M" && u.char.cls === "M") || (sp.c === "C" && (u.char.cls === "C" || u.char.cls === "P"));
    if (!ok) return log(u.name + " cannot read that scroll.", "warn");
    consume(u, id);
    log(u.name + " reads " + def.name + ".", "good");
    S.pending = { spell: def.spell, fromScroll: true };
    S.mode = "spell";
    renderLater();
    UI.hint("Choose a target for " + sp.name + ".");
  };
  const useDevice = (u, id) => {
    const base = Data.baseId(id);
    const def = Data.ITEMS[base];
    const left = Data.charges(id);
    if (!left) return log("The device is spent.", "warn");
    const power = Rules.pick(def.powers);
    const idx = u.char.inv.indexOf(id);
    if (idx >= 0) {
      if (left - 1 > 0) u.char.inv[idx] = base + "#" + (left - 1);
      else u.char.inv.splice(idx, 1);
    }
    log(u.name + " uses " + def.name + " (" + (left - 1) + " left).", "good");
    S.pending = { spell: power, fromDevice: true, lvl: u.char.lvl };
    S.mode = "spell";
    renderLater();
    UI.hint("Choose a target for the device's " + Data.SPELLS[power].name + ".");
  };

  // ------------------------------------------------------------ spells ----
  const castableFrom = (u) => (u.mem && u.mem[S.pending.spell] > 0) || S.pending.fromScroll || S.pending.fromDevice;
  const doSpell = (u, t, target) => {
    const sp = Data.SPELLS[S.pending.spell];
    if (!sp) return;
    if (!castableFrom(u)) { log(u.name + " has no copy of that spell ready.", "warn"); S.mode = null; return showCommands(u); }
    const range = sp.range || 0;
    const tgtKind = sp.tgt;
    if (tgtKind === "self" && t) { /* self is the caster */ }
    if (tgtKind === "enemy" || tgtKind === "touch" || tgtKind === "ally") {
      if (!target) return;
      if (tgtKind === "enemy" && target.side === u.side) return;
      if ((tgtKind === "touch" || tgtKind === "ally") && target.side !== u.side) return;
      if (dist(u, target) > Math.max(1, range)) return log("Out of range.", "warn");
    }
    if (tgtKind === "area" || tgtKind === "cone" || tgtKind === "line" || tgtKind === "corpse") {
      if (dist(u, t) > Math.max(1, range)) return log("Out of range.", "warn");
    }
    // Confirm: spend the memorised copy (items and scrolls are already spent).
    if (!S.pending.fromScroll && !S.pending.fromDevice) u.mem[sp.id] = (u.mem[sp.id] || 0) - 1;
    u.hidden = false;
    u.hitThisRound = false;
    applySpell(u, sp, t, target);
    S.mode = null;
    S.pending = null;
    u.moveLeft = 0;
    endPlayerTurn();
  };

  // Resolves a spell by its handler key. Areas hit every unit within the radius.
  const applySpell = (caster, sp, tile, target) => {
    const h = sp.h;
    const lvl = caster.side === "pc" ? Rules.casterLevel(caster.char) : caster.def.cast ? caster.def.cast.lvl : 1;
    const inRadius = (r) => S.units.filter((o) => o.alive && !o.fled && Math.hypot(o.x - tile.x, o.y - tile.y) <= r);
    const save = (o, idx) => Rules.die(20) >= (o.side === "pc" && o.char ? Rules.derive(o.char, Game.G.time).saves[idx] : Rules.saveTarget("warrior", o.def ? Math.max(1, o.def.hd | 0) : 1, idx));
    const say = (t) => log(caster.name + " casts " + sp.name + (t ? ": " + t : "."), "spell");
    const foe = (o) => o.side !== caster.side;
    switch (h) {
      case "missile": {
        const n = Math.min(5, Math.ceil(lvl / 2));
        let total = 0;
        for (let i = 0; i < n; i++) total += Rules.die(4) + 1;
        if (target) damage(target, total, "spell");
        say(total + " damage from magic missiles");
        if (target && target.alive === false) killUnit(target);
        break;
      }
      case "fireball": case "meteor": case "incend": case "flameStrike": case "icestorm": case "cone": case "blade": case "dbfb": case "chain": case "holyWord": case "cloudkill": {
        const r = h === "meteor" ? 2 : h === "cone" ? 2 : h === "icestorm" ? 2 : h === "flameStrike" ? 1.5 : 2.3;
        const dice = h === "fireball" ? Math.min(10, lvl) + "d6" : h === "meteor" ? "2d6" : h === "icestorm" ? "3d6" : h === "flameStrike" ? "6d8" : h === "cone" ? Math.min(lvl, 8) + "d4" : h === "incend" ? "2d6" : h === "cloudkill" ? "2d6" : "6d6";
        const hits = inRadius(r);
        for (const o of hits) {
          if (h === "holyWord") { if (o.tags.includes("undead") || o.tags.includes("demon")) { if (o.def.hd <= lvl) { o.hp = 0; killUnit(o); } else o.held = true; } continue; }
          let d = Rules.dice(dice);
          if (save(o, 4)) d = Math.floor(d / 2);
          if (o.side === "pc" && o.char && o.char.race === "dwarf" && h === "fireball") d = d;
          damage(o, Math.max(1, d), h);
          if (o.alive === false) killUnit(o);
        }
        say("area damage to " + hits.length + " creature(s)");
        break;
      }
      case "bolt": {
        const line = lineTiles(caster, tile).slice(0, 8);
        const hits = [];
        for (const [x, y] of line) {
          const o = unitAt(x, y);
          if (o && o.alive) hits.push(o);
          if (S.obstacles.has(x + "," + y)) break;
        }
        for (const o of hits) damage(o, Math.max(1, Rules.dice(Math.min(lvl, 10) + "d6")), "bolt");
        say("the bolt strikes " + hits.length);
        break;
      }
      case "sleep": {
        let pool = Rules.dice("2d4") * (lvl >= 5 ? 2 : 1);
        const picks = inRadius(2).filter((o) => o.alive && o.tags.indexOf("undead") < 0 && !(o.side === "pc" && o.char && o.char.race === "elf" && Rules.die(100) <= Rules.RACE_FX.elf.sleepRes));
        picks.sort((a, b) => (a.hp - b.hp));
        for (const o of picks) {
          if (pool <= 0) break;
          const hd = o.side === "mon" ? Math.ceil(o.def.hd) : o.char.lvl;
          if (hd <= pool) { o.asleep = true; pool -= hd; log(o.name + " falls asleep.", "good"); }
        }
        say("a drowsy cloud");
        break;
      }
      case "hold": case "holdmon": case "petrify": case "finger": case "slayLiving": case "destruction": case "death": {
        const o = target || (tile ? unitAt(tile.x, tile.y) : null);
        if (!o || o.side === caster.side) break;
        if (h === "death" || h === "finger" || h === "destruction") {
          if (!save(o, 4)) { o.hp = 0; killUnit(o); say(o.name + " dies"); } else say(o.name + " resists");
        } else if (h === "slayLiving") {
          if (!o.tags.includes("undead") && !save(o, 4)) { o.hp = 0; killUnit(o); say(o.name + " is slain"); } else say("no effect");
        } else if (h === "petrify") {
          if (!save(o, 2)) { o.held = true; log(o.name + " turns to stone.", "good"); }
        } else {
          if (!save(o, 0)) { o.held = true; log(o.name + " is held.", "good"); } else say(o.name + " resists");
        }
        break;
      }
      case "pwstun": case "pwblind": case "pwkill": {
        const o = target;
        if (!o || o.side === caster.side) break;
        const hp = o.hp;
        if (h === "pwkill" && hp <= 100) { o.hp = 0; killUnit(o); say(o.name + " is struck down"); }
        if (h === "pwstun" && hp <= 150) { o.held = true; say(o.name + " is stunned"); }
        if (h === "pwblind" && hp <= 100) { o.blind = 3; say(o.name + " is blinded"); }
        break;
      }
      case "heal1": case "heal2": case "heal3": case "heal4": {
        const o = target || caster;
        const dice = h === "heal1" ? "1d8" : h === "heal2" ? "2d8+1" : h === "heal3" ? "3d8+3" : null;
        if (!o) break;
        const n = dice ? Rules.dice(dice) : o.maxhp - Rules.dice("1d4");
        o.hp = Math.min(o.maxhp, o.hp + n);
        if (o.hp > 0) { o.down = false; o.bleeding = false; }
        if (o.char) o.char.hp = o.hp;
        say(o.name + " is healed for " + n);
        break;
      }
      case "causeLight": case "causeSerious": case "causeCrit": case "harm": case "acid": case "disintegrate": {
        const o = target;
        if (!o || o.side === caster.side) break;
        if (o.undead && h !== "harm") break;
        const dice = h === "causeLight" ? "1d8" : h === "causeSerious" ? "2d8" : h === "causeCrit" ? "3d8+3" : h === "harm" ? "" : h === "acid" ? "2d4" : "10d6";
        if (h === "harm") { o.hp = Math.min(o.hp, Rules.die(4)); if (o.hp <= 0) killUnit(o); say(o.name + " is harmed"); break; }
        if (h === "disintegrate" && o.hp <= 0) break;
        damage(o, Rules.dice(dice), h);
        if (o.alive === false) killUnit(o);
        say(o.name + " is harmed");
        break;
      }
      case "mstone": case "command": case "fear1": case "fear": case "scare": case "colorSpray": case "web": case "blind": case "silence": case "strength": case "knock": case "slowPoison": {
        const o = target;
        if (!o || o.side === caster.side) { say("no target"); break; }
        if (h === "command") { if (!save(o, 0)) { o.fleeing = true; o.fled = true; say(o.name + " halts and flees"); } break; }
        if (h === "web") { if (!save(o, 3)) { o.held = true; say(o.name + " is entangled"); } break; }
        if (h === "blind") { if (!save(o, 2)) { o.blind = 3; say(o.name + " is blinded"); } break; }
        if (h === "fear1" || h === "scare" || h === "fear") { if (!save(o, 4)) { o.fled = true; say(o.name + " flees in terror"); } break; }
        if (h === "colorSpray") { if (!save(o, 4)) { o.held = true; say(o.name + " is stunned"); } break; }
        damage(o, Rules.dice("1d4"), "stone");
        if (o.alive === false) killUnit(o);
        say(o.name + " is hit");
        break;
      }
      case "bless": case "prayer": {
        for (const o of inRadius(4)) {
          if (o.side === caster.side) o.blessed = true;
          else if (h === "prayer") o.cursed = true;
        }
        say("the company is blessed");
        break;
      }
      case "pfe": case "pfe10": case "vestment": case "armorSpell": case "shieldSpell": case "stoneskin": case "mirror": case "invis": case "resistFC": case "freeAction": case "aid": case "haste": case "slow": case "removePara": case "cureBlind": case "neutralize": case "causeBlind": case "silence2": {
        const o = target || caster;
        if (h === "removePara") { o.held = false; o.asleep = false; say(o.name + " can move"); break; }
        if (h === "cureBlind") { o.blind = 0; say(o.name + " can see"); break; }
        if (h === "neutralize") { if (o.char) o.char.poison = null; say(o.name + " is cured of venom"); break; }
        if (h === "causeBlind") { if (!save(o, 2)) o.blind = 3; break; }
        if (h === "aid") { o.tempHP = (o.tempHP || 0) + Rules.die(8); o.aided = true; say(o.name + " is aided"); break; }
        if (h === "haste") { o.hasted = 3; say(o.name + " is hastened"); break; }
        if (h === "slow") { for (const v of inRadius(4)) if (v.hasted) v.hasted = 0; say("the haste is undone"); break; }
        if (h === "armorSpell") { o.armorBonus = 4; say(o.name + " is armoured"); break; }
        if (h === "shieldSpell") { o.shieldBonus = 2; say(o.name + " is shielded"); break; }
        if (h === "stoneskin") { o.stoneskin = 2; say(o.name + " is stone-skinned"); break; }
        if (h === "mirror") { o.images = 3; say(o.name + " has images"); break; }
        if (h === "invis") { o.hidden = true; say(o.name + " vanishes"); break; }
        if (h === "freeAction") { o.freeAction = true; say(o.name + " is free"); break; }
        say(o.name + " is protected");
        break;
      }
      case "dispel": case "dispelEvil": {
        for (const v of inRadius(3)) {
          if (h === "dispelEvil" && v.side !== "mon") continue;
          if (h === "dispelEvil" && !v.tags.some((t) => ["undead", "demon", "devil", "witch"].includes(t))) continue;
          v.held = false;
          v.hasted = 0;
          v.fled = false;
          v.blind = 0;
          if (h === "dispelEvil" && v.side === "mon" && v.tags.includes("undead") && v.def.hd <= lvl) { v.hp = 0; killUnit(v); }
        }
        say("magic is dispelled");
        break;
      }
      case "vampiric": {
        const o = target;
        if (!o || o.side === caster.side) break;
        const n = Rules.die(6) + Math.floor(lvl / 2);
        damage(o, n, "drain");
        caster.hp = Math.min(caster.maxhp, caster.hp + n);
        if (caster.char) caster.char.hp = caster.hp;
        say("drains " + n);
        break;
      }
      case "blade": {
        for (const o of inRadius(2)) damage(o, Rules.dice("4d6"), "blade");
        say("a wall of blades");
        break;
      }
      case "web": break;
      case "cloud": case "stink": { for (const o of inRadius(2.5)) if (!save(o, 0)) o.held = true; say("a stinking cloud"); break; }
      case "silenceZone": break;
      case "corpse": case "raise": case "resurrect": { say("the rite is for camp and temple"); break; }
      default: {
        say("its effect is quiet here");
        break;
      }
    }
    // Any spell cast ends the caster's hidden state.
    if (caster.hidden) caster.hidden = false;
    caster.spellsCastRound = S.round;
    renderLater();
    void foe;
  };
  const lineTiles = (from, to) => {
    const out = [];
    const dx = Math.sign(to.x - from.x), dy = Math.sign(to.y - from.y);
    let x = from.x + dx, y = from.y + dy;
    for (let i = 0; i < 10 && inside(x, y); i++) {
      out.push([x, y]);
      x += dx;
      y += dy;
    }
    return out;
  };

  // ----------------------------------------------------- monster & auto AI ----
  const aiTurn = async (u) => {
    if (!u.alive || u.fled || u.asleep || u.held) {
      if (u.held && u.side === "pc") { log(u.name + " is held.", "warn"); }
      await pause(120);
      return;
    }
    if (u.side === "pc") {
      // Auto-battle: a simple policy that moves and strikes the nearest foe.
      const foes = enemiesOf(u).filter((e) => e.alive && !e.fled);
      if (!foes.length) return;
      foes.sort((a, b) => dist(u, a) - dist(u, b));
      const f = foes[0];
      u.attacksLeft = u.attacksLeft || 1;
      if (u.char && u.char.cls === "M" && u.mem && Object.keys(u.mem).some((id) => u.mem[id] > 0 && Data.SPELLS[id] && Data.SPELLS[id].h === "missile") && dist(u, f) <= 9) {
        S.pending = { spell: "magic_missile" };
        doSpell(u, { x: f.x, y: f.y }, f);
        S.pending = null;
        return;
      }
      if (adjacent(u, f)) {
        meleeAttack(u, f, {});
        return;
      }
      stepToward(u, f);
      if (adjacent(u, f) && u.alive) meleeAttack(u, f, {});
      return;
    }
    // Monster policy: cast if able, shoot if able, else close and strike.
    const pcs = S.units.filter((o) => o.side === "pc" && o.alive && !o.fled && !o.hidden);
    if (!pcs.length) return;
    pcs.sort((a, b) => dist(u, a) - dist(u, b));
    const target = pcs[0];
    if (u.cast && u.cast.spells.length && dist(u, target) <= 9 && Rules.die(100) <= 40) {
      const sid = Rules.pick(u.cast.spells);
      const sp = Data.SPELLS[sid];
      if (sp && sp.tgt !== "self") {
        const caster = u;
        const tile = { x: target.x, y: target.y };
        applySpell(caster, sp, tile, target);
        await pause(160);
        return;
      }
    }
    if (u.rng && dist(u, target) >= 2 && dist(u, target) <= 3 * u.rng.range[1]) {
      const r = rollHit(u, target, 0);
      const dmg = Math.max(1, Rules.dice(u.rng.dmg));
      if (r.hit) { log(u.name + " shoots " + target.name + " for " + dmg + ".", "bad"); damage(target, dmg, "shot"); }
      else log(u.name + " misses with a shot.", "");
      await pause(140);
      return;
    }
    if (adjacent(u, target)) {
      monsterBlows(u, target);
      await pause(140);
      return;
    }
    stepToward(u, target);
    await pause(120);
    const near = pcs.find((p) => p.alive && adjacent(u, p));
    if (near) {
      monsterBlows(u, near);
      await pause(120);
    }
  };
  // Moves one unit along the reach map toward a target.
  const stepToward = (u, target) => {
    const r = reach(Object.assign({}, u, { moveAllow: u.moveAllow }));
    let best = null, bestD = 1e9;
    r.forEach((v, k) => {
      const [x, y] = k.split(",").map(Number);
      const d = Math.max(Math.abs(x - target.x), Math.abs(y - target.y));
      if (d < bestD || (d === bestD && v.c < best.c)) { bestD = d; best = { x, y, c: v.c }; }
    });
    if (best) {
      provokeFrom(u, best.x, best.y);
      if (u.alive) {
        u.x = best.x;
        u.y = best.y;
        log(u.name + " moves in.", "");
        renderLater();
      }
    }
  };

  const pause = (ms) => new Promise((res) => setTimeout(res, ms));

  // ------------------------------------------------------------- keys ----
  CB.key = (e) => {
    if (!S) return false;
    const k = e.key;
    const lk = k.length === 1 ? k.toLowerCase() : k;
    if (!S.turnUnit) return false;
    const u = S.turnUnit;
    const dirs = { w: [0, -1], ArrowUp: [0, -1], s: [0, 1], ArrowDown: [0, 1], a: [-1, 0], ArrowLeft: [-1, 0], d: [1, 0], ArrowRight: [1, 0] };
    if (dirs[k] || dirs[lk]) {
      const [dx, dy] = dirs[k] || dirs[lk];
      const nx = u.x + dx, ny = u.y + dy;
      const t = unitAt(nx, ny);
      if (t && t.side !== u.side && u.attacksLeft > 0) doAttack(u, t);
      else if (!t && S.reach && S.reach.has(nx + "," + ny)) doMove(u, { x: nx, y: ny });
      return true;
    }
    if (lk === " " || lk === "enter") { endPlayerTurn(); return true; }
    if (lk === "escape") { if (S.mode) { S.mode = null; S.pending = null; renderLater(); showCommands(u); } return true; }
    if (lk === "c") { castMenu(u); return true; }
    if (lk === "t") { if ((u.char.cls === "C" || u.char.cls === "P") && !u.turnUsed) turnUndead(u); return true; }
    if (lk === "h") { if (u.char.cls === "T") hide(u); return true; }
    if (lk === "u") { useMenu(u); return true; }
    if (lk === "q") { S.auto = true; endPlayerTurn(); return true; }
    if (lk === "p") { UI.openSheet && UI.openSheet(u.key); return true; }
    return true;
  };

  // ------------------------------------------------------------ drawing ----
  const renderLater = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      draw();
    });
  };
  const floorColor = (x, y) => {
    const a = (x + y) % 2 ? 1 : 0.92;
    const k = S.obstacleKind || "dungeon";
    if (/forest|trees/.test(k)) return ["#3e6b3d", "#4a7a48"][a === 1 ? 0 : 1];
    if (/village|street/.test(k)) return ["#8a7d68", "#7e7260"][a === 1 ? 0 : 1];
    if (/hill|rock|road|plain|grass/.test(k)) return ["#6b7a4d", "#647346"][a === 1 ? 0 : 1];
    if (/crypt|barrow|cellar|dungeon|keep|sanctum|pit/.test(k)) return ["#4d4c55", "#46454e"][a === 1 ? 0 : 1];
    return ["#55504a", "#4c4742"][a === 1 ? 0 : 1];
  };
  const draw = () => {
    if (!S || !canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth || 800, ch = canvas.clientHeight || 500;
    if (canvas.width !== Math.round(cw * dpr)) canvas.width = Math.round(cw * dpr);
    if (canvas.height !== Math.round(ch * dpr)) canvas.height = Math.round(ch * dpr);
    const hw = Math.min((canvas.width * 0.94) / (W + H), (canvas.height * 0.94) * 2 / (W + H));
    geom = { hw, hh: hw / 2, ox: canvas.width / 2 - ((W - H) * hw) / 2, oy: (canvas.height - (W + H) * (hw / 2)) / 2 };
    g.fillStyle = "#0d0e13";
    g.fillRect(0, 0, canvas.width, canvas.height);
    // Tiles.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const { sx, sy } = toScreen(x, y);
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(sx + geom.hw, sy + geom.hh);
      g.lineTo(sx, sy + 2 * geom.hh);
      g.lineTo(sx - geom.hw, sy + geom.hh);
      g.closePath();
      g.fillStyle = floorColor(x, y);
      g.fill();
      g.strokeStyle = "rgba(0,0,0,0.25)";
      g.lineWidth = 1;
      g.stroke();
      if (S.reach && S.mode === "move" && S.reach.has(x + "," + y)) {
        g.fillStyle = "rgba(90,140,255,0.35)";
        g.fill();
      }
      if (S.mode === "attack" && S.turnUnit) {
        const t = unitAt(x, y);
        if (t && t.side !== S.turnUnit.side && (adjacent(S.turnUnit, t) || S.turnUnit.char && S.turnUnit.char.eq.missile)) {
          g.fillStyle = "rgba(220,60,60,0.35)";
          g.fill();
        }
      }
      if (S.mode === "spell" && S.pending) {
        const sp = Data.SPELLS[S.pending.spell];
        if (sp && (sp.tgt === "area" || sp.tgt === "cone" || sp.tgt === "line") && S.turnUnit && dist(S.turnUnit, { x, y }) <= (sp.range || 1)) {
          g.fillStyle = "rgba(170,120,255,0.25)";
          g.fill();
        }
      }
      if (S.active === unitAt(x, y)) {
        g.fillStyle = "rgba(255,210,122,0.25)";
        g.fill();
      }
    }
    // Obstacles and units, depth-sorted back to front.
    const things = [];
    for (const k of S.obstacles) {
      const [x, y] = k.split(",").map(Number);
      things.push({ depth: x + y, draw: () => drawObstacle(x, y) });
    }
    for (const u of S.units) {
      if (!u.alive && u.side === "mon") continue;
      if (u.fled) continue;
      if (u.hidden && u.side === "pc") {
        // Hidden thieves show as a faint shape on their own side only.
      }
      things.push({ depth: u.x + u.y, draw: () => drawUnit(u) });
    }
    things.sort((a, b) => a.depth - b.depth);
    for (const t of things) t.draw();
    // Floating numbers.
    const now = performance.now();
    S.floaters = S.floaters.filter((f) => now - f.t0 < 900);
    for (const f of S.floaters) {
      const { sx, sy } = toScreen(f.u.x, f.u.y);
      const age = (now - f.t0) / 900;
      g.fillStyle = f.color;
      g.font = "bold " + Math.max(14, Math.floor(geom.hw * 0.45)) + "px Georgia, serif";
      g.textAlign = "center";
      g.globalAlpha = 1 - age;
      g.fillText(f.text, sx, sy - geom.hh * 2 - age * 20);
      g.globalAlpha = 1;
    }
    if (S.floaters.length) renderLater();
    // Round banner.
    g.fillStyle = "rgba(233,226,207,0.9)";
    g.font = Math.max(12, Math.floor(canvas.height * 0.035)) + "px Georgia, serif";
    g.textAlign = "left";
    g.fillText("Round " + S.round + (S.turnUnit ? "  —  " + S.turnUnit.name : ""), 12, 22);
    if (S.auto) { g.fillStyle = "#e3b54a"; g.fillText("AUTO-BATTLE (Esc to stop)", 12, 44); }
  };
  const drawObstacle = (x, y) => {
    const { sx, sy } = toScreen(x, y);
    g.fillStyle = "#6a6457";
    g.beginPath();
    g.moveTo(sx - geom.hw * 0.5, sy + geom.hh * 0.3);
    g.lineTo(sx, sy - geom.hh * 0.2);
    g.lineTo(sx + geom.hw * 0.5, sy + geom.hh * 0.3);
    g.lineTo(sx + geom.hw * 0.5, sy + geom.hh * 1.2);
    g.lineTo(sx, sy + geom.hh * 1.7);
    g.lineTo(sx - geom.hw * 0.5, sy + geom.hh * 1.2);
    g.closePath();
    g.fill();
  };
  const drawUnit = (u) => {
    const { sx, sy } = toScreen(u.x, u.y);
    const h = geom.hw * (u.size === "L" ? 2.4 : u.size === "S" ? 1.6 : 2);
    const alpha = u.hidden && u.side === "pc" ? 0.4 : u.alive ? 1 : 0.35;
    const flip = u.side === "mon";
    const desc = u.side === "pc" ? u.fig : u.fig;
    Figs.draw(g, desc, sx, sy + geom.hh * 1.5, h, { alpha, flip, hurt: u.hurt, down: u.down });
    if (u.down) { g.fillStyle = "#ff7a4a"; g.font = Math.max(10, geom.hw * 0.3) + "px Georgia, serif"; g.textAlign = "center"; g.fillText("down", sx, sy + geom.hh * 1.9); }
    // Hit point bar.
    const bw = geom.hw * 0.9;
    const frac = Math.max(0, Math.min(1, u.hp / u.maxhp));
    g.fillStyle = "rgba(0,0,0,0.6)";
    g.fillRect(sx - bw / 2, sy - geom.hh * 0.6, bw, 4);
    g.fillStyle = u.side === "pc" ? "#5fbf6a" : "#d86a5a";
    g.fillRect(sx - bw / 2, sy - geom.hh * 0.6, bw * frac, 4);
    if (S.turnUnit === u) {
      g.strokeStyle = "#ffd27a";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(sx - geom.hw * 0.5, sy + geom.hh);
      g.lineTo(sx, sy + geom.hh * 0.2);
      g.lineTo(sx + geom.hw * 0.5, sy + geom.hh);
      g.stroke();
    }
  };

  // Shows the caller's battle screen state after an exit. Used by UI.
  CB.state = () => S;

  return CB;
})();
