import { hmiCallChains, hmiCodeSnippets } from '../data/hmi-architecture'
import '../styles/hmi-gallery.css'

const engineeringNotes = [
  { chainId: 'status', snippetId: 'shell-read', title: '读取事实，再投影为界面状态', description: '100 ms 轮询读取 PLC 快照，壳层生成界面需要的状态文字与模型。', detail: '通讯读取、原始快照与 XAML 绑定各有边界，便于沿真实关系定位问题。' },
  { chainId: 'manual', snippetId: 'manual-write', title: '写入请求，与执行结果分开', description: '手动按钮把动作转发给 ViewModel，再经 PLC 客户端发送 ADS 请求。', detail: '界面显示等待独立状态读取链回读，不把按钮点击当成设备已经执行。' },
  { chainId: 'recipe', snippetId: 'recipe-save', title: '保存配方，保留事务与审计', description: '保存前检查权限，仓储通过事务和参数化语句写入配方及步骤。', detail: '业务方法负责授权与审计，数据库访问负责持久化，页面只转发操作。' },
  { chainId: 'history', snippetId: 'history-query', title: '切换记录，避免旧结果覆盖', description: '历史曲线按选定运行记录加载，查询可以取消，结果检查请求版本。', detail: '只有当前请求返回有效趋势快照，再由控件完成呈现。此处依据源码，不伪造曲线截图。' },
] as const

export function HmiEngineeringNotes({ onTraceChain }: { readonly onTraceChain: (chainId: string) => void }) {
  return (
    <section className="hmi-engineering" aria-labelledby="hmi-engineering-title">
      <header><p className="eyebrow">ENGINEERING / FOUR DECISIONS</p><h2 id="hmi-engineering-title">四个关键设计，沿源码核对。</h2></header>
      <div className="hmi-engineering__notes">
        {engineeringNotes.map((note, index) => {
          const chain = hmiCallChains.find((item) => item.id === note.chainId)
          const snippet = hmiCodeSnippets.find((item) => item.id === note.snippetId)
          return (
            <article key={note.chainId}>
              <span className="hmi-engineering__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{note.title}</h3><p>{note.description}</p><p className="hmi-engineering__detail">{note.detail}</p>
                {snippet ? <p className="hmi-engineering__source" translate="no">{snippet.file} · L{snippet.startLine}–{snippet.startLine + snippet.lines.length - 1}</p> : null}
              </div>
              <button type="button" onClick={() => onTraceChain(note.chainId)}>追踪{chain?.label} <span aria-hidden="true">↑</span></button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
