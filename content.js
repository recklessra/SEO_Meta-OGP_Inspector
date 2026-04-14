// content.js - Injected into the active tab to extract SEO metadata

function extractSEOData() {
  const data = {
    url: window.location.href,
    origin: window.location.origin,
    title: document.title,
    description: '',
    canonical: '',
    robots: '',
    headings: [],
    images: { total: 0, missingAlt: [] },
    links: { total: 0, internal: 0, external: 0, missingTitle: 0 },
    ogp: { title: '', description: '', image: '' }
  };

  // Meta Description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) data.description = metaDesc.getAttribute('content') || '';

  // Canonical & Robots
  const canonicalEl = document.querySelector('link[rel="canonical"]');
  if (canonicalEl) data.canonical = canonicalEl.href;
  
  const robotsEl = document.querySelector('meta[name="robots"]');
  if (robotsEl) data.robots = robotsEl.getAttribute('content');

  // Headings
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(h => {
    data.headings.push({
      tag: h.tagName,
      text: h.textContent.replace(/\s+/g, ' ').trim()
    });
  });

  // Images
  const imgs = document.querySelectorAll('img');
  data.images.total = imgs.length;
  imgs.forEach(img => {
    if (!img.hasAttribute('alt')) {
      data.images.missingAlt.push(img.src);
    }
  });

  // Links
  const linkNodes = document.querySelectorAll('a');
  data.links.total = linkNodes.length;
  const currentHost = window.location.host;
  
  linkNodes.forEach(a => {
    if (!a.hasAttribute('title')) {
      data.links.missingTitle++;
    }
    if (a.hasAttribute('href') && a.getAttribute('href') !== '') {
      try {
        const url = new URL(a.href, window.location.href);
        if (url.protocol.startsWith('http')) {
          if (url.host === currentHost) {
            data.links.internal++;
          } else {
            data.links.external++;
          }
        }
      } catch (e) {
        // Invalid URL ignore
      }
    }
  });

  // OGP Data
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  const ogImage = document.querySelector('meta[property="og:image"]');
  
  if (ogTitle) data.ogp.title = ogTitle.getAttribute('content');
  if (ogDesc) data.ogp.description = ogDesc.getAttribute('content');
  if (ogImage) data.ogp.image = ogImage.getAttribute('content');

  // Fallbacks for OGP
  if (!data.ogp.title) {
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) data.ogp.title = twTitle.getAttribute('content');
  }
  if (!data.ogp.description) {
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) data.ogp.description = twDesc.getAttribute('content');
  }
  if (!data.ogp.image) {
    const twImage = document.querySelector('meta[name="twitter:image"]');
    if (twImage) data.ogp.image = twImage.getAttribute('content');
  }

  return data;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSEOData") {
    sendResponse(extractSEOData());
  }
  return true; 
});
