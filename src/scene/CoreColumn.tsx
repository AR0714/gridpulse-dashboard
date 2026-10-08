import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createParticleMaterial, mulberry32 } from './particleMaterial'

const COUNT = 2000
const DIM = new THREE.Color('#4060A0')

/** Faint laminated iron core: a thin vertical column of dim grey-blue particles inside the winding. */
export default function CoreColumn() {
  const dpr = useThree((s) => s.viewport.dpr)
  const geometry = useMemo(() => {
    const rand = mulberry32(11)
    const pos = new Float32Array(COUNT * 3)
    const col = new Float32Array(COUNT * 3)
    const size = new Float32Array(COUNT)
    const alpha = new Float32Array(COUNT)
    const phase = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      pos.set([(rand() - 0.5) * 0.16, rand() * 9 - 4.5, (rand() - 0.5) * 0.16], i * 3)
      col.set([DIM.r, DIM.g, DIM.b], i * 3)
      size[i] = 0.5 + rand() * 0.6
      alpha[i] = 0.5 + rand() * 0.5
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
  const material = useMemo(() => createParticleMaterial({ uOpacity: 0.3, uTwinkle: 0, uBokeh: 1 }), [])

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

  return <points geometry={geometry} material={material} frustumCulled={false} />
}
