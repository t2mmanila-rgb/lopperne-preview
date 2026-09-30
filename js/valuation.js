/**
 * Lopperne - Skandinavisk Design
 * Gratis Vurdering & Billedupload
 */

document.addEventListener('DOMContentLoaded', () => {
  initValuationTool();
});

function initValuationTool() {
  const form = document.getElementById('valuation-form');
  const dropzone = document.getElementById('val-dropzone');
  const fileInput = document.getElementById('val-file-input');
  const previewContainer = document.getElementById('val-image-previews');
  const categorySelect = document.getElementById('vurdering-kategori');
  const purposeSelect = document.getElementById('vurdering-aersag');

  let uploadedFiles = [];

  // Drag and drop handlers
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-active');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-active');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      handleFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
    });
  }

  function handleFiles(files) {
    if (!files || !files.length) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      uploadedFiles.push(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        const thumb = document.createElement('div');
        thumb.className = 'val-thumb-item';
        thumb.innerHTML = `
          <img src="${e.target.result}" alt="${file.name}">
          <button type="button" class="remove-thumb" title="Fjern">&times;</button>
          <span class="file-name">${file.name}</span>
        `;
        thumb.querySelector('.remove-thumb').addEventListener('click', (ev) => {
          ev.stopPropagation();
          uploadedFiles = uploadedFiles.filter(f => f !== file);
          thumb.remove();
        });
        previewContainer.appendChild(thumb);
      };
      reader.readAsDataURL(file);
    });
  }

  // Form submission
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = document.getElementById('val-name')?.value || 'Kunde';
      const phone = document.getElementById('val-phone')?.value || '';
      const email = document.getElementById('val-email')?.value || '';
      const category = categorySelect ? categorySelect.options[categorySelect.selectedIndex].text : '';
      const purpose = purposeSelect ? purposeSelect.options[purposeSelect.selectedIndex].text : '';

      window.closeValuationModal();
      showSubmissionConfirmation({
        name,
        phone,
        email,
        category,
        purpose,
        fileCount: uploadedFiles.length
      });

      form.reset();
      uploadedFiles = [];
      if (previewContainer) previewContainer.innerHTML = '';
    });
  }

  // Modal pop up window triggers
  const valModal = document.getElementById('modal-gratis-vurdering');
  const valCloseBtn = document.getElementById('modal-val-close-btn');

  window.openValuationModal = function(category = null) {
    if (category && categorySelect) categorySelect.value = category;
    if (valModal) {
      valModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };

  window.closeValuationModal = function() {
    if (valModal) {
      valModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  if (valCloseBtn) {
    valCloseBtn.onclick = () => window.closeValuationModal();
  }

  if (valModal) {
    valModal.addEventListener('click', (e) => {
      if (e.target === valModal) window.closeValuationModal();
    });
  }

  // Intercept all links to #gratis-vurdering
  document.querySelectorAll('a[href="#gratis-vurdering"], .btn-open-vurdering-modal').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      window.openValuationModal();
      const mainNav = document.getElementById('main-nav');
      const navToggle = document.getElementById('nav-toggle');
      if (mainNav && mainNav.classList.contains('nav-open')) {
        mainNav.classList.remove('nav-open');
        if (navToggle) navToggle.classList.remove('open');
      }
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && valModal && valModal.classList.contains('active')) {
      window.closeValuationModal();
    }
  });
}

function showSubmissionConfirmation(data) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop active';
  modal.id = 'val-confirm-modal';
  modal.innerHTML = `
    <div class="modal-dialog val-confirm-dialog">
      <button type="button" class="modal-close" onclick="document.getElementById('val-confirm-modal').remove()">&times;</button>
      <div class="val-confirm-content">
        <div class="val-confirm-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#111111" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h3>Tak for din henvendelse, ${data.name}!</h3>
        <p class="val-confirm-lead">Vi har modtaget dine oplysninger og gennemgår henvendelsen.</p>
        <div class="val-summary-box">
          <p><strong>Kategori:</strong> ${data.category}</p>
          <p><strong>Formål:</strong> ${data.purpose}</p>
          <p><strong>Vedhæftede billeder:</strong> ${data.fileCount > 0 ? `${data.fileCount} stk. billeder modtaget` : 'Ingen billeder (du kan også sende via SMS)'}</p>
          <p><strong>Kontaktperson:</strong> Cleve Milton Spence, Design- & Vurderingsekspert</p>
        </div>
        <p class="val-promise">
          Cleve gennemgår dine billeder og oplysninger og vender personligt tilbage inden for 24 timer med en uforpligtende vurdering og et favorable opkøbstilbud.
        </p>
        <div class="val-urgent-contact">
          <p>Har du et dødsbo eller akut brug for afklaring?</p>
          <a href="tel:+4550312364" class="btn-primary-dark">Ring direkte til Cleve på +45 50 31 23 64</a>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
