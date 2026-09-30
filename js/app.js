/**
 * Lopperne - Skandinavisk Design
 * Main Application Script
 */

document.addEventListener('DOMContentLoaded', () => {
  initCatalog();
  initNavigation();
  initFilters();
  initContactModals();
  initLightbox();
});

// State
let activeCategory = 'all';
let activeDesigner = 'all';
let searchQuery = '';

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

  const filtered = FURNITURE_DATA.filter(item => {
    const matchCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchDesigner = activeDesigner === 'all' || item.designerKey === activeDesigner;
    const matchSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.designer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.producer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchCategory && matchDesigner && matchSearch;
  });

  const countBadge = document.getElementById('catalog-count');
  if (countBadge) countBadge.textContent = `${filtered.length} varer fundet`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-catalog-message">
        <h3>Ingen varer matchede dine søgekriterier</h3>
        <p>Prøv at nulstille dine filtre eller søge efter en anden designer eller kategori.</p>
        <button type="button" class="btn-secondary" onclick="resetFilters()">Nulstil filtre</button>
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  filtered.forEach(furniture => {
    const card = document.createElement('article');
    card.className = 'furniture-card';
    card.setAttribute('data-id', furniture.id);

    const angles = furniture.images.angles && furniture.images.angles.length > 0 
      ? furniture.images.angles 
      : [];

    let currentAngleIndex = -1; // -1 represents the Main image
    const initialImg = furniture.images.main;

    card.innerHTML = `
      <div class="card-media-wrapper">
        <div class="card-badges-header">
          <span class="card-badge">${furniture.status}</span>
          <span class="card-zoom-badge" title="Klik på billedet for fuld skærm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
            <span>Se Billeder</span>
          </span>
        </div>

        <!-- Main Clickable Image -> Opens Lightbox modal -->
        <div class="main-image-container" title="Klik for at se i stort format">
          <img src="${initialImg}" 
               alt="${furniture.name} - ${furniture.designer}" 
               class="furniture-main-img" 
               loading="lazy"
               onerror="this.onerror=null;this.src='${furniture.images.main}'">
          <div class="image-overlay-prompt">
            <span class="view-360-hint">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Klik for stort foto
            </span>
          </div>
        </div>

        <!-- 3 Distinct Angle Sub-thumbnails below Main -->
        <div class="angle-sub-thumbnails" aria-label="Vælg vinkel">
          ${angles.map((angle, idx) => `
            <div class="angle-thumb-item" 
                 data-angle-idx="${idx}"
                 title="Se ${angle.name}">
              <img src="${angle.image}" alt="${angle.name}" loading="lazy" onerror="this.onerror=null;this.src='${furniture.images.main}'">
              <span class="angle-thumb-label">${angle.name}</span>
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
            <span class="price-prefix">Pris hos Lopperne</span>
            <span class="card-price">${furniture.price}</span>
          </div>
          <button type="button" class="btn-card-inquire" title="Reserver eller forespørg på dette møbel">
            Forespørgsel
          </button>
        </div>
      </div>
    `;

    // Wire main image and badge click to open Lightbox
    const mainImgWrap = card.querySelector('.main-image-container');
    const zoomBadge = card.querySelector('.card-zoom-badge');
    const openItemLightbox = () => {
      openLightbox(furniture.id, currentAngleIndex);
    };
    if (mainImgWrap) mainImgWrap.addEventListener('click', openItemLightbox);
    if (zoomBadge) zoomBadge.addEventListener('click', openItemLightbox);

    // Wire angle thumbnails to switch the main image
    const mainImg = card.querySelector('.furniture-main-img');
    const thumbs = card.querySelectorAll('.angle-thumb-item');

    thumbs.forEach(thumb => {
      const switchAngle = (e) => {
        e.stopPropagation();
        const idx = parseInt(thumb.getAttribute('data-angle-idx'), 10);
        
        if (thumb.classList.contains('active')) {
          // Toggle back to Main
          thumbs.forEach(t => t.classList.remove('active'));
          currentAngleIndex = -1;
          mainImg.style.opacity = '0.3';
          setTimeout(() => {
            mainImg.src = furniture.images.main;
            mainImg.style.opacity = '1';
          }, 120);
          return;
        }

        currentAngleIndex = idx;
        const targetAngle = angles[idx];

        thumbs.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');

        mainImg.style.opacity = '0.3';
        setTimeout(() => {
          mainImg.src = targetAngle.image;
          mainImg.style.opacity = '1';
        }, 120);
      };

      thumb.addEventListener('click', switchAngle);
    });

    // Wire inquire button
    const inqBtn = card.querySelector('.btn-card-inquire');
    if (inqBtn) {
      inqBtn.addEventListener('click', () => {
        window.openContactWithSubject(`Forespørgsel på: ${furniture.name} (${furniture.designer}) - Pris: ${furniture.price}`);
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
        // Toggle current item
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

  // Dropdown Sub-menu direct filter links (e.g. Møbler -> Lænestole, Designer -> Arne Jacobsen)
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
      alert('Tak for din henvendelse! Cleve Milton Spence kontakter dig hurtigst muligt på telefon eller email.');
      if (modal) modal.classList.remove('active');
      document.body.style.overflow = '';
      contactForm.reset();
    });
  }
}

/**
 * Image Lightbox Modal Implementation
 */
let currentLightboxFurniture = null;

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
      closeLightbox();
      window.openContactWithSubject(`Forespørgsel på: ${currentLightboxFurniture.name} (${currentLightboxFurniture.designer}) - Pris: ${currentLightboxFurniture.price}`);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeLightbox();
    }
  });
}

function openLightbox(furnitureId, initialAngleIndex = 0) {
  const item = FURNITURE_DATA.find(f => f.id === furnitureId);
  if (!item) return;

  currentLightboxFurniture = item;
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

  let selectedIdx = 0;
  if (initialAngleIndex >= 0 && initialAngleIndex < (item.images.angles || []).length) {
    selectedIdx = initialAngleIndex + 1; // +1 because Main is at index 0
  }

  if (title) title.textContent = item.name;
  if (designer) designer.textContent = `${item.designer} • ${item.year} (${item.producer})`;
  if (price) price.textContent = item.price;
  if (badge) badge.textContent = item.status;
  if (desc) desc.textContent = item.fullDesc || item.shortDesc;
  if (dim) dim.textContent = `B: ${item.dimensions.width}, D: ${item.dimensions.depth}, H: ${item.dimensions.height} (Siddehøjde: ${item.dimensions.seatHeight})`;
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
}
