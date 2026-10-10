import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createParticleMaterial, mulberry32 } from './particleMaterial'
import CoreColumn from './CoreColumn'
import { FREEZE_AT } from '../lib/debug'
import { LOOKS, blendInto, cloneLook, easeFactor, type VisualLook } from '../lib/looks'

// Winding geometry (world units, before the group scale below)
export const COIL = {
  radius: 1.25,
  turns: 2.35,
  height: 8, // pitch ≈ 3.4: long enough that both ends leave the frame, like the reference
  tube: 0.2, // thickness of each conductor strand
  strandParticles: 8000, // bright beads, per helix (HV + LV)
  bodyParticles: 1500, // large dim sprites per helix that fill the strand into a solid ribbon
  rungParticles: 6000, // spacers between the windings, like DNA base pairs
  rungsPerTurn: 4,
}

// The head sweeps the on-screen part of the winding and fades in/out at either end,
// so the streak is visible for most of each pass.
const HEAD_FROM = 0.1
const HEAD_TO = 0.92

const COPPER = new THREE.Color('#E8843A')
const AMBER = new THREE.Color('#FFB347')
const GOLD = new THREE.Color('#FFD08A')

function endFade(t: number) {
  const s = (a: number, b: number, x: number) => {
    const k = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return k * k * (3 - 2 * k)
  }
  return s(0, 0.06, t) * s(1, 0.94, t)
}

/** Centre of a winding at helix parameter t (0..1), with its outward normal and binormal. */
function helixFrame(t: number, ph: number, centre: THREE.Vector3, N: THREE.Vector3, B: THREE.Vector3) {
  const { radius: R, turns, height: H } = COIL
  const th = 2 * Math.PI * t * turns + ph
  centre.set(R * Math.cos(th), t * H - H / 2, R * Math.sin(th))
  N.set(Math.cos(th), 0, Math.sin(th))
  const T = new THREE.Vector3(-R * Math.sin(th) * 2 * Math.PI * turns, H, R * Math.cos(th) * 2 * Math.PI * turns).normalize()
  B.crossVectors(T, N).normalize()
}

function rungCount() {
  return Math.round(COIL.turns * COIL.rungsPerTurn)
}

