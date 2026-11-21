"use strict";
/*
 * On-screen direction pads for touch play. Local views get a 2x3 pad
 * (turn, forward, strafe, back); the wilds get a 3x3 compass with Visit in
 * the centre. Buttons repeat while held, stop on release, leave or cancel,
 * and Visit never repeats. Placement cycles off -> right -> left -> both.
 */
const NavPad = (() => {
  const N = {};
  const KEY = "emberfall.navpad";
  const ORDER = ["off", "right", "left", "both"];
  let root = null;
  let mode = null;
  let placement = "off";
  let repeatTimer = null;

  const readPlacement = () => {
    try {
      const v = localStorage.getItem(KEY);
      if (ORDER.includes(v)) return v;
    } catch (e) { /* storage unavailable */ }
    return null;
  };
  const writePlacement = (v) => {
    try { localStorage.setItem(KEY, v); } catch (e) { /* storage unavailable */ }
  };

  const svg = (d) => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '" fill="currentColor"/></svg>';
  const ICON = {
    up: svg("M12 5l8 9h-5v6H9v-6H4z"),
    down: svg("M12 19l-8-9h5V4h6v6h5z"),
    left: svg("M5 12l9-8v5h6v6h-6v5z"),
    right: svg("M19 12l-9 8v-5H4V9h6V4z"),
    turnL: svg("M8 6l-4 4 4 4V11h6a4 4 0 010 8h-1v2h1a6 6 0 000-12H8z"),
    turnR: svg("M16 6l4 4-4 4V11h-6a4 4 0 000 8h1v2h-1a6 6 0 010-12h6z"),
    visit: svg("M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z"),
  };

  // Local pad 2x3: turn, forward, turn / strafe left, back, strafe right.
  const localButtons = () => [
    { label: "Turn left", icon: ICON.turnL, act: () => Game.turn(-1), repeat: true },
    { label: "Forward", icon: ICON.up, act: () => Game.stepForward(false), repeat: true },
    { label: "Turn right", icon: ICON.turnR, act: () => Game.turn(1), repeat: true },
    { label: "Strafe left", icon: ICON.left, act: () => Game.strafe(-1), repeat: true },
    { label: "Back", icon: ICON.down, act: () => Game.stepForward(true), repeat: true },
    { label: "Strafe right", icon: ICON.right, act: () => Game.strafe(1), repeat: true },
  ];
  // Wild compass 3x3 with Visit in the middle.
  const wildButtons = () => {
    const step = (dx, dy) => () => Over.step(dx, dy);
    return [
      { label: "North-west", text: "NW", act: step(-1, -1), repeat: true },
      { label: "North", text: "N", act: step(0, -1), repeat: true },
      { label: "North-east", text: "NE", act: step(1, -1), repeat: true },
      { label: "West", text: "W", act: step(-1, 0), repeat: true },
      { label: "Visit", icon: ICON.visit, act: () => Over.visit(), repeat: false },
      { label: "East", text: "E", act: step(1, 0), repeat: true },
      { label: "South-west", text: "SW", act: step(-1, 1), repeat: true },
      { label: "South", text: "S", act: step(0, 1), repeat: true },
      { label: "South-east", text: "SE", act: step(1, 1), repeat: true },
    ];
  };

  const stopRepeat = () => {
    if (repeatTimer) {
      clearInterval(repeatTimer);
      repeatTimer = null;
    }
  };

  const buttonEl = (b) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "pad-btn";
    el.setAttribute("aria-label", b.label);
    el.title = b.label;
    if (b.icon) el.innerHTML = b.icon;
    else el.textContent = b.text || "";
    const fire = () => { if (Game.mode === "combat") return; b.act(); };
    let holding = false;
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      holding = true;
      el.classList.add("on");
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      fire();
      if (b.repeat) {
        stopRepeat();
        repeatTimer = setInterval(() => { if (holding) fire(); }, 60);
      }
    });
    const release = () => {
      holding = false;
      el.classList.remove("on");
      stopRepeat();
    };
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("pointerleave", release);
    el.addEventListener("lostpointercapture", release);
    return el;
  };

  const render = () => {
    if (!root) return;
    root.innerHTML = "";
    const show = mode && placement !== "off" && Game.mode !== "combat";
    root.hidden = !show;
    root.dataset.side = placement;
    root.dataset.mode = mode || "";
    if (!show) return;
    const list = mode === "wild" ? wildButtons() : localButtons();
    const grid = document.createElement("div");
    grid.className = "pad " + (mode === "wild" ? "pad-wild" : "pad-local");
    for (const b of list) grid.appendChild(buttonEl(b));
    root.appendChild(grid);
    const tg = document.createElement("button");
    tg.type = "button";
    tg.className = "pad-toggle";
    tg.title = "Touch controls: " + placement;
    tg.setAttribute("aria-label", "Touch controls: " + placement + ". Tap to change.");
    tg.textContent = "✥";
    tg.addEventListener("click", () => N.cycle());
    root.appendChild(tg);
    root.classList.toggle("both", placement === "both");
  };

  N.init = () => {
    root = document.getElementById("navpad");
    const saved = readPlacement();
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    placement = saved || (coarse ? "right" : "off");
    window.addEventListener("blur", stopRepeat);
    window.addEventListener("pointerup", stopRepeat);
    render();
    return N;
  };
  N.setMode = (m) => {
    mode = m;
    render();
  };
  N.cycle = () => {
    const i = ORDER.indexOf(placement);
    placement = ORDER[(i + 1) % ORDER.length];
    writePlacement(placement);
    render();
  };
  N.placement = () => placement;
  N.refresh = () => render();

  return N;
})();
