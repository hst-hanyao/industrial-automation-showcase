import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <main id="main-content" className="route-loading" tabIndex={-1}>
      <h1 tabIndex={-1}>页面不存在</h1>
      <p role="status">你访问的页面不存在，请返回首页。</p>
      <Link to="/">返回首页</Link>
    </main>
  )
}
