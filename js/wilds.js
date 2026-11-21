"use strict";
/*
 * Authored wilderness regions: Thornwick Vale (thorn_wild), Harrow Hills
 * (cold_wild) and the Northern Moors (rav_wild). Each region is an overland
 * map with its sites, wandering tables, travellers and rumours.
 *
 * Symbols: ^ mountain, ~ river (impassable), + bridge, = road, T forest,
 * n hills, % fen, . grass. Capital letters are sites; they never use a terrain symbol.
 */
const Wilds = (() => {
  const W = {};

  // Joins three ten-column groups per row, so every row is exactly 30 columns wide.
  W.rows = (groups) => groups.map((g) => g.join(""));

  // Thornwick Vale: 30 x 20. Thornwick (V) sits on the south road; the gate arrives just south of it.
  Data.MAPS["thorn_wild"] = {
    id: "thorn_wild", name: "Thornwick Vale", overland: true, region: "thorn",
    grid: W.rows([
      ["^^^^^^^^^^", "^^^^^^^^^^", "^^^^^^^^^^"],
      ["^^^^^TTT..", "nnn^^^^^^^", "~^^^^^^^^^"],
      ["^^^^nnTTTW", "...^^^^^^^", "~^^^^^^^^^"],
      ["^^nnTTTT..", "......nn..", ".~^^^^^^^^"],
      ["^nnTTT....", "......nn..", ".~^^^^^^^^"],
      ["^..nnK..TT", "TT.....n..", ".~^^^^^^^^"],
      ["^.nnn..TT.", "...nn.....", "..~^^^^^^^"],
      ["^.....TT..", "....n.....", "..~^^^^^^^"],
      ["^.n....TT.", "..nn......", "..~^^^^^^^"],
      ["^..n...TTT", "..........", "...~^^^^^^"],
      ["^.....n...", "T.........", "...~^^^^^^"],
      ["^......nn.", "...O....S.", "...~^^^^^^"],
      ["^.......n.", "..........", "....~^^^^^"],
      ["^..%%.....", "..TT......", "....~^^^^^"],
      ["^.%%%.....", ".TTTT.....", "....~^^^^^"],
      ["^.%%......", "....V=====", "====+==R=="],
      ["^.B%......", "..........", ".....~^^^^"],
      ["^.........", "..........", ".....~^^^^"],
      ["^^^^^^^^^^", "^^^^^^^^^^", "^^^^^~^^^^"],
      ["^^^^^^^^^^", "^^^^^^^^^^", "^^^^^~^^^^"],
    ]),
    sites: {
      V: { name: "Thornwick", icon: "village", kind: "home", enter: { map: "thornwick", x: 9, y: 13, dir: 0 }, text: "Your home base. The gate opens on the brewery road." },
      K: { name: "Kobold Lookout", icon: "watch", kind: "fight", once: true, enc: { mons: [["kobold", 3], ["kobold_slinger", 2]], text: "Kobolds watch the road from a ruined palisade. Their horn sounds at the first step.", arena: "hills", gold: "2d6", items: ["potion_cure_light"] }, cache: { gold: "3d6" }, text: "A ruined palisade on the hill." },
      W: { name: "Wolf Den", icon: "den", kind: "fight", once: true, enc: { mons: [["wolf", 3], ["dire_wolf", 1]], text: "A snarling pack bursts from the bracken around their den.", arena: "forest", gold: "0" }, text: "Bones and bracken around a hollow root." },
      O: { name: "Ott's Farm", icon: "farm", kind: "hamlet", text: "Ott's farm has beds in the hayloft for a shilling and a story." },
      S: { name: "Wayfarer's Stone", icon: "stone", kind: "holy", bless: { xp: 50 }, text: "A standing stone with the dawn sun carved on its face. Travellers leave a coin." },
      B: { name: "Mother Brina's Croft", icon: "croft", kind: "heal", text: "A healer's croft with hanging herbs. Mother Brina asks only for a story." },
      R: { name: "River Road", icon: "bridge", kind: "road", text: "The old road follows the river east to the bridge." },
    },
    enc: [
      { terrain: [".", ","], time: "day", w: 4, mons: [["brigand", "1d4"]], text: "A brigand patrol steps out of the grass.", who: "bandit" },
      { terrain: ["T"], time: "any", w: 4, mons: [["wolf", "1d3+1"]], text: "Wolves circle through the trees, testing the line." },
      { terrain: ["n"], time: "any", w: 3, mons: [["kobold", "2d3"], ["kobold_slinger", "1d2"]], text: "Kobolds slip down from the hill to see what you carry." },
      { terrain: [".", ","], time: "night", w: 3, mons: [["giant_rat", "2d6"]], text: "Rats rustle through the grass in the dark." },
    ],
    encRate: 1,
    colors: { water: "#23436b", road: "#9b8a62", mountain: "#4a4f58" },
    rumors: [
      "The ferry at the river has been swamped twice this month. Take the bridge.",
      "Brina says the wolves are hungry because the farm dogs have been sleeping in the barn.",
      "There is an old stone with a dawn sun on it in the south; travellers leave coins there for luck.",
    ],
    travellers: [
      { text: "A pedlar with a cart of thread and tinned peaches offers to trade.", goods: ["ration", "bandage", "potion_cure_light"] },
      { text: "A pilgrim on the road asks for a blessing and passes on what she heard in the hall.", rumor: true },
    ],
  };

  return W;
})();
