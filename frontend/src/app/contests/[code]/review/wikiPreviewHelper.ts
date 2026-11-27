/**
 * Wikipedia / MediaWiki iframe preview styling and collapsible scripts.
 * Based on Wikimedia Codex & MediaWiki core typography and NavFrame behavior.
 */

export const COLLAPSIBLE_JS = `
  (function() {
    function initNavFrames() {
      document.querySelectorAll('.NavFrame').forEach(function(frame) {
        var head = frame.querySelector('.NavHead');
        var content = frame.querySelector('.NavContent');
        if (!head || !content) return;
        content.style.display = 'none';
        var toggle = head.querySelector('.NavToggle a');
        if (!toggle) {
          var wrapper = document.createElement('span');
          wrapper.className = 'NavToggle';
          wrapper.style.cssText = 'float:right; font-weight:normal; font-size:smaller; padding-left: 8px;';
          toggle = document.createElement('a');
          toggle.href = '#';
          wrapper.appendChild(toggle);
          head.appendChild(wrapper);
        }
        toggle.textContent = '▶';
        head.style.cursor = 'pointer';
        head.addEventListener('click', function(e) {
          e.preventDefault();
          var hidden = content.style.display === 'none';
          content.style.display = hidden ? '' : 'none';
          toggle.textContent = hidden ? '▼' : '▶';
        });
      });
    }

    function initVsToggles() {
      document.querySelectorAll('.vsToggleElement').forEach(function(el) {
        var table = el.closest('table');
        if (!table) return;
        var anchor = el.querySelector('.NavToggle a');
        if (!anchor) {
          var wrapper = document.createElement('span');
          wrapper.className = 'NavToggle';
          wrapper.style.cssText = 'float:right; font-weight:normal; font-size:smaller; padding-left: 8px;';
          anchor = document.createElement('a');
          anchor.href = '#';
          wrapper.appendChild(anchor);
          el.appendChild(wrapper);
        }
        var shows = table.querySelectorAll('.vsShow');
        var hides = table.querySelectorAll('.vsHide');
        shows.forEach(function(r){ r.style.display = 'none'; });
        hides.forEach(function(r){ r.style.display = ''; });
        anchor.textContent = '▶';
        el.style.cursor = 'pointer';
        el.addEventListener('click', function(e) {
          e.preventDefault();
          var isExpanded = anchor.textContent.includes('▼');
          if (isExpanded) {
            shows.forEach(function(r){ r.style.display = 'none'; });
            hides.forEach(function(r){ r.style.display = ''; });
            anchor.textContent = '▶';
          } else {
            shows.forEach(function(r){ r.style.display = ''; });
            hides.forEach(function(r){ r.style.display = 'none'; });
            anchor.textContent = '▼';
          }
        });
      });
    }

    function initMwCollapsibles() {
      document.querySelectorAll('.mw-collapsible, table.collapsed, table.mw-collapsed').forEach(function(el) {
        var isTable = el.tagName === 'TABLE';
        var head = isTable ? el.querySelector('tr') : el.firstElementChild;
        if (!head) return;
        var toggler = el.querySelector('.mw-collapsible-toggle');
        if (!toggler) {
          toggler = document.createElement('span');
          toggler.className = 'mw-collapsible-toggle';
          toggler.style.cssText = 'float:right; cursor:pointer; user-select:none; font-size:smaller; padding-left:8px;';
          var th = head.querySelector('th') || head.querySelector('td') || head;
          if (th) th.appendChild(toggler);
        }
        toggler.textContent = '▶';
        if (isTable) {
          var rows = el.querySelectorAll('tr');
          rows.forEach(function(row, idx) { if (idx > 0) row.style.display = 'none'; });
        } else {
          var content = el.querySelector('.mw-collapsible-content');
          if (content) { content.style.display = 'none'; }
          else { Array.from(el.children).forEach(function(child, idx) { if (idx > 0) child.style.display = 'none'; }); }
        }
        head.style.cursor = 'pointer';
        head.addEventListener('click', function(e) {
          e.preventDefault();
          var isCollapsed = toggler.textContent.includes('▶');
          toggler.textContent = isCollapsed ? '▼' : '▶';
          if (isTable) {
            var rows = el.querySelectorAll('tr');
            rows.forEach(function(row, idx) { if (idx > 0) row.style.display = isCollapsed ? '' : 'none'; });
          } else {
            var content = el.querySelector('.mw-collapsible-content');
            if (content) { content.style.display = isCollapsed ? '' : 'none'; }
            else { Array.from(el.children).forEach(function(child, idx) { if (idx > 0) child.style.display = isCollapsed ? '' : 'none'; }); }
          }
        });
      });
    }

    document.addEventListener('DOMContentLoaded', function() {
      initNavFrames(); initVsToggles(); initMwCollapsibles();
    });
    if (document.readyState !== 'loading') {
      initNavFrames(); initVsToggles(); initMwCollapsibles();
    }
  })();
`;

