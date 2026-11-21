"use strict";
/*
 * Bestiary: starts empty. Sighting a creature records its first day and shows
 * its portrait and lore; the stat block only unlocks after a fight. Tracks,
 * per creature id, { seen, fought, slain } in the persistent state.
 */
const Bestiary = (() => {
  const B = {};

  const entry = (id) => {
    const G = Game.G;
    if (!G.bestiary[id]) G.bestiary[id] = { seen: null, fought: 0, slain: 0 };
    return G.bestiary[id];
  };
  // A first sight, even if the company chooses not to fight.
  B.sight = (id) => {
    if (!Game.G || !Data.monster(id)) return false;
    const e = entry(id);
    if (e.seen === null) {
      e.seen = Game.G.time;
      UI.toast("New in the bestiary: " + Data.monster(id).name + ".");
      return true;
    }
    return false;
  };
  // One fight with this kind, counted once per encounter.
  B.fought = (id) => {
    if (!Game.G || !Data.monster(id)) return;
    const e = entry(id);
    if (e.seen === null) e.seen = Game.G.time;
    e.fought += 1;
  };
  // Individual kills.
  B.slain = (id, n = 1) => {
    if (!Game.G || !Data.monster(id)) return;
    entry(id).slain += n;
  };
  B.known = () => (Game.G ? Object.keys(Game.G.bestiary).filter((k) => Game.G.bestiary[k].seen !== null).length : 0);
  B.total = () => Object.keys(Data.MONSTERS).length;

  // A readable summary for the entry: what is known, given the record.
  B.describe = (id) => {
    const m = Data.monster(id);
    const e = Game.G.bestiary[id];
    if (!m || !e || e.seen === null) return null;
    const day = Game.clock(e.seen).day;
    const lines = [];
    lines.push("First seen on day " + day + ".");
    if (m.lore) lines.push(m.lore);
    if (e.fought > 0) {
      lines.push("Hit dice " + m.hd + " (" + m.hp + " hit points), armour class " + m.ac + ", THAC0 " + m.thac0 + ", movement " + m.mv + ".");
      lines.push("Attacks: " + m.atk.join(", ") + (m.rng ? "; ranged " + m.rng.dmg : "") + ". Morale " + m.ml + ", experience " + m.xp + ".");
      if (m.sp.length) lines.push("Abilities: " + m.sp.join(", ") + ".");
      if (m.req) lines.push("Only " + (m.req === "silver" ? "silver" : "enchanted") + " weapons harm it.");
      lines.push("Fought " + e.fought + " time" + (e.fought === 1 ? "" : "s") + "; slain " + e.slain + ".");
    } else {
      lines.push("Fight one to learn its stats.");
    }
    return { m, lines, fought: e.fought > 0 };
  };

  // The bestiary modal, listing all known entries with the known/total count.
  B.open = () => {
    const wrap = UI.el("div", { class: "bestiary" });
    const seen = Object.keys(Game.G.bestiary).filter((k) => Game.G.bestiary[k].seen !== null && Data.monster(k));
    wrap.appendChild(UI.el("p", { class: "muted", text: "Known " + seen.length + " of " + B.total() + "." }));
    if (!seen.length) {
      wrap.appendChild(UI.el("p", { text: "The bestiary is empty. Meet a creature and it will be written here." }));
    }
    for (const id of seen.sort((a, b) => Game.G.bestiary[a].seen - Game.G.bestiary[b].seen)) {
      const d = B.describe(id);
      const card = UI.el("div", { class: "card" });
      const cv = UI.el("canvas", { width: 96, height: 96, class: "portrait-sm" });
      Figs.draw ? Figs.draw(cv.getContext("2d"), Figs.descMon(d.m, null), 48, 92, 80, {}) : null;
      card.appendChild(cv);
      const body = UI.el("div", { class: "card-body" });
      body.appendChild(UI.el("h3", { text: d.m.name }));
      for (const l of d.lines) body.appendChild(UI.el("p", { text: l }));
      card.appendChild(body);
      wrap.appendChild(card);
    }
    return UI.modal({ title: "Bestiary", body: wrap, actions: [{ id: "ok", label: "Close", primary: true }], wide: true });
  };

  return B;
})();
