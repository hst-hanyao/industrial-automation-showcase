/* global window, document, URL */
/*
 * A client-side display gate for a static site. Visitors can bypass this code;
 * it is not server authentication and does not protect published source files.
 */
;(function () {
  'use strict'

  const script = document.currentScript
  if (!script || !script.src) return

  const accessDirectory = new URL('.', script.src)
  const siteBase = new URL('../', accessDirectory)
  const loginUrl = new URL('index.html', accessDirectory)
  const storageKey = `site-access:v1:${siteBase.pathname}`
  const sessionLifetime = 8 * 60 * 60 * 1000
  const expectedDigest = '78b609feda1d37ea394b973e1c4c488e57c6e92afd1b2b9ac198d243385baee1'
  const loginMode = script.hasAttribute('data-site-access-login')
  let verifiedUntil = 0

  function sessionValid() {
    const raw = window.sessionStorage.getItem(storageKey)
    if (!raw) return false
    let session
    try {
      session = JSON.parse(raw)
    } catch {
      window.sessionStorage.removeItem(storageKey)
      return false
    }
    const now = Date.now()
    const valid = session?.version === 1 && session?.verified === true
      && Number.isFinite(session.issuedAt) && Number.isFinite(session.expiresAt)
      && session.issuedAt <= now && session.expiresAt > now
      && session.expiresAt - session.issuedAt === sessionLifetime
    if (!valid) window.sessionStorage.removeItem(storageKey)
    if (valid) verifiedUntil = session.expiresAt
    return valid
  }

  function safeDestination(value) {
    try {
      const destination = new URL(value || siteBase.href, siteBase)
      if (destination.origin !== siteBase.origin
        || destination.username || destination.password
        || !destination.pathname.startsWith(siteBase.pathname)
        || destination.pathname === accessDirectory.pathname.slice(0, -1)
        || destination.pathname.startsWith(accessDirectory.pathname)) return siteBase.href
      // Browsers and static hosts can normalize encoded path separators differently.
      if (/%(?:2f|5c|2e)/i.test(destination.pathname)) return siteBase.href
      return destination.href
    } catch {
      return siteBase.href
    }
  }

  function goToLogin() {
    const destination = new URL(loginUrl.href)
    destination.searchParams.set('next', safeDestination(window.location.href))
    window.location.replace(destination.href)
  }

  if (!loginMode) {
    let valid = false
    try {
      valid = sessionValid()
    } catch { /* Storage access denied: retain the injected, fail-closed style. */ }
    if (!valid) {
      goToLogin()
      return
    }
    document.getElementById('site-access-lock')?.remove()
    function expireSession() {
      document.documentElement.style.setProperty('visibility', 'hidden', 'important')
      goToLogin()
    }
    window.setTimeout(expireSession, Math.max(0, verifiedUntil - Date.now()))
    // BFCache restores a complete document without rerunning its scripts.
    window.addEventListener('pageshow', event => {
      if (!event.persisted) return
      try {
        if (sessionValid()) return
      } catch { /* Re-enter the login page if storage becomes unavailable. */ }
      expireSession()
    })
    return
  }

  const form = document.getElementById('access-form')
  const password = document.getElementById('access-password')
  const submit = document.getElementById('access-submit')
  const error = document.getElementById('access-error')
  if (!form || !password || !submit || !error) return

  const next = safeDestination(new URL(window.location.href).searchParams.get('next'))
  let busy = false

  function showError(message) {
    error.textContent = message
    error.hidden = false
  }

  function storageAvailable() {
    const probeKey = `${storageKey}:probe`
    window.sessionStorage.setItem(probeKey, '1')
    const available = window.sessionStorage.getItem(probeKey) === '1'
    window.sessionStorage.removeItem(probeKey)
    if (!available) throw new Error('Storage unavailable')
  }

  try {
    storageAvailable()
    if (sessionValid()) {
      window.location.replace(next)
      return
    }
  } catch {
    showError('当前浏览器禁止保存本次验证。请允许此网站使用会话存储后刷新页面。')
    password.focus()
    return
  }

  if (!window.crypto?.subtle || !window.TextEncoder) {
    showError('当前浏览器无法完成密码校验，请通过 HTTPS 或本机预览打开网页。')
    password.focus()
    return
  }

  submit.disabled = false
  password.focus()
  password.addEventListener('input', () => {
    error.hidden = true
    password.removeAttribute('aria-invalid')
  })

  form.addEventListener('submit', async event => {
    event.preventDefault()
    if (busy || !form.reportValidity()) return
    busy = true
    submit.disabled = true
    submit.textContent = '正在验证…'
    form.setAttribute('aria-busy', 'true')
    error.hidden = true
    password.removeAttribute('aria-invalid')
    let navigating = false

    try {
      const bytes = new window.TextEncoder().encode(password.value)
      const hash = await window.crypto.subtle.digest('SHA-256', bytes)
      bytes.fill(0)
      const digest = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
      if (digest !== expectedDigest) {
        password.setAttribute('aria-invalid', 'true')
        showError('密码不正确，请重新输入。')
        password.select()
        return
      }

      const issuedAt = Date.now()
      const session = { version: 1, verified: true, issuedAt, expiresAt: issuedAt + sessionLifetime }
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(session))
        if (!sessionValid()) throw new Error('Session was not saved')
      } catch {
        showError('无法保存本次验证。请允许此网站使用会话存储后重试。')
        return
      }
      password.value = ''
      submit.textContent = '验证通过，正在进入…'
      window.location.replace(next)
      navigating = true
    } catch {
      showError('暂时无法完成验证，请刷新页面后重试。')
    } finally {
      if (!navigating) {
        busy = false
        submit.disabled = false
        submit.textContent = '进入网页'
        form.removeAttribute('aria-busy')
        if (!error.hidden) password.focus()
      }
    }
  })
})()
