"use strict";
/*
 * Generated adventures: fifty deterministic modules, ten per band, built
 * once at load in stable order. Each module has a safe home, its dungeon
 * floors (small 1, medium 2, large 3, huge 5), and its own wilderness.
 * Seeds: 7919*t + 104729*i + 31*theme length; wilderness uses seed+15485863 and
 * dungeon secrets and traps use seed+32452843. Nothing here reads play rolls.
 */
const Adventures = (() => {
  const A = {};
  A.BANDS = [[], [], [], [], []];
  A.ALL = [];

  // Band layouts: [size, theme] in chooser order. Four small, three medium, two large, one huge.
  const LAYOUT = [
    [["small", "vermin"], ["small", "fungus"], ["small", "beasts"], ["small", "bandits"], ["medium", "goblinoid"], ["medium", "swamp"], ["medium", "lycanthrope"], ["large", "undead"], ["large", "goblinoid"], ["huge", "undead"]],
    [["small", "vermin"], ["small", "beasts"], ["small", "menagerie"], ["small", "wizard"], ["medium", "lycanthrope"], ["medium", "swamp"], ["medium", "frozen"], ["large", "giants"], ["large", "demons"], ["huge", "dragon"]],
    [["small", "beasts"], ["small", "swamp"], ["small", "elemental"], ["small", "menagerie"], ["medium", "underdark"], ["medium", "devils"], ["medium", "giants"], ["large", "undead"], ["large", "dragon"], ["huge", "demons"]],
    [["small", "beasts"], ["small", "elemental"], ["small", "menagerie"], ["small", "frozen"], ["medium", "wizard"], ["medium", "underdark"], ["medium", "demons"], ["large", "giants"], ["large", "devils"], ["huge", "dragon"]],
    [["small", "giants"], ["small", "underdark"], ["small", "dragon"], ["small", "wizard"], ["medium", "demons"], ["medium", "devils"], ["medium", "undead"], ["large", "giants"], ["large", "dragon"], ["huge", "undead"]],
  ];
  const SIZE = {
    small: { floors: 1, diff: 1, span: 1, text: "Small", length: "About an hour" },
    medium: { floors: 2, diff: 2, span: 2, text: "Medium", length: "Two hours or so" },
    large: { floors: 3, diff: 3, span: 3, text: "Large", length: "Three to four hours" },
    huge: { floors: 5, diff: 4, span: 4, text: "Huge", length: "Six hours or more" },
  };
  const NOUN = {
    vermin: "Nests", fungus: "Mould-Caves", beasts: "Den", bandits: "Hideout", goblinoid: "Warrens", swamp: "Fen-Pits",
    lycanthrope: "Moon-Lair", undead: "Crypts", menagerie: "Menagerie", wizard: "Tower", frozen: "Icebound Vault",
    giants: "Halls", demons: "Abyss-Gate", dragon: "Lair", elemental: "Forge-Halls", underdark: "Undercroft", devils: "Brimstone Stair",
  };
  const PREFIX = ["Crow", "Mire", "Ash", "Hol", "Gray", "Wren", "Stone", "Thorn", "Bram", "Fen", "Marl", "Kest", "Dun", "Raven", "Whit", "Ember", "Carn", "Sallow", "Ivy", "Pell"];
  const SUFFIX = ["stead", "ford", "mere", "wick", "holt", "gate", "cross", "mill", "hollow", "barrow", "field", "moor", "vale", "reach", "keep", "combe", "down", "lea"];
  const FIRST = ["Othys", "Skethra", "Mulgrim", "Gruk", "Ysmet", "Ragnar", "Murk", "Lunara", "Hork", "Ornax", "Hrimfa", "Grull", "Zarakh", "Vaskarath", "Kindle", "Sorvi", "Malphas", "Vorrath", "Brannick", "Corvane", "Hesk", "Thaddeus", "Dorn", "Ulmar"];
  const EPITHET = ["the Many-Legged", "of the Deep Stair", "Bonebreaker", "the Pale", "Ironjaw", "of the Hollow", "the Unbroken", "Ashen-Eyed", "the Patient", "of Thorns", "the Tallow King", "Redhand", "the Silent", "Grey-Mantled", "the Broken Crown", "Stormcaller", "of the Long Night", "the Sundered", "Coldheart", "the Hungry"];
  const RETRIEVE = ["Silver Reliquary Cup", "Engraved Signet", "Tin Lantern of the Watch", "Charter Scroll-Case", "Heirloom Locket", "Bell of the Old Mill", "Surveyor's Chain", "Carved Hunting Horn", "Pilgrim's Medallion", "Ledger of the Miller", "Reeve's Staff-Head", "Lady's Hand-Mirror"];
  const TRAPS = ["pit", "spear", "dart", "blade", "stone", "gas", "rune"];

  // Monsters by theme: each entry is a pool with weights and the kinds of set battles it fits.
  const POOL = {
    vermin: ["giant_ant", "giant_roach", "giant_scorpion", "dire_spider", "cave_beetle", "swarm_ants", "giant_wasp", "rot_grub", "tunnel_worm"],
    fungus: ["shrieker", "violet_fungus", "gas_spore", "yellow_mold", "lichen_crawler", "mushroom_man", "spore_horror", "myconid_sprout", "fungal_brute", "ochre_jelly"],
    beasts: ["boar", "bear_black", "badger_giant", "hawk_giant", "panther", "dire_boar", "elk_war", "python_giant", "wolf", "dire_wolf"],
    bandits: ["bandit", "brigand", "bandit_archer", "highwayman", "cutthroat", "mercenary_sword", "footpad", "thug", "sell_sword"],
    goblinoid: ["goblin", "goblin_archer", "hobgoblin", "hobgoblin_sergeant", "bugbear", "orc", "orc_brute", "orc_archer", "gnoll", "gnoll_archer", "worg"],
    swamp: ["lizardfolk", "bullywug", "crocodile", "giant_frog", "otyugh", "swamp_hag", "will_o_wisp", "hydra_two", "sea_hag", "marsh_wraith"],
    lycanthrope: ["wererat", "werewolf", "weretiger", "werebear", "werefox", "wolfman", "ratfolk", "lupine_hunter", "dire_wolf_pack"],
    undead: ["skeleton", "zombie", "ghoul", "wight", "shadow", "ghast", "mummy", "bone_knight", "coffin_dweller", "grave_skeleton", "wraith"],
    menagerie: ["owlbear", "griffon", "hippogriff", "manticore", "basilisk", "cockatrice", "catoblepas", "displacer_beast", "wyvern", "rust_monster", "bulette", "mimic", "gorgon"],
    wizard: ["animated_armour", "homunculus", "magic_mirror", "mage_apprentice", "gelatinous_cube", "shield_guardian", "spell_eater", "rune_sentinel", "clay_golem"],
    frozen: ["winter_wolf", "yeti", "ice_wolf", "snow_ape", "frost_toad", "ice_mephit", "white_bear", "rime_hound", "polar_worm", "remorhaz"],
    giants: ["hill_giant", "stone_giant", "ogre", "ogre_chief", "troll", "cyclops", "ettin", "frost_giant", "ogre_magi"],
    demons: ["quasit", "dretch", "vrock", "hezrou", "succubus_hunter", "marilith", "barlgura", "nightmare_demon", "bebilith"],
    dragon: ["kobold_wyrmling", "baby_green_dragon", "baby_red_dragon", "pseudo_dragon", "drake", "dragon_hatchling", "white_dragon", "dragon_cult_drake", "young_blue_dragon"],
    elemental: ["air_elemental", "earth_elemental", "fire_elemental", "water_elemental", "magma_mephit", "dust_mephit", "salamander", "xorn", "steam_mephit", "gargoyle_elem"],
    underdark: ["drow_warrior", "drow_priestess", "duergar", "derro", "quaggoth", "umber_hulk", "svirfneblin", "ettercap", "darkmantle", "grimlock", "troglodyte", "roper", "hook_horror"],
    devils: ["imp", "lemure", "bearded_devil", "barbed_devil", "bone_devil", "erinyes", "ice_devil", "chain_devil", "hellcat"],
  };
  const BOSS = { vermin: "giant_scorpion", fungus: "fungal_brute", beasts: "dire_boar", bandits: "brigand_sergeant", goblinoid: "orc_chieftain", swamp: "hydra_two", lycanthrope: "werebear", undead: "wight_lord", menagerie: "chimera", wizard: "warlock_archmage", frozen: "glacier_drake", giants: "cloud_giant", demons: "nalfeshnee", dragon: "adult_black_dragon", elemental: "fire_elemental", underdark: "mind_flayer", devils: "pit_fiend" };

  // Budget of a set battle, from the level of the floor.
  const battleBudget = (L) => (L <= 8 ? 2.4 * L : 19.2 + 1.7 * (L - 8));
  const weightOf = (id) => {
    const m = Data.MONSTERS[id];
    if (!m) return 1;
    return Math.max(0.5, m.hd + (m.sp ? m.sp.length * 0.3 : 0));
  };

  // -------------------------------------------------------- utilities ----
  const pickR = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  const band = (t) => Math.floor(t);
  const startLevelOf = (t) => (t - 1) * 4 + 1;
  const goldFor = (lvl) => Math.round((40 * Math.pow(lvl, 1.5)) / 10) * 10;
  const letters = "abcdefghijklmnopqrstuvwxyz";

  // ----------------------------------------------------- the town (home) ----
  // The home village: a street, a brewery stair, five service doors, and a south gate.
  const makeHome = (id, name, rng, big) => {
    const rows = [
      "###################",
      "#BBBB..HHHH..HHHHH#",
      "#BBBB..HHHH..HHHHH#",
      "#BBBB..HHHH..HHHHH#",
      "#.>....H3HH..HHHHH#",
      "#,,,.........H4HHH#",
      "#,,...............#",
      "#T.......F........#",
      "#.....T...........#",
      "#H1HH........H2HH.#",
      "#HHHH.HH5HH..HHHH.#",
      "#HHHH.HHHHH..HHHH.#",
      "#HHHH.HHHHH..HHHH.#",
      "#,,,...........,,,#",
      "#########G#########",
    ];
    // A few trees, placed on open street only, never on the start, the stair or a door front.
    const open = [];
    for (let y = 6; y < 13; y++) for (let x = 2; x < 17; x++) {
      if (rows[y][x] === "." && !(x === 9 && y === 13) && !(x === 2 && y === 5)) open.push([x, y]);
    }
    const grid = rows.map((r) => r.split(""));
    for (let k = 0; k < 2 && open.length; k++) {
      const [x, y] = open.splice(Math.floor(rng() * open.length), 1)[0];
      if (!(x === 9 && y === 7)) grid[y][x] = "T";
    }
    const g = grid.map((r) => r.join(""));
    return {
      id, name, outdoor: true, safe: true, arena: "village", wall: "timber", floor: "street", ceil: "sky",
      grid: g,
      start: { x: 9, y: 13, dir: 0 },
      svc: {
        "1": { svc: "inn", name: "The Sleepy Hen" },
        "2": { svc: "general", name: "Hesk's General Goods" },
        "3": { svc: "temple", name: "Shrine of the Dawn" },
        "4": { svc: "hall", name: "Hall of " + name },
        "5": { svc: "training", name: "Yard of " + name },
      },
      links: {},
      ev: {},
      traps: [],
      wander: null,
      big: !!big,
    };
  };

  // -------------------------------------------------------- dungeon floor ----
  // Room-and-corridor floor, 25x19. Returns the grid, the rooms, stairs and free cells.
  const makeFloorLayout = (rng) => {
    for (let attempt = 0; attempt < 60; attempt++) {
      const W = 25, H = 19;
      const grid = Array.from({ length: H }, () => Array(W).fill("#"));
      const slots = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) slots.push({ r, c, sx: 1 + c * 6, sy: 1 + r * 6 });
      // Choose 7-10 slots.
      const want = 7 + Math.floor(rng() * 4);
      const order = slots.slice().sort(() => rng() - 0.5);
      const chosen = order.slice(0, want);
      const rooms = chosen.map((s) => {
        const w = 3 + Math.floor(rng() * 3), h = 3 + Math.floor(rng() * 3);
        const ox = Math.floor(rng() * (5 - w + 1)), oy = Math.floor(rng() * (5 - h + 1));
        return { x: s.sx + ox, y: s.sy + oy, w, h, r: s.r, c: s.c };
      });
      for (const rm of rooms) for (let y = rm.y; y < rm.y + rm.h; y++) for (let x = rm.x; x < rm.x + rm.w; x++) grid[y][x] = ".";
      // Adjacency between rooms by slot neighbourhood.
      const edges = [];
      for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) {
        const a = rooms[i], b = rooms[j];
        if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1) edges.push([i, j]);
      }
      // Randomised spanning tree (depth-first), then a few loops.
      const parent = rooms.map((_, i) => i);
      const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
      const shuffled = edges.slice().sort(() => rng() - 0.5);
      const tree = [], loops = [];
      for (const [i, j] of shuffled) {
        if (find(i) !== find(j)) { parent[find(i)] = find(j); tree.push([i, j]); } else loops.push([i, j]);
      }
      const corridors = tree.slice();
      for (const e of loops) if (rng() < 0.25) corridors.push(e);
      // Connection check: every room must now share a root (the tree already guarantees it).
      if (rooms.some((_, i) => find(i) !== find(0))) continue;
      // Carve L-shaped corridors between centres.
      const cells = new Set();
      for (const [i, j] of corridors) {
        const a = rooms[i], b = rooms[j];
        const ax = a.x + Math.floor(a.w / 2), ay = a.y + Math.floor(a.h / 2);
        const bx = b.x + Math.floor(b.w / 2), by = b.y + Math.floor(b.h / 2);
        const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx);
        for (let x = x0; x <= x1; x++) { if (grid[ay][x] === "#") grid[ay][x] = "."; cells.add(x + "," + ay); }
        const y0 = Math.min(ay, by), y1 = Math.max(ay, by);
        for (let y = y0; y <= y1; y++) { if (grid[y][bx] === "#") grid[y][bx] = "."; cells.add(bx + "," + y); }
      }
      // Doors where corridors meet room mouths.
      const inRoom = (x, y) => rooms.some((rm) => x >= rm.x && x < rm.x + rm.w && y >= rm.y && y < rm.y + rm.h);
      const doors = [];
      for (const k of cells) {
        const [x, y] = k.split(",").map(Number);
        if (inRoom(x, y)) continue;
        const adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inRoom(x + dx, y + dy));
        if (adj && rng() < 0.35) doors.push([x, y]);
      }
      for (const [x, y] of doors) grid[y][x] = "D";
      return { grid, rooms, corridors: [...cells].filter((k) => !inRoom(...k.split(",").map(Number))).map((k) => k.split(",").map(Number)) };
    }
    return null;
  };
  // Walking distance from a room centre over open cells.
  const bfsDist = (grid, sx, sy) => {
    const H = grid.length, W = grid[0].length;
    const dist = Array.from({ length: H }, () => Array(W).fill(-1));
    const q = [[sx, sy]];
    dist[sy][sx] = 0;
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (ny < 0 || nx < 0 || ny >= H || nx >= W) continue;
        if (dist[ny][nx] >= 0) continue;
        const ch = grid[ny][nx];
        if (ch === "#") continue;
        dist[ny][nx] = dist[y][x] + 1;
        q.push([nx, ny]);
      }
    }
    return dist;
  };

  // Builds one dungeon floor for a module. Returns the map and its meta.
  const makeFloor = (id, name, idx, nFloors, theme, L, rng, rngSecret, mod) => {
    let lay = null;
    for (let t = 0; t < 30 && !lay; t++) lay = makeFloorLayout(rng);
    const grid = lay.grid.map((r) => r.slice());
    const rooms = lay.rooms;
    // Entry and stair rooms: the entry is the room nearest the up stair; the down stair is the farthest room.
    const sortedByRoom = rooms.map((rm, i) => ({ i, rm }));
    const first = rooms[0];
    const dist = bfsDist(grid, first.x + Math.floor(first.w / 2), first.y + Math.floor(first.h / 2));
    sortedByRoom.sort((a, b) => dist[a.rm.y + Math.floor(a.rm.h / 2)][a.rm.x + Math.floor(a.rm.w / 2)] - dist[b.rm.y + Math.floor(b.rm.h / 2)][b.rm.x + Math.floor(b.rm.w / 2)]);
    const upRoom = sortedByRoom[0].rm;
    const deepRoom = sortedByRoom[sortedByRoom.length - 1].rm;
    const up = { x: upRoom.x, y: upRoom.y };
    grid[up.y][up.x] = "<";
    let down = null;
    if (idx < nFloors - 1) {
      down = { x: deepRoom.x + deepRoom.w - 1, y: deepRoom.y + deepRoom.h - 1 };
      grid[down.y][down.x] = ">";
    }
    const freeCells = [];
    for (let y = 0; y < grid.length; y++) for (let x = 0; x < grid[0].length; x++) if (grid[y][x] === ".") freeCells.push([x, y]);
    const letterPool = letters.split("");
    const ev = {};
    const take = () => letterPool.shift();
    const roomCells = (rm) => { const out = []; for (let y = rm.y; y < rm.y + rm.h; y++) for (let x = rm.x; x < rm.x + rm.w; x++) if (grid[y][x] === "." ) out.push([x, y]); return out; };
    const nearStair = (x, y) => [up, down].some((s) => s && Math.abs(s.x - x) + Math.abs(s.y - y) <= 1);
    const budget = battleBudget(L);
    // Set battles in mid rooms, one per room, with bounded counts.
    const battleRooms = sortedByRoom.slice(1, Math.max(2, sortedByRoom.length - 1)).map((o) => o.rm);
    let spent = 0;
    let fightCount = 0;
    const pool = POOL[theme] || POOL.goblinoid;
    const perRoom = Math.max(1, Math.min(3, Math.round(budget / 4)));
    for (const rm of battleRooms.slice(0, 4 + (nFloors > 1 ? 1 : 0))) {
      const cells = roomCells(rm).filter(([x, y]) => !nearStair(x, y));
      if (!cells.length) continue;
      const [x, y] = pickR(rngSecret, cells);
      const l = take();
      if (!l) break;
      const kind = pickR(rng, pool);
      const weight = Math.max(1, Math.round(budget / Math.max(1, weightOf(kind))));
      const count = Math.max(1, Math.min(perRoom + 1, weight));
      ev[l] = { enc: { mons: [[kind, count]], text: "A band of " + Data.MONSTERS[kind].plural + " is camped in the room.", arena: theme === "undead" ? "crypt" : "dungeon", gold: "" + (1 + Math.floor(L / 2)) + "d6" } };
      spent += weight;
      grid[y][x] = l;
      fightCount++;
      if (fightCount >= 6) break;
    }
    // Chests in mid-to-deep rooms; one guarded chest in the deepest room.
    const chestRooms = sortedByRoom.slice(2).map((o) => o.rm);
    let chestCount = 0;
    for (const rm of chestRooms) {
      if (chestCount >= 3) break;
      const cells = roomCells(rm).filter(([x, y]) => !nearStair(x, y) && grid[y][x] === ".");
      if (!cells.length) continue;
      const [x, y] = pickR(rngSecret, cells);
      const l = take();
      if (!l) break;
      const kind = chestCount === 0 ? "hoard" : rngSecret() < 0.5 ? "cache" : "chest";
      const roll = Treasure.seeded(id + ":chest:" + idx + ":" + chestCount, L, kind);
      ev[l] = { chest: { text: pickR(rng, ["A battered coffer under the dust.", "A chest chained to the wall.", "A locked strongbox hidden behind the rubble.", "A cache tucked in a niche."]), items: roll.items, gold: "" + roll.gold, guard: null } };
      grid[y][x] = l;
      chestCount++;
    }
    // Secret alcove: one wall cell opens onto a one-cell niche with a chest.
    let secrets = 0;
    for (let tries = 0; tries < 200 && secrets < 1 + (rngSecret() < 0.5 ? 1 : 0); tries++) {
      const x = 1 + Math.floor(rngSecret() * 23), y = 1 + Math.floor(rngSecret() * 17);
      if (grid[y][x] !== "#") continue;
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const open = dirs.filter(([dx, dy]) => grid[y + dy] && grid[y + dy][x + dx] === ".");
      if (open.length !== 1) continue;
      const [dx, dy] = open[0];
      const bx = x - dx, by = y - dy;
      if (!grid[by] || grid[by][bx] !== "#" || !grid[by - dy] || grid[by - dy][bx - dx] !== "#") continue;
      if (grid[by][bx] !== "#") continue;
      const l = take();
      if (!l) break;
      grid[y][x] = "S";
      grid[by][bx] = l;
      ev[l] = { chest: { text: "A niche behind a secret door holds a sealed pouch.", items: [], gold: "" + (4 + L) + "d10" } };
      secrets++;
    }
    // Stairs at the ends; the boss sits in the deepest room (or the nearest room on huge floors).
    const bossRoom = sortedByRoom[sortedByRoom.length - 2] ? sortedByRoom[sortedByRoom.length - 2].rm : deepRoom;
    const bossCells = roomCells(bossRoom).filter(([x, y]) => !nearStair(x, y) && grid[y][x] === ".");
    const bossCell = bossCells.length ? pickR(rngSecret, bossCells) : null;
    const leaderIdx = mod.leaderBase + idx;
    let leaderId = null;
    if (bossCell) {
      const boss = Monsters.leader(theme, leaderIdx, rngSecret);
      leaderId = boss.id;
      const l = take();
      if (l) {
        grid[bossCell[1]][bossCell[0]] = l;
        ev[l] = { enc: { mons: [[boss.id, 1], [pickR(rng, pool), Math.max(1, Math.round(L / 3))]], text: boss.name + " waits at the heart of the floor.", arena: theme === "undead" ? "crypt" : "dungeon", gold: "" + (2 + L) + "d10", quest: mod.mainQuestForFloor[idx] || null, items: [] } };
        if (idx === nFloors - 1 || mod.mainQuestForFloor[idx]) {
          // boss sits in the room opposite the stair: the boss flag for the main deed
        }
      }
    }
    // Traps: two or three on corridor cells away from the stairs and alcoves.
    const traps = [];
    const corr = freeCells.filter(([x, y]) => grid[y][x] === "." && !nearStair(x, y));
    const want = 2 + (rngSecret() < 0.5 ? 1 : 0);
    for (let i = 0; i < want && corr.length; i++) {
      const [x, y] = corr.splice(Math.floor(rngSecret() * corr.length), 1)[0];
      traps.push({ x, y, type: TRAPS[Math.floor(rngSecret() * TRAPS.length)], found: false });
    }
    // Wanderers: lighter than set fights, from the same theme.
    const wander = { chance: 0.02 + L * 0.002, mons: [[pickR(rng, pool), "1d3"], [pickR(rng, pool), "1d2"]] };
    const map = {
      id, name: name + (nFloors > 1 ? " — Floor " + (idx + 1) : ""), outdoor: false, safe: false, arena: theme === "undead" ? "crypt" : "dungeon",
      wall: theme === "undead" ? "crypt" : theme === "goblinoid" ? "mine" : theme === "giants" ? "keep" : "stone",
      floor: "flags", ceil: "vault", grid: grid.map((r) => r.join("")), svc: {}, links: {}, ev, traps, wander,
    };
    map.start = { x: up.x + 1 < grid[0].length && grid[up.y][up.x + 1] === "." ? up.x + 1 : up.x, y: up.y, dir: 1 };
    return { map, up, down, leaderId, fights: fightCount, chests: chestCount, secrets, bossCell };
  };

  // --------------------------------------------------------- wilderness ----
  // A region 28x20 to 40x26: mountains, biomes, a river with bridges, roads, home in the north.
  const makeWild = (id, name, rng, size, theme) => {
    const W = size === "huge" ? 40 : size === "large" ? 36 : size === "medium" ? 32 : 28;
    const H = size === "huge" ? 26 : size === "large" ? 24 : size === "medium" ? 22 : 20;
    const g = Array.from({ length: H }, () => Array(W).fill("."));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) g[y][x] = "^";
    // Biomes: forest, hills, fen patches.
    const patch = (ch, count, rad) => {
      for (let k = 0; k < count; k++) {
        const cx = 3 + Math.floor(rng() * (W - 6)), cy = 3 + Math.floor(rng() * (H - 6));
        for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) {
          if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) continue;
          if (g[y][x] === "." && (x - cx) * (x - cx) + (y - cy) * (y - cy) <= rad * rad && rng() < 0.85) g[y][x] = ch;
        }
      }
    };
    patch("T", 3 + Math.floor(rng() * 2), 3);
    patch("n", 2, 2);
    // Mountain ridges inside the border.
    for (let k = 0; k < 2; k++) {
      const x0 = 4 + Math.floor(rng() * (W - 8));
      for (let y = 2; y < H - 2; y++) if (rng() < 0.8 && g[y][x0] === ".") g[y][x0] = "^";
    }
    // Winding river from the north edge to the south edge.
    let rx = 4 + Math.floor(rng() * (W - 8));
    const riverBridges = [];
    for (let y = 1; y < H - 1; y++) {
      rx = Math.max(3, Math.min(W - 4, rx + (rng() < 0.4 ? (rng() < 0.5 ? -1 : 1) : 0)));
      g[y][rx] = "~";
      if (rng() < 0.5 && g[y][rx + 1] === ".") g[y][rx + 1] = "%";
      riverBridges.push([rx, y]);
    }
    // Home at the north, the road out to the south.
    const hx = Math.max(4, Math.min(W - 5, Math.floor(W / 2) + Math.floor(rng() * 5) - 2));
    const hy = 3;
    g[hy][hx] = "V";
    // Road south from home to the south edge, bridging the river.
    let rxRoad = hx;
    for (let y = hy + 1; y < H - 1; y++) {
      if (g[y][rxRoad] === "~") g[y][rxRoad] = "+";
      else if (g[y][rxRoad] === "^") break;
      else if (g[y][rxRoad] !== "V" && !"ST".includes(g[y][rxRoad])) g[y][rxRoad] = "=";
      if (rng() < 0.25) rxRoad = Math.max(3, Math.min(W - 4, rxRoad + (rng() < 0.5 ? -1 : 1)));
    }
    // Sites: refuge, healer, lairs, hamlet (medium and up), landmarks.
    const siteLetters = "ABCDEFGHIJKLMOPQRSUWXYZ".split("");
    const sites = {};
    const place = (kind) => {
      for (let tries = 0; tries < 400; tries++) {
        const x = 3 + Math.floor(rng() * (W - 6)), y = 4 + Math.floor(rng() * (H - 8));
        if (g[y][x] !== "." && g[y][x] !== "T" && g[y][x] !== "n" && g[y][x] !== "=") continue;
        if (Math.abs(x - hx) + Math.abs(y - hy) < 4) continue;
        const ch = siteLetters.shift();
        if (!ch) return null;
        g[y][x] = ch;
        return { x, y, ch, kind };
      }
      return null;
    };
    const holy = place("holy"), heal = place("heal");
    const lairs = [];
    const lairCount = size === "small" ? 2 : size === "medium" ? 3 : 4;
    for (let i = 0; i < lairCount; i++) { const p = place("fight"); if (p) lairs.push(p); }
    const hamlet = size !== "small" ? place("hamlet") : null;
    const landmark = place("text");
    const all = [holy, heal, hamlet, landmark, ...lairs].filter(Boolean);
    const pool = POOL[theme] || POOL.goblinoid;
    const siteRecs = {};
    siteRecs[g[hy][hx]] = { name: "Home", icon: "village", kind: "home", enter: null, text: "Your home base, reached by the gate." };
    for (const s of all) {
      if (s.kind === "holy") siteRecs[s.ch] = { name: "Wayfarer's Shrine", icon: "stone", kind: "holy", bless: { xp: 60 }, text: "A roadside shrine with fresh flowers and a bell." };
      if (s.kind === "heal") siteRecs[s.ch] = { name: "Hermit's Cottage", icon: "croft", kind: "heal", text: "A hermit's cottage with bundles of herbs drying in the eaves." };
      if (s.kind === "hamlet") siteRecs[s.ch] = { name: "Hamlet of " + name, icon: "farm", kind: "hamlet", text: "A few houses round a well. The hayloft has beds for a night." };
      if (s.kind === "text") siteRecs[s.ch] = { name: "Old Milestone", icon: "stone", kind: "text", text: "A worn stone that once measured the road to the keep." };
      if (s.kind === "fight") {
        const k = pickR(rng, pool);
        const n = Math.max(2, Math.min(5, Math.round(battleBudget(4 + (size === "huge" ? 4 : 0)) / Math.max(1, weightOf(k)))));
        siteRecs[s.ch] = { name: "Lair of the " + Data.MONSTERS[k].plural, icon: "den", kind: "fight", once: true, enc: { mons: [[k, n]], text: "Something lives here, and it has heard you coming.", arena: "forest" }, cache: { gold: "" + (2 + Math.round(battleBudget(4) / 3)) + "d6" }, text: "The bones of old quarry around a hollow." };
      }
    }
    // Reach check: every site must be reachable from home over passable ground; repair by carving a road.
    const passable = (ch) => ch !== "^" && ch !== "~";
    const reachFrom = (sx, sy) => {
      const seen = new Set([sx + "," + sy]), q = [[sx, sy]];
      while (q.length) {
        const [x, y] = q.shift();
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const k = nx + "," + ny;
          if (seen.has(k) || !passable(g[ny][nx])) continue;
          seen.add(k);
          q.push([nx, ny]);
        }
      }
      return seen;
    };
    for (let round = 0; round < 3; round++) {
      const seen = reachFrom(hx, hy);
      let fixed = true;
      for (const s of all) {
        if (!seen.has(s.x + "," + s.y)) {
          fixed = false;
          // Carve a straight road from the site toward home, bridging water.
          let x = s.x, y = s.y;
          while (x !== hx || y !== hy) {
            if (x !== hx) x += Math.sign(hx - x);
            else y += Math.sign(hy - y);
            if (g[y][x] === "~") g[y][x] = "+";
            else if (g[y][x] === "^") g[y][x] = "=";
            else if (!/[A-Za-z]/.test(g[y][x]) || g[y][x] === "V") { if (g[y][x] === "." || g[y][x] === "T" || g[y][x] === "n" || g[y][x] === "%") g[y][x] = "="; }
          }
        }
      }
      if (fixed) break;
    }
    // Sites are coloured in with their letters; make sure the letters are where the records say.
    return { id, name: name + " Country", overland: true, region: id, grid: g.map((r) => r.join("")), sites: siteRecs, enc: [
      { terrain: [".", "="], time: "day", w: 4, mons: [[pickR(rng, pool), "1d4"]], text: "Something on the road turns to look at you." },
      { terrain: ["T"], time: "any", w: 4, mons: [[pickR(rng, pool), "1d3+1"]], text: "Shapes move through the trees." },
      { terrain: ["n"], time: "any", w: 3, mons: [[pickR(rng, pool), "1d2"]], text: "A patrol comes over the hill." },
      { terrain: [".", "%"], time: "night", w: 3, mons: [[pickR(rng, pool), "2d3"]], text: "Eyes glint in the dark." },
    ], encRate: 1, colors: { water: "#23436b", road: "#9b8a62", mountain: "#4a4f58" },
      rumors: ["The road south is safer with company.", "The river bridges are the only sure crossings."],
      travellers: [{ text: "A pedlar with a cart offers rations and rope.", goods: ["ration", "rope", "bandage"] }] };
  };

  // --------------------------------------------------------- module build ----
  const buildModule = (t, i, layoutItem) => {
    const [sizeKey, theme] = layoutItem;
    const size = SIZE[sizeKey];
    const seed = 7919 * t + 104729 * i + 31 * theme.length;
    const rng = Rules.mulberry32(seed);
    const rngWild = Rules.mulberry32(seed + 15485863);
    const rngSecret = Rules.mulberry32(seed + 32452843);
    const L = startLevelOf(t);
    const code = "T" + t + "-" + String(i).padStart(2, "0");
    const id = "adv" + t + "_" + i;
    // Reference fixtures from the spec keep their names; every other module is generated.
    const FIX = { adv1_1: { place: "Crowstead", first: "Othys", epithet: "the Many-Legged" }, adv5_10: { place: "Greycross", first: "Zuloon", epithet: "", name: "The Crypt of Zuloon" } };
    const fx = FIX[id];
    const place = fx ? fx.place : PREFIX[(seed >>> 2) % PREFIX.length] + SUFFIX[(seed >>> 5) % SUFFIX.length];
    const villain = fx ? fx.first + (fx.epithet ? " " + fx.epithet : "") : FIRST[Math.floor(rng() * FIRST.length)] + " " + EPITHET[Math.floor(rng() * EPITHET.length)];
    const name = fx && fx.name ? fx.name : "The " + NOUN[theme] + " of " + place;
    const homeId = id + "_home";
    const home = makeHome(homeId, place, rngSecret, size.floors > 2);
    const floors = [];
    const mod = {
      code, id, name, lvl: L, levels: [L, L + size.span], diff: size.diff, size: size.text, length: size.length,
      hub: homeId, maps: [homeId], gold: goldFor(L), next: null, quests: [], side: [], final: null,
      names: { giver: "Reeve of " + place, trainer: "Trainer of " + place, hall: "Hall of " + place, inn: "The Sleepy Hen", general: "Hesk's General Goods", temple: "Shrine of the Dawn" },
      rumors: [], blurb: "A " + theme + " trouble in " + place + ". " + size.text + " in size, for companies of " + L + " and up.",
      intro: "The reeve of " + place + " wants " + theme + " cleared out of the " + NOUN[theme].toLowerCase() + " beneath the town. " + villain + " is said to lead them.",
      hint: "The brewery stair leads down. Keep the wilds clear of stragglers on the road south.",
      victory: "The " + NOUN[theme] + " of " + place + " is quiet at last, and the bells ring for the reeve's thanks.",
      lose: "The " + NOUN[theme] + " takes your company. Load a save or return to the title.",
      tier: t, generated: true, mainFloorQuests: [], mainQuestForFloor: {}, leaderBase: 0,
    };
    // Deeds: one per floor, or four on huge floors 2-5.
    const deedFloors = size.floors === 5 ? [1, 2, 3, 4] : Array.from({ length: size.floors }, (_, k) => k);
    mod.leaderBase = t * 100 + i * 10;
    const deedIds = [];
    for (let k = 0; k < deedFloors.length; k++) deedIds.push(id + "_m" + (k + 1));
    deedFloors.forEach((fi, k) => { mod.mainQuestForFloor[fi] = deedIds[k]; });
    // Floors: the first is entered from the home's stair.
    const floorIds = [];
    for (let f = 0; f < size.floors; f++) {
      const fid = id + "_f" + (f + 1);
      floorIds.push(fid);
      const built = makeFloor(fid, place, f, size.floors, theme, L + Math.floor(f / 2), rngSecret, rng, mod);
      floors.push(built);
      built.map.id = fid;
    }
    // Stairs: home down to floor 1, floors chained, the last floor has none.
    const homeDown = { x: 2, y: 4 };
    home.links["2,4"] = { kind: "stair", to: { map: floorIds[0], x: floors[0].map.start.x, y: floors[0].map.start.y, dir: 1 }, label: "Brewery stair" };
    home.links["2,4"].to.dir = 1;
    home.links["9,14"] = { kind: "gate", to: { map: id + "_wild", x: 0, y: 0, dir: 0 }, label: "South gate", gate: "the wilds of " + place };
    // Arrival cells sit on open floor beside a stair, never on the stair itself.
    const beside = (m, s) => {
      const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [s.x + dx, s.y + dy]);
      const hit = opts.find(([x, y]) => m.grid[y] && m.grid[y][x] === ".");
      return hit ? { x: hit[0], y: hit[1] } : { x: s.x, y: s.y };
    };
    floors.forEach((fl, f) => {
      const m = fl.map;
      if (f > 0) {
        const prev = floors[f - 1];
        const at = beside(prev.map, prev.down);
        m.links[fl.up.x + "," + fl.up.y] = { kind: "stair", to: { map: floorIds[f - 1], x: at.x, y: at.y, dir: 1 }, label: "stair up" };
      } else {
        m.links[fl.up.x + "," + fl.up.y] = { kind: "stair", to: { map: homeId, x: 2, y: 5, dir: 0 }, label: "stair up to the brewery" };
      }
      if (fl.down) {
        const at = beside(floors[f + 1].map, floors[f + 1].up);
        m.links[fl.down.x + "," + fl.down.y] = { kind: "stair", to: { map: floorIds[f + 1], x: at.x, y: at.y, dir: 1 }, label: "stair down" };
      }
      m.start = beside(m, fl.up);
      m.start.dir = 1;
    });
    // Commissions: each main deed is tied to its boss (or the nearest floor's boss), plus one retrieval.
    const quests = {};
    deedFloors.forEach((fi, k) => {
      const fl = floors[fi];
      const qid = deedIds[k];
      const isLast = k === deedFloors.length - 1;
      const gold = 80 + 60 * (L + fi);
      const xp = 200 + 150 * (L + fi) + (isLast ? 300 : 0);
      quests[qid] = { id: qid, name: "The " + (k === 0 ? "First" : k === 1 ? "Second" : k === 2 ? "Third" : "Deep") + " Deed of " + place, module: id, lead: "Reeve of " + place, giver: "Reeve of " + place, goal: "Defeat the lord of the " + NOUN[theme].toLowerCase() + " on floor " + (fi + 1) + " of " + place + ".", offer: "Word from the " + NOUN[theme].toLowerCase() + ": the lord on floor " + (fi + 1) + " must fall.", done: "The lord of the " + NOUN[theme].toLowerCase() + " is dead. The reeve sends for a cup of wine.", gold, xp, side: false, needItem: null, reveal: null };
      if (fl.leaderId) {
        const lid = fl.leaderId;
        const boss = Data.MONSTERS[lid];
        quests[qid].goal = "Defeat " + boss.name + " on floor " + (fi + 1) + " of " + place + ".";
        // The leader's encounter carries the quest flag.
        const map = fl.map;
        for (const k2 of Object.keys(map.ev)) if (map.ev[k2].enc && map.ev[k2].enc.mons[0] && map.ev[k2].enc.mons[0][0] === lid) map.ev[k2].enc.quest = qid;
      }
    });
    mod.quests = deedIds.slice();
    // Side commission: a retrieval item from the floor's chest.
    const sideCount = size.floors === 5 ? 2 : 1;
    for (let s = 0; s < sideCount; s++) {
      const sid = id + "_s" + (s + 1);
      const itemId = "ret_" + id + "_" + (s + 1);
      const itemName = RETRIEVE[Math.floor(rng() * RETRIEVE.length)];
      Data.ITEMS[itemId] = { id: itemId, name: itemName, type: "q", slot: null, cost: 0, wt: 0.5, desc: "Taken from the " + NOUN[theme].toLowerCase() + " of " + place + ".", sell: false, cls: "FPRMCT", magic: false, cat: "quest", tier: 0 };
      const fl = floors[Math.min(floors.length - 1, s % floors.length)];
      // Place it in the first chest on that floor.
      const chestKeys = Object.keys(fl.map.ev).filter((k) => fl.map.ev[k].chest);
      if (chestKeys.length) fl.map.ev[chestKeys[0]].chest.items = (fl.map.ev[chestKeys[0]].chest.items || []).concat([itemId]);
      quests[sid] = { id: sid, name: "A Lost " + itemName, module: id, side: true, lead: "Reeve of " + place, giver: "Widow " + place.split("").slice(0, 3).join(""), goal: "Recover the " + itemName.toLowerCase() + " from the " + NOUN[theme].toLowerCase() + ".", offer: "Someone lost the " + itemName.toLowerCase() + " down there. Bring it back.", done: "The " + itemName.toLowerCase() + " is returned to its owner.", gold: 40 + 20 * L, xp: 120 + 60 * L, needItem: itemId, reveal: null };
      mod.side.push(sid);
    }
    // Wilderness: the region sits beside the home on the road out.
    const wildId = id + "_wild";
    const wild = makeWild(wildId, place, rngWild, sizeKey, theme);
    // Gate arrival: the home site (V) on the wild.
    let vx = 0, vy = 0;
    for (let y = 0; y < wild.grid.length; y++) for (let x = 0; x < wild.grid[0].length; x++) if (wild.grid[y][x] === "V") { vx = x; vy = y; }
    // The gate arrives on a walkable tile beside home (grass, road or forest).
    const near = [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]) => [vx + dx, vy + dy])
      .find(([x, y]) => wild.grid[y] && "=.T+n%".includes(wild.grid[y][x]));
    const arrive = near ? { x: near[0], y: near[1] } : { x: vx, y: vy };
    home.links["9,14"].to = { map: wildId, x: arrive.x, y: arrive.y, dir: 0 };
    wild.sites.V = { name: place, icon: "village", kind: "home", enter: { map: homeId, x: 9, y: 13, dir: 0 }, text: "The home of " + place + "." };
    mod.maps = [homeId].concat(floorIds, [wildId]);
    mod.final = deedIds[deedIds.length - 1];
    Data.MAPS[homeId] = home;
    for (const f of floors) Data.MAPS[f.map.id] = f.map;
    Data.MAPS[wildId] = wild;
    for (const q of Object.values(quests)) Data.QUESTS[q.id] = q;
    mod.questIds = Object.keys(quests);
    Modules.MODULES[id] = mod;
    A.ALL.push(mod);
    return mod;
  };

  // Band shops: mundane and silver stock plus items from lower tiers.
  const buildShops = (t) => {
    const base = ["padded_armor", "leather_armor", "studded_leather", "chain_mail", "shield", "dagger", "short_sword", "longsword", "mace", "war_hammer", "short_bow", "light_crossbow", "silver_dagger", "silver_longsword", "silver_mace"];
    const magic = Object.keys(Data.ITEMS).filter((k) => Data.ITEMS[k].magic && (Data.ITEMS[k].tier || 1) <= Math.max(1, t - 1) && (Data.ITEMS[k].cat === "weapons" || Data.ITEMS[k].cat === "armor" || Data.ITEMS[k].cat === "swords"));
    Data.SHOPS["band" + t + "_armory"] = { id: "band" + t + "_armory", name: "Armoury", stock: base.concat(magic.slice(0, 12)) };
    const potions = ["potion_healing", "potion_extra_healing", "potion_antivenom", "potion_heroism", "holy_water", "bandage"].concat(Object.keys(Data.ITEMS).filter((k) => Data.ITEMS[k].cat === "potions" && (Data.ITEMS[k].tier || 1) <= t).slice(0, 4));
    Data.SHOPS["band" + t + "_apothecary"] = { id: "band" + t + "_apothecary", name: "Apothecary", stock: potions };
    Data.SHOPS["band" + t + "_general"] = { id: "band" + t + "_general", name: "General Store", stock: Data.SHOPS.general.stock.slice() };
  };

  // Build all fifty modules once, in stable band and index order.
  A.buildAll = () => {
    if (A.built) return A.ALL;
    A.built = true;
    for (let t = 1; t <= 5; t++) {
      buildShops(t);
      LAYOUT[t - 1].forEach((item, idx) => {
        const i = idx + 1;
        const mod = buildModule(t, i, item);
        A.BANDS[t - 1].push(mod.id);
      });
      // Link each module to the next in its band; the last to the next band's first; the final to null.
      const ids = A.BANDS[t - 1];
      ids.forEach((id, k) => {
        const m = Modules.MODULES[id];
        if (k < ids.length - 1) m.next = ids[k + 1];
        else if (t < 5) m.next = A.BANDS[t][0];
        else m.next = null;
      });
    }
    return A.ALL;
  };

  A.makeWild = makeWild;
  return A;
})();

