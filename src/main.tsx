import './styles/entry.css'

// Explicit hash routes retain the portfolio; the public root opens the machine.
const isShowcaseRoute = () => window.location.hash.startsWith('#/')
const startedAsShowcase = isShowcaseRoute()

function reloadIfEntryChanged() {
  if (isShowcaseRoute() !== startedAsShowcase) window.location.reload()
}

for (const event of ['hashchange', 'popstate', 'pageshow']) {
  window.addEventListener(event, reloadIfEntryChanged)
}

if (startedAsShowcase) {
  document.title = '工业自动化能力图谱'
  document.querySelector('meta[name="description"]')?.setAttribute(
    'content',
    '工业自动化能力展示站：上位机、PLC 官方案例复盘、运动控制与机器视觉。',
  )
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff')
  void import('./showcase-entry').catch(() => {
    const notice = document.createElement('p')
    notice.textContent = '页面暂时无法加载，请重试。'
    notice.setAttribute('role', 'alert')
    const retry = document.createElement('button')
    retry.type = 'button'
    retry.textContent = '重新加载'
    retry.addEventListener('click', () => window.location.reload())
    const fallback = document.createElement('section')
    fallback.className = 'entry-fallback'
    fallback.append(notice, retry)
    document.getElementById('root')!.replaceChildren(fallback)
  })
} else {
  const viewer = document.createElement('iframe')
  viewer.className = 'machine-home'
  viewer.title = '晶圆电镀工艺3D教学演示：非官方交互模型与原理动画'
  viewer.src = `${import.meta.env.BASE_URL}waferplt/`
  viewer.allow = 'fullscreen'
  viewer.allowFullscreen = true
  document.getElementById('root')!.replaceChildren(viewer)
}
