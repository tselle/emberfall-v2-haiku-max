"use strict";
/*
 * Base registries: equipment, shops, spells, the saga creature catalogue,
 * authored commissions, rumors, the six pregenerated heroes and the
 * Emberwild maps. Definitions only; no rules live here.
 */
const Data = (() => {
  const D = {};
  const ALL = "FPRMCT";
  const NOMAGE = "FPRCT";        // classes that may wear ordinary armour
  const EDGED = "FPRT";          // edged weapons (clerics: blunt only; mages: a few)
  const BLUNT = "FPRCT";
  const MISC = "FPRCMT";         // staff, dagger, darts, sling: everyone who may fight

  // ------------------------------------------------------------ items ----
  D.ITEMS = {};
  const add = (def) => {
    const d = Object.assign({ cost: 0, wt: 0, sell: true, cls: ALL, desc: "", slot: null }, def);
    D.ITEMS[d.id] = d;
    return d;
  };
  const melee = (id, name, sm, lg, cost, wt, spd, o = {}) =>
    add(Object.assign({ id, name, type: "w", slot: "melee", kind: "melee", dmg: { sm, lg }, cost, wt, spd, hands: 1, family: id, cls: EDGED }, o));
  const ranged = (id, name, sm, lg, cost, wt, rng, o = {}) =>
    add(Object.assign({ id, name, type: "w", slot: "missile", kind: "missile", dmg: { sm, lg }, cost, wt, rng, hands: 1, family: id, cls: EDGED, spd: 5 }, o));
  const armour = (id, name, ac, cost, wt, o = {}) =>
    add(Object.assign({ id, name, type: "a", slot: "armor", ac, cost, wt, armorType: "heavy", cls: NOMAGE }, o));
  const gear = (id, name, cost, wt, desc, o = {}) => add(Object.assign({ id, name, type: "g", cost, wt, desc }, o));
  const potion = (id, name, cost, desc, use) => add({ id, name, type: "p", cost, wt: 0.5, desc, use, cls: ALL });
  const device = (id, name, cost, charges, powers, desc, o = {}) =>
    add(Object.assign({ id, name, type: "d", cost, wt: 1, charges, powers, desc, cls: ALL }, o));
  const tome = (id, name, ability, cost) =>
    add({ id, name, type: "k", cost, wt: 1, ability, desc: "A single reading raises " + ability.toUpperCase() + " by one point, up to 18." });
  const valuable = (id, name, cost, desc) => add({ id, name, type: "v", cost, wt: 0.2, desc, cls: ALL });
  const quest = (id, name, desc) => add({ id, name, type: "q", cost: 0, wt: 0.5, desc, sell: false, cls: ALL });

  // Melee weapons.
  melee("dagger", "Dagger", "1d4", "1d3", 2, 1, 2, { cls: MISC, thrown: true, family: "dagger" });
  melee("short_sword", "Short Sword", "1d6", "1d8", 10, 3, 3, { family: "sword" });
  melee("longsword", "Long Sword", "1d8", "1d12", 15, 4, 5, { family: "sword" });
  melee("broadsword", "Broad Sword", "2d4", "2d4", 10, 4, 4, { family: "sword" });
  melee("bastard_sword", "Bastard Sword", "2d4", "2d8", 35, 7, 7, { family: "sword" });
  melee("two_handed_sword", "Two-Handed Sword", "1d10", "3d6", 30, 15, 10, { family: "sword", hands: 2 });
  melee("scimitar", "Scimitar", "1d8", "1d8", 15, 4, 4, { family: "sword" });
  melee("spear", "Spear", "1d6", "1d8", 1, 5, 6, { family: "spear", thrown: true });
  melee("halberd", "Halberd", "1d10", "2d6", 10, 15, 9, { family: "polearm", hands: 2 });
  melee("battle_axe", "Battle Axe", "1d8", "1d8", 5, 7, 7, { family: "axe" });
  melee("hand_axe", "Hand Axe", "1d6", "1d4", 4, 5, 4, { family: "axe", thrown: true });
  melee("great_axe", "Great Axe", "1d12", "3d6", 30, 20, 10, { family: "axe", hands: 2 });
  melee("mace", "Mace", "1d6+1", "1d6", 5, 6, 7, { family: "mace", cls: BLUNT });
  melee("war_hammer", "War Hammer", "1d4+1", "1d4", 5, 5, 4, { family: "hammer", cls: BLUNT });
  melee("flail", "Flail", "2d4", "1d6+1", 8, 15, 7, { family: "flail", cls: BLUNT });
  melee("morning_star", "Morning Star", "2d4", "1d6+1", 15, 12, 7, { family: "flail", cls: BLUNT });
  melee("club", "Club", "1d6", "1d3", 1, 3, 3, { family: "club", cls: BLUNT });
  melee("staff", "Staff", "1d6", "1d6", 1, 4, 4, { family: "staff", hands: 2, cls: MISC });
  melee("silver_dagger", "Silver Dagger", "1d4", "1d3", 25, 1, 2, { family: "dagger", silver: true, cls: MISC, thrown: true });
  melee("silver_longsword", "Silver Long Sword", "1d8", "1d12", 90, 4, 5, { family: "sword", silver: true });
  melee("silver_mace", "Silver Mace", "1d6+1", "1d6", 80, 6, 7, { family: "mace", silver: true, cls: BLUNT });
  melee("unarmed_fist", "Fist", "1d2", "1d2", 0, 0, 0, { sell: false, family: "fist", cls: ALL });

  // Missile weapons. rng = [short, medium, long] in 30-ft units (x3 squares).
  ranged("sling", "Sling", "1d4", "1d4", 1, 0.5, [1, 2, 3], { family: "sling", cls: MISC });
  ranged("darts", "Darts", "1d3", "1d2", 1, 0.5, [1, 2, 3], { family: "dart", cls: MISC, thrown: true });
  ranged("short_bow", "Short Bow", "1d6", "1d6", 30, 3, [2, 3, 4], { family: "bow" });
  ranged("long_bow", "Long Bow", "1d6", "1d6", 75, 3, [3, 4, 6], { family: "bow" });
  ranged("light_crossbow", "Light Crossbow", "1d4+1", "1d4+1", 35, 6, [2, 3, 4], { family: "crossbow" });
  ranged("heavy_crossbow", "Heavy Crossbow", "1d6+1", "1d6+1", 50, 14, [3, 4, 5], { family: "crossbow" });
  ranged("javelin", "Javelin", "1d6", "1d8", 1, 2, [1, 2, 3], { family: "spear", thrown: true });

  // Armour and shields. ac is the descending AC value the armour gives.
  armour("padded_armor", "Padded Armour", 8, 4, 10, { armorType: "light", cls: NOMAGE });
  armour("leather_armor", "Leather Armour", 8, 5, 15, { armorType: "light", cls: NOMAGE });
  armour("studded_leather", "Studded Leather", 7, 25, 20, { armorType: "light", cls: NOMAGE });
  armour("ring_mail", "Ring Mail", 6, 30, 30, { cls: "FPRC" });
  armour("scale_mail", "Scale Mail", 6, 50, 40, { cls: "FPRC" });
  armour("chain_mail", "Chain Mail", 5, 75, 40, { cls: "FPRC" });
  armour("banded_mail", "Banded Mail", 4, 90, 35, { cls: "FPRC" });
  armour("splint_mail", "Splint Mail", 4, 80, 40, { cls: "FPRC" });
  armour("plate_mail", "Plate Mail", 3, 400, 50, { cls: "FPRC" });
  add({ id: "robe", name: "Mage's Robe", type: "a", slot: "armor", ac: 10, cost: 3, wt: 2, armorType: "robe", cls: "M", desc: "Ordinary cloth; no armour value." });
  add({ id: "shield", name: "Shield", type: "s", slot: "shield", ac: 1, cost: 7, wt: 10, cls: NOMAGE, desc: "Gives one point of armour class." });

  // Adventuring gear.
  gear("backpack", "Backpack", 5, 2, "Carries the rest of the pack.", { slot: null });
  gear("bedroll", "Bedroll", 1, 5, "Sleep on the road without a bed.");
  gear("rope", "Rope (50 ft)", 1, 10, "Good for descents and bindings.");
  gear("grappling_hook", "Grappling Hook", 1, 4, "Climb, or hook a far ledge.");
  gear("iron_spikes", "Iron Spikes", 1, 5, "Wedge a door or hold it shut.");
  gear("crowbar", "Crowbar", 2, 5, "Pry at stuck things. Adds one point to forcing rolls.", { use: "crowbar" });
  gear("torch", "Torch", 0, 1, "Lights a dark corridor for a while.", { use: "light" });
  gear("lantern", "Hooded Lantern", 10, 2, "Steady light; oil is needed.", { use: "light" });
  gear("oil_flask", "Flask of Oil", 1, 1, "Burns, or fuels a lantern.", { use: "oil" });
  gear("ration", "Iron Rations", 1, 1, "A day's food for one.", { use: "food" });
  gear("waterskin", "Waterskin", 1, 2, "Fresh water for the road.", { use: "food" });
  gear("tinderbox", "Tinderbox", 1, 1, "Lights a torch or oil.");
  gear("chalk", "Chalk", 0, 0.1, "Marks walls and floors.");
  gear("mirror", "Steel Mirror", 5, 0.5, "Look round a corner safely.");
  gear("tent", "Tent", 10, 20, "Shelter for a wild camp.", { use: "tent" });
  gear("bandage", "Bandage", 2, 0.2, "Stops a dying companion from bleeding out.", { use: "bandage" });
  gear("herbs", "Healing Herbs", 5, 0.2, "A poultice that soothes minor hurts when camped.", { use: "herb" });
  gear("holy_water", "Vial of Holy Water", 25, 1, "Burns undead when splashed.", { use: "holywater" });
  gear("thieves_tools", "Thieves' Tools", 25, 1, "Picks and probes. Thieves get a bonus on locks and traps.", { cls: "T", use: "tools" });
  gear("caltrops", "Caltrops", 1, 2, "Scatter on the floor behind a fleeing foe.");
  gear("holy_symbol", "Holy Symbol", 25, 1, "Focus for clerics and paladins. Worn at the neck.", { cls: "CP", slot: "neck", use: "symbol" });
  gear("spell_pouch", "Component Pouch", 5, 1, "Spell components for the arcane.", { cls: "M" });
  gear("map_case", "Map Case", 2, 0.5, "Holds the road maps you have bought.");
  gear("bandage_kit", "Field Surgeon's Kit", 30, 2, "Better than bandages; cures a wounded companion once in camp.", { use: "kit" });
  gear("ink_pen", "Ink and Quill", 2, 0.5, "For writing down what you have seen.");

  // Potions.
  potion("potion_healing", "Potion of Healing", 50, "Restores 2d4+2 hit points.", { heal: "2d4+2" });
  potion("potion_extra_healing", "Potion of Extra Healing", 200, "Restores 6d4+6 hit points.", { heal: "6d4+6" });
  potion("potion_cure_light", "Potion of Lesser Mending", 25, "Restores 1d8 hit points.", { heal: "1d8" });
  potion("potion_antivenom", "Potion of Antivenom", 60, "Cures poison at once.", { cure: "poison" });
  potion("potion_giant_strength", "Potion of Giant Strength", 100, "STR 18/75 for an hour.", { str: { val: 18, x: 75, dur: 60 } });
  potion("potion_speed", "Potion of Speed", 150, "Hasted for an hour out of battle; doubles moves in battle.", { buff: "haste", dur: 60 });
  potion("potion_invisibility", "Potion of Invisibility", 150, "Hidden from most eyes for an hour.", { buff: "invis", dur: 60 });
  potion("potion_heroism", "Potion of Heroism", 120, "+2 to hit and to saves for a battle.", { buff: "heroism", dur: 30 });
  potion("potion_free_action", "Potion of Free Action", 180, "Immune to paralysis for an hour.", { buff: "freeAction", dur: 60 });
  potion("potion_fire_resistance", "Potion of Fire Resistance", 120, "Halves fire damage for an hour.", { buff: "fireRes", dur: 60 });
  potion("potion_sleep_draught", "Potion of Sleep", 40, "Drink to fall asleep for a day. Ill-advised.", { sleep: true });
  potion("potion_poison", "Potion of Poison", 40, "Drinking it is a bad idea. Thrown, it works as a lesser venom.", { harm: "2d6" });

  // Devices (charges are the default count; the instance id carries the current count).
  device("wand_magic_missiles", "Wand of Magic Missiles", 2000, 10, ["magic_missile"], "Casts Magic Missile at the wielder's level.");
  device("wand_fireball", "Wand of Fireballs", 4500, 6, ["fireball"], "Casts Fireball, radius 2.3, up to 10d6.");
  device("wand_sleep", "Wand of Sleep", 1500, 8, ["sleep"], "Casts Sleep at the wielder's level.");
  device("wand_paralysis", "Wand of Paralysis", 3000, 6, ["hold_person"], "Casts Hold Person.");
  device("staff_healing", "Staff of Healing", 3000, 10, ["cure_light_wounds", "cure_serious_wounds"], "Works at camp as well as in battle.", { camp: true });
  device("staff_striking", "Staff of Striking", 2500, 10, ["cause_serious_wounds"], "Each charge strikes for serious wounds.");
  device("staff_cold", "Staff of Cold", 4000, 6, ["cone_of_cold"], "Casts Cone of Cold.");
  device("rod_resurrection", "Rod of Resurrection", 20000, 3, ["resurrection"], "Restores one fallen companion. Not for sale.", { sell: true, shopExcluded: true });
  device("staff_wonder", "Staff of the Wonder", 5000, 10, ["fireball", "magic_missile", "cure_critical_wounds", "hold_person"], "Each charge casts a random power.");

  // Ability tomes.
  tome("tome_strength", "Tome of Might", "str", 1500);
  tome("tome_dexterity", "Tome of Agility", "dex", 1500);
  tome("tome_constitution", "Tome of Endurance", "con", 1500);
  tome("tome_intelligence", "Tome of Wit", "int", 1500);
  tome("tome_wisdom", "Tome of Insight", "wis", 1500);
  tome("tome_charisma", "Tome of Presence", "cha", 1500);

  // Valuables: gems and jewellery sell for their full worth.
  valuable("gem_onyx", "Onyx", 50, "A dull black stone.");
  valuable("gem_garnet", "Garnet", 50, "Deep red and common.");
  valuable("gem_turquoise", "Turquoise", 100, "Sky blue.");
  valuable("gem_pearl", "Pearl", 150, "Creamy and perfectly round.");
  valuable("gem_sapphire", "Sapphire", 500, "Clear blue with a star in its heart.");
  valuable("gem_topaz", "Topaz", 500, "Golden and bright.");
  valuable("gem_ruby", "Ruby", 1000, "Blood-red.");
  valuable("gem_emerald", "Emerald", 1000, "Green as a spring morning.");
  valuable("jade_figurine", "Jade Figurine", 400, "A small carved cat.");
  valuable("silver_circlet", "Silver Circlet", 250, "Set with a single moonstone.");
  valuable("gold_necklace", "Gold Necklace", 500, "Heavy links, a dragon pendant.");
  valuable("silver_chalice", "Silver Chalice", 300, "Engraved with the dawn sun.");
  valuable("ivory_statuette", "Ivory Statuette", 300, "A dancing figure.");
  valuable("gold_idol", "Gold Idol", 750, "Squat and ugly and worth a fortune.");
  valuable("dwarven_coin_bag", "Bag of Old Coins", 200, "Dwarven coins, stamped with a hammer.");
  valuable("silver_holy_symbol", "Silver Holy Symbol", 200, "A tarnished symbol of the dawn.");

  // Quest and retrieval items. These are never dropped or sold.
  quest("brass_cellar_key", "Brass Cellar Key", "Opens the locked room in the Thornwick cellars.");
  quest("widow_ring", "Widow Marrow's Ring", "A ring of plain grey iron, once worn by Widow Marrow.");
  quest("dawn_reliquary", "Dawn Reliquary", "A sunburst casket of the Abbey of the Dawn.");
  quest("ogre_iron_key", "Ogre's Iron Key", "Heavy, cold, and it fits a descent gate.");
  quest("cult_sigil", "Ashen Sigil", "A black sigil taken from Malvek's circle.");
  quest("foreman_tally", "Foreman's Tally Book", "Columns of miners' names and debts.");
  quest("iron_king_seal", "Seal of the Iron King", "A seal cut with a crown and a broken chain.");
  quest("patrol_badge", "Patrol Badge", "A tin badge of the Northern Watch.");

  // Silver weapons and other registry extras.
  // Scroll and charge handling live in Data.item().
  D.itemCount = () => Object.keys(D.ITEMS).length;

  // ---- instance ids ------------------------------------------------------
  D.item = (instId) => {
    if (!instId) return null;
    const s = String(instId);
    if (s.startsWith("scroll:")) {
      const sp = D.SPELLS[s.slice(7)];
      if (!sp) return null;
      return {
        id: s, base: s, name: "Scroll of " + sp.name, type: "x", slot: null,
        cost: 150 * sp.l, wt: 0.2, sell: true, spell: sp.id, cls: sp.c === "M" ? "M" : "CP", desc: sp.desc,
      };
    }
    const base = s.split("#")[0];
    return D.ITEMS[base] || null;
  };
  D.baseId = (instId) => {
    const def = D.item(instId);
    return def ? def.base || def.id : String(instId || "").split("#")[0];
  };
  D.charges = (instId) => {
    const s = String(instId || "");
    const i = s.indexOf("#");
    if (i < 0) return null;
    return parseInt(s.slice(i + 1), 10);
  };
  D.itemName = (instId) => {
    const def = D.item(instId);
    if (!def) return "(unknown)";
    const ch = D.charges(instId);
    if (ch !== null) return def.name + " (" + ch + ")";
    return def.name;
  };
  // Creates a device instance with full charges.
  D.newDevice = (baseId) => {
    const def = D.ITEMS[baseId];
    return def.id + "#" + def.charges;
  };

  // ------------------------------------------------------------ spells ----
  // [id, name, class, level, target, range(squares), handler, flags, description]
  const SPELL_ROWS = [
    ["magic_missile", "Magic Missile", "M", 1, "enemy", 9, "missile", "", "Automatic hits: min(5, ceil(level/2)) missiles of 1d4+1; a Shield spell negates them."],
    ["sleep", "Sleep", "M", 1, "area", 6, "sleep", "", "Spends a 2d4 pool of hit dice on the weakest foes; damage wakes them. Elves resist."],
    ["burning_hands", "Burning Hands", "M", 1, "cone", 3, "cone", "", "A short fan of fire: 1d4+1 per caster level up to 5d4."],
    ["armor", "Armor", "M", 1, "self", 0, "armorSpell", "camp", "AC 6 for 8 plus level points of damage taken."],
    ["shield", "Shield", "M", 1, "self", 0, "shieldSpell", "", "A shimmering disc: magic missiles fail and AC improves by 2 in battle."],
    ["color_spray", "Color Spray", "M", 1, "cone", 4, "colorSpray", "", "Blinds and stuns low-hit-dice foes in a cone; saves negate."],
    ["spook", "Spook", "M", 1, "enemy", 6, "fear1", "", "One foe flees for a few rounds unless it saves."],
    ["stinking_cloud", "Stinking Cloud", "M", 2, "area", 12, "cloud", "", "A persistent cloud. Each round, victims save or stagger out."],
    ["mirror_image", "Mirror Image", "M", 2, "self", 0, "mirror", "", "Images draw melee blows until dispelled."],
    ["strength", "Strength", "M", 2, "ally", 1, "strength", "camp", "One ally gains STR 18/75 for an hour per level."],
    ["knock", "Knock", "M", 2, "explore", 1, "knock", "explore", "Opens one locked door. Not a combat attack."],
    ["web", "Web", "M", 2, "area", 9, "web", "", "Strands foes in a sticky area; strong foes tear free."],
    ["acid_arrow", "Acid Arrow", "M", 2, "enemy", 9, "acid", "", "A bolt of acid: 2d4 per two levels as it lingers."],
    ["invisibility", "Invisibility", "M", 2, "ally", 1, "invis", "camp", "The target vanishes until it strikes or casts."],
    ["blindness", "Blindness", "M", 2, "enemy", 9, "blind", "", "One foe is blinded unless it saves."],
    ["scare", "Scare", "M", 2, "area", 6, "scare", "", "Foes in range flee in terror unless they save."],
    ["fireball", "Fireball", "M", 3, "area", 12, "fireball", "", "Radius 2.3 burst of up to 10d6 fire; save for half. Hits allies too."],
    ["lightning_bolt", "Lightning Bolt", "M", 3, "line", 10, "bolt", "", "A line of lightning that stops at the first obstacle."],
    ["haste", "Haste", "M", 3, "ally", 6, "haste", "", "Doubles movement and attacks; a Slow spell undoes it."],
    ["hold_person", "Hold Person", "M", 3, "enemy", 9, "hold", "", "Paralyses one humanoid unless it saves."],
    ["slow", "Slow", "M", 3, "area", 9, "slow", "", "Halves a group's moves and attacks, undoing Haste."],
    ["dispel_magic", "Dispel Magic", "M", 3, "area", 6, "dispel", "", "Ends magical effects in an area; a chance against each."],
    ["vampiric_touch", "Vampiric Touch", "M", 3, "touch", 1, "vampiric", "", "A touch that drains life into the caster."],
    ["ice_storm", "Ice Storm", "M", 4, "area", 12, "icestorm", "", "Hail in a 3-square burst; blunt damage to all."],
    ["stoneskin", "Stoneskin", "M", 4, "self", 0, "stoneskin", "", "Negates a limited number of blows."],
    ["fear", "Fear", "M", 4, "area", 6, "fear", "", "A wide spread of terror; the weak flee and the brave save."],
    ["cone_of_cold", "Cone of Cold", "M", 5, "cone", 6, "cone", "", "A cone of freezing air: 1d4 per caster level, half on a save."],
    ["hold_monster", "Hold Monster", "M", 5, "enemy", 9, "holdmon", "", "Paralyses any single creature unless it saves."],
    ["cloudkill", "Cloudkill", "M", 5, "area", 9, "cloudkill", "", "A poison cloud that kills the weak and wounds the rest."],
    ["chain_lightning", "Chain Lightning", "M", 6, "enemy", 9, "chain", "", "Lightning leaps from foe to foe."],
    ["disintegrate", "Disintegrate", "M", 6, "enemy", 6, "disintegrate", "", "Ten dice of force; a foe reduced to nothing dies outright."],
    ["flesh_to_stone", "Flesh to Stone", "M", 6, "enemy", 6, "petrify", "", "Turns a foe to stone unless it saves."],
    ["death_spell", "Death Spell", "M", 6, "area", 9, "death", "", "Kills low-level creatures outright in an area."],
    ["delayed_blast_fireball", "Delayed Blast Fireball", "M", 7, "area", 12, "dbfb", "", "A great fireball that bursts after a few rounds."],
    ["finger_of_death", "Finger of Death", "M", 7, "enemy", 9, "finger", "", "Kills one foe outright unless it saves."],
    ["power_word_stun", "Power Word: Stun", "M", 7, "enemy", 9, "pwstun", "", "Stuns a creature with up to 150 hit points."],
    ["incendiary_cloud", "Incendiary Cloud", "M", 8, "area", 12, "incend", "", "A burning cloud that persists and burns each round."],
    ["power_word_blind", "Power Word: Blind", "M", 8, "enemy", 9, "pwblind", "", "Blinds a creature with up to 100 hit points."],
    ["meteor_swarm", "Meteor Swarm", "M", 9, "area", 15, "meteor", "", "Four spheres of fire, each a small fireball."],
    ["power_word_kill", "Power Word: Kill", "M", 9, "enemy", 9, "pwkill", "", "Kills a creature with up to 100 hit points."],
    ["cure_light_wounds", "Cure Light Wounds", "C", 1, "touch", 1, "heal1", "camp", "Restores 1d8 hit points to one touched creature."],
    ["bless", "Bless", "C", 1, "area", 6, "bless", "", "Allies gain +1 to hit and +1 to saves for the battle."],
    ["protection_from_evil", "Protection From Evil", "C", 1, "touch", 1, "pfe", "camp", "Evil foes have -2 to hit the warded ally."],
    ["command", "Command", "C", 1, "enemy", 6, "command", "", "One word: the foe halts, flees or drops a weapon."],
    ["cause_light_wounds", "Cause Light Wounds", "C", 1, "touch", 1, "causeLight", "", "Touch that harms a living creature for 1d8."],
    ["magical_stone", "Magical Stone", "C", 1, "enemy", 6, "mstone", "", "Stones hurled by a sling for 1d6 each."],
    ["hold_person_c", "Hold Person", "C", 2, "enemy", 9, "hold", "", "Paralyses one humanoid unless it saves."],
    ["aid", "Aid", "C", 2, "ally", 1, "aid", "camp", "Grants temporary hit points and +1 to hit for a battle."],
    ["slow_poison", "Slow Poison", "C", 2, "touch", 1, "slowPoison", "camp", "Holds venom in check for a day."],
    ["silence_15", "Silence, 15' Radius", "C", 2, "area", 6, "silence", "", "No spells can be cast within the radius."],
    ["resist_fire_cold", "Resist Fire and Cold", "C", 2, "ally", 1, "resistFC", "camp", "Halves fire or cold damage for an hour."],
    ["prayer", "Prayer", "C", 3, "area", 6, "prayer", "", "Allies gain +1 to hit; foes -1 to hit."],
    ["dispel_magic_c", "Dispel Magic", "C", 3, "area", 6, "dispel", "", "Ends magical effects in an area; a chance against each."],
    ["remove_paralysis", "Remove Paralysis", "C", 3, "touch", 1, "removePara", "camp", "Frees one creature from paralysis."],
    ["magical_vestment", "Magical Vestment", "C", 3, "touch", 1, "vestment", "camp", "Improves a touched creature's armour class."],
    ["cause_blindness", "Cause Blindness", "C", 3, "touch", 1, "causeBlind", "", "Touch that blinds a living creature."],
    ["cure_blindness", "Cure Blindness", "C", 3, "touch", 1, "cureBlind", "camp", "Restores sight to one touched creature."],
    ["cure_serious_wounds", "Cure Serious Wounds", "C", 4, "touch", 1, "heal2", "camp", "Restores 2d8+1 hit points."],
    ["neutralize_poison", "Neutralize Poison", "C", 4, "touch", 1, "neutralize", "camp", "Removes poison from one creature."],
    ["cause_serious_wounds", "Cause Serious Wounds", "C", 4, "touch", 1, "causeSerious", "", "Touch that harms a living creature for 2d8."],
    ["free_action", "Free Action", "C", 4, "ally", 1, "freeAction", "camp", "The target cannot be held or paralysed for an hour."],
    ["protection_from_evil_10", "Protection From Evil, 10' Radius", "C", 4, "area", 3, "pfe10", "", "A ward against evil in a small circle."],
    ["cure_critical_wounds", "Cure Critical Wounds", "C", 5, "touch", 1, "heal3", "camp", "Restores 3d8+3 hit points."],
    ["flame_strike", "Flame Strike", "C", 5, "area", 9, "flameStrike", "", "A pillar of fire: 6d8 damage, half on a save."],
    ["cause_critical_wounds", "Cause Critical Wounds", "C", 5, "touch", 1, "causeCrit", "", "Touch that harms a living creature for 3d8+3."],
    ["slay_living", "Slay Living", "C", 5, "enemy", 9, "slayLiving", "", "Kills a living foe unless it saves; undead are immune."],
    ["dispel_evil", "Dispel Evil", "C", 5, "area", 6, "dispelEvil", "", "Drives summoned and evil creatures back in an area."],
    ["raise_dead", "Raise Dead", "C", 5, "corpse", 1, "raise", "corpse", "Returns a dead companion to life at 1 hit point, with -1 Constitution."],
    ["heal", "Heal", "C", 6, "touch", 1, "heal4", "camp", "Restores all but 1d4 missing hit points and cures affliction."],
    ["blade_barrier", "Blade Barrier", "C", 6, "area", 9, "blade", "", "A wall of blades that cuts whoever crosses it."],
    ["harm", "Harm", "C", 6, "touch", 1, "harm", "", "Touch that drains a foe's hit points to a small number."],
    ["holy_word", "Holy Word", "C", 7, "area", 9, "holyWord", "", "Evil creatures are stunned or slain by hit dice."],
    ["destruction", "Destruction", "C", 7, "enemy", 9, "destruction", "", "Slays one foe at once unless it saves."],
    ["resurrection", "Resurrection", "C", 7, "corpse", 1, "resurrect", "corpse", "Restores a dead companion at full hit points, even a lost one."],
  ];
  D.SPELLS = {};
  for (const r of SPELL_ROWS) {
    const [id, name, c, l, tgt, range, h, flags, desc] = r;
    const sp = { id, name, c, l, tgt, range, h, desc, camp: /camp/.test(flags), explore: /explore/.test(flags), corpse: /corpse/.test(flags) };
    // Paladin and priest duplicates keep their own ids; the list function reads the class letter.
    D.SPELLS[id] = sp;
  }
  // Priest duplicates for the two list-level clashes (hold person, dispel magic) get their own ids.
  // Wizard list ids are used in the spell book; priest list ids in the cleric list.
  const WIZ = [], PRI = [];
  for (const id of Object.keys(D.SPELLS)) {
    const sp = D.SPELLS[id];
    (sp.c === "M" ? WIZ : PRI).push(id);
  }
  // Spell level arrays for list lookups.
  D.spellList = (kind, lvl) => {
    const pool = kind === "M" ? WIZ : PRI;
    return pool.filter((id) => D.SPELLS[id].l === lvl);
  };
  // Paladins use a restricted subset of the priest list.
  const PAL = ["cure_light_wounds", "bless", "protection_from_evil", "command", "aid", "slow_poison", "cure_serious_wounds", "neutralize_poison", "prayer", "remove_paralysis"];
  D.paladinSpellIds = () => PAL.slice();
  D.spellCount = () => ({ wizard: WIZ.length, priest: PRI.length });
  D.spellHandler = (id) => (D.SPELLS[id] ? D.SPELLS[id].h : null);

  // ----------------------------------------------------- creatures -------
  D.MAPS = {};
  D.MONSTERS = {};
  // Hit dice to dice notation: 4.3 -> 4d8+3; 0.5 -> 1d4; 0.9 -> 1d8-1.
  D.hdDice = (hd) => {
    const n = Math.floor(hd);
    const frac = Math.round((hd - n) * 10);
    if (n === 0) return frac === 5 ? "1d4" : "1d8-" + (10 - frac);
    return frac ? n + "d8+" + frac : n + "d8";
  };
  D.defaultXP = (hd, specials) => Math.round(8 + hd * hd * 6 + specials * 15);
  // Build a creature from hit dice and overrides.
  D.mk = (id, name, hd, ac, mv, atk, o = {}) => {
    const specials = (o.sp || []).length + (o.req ? 1 : 0) + (o.cast ? 2 : 0) + (o.rng ? 1 : 0);
    const tags = o.tags || ["beast"];
    const giantish = tags.includes("giant") || tags.includes("troll") || tags.includes("ogre");
    const gold = o.gold !== undefined ? o.gold : tags.includes("bandit") || tags.includes("humanoid") || tags.includes("goblinoid") || tags.includes("kobold") || tags.includes("gnoll") || tags.includes("orc") || tags.includes("cultist") ? Math.max(1, Math.floor(hd)) + "d6" : giantish ? "2d6" : "0";
    return {
      id,
      name,
      hd,
      hp: o.hp || (hd === 0.5 ? "1d4" : D.hdDice(hd)),
      ac,
      mv,
      thac0: Math.min(20, 21 - Math.floor(hd)),
      atk: Array.isArray(atk) ? atk : [atk],
      size: o.size || "M",
      ml: o.ml !== undefined ? o.ml : 8,
      xp: o.xp !== undefined ? o.xp : D.defaultXP(hd, specials),
      gold,
      tags,
      fig: o.fig || "humanoid",
      lore: o.lore || "",
      req: o.req || null,
      res: o.res || {},
      sp: o.sp || [],
      cast: o.cast || null,
      rng: o.rng || null,
      leader: !!o.leader,
      rank: o.rank || 0,
      plural: o.plural || name + "s",
    };
  };
  D.monster = (id) => D.MONSTERS[id] || null;
  const M = (...a) => {
    const m = D.mk(...a);
    D.MONSTERS[m.id] = m;
    return m;
  };
  // Saga creatures.
  M("giant_rat", "Giant Rat", 0.5, 7, 12, "1d3", { size: "S", ml: 5, tags: ["beast", "vermin"], fig: "rat", lore: "Thin, hungry and fearless in packs." });
  M("giant_centipede", "Giant Centipede", 0.5, 9, 15, "1d3", { size: "S", ml: 7, tags: ["vermin"], fig: "centipede", sp: ["poison"], lore: "Its bite stings; the sting can linger." });
  M("kobold", "Kobold", 0.9, 7, 6, "1d4", { size: "S", ml: 6, tags: ["kobold", "humanoid"], fig: "humanoid", lore: "Scaly, quick and spiteful." });
  M("kobold_slinger", "Kobold Slinger", 0.9, 7, 6, "1d4", { size: "S", ml: 6, tags: ["kobold", "humanoid"], fig: "humanoid", rng: { dmg: "1d4", range: [2, 4, 6] }, lore: "Throws stones from behind its fellows." });
  M("kobold_warden", "Kobold Warden", 2, 6, 6, "1d6", { size: "S", ml: 8, tags: ["kobold", "humanoid"], fig: "humanoid", lore: "Guards the locked doors of the cellar." });
  M("skarrik", "Skarrik, the Kettle-Crowned", 4.2, 5, 9, ["1d6+1", "1d6+1"], { size: "S", ml: 16, leader: true, tags: ["kobold", "humanoid", "boss"], fig: "humanoid", lore: "A kobold lord who wears a copper kettle for a crown and rules the cellar with a dented key." });
  M("giant_beetle", "Giant Beetle", 4.4, 4, 12, "2d4", { size: "M", ml: 8, tags: ["vermin"], fig: "insect", lore: "Lives in malt sacks and bites through sacking." });
  M("wolf", "Wolf", 2.2, 7, 18, "1d6", { size: "M", ml: 8, tags: ["beast"], fig: "wolf", lore: "Hunts in the open country." });
  M("dire_wolf", "Dire Wolf", 4.4, 6, 15, "2d4", { size: "L", ml: 9, tags: ["beast"], fig: "wolf", lore: "A wolf the size of a pony." });
  M("brigand", "Brigand", 1, 7, 12, "1d6", { size: "M", ml: 8, tags: ["bandit", "humanoid"], fig: "humanoid", lore: "Waylays travellers for a living." });
  M("brigand_captain", "Brigand Captain", 3.4, 5, 12, "1d8", { size: "M", ml: 9, leader: true, tags: ["bandit", "humanoid"], fig: "humanoid", lore: "Commands the camp and wears two belts of knives." });
  M("bandit", "Bandit", 1, 8, 12, "1d6", { size: "M", ml: 7, tags: ["bandit", "humanoid"], fig: "humanoid", lore: "Cowards in a crowd, bold in a gang." });
  M("goblin", "Goblin", 1, 6, 6, "1d6", { size: "S", ml: 7, tags: ["goblinoid", "humanoid"], fig: "humanoid", lore: "Small, sly and fond of traps." });
  M("hobgoblin", "Hobgoblin", 1.1, 5, 9, "1d8", { size: "M", ml: 8, tags: ["goblinoid", "humanoid"], fig: "humanoid", lore: "Drilled soldiers in dirty mail." });
  M("redfang", "Redfang, Goblin Chieftain", 3.6, 3, 9, ["1d8+1", "1d4"], { size: "S", ml: 14, leader: true, tags: ["goblinoid", "humanoid", "boss"], fig: "humanoid", lore: "Wears the fangs of three wolves on a cord." });
  M("gnoll", "Gnoll", 2, 5, 9, "2d4", { size: "M", ml: 9, tags: ["gnoll", "humanoid"], fig: "humanoid", lore: "A hyena-headed hunter of the moors." });
  M("bloodmane_packlord", "Bloodmane Packlord", 4.4, 4, 9, ["2d6", "1d4"], { size: "L", ml: 16, leader: true, tags: ["gnoll", "humanoid", "boss"], fig: "humanoid", lore: "Rules the Bloodmane pack from a watchtower of bones." });
  M("ghoul", "Ghoul", 2.2, 6, 9, ["1d3", "1d3", "1d6"], { size: "M", ml: 9, tags: ["undead"], fig: "humanoid", rank: 3, sp: ["paralysis"], lore: "Claws that paralyse. Elves resist the touch." });
  M("skeleton", "Skeleton", 1, 7, 12, "1d6", { size: "M", ml: 20, tags: ["undead"], fig: "humanoid", rank: 1, sp: ["halfNonBlunt"], lore: "Bone and rust. Blunt weapons break it best." });
  M("zombie", "Zombie", 2.2, 8, 6, "1d8", { size: "M", ml: 20, tags: ["undead"], fig: "humanoid", rank: 2, lore: "Slow, stinking, and fearless." });
  M("wight", "Wight", 3.3, 5, 12, "1d4", { size: "M", ml: 12, tags: ["undead"], fig: "humanoid", rank: 5, req: "silver", sp: ["drain"], lore: "Its touch drains a level of life." });
  M("iron_king", "The Iron King", 6.6, 2, 12, ["1d8+2", "1d8+2"], { size: "M", ml: 17, leader: true, tags: ["undead", "boss"], fig: "humanoid", rank: 7, req: "magic", sp: ["drain"], lore: "A king in rusted mail who will not stay in his barrow." });
  M("gorrak", "Gorrak Skullsplitter", 4.4, 4, 9, ["2d6+1", "1d6"], { size: "M", ml: 15, leader: true, tags: ["orc", "humanoid", "boss"], fig: "humanoid", lore: "A warchief of the Deepcut mine, with a hammer fashioned from a bell." });
  M("orc", "Orc", 1, 6, 9, "1d8", { size: "M", ml: 8, tags: ["orc", "humanoid"], fig: "humanoid", lore: "Squat-faced and strong." });
  M("giant_spider", "Giant Spider", 4.4, 4, 15, "1d8", { size: "L", ml: 9, tags: ["vermin", "spider"], fig: "spider", sp: ["poison"], lore: "Webs the road and waits in the web." });
  M("ogre", "Ogre", 4.1, 5, 9, "1d10", { size: "L", ml: 13, tags: ["giant", "ogre"], fig: "humanoid", lore: "Big, stupid, and patient with a club." });
  M("bugbear", "Bugbear", 3.1, 5, 9, "2d4", { size: "M", ml: 9, tags: ["goblinoid", "humanoid"], fig: "humanoid", lore: "A hairy goblin with a long reach." });
  M("troll", "Troll", 6.6, 4, 12, ["1d4", "1d4", "1d6"], { size: "L", ml: 10, tags: ["troll", "giant"], fig: "humanoid", sp: ["regen:3"], lore: "Regrows torn flesh. Fire stops the regrowth." });
  M("gnashrot", "Gnashrot the Troll", 8.8, 2, 12, ["1d6", "1d6", "2d6"], { size: "L", ml: 16, leader: true, tags: ["troll", "giant", "boss"], fig: "humanoid", sp: ["regen:4"], lore: "A troll who guards the causeway to the keep." });
  M("grull", "Grull, the Boulder-Thrower", 8.8, 4, 12, "2d8", { size: "L", ml: 15, leader: true, tags: ["giant", "boss"], fig: "humanoid", rng: { dmg: "2d10", range: [3, 5, 7] }, lore: "A hill giant who throws stones taller than a man." });
  M("hell_hound", "Hell Hound", 4.4, 4, 12, "1d6", { size: "M", ml: 9, tags: ["demon", "fire"], fig: "beast", sp: ["breath:fire"], lore: "Black hounds that breathe sulphur fire." });
  M("gargoyle", "Gargoyle", 4.4, 5, 9, ["1d6", "1d6", "1d4"], { size: "M", ml: 11, tags: ["elemental"], fig: "bird", req: "magic", lore: "Stone that moves. Only enchanted steel bites it." });
  M("raven_witch", "Raven Witch", 4, 7, 12, "1d6", { size: "M", ml: 10, tags: ["witch", "humanoid"], fig: "humanoid", cast: { lvl: 4, list: "M", spells: ["magic_missile", "sleep", "web", "blindness"] }, lore: "Pale, feathered, and fond of spells." });
  M("vharra", "Vharra, the Witch-Queen", 9, 2, 12, "1d6", { size: "M", ml: 17, leader: true, tags: ["witch", "humanoid", "boss"], fig: "humanoid", cast: { lvl: 9, list: "M", spells: ["fireball", "hold_person", "lightning_bolt", "cloudkill", "finger_of_death"] }, lore: "Sits on the throne of the moor and casts without words." });
  M("worg", "Worg", 4.4, 6, 18, "2d4", { size: "L", ml: 9, tags: ["beast", "goblinoid"], fig: "wolf", lore: "A goblin's wolf, grown wicked." });
  M("malvek", "Malvek the Ashen", 7, 3, 12, "1d6+1", { size: "M", ml: 15, leader: true, tags: ["cultist", "humanoid", "boss"], fig: "humanoid", cast: { lvl: 7, list: "M", spells: ["fireball", "chain_lightning", "hold_person", "death_spell"] }, lore: "A grey-robed sorcerer who burns his own name in the abbey hearth." });
  M("cultist", "Cultist", 1, 9, 12, "1d6", { size: "M", ml: 6, tags: ["cultist", "humanoid"], fig: "humanoid", lore: "Chants when they should fight." });
  M("wraith", "Wraith", 5.3, 4, 24, "1d6", { size: "M", ml: 12, tags: ["undead"], fig: "humanoid", rank: 7, req: "silver", sp: ["drain"], lore: "A ghost of the grave with a grave's cold." });
  M("shadow", "Shade", 3.3, 7, 12, "1d4", { size: "M", ml: 12, tags: ["undead"], fig: "humanoid", rank: 4, req: "magic", sp: ["drain"], lore: "A shape of stains, drinking strength." });
  M("cult_champion", "Cult Champion", 3, 5, 12, "1d8+1", { size: "M", ml: 9, tags: ["cultist", "humanoid"], fig: "humanoid", lore: "Holds the sanctum door with a black axe." });

  // ------------------------------------------------------------ shops -----
  D.SHOPS = {
    armory: {
      id: "armory", name: "Armory",
      stock: ["padded_armor", "leather_armor", "studded_leather", "ring_mail", "scale_mail", "chain_mail", "banded_mail", "splint_mail", "plate_mail", "shield", "dagger", "short_sword", "longsword", "broadsword", "spear", "mace", "war_hammer", "flail", "battle_axe", "short_bow", "long_bow", "light_crossbow", "sling", "darts", "silver_dagger"],
    },
    apothecary: {
      id: "apothecary", name: "Apothecary",
      stock: ["potion_healing", "potion_extra_healing", "potion_cure_light", "potion_antivenom", "holy_water", "bandage", "herbs", "bandage_kit", "potion_giant_strength", "potion_heroism"],
    },
    general: {
      id: "general", name: "General Store",
      stock: ["backpack", "bedroll", "rope", "grappling_hook", "iron_spikes", "crowbar", "torch", "lantern", "oil_flask", "ration", "waterskin", "tinderbox", "chalk", "mirror", "tent", "bandage", "thieves_tools", "caltrops", "holy_symbol", "spell_pouch", "map_case", "ink_pen"],
    },
  };

  // --------------------------------------------------------- commissions -----
  // Authored commissions. xp is the listed value; the per-member award is computed from it.
  // side: optional commission. needItem: retrieval item that must be carried when reporting.
  D.QUESTS = {};
  const Q = (q) => {
    D.QUESTS[q.id] = Object.assign({ side: false, needItem: null, reveal: null, gold: 0, xp: 0, module: null }, q);
  };
  Q({ id: "thorn_kobolds", name: "The Kobold Lord", module: "thornwick", lead: "Elder Maddoc", giver: "Elder Maddoc",
    goal: "Bring down Skarrik the Kettle-Crowned in the cellar beneath the brewery.",
    offer: "Skarrik and his crew have taken the brewery cellar. Take him out, and the vats are ours again.",
    done: "The kobold lord is dead. Maddoc sets down his cup and lets out a long breath.",
    gold: 150, xp: 800 });
  Q({ id: "thorn_ring", name: "Widow Marrow's Ring", module: "thornwick", side: true, lead: "Elder Maddoc", giver: "Mother Brina",
    goal: "Recover Widow Marrow's ring from the cellar and bring it to the hall.",
    offer: "Widow Marrow's ring went down with her husband's coffin. Mother Brina would like it back.",
    done: "The widow's ring is returned. Mother Brina weeps and presses coins into your hand.",
    gold: 50, xp: 200, needItem: "widow_ring" });
  Q({ id: "hollow_redfang", name: "The Goblin Chieftain", module: "hollow", lead: "Reeve Halda", giver: "Reeve Halda",
    goal: "Kill Redfang, the chieftain who rules the Hollow Vaults.",
    offer: "Redfang has taken the abbey vaults and sends raiding parties down the Emberwild road.",
    done: "Redfang is dead and his camp scatters. The reeve pays in full.",
    gold: 250, xp: 750 });
  Q({ id: "hollow_reliquary", name: "The Dawn Reliquary", module: "hollow", lead: "Reeve Halda", giver: "Sister Ilse",
    goal: "Return the Dawn Reliquary from the Abbey Undercroft to the town hall.",
    offer: "The abbey's reliquary is in the undercroft. Bring it home and the town will keep the candles burning.",
    done: "The reliquary sits again on the altar. The whole town comes out to see it.",
    gold: 200, xp: 600, needItem: "dawn_reliquary" });
  Q({ id: "hollow_malvek", name: "The Ashen Circle", module: "hollow", lead: "Reeve Halda", giver: "Reeve Halda",
    goal: "Break the cult sanctum and destroy Malvek the Ashen.",
    offer: "Malvek and his circle have taken the crypt's lower chapel. The Reeve wants that stopped.",
    done: "Malvek's ashes are scattered. The sanctum's door is bricked up at last.",
    gold: 300, xp: 900 });
  Q({ id: "hollow_gnolls", name: "Tamsin Hask", module: "hollow", side: true, lead: "Reeve Halda", giver: "Hask Farmstead",
    goal: "Rescue Tamsin Hask by defeating the Bloodmane Packlord.",
    offer: "Tamsin Hask was taken by the gnolls in the Bloodmane watchtower. Her father begs for help.",
    done: "Tamsin Hask is home. Her father's thanks come in the form of a sack of coins.",
    gold: 120, xp: 300 });
  Q({ id: "cold_mine", name: "The Deepcut Lord", module: "coldharrow", lead: "Thane Bergen", giver: "Thane Bergen",
    goal: "Kill Gorrak Skullsplitter in the Deepcut Mine.",
    offer: "Gorrak's bandits have cut the Deepcut shafts off from the forge. Clear them out.",
    done: "Gorrak is dead. The shafts are clear and the forge can breathe again.",
    gold: 350, xp: 1000 });
  Q({ id: "cold_king", name: "The Iron King", module: "coldharrow", lead: "Thane Bergen", giver: "Thane Bergen",
    goal: "Lay the Iron King to rest. Bring back his seal.",
    offer: "The Iron King drains the life from the barrow. Find his seal and lay him in the earth.",
    done: "The Iron King is laid down at last. His seal lies on the thane's table.",
    gold: 500, xp: 1200, needItem: "iron_king_seal" });
  Q({ id: "cold_tally", name: "The Foreman's Tally", module: "coldharrow", side: true, lead: "Thane Bergen", giver: "Foreman Dunmore",
    goal: "Return the foreman's tally book from the mine.",
    offer: "The tally book went missing when the bandits hit the mine. The foreman needs it.",
    done: "The foreman takes his book and forgives the forge's debts for a month.",
    gold: 80, xp: 250, needItem: "foreman_tally" });
  Q({ id: "rav_moor", name: "The Burned Village", module: "ravenmoor", lead: "Commander Ysolde", giver: "Commander Ysolde",
    goal: "Kill Gnashrot the Troll at the causeway.",
    offer: "The moor village burned and Gnashrot's trolls are blocking the causeway. Ysolde needs it open.",
    done: "Gnashrot is slain. The causeway is open to the keep.",
    gold: 400, xp: 1200 });
  Q({ id: "rav_keep", name: "The Keep Giant", module: "ravenmoor", lead: "Commander Ysolde", giver: "Commander Ysolde",
    goal: "Kill Grull, the boulder-throwing hill giant of the keep.",
    offer: "Grull is throwing boulders at the fort walls from the keep. Stop him.",
    done: "Grull's boulders fall silent. The keep's gates are the fort's again.",
    gold: 500, xp: 1400 });
  Q({ id: "rav_witch", name: "The Witch-Queen", module: "ravenmoor", lead: "Commander Ysolde", giver: "Commander Ysolde",
    goal: "Destroy Vharra, the Witch-Queen, in the witch-pit.",
    offer: "Vharra sits in the pit beneath the keep and sends her witches to every farm on the moor.",
    done: "Vharra is no more. The witches scatter like crows.",
    gold: 800, xp: 2000 });
  Q({ id: "rav_patrol", name: "The Northern Watch", module: "ravenmoor", side: true, lead: "Commander Ysolde", giver: "Sergeant Tarrow",
    goal: "Recover twelve patrol badges from the moor.",
    offer: "A patrol of twelve was lost on the moor. Their badges would let the families bury them.",
    done: "Twelve badges are laid out on the table. The sergeant salutes each in turn.",
    gold: 200, xp: 600, needItem: "patrol_badge" });

  // --------------------------------------------------------- rumors -----
  D.RUMORS = [
    "They say the cellar beer is cursed, and the kobolds drink it anyway.",
    "A traveller swears the Hollow Vaults go deeper than the abbey's bell tower.",
    "Old Hask says the moor witches only come out when the ravens stop singing.",
    "Dwarves at the forge swear the Iron King has been seen counting his coins at night.",
    "Someone in the tavern keeps telling the story of a dragon that flew over the Emberwild.",
    "The shrine's oil is cheaper in the spring; the priests feel generous then.",
    "A merchant claims the bridge at the river is safer than the ford in the rain.",
    "They say a mage in the north sells scrolls that never run out.",
    "The bandits on the road pay their tolls in silver, but they take gold when they can.",
    "Every year the moors send a patrol out, and every year it comes back a little smaller.",
  ];

  // --------------------------------------------------------- pregens -----
  // Fixed sheets for the six starting heroes. Gear and packs are equipped by the pregen factory.
  const PREGEN_SPECS = [
    { id: "pg_aldric", name: "Aldric Thorne", race: "human", cls: "F", align: "NG", color: "#b5483a", spec: "longsword",
      abil: { str: 17, dex: 12, con: 16, int: 9, wis: 10, cha: 11, strx: 0 },
      eq: { melee: "longsword", armor: "chain_mail", shield: "shield" }, inv: ["bedroll", "ration", "ration", "torch", "torch", "bandage"] },
    { id: "pg_seraphine", name: "Seraphine Vale", race: "human", cls: "P", align: "LG", color: "#e3b54a",
      abil: { str: 14, dex: 10, con: 12, int: 10, wis: 13, cha: 17, strx: 0 },
      eq: { melee: "broadsword", armor: "chain_mail", shield: "shield", neck: "holy_symbol" }, inv: ["ration", "ration", "torch", "bandage", "bandage"] },
    { id: "pg_borin", name: "Borin Stonehand", race: "dwarf", cls: "C", align: "LG", color: "#7a6a4f",
      abil: { str: 13, dex: 9, con: 16, int: 10, wis: 14, cha: 9, strx: 0 },
      eq: { melee: "mace", missile: "sling", armor: "chain_mail", shield: "shield", neck: "holy_symbol" }, inv: ["ration", "ration", "torch", "bandage", "bandage"] },
    { id: "pg_lyra", name: "Lyra Windwhisper", race: "half-elf", cls: "R", align: "CG", color: "#4f8a5b", foe: "goblinoid",
      abil: { str: 13, dex: 15, con: 14, int: 11, wis: 14, cha: 12, strx: 0 },
      eq: { melee: "longsword", missile: "long_bow", armor: "studded_leather" }, inv: ["ration", "ration", "torch", "bandage", "rope"] },
    { id: "pg_pip", name: "Pip Quickfinger", race: "halfling", cls: "T", align: "NG", color: "#8a5fa8",
      abil: { str: 8, dex: 17, con: 13, int: 12, wis: 10, cha: 14, strx: 0 },
      eq: { melee: "short_sword", missile: "sling", armor: "leather_armor", gloves: null }, inv: ["thieves_tools", "ration", "torch", "bandage", "rope"] },
    { id: "pg_elowen", name: "Elowen Starfall", race: "elf", cls: "M", align: "NG", color: "#6fa8d6",
      abil: { str: 8, dex: 14, con: 9, int: 16, wis: 11, cha: 13, strx: 0 },
      eq: { melee: "staff", missile: "darts" }, inv: ["spell_pouch", "ration", "torch", "potion_healing"], book: ["magic_missile", "sleep", "armor", "burning_hands", "shield"] },
  ];
  D.PREGEN_IDS = PREGEN_SPECS.map((p) => p.id);
  // Create a fresh pregen. Callers take ownership of the returned object.
  D.pregen = (id) => {
    const s = PREGEN_SPECS.find((p) => p.id === id);
    if (!s) return null;
    const c = Rules.createPC({ id: s.id, name: s.name, race: s.race, cls: s.cls, align: s.align, color: s.color, spec: s.spec || null, foe: s.foe || null, abil: Object.assign({}, s.abil), pregen: true });
    if (s.spec) c.spec = s.spec;
    c.inv = (s.inv || []).slice();
    // Equipped items are placed in their slots; the books are the mage's starting spells.
    for (const slot of Object.keys(s.eq || {})) if (s.eq[slot]) c.eq[slot] = s.eq[slot];
    if (s.book) c.book = s.book.slice();
    return c;
  };
  D.PREGEN_SPECS = PREGEN_SPECS;
  D.PREGENS = () => PREGEN_SPECS.map((p) => D.pregen(p.id));

  // Spell-learning map for sheet use (kept here so every module reads one table).
  D.isSpellScroll = (instId) => String(instId || "").startsWith("scroll:");

  return D;
})();
