import { useState } from 'react'
import { DetailPage } from '../components/DetailPage'
import { HmiArchitectureExplorer } from '../components/HmiArchitectureExplorer'
import { HmiScreenshotGallery } from '../components/HmiScreenshotGallery'
import { HmiEngineeringNotes } from '../components/HmiEngineeringNotes'
import { getCapability } from '../data/capabilities'

const capability = getCapability('hmi')

export default function HmiPage() {
  const [chainRequest, setChainRequest] = useState<{ chainId: string; requestId: number }>()

  return (
    <DetailPage
      capability={capability}
      heroVisual={<HmiArchitectureExplorer chainRequest={chainRequest} />}
      heroLayout="architecture"
      afterHero={(
        <>
          <HmiScreenshotGallery />
          <HmiEngineeringNotes onTraceChain={(chainId) => setChainRequest((previous) => ({ chainId, requestId: (previous?.requestId ?? 0) + 1 }))} />
        </>
      )}
    />
  )
}
