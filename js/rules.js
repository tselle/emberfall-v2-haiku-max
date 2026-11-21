"use strict";
/*
 * Rules: dice, races, classes, ability modifiers, THAC0, saves, spell slots,
 * turning, thief skills, PC creation, experience and derived sheet values.
 * Nothing here draws or touches the DOM. Derived values are always computed
 * from the current equipment and effects; sheets never store them.
 */
const Rules = (() => {
  const R = {};

  // ---------------------------------------------------------------- dice ----
  R.rnd = () => Math.random();
  R.die = (s, rng = Math.random) => 1 + Math.floor(rng() * s);
  R.parse = (expr) => {
    if (typeof expr === "number") return { n: 0, s: 0, k: Math.trunc(expr) };
    const text = String(expr);
    const m = /^\s*(\d*)\s*d\s*(\d+)\s*(?:([+-])\s*(\d+))?\s*$/i.exec(text);
    if (m) {
      return {
        n: m[1] === "" ? 1 : +m[1],
        s: +m[2],
        k: m[3] ? (m[3] === "-" ? -1 : 1) * +m[4] : 0,
      };
    }
    const f = /^\s*([+-]?\d+)\s*$/.exec(text);
    if (f) return { n: 0, s: 0, k: +f[1] };
    throw new Error("Unreadable dice expression: " + text);
  };
  R.dice = (expr, rng = Math.random) => {
    const p = R.parse(expr);
    let t = p.k;
    for (let i = 0; i < p.n; i++) t += R.die(p.s, rng);
    return t;
  };
  // Min and max of a dice expression (used for previews).
  R.range = (expr) => {
    const p = R.parse(expr);
    return { min: p.n + p.k, max: p.n * p.s + p.k };
  };
  // Seeded 32-bit generator (Mulberry32). Used only by the content generator.
  R.mulberry32 = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  // Stable string hash for seeds.
  R.hash = (s) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  };
  R.pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];
  R.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  R.uid = (p = "c") => p + "_" + Math.random().toString(36).slice(2, 9);

  // ------------------------------------------------------- abilities ----
  R.ABIL = ["str", "dex", "con", "int", "wis", "cha"];
  R.ABIL_NAMES = {
    str: "Strength", dex: "Dexterity", con: "Constitution",
    int: "Intelligence", wis: "Wisdom", cha: "Charisma",
  };

  // Strength to-hit / damage. x is the exceptional strength roll (0 = none).
  R.strMod = (s, x = 0) => {
    if (s <= 3) return { hit: -3, dmg: -1, force: 5 };
    if (s <= 5) return { hit: -2, dmg: -1, force: 7 };
    if (s <= 7) return { hit: -1, dmg: 0, force: 8 };
    if (s <= 15) return { hit: 0, dmg: 0, force: 10 };
    if (s === 16) return { hit: 0, dmg: 1, force: 12 };
    if (s === 17) return { hit: 1, dmg: 1, force: 13 };
    if (s === 18) {
      if (x <= 0) return { hit: 1, dmg: 2, force: 15 };
      if (x <= 50) return { hit: 2, dmg: 3, force: 16 };
      if (x <= 75) return { hit: 2, dmg: 4, force: 17 };
      if (x <= 90) return { hit: 3, dmg: 5, force: 18 };
      if (x <= 99) return { hit: 4, dmg: 6, force: 19 };
      return { hit: 5, dmg: 7, force: 20 };
    }
    return { hit: 3, dmg: 3, force: 20 };
  };
  // Dexterity: ac is an improvement to armor class (subtract from AC), missile is to-hit.
  R.dexMod = (s) => {
    if (s <= 3) return { ac: -3, missile: -3, react: -2 };
    if (s === 4) return { ac: -2, missile: -2, react: -1 };
    if (s === 5) return { ac: -1, missile: -1, react: -1 };
    if (s <= 7) return { ac: 0, missile: -1, react: 0 };
    if (s <= 14) return { ac: 0, missile: 0, react: 0 };
    if (s === 15) return { ac: 1, missile: 1, react: 1 };
    if (s === 16) return { ac: 2, missile: 2, react: 1 };
    if (s === 17) return { ac: 3, missile: 2, react: 2 };
    return { ac: 4, missile: 2, react: 2 };
  };
  R.conMod = (s) => {
    if (s <= 3) return { hp: -2 };
    if (s <= 5) return { hp: -1 };
    if (s <= 14) return { hp: 0 };
    if (s === 15) return { hp: 1 };
    if (s <= 17) return { hp: 2 };
    return { hp: 3 };
  };
  R.wisMod = (s) => ({ mental: s <= 5 ? -1 : s >= 17 ? 2 : s >= 15 ? 1 : 0 });
  R.chaMod = (s) => (s <= 5 ? -2 : s <= 7 ? -1 : s <= 14 ? 0 : s <= 16 ? 1 : 2);
  // Chance (percent) to learn a spell from a scroll.
  R.learnChance = (int) => (int < 9 ? Math.max(10, 30 - (9 - int) * 5) : Math.min(90, 35 + (int - 9) * 5));
  // Conservative magic-save bonus from constitution, used by small races.
  R.conSaveBonus = (con) => (con >= 17 ? 3 : con >= 15 ? 2 : con >= 12 ? 1 : 0);

  // ----------------------------------------------------- races ---------
  const RAW_ALL = { str: 3, dex: 3, con: 3, int: 3, wis: 3, cha: 3 };
  const MAX_ALL = { str: 18, dex: 18, con: 18, int: 18, wis: 18, cha: 18 };
  R.RACES = {
    human: {
      id: "human", name: "Human", adj: {}, classes: "FPRMCT", mv: 12,
      min: { ...RAW_ALL }, max: { ...MAX_ALL },
      desc: "Adaptable and common. Any class; no special resistances.",
    },
    dwarf: {
      id: "dwarf", name: "Dwarf", adj: { con: 1, cha: -1 }, classes: "FCT", mv: 10,
      min: { str: 8, dex: 3, con: 12, int: 3, wis: 3, cha: 3 },
      max: { str: 18, dex: 17, con: 19, int: 18, wis: 18, cha: 16 },
      desc: "Stout and stubborn. Save bonuses against magic and poison; good against goblins, orcs and giants.",
    },
    elf: {
      id: "elf", name: "Elf", adj: { dex: 1, con: -1 }, classes: "FRMCT", mv: 12,
      min: { str: 3, dex: 6, con: 4, int: 8, wis: 3, cha: 8 },
      max: { ...MAX_ALL },
      desc: "Graceful and keen-eyed. Resists sleep and ghoul paralysis; finds secret doors; skilled with swords and bows.",
    },
    gnome: {
      id: "gnome", name: "Gnome", adj: { int: 1, wis: -1 }, classes: "FCT", mv: 10,
      min: { str: 6, dex: 3, con: 8, int: 6, wis: 3, cha: 3 },
      max: { str: 18, dex: 18, con: 18, int: 18, wis: 17, cha: 18 },
      desc: "Curious tinkerers. Magic save bonuses; good against kobolds and goblins; defended against large foes.",
    },
    "half-elf": {
      id: "half-elf", name: "Half-elf", adj: {}, classes: "FRMCT", mv: 12,
      min: { str: 3, dex: 6, con: 6, int: 4, wis: 4, cha: 3 },
      max: { ...MAX_ALL },
      desc: "Between two peoples. Partial sleep resistance; finds secret doors; any of the five non-paladin classes.",
    },
    halfling: {
      id: "halfling", name: "Halfling", adj: { dex: 1, str: -1 }, classes: "FCT", mv: 10,
      min: { str: 6, dex: 8, con: 10, int: 6, wis: 3, cha: 3 },
      max: { str: 17, dex: 18, con: 18, int: 18, wis: 17, cha: 18 },
      desc: "Nimble and lucky. Good with slings and thrown weapons; resists poison; hard to hit for large foes.",
    },
  };
  // Racial mechanics read by combat, exploration and sheets.
  R.RACE_FX = {
    human: {},
    dwarf: { magicSave: true, poisonSave: true, hitVs: ["goblinoid", "orc", "gnoll"], hitBonus: 1, largeAC: 4 },
    elf: { sleepRes: 90, ghoulRes: true, secretChance: 2, swordBow: 1 },
    gnome: { magicSave: true, hitVs: ["kobold", "goblinoid"], hitBonus: 1, largeAC: 4 },
    "half-elf": { sleepRes: 30, secretChance: 2 },
    halfling: { magicSave: true, poisonSave: true, thrown: 1, largeAC: 2 },
  };

  // ---------------------------------------------------- classes --------
  const XP = {
    F: [0, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 750000, 1000000, 1250000, 1500000, 1750000, 2000000, 2250000, 2500000, 2750000, 3000000],
    P: [0, 2250, 4500, 9000, 18000, 36000, 75000, 150000, 300000, 600000, 900000, 1200000, 1500000, 1800000, 2100000, 2400000, 2700000, 3000000, 3300000, 3600000],
    R: [0, 2250, 4500, 10000, 20000, 40000, 90000, 150000, 225000, 375000, 750000, 975000, 1200000, 1425000, 1650000, 1875000, 2100000, 2325000, 2550000, 2775000],
    M: [0, 2500, 5000, 10000, 20000, 40000, 60000, 90000, 135000, 250000, 375000, 750000, 975000, 1200000, 1425000, 1650000, 1875000, 2100000, 2325000, 2550000],
    C: [0, 1500, 3000, 6000, 13000, 27500, 55000, 110000, 225000, 450000, 675000, 900000, 1125000, 1350000, 1575000, 1800000, 2025000, 2250000, 2475000, 2700000],
    T: [0, 1250, 2500, 5000, 10000, 20000, 40000, 70000, 110000, 160000, 220000, 440000, 660000, 880000, 1100000, 1320000, 1540000, 1760000, 1980000, 2200000],
  };
  R.CLASSES = {
    F: { id: "F", name: "Fighter", die: 10, prime: ["str"], min: { str: 9 }, align: "any", save: "warrior", thac0: "warrior", gold: "5d4", xp: XP.F, kit: 3, cls: "warrior" },
    P: { id: "P", name: "Paladin", die: 10, prime: ["str", "cha"], min: { str: 12, con: 9, wis: 13, cha: 17 }, align: "LG", save: "warrior", thac0: "warrior", gold: "5d4", xp: XP.P, kit: 3, cls: "warrior" },
    R: { id: "R", name: "Ranger", die: 10, prime: ["str", "dex", "wis"], min: { str: 13, dex: 13, con: 14, wis: 14 }, align: "good", save: "warrior", thac0: "warrior", gold: "5d4", xp: XP.R, kit: 3, cls: "warrior" },
    M: { id: "M", name: "Mage", die: 4, prime: ["int"], min: { int: 9 }, align: "any", save: "wizard", thac0: "mage", gold: "1d4+1", xp: XP.M, kit: 5, cls: "mage" },
    C: { id: "C", name: "Cleric", die: 8, prime: ["wis"], min: { wis: 9 }, align: "any", save: "priest", thac0: "priest", gold: "3d6", xp: XP.C, kit: 3, cls: "priest" },
    T: { id: "T", name: "Thief", die: 6, prime: ["dex"], min: { dex: 9 }, align: "notLG", save: "rogue", thac0: "thief", gold: "2d6", xp: XP.T, kit: 2, cls: "thief" },
  };
  R.CLASS_ORDER = ["F", "P", "R", "M", "C", "T"];
  R.ALIGNS = ["LG", "NG", "CG", "LN", "N", "CN", "LE", "NE", "CE"];
  R.ALIGN_NAMES = {
    LG: "Lawful Good", NG: "Neutral Good", CG: "Chaotic Good", LN: "Lawful Neutral", N: "True Neutral",
    CN: "Chaotic Neutral", LE: "Lawful Evil", NE: "Neutral Evil", CE: "Chaotic Evil",
  };
  // Alignments a class may take, given its restriction code.
  R.alignAllowed = (cls, align) => {
    const K = R.CLASSES[cls];
    if (!K) return false;
    if (K.align === "any") return true;
    if (K.align === "LG") return align === "LG";
    if (K.align === "good") return ["LG", "NG", "CG"].includes(align);
    if (K.align === "notLG") return align !== "LG";
    return true;
  };
  R.raceAllowsClass = (race, cls) => {
    const rc = R.RACES[race];
    return !!rc && rc.classes.includes(cls) && (cls !== "P" || race === "human");
  };
  // Paladins are human-only and ranger/thief alignment rules are enforced in the creator.
  R.classesFor = (race) => R.CLASS_ORDER.filter((c) => R.raceAllowsClass(race, c));

  // Group saving throws (targets) by class save family, indexed by level-1.
  // Order: [paralysis/poison/death, rod/staff/wand, petrification/polymorph, breath, spell].
  const SAVE_BANDS = {
    warrior: [
      [14, 16, 15, 17, 17], [14, 16, 15, 17, 17], [13, 15, 14, 16, 16], [13, 15, 14, 16, 16],
      [11, 13, 12, 14, 14], [11, 13, 12, 14, 14], [10, 12, 11, 13, 13], [10, 12, 11, 13, 13],
      [8, 10, 9, 11, 11], [8, 10, 9, 11, 11], [7, 9, 8, 10, 10], [7, 9, 8, 10, 10],
      [5, 7, 6, 8, 8], [5, 7, 6, 8, 8], [4, 6, 5, 7, 7], [4, 6, 5, 7, 7],
      [3, 5, 4, 6, 6], [3, 5, 4, 6, 6], [2, 4, 3, 5, 5], [2, 4, 3, 5, 5],
    ],
    priest: [
      [10, 13, 14, 16, 15], [10, 13, 14, 16, 15], [10, 13, 14, 16, 15], [9, 12, 13, 15, 14],
      [9, 12, 13, 15, 14], [9, 12, 13, 15, 14], [7, 11, 10, 14, 12], [7, 11, 10, 14, 12],
      [7, 11, 10, 14, 12], [6, 10, 9, 13, 11], [6, 10, 9, 13, 11], [6, 10, 9, 13, 11],
      [5, 9, 8, 12, 10], [5, 9, 8, 12, 10], [5, 9, 8, 12, 10], [4, 8, 7, 11, 9],
      [4, 8, 7, 11, 9], [4, 8, 7, 11, 9], [3, 7, 6, 10, 8], [3, 7, 6, 10, 8],
    ],
    rogue: [
      [13, 14, 12, 16, 15], [13, 14, 12, 16, 15], [13, 14, 12, 16, 15], [13, 14, 12, 16, 15],
      [12, 13, 11, 15, 14], [12, 13, 11, 15, 14], [12, 13, 11, 15, 14], [12, 13, 11, 15, 14],
      [11, 12, 10, 14, 13], [11, 12, 10, 14, 13], [11, 12, 10, 14, 13], [11, 12, 10, 14, 13],
      [10, 11, 9, 13, 12], [10, 11, 9, 13, 12], [10, 11, 9, 13, 12], [10, 11, 9, 13, 12],
      [8, 10, 7, 12, 11], [8, 10, 7, 12, 11], [8, 10, 7, 12, 11], [8, 10, 7, 12, 11],
    ],
    wizard: [
      [14, 11, 13, 15, 12], [14, 11, 13, 15, 12], [14, 11, 13, 15, 12], [14, 11, 13, 15, 12], [14, 11, 13, 15, 12],
      [13, 10, 12, 14, 11], [13, 10, 12, 14, 11], [13, 10, 12, 14, 11], [13, 10, 12, 14, 11], [13, 10, 12, 14, 11],
      [11, 8, 10, 12, 9], [11, 8, 10, 12, 9], [11, 8, 10, 12, 9], [11, 8, 10, 12, 9], [11, 8, 10, 12, 9],
      [9, 6, 8, 10, 7], [9, 6, 8, 10, 7], [9, 6, 8, 10, 7], [9, 6, 8, 10, 7], [9, 6, 8, 10, 7],
    ],
  };
  // Monsters save as warriors of their hit dice (used for their spell and breath checks).
  R.saveTarget = (family, lvl, index) => {
    const band = SAVE_BANDS[family] || SAVE_BANDS.warrior;
    const row = band[R.clamp(lvl, 1, 20) - 1];
    return row[index];
  };

  // Spell slots by class level. Arrays are slots for spell levels 1..n.
  const MAGE_SLOTS = [
    [1], [2], [2, 1], [2, 2], [3, 2, 1], [3, 3, 2], [3, 3, 2, 1], [3, 3, 3, 2], [4, 3, 3, 2, 1],
    [4, 4, 3, 3, 2], [4, 4, 4, 3, 3, 1], [4, 4, 4, 3, 3, 2], [4, 4, 4, 4, 3, 2, 1],
    [4, 4, 4, 4, 3, 3, 2], [4, 4, 4, 4, 4, 3, 2, 1], [5, 5, 4, 4, 4, 3, 2, 1],
    [5, 5, 5, 4, 4, 3, 3, 2], [5, 5, 5, 5, 4, 4, 3, 2, 1], [5, 5, 5, 5, 5, 4, 3, 2, 1], [6, 6, 5, 5, 5, 4, 3, 2, 1],
  ];
  const PRIEST_SLOTS = [
    [1], [2], [2, 1], [3, 2], [3, 3, 1], [3, 3, 2], [3, 3, 2, 1], [3, 3, 3, 2], [4, 4, 3, 2, 1],
    [4, 4, 3, 3, 2], [5, 5, 4, 3, 2, 1], [6, 5, 5, 3, 2, 1], [6, 6, 5, 4, 3, 2], [6, 6, 6, 5, 4, 3, 2],
    [7, 7, 6, 5, 4, 3, 2], [7, 7, 7, 6, 5, 4, 3], [8, 8, 7, 6, 5, 4, 3], [8, 8, 8, 7, 6, 5, 4],
    [9, 8, 8, 7, 6, 5, 4], [9, 9, 8, 7, 6, 5, 4],
  ];
  // Slot arrays become { spellLevel: count }.
  const toSlots = (arr) => {
    const o = {};
    arr.forEach((n, i) => { if (n > 0) o[i + 1] = n; });
    return o;
  };
  R.slotsFor = (c) => {
    if (!c || c.lvl < 1) return {};
    if (c.cls === "M") return toSlots(MAGE_SLOTS[R.clamp(c.lvl, 1, 20) - 1]);
    if (c.cls === "C") return toSlots(PRIEST_SLOTS[R.clamp(c.lvl, 1, 20) - 1]);
    if (c.cls === "P") {
      if (c.lvl < 9) return {};
      const cl = R.clamp(c.lvl - 8, 1, 9);
      const full = toSlots(PRIEST_SLOTS[cl - 1]);
      const out = {};
      for (const k of Object.keys(full)) if (+k <= 4) out[k] = full[k];
      return out;
    }
    return {};
  };
  R.casterLevel = (c) => (c.cls === "P" ? R.clamp(c.lvl - 8, 1, 9) : c.lvl);

  // Turning undead: target number on d20 for a cleric of level lvl vs undead rank.
  R.turnNeed = (lvl, rank) => R.clamp(11 - rank + Math.floor(lvl / 2), 2, 20);
  // Turn Undead: returns how many creatures (2d6 at most), and the result kind.
  R.turnResult = (lvl, rank, roll) => {
    const need = R.turnNeed(lvl, rank);
    if (roll === 20 || (roll >= need && roll >= need + 5 && lvl >= rank + 3)) return "destroy";
    if (roll >= need) return "turn";
    if (roll === 1) return "miss";
    return "none";
  };

  // Thief skills (percent). Race, dexterity and level adjust; cap 95.
  R.thief = (c) => {
    const L = c.lvl;
    const dex = R.clamp(((c.dex - 10) * 5), -10, 25);
    const race = c.race;
    const rb = (k) => {
      if (race === "halfling") return { ol: 0, ft: 0, ms: 10, hs: 10, hn: 5 }[k];
      if (race === "elf") return { ol: 0, ft: 0, ms: 5, hs: 0, hn: 5 }[k];
      if (race === "dwarf") return { ol: 10, ft: 10, ms: 0, hs: 0, hn: 0 }[k];
      if (race === "gnome") return { ol: 5, ft: 0, ms: 0, hs: 5, hn: 0 }[k];
      return 0;
    };
    const out = {
      ol: 15 + 4 * (L - 1),
      ft: 10 + 4 * (L - 1),
      ms: 20 + 4 * (L - 1),
      hs: 10 + 4 * (L - 1),
      hn: 15 + 4 * (L - 1),
    };
    for (const k of Object.keys(out)) out[k] = R.clamp(out[k] + rb(k) + dex, 0, 95);
    return out;
  };
  // Backstab multiplier by thief level (1-4: x2, 5-8: x3, 9-12: x4, 13+: x5).
  R.backstabMult = (lvl) => (lvl >= 13 ? 5 : lvl >= 9 ? 4 : lvl >= 5 ? 3 : 2);

  // Two-handed weapons and warriors' half attacks.
  R.attackHalves = (c) => {
    const K = R.CLASSES[c.cls];
    if (K.thac0 !== "warrior") return 2;
    if (c.lvl >= 13) return 4;
    if (c.lvl >= 7) return 3;
    return 2;
  };
  // Number of melee attacks this round given half-attack units (3 = 1.5 attacks).
  R.attacksThisRound = (halves, round) => {
    const full = Math.floor(halves / 2);
    const extra = halves % 2 === 1 && round % 2 === 0 ? 1 : 0;
    return Math.max(1, full + extra);
  };

  // ------------------------------------------------ experience and level ----
  R.xpFor = (cls, lvl) => (lvl <= 1 ? 0 : R.CLASSES[cls].xp[R.clamp(lvl, 1, 20) - 1]);
  R.levelFor = (cls, xp) => {
    let lvl = 1;
    const table = R.CLASSES[cls].xp;
    for (let i = 0; i < table.length; i++) if (xp >= table[i]) lvl = i + 1;
    return lvl;
  };
  R.primeBonus = (c) => {
    const prime = R.CLASSES[c.cls].prime;
    return prime.every((k) => c[k] >= 16);
  };
  // XP from a source, then the +10% prime-requisite bonus and the two-level cap.
  R.awardXP = (c, amount) => {
    let gain = Math.max(0, Math.floor(amount));
    if (R.primeBonus(c)) gain = Math.floor(gain * 1.1);
    const cap = R.xpFor(c.cls, c.lvl + 2) - 1;
    const before = c.xp;
    c.xp = Math.min(c.xp + gain, Math.max(c.xp, cap));
    return c.xp - before;
  };
  R.readyToTrain = (c) => R.levelFor(c.cls, c.xp) > c.lvl;
  R.trainCost = (lvl) => 100 * lvl;
  // HP gained when a PC reaches newLvl (rolled through level 9 for warriors/priests, 10 for thieves/mages).
  R.levelUpHP = (c, newLvl, rng = Math.random) => {
    const K = R.CLASSES[c.cls];
    const warriorOrPriest = K.thac0 === "warrior" || K.thac0 === "priest";
    const rollUntil = warriorOrPriest ? 9 : 10;
    if (newLvl <= rollUntil) {
      return Math.max(1, R.die(K.die, rng) + R.conMod(c.con).hp);
    }
    const fixed = { warrior: 3, priest: 2, thief: 2, mage: 1 };
    return fixed[K.thac0];
  };

  // ------------------------------------------------ to-hit and saves ----
  R.thac0Base = (c) => {
    const n = c.lvl - 1;
    switch (R.CLASSES[c.cls].thac0) {
      case "warrior": return 20 - n;
      case "priest": return 20 - 2 * Math.floor(n / 3);
      case "thief": return 20 - Math.floor(n / 2);
      case "mage": return 20 - Math.floor(n / 3);
      default: return 20;
    }
  };
  // Monster THAC0 derived from hit dice (as warriors).
  R.monsterThac0 = (hd) => Math.max(0, 21 - Math.floor(hd));

  // Cumulative bonuses from equipment: returns { ac, hit, dmg, save } summed over worn magic.
  const WORN = ["ring1", "ring2", "cloak", "boots", "gloves", "belt", "neck", "charm"];

  // Effective strength (potions/spells may override while active).
  R.effStr = (c, now) => {
    const f = c.fx && c.fx.str;
    if (f && (now === undefined || f.until > now)) return { s: f.val, x: 0 };
    return { s: c.str, x: c.strx || 0 };
  };

  // ------------------------------------------------ sheet derivation ----
  // All of a character's derived combat numbers, from current gear and effects.
  R.derive = (c, now) => {
    const K = R.CLASSES[c.cls];
    const rc = R.RACES[c.race];
    const eq = c.eq || {};
    const item = (id) => (id ? Data.item(id) : null);
    const clock = now === undefined ? R.clock() : now;
    const wpn = item(eq.melee);
    const mis = item(eq.missile);
    const arm = item(eq.armor);
    const shd = item(eq.shield);
    const worn = WORN.map((s) => item(eq[s])).filter(Boolean);
    const gear = [wpn, mis, arm, shd, ...worn].filter(Boolean);
    const ef = R.effStr(c, clock);
    const sm = R.strMod(ef.s, ef.x);
    const dxm = R.dexMod(c.dex);

    // Armor class (descending; lower is better).
    let ac = 10;
    if (arm) ac = (arm.ac || 10) - (arm.ench || 0);
    if (c.fx && c.fx.armor && c.fx.armor.left > 0) ac = Math.min(ac, 6);
    if (shd) ac -= 1 + (shd.ench || 0);
    ac -= dxm.ac;
    for (const w of worn) if (w.bonus && w.bonus.ac) ac -= w.bonus.ac;
    if (c.fx && c.fx.buffs) for (const b of c.fx.buffs) if (b.ac && b.until > clock) ac -= b.ac;

    // Melee profile.
    const baseId = wpn ? R.baseOf(eq.melee) : null;
    const spec = !!(wpn && c.cls === "F" && c.spec && baseId === c.spec);
    const wb = wpn && wpn.bonus ? wpn.bonus : {};
    const racialHit = rc && rc.id === "elf" && wpn && (wpn.family === "sword" || wpn.family === "bow") ? 1 : 0;
    const meleeHit = sm.hit + (wb.hit || 0) + (spec ? 1 : 0) + racialHit;
    const meleeDmg = sm.dmg + (wb.dmg || 0) + (spec ? 2 : 0);
    const dmgSm = wpn && wpn.dmg ? wpn.dmg.sm : "1d2";
    const dmgLg = wpn && wpn.dmg ? wpn.dmg.lg : "1d2";
    const halves = R.attackHalves(c) + (spec ? 1 : 0);

    // Missile profile.
    const mb = mis && mis.bonus ? mis.bonus : {};
    const missileHit = dxm.missile + (mb.hit || 0) + (rc && rc.id === "halfling" && mis && mis.kind === "missile" && mis.family === "sling" ? 1 : 0);

    // Saves.
    const fam = K.save;
    const saves = [0, 1, 2, 3, 4].map((i) => {
      let t = R.saveTarget(fam, c.lvl, i);
      if (c.cls === "P") t -= 2;
      if (rc.id !== "human" && R.RACE_FX[rc.id] && R.RACE_FX[rc.id].magicSave && (i === 1 || i === 4)) t -= R.conSaveBonus(c.con);
      if (R.RACE_FX[rc.id] && R.RACE_FX[rc.id].poisonSave && i === 0) t -= 2;
      if (i === 4) t -= R.wisMod(c.wis).mental;
      for (const w of gear) if (w.bonus && w.bonus.save) t -= w.bonus.save;
      return R.clamp(t, 2, 20);
    });

    const thac0 = R.thac0Base(c);
    const backstab = c.cls === "T" ? { mult: R.backstabMult(c.lvl), hit: 4 } : null;
    const favored = c.foe || null;

    return {
      ac,
      thac0,
      meleeHit,
      meleeDmg,
      dmgSm,
      dmgLg,
      halves,
      missileHit,
      mv: rc.mv,
      saves,
      sm,
      dxm,
      weapon: wpn,
      weaponId: eq.melee || null,
      missile: mis,
      armor: arm,
      shield: shd,
      backstab,
      favored,
      slots: R.slotsFor(c),
      spec,
      strForce: sm.force,
      thief: c.cls === "T" ? R.thief(c) : null,
      priest: c.cls === "C" || c.cls === "P",
    };
  };

  // Base weapon id used for specialization (strips enchantment).
  R.baseOf = (instId) => {
    if (!instId) return null;
    const def = Data.item(instId);
    return def ? def.base || def.id : instId.split("#")[0];
  };

  // ------------------------------------------------ character creation ----
  R.rollStat4d6 = () => {
    const d = [R.die(6), R.die(6), R.die(6), R.die(6)].sort((a, b) => a - b);
    return d[1] + d[2] + d[3];
  };
  R.percentile = () => 1 + Math.floor(Math.random() * 100);
  // Roll six scores in order; apply racial adjustments; retry until class minima and racial limits fit.
  R.rollAbilities = (race, cls) => {
    const rc = R.RACES[race];
    const K = R.CLASSES[cls];
    const need = K.min;
    for (let tries = 0; tries < 400; tries++) {
      const raw = {};
      for (const k of R.ABIL) raw[k] = R.rollStat4d6();
      let ok = true;
      const adj = {};
      for (const k of R.ABIL) {
        if (raw[k] < 3 || raw[k] > 18) { ok = false; break; }
        adj[k] = raw[k] + (rc.adj[k] || 0);
        if (adj[k] < rc.min[k] || adj[k] > rc.max[k]) { ok = false; break; }
      }
      if (!ok) continue;
      for (const k of Object.keys(need)) if (adj[k] < need[k]) { ok = false; break; }
      if (!ok) continue;
      if ((cls === "F" || cls === "P" || cls === "R") && adj.str === 18) {
        adj.strx = R.percentile();
      }
      return R.finishAbilities(adj);
    }
    // Bounded fallback: start from class minima and fill the remaining scores from the rolls.
    const out = {};
    for (const k of R.ABIL) {
      out[k] = R.clamp(R.rollStat4d6() - (rc.adj[k] || 0), rc.min[k], rc.max[k]);
    }
    for (const k of Object.keys(need)) out[k] = Math.max(out[k], need[k]);
    for (const k of R.ABIL) out[k] = R.clamp(out[k] + (rc.adj[k] || 0), rc.min[k], rc.max[k]);
    for (const k of Object.keys(need)) if (out[k] < need[k]) out[k] = need[k];
    if ((cls === "F" || cls === "P" || cls === "R") && out.str === 18) out.strx = R.percentile();
    return R.finishAbilities(out);
  };
  R.finishAbilities = (a) => {
    const out = {};
    for (const k of R.ABIL) out[k] = a[k];
    out.strx = a.strx || 0;
    return out;
  };
  // Human-readable strength (18/xx).
  R.strText = (s, x) => (s === 18 && x > 0 ? (x === 100 ? "18/00" : "18/" + String(x).padStart(2, "0")) : String(s));
  R.modText = (n) => (n >= 0 ? "+" + n : String(n));

  // Build a new character sheet (level 1, empty gear, no spells yet).
  R.createPC = (o) => {
    const abil = o.abil || R.rollAbilities(o.race, o.cls);
    const rc = R.RACES[o.race];
    const K = R.CLASSES[o.cls];
    const dieMod = R.conMod(abil.con).hp;
    const c = {
      id: o.id || R.uid("c"),
      name: o.name,
      race: o.race,
      cls: o.cls,
      align: o.align,
      color: o.color || "#c8502c",
      str: abil.str, dex: abil.dex, con: abil.con, int: abil.int, wis: abil.wis, cha: abil.cha,
      strx: abil.strx || 0,
      lvl: 1,
      xp: 0,
      hp: 0,
      maxhp: 0,
      eq: { melee: null, missile: null, armor: null, shield: null, ring1: null, ring2: null, cloak: null, boots: null, gloves: null, belt: null, neck: null, charm: null },
      inv: [],
      spec: o.spec || null,
      foe: o.foe || null,
      book: [],
      prep: {},
      mem: {},
      fx: { armor: null, str: null, buffs: [] },
      poison: null,
      dead: false,
      lost: false,
      layUsed: false,
      pregen: !!o.pregen,
      face: o.face || null,
    };
    c.maxhp = Math.max(1, K.die + dieMod);
    c.hp = c.maxhp;
    c.mvBase = rc.mv;
    return c;
  };
  // Re-check a built sheet against its race and class rules.
  R.validate = (c) => {
    const problems = [];
    if (!R.raceAllowsClass(c.race, c.cls)) problems.push("This race cannot be a " + R.CLASSES[c.cls].name + ".");
    if (!R.alignAllowed(c.cls, c.align)) problems.push("Alignment does not suit a " + R.CLASSES[c.cls].name + ".");
    for (const k of Object.keys(R.CLASSES[c.cls].min)) {
      if (c[k] < R.CLASSES[c.cls].min[k]) problems.push(R.ABIL_NAMES[k] + " below the class minimum.");
    }
    return problems;
  };

  // Spells known through class rules (priests and paladins), without a book.
  R.classSpellIds = (c) => {
    if (c.cls === "C") return Data.spellList("C", 1).concat(Data.spellList("C", 2), Data.spellList("C", 3), Data.spellList("C", 4), Data.spellList("C", 5), Data.spellList("C", 6), Data.spellList("C", 7));
    if (c.cls === "P") return Data.paladinSpellIds();
    return [];
  };

  // Auto-fill empty spell slots with the first known spells of each level. Existing choices are kept.
  R.autoPrep = (c) => {
    const slots = R.slotsFor(c);
    const known = c.cls === "M" ? (c.book || []) : R.classSpellIds(c);
    const old = c.prep || {};
    const prep = {};
    for (const lvl of Object.keys(slots).map(Number)) {
      let left = slots[lvl];
      const pool = known.filter((id) => Data.SPELLS[id] && Data.SPELLS[id].l === lvl);
      for (const id of pool) {
        const keep = Math.min(old[id] || 0, left);
        if (keep > 0) { prep[id] = keep; left -= keep; }
      }
      for (const id of pool) {
        if (left <= 0) break;
        if (prep[id]) continue;
        prep[id] = 1;
        left -= 1;
      }
    }
    c.prep = prep;
    return prep;
  };

  R.clock = () => (typeof Game !== "undefined" && Game.G ? Game.G.time : 0);

  return R;
})();
