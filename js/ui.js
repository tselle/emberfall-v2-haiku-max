"use strict";
/*
 * Presentation: screens, the modal stack, the command bar, the log and HUD,
 * the party drawer, sheets and equipment, shops, the character creator, the
 * campaign chooser and assembly, save slots, the menu and help.
 * Rules and state changes are delegated to Rules, Game and Campaign.
 */
const UI = (() => {
  const U = {};
  const stack = [];
  let root = null;
  let logEl = null;
  let cmdEl = null;
  let hintEl = null;
  let hudEl = null;
  let partyEl = null;
  let toastEl = null;
  let asm = null;            // assembly state: {mod, roster, party, pendingGold}
  let campSel = null;        // selected module in the campaign chooser
  let campTab = 0;

  // ------------------------------------------------------------ helpers ----
  U.el = (tag, attrs, ...kids) => {
    const n = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        const v = attrs[k];
        if (v === undefined || v === null || v === false) continue;
        if (k === "text") n.textContent = v;
        else if (k === "class") n.className = v;
        else if (k === "html") n.innerHTML = v;
        else if (k === "disabled") n.disabled = !!v;
        else if (k === "hidden") n.hidden = !!v;
        else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
        else if (k === "dataset") Object.assign(n.dataset, v);
        else n.setAttribute(k, v === true ? "" : String(v));
      }
    }
    for (const kid of kids) {
      if (kid === null || kid === undefined || kid === false) continue;
      n.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
    }
    return n;
  };
  const $ = (id) => document.getElementById(id);

  U.init = () => {
    root = $("modals");
    logEl = $("log");
    cmdEl = $("cmdbar");
    hintEl = $("cmdhint");
    hudEl = $("hud");
    partyEl = $("party");
    toastEl = $("toast");
    wireTitle();
    wireCampaign();
    wireAssembly();
    U.renderTitle();
    return U;
  };

  // ----------------------------------------------------------- screens ----
  U.showScreen = (name) => {
    for (const s of ["title", "campaign", "assembly", "game"]) {
      const el = $(s);
      if (el) el.hidden = s !== name;
    }
    document.body.dataset.screen = name;
    if (name === "title") U.renderTitle();
    if (name === "campaign") U.renderCampaign();
    if (name === "assembly") U.renderAssembly();
    if (name === "game") U.refreshAll();
  };
  U.setMode = (m) => {
    document.body.dataset.mode = m;
    const view = $("view3d"), over = $("overCanvas"), combat = $("combatCanvas");
    if (view) view.hidden = m !== "local";
    if (over) over.hidden = m !== "wild";
    if (combat) combat.hidden = m !== "combat";
    if (NavPad) NavPad.setMode(m === "local" ? "local" : m === "wild" ? "wild" : null);
    U.refreshCommands();
  };
  U.refreshAll = () => {
    U.refreshHUD();
    U.refreshParty();
    U.refreshCommands();
  };

  // ------------------------------------------------------------- modal ----
  U.modal = (opts) => {
    return new Promise((resolve) => {
      const closable = opts.closable !== false;
      const overlay = U.el("div", { class: "overlay" });
      const box = U.el("div", { class: "modal" + (opts.wide ? " wide" : ""), role: "dialog", "aria-modal": "true", "aria-label": opts.title || "Dialog" });
      const head = U.el("header", { class: "modal-head" }, U.el("h2", { text: opts.title || "" }));
      if (closable) {
        head.appendChild(U.el("button", { class: "icon-btn", title: "Close", "aria-label": "Close", onclick: () => U.closeEntry(entry, null) }, "×"));
      }
      const body = U.el("div", { class: "modal-body" });
      if (typeof opts.body === "string") body.appendChild(U.el("p", { text: opts.body }));
      else if (opts.body instanceof Node) body.appendChild(opts.body);
      else if (Array.isArray(opts.body)) for (const b of opts.body) body.appendChild(b);
      const foot = U.el("footer", { class: "modal-foot" });
      let primaryBtn = null;
      for (const a of opts.actions || []) {
        const b = U.el("button", { class: "btn" + (a.primary ? " primary" : ""), disabled: !!a.disabled, text: a.label });
        if (a.primary) primaryBtn = b;
        b.addEventListener("click", () => U.closeEntry(entry, a.id));
        foot.appendChild(b);
      }
      if (!(opts.actions && opts.actions.length)) foot.hidden = true;
      box.appendChild(head);
      box.appendChild(body);
      box.appendChild(foot);
      overlay.appendChild(box);
      root.appendChild(overlay);
      const entry = { overlay, resolve, closable, primaryBtn, opts };
      stack.push(entry);
      const first = box.querySelector("button:not([disabled]), input, select");
      if (first && !first.classList.contains("icon-btn")) setTimeout(() => first.focus(), 10);
      overlay.addEventListener("pointerdown", (e) => {
        if (e.target === overlay && closable) U.closeEntry(entry, null);
      });
    });
  };
  U.closeEntry = (entry, value) => {
    const i = stack.indexOf(entry);
    if (i < 0) return;
    stack.splice(i, 1);
    entry.overlay.remove();
    entry.resolve(value);
  };
  U.closeTop = () => {
    const top = stack[stack.length - 1];
    if (top) U.closeEntry(top, null);
  };
  U.closeAll = () => {
    while (stack.length) U.closeTop();
  };
  U.confirm = (text, yes, no) => U.modal({ title: "Confirm", body: text, actions: [{ id: "yes", label: yes || "Yes", primary: true }, { id: "no", label: no || "No" }] }).then((v) => v === "yes");
  U.hasModal = () => stack.length > 0;

  // Keys while a dialog is open: Enter activates the primary action, Escape closes if closable.
  U.handleKey = (e) => {
    if (!stack.length) return false;
    const t = e.target;
    const typing = t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA");
    const top = stack[stack.length - 1];
    if (e.key === "Escape" && top.closable) { U.closeEntry(top, null); e.preventDefault(); return true; }
    if (e.key === "Enter" && !typing && top.primaryBtn && !top.primaryBtn.disabled) { top.primaryBtn.click(); e.preventDefault(); return true; }
    if (typing) return false;
    return true;
  };

  // ------------------------------------------------------- log and hint ----
  U.log = (text, cls) => {
    if (!logEl) return;
    const p = U.el("p", { class: "line " + (cls || "") , text });
    logEl.appendChild(p);
    while (logEl.children.length > 250) logEl.removeChild(logEl.firstChild);
    logEl.scrollTop = logEl.scrollHeight;
  };
  U.hint = (text) => {
    if (hintEl) hintEl.textContent = text || "";
  };
  U.toast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(U.toast.t);
    U.toast.t = setTimeout(() => toastEl.classList.remove("show"), 2600);
  };

  // Command bar: items [{id,label,title,fn,disabled,icon}].
  U.cmd = (items) => {
    if (!cmdEl) return;
    cmdEl.innerHTML = "";
    for (const it of items) {
      const b = U.el("button", { class: "cmd", title: it.title || it.label, "aria-label": it.label, disabled: !!it.disabled, onclick: () => it.fn && it.fn() }, U.el("span", { class: "cmd-label", text: it.label }));
      cmdEl.appendChild(b);
    }
  };
  // The default exploration command bar.
  U.refreshCommands = () => {
    if (!cmdEl || !Game || !Game.G) return;
    const mode = document.body.dataset.mode;
    if (mode === "local") {
      U.cmd([
        { label: "Forward", title: "Step forward (W)", fn: () => Game.stepForward(false) },
        { label: "Turn left", title: "Turn left (A)", fn: () => Game.turn(-1) },
        { label: "Turn right", title: "Turn right (D)", fn: () => Game.turn(1) },
        { label: "Search", title: "Search for secrets and traps (F)", fn: () => Game.search() },
        { label: "Camp", title: "Rest (R)", fn: () => Game.camp() },
        { label: "Party", title: "Party drawer (P)", fn: () => U.toggleParty() },
        { label: "Map", title: "Survey map (M)", fn: () => U.openFullMap() },
        { label: "Journal", title: "Journal (J)", fn: () => U.openJournal() },
        { label: "Bestiary", title: "Bestiary (B)", fn: () => U.openBestiary() },
        { label: "Menu", title: "Menu (Esc)", fn: () => U.openMenu() },
      ]);
    } else if (mode === "wild") {
      U.cmd([
        { label: "Visit", title: "Visit the place you stand on (Enter)", fn: () => Over.visit() },
        { label: "Camp", title: "Camp (R)", fn: () => Over.camp() },
        { label: "Map", title: "Survey map (M)", fn: () => U.openFullMap() },
        { label: "Journal", title: "Journal (J)", fn: () => U.openJournal() },
        { label: "Party", title: "Party drawer (P)", fn: () => U.toggleParty() },
        { label: "Menu", title: "Menu (Esc)", fn: () => U.openMenu() },
      ]);
    }
  };

  // HUD: party pips, location, facing, day and gold.
  U.refreshHUD = () => {
    if (!hudEl || !Game || !Game.G) return;
    const G = Game.G;
    const map = Data.MAPS[G.map];
    const mod = Modules.MODULES[G.module];
    const clock = Game.clock(G.time);
    hudEl.innerHTML = "";
    const pips = U.el("button", { class: "pips", title: "Party (P)", "aria-label": "Show party", onclick: () => U.toggleParty() });
    for (const c of Game.party()) {
      const pct = c.dead ? 0 : Math.max(0, Math.min(1, c.hp / c.maxhp));
      pips.appendChild(U.el("span", { class: "pip" + (c.dead ? " dead" : c.hp <= 0 ? " down" : ""), title: c.name + " " + Math.max(0, c.hp) + "/" + c.maxhp, style: "--pct:" + Math.round(pct * 100) + "%" }));
    }
    hudEl.appendChild(pips);
    const facing = map && !map.overland ? Game.dirName(G.dir) : "";
    const where = U.el("div", { class: "where" }, U.el("strong", { text: map ? map.name : "" }), facing ? U.el("span", { class: "muted", text: " · facing " + facing }) : null);
    hudEl.appendChild(where);
    hudEl.appendChild(U.el("div", { class: "when muted", text: (mod ? mod.code + " · " : "") + clock.text + " · " + Game.isNight(G.time) ? "" : "" }));
    hudEl.lastChild.textContent = (mod ? mod.code + " · " : "") + clock.text + (Game.isNight(G.time) ? " · night" : " · day");
    hudEl.appendChild(U.el("div", { class: "gold", text: G.gold + " gp" }));
  };

  // ------------------------------------------------------- party drawer ----
  U.toggleParty = () => {
    if (!partyEl) return;
    const show = partyEl.hidden;
    partyEl.hidden = !show;
    if (show) U.refreshParty();
  };
  U.refreshParty = () => {
    if (!partyEl || !Game || !Game.G) return;
    const frag = U.el("div", { class: "party-list" });
    frag.appendChild(U.el("div", { class: "party-head" }, U.el("strong", { text: "The company" }), U.el("button", { class: "icon-btn", title: "Close", "aria-label": "Close party", onclick: () => { partyEl.hidden = true; } }, "×")));
    const members = Game.party();
    members.forEach((c, i) => {
      const card = U.el("button", { class: "member" + (c.dead ? " dead" : c.hp <= 0 ? " down" : ""), onclick: () => U.openSheet(c.id), title: "Open " + c.name + "'s sheet (" + (i + 1) + ")" });
      const cv = U.el("canvas", { class: "portrait-sm", width: 64, height: 64 });
      Figs.portrait(cv, Figs.descChar(c, Rules.derive(c, Game.G.time)));
      card.appendChild(cv);
      const info = U.el("div", { class: "member-info" });
      const d = Rules.derive(c, Game.G.time);
      info.appendChild(U.el("div", { class: "name", text: c.name }));
      info.appendChild(U.el("div", { class: "muted", text: Rules.RACES[c.race].name + " " + Rules.CLASSES[c.cls].name + " " + c.lvl + (Rules.readyToTrain(c) ? " · ready to train" : "") }));
      const bar = U.el("div", { class: "hpbar" });
      bar.appendChild(U.el("span", { style: "width:" + Math.max(0, Math.round((c.hp / c.maxhp) * 100)) + "%" }));
      info.appendChild(bar);
      info.appendChild(U.el("div", { class: "muted", text: "HP " + Math.max(0, c.hp) + "/" + c.maxhp + " · AC " + d.ac + (c.poison ? " · poisoned" : "") + (c.fx && c.fx.armor && c.fx.armor.left > 0 ? " · armoured" : "") + (c.dead ? " · dead" : c.hp <= 0 ? " · down" : "") }));
      card.appendChild(info);
      frag.appendChild(card);
    });
    partyEl.innerHTML = "";
    partyEl.appendChild(frag);
  };

  // ----------------------------------------------------------- sheets ----
  // Equipment rules: class limits, two-handed weapons, rings, and swapping into the pack.
  U.canWear = (c, instId) => {
    const def = Data.item(instId);
    if (!def || !def.slot) return { ok: false, why: "That cannot be worn." };
    if (def.cls && !def.cls.includes(c.cls)) return { ok: false, why: Rules.CLASSES[c.cls].name + "s cannot use " + def.name + "." };
    if (def.armorType === "robe" && c.cls !== "M") return { ok: false, why: "Only a mage wears a robe." };
    if (def.slot === "armor" && c.cls === "M" && def.armorType !== "robe") return { ok: false, why: "Mages do not wear ordinary armour." };
    if (def.slot === "armor" && c.cls === "T" && def.armorType !== "light" && def.armorType !== "robe") return { ok: false, why: "Thieves wear light armour only." };
    if (def.slot === "shield" && c.cls === "M") return { ok: false, why: "Mages do not carry shields." };
    if (def.slot === "melee" && c.eq.shield && def.hands === 2) return { ok: true, note: "The shield goes to the pack." };
    if (def.slot === "shield" && c.eq.melee) {
      const w = Data.item(c.eq.melee);
      if (w && w.hands === 2) return { ok: false, why: "A two-handed weapon is in use; the shield cannot be worn." };
    }
    return { ok: true };
  };
  U.equip = (c, instId) => {
    const chk = U.canWear(c, instId);
    if (!chk.ok) return Game.log(chk.why, "warn");
    const def = Data.item(instId);
    let slot = def.slot;
    if (slot === "ring") slot = c.eq.ring1 ? (c.eq.ring2 ? "ring1" : "ring2") : "ring1";
    const i = c.inv.indexOf(instId);
    if (i < 0) return;
    c.inv.splice(i, 1);
    if (slot === "melee" && def.hands === 2 && c.eq.shield) {
      c.inv.push(c.eq.shield);
      c.eq.shield = null;
    }
    const prev = c.eq[slot];
    if (prev) c.inv.push(prev);
    c.eq[slot] = instId;
    Game.log(c.name + " equips " + Data.itemName(instId) + ".", "good");
    U.refreshParty();
  };
  U.unequip = (c, slot) => {
    const id = c.eq[slot];
    if (!id) return;
    c.eq[slot] = null;
    c.inv.push(id);
    U.refreshParty();
  };
  U.canDrop = (instId) => {
    const def = Data.item(instId);
    return !!def && def.type !== "q";
  };

  U.openSheet = (charId) => {
    const c = Game.charById(charId);
    if (!c) return;
    const d = Rules.derive(c, Game.G.time);
    const wrap = U.el("div", { class: "sheet" });
    const top = U.el("div", { class: "sheet-top" });
    const cv = U.el("canvas", { class: "portrait", width: 160, height: 160 });
    Figs.portrait(cv, Figs.descChar(c, d));
    top.appendChild(cv);
    const id = U.el("div", { class: "ident" });
    id.appendChild(U.el("h3", { text: c.name }));
    id.appendChild(U.el("p", { class: "muted", text: Rules.RACES[c.race].name + " " + Rules.CLASSES[c.cls].name + ", level " + c.lvl + " · " + Rules.ALIGN_NAMES[c.align] }));
    const next = Rules.xpFor(c.cls, c.lvl + 1);
    id.appendChild(U.el("p", { text: "Experience " + c.xp + " / next at " + next + (Rules.readyToTrain(c) ? " — ready to train at the hall or training yard." : "") }));
    id.appendChild(U.el("p", { class: "muted", text: c.dead ? "Dead." : c.lost ? "Lost beyond recall." : c.hp <= 0 ? "Down and bleeding." : "Fit for the road." }));
    top.appendChild(id);
    wrap.appendChild(top);
    const stats = U.el("div", { class: "stats" });
    const cell = (label, value) => stats.appendChild(U.el("div", { class: "stat" }, U.el("span", { class: "muted", text: label }), U.el("strong", { text: String(value) })));
    cell("Hit points", Math.max(0, c.hp) + " / " + c.maxhp);
    cell("Armour class", d.ac);
    cell("THAC0", d.thac0);
    cell("Melee", (d.meleeHit >= 0 ? "+" : "") + d.meleeHit + " to hit, " + Rules.modText(d.meleeDmg) + " dmg");
    cell("Attacks", (d.halves / 2).toString().replace(".5", "½") + " a round");
    cell("Movement", d.mv);
    cell("Saves", d.saves.join(" / "));
    if (c.cls === "T") {
      const t = d.thief;
      cell("Thief skills", "OL " + t.ol + "%, FT " + t.ft + "%, MS " + t.ms + "%, HS " + t.hs + "%, HN " + t.hn + "%");
    }
    wrap.appendChild(stats);
    const abil = U.el("div", { class: "abil" });
    for (const k of Rules.ABIL) {
      const v = k === "str" ? Rules.strText(c.str, c.strx) : String(c[k]);
      const m = k === "str" ? Rules.strMod(c.str, c.strx).hit : k === "dex" ? -Rules.dexMod(c[k]).ac : k === "con" ? Rules.conMod(c[k]).hp : k === "int" ? 0 : k === "wis" ? Rules.wisMod(c[k]).mental : 0;
      abil.appendChild(U.el("span", { class: "ab" }, U.el("span", { class: "muted", text: Rules.ABIL_NAMES[k].slice(0, 3).toUpperCase() }), U.el("strong", { text: v }), U.el("span", { class: "muted", text: k === "dex" || k === "str" || k === "con" ? Rules.modText(m) : "" })));
    }
    wrap.appendChild(abil);
    // Equipment.
    const eqWrap = U.el("div", { class: "eq" });
    eqWrap.appendChild(U.el("h4", { text: "Worn and wielded" }));
    for (const slot of ["melee", "missile", "armor", "shield", "ring1", "ring2", "cloak", "boots", "gloves", "belt", "neck", "charm"]) {
      const iid = c.eq[slot];
      const row = U.el("div", { class: "row" });
      row.appendChild(U.el("span", { class: "muted slot", text: slot.replace(/\d/, "") }));
      row.appendChild(U.el("span", { text: iid ? Data.itemName(iid) : "—" }));
      if (iid) row.appendChild(U.el("button", { class: "btn small", text: "Remove", onclick: () => { U.unequip(c, slot); U.openSheet(c.id); } }));
      eqWrap.appendChild(row);
    }
    wrap.appendChild(eqWrap);
    // Pack.
    const pack = U.el("div", { class: "pack" });
    pack.appendChild(U.el("h4", { text: "Pack" }));
    if (!c.inv.length) pack.appendChild(U.el("p", { class: "muted", text: "Nothing in the pack." }));
    c.inv.forEach((iid, idx) => {
      const def = Data.item(iid);
      const row = U.el("div", { class: "row" });
      row.appendChild(U.el("span", { text: Data.itemName(iid) + (def && def.desc ? " — " + def.desc : "") }));
      const acts = U.el("span", { class: "acts" });
      if (def && def.slot) acts.appendChild(U.el("button", { class: "btn small", text: "Equip", onclick: () => { U.equip(c, iid); U.openSheet(c.id); } }));
      if (def && (def.type === "p" || def.type === "x" || def.type === "d" || def.type === "k" || def.type === "g")) {
        acts.appendChild(U.el("button", { class: "btn small", text: def.type === "x" ? "Read" : "Use", onclick: () => U.useOutside(c, iid) }));
      }
      if (def && def.type !== "q") acts.appendChild(U.el("button", { class: "btn small", text: "Give", onclick: () => U.giveTo(c, iid) }));
      if (U.canDrop(iid)) acts.appendChild(U.el("button", { class: "btn small", text: "Drop", onclick: () => { c.inv.splice(idx, 1); Game.dropAt(Game.G.map, Game.G.x, Game.G.y, iid); U.openSheet(c.id); } }));
      else if (def && def.type === "q") acts.appendChild(U.el("span", { class: "muted", text: "Keep" }));
      row.appendChild(acts);
      pack.appendChild(row);
    });
    wrap.appendChild(pack);
    // Spells.
    if (c.cls === "M" || c.cls === "C" || c.cls === "P") wrap.appendChild(U.spellPanel(c, d));
    // Marching order.
    const idx = Game.G.party.indexOf(c.id);
    const order = U.el("div", { class: "order" });
    if (idx >= 0) {
      order.appendChild(U.el("button", { class: "btn small", text: "Move forward", disabled: idx === 0, onclick: () => { U.moveOrder(idx, idx - 1); U.openSheet(c.id); } }));
      order.appendChild(U.el("button", { class: "btn small", text: "Move back", disabled: idx === Game.G.party.length - 1, onclick: () => { U.moveOrder(idx, idx + 1); U.openSheet(c.id); } }));
      order.appendChild(U.el("span", { class: "muted", text: "Marching position " + (idx + 1) + " of " + Game.G.party.length + "." }));
    } else {
      order.appendChild(U.el("span", { class: "muted", text: "Not in the marching party." }));
    }
    wrap.appendChild(order);
    if (c.race === "elf" || c.race === "dwarf" || c.race === "halfling" || c.race === "gnome") {
      wrap.appendChild(U.el("p", { class: "muted", text: Rules.RACES[c.race].desc }));
    }
    if (c.cls === "P") wrap.appendChild(U.el("p", { class: "muted", text: "Lay on hands: " + (c.layUsed ? "spent until the next rest." : (2 * c.lvl) + " hit points once per rest.") }));
    if (c.cls === "F" && c.spec) wrap.appendChild(U.el("p", { class: "muted", text: "Specialist in " + c.spec + ": +1 to hit, +2 damage, and an extra half attack." }));
    if (c.cls === "R" && c.foe) wrap.appendChild(U.el("p", { class: "muted", text: "Favoured enemy: " + c.foe + " (+4 to hit and +level damage)." }));
    return U.modal({ title: "Sheet: " + c.name, body: wrap, wide: true, actions: [{ id: "ok", label: "Close", primary: true }] });
  };
  U.moveOrder = (from, to) => {
    const p = Game.G.party;
    if (to < 0 || to >= p.length) return;
    const [x] = p.splice(from, 1);
    p.splice(to, 0, x);
    U.refreshParty();
  };
  // Using a potion, device, scroll or tome outside battle.
  U.useOutside = (c, iid) => {
    const def = Data.item(iid);
    const i = c.inv.indexOf(iid);
    if (i < 0) return;
    if (def.type === "p") {
      c.inv.splice(i, 1);
      if (def.heal) { c.hp = Math.min(c.maxhp, c.hp + Rules.dice(def.heal)); if (c.hp > 0) c.dead = false; }
      if (def.cure) c.poison = null;
      if (def.str) c.fx.str = { val: def.str.val, until: Game.G.time + def.str.dur };
      if (def.buff) c.fx.buffs.push({ id: def.buff, until: Game.G.time + (def.dur || 60) });
      Game.log(c.name + " drinks " + def.name + ".", "good");
    } else if (def.type === "k") {
      c.inv.splice(i, 1);
      c[def.ability] = Math.min(18, c[def.ability] + 1);
      Game.log(c.name + " reads the tome. " + Rules.ABIL_NAMES[def.ability] + " rises.", "good");
    } else if (def.type === "x") {
      c.inv.splice(i, 1);
      const sp = Data.SPELLS[def.spell];
      const ok = (sp.c === "M" && c.cls === "M") || (sp.c === "C" && (c.cls === "C" || c.cls === "P"));
      if (!ok) { c.inv.splice(i, 0, iid); return Game.log("Only the right caster can read that.", "warn"); }
      c.book = c.book || [];
      if (c.cls === "M") {
        if (c.book.includes(sp.id)) { c.inv.splice(i, 0, iid); return Game.log(c.name + " already knows " + sp.name + ". The scroll is kept.", "warn"); }
        if (Rules.die(100) <= Rules.learnChance(c.int)) {
          c.book.push(sp.id);
          c.prep[sp.id] = c.prep[sp.id] || 0;
          Game.log(c.name + " copies " + sp.name + " into the spellbook.", "good");
        } else Game.log(c.name + " fails to copy " + sp.name + ". The scroll is lost.", "bad");
      } else Game.log(c.name + " reads " + sp.name + ".", "");
    } else if (def.type === "d") {
      Game.log("Devices are used in battle or at camp.", "");
      return;
    } else if (def.type === "g") {
      if (def.use === "bandage") { c.bleeding = false; Game.log(c.name + " is bandaged.", "good"); c.inv.splice(i, 1); }
      else if (def.use === "tent" || def.use === "light" || def.use === "food") return Game.log(def.name + " is used when you camp or on the road.", "");
      else return Game.log("Nothing happens.", "");
    }
    U.openSheet(c.id);
    U.refreshParty();
    U.refreshHUD();
  };
  U.giveTo = async (c, iid) => {
    const others = Game.party().filter((o) => o !== c && !o.dead).concat(Game.G.roster.filter((o) => !Game.G.party.includes(o.id) && o !== c && !o.dead));
    if (!others.length) return Game.log("There is no one to give it to.", "warn");
    const body = U.el("div", {}, U.el("p", { text: "Give " + Data.itemName(iid) + " to whom?" }));
    const actions = others.map((o) => ({ id: o.id, label: o.name }));
    actions.push({ id: "no", label: "Keep it" });
    const pick = await U.modal({ title: "Give", body, actions });
    if (!pick || pick === "no") return;
    const i = c.inv.indexOf(iid);
    if (i < 0) return;
    c.inv.splice(i, 1);
    Game.charById(pick).inv.push(iid);
    Game.log(c.name + " gives " + Data.itemName(iid) + " to " + Game.charById(pick).name + ".", "good");
    U.openSheet(c.id);
    U.refreshParty();
  };

  // Spell panel: known spells with preparation counts, and out-of-battle casting.
  U.spellPanel = (c, d) => {
    const wrap = U.el("div", { class: "spells" });
    wrap.appendChild(U.el("h4", { text: c.cls === "M" ? "Spellbook" : "Spells" }));
    const slots = d.slots;
    const known = c.cls === "M" ? (c.book || []) : Rules.classSpellIds(c);
    const levels = Object.keys(slots).map(Number).sort((a, b) => a - b);
    if (!levels.length) wrap.appendChild(U.el("p", { class: "muted", text: "No spell slots yet." }));
    for (const lvl of levels) {
      const row = U.el("div", { class: "spell-level" });
      const used = Object.keys(c.prep || {}).filter((id) => Data.SPELLS[id] && Data.SPELLS[id].l === lvl).reduce((s, id) => s + (c.prep[id] || 0), 0);
      row.appendChild(U.el("h5", { text: "Level " + lvl + " — " + used + " of " + slots[lvl] + " chosen for rest" }));
      for (const id of known.filter((k) => Data.SPELLS[k] && Data.SPELLS[k].l === lvl)) {
        const sp = Data.SPELLS[id];
        const cur = (c.prep && c.prep[id]) || 0;
        const ready = (c.mem && c.mem[id]) || 0;
        const line = U.el("div", { class: "row" });
        line.appendChild(U.el("span", { title: sp.desc, text: sp.name + "  (ready " + ready + ")" }));
        const ctl = U.el("span", { class: "acts" });
        ctl.appendChild(U.el("button", { class: "btn small", text: "−", disabled: cur <= 0, onclick: () => { c.prep[id] = cur - 1; if (!c.prep[id]) delete c.prep[id]; U.openSheet(c.id); } }));
        ctl.appendChild(U.el("span", { text: String(cur) }));
        ctl.appendChild(U.el("button", { class: "btn small", text: "+", disabled: used >= slots[lvl], onclick: () => { c.prep[id] = cur + 1; U.openSheet(c.id); } }));
        if (sp.camp && ready > 0) ctl.appendChild(U.el("button", { class: "btn small", text: "Cast", onclick: () => U.castOutside(c, id) }));
        line.appendChild(ctl);
        row.appendChild(line);
      }
      wrap.appendChild(row);
    }
    wrap.appendChild(U.el("p", { class: "muted", text: "Changing what you prepare does not give an immediate cast; rest copies it into the ready list." }));
    return wrap;
  };
  U.castOutside = (c, spId) => {
    const sp = Data.SPELLS[spId];
    const target = Game.alive();
    const who = target.length === 1 ? target[0] : c;
    if (!c.mem || !c.mem[spId]) return;
    c.mem[spId] -= 1;
    const d = sp.h;
    if (d === "heal1" || d === "heal2" || d === "heal3" || d === "heal4") {
      const dice = d === "heal1" ? "1d8" : d === "heal2" ? "2d8+1" : d === "heal3" ? "3d8+3" : null;
      const n = dice ? Rules.dice(dice) : who.maxhp;
      who.hp = Math.min(who.maxhp, who.hp + n);
      if (who.hp > 0) who.dead = false;
      Game.log(c.name + " casts " + sp.name + " on " + who.name + ".", "good");
    } else if (d === "armorSpell") {
      c.fx.armor = { ac: 6, left: 8 + c.lvl };
      Game.log(c.name + " casts Armor.", "good");
    } else if (d === "strength") {
      who.fx.str = { val: 18, x: 75, until: Game.G.time + 60 * c.lvl };
      Game.log(who.name + " grows stronger for " + c.lvl + " hour" + (c.lvl === 1 ? "" : "s") + ".", "good");
    } else if (d === "neutralize" || d === "slowPoison") {
      who.poison = null;
      Game.log(who.name + " is purged of venom.", "good");
    } else if (d === "removePara" || d === "cureBlind") {
      Game.log("The spell takes effect.", "good");
    } else if (d === "pfe" || d === "freeAction" || d === "resistFC" || d === "invis") {
      who.fx.buffs.push({ id: d, until: Game.G.time + 60 });
      Game.log(who.name + " is warded.", "good");
    } else if (d === "raise" || d === "resurrect") {
      return Game.log("Raise and Resurrection are cast at the temple or on a corpse.", "warn");
    } else {
      Game.log("That spell is for battle.", "warn");
    }
    U.openSheet(c.id);
    U.refreshParty();
  };

  // Ground piles on the current square.
  U.groundDialog = async (mapId, x, y) => {
    const piles = Game.groundAt(mapId, x, y);
    if (!piles.length) return;
    const actions = [{ id: "all", label: "Take everything", primary: true }];
    for (const it of piles) actions.push({ id: "one_" + it, label: "Take " + Data.itemName(it) });
    actions.push({ id: "leave", label: "Leave it" });
    const choice = await U.modal({ title: "On the ground", body: "Items lie on this square.", actions });
    if (!choice || choice === "leave") return;
    const carrier = Game.conscious()[0] || Game.alive()[0];
    if (!carrier) return;
    if (choice === "all") {
      for (const it of piles.slice()) Game.takeFromGround(mapId, x, y, it, carrier);
    } else {
      Game.takeFromGround(mapId, x, y, choice.slice(4), carrier);
    }
    Game.log(carrier.name + " gathers the items.", "good");
    U.refreshParty();
  };

  // ------------------------------------------------------------ shops ----
  U.openShop = (kind, title) => {
    const shop = Data.SHOPS[kind];
    return U.shopCustom(title || (shop ? shop.name : "Shop"), shop ? shop.stock : []);
  };
  U.shopCustom = (title, stock) => {
    const wrap = U.el("div", { class: "shop" });
    const buyer = U.el("select", { "aria-label": "Buyer" });
    for (const c of Game.party().filter((x) => !x.dead)) buyer.appendChild(U.el("option", { value: c.id, text: c.name }));
    wrap.appendChild(U.el("p", { text: "Gold in the purse: " + Game.G.gold + " gp. Buying for:" }));
    wrap.appendChild(buyer);
    const list = U.el("div", { class: "stock" });
    for (const id of stock) {
      const def = Data.item(id);
      if (!def || def.shopExcluded) continue;
      const price = def.cost;
      const row = U.el("div", { class: "row" });
      row.appendChild(U.el("span", { text: def.name + " — " + price + " gp" + (def.desc ? " · " + def.desc : "") }));
      const b = U.el("button", { class: "btn small", text: "Buy", disabled: Game.G.gold < price, onclick: () => {
        const c = Game.charById(buyer.value);
        if (!c || Game.G.gold < price) return;
        Game.G.gold -= price;
        c.inv.push(id);
        if (def.slot && !c.eq[def.slot] && U.canWear(c, id).ok) {
          const k = c.inv.indexOf(id);
          if (k >= 0) c.inv.splice(k, 1);
          c.eq[def.slot] = id;
        }
        Game.log(c.name + " buys " + def.name + " for " + price + " gp.", "good");
        UI.refreshHUD();
        U.refreshParty();
        U.closeTop();
        U.shopCustom(title, stock);
      } });
      row.appendChild(b);
      list.appendChild(row);
    }
    wrap.appendChild(list);
    // Selling from packs.
    const seller = U.el("h4", { text: "Sell from the pack" });
    wrap.appendChild(seller);
    for (const c of Game.party()) {
      for (const id of c.inv.slice()) {
        const def = Data.item(id);
        if (!def || !def.sell || def.type === "q") continue;
        const price = Campaign.sellPrice(id);
        const row = U.el("div", { class: "row" });
        row.appendChild(U.el("span", { text: c.name + ": " + Data.itemName(id) + " — sells for " + price + " gp" }));
        row.appendChild(U.el("button", { class: "btn small", text: "Sell", onclick: () => {
          const k = c.inv.indexOf(id);
          if (k < 0) return;
          c.inv.splice(k, 1);
          Game.G.gold += price;
          Game.log(c.name + " sells " + def.name + " for " + price + " gp.", "good");
          UI.refreshHUD();
          U.closeTop();
          U.shopCustom(title, stock);
        } }));
        wrap.appendChild(row);
      }
    }
    return U.modal({ title: title, body: wrap, wide: true, actions: [{ id: "leave", label: "Leave", primary: true }] });
  };

  // -------------------------------------------------- battle presentation ----
  U.enterCombat = (title, text) => {
    Game.mode = "combat";
    U.setMode("combat");
    U.hint(text || title);
    if (partyEl) partyEl.hidden = true;
    U.refreshParty();
  };
  U.exitCombat = (result) => {
    const back = Game.X && Game.X.map && Game.X.map.overland ? "wild" : "local";
    Game.mode = back;
    U.setMode(back);
    if (result === "win") U.log("The field is quiet.", "good");
    Game.redraw();
    U.refreshHUD();
    U.refreshParty();
  };
  // Learning a new spell on level up: the mage chooses from accessible levels.
  U.pickSpell = async (options, c) => {
    const names = options.slice(0, 12);
    const choice = await U.modal({
      title: "Learn a spell",
      body: c.name + " may learn one new spell of an accessible level.",
      actions: names.map((id) => ({ id, label: Data.SPELLS[id].name + " (level " + Data.SPELLS[id].l + ")" })),
    });
    return choice || names[0];
  };
  // Battle "cast" menu hook used by Combat when available.
  U.pickTarget = () => null;

  // -------------------------------------------------------- menu and help ----
  U.openMenu = async () => {
    const inTown = Campaign.canTravel();
    const actions = [
      { id: "resume", label: "Resume", primary: true },
      { id: "map", label: "Survey map" },
      { id: "journal", label: "Journal" },
      { id: "bestiary", label: "Bestiary" },
      { id: "touch", label: "Touch controls (" + NavPad.placement() + ")" },
      { id: "save", label: "Save" },
      { id: "load", label: "Load" },
    ];
    if (inTown) actions.push({ id: "campaign", label: "Campaign: travel to another adventure" });
    actions.push({ id: "help", label: "How to play" });
    actions.push({ id: "title", label: "Quit to title" });
    const choice = await U.modal({ title: "Menu", body: "", actions });
    if (choice === "map") return U.openFullMap();
    if (choice === "journal") return U.openJournal();
    if (choice === "bestiary") return U.openBestiary();
    if (choice === "touch") { NavPad.cycle(); return U.openMenu(); }
    if (choice === "save") return U.openSlots("save");
    if (choice === "load") return U.openSlots("load");
    if (choice === "campaign") return Campaign.menu();
    if (choice === "help") return U.openHelp();
    if (choice === "title") {
      const ok = await U.confirm("Quit to the title? Unsaved progress is lost.", "Quit", "Stay");
      if (ok) Game.toTitle();
    }
  };
  U.openJournal = () => J_open();
  const J_open = () => Journal.open();
  U.openBestiary = () => Bestiary.open();
  U.openFullMap = () => MapView.openFull();
  U.openHelp = () => {
    const body = U.el("div", { class: "help" },
      U.el("h3", { text: "Walking the Emberwild" }),
      U.el("p", { text: "On foot, W or the up arrow moves forward, S back, A and D turn ninety degrees, and Q and E sidestep. F searches the four walls around you for secrets and traps, and R makes camp. Walk into a service door to knock on it, into a gate to leave town, and into a band to challenge it." }),
      U.el("h3", { text: "The wilds" }),
      U.el("p", { text: "W, A, S, D and the arrows move one mile at a time on the compass; Q, E, Z and C move diagonally. Tap the landscape to take one step toward a point. Step onto a site to be asked to visit it; Enter or Visit invokes it again. Each mile costs time; weary companies slow down after ten hours of marching." }),
      U.el("h3", { text: "Bands and surprise" }),
      U.el("p", { text: "A band you can see at a distance is shown with a prompt: attack with a free round, back away, hold still, or creep up. Hidden bands wait in ambush until you come close. Surprise is rolled on d6 for each side." }),
      U.el("h3", { text: "Battle" }),
      U.el("p", { text: "Click or use the arrows to move a company member, then attack an adjacent foe, or cast, turn undead, hide, use an item, or end the turn. Space or Enter ends the turn. Q starts Auto-Battle; Esc or Stop returns control. Escape is not a save menu in battle." }),
      U.el("h3", { text: "Company, spells and rest" }),
      U.el("p", { text: "Open a sheet to change marching order, equip, use, give or drop items, and prepare spells. Changing what you prepare does not let you cast at once: rest copies it into the ready list. An inn or a camp restores spells; the temple raises the dead." }),
      U.el("h3", { text: "Campaigns" }),
      U.el("p", { text: "Commissions are taken at the hall. Accomplish the work, report it, and the next commission is offered. Finishing the last one completes the adventure; you may then set out for the next, in fourteen days, from any safe town." }),
    );
    return U.modal({ title: "How to play", body, wide: true, actions: [{ id: "ok", label: "Back", primary: true }] });
  };

  // ----------------------------------------------------------- slots ----
  U.openSlots = async (mode) => {
    const wrap = U.el("div", { class: "slots" });
    const list = mode === "load" ? ["auto", "1", "2", "3"] : ["1", "2", "3"];
    const actions = [];
    for (const k of list) {
      const info = Game.slotInfo(k);
      const label = k === "auto" ? "Autosave" : "Slot " + k;
      const row = U.el("div", { class: "row slot-row" });
      row.appendChild(U.el("div", {}, U.el("strong", { text: label }), U.el("div", { class: "muted", text: info ? info.leader + " · " + info.mod + " · " + info.where + " · " + info.when + " · level " + info.lvl + " · " + info.saved : "Empty" })));
      if (mode === "save" && k !== "auto") {
        const b = U.el("button", { class: "btn small", text: info ? "Overwrite" : "Save here", onclick: async () => {
          if (info) {
            const ok = await U.confirm("Overwrite " + label + "?", "Overwrite", "Keep");
            if (!ok) return;
          }
          if (Game.saveSlot(k)) { U.toast("Saved to " + label + "."); U.closeTop(); }
        } });
        row.appendChild(b);
      } else if (mode === "load") {
        row.appendChild(U.el("button", { class: "btn small", text: "Load", disabled: !info, onclick: () => { if (Game.loadSlot(k)) { U.closeTop(); U.showScreen("game"); } } }));
      }
      wrap.appendChild(row);
    }
    if (mode === "save") wrap.appendChild(U.el("p", { class: "muted", text: "Autosave is kept for you at each checkpoint and is not a manual save target." }));
    return U.modal({ title: mode === "save" ? "Save the game" : "Load a game", body: wrap, wide: true, actions: [{ id: "close", label: "Close", primary: true }] });
  };

  // ---------------------------------------------------------- title ----
  const wireTitle = () => {
    $("btnContinue").addEventListener("click", () => {
      const s = Game.newestSave();
      if (!s) return;
      Game.G = Game.restoreState(s);
      Game.resumeAt();
    });
    $("btnNew").addEventListener("click", () => U.showScreen("campaign"));
    $("btnLoad").addEventListener("click", () => U.openSlots("load"));
    $("btnHow").addEventListener("click", () => U.openHelp());
  };
  U.renderTitle = () => {
    const cont = $("btnContinue");
    if (cont) cont.disabled = !Game.newestSave();
    const load = $("btnLoad");
    if (load) load.disabled = !(["auto", "1", "2", "3"].some((k) => Game.readSlot(k)));
    const embers = $("embers");
    if (embers && !embers.childElementCount) {
      for (let i = 0; i < 26; i++) {
        const e = document.createElement("i");
        e.style.left = Math.round(Math.random() * 100) + "%";
        e.style.animationDelay = (-Math.random() * 9).toFixed(2) + "s";
        e.style.animationDuration = (7 + Math.random() * 6).toFixed(2) + "s";
        embers.appendChild(e);
      }
    }
  };

  // ------------------------------------------------------- campaign ----
  // Bands: the saga first, then five generated bands of ten.
  const bandsOf = () => {
    const list = [{ title: "The Emberwild Saga", ids: Modules.CAMPAIGN.order.slice() }];
    const gen = (typeof Adventures !== "undefined" && Adventures.BANDS) ? Adventures.BANDS : [];
    gen.forEach((ids, i) => list.push({ title: "Band " + ["I", "II", "III", "IV", "V"][i] + " · levels " + (i * 4 + 1) + "–" + (i * 4 + 4) + (i > 0 ? "" : ""), ids }));
    return list;
  };
  const counts = (mod) => {
    let areas = 0, fights = 0, chests = 0, sites = 0;
    for (const id of mod.maps) {
      const m = Data.MAPS[id];
      if (!m) continue;
      areas++;
      if (m.overland) sites += Object.keys(m.sites || {}).length;
      else {
        for (const k of Object.keys(m.ev || {})) {
          if (m.ev[k].enc) fights++;
          if (m.ev[k].chest) chests++;
        }
      }
    }
    return { areas, fights, chests, sites, commissions: mod.quests.length + mod.side.length };
  };
  U.renderCampaign = () => {
    const wrap = $("campaign");
    if (!wrap) return;
    const tabs = $("campTabs"), cards = $("campCards"), detail = $("campDetail");
    if (!tabs || !cards) return;
    const bands = bandsOf();
    if (campTab >= bands.length) campTab = 0;
    tabs.innerHTML = "";
    bands.forEach((b, i) => {
      tabs.appendChild(U.el("button", { class: "tab" + (i === campTab ? " on" : ""), role: "tab", "aria-selected": i === campTab, onclick: () => { campTab = i; U.renderCampaign(); } }, b.title.split(" · ")[0]));
    });
    cards.innerHTML = "";
    const ids = bands[campTab].ids;
    if (!campSel || !Modules.MODULES[campSel]) campSel = "thornwick";
    for (const id of ids) {
      const mod = Modules.MODULES[id];
      if (!mod) continue;
      const done = Game.G && Game.G.done ? Game.G.done.includes(id) : false;
      const c = counts(mod);
      const card = U.el("button", { class: "card-pick" + (campSel === id ? " on" : "") + (done ? " done" : ""), onclick: () => { campSel = id; U.renderCampaign(); } });
      card.appendChild(U.el("div", { class: "code", text: mod.code + (done ? " ✓" : "") }));
      card.appendChild(U.el("strong", { text: mod.name }));
      card.appendChild(U.el("div", { class: "muted", text: "Levels " + mod.levels[0] + "–" + mod.levels[1] + " · " + "●".repeat(mod.diff) + "○".repeat(4 - mod.diff) }));
      card.appendChild(U.el("div", { class: "muted", text: mod.size + " · " + mod.length }));
      cards.appendChild(card);
    }
    const mod = Modules.MODULES[campSel];
    if (detail && mod) {
      const c = counts(mod);
      detail.innerHTML = "";
      detail.appendChild(U.el("h3", { text: mod.code + " · " + mod.name }));
      detail.appendChild(U.el("p", { text: mod.blurb }));
      detail.appendChild(U.el("p", { class: "muted", text: "Recommended levels " + mod.levels[0] + "–" + mod.levels[1] + " · difficulty " + mod.diff + " of 4 · " + mod.size + " · " + mod.length + " · starting funds " + mod.gold + " gp." }));
      detail.appendChild(U.el("p", { class: "muted", text: c.areas + " areas · " + c.fights + " set battles · " + c.chests + " chests · " + c.sites + " wilderness sites · " + c.commissions + " commissions." }));
    }
    const startBtn = $("campAssemble");
    if (startBtn) startBtn.disabled = !Modules.MODULES[campSel];
  };
  const wireCampaign = () => {
    const back = $("campBack");
    if (back) back.addEventListener("click", () => U.showScreen("title"));
    const go = $("campAssemble");
    if (go) go.addEventListener("click", () => {
      if (!Modules.MODULES[campSel]) return;
      U.startAssembly(campSel);
    });
    const bring = $("campBring");
    if (bring) bring.addEventListener("click", async () => {
      const mod = Modules.MODULES[campSel];
      const choice = await U.modal({ title: "Bring a company", body: "Choose a saved company to bring to " + mod.name + ". The source save is not changed.", actions: ["1", "2", "3", "auto"].filter((k) => Game.readSlot(k)).map((k) => ({ id: k, label: k === "auto" ? "Autosave" : "Slot " + k })).concat([{ id: "cancel", label: "Cancel" }]) });
      if (!choice || choice === "cancel") return;
      const imported = Campaign.importFromSlot(choice, mod.id);
      if (!imported) return;
      asm = { mod, roster: imported.roster, party: [], pendingGold: imported.gold - mod.gold, imported, dirty: true };
      U.showScreen("assembly");
    });
  };

  // ------------------------------------------------------- assembly ----
  U.startAssembly = (modId) => {
    const mod = Modules.MODULES[modId];
    const roster = (Game && Game.G && Game.G.roster && Game.G.module === modId && Game.G.roster.length) ? Game.G.roster.slice() : Data.PREGENS();
    asm = { mod, roster, party: [], pendingGold: 0, imported: null };
    U.showScreen("assembly");
  };
  U.renderAssembly = () => {
    const wrap = $("assembly");
    if (!wrap || !asm) return;
    const rost = $("asmRoster"), party = $("asmParty"), begin = $("asmBegin"), head = $("asmHead");
    if (!rost || !party) return;
    if (head) head.textContent = "Assemble your company for " + asm.mod.name + " (" + asm.mod.code + ")";
    rost.innerHTML = "";
    party.innerHTML = "";
    const inParty = (c) => asm.party.includes(c.id);
    const cardFor = (c, inPartyList) => {
      const d = Rules.derive(c, 0);
      const card = U.el("div", { class: "asm-card" });
      const cv = U.el("canvas", { class: "portrait", width: 96, height: 96 });
      Figs.portrait(cv, Figs.descChar(c, d));
      card.appendChild(cv);
      const info = U.el("div", { class: "asm-info" });
      info.appendChild(U.el("strong", { text: c.name }));
      info.appendChild(U.el("div", { class: "muted", text: Rules.RACES[c.race].name + " " + Rules.CLASSES[c.cls].name + " · level " + c.lvl + " · HP " + c.maxhp + " · AC " + d.ac }));
      info.appendChild(U.el("div", { class: "muted", text: (c.spec ? "Specialist: " + c.spec + ". " : "") + (c.foe ? "Foe: " + c.foe + ". " : "") + "Abilities STR " + Rules.strText(c.str, c.strx) + " DEX " + c.dex + " CON " + c.con + " INT " + c.int + " WIS " + c.wis + " CHA " + c.cha }));
      card.appendChild(info);
      const acts = U.el("div", { class: "asm-acts" });
      if (inPartyList) {
        const i = asm.party.indexOf(c.id);
        acts.appendChild(U.el("button", { class: "btn small", text: "▲", title: "Move forward", disabled: i === 0, onclick: () => { swap(i, i - 1); } }));
        acts.appendChild(U.el("button", { class: "btn small", text: "▼", title: "Move back", disabled: i === asm.party.length - 1, onclick: () => { swap(i, i + 1); } }));
        acts.appendChild(U.el("button", { class: "btn small", text: "Remove", onclick: () => { asm.party.splice(i, 1); U.renderAssembly(); } }));
      } else {
        acts.appendChild(U.el("button", { class: "btn small primary", text: "Add", disabled: asm.party.length >= 6, onclick: () => { asm.party.push(c.id); U.renderAssembly(); } }));
        acts.appendChild(U.el("button", { class: "btn small", text: "Delete", onclick: async () => { const ok = await U.confirm("Delete " + c.name + " from the roster?", "Delete", "Keep"); if (ok) { asm.roster = asm.roster.filter((x) => x.id !== c.id); U.renderAssembly(); } } }));
      }
      card.appendChild(acts);
      return card;
    };
    const swap = (a, b) => {
      if (b < 0 || b >= asm.party.length) return;
      const t = asm.party[a];
      asm.party[a] = asm.party[b];
      asm.party[b] = t;
      U.renderAssembly();
    };
    for (const c of asm.roster) if (!inParty(c)) rost.appendChild(cardFor(c, false));
    for (const id of asm.party) {
      const c = asm.roster.find((x) => x.id === id);
      if (c) party.appendChild(cardFor(c, true));
    }
    if (!asm.roster.some((c) => !inParty(c))) rost.appendChild(U.el("p", { class: "muted", text: "Everyone on the roster is in the company." }));
    if (!asm.party.length) party.appendChild(U.el("p", { class: "muted", text: "No one has been chosen. Add up to six." }));
    const gold = $("asmGold");
    if (gold) gold.textContent = "Pooled funds: " + (asm.mod.gold + (asm.pendingGold || 0)) + " gp" + (asm.imported ? " (brought from a save)" : "");
    if (begin) begin.disabled = asm.party.length === 0;
  };
  const wireAssembly = () => {
    const back = $("asmBack");
    if (back) back.addEventListener("click", () => U.showScreen("campaign"));
    const add = $("asmCreate");
    if (add) add.addEventListener("click", () => U.charCreator());
    const begin = $("asmBegin");
    if (begin) begin.addEventListener("click", () => {
      if (!asm || !asm.party.length) return;
      if (asm.imported) {
        const imp = asm.imported;
        const g = Game.newState(asm.mod.id);
        g.gold = imp.gold;
        g.done = imp.done;
        g.flags = imp.flags;
        g.quests = imp.quests;
        g.mods = imp.mods;
        g.seen = imp.seen;
        g.time = imp.time;
        Game.G = g;
        Game.G.roster = asm.roster;
        Game.G.party = asm.party.slice();
        Game.G.map = Data.MAPS[asm.mod.hub].id;
        Game.G.module = asm.mod.id;
        Game.G.x = Data.MAPS[asm.mod.hub].start.x;
        Game.G.y = Data.MAPS[asm.mod.hub].start.y;
        Game.G.dir = Data.MAPS[asm.mod.hub].start.dir;
        Game.note("Brought the company to " + asm.mod.name + ".", asm.mod.id);
        Game.kitFor(asm.mod);
        Game.enter(asm.mod.hub, Game.G.x, Game.G.y, Game.G.dir, { reason: "import" });
        U.showScreen("game");
        Game.log(asm.mod.intro, "good");
        asm = null;
        return;
      }
      Game.beginModule(asm.mod.id, asm.roster, asm.party.slice(), asm.pendingGold || 0);
      asm = null;
    });
  };

  // Charater creation: a guided sheet with a live preview and reroll.
  U.charCreator = (mod) => {
    const modObj = asm ? asm.mod : Modules.MODULES[campSel];
    let state = { race: "human", cls: "F", align: "NG", color: "#b5483a", name: "", spec: "longsword", foe: "goblinoid", abil: null };
    const preview = U.el("div", { class: "creator-preview" });
    const nameIn = U.el("input", { type: "text", maxlength: 20, placeholder: "A name, up to 20 letters", "aria-label": "Name" });
    const sel = (opts, value, on) => {
      const s = U.el("select", { "aria-label": opts.label });
      for (const o of opts.items) s.appendChild(U.el("option", { value: o.v, text: o.t }));
      s.value = value;
      s.addEventListener("change", () => on(s.value));
      return s;
    };
    const raceSel = U.el("select", { "aria-label": "Race" });
    const clsSel = U.el("select", { "aria-label": "Class" });
    const alignSel = U.el("select", { "aria-label": "Alignment" });
    const specSel = U.el("select", { "aria-label": "Specialisation" });
    const foeSel = U.el("select", { "aria-label": "Favoured enemy" });
    const fill = () => {
      raceSel.innerHTML = "";
      for (const r of Object.values(Rules.RACES)) raceSel.appendChild(U.el("option", { value: r.id, text: r.name }));
      raceSel.value = state.race;
      clsSel.innerHTML = "";
      for (const k of Rules.classesFor(state.race)) clsSel.appendChild(U.el("option", { value: k, text: Rules.CLASSES[k].name }));
      if (!clsSel.querySelector('option[value="' + state.cls + '"]')) state.cls = clsSel.firstChild ? clsSel.firstChild.value : "F";
      clsSel.value = state.cls;
      alignSel.innerHTML = "";
      for (const a of Rules.ALIGNS) if (Rules.alignAllowed(state.cls, a)) alignSel.appendChild(U.el("option", { value: a, text: Rules.ALIGN_NAMES[a] }));
      if (!Rules.alignAllowed(state.cls, state.align)) state.align = alignSel.firstChild ? alignSel.firstChild.value : "NG";
      alignSel.value = state.align;
      specSel.innerHTML = "";
      for (const id of ["longsword", "broadsword", "short_sword", "bastard_sword", "two_handed_sword", "battle_axe", "mace", "spear"]) specSel.appendChild(U.el("option", { value: id, text: Data.ITEMS[id].name }));
      specSel.value = state.spec;
      foeSel.innerHTML = "";
      for (const f of ["goblinoid", "orc", "kobold", "undead", "giantkin", "troll"]) foeSel.appendChild(U.el("option", { value: f, text: f[0].toUpperCase() + f.slice(1) }));
      foeSel.value = state.foe;
      specSel.parentNode && (specSel.hidden = state.cls !== "F");
      foeSel.hidden = state.cls !== "R";
    };
    raceSel.addEventListener("change", () => { state.race = raceSel.value; fill(); refresh(); });
    clsSel.addEventListener("change", () => { state.cls = clsSel.value; fill(); refresh(); });
    alignSel.addEventListener("change", () => { state.align = alignSel.value; refresh(); });
    specSel.addEventListener("change", () => { state.spec = specSel.value; refresh(); });
    foeSel.addEventListener("change", () => { state.foe = foeSel.value; refresh(); });
    const swatches = U.el("div", { class: "swatches" });
    for (const col of ["#b5483a", "#e3b54a", "#4f8a5b", "#6fa8d6", "#8a5fa8", "#7a6a4f", "#c8502c", "#3a3f8c"]) {
      swatches.appendChild(U.el("button", { class: "swatch", style: "background:" + col, "aria-label": "Colour " + col, onclick: () => { state.color = col; refresh(); } }));
    }
    const refresh = () => {
      state.name = nameIn.value;
      const d = state.abil || null;
      preview.innerHTML = "";
      const cv = U.el("canvas", { class: "portrait", width: 120, height: 120 });
      const probe = state.abil ? Rules.createPC({ name: state.name || "Recruit", race: state.race, cls: state.cls, align: state.align, color: state.color, abil: state.abil, spec: state.spec, foe: state.foe }) : null;
      if (probe) {
        Figs.portrait(cv, Figs.descChar(probe, Rules.derive(probe, 0)));
        preview.appendChild(cv);
        const dd = Rules.derive(probe, 0);
        preview.appendChild(U.el("p", { text: "STR " + Rules.strText(probe.str, probe.strx) + ", DEX " + probe.dex + ", CON " + probe.con + ", INT " + probe.int + ", WIS " + probe.wis + ", CHA " + probe.cha + "." }));
        preview.appendChild(U.el("p", { class: "muted", text: "Hit points " + probe.maxhp + " at level 1; THAC0 " + dd.thac0 + "." }));
      } else {
        preview.appendChild(U.el("p", { class: "muted", text: "Roll the abilities to see the preview." }));
      }
    };
    const reroll = () => {
      state.abil = null;
      let ok = false;
      state.abil = Rules.rollAbilities(state.race, state.cls);
      ok = true;
      refresh();
      return ok;
    };
    fill();
    nameIn.addEventListener("input", refresh);
    reroll();
    const body = U.el("div", { class: "creator" },
      U.el("label", {}, "Name ", nameIn),
      U.el("label", {}, "Race ", raceSel),
      U.el("label", {}, "Class ", clsSel),
      U.el("label", {}, "Alignment ", alignSel),
      U.el("label", {}, "Specialist weapon ", specSel),
      U.el("label", {}, "Favoured enemy ", foeSel),
      U.el("div", {}, U.el("span", { class: "muted", text: "Colour " }), swatches),
      preview,
    );
    return U.modal({ title: "Create a hero", body, wide: true, closable: true, actions: [
      { id: "reroll", label: "Roll again" },
      { id: "make", label: "Create", primary: true },
    ] }).then(async function handle(choice) {
      if (choice === "reroll") { reroll(); return U.modal({ title: "Create a hero", body, wide: true, actions: [{ id: "reroll", label: "Roll again" }, { id: "make", label: "Create", primary: true }] }).then(handle); }
      if (choice !== "make") return null;
      refresh();
      const name = nameIn.value.trim();
      if (!name) { U.toast("A hero needs a name."); return U.charCreator(); }
      if (name.length > 20) { U.toast("Names are up to twenty characters."); return U.charCreator(); }
      if (!Rules.raceAllowsClass(state.race, state.cls) || !Rules.alignAllowed(state.cls, state.align)) { U.toast("That combination is not allowed."); return U.charCreator(); }
      const c = Rules.createPC({ name, race: state.race, cls: state.cls, align: state.align, color: state.color, abil: state.abil, spec: state.cls === "F" ? state.spec : null, foe: state.cls === "R" ? state.foe : null });
      if (asm) asm.roster.push(c);
      const gold = Rules.dice(Rules.CLASSES[state.cls].gold) * 10;
      if (asm) asm.pendingGold = (asm.pendingGold || 0) + gold;
      const startLvl = modObj ? modObj.lvl : 1;
      if (startLvl > 1) {
        Campaign.kitFor(c, startLvl);
        for (let i = 1; i < startLvl; i++) Campaign.levelUp(c, true);
      }
      U.toast(c.name + " joins the roster.");
      if (asm) U.renderAssembly();
      return c;
    });
  };

  // ------------------------------------------------------------ misc ----
  U.refreshCommandsForTitle = () => {};
  U.pumpAll = () => U.refreshAll();

  return U;
})();
