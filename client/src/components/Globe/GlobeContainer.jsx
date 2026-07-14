import EarthGlobe from './EarthGlobe.jsx'
import GlobeControls from './GlobeControls.jsx'

export default function GlobeContainer() {
  return (
    <div className="relative w-full h-full">
      <EarthGlobe />
      <GlobeControls />
    </div>
  )
}
