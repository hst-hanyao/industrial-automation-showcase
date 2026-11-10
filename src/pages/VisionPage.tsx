import { DetailPage } from '../components/DetailPage'
import { VisionDualEngineExplorer } from '../components/VisionDualEngineExplorer'
import { getCapability } from '../data/capabilities'

const capability = getCapability('vision')

export default function VisionPage() {
  return (
    <DetailPage
      capability={capability}
      heroVisual={<VisionDualEngineExplorer />}
      heroLayout="architecture"
    />
  )
}
