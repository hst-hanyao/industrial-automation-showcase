import type { CSSProperties } from 'react'
import type { EvidenceSection } from '../data/capabilities'

interface TechnicalDiagramProps {
  readonly type: NonNullable<EvidenceSection['diagram']>
}

const projectionNodes = ['PLC DUT', 'ADS READ', 'COM BUFFER', 'CURRENT', 'UI']
const pipelineNodes = ['INPUT', 'CALIBRATE', 'CONTOUR', 'ALIGN', 'DISTANCE', 'JUDGE']

function LinearDiagram({ nodes }: { readonly nodes: readonly string[] }) {
  return (
    <div className="linear-diagram" role="img" aria-label={nodes.join(' 到 ')}
      style={{ '--diagram-node-count': nodes.length } as CSSProperties}>
      {nodes.map((node, index) => (
        <div key={node} className="linear-diagram__item">
          <span>{String(index + 1).padStart(2, '0')}</span>
          <strong>{node}</strong>
          {index < nodes.length - 1 ? <i aria-hidden="true" /> : null}
        </div>
      ))}
    </div>
  )
}

function TasksDiagram() {
  return (
    <div className="task-diagram" role="img" aria-label="TwinCAT 三任务架构示意">
      <article><span>02 ms</span><strong>FAST CONTROL</strong><small>Input → Logic → Output</small></article>
      <article><span>10 ms</span><strong>SERVICE</strong><small>Mode / Alarm / Recipe</small></article>
      <article><span>200 ms</span><strong>VISUAL</strong><small>Visualization refresh</small></article>
      <div className="task-diagram__bus"><i /><i /><i /></div>
    </div>
  )
}

function StateDiagram() {
  return (
    <div className="state-diagram" role="img" aria-label="整机请求、设备模式与工艺步骤三层状态机">
      <div><span>LAYER 01</span><strong>MACHINE REQUEST</strong><small>Start / Pause / Stop</small></div>
      <i aria-hidden="true" />
      <div><span>LAYER 02</span><strong>DEVICE MODE</strong><small>Home / Manual / Auto</small></div>
      <i aria-hidden="true" />
      <div><span>LAYER 03</span><strong>PROCESS STEP</strong><small>Done / Timeout / Abort</small></div>
    </div>
  )
}

function AxesDiagram() {
  return (
    <div className="axes-diagram" role="img" aria-label="轴组、插补路径和缓冲输出示意">
      <div className="axes-diagram__head"><span>ADDAX GROUP</span><b>X / Y / Z</b></div>
      <div className="axes-diagram__rails" aria-hidden="true">
        <i><b /></i><i><b /></i><i><b /></i>
      </div>
      <div className="axes-diagram__queue"><span>SEG 01</span><span>IO ON</span><span>SEG 02</span><span>IO OFF</span></div>
    </div>
  )
}

function StopsDiagram() {
  return (
    <div className="stops-diagram" role="img" aria-label="正常停止和急停的不同控制语义">
      <article><span>CONTROLLED</span><strong>Single_Cancel</strong><small>取消当前运动 / 受控结束</small></article>
      <div aria-hidden="true">≠</div>
      <article><span>EMERGENCY</span><strong>Rapidstop</strong><small>快速停止 / 锁定 / 复位</small></article>
    </div>
  )
}

function WaferDiagram() {
  return (
    <div className="wafer-diagram" role="img" aria-label="晶圆参考外缘、检测外缘与法向距离测量示意">
      <div className="wafer-diagram__plate">
        <i className="wafer-diagram__reference" />
        <i className="wafer-diagram__detected" />
        <i className="wafer-diagram__scan" />
      </div>
      <div className="wafer-diagram__legend">
        <span><i />REFERENCE EDGE</span>
        <span><i />DETECTED EDGE</span>
        <span><i />NORMAL DISTANCE</span>
      </div>
    </div>
  )
}

export function TechnicalDiagram({ type }: TechnicalDiagramProps) {
  if (type === 'projection') return <LinearDiagram nodes={projectionNodes} />
  if (type === 'pipeline') return <LinearDiagram nodes={pipelineNodes} />
  if (type === 'tasks') return <TasksDiagram />
  if (type === 'state') return <StateDiagram />
  if (type === 'axes') return <AxesDiagram />
  if (type === 'stops') return <StopsDiagram />
  return <WaferDiagram />
}
