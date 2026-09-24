/**
 * OmniResize Studio - Batch Processing, Bulk Resizer Dashboard & Filmstrip Queue Manager
 */

class BatchQueueManager {
  constructor(app) {
    this.app = app;
    this.items = []; // Array of { id, file, name, originalCanvas, thumbUrl, size }
    this.activeIndex = -1;

    // Single Editor Filmstrip references
    this.filmstripList = document.getElementById('filmstripList');
    this.batchCountBadge = document.getElementById('batchCount');
    this.batchZipBadge = document.getElementById('batchZipCount');

    // Bulk Resizer Dashboard references
    this.bulkScreen = document.getElementById('bulkScreen');
    this.bulkCardsGrid = document.getElementById('bulkCardsGrid');
    this.bulkEmptyState = document.getElementById('bulkEmptyState');
    this.bulkTotalImages = document.getElementById('bulkTotalImages');
    this.bulkTotalOriginalSize = document.getElementById('bulkTotalOriginalSize');
    this.bulkTotalEstimatedSize = document.getElementById('bulkTotalEstimatedSize');
    this.headerBulkCount = document.getElementById('headerBulkCount');
    this.bulkQueueStatus = document.getElementById('bulkQueueStatus');

    // Progress Bar references
    this.bulkProgressWrap = document.getElementById('bulkProgressWrap');
    this.bulkProgressBar = document.getElementById('bulkProgressBar');
    this.bulkProgressStatus = document.getElementById('bulkProgressStatus');
    this.bulkProgressLabel = document.getElementById('bulkProgressLabel');
    this.bulkProgressPercent = document.getElementById('bulkProgressPercent');

    this.isProcessing = false;

    // Bulk Processing Configuration State
    this.bulkSettings = {
      mode: 'percentage', // 'percentage', 'fit', 'exact', 'preset'
      scale: 50,
      maxW: 1920,
      maxH: 1080,
      exactW: 1080,
      exactH: 1080,
      fitBehavior: 'fit', // 'fit', 'fill', 'stretch'
      preset: '1080x1080',
      format: 'image/jpeg', // 'image/jpeg', 'image/png', 'image/webp', 'image/avif'
      quality: 85,
      targetKbEnabled: false,
      targetKb: 100,
      stripExif: true,
      watermarkEnabled: false,
      watermarkText: '',
      namingPattern: 'name_resized',
      dpi: 300
    };

    this.initEvents();
  }

