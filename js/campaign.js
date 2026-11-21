"use strict";
/*
 * Campaign and town services: the inn, the temple, training, the tavern and
 * the shops; levelling; starting kits for new heroes; and carrying a company
 * from one adventure to the next. Dialogs come from UI; rules from Rules.
 */
const Campaign = (() => {
  const C = {};
  const DAY = 1440;

  // ---------------------------------------------------------- services ----
  C.serviceFor = (map, digit) => {
    const s = map.svc && map.svc[digit];
    if (!s) return;
    switch (s.svc) {
      case "inn": return C.inn(map);
      case "temple": return C.temple(map);
      case "hall": return Journal.hall();
      case "training": return C.training(map);
      case "tavern": return C.tavern(map);
      case "general": return C.shop("general", s.name);
      case "armory": return C.shop("armory", s.name);
      case "apothecary": return C.shop("apothecary", s.name);
      default: return Game.log("The door is shut.", "");
    }
  };
  // Shorthand used by the menu and the wilds.
  C.serviceByName = (name) => {
    const map = Data.MAPS[Game.G.map];
    const d = Object.keys(map.svc || {}).find((k) => map.svc[k].svc === name);
    if (d) C.serviceFor(map, d);
  };

  // Service names for the current module (for menus and help).
  C.names = (modId) => Modules.MODULES[modId] ? Modules.MODULES[modId].names : {};

  // The next morning at 07:00.
  C.nextMorning = (t) => (Math.floor(t / DAY) + 1) * DAY + 7 * 60;

  // -------------------------------------------------------------- inn ----
  C.innRestOnce = (map) => {
    const members = Game.alive();
    const cost = members.length;
    if (Game.G.gold < cost) return false;
    Game.G.gold -= cost;
    Game.G.time = C.nextMorning(Game.G.time);
    Game.G.march = 0;
    for (const c of members) {
      c.hp = Math.min(c.maxhp, c.hp + 3);
      c.poison = null;
      c.fx = { armor: null, str: null, buffs: [] };
      c.layUsed = false;
      // Spend any spare cures on the wounded before re-memorising.
      c.mem = Object.assign({}, c.prep);
    }
    Game.G.rumors = Game.G.rumors || {};
    return true;
  };
  C.inn = async (map) => {
    const members = Game.alive();
    const awake = Game.conscious();
    const nights = [];
    const choice = await UI.modal({
      title: map.svc ? "The inn" : "Inn",
      body: "A bed costs one gold for each member of the company. The party has " + Game.G.gold + " gp and " + members.length + " members.",
      actions: [
        { id: "rest", label: "Rest the night (" + members.length + " gp)", primary: true, disabled: Game.G.gold < members.length },
        { id: "until", label: "Rest until healed", disabled: Game.G.gold < members.length },
        { id: "round", label: "Buy a round (2 gp) for a rumour" },
        { id: "save", label: "Save the game" },
        { id: "leave", label: "Leave" },
      ],
      closable: awake.length > 0,
    });
    if (choice === "rest" || choice === "until") {
      let count = 0;
      const limit = choice === "until" ? 60 : 1;
      while (count < limit) {
        const hurt = Game.alive().some((c) => c.hp < c.maxhp || c.poison);
        if (count > 0 && !hurt) break;
        if (!C.innRestOnce(map)) { Game.log("The company cannot afford another night.", "warn"); break; }
        count++;
        nights.push(count);
      }
      Game.log("The company sleeps " + count + " night" + (count === 1 ? "" : "s") + " at the inn and wakes at 07:00 restored.", "good");
      Game.autosave("rest");
      Game.redraw();
      UI.refreshParty();
      UI.refreshHUD();
      return C.inn(map);
    }
    if (choice === "round") {
      if (Game.G.gold < 2) return Game.log("You cannot afford a round.", "warn");
      Game.G.gold -= 2;
      const rumor = Rules.pick(Game.G.module ? (Modules.MODULES[Game.G.module].rumors.concat(Data.RUMORS)) : Data.RUMORS);
      Game.note("Tavern rumour: " + rumor, Game.G.module);
      Game.log("A rumour, over the cup: “" + rumor + "”", "good");
      UI.refreshHUD();
      return;
    }
    if (choice === "save") return UI.openSlots("save");
  };

  // ------------------------------------------------------------ temple ----
  // Prices from the saga's temple: cures, poison, raising.
  const PRICE = { cure_light: 20, cure_serious: 60, neutralize: 80, raise: 400 };
  C.raiseChance = (c) => Math.min(95, 50 + c.con * 3);
  C.temple = async (map) => {
    const dead = Game.party().filter((c) => c.dead && !c.lost);
    const lost = Game.party().filter((c) => c.lost);
    const hurt = Game.alive().filter((c) => c.hp < c.maxhp);
    const poisoned = Game.alive().filter((c) => c.poison);
    const body = UI.el("div", { class: "temple" });
    const gold = Game.G.gold;
    const rows = [];
    if (hurt.length) rows.push({ id: "cure_light", label: "Cure Light Wounds (" + PRICE.cure_light + " gp)", fn: () => C.templeHeal(hurt, PRICE.cure_light, "light") });
    if (hurt.length) rows.push({ id: "cure_serious", label: "Cure Serious Wounds (" + PRICE.cure_serious + " gp)", fn: () => C.templeHeal(hurt, PRICE.cure_serious, "serious") });
    if (poisoned.length) rows.push({ id: "neutralize", label: "Neutralize Poison (" + PRICE.neutralize + " gp)", fn: () => C.templePoison(poisoned) });
    if (dead.length) rows.push({ id: "raise", label: "Raise Dead (" + PRICE.raise + " gp)", fn: () => C.templeRaise(dead) });
    if (lost.length) rows.push({ id: "resurrect", label: "Resurrection (" + (PRICE.raise * 3) + " gp)", fn: () => C.templeRaise(lost, true) });
    body.appendChild(UI.el("p", { text: "The priests of the dawn offer their services. The party has " + gold + " gp." }));
    if (!rows.length) body.appendChild(UI.el("p", { class: "muted", text: "No one in the company needs the temple right now." }));
    const actions = rows.map((r) => ({ id: r.id, label: r.label, disabled: gold < (r.id === "cure_light" ? PRICE.cure_light : r.id === "cure_serious" ? PRICE.cure_serious : r.id === "neutralize" ? PRICE.neutralize : PRICE.raise * (r.id === "resurrect" ? 3 : 1)) }));
    actions.push({ id: "leave", label: "Leave the temple", primary: !rows.length });
    const choice = await UI.modal({ title: map.svc ? "Temple" : "Temple", body, actions, closable: true });
    const row = rows.find((r) => r.id === choice);
    if (row) {
      row.fn();
      return C.temple(map);
    }
  };
  C.templeHeal = (list, price, kind) => {
    const who = list[0];
    if (Game.G.gold < price) return;
    Game.G.gold -= price;
    const expr = kind === "light" ? "1d8" : "2d8+1";
    for (const c of list) c.hp = Math.min(c.maxhp, c.hp + Rules.dice(expr));
    Game.log((list.length === 1 ? who.name : "The company") + " is treated at the temple.", "good");
    UI.refreshParty();
    UI.refreshHUD();
  };
  C.templePoison = (list) => {
    if (Game.G.gold < PRICE.neutralize) return;
    Game.G.gold -= PRICE.neutralize;
    for (const c of list) c.poison = null;
    Game.log("The venom is drawn out at the temple.", "good");
    UI.refreshHUD();
  };
  C.templeRaise = (list, full) => {
    const price = full ? PRICE.raise * 3 : PRICE.raise;
    if (Game.G.gold < price) return;
    const c = list[0];
    Game.G.gold -= price;
    if (full) {
      c.dead = false;
      c.lost = false;
      c.hp = c.maxhp;
      Game.log("The resurrection rite restores " + c.name + " at full strength.", "good");
    } else if (Rules.die(100) <= C.raiseChance(c)) {
      c.dead = false;
      c.hp = 1;
      c.con = Math.max(3, c.con - 1);
      Game.log(c.name + " is returned to life at 1 hit point, a little frailer for it.", "good");
    } else {
      c.lost = true;
      Game.log("The rite fails. " + c.name + "'s spirit is beyond ordinary recall.", "bad");
    }
    UI.refreshParty();
    UI.refreshHUD();
  };

  // ---------------------------------------------------------- training ----
  C.trainCost = (c) => Rules.trainCost(c.lvl);
  C.training = async (map) => {
    const ready = Game.G.roster.filter((c) => Rules.readyToTrain(c));
    const gold = Game.G.gold;
    const body = UI.el("div", { class: "training" });
    if (!ready.length) body.appendChild(UI.el("p", { text: "No one has the experience to advance. Keep adventuring." }));
    const actions = [];
    for (const c of ready) {
      const cost = C.trainCost(c);
      actions.push({ id: "t_" + c.id, label: "Train " + c.name + " to level " + (c.lvl + 1) + " (" + cost + " gp)", disabled: gold < cost || c.dead });
      body.appendChild(UI.el("p", { class: "muted", text: c.name + " is ready for level " + (c.lvl + 1) + "." }));
    }
    actions.push({ id: "leave", label: "Leave", primary: true });
    const choice = await UI.modal({ title: "Training", body, actions });
    if (!choice || choice === "leave") return;
    const c = Game.charById(choice.slice(2));
    if (!c) return;
    const cost = C.trainCost(c);
    if (Game.G.gold < cost) return;
    Game.G.gold -= cost;
    C.levelUp(c, false);
    Game.note(c.name + " trained to level " + c.lvl + ".", Game.G.module);
    Game.autosave("train");
    return C.training(map);
  };

  // Advances one level. Mages choose one unknown spell of an accessible level.
  C.levelUp = async (c, silent) => {
    const next = c.lvl + 1;
    const gain = Rules.levelUpHP(c, next);
    c.lvl = next;
    c.maxhp += gain;
    c.hp += gain;
    if (c.cls === "M") {
      const slots = Rules.slotsFor(c);
      const accessible = Object.keys(slots).map(Number);
      const options = [];
      for (const lvl of accessible) for (const id of Data.spellList("M", lvl)) if (!c.book.includes(id)) options.push(id);
      if (options.length) {
        let pick = Rules.pick(options);
        if (!silent && UI.pickSpell) pick = await UI.pickSpell(options, c) || pick;
        c.book.push(pick);
        if (!silent) Game.log(c.name + " learns " + Data.SPELLS[pick].name + ".", "good");
      }
    }
    Rules.autoPrep(c);
    if (!silent) Game.log(c.name + " reaches level " + c.lvl + ".", "good");
    UI.refreshParty();
    return c;
  };

  // ---------------------------------------------------------- tavern ----
  C.tavern = (map) => C.inn(map);

  // ------------------------------------------------------------- shops ----
  C.shop = (kind, title) => UI.openShop(kind, title);
  // Selling price: gear for half (floored); gems and jewellery for full worth.
  C.sellPrice = (instId) => {
    const d = Data.item(instId);
    if (!d || !d.sell) return 0;
    if (d.type === "v") return d.cost;
    return Math.floor(d.cost / 2);
  };
  C.buyPrice = (instId) => Data.item(instId).cost;

  // ------------------------------------------------------- starting kits ----
  // Heroes made for a later start carry a little more gold and a supply kit.
  C.kitFor = (c, startLvl) => {
    const bonus = startLvl >= 13 ? 12000 : startLvl >= 9 ? 2000 : startLvl >= 5 ? 500 : startLvl >= 3 ? 150 : 0;
    if (bonus) Game.G.gold += bonus;
    if (startLvl >= 3) c.inv.push("potion_healing");
    c.inv.push("ration", "bandage");
    return bonus;
  };

  // ------------------------------------------------------------ travel ----
  C.canTravel = () => {
    const map = Game.X && Game.X.map;
    return !!(map && map.safe && !map.overland && Game.mode === "local");
  };
  C.travelTo = (modId) => {
    const mod = Modules.MODULES[modId];
    if (!mod) return;
    const G = Game.G;
    const from = Modules.MODULES[G.module];
    G.module = modId;
    // Fourteen days on the road, arriving at 08:00.
    G.time = (Math.floor(G.time / DAY) + 14) * DAY + 480;
    G.march = 0;
    for (const c of G.roster) {
      if (c.dead) continue;
      c.hp = c.maxhp;
      c.poison = null;
      c.fx = { armor: null, str: null, buffs: [] };
      c.layUsed = false;
      c.mem = Object.assign({}, c.prep);
    }
    // Trains anyone below the new starting level up to it. Nobody is de-levelled.
    for (const c of G.roster) {
      while (!c.dead && c.lvl < mod.lvl) C.levelUp(c, true);
    }
    Game.note("Set out from " + (from ? from.name : "the road") + " for " + mod.name + ".", modId);
    Game.enter(mod.hub, Data.MAPS[mod.hub].start.x, Data.MAPS[mod.hub].start.y, Data.MAPS[mod.hub].start.dir, { reason: "travel" });
    UI.refreshParty();
    UI.refreshHUD();
    Game.log(mod.intro, "good");
    Game.log("Hint: " + mod.hint, "");
    Game.autosave("travel");
  };
  // The in-town campaign menu: finished, unfinished and the average level, with warnings.
  C.menu = () => {
    const G = Game.G;
    const body = UI.el("div", { class: "campaign-menu" });
    const alive = Game.alive();
    const avg = alive.length ? Math.round(alive.reduce((s, c) => s + c.lvl, 0) / alive.length) : 1;
    body.appendChild(UI.el("p", { text: "Average living level: " + avg + "." }));
    const actions = [];
    for (const m of Object.values(Modules.MODULES)) {
      const finished = G.done.includes(m.id);
      const tag = m.id === G.module ? "current" : finished ? "finished" : "unfinished";
      const warn = avg < m.levels[0] ? " (under-levelled for " + m.levels[0] + "+)" : avg > m.levels[1] + 2 ? " (easier than your level)" : "";
      body.appendChild(UI.el("p", { text: m.code + " " + m.name + " — " + tag + "." + warn }));
      if (m.id !== G.module) actions.push({ id: "go_" + m.id, label: "Travel to " + m.name + " (14 days)" });
    }
    actions.push({ id: "close", label: "Stay", primary: true });
    return UI.modal({ title: "Campaign", body, actions }).then(async (choice) => {
      if (!choice || choice === "close") return;
      const id = choice.slice(3);
      const cur = Modules.MODULES[G.module];
      if (!G.done.includes(G.module) && cur) {
        const ok = await UI.confirm("Leave " + cur.name + " unfinished? Its commissions and progress are kept.", "Leave", "Stay");
        if (!ok) return;
      }
      C.travelTo(id);
    });
  };

  // Starts a company for a module, from pregens or a saved company.
  C.startCompany = (modId, roster, party, pendingGold) => Game.beginModule(modId, roster, party, pendingGold || 0);

  // Importing a company from a saved slot: roster, gear, gold, time and world carry over.
  C.importFromSlot = (slot, modId) => {
    const src = Game.readSlot(slot);
    if (!src) return null;
    const G = Game.restoreState(src);
    const mod = Modules.MODULES[modId];
    const roster = G.roster.map((c) => JSON.parse(JSON.stringify(c)));
    for (const c of roster) {
      if (!c.dead) { c.hp = c.maxhp; c.poison = null; }
    }
    return { roster, gold: G.gold, done: G.done.slice(), flags: G.flags, quests: G.quests, mods: G.mods, seen: G.seen, time: G.time, mod: mod.id };
  };

  return C;
})();
