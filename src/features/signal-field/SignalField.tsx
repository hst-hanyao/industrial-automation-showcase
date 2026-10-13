import { useEffect, useRef } from 'react'
import { useMotionMode } from '../motion/useMotionMode'
import { createDisposerStack } from '../../lib/lifecycle'

interface Point {
  readonly x: number
  readonly y: number
}

const nodes: readonly Point[] = [
  { x: 0.18, y: 0.28 },
  { x: 0.38, y: 0.62 },
  { x: 0.63, y: 0.34 },
  { x: 0.82, y: 0.7 },
]

function drawSignalField(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  pointer: Point,
) {
  context.clearRect(0, 0, width, height)

  const offsetX = (pointer.x - 0.5) * 16
  const offsetY = (pointer.y - 0.5) * 10
  const resolved = nodes.map((node) => ({
    x: node.x * width + offsetX * (node.x - 0.5),
    y: node.y * height + offsetY * (node.y - 0.5),
  }))

  context.save()
  context.lineWidth = 1
  context.strokeStyle = 'rgba(46, 65, 94, 0.08)'

  for (let x = 0; x <= width; x += 64) {
    context.beginPath()
    context.moveTo(x + 0.5, 0)
    context.lineTo(x + 0.5, height)
    context.stroke()
  }

  for (let y = 0; y <= height; y += 64) {
    context.beginPath()
    context.moveTo(0, y + 0.5)
    context.lineTo(width, y + 0.5)
    context.stroke()
  }

  const segments = [
    [resolved[0]!, resolved[1]!],
    [resolved[1]!, resolved[2]!],
    [resolved[2]!, resolved[3]!],
  ] as const

  context.lineWidth = 1.5
  context.strokeStyle = 'rgba(37, 99, 235, 0.24)'
  for (const [start, end] of segments) {
    context.beginPath()
    context.moveTo(start.x, start.y)
    context.lineTo(end.x, start.y)
    context.lineTo(end.x, end.y)
    context.stroke()
  }

  segments.forEach(([start, end], index) => {
    const local = (progress + index * 0.29) % 1
    const cornerX = end.x
    const horizontalLength = Math.abs(cornerX - start.x)
    const verticalLength = Math.abs(end.y - start.y)
    const total = horizontalLength + verticalLength
    const distance = local * total

    let pulseX = start.x
    let pulseY = start.y
    if (distance <= horizontalLength) {
      const direction = Math.sign(cornerX - start.x)
      pulseX += direction * distance
    } else {
      pulseX = cornerX
      const direction = Math.sign(end.y - start.y)
      pulseY += direction * (distance - horizontalLength)
    }

    context.beginPath()
    context.arc(pulseX, pulseY, 3.2, 0, Math.PI * 2)
    context.fillStyle = index === 1 ? '#52657f' : '#2563eb'
    context.shadowBlur = 6
    context.shadowColor = context.fillStyle
    context.fill()
    context.shadowBlur = 0
  })

  for (const [index, node] of resolved.entries()) {
    context.fillStyle = '#ffffff'
    context.strokeStyle = index === 2 ? '#52657f' : 'rgba(37, 99, 235, 0.72)'
    context.lineWidth = 1.5
    context.beginPath()
    context.rect(node.x - 8, node.y - 8, 16, 16)
    context.fill()
    context.stroke()
    context.fillStyle = 'rgba(46, 65, 94, 0.74)'
    context.font = '10px Cascadia Code, monospace'
    context.fillText(`0${index + 1}`, node.x + 14, node.y + 4)
  }

  context.restore()
}

export function SignalField() {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerRef = useRef<Point>({ x: 0.5, y: 0.5 })
  const motionMode = useMotionMode()

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!root || !canvas || !context) return

    const disposers = createDisposerStack()
    let width = 0
    let height = 0
    let frame = 0
    let startTime = performance.now()
    let intersecting = true
    let pageVisible = !document.hidden
    let lastProgress = 0
    const autoplayDuration = 4800

    const resize = () => {
      const rect = root.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, Math.round(rect.width))
      height = Math.max(1, Math.round(rect.height))
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      drawSignalField(context, width, height, 0, pointerRef.current)
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect()
      pointerRef.current = {
        x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
        y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
      }
      if (frame === 0) {
        drawSignalField(context, width, height, lastProgress, pointerRef.current)
      }
    }

    const render = (now: number) => {
      if (!intersecting || !pageVisible) {
        frame = 0
        return
      }

      const elapsed = now - startTime
      lastProgress = Math.min(elapsed / autoplayDuration, 1)
      drawSignalField(context, width, height, lastProgress, pointerRef.current)
      if (lastProgress < 1) {
        frame = window.requestAnimationFrame(render)
      } else {
        frame = 0
      }
    }

    const updateAnimationState = () => {
      if (motionMode !== 'full' || lastProgress >= 1) return

      if (!intersecting || !pageVisible) {
        if (frame !== 0) window.cancelAnimationFrame(frame)
        frame = 0
        return
      }

      if (frame === 0) {
        startTime = performance.now() - lastProgress * autoplayDuration
        frame = window.requestAnimationFrame(render)
      }
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(root)
    disposers.add(() => resizeObserver.disconnect())

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      intersecting = entry?.isIntersecting ?? false
      updateAnimationState()
    })
    intersectionObserver.observe(root)
    disposers.add(() => intersectionObserver.disconnect())

    const onVisibilityChange = () => {
      pageVisible = !document.hidden
      updateAnimationState()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    disposers.add(() => document.removeEventListener('visibilitychange', onVisibilityChange))

    resize()

    if (motionMode === 'full') {
      root.addEventListener('pointermove', onPointerMove, { passive: true })
      disposers.add(() => root.removeEventListener('pointermove', onPointerMove))
      updateAnimationState()
      disposers.add(() => window.cancelAnimationFrame(frame))
    }

    return () => disposers.dispose()
  }, [motionMode])

  return (
    <div ref={rootRef} className="signal-field" data-motion={motionMode}>
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  )
}
