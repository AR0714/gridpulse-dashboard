/**
 * Flame / plasma ring drawn around the Health Index orb.
 *
 * A small standalone WebGL2 canvas (no three.js) with one full-screen fragment shader:
 * domain-warped simplex fbm for the flame body, ridged noise for hair-like filaments, thin
 * outward tendrils, and a soft glow. Everything is sampled on the unit circle so there is
 * no seam. The look is driven by FlameLook, so the fault scenarios can restyle it.
 */

export type FlameLook = {
  colDeep: [number, number, number] // outer, coolest part of the flame
  colMid: [number, number, number]
  colHot: [number, number, number] // hottest filaments
  intensity: number
  speed: number // flicker / flow speed multiplier
  reach: number // tendril length in CSS px
  sparks: number // 0..1 blue-white corona sparks (PD)
  arcs: number // 0..1 jagged lightning arcs around the rim (D2)
  hotRim: number // 0..1 yellow-white inner rim (T3)
}

const hex = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** The reference look: orange tendrils with gold-white filaments. */
export const REFERENCE_FLAME: FlameLook = {
  colDeep: hex('#4A1606'),
  colMid: hex('#D2612A'),
  colHot: hex('#FFE6B8'),
  intensity: 1,
  speed: 1,
  reach: 48,
  sparks: 0,
  arcs: 0,
  hotRim: 0,
}

const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = /* glsl */ `#version 300 es
precision highp float;

uniform vec2 uRes;        // canvas size in device px
uniform float uScale;     // device px per CSS px
uniform float uTime;
uniform float uDisc;      // disc radius, CSS px
uniform float uReach;     // tendril length, CSS px
uniform float uIntensity;
uniform float uSpeed;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uHot;
uniform float uSparks;
uniform float uArcs;
uniform float uHotRim;

out vec4 outColor;

// --- 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT) ---
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * snoise(p); p = p * 2.07 + 11.3; a *= 0.5; }
  return s;
}

float hash(float x) { return fract(sin(x * 127.1) * 43758.5453); }

void main() {
  vec2 px = (gl_FragCoord.xy - 0.5 * uRes) / uScale;   // CSS px from the centre
  float r = length(px);
  vec2 dir = px / max(r, 1e-3);
  float ang = atan(px.y, px.x);
  float t = uTime * uSpeed;
  float d = (r - uDisc - 8.0) / uReach;                 // 0 at the rim (just outside the disc), 1 at the tendril tips

  // large-scale warp so the whole ring breathes and licks
  float w = fbm(vec3(dir * 2.2, t * 0.25));

  // wobbly outline: the rim radius wanders by ~±25% of the reach
  d += 0.28 * fbm(vec3(dir * 3.0 + 4.0, t * 0.18));

  // clumps: denser and sparser stretches, but the ring never fully breaks
  float clump = 0.45 + 0.55 * smoothstep(-0.3, 0.45, fbm(vec3(dir * 3.4 + w * 0.6, t * 0.22 + 2.0)));

  // crackly band straddling the rim, reaching well inside the black disc
  float band = exp(-max(d, 0.0) * 3.2) * smoothstep(-1.0, -0.05, d);
  float n = fbm(vec3(dir * 7.0 + w * 0.9, d * 1.6 - t * 0.9));
  float flame = band * clamp(0.1 + 0.8 * n, 0.0, 1.1) * clump;

  // wispy filaments that curl ALONG the rim (high radial, lower angular frequency)
  float ra = 1.0 - abs(snoise(vec3(dir * 9.0 + w * 1.4, d * 9.0 - t * 0.8)));
  float rb = 1.0 - abs(snoise(vec3(dir * 17.0 - w * 1.8, d * 15.0 - t * 1.2 + 5.0)));
  float fil = (pow(ra, 10.0) + 0.45 * pow(rb, 12.0)) * band * clump;

  // a few radial hairs and longer tendrils crackling outward
  float rr = 1.0 - abs(snoise(vec3(dir * 46.0 + w * 2.6, d * 2.4 - t * 1.6)));
  fil += pow(rr, 16.0) * band * clump * 0.7;
  float rt = 1.0 - abs(snoise(vec3(dir * 12.0 + w * 3.2, d * 0.7 - t * 0.6 + 3.1)));
  float tend = pow(rt, 26.0) * smoothstep(1.5, 0.1, d) * smoothstep(-0.15, 0.15, d);
  tend *= smoothstep(0.55, 0.9, clump);

  // ~8 golden-white hot arcs spread around the rim
  float hs = smoothstep(0.2, 0.55, snoise(vec3(dir * 4.5 + 1.7, t * 0.3)));
  float hotspot = hs * exp(-abs(d + 0.05) * 7.0) * smoothstep(-0.2, 0.4, n + 0.25) * (0.35 + 0.65 * pow(ra, 2.0));

  float I = (flame * 0.5 + fil * 1.25 + tend * 1.3 + hotspot * 2.2) * uIntensity;

  // yellow-white inner rim (hot thermal fault)
  float rim = exp(-abs(d + 0.05) * 14.0) * uHotRim * (0.7 + 0.3 * n);
  I += rim * 1.2;

  vec3 col = mix(uDeep, uMid, smoothstep(0.05, 0.5, I));
  col = mix(col, uHot, smoothstep(0.6, 1.3, I + rim + hotspot * 0.4));
  col *= I;

  // faint halo around the ring
  float halo = exp(-max(d, 0.0) * 1.8) * smoothstep(-0.3, 0.05, d) * 0.08 * uIntensity * (0.4 + clump);
  col += uMid * halo;

  // blue-white corona sparks popping off the rim (partial discharge)
  if (uSparks > 0.0) {
    float slot = floor((ang + 3.14159) / 6.28318 * 90.0);
    float life = fract(t * 1.3 + hash(slot) * 10.0);
    float on = step(1.0 - 0.12 * uSparks, hash(slot + floor(t * 1.3 + hash(slot) * 10.0) * 17.0));
    float sa = abs(fract((ang + 3.14159) / 6.28318 * 90.0) - 0.5);
    float sr = abs(d - life * 0.9);
    float spark = on * exp(-sa * 22.0) * exp(-sr * 18.0) * (1.0 - life);
    col += vec3(0.75, 0.88, 1.0) * spark * 2.5;
  }

  // jagged lightning arcs jumping along the rim (high-energy arcing)
  if (uArcs > 0.0) {
    float k = floor(t * 9.0);
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float a0 = hash(k * 3.1 + fi * 7.7) * 6.28318 - 3.14159;
      float len = 0.5 + hash(k * 1.7 + fi) * 0.9;
      float da = mod(ang - a0 + 3.14159, 6.28318) - 3.14159;
      if (da > 0.0 && da < len) {
        float seg = floor(da * 18.0);
        float jitter = mix(hash(seg + k + fi * 13.0), hash(seg + 1.0 + k + fi * 13.0), fract(da * 18.0)) - 0.5;
        float tgt = 0.1 + jitter * 0.55;
        float line = exp(-abs(d - tgt) * 40.0) * smoothstep(0.0, 0.08, da) * smoothstep(len, len - 0.08, da);
        col += vec3(1.0, 0.86, 0.72) * line * 3.0 * uArcs * step(0.35, hash(k + fi * 5.0));
      }
    }
  }

  // keep the disc itself black: nothing is drawn deep inside the rim
  col *= smoothstep(-1.1, -0.5, d);

  // Premultiplied output: rgb is added as light, alpha only marks the black disc (with the
  // same wobbly, soft edge as the flames), which hides the coil behind the number.
  float disc = 1.0 - smoothstep(-0.45, 0.05, d);
  outColor = vec4(min(col, vec3(1.0)), disc);
}
`

