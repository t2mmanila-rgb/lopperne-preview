/**
 * Lopperne - Skandinavisk Design
 * Main Application Script with Full Bilingual (EN/DA) Support
 */

document.addEventListener('DOMContentLoaded', () => {
  initLanguageSwitcher();
  initCatalog();
  initNavigation();
  initFilters();
  initContactModals();
  initLightbox();
});

// State
let currentLang = (typeof getCurrentLang === 'function') ? getCurrentLang() : 'en';
let activeCategory = 'all';
let activeDesigner = 'all';
let searchQuery = '';
let currentLightboxFurniture = null;
let currentLightboxViewIndex = 0;

/**
 * Initialize Language Switcher (Desktop & Mobile)
 */
function initLanguageSwitcher() {
  currentLang = (typeof getCurrentLang === 'function') ? getCurrentLang() : 'en';
  
  // Attach listeners to all language switcher buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetLang = btn.getAttribute('data-lang');
      if (targetLang && targetLang !== currentLang) {
        setLanguage(targetLang);
      }
    });
  });

  // Apply initial language state
  setLanguage(currentLang, false);
}

/**
 * Switch Active Language
 */
function setLanguage(lang, rerender = true) {
  if (lang !== 'en' && lang !== 'da') lang = 'en';
  currentLang = lang;
  try {
    localStorage.setItem('lopperne_lang', lang);
  } catch (e) {
    // localStorage may be disabled in some environments
  }

  // Update HTML lang attribute
  document.documentElement.lang = (lang === 'en' ? 'en' : 'da-DK');

  // Update active button state on all switchers
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });

  // Update page title and meta description
  document.title = t('metaTitle', lang);
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', t('metaDesc', lang));

  // Translate all DOM elements with [data-i18n]
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key, lang);
    if (val !== undefined && val !== key) {
      el.innerHTML = val;
    }
  });

  // Translate placeholder attributes with [data-i18n-placeholder]
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = t(key, lang);
    if (val !== undefined) {
      el.placeholder = val;
    }
  });

  // Translate title attributes with [data-i18n-title]
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const val = t(key, lang);
    if (val !== undefined) {
      el.title = val;
    }
  });

  // Translate aria-label attributes with [data-i18n-aria]
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria');
    const val = t(key, lang);
    if (val !== undefined) {
      el.setAttribute('aria-label', val);
    }
  });

  // Re-render catalog grid with translated cards
  if (rerender) {
    renderFurnitureGrid();
  }

  // Update open lightbox if currently displayed
  if (currentLightboxFurniture) {
    openLightbox(currentLightboxFurniture.id, currentLightboxViewIndex);
  }
}

// Expose globally
window.setLanguage = setLanguage;

/**
 * Initialize Catalog Grid
 */
function initCatalog() {
  renderFurnitureGrid();
}

/**
 * Render furniture items to the catalog container
 */
