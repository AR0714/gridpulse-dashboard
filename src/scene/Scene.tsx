import { useEffect, type CSSProperties } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useReducedMotion } from '../lib/motion'
import { FREEZE_AT } from '../lib/debug'
import WindingCoil from './WindingCoil'
import { LOOKS } from '../lib/looks'
import { useMonitor } from '../store/useMonitor'
import Dust from './Dust'

/** Stop the render loop while the tab is hidden; resume when it comes back. */
function PauseWhenHidden({ still }: { still: boolean }) {
  const setFrameloop = useThree((s) => s.setFrameloop)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    const apply = () => {
      if (document.hidden) setFrameloop('never')
      else if (still) {
        setFrameloop('demand')
        invalidate()
      } else setFrameloop('always')
    }
    apply()
    document.addEventListener('visibilitychange', apply)
    return () => document.removeEventListener('visibilitychange', apply)
  }, [setFrameloop, invalidate, still])
  return null
}

/** Very slight camera drift so the scene never feels frozen. */
function CameraDrift({ still }: { still: boolean }) {
  useFrame(({ camera, clock }) => {
    if (still && FREEZE_AT === null) return
    const t = FREEZE_AT ?? clock.elapsedTime
    camera.position.x = Math.sin(t * 0.07) * 0.12
    camera.position.y = Math.sin(t * 0.05 + 1.3) * 0.08
    camera.lookAt(0, 0, 0)
  })
  return null
}

type Props = { className?: string; style?: CSSProperties }

export default function Scene({ className, style }: Props) {
  const still = useReducedMotion()
  const code = useMonitor((s) => s.code)
  return (
    <div className={className} style={style} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 55, near: 0.1, far: 50 }}
        dpr={[1, 1.75]}
        frameloop="always"
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      >
        <color attach="background" args={['#0b0b16']} />
        <PauseWhenHidden still={still} />
        <CameraDrift still={still} />
        <WindingCoil still={still} look={LOOKS[code]} />
        <Dust still={still} />
        <EffectComposer multisampling={0}>
          {/* Depth of field is done per particle in particleMaterial.ts: the additive points
              write no depth, so a screen-space DepthOfField pass blurs the whole frame. */}
          <Bloom mipmapBlur intensity={1.8} luminanceThreshold={0.15} radius={0.7} />
          <Vignette offset={0.3} darkness={0.9} />
          <Noise opacity={0.04} blendFunction={BlendFunction.OVERLAY} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
