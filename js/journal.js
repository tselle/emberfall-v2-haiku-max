"use strict";
/*
 * Commissions and notes. A commission's state is derived, not stored:
 * accomplishment lives in flags ('q:' + id), acceptance and payment in
 * G.quests. The hall offers the next main commission in order and any side
 * work; reporting pays once, and the final main commission completes the module.
 */
const Journal = (() => {
  const J = {};

  J.state = (qid) => {
    const G = Game.G;
    const rec = G.quests[qid];
    if (rec && rec.paid) return "done";
    if (!rec || !rec.accepted) return "unoffered";
    if (Game.flag("q:" + qid)) return "ready";
    return "active";
  };
  J.isMain = (qid) => {
    const q = Data.QUESTS[qid];
    if (!q) return false;
    const mod = Modules.MODULES[q.module];
    return !!mod && mod.quests.includes(qid);
  };
  // Per-member XP: a quarter of the listed value, rounded to fives, before caps.
  J.memberXP = (qid) => {
    const q = Data.QUESTS[qid];
    return Math.max(5, 5 * Math.round((q.xp * 0.25) / 5));
  };
  // Holds the required item if an active member carries it.
  J.carrierOf = (item) => Game.party().find((c) => c.inv.includes(item)) || null;
  J.canPay = (qid) => {
    const q = Data.QUESTS[qid];
    if (!q.needItem) return true;
    return !!J.carrierOf(q.needItem);
  };
  J.accept = (qid) => {
    const q = Data.QUESTS[qid];
    Game.G.quests[qid] = { accepted: true, paid: false, at: Game.G.time };
    Game.note("Accepted: " + q.name + ". " + q.goal, q.module);
    if (Game.flag("q:" + qid)) Game.log(q.name + " is already complete. Report it at the hall.", "good");
  };
  // Next main commission in sequence for a module, or null if the chain is done or waiting.
  J.nextMain = (modId) => {
    const mod = Modules.MODULES[modId];
    for (const qid of mod.quests) {
      const rec = Game.G.quests[qid];
      if (!rec || !rec.accepted) return qid;
      if (!rec.paid) return null;
    }
    return null;
  };
  J.mainComplete = (modId) => Modules.MODULES[modId].quests.every((qid) => Game.G.quests[qid] && Game.G.quests[qid].paid);

  // Pays a ready commission. Gold goes to the pool, XP to each living member.
  J.pay = (qid) => {
    const q = Data.QUESTS[qid];
    const G = Game.G;
    if (!J.canPay(qid)) return false;
    if (q.needItem) {
      const holder = J.carrierOf(q.needItem);
      if (holder) {
        const i = holder.inv.indexOf(q.needItem);
        if (i >= 0) holder.inv.splice(i, 1);
      }
    }
    G.quests[qid].paid = true;
    G.quests[qid].paidAt = G.time;
    if (q.gold) Game.gainGold(q.gold, "commission");
    const each = J.memberXP(qid);
    for (const c of Game.alive()) {
      const gained = Rules.awardXP(c, each);
      if (gained > 0) Game.log(c.name + " gains " + gained + " experience.", "good");
    }
    Game.note("Reported " + q.name + " to " + q.lead + ".", q.module);
    UI.refreshParty();
    return true;
  };

  // Completing the final main commission: the module is won and recorded once.
  J.finishModule = async (modId) => {
    const G = Game.G;
    G.won = true;
    if (!G.done.includes(modId)) G.done.push(modId);
    const mod = Modules.MODULES[modId];
    Game.note("Completed " + mod.name + ".", modId);
    Game.autosave("complete");
    const next = mod.next ? Modules.MODULES[mod.next] : null;
    const actions = [];
    if (next) actions.push({ id: "out", label: "Set out for " + next.name, primary: true });
    actions.push({ id: "stay", label: next ? "Stay in " + Data.MAPS[mod.hub].name : "Return to the title", primary: !next });
    const choice = await UI.modal({ title: mod.name + " is complete", body: mod.victory, actions, closable: false });
    if (choice === "out" && next) return Campaign.travelTo(next.id);
    if (!next) UI.showScreen("title");
  };

  // The hall: pay what is ready, offer what is next. Returns when the player leaves.
  J.hall = async () => {
    const modId = Game.G.module;
    const mod = Modules.MODULES[modId];
    const wrap = UI.el("div", { class: "hall" });
    const payable = [...mod.quests, ...mod.side].filter((q) => J.state(q) === "ready");
    if (payable.length) {
      wrap.appendChild(UI.el("h3", { text: "Ready to report" }));
      for (const qid of payable) {
        const q = Data.QUESTS[qid];
        const row = UI.el("div", { class: "row" });
        const ok = J.canPay(qid);
        row.appendChild(UI.el("p", { text: q.done + " Reward: " + q.gold + " gp, " + J.memberXP(qid) + " XP each." + (ok ? "" : " You must carry " + Data.itemName(q.needItem) + ".") }));
        const btn = UI.el("button", { class: "btn primary", text: "Report " + q.name, disabled: !ok });
        btn.addEventListener("click", async () => {
          if (!J.pay(qid)) return;
          UI.closeTop();
          if (J.mainComplete(modId)) return J.finishModule(modId);
          return J.hall();
        });
        row.appendChild(btn);
        wrap.appendChild(row);
      }
    }
    const offers = [];
    const nextMain = J.nextMain(modId);
    if (nextMain) offers.push(nextMain);
    for (const qid of mod.side) if (!Game.G.quests[qid] || !Game.G.quests[qid].accepted) offers.push(qid);
    if (offers.length) {
      wrap.appendChild(UI.el("h3", { text: "Commissions on offer" }));
      for (const qid of offers) {
        const q = Data.QUESTS[qid];
        const row = UI.el("div", { class: "row" });
        row.appendChild(UI.el("p", { text: "“" + q.offer + "” " + (J.isMain(qid) ? "(main)" : "(side)") }));
        const btn = UI.el("button", { class: "btn", text: "Accept: " + q.name });
        btn.addEventListener("click", () => {
          J.accept(qid);
          UI.closeTop();
          return J.hall();
        });
        row.appendChild(btn);
        wrap.appendChild(row);
      }
    }
    if (!payable.length && !offers.length) {
      wrap.appendChild(UI.el("p", { text: "There is no work for you here right now. Keep your eyes open for the next commission." }));
    }
    return UI.modal({ title: "The Hall: " + Data.MAPS[mod.hub].name, body: wrap, actions: [{ id: "leave", label: "Leave the hall", primary: true }], wide: true });
  };

  // The journal: commissions and notes, with earlier adventures folded away.
  J.open = (tab) => {
    const G = Game.G;
    const wrap = UI.el("div", { class: "journal" });
    const tabs = UI.el("div", { class: "tabs" });
    const body = UI.el("div", { class: "tabbody" });
    const showCommissions = () => {
      body.innerHTML = "";
      const mod = Modules.MODULES[G.module];
      const all = [...mod.quests, ...mod.side].filter((q) => G.quests[q] && G.quests[q].accepted);
      const order = { ready: 0, active: 1, done: 2 };
      all.sort((a, b) => order[J.state(a)] - order[J.state(b)]);
      body.appendChild(UI.el("h3", { text: mod.code + " " + mod.name }));
      if (!all.length) body.appendChild(UI.el("p", { class: "muted", text: "No commissions accepted here yet." }));
      for (const qid of all) body.appendChild(J.card(qid));
      const earlier = Object.values(Modules.MODULES).filter((m) => m.id !== G.module && [...m.quests, ...m.side].some((q) => G.quests[q] && G.quests[q].accepted));
      for (const m of earlier) {
        const d = UI.el("details", { class: "earlier" });
        d.appendChild(UI.el("summary", { text: m.code + " " + m.name }));
        for (const qid of [...m.quests, ...m.side]) if (G.quests[qid] && G.quests[qid].accepted) d.appendChild(J.card(qid));
        body.appendChild(d);
      }
    };
    const showNotes = () => {
      body.innerHTML = "";
      const seen = new Set();
      const list = G.journal.filter((n) => {
        const k = n.mod + "|" + n.text;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }).sort((a, b) => b.t - a.t);
      let lastDay = null;
      for (const n of list) {
        const c = Game.clock(n.t);
        if (c.day !== lastDay) {
          lastDay = c.day;
          body.appendChild(UI.el("h4", { text: "Day " + c.day }));
        }
        const mod = Modules.MODULES[n.mod];
        const tag = mod ? mod.code + " " : "";
        body.appendChild(UI.el("p", { class: "note" }, UI.el("span", { class: "muted", text: c.text.replace(/^Day \d+ /, "") + "  " + tag }), document.createTextNode(n.text)));
      }
      if (!list.length) body.appendChild(UI.el("p", { class: "muted", text: "Nothing has been written down yet." }));
    };
    const tabDefs = [{ id: "commissions", label: "Commissions", fn: showCommissions }, { id: "notes", label: "Notes", fn: showNotes }];
    for (const t of tabDefs) {
      const b = UI.el("button", { class: "tab", text: t.label });
      b.addEventListener("click", () => {
        for (const x of tabs.children) x.classList.remove("on");
        b.classList.add("on");
        t.fn();
      });
      tabs.appendChild(b);
    }
    wrap.appendChild(tabs);
    wrap.appendChild(body);
    const first = tab === "notes" ? 1 : 0;
    tabs.children[first].classList.add("on");
    tabDefs[first].fn();
    return UI.modal({ title: "Journal", body: wrap, actions: [{ id: "close", label: "Close", primary: true }], wide: true });
  };

  J.card = (qid) => {
    const q = Data.QUESTS[qid];
    const st = J.state(qid);
    const card = UI.el("div", { class: "card quest " + st });
    const head = UI.el("h4", {}, document.createTextNode(q.name + " "), UI.el("span", { class: "badge", text: J.isMain(qid) ? "main" : "side" }));
    card.appendChild(head);
    const label = st === "ready" ? "Ready to report" : st === "done" ? "Completed" : "Active";
    card.appendChild(UI.el("p", { class: "muted", text: label + " — report to " + q.lead + "." }));
    if (st === "active" || st === "ready") card.appendChild(UI.el("p", { text: q.goal }));
    if (st === "done") card.appendChild(UI.el("p", { text: q.done }));
    if (q.needItem && (st === "active" || st === "ready") && !J.carrierOf(q.needItem)) {
      card.appendChild(UI.el("p", { class: "warn", text: "Warning: " + Data.itemName(q.needItem) + " is no longer carried by the company." }));
    }
    if (st !== "done") card.appendChild(UI.el("p", { class: "reward", text: "Reward: " + q.gold + " gp and " + J.memberXP(qid) + " XP each on report." }));
    return card;
  };

  return J;
})();
