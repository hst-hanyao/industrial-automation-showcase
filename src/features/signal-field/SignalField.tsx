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

  const offsetX = (pointer.x - 0.5) * 26
  const offsetY = (pointer.y - 0.5) * 18
  const resolved = nodes.map((node, i) => {
    const depth = 0.6 + (i % 2) * 0.5
    return {
      x: node.x * width + offsetX * depth,
      y: node.y * height + offsetY * depth,
    }
  })

  context.save()

  const pointerGlow = context.createRadialGradient(
    pointer.x * width,
    pointer.y * height,
    10,
    pointer.x * width,
    pointer.y * height,
    Math.max(width, height) * 0.42,
  )
  pointerGlow.addColorStop(0, 'rgba(37, 99, 235, 0.09)')
  pointerGlow.addColorStop(0.5, 'rgba(14, 116, 144, 0.035)')
  pointerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')
  context.fillStyle = pointerGlow
  context.fillRect(0, 0, width, height)

  context.lineWidth = 1
  context.strokeStyle = 'rgba(46, 65, 94, 0.065)'

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

  context.strokeStyle = 'rgba(37, 99, 235, 0.18)'
  for (let x = 64; x < width; x += 192) {
    for (let y = 64; y < height; y += 192) {
      context.beginPath()
      context.moveTo(x - 3.5, y + 0.5)
      context.lineTo(x + 4.5, y + 0.5)
      context.moveTo(x + 0.5, y - 3.5)
      context.lineTo(x + 0.5, y + 4.5)
      context.stroke()
    }
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

  const firstNode = resolved[0]!
  const lastNode = resolved[3]!
  context.save()
  context.setLineDash([5, 5])
  context.lineWidth = 1.2
  context.strokeStyle = 'rgba(14, 116, 144, 0.22)'
  context.beginPath()
  context.moveTo(lastNode.x, lastNode.y)
  context.lineTo(firstNode.x, lastNode.y)
  context.lineTo(firstNode.x, firstNode.y)
  context.stroke()
  context.restore()

  segments.forEach(([start, end], index) => {
    const local = (progress + index * 0.29) % 1
    const cornerX = end.x
    const horizontalLength = Math.abs(cornerX - start.x)
    const verticalLength = Math.abs(end.y - start.y)
    const total = horizontalLength + verticalLength
    if (total <= 0) return

    const pointAt = (t: number) => {
      const clamped = ((t % 1) + 1) % 1
      const dist = clamped * total
      if (dist <= horizontalLength) {
        return {
          x: start.x + Math.sign(cornerX - start.x) * dist,
          y: start.y,
        }
      }
      return {
        x: cornerX,
        y: start.y + Math.sign(end.y - start.y) * (dist - horizontalLength),
      }
    }

    const color = index === 1 ? '#0e7490' : '#2563eb'
    for (let step = 6; step >= 1; step--) {
      const tailPos = pointAt(local - step * 0.016)
      context.beginPath()
      context.arc(tailPos.x, tailPos.y, Math.max(1, 3.2 - step * 0.4), 0, Math.PI * 2)
      context.fillStyle = index === 1
        ? `rgba(14, 116, 144, ${(0.42 - step * 0.06).toFixed(2)})`
        : `rgba(37, 99, 235, ${(0.42 - step * 0.06).toFixed(2)})`
      context.fill()
    }

    const head = pointAt(local)
    context.beginPath()
    context.arc(head.x, head.y, 4, 0, Math.PI * 2)
    context.fillStyle = color
    context.shadowBlur = 12
    context.shadowColor = color
    context.fill()
    context.shadowBlur = 0
  })

  {
    const fbLocal = (progress * 0.85 + 0.5) % 1
    const hLen = Math.abs(firstNode.x - lastNode.x)
    const vLen = Math.abs(firstNode.y - lastNode.y)
    const fbTotal = hLen + vLen
    if (fbTotal > 0) {
      const fbDist = fbLocal * fbTotal
      const fbX = fbDist <= hLen
        ? lastNode.x + Math.sign(firstNode.x - lastNode.x) * fbDist
        : firstNode.x
      const fbY = fbDist <= hLen
        ? lastNode.y
        : lastNode.y + Math.sign(firstNode.y - lastNode.y) * (fbDist - hLen)
      context.beginPath()
      context.arc(fbX, fbY, 3.2, 0, Math.PI * 2)
      context.fillStyle = '#0e7490'
      context.shadowBlur = 10
      context.shadowColor = '#0e7490'
      context.fill()
      context.shadowBlur = 0
    }
  }

  for (const [index, node] of resolved.entries()) {
    const pulseRadius = 12 + Math.sin(progress * Math.PI * 2 + index * 1.4) * 3.5
    context.beginPath()
    context.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2)
    context.strokeStyle = index === 2 ? 'rgba(14, 116, 144, 0.18)' : 'rgba(37, 99, 235, 0.18)'
    context.lineWidth = 1
    context.stroke()

    context.fillStyle = '#ffffff'
    context.strokeStyle = index === 2 ? '#0e7490' : 'rgba(37, 99, 235, 0.85)'
    context.lineWidth = 1.6
    context.beginPath()
    context.rect(node.x - 8, node.y - 8, 16, 16)
    context.fill()
    context.stroke()

    context.fillStyle = index === 2 ? '#0e7490' : '#2563eb'
    context.fillRect(node.x - 2.5, node.y - 2.5, 5, 5)

    context.fillStyle = 'rgba(23, 32, 51, 0.78)'
    context.font = '600 10px Cascadia Code, monospace'
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
    const cycleDuration = 5600

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
      drawSignalField(context, width, height, lastProgress, pointerRef.current)
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
      lastProgress = (elapsed % cycleDuration) / cycleDuration
      drawSignalField(context, width, height, lastProgress, pointerRef.current)
      frame = window.requestAnimationFrame(render)
    }

    const updateAnimationState = () => {
      if (motionMode !== 'full') return

      if (!intersecting || !pageVisible) {
        if (frame !== 0) window.cancelAnimationFrame(frame)
        frame = 0
        return
      }

      if (frame === 0) {
        startTime = performance.now() - lastProgress * cycleDuration
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
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      disposers.add(() => window.removeEventListener('pointermove', onPointerMove))
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
