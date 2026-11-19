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
    color: #202122 !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Liberation Sans', sans-serif;
    font-size: 15px;
    line-height: 1.65;
    margin: 0;
    padding: 16px 20px 48px;
    max-width: 900px;
  }
  a { color: #36c !important; text-decoration: none; }
  a:visited { color: #5a3696 !important; }
  a.new, a.new:visited { color: #d73333 !important; }
  a:hover { text-decoration: underline; }
  * { box-sizing: border-box; }
  table, .wikitable { border-collapse: collapse; background: #ffffff !important; color: #202122 !important; margin: 1em 0; }
  th, td { border: 1px solid #a2a9b1 !important; padding: 6px 10px; color: #202122 !important; }
  th { background: #eaecf0 !important; font-weight: bold; text-align: left; }
  tr:nth-child(even) td { background: #f8f9fa !important; }
  .NavFrame { border: 1px solid #a2a9b1 !important; border-radius: 4px; background: #ffffff !important; margin: 12px 0; overflow: hidden; }
  .NavHead { background: #eaecf0 !important; color: #202122 !important; padding: 6px 10px !important; cursor: pointer !important; font-weight: 600; }
  .NavContent { background: #ffffff !important; padding: 8px 10px; }
  .vsToggleElement[style*='background'], th[class~='vsToggleElement'] { background: #eaecf0 !important; color: #202122 !important; }
  .mw-collapsible-toggle { cursor: pointer; color: #54595d !important; }
  h1, h2, h3, h4, h5 { color: #000000 !important; border-bottom: 1px solid #a2a9b1 !important; padding-bottom: 4px; margin-top: 1.2em; }
  #toc, .toc, .infobox { background: #f8f9fa !important; border: 1px solid #a2a9b1 !important; border-radius: 4px; padding: 10px; margin: 1em 0; }
  .mw-editsection, .mw-editsection-bracket { display: none !important; }
  img { max-width: 100%; height: auto; }
`;

export function buildWikiPreviewSrcdoc(html: string, wikiUrl: string = "https://bn.wikipedia.org"): string {
  const safeWikiUrl = wikiUrl.endsWith("/") ? wikiUrl : `${wikiUrl}/`;
  const baseHref = safeWikiUrl.includes("/wiki/") ? safeWikiUrl : `${safeWikiUrl}wiki/`;
  const body = html || '<p style="color:#72777d; font-style:italic;">Preview not available.</p>';

  return `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="utf-8">
<base href="${baseHref}">
<style>${LIGHT_CSS}</style>
</head>
<body class="mw-body mw-parser-output">
${body}
<script>${COLLAPSIBLE_JS}<\/script>
</body>
</html>`;
}
