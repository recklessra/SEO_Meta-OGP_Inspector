// popup.js - Handles UI interactions and data display

document.addEventListener('DOMContentLoaded', () => {
  // Tab switching logic
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active to clicked
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Copy URL
  document.getElementById('copy-url').addEventListener('click', () => {
    const urlInput = document.getElementById('page-url');
    navigator.clipboard.writeText(urlInput.value).then(() => {
      const btn = document.getElementById('copy-url');
      btn.textContent = '✅';
      setTimeout(() => btn.textContent = '📋', 2000);
    });
  });

  // Execute extraction script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    
    // Check if it's a valid URL (not chrome:// etc)
    if (!currentTab.url || !currentTab.url.startsWith('http')) {
      showError("このページは解析できません（Chrome設定画面など）。");
      document.getElementById('page-url').value = currentTab.url || "Invalid URL";
      return;
    }

    document.getElementById('page-url').value = currentTab.url;

    // Inject and execute content script
    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      files: ['content.js']
    }, () => {
      // Check for errors during injection
      if (chrome.runtime.lastError) {
         showError("スクリプトの実行に失敗しました。ページをリロードして再試行してください。");
         return;
      }
      
      // Request data from content script
      chrome.tabs.sendMessage(currentTab.id, { action: "getSEOData" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          showError("データの取得に失敗しました。ページが完全に読み込まれているか確認してください。");
        } else {
          renderData(response);
        }
      });
    });
  });
});

function showError(msg) {
  document.getElementById('meta-title').textContent = msg;
  document.getElementById('meta-desc').textContent = msg;
  document.getElementById('meta-title').classList.remove('loading');
  document.getElementById('meta-desc').classList.remove('loading');
}

function renderData(data) {
  // --- General Tab ---
  const titleEl = document.getElementById('meta-title');
  const descEl = document.getElementById('meta-desc');
  
  titleEl.textContent = data.title || "設定されていません";
  titleEl.classList.remove('loading');
  document.getElementById('title-count').textContent = `${data.title.length}/60`;
  updateProgress('title-progress', data.title.length, [30, 60]);

  descEl.textContent = data.description || "設定されていません";
  descEl.classList.remove('loading');
  document.getElementById('desc-count').textContent = `${data.description.length}/120`;
  updateProgress('desc-progress', data.description.length, [50, 120]);

  // Canonical & Robots & Tools
  const canonicalEl = document.getElementById('meta-canonical');
  canonicalEl.textContent = data.canonical || "設定されていません";
  if (!data.canonical) canonicalEl.style.color = 'var(--text-tertiary)';

  const robotsEl = document.getElementById('meta-robots');
  robotsEl.textContent = data.robots || "設定されていません";
  if (!data.robots) robotsEl.style.color = 'var(--text-tertiary)';

  // Quick ToolsLinks setup (robots.txt and sitemap.xml)
  document.getElementById('link-robots-txt').href = `${data.origin}/robots.txt`;
  document.getElementById('link-sitemap-xml').href = `${data.origin}/sitemap.xml`;

  // --- Headings ---
  const headingsList = document.getElementById('headings-list');
  headingsList.innerHTML = '';
  if (data.headings.length === 0) {
    headingsList.innerHTML = '<li class="empty-state">見出しタグ（h1-h6）が見つかりません。</li>';
  } else {
    data.headings.forEach(h => {
      const li = document.createElement('li');
      const level = parseInt(h.tag.replace('H', ''));
      li.style.paddingLeft = `${(level - 1) * 16 + 16}px`;
      li.innerHTML = `<span class="h-tag">${h.tag}</span> ${escapeHTML(h.text || '[空の見出し]')}`;
      headingsList.appendChild(li);
    });
  }

  // --- Images ---
  const imgList = document.getElementById('images-list');
  const imgBadge = document.getElementById('img-badge');
  imgList.innerHTML = '';
  
  if (data.images.missingAlt.length > 0) {
    imgBadge.style.display = 'inline-block';
    imgBadge.textContent = data.images.missingAlt.length;
    
    data.images.missingAlt.forEach(src => {
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.gap = '12px';
      li.style.alignItems = 'center';
      
      li.innerHTML = `
        <div style="flex-shrink:0;width:40px;height:40px;background:#f3f4f6;border-radius:4px;border:1px solid var(--border-color);overflow:hidden;display:flex;align-items:center;justify-content:center;">
          <img src="${escapeHTML(src)}" class="thumbnail-img" style="max-width:100%;max-height:100%;object-fit:cover;">
        </div>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;">
          <strong style="font-size:11px;color:var(--danger-color);">ALT属性がありません</strong>
          <input type="text" value="${escapeHTML(src)}" readonly title="クリックでコピー" class="copyable-url"
                 style="width:100%;font-size:10px;font-family:monospace;border:1px solid var(--border-color);border-radius:4px;padding:4px 6px;background:var(--bg-color);color:var(--text-secondary);cursor:pointer;outline:none;transition:background 0.2s;">
        </div>
      `;
      
      const imgEl = li.querySelector('.thumbnail-img');
      imgEl.addEventListener('error', () => {
        imgEl.style.display = 'none';
      });

      const inputEl = li.querySelector('.copyable-url');
      inputEl.addEventListener('click', () => {
        inputEl.select();
        navigator.clipboard.writeText(inputEl.value).then(() => {
          inputEl.style.backgroundColor = '#d1fae5';
          setTimeout(() => {
             inputEl.style.backgroundColor = 'var(--bg-color)';
          }, 500);
        });
      });

      imgList.appendChild(li);
    });
  } else {
    imgList.innerHTML = `<li class="empty-state">素晴らしい！ページ内の全画像(${data.images.total}枚)にALT属性が設定されています。</li>`;
  }

  // --- Links ---
  document.getElementById('links-total').textContent = data.links.total;
  document.getElementById('links-internal').textContent = data.links.internal;
  document.getElementById('links-external').textContent = data.links.external;
  document.getElementById('links-missing-title').textContent = data.links.missingTitle;

  // --- Open Graph ---
  document.getElementById('og-title').textContent = data.ogp.title || data.title || "設定されていません";
  document.getElementById('og-desc').textContent = data.ogp.description || data.description || "設定されていません";
  
  const ogImgEl = document.getElementById('og-image');
  const ogPlaceholder = document.getElementById('og-image-placeholder');
  
  if (data.ogp.image) {
    ogImgEl.src = data.ogp.image;
    ogImgEl.style.display = 'block';
    ogPlaceholder.style.display = 'none';
  } else {
    ogImgEl.style.display = 'none';
    ogPlaceholder.style.display = 'block';
  }
}

function updateProgress(elementId, length, [minOpt, maxOpt]) {
  const el = document.getElementById(elementId);
  const percentage = Math.min((length / maxOpt) * 100, 100);
  el.style.width = `${percentage}%`;
  
  if (length === 0) {
    el.style.width = '0%';
  } else if (length < minOpt || length > maxOpt) {
    el.style.backgroundColor = 'var(--warning-color)';
  } else {
    el.style.backgroundColor = 'var(--success-color)';
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag])
  );
}
