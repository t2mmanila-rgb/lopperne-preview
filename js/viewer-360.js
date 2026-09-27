/**
 * Lopperne 360-Degree Turntable Viewer Engine
 * Provides smooth automatic continuous rotation, interactive scrub/drag,
 * multi-angle 3D canvas studio rendering, and real-time upholstery switching.
 */

class FurnitureViewer360 {
  constructor() {
    this.modal = null;
    this.canvas = null;
    this.ctx = null;
    this.currentFurniture = null;
    this.currentUpholstery = 'lambswool';
    this.angle = 35; // Initial pleasing 3/4 angle
    this.isRotating = true;
    this.rotationSpeed = 0.6; // Degrees per frame
    this.isDragging = false;
    this.lastMouseX = 0;
    this.zoomLevel = 1.0;
    this.showDimensions = false;
    this.animationFrameId = null;
  }

  init() {
    this.modal = document.getElementById('modal-360');
    this.canvas = document.getElementById('canvas-360');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    if (!this.modal || !this.canvas) return;

    this.bindControls();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = (rect.width || 600) * dpr;
    this.canvas.height = (rect.height || 540) * dpr;
    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }
  }

  open(furnitureId, upholsteryId = null) {
    if (!this.modal) this.init();
    const furniture = FURNITURE_DATA.find(f => f.id === furnitureId);
    if (!furniture) return;

    this.currentFurniture = furniture;
    this.currentUpholstery = upholsteryId || furniture.images.upholstery[0].id;
    this.angle = 25;
    this.isRotating = true;
    this.zoomLevel = 1.0;
    this.showDimensions = false;

    // Populate UI in modal
    this.populateModalDetails();

    // Show modal
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Start rotation loop
    setTimeout(() => {
      this.resizeCanvas();
      this.startLoop();
    }, 50);
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
    this.stopLoop();
  }

  populateModalDetails() {
    const f = this.currentFurniture;
    if (!f) return;

    document.getElementById('modal-furniture-title').textContent = f.name;
    document.getElementById('modal-furniture-designer').textContent = `${f.designer} • ${f.producer || ''} (${f.year})`;
    document.getElementById('modal-furniture-desc').textContent = f.fullDesc;
    
    // Valuations
    document.getElementById('val-before-renovation').textContent = f.valuationBefore;
    document.getElementById('val-after-renovation').textContent = f.valuationAfter;
    document.getElementById('modal-price').textContent = f.price;
    document.getElementById('modal-status-badge').textContent = f.status;

    // Specs
    document.getElementById('spec-dimensions').textContent = `B: ${f.dimensions.width} | D: ${f.dimensions.depth} | H: ${f.dimensions.height} (Sædehøjde: ${f.dimensions.seatHeight})`;
    document.getElementById('spec-frame').textContent = f.frame;
    document.getElementById('spec-provenance').textContent = f.provenance;

    // Render Upholstery Switcher in Modal
    const uphContainer = document.getElementById('modal-upholstery-selector');
    uphContainer.innerHTML = '';
    f.images.upholstery.forEach(u => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `uph-option-btn ${u.id === this.currentUpholstery ? 'active' : ''}`;
      btn.innerHTML = `
        <span class="uph-swatch" style="background-color: ${u.swatch};"></span>
        <div class="uph-info">
          <span class="uph-name">${u.name}</span>
          <span class="uph-mat">${u.material}</span>
        </div>
      `;
      btn.addEventListener('click', () => {
        this.currentUpholstery = u.id;
        uphContainer.querySelectorAll('.uph-option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('modal-selected-uph-desc').textContent = u.desc;
      });
      uphContainer.appendChild(btn);
    });

    const activeUph = f.images.upholstery.find(u => u.id === this.currentUpholstery) || f.images.upholstery[0];
    document.getElementById('modal-selected-uph-desc').textContent = activeUph.desc;

    // Wire buttons in modal
    const bookBtn = document.getElementById('modal-book-btn');
    if (bookBtn) {
      bookBtn.onclick = () => {
        this.close();
        if (window.openContactWithSubject) {
          window.openContactWithSubject(`Forespørgsel på: ${f.name} (${f.designer}) - Polstring: ${this.currentUpholstery}`);
        }
      };
    }

    const valBtn = document.getElementById('modal-valuation-btn');
    if (valBtn) {
      valBtn.onclick = () => {
        this.close();
        const section = document.getElementById('gratis-vurdering');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
        const typeSelect = document.getElementById('vurdering-kategori');
        if (typeSelect) typeSelect.value = f.category;
      };
    }
  }

  bindControls() {
    // Close button & overlay click
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.onclick = () => this.close();

    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // Play/Pause rotation
    const playPauseBtn = document.getElementById('ctrl-play-pause');
    if (playPauseBtn) {
      playPauseBtn.onclick = () => {
        this.isRotating = !this.isRotating;
        playPauseBtn.innerHTML = this.isRotating 
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Roter';
      };
    }

    // Angle slider
    const angleSlider = document.getElementById('ctrl-angle-slider');
    if (angleSlider) {
      angleSlider.oninput = (e) => {
        this.angle = parseFloat(e.target.value);
        this.isRotating = false;
        if (playPauseBtn) playPauseBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Roter';
      };
    }

    // Zoom buttons
    const zoomInBtn = document.getElementById('ctrl-zoom-in');
    const zoomOutBtn = document.getElementById('ctrl-zoom-out');
    if (zoomInBtn) zoomInBtn.onclick = () => { this.zoomLevel = Math.min(1.8, this.zoomLevel + 0.2); };
    if (zoomOutBtn) zoomOutBtn.onclick = () => { this.zoomLevel = Math.max(0.8, this.zoomLevel - 0.2); };

    // Toggle dimensions
    const dimBtn = document.getElementById('ctrl-toggle-dimensions');
    if (dimBtn) dimBtn.onclick = () => {
      this.showDimensions = !this.showDimensions;
      dimBtn.classList.toggle('active', this.showDimensions);
    };

    // Canvas Mouse & Touch Dragging
    const handleDragStart = (clientX) => {
      this.isDragging = true;
      this.lastMouseX = clientX;
      this.isRotating = false;
      const btn = document.getElementById('ctrl-play-pause');
      if (btn) btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Roter';
    };

    const handleDragMove = (clientX) => {
      if (!this.isDragging) return;
      const delta = clientX - this.lastMouseX;
      this.lastMouseX = clientX;
      this.angle = (this.angle + delta * 0.75 + 360) % 360;
      const slider = document.getElementById('ctrl-angle-slider');
      if (slider) slider.value = Math.round(this.angle);
    };

    const handleDragEnd = () => {
      this.isDragging = false;
    };

    this.canvas.addEventListener('mousedown', (e) => handleDragStart(e.clientX));
    window.addEventListener('mousemove', (e) => handleDragMove(e.clientX));
    window.addEventListener('mouseup', handleDragEnd);

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) handleDragStart(e.touches[0].clientX);
    }, { passive: true });
    this.canvas.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        e.preventDefault();
        handleDragMove(e.touches[0].clientX);
      }
    }, { passive: false });
    window.addEventListener('touchend', handleDragEnd);

    // Escape key closes modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.classList.contains('active')) {
        this.close();
      }
    });
  }

  startLoop() {
    this.stopLoop();
    const render = () => {
      if (this.isRotating) {
        this.angle = (this.angle + this.rotationSpeed) % 360;
        const slider = document.getElementById('ctrl-angle-slider');
        if (slider) slider.value = Math.round(this.angle);
      }

      const angleValEl = document.getElementById('ctrl-angle-value');
      if (angleValEl) angleValEl.textContent = `${Math.round(this.angle)}°`;

      this.renderFrame();
      this.animationFrameId = requestAnimationFrame(render);
    };
    this.animationFrameId = requestAnimationFrame(render);
  }

  stopLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  renderFrame() {
    if (!this.ctx || !this.currentFurniture) return;
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || 600;
    const h = rect.height || 540;

    ctx.clearRect(0, 0, w, h);

    const rad = (this.angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    ctx.save();
    ctx.translate(w / 2, h / 2 + 25);
    ctx.scale(this.zoomLevel, this.zoomLevel);

    // 1. Studio Ground Ellipse Shadow
    const shadowWidth = 230 + Math.abs(cos) * 40;
    const shadowHeight = 45 + Math.abs(sin) * 15;
    const shadowGrad = ctx.createRadialGradient(0, 160, 10, 0, 160, shadowWidth);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.28)');
    shadowGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.12)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(0, 160, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Render 3D Sculptural Turntable Model
    this.drawFurnitureSculpture(ctx, rad, cos, sin);

    // 3. Render Dimensions Overlay if active
    if (this.showDimensions) {
      this.drawDimensionOverlay(ctx, w, h);
    }

    ctx.restore();
  }

  drawFurnitureSculpture(ctx, rad, cos, sin) {
    const f = this.currentFurniture;
    const uph = this.currentUpholstery; // 'lambswool', 'leather', 'fabric'
    
    // Palette based on upholstery
    let mainColor, lightTone, darkTone, seamColor, texturePattern;
    if (uph === 'lambswool') {
      mainColor = '#f5f2ea';
      lightTone = '#ffffff';
      darkTone = '#ded7c8';
      seamColor = '#cfc6b5';
      texturePattern = 'fluffy';
    } else if (uph === 'leather') {
      mainColor = '#1a1a1a';
      lightTone = '#383838';
      darkTone = '#0a0a0a';
      seamColor = '#000000';
      texturePattern = 'sheen';
    } else {
      mainColor = '#6b5c50';
      lightTone = '#877668';
      darkTone = '#4b3f36';
      seamColor = '#3c322b';
      texturePattern = 'weave';
    }

    // Wood / Metal Frame colors
    const isMetal = f.frame.toLowerCase().includes('alu') || f.frame.toLowerCase().includes('forkromet') || f.frame.toLowerCase().includes('stålrør');
    const frameColor = isMetal ? '#a5a9ad' : '#b28451'; // Chrome or Warm Oak/Teak
    const frameHighlight = isMetal ? '#e8ebed' : '#cf9e67';
    const frameShadow = isMetal ? '#5b6065' : '#734e29';

    // Different geometry families based on category/model
    const isSofa = f.category === 'sofaer';
    const isTable = f.category === 'sofaborde' || f.category === 'borde' || f.category === 'opbevaring';
    const isEggOrSwan = f.id.includes('aegget') || f.id.includes('svanen');
    const isYstol = f.id.includes('ystol') || f.id.includes('syveren');

    if (isTable) {
      this.drawTable(ctx, cos, sin, frameColor, frameHighlight, frameShadow);
    } else if (isEggOrSwan) {
      this.drawEggOrSwanChair(ctx, cos, sin, mainColor, lightTone, darkTone, seamColor, texturePattern, f.id.includes('aegget'));
    } else if (isSofa) {
      this.drawSofa(ctx, cos, sin, mainColor, lightTone, darkTone, seamColor, texturePattern, frameColor, frameShadow);
    } else if (isYstol) {
      this.drawWishboneChair(ctx, cos, sin, frameColor, frameHighlight, frameShadow, mainColor, darkTone);
    } else {
      this.drawClassicArmchair(ctx, cos, sin, mainColor, lightTone, darkTone, seamColor, texturePattern, frameColor, frameShadow, f);
    }
  }

  drawEggOrSwanChair(ctx, cos, sin, mainColor, lightTone, darkTone, seamColor, texture, isEgg) {
    const heightScale = isEgg ? 1.3 : 1.0;
    const bodyWidth = 140 * (0.85 + Math.abs(cos) * 0.15);

    // 1. Four-star aluminum base
    ctx.strokeStyle = '#8f9499';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const legAngle = (this.angle * Math.PI / 180) + (i * Math.PI / 2);
      const lx = Math.cos(legAngle) * 95;
      const ly = Math.sin(legAngle) * 32 + 155;
      ctx.beginPath();
      ctx.moveTo(0, 130);
      ctx.lineTo(lx, ly);
      ctx.stroke();

      // Foot glider
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central Stem Column
    const stemGrad = ctx.createLinearGradient(-12, 0, 12, 0);
    stemGrad.addColorStop(0, '#757a80');
    stemGrad.addColorStop(0.5, '#e5e9ec');
    stemGrad.addColorStop(1, '#505458');
    ctx.fillStyle = stemGrad;
    ctx.fillRect(-10, 70, 20, 65);

    // 2. Sculptural Shell Body
    const shellGrad = ctx.createLinearGradient(-bodyWidth, -140 * heightScale, bodyWidth, 70);
    shellGrad.addColorStop(0, lightTone);
    shellGrad.addColorStop(0.5, mainColor);
    shellGrad.addColorStop(1, darkTone);

    ctx.fillStyle = shellGrad;
    ctx.strokeStyle = seamColor;
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    if (isEgg) {
      const earSpread = 115 + cos * 25;
      ctx.moveTo(0, -180);
      ctx.bezierCurveTo(earSpread, -180, earSpread + 10, -70, bodyWidth, 10);
      ctx.bezierCurveTo(bodyWidth - 10, 80, 50, 95, 0, 95);
      ctx.bezierCurveTo(-50, 95, -bodyWidth + 10, 80, -bodyWidth, 10);
      ctx.bezierCurveTo(-earSpread - 10, -70, -earSpread, -180, 0, -180);
    } else {
      const wingSpread = 150 + cos * 30;
      ctx.moveTo(0, -100);
      ctx.bezierCurveTo(wingSpread * 0.7, -100, wingSpread, -30, wingSpread * 0.8, 30);
      ctx.bezierCurveTo(wingSpread * 0.6, 75, 45, 85, 0, 85);
      ctx.bezierCurveTo(-45, 85, -wingSpread * 0.6, 75, -wingSpread * 0.8, 30);
      ctx.bezierCurveTo(-wingSpread, -30, -wingSpread * 0.7, -100, 0, -100);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Inner Cushion
    if (sin < 0.6) {
      const cushionGrad = ctx.createRadialGradient(cos * 20, 35, 10, cos * 20, 35, 70);
      cushionGrad.addColorStop(0, lightTone);
      cushionGrad.addColorStop(1, mainColor);
      ctx.fillStyle = cushionGrad;
      ctx.beginPath();
      ctx.ellipse(cos * 20, 42, 65, 30, cos * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    this.applyTextureDetails(ctx, texture, 0, -30, 90, 110);
  }

  drawClassicArmchair(ctx, cos, sin, mainColor, lightTone, darkTone, seamColor, texture, frameColor, frameShadow, f) {
    // 1. Back legs
    ctx.fillStyle = frameShadow;
    ctx.fillRect(-65 + cos * 15, 60, 14, 95);
    ctx.fillRect(52 + cos * 15, 60, 14, 95);

    // 2. Chair Main Backrest
    const backWidth = 110 + Math.abs(cos) * 20;
    const backHeight = 150;
    const backGrad = ctx.createLinearGradient(-backWidth, -backHeight, backWidth, 40);
    backGrad.addColorStop(0, lightTone);
    backGrad.addColorStop(0.6, mainColor);
    backGrad.addColorStop(1, darkTone);

    ctx.fillStyle = backGrad;
    ctx.strokeStyle = seamColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(-backWidth / 2, -backHeight + 10, backWidth, backHeight, [16, 16, 6, 6]);
    ctx.fill();
    ctx.stroke();

    // 3. Deep Seat Cushion
    const seatGrad = ctx.createLinearGradient(0, 10, 0, 70);
    seatGrad.addColorStop(0, lightTone);
    seatGrad.addColorStop(1, darkTone);
    ctx.fillStyle = seatGrad;
    ctx.beginPath();
    ctx.roundRect(-backWidth / 2 - 8, 15, backWidth + 16, 50, [10, 10, 8, 8]);
    ctx.fill();
    ctx.stroke();

    // 4. Armrests
    const armWidth = 32;
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.roundRect(-backWidth / 2 - 20 + cos * 8, -50, armWidth, 80, 8);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(backWidth / 2 - 12 + cos * 8, -50, armWidth, 80, 8);
    ctx.fill();
    ctx.stroke();

    // Wooden claw/accent
    if (f.id.includes('bamse') || f.id.includes('501') || f.id.includes('spansk')) {
      ctx.fillStyle = frameColor;
      ctx.beginPath();
      ctx.ellipse(-backWidth / 2 - 4 + cos * 8, 25, 12, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(backWidth / 2 + 4 + cos * 8, 25, 12, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Front Legs
    ctx.fillStyle = frameColor;
    ctx.fillRect(-68, 60, 16, 100);
    ctx.fillRect(52, 60, 16, 100);

    // Cross-stretcher
    ctx.fillStyle = frameShadow;
    ctx.fillRect(-60, 115, 120, 10);

    this.applyTextureDetails(ctx, texture, 0, -40, 80, 90);
  }

  drawSofa(ctx, cos, sin, mainColor, lightTone, darkTone, seamColor, texture, frameColor, frameShadow) {
    const sofaWidth = 240 * (0.8 + Math.abs(cos) * 0.2);
    
    // Back legs
    ctx.fillStyle = frameShadow;
    ctx.fillRect(-sofaWidth / 2 + 20, 70, 16, 85);
    ctx.fillRect(sofaWidth / 2 - 36, 70, 16, 85);

    // Backrest with 3 distinct cushions
    const sofaGrad = ctx.createLinearGradient(-sofaWidth / 2, -100, sofaWidth / 2, 40);
    sofaGrad.addColorStop(0, lightTone);
    sofaGrad.addColorStop(0.5, mainColor);
    sofaGrad.addColorStop(1, darkTone);

    ctx.fillStyle = sofaGrad;
    ctx.strokeStyle = seamColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-sofaWidth / 2, -100, sofaWidth, 120, [12, 12, 4, 4]);
    ctx.fill();
    ctx.stroke();

    // 3 Back Cushion Dividers
    const cushionW = sofaWidth / 3;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(-sofaWidth / 2 + cushionW * i, -95);
      ctx.lineTo(-sofaWidth / 2 + cushionW * i, 15);
      ctx.stroke();
    }

    // Seat Cushions
    for (let i = 0; i < 3; i++) {
      const cx = -sofaWidth / 2 + cushionW * i + 3;
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.roundRect(cx, 18, cushionW - 6, 52, [8, 8, 4, 4]);
      ctx.fill();
      ctx.stroke();
    }

    // Armrests
    ctx.fillStyle = darkTone;
    ctx.beginPath();
    ctx.roundRect(-sofaWidth / 2 - 14, -55, 20, 85, [8, 8, 4, 4]);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(sofaWidth / 2 - 6, -55, 20, 85, [8, 8, 4, 4]);
    ctx.fill();
    ctx.stroke();

    // Front Wooden Legs
    ctx.fillStyle = frameColor;
    ctx.fillRect(-sofaWidth / 2 + 15, 68, 16, 88);
    ctx.fillRect(sofaWidth / 2 - 31, 68, 16, 88);
    ctx.fillRect(-8, 68, 16, 88);

    this.applyTextureDetails(ctx, texture, 0, -20, 160, 60);
  }

  drawWishboneChair(ctx, cos, sin, frameColor, frameHighlight, frameShadow, cushionColor, darkTone) {
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';

    // Steam-bent curved top rail
    ctx.beginPath();
    ctx.arc(0, -90, 85 + cos * 15, Math.PI * 0.9, Math.PI * 0.1, true);
    ctx.stroke();

    // Distinctive Y-Wishbone splat
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(0, -60);
    ctx.lineTo(-24, -95);
    ctx.moveTo(0, -60);
    ctx.lineTo(24, -95);
    ctx.stroke();

    // Woven Seat Frame
    ctx.fillStyle = '#d2b48c';
    ctx.strokeStyle = '#a68254';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-65, -5, 130, 40, [8, 8, 6, 6]);
    ctx.fill();
    ctx.stroke();

    // Removable Custom Upholstery Cushion
    ctx.fillStyle = cushionColor;
    ctx.strokeStyle = darkTone;
    ctx.beginPath();
    ctx.roundRect(-60, 2, 120, 28, [6, 6, 4, 4]);
    ctx.fill();
    ctx.stroke();

    // Tapering Legs
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-58, 30);
    ctx.lineTo(-65, 155);
    ctx.moveTo(58, 30);
    ctx.lineTo(65, 155);
    ctx.stroke();

    // Back Legs
    ctx.strokeStyle = frameShadow;
    ctx.beginPath();
    ctx.moveTo(-42, 30);
    ctx.lineTo(-45, 140);
    ctx.moveTo(42, 30);
    ctx.lineTo(45, 140);
    ctx.stroke();

    // Stretchers
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-60, 100);
    ctx.lineTo(60, 100);
    ctx.stroke();
  }

  drawTable(ctx, cos, sin, frameColor, frameHighlight, frameShadow) {
    const tableW = 190 * (0.85 + Math.abs(cos) * 0.15);
    const tableH = 35 + Math.abs(sin) * 20;

    const woodGrad = ctx.createLinearGradient(-tableW / 2, -20, tableW / 2, 40);
    woodGrad.addColorStop(0, frameHighlight);
    woodGrad.addColorStop(0.5, frameColor);
    woodGrad.addColorStop(1, frameShadow);

    ctx.fillStyle = woodGrad;
    ctx.strokeStyle = '#5a3b1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, tableW / 2, tableH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = frameShadow;
    ctx.beginPath();
    ctx.ellipse(0, 12, tableW / 2, tableH, 0, 0, Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = frameColor;
    ctx.fillRect(-tableW / 2 + 35, 10, 18, 145);
    ctx.fillRect(tableW / 2 - 53, 10, 18, 145);
    ctx.fillStyle = frameShadow;
    ctx.fillRect(-tableW / 4, 10, 16, 135);
    ctx.fillRect(tableW / 4, 10, 16, 135);

    ctx.fillStyle = frameColor;
    ctx.fillRect(-tableW / 2 + 45, 85, tableW - 90, 10);
  }

  applyTextureDetails(ctx, texture, cx, cy, w, h) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - w / 2, cy - h / 2, w, h);
    ctx.clip();

    if (texture === 'fluffy') {
      ctx.strokeStyle = 'rgba(215, 205, 190, 0.45)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 28; i++) {
        const x = cx - w / 2 + (Math.sin(i * 99) * 0.5 + 0.5) * w;
        const y = cy - h / 2 + (Math.cos(i * 47) * 0.5 + 0.5) * h;
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 1.5);
        ctx.stroke();
      }
    } else if (texture === 'sheen') {
      const sheenGrad = ctx.createLinearGradient(cx - w / 2, cy, cx + w / 2, cy);
      sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      sheenGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.12)');
      sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
      sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sheenGrad;
      ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    } else if (texture === 'weave') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let x = cx - w / 2; x < cx + w / 2; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, cy - h / 2);
        ctx.lineTo(x, cy + h / 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawDimensionOverlay(ctx, w, h) {
    const f = this.currentFurniture;
    ctx.save();
    ctx.strokeStyle = '#111111';
    ctx.fillStyle = '#111111';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(170, -170);
    ctx.lineTo(170, 160);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText(`H: ${f.dimensions.height}`, 178, 0);

    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(-130, 185);
    ctx.lineTo(130, 185);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText(`B: ${f.dimensions.width}`, -25, 205);

    ctx.restore();
  }
}

// Global instance
window.furnitureViewer360 = new FurnitureViewer360();
document.addEventListener('DOMContentLoaded', () => {
  window.furnitureViewer360.init();
});
