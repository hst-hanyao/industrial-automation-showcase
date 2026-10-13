import { ScrollTargetButton } from './ScrollTargetButton'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="local-status"><span aria-hidden="true" />STATIC SHOWCASE / NO BACKEND</p>
      <p>内容按项目证据、源码或案例复盘、后续方向区分</p>
      <ScrollTargetButton targetId="main-content">回到本页顶部</ScrollTargetButton>
      <p className="site-footer__icp">
        <span>ICP备案/许可证号：</span>
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="浙ICP备2026082555号-1（工信部备案查询，新窗口打开）"
        >
          浙ICP备2026082555号-1
        </a>
      </p>
    </footer>
  )
}
