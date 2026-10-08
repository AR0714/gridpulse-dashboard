import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createParticleMaterial, mulberry32 } from './particleMaterial'

const COUNT = 800
// Drift box half-extents. Wider than tall so the dust covers the whole 16:9 panel.
const BOX = new THREE.Vector3(6, 3.6, 3)

const CREAM = new THREE.Color('#FFF1DC')
const WHITE = new THREE.Color('#FFFFFF')
const EMBER = new THREE.Color('#FF9A50')

/** Soft radial gradient used for the big out-of-focus bokeh orbs. */
function makeGlowTexture() {
  const s = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = s
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.75, 'rgba(255,255,255,0.3)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// [x, y, z, scale, opacity, colour]
const ORBS: [number, number, number, number, number, string][] = [
  [-5.2, 1.9, -0.5, 1.15, 0.5, '#FF6A10'], // top-left, like the big orange blur in the reference
  [-2.6, 3.4, -1.0, 0.9, 0.22, '#FF7A1A'], // top edge
  [5.6, -2.6, -1.0, 2.5, 0.14, '#FF8C00'], // bottom-right corner
  [3.6, 0.4, -4.0, 12.0, 0.2, '#9A3A12'], // warm haze behind the coil (right half only)
]

type Props = { still?: boolean }

export default function Dust({ still = false }: Props) {
  const dpr = useThree((s) => s.viewport.dpr)
  const glow = useMemo(makeGlowTexture, [])

  const geometry = useMemo(() => {
    const rand = mulberry32(23)
    const pos = new Float32Array(COUNT * 3)
    const col = new Float32Array(COUNT * 3)
    const size = new Float32Array(COUNT)
    const alpha = new Float32Array(COUNT)
    const phase = new Float32Array(COUNT)
    const c = new THREE.Color()
    for (let i = 0; i < COUNT; i++) {
      pos.set([(rand() * 2 - 1) * BOX.x, (rand() * 2 - 1) * BOX.y, (rand() * 2 - 1) * BOX.z], i * 3)
      const r = rand()
      c.copy(r < 0.55 ? CREAM : r < 0.8 ? WHITE : EMBER)
      col.set([c.r, c.g, c.b], i * 3)
      const big = rand() < 0.06
      size[i] = big ? 2.5 + rand() * 2.5 : 0.4 + rand() * 0.9
      alpha[i] = big ? 0.35 + rand() * 0.3 : 0.25 + rand() * 0.6
      phase[i] = rand()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
    return g
  }, [])

  const material = useMemo(() => createParticleMaterial({ uDrift: 0.02, uDriftBox: BOX, uBokeh: 1, uFocus: 6 }), [])

  useEffect(() => {
    material.uniforms.uPixelRatio.value = dpr
  }, [dpr, material])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
      glow.dispose()
    },
    [geometry, material, glow],
  )

  useFrame((_, delta) => {
    if (!still) material.uniforms.uTime.value += delta
  })

  return (
    <>
      {ORBS.map(([x, y, z, s, o, color], k) => (
        <mesh key={k} position={[x, y, z]} scale={s} renderOrder={-1}>
          <planeGeometry />
          <meshBasicMaterial
            map={glow}
            color={color}
            transparent
            opacity={o}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
      <points geometry={geometry} material={material} frustumCulled={false} />
    </>
  )
}
