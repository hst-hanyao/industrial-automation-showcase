const states = [
  ['01','Clearing','清除中','Acting','清除故障、确认复位条件','Clearing fault, back to Stopped'],
  ['02','Stopped','已停止','Wait','设备已停止，等待 Reset 复位','Machine stopped, awaiting Reset'],
  ['03','Starting','启动中','Acting','启动序列（上电、自检、预热）','Start-up sequence in progress'],
  ['04','Idle','空闲 / 待机','Wait','空闲待机，就绪，等待 Start','Ready and waiting for Start'],
  ['05','Suspended','已挂起','Wait','已挂起，等待 Unsuspend','Paused by external condition'],
  ['06','Execute','执行 / 生产','Execute','执行主工艺，唯一生产状态','Main production state'],
  ['07','Stopping','停止中','Acting','受控有序停机','Controlled deceleration to Stopped'],
  ['08','Aborting','中止中','Acting','紧急中止，最快安全速度停机','Emergency abort sequence'],
  ['09','Aborted','已中止','Wait','已中止，需人工确认并 Clear','Fault state, requires Clear'],
  ['10','Holding','保持中','Acting','转入保持（减速、到保持位）','Transitioning to Held'],
  ['11','Held','已保持 / 暂停','Wait','已保持，等待 Unhold','Paused by operator, awaiting Unhold'],
  ['12','Unholding','解除保持中','Acting','从保持恢复（加速回运行速度）','Returning to Execute'],
  ['13','Suspending','挂起中','Acting','转入挂起（外部条件触发）','Transitioning to Suspended'],
  ['14','Unsuspending','解除挂起中','Acting','从挂起恢复','Returning to Execute'],
  ['15','Resetting','复位中','Acting','复位中，清除临时状态并回初始位','Re-initialising to Idle'],
  ['16','Completing','完成中','Acting','收尾动作（清空物料、封最后一包）','Finishing the cycle'],
  ['17','Complete','已完成','Wait','周期完成，等待 Reset','Cycle complete, awaiting Reset']
]
const commands = [
  ['Reset','复位','Stopped / Complete → Resetting','从停止或完成态复位，经 Resetting 回到 Idle'],
  ['Start','启动','Idle → Starting','上升沿触发，进入启动序列'],
  ['Stop','停止','任意运行态 → Stopping','受控、有序停机，最终进入 Stopped'],
  ['Hold','保持','Execute → Holding','操作员或设备内部原因暂停，保持工艺位置'],
  ['Unhold','解除保持','Held → Unholding','恢复生产，回到 Execute'],
  ['Suspend','挂起','Execute → Suspending','外部条件（上游缺料 / 下游堵塞）导致挂起'],
  ['Unsuspend','解除挂起','Suspended → Unsuspending','外部条件恢复，自动或手动回到 Execute'],
  ['Abort','中止','任意状态 → Aborting','紧急中止，最高优先级，以最快安全速度停机'],
  ['Clear','清除','Aborted → Clearing','确认并清除故障，最终回到 Stopped'],
  ['Complete','完成','Execute → Completing','批次 / 周期结束，进入收尾动作'],
  ['StateComplete (SC)','状态完成','动作状态 → 下一等待状态','动作执行完毕后自动转移（非外部命令）']
]

const figures = {
  flow: {
    title: '状态机流转图 / State Transition Diagram',
    file: 'PackML状态机流转图_中英双语',
  },
  table: {
    title: '状态与命令对照表 / State & Command Table',
    file: 'PackML状态与命令对照表_中英双语',
  },
}

function serializeSvg(svg) {
  const copy = svg.cloneNode(true)
  for (const name of ['id', 'class', 'data-key', 'tabindex', 'role', 'aria-label', 'focusable']) {
    copy.removeAttribute(name)
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(copy)
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}

function drawPng(svg, source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = Number(svg.getAttribute('width')) * 2
      canvas.height = Number(svg.getAttribute('height')) * 2
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Canvas is unavailable'))
        return
      }
      try {
        context.fillStyle = '#fff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => {
          if (blob) resolve(blob)
          else reject(new Error('PNG export failed'))
        }, 'image/png')
      } catch (error) {
        reject(error)
      }
    }
    image.onerror = reject
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source)
  })
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