function buildCoil() {
  const { turns, tube, strandParticles, bodyParticles, rungParticles } = COIL
  const total = (strandParticles + bodyParticles) * 2 + rungParticles
  const pos = new Float32Array(total * 3)
  const nrm = new Float32Array(total * 3)
  const col = new Float32Array(total * 3)
  const size = new Float32Array(total)
  const alpha = new Float32Array(total)
  const phase = new Float32Array(total)
  const pulse = new Float32Array(total * 2)
  const rand = mulberry32(7)
  const c = new THREE.Color()
  const N = new THREE.Vector3()
  const B = new THREE.Vector3()
  const off = new THREE.Vector3()
  const p = new THREE.Vector3()
  let i = 0

  const put = (q: THREE.Vector3, n: THREE.Vector3, color: THREE.Color, s: number, a: number, t: number, response: number) => {
    pos.set([q.x, q.y, q.z], i * 3)
    nrm.set([n.x, n.y, n.z], i * 3)
    col.set([color.r, color.g, color.b], i * 3)
    size[i] = s
    alpha[i] = a
    phase[i] = rand()
    pulse.set([t, response], i * 2)
    i++
  }

  const pickSize = () => {
    const r = rand()
    if (r < 0.7) return 1.2 + rand() * 1.1
    if (r < 0.95) return 2.4 + rand() * 1.6
    return 4.2 + rand() * 3.0
  }

  // The pulse runs along winding 0 (HV); winding 1 only catches a little spill light.
  for (let s = 0; s < 2; s++) {
    const ph = s * Math.PI
    for (let k = 0; k < strandParticles; k++) {
      const t = rand()
      helixFrame(t, ph, p, N, B)
      const ang = rand() * Math.PI * 2
      const rr = tube * (0.7 + 0.3 * Math.sqrt(rand())) // mostly on the surface so the strand reads as a tube
      off.copy(N).multiplyScalar(Math.cos(ang) * rr).addScaledVector(B, Math.sin(ang) * rr)
      p.add(off)
      const n = off.clone().normalize().multiplyScalar(0.7).addScaledVector(N, 0.5).normalize()
      c.copy(COPPER).lerp(AMBER, rand())
      if (rand() < 0.1) c.copy(GOLD)
      const sz = pickSize()
      put(p, n, c, sz, (0.75 + rand() * 0.25) * endFade(t), t, s === 0 ? 1 : 0.08)
    }
  }

  const BODY = new THREE.Color('#B8653C')
  for (let s = 0; s < 2; s++) {
    const ph = s * Math.PI
    for (let k = 0; k < bodyParticles; k++) {
      const t = rand()
      helixFrame(t, ph, p, N, B)
      p.addScaledVector(N, (rand() - 0.5) * tube * 0.6)
      p.y += (rand() - 0.5) * tube * 0.6
      put(p, N, BODY, 6 + rand() * 4, 0.22 * endFade(t), t, s === 0 ? 0.6 : 0)
    }
  }

  const rungs = rungCount()
  const per = Math.floor(rungParticles / rungs)
  const A = new THREE.Vector3()
  const Bp = new THREE.Vector3()
  const W = new THREE.Vector3()
  for (let r = 0; r < rungs; r++) {
    const t = (r + 0.5) / rungs
    const th = 2 * Math.PI * t * turns
    helixFrame(t, 0, A, N, B)
    helixFrame(t, Math.PI, Bp, off, B)
    N.set(Math.cos(th), 0, Math.sin(th))
    W.set(-Math.sin(th), 0, Math.cos(th))
    for (let k = 0; k < per && i < total; k++) {
      const u = rand()
      // a flat bar: wide along the winding direction, thin along the axis
      p.copy(A).lerp(Bp, u).addScaledVector(W, (rand() - 0.5) * 0.3)
      p.y += (rand() - 0.5) * 0.08
      p.addScaledVector(N, (rand() - 0.5) * 0.05)
      const n = N.clone().multiplyScalar(0.5 - u).add(new THREE.Vector3(0, 0.7, 0.7)).normalize()
      c.copy(COPPER).lerp(AMBER, rand() * 0.6)
      put(p, n, c, 1.2 + rand() * 1.8, (0.8 + rand() * 0.2) * endFade(t), t, 0.25 * (1 - u))
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, i * 3), 3))
  g.setAttribute('aNormal', new THREE.BufferAttribute(nrm.subarray(0, i * 3), 3))
  g.setAttribute('aColor', new THREE.BufferAttribute(col.subarray(0, i * 3), 3))
  g.setAttribute('aSize', new THREE.BufferAttribute(size.subarray(0, i), 1))
  g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha.subarray(0, i), 1))
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase.subarray(0, i), 1))
  g.setAttribute('aPulse', new THREE.BufferAttribute(pulse.subarray(0, i * 2), 2))
  return g
}

// ---------------------------------------------------------------------------------------------
// Current pulse: a jagged white-yellow streak with an orange halo running along winding 0,
// throwing sparks across some of the rungs as it passes them.
// ---------------------------------------------------------------------------------------------

const PULSE_CORE = 4000
const PULSE_HALO = 1200
const SPARK_PER_RUNG = 150

const KIND_CORE = 0
const KIND_HALO = 1
const KIND_SPARK = 2

