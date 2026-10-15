/* global window, document, MutationObserver, location */
(() => {
  // The outer teaching page already displays the notice for embedded models.
  try {
    if (window.parent !== window && window.parent.document.querySelector('.teaching-notice')) return;
  } catch { /* Standalone cross-origin embeds keep their own notice. */ }

  const install = () => {
    if (document.querySelector('.teaching-notice')) return true;
    const modelTitle = document.querySelector('.lab-title');
    const isModel = /\/(?:machine\/electroplating-machine|modules\/(?:apt|plt|srd))\.html$/.test(location.pathname);
    if (isModel && !modelTitle) return false;
    const notice = document.createElement('p');
    notice.className = 'teaching-notice';
    notice.setAttribute('role', 'note');
    notice.textContent = modelTitle
      ? '非官方教学演示 · 独立制作，无厂商背书；结构与参数为示意。'
      : '非官方教学演示：基于公开资料独立制作，不代表任何厂商的官方产品、授权合作或背书。结构及参数为示意，不代表真实设备配置或工艺性能；相关商标归各权利人所有。';
    if (modelTitle) modelTitle.append(notice);
    else if (document.querySelector('header .brand h1')) document.querySelector('header .brand').append(notice);
    else (document.querySelector('main') || document.body).prepend(notice);
    return true;
  };

  const start = () => {
    if (install()) return;
    const observer = new MutationObserver(() => { if (install()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
