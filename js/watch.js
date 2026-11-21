"use strict";
/*
 * The watch: where the set battles stand, whether the company can see them,
 * whether they notice, and who is surprised. Nothing here draws or rolls
 * encounters on its own; game.js acts on the events returned.
 */
const Watch = (() => {
  const Wt = {};
  const OPAQUE = (c) => c === "#" || c === "H" || c === "B" || c === "S" || c === "D" || c === "L" || c === "G" || (c >= "1" && c <= "9");
  const SIGHT = 9.5;
  const NOTICE = 6.5;
  const SPRING = 1.5;

  // Tile positions of every event letter on a map (cached per map object).
  Wt.positions = (map) => {
    if (map.__pos) return map.__pos;
    const pos = {};
    for (let y = 0; y < map.grid.length; y++) {
      for (let x = 0; x < map.grid[y].length; x++) {
        const ch = map.grid[y][x];
        if (map.ev && map.ev[ch]) {
          if (!pos[ch]) pos[ch] = [];
          pos[ch].push([x, y]);
        }
      }
    }
    Object.defineProperty(map, "__pos", { value: pos, enumerable: false, writable: true });
    return pos;
  };

  // Line of sight by Bresenham: opaque cells block, endpoints never do.
  Wt.los = (cellAt, x0, y0, x1, y1) => {
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0, y = y0;
    let guard = 0;
    while (guard++ < 200) {
      if (x === x1 && y === y1) return true;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
      if (x === x1 && y === y1) return true;
      if (OPAQUE(cellAt(x, y))) return false;
    }
    return false;
  };

  // Events for the current position. Returns a list ordered by urgency.
  Wt.check = (map, G, X, cellAt) => {
    const out = [];
    const pos = Wt.positions(map);
    const { x: px, y: py } = G;
    for (const letter of Object.keys(pos)) {
      const ev = map.ev[letter];
      if (!ev || !ev.enc) continue;
      if (!Game.liveEnc(map, letter)) continue;
      for (const [bx, by] of pos[letter]) {
        const dist = Math.hypot(bx - px, by - py);
        if (ev.enc.hidden) {
          if (dist <= SPRING) out.push({ kind: "spring", letter, ev, dist });
          continue;
        }
        if (dist > SIGHT) continue;
        if (!Wt.los(cellAt, px, py, bx, by)) continue;
        Game.G.flags["seen:" + map.id + ":" + letter] = true;
        if (!X.sighted[letter]) {
          out.push({ kind: "sight", letter, ev, dist });
          continue;
        }
        if (dist <= NOTICE) {
          // A band that has been avoided still risks notice on each step within range.
          if (!X.unaware[letter] || Rules.die(100) <= 40) out.push({ kind: "notice", letter, ev, dist });
        }
      }
    }
    return out;
  };

  // Surprise on d6 per side: 1-2 surprises. Both or neither means no advantage.
  Wt.surprise = (partyBonus, enemyBonus) => {
    const p = Rules.die(6) + (partyBonus || 0) <= 2;
    const e = Rules.die(6) + (enemyBonus || 0) <= 2;
    if (p && e) return "none";
    if (e) return "enemy";
    if (p) return "party";
    return "none";
  };

  return Wt;
})();
