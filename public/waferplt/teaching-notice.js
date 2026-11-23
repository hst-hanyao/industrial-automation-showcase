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
      ? '工艺教学演示 · 结构与参数仅作教学示意。'
      : '工艺教学演示：结构、路径及参数仅作教学示意，不代表真实设备配置或工艺性能。';
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
