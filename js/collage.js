/**
 * OmniResize Studio - Collage Maker & Image Joiner Engine
 * Combines multiple photos side-by-side (horizontal), stacked (vertical), or in a grid.
 */
class CollageMaker {
  constructor(appInstance) {
    this.app = appInstance;
    this.images = [];
    this.layout = 'horizontal'; // 'horizontal', 'vertical', 'grid'
    this.gap = 12;
    this.bgColor = '#0f172a';
    this.cornerRadius = 0;

    this.modal = document.getElementById('collageModal');
    this.canvas = document.getElementById('collageCanvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.initEvents();
  }

  initEvents() {
    const btnOpen = document.getElementById('btnOpenCollage');
    if (btnOpen) {
      btnOpen.addEventListener('click', () => this.openModal());
    }

    const btnClose = document.getElementById('btnCloseCollage');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.closeModal());
    }

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.closeModal();
      });
    }

    // File input for collage
    const fileInput = document.getElementById('collageFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        this.addImagesFromFiles(files);
      });
    }

    // Layout selector buttons
    document.querySelectorAll('.btn-collage-layout').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-collage-layout').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.layout = btn.dataset.layout;
        this.renderCollage();
      });
    });

    // Gap slider
    const rangeGap = document.getElementById('rangeCollageGap');
    if (rangeGap) {
      rangeGap.addEventListener('input', () => {
        this.gap = parseInt(rangeGap.value, 10);
        document.getElementById('valCollageGap').textContent = `${this.gap}px`;
        this.renderCollage();
      });
    }

    // Bg Color
    const inputBg = document.getElementById('inputCollageBg');
    if (inputBg) {
      inputBg.addEventListener('input', () => {
        this.bgColor = inputBg.value;
        this.renderCollage();
      });
    }

    // Actions
    const btnDownload = document.getElementById('btnDownloadCollage');
    if (btnDownload) {
      btnDownload.addEventListener('click', () => this.downloadCollage());
    }

    const btnLoadStudio = document.getElementById('btnLoadCollageStudio');
    if (btnLoadStudio) {
      btnLoadStudio.addEventListener('click', () => this.loadIntoStudio());
    }

    const btnClear = document.getElementById('btnClearCollageImages');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        this.images = [];
        this.updateThumbnails();
        this.renderCollage();
      });
    }
  }

  openModal() {
    if (this.modal) {
      this.modal.classList.add('active');
      // If we currently have an image in the editor and collage is empty, add it as default!
      if (this.images.length === 0 && this.app.currentCanvas) {
        this.addImageFromCanvas(this.app.currentCanvas, 'Current Image');
      }
      this.renderCollage();
    }
  }

  closeModal() {
    if (this.modal) {
      this.modal.classList.remove('active');
    }
  }

  addImagesFromFiles(files) {
    const valid = files.filter(f => f.type.startsWith('image/'));
    valid.forEach(file => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        this.images.push({ img, name: file.name, w: img.naturalWidth, h: img.naturalHeight });
        URL.revokeObjectURL(url);
        this.updateThumbnails();
        this.renderCollage();
      };
      img.src = url;
    });
  }

  addImageFromCanvas(canvas, name = 'Image') {
    const img = new Image();
    img.onload = () => {
      this.images.push({ img, name, w: canvas.width, h: canvas.height });
      this.updateThumbnails();
      this.renderCollage();
    };
    img.src = canvas.toDataURL('image/png');
  }

  updateThumbnails() {
    const container = document.getElementById('collageThumbnailsList');
    if (!container) return;
    container.innerHTML = '';

    this.images.forEach((item, idx) => {
      const chip = document.createElement('div');
      chip.className = 'sample-chip';
      chip.style.display = 'inline-flex';
      chip.style.alignItems = 'center';
      chip.style.gap = '6px';
      chip.innerHTML = `
        <span>#${idx + 1} (${item.w}×${item.h})</span>
        <button type="button" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;">&times;</button>
      `;
      chip.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        this.images.splice(idx, 1);
        this.updateThumbnails();
        this.renderCollage();
      });
      container.appendChild(chip);
    });

    const countEl = document.getElementById('collageImageCount');
    if (countEl) countEl.textContent = `${this.images.length} Loaded`;
  }

  renderCollage() {
    if (!this.canvas || !this.ctx) return;

    if (this.images.length === 0) {
      this.canvas.width = 600;
      this.canvas.height = 360;
      this.ctx.fillStyle = this.bgColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#64748b';
      this.ctx.font = '14px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Add 2 or more images to generate collage', 300, 180);
      return;
    }

    const n = this.images.length;
    const gap = this.gap;

    if (this.layout === 'horizontal') {
      // Scale all images to same target height (e.g. 1080px or max image height)
      const targetH = Math.max(...this.images.map(img => img.h), 600);
      let totalW = gap * (n + 1);
      const scaledWidths = this.images.map(img => {
        const ratio = targetH / img.h;
        const sw = Math.round(img.w * ratio);
        totalW += sw;
        return sw;
      });

      this.canvas.width = totalW;
      this.canvas.height = targetH + gap * 2;

      this.ctx.fillStyle = this.bgColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      let currentX = gap;
      this.images.forEach((item, i) => {
        const sw = scaledWidths[i];
        this.ctx.drawImage(item.img, currentX, gap, sw, targetH);
        currentX += sw + gap;
      });
    } else if (this.layout === 'vertical') {
      // Scale all images to same target width
      const targetW = Math.max(...this.images.map(img => img.w), 800);
      let totalH = gap * (n + 1);
      const scaledHeights = this.images.map(img => {
        const ratio = targetW / img.w;
        const sh = Math.round(img.h * ratio);
        totalH += sh;
        return sh;
      });

      this.canvas.width = targetW + gap * 2;
      this.canvas.height = totalH;

      this.ctx.fillStyle = this.bgColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      let currentY = gap;
      this.images.forEach((item, i) => {
        const sh = scaledHeights[i];
        this.ctx.drawImage(item.img, gap, currentY, targetW, sh);
        currentY += sh + gap;
      });
    } else if (this.layout === 'grid') {
      // 2 Columns Grid
      const cols = 2;
      const rows = Math.ceil(n / cols);
      const cellW = 800;
      const cellH = 600;

      this.canvas.width = cellW * cols + gap * (cols + 1);
      this.canvas.height = cellH * rows + gap * (rows + 1);

      this.ctx.fillStyle = this.bgColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.images.forEach((item, idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        const x = gap + c * (cellW + gap);
        const y = gap + r * (cellH + gap);

        // Aspect fit image inside cell
        const ratio = Math.min(cellW / item.w, cellH / item.h);
        const dw = Math.round(item.w * ratio);
        const dh = Math.round(item.h * ratio);
        const ox = x + Math.round((cellW - dw) / 2);
        const oy = y + Math.round((cellH - dh) / 2);

        this.ctx.drawImage(item.img, ox, oy, dw, dh);
      });
    }
  }

  downloadCollage() {
    if (this.images.length === 0) {
      this.app.showToast('Please add images first', 'warning');
      return;
    }
    const a = document.createElement('a');
    a.href = this.canvas.toDataURL('image/jpeg', 0.92);
    a.download = `omniresize_collage_${this.layout}.jpg`;
    a.click();
    this.app.showToast('Collage downloaded successfully!', 'success');
  }

  loadIntoStudio() {
    if (this.images.length === 0) {
      this.app.showToast('Please add images first', 'warning');
      return;
    }
    // Convert collage canvas into a standalone canvas and load into studio
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.canvas.width;
    exportCanvas.height = this.canvas.height;
    const ctx = exportCanvas.getContext('2d');
    ctx.drawImage(this.canvas, 0, 0);

    this.closeModal();
    this.app.loadCanvasIntoEditor(exportCanvas, `collage_${this.layout}.jpg`);
    this.app.showToast('Collage loaded into Studio Editor!', 'success');
  }
}