  initEvents() {
    const getFileInput = () => document.getElementById('fileInput');

    // Add Files Buttons (Filmstrip & Bulk Dashboard)
    ['btnAddMoreFiles', 'btnBulkAddMore', 'btnBulkEmptyUpload'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', (e) => {
          const fi = getFileInput();
          if (fi) fi.value = '';
          if (btn.tagName.toLowerCase() !== 'label') {
            e.stopPropagation();
            if (fi) fi.click();
          }
        });
      }
    });

    // Make bulkEmptyState clickable as a dropzone upload trigger
    if (this.bulkEmptyState) {
      this.bulkEmptyState.addEventListener('click', (e) => {
        if (e.target.closest('#btnBulkEmptyUpload') || e.target.closest('label[for="fileInput"]')) return;
        const fi = getFileInput();
        if (fi) {
          fi.value = '';
          fi.click();
        }
      });
    }

    // Drag-and-Drop Direct to Bulk Dashboard
    const bulkDropTargets = [this.bulkScreen, this.bulkCardsGrid, this.bulkEmptyState];
    bulkDropTargets.forEach(target => {
      if (!target) return;
      ['dragenter', 'dragover'].forEach(name => {
        target.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.bulkScreen) this.bulkScreen.classList.add('drag-over');
          if (this.bulkEmptyState) this.bulkEmptyState.classList.add('drag-over');
        });
      });

      ['dragleave', 'drop'].forEach(name => {
        target.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.bulkScreen) this.bulkScreen.classList.remove('drag-over');
          if (this.bulkEmptyState) this.bulkEmptyState.classList.remove('drag-over');
        });
      });

      target.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const files = Array.from(e.dataTransfer.files);
          await this.addFiles(files);
          if (this.app) {
            this.app.switchMode('bulk');
            this.app.showToast(`Imported ${files.length} image${files.length > 1 ? 's' : ''} into Bulk Resizer`, 'success');
          }
        }
      });
    });

    // Clear Queue Buttons
    ['btnClearQueue', 'btnBulkClearAll'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          if (this.items.length === 0) return;
          if (confirm('Are you sure you want to clear all images from the queue?')) {
            this.clearAll();
          }
        });
      }
    });

    // Queue Filmstrip Collapse / Expand Toggle
    const btnToggleFilmstrip = document.getElementById('btnToggleFilmstrip');
    const batchFilmstrip = document.getElementById('batchFilmstrip');
    const iconToggleFilmstrip = document.getElementById('iconToggleFilmstrip');
    const canvasViewport = document.getElementById('canvasViewport');

    if (btnToggleFilmstrip && batchFilmstrip) {
      btnToggleFilmstrip.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCollapsed = batchFilmstrip.classList.toggle('collapsed');
        if (canvasViewport) {
          canvasViewport.classList.toggle('queue-collapsed', isCollapsed);
        }
        if (iconToggleFilmstrip) {
          iconToggleFilmstrip.className = isCollapsed ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
        }
      });
    }

    if (batchFilmstrip) {
      batchFilmstrip.addEventListener('click', () => {
        if (batchFilmstrip.classList.contains('collapsed')) {
          batchFilmstrip.classList.remove('collapsed');
          if (canvasViewport) canvasViewport.classList.remove('queue-collapsed');
          if (iconToggleFilmstrip) iconToggleFilmstrip.className = 'fa-solid fa-chevron-down';
        }
      });
    }

    // Bulk Mode Tabs (Percentage, Max Fit, Exact, Preset)
    document.querySelectorAll('.bulk-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.bulk-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const mode = btn.dataset.bulkMode;
        this.bulkSettings.mode = mode;

        // Toggle corresponding view panels
        document.getElementById('bulkModePercentage').classList.toggle('hidden', mode !== 'percentage');
        document.getElementById('bulkModeFit').classList.toggle('hidden', mode !== 'fit');
        document.getElementById('bulkModeExact').classList.toggle('hidden', mode !== 'exact');
        document.getElementById('bulkModePreset').classList.toggle('hidden', mode !== 'preset');

        this.updateBulkEstimates();
      });
    });

    // 1. Percentage Mode Controls
    const bulkScaleRange = document.getElementById('bulkScaleRange');
    const bulkScaleVal = document.getElementById('bulkScaleVal');
    if (bulkScaleRange && bulkScaleVal) {
      bulkScaleRange.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.bulkSettings.scale = val;
        bulkScaleVal.textContent = `${val}%`;
        document.querySelectorAll('.bulk-scale-pill').forEach(pill => {
          pill.classList.toggle('active', parseInt(pill.dataset.scale, 10) === val);
        });
        this.updateBulkEstimates();
      });
    }

    document.querySelectorAll('.bulk-scale-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.bulk-scale-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const val = parseInt(pill.dataset.scale, 10);
        this.bulkSettings.scale = val;
        if (bulkScaleRange) bulkScaleRange.value = val;
        if (bulkScaleVal) bulkScaleVal.textContent = `${val}%`;
        this.updateBulkEstimates();
      });
    });

    // 2. Fit Within (Max W/H) Controls
    const bulkMaxW = document.getElementById('bulkMaxW');
    const bulkMaxH = document.getElementById('bulkMaxH');
    if (bulkMaxW) {
      bulkMaxW.addEventListener('input', (e) => {
        this.bulkSettings.maxW = parseInt(e.target.value, 10) || 1920;
        this.updateBulkEstimates();
      });
    }
    if (bulkMaxH) {
      bulkMaxH.addEventListener('input', (e) => {
        this.bulkSettings.maxH = parseInt(e.target.value, 10) || 1080;
        this.updateBulkEstimates();
      });
    }

    document.querySelectorAll('.bulk-fit-preset').forEach(pill => {
      pill.addEventListener('click', () => {
        const w = parseInt(pill.dataset.w, 10);
        const h = parseInt(pill.dataset.h, 10);
        this.bulkSettings.maxW = w;
        this.bulkSettings.maxH = h;
        if (bulkMaxW) bulkMaxW.value = w;
        if (bulkMaxH) bulkMaxH.value = h;
        this.updateBulkEstimates();
      });
    });

    // 3. Exact Dimensions Controls
    const bulkExactW = document.getElementById('bulkExactW');
    const bulkExactH = document.getElementById('bulkExactH');
    const bulkFitBehavior = document.getElementById('bulkFitBehavior');
    if (bulkExactW) {
      bulkExactW.addEventListener('input', (e) => {
        this.bulkSettings.exactW = parseInt(e.target.value, 10) || 1080;
        this.updateBulkEstimates();
      });
    }
    if (bulkExactH) {
      bulkExactH.addEventListener('input', (e) => {
        this.bulkSettings.exactH = parseInt(e.target.value, 10) || 1080;
        this.updateBulkEstimates();
      });
    }
    if (bulkFitBehavior) {
      bulkFitBehavior.addEventListener('change', (e) => {
        this.bulkSettings.fitBehavior = e.target.value;
        this.updateBulkEstimates();
      });
    }

    // 4. Presets Dropdown
    const bulkPresetSelect = document.getElementById('bulkPresetSelect');
    if (bulkPresetSelect) {
      bulkPresetSelect.addEventListener('change', (e) => {
        this.bulkSettings.preset = e.target.value;
        this.updateBulkEstimates();
      });
    }

    // Format buttons (JPG, PNG, WEBP, AVIF)
    document.querySelectorAll('.bulk-fmt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.bulk-fmt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.bulkSettings.format = btn.dataset.format;
        this.updateBulkEstimates();
      });
    });

    // Quality slider
    const bulkQualityRange = document.getElementById('bulkQualityRange');
    const bulkQualityVal = document.getElementById('bulkQualityVal');
    if (bulkQualityRange && bulkQualityVal) {
      bulkQualityRange.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.bulkSettings.quality = val;
        bulkQualityVal.textContent = `${val}%`;
        this.updateBulkEstimates();
      });
    }

    // Target KB switch & input
    const bulkToggleTargetKb = document.getElementById('bulkToggleTargetKb');
    const bulkTargetKbWrap = document.getElementById('bulkTargetKbWrap');
    const bulkTargetKbInput = document.getElementById('bulkTargetKbInput');
    if (bulkToggleTargetKb && bulkTargetKbWrap) {
      bulkToggleTargetKb.addEventListener('change', (e) => {
        this.bulkSettings.targetKbEnabled = e.target.checked;
        bulkTargetKbWrap.classList.toggle('hidden', !e.target.checked);
        this.updateBulkEstimates();
      });
    }
    if (bulkTargetKbInput) {
      bulkTargetKbInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10) || 100;
        this.bulkSettings.targetKb = val;
        document.querySelectorAll('[data-bulk-kb]').forEach(b => {
          b.classList.toggle('active', parseInt(b.dataset.bulkKb, 10) === val);
        });
        this.updateBulkEstimates();
      });
    }

    document.querySelectorAll('[data-bulk-kb]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-bulk-kb]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const kb = parseInt(btn.dataset.bulkKb, 10);
        this.bulkSettings.targetKb = kb;
        if (bulkTargetKbInput) bulkTargetKbInput.value = kb;
        this.updateBulkEstimates();
      });
    });

    // Strip EXIF
    const bulkToggleStripExif = document.getElementById('bulkToggleStripExif');
    if (bulkToggleStripExif) {
      bulkToggleStripExif.addEventListener('change', (e) => {
        this.bulkSettings.stripExif = e.target.checked;
      });
    }

    // Watermark
    const bulkToggleWatermark = document.getElementById('bulkToggleWatermark');
    const bulkWatermarkWrap = document.getElementById('bulkWatermarkWrap');
    const bulkWatermarkText = document.getElementById('bulkWatermarkText');
    if (bulkToggleWatermark && bulkWatermarkWrap) {
      bulkToggleWatermark.addEventListener('change', (e) => {
        this.bulkSettings.watermarkEnabled = e.target.checked;
        bulkWatermarkWrap.classList.toggle('hidden', !e.target.checked);
      });
    }
    if (bulkWatermarkText) {
      bulkWatermarkText.addEventListener('input', (e) => {
        this.bulkSettings.watermarkText = e.target.value;
      });
    }

    // Batch Naming Scheme
    const bulkNamingPattern = document.getElementById('bulkNamingPattern');
    if (bulkNamingPattern) {
      bulkNamingPattern.addEventListener('change', (e) => {
        this.bulkSettings.namingPattern = e.target.value;
      });
    }

    // Action Buttons: Process & ZIP, Save Individually
    const btnBulkProcessZip = document.getElementById('btnBulkProcessZip');
    if (btnBulkProcessZip) {
      btnBulkProcessZip.addEventListener('click', () => this.exportAllAsZip());
    }

    const btnBulkDownloadAll = document.getElementById('btnBulkDownloadAll');
    if (btnBulkDownloadAll) {
      btnBulkDownloadAll.addEventListener('click', () => this.downloadAllIndividually());
    }
  }

  async addFiles(files) {
    const rawFiles = Array.from(files);
    const validFiles = [];

    for (let f of rawFiles) {
      const isHeic = /\.(heic|heif)$/i.test(f.name || '') || f.type === 'image/heic' || f.type === 'image/heif';
      if (isHeic) {
        if (this.app) this.app.showToast(`Converting Apple photo ${f.name} to JPEG...`, 'info');
        try {
          f = await ImageEngine.convertHeicToJpeg(f);
          if (this.app) this.app.showToast(`Converted ${f.name} to JPEG!`, 'success');
        } catch (err) {
          console.error('HEIC conversion error:', err);
          if (this.app) this.app.showToast(`Could not decode HEIC file: ${f.name}`, 'error');
          continue;
        }
      }

      const isImg = (f.type && f.type.startsWith('image/')) || /\.(jpe?g|png|webp|avif|gif|bmp|svg)$/i.test(f.name || '');
      if (isImg) validFiles.push(f);
    }

    if (validFiles.length === 0) {
      if (this.app) this.app.showToast('Please select valid image files (JPG, PNG, WebP, AVIF, HEIC, etc.)', 'warning');
      return;
    }

    if (validFiles.length > 5 && this.app) {
      this.app.showToast(`Loading ${validFiles.length} images into queue...`, 'info');
    }

    let loadedCount = 0;
    for (const file of validFiles) {
      const item = await this.loadFileIntoQueue(file);
      if (item) loadedCount++;
    }

    if (loadedCount === 0) {
      if (this.app) this.app.showToast('Could not load selected images', 'error');
      return;
    }

    this.updateUI();

    // If nothing was selected before, select first item
    if (this.activeIndex === -1 && this.items.length > 0) {
      // If user is currently in bulk mode, on bulk landing page, or imported multiple files, do NOT kick to single editor!
      const isBulkActive = (this.app && this.app.currentMode === 'bulk') || (document.body && document.body.dataset.defaultTool === 'bulk') || validFiles.length > 1;
      this.selectIndex(0, !isBulkActive);
    }
  }

  loadFileIntoQueue(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => resolve(null);
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const id = 'img_' + Math.random().toString(36).substr(2, 9);
            
            // Generate an optimized downscaled thumbnail (max 320px) to prevent multi-megabyte RAM bloat
            const thumbCanvas = document.createElement('canvas');
            const maxThumb = 320;
            const aspect = img.naturalWidth / img.naturalHeight;
            if (aspect >= 1) {
              thumbCanvas.width = Math.min(maxThumb, img.naturalWidth);
              thumbCanvas.height = Math.max(1, Math.round(thumbCanvas.width / aspect));
            } else {
              thumbCanvas.height = Math.min(maxThumb, img.naturalHeight);
              thumbCanvas.width = Math.max(1, Math.round(thumbCanvas.height * aspect));
            }
            const thumbCtx = thumbCanvas.getContext('2d');
            thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
            const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.72);
            thumbCanvas.width = 0;
            thumbCanvas.height = 0;

            const item = {
              id,
              name: file.name,
              file,
              originalCanvas: canvas,
              thumbUrl,
              size: file.size
            };

            this.items.push(item);
            resolve(item);
          } catch (err) {
            console.error('Error creating image canvas for queue:', err);
            resolve(null);
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  addCanvasItem(name, canvas, sizeBytes = 100000) {
    const thumbUrl = canvas.toDataURL('image/jpeg', 0.6);
    const item = {
      id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      name: name,
      file: null,
      originalCanvas: canvas,
      thumbUrl: thumbUrl,
      size: sizeBytes
    };
    this.items.push(item);
    this.updateUI();
    this.selectIndex(this.items.length - 1, true);
    return item;
  }

  selectIndex(index, updateEditorView = true) {
    if (index < 0 || index >= this.items.length) return;
    this.activeIndex = index;
    const item = this.items[index];

    // Tell main app to load this canvas in single editor only if requested
    if (updateEditorView && this.app) {
      this.app.loadCanvasIntoEditor(item.originalCanvas, item.name, item.size);
    } else if (this.app) {
      // Sync app references quietly without changing screen visibility
      this.app.originalCanvas = item.originalCanvas;
      this.app.currentCanvas = item.originalCanvas;
      this.app.imageName = item.name;
      this.app.originalFileSize = item.size;
      this.app.targetWidth = item.originalCanvas.width;
      this.app.targetHeight = item.originalCanvas.height;
    }

    // Update active class in filmstrip
    if (this.filmstripList) {
      const thumbs = this.filmstripList.querySelectorAll('.filmstrip-item');
      thumbs.forEach((el, idx) => {
        if (idx === index) el.classList.add('active');
        else el.classList.remove('active');
      });
    }
  }

  removeIndex(index, e) {
    if (e) e.stopPropagation();
    if (index < 0 || index >= this.items.length) return;

    const removed = this.items.splice(index, 1)[0];
    if (removed && removed.originalCanvas) {
      removed.originalCanvas.width = 0;
      removed.originalCanvas.height = 0;
    }

    if (this.items.length === 0) {
      this.activeIndex = -1;
      if (this.app && this.app.currentMode === 'single') {
        this.app.showDropzone();
      } else {
        // In bulk mode, stay in bulk mode and show the clean empty state
        this.updateUI();
      }
    } else {
      if (this.activeIndex >= this.items.length) {
        this.activeIndex = this.items.length - 1;
      }
      const isSingleMode = (this.app && this.app.currentMode === 'single');
      this.selectIndex(this.activeIndex, isSingleMode);
      this.updateUI();
    }
  }

  clearAll() {
    this.items.forEach(item => {
      if (item.originalCanvas) {
        item.originalCanvas.width = 0;
        item.originalCanvas.height = 0;
      }
    });
    this.items = [];
    this.activeIndex = -1;
    if (this.app && this.app.currentMode === 'single') {
      this.app.showDropzone();
    } else {
      this.updateUI();
    }
  }

  // Calculate output resolution and estimated file size for any item given current bulkSettings or overrides
  calculateItemOutputSpecs(item, customSettings = null) {
    const settings = customSettings || this.bulkSettings;
    const sw = Math.max(1, item && item.originalCanvas ? item.originalCanvas.width : 1);
    const sh = Math.max(1, item && item.originalCanvas ? item.originalCanvas.height : 1);
    let tw = sw;
    let th = sh;

    const mode = settings.mode;

    if (mode === 'percentage') {
      const pct = (Math.max(5, Math.min(200, parseInt(settings.scale, 10) || 50))) / 100;
      tw = Math.max(1, Math.round(sw * pct));
      th = Math.max(1, Math.round(sh * pct));
    } else if (mode === 'fit') {
      const maxW = Math.max(10, parseInt(settings.maxW, 10) || 1920);
      const maxH = Math.max(10, parseInt(settings.maxH, 10) || 1080);
      const scale = Math.min(1, maxW / sw, maxH / sh);
      tw = Math.max(1, Math.round(sw * scale));
      th = Math.max(1, Math.round(sh * scale));
    } else if (mode === 'exact') {
      tw = Math.max(10, parseInt(settings.exactW, 10) || 1080);
      th = Math.max(10, parseInt(settings.exactH, 10) || 1080);
    } else if (mode === 'preset') {
      const parts = (settings.preset || '1080x1080').split('x');
      tw = parseInt(parts[0], 10) || 1080;
      th = parseInt(parts[1], 10) || 1080;
    }

    // Estimate file size
    let estBytes = 0;
    if (settings.targetKbEnabled && settings.targetKb > 0) {
      estBytes = settings.targetKb * 1024;
    } else {
      const pixelRatio = (tw * th) / (sw * sh);
      let formatFactor = 0.8;
      if (settings.format === 'image/webp') formatFactor = 0.65;
      else if (settings.format === 'image/avif') formatFactor = 0.5;
      else if (settings.format === 'image/png') formatFactor = 1.6;

      const qualityFactor = ((parseInt(settings.quality, 10) || 85) / 100);
      estBytes = Math.round((item.size || 500000) * pixelRatio * formatFactor * qualityFactor);
      estBytes = Math.max(1024, estBytes);
    }

    return { tw, th, estBytes };
  }

  // Update top summary stats and all cards
  updateUI() {
    const count = this.items.length;

    // Badges
    if (this.batchCountBadge) this.batchCountBadge.textContent = count;
    if (this.batchZipBadge) this.batchZipBadge.textContent = count;
    const leftZip = document.getElementById('leftBatchZipCount');
    if (leftZip) leftZip.textContent = count;
    if (this.headerBulkCount) this.headerBulkCount.textContent = count;
    if (this.bulkQueueStatus) this.bulkQueueStatus.textContent = `${count} ${count === 1 ? 'Image' : 'Images'}`;

    // Summary stats
    if (this.bulkTotalImages) {
      this.bulkTotalImages.textContent = `${count} ${count === 1 ? 'image' : 'images'}`;
    }

    let totalOriginalBytes = 0;
    let totalEstBytes = 0;

    this.items.forEach(item => {
      totalOriginalBytes += item.size;
      const specs = this.calculateItemOutputSpecs(item);
      totalEstBytes += specs.estBytes;
    });

    if (this.bulkTotalOriginalSize) {
      this.bulkTotalOriginalSize.textContent = ImageEngine.formatBytes(totalOriginalBytes);
    }
    if (this.bulkTotalEstimatedSize) {
      this.bulkTotalEstimatedSize.textContent = `~${ImageEngine.formatBytes(totalEstBytes)}`;
    }

    // Render both single editor filmstrip & bulk cards grid
    this.renderFilmstrip();
    this.renderBulkGrid();
  }

  updateBulkEstimates() {
    // Recalculates stats & updates card spec lines without rebuilding DOM completely
    this.updateUI();
  }

  renderFilmstrip() {
    if (!this.filmstripList) return;
    this.filmstripList.innerHTML = '';

    this.items.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = `filmstrip-item ${idx === this.activeIndex ? 'active' : ''}`;
      div.title = `${item.name} (${ImageEngine.formatBytes(item.size)})`;

      const img = document.createElement('img');
      img.src = item.thumbUrl;

      const removeBtn = document.createElement('div');
      removeBtn.className = 'filmstrip-item-remove';
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      removeBtn.addEventListener('click', (e) => this.removeIndex(idx, e));

      div.appendChild(img);
      div.appendChild(removeBtn);

      div.addEventListener('click', () => this.selectIndex(idx));
      this.filmstripList.appendChild(div);
    });
  }

  renderBulkGrid() {
    if (!this.bulkCardsGrid) return;
    this.bulkCardsGrid.innerHTML = '';

    if (this.items.length === 0) {
      if (this.bulkEmptyState) this.bulkEmptyState.classList.remove('hidden');
      return;
    }

    if (this.bulkEmptyState) this.bulkEmptyState.classList.add('hidden');

    this.items.forEach((item, idx) => {
      const specs = this.calculateItemOutputSpecs(item);

      // Card container
      const card = document.createElement('div');
      card.className = 'bulk-card';

      // Extension / format badge text
      const ext = (item.name.split('.').pop() || 'JPG').toUpperCase();

      card.innerHTML = `
        <div class="bulk-card-thumb-wrap">
          <img src="${item.thumbUrl}" alt="${item.name}" loading="lazy">
          <span class="bulk-card-badge-format">${ext}</span>
          <div class="bulk-card-actions-overlay">
            <button type="button" class="btn-card-action" title="Open in Studio Editor" data-action="edit">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button type="button" class="btn-card-action" title="Download This Image" data-action="download-icon">
              <i class="fa-solid fa-download"></i>
            </button>
            <button type="button" class="btn-card-action danger" title="Remove" data-action="remove">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        <div class="bulk-card-body">
          <div class="bulk-card-filename" title="${item.name}">${item.name}</div>
          <div class="bulk-card-specs">
            <div class="bulk-spec-line">
              <span>Original:</span>
              <span>${item.originalCanvas.width} × ${item.originalCanvas.height} • ${ImageEngine.formatBytes(item.size)}</span>
            </div>
            <div class="bulk-spec-line highlight">
              <span>Output:</span>
              <span>${specs.tw} × ${specs.th} • ~${ImageEngine.formatBytes(specs.estBytes)}</span>
            </div>
          </div>
        </div>
        <div class="bulk-card-footer">
          <button type="button" class="btn btn-secondary btn-sm" style="flex: 1; font-size: 11px; padding: 6px 10px;" data-action="edit">
            <i class="fa-solid fa-pen-ruler"></i> Studio
          </button>
          <button type="button" class="btn btn-primary btn-sm" style="flex: 1; font-size: 11px; padding: 6px 10px;" data-action="download">
            <i class="fa-solid fa-download"></i> Save
          </button>
        </div>
      `;

      // Event delegation for card action buttons
      card.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.selectIndex(idx, true);
          this.app.switchMode('single');
        });
      });

      card.querySelectorAll('[data-action="download-icon"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
          btn.disabled = true;
          try {
            await this.processAndDownloadSingle(idx);
          } finally {
            btn.innerHTML = '<i class="fa-solid fa-download"></i>';
            btn.disabled = false;
          }
        });
      });

      card.querySelectorAll('[data-action="download"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
          btn.disabled = true;
          try {
            await this.processAndDownloadSingle(idx);
          } finally {
            btn.innerHTML = '<i class="fa-solid fa-download"></i> Save';
            btn.disabled = false;
          }
        });
      });

      card.querySelectorAll('[data-action="remove"]').forEach(btn => {
        btn.addEventListener('click', (e) => this.removeIndex(idx, e));
      });

      this.bulkCardsGrid.appendChild(card);
    });
  }

  // Process a single image canvas through bulk settings pipeline
  async processItemCanvas(item, index = 0, customSettings = null) {
    const settings = customSettings ? { ...this.bulkSettings, ...customSettings } : this.bulkSettings;
    const specs = this.calculateItemOutputSpecs(item, settings);
    const format = settings.format || 'image/jpeg';
    const isJpeg = (format === 'image/jpeg');

    // 1. Resample canvas to target dimensions
    // JPEG requires white background (no transparency). PNG/WebP preserve transparency.
    const bgColor = isJpeg ? '#ffffff' : null;

    // Use direct 'stretch' scaling for percentage and fit modes since dimensions are already calculated
    const fitMode = (settings.mode === 'percentage' || settings.mode === 'fit')
      ? 'stretch'
      : (settings.fitBehavior || 'fit');

    const resizedCanvas = ImageEngine.resampleCanvas(
      item.originalCanvas,
      specs.tw,
      specs.th,
      'bicubic',
      {
        fitMode,
        doNotEnlarge: false,
        bgColor
      }
    );

    // 2. Apply batch watermark if enabled
    if (settings.watermarkEnabled && settings.watermarkText && settings.watermarkText.trim()) {
      const ctx = resizedCanvas.getContext('2d');
      ctx.save();
      const fontSize = Math.max(14, Math.round(resizedCanvas.width * 0.032));
      ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(
        settings.watermarkText,
        resizedCanvas.width - 16,
        resizedCanvas.height - 16
      );
      ctx.restore();
    }

    // 3. Compress / Format Conversion
    let blob = null;

    if (settings.targetKbEnabled && settings.targetKb > 0) {
      const res = await ImageEngine.compressToTargetSize(resizedCanvas, settings.targetKb, format);
      blob = res.blob;
    } else {
      const quality = (settings.quality || 85) / 100;
      blob = await ImageEngine.canvasToBlob(resizedCanvas, format, quality);
    }

    // 4. JFIF DPI embedding for JPEG
    if (format === 'image/jpeg') {
      blob = await ImageEngine.embedDpiInJpegBlob(blob, settings.dpi || 300);
    }

    // 5. Build output filename
    let extension = '.jpg';
    if (format === 'image/png') extension = '.png';
    else if (format === 'image/webp') extension = '.webp';
    else if (format === 'image/avif') extension = '.avif';

    const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
    let fileName = `${baseName}_resized${extension}`;

    const pattern = settings.namingPattern || settings.batchNaming;
    if (pattern === 'name_dims') {
      fileName = `${baseName}_${specs.tw}x${specs.th}${extension}`;
    } else if (pattern === 'index_name') {
      fileName = `${String(index + 1).padStart(2, '0')}_${baseName}${extension}`;
    } else if (pattern === 'clean_name') {
      fileName = `${baseName}${extension}`;
    }

    return { blob, fileName, width: specs.tw, height: specs.th };
  }

  // Download a single card's processed result
  async processAndDownloadSingle(index, customSettings = null) {
    if (index < 0 || index >= this.items.length) return;
    const item = this.items[index];

    this.app.showToast(`Processing ${item.name}...`, 'info');
    try {
      const result = await this.processItemCanvas(item, index, customSettings);
      this.triggerDownloadBlob(result.blob, result.fileName);
      this.app.showToast(`Saved ${result.fileName}`, 'success');
    } catch (err) {
      console.error('Failed to process single item:', err);
      this.app.showToast(`Failed to process ${item.name}`, 'error');
    }
  }

  // Batch process all images and export as a ZIP archive
  async exportAllAsZip(overrides = {}) {
    if (this.items.length === 0) {
      this.app.showToast('No images in queue to export. Add images first!', 'warning');
      return;
    }

    if (this.isProcessing) return;
    this.isProcessing = true;

    const btnZip = document.getElementById('btnBulkProcessZip');
    const btnIndiv = document.getElementById('btnBulkDownloadAll');
    const btnBatch = document.getElementById('btnDownloadBatchZip');
    if (btnZip) {
      btnZip.disabled = true;
      btnZip.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing ZIP...';
    }
    if (btnBatch) {
      btnBatch.disabled = true;
      btnBatch.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Zipping...';
    }
    if (btnIndiv) btnIndiv.disabled = true;

    const mergedSettings = { ...this.bulkSettings, ...overrides };

    try {
      if (typeof JSZip === 'undefined') {
        this.app.showToast('JSZip library not loaded. Falling back to individual downloads.', 'warning');
        await this.downloadAllIndividually(mergedSettings);
        return;
      }

      // Show Progress Bar
      this.showProgress(true, 'Initializing ZIP archive...', 0);

      const zip = new JSZip();
      const folder = zip.folder('omni-bulk-resized');
      const total = this.items.length;
      let successCount = 0;

      for (let i = 0; i < total; i++) {
        const item = this.items[i];
        const percent = Math.round((i / total) * 90);
        this.updateProgress(`Processing ${i + 1} of ${total}: ${item.name}`, percent);

        // Allow UI tick
        await new Promise(r => setTimeout(r, 20));

        try {
          const processed = await this.processItemCanvas(item, i, mergedSettings);
          folder.file(processed.fileName, processed.blob);
          successCount++;
        } catch (err) {
          console.error(`Failed to process item ${item.name}:`, err);
        }
      }

      if (successCount === 0) {
        throw new Error('Failed to process any images in the batch');
      }

      this.updateProgress('Compressing ZIP archive...', 95);
      await new Promise(r => setTimeout(r, 50));

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      this.updateProgress('Complete!', 100);

      // Download ZIP
      const zipName = `omni_bulk_resized_${Date.now()}.zip`;
      this.triggerDownloadBlob(zipBlob, zipName);

      setTimeout(() => {
        this.showProgress(false);
        this.app.showToast(`Successfully exported ${successCount} images to ${zipName}!`, 'success');
      }, 800);
    } catch (err) {
      console.error('Batch ZIP export error:', err);
      this.app.showToast('Error generating ZIP archive. Please try saving individually.', 'error');
      this.showProgress(false);
    } finally {
      this.isProcessing = false;
      if (btnZip) {
        btnZip.disabled = false;
        btnZip.innerHTML = '<i class="fa-solid fa-file-zipper"></i> Process & Download ZIP';
      }
      if (btnBatch) {
        btnBatch.disabled = false;
        btnBatch.innerHTML = `<i class="fa-solid fa-file-zipper"></i> Download All as ZIP (<span id="batchZipCount">${this.items.length}</span>)`;
        this.batchZipBadge = document.getElementById('batchZipCount');
      }
      if (btnIndiv) btnIndiv.disabled = false;
    }
  }

  // Download all images individually with sequential spacing
  async downloadAllIndividually(overrides = {}) {
    if (this.items.length === 0) {
      this.app.showToast('No images in queue to export', 'warning');
      return;
    }

    if (this.isProcessing) return;
    this.isProcessing = true;

    const btnZip = document.getElementById('btnBulkProcessZip');
    const btnIndiv = document.getElementById('btnBulkDownloadAll');
    const btnBatch = document.getElementById('btnDownloadBatchZip');
    if (btnIndiv) {
      btnIndiv.disabled = true;
      btnIndiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving files...';
    }
    if (btnZip) btnZip.disabled = true;
    if (btnBatch) btnBatch.disabled = true;

    const mergedSettings = { ...this.bulkSettings, ...overrides };

    try {
      const total = this.items.length;
      this.showProgress(true, `Saving ${total} files individually...`, 0);

      for (let i = 0; i < total; i++) {
        const item = this.items[i];
        const percent = Math.round(((i + 1) / total) * 100);
        this.updateProgress(`Saving ${i + 1}/${total}: ${item.name}`, percent);

        try {
          const processed = await this.processItemCanvas(item, i, mergedSettings);
          this.triggerDownloadBlob(processed.blob, processed.fileName);
        } catch (err) {
          console.error(`Failed to download ${item.name}:`, err);
        }

        // Delay so browser doesn't block rapid downloads
        await new Promise(r => setTimeout(r, 350));
      }

      setTimeout(() => {
        this.showProgress(false);
        this.app.showToast(`Saved all ${total} images!`, 'success');
      }, 600);
    } catch (err) {
      console.error('Individual download error:', err);
      this.app.showToast('Error during individual image downloads', 'error');
      this.showProgress(false);
    } finally {
      this.isProcessing = false;
      if (btnIndiv) {
        btnIndiv.disabled = false;
        btnIndiv.innerHTML = '<i class="fa-solid fa-download"></i> Save Images Individually';
      }
      if (btnZip) btnZip.disabled = false;
      if (btnBatch) btnBatch.disabled = false;
    }
  }

  showProgress(show, text = '', percent = 0) {
    if (this.bulkProgressWrap) this.bulkProgressWrap.classList.toggle('hidden', !show);
    if (this.bulkProgressStatus) this.bulkProgressStatus.classList.toggle('hidden', !show);
    if (show) {
      this.updateProgress(text, percent);
    }
  }

  updateProgress(text, percent) {
    if (this.bulkProgressLabel) this.bulkProgressLabel.textContent = text;
    if (this.bulkProgressPercent) this.bulkProgressPercent.textContent = `${percent}%`;
    if (this.bulkProgressBar) this.bulkProgressBar.style.width = `${percent}%`;
  }

  triggerDownloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BatchQueueManager };
}
