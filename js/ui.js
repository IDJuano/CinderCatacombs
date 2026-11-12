'use strict';
// Interfaz modal: toma los fotogramas de texto del juego (menús, inventario, tienda, forja, escenas…) y los
// dibuja con una piel de piedra y oro. Añade iconos a los objetos, un mapa gráfico y la vista 3D de la clase.
(function (G) {
  const CW = 20, CH = 1080 / 35;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const UI = G.UI = { classRect: null, titleMode: false, active: false };
  let root, stage, world = null;

  UI.init = () => { root = document.getElementById('ui'); stage = document.getElementById('ui-stage'); };
  UI.setWorld = (w) => { world = w; };
  UI.hide = () => { if (!root) return; root.classList.add('hidden'); UI.active = false; UI.classRect = null; UI.titleMode = false; stage.innerHTML = ''; };

  function segs(t) {
    const out = [], re = / {2,}/g; let last = 0, m;
    while ((m = re.exec(t))) { if (m.index > last) out.push([last, t.slice(last, m.index)]); last = m.index + m[0].length; }
    if (last < t.length) out.push([last, t.slice(last)]);
    return out;
  }
  function matchItem(t) {
    const names = G.catNames || []; let best = null;
    for (const n of names) if (t.startsWith(n.nombre) && (t.length === n.nombre.length || /[\s\[(x—-]/.test(t[n.nombre.length])) && (!best || n.nombre.length > best.nombre.length)) best = n;
    return best;
  }

  UI.show = (f) => {
    if (!root) UI.init();
    const full = f.full, bg = f.bg, cajas = f.cajas, runs = f.r;
    const title = full && runs.some((r) => /C A T A C U M B A S/.test(r[2]));
    const scene = full && !bg && cajas.length === 0 && !title;
    const mapScreen = full && bg && bg.tabs[0] === 'Mapa';
    const classScreen = cajas.some((c) => c[4] === 'Elige tu clase');
    root.className = 'ui ' + (full ? 'full' : 'overlay') + (title ? ' title' : '') + (scene ? ' scene' : '') + (world && world.hero && !UI.titleMode0 ? ' ingame' : '');
    UI.active = true; UI.titleMode = title || classScreen || (full && !!bg && !G.inGame);
    let html = '';

    if (bg) {
      const tabs = title || bg.act < 0 ? [] : bg.tabs;
      html += `<div class="ui-top"><span class="brand">Las Catacumbas de Ceniza</span>${tabs.map((t, i) => `<span class="tab${i === bg.act ? ' on' : ''}">${esc(t)}</span>`).join('')}</div>`;
      html += `<div class="ui-fk">${bg.fk.map((t, i) => t ? `<button data-k="F${i + 1}"><kbd>F${i + 1}</kbd>${esc(t)}</button>` : '').join('')}</div>`;
    }
    for (const [x, y, w, h, t] of cajas) {
      const ttl = t.replace(/\s+vista .*$/, '');
      html += `<div class="pane" style="left:${x * CW}px;top:${y * CH}px;width:${w * CW}px;height:${h * CH}px">${ttl ? `<div class="pane-title"${y <= 1 ? ' style="top:-5px"' : ''}><span>${esc(ttl)}</span></div>` : ''}</div>`;
    }
    if (title) html += `<div class="logo"><div class="l1">Las Catacumbas</div><div class="l2">de Ceniza</div><div class="l3">Un juego de sombras, brasas y reyes mudos</div></div>`;

    // contenido de texto
    const tops = cajas.map((c) => [c[1], c[4].replace(/\s+vista .*$/, '').trim()]);
    const BOX = /[═║╔╗╚╝╠╣│─┌┐└┘┬┴├┤┼╦╩╬]/g, titleKeys = new Set(cajas.map((c) => c[1] + '|' + c[4].replace(/\s+vista .*$/, '').trim()));
    const sceneTitleRow = scene ? Math.min(...runs.map((r) => r[0])) : -1;
    for (const [row, col, text0, fg, bgc] of runs) {
      if (title && row < 12) continue;                                            // arte ASCII del título: lo sustituye el logotipo y el diorama 3D
      if (titleKeys.has(row + '|' + text0.trim()) || tops.some(([y, t]) => y === row && t && text0.trim().startsWith(t))) continue;   // el título del marco ya lo dibuja la cinta del panel
      const isHead = /^\s*═{2,}\s+.*\S\s+═{2,}\s*$/.test(text0);
      const text = isHead ? text0 : text0.replace(BOX, ' ');
      const top = row * CH;
      if (bgc === 3 && row > 0 && row < 34) {                                      // fila seleccionada
        html += `<div class="sel" style="left:${col * CW - 8}px;top:${top}px;width:${text.length * CW + 16}px;height:${CH}px"></div>`;
      }
      const sel = bgc === 3, parts = segs(text);
      parts.forEach(([off, raw], pi) => {
        const lead = raw.length - raw.trimStart().length, t = raw.trim(); if (!t) return;
        if (/^[═║╔╗╚╝╠╣│─┌┐└┘┬┴├┤┼]+$/.test(t)) return;
        const left = (col + off + lead) * CW;
        let color = sel ? '#fff2c8' : G.TXT[fg] || '#ccc'; if (scene && fg === 14 && row !== sceneTitleRow) color = '#dccfa8';
        const sCol = col + off + lead, box = cajas.find((c) => sCol >= c[0] && sCol < c[0] + c[2] && row > c[1] && row < c[1] + c[3] - 1);
        const PL = box ? box[0] + 1 : 0, PR = box ? box[0] + box[2] - 1 : 96, lm = sCol - PL, rm = PR - (sCol + t.length);
        const menuRow = box && box[2] <= 64 && parts.length === 1 && sCol === box[0] + 3;                       // filas de MenuNC: se centran en su marco
        const centered = menuRow || (parts.length === 1 && Math.abs(lm - rm) <= 1 && lm >= 3 && t.length < PR - PL - 6);
        if (isHead) { const lab = t.replace(/^═+\s*|\s*═+$/g, ''); if (titleKeys.has(row + '|' + lab)) return; html += `<div class="sub" style="left:${col * CW}px;top:${top}px;width:${text.length * CW}px;height:${CH}px;color:${color}"><span>${esc(lab)}</span></div>`; return; }
        let ic = '';
        if (pi === 0 && !centered && col + off + lead >= 2 && G.catNames) { const it = matchItem(t); if (it) ic = `<img class="ic" src="${G.iconFor(it.id, 52)}" style="left:${left - 29}px;top:${top + 2}px">`; }
        const it2 = pi === 0 && G.catNames ? matchItem(t) : null;
        const tc = it2 && !sel && it2.tipo !== 4 && (it2.tipo === 1 || it2.tipo === 2 || it2.tipo === 3) && +it2.id[1] > 1 && fg !== 8 ? G.css(G.tierCol(+it2.id[1])) : color;
        html += ic + (centered
          ? `<div class="t c${scene && row === sceneTitleRow ? ' st' : ''}" style="left:${PL * CW}px;width:${(PR - PL) * CW}px;top:${top}px;height:${CH}px;color:${color}">${esc(t)}</div>${scene && row === sceneTitleRow ? `<div class="orn" style="top:${top + CH + 8}px"></div>` : ''}`
          : `<div class="t${sel ? ' s' : ''}" style="left:${left}px;top:${top}px;height:${CH}px;color:${tc}">${esc(t)}</div>`);
      });
    }

    if (mapScreen) { const b = cajas[0]; if (b) html += `<canvas id="bigmap" style="left:${(b[0] + 1) * CW}px;top:${(b[1] + 1) * CH}px;width:${(b[2] - 2) * CW}px;height:${(b[3] - 2) * CH}px" width="${(b[2] - 2) * CW}" height="${((b[3] - 2) * CH) | 0}"></canvas>`; }
    let rect = null;
    if (classScreen) { html += `<canvas id="class-hero" style="left:${2 * CW}px;top:${17.2 * CH}px;width:${28 * CW}px;height:${14.4 * CH}px"></canvas>`; const cn = cajas[1] && cajas[1][4]; UI.classIdx = Math.max(0, G.CLASS_NAME.indexOf(cn)); }
    stage.innerHTML = html;
    root.classList.remove('hidden');
    for (const b of stage.querySelectorAll('.ui-fk button')) b.addEventListener('click', () => G.sendKey(b.dataset.k));
    if (classScreen) UI.classRect = () => document.getElementById('class-hero') && document.getElementById('class-hero').getBoundingClientRect(); else UI.classRect = null;
    if (mapScreen) UI.drawBigMap();
  };

  UI.drawBigMap = () => {
    const cv = document.getElementById('bigmap'), w = world; if (!cv || !w || !w.cells) return;
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, Z = Math.floor(Math.min(W / w.w, H / w.h)), ox = ((W - Z * w.w) / 2) | 0, oy = ((H - Z * w.h) / 2) | 0;
    ctx.fillStyle = '#0d0a07'; ctx.fillRect(0, 0, W, H);
    const wall = (c) => c === 35 || c === 116 || c === 115;
    for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) {
      const i = y * w.w + x; if (!w.expl[i]) continue; const c = w.cells[i], th = w.th(x, y);
      if (wall(c)) { let e = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w.w && ny < w.h) { const q = w.cells[ny * w.w + nx]; if (!wall(q)) e = true; } } if (!e) continue; ctx.fillStyle = c === 116 ? '#ffd34a' : G.css(G.shade(G.STONE[th.ma], 1.15)); }
      else if (c === 112) ctx.fillStyle = G.css(G.shade(G.STONE[th.p] || 0x888888, 1.2)); else if (c === 119) ctx.fillStyle = '#2f62b8'; else if (c === 108) ctx.fillStyle = '#e0561e'; else if (c === 62) ctx.fillStyle = '#ffd34a';
      else ctx.fillStyle = G.css(G.shade(G.STONE[(((x >> 1) + (y >> 1)) & 1) ? th.su : th.sa], 1.9));
      ctx.fillRect(ox + x * Z, oy + y * Z, Z - (wall(c) ? 0 : 1), Z - (wall(c) ? 0 : 1));
    }
    const s = G.lastGame; if (s) {
      for (const o of s.o) { if (!w.expl[o[3] * w.w + o[2]]) continue; if (o[1] === 'S' || o[1] === 'F' || o[1] === 'E') { ctx.fillStyle = o[1] === 'E' ? '#e060ff' : o[1] === 'F' ? '#ff8a2a' : '#ffd34a'; ctx.beginPath(); ctx.arc(ox + (o[2] + 0.5) * Z, oy + (o[3] + 0.5) * Z, Z * 0.7, 0, 6.2832); ctx.fill(); ctx.fillStyle = '#000'; ctx.font = `700 ${Math.max(9, Z)}px Cinzel,serif`; ctx.textAlign = 'center'; ctx.fillText(o[1] === 'S' ? '$' : o[1] === 'F' ? '&' : 'E', ox + (o[2] + 0.5) * Z, oy + (o[3] + 0.5) * Z + Z * 0.35); } }
      const p = s.p; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox + (p.x + 0.5) * Z, oy + (p.y + 0.5) * Z, Z * 0.85, 0, 6.2832); ctx.fill(); ctx.stroke();
    }
  };

  // ---------------------------------------------------------------- pregunta de texto (nombre, semilla)
  UI.prompt = (texto) => {
    const el = document.getElementById('prompt'); el.classList.remove('hidden');
    el.querySelector('p').textContent = texto || 'Escribe:';
    const inp = el.querySelector('input'); inp.value = ''; setTimeout(() => inp.focus(), 30);
    const done = (v) => { el.classList.add('hidden'); inp.onkeydown = null; G.sendText(v); };
    inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') done(inp.value); else if (e.key === 'Escape') done(''); };
    el.querySelector('button').onclick = () => done(inp.value);
  };
  UI.promptHide = () => document.getElementById('prompt').classList.add('hidden');
})(window.G);
