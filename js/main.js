'use strict';
// Arranque: conecta con el juego (WebSocket), reenvía el teclado, dibuja el mundo voxel y coordina HUD e interfaz.
(function (G) {
  const $ = (s) => document.querySelector(s);
  G.cat = {}; G.catNames = []; G.inGame = false; G.lastGame = null; G.quality = 'high';
  let ws = null, mode = 'none', eng, gameWorld, titleWorld, lbl, lctx, last = 0, bigMapTimer = 0, promptOpen = false;
  const q = new URLSearchParams(location.search);
  if (q.get('low')) G.quality = 'low';
  G.testMode = !!q.get('debug');                       // en pruebas sin GPU el dt no se limita para que las animaciones converjan

  // ---------------------------------------------------------------- red
  // Transporte: WebSocket (servidor local de C#) o, en la versión WebAssembly, el puente que instala web-wasm/main.js (G.hostSend)
  const send = (o) => { if (G.hostSend) G.hostSend(o); else if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
  G.sendKey = (code) => { send({ t: 'k', d: 1, c: code, k: '', s: 0, a: 0, x: 0 }); setTimeout(() => send({ t: 'k', d: 0, c: code }), 40); };
  G.sendText = (v) => send({ t: 'text', v });
  G.sendDebug = (c) => send({ t: 'dbg', c });
  function connect() {
    if (window.CATACUMBAS_STATIC) return;                  // versión estática: los fotogramas llegan por G.handle
    ws = new WebSocket(`ws://${location.host}/ws`);
    ws.onopen = () => { $('#conn').classList.add('hidden'); };
    ws.onmessage = (ev) => { try { handle(JSON.parse(ev.data)); } catch (e) { console.error('Mensaje', e); } };
    ws.onclose = () => { if (G.ended) return; const c = $('#conn'); c.innerHTML = '<b>Se perdió la conexión con el juego.</b><span>Si cerraste la ventana de la consola, el juego terminó. Reintentando…</span>'; c.classList.remove('hidden'); setTimeout(connect, 1500); };
  }
  function handle(m) {
    switch (m.k) {
      case 'hola': {
        $('#conn').classList.add('hidden');
        G.midi = m.midi; G.pisos = m.pisos; G.pisoNombre = (n) => m.pisos[n - 1] || '';
        G.cat = {}; for (const a of m.cat) G.cat[a[0]] = { id: a[0], nombre: a[1], corto: a[2], tipo: a[3], atk: a[4], arm: a[5], vida: a[6], mana: a[7], coste: a[8], cd: a[9], valor: a[10], clases: a[11], desc: a[12] };
        G.catNames = Object.values(G.cat).sort((a, b) => b.nombre.length - a.nombre.length);
        break;
      }
      case 'm': G.inGame = true; gameWorld.setMap(m); UIworld(); break;
      case 'v': gameWorld.setVis(m); break;
      case 'g':
        G.inGame = true; mode = 'game'; G.lastGame = m;
        m.__bossVis = m.e.some((a) => (a[6] & 512) && (a[6] & 256));
        gameWorld.applyState(m); G.HUD.update(m); G.UI.hide(); G.HUD.show(true);
        break;
      case 'u': {
        const title = m.full && m.r.some((r) => /C A T A C U M B A S/.test(r[2]));
        if (title && G.inGame) { G.inGame = false; gameWorld.reset(); G.HUD.resetLog(); }
        mode = 'ui'; G.UI.show(m);
        G.HUD.show(G.inGame && !m.full);
        if (G.UI.classIdx !== undefined && m.cajas.some((c) => c[4] === 'Elige tu clase')) G.setTitleClass(G.UI.classIdx);
        break;
      }
      case 'prompt': promptOpen = true; G.UI.prompt(m.texto); break;
      case 'fin': G.ended = true; $('#conn').innerHTML = '<b>' + (m.msg ? 'El juego se detuvo.' : 'El juego ha terminado.') + '</b><span>' + (m.msg ? String(m.msg).replace(/</g, '&lt;') + ' — recarga la página para volver a empezar.' : 'Gracias por jugar. Recarga la página para empezar de nuevo.') + '</span>'; $('#conn').classList.remove('hidden'); break;
    }
  }
  const UIworld = () => G.UI.setWorld(gameWorld);
  G.handle = handle;

  // ---------------------------------------------------------------- teclado
  const HELDSET = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
  const held = new Map();
  window.addEventListener('keydown', (e) => {
    if ($('#prompt') && !$('#prompt').classList.contains('hidden')) return;
    if (e.ctrlKey || e.metaKey) return;
    if (e.code === 'F11' || e.code === 'F12') return;
    e.preventDefault();
    if (e.code === 'KeyM' && !e.repeat) G.audio.muted = !G.audio.muted;
    if (mode === 'game' && HELDSET.has(e.code)) { if (e.repeat) return; if (!held.has(e.code)) held.set(e.code, { shift: e.shiftKey }); }
    if (e.code === 'Space' && !e.repeat) downAt.set('Space', performance.now());
    send({ t: 'k', d: 1, c: e.code, k: e.key, s: e.shiftKey ? 1 : 0, a: e.altKey ? 1 : 0, x: 0 });
  });
  const downAt = new Map();
  window.addEventListener('keyup', (e) => {
    held.delete(e.code);
    // el juego lee el estado de Espacio cada ~15 ms: garantiza una pulsación mínima para que ni un toque muy rápido se pierda
    const wait = e.code === 'Space' ? Math.max(0, 70 - (performance.now() - (downAt.get('Space') || 0))) : 0;
    if (wait > 0) setTimeout(() => send({ t: 'k', d: 0, c: e.code }), wait); else send({ t: 'k', d: 0, c: e.code });
  });
  window.addEventListener('blur', () => { for (const c of held.keys()) send({ t: 'k', d: 0, c }); held.clear(); });
  setInterval(() => { if (mode !== 'game') { held.clear(); return; } for (const [c, o] of held) send({ t: 'k', d: 1, c, k: '', s: o.shift ? 1 : 0, a: 0, x: 0 }); }, 45);
  window.addEventListener('wheel', (e) => { const w = G.inGame ? gameWorld : titleWorld; if (!w) return; w.zoom = G.clamp(w.zoom * (1 + Math.sign(e.deltaY) * 0.07), 0.55, 1.5); }, { passive: true });

  // ---------------------------------------------------------------- sonido (solo si el juego no tiene música MIDI propia)
  G.audio = { ctx: null, muted: false };
  G.audio.play = (n) => {
    if (G.midi || G.audio.muted) return;
    try {
      const A = G.audio; if (!A.ctx) A.ctx = new (window.AudioContext || window.webkitAudioContext)(); const c = A.ctx; if (c.state === 'suspended') c.resume();
      const t0 = c.currentTime, out = c.createGain(); out.gain.value = 0.18; out.connect(c.destination);
      const osc = (type, f0, f1, dur, vol = 1, delay = 0) => { const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t0 + delay); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + delay + dur); g.gain.setValueAtTime(vol, t0 + delay); g.gain.exponentialRampToValueAtTime(0.001, t0 + delay + dur); o.connect(g); g.connect(out); o.start(t0 + delay); o.stop(t0 + delay + dur + 0.02); };
      const noise = (dur, f0, f1, vol = 1, type = 'lowpass', delay = 0) => { const b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t0 + delay); f.frequency.exponentialRampToValueAtTime(f1, t0 + delay + dur); const g = c.createGain(); g.gain.setValueAtTime(vol, t0 + delay); g.gain.exponentialRampToValueAtTime(0.001, t0 + delay + dur); s.connect(f); f.connect(g); g.connect(out); s.start(t0 + delay); };
      switch (n) {
        case 'golpe': noise(0.09, 900, 200, 0.9); osc('sine', 140, 60, 0.12, 0.9); break;
        case 'mata': osc('sine', 120, 40, 0.25, 1); noise(0.15, 700, 150, 0.6); break;
        case 'herido': osc('sawtooth', 190, 70, 0.26, 0.55); noise(0.12, 1200, 200, 0.5); break;
        case 'fuego': noise(0.22, 400, 2200, 0.7, 'bandpass'); break;
        case 'flecha': noise(0.09, 3000, 6000, 0.5, 'highpass'); break;
        case 'skill': osc('triangle', 520, 880, 0.16, 0.7); break;
        case 'item': osc('sine', 880, 880, 0.1, 0.5); osc('sine', 1320, 1320, 0.18, 0.5, 0.08); break;
        case 'comprar': osc('square', 1200, 1200, 0.07, 0.3); osc('square', 1700, 1700, 0.16, 0.3, 0.07); break;
        case 'cargado': osc('sine', 1500, 1500, 0.14, 0.6); break;
        case 'secreto': noise(0.5, 300, 60, 0.9); osc('triangle', 220, 220, 0.2, 0.5, 0.15); osc('triangle', 330, 330, 0.2, 0.5, 0.3); osc('triangle', 440, 440, 0.3, 0.5, 0.45); break;
        case 'tajo': noise(0.2, 3500, 300, 0.8, 'bandpass'); osc('sine', 100, 45, 0.2, 1, 0.08); break;
        case 'boom': noise(0.45, 600, 60, 1); osc('sine', 70, 28, 0.5, 1); break;
        case 'nivel': [523, 659, 784, 1046].forEach((f, i) => osc('triangle', f, f, 0.25, 0.6, i * 0.1)); break;
        case 'morir': osc('sawtooth', 320, 40, 0.9, 0.6); break;
        case 'escalera': [440, 392, 349, 294].forEach((f, i) => osc('sine', f, f, 0.15, 0.5, i * 0.09)); break;
      }
    } catch (e) { /* sin audio */ }
  };

  // ---------------------------------------------------------------- título: diorama con el héroe de la clase elegida
  G.setTitleClass = (cls) => {
    if (!titleWorld || !titleWorld.hero) return; const h = titleWorld.hero, key = `hero:${cls}:2:2`;
    if (h.key !== key) { h.key = key; h.model = G.getModel(titleWorld.gl, key); h.cls = cls; }
  };

  // ---------------------------------------------------------------- bucle de dibujo
  function resize() {
    G.HUD.layout(); eng.resize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2); lbl.width = Math.floor(innerWidth * dpr); lbl.height = Math.floor(innerHeight * dpr); lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function frame(now) {
    const t = now / 1000, dt = Math.min(G.testMode ? 0.6 : 0.05, t - last || 0.016); last = t;
    eng.resize(); const gl = eng.gl; gl.viewport(0, 0, eng.pw, eng.ph); gl.clearColor(0.015, 0.012, 0.014, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const w = G.inGame ? gameWorld : titleWorld; w.lastDt = dt; w.update(dt, t);
    if (!G.inGame) { const h = titleWorld.hero; h.yaw = h.tyaw = 0.5 + Math.sin(t * 0.5) * 0.3; w.draw(t, { dist: 11.5, pitch: 0.42, yaw: Math.sin(t * 0.09) * 0.4 + 0.2, fov: 0.62, ty: 0.9, shift: -0.12, shiftX: -0.7 }); }
    else w.draw(t);
    const hudVisible = G.inGame && !$('#hud').classList.contains('hidden');
    if (hudVisible) { const r = G.HUD.portraitRect(); if (r) gameWorld.drawPortrait(r, t, undefined, undefined, document.getElementById('pt-cv')); }
    if (G.UI.classRect) { const r = G.UI.classRect(); if (r && r.width > 4) { const h = titleWorld.hero; titleWorld.drawPortrait(r, t, h, { eye: [0.8, 1.1, 4.0], at: [0, 0.64, 0], fov: 0.52, spin: true, scale: 1.0 }, document.getElementById('class-hero')); } }
    if (hudVisible) { G.HUD.labels(lctx, w, t, innerWidth, innerHeight); G.HUD.frame(w, t); } else lctx.clearRect(0, 0, innerWidth, innerHeight);
    if (G.UI.active && document.getElementById('bigmap') && t - bigMapTimer > 0.5) { bigMapTimer = t; G.UI.drawBigMap(); }
    requestAnimationFrame(frame);
  }

  function boot() {
    const gc = $('#gl'); lbl = $('#lbl'); lctx = lbl.getContext('2d');
    try { eng = new G.Engine(gc); } catch (e) { $('#conn').innerHTML = '<b>Tu navegador no puede abrir WebGL2.</b><span>' + e.message + '</span>'; return; }
    gameWorld = new G.World(eng, { dist: 21 }); gameWorld.amb = [0.04, 0.045, 0.07]; gameWorld.onSfx = (n) => G.audio.play(n);
    gameWorld.onHurt = () => { const h = $('#fx-hurt'); h.classList.remove('on'); void h.offsetWidth; h.classList.add('on'); };
    titleWorld = new G.World(eng, { allVisible: true, noCut: true, noHeroLight: true, dist: 12, pitch: 0.5 });
    titleWorld.amb = [0.2, 0.21, 0.3];
    G.setupTitle(titleWorld, 0); G.titleWorld = titleWorld; G.gameWorld = gameWorld;
    G.HUD.build(); G.UI.init(); G.UI.setWorld(gameWorld);
    window.addEventListener('resize', resize); resize();
    const fs = document.getElementById('t-full'); if (fs) fs.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); });
    if (q.get('debug')) { window.dbg = (c) => G.sendDebug(c); }
    connect(); requestAnimationFrame(frame);
  }
  boot();
})(window.G);
