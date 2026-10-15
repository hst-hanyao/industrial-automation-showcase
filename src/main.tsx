import './styles/entry.css'

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
