"use strict";
/*
 * Survey maps. The minimap and the full map reflect only explored ground and
 * the company's own modifications. Unopened secrets, hidden bands and trap
 * positions are never labelled.
 */
const MapView = (() => {
  const M = {};
  let canvas = null;
  let ctx = null;
  const TERRAIN = {
    ".": "#5e8b4f", ",": "#4f7f45", "^": "#5a5f68", "~": "#2b5c8a", "=": "#9a8760", "+": "#8a6a3c",
    T: "#2f5e36", n: "#7f8a5a", "%": "#4d5b3d",
  };
  const SVC_COLOR = {
    inn: "#e0624a", temple: "#f0ece0", hall: "#7fa6ff", training: "#c9925a", general: "#7fd08a",
    armory: "#c7ccd4", apothecary: "#c58ae0", tavern: "#f0a34a",
  };

  M.init = (c) => {
    canvas = c;
    ctx = canvas.getContext("2d");
    canvas.addEventListener("click", () => M.openFull());
    return M;
  };

  // Paint onto a context of size w x h with the given map (local or overland).
  const paint = (g, w, h, big) => {
    g.fillStyle = "#0d0e13";
    g.fillRect(0, 0, w, h);
    const st = Game.G;
    const mapId = st.map;
    const map = Data.MAPS[mapId];
    if (!map) return;
    const H = map.grid.length, W = map.grid[0].length;
    const cell = Math.min(w / W, h / H);
    const ox = (w - W * cell) / 2, oy = (h - H * cell) / 2;
    const seen = (x, y) => Game.isSeen(mapId, W, H, x, y);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!seen(x, y)) continue;
        const ch = Game.cellAt(mapId, x, y);
        let col;
        if (map.overland) {
          col = TERRAIN[ch] || TERRAIN["."];
        } else {
          if (ch === "#" || ch === "H" || ch === "B") col = "#2a2c38";
          else if (ch === "D") col = "#9d7a4a";
          else if (ch === "L") col = "#b58a52";
          else if (ch === "<" || ch === ">") col = "#e3b54a";
          else if (ch === "G") col = "#c8502c";
          else if (ch >= "1" && ch <= "9") {
            const s = map.svc && map.svc[ch] ? map.svc[ch].svc : "hall";
            col = SVC_COLOR[s] || "#7fa6ff";
          } else if (ch === "T" || ch === "F") col = "#3f6a45";
          else col = "#3a3c48";
        }
        g.fillStyle = col;
        g.fillRect(ox + x * cell, oy + y * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }
    if (!map.overland) {
      // Markers: chests not yet opened, live bands seen, found traps, ground piles.
      for (const letter of Object.keys(map.ev || {})) {
        const ev = map.ev[letter];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          if (Game.cellAt(mapId, x, y) !== letter || !seen(x, y)) continue;
          const cx = ox + (x + 0.5) * cell, cy = oy + (y + 0.5) * cell;
          if (ev.chest && !Game.flag(mapId + ":" + letter)) {
            g.fillStyle = "#e3b54a";
            g.fillRect(cx - cell * 0.22, cy - cell * 0.22, cell * 0.44, cell * 0.44);
          } else if (ev.enc && Game.liveEnc(map, letter) && Game.flag("seen:" + mapId + ":" + letter)) {
            g.fillStyle = "#e05a4a";
            g.beginPath();
            g.moveTo(cx, cy - cell * 0.4);
            g.lineTo(cx + cell * 0.4, cy);
            g.lineTo(cx, cy + cell * 0.4);
            g.lineTo(cx - cell * 0.4, cy);
            g.closePath();
            g.fill();
          }
        }
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!seen(x, y)) continue;
        const ground = Game.groundAt(mapId, x, y);
        if (ground.length) {
          g.fillStyle = "#e6a0c4";
          g.beginPath();
          g.arc(ox + (x + 0.5) * cell, oy + (y + 0.5) * cell, cell * 0.22, 0, Math.PI * 2);
          g.fill();
        }
        const t = Game.trapAt(map, x, y);
        if (t && Game.flag("trap:" + mapId + ":" + x + "," + y) === "found") {
          g.strokeStyle = "#e05a4a";
          g.lineWidth = Math.max(1, cell * 0.12);
          const cx = ox + (x + 0.5) * cell, cy = oy + (y + 0.5) * cell;
          g.beginPath();
          g.moveTo(cx - cell * 0.3, cy - cell * 0.3);
          g.lineTo(cx + cell * 0.3, cy + cell * 0.3);
          g.moveTo(cx + cell * 0.3, cy - cell * 0.3);
          g.lineTo(cx - cell * 0.3, cy + cell * 0.3);
          g.stroke();
        }
      }
    } else {
      // Sites are labelled once seen.
      for (const k of Object.keys(map.sites || {})) {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          if (map.grid[y][x] !== k || !seen(x, y)) continue;
          g.fillStyle = "#e3b54a";
          g.font = Math.max(8, Math.floor(cell * 0.7)) + "px Georgia, serif";
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillText(k, ox + (x + 0.5) * cell, oy + (y + 0.5) * cell);
          if (big) {
            g.fillStyle = "#e9e2cf";
            g.font = "14px Georgia, serif";
            g.fillText(map.sites[k].name, ox + (x + 0.5) * cell, oy + (y + 0.5) * cell + cell * 0.9);
          }
        }
      }
    }
    // Party token.
    const px = ox + (st.x + 0.5) * cell, py = oy + (st.y + 0.5) * cell;
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const d = map.overland ? [0, 0] : dirs[st.dir];
    g.fillStyle = "#ffd27a";
    g.beginPath();
    if (map.overland) {
      g.arc(px, py, cell * 0.36, 0, Math.PI * 2);
    } else {
      g.moveTo(px + d[0] * cell * 0.55, py + d[1] * cell * 0.55);
      g.lineTo(px - d[1] * cell * 0.36, py + d[0] * cell * 0.36);
      g.lineTo(px + d[1] * cell * 0.36, py - d[0] * cell * 0.36);
    }
    g.closePath();
    g.fill();
    if (big) {
      g.fillStyle = "#e9e2cf";
      g.font = "16px Georgia, serif";
      g.textAlign = "left";
      g.textBaseline = "top";
      g.fillText(map.name, 12, 10);
    }
  };

  M.draw = () => {
    if (!ctx || !Game.G || !Game.X) return;
    paint(ctx, canvas.width, canvas.height, false);
  };

  // A larger survey with labels and a legend.
  M.openFull = () => {
    if (!Game.G) return;
    const c = document.createElement("canvas");
    c.width = 1840;
    c.height = 1100;
    c.className = "full-map";
    const g = c.getContext("2d");
    paint(g, c.width, c.height, true);
    const legend = UI.el("div", { class: "legend muted" });
    legend.textContent = "Gold square: unopened chest. Red diamond: a band seen. Pink dot: loot. Red cross: a found trap. Arrow or disc: the company.";
    const body = UI.el("div", {}, c, legend);
    return UI.modal({ title: "Survey", body, actions: [{ id: "close", label: "Close", primary: true }], wide: true });
  };

  return M;
})();
