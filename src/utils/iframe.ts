/**
 * 文件头：iframe 安全补丁工具
 *
 * 对应原项目：lib/utils/iframe.ts（照搬，注释已翻译为中文）
 *
 * 功能：给 AI 生成的交互 HTML 打「安全补丁」，使其能在沙箱 iframe 中正常显示：
 *   1. ERROR_CAPTURE_SHIM：捕获页面运行错误，通过 postMessage 传回父页面（诊断白屏）；
 *   2. STORAGE_SHIM：沙箱（null 源）页面访问 localStorage 会抛异常导致白屏，
 *      这里注入一个内存版 localStorage/sessionStorage，让页面不崩；
 *   3. iframeCss：保证 html/body 撑满并允许纵向滚动。
 *
 * 维护注意：这是「隔离房间」的安全基础——补丁必须插在页面自身脚本之前执行，
 * 因此 patchHtmlForIframe 会插到 <head> 之后（找不到 head 则前插）。
 */
/** 存储垫片：null 源沙箱页面访问 localStorage 时替代为内存实现（原样照搬） */
const STORAGE_SHIM = `<script data-iframe-storage-shim>
(function () {
  function makeStore() {
    var data = Object.create(null);
    return {
      getItem: function (k) { k = String(k); return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[String(k)] = String(v); },
      removeItem: function (k) { delete data[String(k)]; },
      clear: function () { data = Object.create(null); },
      key: function (i) { var keys = Object.keys(data); return i < keys.length ? keys[i] : null; },
      get length() { return Object.keys(data).length; }
    };
  }
  ['localStorage', 'sessionStorage'].forEach(function (name) {
    var ok = false;
    try { var s = window[name]; if (s) { s.getItem('__probe__'); ok = true; } } catch (e) { ok = false; }
    if (!ok) {
      try { Object.defineProperty(window, name, { value: makeStore(), configurable: true }); } catch (e) {}
    }
  });
})();
</script>`

/**
 * 错误捕获垫片：把 iframe 内的运行错误（window.onerror / unhandledrejection /
 * console.error）通过 postMessage 传回父页面；父页面可据此诊断「白屏」原因。
 * 因为同步解析错误可能早于父页面监听器注册，垫片会先缓冲并在收到重放请求时补发。
 */
const ERROR_CAPTURE_SHIM = `<script data-iframe-error-shim>
(function () {
  var buffer = [];
  function emit(errorKind, message) {
    try {
      window.parent.postMessage(
        { __maicInteractive: true, kind: 'runtime-error', errorKind: errorKind, message: message },
        '*'
      );
    } catch (e) {}
  }
  function post(errorKind, message) {
    message = String(message).slice(0, 1200);
    if (buffer.length < 50) buffer.push([errorKind, message]);
    emit(errorKind, message);
  }
  window.addEventListener('message', function (e) {
    var d = e && e.data;
    if (d && d.__maicErrorReplayRequest === true) {
      for (var i = 0; i < buffer.length; i++) emit(buffer[i][0], buffer[i][1]);
    }
  });
  window.addEventListener('error', function (e) {
    if (e && e.message) {
      post('error', e.message + (e.filename ? ' (' + e.filename + ':' + (e.lineno || 0) + ')' : ''));
    } else if (e && e.target && (e.target.src || e.target.href)) {
      post('resource', 'Failed to load resource: ' + (e.target.src || e.target.href));
    }
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    post('unhandledrejection', (r && (r.stack || r.message)) || r || 'unhandled promise rejection');
  });
  try {
    var c = window.console;
    if (c && c.error) {
      var _ce = c.error;
      c.error = function () {
        try { post('console.error', Array.prototype.map.call(arguments, function (a) { return (a && a.stack) || String(a); }).join(' ')); } catch (e) {}
        return _ce.apply(c, arguments);
      };
    }
  } catch (e) {}
})();
</script>`

/** iframe 内样式补丁：撑满宽高、允许纵向滚动、body 最小高度 */
const IFRAME_CSS = `<style data-iframe-patch>
  /* box-sizing 归一：width:100% + padding 不再叠加超出（修复 iframe 内横向/纵向溢出） */
  *, *::before, *::after {
    box-sizing: border-box;
  }
  html, body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
    overflow-y: auto;
  }
  /* 修复 min-h-screen：iframe 中 100vh 就是 iframe 高度，但要保证 body 填满 */
  body { min-height: 100vh; }
</style>`

/**
 * 给交互 HTML 打补丁（注入错误捕获 + 存储垫片 + 样式）。
 * 插入位置：<head> 之后（或带属性的 <head ...> 之后），找不到则前插——
 * 保证垫片先于页面自身脚本执行。
 */
export function patchHtmlForIframe(html: string): string {
  const injection = '\n' + ERROR_CAPTURE_SHIM + '\n' + STORAGE_SHIM + '\n' + IFRAME_CSS

  // 插到 <head> 之后
  const headIdx = html.indexOf('<head>')
  if (headIdx !== -1) {
    const insertPos = headIdx + 6
    return html.substring(0, insertPos) + injection + html.substring(insertPos)
  }

  // 带属性的 <head ...> 之后
  const headWithAttrs = html.indexOf('<head ')
  if (headWithAttrs !== -1) {
    const closeAngle = html.indexOf('>', headWithAttrs)
    if (closeAngle !== -1) {
      const insertPos = closeAngle + 1
      return html.substring(0, insertPos) + injection + html.substring(insertPos)
    }
  }

  // 兜底：前插
  return injection + html
}
