// GOWLA V4.1.1 — image fallback helper
function normalizeImageUrl(value, siteUrl) {
  if (!value) return '';
  const v = String(value).trim();
  if (!v) return '';
  if (/^(https?:)?\/\//i.test(v)) return v;
  return `${siteUrl}/${v.replace(/^\/+/, '')}`;
}

function renderHeroImage({ image, title, siteUrl }) {
  const src = normalizeImageUrl(image, siteUrl);
  const safeTitle = esc(title || 'جولة');
  return `
  <figure class="article-v41-hero${src ? '' : ' is-fallback'}" id="articleHero">
    ${src ? `<img src="${esc(src)}" alt="${safeTitle}" fetchpriority="high"
      onerror="this.style.display='none';this.closest('.article-v41-hero').classList.add('is-fallback');">` : ''}
    <div class="article-v41-image-fallback" aria-hidden="true">
      <strong>جولة</strong>
      <span>قناة الجولة · ALGWOLA</span>
    </div>
    <figcaption class="article-v41-hero-caption">صورة الخبر · قناة جولة</figcaption>
  </figure>`;
}
