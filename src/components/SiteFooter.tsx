import { ScrollTargetButton } from './ScrollTargetButton'
import { getMediaUrl } from '../lib/media'
import {
  ICP_FILING_NUMBER,
  ICP_QUERY_URL,
  PUBLIC_SECURITY_FILING_ICON,
  PUBLIC_SECURITY_FILING_NUMBER,
  PUBLIC_SECURITY_QUERY_URL,
} from '../data/site-config'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="local-status"><span aria-hidden="true" />静态工程展台 · 离线可读</p>
      <ScrollTargetButton targetId="main-content">回到本页顶部</ScrollTargetButton>
      <div className="site-footer__filings" role="group" aria-label="网站备案信息">
        <p className="site-footer__filing">
          <span>ICP备案号：</span>
          <a
            href={ICP_QUERY_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`ICP备案号：${ICP_FILING_NUMBER}（工信部备案查询，新窗口打开）`}
          >
            {ICP_FILING_NUMBER}
          </a>
        </p>
        <p className="site-footer__filing">
          <span>公安备案号：</span>
          <a
            href={PUBLIC_SECURITY_QUERY_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`公安备案号：${PUBLIC_SECURITY_FILING_NUMBER}（公安备案查询，新窗口打开）`}
          >
            <img src={getMediaUrl(PUBLIC_SECURITY_FILING_ICON)} alt="" width={20} height={20} aria-hidden="true" />
            <span>{PUBLIC_SECURITY_FILING_NUMBER}</span>
          </a>
        </p>
      </div>
    </footer>
  )
}