export const LIGHT_CSS = `
  :root { color-scheme: light; }
  html, body {
    background: #ffffff !important;
    color: #18181b !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", "Kalpurush", "SolaimanLipi", sans-serif !important;
    font-size: 15px;
    line-height: 1.75;
    margin: 0;
    padding: 16px 20px 48px;
    max-width: 900px;
  }
  a { color: #2563eb !important; text-decoration: none; }
  a:visited { color: #7c3aed !important; }
  a.new, a.new:visited { color: #dc2626 !important; }
  a:hover { text-decoration: underline; color: #1d4ed8 !important; }
  * { box-sizing: border-box; }
  table, .wikitable { border-collapse: collapse; background: #ffffff !important; color: #18181b !important; margin: 1em 0; border-radius: 8px; }
  th, td { border: 1px solid #e4e4e7 !important; padding: 7px 12px; color: #18181b !important; font-size: 14px; }
  th { background: #f4f4f5 !important; font-weight: 600; text-align: left; }
  tr:nth-child(even) td { background: #fafafa !important; }
  .NavFrame { border: 1px solid #e4e4e7 !important; border-radius: 8px; background: #ffffff !important; margin: 12px 0; overflow: hidden; }
  .NavHead { background: #f4f4f5 !important; color: #18181b !important; padding: 6px 12px !important; cursor: pointer !important; font-weight: 600; }
  .NavContent { background: #ffffff !important; padding: 8px 12px; }
  .vsToggleElement[style*='background'], th[class~='vsToggleElement'] { background: #f4f4f5 !important; color: #18181b !important; }
  .mw-collapsible-toggle { cursor: pointer; color: #71717a !important; font-weight: 500; }
  h1, h2, h3, h4, h5 { color: #18181b !important; border-bottom: 1px solid #e4e4e7 !important; padding-bottom: 4px; margin-top: 1.2em; font-weight: 600; }
  #toc, .toc, .infobox { background: #f4f4f5 !important; border: 1px solid #e4e4e7 !important; border-radius: 8px; padding: 10px; margin: 1em 0; }
  .mw-editsection, .mw-editsection-bracket { display: none !important; }
  img { max-width: 100%; height: auto; }
`;

export const DARK_CSS = `
  :root { color-scheme: dark; }
  html, body {
    background: #09090b !important;
    color: #e4e4e7 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", "Kalpurush", "SolaimanLipi", sans-serif !important;
    font-size: 15px;
    line-height: 1.75;
    margin: 0;
    padding: 16px 20px 48px;
    max-width: 900px;
  }
  a { color: #60a5fa !important; text-decoration: none; }
  a:visited { color: #c084fc !important; }
  a.new, a.new:visited { color: #f87171 !important; }
  a:hover { text-decoration: underline; color: #93c5fd !important; }
  * { box-sizing: border-box; }
  table, .wikitable { border-collapse: collapse; background: #18181b !important; color: #e4e4e7 !important; border-radius: 8px; margin: 1em 0; border: 1px solid rgba(255, 255, 255, 0.1) !important; }
  th, td { border: 1px solid rgba(255, 255, 255, 0.08) !important; padding: 7px 12px; color: #e4e4e7 !important; font-size: 14px; }
  th { background: #27272a !important; color: #fafafa !important; font-weight: 600; text-align: left; }
  tr:nth-child(even) td { background: #18181b !important; }
  .NavFrame { border: 1px solid rgba(255, 255, 255, 0.1) !important; border-radius: 8px; background: #18181b !important; margin: 12px 0; overflow: hidden; }
  .NavHead { background: #27272a !important; color: #fafafa !important; padding: 6px 12px !important; cursor: pointer !important; font-weight: 600; }
  .NavContent { background: #18181b !important; padding: 8px 12px; }
  .vsToggleElement[style*='background'], th[class~='vsToggleElement'] { background: #27272a !important; color: #fafafa !important; }
  .mw-collapsible-toggle { cursor: pointer; color: #a1a1aa !important; font-weight: 500; }
  h1, h2, h3, h4, h5 { color: #fafafa !important; border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important; padding-bottom: 4px; margin-top: 1.2em; font-weight: 600; }
  #toc, .toc, .infobox { background: #18181b !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; border-radius: 8px; padding: 10px; margin: 1em 0; color: #e4e4e7 !important; }
  .mw-editsection, .mw-editsection-bracket { display: none !important; }
  ol, ul, dl { color: #e4e4e7 !important; }
  li, dt, dd { color: #e4e4e7 !important; }
  .IPA, .mention, .gloss { color: #e4e4e7 !important; }
  .mw-parser-output { color: #e4e4e7 !important; }
  img { max-width: 100%; height: auto; }
`;

export function buildWikiPreviewSrcdoc(
  html: string,
  wikiUrl: string = "https://bn.wikipedia.org",
  isDark: boolean = false,
  lang: string = "bn"
): string {
  const safeWikiUrl = wikiUrl.endsWith("/") ? wikiUrl : `${wikiUrl}/`;
  const baseHref = safeWikiUrl.includes("/wiki/") ? safeWikiUrl : `${safeWikiUrl}wiki/`;
  const body = html || '<p style="color:#72777d; font-style:italic;">Preview not available.</p>';
  const css = isDark ? DARK_CSS : LIGHT_CSS;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<base href="${baseHref}">
<style>${css}</style>
</head>
<body class="mw-body mw-parser-output">
${body}
<script>${COLLAPSIBLE_JS}<\/script>
</body>
</html>`;
}
