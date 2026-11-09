import { DetailPage } from '../components/DetailPage'
import { getCapability } from '../data/capabilities'

const capability = getCapability('plc')

export default function PlcCasePage() {
  return <DetailPage capability={capability} />
}
