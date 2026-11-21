"use strict";
/*
 * Game: owns the persistent state G, the current exploration runtime X, the
 * world clock, map access (base grid plus saved overrides), movement and
 * bumps, authored events, traps, locks, searching, resting, combat results,
 * saves and global input. Presentation lives in UI, View3D and the overland
 * and combat modules; this file decides what happens.
 */
const Game = (() => {
  const Gm = {};
  Gm.G = null;
  Gm.X = null;
  Gm.mode = "title";
  Gm.busy = false;
  Gm.pendingKey = null;
  const SAVE_PREFIX = "emberfall.save.";
  const SLOT_KEYS = ["auto", "1", "2", "3"];
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const OPAQUE = (c) => c === "#" || c === "H" || c === "B" || c === "S" || c === "D" || c === "L" || c === "G" || (c >= "1" && c <= "9");
  const SOLID = (c) => OPAQUE(c) || c === "T" || c === "F";

  // ------------------------------------------------------------ state ----
  Gm.newState = (modId) => {
    const mod = Modules.MODULES[modId];
    const hub = Data.MAPS[mod.hub];
    return {
      v: 2, module: modId, done: [], won: false, roster: [], party: [], gold: mod.gold,
      map: hub.id, x: hub.start.x, y: hub.start.y, dir: hub.start.dir,
      time: 480, march: 0, flags: {}, mods: {}, seen: {}, quests: {}, ground: {},
      journal: [], bestiary: {}, rumors: {}, stash: {}, meta: {}, poisonWarn: 0,
    };
  };
  Gm.dirName = (d) => ["north", "east", "south", "west"][((d % 4) + 4) % 4];
  Gm.clock = (t) => {
    const day = Math.floor(t / 1440) + 1;
    const mins = t % 1440;
    const hh = String(Math.floor(mins / 60)).padStart(2, "0");
    const mm = String(mins % 60).padStart(2, "0");
    return { day, text: "Day " + day + " " + hh + ":" + mm, hour: Math.floor(mins / 60), mins };
  };
  Gm.isNight = (t) => {
    const h = Gm.clock(t).hour;
    return h < 5 || h >= 20;
  };
  Gm.flag = (k) => !!(Gm.G && Gm.G.flags[k]);
  Gm.setFlag = (k, v = true) => { if (Gm.G) Gm.G.flags[k] = v; };
  Gm.chars = () => (Gm.G ? Gm.G.roster : []);
  Gm.charById = (id) => (Gm.G ? Gm.G.roster.find((c) => c.id === id) || null : null);
  Gm.party = () => (Gm.G ? Gm.G.party.map((id) => Gm.charById(id)).filter(Boolean) : []);
  Gm.conscious = () => Gm.party().filter((c) => !c.dead && c.hp > 0);
  Gm.alive = () => Gm.party().filter((c) => !c.dead);
  Gm.advance = (mins) => {
    if (!Gm.G || mins <= 0) return;
    const before = Gm.G.time;
    Gm.G.time += mins;
    Gm.G.march += mins;
    // Timed effects tick.
    for (const c of Gm.G.roster) {
      if (c.fx && c.fx.str && c.fx.str.until <= Gm.G.time) c.fx.str = null;
      if (c.fx && c.fx.buffs) c.fx.buffs = c.fx.buffs.filter((b) => b.until > Gm.G.time);
      if (c.poison && c.poison.at <= Gm.G.time && !c.dead) {
        c.poison = null;
        c.hp = Math.max(0, c.hp - Rules.die(6) - 2);
        Gm.log(c.name + " feels the venom take hold: hit points are at " + c.hp + ".", "bad");
        if (c.hp <= 0) Gm.downChar(c);
      }
    }
    if (Math.floor(before / 600) !== Math.floor(Gm.G.time / 600) && Gm.G.march >= 600 && Gm.G.march - mins < 600) {
      Gm.log("The party is weary from marching for ten hours. Rest soon.", "warn");
    }
  };
  Gm.downChar = (c) => {
    c.hp = Math.min(0, c.hp);
    Gm.log(c.name + " falls.", "bad");
    UI.refreshParty();
  };

  // -------------------------------------------------------- map access ----
  Gm.mapDef = (id) => Data.MAPS[id] || null;
  Gm.mods = (mapId) => {
    const m = Gm.G.mods;
    if (!m[mapId]) m[mapId] = {};
    return m[mapId];
  };
  Gm.baseCell = (map, x, y) => {
    if (map.overland) {
      if (y < 0 || y >= map.grid.length || x < 0 || x >= map.grid[0].length) return "^";
      return map.grid[y][x];
    }
    if (y < 0 || y >= map.grid.length || x < 0 || x >= map.grid[0].length) return "#";
    return map.grid[y][x];
  };
  // Effective cell: base grid unless a saved override applies.
  Gm.cellAt = (mapId, x, y) => {
    const map = Gm.mapDef(mapId);
    if (!map) return "#";
    const o = Gm.G && Gm.G.mods[mapId] ? Gm.G.mods[mapId][x + "," + y] : undefined;
    if (o !== undefined) return o;
    return Gm.baseCell(map, x, y);
  };
  Gm.setCell = (mapId, x, y, ch) => {
    Gm.mods(mapId)[x + "," + y] = ch;
  };
  // An authored event at a cell, or null.
  Gm.eventAt = (map, x, y) => {
    const ch = Gm.cellAt(map.id, x, y);
    if (!map.ev || !map.ev[ch]) return null;
    return { letter: ch, ev: map.ev[ch] };
  };
  // A set battle still standing on its tile.
  Gm.liveEnc = (map, letter) => {
    const ev = map.ev && map.ev[letter];
    return !!(ev && ev.enc && !Gm.flag(map.id + ":" + letter));
  };
  Gm.seenMask = (mapId, w, h) => {
    const cur = Gm.G.seen[mapId];
    if (cur && cur.length === w * h) return cur;
    const fresh = "0".repeat(w * h);
    Gm.G.seen[mapId] = fresh;
    return fresh;
  };
  Gm.setSeen = (mapId, w, h, x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const s = Gm.seenMask(mapId, w, h);
    const i = y * w + x;
    if (s[i] === "1") return;
    Gm.G.seen[mapId] = s.slice(0, i) + "1" + s.slice(i + 1);
  };
  Gm.isSeen = (mapId, w, h, x, y) => {
    const s = Gm.G.seen[mapId];
    return !!(s && s.length === w * h && s[y * w + x] === "1");
  };
  // Reveal a 3x3 around the party and a cone of seven cells ahead, stopping at opaque cells.
  Gm.reveal = (map) => {
    const w = map.grid[0].length, h = map.grid.length;
    const { x, y, dir } = Gm.G;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) Gm.setSeen(map.id, w, h, x + ox, y + oy);
    const [dx, dy] = DIRS[dir];
    const [px, py] = [-dy, dx];
    for (let k = 1; k <= 7; k++) {
      const cx = x + dx * k, cy = y + dy * k;
      Gm.setSeen(map.id, w, h, cx, cy);
      Gm.setSeen(map.id, w, h, cx + px, cy + py);
      Gm.setSeen(map.id, w, h, cx - px, cy - py);
      if (OPAQUE(Gm.cellAt(map.id, cx, cy))) break;
    }
  };

  // ---------------------------------------------------------- logging ----
  Gm.log = (text, cls) => {
    UI.log(text, cls);
    if (Gm.G) {
      // Journal notes are kept separately; the log is transient.
    }
  };
  Gm.note = (text, mod) => {
    if (!Gm.G) return;
    const t = Gm.clock(Gm.G.time).text;
    const m = mod || Gm.G.module;
    const dup = Gm.G.journal.some((n) => n.text === text && n.mod === m);
    if (!dup) Gm.G.journal.push({ t: Gm.G.time, mod: m, text });
  };

  // --------------------------------------------------------- entering ----
  // Puts the party on a map at a cell, refreshes the view and runs arrival checks.
  Gm.enter = (mapId, x, y, dir, opts = {}) => {
    const map = Gm.mapDef(mapId);
    if (!map) throw new Error("No such map: " + mapId);
    Gm.G.map = mapId;
    Gm.G.x = x;
    Gm.G.y = y;
    Gm.G.dir = dir;
    Gm.X = {
      mapId, map, anim: null, queue: null, busy: false,
      sighted: {}, unaware: {}, hold: 0, lastPos: null, visits: {},
    };
    if (map.overland) {
      Over.enter(mapId, x, y, dir);
      Gm.setMode("wild");
    } else {
      Gm.setMode("local");
      Gm.reveal(map);
      if (!opts.silent) Gm.arrive(opts);
    }
    Gm.redraw();
    if (opts.reason !== "load") Gm.autosave(opts.reason || null);
    UI.refreshHUD();
  };

  // Arrival sequence on a local map. Stairs never fire here, so arrival cannot loop.
  Gm.arrive = (opts = {}) => {
    const map = Gm.X.map;
    const { x, y } = Gm.G;
    if (opts.intro && Modules.MODULES[Gm.G.module]) {
      // Intro text is shown by the caller when a module begins.
    }
    // Elven and half-elven notice of secret doors happens on arrival.
    Gm.passiveDiscovery();
    // Trap underfoot (only ones not yet found).
    const trap = Gm.trapAt(map, x, y);
    if (trap && !Gm.flag("trap:" + map.id + ":" + x + "," + y)) Gm.triggerTrap(map, trap, true);
    // Ground pile here.
    Gm.showGroundHere();
    // Set-piece watch and the letter event under the feet.
    if (Gm.eventAtFeet()) Gm.stepEvent();
    Gm.runWatch();
    Gm.describeAhead();
  };

  Gm.passiveDiscovery = () => {
    const map = Gm.X.map;
    const elves = Gm.conscious().filter((c) => c.race === "elf" || c.race === "half-elf");
    if (!elves.length) return;
    const { x, y, dir } = Gm.G;
    const [dx, dy] = DIRS[dir];
    const ahead = [[x + dx, y + dy]];
    for (const [cx, cy] of ahead) {
      if (Gm.cellAt(map.id, cx, cy) === "S" && Rules.die(6) === 1) {
        Gm.discoverSecret(map, cx, cy);
      }
    }
  };
  Gm.discoverSecret = (map, cx, cy) => {
    Gm.setCell(map.id, cx, cy, "D");
    Gm.log("A secret door is revealed.", "good");
    Gm.note("Found a secret door in " + map.name + ".", null);
    Gm.autosave("secret");
    Gm.redraw();
  };

  // Describe what is directly ahead, in the HUD and the command hint.
  Gm.describeAhead = () => {
    const map = Gm.X && Gm.X.map;
    if (!map || map.overland) return;
    const { x, y, dir } = Gm.G;
    const [dx, dy] = DIRS[dir];
    const c = Gm.cellAt(map.id, x + dx, y + dy);
    let text = "";
    if (c === "#" || c === "H" || c === "B") text = "A wall.";
    else if (c === "D") text = "An open-able door ahead.";
    else if (c === "L") text = "A locked door.";
    else if (c === "S") text = "A blank wall.";
    else if (c >= "1" && c <= "9") text = (map.svc[c] ? map.svc[c].name : "A service door") + ".";
    else if (c === "G") text = "The town gate.";
    else if (c === "<") text = "Stairs leading up.";
    else if (c === ">") text = "Stairs leading down.";
    else if (map.ev && map.ev[c]) text = Gm.liveEnc(map, c) ? "A band of " + Gm.bandName(map.ev[c].enc) + " stands ahead." : "An interesting spot.";
    else if (c === "T" || c === "F") text = c === "T" ? "A tree blocks the way." : "A fountain.";
    else text = "The street continues.";
    UI.hint(text);
    Gm.G.meta.ahead = text;
  };

  Gm.bandName = (enc) => {
    const parts = (enc.mons || []).map((m) => (Data.monster(m[0]) ? Data.monster(m[0]).plural : m[0]));
    return parts.join(" and ");
  };

  // ------------------------------------------------------------- moves ----
  Gm.canAnimate = () => Gm.X && !Gm.X.busy && Gm.mode === "local";
  Gm.turn = (d) => {
    if (!Gm.X || Gm.X.busy) return;
    if (Gm.X.anim) { Gm.X.queue = { kind: "turn", d }; return; }
    Gm.G.dir = (Gm.G.dir + d + 4) % 4;
    Gm.animateTo(Gm.G.x, Gm.G.y, Gm.G.dir, 140);
    Gm.describeAhead();
  };
  Gm.strafe = (side) => {
    if (!Gm.X || Gm.X.busy) return;
    const [dx, dy] = DIRS[Gm.G.dir];
    const sx = side > 0 ? -dy : dy;
    const sy = side > 0 ? dx : -dx;
    Gm.tryMove(sx, sy, true);
  };
  Gm.stepForward = (back = false) => {
    if (!Gm.X || Gm.X.busy) return;
    const [dx, dy] = DIRS[Gm.G.dir];
    Gm.tryMove(back ? -dx : dx, back ? -dy : dy, false);
  };
  Gm.tryMove = (dx, dy, strafe) => {
    if (Gm.X.anim) { Gm.X.queue = { kind: "move", dx, dy, strafe }; return; }
    const map = Gm.X.map;
    const nx = Gm.G.x + dx, ny = Gm.G.y + dy;
    const c = Gm.cellAt(map.id, nx, ny);
    // Doors are walkable.
    if (SOLID(c) || c === "#" || c === "S" || c === "L" || c === "G" || (c >= "1" && c <= "9")) {
      return Gm.bump(nx, ny, c, map);
    }
    // Live set battles block their tile; a bump challenges them.
    const ev = map.ev && map.ev[c];
    if (ev && ev.enc && Gm.liveEnc(map, c)) return Gm.challenge(c, ev, nx, ny);
    // Walk.
    Gm.G.x = nx;
    Gm.G.y = ny;
    Gm.animateTo(nx, ny, Gm.G.dir, 170);
    Gm.afterStep(strafe);
  };
  Gm.afterStep = (strafe) => {
    const map = Gm.X.map;
    const { x, y } = Gm.G;
    // Stairs change maps immediately.
    const link = map.links && map.links[x + "," + y];
    if (link && link.kind === "stair") {
      Gm.advance(1);
      Gm.useLink(link);
      return;
    }
    Gm.advance(1);
    Gm.reveal(map);
    // Traps underfoot (unknown ones trigger).
    const trap = Gm.trapAt(map, x, y);
    if (trap && !Gm.flag("trap:" + map.id + ":" + x + "," + y)) {
      Gm.triggerTrap(map, trap, false);
    }
    // Events underfoot.
    if (Gm.eventAtFeet()) Gm.stepEvent();
    // Ground piles.
    Gm.showGroundHere();
    Gm.runWatch();
    Gm.wanderCheck();
    Gm.redraw();
    UI.refreshHUD();
    Gm.describeAhead();
    Gm.autosaveIfDue();
  };

  Gm.useLink = (link) => {
    const to = link.to;
    Gm.log("You take the " + (link.label || "stair") + ".", "");
    Gm.enter(to.map, to.x, to.y, to.dir, { reason: link.kind === "gate" ? "gate" : "stair" });
  };

  // Bumping: forward into a wall, door, lock, gate, service or live band.
  Gm.bump = (nx, ny, c, map) => {
    if (c === "L") return Gm.lockedDoor(map, nx, ny);
    if (c === "G") return Gm.gatePrompt(map, nx, ny);
    if (c >= "1" && c <= "9" && map.svc && map.svc[c]) {
      Gm.log("You knock at " + map.svc[c].name + ".", "");
      return Campaign.serviceFor(map, c);
    }
    if (c === "S") {
      Gm.log("A blank wall.", "");
      return;
    }
    if (c === "T" || c === "F") return Gm.log(c === "T" ? "A tree blocks the way." : "The fountain is in the way.", "");
    if (map.ev && map.ev[c] && map.ev[c].enc && Gm.liveEnc(map, c)) return Gm.challenge(c, map.ev[c], nx, ny);
    Gm.log("A wall blocks the way.", "");
  };

  Gm.gatePrompt = async (map, nx, ny) => {
    const link = map.links && map.links[nx + "," + ny];
    if (!link) return Gm.log("The gate is shut.", "");
    if (link.requires && !Gm.flag("q:" + link.requires)) return Gm.log("The gate will not open yet.", "warn");
    const ok = await UI.confirm("Leave " + map.name + " through the " + (link.label || "gate") + " for " + (link.gate || "the road") + "?", "Leave", "Stay");
    if (ok) Gm.useLink(link);
  };

  Gm.lockedDoor = async (map, nx, ny) => {
    const lock = (map.locks && map.locks["" + nx + "," + ny]) || { key: null, text: "The door is locked." };
    const opts = [];
    const haveKey = lock.key && Gm.G.party.some((id) => Gm.charById(id) && Gm.charById(id).inv.includes(lock.key));
    const keyHolder = lock.key ? Gm.party().find((c) => c.inv.includes(lock.key)) : null;
    if (haveKey && keyHolder) opts.push({ id: "key", label: "Use the key (" + Data.itemName(lock.key) + ")", primary: true });
    const thieves = Gm.conscious().filter((c) => c.cls === "T");
    if (thieves.length) {
      const best = thieves.reduce((a, b) => (Rules.thief(a).ol >= Rules.thief(b).ol ? a : b));
      opts.push({ id: "pick", label: "Pick the lock (" + best.name + ", " + Rules.thief(best).ol + "%)" });
    }
    const strong = Gm.conscious().sort((a, b) => Rules.strMod(b.str, b.strx).force - Rules.strMod(a.str, a.strx).force)[0];
    if (strong) opts.push({ id: "force", label: "Force it (" + strong.name + ")" });
    if (Gm.party().some((c) => c.mem && c.mem.knock > 0)) opts.push({ id: "knock", label: "Cast Knock" });
    opts.push({ id: "leave", label: "Leave it" });
    const pick = await UI.modal({ title: "Locked", body: lock.text + " What do you do?", actions: opts.map((o) => ({ id: o.id, label: o.label, primary: !!o.primary })) });
    if (!pick || pick === "leave") return;
    const lockKey = map.id + ":lock:" + nx + "," + ny;
    if (pick === "key") {
      Gm.setCell(map.id, nx, ny, "D");
      Gm.log("The key turns and the lock gives way.", "good");
      Gm.autosave("door");
      Gm.redraw();
      return;
    }
    if (pick === "pick") {
      const t = thieves.reduce((a, b) => (Rules.thief(a).ol >= Rules.thief(b).ol ? a : b));
      const tried = Gm.G.flags[lockKey + ":pick:" + t.lvl];
      if (tried) return Gm.log("The lock has already defeated " + t.name + "'s picks at this level.", "warn");
      Gm.G.flags[lockKey + ":pick:" + t.lvl] = true;
      Gm.advance(10);
      if (Rules.die(100) <= Rules.thief(t).ol) {
        Gm.setCell(map.id, nx, ny, "D");
        Gm.log(t.name + " eases the lock open in ten minutes.", "good");
        Gm.autosave("door");
      } else {
        Gm.log(t.name + " breaks a pick and cannot try again at this level.", "bad");
      }
      Gm.redraw();
      return;
    }
    if (pick === "force") {
      Gm.advance(10);
      const sm = Rules.strMod(strong.str, strong.strx);
      if (Rules.die(20) <= sm.force) {
        Gm.setCell(map.id, nx, ny, "D");
        Gm.log("With a crack, " + strong.name + " forces the door.", "good");
        Gm.autosave("door");
      } else {
        Gm.log("The door holds fast.", "bad");
        if (Rules.die(100) <= 25) Gm.wanderAttack("The noise draws wanderers.");
      }
      Gm.redraw();
      return;
    }
    if (pick === "knock") {
      const caster = Gm.party().find((c) => c.mem && c.mem.knock > 0) || null;
      if (!caster) return Gm.log("No one has Knock ready.", "warn");
      caster.mem.knock -= 1;
      Gm.setCell(map.id, nx, ny, "D");
      Gm.log("The lock clicks open under " + caster.name + "'s spell.", "good");
      Gm.redraw();
    }
  };

  // Challenge a visible band that stands on its tile.
  Gm.challenge = async (letter, ev, nx, ny) => {
    const map = Gm.X.map;
    const ok = await UI.confirm((ev.enc.text || "A band stands in your way.") + " Attack?", "Attack", "Back off");
    if (!ok) return;
    Gm.fightEnc(letter, ev, { surprise: "none" });
  };

  // ------------------------------------------------------------ events ----
  Gm.eventAtFeet = () => {
    const map = Gm.X.map;
    const ch = Gm.cellAt(map.id, Gm.G.x, Gm.G.y);
    return !!(map.ev && map.ev[ch]);
  };
  Gm.stepEvent = async () => {
    const map = Gm.X.map;
    const letter = Gm.cellAt(map.id, Gm.G.x, Gm.G.y);
    const ev = map.ev[letter];
    if (!ev) return;
    const key = map.id + ":" + letter;
    if (ev.chest) {
      if (Gm.flag(key)) return;
      return Gm.chestPrompt(map, letter, ev);
    }
    if (ev.enc) return; // live bands are never on the feet; cleared ones show nothing.
    if (ev.text && !Gm.flag(key + ":seen")) {
      Gm.G.flags[key + ":seen"] = true;
      Gm.log(ev.text, "good");
      if (ev.items) for (const it of ev.items) Gm.giveFirst(it);
      if (ev.gold) Gm.gainGold(Rules.dice(ev.gold), "found");
      if (ev.quest) Gm.setFlag("q:" + ev.quest, true);
      Gm.note(ev.text, Gm.G.module);
      Gm.redraw();
    }
  };

  // Gold and XP splitting, item handout, all shared by chests, fights and deeds.
  Gm.gainGold = (n, why) => {
    if (n <= 0) return;
    Gm.G.gold += n;
    Gm.log("+" + n + " gp" + (why ? " (" + why + ")" : "") + ".", "gold");
    UI.refreshHUD();
  };
  Gm.giveFirst = (instId) => {
    const carrier = Gm.conscious()[0] || Gm.alive()[0];
    if (!carrier) return;
    carrier.inv.push(instId);
    Gm.log(carrier.name + " takes " + Data.itemName(instId) + ".", "good");
    if (Data.item(instId) && Data.item(instId).type === "q") Gm.note("Retrieved " + Data.itemName(instId) + ".", null);
  };
  Gm.splitXP = (amount) => {
    const eligible = Gm.alive();
    if (!eligible.length || amount <= 0) return;
    const each = Math.floor(amount / eligible.length);
    for (const c of eligible) {
      const gained = Rules.awardXP(c, each);
      if (gained > 0) Gm.log(c.name + " gains " + gained + " experience.", "good");
    }
    UI.refreshParty();
  };

  Gm.chestPrompt = async (map, letter, ev) => {
    const key = map.id + ":" + letter;
    const stash = Gm.stashFor(map, letter, ev);
    if (ev.chest.guard && Gm.liveEnc(map, ev.chest.guard)) {
      const g = map.ev[ev.chest.guard];
      const ok = await UI.confirm("A live guard stands near the chest. Fight it first?", "Fight", "Leave");
      if (ok) Gm.fightEnc(ev.chest.guard, g, { surprise: "none" });
      return;
    }
    const ok = await UI.modal({
      title: "Chest",
      body: ev.chest.text + (stash.gold ? " It holds perhaps " + stash.gold + " gp." : ""),
      actions: [{ id: "open", label: "Open it", primary: true }, { id: "leave", label: "Leave it" }],
    });
    if (ok !== "open") return;
    if (ev.chest.trap && !Gm.flag(key + ":disarmed")) {
      Gm.log("Something is wired to the lid.", "warn");
      Gm.triggerChestTrap(ev.chest.trap);
    }
    Gm.G.flags[key] = true;
    Gm.setCell(map.id, Gm.G.x, Gm.G.y, ".");
    if (stash.gold) Gm.gainGold(stash.gold, "treasure");
    for (const it of stash.items) Gm.giveFirst(it);
    if (ev.chest.quest) Gm.setFlag("q:" + ev.chest.quest, true);
    if (stash.items.length || stash.gold) Gm.splitXP(stash.gold);
    Gm.note("Opened " + (ev.chest.text || "a chest").split(".")[0] + ".", Gm.G.module);
    Gm.autosave("treasure");
    Gm.redraw();
  };
  // Stash contents are rolled once and kept, so reloading never rerolls them.
  Gm.stashFor = (map, letter, ev) => {
    const key = map.id + ":" + letter;
    if (!Gm.G.stash[key]) {
      const c = ev.chest || {};
      const gold = c.gold ? Rules.dice(c.gold) : 0;
      Gm.G.stash[key] = { gold, items: (c.items || []).slice() };
    }
    return Gm.G.stash[key];
  };

  // Fight the band on a letter tile; victory clears it, flight restores the position.
  Gm.fightEnc = async (letter, ev, opts = {}) => {
    const map = Gm.X.map;
    const before = { x: Gm.G.x, y: Gm.G.y, dir: Gm.G.dir };
    const result = await Combat.start({
      mons: ev.enc.mons, arena: ev.enc.arena || map.arena, title: map.name, surprise: opts.surprise || "none",
      text: ev.enc.text, gold: ev.enc.gold || null, mapId: map.id, letter, lightLevel: Gm.isNight(Gm.G.time) ? "night" : "day",
    });
    Gm.afterBattle(result, { letter, ev, map, before });
  };

  Gm.afterBattle = (result, ctx) => {
    const { letter, ev, map, before } = ctx;
    if (result.result === "win") {
      Gm.setFlag(map.id + ":" + letter, true);
      if (ev.enc.quest) Gm.setFlag("q:" + ev.enc.quest, true);
      if (result.gold > 0) Gm.gainGold(result.gold, "spoils");
      for (const it of ev.enc.items || []) Gm.giveFirst(it);
      Gm.splitXP(result.xp);
      Gm.note("Won the fight at " + map.name + (ev.enc.quest ? " (" + Data.QUESTS[ev.enc.quest].name + ")" : "") + ".", Gm.G.module);
      Gm.autosave("battle");
      Gm.redraw();
      UI.refreshHUD();
      Gm.runWatch();
    } else if (result.result === "fled") {
      Gm.G.x = before.x;
      Gm.G.y = before.y;
      Gm.G.dir = before.dir;
      for (const id of result.left || []) {
        const c = Gm.charById(id);
        if (c) c.dead = true;
      }
      Gm.log("The party breaks away and retreats.", "warn");
      Gm.redraw();
      UI.refreshHUD();
    } else if (result.result === "lose") {
      Gm.onDefeat(map);
    }
  };

  Gm.onDefeat = async (map) => {
    const choice = await UI.modal({
      title: "The company has fallen",
      body: Modules.MODULES[Gm.G.module].lose,
      actions: [{ id: "load", label: "Load a save", primary: true }, { id: "title", label: "Return to the title" }],
      closable: false,
    });
    if (choice === "load") return UI.openSlots("load");
    Gm.toTitle();
  };

  // ---------------------------------------------------- watch and wander ----
  Gm.runWatch = () => {
    const map = Gm.X && Gm.X.map;
    if (!map || map.overland) return;
    const events = Watch.check(map, Gm.G, Gm.X, (x, y) => Gm.cellAt(map.id, x, y));
    for (const e of events) {
      if (e.kind === "sight") return Gm.sightPrompt(e);
      if (e.kind === "notice") {
        const surprise = Watch.surprise(Gm.partySurpriseBonus(), 0);
        return Gm.fightEnc(e.letter, e.ev, { surprise });
      }
      if (e.kind === "spring") {
        const surprise = Watch.surprise(0, 0);
        return Gm.fightEnc(e.letter, e.ev, { surprise: "enemy", ambush: true });
      }
    }
  };
  Gm.partySurpriseBonus = () => {
    const ranger = Gm.conscious().some((c) => c.cls === "R");
    return ranger ? -1 : 0;
  };
  Gm.sightPrompt = async (e) => {
    const map = Gm.X.map;
    const thief = Gm.conscious().find((c) => c.cls === "T");
    const ms = thief ? Rules.thief(thief).ms : 25;
    const choice = await UI.modal({
      title: "A band in sight",
      body: "You see " + Gm.bandName(e.ev.enc) + " " + e.dist.toFixed(1) + " squares ahead. They have not seen you yet.",
      actions: [
        { id: "attack", label: "Attack with a free round", primary: true },
        { id: "back", label: "Back away" },
        { id: "hold", label: "Hold still" },
        { id: "creep", label: "Creep up (" + ms + "% Move Silently)" },
      ],
    });
    Gm.X.sighted[e.letter] = true;
    if (!choice) Gm.X.unaware[e.letter] = true;
    if (choice === "attack") return Gm.fightEnc(e.letter, e.ev, { surprise: "enemy" });
    if (choice === "back") {
      Gm.X.unaware[e.letter] = true;
      Gm.step_back_quiet();
      return;
    }
    if (choice === "hold") {
      Gm.advance(1);
      if (Rules.die(100) <= 50) return Gm.fightEnc(e.letter, e.ev, { surprise: "none" });
      Gm.log("Still unseen. Nothing moves.", "");
      return;
    }
    if (choice === "creep") {
      if (Rules.die(100) <= ms) {
        Gm.log("You close in without a sound.", "good");
        return Gm.fightEnc(e.letter, e.ev, { surprise: "enemy" });
      }
      Gm.log("A twig snaps. They are on you.", "bad");
      return Gm.fightEnc(e.letter, e.ev, { surprise: "none" });
    }
  };
  Gm.step_back_quiet = () => {
    const [dx, dy] = DIRS[Gm.G.dir];
    const nx = Gm.G.x - dx, ny = Gm.G.y - dy;
    if (!SOLID(Gm.cellAt(Gm.X.map.id, nx, ny)) && Gm.cellAt(Gm.X.map.id, nx, ny) !== "#") {
      Gm.G.x = nx;
      Gm.G.y = ny;
      Gm.animateTo(nx, ny, Gm.G.dir, 170);
    }
    Gm.redraw();
  };

  Gm.wanderCheck = () => {
    const map = Gm.X.map;
    if (!map.wander || map.safe) return;
    const per = map.wander.chance || 0;
    if (Rules.rnd() < per) Gm.wanderAttack("Something stirs in the dark.");
  };
  // Random wanderers from an authored table.
  Gm.wanderAttack = async (text) => {
    const map = Gm.X.map;
    const table = map.wander ? map.wander.mons : (Gm.wildTable ? Gm.wildTable() : []);
    if (!table.length) return;
    const mons = table.map((t) => [t[0], t[1]]);
    Gm.log(text, "warn");
    const result = await Combat.start({ mons, arena: map.arena, title: map.name, surprise: "none", text, mapId: map.id, letter: null, lightLevel: "day" });
    Gm.afterWander(result);
  };
  Gm.afterWander = (result) => {
    if (result.result === "win") {
      if (result.gold > 0) Gm.gainGold(result.gold, "spoils");
      Gm.splitXP(result.xp);
    } else if (result.result === "lose") {
      Gm.onDefeat(Gm.X.map);
    } else if (result.result === "fled") {
      Gm.log("You slip away from the wanderers.", "warn");
    }
    Gm.redraw();
    UI.refreshHUD();
  };

  // Ground piles.
  Gm.groundAt = (mapId, x, y) => {
    const g = Gm.G.ground[mapId];
    return g && g[x + "," + y] ? g[x + "," + y] : [];
  };
  Gm.showGroundHere = () => {
    const map = Gm.X.map;
    const piles = Gm.groundAt(map.id, Gm.G.x, Gm.G.y);
    if (piles.length) {
      Gm.log("Here lies " + piles.map((i) => Data.itemName(i)).join(", ") + ".", "good");
      UI.groundDialog(map.id, Gm.G.x, Gm.G.y);
    }
  };
  Gm.dropAt = (mapId, x, y, instId) => {
    if (!Gm.G.ground[mapId]) Gm.G.ground[mapId] = {};
    const k = x + "," + y;
    if (!Gm.G.ground[mapId][k]) Gm.G.ground[mapId][k] = [];
    Gm.G.ground[mapId][k].push(instId);
  };
  Gm.takeFromGround = (mapId, x, y, instId, carrier) => {
    const pile = Gm.G.ground[mapId] && Gm.G.ground[mapId][x + "," + y];
    if (!pile) return false;
    const i = pile.indexOf(instId);
    if (i < 0) return false;
    pile.splice(i, 1);
    if (!pile.length) delete Gm.G.ground[mapId][x + "," + y];
    carrier.inv.push(instId);
    return true;
  };

  // ------------------------------------------------------------- traps ----
  Gm.trapAt = (map, x, y) => (map.traps || []).find((t) => t.x === x && t.y === y) || null;
  Gm.triggerTrap = (map, trap, arriving) => {
    const k = "trap:" + map.id + ":" + trap.x + "," + trap.y;
    const thief = Gm.conscious().find((c) => c.cls === "T");
    const detectChance = thief ? Rules.thief(thief).ft : 0;
    if (!arriving && Rules.die(100) <= detectChance) {
      Gm.G.flags[k] = "found";
      Gm.log(thief.name + " spots the " + trap.type + " trap and steps round it.", "good");
      return;
    }
    if (Gm.G.flags[k] === "found" || Gm.G.flags[k] === "off") return;
    Gm.G.flags[k] = "sprung";
    Gm.resolveTrap(trap.type, false);
  };
  Gm.triggerChestTrap = (trap) => {
    Gm.resolveTrap(trap.type, true, trap.dmg);
  };
  Gm.resolveTrap = (type, chest, dmgExpr) => {
    const lvl = Math.max(1, Math.max(...Gm.party().map((c) => c.lvl)));
    const single = Math.max(1, Math.round(lvl / 2)) + "d6";
    const group = Math.max(1, Math.round(lvl / 3)) + "d6";
    const members = Gm.conscious();
    if (!members.length) return;
    const hit = (c, expr, save, saveIdx) => {
      let dmg = Rules.dice(expr);
      if (save !== null) {
        const d = Rules.derive(c, Gm.G.time);
        if (Rules.die(20) >= d.saves[saveIdx]) dmg = Math.floor(dmg / 2);
      }
      if (dmg > 0) {
        c.hp -= dmg;
        Gm.log(c.name + " takes " + dmg + " damage.", "bad");
        if (c.hp <= 0) Gm.downChar(c);
      }
    };
    if (chest && dmgExpr) {
      if (type === "needle") {
        const c = members[0];
        Gm.log("A needle flicks from the lock.", "bad");
        hit(c, dmgExpr || "1d4", null, 0);
        c.poison = { at: Gm.G.time + 20 };
      }
    } else if (type === "pit") hit(members[0], single, null, 0);
    else if (type === "spear") hit(members[0], single, null, 0);
    else if (type === "dart") { const c = members[0]; hit(c, "1d4", null, 0); if (Rules.die(20) <= 8) c.poison = { at: Gm.G.time + 16 }; }
    else if (type === "blade") hit(members[0], single, null, 0);
    else if (type === "stone") for (const c of members) hit(c, single, 3, 3);
    else if (type === "gas") for (const c of members) { hit(c, group, null, 0); if (Rules.die(20) <= 6) c.poison = { at: Gm.G.time + 8 }; }
    else if (type === "rune") for (const c of members) hit(c, group, 3, 3);
    else if (type === "needle") hit(members[0], "1d4", null, 0);
    UI.refreshParty();
    Gm.redraw();
  };

  // Searching: four neighbours, 10 minutes.
  Gm.search = () => {
    const map = Gm.X.map;
    if (map.overland || Gm.X.busy) return;
    Gm.advance(10);
    const { x, y } = Gm.G;
    const found = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const cx = x + dx, cy = y + dy;
      if (Gm.cellAt(map.id, cx, cy) === "S") {
        let miss = 1;
        for (const c of Gm.conscious()) miss *= 1 - (c.race === "elf" || c.race === "half-elf" ? 2 / 6 : 1 / 6);
        if (Rules.rnd() > miss) {
          Gm.discoverSecret(map, cx, cy);
          found.push("secret");
        }
      }
      const trap = Gm.trapAt(map, cx, cy);
      if (trap && !Gm.flag("trap:" + map.id + ":" + cx + "," + cy)) {
        const k = "trap:" + map.id + ":" + cx + "," + cy;
        const thief = Gm.conscious().find((c) => c.cls === "T");
        const ft = thief ? Rules.thief(thief).ft : 0;
        if (Rules.die(100) <= Math.max(ft, 25)) {
          Gm.G.flags[k] = "found";
          found.push("trap");
          Gm.log("You find a " + trap.type + " trap on the floor.", "good");
        }
      }
    }
    if (!found.length) Gm.log("You search carefully. Nothing turns up.", "");
    Gm.redraw();
    UI.refreshHUD();
  };

  // ------------------------------------------------------------ resting ----
  Gm.canCamp = () => {
    const map = Gm.X && Gm.X.map;
    if (!map) return false;
    if (map.safe && !map.overland) return false;
    return true;
  };
  Gm.camp = async () => {
    const map = Gm.X.map;
    if (map.safe && !map.overland) {
      return UI.modal({ title: "Camp", body: "You cannot sleep on the town streets. The inn is the place for that.", actions: [{ id: "ok", label: "Very well", primary: true }] });
    }
    if (map.overland) return Over.camp();
    if (Gm.X.busy) return;
    const hurt = Gm.conscious().some((c) => c.hp < c.maxhp);
    if (hurt) {
      const choice = await UI.modal({ title: "Make camp", body: "Eight hours of rest. Rest until healed as well, using any spare cures?", actions: [{ id: "once", label: "Rest eight hours", primary: true }, { id: "until", label: "Rest until healed" }, { id: "no", label: "Not now" }] });
      if (choice === "no" || !choice) return;
      if (choice === "until") return Gm.restUntilHealed(false);
    }
    Gm.restOnce(false);
  };
  // One uninterrupted field rest. Wanderers may interrupt in dungeons.
  Gm.restOnce = (inn) => {
    const map = Gm.X.map;
    if (!inn && map.wander && Rules.rnd() < 0.35) {
      Gm.log("A noise wakes the company. Wanderers attack; the rest is spoiled.", "bad");
      return Gm.wanderAttack("Wanderers!");
    }
    Gm.advance(inn ? 0 : 480);
    for (const c of Gm.alive()) {
      c.hp = Math.min(c.maxhp, c.hp + (inn ? 3 : 1));
      if (inn) c.poison = null;
      c.layUsed = false;
      c.mem = Object.assign({}, c.prep);
    }
    Gm.G.march = 0;
    Gm.log("The company rests and is restored.", "good");
    Gm.redraw();
    UI.refreshParty();
    UI.refreshHUD();
    Gm.autosave("rest");
  };
  Gm.restUntilHealed = (inn) => {
    for (let i = 0; i < 14; i++) {
      const hurt = Gm.conscious().filter((c) => c.hp < c.maxhp);
      if (!hurt.length) break;
      Gm.restOnce(inn);
    }
  };

  // ---------------------------------------------------------- redrawing ----
  Gm.sprites = () => {
    const out = [];
    const map = Gm.X && Gm.X.map;
    if (!map || map.overland) return out;
    for (const letter of Object.keys(map.ev || {})) {
      const ev = map.ev[letter];
      const cells = [];
      for (let y = 0; y < map.grid.length; y++) for (let x = 0; x < map.grid[y].length; x++) {
        if (Gm.cellAt(map.id, x, y) === letter) cells.push([x, y]);
      }
      for (const [x, y] of cells) {
        if (ev.enc && Gm.liveEnc(map, letter) && (!ev.enc.hidden || Gm.X.sighted[letter])) {
          const m = Data.monster(ev.enc.mons[0][0]);
          out.push({ x, y, img: Figs.tex(Figs.descMon(m, null), 128), scale: 0.95, lift: 0 });
        }
        if (ev.chest && !Gm.flag(map.id + ":" + letter)) out.push({ x, y, prop: "chest", scale: 0.45 });
      }
    }
    for (let y = 0; y < map.grid.length; y++) for (let x = 0; x < map.grid[y].length; x++) {
      const c = Gm.cellAt(map.id, x, y);
      if (c === "<" || c === ">") out.push({ x, y, prop: "stairs", scale: 0.9 });
      if (c === "T") out.push({ x, y, prop: "tree", scale: 1.0 });
      if (c === "F") out.push({ x, y, prop: "fountain", scale: 0.9 });
      if (Gm.groundAt(map.id, x, y).length) out.push({ x, y, prop: "loot", scale: 0.4 });
      const t = Gm.trapAt(map, x, y);
      if (t && Gm.flag("trap:" + map.id + ":" + x + "," + y) === "found") out.push({ x, y, prop: "trap", scale: 0.4, alpha: 0.8 });
    }
    return out;
  };
  Gm.redraw = () => {
    if (!Gm.X || Gm.mode !== "local" || !View3D) return;
    const map = Gm.X.map;
    const a = Gm.X.anim;
    const st = a ? a.current() : { px: Gm.G.x + 0.5, py: Gm.G.y + 0.5, ang: (Gm.G.dir - 1) * Math.PI / 2 };
    View3D.render({
      px: st.px, py: st.py, ang: st.ang, map,
      cellAt: (x, y) => Gm.cellAt(map.id, x, y),
      sprites: Gm.sprites(), night: Gm.isNight(Gm.G.time), quality: a ? 0.5 : 1,
    });
    MapView.draw();
  };

  // Smooth camera motion between grid positions. One pending command is buffered.
  Gm.animateTo = (tx, ty, tdir, dur) => {
    const cur = Gm.X.anim ? Gm.X.anim.current() : null;
    const fromX = cur ? cur.px : Gm.G.x + 0.5;
    const fromY = cur ? cur.py : Gm.G.y + 0.5;
    const fromAng = cur ? cur.ang : (Gm.G.dir - 1) * Math.PI / 2;
    const toX = tx + 0.5, toY = ty + 0.5;
    let toAng = (tdir - 1) * Math.PI / 2;
    // Unwrap angle so the turn goes the short way.
    while (toAng - fromAng > Math.PI) toAng -= Math.PI * 2;
    while (toAng - fromAng < -Math.PI) toAng += Math.PI * 2;
    const t0 = performance.now();
    let done = false;
    const anim = {
      current() {
        const t = Math.min(1, (performance.now() - t0) / dur);
        const e = t * t * (3 - 2 * t);
        return { px: fromX + (toX - fromX) * e, py: fromY + (toY - fromY) * e, ang: fromAng + (toAng - fromAng) * e };
      },
    };
    Gm.X.anim = anim;
    const finish = () => {
      if (done) return;
      done = true;
      if (Gm.X && Gm.X.anim === anim) Gm.X.anim = null;
      Gm.redraw();
      if (Gm.X && Gm.X.queue) {
        const q = Gm.X.queue;
        Gm.X.queue = null;
        if (q.kind === "turn") Gm.turn(q.d);
        else if (q.kind === "move") Gm.tryMove(q.dx, q.dy, q.strafe);
      }
    };
    const frame = () => {
      if (done) return;
      Gm.redraw();
      if (performance.now() - t0 >= dur) return finish();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    setTimeout(finish, dur * 1.4 + 60);
  };

  // ------------------------------------------------------------ modes ----
  Gm.setMode = (m) => {
    Gm.mode = m;
    UI.setMode(m);
  };
  Gm.toTitle = () => {
    UI.closeAll();
    Gm.X = null;
    Gm.setMode("title");
    UI.showScreen("title");
  };

  // -------------------------------------------------------------- saves ----
  Gm.serialize = (slot, meta) => {
    const G = Gm.G;
    const payload = JSON.parse(JSON.stringify(G));
    const leader = Gm.party()[0] ? Gm.party()[0].name : "Company";
    const mapName = Data.MAPS[G.map] ? Data.MAPS[G.map].name : G.map;
    const lvl = Gm.party().length ? Math.round(Gm.party().reduce((s, c) => s + c.lvl, 0) / Gm.party().length) : 1;
    payload.meta = {
      leader, where: mapName, when: Gm.clock(G.time).text, saved: new Date().toLocaleString(),
      ts: Date.now(), mod: Modules.MODULES[G.module] ? Modules.MODULES[G.module].code + " " + Modules.MODULES[G.module].name : G.module, lvl, slot,
    };
    return payload;
  };
  Gm.saveSlot = (slot) => {
    if (Gm.mode === "combat") return false;
    if (!Gm.G) return false;
    try {
      const s = Gm.serialize(slot);
      localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify(s));
      return true;
    } catch (e) {
      Gm.log("The save could not be written. Play continues.", "warn");
      return false;
    }
  };
  Gm.autosave = (reason) => {
    if (!Gm.G || Gm.mode === "combat") return;
    Gm.G.meta.lastReason = reason || Gm.G.meta.lastReason;
    Gm.saveSlot("auto");
  };
  Gm.autosaveIfDue = () => {};
  Gm.readSlot = (slot) => {
    try {
      const raw = localStorage.getItem(SAVE_PREFIX + slot);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object" || !obj.roster) return null;
      return obj;
    } catch (e) {
      return null;
    }
  };
  Gm.slotInfo = (slot) => {
    const s = Gm.readSlot(slot);
    return s ? s.meta : null;
  };
  Gm.newestSave = () => {
    let best = null;
    for (const k of SLOT_KEYS) {
      const s = Gm.readSlot(k);
      if (s && (!best || s.meta.ts > best.meta.ts)) best = s;
    }
    return best;
  };
  Gm.loadSlot = (slot) => {
    const s = Gm.readSlot(slot);
    if (!s) return false;
    Gm.G = Gm.restoreState(s);
    Gm.resumeAt();
    return true;
  };
  Gm.restoreState = (s) => {
    const G = JSON.parse(JSON.stringify(s));
    delete G.meta;
    G.meta = {};
    const base = Gm.newState(G.module || "thornwick");
    for (const k of Object.keys(base)) if (G[k] === undefined) G[k] = base[k];
    for (const c of G.roster) {
      if (!c.eq) c.eq = {};
      if (!c.inv) c.inv = [];
      if (!c.fx) c.fx = { armor: null, str: null, buffs: [] };
      if (!c.prep) c.prep = {};
      if (!c.mem) c.mem = {};
    }
    if (!G.map || !Data.MAPS[G.map]) G.map = Modules.MODULES[G.module].hub;
    if (!G.done) G.done = [];
    if (G.won === undefined) G.won = G.done.length > 0;
    return G;
  };
  Gm.resumeAt = () => {
    UI.closeAll();
    UI.showScreen("game");
    const map = Gm.mapDef(Gm.G.map);
    Gm.enter(map.id, Gm.G.x, Gm.G.y, Gm.G.dir, { silent: true, reason: "load" });
    Gm.log("Resumed at " + map.name + ", " + Gm.clock(Gm.G.time).text + ".", "good");
    UI.refreshParty();
    UI.refreshHUD();
    Gm.redraw();
  };

  // ------------------------------------------------------------- input ----
  Gm.onKey = (e) => {
    if (UI.handleKey(e)) return;
    if (Gm.mode === "combat") {
      if (Combat.key(e)) { e.preventDefault(); return; }
      return;
    }
    if (Gm.mode === "wild") {
      if (Over.key(e)) e.preventDefault();
      return;
    }
    if (Gm.mode !== "local") return;
    const k = e.key;
    if (/^[1-6]$/.test(k)) {
      const member = Gm.party()[Number(k) - 1];
      if (member) { e.preventDefault(); UI.openSheet(member.id); }
      return;
    }
    const map = {
      w: () => Gm.stepForward(false), ArrowUp: () => Gm.stepForward(false),
      s: () => Gm.stepForward(true), ArrowDown: () => Gm.stepForward(true),
      a: () => Gm.turn(-1), ArrowLeft: () => Gm.turn(-1),
      d: () => Gm.turn(1), ArrowRight: () => Gm.turn(1),
      q: () => Gm.strafe(-1), e: () => Gm.strafe(1),
      f: () => Gm.search(), r: () => Gm.camp(), j: () => UI.openJournal(), b: () => UI.openBestiary(),
      m: () => UI.openFullMap(), p: () => UI.toggleParty(), Escape: () => UI.openMenu(),
      h: () => UI.openHelp(),
    };
    const fn = map[k] || map[k && k.toLowerCase && k.toLowerCase()];
    if (fn) {
      if (k === "e" || k === "E") { /* strafe right */ }
      e.preventDefault();
      fn();
    }
  };

  // ---------------------------------------------------------- new game ----
  Gm.beginModule = async (modId, roster, partyIds, pendingGold) => {
    const mod = Modules.MODULES[modId];
    const G = Gm.newState(modId);
    G.roster = roster.map((c) => c);
    G.party = partyIds.slice();
    G.gold = mod.gold + (pendingGold || 0);
    Gm.G = G;
    // Stamp the arrival in the journal.
    Gm.note("Arrived at " + Data.MAPS[mod.hub].name + ". " + mod.blurb, modId);
    Gm.kitFor(mod);
    for (const c of G.roster) { Rules.autoPrep(c); c.mem = Object.assign({}, c.prep); }
    UI.showScreen("game");
    Gm.enter(mod.hub, G.x, G.y, G.dir, { silent: true, reason: "begin" });
    Gm.log(mod.intro, "good");
    Gm.log("Hint: " + mod.hint, "");
    Gm.arrive({});
    Gm.autosave("begin");
    UI.refreshParty();
    UI.refreshHUD();
    Gm.redraw();
  };
  // Bring every fresh hero to the module's starting level and kit.
  Gm.kitFor = (mod) => {
    for (const c of Gm.G.roster) {
      while (c.lvl < mod.lvl) Campaign.levelUp(c, true);
      if (!c.fresh) {
        c.fresh = true;
      }
    }
  };

  Gm.boot = () => {
    UI.init();
    View3D.init(document.getElementById("view3d"));
    Over.init(document.getElementById("overCanvas"));
    Combat.init(document.getElementById("combatCanvas"));
    MapView.init(document.getElementById("minimap"));
    NavPad.init();
    document.addEventListener("keydown", Gm.onKey);
    UI.showScreen("title");
    Gm.setMode("title");
  };

  return Gm;
})();

window.addEventListener("DOMContentLoaded", () => {
  if (typeof Game !== "undefined" && Game.boot) Game.boot();
});
