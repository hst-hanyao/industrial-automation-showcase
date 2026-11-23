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

function drawPulseDot(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  haloRgba: string,
) {
  context.beginPath()
  context.arc(x, y, radius * 2.3, 0, Math.PI * 2)
  context.fillStyle = haloRgba
  context.fill()

  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.fillStyle = color
  context.fill()
}

function drawSignalField(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  pointer: Point,
  scrollRatio: number,
) {
  context.clearRect(0, 0, width, height)

  const baseOffsetX = (pointer.x - 0.5) * 28
  const baseOffsetY = (pointer.y - 0.5) * 20
  const scrollShiftY = -scrollRatio * 26

  // Layer 1 (far background): Grid, radial pointer glow, and calibration crosshairs
  const farX = baseOffsetX * 0.35
  const farY = baseOffsetY * 0.35 + scrollShiftY * 0.35

  context.save()
  context.globalAlpha = Math.max(0.35, 1 - scrollRatio * 0.55)

  const pointerGlow = context.createRadialGradient(
    pointer.x * width,
    pointer.y * height,
    12,
    pointer.x * width,
    pointer.y * height,
    Math.max(width, height) * 0.44,
  )
  pointerGlow.addColorStop(0, 'rgba(37, 99, 235, 0.095)')
  pointerGlow.addColorStop(0.5, 'rgba(14, 116, 144, 0.038)')
  pointerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)')
  context.fillStyle = pointerGlow
  context.fillRect(0, 0, width, height)

  context.lineWidth = 1
  context.strokeStyle = 'rgba(46, 65, 94, 0.06)'

  const gridStartX = ((farX % 64) + 64) % 64 - 64
  for (let x = gridStartX; x <= width + 64; x += 64) {
    context.beginPath()
    context.moveTo(x + 0.5, 0)
    context.lineTo(x + 0.5, height)
    context.stroke()
  }

  const gridStartY = ((farY % 64) + 64) % 64 - 64
  for (let y = gridStartY; y <= height + 64; y += 64) {
    context.beginPath()
    context.moveTo(0, y + 0.5)
    context.lineTo(width, y + 0.5)
    context.stroke()
  }

  context.strokeStyle = 'rgba(37, 99, 235, 0.18)'
  const crossStartX = ((farX % 192) + 192) % 192
  const crossStartY = ((farY % 192) + 192) % 192
  for (let x = crossStartX + 64; x < width; x += 192) {
    for (let y = crossStartY + 64; y < height; y += 192) {
      context.beginPath()
      context.moveTo(x - 3.5, y + 0.5)
      context.lineTo(x + 4.5, y + 0.5)
      context.moveTo(x + 0.5, y - 3.5)
      context.lineTo(x + 0.5, y + 4.5)
      context.stroke()
    }
  }

  // Layer 2 (mid-plane): Orthogonal signal sweep and bus traces
  const midX = baseOffsetX * 0.75
  const midY = baseOffsetY * 0.75 + scrollShiftY * 0.75

  {
    const sweepX = ((progress * 0.72) % 1) * width
    const band = context.createLinearGradient(sweepX - 110, 0, sweepX + 110, 0)
    band.addColorStop(0, 'rgba(37, 99, 235, 0)')
    band.addColorStop(0.5, 'rgba(37, 99, 235, 0.075)')
    band.addColorStop(1, 'rgba(37, 99, 235, 0)')
    context.fillStyle = band
    context.fillRect(sweepX - 110, 0, 220, height)
    context.strokeStyle = 'rgba(37, 99, 235, 0.24)'
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(sweepX + 0.5, 0)
    context.lineTo(sweepX + 0.5, height)
    context.stroke()
  }

  const midNodes = nodes.map((node, i) => {
    const depth = 0.75 + (i % 2) * 0.35
    const jitterX = Math.sin(progress * Math.PI * 6 + i * 2.1) * 2.2
    const jitterY = Math.cos(progress * Math.PI * 4.6 + i * 1.7) * 2.2
    return {
      x: node.x * width + midX * depth + jitterX,
      y: node.y * height + midY * depth + jitterY,
    }
  })

  const segments = [
    [midNodes[0]!, midNodes[1]!],
    [midNodes[1]!, midNodes[2]!],
    [midNodes[2]!, midNodes[3]!],
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

  {
    context.save()
    context.setLineDash([2, 11])
    context.lineDashOffset = -(progress * 260) % 13
    context.lineWidth = 1.6
    context.strokeStyle = 'rgba(37, 99, 235, 0.48)'
    for (const [start, end] of segments) {
      context.beginPath()
      context.moveTo(start.x, start.y)
      context.lineTo(end.x, start.y)
      context.lineTo(end.x, end.y)
      context.stroke()
    }
    context.restore()
  }

  const firstMid = midNodes[0]!
  const lastMid = midNodes[3]!
  context.save()
  context.setLineDash([5, 5])
  context.lineWidth = 1.2
  context.strokeStyle = 'rgba(14, 116, 144, 0.22)'
  context.beginPath()
  context.moveTo(lastMid.x, lastMid.y)
  context.lineTo(firstMid.x, lastMid.y)
  context.lineTo(firstMid.x, firstMid.y)
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

    const isCyan = index === 1
    const color = isCyan ? '#0e7490' : '#2563eb'
    const halo = isCyan ? 'rgba(14, 116, 144, 0.2)' : 'rgba(37, 99, 235, 0.2)'

    for (let step = 6; step >= 1; step--) {
      const tailPos = pointAt(local - step * 0.016)
      context.beginPath()
      context.arc(tailPos.x, tailPos.y, Math.max(1, 3.2 - step * 0.4), 0, Math.PI * 2)
      context.fillStyle = isCyan
        ? `rgba(14, 116, 144, ${(0.42 - step * 0.06).toFixed(2)})`
        : `rgba(37, 99, 235, ${(0.42 - step * 0.06).toFixed(2)})`
      context.fill()
    }

    const head = pointAt(local)
    drawPulseDot(context, head.x, head.y, 3.8, color, halo)
  })

  {
    const fbLocal = (progress * 0.85 + 0.5) % 1
    const hLen = Math.abs(firstMid.x - lastMid.x)
    const vLen = Math.abs(firstMid.y - lastMid.y)
    const fbTotal = hLen + vLen
    if (fbTotal > 0) {
      const fbDist = fbLocal * fbTotal
      const fbX = fbDist <= hLen
        ? lastMid.x + Math.sign(firstMid.x - lastMid.x) * fbDist
        : firstMid.x
      const fbY = fbDist <= hLen
        ? lastMid.y
        : lastMid.y + Math.sign(firstMid.y - lastMid.y) * (fbDist - hLen)
      drawPulseDot(context, fbX, fbY, 3.1, '#0e7490', 'rgba(14, 116, 144, 0.2)')
    }
  }

  // Layer 3 (foreground): Elevated control nodes with subtle outer depth shift
  const foreX = baseOffsetX * 1.15
  const foreY = baseOffsetY * 1.15 + scrollShiftY * 1.15

  for (const [index, baseNode] of nodes.entries()) {
    const jitterX = Math.sin(progress * Math.PI * 6 + index * 2.1) * 2.2
    const jitterY = Math.cos(progress * Math.PI * 4.6 + index * 1.7) * 2.2
    const node = {
      x: baseNode.x * width + foreX + jitterX,
      y: baseNode.y * height + foreY + jitterY,
    }
    const pulseRadius = 13 + Math.sin(progress * Math.PI * 2 + index * 1.4) * 3.5
    context.beginPath()
    context.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2)
    context.strokeStyle = index === 2 ? 'rgba(14, 116, 144, 0.2)' : 'rgba(37, 99, 235, 0.2)'
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
  const targetPointerRef = useRef<Point>({ x: 0.5, y: 0.5 })
  const smoothPointerRef = useRef<Point>({ x: 0.5, y: 0.5 })
  const motionMode = useMotionMode()

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!root || !canvas || !context) return

    const disposers = createDisposerStack()
    let width = 0
    let height = 0
    let rectLeft = 0
    let rectTop = 0
    let frame = 0
    let startTime = performance.now()
    let intersecting = true
    let pageVisible = !document.hidden
    let lastProgress = motionMode === 'reduced' ? 0.22 : 0
    let scrollRatio = 0
    const cycleDuration = 5600

    const updateScrollRatio = () => {
      if (motionMode !== 'full') {
        scrollRatio = 0
        return
      }
      scrollRatio = Math.min(1, Math.max(0, window.scrollY / Math.max(1, height)))
    }

    const resize = () => {
      const rect = root.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      rectLeft = rect.left
      rectTop = rect.top
      width = Math.max(1, Math.round(rect.width))
      height = Math.max(1, Math.round(rect.height))
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      updateScrollRatio()
      drawSignalField(context, width, height, lastProgress, smoothPointerRef.current, scrollRatio)
    }

    const onPointerMove = (event: PointerEvent) => {
      targetPointerRef.current = {
        x: Math.min(1, Math.max(0, (event.clientX - rectLeft) / Math.max(1, width))),
        y: Math.min(1, Math.max(0, (event.clientY - rectTop) / Math.max(1, height))),
      }
    }

    const onScroll = () => {
      updateScrollRatio()
      if (frame === 0) {
        drawSignalField(context, width, height, lastProgress, smoothPointerRef.current, scrollRatio)
      }
    }

    const render = (now: number) => {
      if (!intersecting || !pageVisible) {
        frame = 0
        return
      }

      const target = targetPointerRef.current
      const current = smoothPointerRef.current
      smoothPointerRef.current = {
        x: current.x + (target.x - current.x) * 0.12,
        y: current.y + (target.y - current.y) * 0.12,
      }

      const elapsed = now - startTime
      lastProgress = (elapsed % cycleDuration) / cycleDuration
      drawSignalField(context, width, height, lastProgress, smoothPointerRef.current, scrollRatio)
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
      window.addEventListener('scroll', onScroll, { passive: true })
      disposers.add(() => window.removeEventListener('scroll', onScroll))
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
