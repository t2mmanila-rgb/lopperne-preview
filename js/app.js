/**
 * Lopperne - Danish Design Furniture
 * Main Application Script
 */

document.addEventListener('DOMContentLoaded', () => {
  initCatalog();
  initNavigation();
  initFilters();
  initContactModals();
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
  if (countBadge) countBadge.textContent = `${filtered.length} møbler fundet`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-catalog-message">
        <h3>Ingen møbler matchede dine søgekriterier</h3>
        <p>Prøv at nulstille dine filtre eller søge efter en anden designer eller møbeltype.</p>
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

    // Default to first upholstery variant
    let selectedUpholsteryIndex = 0;
    const currentUph = furniture.images.upholstery[selectedUpholsteryIndex];

    card.innerHTML = `
      <div class="card-media-wrapper">
        <div class="card-badges-header">
          <span class="card-badge">${furniture.status}</span>
          <button type="button" class="card-360-badge" title="Klik for at se i 360° rotation">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            <span>360° Rotation</span>
          </button>
        </div>

        <!-- Main Clickable Image -> Opens 360 overlay window -->
        <div class="main-image-container" title="Klik for at åbne interaktiv 360° visning">
          <img src="${currentUph.image}" 
               alt="${furniture.name} - ${furniture.designer}" 
               class="furniture-main-img" 
               loading="lazy"
               onerror="this.onerror=null;this.src='${furniture.images.main}'">
          <div class="image-overlay-prompt">
            <span class="view-360-hint">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 8v8M8 12h8"></path>
              </svg>
              Klik for 360° visning
            </span>
          </div>
        </div>

        <!-- 3 Distinct Upholstery Sub-images -->
        <div class="upholstery-sub-thumbnails" aria-label="Vælg polstring">
          ${furniture.images.upholstery.map((uph, idx) => `
            <div class="sub-thumb-item ${idx === 0 ? 'active' : ''}" 
                 data-uph-id="${uph.id}" 
                 data-uph-idx="${idx}"
                 title="${uph.name}: ${uph.material}">
              <img src="${uph.image}" alt="${uph.name}" loading="lazy" onerror="this.onerror=null;this.src='${furniture.images.main}'">
              <span class="sub-thumb-indicator" style="background-color: ${uph.swatch};"></span>
              <span class="sub-thumb-label">${uph.name}</span>
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
        
        <div class="card-active-upholstery">
          <span class="uph-label-prefix">Valgt polstring:</span>
          <strong class="card-uph-name">${currentUph.name}</strong>
        </div>

        <div class="card-valuation-row">
          <div class="val-box before">
            <span class="val-label">Værdi før renovering</span>
            <span class="val-amount">${furniture.valuationBefore}</span>
          </div>
          <div class="val-arrow">&rarr;</div>
          <div class="val-box after">
            <span class="val-label">Værdi efter renovering</span>
            <span class="val-amount">${furniture.valuationAfter}</span>
          </div>
        </div>

        <div class="card-pricing">
          <div class="price-wrap">
            <span class="price-prefix">Pris hos Lopperne</span>
            <span class="card-price">${furniture.price}</span>
          </div>
          <button type="button" class="btn-card-inquire" title="Reserver eller forespørg">
            Forespørgsel
          </button>
        </div>
      </div>
    `;

    // Wire main image click to open 360 viewer overlay window
    const mainImgWrap = card.querySelector('.main-image-container');
    const badge360 = card.querySelector('.card-360-badge');
    const open360 = () => {
      const activeUphItem = furniture.images.upholstery[selectedUpholsteryIndex];
      if (window.furnitureViewer360) {
        window.furnitureViewer360.open(furniture.id, activeUphItem.id);
      }
    };
    mainImgWrap.addEventListener('click', open360);
    badge360.addEventListener('click', open360);

    // Wire 3 sub-thumbnails to switch the main image and active upholstery
    const mainImg = card.querySelector('.furniture-main-img');
    const uphNameEl = card.querySelector('.card-uph-name');
    const thumbs = card.querySelectorAll('.sub-thumb-item');

    thumbs.forEach(thumb => {
      const switchUph = () => {
        const idx = parseInt(thumb.getAttribute('data-uph-idx'), 10);
        selectedUpholsteryIndex = idx;
        const targetUph = furniture.images.upholstery[idx];

        // Update active class
        thumbs.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');

        // Swap main image smoothly
        mainImg.style.opacity = '0.3';
        setTimeout(() => {
          mainImg.src = targetUph.image;
          mainImg.style.opacity = '1';
        }, 120);

        if (uphNameEl) uphNameEl.textContent = targetUph.name;
      };

      thumb.addEventListener('click', switchUph);
      thumb.addEventListener('mouseenter', switchUph);
    });

    // Wire inquire button
    const inqBtn = card.querySelector('.btn-card-inquire');
    inqBtn.addEventListener('click', () => {
      const activeUphItem = furniture.images.upholstery[selectedUpholsteryIndex];
      window.openContactWithSubject(`Forespørgsel på: ${furniture.name} (${furniture.designer}) - Polstring: ${activeUphItem.name}`);
    });

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
