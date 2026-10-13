import { capabilities } from '../data/capabilities'
import { getMediaUrl } from '../lib/media'
import { IntentLink } from './IntentLink'
import '../styles/home-concept.css'

export function ControlCore() {
  return (
    <div className="home-device">
      <div className="home-device__label" aria-hidden="true">
        <span>ENGINEERING / FOUR DOMAINS</span><span>01—04</span>
      </div>
      <figure className="home-device__figure">
        <img
          src={getMediaUrl('wafer-electroplating-concept.webp')}
          alt="白色模块化晶圆电镀设备概念插画，包含工艺腔室、晶圆盒和机械传送部件；AI 生成，非项目实拍"
          width={1536}
          height={1024}
          fetchPriority="high"
          decoding="async"
        />
        <figcaption><span>AI 生成</span>设备概念插画 · 非项目实拍</figcaption>
      </figure>
      <nav className="home-device__domains" aria-label="四项能力入口">
        {capabilities.map((capability) => (
          <IntentLink key={capability.id} to={capability.route} className="home-device__domain">
            <span>{capability.order}</span>
            <div><b>{capability.shortName}</b><small>{capability.EnglishName}</small></div>
            <i aria-hidden="true">↗</i>
          </IntentLink>
        ))}
      </nav>
    </div>
  )
}