export type FlameRing = {
  setLook: (look: FlameLook) => void
  render: (time: number) => void
  resize: (cssSize: number, dpr: number, discRadius: number) => void
  dispose: () => void
}

export function createFlameRing(canvas: HTMLCanvasElement): FlameRing | null {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false })
  if (!gl) return null

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader error')
    return s
  }
  const vs = compile(gl.VERTEX_SHADER, VERT)
  const fs = compile(gl.FRAGMENT_SHADER, FRAG)
  const prog = gl.createProgram()!
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link error')
  gl.useProgram(prog)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  const u = (name: string) => gl.getUniformLocation(prog, name)
  const U = {
    res: u('uRes'),
    scale: u('uScale'),
    time: u('uTime'),
    disc: u('uDisc'),
    reach: u('uReach'),
    intensity: u('uIntensity'),
    speed: u('uSpeed'),
    deep: u('uDeep'),
    mid: u('uMid'),
    hot: u('uHot'),
    sparks: u('uSparks'),
    arcs: u('uArcs'),
    hotRim: u('uHotRim'),
  }

  return {
    setLook(look) {
      gl.uniform3fv(U.deep, look.colDeep)
      gl.uniform3fv(U.mid, look.colMid)
      gl.uniform3fv(U.hot, look.colHot)
      gl.uniform1f(U.intensity, look.intensity)
      gl.uniform1f(U.speed, look.speed)
      gl.uniform1f(U.reach, look.reach)
      gl.uniform1f(U.sparks, look.sparks)
      gl.uniform1f(U.arcs, look.arcs)
      gl.uniform1f(U.hotRim, look.hotRim)
    },
    resize(cssSize, dpr, discRadius) {
      const px = Math.round(cssSize * dpr)
      canvas.width = canvas.height = px
      gl.viewport(0, 0, px, px)
      gl.uniform2f(U.res, px, px)
      gl.uniform1f(U.scale, dpr)
      gl.uniform1f(U.disc, discRadius)
    },
    render(time) {
      gl.uniform1f(U.time, time)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    dispose() {
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      // No loseContext(): React StrictMode re-mounts on the same canvas, which would get a dead context.
    },
  }
}