export function mountPackml(root) {
  const controller = new AbortController()
  const { signal } = controller
  const byId = id => root.querySelector('#' + id)
  const listen = (element, type, handler, options = {}) => element.addEventListener(type, handler, { ...options, signal })
  const search = byId('q')
  const clear = byId('qClear')
  const toggle = byId('qToggle')
  const stateDetails = byId('dStates')
  const commandDetails = byId('dCmds')
  const stateTable = byId('qrStates')
  const commandTable = byId('qrCmds')
  const dialog = byId('lb')
  const stage = byId('lbStage')
  const fit = byId('lbFit')
  const full = byId('lbFull')
  const top = byId('totop')
  let activeFigure = null
  let previousOverflow = null
  let printState = null
  let toastTimer

  function syncToggle() {
    toggle.textContent = stateDetails.open && commandDetails.open ? '全部收起' : '全部展开'
  }

  function render() {
    const terms = search.value.trim().toLowerCase().split(/[\s,，、]+/).filter(Boolean)
    const matches = row => terms.every(term => row.join(' ').toLowerCase().includes(term))
    const stateRows = states.filter(matches)
    const commandRows = commands.filter(matches)
    stateTable.tBodies[0].innerHTML = stateRows.map(([number, name, label, type, description, english]) =>
      `<tr><td class="no">${number}</td><td><b>${escapeHtml(name)}</b></td><td>${escapeHtml(label)}</td>
      <td><span class="chip ${type}">${type}</span></td><td>${escapeHtml(description)}<span class="en">${escapeHtml(english)}</span></td></tr>`,
    ).join('') || '<tr class="emptyrow"><td colspan="5">无匹配状态 / No matching state</td></tr>'
    commandTable.tBodies[0].innerHTML = commandRows.map(([name, label, transition, description]) =>
      `<tr><td><b>${escapeHtml(name)}</b></td><td>${escapeHtml(label)}</td><td class="trans">${escapeHtml(transition)}</td>
      <td>${escapeHtml(description)}</td></tr>`,
    ).join('') || '<tr class="emptyrow"><td colspan="4">无匹配命令 / No matching command</td></tr>'
    byId('cStates').textContent = `（${stateRows.length} / ${states.length}）`
    byId('cCmds').textContent = `（${commandRows.length} / ${commands.length}）`
    byId('qrCount').textContent = terms.length
      ? `筛选「${terms.join(' ')}」：命中 ${stateRows.length} 个状态、${commandRows.length} 个命令（合计 ${stateRows.length + commandRows.length} / ${states.length + commands.length} 条）`
      : `共 ${states.length} 个标准状态、${commands.length} 个控制命令，内容可选中、复制与搜索。`
    if (terms.length) stateDetails.open = commandDetails.open = true
    syncToggle()
  }

  function flash(message) {
    if (signal.aborted) return
    window.clearTimeout(toastTimer)
    clear.textContent = message
    toastTimer = window.setTimeout(() => { clear.textContent = '清空' }, 1800)
  }

  async function copyResults() {
    const content = [stateTable, commandTable].map(table =>
      Array.from(table.querySelectorAll('tr:not(.emptyrow)'), row =>
        Array.from(row.cells, cell => cell.textContent.replace(/\s+/g, ' ').trim()).join('\t'),
      ).join('\n'),
    ).join('\n\n')
    try {
      await navigator.clipboard.writeText(content)
    } catch {
      if (signal.aborted) return
      const temporary = document.createElement('textarea')
      temporary.value = content
      temporary.style.cssText = 'position:fixed;opacity:0'
      root.append(temporary)
      temporary.select()
      let copied
      try {
        copied = document.execCommand('copy')
      } catch {
        copied = false
      } finally {
        temporary.remove()
        byId('qCopy').focus()
      }
      if (!copied) {
        flash('复制失败，请手动选中表格复制')
        return
      }
    }
    flash('已复制当前筛选结果（TSV）')
  }

  async function saveFigure(key, format) {
    const svg = byId('svg-' + key)
    const { file } = figures[key]
    const source = serializeSvg(svg)
    if (format === 'png') {
      try {
        const image = await drawPng(svg, source)
        if (!signal.aborted) download(image, file + '.png')
        return
      } catch {
        if (signal.aborted) return
        window.alert('当前浏览器无法生成 PNG，已改为下载 SVG 矢量文件。')
      }
    }
    download(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }), file + '.svg')
  }

  function setZoomMode(mode) {
    const isFit = mode === 'fit'
    dialog.classList.toggle('fit', isFit)
    dialog.classList.toggle('full', !isFit)
    fit.classList.toggle('active', isFit)
    full.classList.toggle('active', !isFit)
    fit.setAttribute('aria-pressed', String(isFit))
    full.setAttribute('aria-pressed', String(!isFit))
    stage.scrollTo(0, 0)
  }

  function openFigure(key) {
    if (dialog.open) return
    const svg = byId('svg-' + key)
    const image = byId('lbimg')
    activeFigure = key
    image.style.setProperty('--packml-figure-width', svg.getAttribute('width') + 'px')
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serializeSvg(svg))
    byId('lbTitle').textContent = '放大查看 / Zoom — ' + figures[key].title
    dialog.showModal()
    setZoomMode('fit')
    previousOverflow ??= document.body.style.overflow
    document.body.style.overflow = 'hidden'
    byId('lbClose').focus()
  }

  function releaseScroll() {
    if (previousOverflow !== null) {
      document.body.style.overflow = previousOverflow
      previousOverflow = null
    }
  }

  listen(search, 'input', render)
  listen(stateDetails, 'toggle', syncToggle)
  listen(commandDetails, 'toggle', syncToggle)
  listen(clear, 'click', () => { search.value = ''; render(); search.focus() })
  listen(toggle, 'click', () => {
    stateDetails.open = commandDetails.open = !(stateDetails.open && commandDetails.open)
    syncToggle()
  })
  listen(byId('qCopy'), 'click', copyResults)
  listen(fit, 'click', () => setZoomMode('fit'))
  listen(full, 'click', () => setZoomMode('full'))
  listen(byId('lbDownload'), 'click', () => saveFigure(activeFigure, 'png'))
  listen(byId('lbClose'), 'click', () => dialog.close())
  listen(dialog, 'click', event => {
    if (event.target === dialog || event.target === stage) dialog.close()
  })
  listen(dialog, 'close', () => {
    if (dialog.open) return
    releaseScroll()
    if (activeFigure) byId('svg-' + activeFigure).focus({ preventScroll: true })
    activeFigure = null
  })
  for (const key of Object.keys(figures)) {
    const svg = byId('svg-' + key)
    listen(svg, 'click', () => openFigure(key))
    listen(svg, 'keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      openFigure(key)
    })
  }
  for (const button of root.querySelectorAll('[data-packml-download]')) {
    const [key, format] = button.dataset.packmlDownload.split(':')
    listen(button, 'click', () => saveFigure(key, format))
  }
  for (const button of root.querySelectorAll('[data-packml-jump]')) {
    const section = byId(button.dataset.packmlJump)
    listen(button, 'click', () => {
      section.focus({ preventScroll: true })
      section.scrollIntoView({ block: 'start' })
    })
  }

  listen(document, 'keydown', event => {
    if (dialog.open) {
      if (event.key === '1') setZoomMode('fit')
      if (event.key === '2') setZoomMode('full')
      return
    }
    if (event.key === 'Escape' && document.activeElement === search) search.blur()
    if (event.key !== '/' || event.defaultPrevented || event.ctrlKey || event.metaKey ||
        document.activeElement?.closest('input, textarea, select, [contenteditable]')) return
    event.preventDefault()
    search.focus()
    search.select()
  })
  listen(window, 'beforeprint', () => {
    printState = [search.value, stateDetails.open, commandDetails.open]
    search.value = ''
    render()
    stateDetails.open = commandDetails.open = true
  })
  listen(window, 'afterprint', () => {
    if (!printState) return
    const [query, statesOpen, commandsOpen] = printState
    search.value = query
    render()
    stateDetails.open = statesOpen
    commandDetails.open = commandsOpen
    syncToggle()
    printState = null
  })
  const syncTop = () => top.classList.toggle('on', window.scrollY > 600)
  listen(window, 'scroll', syncTop, { passive: true })
  listen(top, 'click', () => window.scrollTo({ top: 0, behavior: 'smooth' }))
  syncTop()
  render()

  return () => {
    controller.abort()
    window.clearTimeout(toastTimer)
    if (dialog.open) dialog.close()
    releaseScroll()
  }
}
