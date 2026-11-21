"use strict";
/*
 * Enchanted items and treasure. Magic variants are generated from the base
 * registry (+1 to +3) and registered into Data.ITEMS; the named items are
 * written out. Treasure.roll(rng, characterLevel, kind) is seeded: the same
 * seed always gives the same chest, cache or hoard.
 */
const Treasure = (() => {
  const T = {};
  const add = (def) => {
    const d = Object.assign({ cost: 0, wt: 0.5, sell: true, cls: "FPRMCT", desc: "", slot: null, magic: true, cat: "misc" }, def);
    Data.ITEMS[d.id] = d;
    return d;
  };
  // Price tiers: a magic item's tier decides which treasure rolls can produce it.
  const tierOf = (cost) => (cost <= 300 ? 1 : cost <= 1000 ? 2 : cost <= 3000 ? 3 : cost <= 8000 ? 4 : 5);
  const ROMAN = ["", "+1", "+2", "+3"];

  // Magic weapons from the base registry: base-id + "_p" + n.
  const WEAPONS = ["dagger", "short_sword", "longsword", "broadsword", "bastard_sword", "scimitar", "spear", "battle_axe", "hand_axe", "mace", "war_hammer", "flail", "morning_star", "two_handed_sword"];
  for (const base of WEAPONS) {
    const b = Data.ITEMS[base];
    for (let n = 1; n <= 3; n++) {
      const cat = b.kind === "melee" && /sword|scimitar|spear/.test(base) ? "swords" : "weapons";
      add(Object.assign({}, b, {
        id: base + "_p" + n,
        base,
        name: b.name + " " + ROMAN[n],
        cost: b.cost * (n * 2 + 2) * 10,
        bonus: { hit: n, dmg: n },
        magic: true,
        sell: true,
        cat,
        tier: 0,
        desc: "A " + b.name.toLowerCase() + " with a " + ROMAN[n] + " enchantment.",
      }));
    }
  }
  // Magic armour and shields: the enchantment comes off the armour value.
  const ARMOUR = ["leather_armor", "studded_leather", "ring_mail", "scale_mail", "chain_mail", "banded_mail", "splint_mail", "plate_mail"];
  for (const base of ARMOUR) {
    const b = Data.ITEMS[base];
    for (let n = 1; n <= 3; n++) {
      add(Object.assign({}, b, {
        id: base + "_p" + n,
        base,
        name: b.name + " " + ROMAN[n],
        ench: n,
        cost: b.cost * (n + 1) * 5,
        magic: true,
        cat: "armor",
        desc: "Armour with a " + ROMAN[n] + " enchantment.",
      }));
    }
  }
  for (let n = 1; n <= 3; n++) {
    add(Object.assign({}, Data.ITEMS.shield, { id: "shield_p" + n, base: "shield", name: "Shield " + ROMAN[n], ench: n, cost: 7 * (n + 1) * 8, magic: true, cat: "armor", desc: "A shield with a " + ROMAN[n] + " enchantment." }));
  }

  // Rings, cloaks, boots, gloves, belts, amulets, charms.
  add({ id: "ring_protection_1", name: "Ring of Protection +1", type: "g", slot: "ring", cost: 1800, wt: 0.1, bonus: { ac: 1 }, cat: "rings", desc: "+1 protection against blows and spells." });
  add({ id: "ring_protection_2", name: "Ring of Protection +2", type: "g", slot: "ring", cost: 4000, wt: 0.1, bonus: { ac: 2, save: 1 }, cat: "rings", desc: "+2 protection and +1 to saves." });
  add({ id: "ring_protection_3", name: "Ring of Protection +3", type: "g", slot: "ring", cost: 7500, wt: 0.1, bonus: { ac: 3, save: 2 }, cat: "rings", desc: "+3 protection and +2 to saves." });
  add({ id: "ring_free_action", name: "Ring of Free Action", type: "g", slot: "ring", cost: 6000, wt: 0.1, wear: { freeAction: true }, cat: "rings", desc: "Cannot be held or paralysed." });
  add({ id: "ring_regeneration", name: "Ring of Regeneration", type: "g", slot: "ring", cost: 9000, wt: 0.1, wear: { regen: 1 }, cat: "rings", desc: "Restores one hit point each round in battle and ten more each camp." });
  add({ id: "ring_wizardry", name: "Ring of Wizardry", type: "g", slot: "ring", cost: 5000, wt: 0.1, wear: { wizardry: true }, cat: "rings", desc: "Doubles a mage's first-level spell slots." });
  add({ id: "ring_fire_resistance", name: "Ring of Fire Resistance", type: "g", slot: "ring", cost: 3200, wt: 0.1, wear: { fireRes: true }, cat: "rings", desc: "Halves fire damage." });
  add({ id: "ring_invisibility", name: "Ring of Invisibility", type: "g", slot: "ring", cost: 4500, wt: 0.1, wear: { invis: true }, cat: "rings", desc: "The wearer is hidden from most eyes." });
  add({ id: "ring_warmth", name: "Ring of Warmth", type: "g", slot: "ring", cost: 2000, wt: 0.1, wear: { coldRes: true }, cat: "rings", desc: "Halves cold damage." });
  add({ id: "ring_spell_turning", name: "Ring of Spell Turning", type: "g", slot: "ring", cost: 9500, wt: 0.1, wear: { turnSpell: 1 }, cat: "rings", desc: "Turns a spell back once a day." });
  add({ id: "cloak_protection_1", name: "Cloak of Protection +1", type: "g", slot: "cloak", cost: 2500, wt: 1, bonus: { ac: 1, save: 1 }, cat: "misc", desc: "+1 armour class and saves." });
  add({ id: "cloak_protection_2", name: "Cloak of Protection +2", type: "g", slot: "cloak", cost: 5000, wt: 1, bonus: { ac: 2, save: 2 }, cat: "misc", desc: "+2 armour class and saves." });
  add({ id: "cloak_elvenkind", name: "Elven Cloak", type: "g", slot: "cloak", cost: 3500, wt: 1, wear: { hide: 20 }, cat: "misc", desc: "Improves hiding in shadows by twenty per cent." });
  add({ id: "cloak_displacement", name: "Cloak of Displacement", type: "g", slot: "cloak", cost: 6000, wt: 1, wear: { displace: true }, cat: "misc", desc: "Foes sometimes strike at the image instead." });
  add({ id: "boots_elvenkind", name: "Elven Boots", type: "g", slot: "boots", cost: 3000, wt: 1, wear: { move: 2, ms: 20 }, cat: "misc", desc: "Quiet boots that improve moving silently." });
  add({ id: "boots_speed", name: "Boots of Speed", type: "g", slot: "boots", cost: 8000, wt: 1, wear: { move: 6 }, cat: "misc", desc: "Movement +6 and quicker attacks." });
  add({ id: "boots_striding", name: "Boots of Striding", type: "g", slot: "boots", cost: 2000, wt: 1, wear: { move: 4 }, cat: "misc", desc: "Movement +4." });
  add({ id: "gloves_giant_strength", name: "Gauntlets of Ogre Power", type: "g", slot: "gloves", cost: 7000, wt: 1, wear: { strFloor: 18 }, cat: "misc", desc: "The wearer's strength is at least 18/00." });
  add({ id: "gloves_dexterity", name: "Gloves of Dexterity", type: "g", slot: "gloves", cost: 4000, wt: 0.5, wear: { dexAdd: 2 }, cat: "misc", desc: "Dexterity +2." });
  add({ id: "belt_giant_strength", name: "Belt of Hill Giant Strength", type: "g", slot: "belt", cost: 9000, wt: 1, wear: { strFloor: 19 }, cat: "misc", desc: "Strength at least 19." });
  add({ id: "belt_healing", name: "Belt of Healing", type: "g", slot: "belt", cost: 6000, wt: 1, wear: { campHeal: 2 }, cat: "misc", desc: "Restores two hit points at each camp." });
  add({ id: "neck_protection", name: "Amulet of Ward", type: "g", slot: "neck", cost: 4000, wt: 0.2, bonus: { ac: 1 }, cat: "misc", desc: "A small ward against spells: +1 protection." });
  add({ id: "neck_prayer_beads", name: "Prayer Beads", type: "g", slot: "neck", cost: 3000, wt: 0.2, wear: { prayer: true }, cat: "misc", desc: "Clerics and paladins may pray for a small blessing." });
  add({ id: "charm_luck", name: "Charm of Luck", type: "g", slot: "charm", cost: 2500, wt: 0.1, bonus: { save: 1 }, cat: "misc", desc: "+1 to saves." });
  // Potions with lasting effects.
  add({ id: "potion_regeneration", name: "Potion of Regeneration", type: "p", cost: 800, wt: 0.5, cat: "potions", buff: "regen", dur: 90, desc: "One hit point each round for ninety minutes.", use: "regen" });
  add({ id: "potion_dragon_breath", name: "Potion of Dragon Breath", type: "p", cost: 1200, wt: 0.5, cat: "potions", buff: "fireBreath", dur: 30, desc: "Breathes fire on a foe once in battle.", use: "breath" });
  // Named weapons with purpose.
  add({ id: "iron_king_blade", name: "Blade of the Iron King", type: "w", slot: "melee", kind: "melee", dmg: { sm: "1d8+1", lg: "1d12+1" }, spd: 5, hands: 1, family: "sword", base: "longsword", bonus: { hit: 2, dmg: 2 }, cost: 0, wt: 4, cat: "swords", magic: true, silver: true, sell: false, desc: "Cold steel of the barrow. Harms the undead gladly." });
  add({ id: "goblin_slayer", name: "Goblinbane", type: "w", slot: "melee", kind: "melee", dmg: { sm: "1d8+1", lg: "1d8" }, spd: 5, hands: 1, family: "sword", base: "shortsword", bonus: { hit: 1, dmg: 2 }, cost: 2500, wt: 3, cat: "swords", magic: true, slay: "goblinoid", desc: "+2 damage against goblins, bugbears and hobgoblins." });
  add({ id: "troll_slayer", name: "Trollcleaver", type: "w", slot: "melee", kind: "melee", dmg: { sm: "2d6", lg: "2d6+2" }, spd: 7, hands: 2, family: "axe", base: "great_axe", bonus: { hit: 1, dmg: 2 }, cost: 6000, wt: 20, cat: "weapons", magic: true, slay: "troll", desc: "Burns the regrowth: a troll struck by it does not heal for a round." });

  // ---- treasure tables -----------------------------------------------------
  // Every magic item joins a category and a tier; scrolls are produced on demand.
  T.byCat = {};
  const indexAll = () => {
    T.byCat = {};
    for (const id of Object.keys(Data.ITEMS)) {
      const d = Data.ITEMS[id];
      if (!d.magic && !d.cat) continue;
      if (!d.cat) continue;
      if (!d.magic && d.type !== "p" && d.type !== "d" && d.cat !== "potions") continue;
      const tier = d.tier || tierOf(d.cost);
      d.tier = tier;
      (T.byCat[d.cat] = T.byCat[d.cat] || []).push(d.id);
    }
    // Potions and devices from the base registry join the same tables.
    for (const id of Object.keys(Data.ITEMS)) {
      const d = Data.ITEMS[id];
      if (d.type === "p" && !d.magic) {
        d.cat = "potions";
        d.tier = d.tier || tierOf(d.cost);
        (T.byCat.potions = T.byCat.potions || []).push(id);
      }
      if (d.type === "d") {
        d.cat = "devices";
        d.tier = d.tier || tierOf(d.cost);
        (T.byCat.devices = T.byCat.devices || []).push(id);
      }
    }
    // Scrolls: one per spell, tiered by the spell's level.
    T.byCat.scrolls = [];
    for (const sid of Object.keys(Data.SPELLS)) {
      T.byCat.scrolls.push(sid);
    }
  };
  indexAll();

  // Category weights: potions 20, scrolls 15, rings 5, devices 5, misc 15, armour 15, swords 11, other weapons 14.
  const WEIGHTS = { potions: 20, scrolls: 15, rings: 5, devices: 5, misc: 15, armor: 15, swords: 11, weapons: 14 };
  const pickCat = (rng) => {
    const total = Object.values(WEIGHTS).reduce((s, v) => s + v, 0);
    let r = rng() * total;
    for (const k of Object.keys(WEIGHTS)) {
      r -= WEIGHTS[k];
      if (r <= 0) return k;
    }
    return "potions";
  };
  // One magic roll at a treasure tier: a category, then a weighted entry at or below that tier.
  T.rollOne = (rng, tier) => {
    for (let guard = 0; guard < 20; guard++) {
      const cat = pickCat(rng);
      if (cat === "scrolls") {
        const spells = Object.keys(Data.SPELLS).filter((id) => Data.SPELLS[id].l <= tier + 1 && Data.SPELLS[id].l <= 9);
        if (!spells.length) continue;
        return "scroll:" + spells[Math.floor(rng() * spells.length)];
      }
      const pool = (T.byCat[cat] || []).filter((id) => (Data.ITEMS[id].tier || 1) <= tier && Data.ITEMS[id].sell !== undefined);
      if (!pool.length) continue;
      // Newer tiers are favoured at depth: a second pick may move up one tier.
      let pick = pool[Math.floor(rng() * pool.length)];
      if (rng() < 0.35) {
        const upper = pool.filter((id) => (Data.ITEMS[id].tier || 1) === tier);
        if (upper.length) pick = upper[Math.floor(rng() * upper.length)];
      }
      if (Data.ITEMS[pick].type === "d") return Data.newDevice(pick);
      return pick;
    }
    return "potions";
  };
  // roll(rng, characterLevel, kind): kind is 'chest', 'cache' or 'hoard'.
  T.roll = (rng, lvl, kind = "chest") => {
    const tier = Math.max(1, Math.min(5, Math.ceil(Math.max(1, lvl) / 4)));
    const mult = kind === "hoard" ? 6 : kind === "cache" ? 2 : 1;
    const base = 25 * Math.pow(Math.max(1, lvl), 1.45);
    const gold = Math.max(0, Math.round((base * (0.6 + rng() * 0.8) * mult) / 5) * 5);
    const items = [];
    const magicRolls = kind === "hoard" ? 2 + Math.floor(rng() * 2) : kind === "cache" ? 1 : rng() < 0.4 ? 1 : 0;
    for (let i = 0; i < magicRolls; i++) {
      const t = kind === "hoard" ? Math.min(5, tier + 1) : tier;
      items.push(T.rollOne(rng, t));
    }
    if (kind === "hoard" && rng() < 0.5) items.push("gem_ruby");
    return { gold, items };
  };
  // Seeds: a stable seed string gives a stable roll. Used by the generator and by stash contents.
  T.seeded = (seedText, lvl, kind) => T.roll(Rules.mulberry32(Rules.hash(seedText)), lvl, kind);

  // Wearable effects, read by the rules layer.
  T.wearEffects = (instId) => {
    const d = Data.item(instId);
    return d && d.wear ? d.wear : null;
  };

  return T;
})();
