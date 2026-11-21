"use strict";
/*
 * Procedural figures. One descriptor per character or creature; the same
 * likeness is used on sheets, in encounter cards, in the raycast view, on
 * the overland map and in battle. Everything is drawn with Canvas 2D primitives.
 */
const Figs = (() => {
  const F = {};
  const texCache = new Map();

  const SKIN = { human: "#d9a77f", dwarf: "#c98f63", elf: "#e7c6a6", gnome: "#c9a178", "half-elf": "#dcb08c", halfling: "#d8a57d" };
  const HAIR = ["#3a2a1e", "#6b4a2b", "#b8843f", "#d8d2c4", "#2b2b33", "#8c2d1e"];

  // Deterministic pick from a string so the same character always looks the same.
  const pickFrom = (list, seed) => list[Math.abs(seed) % list.length];
  const hashStr = (s) => {
    let h = 2166136261 >>> 0;
    const str = String(s || "");
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  };

  // Descriptor for a player character.
  F.descChar = (c, derived) => {
    const seed = hashStr(c.id + c.name);
    const armor = derived && derived.armor ? derived.armor : null;
    const shield = derived && derived.shield ? derived.shield : null;
    const weapon = derived && derived.weapon ? derived.weapon : null;
    const skin = SKIN[c.race] || "#d9a77f";
    const hair = pickFrom(HAIR, seed >>> 3);
    let cloth = c.color || "#8a5a3c";
    if (c.cls === "M") cloth = "#3a3f8c";
    const armorName = armor ? armor.id : "";
    const hasHeavy = /chain|plate|banded|splint|ring|scale/.test(armorName);
    const helm = c.cls === "F" || c.cls === "P" ? "helm" : c.cls === "M" ? "hat" : c.cls === "C" ? "coif" : c.cls === "T" ? "hood" : "cap";
    return {
      kind: "humanoid",
      build: c.race === "dwarf" || c.race === "gnome" || c.race === "halfling" ? "small" : "std",
      skin,
      hair,
      cloth,
      armor: hasHeavy ? "#9aa3ad" : armor ? "#8b6a45" : cloth,
      trim: c.cls === "P" ? "#e3b54a" : c.cls === "C" ? "#eeeeee" : "#2b2b33",
      helm,
      weapon: weapon ? (weapon.kind === "missile" || weapon.family === "bow" ? "bow" : weapon.family === "staff" ? "staff" : weapon.family === "mace" ? "mace" : "sword") : null,
      shield: shield ? "round" : null,
      cape: c.cls === "M" ? "#2b2f6b" : null,
      wings: null,
    };
  };

  // Descriptor for a creature from its catalogue record and a seed.
  F.descMon = (m, n) => {
    const tags = m.tags || [];
    let color = "#7a7a7a";
    let kind = "humanoid";
    if (tags.includes("kobold")) color = "#6c8a3a";
    else if (tags.includes("goblinoid") || tags.includes("orc")) color = "#58703a";
    else if (tags.includes("gnoll")) color = "#8a7040";
    else if (tags.includes("undead")) color = "#b7b9a5";
    else if (tags.includes("giant") || tags.includes("troll")) color = "#6e7f5a";
    else if (tags.includes("demon") || tags.includes("devil")) color = "#8a2d2d";
    else if (tags.includes("witch")) color = "#3d3366";
    else if (tags.includes("cultist")) color = "#4a2a4a";
    else if (tags.includes("bandit")) color = "#6a5a4a";
    if (tags.includes("boss") || m.leader) color = "#c8502c";
    const f = m.fig || "humanoid";
    if (f === "rat") kind = "rat";
    else if (f === "spider") kind = "spider";
    else if (f === "centipede") kind = "centipede";
    else if (f === "wolf") kind = "wolf";
    else if (f === "insect") kind = "insect";
    else if (f === "bird") kind = "bird";
    else if (f === "beast") kind = "beast";
    else if (f === "dragon") kind = "dragon";
    else if (f === "blob") kind = "blob";
    else if (f === "serpent") kind = "serpent";
    else if (f === "orb") kind = "orb";
    const big = m.size === "L" || m.size === "H" || m.size === "G" ? 1.35 : m.size === "S" ? 0.75 : 1;
    return {
      kind,
      color,
      size: big,
      tag: n || null,
      undead: tags.includes("undead"),
      leader: !!m.leader,
      eye: tags.includes("undead") ? "#9ef0ff" : "#ffd27a",
      seed: hashStr(m.id),
    };
  };

  // Draw a humanoid facing the viewer. (x,y) is the feet centre; h is the figure height.
  const humanoid = (ctx, d, x, y, h, o) => {
    const s = h / 100;
    const sm = d.build === "small" ? 0.86 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * sm, s * sm);
    if (o.flip) ctx.scale(-1, 1);
    // cape
    if (d.cape) {
      ctx.fillStyle = d.cape;
      ctx.beginPath();
      ctx.moveTo(-18, -62);
      ctx.lineTo(18, -62);
      ctx.lineTo(24, -6);
      ctx.lineTo(-24, -6);
      ctx.closePath();
      ctx.fill();
    }
    // legs
    ctx.fillStyle = d.cloth && d.cloth !== "#3a3f8c" ? "#3d3324" : "#2e2a38";
    ctx.fillRect(-11, -30, 9, 30);
    ctx.fillRect(2, -30, 9, 30);
    // boots
    ctx.fillStyle = "#2b1d14";
    ctx.fillRect(-12, -3, 11, 4);
    ctx.fillRect(1, -3, 11, 4);
    // torso
    ctx.fillStyle = d.armor || d.cloth;
    ctx.beginPath();
    ctx.moveTo(-16, -56);
    ctx.lineTo(16, -56);
    ctx.lineTo(13, -28);
    ctx.lineTo(-13, -28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = d.trim;
    ctx.lineWidth = 2;
    ctx.stroke();
    // belt
    ctx.fillStyle = "#4a3320";
    ctx.fillRect(-13, -32, 26, 4);
    // arms
    ctx.fillStyle = d.armor || d.cloth;
    ctx.fillRect(-23, -54, 8, 26);
    ctx.fillRect(15, -54, 8, 26);
    ctx.fillStyle = d.skin;
    ctx.fillRect(-23, -30, 8, 6);
    ctx.fillRect(15, -30, 8, 6);
    // head
    ctx.fillStyle = d.skin;
    ctx.beginPath();
    ctx.arc(0, -68, 11, 0, Math.PI * 2);
    ctx.fill();
    if (!d.undead && d.kind === "humanoid" && d.skin === undefined) {
      // nothing
    }
    // hair or helm
    if (d.helm) {
      ctx.fillStyle = d.helm === "helm" ? "#9aa3ad" : d.helm === "hat" ? "#2b2f6b" : d.helm === "hood" ? "#3a3a3a" : d.helm === "coif" ? "#b9bec6" : "#6b4a2b";
      ctx.beginPath();
      if (d.helm === "hat") {
        ctx.moveTo(-12, -74);
        ctx.lineTo(12, -74);
        ctx.lineTo(0, -98);
        ctx.closePath();
      } else {
        ctx.arc(0, -70, 12.5, Math.PI, 0);
      }
      ctx.fill();
    } else if (d.hair) {
      ctx.fillStyle = d.hair;
      ctx.beginPath();
      ctx.arc(0, -72, 12, Math.PI, 0);
      ctx.fill();
    }
    // eyes
    ctx.fillStyle = d.undead ? "#9ef0ff" : d.eye || "#222";
    ctx.fillRect(-5, -68, 3, 2);
    ctx.fillRect(2, -68, 3, 2);
    if (o.hurt) {
      ctx.fillStyle = "rgba(200,40,40,0.45)";
      ctx.fillRect(-24, -100, 48, 100);
    }
    // weapon and shield
    if (d.weapon === "sword" || d.weapon === "mace") {
      ctx.strokeStyle = d.weapon === "mace" ? "#6c6c6c" : "#cfd6dd";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(22, -40);
      ctx.lineTo(34, -92);
      ctx.stroke();
    } else if (d.weapon === "staff") {
      ctx.strokeStyle = "#8a6038";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(22, -4);
      ctx.lineTo(24, -100);
      ctx.stroke();
      ctx.fillStyle = "#9bd0ff";
      ctx.beginPath();
      ctx.arc(24, -102, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.weapon === "bow") {
      ctx.strokeStyle = "#8a6038";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-26, -58, 22, -1.2, 1.2);
      ctx.stroke();
    }
    if (d.shield) {
      ctx.fillStyle = "#7d8a95";
      ctx.beginPath();
      ctx.arc(-24, -46, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2b2b33";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  };

  // Simple creature silhouettes. Each is drawn around (0,0) with height 100.
  const beast = (ctx, d) => {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.ellipse(0, -36, 34, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(34, -48, 14, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2b2b33";
    for (const x of [-24, -6, 14, 26]) ctx.fillRect(x, -22, 6, 22);
    ctx.fillStyle = d.eye;
    ctx.fillRect(38, -52, 3, 3);
  };
  const wolf = (ctx, d) => {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.ellipse(0, -38, 32, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(26, -44);
    ctx.lineTo(42, -58);
    ctx.lineTo(44, -40);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#4a4a4a";
    for (const x of [-22, -8, 10, 22]) ctx.fillRect(x, -26, 5, 26);
    ctx.strokeStyle = d.color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-30, -44);
    ctx.quadraticCurveTo(-54, -54, -48, -70);
    ctx.stroke();
    ctx.fillStyle = d.eye;
    ctx.fillRect(36, -48, 3, 3);
  };
  const rat = (ctx, d) => {
    ctx.strokeStyle = "#8c7f73";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-30, -14);
    ctx.quadraticCurveTo(-50, -4, -44, -30);
    ctx.stroke();
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.ellipse(0, -18, 26, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(26, -26, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e5b8b0";
    ctx.beginPath();
    ctx.arc(30, -32, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = d.eye;
    ctx.fillRect(30, -28, 2, 2);
  };
  const spider = (ctx, d) => {
    ctx.strokeStyle = d.color;
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const a = -0.6 + i * 0.4;
      ctx.beginPath();
      ctx.moveTo(-10, -30);
      ctx.lineTo(-40, -30 - 30 * Math.sin(a + 0.5));
      ctx.lineTo(-54, -10 + i * 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(10, -30);
      ctx.lineTo(40, -30 - 30 * Math.sin(a + 0.5));
      ctx.lineTo(54, -10 + i * 8);
      ctx.stroke();
    }
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.ellipse(0, -36, 20, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -62, 11, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff4d4d";
    for (const x of [-4, 4, -8, 8]) ctx.fillRect(x - 1, -66, 2, 2);
  };
  const centipede = (ctx, d) => {
    ctx.fillStyle = d.color;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(-40 + i * 14, -20, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#c9b38a";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(-40 + i * 14, -28);
      ctx.lineTo(-40 + i * 14 - 4, -40);
      ctx.moveTo(-40 + i * 14, -12);
      ctx.lineTo(-40 + i * 14 + 4, 0);
      ctx.stroke();
    }
    ctx.fillStyle = "#ff8a5b";
    ctx.beginPath();
    ctx.arc(46, -22, 6, 0, Math.PI * 2);
    ctx.fill();
  };
  const insect = (ctx, d) => {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.ellipse(0, -28, 28, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-30, -28, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2;
    for (const x of [-18, -4, 10, 22]) {
      ctx.beginPath();
      ctx.moveTo(x, -14);
      ctx.lineTo(x - 8, 0);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-40, -36);
    ctx.lineTo(-52, -54);
    ctx.moveTo(-40, -20);
    ctx.lineTo(-52, -6);
    ctx.stroke();
  };
  const bird = (ctx, d) => {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.ellipse(0, -46, 16, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-12, -54);
    ctx.lineTo(-56, -84);
    ctx.lineTo(-30, -44);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, -54);
    ctx.lineTo(56, -84);
    ctx.lineTo(30, -44);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = d.eye;
    ctx.fillRect(-4, -62, 3, 3);
    ctx.fillRect(2, -62, 3, 3);
    ctx.fillStyle = "#2b2b33";
    ctx.fillRect(-2, -54, 4, 8);
    ctx.fillRect(-10, -8, 4, 8);
    ctx.fillRect(6, -8, 4, 8);
  };
  const dragon = (ctx, d) => {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.moveTo(-4, -46);
    ctx.lineTo(-54, -92);
    ctx.lineTo(-30, -40);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -40, 34, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(40, -58, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffcc66";
    ctx.fillRect(48, -62, 3, 3);
  };
  const blob = (ctx, d) => {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.ellipse(0, -30, 34, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.fillRect(-12, -38, 4, 4);
    ctx.fillRect(8, -38, 4, 4);
  };
  const serpent = (ctx, d) => {
    ctx.strokeStyle = d.color;
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-40, -6);
    ctx.quadraticCurveTo(-20, -60, 0, -20);
    ctx.quadraticCurveTo(20, 20, 40, -40);
    ctx.stroke();
    ctx.lineCap = "butt";
  };
  const orb = (ctx, d) => {
    const g = ctx.createRadialGradient(0, -40, 4, 0, -40, 40);
    g.addColorStop(0, d.color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, -40, 40, 0, Math.PI * 2);
    ctx.fill();
  };

  const creatureDraw = { rat, spider, centipede, wolf, insect, bird, beast, dragon, blob, serpent, orb };

  // Draw any figure with its base at (x,y) and height h.
  F.draw = (ctx, d, x, y, h, o = {}) => {
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (d.kind === "humanoid") {
      humanoid(ctx, d, x, y, h, o);
    } else {
      const s = (h / 100) * (d.size || 1);
      ctx.translate(x, y);
      ctx.scale(s, s);
      if (o.flip) ctx.scale(-1, 1);
      const fn = creatureDraw[d.kind] || beast;
      fn(ctx, d);
      if (o.hurt) {
        ctx.fillStyle = "rgba(200,40,40,0.4)";
        ctx.fillRect(-50, -100, 100, 100);
      }
    }
    ctx.restore();
  };

  // Cached sprite canvas for a figure (used by billboards and tokens).
  F.tex = (d, px = 128) => {
    const key = JSON.stringify(d) + "|" + px;
    if (texCache.has(key)) return texCache.get(key);
    const c = document.createElement("canvas");
    c.width = px;
    c.height = px;
    const ctx = c.getContext("2d");
    const h = px * 0.86;
    F.draw(ctx, d, px / 2, px * 0.94, h, {});
    if (texCache.size > 600) texCache.clear();
    texCache.set(key, c);
    return c;
  };

  // A bust portrait for sheets and cards.
  F.portrait = (canvas, d, bg) => {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, bg || "#2a2c38");
    g.addColorStop(1, "#11121a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.58, h * 0.44, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(227,181,74,0.10)";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    // Scale the full figure so the head and shoulders read in a small box.
    if (d.kind === "humanoid") {
      ctx.save();
      ctx.translate(w / 2, h * 1.02);
      ctx.scale(h / 160, h / 160);
      ctx.translate(0, 0);
      humanoid(ctx, d, 0, 0, 100, {});
      ctx.restore();
    } else {
      F.draw(ctx, d, w / 2, h * 0.88, h * 0.7, {});
    }
    return canvas;
  };

  return F;
})();

