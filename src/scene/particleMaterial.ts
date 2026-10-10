import * as THREE from 'three'

/**
 * Shared soft-sprite particle material.
 *
 * Attributes: position, aColor (vec3), aSize (multiplier), aAlpha, aPhase (0..1 random).
 * Optional aNormal (vec3): when uLit = 1 the colour is blended from the shadow tint to
 * aColor by the dot product of the world-space normal with uLightDir, so the lit side
 * stays lit while the object rotates.
 *
 * Depth of field is faked per particle as well: points far from uFocus grow into large,
 * dim bokeh discs. The post-processing DepthOfField can't see additive points (they don't
 * write depth), so this is what actually gives the near and far ends their bokeh.
 *
 * Optional aPulse (vec2: helix parameter t, response 0..1): particles light up white-hot as
 * the current pulse head (uPulseHead, same t units) passes them, with a comet tail behind.
 */
export type ParticleUniforms = {
  uTime: { value: number }
  uSize: { value: number }
  uPixelRatio: { value: number }
  uOpacity: { value: number }
  uTwinkle: { value: number }
  uLit: { value: number }
  uLightDir: { value: THREE.Vector3 }
  uShadow: { value: THREE.Color }
  uFocus: { value: number }
  uBokeh: { value: number }
  uDrift: { value: number }
  uDriftBox: { value: THREE.Vector3 }
  uPulseHead: { value: number }
  uPulseLen: { value: number }
  uPulseGain: { value: number }
}

const vertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aAlpha;
  attribute float aPhase;
  attribute vec3 aNormal;
  attribute vec2 aPulse;

  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uOpacity;
  uniform float uTwinkle;
  uniform float uLit;
  uniform vec3 uLightDir;
  uniform vec3 uShadow;
  uniform float uFocus;
  uniform float uBokeh;
  uniform float uDrift;
  uniform vec3 uDriftBox;
  uniform float uPulseHead;
  uniform float uPulseLen;
  uniform float uPulseGain;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    if (uDrift > 0.0) {
      // slow upward drift with wraparound, plus a little sideways sway
      p.y = mod(p.y + uTime * uDrift * (0.6 + aPhase) + uDriftBox.y, 2.0 * uDriftBox.y) - uDriftBox.y;
      p.x += sin(uTime * 0.15 + aPhase * 40.0) * 0.08;
    }

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    vec3 col = aColor;
    if (uLit > 0.5) {
      vec3 n = normalize(mat3(modelMatrix) * aNormal);
      float l = dot(n, normalize(uLightDir));
      col = mix(uShadow, aColor, smoothstep(-0.55, 0.35, l));
      col *= 0.8 + 1.5 * smoothstep(-0.2, 1.0, l); // HDR on the lit side so Bloom picks it up
    }

    // current pulse: sharp leading edge, exponential comet tail behind the head
    float pg = 0.0;
    if (aPulse.y > 0.0 && uPulseGain > 0.0) {
      float dt = uPulseHead - aPulse.x;
      pg = aPulse.y * uPulseGain * (dt >= 0.0 ? exp(-dt / uPulseLen) : exp(dt / (uPulseLen * 0.12)));
      col = mix(col, vec3(1.0, 0.62, 0.28) * 2.7, clamp(pg, 0.0, 1.0) * 0.75); // warm glow; the white-hot core is the streak itself
    }

    float tw = 1.0 - uTwinkle * 0.55 + uTwinkle * 0.55 * sin(uTime * (1.2 + aPhase * 2.6) + aPhase * 6.2831);

    float depth = -mv.z;
    // circle of confusion, with an in-focus zone of ±1.5 units around the focal plane
    float coc = clamp((abs(depth - uFocus) - 1.5) / uFocus, 0.0, 1.0) * uBokeh;
    float size = uSize * aSize * (1.0 + coc * 5.0) * (1.0 + pg * 0.35);

    gl_PointSize = size * uPixelRatio * (6.0 / depth);
    vColor = col;
    vAlpha = min(1.0, aAlpha * (1.0 + pg) * tw) * uOpacity / (1.0 + coc * coc * 9.0);
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float a = 1.0 - smoothstep(0.0, 1.0, d);
    a = a * a * (0.6 + 0.4 * (1.0 - smoothstep(0.55, 1.0, d)));
    gl_FragColor = vec4(vColor * a * vAlpha, a * vAlpha);
  }
`

export function createParticleMaterial(overrides: Partial<Record<keyof ParticleUniforms, number | THREE.Vector3 | THREE.Color>> = {}) {
  const uniforms: ParticleUniforms = {
    uTime: { value: 0 },
    uSize: { value: 2.5 },
    uPixelRatio: { value: 1 },
    uOpacity: { value: 1 },
    uTwinkle: { value: 1 },
    uLit: { value: 0 },
    uLightDir: { value: new THREE.Vector3(-0.4, 0.6, 1).normalize() },
    uShadow: { value: new THREE.Color('#6040A0') },
    uFocus: { value: 6 },
    uBokeh: { value: 0 },
    uDrift: { value: 0 },
    uDriftBox: { value: new THREE.Vector3(3, 3, 3) },
    uPulseHead: { value: -1 },
    uPulseLen: { value: 0.035 },
    uPulseGain: { value: 0 },
  }
  for (const [k, v] of Object.entries(overrides)) {
    ;(uniforms as Record<string, { value: unknown }>)[k].value = v
  }
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

/** Deterministic PRNG so the coil looks identical on every load (and in screenshots). */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