Adventures.buildAll();

// The saga's three wildernesses are generated from fixed seeds and attached to their
// authored hubs: the home site enters the hub, and the hub's gate arrives beside it.
(() => {
  const setChar = (wild, x, y, ch) => {
    const r = wild.grid[y].split("");
    r[x] = ch;
    wild.grid[y] = r.join("");
  };
  const findChar = (wild, ch) => {
    for (let y = 0; y < wild.grid.length; y++) for (let x = 0; x < wild.grid[0].length; x++) if (wild.grid[y][x] === ch) return { x, y };
    return null;
  };
  const arrivalNear = (wild, p) => {
    const steps = [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    for (const [dx, dy] of steps) {
      const x = p.x + dx, y = p.y + dy;
      if (y >= 0 && y < wild.grid.length && x >= 0 && x < wild.grid[0].length && "=.T+n%".includes(wild.grid[y][x])) return { x, y };
    }
    return { x: p.x, y: p.y };
  };
  // A free walkable tile at least a few miles from home, chosen by a seeded generator.
  const placeSite = (wild, home, letter, rec, seed) => {
    const rng = Rules.mulberry32(seed);
    for (let t = 0; t < 4000; t++) {
      const x = 2 + Math.floor(rng() * (wild.grid[0].length - 4));
      const y = 2 + Math.floor(rng() * (wild.grid.length - 4));
      if (!".T".includes(wild.grid[y][x])) continue;
      if (Math.abs(x - home.x) + Math.abs(y - home.y) < 6) continue;
      setChar(wild, x, y, letter);
      wild.sites[letter] = rec;
      return { x, y };
    }
    return null;
  };
  const attach = (wildId, name, seed, size, theme, hubId, gateCell, homeName, homeStart) => {
    const wild = Adventures.makeWild(wildId, name, Rules.mulberry32(seed), size, theme);
    Data.MAPS[wildId] = wild;
    const v = findChar(wild, "V");
    wild.sites.V = { name: homeName, icon: "village", kind: "home", enter: { map: hubId, x: homeStart.x, y: homeStart.y, dir: homeStart.dir }, text: "The gate of " + homeName + " opens here." };
    const at = arrivalNear(wild, v);
    const hub = Data.MAPS[hubId];
    hub.links[gateCell] = Object.assign({}, hub.links[gateCell] || {}, { kind: "gate", to: { map: wildId, x: at.x, y: at.y, dir: 0 }, label: "gate", gate: name });
    return { wild, v };
  };
  // Emberwild: home is Emberfall, and the Bloodmane Watchtower stands on the road.
  const e = attach("wild", "The Emberwild", 9011, "huge", "undead", "town", "12,20", "Emberfall", { x: 12, y: 19, dir: 0 });
  const tower = placeSite(e.wild, e.v, "Q", { name: "Bloodmane Watchtower", icon: "tower", kind: "enter", enter: { map: "tower", x: 8, y: 13, dir: 0 }, text: "A gnoll watchtower of old timbers and bone, with cells at its foot." }, 9021);
  if (tower) {
    const at = arrivalNear(e.wild, tower);
    Data.MAPS.tower.links["8,14"] = { kind: "gate", to: { map: "wild", x: at.x, y: at.y, dir: 0 }, label: "tower gate", gate: "the Emberwild" };
  }
  // Harrow Hills: home is Coldharrow.
  attach("cold_wild", "The Harrow Hills", 9031, "medium", "frozen", "cold_town", "9,14", "Coldharrow", { x: 9, y: 13, dir: 0 });
  // Northern Moors: home is Fort Ravel; the moor village and the keep are sites on the road.
  const r = attach("rav_wild", "The Northern Moors", 9041, "small", "undead", "rav_fort", "8,12", "Fort Ravel", { x: 8, y: 11, dir: 0 });
  const moor = placeSite(r.wild, r.v, "M", { name: "Ravenmoor Village", icon: "village", kind: "enter", enter: { map: "rav_moor", x: 9, y: 13, dir: 0 }, text: "The burned village, where Gnashrot's trolls hold the causeway." }, 9051);
  const keep = placeSite(r.wild, r.v, "K", { name: "Ravenmoor Keep", icon: "keep", kind: "enter", requires: "q:rav_moor", enter: { map: "rav_keep", x: 9, y: 13, dir: 0 }, text: "The keep above the moat. Its gate stays shut while the trolls live." }, 9061);
  if (moor) {
    const at = arrivalNear(r.wild, moor);
    Data.MAPS.rav_moor.links["9,14"] = { kind: "gate", to: { map: "rav_wild", x: at.x, y: at.y, dir: 0 }, label: "village gate", gate: "the moor" };
  }
  if (keep) {
    const at = arrivalNear(r.wild, keep);
    Data.MAPS.rav_keep.links["9,14"] = { kind: "gate", to: { map: "rav_wild", x: at.x, y: at.y, dir: 0 }, label: "keep gate", gate: "the moor", requires: "q:rav_moor" };
  }
})();