function buildPulse() {
  const { tube } = COIL
  const rand = mulberry32(31)
  const rungs = rungCount()
  // Sparks jump on most rungs (chosen once, so the pattern is stable).
  const sparkRungs = Array.from({ length: rungs }, (_, r) => r).filter(() => rand() < 0.7)
  const total = PULSE_CORE + PULSE_HALO + sparkRungs.length * SPARK_PER_RUNG
  const pos = new Float32Array(total * 3)
  const side = new Float32Array(total * 3)
  const tAttr = new Float32Array(total)
  const kind = new Float32Array(total)
  const u = new Float32Array(total)
  const size = new Float32Array(total)
  const C = new THREE.Vector3()
  const N = new THREE.Vector3()
  const B = new THREE.Vector3()
  let i = 0

  const put = (p: THREE.Vector3, sd: THREE.Vector3, t: number, k: number, uu: number, s: number) => {
    pos.set([p.x, p.y, p.z], i * 3)
    side.set([sd.x, sd.y, sd.z], i * 3)
    tAttr[i] = t
    kind[i] = k
    u[i] = uu
    size[i] = s
    i++
  }

  const p = new THREE.Vector3()
  const sd = new THREE.Vector3()
  for (let k = 0; k < PULSE_CORE; k++) {
    const t = k / PULSE_CORE
    helixFrame(t, 0, C, N, B)
    // ride along the outer, camera-facing edge of the conductor
    p.copy(C).addScaledVector(N, tube * 0.75).addScaledVector(B, (rand() - 0.5) * tube * 0.25)
    sd.copy(B).multiplyScalar(0.8).addScaledVector(N, 0.6).normalize()
    put(p, sd, t, KIND_CORE, rand(), 0.8 + rand() * 0.9)
  }
  for (let k = 0; k < PULSE_HALO; k++) {
    const t = rand()
    helixFrame(t, 0, C, N, B)
    p.copy(C).addScaledVector(N, tube * 0.5)
    sd.copy(B)
    put(p, sd, t, KIND_HALO, rand(), 14 + rand() * 12)
  }
  const A = new THREE.Vector3()
  const Bp = new THREE.Vector3()
  for (const r of sparkRungs) {
    const t = (r + 0.5) / rungs
    helixFrame(t, 0, A, N, B)
    helixFrame(t, Math.PI, Bp, N, B)
    const th = 2 * Math.PI * t * COIL.turns
    sd.set(-Math.sin(th), 0.6, Math.cos(th)).normalize()
    for (let k = 0; k < SPARK_PER_RUNG; k++) {
      const uu = k / (SPARK_PER_RUNG - 1)
      p.copy(A).lerp(Bp, uu)
      put(p, sd, t, KIND_SPARK, uu, 0.8 + rand() * 0.8)
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, i * 3), 3))
  g.setAttribute('aSide', new THREE.BufferAttribute(side.subarray(0, i * 3), 3))
  g.setAttribute('aT', new THREE.BufferAttribute(tAttr.subarray(0, i), 1))
  g.setAttribute('aKind', new THREE.BufferAttribute(kind.subarray(0, i), 1))
  g.setAttribute('aU', new THREE.BufferAttribute(u.subarray(0, i), 1))
  g.setAttribute('aSize', new THREE.BufferAttribute(size.subarray(0, i), 1))
  return g
}

const pulseVertex = /* glsl */ `
  attribute vec3 aSide;
  attribute float aT;
  attribute float aKind;
  attribute float aU;
  attribute float aSize;

  uniform float uTime;
  uniform float uHead;
  uniform float uTail;
  uniform float uGain;
  uniform float uJump;
  uniform float uPixelRatio;
  uniform float uFade;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vCore;

  float hash(float x) { return fract(sin(x * 127.1) * 43758.5453); }

  // piecewise-linear noise: straight segments with sharp kinks, like a lightning bolt
  float jag(float x, float seed) {
    float i = floor(x);
    return mix(hash(i + seed), hash(i + 1.0 + seed), fract(x)) - 0.5;
  }

  void main() {
    float flick = floor(uTime * 24.0);  // re-roll the bolt shape ~24 times a second
    float I = 0.0;
    vec3 p = position;
    vec3 col;
    float size;

    if (aKind < 1.5) {
      float dt = uHead - aT;
      I = dt >= 0.0 ? exp(-dt / uTail) : exp(dt / (uTail * 0.08));
      // kinks every ~0.18 units with a little fine crackle on top
      float j = jag(aT * 160.0, flick * 7.13) + 0.35 * jag(aT * 640.0, flick * 3.7);
      p += aSide * j * (0.045 + 0.03 * I);
      if (aKind < 0.5) {
        col = mix(vec3(1.0, 0.55, 0.18), vec3(1.0, 0.96, 0.82), smoothstep(0.2, 0.75, I)) * 5.0;
        size = 3.8 * aSize * (0.7 + 0.6 * I);
        vCore = 1.0;
      } else {
        col = vec3(1.0, 0.45, 0.12) * 1.6;
        size = aSize * 1.35 * (0.7 + 0.5 * I);
        I *= 0.5;
        vCore = 0.0;
      }
    } else {
      // spark crossing a rung from winding 0 to winding 1
      float ph = (uHead - aT) / uJump;
      if (ph > 0.0 && ph < 1.4) {
        float front = ph;
        float lead = exp(-abs(aU - front) / 0.1);
        float trail = aU < front ? 0.6 * exp(-(front - aU) / 0.5) : 0.0; // the arc stays lit behind the front
        I = min(1.0, lead + trail) * (1.0 - smoothstep(0.9, 1.4, ph));
      }
      float j = jag(aU * 22.0, flick * 5.1 + aT * 91.0);
      p += aSide * j * 0.12;
      col = mix(vec3(1.0, 0.5, 0.15), vec3(1.0, 0.95, 0.8), smoothstep(0.3, 0.9, I)) * 4.5;
      size = 3.0 * aSize * (0.6 + 0.6 * I);
      vCore = 1.0;
    }

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = size * uPixelRatio * (6.0 / -mv.z) * step(0.004, I);
    vColor = col;
    vAlpha = clamp(I * uGain * uFade, 0.0, 1.0);
  }
`

const pulseFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vCore;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    // core sprites have a hard hot centre; halo sprites are pure soft falloff
    float soft = 1.0 - smoothstep(0.0, 1.0, d);
    float hard = 1.0 - smoothstep(0.25, 0.6, d);
    float a = mix(soft * soft, max(hard, soft * 0.5), vCore) * vAlpha;
    gl_FragColor = vec4(vColor * a, a);
  }
`

function CurrentPulse({ material }: { material: THREE.ShaderMaterial }) {
  const geometry = useMemo(buildPulse, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />
}

// ---------------------------------------------------------------------------------------------
// Corona / discharge sparks: random points on the conductors that flash briefly.
// Blue-white for partial discharge, orange-white "bright discharges" for arcing.
// ---------------------------------------------------------------------------------------------

const CORONA_POINTS = 700

function buildCorona() {
  const { tube } = COIL
  const rand = mulberry32(53)
  const pos = new Float32Array(CORONA_POINTS * 3)
  const seed = new Float32Array(CORONA_POINTS)
  const size = new Float32Array(CORONA_POINTS)
  const C = new THREE.Vector3()
  const N = new THREE.Vector3()
  const B = new THREE.Vector3()
  for (let i = 0; i < CORONA_POINTS; i++) {
    const t = 0.08 + rand() * 0.84
    helixFrame(t, rand() < 0.5 ? 0 : Math.PI, C, N, B)
    const ang = rand() * Math.PI * 2
    C.addScaledVector(N, Math.cos(ang) * tube * 1.05).addScaledVector(B, Math.sin(ang) * tube * 1.05)
    pos.set([C.x, C.y, C.z], i * 3)
    seed[i] = rand()
    size[i] = rand() < 0.06 ? 3 + rand() * 2 : 0.8 + rand() * 0.8 // a few big bright ones
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
  return g
}

const coronaVertex = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uAmount;
  uniform float uRate;
  uniform float uPixelRatio;
  uniform vec3 uColor;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vCore;

  void main() {
    float k = uTime * uRate * (0.7 + 0.6 * aSeed) + aSeed * 37.0;
    float slot = floor(k);
    float life = fract(k);
    float on = step(1.0 - 0.12 * uAmount, fract(sin((slot + aSeed * 311.7) * 12.9898) * 43758.5453));
    float I = on * pow(1.0 - life, 3.0) * clamp(uAmount, 0.0, 1.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (3.0 + 8.0 * I) * aSize * uPixelRatio * (6.0 / -mv.z) * step(0.003, I);
    vColor = uColor * 3.2;
    vAlpha = I;
    vCore = 1.0;
  }
`

// ---------------------------------------------------------------------------------------------

type Props = {
  still?: boolean
  look?: VisualLook // target look for the current fault; blended toward over ~1 s
}

