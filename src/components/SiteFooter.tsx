import { ScrollTargetButton } from './ScrollTargetButton'
import { getMediaUrl } from '../lib/media'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="local-status"><span aria-hidden="true" />STATIC SHOWCASE / NO BACKEND</p>
      <p>内容按项目证据、源码或案例复盘、后续方向区分</p>
      <ScrollTargetButton targetId="main-content">回到本页顶部</ScrollTargetButton>
      <div className="site-footer__filings" aria-label="网站备案信息">
        <p className="site-footer__filing">
          <span>ICP备案号：</span>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ICP备案号：浙ICP备2026082555号-1（工信部备案查询，新窗口打开）"
          >
            浙ICP备2026082555号-1
          </a>
        </p>
        <p className="site-footer__filing">
          <span>公安备案号：</span>
          <a
            href="https://beian.mps.gov.cn/#/query/webSearch?code=33020002001289"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="公安备案号：浙公网安备33020002001289号（公安备案查询，新窗口打开）"
          >
            <img src={getMediaUrl('public-security-filing.png')} alt="" width={20} height={20} aria-hidden="true" />
            <span>浙公网安备33020002001289号</span>
          </a>
        </p>
      </div>
    </footer>
  )
}
