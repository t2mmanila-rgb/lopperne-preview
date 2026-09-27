/**
 * Lopperne - Gratis Vurdering Engine
 * Handles interactive file drag & drop, category/designer benchmark calculators,
 * before-and-after renovation valuations, and direct quote requests.
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
  const designerSelect = document.getElementById('vurdering-designer');
  const conditionSelect = document.getElementById('vurdering-stand');
  const uphSelect = document.getElementById('vurdering-polstring');

  const beforeValEl = document.getElementById('est-val-before');
  const afterValEl = document.getElementById('est-val-after');
  const gainValEl = document.getElementById('est-val-gain');
  const benchmarkNoteEl = document.getElementById('benchmark-note');

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

  // Interactive Live Benchmark Estimator
  const benchmarkMatrix = {
    'laenestole': {
      'arne-jacobsen': { before: '14.000 - 22.000 kr.', after: '38.000 - 55.000 kr.', note: 'Arne Jacobsen lænestole (f.eks. Ægget el. Svanen) oplever markant værdiløft ved autoriseret ompolstring.' },
      'hans-j-wegner': { before: '18.000 - 45.000 kr.', after: '48.000 - 110.000 kr.', note: 'Wegner lænestole (f.eks. Bamsestolen el. GE375) i massiv eg/teak er i historisk høj kurs.' },
      'borge-mogensen': { before: '12.000 - 20.000 kr.', after: '28.000 - 44.000 kr.', note: 'Børge Mogensen (Den Spanske Stol el. 2207) vinder enorm værdi med vegetabilsk kernelæder el. uld.' },
      'poul-kjaerholm': { before: '15.000 - 28.000 kr.', after: '35.000 - 58.000 kr.', note: 'PK22 og PK31 i originalt fjedrestål opnår topnoteringer på auktioner.' },
      'bruno-mathsson': { before: '7.000 - 12.000 kr.', after: '18.000 - 26.000 kr.', note: 'Jetson lænestole vinder stor popularitet med ny faste kanalsyninger i sort læder.' },
      'default': { before: '5.000 - 10.000 kr.', after: '14.000 - 24.000 kr.', note: 'Dansk arkitekttegnet lænestol fra 1950-70’erne med professionel restaurering.' }
    },
    'sofaer': {
      'borge-mogensen': { before: '22.000 - 35.000 kr.', after: '55.000 - 85.000 kr.', note: 'Model 2212 og 2213 er markedets mest eftertragtede sofaer ved ompolstring med anilinlæder.' },
      'hans-j-wegner': { before: '16.000 - 28.000 kr.', after: '38.000 - 62.000 kr.', note: 'Wegner sofaer (f.eks. GE290 eller GE280) bevarer exceptionel gensalgsværdi.' },
      'default': { before: '10.000 - 18.000 kr.', after: '26.000 - 46.000 kr.', note: 'Danske 2- og 3-personers sofaer i massivt træ eller formskum.' }
    },
    'stole': {
      'arne-jacobsen': { before: '800 - 1.500 kr. / stk.', after: '2.800 - 4.400 kr. / stk.', note: 'Syverstole, Myren el. Munkegaard med ny rygstivelse og læder-/uldpolstring.' },
      'hans-j-wegner': { before: '2.000 - 3.500 kr. / stk.', after: '4.500 - 7.500 kr. / stk.', note: 'Y-stole CH24 eller Kinastole i original massiv bøg, eg eller mahogni.' },
      'default': { before: '600 - 1.200 kr. / stk.', after: '1.800 - 3.200 kr. / stk.', note: 'Sæt af 4-8 spisebordsstole giver ofte en markant samlet gevinst.' }
    },
    'sofaborde': {
      'default': { before: '3.000 - 7.000 kr.', after: '9.000 - 18.000 kr.', note: 'Snedkerborde af Wegner, Mogensen, Severin Hansen i eg, palisander og teak.' }
    },
    'opbevaring': {
      'default': { before: '6.000 - 14.000 kr.', after: '16.000 - 32.000 kr.', note: 'Skænke, reoler og kommoder af Arne Vodder, Omann Jun, Børge Mogensen m.fl.' }
    }
  };

  function updateLiveEstimate() {
    if (!beforeValEl || !afterValEl) return;
    const cat = categorySelect ? categorySelect.value : 'laenestole';
    const designer = designerSelect ? designerSelect.value : 'arne-jacobsen';

    const catData = benchmarkMatrix[cat] || benchmarkMatrix['laenestole'];
    const estimate = catData[designer] || catData['default'] || benchmarkMatrix['laenestole']['default'];

    beforeValEl.textContent = estimate.before;
    afterValEl.textContent = estimate.after;
    if (benchmarkNoteEl) benchmarkNoteEl.textContent = estimate.note;
  }

  if (categorySelect) categorySelect.addEventListener('change', updateLiveEstimate);
  if (designerSelect) designerSelect.addEventListener('change', updateLiveEstimate);
  if (conditionSelect) conditionSelect.addEventListener('change', updateLiveEstimate);
  if (uphSelect) uphSelect.addEventListener('change', updateLiveEstimate);

  updateLiveEstimate();

  // Form submission
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = document.getElementById('val-name')?.value || 'Kunde';
      const phone = document.getElementById('val-phone')?.value || '';
      const email = document.getElementById('val-email')?.value || '';
      const notes = document.getElementById('val-notes')?.value || '';
      const category = categorySelect ? categorySelect.options[categorySelect.selectedIndex].text : '';
      const designer = designerSelect ? designerSelect.options[designerSelect.selectedIndex].text : '';

      // Confirmation Modal / Toast
      window.closeValuationModal();
      showSubmissionConfirmation({
        name,
        phone,
        email,
        category,
        designer,
        fileCount: uploadedFiles.length
      });

      form.reset();
      uploadedFiles = [];
      if (previewContainer) previewContainer.innerHTML = '';
      updateLiveEstimate();
    });
  }

  // Modal pop up window triggers
  const valModal = document.getElementById('modal-gratis-vurdering');
  const valCloseBtn = document.getElementById('modal-val-close-btn');

  window.openValuationModal = function(category = null, designer = null) {
    if (category && categorySelect) categorySelect.value = category;
    if (designer && designerSelect) designerSelect.value = designer;
    updateLiveEstimate();
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
        <p class="val-confirm-lead">Vi har modtaget din forespørgsel om gratis vurdering af dit møbel.</p>
        <div class="val-summary-box">
          <p><strong>Møbelkategori:</strong> ${data.category}</p>
          <p><strong>Designer / Arkitekt:</strong> ${data.designer}</p>
          <p><strong>Vedhæftede billeder:</strong> ${data.fileCount > 0 ? `${data.fileCount} stk. billeder modtaget` : 'Ingen billeder (du kan også sende via SMS)'}</p>
          <p><strong>Kontaktperson:</strong> Cleve Milton Spence, Design- & Vurderingsekspert</p>
        </div>
        <p class="val-promise">
          Cleve gennemgår dine oplysninger og fremsender et estimat over både 
          <strong>værdien i nuværende stand</strong> samt <strong>den forventede gensalgsværdi efter renovering og ombetrækning</strong> inden for 24 timer.
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
