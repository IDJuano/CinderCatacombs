'use strict';
// Iconos procedurales (Path2D) y HUD: orbes de vida/maná (Diablo II), retrato 3D, panel de unidad, cinturón de
// habilidades con recarga circular, minimapa enmarcado, barra de recursos y barra de jefe (Warcraft III).
(function (G) {
  const $ = (s, r = document) => r.querySelector(s);
  const hex = (h) => '#' + (h & 0xffffff).toString(16).padStart(6, '0');

  // ---------------------------------------------------------------- iconos
  const GLYPH = {
    fire: [{ d: 'M16 2C22 9 27 14 25 22C24 27 20 30 16 30C11 30 7 27 7 21C7 16 10 13 12 10C12 14 13 16 15 17C14 11 14 7 16 2Z', f: 1 }, { d: 'M16 16C20 20 20 24 18 26C16 28 13 27 13 24C13 21 15 19 16 16Z', f: 2 }],
    dash: [{ d: 'M5 6L13 16L5 26M12 6L20 16L12 26M19 6L27 16L19 26', s: 3.6 }],
    shield: [{ d: 'M16 3L27 7V16C27 23 22 27 16 29C10 27 5 23 5 16V7Z', f: 1 }, { d: 'M16 7L23 10V16C23 21 20 24 16 25Z', f: 2 }],
    nova: [{ d: 'M16 2L19 12L29 9L22 17L30 22L19 22L16 31L13 22L2 22L10 17L3 9L13 12Z', f: 1 }, { d: 'M16 10L18 15L23 16L18 18L16 24L14 18L9 16L14 15Z', f: 2 }],
    claws: [{ d: 'M7 4L13 27M15 3L21 27M23 5L28 27', s: 3.4 }],
    drop: [{ d: 'M16 3C22 11 26 16 26 21C26 26.5 21.5 30 16 30C10.5 30 6 26.5 6 21C6 16 10 11 16 3Z', f: 1 }, { d: 'M12 19C12 22 13 24 15 25', s: 2, l: 1 }],
    horn: [{ d: 'M4 12L20 5V27L4 20Z', f: 1 }, { d: 'M23 10C27 13 27 19 23 22', s: 2.6 }, { d: 'M7 13V19', s: 2, l: 1 }],
    whirl: [{ d: 'M16 5C25 5 29 14 22 19C17 23 9 20 10 13C11 9 17 9 18 12', s: 3.2 }, { d: 'M24 23L29 28M24 28L29 23', s: 2.4 }],
    charge: [{ d: 'M3 16H21M15 8L27 16L15 24M4 9H11M4 23H11', s: 3.2 }],
    frost: [{ d: 'M16 2V30M3 9L29 23M3 23L29 9M12 5L16 9L20 5M12 27L16 23L20 27', s: 2.6 }],
    hex: [{ d: 'M16 3L27 9.5V22.5L16 29L5 22.5V9.5Z', f: 1 }, { d: 'M16 9L22 12.5V19.5L16 23L10 19.5V12.5Z', f: 2 }],
    arrows: [{ d: 'M8 29V9M16 29V5M24 29V9', s: 2.6 }, { d: 'M4.5 13L8 6L11.5 13ZM12.5 10L16 3L19.5 10ZM20.5 13L24 6L27.5 13Z', f: 1 }],
    rain: [{ d: 'M8 15C3 15 3 8 9 8C10 3 19 3 21 8C27 7 28 15 22 15Z', f: 1 }, { d: 'M10 19L8 27M16 19L14 29M22 19L20 27', s: 2.6, l: 1 }],
    wind: [{ d: 'M3 11H20C26 11 26 4 20 4M3 17H25C31 17 31 25 24 25M3 23H13', s: 2.8 }],
    moon: [{ d: 'M21 3C11 4 5 12 8 21C11 28 20 31 27 26C17 25 12 18 15 11C16 8 18 5 21 3Z', f: 1 }],
    flask: [{ d: 'M12 3H20V10L26 25C27.5 28.5 25 30 22 30H10C7 30 4.5 28.5 6 25L12 10Z', f: 1 }, { d: 'M9 22H23L25 27C25.5 28.5 24 29 22 29H10C8 29 6.5 28.5 7 27Z', f: 2 }, { d: 'M12 3H20', s: 2.4, l: 1 }],
    cloud: [{ d: 'M8 25C2 25 2 16 9 16C9 9 21 8 23 15C30 15 30 25 23 25Z', f: 1 }, { d: 'M10 21C12 19 15 19 17 21', s: 2, l: 1 }],
    smite: [{ d: 'M16 2L19.5 17H12.5Z', f: 1 }, { d: 'M8 17H24V20.5H8ZM14.2 20.5H17.8V29H14.2Z', f: 1 }, { d: 'M4 6L8 9M28 6L24 9', s: 2.2, l: 1 }],
    sun: [{ d: 'M16 9A7 7 0 1 0 16.01 9Z', f: 1 }, { d: 'M16 2V6M16 26V30M2 16H6M26 16H30M6 6L9 9M23 23L26 26M26 6L23 9M9 23L6 26', s: 2.6 }],
    cross: [{ d: 'M13 3H19V12H28V18H19V29H13V18H4V12H13Z', f: 1 }, { d: 'M16 6V26M7 15H25', s: 1.6, l: 1 }],
    heart: [{ d: 'M16 29C6 21 3 15 3 10.5C3 6 6.5 3.5 10 3.5C13 3.5 15 5 16 7.5C17 5 19 3.5 22 3.5C25.5 3.5 29 6 29 10.5C29 15 26 21 16 29Z', f: 1 }, { d: 'M16 11V21M11 16H21', s: 2.6, l: 1 }],
    stone: [{ d: 'M6 22L4 12L11 5L21 4L28 11L27 22L18 29L9 28Z', f: 1 }, { d: 'M11 5L14 15L22 12M14 15L12 26M22 12L27 22', s: 1.6, l: 1 }],
    eye: [{ d: 'M2 16C8 6 24 6 30 16C24 26 8 26 2 16Z', f: 1 }, { d: 'M16 10.5A5.5 5.5 0 1 0 16.01 10.5Z', f: 2 }, { d: 'M16 13.5A2.5 2.5 0 1 0 16.01 13.5Z', f: 3 }],
    bolt: [{ d: 'M19 2L6 18H15L11 30L26 12H17Z', f: 1 }],
    skull: [{ d: 'M16 3C8 3 5 9 5 14C5 18 7 20 9 21V27H23V21C25 20 27 18 27 14C27 9 24 3 16 3Z', f: 1 }, { d: 'M9 12A3.3 3.3 0 1 0 9.01 12ZM17.5 12A3.3 3.3 0 1 0 17.51 12ZM14.5 18H17.5L16 21Z', f: 3 }],
    bomb: [{ d: 'M14 29A10 10 0 1 1 14.01 29Z', f: 1 }, { d: 'M19 10L23 5M23 5L27 3', s: 2.4 }, { d: 'M26 2L29 4L27 7Z', f: 2 }],
    scroll: [{ d: 'M7 4H25C28 4 28 9 25 9V25C25 28.5 22 29 20 29H7C4 29 4 24 7 24V4Z', f: 1 }, { d: 'M11 11H21M11 16H21M11 21H18', s: 1.8, l: 1 }],
    book: [{ d: 'M4 5H16V27H4ZM16 5H28V27H16Z', f: 1 }, { d: 'M7 10H13M7 14H13M19 10H25M19 14H25', s: 1.6, l: 1 }],
    sword: [{ d: 'M27 3L29 5L29 8L14 22L10 18L24 4Z', f: 1 }, { d: 'M8 17L15 24L12 27L5 20ZM6 22L3 29L10 26Z', f: 2 }],
    staff: [{ d: 'M5 29L21 13', s: 3 }, { d: 'M23 3A5.5 5.5 0 1 0 23.01 3Z', f: 1 }],
    bow: [{ d: 'M9 3C27 8 27 24 9 29', s: 3 }, { d: 'M9 3V29', s: 1.2, l: 1 }, { d: 'M9 16H25', s: 1.6 }],
    dagger: [{ d: 'M26 3L29 6L16 19L12 15Z', f: 1 }, { d: 'M9 15L16 22L13 25L6 18ZM7 21L4 29L11 26Z', f: 2 }],
    mace: [{ d: 'M6 28L18 16', s: 3.2 }, { d: 'M21 4A7 7 0 1 0 21.01 4Z', f: 1 }, { d: 'M21 1V4M28 11H25M26 5L24 7M16 5L18 7', s: 1.8, l: 1 }],
    armor: [{ d: 'M10 4L3 9L6 15L10 13V28H22V13L26 15L29 9L22 4L19 6H13Z', f: 1 }, { d: 'M16 8V26', s: 1.6, l: 1 }],
    amulet: [{ d: 'M6 3C6 14 11 18 16 18C21 18 26 14 26 3', s: 2 }, { d: 'M16 15L22 22L16 30L10 22Z', f: 1 }, { d: 'M16 19L18.5 22L16 26L13.5 22Z', f: 3 }],
    gem: [{ d: 'M16 29L3 12L9 4H23L29 12Z', f: 1 }, { d: 'M3 12H29M9 4L16 29M23 4L16 29M12 12L16 4L20 12', s: 1.4, l: 1 }],
    chest: [{ d: 'M3 12C3 6 29 6 29 12V27H3Z', f: 1 }, { d: 'M3 15H29M14 14H18V20H14Z', s: 1.8, l: 1 }],
    coin: [{ d: 'M16 3A13 13 0 1 0 16.01 3Z', f: 1 }, { d: 'M16 8A8 8 0 1 0 16.01 8Z', s: 2, l: 1 }, { d: 'M14 12H18M14 20H18M16 11V21', s: 1.8, l: 1 }],
    goblet: [{ d: 'M7 3H25C25 14 21 18 17.5 19V25H23V29H9V25H14.5V19C11 18 7 14 7 3Z', f: 1 }],
    ore: [{ d: 'M4 22L9 10L16 6L25 9L29 20L22 28L9 28Z', f: 1 }, { d: 'M9 10L14 17L25 9M14 17L9 28M14 17L22 28', s: 1.4, l: 1 }],
    bone: [{ d: 'M6 22C2 22 2 27 6 27C7 30.5 12 30 12 26L23 15C27 15 30 12 28 9C31 7 29 2 25 4C23 1 18 2 19 6L8 17C5 17 4 20 6 22Z', f: 1 }],
    leather: [{ d: 'M5 6L11 4L16 7L21 4L27 6L26 14L28 20L25 28L7 28L4 20L6 14Z', f: 1 }, { d: 'M10 12V22M22 12V22', s: 1.2, l: 1 }],
    crown: [{ d: 'M4 24L3 9L10 15L16 5L22 15L29 9L28 24Z', f: 1 }, { d: 'M4 27H28', s: 3 }],
    ring: [{ d: 'M16 27A10 10 0 1 1 16.01 27Z', s: 4 }, { d: 'M16 3L21 9L16 13L11 9Z', f: 1 }],
    hammer: [{ d: 'M8 28L20 14', s: 3.4 }, { d: 'M14 3H28V12H14Z', f: 1 }],
  };
  const SKILL = {
    pot_vida: ['flask', 0xd0302f], pot_vida_g: ['flask', 0xff4a3a], pot_mana: ['flask', 0x3a63e8], bomba: ['bomb', 0x7a7a88], perg_luz: ['scroll', 0xf0e0a0],
    sk_bola: ['fire', 0xff7a2a], sk_zanc: ['dash', 0x7ad0ff], sk_escudo: ['shield', 0xffd34a], sk_nova: ['nova', 0xff9a3a], sk_furia: ['claws', 0xe03a2a], sk_pacto: ['drop', 0xd01a2a],
    sk_grito: ['horn', 0xffc060], sk_remolino: ['whirl', 0xc8d0e0], sk_carga: ['charge', 0xff8a4a], sk_escarcha: ['frost', 0x7ad8ff], sk_barrera: ['hex', 0x5ae6ff],
    sk_triple: ['arrows', 0x9ae07a], sk_lluvia: ['rain', 0x8ac0ff], sk_evasion: ['wind', 0xb0e0ff], sk_sombra: ['moon', 0x9a7ae0], sk_venenoD: ['flask', 0x5cff6a],
    sk_humo: ['cloud', 0xaab0c0], sk_castigo: ['smite', 0xffe27a], sk_bendicion: ['sun', 0xffe27a], sk_luz: ['cross', 0xfff0b0], sk_heal: ['heart', 0xff6a8a],
    sk_piel: ['stone', 0xa8a090], sk_clari: ['eye', 0xc080ff], sk_prisa: ['bolt', 0xffe040], sk_maldicion: ['skull', 0xa050d0], sk_hielo: ['frost', 0x9ae8ff],
    t_copa: ['goblet', 0xe0e4ea], t_relic: ['chest', 0xb09060], t_gema: ['gem', 0x6a5a8a], t_anillo: ['ring', 0xffd34a], t_corona: ['crown', 0xe8b030], t_ambar: ['gem', 0xe09a30],
    t_daga: ['dagger', 0xc8d0da], t_broche: ['amulet', 0xd6aa4f], t_cetro: ['staff', 0xd6aa4f],
    mat_hierro: ['ore', 0x7a7e88], mat_cuero: ['leather', 0x9a6a3a], mat_hueso: ['bone', 0xe0d8c0], mat_esencia: ['fire', 0xff9a3a], mat_gema: ['gem', 0x5ae6ff],
  };
  const STAT = { fue: 0xe0553a, des: 0x6adf5a, con: 0xe0903a, int: 0x5a8cff, sab: 0xb070e0, car: 0xff9ac0 };
  const TIERCOL = [0x9a9486, 0x6f8cff, 0xffe060, 0xff9a2a];
  const WGLYPH = { G: 'sword', M: 'staff', A: 'bow', P: 'dagger', C: 'mace' };
  G.tierCol = (t) => TIERCOL[G.clamp((t | 0) - 1, 0, 3)];
  G.iconKey = (id) => {
    if (SKILL[id]) return SKILL[id];
    if (id.startsWith('elix_')) return ['flask', STAT[id.slice(5)] || 0xffffff];
    if (id.startsWith('tomo_')) return ['book', STAT[id.slice(5)] || 0xffffff];
    const t = +id[1] || 1, cl = id[id.length - 1];
    if (id[0] === 'w') return [WGLYPH[cl] || 'sword', TIERCOL[t - 1], TIERCOL[t - 1]];
    if (id[0] === 'a') return ['armor', TIERCOL[t - 1], TIERCOL[t - 1]];
    if (id[0] === 'm') return ['amulet', TIERCOL[t - 1], TIERCOL[t - 1]];
    return ['gem', 0xcccccc];
  };
  const iconCache = new Map();
  G.iconURL = (key, col, rim, size = 64) => {
    const k = key + ':' + col + ':' + (rim || 0) + ':' + size;
    if (iconCache.has(k)) return iconCache.get(k);
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), s = size / 32;
    const bg = x.createRadialGradient(size * 0.5, size * 0.4, size * 0.05, size * 0.5, size * 0.5, size * 0.75);
    bg.addColorStop(0, hex(G.shade(col, 0.34))); bg.addColorStop(1, '#0a0806');
    x.fillStyle = bg; x.fillRect(0, 0, size, size);
    x.scale(s, s);
    const lo = hex(G.shade(col, 0.62)), hi = hex(G.shade(col, 1.35)), mid = hex(col);
    for (const p of GLYPH[key] || GLYPH.gem) {
      const path = new Path2D(p.d); x.lineJoin = 'round'; x.lineCap = 'round';
      if (p.f) { const g = x.createLinearGradient(0, 2, 0, 30); g.addColorStop(0, p.f === 2 ? '#fff6d0' : hi); g.addColorStop(1, p.f === 3 ? '#201810' : p.f === 2 ? hex(G.shade(col, 1.2)) : lo); x.fillStyle = g; x.fill(path); x.lineWidth = 1.1; x.strokeStyle = 'rgba(0,0,0,.55)'; x.stroke(path); }
      if (p.s) { x.lineWidth = p.s + 1.6; x.strokeStyle = 'rgba(0,0,0,.6)'; x.stroke(path); x.lineWidth = p.s; x.strokeStyle = p.l ? '#fff6d8' : mid; x.stroke(path); }
    }
    x.setTransform(1, 0, 0, 1, 0, 0);
    const vg = x.createRadialGradient(size / 2, size / 2, size * 0.35, size / 2, size / 2, size * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); x.fillStyle = vg; x.fillRect(0, 0, size, size);
    if (rim) { x.lineWidth = size * 0.07; x.strokeStyle = hex(rim); x.strokeRect(size * 0.035, size * 0.035, size * 0.93, size * 0.93); }
    const u = c.toDataURL(); iconCache.set(k, u); return u;
  };
  G.iconFor = (id, size) => { const [k, c, r] = G.iconKey(id); return G.iconURL(k, c, r, size); };
  G.icon = (key, col, size) => G.iconURL(key, col, 0, size);

  // ---------------------------------------------------------------- orbes
  function drawOrb(ctx, size, frac, kind, t) {
    const r = size / 2, life = kind === 'life'; ctx.clearRect(0, 0, size, size);
    ctx.save(); ctx.beginPath(); ctx.arc(r, r, r - 1, 0, 6.2832); ctx.clip();
    const bg = ctx.createRadialGradient(r * 0.8, r * 0.7, r * 0.05, r, r, r); bg.addColorStop(0, life ? '#2c1614' : '#121a34'); bg.addColorStop(1, '#050304');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
    frac = G.clamp(frac, 0, 1);
    if (frac > 0.002) {
      const top = size * (1 - frac) + (frac < 0.995 ? 2 : -6);
      for (let layer = 0; layer < 2; layer++) {
        ctx.beginPath(); const amp = layer ? 2.4 : 3.4, ph = t * (layer ? 2.1 : 1.5) + layer * 2;
        ctx.moveTo(0, size);
        for (let x = 0; x <= size; x += 4) ctx.lineTo(x, top + Math.sin(x * 0.045 + ph) * amp + Math.sin(x * 0.11 - ph * 1.3) * 1.4 + (layer ? 3 : 0));
        ctx.lineTo(size, size); ctx.closePath();
        const g = ctx.createLinearGradient(0, top, 0, size);
        if (life) { g.addColorStop(0, layer ? '#d8322a' : '#ff6a48'); g.addColorStop(0.45, layer ? '#9a1410' : '#cf2018'); g.addColorStop(1, layer ? '#3a0504' : '#5a0a08'); }
        else { g.addColorStop(0, layer ? '#3f6fe8' : '#76a8ff'); g.addColorStop(0.45, layer ? '#1c36b0' : '#2a52d8'); g.addColorStop(1, layer ? '#080f40' : '#10196a'); }
        ctx.fillStyle = g; ctx.globalAlpha = layer ? 0.9 : 1; ctx.fill(); ctx.globalAlpha = 1;
      }
      // burbujas
      ctx.fillStyle = life ? 'rgba(255,170,140,.35)' : 'rgba(170,210,255,.38)';
      for (let i = 0; i < 7; i++) { const u = ((t * (0.12 + i * 0.03) + i * 0.37) % 1), bx = r + Math.sin(i * 12.9 + t * 0.7) * r * 0.55, by = size - u * (size - top) - 4; if (by > top + 4) { ctx.beginPath(); ctx.arc(bx, by, 1.6 + (i % 3), 0, 6.2832); ctx.fill(); } }
      // brillo del líquido
      const lg = ctx.createLinearGradient(0, top, 0, top + 26); lg.addColorStop(0, 'rgba(255,255,255,.32)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = lg; ctx.fillRect(0, top - 2, size, 26);
    }
    // sombreado esférico y reflejos de cristal
    const sh = ctx.createRadialGradient(r * 0.65, r * 0.55, r * 0.15, r, r, r); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.7, 'rgba(0,0,0,.06)'); sh.addColorStop(1, 'rgba(0,0,0,.62)'); ctx.fillStyle = sh; ctx.fillRect(0, 0, size, size);
    ctx.beginPath(); ctx.ellipse(r * 0.62, r * 0.42, r * 0.38, r * 0.2, -0.55, 0, 6.2832); const hg = ctx.createLinearGradient(0, r * 0.2, 0, r * 0.7); hg.addColorStop(0, 'rgba(255,255,255,.5)'); hg.addColorStop(1, 'rgba(255,255,255,.02)'); ctx.fillStyle = hg; ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 1.18, r * 1.58, r * 0.5, r * 0.16, 0.25, 0, 6.2832); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- HUD
  const HUD = G.HUD = {};
  let R = {}, built = false, logSeen = -1, lastMM = 0, lastS = null, cdPrev = [], hpPrev = -1;
  const KEYBTN = { menu: 'Escape', inv: 'KeyI', map: 'Tab', log: 'KeyL', help: 'F1' };
  HUD.build = () => {
    const top = $('#hud-top'), bot = $('#hud-bot');
    top.innerHTML = `
      <div id="buffs"></div>
      <div id="resbar" class="plate"><span class="res" title="Brasas (oro)"><img data-ic="coin"><b id="r-oro">0</b></span><span class="res" title="Piedad: tus actos compasivos"><img data-ic="heart"><span class="lbl">Piedad</span><b id="r-pie">0</b></span><span class="res" title="Voluntad: tus actos de fuerza"><img data-ic="fire"><span class="lbl">Voluntad</span><b id="r-vol">0</b></span><span class="res fl"><b id="r-piso">Piso 1</b><i id="r-nombre"></i></span></div>
      <div id="boss" class="hidden"><div class="b-name"></div><div class="b-bar"><i></i><u class="n1"></u><u class="n2"></u></div></div>
      <div id="mm-wrap"><div id="mm-frame" class="frame"><canvas id="mm" width="256" height="216"></canvas></div>
        <div id="mm-btns"><button data-k="menu" title="Pausa (Esc)"><img data-ic="hammer"></button><button data-k="inv" title="Inventario (I)"><img data-ic="chest"></button><button data-k="map" title="Mapa (Tab)"><img data-ic="scroll"></button><button data-k="log" title="Registro (L)"><img data-ic="book"></button></div></div>`;
    bot.innerHTML = `
      <div id="log"></div>
      <div id="console"><div id="hint"></div>
        <div class="c-top"></div><div class="c-arc l"></div><div class="c-arc r"></div>
        <div id="orbL" class="orb" data-k="life"><div class="ring"><canvas width="220" height="220"></canvas></div><div class="val"></div></div>
        <div id="portrait"><div class="frame"><canvas id="pt-cv"></canvas></div><div id="pt-lv"></div></div>
        <div id="unit"><div id="u-name">—</div><div id="u-cls">—</div><div id="u-xp"><i></i><span></span></div>
          <div id="u-stats"><div title="Poder de ataque"><img data-ic="sword"><b id="s-atk">0</b></div><div title="Armadura"><img data-ic="shield"><b id="s-arm">0</b></div><div title="Esquiva"><img data-ic="wind"><b id="s-esq">0</b></div><div title="Probabilidad de crítico"><img data-ic="bolt"><b id="s-crit">0</b></div></div></div>
        <div id="chargebar"><i></i><span>Tajo cargado</span></div>
        <div id="belt">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<div class="slot empty" data-n="${n}"><img><span class="key">${n}</span><span class="cnt"></span><div class="cd"></div><b class="cdt"></b></div>`).join('')}</div>
        <div id="equip">${['Arma', 'Armadura', 'Amuleto'].map((n, i) => `<div class="eq" data-i="${i}"><img><span>${n}</span></div>`).join('')}</div>
        <div id="toggles"><button id="t-auto" title="Ataque automático (X)"><img data-ic="sword"><span>Auto</span></button><button id="t-music" title="Música y sonido (M)"><img data-ic="horn"><span>Sonido</span></button><button id="t-full" title="Pantalla completa"><img data-ic="shield"><span>Pantalla</span></button></div>
        <div id="orbR" class="orb" data-k="mana"><div class="ring"><canvas width="220" height="220"></canvas></div><div class="val"></div></div>
      </div>`;
    for (const im of document.querySelectorAll('[data-ic]')) im.src = G.icon(im.dataset.ic, { coin: 0xf2c53d, heart: 0xff6a8a, fire: 0xff9a3a, hammer: 0xc8c0b0, chest: 0xc89a5a, scroll: 0xf0e0a0, book: 0x9aa8d8, sword: 0xd8dde6, shield: 0x9ab0d0, wind: 0xb0e0ff, bolt: 0xffe040, horn: 0xffc060 }[im.dataset.ic] || 0xcccccc, 48);
    R = { oro: $('#r-oro'), pie: $('#r-pie'), vol: $('#r-vol'), piso: $('#r-piso'), nombre: $('#r-nombre'), boss: $('#boss'), mm: $('#mm'), log: $('#log'), buffs: $('#buffs'),
      orbL: $('#orbL canvas'), orbR: $('#orbR canvas'), valL: $('#orbL .val'), valR: $('#orbR .val'), name: $('#u-name'), cls: $('#u-cls'), xp: $('#u-xp'), lv: $('#pt-lv'), hole: $('#pt-cv'),
      atk: $('#s-atk'), arm: $('#s-arm'), esq: $('#s-esq'), crit: $('#s-crit'), slots: [...document.querySelectorAll('.slot')], eq: [...document.querySelectorAll('.eq')], charge: $('#chargebar'), auto: $('#t-auto'), hint: $('#hint') };
    R.hint.textContent = 'WASD o flechas: moverte · Espacio: atacar (mantén pulsado: tajo cargado) · 1-9: habilidades · I: mochila · Tab: mapa · rueda: zoom'; setTimeout(() => { R.hint.style.transition = 'opacity 2s'; R.hint.style.opacity = '0.0'; }, 45000);
    R.ctxL = R.orbL.getContext('2d'); R.ctxR = R.orbR.getContext('2d'); R.mmx = R.mm.getContext('2d');
    for (const b of document.querySelectorAll('#mm-btns button')) b.addEventListener('click', () => G.sendKey && G.sendKey(KEYBTN[b.dataset.k]));
    $('#t-auto').addEventListener('click', () => G.sendKey('KeyX')); $('#t-music').addEventListener('click', () => G.sendKey('KeyM'));
    R.slots.forEach((s) => { s.addEventListener('click', () => G.sendKey('Digit' + s.dataset.n)); s.addEventListener('mouseenter', () => HUD.tipSlot(+s.dataset.n - 1, s)); s.addEventListener('mouseleave', HUD.hideTip); });
    R.eq.forEach((s) => { s.addEventListener('mouseenter', () => HUD.tipEq(+s.dataset.i, s)); s.addEventListener('mouseleave', HUD.hideTip); });
    built = true; HUD.layout();
  };
  HUD.layout = () => {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080); document.documentElement.style.setProperty('--s', s.toFixed(4));
  };
  HUD.show = (v) => { document.getElementById('hud').classList.toggle('hidden', !v); };

  // ---------------------------------------------------------------- tooltips
  const tip = () => document.getElementById('tip');
  HUD.hideTip = () => tip().classList.add('hidden');
  HUD.showTip = (el, html) => { const t = tip(); t.innerHTML = html; t.classList.remove('hidden'); const r = el.getBoundingClientRect(), tr = t.getBoundingClientRect(); t.style.left = Math.max(8, Math.min(innerWidth - tr.width - 8, r.left + r.width / 2 - tr.width / 2)) + 'px'; t.style.top = Math.max(8, r.top - tr.height - 10) + 'px'; };
  const tipHtml = (id, extra = '') => {
    const d = G.cat[id]; if (!d) return '';
    const cls = d.clases ? ' · ' + [...d.clases].map((c) => ({ G: 'Guerrero', M: 'Mago', A: 'Arquero', P: 'Pícaro', C: 'Clérigo' }[c])).join('/') : '';
    const tcol = d.tipo === 4 ? '#9ec5ff' : d.tipo === 5 ? '#e0b060' : G.tierCol(+id[1]) ? G.css(G.tierCol(+id[1])) : '#fff';
    const stats = []; if (d.atk) stats.push(`Ataque ${d.atk > 0 ? '+' : ''}${d.atk}`); if (d.arm) stats.push(`Armadura +${d.arm}`); if (d.vida) stats.push(`Vida +${d.vida}`); if (d.mana) stats.push(`Maná +${d.mana}`);
    const meta = d.tipo === 4 ? `Habilidad · ${d.coste ? d.coste + ' de maná' : 'cuesta vida'}${d.cd ? ' · ' + (d.cd / 1000).toFixed(0) + ' s' : ''}` : d.tipo === 0 ? `Consumible${d.cd ? ' · espera ' + (d.cd / 1000).toFixed(1) + ' s' : ''}` : ['Consumible', 'Arma', 'Armadura', 'Amuleto', 'Habilidad', 'Tesoro', 'Material'][d.tipo] + cls;
    return `<h4 style="color:${tcol}">${d.nombre}</h4><p class="meta">${meta}</p>${d.tipo === 4 || d.tipo === 0 ? '' : stats.length ? `<p class="st">${stats.join(' · ')}</p>` : ''}<p class="ds">${d.desc || ''}</p>${extra}`;
  };
  HUD.tipSlot = (i, el) => { const q = lastS && lastS.q && lastS.q[i]; if (!q) return; HUD.showTip(el, tipHtml(q[0], `<p class="hk">Tecla ${i + 1}</p>`)); };
  HUD.tipEq = (i, el) => { const id = lastS && lastS.p.eq[i]; if (!id) { HUD.showTip(el, `<h4>${['Arma', 'Armadura', 'Amuleto'][i]}</h4><p class="ds">Nada equipado.</p>`); return; } HUD.showTip(el, tipHtml(id)); };

  // ---------------------------------------------------------------- actualización por fotograma de juego
  const setTxt = (el, v) => { if (el._v !== v) { el._v = v; el.textContent = v; } };
  HUD.update = (s) => {
    if (!built) return; lastS = s; const p = s.p;
    setTxt(R.oro, p.oro); setTxt(R.pie, p.pie); setTxt(R.vol, p.vol); setTxt(R.piso, `Piso ${s.piso}/${s.maxPiso}`); setTxt(R.nombre, G.pisoNombre ? G.pisoNombre(s.piso) : '');
    setTxt(R.name, p.nom); setTxt(R.cls, `${G.CLASS_NAME[p.cls]} · Nivel ${p.lv}`); setTxt(R.lv, p.lv);
    setTxt(R.atk, p.atk); setTxt(R.arm, p.arm); setTxt(R.esq, p.esq + '%'); setTxt(R.crit, p.crit + '%');
    setTxt(R.valL, `${p.hp} / ${p.mhp}`); setTxt(R.valR, `${p.mp} / ${p.mmp}`);
    R.xp.firstChild.style.width = (100 * G.clamp(p.xp / Math.max(1, p.xpn), 0, 1)).toFixed(1) + '%'; setTxt(R.xp.lastChild, `${p.xp} / ${p.xpn} PX`);
    R.auto.classList.toggle('on', !!p.auto);
    // barra rápida
    for (let i = 0; i < 9; i++) {
      const q = s.q[i], el = R.slots[i], img = el.firstChild;
      if (!q) { el.classList.add('empty'); continue; }
      el.classList.remove('empty'); if (el._id !== q[0]) { el._id = q[0]; img.src = G.iconFor(q[0], 64); }
      el.classList.toggle('off', !q[8] && !q[5]); el.classList.toggle('nomana', q[3] === 4 && q[9] === 0 && p.mp < q[7]);
      const cnt = el.querySelector('.cnt'), cd = el.querySelector('.cd'), cdt = el.querySelector('.cdt');
      setTxt(cnt, q[4] >= 0 ? q[4] : (q[7] && !q[9] ? q[7] : ''));
      cnt.classList.toggle('mana', q[4] < 0);
      const rem = q[6] > 0 ? G.clamp(q[5] / q[6], 0, 1) : 0; el.style.setProperty('--r', rem.toFixed(3)); cd.style.display = q[5] > 0 ? 'block' : 'none'; setTxt(cdt, q[5] > 600 ? Math.ceil(q[5] / 1000) : '');
      if ((cdPrev[i] || 0) > 0 && q[5] <= 0) { el.classList.remove('ready'); void el.offsetWidth; el.classList.add('ready'); }
      cdPrev[i] = q[5];
    }
    // equipo
    for (let i = 0; i < 3; i++) { const id = p.eq[i], el = R.eq[i]; el.classList.toggle('empty', !id); if (id && el._id !== id) { el._id = id; el.firstChild.src = G.iconFor(id, 64); } if (!id) el._id = null; }
    // carga del tajo
    R.charge.classList.toggle('on', p.carg >= 0); if (p.carg >= 0) { R.charge.firstChild.style.width = (p.carg * 100).toFixed(0) + '%'; R.charge.classList.toggle('full', !!p.cargOk); }
    // jefe
    const b = s.boss; R.boss.classList.toggle('hidden', !b || !s.__bossVis);
    if (b) { R.boss.querySelector('.b-name').textContent = 'Aldric, el Rey Ceniciento'; R.boss.querySelector('.b-bar i').style.width = (100 * b.hp / Math.max(1, b.mhp)).toFixed(1) + '%'; R.boss.querySelector('.n1').style.left = '66%'; R.boss.querySelector('.n2').style.left = '33%'; }
    // estados
    const BUFF = { fur: ['claws', 0xe03a2a, 'Furia'], esc: ['shield', 0xffd34a, 'Escudo ardiente'], pie: ['stone', 0xa8a090, 'Piel de ceniza'], pri: ['bolt', 0xffe040, 'Paso ligero'], ven: ['flask', 0x5cff6a, 'Envenenado'], gri: ['horn', 0xffc060, 'Grito de guerra'], ben: ['sun', 0xffe27a, 'Bendición'], eva: ['wind', 0xb0e0ff, 'Evasión'], hum: ['cloud', 0xaab0c0, 'Humo'], cri: ['nova', 0xff9a3a, 'Crítico asegurado'], dag: ['dagger', 0x5cff6a, 'Daga envenenada'], bar: ['hex', 0x5ae6ff, 'Barrera arcana'] };
    const keys = Object.keys(p.buf).filter((k) => BUFF[k]); const sig = keys.map((k) => k + Math.ceil(p.buf[k] / 1000)).join(',');
    if (R.buffs._sig !== sig) { R.buffs._sig = sig; R.buffs.innerHTML = keys.map((k) => `<div class="buff ${k === 'ven' ? 'bad' : ''}" title="${BUFF[k][2]}"><img src="${G.icon(BUFF[k][0], BUFF[k][1], 48)}"><b>${Math.ceil(p.buf[k] / 1000)}</b></div>`).join(''); }
    // registro de mensajes
    if (s.nlog !== logSeen) {
      const fresh = logSeen < 0 ? 0 : Math.min(8, s.nlog - logSeen); logSeen = s.nlog;
      R.log.innerHTML = s.log.slice(-6).map((m, i, a) => `<div class="${i >= a.length - fresh ? 'new' : ''}">${m.replace(/</g, '&lt;')}</div>`).join('');
    }
    if (hpPrev !== p.hp) { document.getElementById('fx-low').classList.toggle('on', p.hp / p.mhp < 0.28); hpPrev = p.hp; }
  };
  HUD.resetLog = () => { logSeen = -1; };

  // ---------------------------------------------------------------- por fotograma de dibujo
  HUD.frame = (world, t) => {
    if (!built || !lastS) return;
    const p = lastS.p;
    drawOrb(R.ctxL, 220, p.hp / Math.max(1, p.mhp), 'life', t); drawOrb(R.ctxR, 220, p.mp / Math.max(1, p.mmp), 'mana', t);
    document.getElementById('orbL').classList.toggle('low', p.hp / p.mhp < 0.28);
    if (t - lastMM > 0.12) { lastMM = t; HUD.minimap(world); }
  };
  HUD.portraitRect = () => R.hole && R.hole.getBoundingClientRect();

  HUD.minimap = (w) => {
    if (!w.cells || !w.hero || !lastS) return;
    const cv = R.mm, ctx = R.mmx, W = cv.width, H = cv.height, Z = 4, vw = (W / Z) | 0, vh = (H / Z) | 0;
    const hx = w.hero.tx, hy = w.hero.ty, x0 = G.clamp(hx - (vw >> 1), 0, Math.max(0, w.w - vw)), y0 = G.clamp(hy - (vh >> 1), 0, Math.max(0, w.h - vh));
    const img = ctx.createImageData(W, H), d = img.data;
    const put = (px, py, r, g, b, a = 255) => { for (let j = 0; j < Z; j++) for (let i = 0; i < Z; i++) { const o = ((py * Z + j) * W + px * Z + i) * 4; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = a; } };
    for (let y = 0; y < vh; y++) for (let x = 0; x < vw; x++) {
      const tx = x0 + x, ty = y0 + y; if (tx >= w.w || ty >= w.h) continue; const i = ty * w.w + tx; if (!w.expl[i]) continue; const c = w.cells[i], vis = w.visT[i] > 0.5, k = vis ? 1 : 0.62;
      if (c === 35 || c === 116 || c === 115) { let edge = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = tx + dx, ny = ty + dy; if (nx >= 0 && ny >= 0 && nx < w.w && ny < w.h) { const q = w.cells[ny * w.w + nx]; if (q !== 35 && q !== 116 && q !== 115 && w.expl[ny * w.w + nx]) edge = true; } } if (edge) put(x, y, 150 * k, 124 * k, 84 * k); else put(x, y, 30, 24, 18, 200); }
      else if (c === 112) put(x, y, 130 * k, 120 * k, 100 * k);
      else if (c === 119) put(x, y, 40 * k, 90 * k, 190 * k); else if (c === 108) put(x, y, 230 * k, 90 * k, 30 * k); else if (c === 62) put(x, y, 255, 211, 74);
      else put(x, y, 52 * k + 8, 74 * k + 8, 82 * k + 10);
    }
    ctx.putImageData(img, 0, 0);
    const dot = (tx, ty, col, r) => { const px = (tx - x0) * Z + Z / 2, py = (ty - y0) * Z + Z / 2; if (px < 0 || py < 0 || px > W || py > H) return; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832); ctx.fill(); };
    for (const o of lastS.o) { if (o[1] === 'S') dot(o[2], o[3], '#ffd34a', 4); else if (o[1] === 'F') dot(o[2], o[3], '#ff8a2a', 4); else if (o[1] === 'E') dot(o[2], o[3], '#e060ff', 4); else if (o[5]) dot(o[2], o[3], o[1] === 'G' ? '#7aff9a' : '#ffe27a', 2); }
    for (const e of lastS.e) if (e[6] & 256) dot(e[2], e[3], e[6] & 512 ? '#ff2a1a' : (e[6] & 3 ? '#ffb030' : '#e23a2a'), e[6] & 512 ? 5 : 2.4);
    const px = (hx - x0) * Z + Z / 2, py = (hy - y0) * Z + Z / 2, f = lastS.p;
    ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(f.fx, -f.fy)); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4.5, 4); ctx.lineTo(0, 1.6); ctx.lineTo(-4.5, 4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  };

  // ---------------------------------------------------------------- etiquetas 2D sobre el mundo (barras de vida, números de daño)
  const COL = { 14: '#ffd34a', 12: '#ff5a4a', 15: '#ffffff', 13: '#ff8cf0', 10: '#7aff8a', 11: '#7ae6ff', 9: '#8aa4ff', 6: '#f0a63a', 7: '#d0d0d0', 4: '#e0453a' };
  HUD.labels = (ctx, world, t, W, H) => {
    ctx.clearRect(0, 0, W, H); if (!world.hero || !lastS) return;
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    const px = world.hero.tx, py = world.hero.ty;
    for (const e of world.ents.values()) {
      if (!e.vis) continue;
      if (e.kind === 'enemy') {
        const boss = e.type === 3, show = e.hp < e.maxhp || e.elite || e.guard; if (!show || boss) continue;
        const sp = world.proj(e.x, (e.model.h + (e.model.fly || 0)) * e.scale + 0.25, e.z); if (!sp) continue;
        const w = e.elite || e.guard ? 62 : 46, h = 7, x = sp[0] - w / 2, y = sp[1];
        ctx.fillStyle = 'rgba(0,0,0,.78)'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
        ctx.fillStyle = '#2a0c0a'; ctx.fillRect(x, y, w, h);
        const f = G.clamp(e.hp / e.maxhp, 0, 1), g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, e.guard ? '#7ae6ff' : '#ff5a48'); g.addColorStop(1, e.guard ? '#2a7aa8' : '#9a1812');
        ctx.fillStyle = g; ctx.fillRect(x, y, w * f, h);
        ctx.strokeStyle = e.guard ? '#6adcff' : e.elite ? '#ffd34a' : '#6a4f22'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
        if (e.elite || e.guard) { ctx.font = '600 14px Cinzel, serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.9)'; const n = (e.guard ? 'Guardián ' : 'Élite ') + G.ENEMY[e.type].n; ctx.strokeText(n, sp[0], y - 6); ctx.fillStyle = e.guard ? '#8ae8ff' : '#ffd34a'; ctx.fillText(n, sp[0], y - 6); }
      } else if (e.kind === 'npc') {
        const sp = world.proj(e.x, e.model.h + 0.55, e.z); if (!sp) continue; const n = { S: 'Vela · Mercader', F: 'Maese Brasero · Herrería', E: 'Altar del Eco' }[e.ch];
        ctx.font = '600 15px Cinzel, serif'; ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,.9)'; ctx.strokeText(n, sp[0], sp[1]); ctx.fillStyle = e.ch === 'E' ? '#f0a0ff' : '#ffe9a8'; ctx.fillText(n, sp[0], sp[1]);
      } else if (e.kind === 'item' && Math.hypot(e.tx - px, e.ty - py) < 7) {
        let n = '', col = '#e8e2d0';
        if (e.ch === '$') { n = 'Brasas'; col = '#ffd34a'; } else if (e.ch === 'H') { n = 'Poción de vida'; col = '#ff8a7a'; } else if (e.ch === 'M') { n = 'Poción de maná'; col = '#8ab0ff'; } else if (e.ch === 'B') n = 'Bomba de hollín'; else if (e.ch === 'C') { n = 'Cofre'; col = '#ffd34a'; }
        else { const d = G.cat[e.itemId]; n = d ? d.nombre : 'Objeto'; if (e.ch === 'G') col = G.css(G.tierCol(+e.itemId[1])); else if (e.ch === 'T') col = '#ffe27a'; }
        const sp = world.proj(e.x, 0.95, e.z); if (!sp) continue; ctx.font = '600 14px "EB Garamond", serif'; const tw = ctx.measureText(n).width;
        ctx.fillStyle = 'rgba(0,0,0,.68)'; ctx.fillRect(sp[0] - tw / 2 - 6, sp[1] - 14, tw + 12, 19); ctx.fillStyle = col; ctx.fillText(n, sp[0], sp[1]);
      }
    }
    // números flotantes
    for (const f of world.floats) {
      const age = f[5] / 1000, sp = world.proj(f[1] + 0.5 + ((f[0] * 37) % 7 - 3) * 0.05, 1.5 + age * 1.1, f[2] + 0.5); if (!sp) continue;
      const a = G.clamp(1 - Math.max(0, age - 0.45) / 0.55, 0, 1), big = /^\d/.test(f[3]) || /^[-+]/.test(f[3]);
      ctx.globalAlpha = a; ctx.font = `700 ${big ? 26 : 20}px Cinzel, serif`; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.95)'; ctx.strokeText(f[3], sp[0], sp[1]); ctx.fillStyle = COL[f[4]] || '#fff'; ctx.fillText(f[3], sp[0], sp[1]); ctx.globalAlpha = 1;
    }
  };
})(window.G);