function renderFurnitureGrid() {
  const container = document.getElementById('furniture-grid');
  if (!container) return;

  const query = searchQuery.toLowerCase().trim();

  const filtered = FURNITURE_DATA.filter(rawItem => {
    const matchCategory = activeCategory === 'all' || rawItem.category === activeCategory;
    const matchDesigner = activeDesigner === 'all' || rawItem.designerKey === activeDesigner;
    
    // Search across both DA and EN data fields
    const matchSearch = query === '' || 
      (rawItem.name && rawItem.name.toLowerCase().includes(query)) ||
      (rawItem.name_en && rawItem.name_en.toLowerCase().includes(query)) ||
      (rawItem.designer && rawItem.designer.toLowerCase().includes(query)) ||
      (rawItem.producer && rawItem.producer.toLowerCase().includes(query)) ||
      (rawItem.categoryName && rawItem.categoryName.toLowerCase().includes(query)) ||
      (rawItem.categoryName_en && rawItem.categoryName_en.toLowerCase().includes(query));

    return matchCategory && matchDesigner && matchSearch;
  });

  const countBadge = document.getElementById('catalog-count');
  if (countBadge) {
    countBadge.textContent = `${filtered.length} ${t('itemsFound', currentLang)}`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-catalog-message">
        <h3>${t('emptyTitle', currentLang)}</h3>
        <p>${t('emptyLead', currentLang)}</p>
        <button type="button" class="btn-secondary" onclick="resetFilters()">${t('resetFilters', currentLang)}</button>
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  filtered.forEach(rawItem => {
    const furniture = (typeof getLocalizedItem === 'function') 
      ? getLocalizedItem(rawItem, currentLang) 
      : rawItem;

    const card = document.createElement('article');
    card.className = 'furniture-card';
    card.setAttribute('data-id', furniture.id);

    // All views for this item: Main is the first view, followed by Front, Side, Detail/Back
    const views = [
      { id: 'main', name: 'Main', image: furniture.images.main },
      ...(furniture.images.angles || [])
    ];

    let currentViewIndex = 0; // 0 represents the Main image
    const initialImg = views[0].image;

    card.innerHTML = `
      <div class="card-media-wrapper">
        <div class="card-badges-header">
          <span class="card-badge">${furniture.status}</span>
          <span class="card-zoom-badge" title="${t('cardZoomTitle', currentLang)}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
            <span>${t('cardViewPhotos', currentLang)}</span>
          </span>
        </div>

        <!-- Main Clickable Image -> Opens Lightbox modal -->
        <div class="main-image-container" title="${t('cardZoomTitle', currentLang)}">
          <img src="${initialImg}" 
               alt="${furniture.name} - ${furniture.designer}" 
               class="furniture-main-img" 
               loading="lazy"
               onerror="this.onerror=null;this.src='${furniture.images.main}'">
          
          <!-- Back to Main Button (shown whenever browsing Front, Side, Detail) -->
          <button type="button" class="btn-return-main hidden" title="${t('cardBackToMainTitle', currentLang)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 14 4 9 9 4"></polyline>
              <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
            </svg>
            <span>${t('cardBackToMain', currentLang)}</span>
          </button>

          <div class="image-overlay-prompt">
            <span class="view-360-hint">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              ${t('cardClickBig', currentLang)}
            </span>
          </div>
        </div>

        <!-- 4 Distinct Angle Sub-thumbnails: Main, Front, Side, Detail/Back -->
        <div class="angle-sub-thumbnails" aria-label="${t('lightboxSelectAngle', currentLang)}">
          ${views.map((v, idx) => `
            <div class="angle-thumb-item ${idx === 0 ? 'active' : ''}" 
                 data-view-idx="${idx}"
                 title="${v.name}">
              <img src="${v.image}" alt="${v.name}" loading="lazy" onerror="this.onerror=null;this.src='${furniture.images.main}'">
              <span class="angle-thumb-label">${v.name}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card-details">
        <div class="card-meta">
          <span class="card-designer">${furniture.designer}</span>
          <span class="card-year">${furniture.year}</span>
        </div>
        <h3 class="card-title">${furniture.name}</h3>
        <p class="card-model">${furniture.model} • ${furniture.producer}</p>
        
        <p class="card-short-desc">${furniture.shortDesc || ''}</p>

        <div class="card-pricing">
          <div class="price-wrap">
            <span class="price-prefix">${t('cardPricePrefix', currentLang)}</span>
            <span class="card-price">${furniture.price}</span>
          </div>
          <button type="button" class="btn-card-inquire" title="${t('cardInquireTitle', currentLang)}">
            ${t('cardInquireBtn', currentLang)}
          </button>
        </div>
      </div>
    `;

    // Wire main image and badge click to open Lightbox
    const mainImgWrap = card.querySelector('.main-image-container');
    const zoomBadge = card.querySelector('.card-zoom-badge');
    const openItemLightbox = () => {
      openLightbox(rawItem.id, currentViewIndex);
    };
    if (mainImgWrap) mainImgWrap.addEventListener('click', openItemLightbox);
    if (zoomBadge) zoomBadge.addEventListener('click', openItemLightbox);

    // Wire angle thumbnails to switch the main image
    const mainImg = card.querySelector('.furniture-main-img');
    const returnMainBtn = card.querySelector('.btn-return-main');
    const thumbs = card.querySelectorAll('.angle-thumb-item');

    const selectView = (idx) => {
      currentViewIndex = idx;
      const targetView = views[idx];

      thumbs.forEach((t, i) => {
        t.classList.toggle('active', i === idx);
      });

      if (returnMainBtn) {
        if (idx === 0) {
          returnMainBtn.classList.add('hidden');
        } else {
          returnMainBtn.classList.remove('hidden');
        }
      }

      mainImg.style.opacity = '0.3';
      setTimeout(() => {
        mainImg.src = targetView.image;
        mainImg.style.opacity = '1';
      }, 120);
    };

    thumbs.forEach(thumb => {
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(thumb.getAttribute('data-view-idx'), 10);
        selectView(idx);
      });
    });

    if (returnMainBtn) {
      returnMainBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectView(0); // Return smoothly to Main
      });
    }

    // Wire inquire button
    const inqBtn = card.querySelector('.btn-card-inquire');
    if (inqBtn) {
      inqBtn.addEventListener('click', () => {
        const subjectText = (currentLang === 'da')
          ? `Forespørgsel på: ${furniture.name} (${furniture.designer}) - Pris: ${furniture.price}`
          : `Inquiry on: ${furniture.name} (${furniture.designer}) - Price: ${furniture.price}`;
        window.openContactWithSubject(subjectText);
      });
    }

    container.appendChild(card);
  });
}

/**
 * Filter interactions
 */
function initFilters() {
  const catPills = document.querySelectorAll('.cat-pill');
  catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      catPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.getAttribute('data-cat');
      renderFurnitureGrid();
    });
  });

  const designerSelect = document.getElementById('filter-designer');
  if (designerSelect) {
    designerSelect.addEventListener('change', (e) => {
      activeDesigner = e.target.value;
      renderFurnitureGrid();
    });
  }

  const searchInput = document.getElementById('catalog-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderFurnitureGrid();
    });
  }
}

function resetFilters() {
  activeCategory = 'all';
  activeDesigner = 'all';
  searchQuery = '';
  
  const catPills = document.querySelectorAll('.cat-pill');
  catPills.forEach(p => p.classList.remove('active'));
  const allPill = document.querySelector('.cat-pill[data-cat="all"]');
  if (allPill) allPill.classList.add('active');

  const designerSelect = document.getElementById('filter-designer');
  if (designerSelect) designerSelect.value = 'all';

  const searchInput = document.getElementById('catalog-search-input');
  if (searchInput) searchInput.value = '';

  renderFurnitureGrid();
}

window.resetFilters = resetFilters;

/**
 * Navigation, Dropdowns, and Smooth Page Routing
 */
function initNavigation() {
  const navToggle = document.getElementById('nav-toggle');
  const navClose = document.getElementById('mobile-nav-close');
  const mainNav = document.getElementById('main-nav');

  function openMobileNav() {
    if (mainNav) mainNav.classList.add('nav-open');
    if (navToggle) navToggle.classList.add('open');
    document.body.classList.add('no-scroll');
  }

  function closeMobileNav() {
    if (mainNav) mainNav.classList.remove('nav-open');
    if (navToggle) navToggle.classList.remove('open');
    document.body.classList.remove('no-scroll');
  }

  if (navToggle) {
    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (mainNav && mainNav.classList.contains('nav-open')) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });
  }

  if (navClose) {
    navClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMobileNav();
    });
  }

  // Mobile accordion for dropdowns
  document.querySelectorAll('.has-dropdown > .nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      if (window.innerWidth <= 1024) {
        e.preventDefault();
        e.stopPropagation();
        const parent = this.closest('.nav-item');
        const isExpanded = parent.classList.contains('mobile-expanded');
        parent.classList.toggle('mobile-expanded', !isExpanded);
      }
    });
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '' || targetId === '#gratis-vurdering') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        closeMobileNav();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Dropdown Sub-menu direct filter links
  document.querySelectorAll('[data-filter-cat]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = el.getAttribute('data-filter-cat');
      activeCategory = cat;

      // Update cat pills UI
      const catPills = document.querySelectorAll('.cat-pill');
      catPills.forEach(p => {
        p.classList.toggle('active', p.getAttribute('data-cat') === cat);
      });

      renderFurnitureGrid();

      const section = document.getElementById('moebler-sektion');
      if (section) section.scrollIntoView({ behavior: 'smooth' });

      closeMobileNav();
    });
  });

  document.querySelectorAll('[data-filter-designer]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const designer = el.getAttribute('data-filter-designer');
      activeDesigner = designer;

      const dSelect = document.getElementById('filter-designer');
      if (dSelect) dSelect.value = designer;

      renderFurnitureGrid();

      const section = document.getElementById('moebler-sektion');
      if (section) section.scrollIntoView({ behavior: 'smooth' });

      closeMobileNav();
    });
  });

  // Close drawer on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mainNav && mainNav.classList.contains('nav-open')) {
      closeMobileNav();
    }
  });
}

/**
 * Contact Modal and Direct Inquiry Handling
 */
function initContactModals() {
  window.openContactWithSubject = function(subjectText) {
    const modal = document.getElementById('contact-modal');
    const subjInput = document.getElementById('contact-subject');
    if (subjInput) subjInput.value = subjectText;
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };

  const closeBtn = document.getElementById('contact-modal-close');
  const modal = document.getElementById('contact-modal');
  if (closeBtn && modal) {
    closeBtn.onclick = () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    };
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  const contactForm = document.getElementById('modal-contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert(t('contactAlertThanks', currentLang));
      if (modal) modal.classList.remove('active');
      document.body.style.overflow = '';
      contactForm.reset();
    });
  }
}

/**
 * Image Lightbox Modal Implementation
 */
function initLightbox() {
  const modal = document.getElementById('modal-image-lightbox');
  const closeBtn = document.getElementById('lightbox-close-btn');
  const inquireBtn = document.getElementById('lightbox-inquire-btn');

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', closeLightbox);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeLightbox();
    });
  }

  if (inquireBtn) {
    inquireBtn.addEventListener('click', () => {
      if (!currentLightboxFurniture) return;
      const raw = currentLightboxFurniture;
      const localized = (typeof getLocalizedItem === 'function') 
        ? getLocalizedItem(raw, currentLang) 
        : raw;
      closeLightbox();
      const subjectText = (currentLang === 'da')
        ? `Forespørgsel på: ${localized.name} (${localized.designer}) - Pris: ${localized.price}`
        : `Inquiry on: ${localized.name} (${localized.designer}) - Price: ${localized.price}`;
      window.openContactWithSubject(subjectText);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeLightbox();
    }
  });
}

function openLightbox(furnitureId, initialAngleIndex = 0) {
  const rawItem = FURNITURE_DATA.find(f => f.id === furnitureId);
  if (!rawItem) return;

  currentLightboxFurniture = rawItem;
  currentLightboxViewIndex = initialAngleIndex;

  const item = (typeof getLocalizedItem === 'function') 
    ? getLocalizedItem(rawItem, currentLang) 
    : rawItem;

  const modal = document.getElementById('modal-image-lightbox');
  const mainImg = document.getElementById('lightbox-img');
  const title = document.getElementById('lightbox-title');
  const designer = document.getElementById('lightbox-designer');
  const price = document.getElementById('lightbox-price');
  const badge = document.getElementById('lightbox-badge');
  const desc = document.getElementById('lightbox-desc');
  const dim = document.getElementById('lightbox-dimensions');
  const frame = document.getElementById('lightbox-frame');
  const prov = document.getElementById('lightbox-provenance');
  const anglesContainer = document.getElementById('lightbox-angle-btns');

  // Include Main as the primary view plus all 3 angles
  const allViews = [
    { id: 'main', name: 'Main', image: item.images.main },
    ...(item.images.angles || [])
  ];

  let selectedIdx = (initialAngleIndex >= 0 && initialAngleIndex < allViews.length) ? initialAngleIndex : 0;
  currentLightboxViewIndex = selectedIdx;

  if (title) title.textContent = item.name;
  if (designer) designer.textContent = `${item.designer} • ${item.year} (${item.producer})`;
  if (price) price.textContent = item.price;
  if (badge) badge.textContent = item.status;
  if (desc) desc.textContent = item.fullDesc || item.shortDesc;
  
  const seatHeightLabel = (currentLang === 'da') ? 'Siddehøjde' : 'Seat Height';
  if (dim) dim.textContent = `W: ${item.dimensions.width}, D: ${item.dimensions.depth}, H: ${item.dimensions.height} (${seatHeightLabel}: ${item.dimensions.seatHeight})`;
  if (frame) frame.textContent = item.frame;
  if (prov) prov.textContent = item.provenance;

  const currentView = allViews[selectedIdx] || allViews[0];
  if (mainImg) {
    mainImg.src = currentView.image;
    mainImg.alt = `${item.name} - ${currentView.name}`;
  }

  // Populate angle buttons
  if (anglesContainer) {
    anglesContainer.innerHTML = '';
    allViews.forEach((viewObj, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn-lightbox-angle ${idx === selectedIdx ? 'active' : ''}`;
      btn.textContent = viewObj.name;
      btn.addEventListener('click', () => {
        anglesContainer.querySelectorAll('.btn-lightbox-angle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentLightboxViewIndex = idx;
        if (mainImg) {
          mainImg.style.opacity = '0.3';
          setTimeout(() => {
            mainImg.src = viewObj.image;
            mainImg.alt = `${item.name} - ${viewObj.name}`;
            mainImg.style.opacity = '1';
          }, 120);
        }
      });
      anglesContainer.appendChild(btn);
    });
  }

  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeLightbox() {
  const modal = document.getElementById('modal-image-lightbox');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
  currentLightboxFurniture = null;
  currentLightboxViewIndex = 0;
}
