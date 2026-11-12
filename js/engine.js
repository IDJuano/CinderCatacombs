'use strict';
// Motor WebGL2: shaders de terreno/entidades (luz dinámica + luz horneada + niebla de guerra + recorte de muros),
// partículas de cubos con instancias y utilidades de cámara.
(function (G) {
  const VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec4 aCol;
layout(location=2) in vec4 aNrm;
uniform mat4 uVP;
uniform mat4 uModel;
out vec3 vW; out vec3 vC; out vec3 vN; out float vM;
void main(){
  vec4 w = uModel*vec4(aPos,1.0);
  vW = w.xyz; vC = aCol.rgb; vM = aCol.a*255.0; vN = mat3(uModel)*aNrm.xyz;
  gl_Position = uVP*w;
}`;

  const FS = `#version 300 es
precision highp float;
in vec3 vW; in vec3 vC; in vec3 vN; in float vM;
uniform sampler2D uVis;
uniform sampler2D uLit;
uniform vec2 uMap;
uniform float uTime;
uniform int uMode;
uniform vec2 uAnchor;
uniform vec3 uHero;
uniform vec4 uTint;
uniform float uAlpha;
uniform vec3 uAmb;
uniform float uFlick;
uniform float uCut;
uniform vec4 uLP[8];
uniform vec3 uLC[8];
uniform int uNL;
out vec4 oC;
float bayer(vec2 p){
  int x = int(mod(p.x,4.0)), y = int(mod(p.y,4.0));
  int i = x + y*4;
  float m[16] = float[16](0.,8.,2.,10., 12.,4.,14.,6., 3.,11.,1.,9., 15.,7.,13.,5.);
  return (m[i]+0.5)/16.0;
}
void main(){
  vec3 N = normalize(vN);
  float mat = floor(vM+0.5);
  float al = uAlpha;
  if(uMode==0 && uCut>0.5){
    float dz = vW.z - uHero.z;
    float dx = abs(vW.x - uHero.x);
    float inFront = smoothstep(-0.2, 0.7, dz) * (1.0 - smoothstep(1.8, 3.4, dz));
    float lateral = 1.0 - smoothstep(0.7 + dz*0.18, 1.5 + dz*0.3, dx);
    float high = smoothstep(0.38, 0.7, vW.y);
    al *= 1.0 - 0.97*inFront*lateral*high;
  }
  if(al < 0.999 && bayer(gl_FragCoord.xy) >= al) discard;
  vec2 uv = (uMode==0) ? (vW.xz + N.xz*0.35)/uMap : uAnchor/uMap;
  vec2 fv = texture(uVis, uv).rg;
  vec3 base = vC;
  float t = uTime;
  if(mat==1.0){
    float w1 = sin(vW.x*5.0+t*1.6)*sin(vW.z*4.0-t*1.2);
    base *= 0.82 + 0.30*w1 + 0.14*sin((vW.x+vW.z)*9.0+t*2.5);
    base += vec3(0.05,0.10,0.14)*max(w1,0.0);
  }
  vec3 col;
  if(uMode==3){
    vec3 ld = normalize(vec3(-0.5,0.8,0.9));
    col = base*(0.50 + 0.80*max(dot(N,ld),0.0)) + base*0.25*max(dot(N,normalize(vec3(0.8,0.2,-0.4))),0.0);
  } else {
    vec3 L = uAmb + texture(uLit, uv).rgb*1.6*uFlick;
    for(int i=0;i<8;i++){
      if(i>=uNL) break;
      vec3 d = uLP[i].xyz - vW; float dist = length(d);
      float a = clamp(1.0 - dist/uLP[i].w, 0.0, 1.0); a*=a;
      float nd = 0.55 + 0.45*max(dot(N, d/max(dist,0.001)), 0.0);
      L += uLC[i]*a*nd;
    }
    float fs = 0.74 + 0.26*N.y + 0.05*N.x;
    col = base*L*fs*1.2;
    if(mat==2.0){ col = base*(1.15+0.25*sin(vW.x*3.0+vW.z*2.0+t*2.0)+0.15*sin(t*5.0+vW.x*7.0)); }
    else if(mat>=2.5){ col = base*(1.15+0.12*sin(t*3.0+vW.x*4.0+vW.y*5.0)); }
    if(uMode==0 || uMode==1){
      vec3 mem = base*vec3(0.15,0.18,0.25)*(0.7+0.3*N.y);
      if(mat==2.0) mem = base*vec3(0.30,0.18,0.14);
      float vv = smoothstep(0.02,0.9,fv.r);
      col = mix(mem*fv.g, col, vv);
      if(uMode==0) col *= smoothstep(0.0,0.2,fv.g);
    }
  }
  col = mix(col, uTint.rgb, uTint.a);
  if(uMode==2) col = vec3(0.0);
  col = vec3(1.0) - exp(-col*1.4);
  oC = vec4(col,1.0);
}`;

  const PVS = `#version 300 es
layout(location=0) in vec3 aP;
layout(location=1) in vec3 aN;
layout(location=3) in vec4 aI0;
layout(location=4) in vec4 aI1;
uniform mat4 uVP;
out vec4 vC;
void main(){
  vec3 w = aI0.xyz + aP*aI0.w;
  float s = 0.70 + 0.30*max(dot(aN, normalize(vec3(-0.3,0.9,0.5))),0.0);
  vC = vec4(aI1.rgb*s, aI1.a);
  gl_Position = uVP*vec4(w,1.0);
}`;
  const PFS = `#version 300 es
precision mediump float;
in vec4 vC; out vec4 oC;
void main(){ oC = vC; }`;

  function compile(gl, type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader: ' + gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, vs, fs, names) {
    const p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link: ' + gl.getProgramInfoLog(p));
    const u = {}; for (const n of names) u[n] = gl.getUniformLocation(p, n);
    return { p, u };
  }

  class Engine {
    constructor(canvas) {
      const gl = this.gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
      if (!gl) throw new Error('Tu navegador no soporta WebGL2.');
      this.canvas = canvas;
      this.main = program(gl, VS, FS, ['uVP', 'uModel', 'uVis', 'uLit', 'uMap', 'uTime', 'uMode', 'uAnchor', 'uHero', 'uTint', 'uAlpha', 'uAmb', 'uFlick', 'uCut', 'uLP', 'uLC', 'uNL']);
      this.part = program(gl, PVS, PFS, ['uVP']);
      this.visTex = this.makeTex(1, 1); this.litTex = this.makeTex(1, 1);
      this.vp = new Float32Array(16); this.view = new Float32Array(16); this.proj = new Float32Array(16);
      this.lightsP = new Float32Array(32); this.lightsC = new Float32Array(24); this.nl = 0;
      this.time = 0; this.dpr = 1; this.pw = 1; this.ph = 1;
      this.initParticleBuffers();
      gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    }
    makeTex(w, h) {
      const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(w * h * 4));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }
    uploadTex(tex, w, h, data) {
      const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    }
    resize() {
      const c = this.canvas, dpr = Math.min(window.devicePixelRatio || 1, G.quality === 'low' ? 1 : 1.75);
      const w = Math.max(2, Math.floor(c.clientWidth * dpr)), h = Math.max(2, Math.floor(c.clientHeight * dpr));
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      this.pw = w; this.ph = h; this.dpr = dpr;
    }
    // Cámara 3/4 alineada con el mapa (norte arriba), como Warcraft III: la perspectiva suave muestra caras laterales de los cubos.
    setCamera(cx, cz, o = {}) {
      const dist = o.dist ?? 17, pitch = o.pitch ?? 0.93, yaw = o.yaw ?? 0, fov = o.fov ?? 0.52, ty = o.ty ?? 0.55;
      const aspect = this.pw / this.ph;
      const eye = [cx + Math.sin(yaw) * Math.cos(pitch) * dist + (o.sx || 0), ty + Math.sin(pitch) * dist + (o.sy || 0), cz + Math.cos(yaw) * Math.cos(pitch) * dist];
      G.m4.look(eye, [cx, ty, cz], [0, 1, 0], this.view);
      G.m4.persp(fov, aspect, 0.5, 140, this.proj);
      const sy = o.shift ?? 0, sx2 = o.shiftX ?? 0, P = this.proj;
      P[1] += sy * P[3]; P[5] += sy * P[7]; P[9] += sy * P[11]; P[13] += sy * P[15];
      if (sx2) { P[0] += sx2 * P[3]; P[4] += sx2 * P[7]; P[8] += sx2 * P[11]; P[12] += sx2 * P[15]; }
      G.m4.mul(this.proj, this.view, this.vp);
      this.eye = eye;
    }
    // ---------- luces dinámicas (máx. 8) ----------
    resetLights() { this.nl = 0; }
    addLight(x, y, z, r, cr, cg, cb) {
      if (this.nl >= 8) return; const i = this.nl++;
      this.lightsP[i * 4] = x; this.lightsP[i * 4 + 1] = y; this.lightsP[i * 4 + 2] = z; this.lightsP[i * 4 + 3] = r;
      this.lightsC[i * 3] = cr; this.lightsC[i * 3 + 1] = cg; this.lightsC[i * 3 + 2] = cb;
    }
    bindMain(mapW, mapH, hero, flick, amb, cut) {
      const gl = this.gl, u = this.main.u;
      gl.useProgram(this.main.p);
      gl.uniformMatrix4fv(u.uVP, false, this.vp);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.visTex); gl.uniform1i(u.uVis, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.litTex); gl.uniform1i(u.uLit, 1);
      gl.uniform2f(u.uMap, mapW, mapH); gl.uniform1f(u.uTime, this.time); gl.uniform3f(u.uHero, hero[0], hero[1], hero[2]);
      gl.uniform3f(u.uAmb, amb[0], amb[1], amb[2]); gl.uniform1f(u.uFlick, flick); gl.uniform1f(u.uCut, cut ? 1 : 0);
      gl.uniform4fv(u.uLP, this.lightsP); gl.uniform3fv(u.uLC, this.lightsC); gl.uniform1i(u.uNL, this.nl);
      gl.uniform4f(u.uTint, 0, 0, 0, 0); gl.uniform1f(u.uAlpha, 1); gl.uniform1i(u.uMode, 0);
    }

    // ---------- partículas: cubos instanciados (dos cubos de datos: normales y aditivas) ----------
    initParticleBuffers() {
      const gl = this.gl;
      const P = [], N = [], I = [];
      G.FACES.forEach((f, fi) => { const b = P.length / 3; for (const c of f.c) { P.push(c[0] - 0.5, c[1] - 0.5, c[2] - 0.5); N.push(...f.n); } I.push(b, b + 1, b + 2, b, b + 2, b + 3); });
      this.cubeVao = gl.createVertexArray(); gl.bindVertexArray(this.cubeVao);
      const bp = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bp); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(P), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      const bn = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bn); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(N), gl.STATIC_DRAW); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
      this.cubeIdx = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cubeIdx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(I), gl.STATIC_DRAW);
      this.partBuf = gl.createBuffer(); this.partCap = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribDivisor(3, 1);
      gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(4, 1);
      gl.bindVertexArray(null);
    }
    drawParticles(data, count, additive) {
      if (!count) return;
      const gl = this.gl;
      gl.useProgram(this.part.p); gl.uniformMatrix4fv(this.part.u.uVP, false, this.vp);
      gl.bindVertexArray(this.cubeVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf);
      gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, count * 8), gl.DYNAMIC_DRAW);
      gl.enable(gl.BLEND); gl.depthMask(false);
      gl.blendFunc(gl.SRC_ALPHA, additive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
      gl.drawElementsInstanced(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0, count);
      gl.depthMask(true); gl.disable(gl.BLEND); gl.bindVertexArray(null);
    }
  }
  G.Engine = Engine;

  // ---------- sistema de partículas en CPU ----------
  class Particles {
    constructor(max = 5000) {
      this.max = max; this.n = 0;
      this.p = new Float32Array(max * 8);        // x y z size  r g b a
      this.v = new Float32Array(max * 4);        // vx vy vz grav
      this.l = new Float32Array(max * 4);        // vida, vidaMax, arrastre, flags (1 = aditiva, 2 = encoge, 4 = parpadea)
      this.outN = new Float32Array(max * 8); this.outA = new Float32Array(max * 8);
    }
    spawn(x, y, z, vx, vy, vz, life, size, color, alpha = 1, grav = 0, drag = 0, flags = 0) {
      if (this.n >= this.max) return;
      const i = this.n++, p = this.p, v = this.v, l = this.l;
      p[i * 8] = x; p[i * 8 + 1] = y; p[i * 8 + 2] = z; p[i * 8 + 3] = size;
      p[i * 8 + 4] = ((color >> 16) & 255) / 255; p[i * 8 + 5] = ((color >> 8) & 255) / 255; p[i * 8 + 6] = (color & 255) / 255; p[i * 8 + 7] = alpha;
      v[i * 4] = vx; v[i * 4 + 1] = vy; v[i * 4 + 2] = vz; v[i * 4 + 3] = grav;
      l[i * 4] = life; l[i * 4 + 1] = life; l[i * 4 + 2] = drag; l[i * 4 + 3] = flags;
    }
    update(dt) {
      const p = this.p, v = this.v, l = this.l;
      for (let i = 0; i < this.n;) {
        l[i * 4] -= dt;
        if (l[i * 4] <= 0) { // intercambia con el último
          const j = --this.n;
          if (i !== j) { for (let k = 0; k < 8; k++) p[i * 8 + k] = p[j * 8 + k]; for (let k = 0; k < 4; k++) { v[i * 4 + k] = v[j * 4 + k]; l[i * 4 + k] = l[j * 4 + k]; } }
          continue;
        }
        const d = Math.max(0, 1 - l[i * 4 + 2] * dt);
        v[i * 4] *= d; v[i * 4 + 2] *= d; v[i * 4 + 1] = v[i * 4 + 1] * d - v[i * 4 + 3] * dt;
        p[i * 8] += v[i * 4] * dt; p[i * 8 + 1] += v[i * 4 + 1] * dt; p[i * 8 + 2] += v[i * 4 + 2] * dt;
        if (p[i * 8 + 1] < 0.02 && v[i * 4 + 3] > 0) { p[i * 8 + 1] = 0.02; v[i * 4 + 1] *= -0.25; v[i * 4] *= 0.6; v[i * 4 + 2] *= 0.6; }
        i++;
      }
    }
    // rellena los búferes de dibujo (normales y aditivas); devuelve [nNormal, nAditiva]
    pack(fade = 1) {
      let a = 0, b = 0; const p = this.p, l = this.l;
      for (let i = 0; i < this.n; i++) {
        const fl = l[i * 4 + 3], life = l[i * 4] / l[i * 4 + 1];
        const out = (fl & 1) ? this.outA : this.outN, o = (fl & 1) ? b++ : a++;
        let s = p[i * 8 + 3], al = p[i * 8 + 7];
        if (fl & 2) s *= 0.25 + 0.75 * life; else if (life < 0.3) al *= life / 0.3;
        if (fl & 4) al *= 0.65 + 0.35 * Math.sin(life * 40 + i);
        out[o * 8] = p[i * 8]; out[o * 8 + 1] = p[i * 8 + 1]; out[o * 8 + 2] = p[i * 8 + 2]; out[o * 8 + 3] = s;
        out[o * 8 + 4] = p[i * 8 + 4]; out[o * 8 + 5] = p[i * 8 + 5]; out[o * 8 + 6] = p[i * 8 + 6]; out[o * 8 + 7] = al * fade;
      }
      return [a, b];
    }
  }
  G.Particles = Particles;
})(window.G);
