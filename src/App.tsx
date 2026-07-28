import { Canvas } from '@react-three/fiber'
import { WikiPanel } from './ui/WikiPanel'
import { Disclaimer } from './ui/Disclaimer'

// Interim shell during the isometric pivot — the voxel town lands in the next commits.
export default function App() {
  return (
    <>
      <Canvas orthographic camera={{ zoom: 40, near: 0.1, far: 500 }}>
        <color attach="background" args={['#bcd7e6']} />
      </Canvas>
      <WikiPanel />
      <Disclaimer />
    </>
  )
}
