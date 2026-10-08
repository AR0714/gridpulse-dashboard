import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createParticleMaterial, mulberry32 } from './particleMaterial'
import CoreColumn from './CoreColumn'

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

function buildCoil() {
  const { radius: R, turns, height: H, tube, strandParticles, bodyParticles, rungParticles, rungsPerTurn } = COIL
  const total = (strandParticles + bodyParticles) * 2 + rungParticles
  const pos = new Float32Array(total * 3)
  const nrm = new Float32Array(total * 3)
  const col = new Float32Array(total * 3)
  const size = new Float32Array(total)
  const alpha = new Float32Array(total)
  const phase = new Float32Array(total)
  const rand = mulberry32(7)
  const c = new THREE.Color()
  const N = new THREE.Vector3()
  const T = new THREE.Vector3()
  const B = new THREE.Vector3()
  const off = new THREE.Vector3()
  let i = 0

  const centre = (t: number, ph: number, out: THREE.Vector3) => {
    const th = 2 * Math.PI * t * turns + ph
    return out.set(R * Math.cos(th), t * H - H / 2, R * Math.sin(th))
  }

  const put = (p: THREE.Vector3, n: THREE.Vector3, color: THREE.Color, s: number, a: number) => {
    pos.set([p.x, p.y, p.z], i * 3)
    nrm.set([n.x, n.y, n.z], i * 3)
    col.set([color.r, color.g, color.b], i * 3)
    size[i] = s
    alpha[i] = a
    phase[i] = rand()
    i++
  }

  const pickSize = () => {
    const r = rand()
    if (r < 0.7) return 1.2 + rand() * 1.1
    if (r < 0.95) return 2.4 + rand() * 1.6
    return 4.2 + rand() * 3.0
  }

  const p = new THREE.Vector3()
  for (let s = 0; s < 2; s++) {
    const ph = s * Math.PI
    for (let k = 0; k < strandParticles; k++) {
      const t = rand()
      const th = 2 * Math.PI * t * turns + ph
      N.set(Math.cos(th), 0, Math.sin(th))
      T.set(-R * Math.sin(th) * 2 * Math.PI * turns, H, R * Math.cos(th) * 2 * Math.PI * turns).normalize()
      B.crossVectors(T, N).normalize()
      const ang = rand() * Math.PI * 2
      const rr = tube * (0.7 + 0.3 * Math.sqrt(rand())) // mostly on the surface so the strand reads as a tube
      off.copy(N).multiplyScalar(Math.cos(ang) * rr).addScaledVector(B, Math.sin(ang) * rr)
      centre(t, ph, p).add(off)
      const n = off.clone().normalize().multiplyScalar(0.7).addScaledVector(N, 0.5).normalize()
      c.copy(COPPER).lerp(AMBER, rand())
      if (rand() < 0.1) c.copy(GOLD)
      const sz = pickSize()
      put(p, n, c, sz, (0.75 + rand() * 0.25) * endFade(t))
    }
  }

  const BODY = new THREE.Color('#B8653C')
  for (let s = 0; s < 2; s++) {
    const ph = s * Math.PI
    for (let k = 0; k < bodyParticles; k++) {
      const t = rand()
      const th = 2 * Math.PI * t * turns + ph
      N.set(Math.cos(th), 0, Math.sin(th))
      centre(t, ph, p)
      p.addScaledVector(N, (rand() - 0.5) * tube * 0.6)
      p.y += (rand() - 0.5) * tube * 0.6
      put(p, N, BODY, 6 + rand() * 4, 0.22 * endFade(t))
    }
  }

  const rungs = Math.round(turns * rungsPerTurn)
  const per = Math.floor(rungParticles / rungs)
  const A = new THREE.Vector3()
  const Bp = new THREE.Vector3()
  const W = new THREE.Vector3()
  for (let r = 0; r < rungs; r++) {
    const t = (r + 0.5) / rungs
    const th = 2 * Math.PI * t * turns
    centre(t, 0, A)
    centre(t, Math.PI, Bp)
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
      put(p, n, c, 1.2 + rand() * 1.8, (0.8 + rand() * 0.2) * endFade(t))
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, i * 3), 3))
  g.setAttribute('aNormal', new THREE.BufferAttribute(nrm.subarray(0, i * 3), 3))
  g.setAttribute('aColor', new THREE.BufferAttribute(col.subarray(0, i * 3), 3))
  g.setAttribute('aSize', new THREE.BufferAttribute(size.subarray(0, i), 1))
  g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha.subarray(0, i), 1))
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase.subarray(0, i), 1))
  return g
}

type Props = { still?: boolean }

export default function WindingCoil({ still = false }: Props) {
  const spin = useRef<THREE.Group>(null)
  const dpr = useThree((s) => s.viewport.dpr)
  const geometry = useMemo(buildCoil, [])
  const material = useMemo(() => createParticleMaterial({ uLit: 1, uBokeh: 1, uFocus: 6 }), [])

  useEffect(() => {
    material.uniforms.uPixelRatio.value = dpr
  }, [dpr, material])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((_, delta) => {
    if (still) return
    material.uniforms.uTime.value += delta
    if (spin.current) spin.current.rotation.y += 0.003 * delta * 60
  })

  return (
    // Outer group places the winding diagonally across the panel, like the DNA in the reference;
    // the inner group spins it around its own axis.
    <group position={[1.35, 0.3, 0.2]} rotation={[0, 0, -0.68]} scale={1.45}>
      <group rotation={[-0.12, 0, 0]}>
        <group ref={spin}>
          <points geometry={geometry} material={material} frustumCulled={false} />
        </group>
        <CoreColumn />
      </group>
    </group>
  )
}
