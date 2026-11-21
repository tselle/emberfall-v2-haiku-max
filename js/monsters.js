"use strict";
/*
 * Wider creature catalogue: 191 bestiary entries by theme, built from hit
 * dice and overrides with Data.mk. Also the leader factory: a generated
 * villain is a clone of a themed base creature under a unique id, with more
 * hit points, a higher morale floor, the leader flag and double experience.
 */
const Monsters = (() => {
  const Mo = {};
  const put = (id, name, hd, ac, mv, atk, o = {}) => {
    const m = Data.mk(id, name, hd, ac, mv, atk, o);
    Data.MONSTERS[id] = m;
    return m;
  };
  // Theme defaults: tags and figure type for the family.
  const TH = {
    vermin: { tags: ["vermin"], fig: "insect", size: "S", ml: 7 },
    fungus: { tags: ["fungus"], fig: "blob", size: "S", ml: 20 },
    beasts: { tags: ["beast"], fig: "beast", size: "M", ml: 8 },
    bandits: { tags: ["bandit", "humanoid"], fig: "humanoid", size: "M", ml: 8 },
    goblinoid: { tags: ["goblinoid", "humanoid"], fig: "humanoid", size: "M", ml: 8 },
    swamp: { tags: ["swamp"], fig: "serpent", size: "M", ml: 9 },
    lycanthrope: { tags: ["lycanthrope", "beast"], fig: "wolf", size: "M", ml: 9 },
    undead: { tags: ["undead"], fig: "humanoid", size: "M", ml: 20 },
    menagerie: { tags: ["beast", "menagerie"], fig: "beast", size: "L", ml: 9 },
    wizard: { tags: ["construct", "wizard"], fig: "orb", size: "M", ml: 12 },
    frozen: { tags: ["frozen"], fig: "beast", size: "L", ml: 10 },
    giants: { tags: ["giant"], fig: "humanoid", size: "L", ml: 13 },
    demons: { tags: ["demon"], fig: "humanoid", size: "M", ml: 11 },
    dragon: { tags: ["dragon"], fig: "dragon", size: "L", ml: 14 },
    elemental: { tags: ["elemental"], fig: "orb", size: "M", ml: 12 },
    underdark: { tags: ["underdark", "humanoid"], fig: "humanoid", size: "M", ml: 10 },
    devils: { tags: ["devil"], fig: "humanoid", size: "M", ml: 12 },
  };
  const M = (theme, id, name, hd, ac, mv, atk, o = {}) => put(id, name, hd, ac, mv, atk, Object.assign({}, TH[theme], o, { tags: (o.tags || []).concat(TH[theme].tags) }));

  // ---- vermin ----
  M("vermin", "giant_ant", "Giant Ant", 2.2, 3, 18, "1d4", { size: "S" });
  M("vermin", "giant_roach", "Giant Cockroach", 0.5, 8, 15, "1d2", { size: "S", ml: 4 });
  M("vermin", "giant_scorpion", "Giant Scorpion", 4.4, 2, 15, ["1d6", "1d6", "1d4"], { size: "M", sp: ["poison"] });
  M("vermin", "carrion_crawler", "Carrion Crawler", 3.3, 7, 12, ["1d4", "1d4"], { size: "M", sp: ["paralysis"] });
  M("vermin", "dire_spider", "Dire Spider", 2.2, 5, 15, "1d4", { size: "S", sp: ["poison"] });
  M("vermin", "cave_beetle", "Cave Beetle", 3.3, 4, 9, "2d6", { size: "M" });
  M("vermin", "swarm_ants", "Army Ant Swarm", 1.1, 8, 15, "1d3", { size: "S", ml: 20 });
  M("vermin", "giant_wasp", "Giant Wasp", 3.3, 6, 18, "1d4", { size: "M", sp: ["poison"] });
  M("vermin", "rot_grub", "Rot Grub", 0.9, 9, 6, "1d3", { size: "S", ml: 5 });
  M("vermin", "tunnel_worm", "Tunnel Worm", 5.5, 4, 9, "2d4", { size: "L", fig: "serpent" });
  M("vermin", "blood_leech", "Giant Leech", 1.1, 8, 3, "1d4", { size: "S", sp: ["drain"], ml: 12 });
  // ---- fungus ----
  M("fungus", "shrieker", "Shrieker", 1.1, 7, 1, "0", { size: "M", sp: ["shriek"], ml: 20 });
  M("fungus", "violet_fungus", "Violet Fungus", 3.3, 7, 1, ["1d4", "1d4"], { size: "M", ml: 20 });
  M("fungus", "gas_spore", "Gas Spore", 2.2, 9, 3, "0", { size: "S", sp: ["burst"], ml: 20 });
  M("fungus", "yellow_mold", "Yellow Mold", 2.2, 9, 0, "1d4", { size: "M", ml: 20, sp: ["poison"] });
  M("fungus", "lichen_crawler", "Lichen Crawler", 2.2, 6, 3, "1d6", { size: "M" });
  M("fungus", "mushroom_man", "Myconid", 2.2, 7, 6, "1d6", { size: "M", fig: "humanoid" });
  M("fungus", "spore_horror", "Spore Horror", 5.5, 3, 6, ["1d6", "1d6"], { size: "L", sp: ["poison"] });
  M("fungus", "myconid_sprout", "Myconid Sprout", 0.9, 9, 6, "1d4", { size: "S" });
  M("fungus", "fungal_brute", "Fungal Brute", 4.4, 5, 6, ["2d4", "1d6"], { size: "L" });
  M("fungus", "dust_mold", "Dust Mold", 1.1, 8, 0, "1d3", { size: "S", ml: 20 });
  M("fungus", "brown_mold", "Brown Mold", 6.6, 9, 0, "0", { size: "M", ml: 20, sp: ["cold"] });
  // ---- beasts ----
  M("beasts", "boar", "Wild Boar", 3.3, 7, 15, "2d4", { size: "M", ml: 11 });
  M("beasts", "bear_black", "Black Bear", 3.3, 6, 12, ["1d3", "1d3", "1d6"], { size: "M" });
  M("beasts", "bear_grizzly", "Grizzly Bear", 5.5, 6, 12, ["1d6", "1d6", "2d8"], { size: "L" });
  M("beasts", "badger_giant", "Giant Badger", 3.3, 4, 12, ["1d3", "1d3", "1d6"], { size: "M" });
  M("beasts", "hawk_giant", "Giant Hawk", 4.4, 6, 3, "1d6", { size: "M", fig: "bird" });
  M("beasts", "lion_mountain", "Mountain Lion", 4.4, 6, 15, ["1d4", "1d4", "1d10"], { size: "L" });
  M("beasts", "panther", "Panther", 3.3, 6, 15, ["1d3", "1d3", "1d6"], { size: "M" });
  M("beasts", "dire_boar", "Dire Boar", 6.6, 6, 12, "3d4", { size: "L" });
  M("beasts", "elk_war", "Elk", 3.3, 7, 18, ["1d6", "1d6"], { size: "L" });
  M("beasts", "python_giant", "Giant Python", 5.5, 5, 9, "2d4", { size: "L", fig: "serpent", sp: ["constrict"] });
  M("beasts", "horse_wild", "Wild Stallion", 2.2, 7, 24, ["1d4", "1d4"], { size: "L" });
  M("beasts", "vulture_giant", "Giant Vulture", 2.2, 7, 3, "1d4", { size: "M", fig: "bird" });
  // ---- bandits ----
  M("bandits", "bandit_archer", "Bandit Archer", 1, 8, 12, "1d6", { size: "M", rng: { dmg: "1d6", range: [2, 4, 6] } });
  M("bandits", "highwayman", "Highwayman", 2, 6, 12, "1d8", { size: "M" });
  M("bandits", "cutthroat", "Cutthroat", 1.1, 7, 12, "1d6", { size: "M" });
  M("bandits", "mercenary_sword", "Mercenary Swordsman", 2.2, 5, 12, "1d8", { size: "M", ml: 9 });
  M("bandits", "mercenary_pike", "Mercenary Pikeman", 2.2, 5, 9, "1d8+1", { size: "M", ml: 9 });
  M("bandits", "footpad", "Footpad", 1, 8, 15, "1d4", { size: "M" });
  M("bandits", "smuggler", "Smuggler", 1.1, 7, 12, "1d6", { size: "M" });
  M("bandits", "thug", "Thug", 2, 7, 12, "1d6+1", { size: "M" });
  M("bandits", "brigand_sergeant", "Brigand Sergeant", 3, 5, 12, "1d8", { size: "M", leader: true });
  M("bandits", "sell_sword", "Sell-sword", 1.1, 6, 12, "1d6", { size: "M" });
  // ---- goblinoid ----
  M("goblinoid", "goblin_archer", "Goblin Archer", 1, 6, 6, "1d6", { size: "S", rng: { dmg: "1d4", range: [1, 2, 4] } });
  M("goblinoid", "hobgoblin_sergeant", "Hobgoblin Sergeant", 2.1, 5, 9, "1d8+1", { size: "M" });
  M("goblinoid", "bugbear_stalker", "Bugbear Stalker", 3.1, 5, 9, "2d4", { size: "M" });
  M("goblinoid", "orc_brute", "Orc Brute", 2, 6, 9, "1d10", { size: "M" });
  M("goblinoid", "orc_archer", "Orc Archer", 1, 6, 9, "1d6", { size: "M", rng: { dmg: "1d6", range: [2, 4, 6] } });
  M("goblinoid", "hobgoblin_shaman", "Hobgoblin Shaman", 3, 7, 9, "1d4", { size: "M", cast: { lvl: 3, list: "C", spells: ["cause_light_wounds", "bless", "hold_person_c"] } });
  M("goblinoid", "goblin_wolfrider", "Goblin Wolf-rider", 1.1, 6, 15, "1d6", { size: "M", tags: ["goblinoid"], fig: "wolf" });
  M("goblinoid", "gnoll_archer", "Gnoll Archer", 2, 5, 9, "2d4", { size: "M", rng: { dmg: "1d6", range: [2, 3, 5] } });
  M("goblinoid", "gnoll_shaman", "Gnoll Shaman", 3, 6, 9, "1d4", { size: "M", tags: ["gnoll"], cast: { lvl: 3, list: "C", spells: ["command", "cause_light_wounds", "aid"] } });
  M("goblinoid", "orc_chieftain", "Orc Chieftain", 4.2, 4, 9, ["1d10", "1d4"], { size: "M", leader: true, ml: 14 });
  M("goblinoid", "hobgoblin_captain", "Hobgoblin Captain", 3.2, 4, 9, "1d10", { size: "M", leader: true });
  // ---- swamp ----
  M("swamp", "lizardfolk", "Lizardfolk", 2.1, 5, 6, ["1d4", "1d4", "1d8"], { size: "M", fig: "serpent" });
  M("swamp", "bullywug", "Bullywug", 1, 6, 6, "1d6", { size: "S", fig: "humanoid" });
  M("swamp", "crocodile", "Crocodile", 3.3, 5, 6, "2d6", { size: "L" });
  M("swamp", "giant_frog", "Giant Frog", 2.2, 7, 6, "1d6", { size: "M", fig: "blob" });
  M("swamp", "otyugh", "Otyugh", 5.5, 3, 6, ["1d8", "1d3", "1d3"], { size: "L", sp: ["disease"] });
  M("swamp", "swamp_hag", "Swamp Hag", 5, 6, 12, "1d8", { size: "M", fig: "humanoid", cast: { lvl: 5, list: "M", spells: ["sleep", "web", "blindness", "hold_person"] } });
  M("swamp", "will_o_wisp", "Will-o'-Wisp", 4.4, -8, 18, "1d8", { size: "S", fig: "orb" });
  M("swamp", "giant_leech_bog", "Bog Leech", 3.3, 8, 3, "1d6", { size: "M", sp: ["drain"] });
  M("swamp", "hydra_two", "Two-headed Hydra", 4.4, 5, 9, ["1d6", "1d6"], { size: "L", fig: "serpent" });
  M("swamp", "marsh_wraith", "Marsh Crawler", 2.2, 6, 9, "1d4", { size: "M" });
  // ---- lycanthrope ----
  M("lycanthrope", "wererat", "Wererat", 2, 6, 12, "1d4", { size: "M", fig: "rat", sp: ["lycanthropy"] });
  M("lycanthrope", "werewolf", "Werewolf", 4.4, 5, 15, ["2d4", "1d6"], { size: "M", fig: "wolf", req: "silver", sp: ["lycanthropy"] });
  M("lycanthrope", "weretiger", "Weretiger", 6.6, 3, 15, ["1d6", "1d6", "2d6"], { size: "L", fig: "beast", req: "silver" });
  M("lycanthrope", "werebear", "Werebear", 7.7, 4, 12, ["1d6", "1d6", "2d8"], { size: "L", fig: "beast", req: "silver" });
  M("lycanthrope", "werefox", "Werefox", 3.3, 6, 15, "1d6", { size: "M", fig: "wolf", req: "silver" });
  M("lycanthrope", "wolfman", "Wolfman", 2.2, 6, 12, "1d8", { size: "M", fig: "humanoid", req: "silver" });
  M("lycanthrope", "ratfolk", "Ratfolk", 1.1, 7, 12, "1d6", { size: "M", fig: "humanoid" });
  M("lycanthrope", "dire_wolf_pack", "Wolf Packleader", 4.4, 6, 15, "2d4", { size: "L", fig: "wolf" });
  M("lycanthrope", "lupine_hunter", "Lupine Hunter", 3, 6, 15, "1d8", { size: "M", fig: "wolf" });
  M("lycanthrope", "boar_sow", "Hog-blooded Brute", 3.3, 6, 12, "2d4", { size: "M", fig: "beast" });
  // ---- undead ----
  M("undead", "ghast", "Ghast", 4.4, 4, 15, ["1d4", "1d4", "1d8"], { size: "M", rank: 6, sp: ["paralysis"] });
  M("undead", "mummy", "Mummy", 6.6, 3, 6, "1d12", { size: "M", rank: 8, req: "magic", sp: ["rot"] });
  M("undead", "vampire_spawn", "Vampire Spawn", 4.4, 4, 12, ["1d6", "1d6"], { size: "M", rank: 10, req: "silver", sp: ["drain"] });
  M("undead", "banshee", "Banshee", 7, 0, 15, "1d8", { size: "M", rank: 9, req: "silver", sp: ["wail"] });
  M("undead", "bone_knight", "Bone Knight", 4, 4, 9, "1d8+1", { size: "M", rank: 3 });
  M("undead", "coffin_dweller", "Coffin Dweller", 3.3, 5, 9, "1d6", { size: "M", rank: 4 });
  M("undead", "ghoul_lord", "Ghoul Lord", 4.4, 4, 9, ["1d6", "1d6", "1d6"], { size: "M", rank: 5, sp: ["paralysis"], leader: true });
  M("undead", "hollow_knight", "Hollow Knight", 3.3, 5, 12, "1d8", { size: "M", rank: 4 });
  M("undead", "crypt_warden", "Crypt Warden", 5, 4, 9, "2d6", { size: "M", rank: 5, leader: true });
  M("undead", "grave_skeleton", "Grave Skeleton", 2, 6, 12, "1d8", { size: "M", rank: 1, sp: ["halfNonBlunt"] });
  M("undead", "wight_lord", "Wight Lord", 5.5, 3, 12, ["1d8", "1d4"], { size: "M", rank: 7, req: "silver", sp: ["drain"], leader: true });
  // ---- menagerie ----
  M("menagerie", "owlbear", "Owlbear", 5.5, 5, 12, ["1d6", "1d6", "2d8"], { size: "L" });
  M("menagerie", "griffon", "Griffon", 7, 3, 12, ["1d4", "1d4", "2d8"], { size: "L", fig: "bird" });
  M("menagerie", "hippogriff", "Hippogriff", 3.3, 5, 18, ["1d6", "1d6", "1d8"], { size: "L", fig: "bird" });
  M("menagerie", "manticore", "Manticore", 6.6, 4, 12, ["1d3", "1d3", "1d8"], { size: "L", fig: "bird", rng: { dmg: "1d6", range: [2, 3, 5] } });
  M("menagerie", "chimera", "Chimera", 9, 4, 9, ["1d4", "1d4", "2d4", "1d6"], { size: "L", fig: "dragon" });
  M("menagerie", "basilisk", "Basilisk", 6.6, 4, 6, "1d10", { size: "M", fig: "serpent", sp: ["petrify-gaze"] });
  M("menagerie", "cockatrice", "Cockatrice", 5, 6, 9, "1d2", { size: "S", fig: "bird", sp: ["petrify-touch"] });
  M("menagerie", "catoblepas", "Catoblepas", 6, 6, 9, "1d6", { size: "L", fig: "beast", sp: ["stun"] });
  M("menagerie", "displacer_beast", "Displacer Beast", 6, -2, 15, ["2d4", "2d4"], { size: "L", fig: "beast" });
  M("menagerie", "wyvern", "Wyvern", 7, 3, 15, ["2d8", "1d6"], { size: "L", fig: "dragon", sp: ["poison"] });
  M("menagerie", "rust_monster", "Rust Monster", 5, 2, 18, "0", { size: "M", fig: "beast", sp: ["rust"] });
  M("menagerie", "bulette", "Bulette", 7, -2, 12, ["3d6", "1d4", "1d4"], { size: "L", fig: "beast" });
  // ---- wizard (constructs and casters) ----
  M("wizard", "animated_armour", "Animated Armour", 3, 3, 9, "1d6", { size: "M", fig: "humanoid", ml: 20 });
  M("wizard", "flesh_golem", "Flesh Golem", 9, 9, 8, ["2d8", "2d8"], { size: "L", fig: "humanoid", req: "magic", ml: 20 });
  M("wizard", "clay_golem", "Clay Golem", 11, 7, 7, "3d10", { size: "L", fig: "humanoid", req: "magic", ml: 20 });
  M("wizard", "homunculus", "Homunculus", 2, 6, 6, "1d3", { size: "S", fig: "humanoid", sp: ["sleep-bite"] });
  M("wizard", "magic_mirror", "Magic Mirror", 2, 7, 0, "0", { size: "M", fig: "orb" });
  M("wizard", "mage_apprentice", "Mage Apprentice", 3, 9, 12, "1d4", { size: "M", cast: { lvl: 3, list: "M", spells: ["magic_missile", "sleep", "web"] } });
  M("wizard", "warlock_archmage", "Warlock Archmage", 9, 3, 12, "1d6", { size: "M", leader: true, cast: { lvl: 9, list: "M", spells: ["fireball", "hold_person", "lightning_bolt", "cloudkill", "finger_of_death"] } });
  M("wizard", "gelatinous_cube", "Gelatinous Cube", 4, 8, 6, "2d4", { size: "L", fig: "blob", sp: ["paralysis"] });
  M("wizard", "shield_guardian", "Shield Guardian", 8, 0, 12, "2d6", { size: "L", fig: "humanoid", req: "magic", ml: 20 });
  M("wizard", "spell_eater", "Spell Eater", 5, 5, 9, "1d8", { size: "M", fig: "orb", sp: ["drain"] });
  M("wizard", "rune_sentinel", "Rune Sentinel", 4, 4, 9, "1d10", { size: "M", fig: "humanoid", ml: 20 });
  // ---- frozen ----
  M("frozen", "winter_wolf", "Winter Wolf", 6, 5, 18, ["2d4", "2d4"], { size: "L", fig: "wolf", sp: ["frost-breath"] });
  M("frozen", "yeti", "Yeti", 4.4, 6, 15, ["1d6", "1d6", "1d4"], { size: "L", fig: "beast" });
  M("frozen", "ice_wolf", "Ice Wolf", 3.3, 6, 18, "1d6", { size: "M", fig: "wolf" });
  M("frozen", "snow_ape", "Snow Ape", 4, 6, 12, ["1d6", "1d6"], { size: "L", fig: "beast" });
  M("frozen", "polar_worm", "Polar Worm", 9, 4, 9, "3d6", { size: "L", fig: "serpent" });
  M("frozen", "frost_toad", "Frost Toad", 2, 7, 6, "1d4", { size: "S", fig: "blob" });
  M("frozen", "ice_mephit", "Ice Mephit", 3, 2, 12, "1d4", { size: "S", fig: "orb" });
  M("frozen", "white_bear", "White Bear", 5.5, 6, 12, ["1d6", "1d6", "2d6"], { size: "L", fig: "beast" });
  M("frozen", "rime_hound", "Rime Hound", 3.3, 5, 15, "1d6", { size: "M", fig: "wolf" });
  M("frozen", "glacier_drake", "Glacier Drake", 6, 3, 12, ["1d6", "1d6", "2d6"], { size: "L", fig: "dragon" });
  // ---- giants ----
  M("giants", "hill_giant", "Hill Giant", 8, 4, 12, "2d8", { size: "L", rng: { dmg: "2d6", range: [3, 4, 6] } });
  M("giants", "stone_giant", "Stone Giant", 9, 2, 12, "3d6", { size: "L", rng: { dmg: "2d10", range: [3, 5, 7] } });
  M("giants", "frost_giant", "Frost Giant", 10, 3, 12, "2d12", { size: "L" });
  M("giants", "fire_giant", "Fire Giant", 11, 1, 12, "3d8", { size: "L", sp: ["fire"] });
  M("giants", "cloud_giant", "Cloud Giant", 12, 1, 12, "3d10", { size: "L", leader: true });
  M("giants", "ogre_chief", "Ogre Chieftain", 6, 5, 9, "2d8", { size: "L", leader: true });
  M("giants", "ogre_magi", "Ogre Magi", 5, 4, 9, "2d6", { size: "L", cast: { lvl: 5, list: "M", spells: ["hold_person", "fireball", "sleep"] } });
  M("giants", "troll_stone", "Stone Troll", 7, 3, 12, ["1d6", "1d6", "2d6"], { size: "L", sp: ["regen:3"], tags: ["troll"] });
  M("giants", "cyclops", "Cyclops", 8, 4, 12, "2d8", { size: "L", rng: { dmg: "2d6", range: [3, 4, 6] } });
  M("giants", "ettin", "Ettin", 10, 3, 12, ["2d8", "2d8"], { size: "L" });
  // ---- demons ----
  M("demons", "quasit", "Quasit", 3, 2, 15, ["1d2", "1d2", "1d4"], { size: "S", fig: "humanoid", sp: ["regen:1"] });
  M("demons", "dretch", "Dretch", 3, 4, 6, ["1d2", "1d2", "1d4"], { size: "S", fig: "humanoid" });
  M("demons", "vrock", "Vrock", 8, 0, 12, ["1d6", "1d6", "2d6"], { size: "L", fig: "bird", req: "magic" });
  M("demons", "hezrou", "Hezrou", 9, -2, 6, ["1d3", "1d3", "2d4"], { size: "L", req: "magic" });
  M("demons", "bebilith", "Bebilith", 10, -2, 15, ["2d4", "2d4", "2d6"], { size: "L", fig: "spider", req: "magic" });
  M("demons", "glabrezu", "Glabrezu", 10, -1, 12, ["2d6", "2d6", "1d4", "1d4"], { size: "L", req: "magic" });
  M("demons", "succubus_hunter", "Shadow Demon", 4, 2, 12, "1d6", { size: "M", req: "magic", sp: ["drain"] });
  M("demons", "nalfeshnee", "Nalfeshnee", 11, -1, 9, ["1d4", "1d4", "2d6"], { size: "L", req: "magic", leader: true });
  M("demons", "marilith", "Marilith", 7, 1, 12, ["1d4", "1d4", "1d4", "1d4", "1d10"], { size: "L", req: "magic" });
  M("demons", "barlgura", "Barlgura", 6, 0, 15, ["1d6", "1d6", "1d10"], { size: "L", req: "magic" });
  // ---- dragon ----
  M("dragon", "kobold_wyrmling", "Kobold Wyrmling", 2, 5, 9, ["1d4", "1d4", "1d6"], { size: "M", fig: "dragon", sp: ["breath:acid"] });
  M("dragon", "baby_green_dragon", "Green Wyrmling", 4, 4, 9, ["1d4", "1d4", "1d6"], { size: "M", fig: "dragon", sp: ["breath:poison"] });
  M("dragon", "baby_red_dragon", "Red Wyrmling", 5, 3, 9, ["1d6", "1d6", "2d4"], { size: "M", fig: "dragon", sp: ["breath:fire"] });
  M("dragon", "young_blue_dragon", "Young Blue Dragon", 9, 2, 12, ["1d6", "1d6", "2d8"], { size: "L", fig: "dragon", sp: ["breath:lightning"] });
  M("dragon", "adult_black_dragon", "Adult Black Dragon", 12, -1, 12, ["1d8", "1d8", "3d8"], { size: "L", fig: "dragon", sp: ["breath:acid"], leader: true });
  M("dragon", "pseudo_dragon", "Pseudodragon", 3, 6, 15, ["1d3", "1d3", "1d4"], { size: "S", fig: "dragon", sp: ["sleep-breath"] });
  M("dragon", "drake", "Drake", 6, 3, 12, ["1d6", "1d6", "2d6"], { size: "L", fig: "dragon" });
  M("dragon", "white_dragon", "Young White Dragon", 8, 3, 12, ["1d6", "1d6", "2d6"], { size: "L", fig: "dragon", sp: ["breath:cold"] });
  M("dragon", "dragon_hatchling", "Dragon Hatchling", 3, 5, 9, ["1d4", "1d4", "1d6"], { size: "M", fig: "dragon", sp: ["breath:fire"] });
  M("dragon", "dragon_cult_drake", "Cult Drake", 5, 4, 12, ["1d6", "1d6"], { size: "M", fig: "dragon" });
  // ---- elemental ----
  M("elemental", "air_elemental", "Air Elemental", 8, 2, 24, "1d10", { size: "L", fig: "orb", req: "magic" });
  M("elemental", "earth_elemental", "Earth Elemental", 8, 2, 6, "4d6", { size: "L", fig: "humanoid", req: "magic" });
  M("elemental", "fire_elemental", "Fire Elemental", 8, 2, 18, "3d6", { size: "L", fig: "orb", req: "magic", sp: ["fire"] });
  M("elemental", "water_elemental", "Water Elemental", 8, 2, 6, "3d6", { size: "L", fig: "blob", req: "magic" });
  M("elemental", "magma_mephit", "Magma Mephit", 3, 2, 12, "1d4", { size: "S", fig: "orb", sp: ["fire"] });
  M("elemental", "dust_mephit", "Dust Mephit", 3, 2, 12, "1d4", { size: "S", fig: "orb", sp: ["blind"] });
  M("elemental", "salamander", "Salamander", 7, 5, 9, ["2d6", "1d6"], { size: "L", fig: "serpent", sp: ["fire"] });
  M("elemental", "xorn", "Xorn", 7, -2, 9, ["1d3", "1d3", "1d3", "4d6"], { size: "M", fig: "humanoid", req: "magic" });
  M("elemental", "steam_mephit", "Steam Mephit", 3, 2, 12, "1d4", { size: "S", fig: "orb", sp: ["steam"] });
  M("elemental", "gargoyle_elem", "Stone Elemental", 6, 4, 9, ["1d8", "1d8"], { size: "M", fig: "humanoid", req: "magic" });
  // ---- underdark ----
  M("underdark", "drow_warrior", "Drow Warrior", 2, 4, 12, "1d6", { size: "M", sp: ["sleep-res"] });
  M("underdark", "drow_priestess", "Drow Priestess", 5, 4, 12, "1d6", { size: "M", cast: { lvl: 5, list: "C", spells: ["cause_serious_wounds", "hold_person_c", "silence_15"] } });
  M("underdark", "duergar", "Duergar", 3, 5, 9, "1d10", { size: "M" });
  M("underdark", "derro", "Derro", 2, 6, 9, "1d6", { size: "M" });
  M("underdark", "mind_flayer", "Mind Flayer", 8, 5, 12, ["1d4", "1d4", "1d4"], { size: "M", leader: true, sp: ["mind-blast"] });
  M("underdark", "quaggoth", "Quaggoth", 4, 5, 12, ["1d6", "1d6", "1d10"], { size: "L" });
  M("underdark", "umber_hulk", "Umber Hulk", 8, 2, 6, ["1d8", "1d8", "2d6"], { size: "L", fig: "insect", sp: ["gaze-confuse"] });
  M("underdark", "svirfneblin", "Svirfneblin", 2, 5, 9, "1d6", { size: "S" });
  M("underdark", "ettercap", "Ettercap", 4, 5, 15, ["1d4", "1d4", "1d8"], { size: "M", fig: "spider", sp: ["poison"] });
  M("underdark", "darkmantle", "Darkmantle", 2, 3, 3, "1d6", { size: "S", fig: "blob" });
  M("underdark", "grimlock", "Grimlock", 2, 5, 12, "1d6", { size: "M" });
  M("underdark", "troglodyte", "Troglodyte", 2, 5, 12, ["1d4", "1d4", "1d8"], { size: "M" });
  // ---- devils ----
  M("devils", "imp", "Imp", 3, 2, 12, "1d4", { size: "S", fig: "bird", sp: ["poison"] });
  M("devils", "lemure", "Lemure", 3, 7, 3, "1d6", { size: "M", fig: "blob" });
  M("devils", "bearded_devil", "Bearded Devil", 5, 5, 12, ["1d3", "1d3", "2d4"], { size: "M", req: "silver" });
  M("devils", "barbed_devil", "Barbed Devil", 8, 0, 12, ["1d3", "1d3", "2d4"], { size: "L", req: "silver" });
  M("devils", "bone_devil", "Bone Devil", 9, -1, 15, ["1d4", "1d4", "2d4", "1d8"], { size: "L", req: "magic" });
  M("devils", "erinyes", "Erinyes", 6, 2, 12, "2d4", { size: "M", fig: "bird", req: "magic" });
  M("devils", "ice_devil", "Ice Devil", 11, -2, 12, ["1d4", "1d4", "2d6"], { size: "L", req: "magic" });
  M("devils", "pit_fiend", "Pit Fiend", 13, -3, 15, ["1d6", "1d6", "4d4", "2d6"], { size: "L", req: "magic", leader: true });
  M("devils", "chain_devil", "Chain Devil", 8, 2, 12, ["2d4", "2d4"], { size: "M", req: "magic" });
  M("devils", "hellcat", "Hellcat", 6, 2, 15, ["1d4", "1d4", "1d8"], { size: "M", fig: "beast", req: "silver" });

  // ---- further entries (completing the wider catalogue) ----
  M("menagerie", "mimic", "Mimic", 7, 7, 3, "3d4", { size: "M", fig: "blob", sp: ["stick"] });
  M("menagerie", "sphinx_andro", "Androsphinx", 12, -1, 15, ["2d4", "2d4", "2d6"], { size: "L", fig: "beast", req: "magic", cast: { lvl: 6, list: "C", spells: ["cause_serious_wounds", "silence_15"] } });
  M("menagerie", "gorgon", "Gorgon", 8, 2, 12, "2d6", { size: "L", fig: "beast", sp: ["petrify-breath"] });
  M("fungus", "ochre_jelly", "Ochre Jelly", 6, 8, 3, "3d4", { size: "M", fig: "blob", ml: 20, sp: ["acid"] });
  M("swamp", "hydra_five", "Five-headed Hydra", 8, 5, 9, ["1d10", "1d10", "1d10", "1d10", "1d10"], { size: "L", fig: "serpent" });
  M("swamp", "sea_hag", "Sea Hag", 3, 7, 12, "1d6", { size: "M", fig: "humanoid", sp: ["fear-gaze"] });
  M("frozen", "remorhaz", "Remorhaz", 11, 3, 9, ["3d6", "2d6"], { size: "L", fig: "serpent", sp: ["heat"] });
  M("underdark", "roper", "Roper", 10, 0, 3, "5d4", { size: "L", fig: "blob", sp: ["strand"] });
  M("underdark", "hook_horror", "Hook Horror", 5, 2, 9, ["2d4", "2d4"], { size: "M", fig: "beast" });
  M("demons", "nightmare_demon", "Night Stalker", 5, 1, 18, ["1d8", "1d8"], { size: "L", fig: "beast", req: "magic", sp: ["fear"] });

  // ---- generated leaders ----------------------------------------------
  // Names by theme: a given name, an epithet, and the theme's base creature.
  const NAMES = {
    vermin: ["Othys", "Skethra", "Mulgrim", "Chitra", "Varn", "Kessik"], goblinoid: ["Gruk", "Ulmar", "Fesh", "Brakka", "Dorn", "Snagg"],
    undead: ["Ysmet", "Corvane", "Hallow", "Serivel", "Morrow", "Thane"], beasts: ["Grimsnout", "Marrow", "Hollin", "Greyfur", "Brae", "Tusker"],
    bandits: ["Ragnar", "Vell", "Cass", "Dunstan", "Pell", "Oriel"], swamp: ["Murk", "Sallow", "Gorrow", "Reed", "Fenwick", "Calla"],
    lycanthrope: ["Lunara", "Brannick", "Hesk", "Mordrin", "Tamsin", "Wolfe"], menagerie: ["Hork", "Sphinxa", "Gryphen", "Taloch", "Rimm", "Wyrna"],
    wizard: ["Ornax", "Velmira", "Quill", "Azrath", "Sable", "Thaddeus"], frozen: ["Hrimfa", "Skold", "Vesna", "Ulfgar", "Rimeth", "Brrak"],
    giants: ["Grull", "Haldor", "Bruna", "Ettrin", "Ogmar", "Thrusk"], demons: ["Zarakh", "Mhorrig", "Lysso", "Gorvex", "Ammaru", "Sekreth"],
    dragon: ["Vaskarath", "Ishvar", "Cindra", "Tharros", "Ardent", "Moltis"], elemental: ["Kindle", "Ashen", "Torrent", "Gale", "Stonewake", "Cinder"],
    underdark: ["Sorvi", "Yllith", "Malvar", "Drezzt", "Quorra", "Nekhtar"], devils: ["Malphas", "Iblis", "Vorrath", "Azmodel", "Lachryx", "Shalam"],
  };
  const EPITHETS = ["the Many-Legged", "of the Deep Stair", "Bonebreaker", "the Pale", "Ironjaw", "of the Hollow", "the Unbroken", "Ashen-Eyed", "the Patient", "of Thorns", "the Tallow King", "Redhand", "the Silent", "Grey-Mantled", "the Broken Crown", "Stormcaller", "of the Long Night", "the Sundered", "Coldheart", "the Hungry"];
  const THEME_BASE = {
    vermin: "giant_scorpion", fungus: "fungal_brute", goblinoid: "orc_chieftain", undead: "wight_lord", beasts: "dire_boar", bandits: "brigand_sergeant",
    swamp: "hydra_two", lycanthrope: "werebear", menagerie: "chimera", wizard: "warlock_archmage", frozen: "glacier_drake",
    giants: "cloud_giant", demons: "nalfeshnee", dragon: "adult_black_dragon", elemental: "fire_elemental", underdark: "mind_flayer", devils: "pit_fiend",
  };
  // A leader cloned from its theme's base: more hit points, morale 16, double XP, custom lore.
  Mo.leader = (theme, idx, rng = Math.random) => {
    const baseId = THEME_BASE[theme] || "orc_chieftain";
    const base = Data.MONSTERS[baseId];
    const names = NAMES[theme] || NAMES.goblinoid;
    const id = "leader_" + theme + "_" + idx;
    const name = names[Math.floor(rng() * names.length)] + " " + EPITHETS[Math.floor(rng() * EPITHETS.length)];
    const hp = base.hp;
    const m = Object.assign({}, base, {
      id, name, leader: true, ml: Math.max(16, base.ml), xp: base.xp * 2,
      lore: "A " + theme + " leader that the company will remember. " + (base.lore || ""),
    });
    // Maximised hit points: the dice's largest total.
    const p = Rules.parse(hp);
    m.hp = (p.n * p.s + p.k) + "";
    Data.MONSTERS[id] = m;
    return m;
  };
  Mo.leaderIdsFor = (theme) => Object.keys(Data.MONSTERS).filter((k) => k.startsWith("leader_" + theme + "_"));
  Mo.themes = () => Object.keys(TH);
  Mo.count = () => Object.keys(Data.MONSTERS).length;

  return Mo;
})();