export default function WindingCoil({ still = false, look = LOOKS.N }: Props) {
  const spin = useRef<THREE.Group>(null)
  const clock = useRef(0)
  const phase = useRef(0) // pulse position, in passes (integrated so speed changes never jump)
  const stall = useRef(0) // seconds left in an arcing stutter
  const target = useRef(look)
  target.current = look
  const cur = useRef(cloneLook(look))
  const dpr = useThree((s) => s.viewport.dpr)
  const geometry = useMemo(buildCoil, [])
  const coronaGeometry = useMemo(buildCorona, [])
  const material = useMemo(() => createParticleMaterial({ uLit: 1, uBokeh: 1, uFocus: 6 }), [])
  const pulseMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uHead: { value: -1 },
          uTail: { value: LOOKS.N.pulse.tail },
          uGain: { value: 1 },
          uJump: { value: 0.1 },
          uPixelRatio: { value: 1 },
          uFade: { value: 1 },
        },
        vertexShader: pulseVertex,
        fragmentShader: pulseFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )
  const coronaMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uAmount: { value: 0 },
          uRate: { value: 1 },
          uPixelRatio: { value: 1 },
          uColor: { value: new THREE.Color('#C4DCFF') },
        },
        vertexShader: coronaVertex,
        fragmentShader: pulseFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )

  useEffect(() => {
    material.uniforms.uPixelRatio.value = dpr
    pulseMaterial.uniforms.uPixelRatio.value = dpr
    coronaMaterial.uniforms.uPixelRatio.value = dpr
  }, [dpr, material, pulseMaterial, coronaMaterial])

  useEffect(
    () => () => {
      geometry.dispose()
      coronaGeometry.dispose()
      material.dispose()
      pulseMaterial.dispose()
      coronaMaterial.dispose()
    },
    [geometry, coronaGeometry, material, pulseMaterial, coronaMaterial],
  )

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const frozenAt = FREEZE_AT
    const frozen = frozenAt !== null
    const c = cur.current
    if (still || frozen) Object.assign(c, cloneLook(target.current))
    else blendInto(c, target.current, easeFactor(delta, 1))
    const P = c.pulse

    if (frozen) clock.current = frozenAt
    else if (!still) clock.current += delta

    // Pulse position. Arcing (stutter) makes it stall, skip ahead and flicker.
    let flicker = 1
    if (frozen) phase.current = frozenAt / P.period
    else if (still) phase.current = 0.42
    else if (stall.current > 0) {
      stall.current -= delta
      flicker = Math.random() < 0.5 ? 1.4 : 0.35
    } else {
      phase.current += delta / P.period
      if (Math.random() < P.stutter * delta * 2.5) stall.current = 0.05 + Math.random() * 0.12
      if (Math.random() < P.stutter * delta * 1.2) phase.current += 0.04 + Math.random() * 0.1
      if (P.stutter > 0.01 && Math.random() < 0.3 * P.stutter) flicker = 0.5 + Math.random() * 0.9
    }
    const pass = phase.current % 1
    const head = HEAD_FROM + (HEAD_TO - HEAD_FROM) * pass
    const fade = Math.min(1, pass / 0.1, (1 - pass) / 0.12)
    // A rung spark should take ~0.35 s to cross, whatever the pulse speed.
    const jump = (0.35 / P.period) * (HEAD_TO - HEAD_FROM)
    const gain = P.gain * flicker

    const cu = material.uniforms
    cu.uTime.value = clock.current
    cu.uPulseHead.value = head
    cu.uPulseLen.value = P.tail * 2.2 // the conductor stays hot a little longer than the bolt
    cu.uPulseGain.value = gain * fade
    cu.uTint.value.setRGB(c.coil.tint[0], c.coil.tint[1], c.coil.tint[2])

    const pu = pulseMaterial.uniforms
    pu.uTime.value = clock.current
    pu.uHead.value = head
    pu.uTail.value = P.tail
    pu.uGain.value = gain
    pu.uJump.value = jump
    pu.uFade.value = fade

    const ku = coronaMaterial.uniforms
    ku.uTime.value = clock.current
    ku.uAmount.value = c.coil.corona
    ku.uRate.value = c.coil.coronaRate
    ku.uColor.value.setRGB(c.coil.coronaColor[0], c.coil.coronaColor[1], c.coil.coronaColor[2])

    if (spin.current) {
      if (frozen) spin.current.rotation.y = 0.003 * 60 * frozenAt
      else if (!still) spin.current.rotation.y += 0.003 * delta * 60
    }
  })

  return (
    // Outer group places the winding diagonally across the panel, like the DNA in the reference;
    // the inner group spins it around its own axis.
    <group position={[1.35, 0.3, 0.2]} rotation={[0, 0, -0.68]} scale={1.45}>
      <group rotation={[-0.12, 0, 0]}>
        <group ref={spin}>
          <points geometry={geometry} material={material} frustumCulled={false} />
          <CurrentPulse material={pulseMaterial} />
          <points geometry={coronaGeometry} material={coronaMaterial} frustumCulled={false} renderOrder={3} />
        </group>
        <CoreColumn />
      </group>
    </group>
  )
}
