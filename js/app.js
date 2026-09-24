/**
 * OmniResize Studio - Main Application Controller
 */

class OmniResizeApp {
  constructor() {
    this.originalCanvas = null;
    this.currentCanvas = null;
    this.imageName = 'image.jpg';
    this.originalFileSize = 0;

    // Zoom & Pan state
    this.zoom = 1;
    this.isComparing = false;
    this.compareSplit = 0.5;

    // Transformation state
    this.rotationAngle = 0; // Total rotation: -90, 90, 180...
    this.fineStraighten = 0; // -45 to 45
    this.flipH = false;
    this.flipV = false;

    // Adjustments
    this.adjustments = {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      warmth: 0,
      blur: 0,
      filter: 'none'
    };

    // Resize state
    this.resizeMode = 'dimensions'; // 'dimensions', 'percentage', 'presets'
    this.unit = 'px';
    this.dpi = 300;
    this.lockAspect = false;
    this.targetWidth = 1920;
    this.targetHeight = 1080;
    this.scalePercentage = 100;
    this.interpolation = 'bicubic';

    // Watermark state
    this.watermark = {
      enabled: false,
      type: 'text',
      text: '© OmniResize Studio',
      fontSize: 32,
      color: '#ffffff',
      opacity: 60,
      anchor: 'br',
      imageElement: null,
      imageScale: 20
    };

    // Frame & Fit state
    this.frameSettings = {
      aspectRatio: 'original',
      padStyle: 'blur',
      solidColor: '#0f172a',
      padding: 0,
      cornerRadius: 0,
      borderWidth: 0,
      borderColor: '#ffffff',
      isPolaroid: false,
      polaroidCaption: 'Summer Vibes ✨',
      hasShadow: false,
      shadowBlur: 25
    };

    // Magic Studio state
    this.magicSettings = {
      chromaColor: '#ffffff',
      chromaTolerance: 25,
      chromaFeather: 2,
      isEyedropperActive: false,
      memeEnabled: false,
      topText: '',
      bottomText: '',
      fontSize: 48
    };

    // Export settings
    this.exportFormat = 'image/jpeg';
    this.exportQuality = 0.85;
    this.targetFileSizeKB = null; // null = default / auto
    this.bgFill = 'transparent';
    this.customBgColor = '#ffffff';
    this.stripExif = true;
    this.batchNaming = 'name_resized';

    // Resize fit options
    this.fitMode = 'stretch'; // 'stretch', 'fit', 'fill'
    this.doNotEnlarge = false;

    // Censor tool state
    this.censorSettings = {
      type: 'pixelate',
      intensity: 16
    };

    // Sub-modules
    this.cropper = null;
    this.batchManager = null;

    // Mode state
    this.currentMode = (document.body && document.body.dataset.defaultTool === 'bulk') ? 'bulk' : 'single';

    this.initDOM();
    this.initSubmodules();
    this.initEvents();
    this.populatePresets();
    this.checkInitialRoute();
    this.initHistoryNavigation();
  }

  initDOM() {
    // Screens
    this.dropzoneScreen = document.getElementById('dropzoneScreen');
    this.editorScreen = document.getElementById('editorScreen');
    this.bulkScreen = document.getElementById('bulkScreen');
    this.dropArea = document.getElementById('dropArea');
    this.fileInput = document.getElementById('fileInput');

    // Header Mode Switches
    this.btnModeSingle = document.getElementById('btnModeSingle');
    this.btnModeBulk = document.getElementById('btnModeBulk');

    // Canvas
    this.mainCanvas = document.getElementById('mainCanvas');
    this.canvasWrapper = document.getElementById('canvasWrapper');
    this.canvasStage = document.getElementById('canvasStage');
    this.zoomLevelLabel = document.getElementById('zoomLevel');

    // Stats Badges
    this.originalStatsBadge = document.getElementById('canvasOriginalStats');
    this.processedStatsBadge = document.getElementById('canvasProcessedStats');

    // Split Compare
    this.compareContainer = document.getElementById('compareContainer');
    this.compareCanvas = document.getElementById('compareCanvas');
    this.compareSliderBar = document.getElementById('compareSliderBar');
    this.compareAfterWrapper = this.compareContainer.querySelector('.compare-after-wrapper');

    // Dedicated Tool Landing View Elements
    this.toolLandingScreen = document.getElementById('toolLandingScreen');
    this.btnBackFromTool = document.getElementById('btnBackFromTool');
    this.toolFileInput = document.getElementById('toolFileInput');
    this.btnToolUploadAction = document.getElementById('btnToolUploadAction');
    this.toolDropzoneCard = document.getElementById('toolDropzoneCard');
    this.toolHeroIcon = document.getElementById('toolHeroIcon');
    this.toolHeroTitle = document.getElementById('toolHeroTitle');
    this.toolHeroDesc = document.getElementById('toolHeroDesc');
    this.toolUploadBtnText = document.getElementById('toolUploadBtnText');
    this.toolStep2Text = document.getElementById('toolStep2Text');
    this.pendingToolAction = null;
    this.pendingToolDataset = {};

    // Dedicated Download & Result Screen Elements
    this.downloadScreen = document.getElementById('downloadScreen');
    this.downloadPreviewCanvas = document.getElementById('downloadPreviewCanvas');
    this.btnHeroDownload = document.getElementById('btnHeroDownload');
    this.btnHeroCopy = document.getElementById('btnHeroCopy');
    this.btnBackToEditor = document.getElementById('btnBackToEditor');
    this.btnBackToEditorTop = document.getElementById('btnBackToEditorTop');
    this.btnDownloadNewImage = document.getElementById('btnDownloadNewImage');
    this.btnDownloadNewImageTop = document.getElementById('btnDownloadNewImageTop');
    this.downloadScreenFilename = document.getElementById('downloadScreenFilename');
    this.downloadScreenExt = document.getElementById('downloadScreenExt');
    this.heroDownloadSubtext = document.getElementById('heroDownloadSubtext');
    this.dlResText = document.getElementById('dlResText');
    this.dlSizeText = document.getElementById('dlSizeText');
    this.dlSavingsText = document.getElementById('dlSavingsText');
    this.dlBadgeSavings = document.getElementById('dlBadgeSavings');
  }

  initSubmodules() {
    this.cropper = new ImageCropper();
    this.batchManager = new BatchQueueManager(this);
  }

  initEvents() {
    // Prevent accidental browser navigation when dragging images anywhere on window
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());

    // Header Mode Switchers
    if (this.btnModeSingle) {
      this.btnModeSingle.addEventListener('click', () => this.switchMode('single'));
    }
    if (this.btnModeBulk) {
      this.btnModeBulk.addEventListener('click', () => this.switchMode('bulk'));
    }

    // Dropzone & Drag-drop
    this.dropArea.addEventListener('click', (e) => {
      if (e.target.closest('.sample-chip') || e.target.closest('label[for="fileInput"]')) return;
      this.fileInput.value = '';
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const fileList = Array.from(e.target.files);
        const wasInBulk = (this.currentMode === 'bulk' || (document.body && document.body.dataset.defaultTool === 'bulk'));
        await this.batchManager.addFiles(fileList);
        if (wasInBulk || fileList.length > 1) {
          this.switchMode('bulk');
          this.showToast(`Imported ${fileList.length} image${fileList.length > 1 ? 's' : ''} into Bulk Resizer`, 'success');
        } else {
          this.switchMode('single');
        }
        this.fileInput.value = '';
      }
    });

    ['dragenter', 'dragover'].forEach(name => {
      this.dropArea.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropArea.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      this.dropArea.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropArea.classList.remove('drag-over');
      });
    });

    this.dropArea.addEventListener('drop', async (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const fileList = Array.from(e.dataTransfer.files);
        const wasInBulk = (this.currentMode === 'bulk' || (document.body && document.body.dataset.defaultTool === 'bulk'));
        await this.batchManager.addFiles(fileList);
        if (wasInBulk || fileList.length > 1) {
          this.switchMode('bulk');
          this.showToast(`Imported ${fileList.length} image${fileList.length > 1 ? 's' : ''} into Bulk Resizer`, 'success');
        } else {
          this.switchMode('single');
        }
      }
    });

    // Clipboard Paste (Ctrl + V)
    window.addEventListener('paste', (e) => {
      if (!e.clipboardData || !e.clipboardData.items) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          this.batchManager.addFiles([blob]);
          this.showToast('Pasted image from clipboard!', 'success');
          break;
        }
      }
    });

    // Sample Images
    document.querySelectorAll('.sample-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.dataset.sample;
        this.loadSampleImage(type);
      });
    });

    // Dedicated Tool Landing View Events
    if (this.btnBackFromTool) {
      this.btnBackFromTool.addEventListener('click', () => {
        const p = window.location.pathname;
        const isIndex = p === '/' || p === '' || p.endsWith('/index.html') || p.endsWith('index.html');
        if (!isIndex) {
          window.location.href = '/';
        } else {
          this.showDropzone();
        }
      });
    }

    const headerBrand = document.querySelector('.header-brand');
    if (headerBrand) {
      headerBrand.style.cursor = 'pointer';
      headerBrand.addEventListener('click', () => {
        const p = window.location.pathname;
        const isIndex = p === '/' || p === '' || p.endsWith('/index.html') || p.endsWith('index.html');
        if (!isIndex) {
          window.location.href = '/';
        } else {
          this.showDropzone();
        }
      });
    }

    if (this.btnToolUploadAction) {
      this.btnToolUploadAction.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toolFileInput.click();
      });
    }

    if (this.toolDropzoneCard) {
      this.toolDropzoneCard.addEventListener('click', (e) => {
        if (e.target.closest('.sample-chip')) return;
        this.toolFileInput.click();
      });

      ['dragenter', 'dragover'].forEach(name => {
        this.toolDropzoneCard.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toolDropzoneCard.classList.add('drag-over');
        });
      });

      ['dragleave', 'drop'].forEach(name => {
        this.toolDropzoneCard.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toolDropzoneCard.classList.remove('drag-over');
        });
      });

      this.toolDropzoneCard.addEventListener('drop', async (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const files = Array.from(e.dataTransfer.files);
          await this.batchManager.addFiles(files);
          if (this.pendingToolAction) {
            this.executePendingToolAction();
          }
        }
      });
    }

    if (this.toolFileInput) {
      this.toolFileInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files.length > 0) {
          const files = Array.from(e.target.files);
          await this.batchManager.addFiles(files);
          this.toolFileInput.value = '';
          if (this.pendingToolAction) {
            this.executePendingToolAction();
          }
        }
      });
    }

    // Tool landing sample chips
    if (this.toolLandingScreen) {
      this.toolLandingScreen.querySelectorAll('.sample-chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const type = btn.dataset.sample;
          this.loadSampleImage(type);
          if (this.pendingToolAction) {
            this.executePendingToolAction();
          }
        });
      });
    }

    // Header actions
    document.getElementById('btnNewImage').addEventListener('click', () => this.fileInput.click());
    document.getElementById('btnUndo').addEventListener('click', () => this.resetAllAdjustments());
    document.getElementById('btnToggleCompare').addEventListener('click', () => this.toggleCompare());
    document.getElementById('btnExportTop').addEventListener('click', () => this.downloadSingleImage());

    // Zoom
    document.getElementById('btnZoomIn').addEventListener('click', () => this.setZoom(this.zoom + 0.2));
    document.getElementById('btnZoomOut').addEventListener('click', () => this.setZoom(this.zoom - 0.2));
    document.getElementById('btnZoomFit').addEventListener('click', () => this.fitToScreen());

    // Window resize / orientation change auto-fit
    let resizeDebounce = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(() => {
        if (this.currentCanvas && document.body.classList.contains('in-editor')) {
          this.fitToScreen();
        }
      }, 150);
    });

    // Compare split drag
    this.initCompareDrag();

    // Tabs switching
    document.querySelectorAll('.tab-btn').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const panelId = `panel-${tab.dataset.tab}`;
        const panel = document.getElementById(panelId);
        if (panel) panel.classList.add('active');

        // Toggle crop overlay based on active tab
        if (tab.dataset.tab === 'crop') {
          this.cropper.show();
        } else {
          this.cropper.hide();
        }
      });
    });

    // Resize controls
    this.initResizeControls();

    // Crop controls
    this.initCropControls();

    // Compress controls
    this.initCompressControls();

    // Adjust & Filter controls
    this.initAdjustControls();

    // Frame & Fit controls
    this.initFrameControls();

    // Magic Studio controls
    this.initMagicControls();

    // Watermark controls
    this.initWatermarkControls();

    // Export controls
    this.initExportControls();

    // Download result screen controls
    this.initDownloadScreen();

    // Nav dropdowns, Mega Footer, and Collage maker
    this.initNavAndFooter();

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        this.fileInput.click();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.downloadSingleImage();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.resetAllAdjustments();
      }
    });
  }

  // Load a canvas into editor view
  loadCanvasIntoEditor(canvas, name = 'image.jpg', originalBytes = 0, skipScreenSwitch = false) {
    this.originalCanvas = canvas;
    this.currentCanvas = canvas;
    this.imageName = name;
    this.originalFileSize = originalBytes || Math.round((canvas.width * canvas.height * 4) * 0.25);

    // Set initial dimensions
    this.targetWidth = canvas.width;
    this.targetHeight = canvas.height;
    const inputW = document.getElementById('inputWidth');
    const inputH = document.getElementById('inputHeight');
    if (inputW) inputW.value = this.targetWidth;
    if (inputH) inputH.value = this.targetHeight;

    // Filename input
    const baseName = name.substring(0, name.lastIndexOf('.')) || name;
    const exportFn = document.getElementById('exportFilename');
    if (exportFn) exportFn.value = `${baseName}_resized`;
    const leftFilenameInput = document.getElementById('leftExportFilename');
    if (leftFilenameInput) leftFilenameInput.value = `${baseName}_resized`;

    if (!skipScreenSwitch) {
      // Switch view
      this.dropzoneScreen.classList.add('hidden');
      if (this.toolLandingScreen) this.toolLandingScreen.classList.add('hidden');
      if (this.bulkScreen) this.bulkScreen.classList.add('hidden');
      if (this.downloadScreen) this.downloadScreen.classList.add('hidden');
      this.editorScreen.classList.remove('hidden');
      if (this.btnModeSingle) this.btnModeSingle.classList.add('active');
      if (this.btnModeBulk) this.btnModeBulk.classList.remove('active');
      const undoBtn = document.getElementById('btnUndo');
      if (undoBtn) undoBtn.removeAttribute('disabled');
      this.updateHeaderActionVisibility(true);

      // Push history state for editor if entering editor
      if (window.location.hash !== '#editor' && window.location.hash !== '#download') {
        window.history.pushState({ screen: 'editor' }, '', '#editor');
      }

      // On mobile/tablet screens, collapse the left export panel and single-item queue by default to keep the canvas 100% visible
      if (window.innerWidth <= 900) {
        const canvasLeftExport = document.getElementById('canvasLeftExport');
        const leftExportBody = document.getElementById('leftExportBody');
        const leftMinimizedPill = document.getElementById('leftMinimizedPill');
        const iconCollapseLeft = document.getElementById('iconCollapseLeft');
        if (canvasLeftExport && leftExportBody && leftMinimizedPill) {
          canvasLeftExport.classList.add('collapsed');
          leftExportBody.classList.add('hidden');
          leftMinimizedPill.classList.remove('hidden');
          if (iconCollapseLeft) iconCollapseLeft.className = 'fa-solid fa-chevron-right';
        }

        const batchFilmstrip = document.getElementById('batchFilmstrip');
        const canvasViewport = document.getElementById('canvasViewport');
        const iconToggleFilmstrip = document.getElementById('iconToggleFilmstrip');
        if (batchFilmstrip && (!window.batchManager || !window.batchManager.images || window.batchManager.images.length <= 1)) {
          batchFilmstrip.classList.add('collapsed');
          if (canvasViewport) canvasViewport.classList.add('queue-collapsed');
          if (iconToggleFilmstrip) iconToggleFilmstrip.className = 'fa-solid fa-chevron-up';
        }
      }

      // Render onto main canvas
      this.renderCurrent();
      this.fitToScreen();
      requestAnimationFrame(() => this.fitToScreen());
      this.updateStats();

      // If a tool was selected before uploading, execute it now!
      if (this.pendingToolAction) {
        this.executePendingToolAction();
      }
    }
  }

  showDropzone() {
    document.body.classList.remove('in-editor');
    document.body.classList.remove('in-bulk');
    this.dropzoneScreen.classList.remove('hidden');
    if (this.toolLandingScreen) this.toolLandingScreen.classList.add('hidden');
    this.editorScreen.classList.add('hidden');
    if (this.bulkScreen) this.bulkScreen.classList.add('hidden');
    if (this.downloadScreen) this.downloadScreen.classList.add('hidden');
    if (this.btnModeSingle) this.btnModeSingle.classList.add('active');
    if (this.btnModeBulk) this.btnModeBulk.classList.remove('active');
    document.getElementById('btnUndo')?.setAttribute('disabled', 'true');
    this.updateHeaderActionVisibility(false);
    if (window.location.hash === '#editor' || window.location.hash === '#download') {
      window.history.replaceState({ screen: 'home' }, '', window.location.pathname + window.location.search);
    }
  }

  // Switch between Studio Single Editor and Bulk Resizer Dashboard
  switchMode(mode) {
    this.currentMode = mode;

    if (mode === 'bulk') {
      document.body.classList.add('in-bulk');
      document.body.classList.remove('in-editor');
      if (this.btnModeSingle) this.btnModeSingle.classList.remove('active');
      if (this.btnModeBulk) this.btnModeBulk.classList.add('active');
      this.dropzoneScreen.classList.add('hidden');
      if (this.toolLandingScreen) this.toolLandingScreen.classList.add('hidden');
      this.editorScreen.classList.add('hidden');
      if (this.downloadScreen) this.downloadScreen.classList.add('hidden');
      if (this.bulkScreen) this.bulkScreen.classList.remove('hidden');
      this.updateHeaderActionVisibility(false);
      if (this.batchManager) this.batchManager.updateUI();
    } else {
      document.body.classList.remove('in-bulk');
      if (this.btnModeSingle) this.btnModeSingle.classList.add('active');
      if (this.btnModeBulk) this.btnModeBulk.classList.remove('active');
      if (this.bulkScreen) this.bulkScreen.classList.add('hidden');
      if (this.downloadScreen) this.downloadScreen.classList.add('hidden');

      if (this.currentCanvas) {
        document.body.classList.add('in-editor');
        this.editorScreen.classList.remove('hidden');
        this.dropzoneScreen.classList.add('hidden');
        if (this.toolLandingScreen) this.toolLandingScreen.classList.add('hidden');
        this.updateHeaderActionVisibility(true);
        this.fitToScreen();
        requestAnimationFrame(() => this.fitToScreen());
      } else {
        document.body.classList.remove('in-editor');
        this.dropzoneScreen.classList.remove('hidden');
        if (this.toolLandingScreen) this.toolLandingScreen.classList.add('hidden');
        this.editorScreen.classList.add('hidden');
        this.updateHeaderActionVisibility(false);
      }
    }
  }

  // ==========================================
  // Download / Result Screen
  // ==========================================
  async showDownloadScreen(pushHistory = true) {
    if (!this.mainCanvas || !this.downloadScreen) return;

    // Push history state so browser Back button or mobile swipe returns to editor instead of leaving site
    if (pushHistory && window.location.hash !== '#download') {
      window.history.pushState({ screen: 'download' }, '', '#download');
    }

    // Hide all other screens
    this.dropzoneScreen.classList.add('hidden');
    if (this.toolLandingScreen) this.toolLandingScreen.classList.add('hidden');
    this.editorScreen.classList.add('hidden');
    if (this.bulkScreen) this.bulkScreen.classList.add('hidden');
    this.downloadScreen.classList.remove('hidden');
    document.body.classList.remove('in-editor');
    this.updateHeaderActionVisibility(false);

    // Scroll to top for mobile users
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Draw preview onto the download preview canvas
    const previewCanvas = this.downloadPreviewCanvas;
    if (previewCanvas) {
      previewCanvas.width = this.mainCanvas.width;
      previewCanvas.height = this.mainCanvas.height;
      const ctx = previewCanvas.getContext('2d');
      ctx.drawImage(this.mainCanvas, 0, 0);
    }

    // Determine current format extension
    let ext = '.jpg';
    let formatLabel = 'JPG';
    if (this.exportFormat === 'image/png') { ext = '.png'; formatLabel = 'PNG'; }
    else if (this.exportFormat === 'image/webp') { ext = '.webp'; formatLabel = 'WebP'; }
    else if (this.exportFormat === 'image/avif') { ext = '.avif'; formatLabel = 'AVIF'; }
    else if (this.exportFormat === 'application/pdf') { ext = '.pdf'; formatLabel = 'PDF'; }

    // Update filename
    const baseName = (document.getElementById('exportFilename')?.value?.trim()) || 'resized-image';
    if (this.downloadScreenFilename) this.downloadScreenFilename.value = baseName;
    if (this.downloadScreenExt) this.downloadScreenExt.textContent = ext;

    // Update format pills active state
    const pillContainer = document.getElementById('downloadFormatPills');
    if (pillContainer) {
      pillContainer.querySelectorAll('.format-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.format === this.exportFormat);
      });
    }

    // Calculate actual file size
    try {
      let blob;
      if (this.targetFileSizeKB && this.targetFileSizeKB > 0) {
        const res = await ImageEngine.compressToTargetSize(this.mainCanvas, this.targetFileSizeKB, this.exportFormat);
        blob = res.blob;
      } else {
        blob = await ImageEngine.canvasToBlob(this.mainCanvas, this.exportFormat, this.exportQuality);
      }
      const sizeKB = (blob.size / 1024).toFixed(1);
      const sizeLabel = blob.size >= 1024 * 1024
        ? `${(blob.size / (1024 * 1024)).toFixed(1)} MB`
        : `${sizeKB} KB`;

      // Update resolution text
      if (this.dlResText) this.dlResText.textContent = `${this.mainCanvas.width} × ${this.mainCanvas.height} px`;

      // Update file size text
      if (this.dlSizeText) this.dlSizeText.textContent = `~${sizeLabel}`;

      // Update hero download subtext
      if (this.heroDownloadSubtext) this.heroDownloadSubtext.textContent = `${formatLabel} • ~${sizeLabel}`;

      // Calculate savings vs original
      if (this.originalFileSize && this.originalFileSize > 0) {
        const savings = ((1 - blob.size / this.originalFileSize) * 100).toFixed(0);
        if (this.dlSavingsText) {
          if (savings > 0) {
            this.dlSavingsText.textContent = `${savings}% smaller`;
          } else if (savings < 0) {
            this.dlSavingsText.textContent = `${Math.abs(savings)}% larger`;
          } else {
            this.dlSavingsText.textContent = 'Same size';
          }
        }
      } else {
        if (this.dlSavingsText) this.dlSavingsText.textContent = 'Ready to Save';
      }
    } catch (e) {
      console.warn('Download screen stat calculation failed:', e);
      if (this.dlResText) this.dlResText.textContent = `${this.mainCanvas.width} × ${this.mainCanvas.height} px`;
      if (this.dlSizeText) this.dlSizeText.textContent = 'Calculating...';
      if (this.heroDownloadSubtext) this.heroDownloadSubtext.textContent = `${formatLabel}`;
    }
  }

  initDownloadScreen() {
    if (!this.downloadScreen) return;

    // Hero Download Button
    if (this.btnHeroDownload) {
      this.btnHeroDownload.addEventListener('click', async () => {
        const baseName = this.downloadScreenFilename?.value?.trim() || 'resized-image';
        const extText = this.downloadScreenExt?.textContent || '.jpg';
        const filename = `${baseName}${extText}`;

        try {
          if (this.exportFormat === 'application/pdf') {
            const pdfBlob = await ImageEngine.generatePDFBlob(this.mainCanvas);
            this.triggerDownloadBlob(pdfBlob, filename);
          } else if (this.targetFileSizeKB && this.targetFileSizeKB > 0) {
            const res = await ImageEngine.compressToTargetSize(this.mainCanvas, this.targetFileSizeKB, this.exportFormat);
            let blob = res.blob;
            if (this.exportFormat === 'image/jpeg') {
              blob = await ImageEngine.embedDpiInJpegBlob(blob, this.dpi);
            }
            this.triggerDownloadBlob(blob, filename);
          } else {
            let blob = await ImageEngine.canvasToBlob(this.mainCanvas, this.exportFormat, this.exportQuality);
            if (this.exportFormat === 'image/jpeg') {
              blob = await ImageEngine.embedDpiInJpegBlob(blob, this.dpi);
            }
            this.triggerDownloadBlob(blob, filename);
          }

          // Brief visual feedback on the button
          const origHTML = this.btnHeroDownload.innerHTML;
          this.btnHeroDownload.innerHTML = '<i class="fa-solid fa-check"></i> <div class="btn-hero-text"><span class="hero-primary-text">Downloaded!</span><span class="hero-sub-text">Check your downloads folder</span></div>';
          this.btnHeroDownload.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
          setTimeout(() => {
            this.btnHeroDownload.innerHTML = origHTML;
            this.btnHeroDownload.style.background = '';
          }, 2500);
        } catch (err) {
          console.error('Download failed:', err);
          this.showToast('Download failed. Please try again.', 'error');
        }
      });
    }

    // Copy to Clipboard
    if (this.btnHeroCopy) {
      this.btnHeroCopy.addEventListener('click', async () => {
        try {
          this.mainCanvas.toBlob(async (blob) => {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              const origText = this.btnHeroCopy.innerHTML;
              this.btnHeroCopy.innerHTML = '<i class="fa-solid fa-check"></i> Copied to Clipboard!';
              setTimeout(() => { this.btnHeroCopy.innerHTML = origText; }, 2000);
            } catch (err) {
              this.showToast('Clipboard access was blocked or denied', 'warning');
            }
          }, 'image/png');
        } catch (err) {
          this.showToast('Could not copy image to clipboard', 'error');
        }
      });
    }

    // Format Pills
    const pillContainer = document.getElementById('downloadFormatPills');
    if (pillContainer) {
      pillContainer.querySelectorAll('.format-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          pillContainer.querySelectorAll('.format-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.exportFormat = pill.dataset.format;

          // Update extension label
          let ext = '.jpg';
          if (this.exportFormat === 'image/png') ext = '.png';
          else if (this.exportFormat === 'image/webp') ext = '.webp';
          else if (this.exportFormat === 'image/avif') ext = '.avif';
          else if (this.exportFormat === 'application/pdf') ext = '.pdf';
          if (this.downloadScreenExt) this.downloadScreenExt.textContent = ext;

          // Sync with editor's format selector too
          const editorFormatSelect = document.getElementById('selectFormat');
          if (editorFormatSelect) editorFormatSelect.value = this.exportFormat;

          // Recalculate file size display without pushing history again
          this.showDownloadScreen(false);
        });
      });
    }

    // Back to Editor (Both top bar and bottom card buttons)
    const onBackToEditor = () => this.handleBackToEditor();
    if (this.btnBackToEditor) {
      this.btnBackToEditor.addEventListener('click', onBackToEditor);
    }
    if (this.btnBackToEditorTop) {
      this.btnBackToEditorTop.addEventListener('click', onBackToEditor);
    }

    // New Image (Both top bar and bottom card buttons)
    const onDownloadNewImage = () => this.handleDownloadNewImage();
    if (this.btnDownloadNewImage) {
      this.btnDownloadNewImage.addEventListener('click', onDownloadNewImage);
    }
    if (this.btnDownloadNewImageTop) {
      this.btnDownloadNewImageTop.addEventListener('click', onDownloadNewImage);
    }
  }

  handleBackToEditor() {
    this.returnToEditor();
    if (window.location.hash === '#download') {
      window.history.back();
    }
  }

  returnToEditor() {
    if (!this.currentCanvas && !this.mainCanvas) {
      this.showDropzone();
      return;
    }
    if (this.downloadScreen) this.downloadScreen.classList.add('hidden');
    if (this.dropzoneScreen) this.dropzoneScreen.classList.add('hidden');
    if (this.toolLandingScreen) this.toolLandingScreen.classList.add('hidden');
    if (this.bulkScreen) this.bulkScreen.classList.add('hidden');
    if (this.editorScreen) this.editorScreen.classList.remove('hidden');
    document.body.classList.add('in-editor');
    document.body.classList.remove('in-bulk');
    this.updateHeaderActionVisibility(true);
    this.fitToScreen();
    requestAnimationFrame(() => this.fitToScreen());
  }

  handleDownloadNewImage() {
    this.currentCanvas = null;
    this.originalCanvas = null;
    if (window.location.hash) {
      window.history.replaceState({ screen: 'home' }, '', window.location.pathname + window.location.search);
    }
    this.showDropzone();
  }

  initHistoryNavigation() {
    // Ensure baseline history state exists
    if (!window.history.state) {
      window.history.replaceState({ screen: 'home' }, '', window.location.pathname + window.location.search);
    }

    // Clean up stale hashes on initial load if no image is loaded
    if (!this.currentCanvas && (window.location.hash === '#download' || window.location.hash === '#editor')) {
      window.history.replaceState({ screen: 'home' }, '', window.location.pathname + window.location.search);
    }

    const handleHistoryChange = (e) => {
      const hash = window.location.hash;
      const state = e ? e.state : null;

      // 1. If currently on download screen and user presses Back button / swipe gesture:
      // Smoothly return user to editor without leaving site!
      if (this.downloadScreen && !this.downloadScreen.classList.contains('hidden')) {
        this.returnToEditor();
        return;
      }

      // 2. If navigating to #download
      if (hash === '#download' || state?.screen === 'download') {
        if (this.currentCanvas) {
          this.showDownloadScreen(false);
        } else {
          this.showDropzone();
        }
        return;
      }

      // 3. If navigating to #editor
      if (hash === '#editor' || state?.screen === 'editor') {
        if (this.currentCanvas) {
          this.returnToEditor();
        } else {
          this.showDropzone();
        }
        return;
      }

      // 4. Popped to home/dropzone (no hash)
      if (!hash || hash === '#' || state?.screen === 'home') {
        if (this.downloadScreen && !this.downloadScreen.classList.contains('hidden')) {
          this.returnToEditor();
        } else if (this.editorScreen && !this.editorScreen.classList.contains('hidden')) {
          this.showDropzone();
        }
      }
    };

    window.addEventListener('popstate', handleHistoryChange);
    window.addEventListener('hashchange', handleHistoryChange);
  }

  // Render pipeline: currentCanvas -> transformed -> filters -> watermark -> mainCanvas
  async renderCurrent() {
    if (!this.currentCanvas) return;

    // 1. Transform: Rotate + Flip + Straighten
    const totalAngle = this.rotationAngle + this.fineStraighten;
    const transformed = ImageEngine.transformCanvas(
      this.currentCanvas,
      totalAngle,
      this.flipH,
      this.flipV
    );

    // 2. Resize
    const resized = ImageEngine.resampleCanvas(
      transformed,
      this.targetWidth,
      this.targetHeight,
      this.interpolation,
      {
        fitMode: this.fitMode,
        doNotEnlarge: this.doNotEnlarge,
        bgColor: this.bgFill === 'transparent' ? null : (this.bgFill === 'white' ? '#ffffff' : (this.bgFill === 'black' ? '#000000' : this.customBgColor))
      }
    );

    // 3. Fill Background
    const bgFilled = ImageEngine.applyBackgroundFill(
      resized,
      this.bgFill,
      this.customBgColor
    );

    // 4. Adjustments & Filters to a staging canvas
    const stagedCanvas = document.createElement('canvas');
    stagedCanvas.width = bgFilled.width;
    stagedCanvas.height = bgFilled.height;
    const sCtx = stagedCanvas.getContext('2d');

    const filterString = FiltersEngine.applyAdjustments(
      sCtx,
      bgFilled.width,
      bgFilled.height,
      this.adjustments
    );

    sCtx.save();
    if (filterString !== 'none') {
      sCtx.filter = filterString;
    }
    sCtx.drawImage(bgFilled, 0, 0);
    sCtx.restore();

    // 5. Apply Frame & Fit (Padding, blurred background, rounded corners, polaroid, borders, shadow)
    const framedCanvas = FiltersEngine.applyFrameAndPadding(stagedCanvas, this.frameSettings);

    // 6. Draw onto Main Viewport Canvas
    this.mainCanvas.width = framedCanvas.width;
    this.mainCanvas.height = framedCanvas.height;
    const ctx = this.mainCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    ctx.drawImage(framedCanvas, 0, 0);

    // 7. Meme Text Overlay
    if (this.magicSettings.memeEnabled) {
      FiltersEngine.drawMemeText(
        ctx,
        this.mainCanvas.width,
        this.mainCanvas.height,
        {
          enabled: true,
          topText: this.magicSettings.topText,
          bottomText: this.magicSettings.bottomText,
          fontSize: this.magicSettings.fontSize
        }
      );
    }

    // 8. Watermark
    FiltersEngine.drawWatermark(
      ctx,
      this.mainCanvas.width,
      this.mainCanvas.height,
      this.watermark
    );

    // If compare split is active, update compare canvas
    if (this.isComparing) {
      this.updateCompareCanvas();
    }

    this.updateStats();
    this.setZoom(this.zoom);
    if (this.cropper && !this.cropper.overlay.classList.contains('hidden')) {
      this.cropper.updateBoxFromCropData();
    }
  }

  // Pure canvas processor for batch export
  async renderProcessedCanvas(sourceCanvas) {
    const totalAngle = this.rotationAngle + this.fineStraighten;
    const transformed = ImageEngine.transformCanvas(
      sourceCanvas,
      totalAngle,
      this.flipH,
      this.flipV
    );

    let targetW = this.targetWidth;
    let targetH = this.targetHeight;

    if (this.resizeMode === 'percentage') {
      targetW = Math.round(transformed.width * (this.scalePercentage / 100));
      targetH = Math.round(transformed.height * (this.scalePercentage / 100));
    }

    const resized = ImageEngine.resampleCanvas(
      transformed,
      targetW,
      targetH,
      this.interpolation,
      {
        fitMode: this.fitMode,
        doNotEnlarge: this.doNotEnlarge,
        bgColor: this.bgFill === 'transparent' ? null : (this.bgFill === 'white' ? '#ffffff' : (this.bgFill === 'black' ? '#000000' : this.customBgColor))
      }
    );
    const bgFilled = ImageEngine.applyBackgroundFill(resized, this.bgFill, this.customBgColor);

    const stagedCanvas = document.createElement('canvas');
    stagedCanvas.width = bgFilled.width;
    stagedCanvas.height = bgFilled.height;
    const sCtx = stagedCanvas.getContext('2d');

    const filterString = FiltersEngine.applyAdjustments(
      sCtx,
      bgFilled.width,
      bgFilled.height,
      this.adjustments
    );

    sCtx.save();
    if (filterString !== 'none') {
      sCtx.filter = filterString;
    }
    sCtx.drawImage(bgFilled, 0, 0);
    sCtx.restore();

    const framedCanvas = FiltersEngine.applyFrameAndPadding(stagedCanvas, this.frameSettings);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = framedCanvas.width;
    outCanvas.height = framedCanvas.height;
    const ctx = outCanvas.getContext('2d');
    ctx.drawImage(framedCanvas, 0, 0);

    if (this.magicSettings.memeEnabled) {
      FiltersEngine.drawMemeText(ctx, outCanvas.width, outCanvas.height, {
        enabled: true,
        topText: this.magicSettings.topText,
        bottomText: this.magicSettings.bottomText,
        fontSize: this.magicSettings.fontSize
      });
    }

    FiltersEngine.drawWatermark(ctx, outCanvas.width, outCanvas.height, this.watermark);

    return outCanvas;
  }

  // Update original and processed dimension & size badges
  async updateStats() {
    if (!this.originalCanvas || !this.mainCanvas) return;

    this.originalStatsBadge.textContent = `${this.originalCanvas.width} × ${this.originalCanvas.height} px • ${ImageEngine.formatBytes(this.originalFileSize)}`;
    document.getElementById('statOriginalSize').textContent = ImageEngine.formatBytes(this.originalFileSize);

    // Fast estimation of processed file size
    const blob = await ImageEngine.canvasToBlob(this.mainCanvas, this.exportFormat, this.exportQuality);
    const processedBytes = blob.size;

    this.processedStatsBadge.textContent = `${this.mainCanvas.width} × ${this.mainCanvas.height} px • ${ImageEngine.formatBytes(processedBytes)}`;
    document.getElementById('statEstimatedSize').textContent = ImageEngine.formatBytes(processedBytes);

    const footerEstSize = document.getElementById('footerEstSize');
    if (footerEstSize) {
      footerEstSize.textContent = `~${ImageEngine.formatBytes(processedBytes)}`;
    }
    const leftEst = document.getElementById('leftEstSize');
    if (leftEst) leftEst.textContent = `~${ImageEngine.formatBytes(processedBytes)}`;
    const leftPill = document.getElementById('leftPillEst');
    if (leftPill) leftPill.textContent = `~${ImageEngine.formatBytes(processedBytes)}`;

    if (this.targetFileSizeKB && this.targetFileSizeKB > 0) {
      if (leftEst) leftEst.textContent = `< ${this.targetFileSizeKB} KB`;
      if (leftPill) leftPill.textContent = `< ${this.targetFileSizeKB} KB`;
      this.processedStatsBadge.textContent = `${this.mainCanvas.width} × ${this.mainCanvas.height} px • Max: < ${this.targetFileSizeKB} KB`;
    }

    const savings = Math.round(((this.originalFileSize - processedBytes) / this.originalFileSize) * 100);
    const savingsBadge = document.getElementById('statSavingsBadge');
    if (savings > 0) {
      savingsBadge.textContent = `${savings}% Saved`;
      savingsBadge.className = 'badge-savings text-success';
    } else {
      savingsBadge.textContent = `${Math.abs(savings)}% Larger`;
      savingsBadge.className = 'badge-savings text-danger';
    }

    // EXIF & Image Inspector details
    const w = this.mainCanvas.width;
    const h = this.mainCanvas.height;
    const mp = ((w * h) / 1000000).toFixed(2);
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const div = gcd(w, h) || 1;
    const aspectW = Math.round(w / div);
    const aspectH = Math.round(h / div);
    const aspectStr = (aspectW > 50 || aspectH > 50) ? `${(w / h).toFixed(2)} : 1` : `${aspectW} : ${aspectH} (${(w / h).toFixed(2)})`;

    const dimsEl = document.getElementById('statInspectorDims');
    if (dimsEl) dimsEl.textContent = `${w} × ${h} px`;
    const mpEl = document.getElementById('statInspectorMp');
    if (mpEl) mpEl.textContent = `${mp} Megapixels`;
    const aspectEl = document.getElementById('statInspectorAspect');
    if (aspectEl) aspectEl.textContent = aspectStr;
    const dpiEl = document.getElementById('statInspectorDpi');
    if (dpiEl) dpiEl.textContent = `${this.dpi} DPI (Print standard)`;
  }

  // ==========================================
  // Resize Controls
  // ==========================================
  initResizeControls() {
    const inputW = document.getElementById('inputWidth');
    const inputH = document.getElementById('inputHeight');
    const btnLock = document.getElementById('btnLockAspect');

    btnLock.addEventListener('click', () => {
      this.lockAspect = !this.lockAspect;
      btnLock.classList.toggle('active', this.lockAspect);
      const icon = btnLock.querySelector('i');
      if (icon) {
        icon.className = this.lockAspect ? 'fa-solid fa-lock' : 'fa-solid fa-lock-open';
      }
      btnLock.title = this.lockAspect ? 'Maintain Aspect Ratio (Locked)' : 'Maintain Aspect Ratio (Unlocked)';
      this.showToast(this.lockAspect ? 'Aspect ratio locked' : 'Aspect ratio unlocked', 'info');
    });

    inputW.addEventListener('input', () => {
      const val = parseInt(inputW.value, 10);
      if (isNaN(val) || val <= 0) return;
      this.targetWidth = val;
      if (this.lockAspect && this.currentCanvas) {
        const aspect = this.currentCanvas.height / this.currentCanvas.width;
        this.targetHeight = Math.round(val * aspect);
        inputH.value = this.targetHeight;
      }
    });

    inputH.addEventListener('input', () => {
      const val = parseInt(inputH.value, 10);
      if (isNaN(val) || val <= 0) return;
      this.targetHeight = val;
      if (this.lockAspect && this.currentCanvas) {
        const aspect = this.currentCanvas.width / this.currentCanvas.height;
        this.targetWidth = Math.round(val * aspect);
        inputW.value = this.targetWidth;
      }
    });

    document.getElementById('btnApplyResize').addEventListener('click', async () => {
      this.renderCurrent();
      if (this.targetFileSizeKB && this.targetFileSizeKB > 0) {
        await this.applyTargetSizeCompression(this.targetFileSizeKB);
      }
      this.showDownloadScreen();
    });

    // Resize Mode Buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.resizeMode = btn.dataset.resizeMode;

        document.getElementById('submode-dimensions').classList.toggle('hidden', this.resizeMode !== 'dimensions');
        document.getElementById('submode-percentage').classList.toggle('hidden', this.resizeMode !== 'percentage');
        document.getElementById('submode-presets').classList.toggle('hidden', this.resizeMode !== 'presets');
      });
    });


    // Target / Maximum File Size Controls (Right Sidebar - Always Enabled)
    const inputTargetSize = document.getElementById('inputTargetFileSize');
    const selectTargetUnit = document.getElementById('selectTargetFileUnit');
    const affixTargetUnit = document.getElementById('targetFileUnitAffix');

    const updateTargetKbFromInput = () => {
      if (!inputTargetSize) return;
      const val = parseFloat(inputTargetSize.value);
      const unit = selectTargetUnit ? selectTargetUnit.value : 'kb';
      if (!isNaN(val) && val > 0) {
        this.targetFileSizeKB = unit === 'mb' ? Math.round(val * 1024) : Math.round(val);
        document.querySelectorAll('.target-size-chips button[data-target-kb]').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.targetKb === String(val) && unit === 'kb');
        });
      } else {
        this.targetFileSizeKB = null;
        document.querySelectorAll('.target-size-chips button[data-target-kb]').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.targetKb === 'default');
        });
      }
      this.updateStats();
    };

    if (inputTargetSize) {
      inputTargetSize.addEventListener('input', updateTargetKbFromInput);
    }

    if (selectTargetUnit && affixTargetUnit) {
      selectTargetUnit.addEventListener('change', (e) => {
        affixTargetUnit.textContent = e.target.value.toUpperCase();
        updateTargetKbFromInput();
      });
    }

    document.querySelectorAll('.target-size-chips button[data-target-kb]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.target-size-chips button[data-target-kb]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const kbVal = btn.dataset.targetKb;
        if (kbVal === 'default') {
          this.targetFileSizeKB = null;
          if (inputTargetSize) inputTargetSize.value = '';
        } else {
          const kb = parseInt(kbVal, 10);
          this.targetFileSizeKB = kb;
          if (inputTargetSize) inputTargetSize.value = kb;
          if (selectTargetUnit) selectTargetUnit.value = 'kb';
          if (affixTargetUnit) affixTargetUnit.textContent = 'KB';
        }
        this.updateStats();
      });
    });

    // Units (px, %, in, cm, mm)
    document.querySelectorAll('#unitSelector .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#unitSelector .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setMeasurementUnit(btn.dataset.unit);
      });
    });

    // DPI Selector
    document.getElementById('selectDpi').addEventListener('change', (e) => {
      this.dpi = parseInt(e.target.value, 10);
      this.setMeasurementUnit(this.unit);
    });

    // Percentage scale slider
    const rangePercent = document.getElementById('rangePercentage');
    const scalePill = document.getElementById('scaleValuePill');
    rangePercent.addEventListener('input', (e) => {
      const pct = parseInt(e.target.value, 10);
      this.scalePercentage = pct;
      scalePill.textContent = `${pct}%`;
      if (this.currentCanvas) {
        this.targetWidth = Math.round(this.currentCanvas.width * (pct / 100));
        this.targetHeight = Math.round(this.currentCanvas.height * (pct / 100));
        inputW.value = this.targetWidth;
        inputH.value = this.targetHeight;
      }
    });

    document.querySelectorAll('.pill-chip[data-scale]').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.pill-chip[data-scale]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const scale = parseInt(chip.dataset.scale, 10);
        rangePercent.value = scale;
        rangePercent.dispatchEvent(new Event('input'));
      });
    });


    // Do not enlarge if original is smaller
    const toggleEnlarge = document.getElementById('toggleDoNotEnlarge');
    if (toggleEnlarge) {
      toggleEnlarge.addEventListener('change', (e) => {
        this.doNotEnlarge = e.target.checked;
        this.renderCurrent();
        this.showToast(this.doNotEnlarge ? 'Do not enlarge enabled' : 'Do not enlarge disabled', 'info');
      });
    }

    // Quick AI / Super-Resolution Upscaling (2x, 4x)
    const btnUp2 = document.getElementById('btnUpscale2x');
    if (btnUp2) {
      btnUp2.addEventListener('click', () => {
        if (!this.currentCanvas) return;
        this.showToast('Upscaling 2× with Super-Resolution Sharpening...', 'info');
        const upscaled = ImageEngine.upscaleImage(this.currentCanvas, 2);
        this.currentCanvas = upscaled;
        this.targetWidth = upscaled.width;
        this.targetHeight = upscaled.height;
        document.getElementById('inputWidth').value = this.targetWidth;
        document.getElementById('inputHeight').value = this.targetHeight;
        this.renderCurrent();
        this.fitToScreen();
        this.showToast(`Upscaled 2× to ${this.targetWidth} × ${this.targetHeight} px!`, 'success');
      });
    }

    const btnUp4 = document.getElementById('btnUpscale4x');
    if (btnUp4) {
      btnUp4.addEventListener('click', () => {
        if (!this.currentCanvas) return;
        this.showToast('Upscaling 4× Ultra HD with Edge Sharpener...', 'info');
        const upscaled = ImageEngine.upscaleImage(this.currentCanvas, 4);
        this.currentCanvas = upscaled;
        this.targetWidth = upscaled.width;
        this.targetHeight = upscaled.height;
        document.getElementById('inputWidth').value = this.targetWidth;
        document.getElementById('inputHeight').value = this.targetHeight;
        this.renderCurrent();
        this.fitToScreen();
        this.showToast(`Upscaled 4× to ${this.targetWidth} × ${this.targetHeight} px!`, 'success');
      });
    }
  }

  setMeasurementUnit(unit) {
    this.unit = unit;
    const dpiContainer = document.getElementById('dpiContainer');
    const affixW = document.getElementById('unitAffixW');
    const affixH = document.getElementById('unitAffixH');

    affixW.textContent = unit;
    affixH.textContent = unit;

    const isPhysical = (unit === 'in' || unit === 'cm' || unit === 'mm');
    dpiContainer.classList.toggle('hidden', !isPhysical);

    // Convert pixel inputs to chosen unit for display
    const inputW = document.getElementById('inputWidth');
    const inputH = document.getElementById('inputHeight');

    if (unit === 'px') {
      inputW.value = this.targetWidth;
      inputH.value = this.targetHeight;
    } else if (unit === 'in') {
      inputW.value = (this.targetWidth / this.dpi).toFixed(2);
      inputH.value = (this.targetHeight / this.dpi).toFixed(2);
    } else if (unit === 'cm') {
      inputW.value = ((this.targetWidth / this.dpi) * 2.54).toFixed(2);
      inputH.value = ((this.targetHeight / this.dpi) * 2.54).toFixed(2);
    } else if (unit === 'mm') {
      inputW.value = ((this.targetWidth / this.dpi) * 25.4).toFixed(1);
      inputH.value = ((this.targetHeight / this.dpi) * 25.4).toFixed(1);
    }
  }

  // Populate presets grid
  populatePresets() {
    const grid = document.getElementById('presetsGrid');
    if (!grid) return;

    const renderCategory = (category = 'all') => {
      grid.innerHTML = '';
      const filtered = category === 'all' ? PRESETS : PRESETS.filter(p => p.category === category);

      filtered.forEach(preset => {
        const card = document.createElement('div');
        card.className = 'preset-card';
        card.innerHTML = `
          <span class="preset-card-title">${preset.name}</span>
          <span class="preset-card-dims">${preset.width} × ${preset.height} px</span>
          <span class="preset-card-tag">${preset.platform} • ${preset.ratio}</span>
        `;
        card.addEventListener('click', () => {
          this.targetWidth = preset.width;
          this.targetHeight = preset.height;
          document.getElementById('inputWidth').value = preset.width;
          document.getElementById('inputHeight').value = preset.height;
          this.renderCurrent();
          this.showToast(`Applied preset: ${preset.name} (${preset.width}x${preset.height})`, 'success');
        });
        grid.appendChild(card);
      });
    };

    renderCategory('all');

    document.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCategory(btn.dataset.cat);
      });
    });
  }

  // ==========================================
  // Crop Controls
  // ==========================================
  initCropControls() {
    document.querySelectorAll('.ratio-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.cropper.setAspectRatio(btn.dataset.ratio);
      });
    });

    document.getElementById('toggleRuleOfThirds').addEventListener('change', (e) => {
      this.cropper.toggleGrid(e.target.checked);
    });

    document.getElementById('btnConfirmCrop').addEventListener('click', () => {
      const croppedCanvas = this.cropper.getCroppedCanvas();
      this.currentCanvas = croppedCanvas;
      this.targetWidth = croppedCanvas.width;
      this.targetHeight = croppedCanvas.height;
      document.getElementById('inputWidth').value = this.targetWidth;
      document.getElementById('inputHeight').value = this.targetHeight;
      this.renderCurrent();
      this.cropper.hide();

      // Switch to resize tab
      document.querySelector('.tab-btn[data-tab="resize"]').click();
      this.showToast('Image cropped successfully!', 'success');
    });

    document.getElementById('btnResetCrop').addEventListener('click', () => {
      this.cropper.setAspectRatio('free');
      this.cropper.cropData = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
      this.cropper.updateBoxFromCropData();
    });
  }

  // ==========================================
  // Compression & Target KB
  // ==========================================
  initCompressControls() {
    const qualityRange = document.getElementById('rangeQuality');
    const qualityPill = document.getElementById('qualityValuePill');

    qualityRange.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.exportQuality = val / 100;
      qualityPill.textContent = `${val}%`;
      this.updateStats();
    });

    // Preset Target KB / MB Chips
    document.querySelectorAll('.chip-btn[data-target-kb]').forEach(btn => {
      btn.addEventListener('click', () => {
        const kb = parseInt(btn.dataset.targetKb, 10);
        const input = document.getElementById('inputCustomTargetSize');
        const unitSelect = document.getElementById('targetSizeUnitSelect');
        if (kb >= 1024 && kb % 1024 === 0) {
          if (input) input.value = kb / 1024;
          if (unitSelect) unitSelect.value = 'mb';
        } else {
          if (input) input.value = kb;
          if (unitSelect) unitSelect.value = 'kb';
        }
        this.applyTargetSizeCompression(kb);
      });
    });

    document.getElementById('btnApplyTargetSize').addEventListener('click', () => {
      const input = document.getElementById('inputCustomTargetSize');
      const unitSelect = document.getElementById('targetSizeUnitSelect');
      const unit = unitSelect ? unitSelect.value : 'kb';
      const val = parseFloat(input ? input.value : 0);

      if (isNaN(val) || val <= 0) {
        this.showToast('Please enter a valid target file size', 'warning');
        return;
      }

      const kb = unit === 'mb' ? Math.round(val * 1024) : Math.round(val);
      this.applyTargetSizeCompression(kb);
    });
  }

  async applyTargetSizeCompression(targetKB) {
    const result = await ImageEngine.compressToTargetSize(
      this.mainCanvas,
      targetKB,
      this.exportFormat
    );

    this.exportQuality = result.quality;
    document.getElementById('rangeQuality').value = Math.round(result.quality * 100);
    document.getElementById('qualityValuePill').textContent = `${Math.round(result.quality * 100)}%`;

    if (result.canvas !== this.mainCanvas) {
      this.currentCanvas = result.canvas;
      this.targetWidth = result.canvas.width;
      this.targetHeight = result.canvas.height;
      document.getElementById('inputWidth').value = this.targetWidth;
      document.getElementById('inputHeight').value = this.targetHeight;
      this.renderCurrent();
    } else {
      this.updateStats();
    }
  }

  // ==========================================
  // Adjustments & Filters
  // ==========================================
  initAdjustControls() {
    // Rotation 90° CW / CCW
    document.getElementById('btnRotateLeft').addEventListener('click', () => {
      this.rotationAngle = (this.rotationAngle - 90) % 360;
      this.renderCurrent();
    });

    document.getElementById('btnRotateRight').addEventListener('click', () => {
      this.rotationAngle = (this.rotationAngle + 90) % 360;
      this.renderCurrent();
    });

    // Flips
    document.getElementById('btnFlipH').addEventListener('click', () => {
      this.flipH = !this.flipH;
      this.renderCurrent();
    });

    document.getElementById('btnFlipV').addEventListener('click', () => {
      this.flipV = !this.flipV;
      this.renderCurrent();
    });

    // Straighten angle
    const rangeStraighten = document.getElementById('rangeStraighten');
    const straightenPill = document.getElementById('straightenValuePill');
    rangeStraighten.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.fineStraighten = val;
      straightenPill.textContent = `${val}°`;
      this.renderCurrent();
    });

    // Sliders
    const bindSlider = (id, labelId, prop, unit = '%') => {
      const range = document.getElementById(id);
      const label = document.getElementById(labelId);
      range.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.adjustments[prop] = val;
        label.textContent = `${val}${unit}`;
        this.renderCurrent();
      });
    };

    bindSlider('rangeBrightness', 'valBrightness', 'brightness', '%');
    bindSlider('rangeContrast', 'valContrast', 'contrast', '%');
    bindSlider('rangeSaturation', 'valSaturation', 'saturation', '%');
    bindSlider('rangeWarmth', 'valWarmth', 'warmth', '%');
    bindSlider('rangeBlur', 'valBlur', 'blur', 'px');

    // Preset filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.adjustments.filter = chip.dataset.filter;
        this.renderCurrent();
      });
    });

    document.getElementById('btnResetAdjustments').addEventListener('click', () => {
      this.resetAdjustmentsOnly();
    });
  }

  resetAdjustmentsOnly() {
    this.adjustments = {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      warmth: 0,
      blur: 0,
      filter: 'none'
    };

    document.getElementById('rangeBrightness').value = 100;
    document.getElementById('valBrightness').textContent = '100%';
    document.getElementById('rangeContrast').value = 100;
    document.getElementById('valContrast').textContent = '100%';
    document.getElementById('rangeSaturation').value = 100;
    document.getElementById('valSaturation').textContent = '100%';
    document.getElementById('rangeWarmth').value = 0;
    document.getElementById('valWarmth').textContent = '0%';
    document.getElementById('rangeBlur').value = 0;
    document.getElementById('valBlur').textContent = '0px';

    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.filter-chip[data-filter="none"]').classList.add('active');

    this.renderCurrent();
    this.showToast('Color adjustments reset', 'info');
  }

  resetAllAdjustments() {
    if (!this.originalCanvas) return;
    this.currentCanvas = this.originalCanvas;
    this.rotationAngle = 0;
    this.fineStraighten = 0;
    this.flipH = false;
    this.flipV = false;
    document.getElementById('rangeStraighten').value = 0;
    document.getElementById('straightenValuePill').textContent = '0°';

    this.targetWidth = this.originalCanvas.width;
    this.targetHeight = this.originalCanvas.height;
    document.getElementById('inputWidth').value = this.targetWidth;
    document.getElementById('inputHeight').value = this.targetHeight;

    this.resetAdjustmentsOnly();
    this.renderCurrent();
    this.fitToScreen();
    this.showToast('Reset to original image', 'info');
  }

  // ==========================================
  // Watermark Controls
  // ==========================================
  initWatermarkControls() {
    const toggle = document.getElementById('toggleWatermark');
    const container = document.getElementById('watermarkControlsContainer');
    if (!toggle || !container) return;
    toggle.addEventListener('change', (e) => {
      this.watermark.enabled = e.target.checked;
      container.classList.toggle('disabled-overlay', !this.watermark.enabled);
      this.renderCurrent();
    });

    // Type text vs image
    document.querySelectorAll('#wmTypeSelector .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#wmTypeSelector .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.watermark.type = btn.dataset.wmType;

        document.getElementById('wmTextOptions').classList.toggle('hidden', this.watermark.type !== 'text');
        document.getElementById('wmImageOptions').classList.toggle('hidden', this.watermark.type !== 'image');
        this.renderCurrent();
      });
    });

    document.getElementById('wmTextInput').addEventListener('input', (e) => {
      this.watermark.text = e.target.value;
      this.renderCurrent();
    });

    document.getElementById('wmFontSize').addEventListener('input', (e) => {
      this.watermark.fontSize = parseInt(e.target.value, 10) || 32;
      this.renderCurrent();
    });

    document.getElementById('wmColor').addEventListener('input', (e) => {
      this.watermark.color = e.target.value;
      this.renderCurrent();
    });

    // Watermark image logo upload
    document.getElementById('wmFileInput').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (re) => {
          const img = new Image();
          img.onload = () => {
            this.watermark.imageElement = img;
            this.renderCurrent();
          };
          img.src = re.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    document.getElementById('wmLogoScale').addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.watermark.imageScale = val;
      document.getElementById('wmLogoScaleVal').textContent = `${val}%`;
      this.renderCurrent();
    });

    document.getElementById('wmOpacity').addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.watermark.opacity = val;
      document.getElementById('wmOpacityVal').textContent = `${val}%`;
      this.renderCurrent();
    });

    // 9-point anchor grid
    document.querySelectorAll('#wmAnchorGrid .anchor-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        document.querySelectorAll('#wmAnchorGrid .anchor-tile').forEach(t => t.classList.remove('active'));
        tile.classList.add('active');
        this.watermark.anchor = tile.dataset.anchor;
        this.renderCurrent();
      });
    });
  }

  // ==========================================
  // Export Controls
  // ==========================================
  initExportControls() {
    // Format selector
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.exportFormat = btn.dataset.format;

        let ext = '.jpg';
        if (this.exportFormat === 'image/png') ext = '.png';
        else if (this.exportFormat === 'image/webp') ext = '.webp';
        else if (this.exportFormat === 'image/avif') ext = '.avif';
        else if (this.exportFormat === 'application/pdf') ext = '.pdf';

        document.getElementById('exportExtLabel').textContent = ext;
        this.updateStats();
      });
    });

    // Background fill radio buttons
    document.querySelectorAll('input[name="bgFill"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.bgFill = e.target.value;
        const customColorPicker = document.getElementById('customBgColor');
        customColorPicker.classList.toggle('hidden', this.bgFill !== 'custom');
        this.renderCurrent();
      });
    });

    document.getElementById('customBgColor').addEventListener('input', (e) => {
      this.customBgColor = e.target.value;
      this.renderCurrent();
    });

    // Batch Naming pattern selector
    const selectBatchNaming = document.getElementById('selectBatchNaming');
    if (selectBatchNaming) {
      selectBatchNaming.addEventListener('change', (e) => {
        this.batchNaming = e.target.value;
      });
    }

    // Strip EXIF switch
    const toggleStripExif = document.getElementById('toggleStripExif');
    if (toggleStripExif) {
      toggleStripExif.addEventListener('change', (e) => {
        this.stripExif = e.target.checked;
        this.showToast(this.stripExif ? 'EXIF & GPS metadata will be stripped' : 'Preserving available metadata', 'info');
      });
    }



    // Download Single
    const btnDownload = document.getElementById('btnDownloadSingle');
    if (btnDownload) {
      btnDownload.addEventListener('click', () => this.downloadSingleImage());
    }

    // Copy to Clipboard
    const btnCopy = document.getElementById('btnCopyClipboard');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => this.copyImageToClipboard());
    }

    // Download Batch ZIP
    const btnBatch = document.getElementById('btnDownloadBatchZip');
    if (btnBatch) {
      btnBatch.addEventListener('click', () => {
        this.batchManager.exportAllAsZip({
          format: this.exportFormat,
          quality: this.exportQuality * 100,
          batchNaming: this.batchNaming,
          dpi: this.dpi,
          targetKbEnabled: !!(this.targetFileSizeKB && this.targetFileSizeKB > 0),
          targetKb: this.targetFileSizeKB || 0
        });
      });
    }

    // Toggle Advanced Export Drawer
    const btnToggleAdvanced = document.getElementById('btnToggleExportAdvanced');
    const advancedDrawer = document.getElementById('exportAdvancedDrawer');
    const iconAdvanced = document.getElementById('iconExportAdvanced');
    if (btnToggleAdvanced && advancedDrawer) {
      btnToggleAdvanced.addEventListener('click', () => {
        const isHidden = advancedDrawer.classList.toggle('hidden');
        if (iconAdvanced) {
          iconAdvanced.className = isHidden ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
        }
      });
    }

    // Inspector quick extract button
    const btnInspectPalette = document.getElementById('btnInspectorExtractPalette');
    if (btnInspectPalette) {
      btnInspectPalette.addEventListener('click', () => this.extractAndDisplayPalette());
    }

    // Collapse / Expand Left Export Station
    const btnToggleCollapseLeft = document.getElementById('btnToggleCollapseLeft');
    const canvasLeftExport = document.getElementById('canvasLeftExport');
    const leftExportBody = document.getElementById('leftExportBody');
    const leftMinimizedPill = document.getElementById('leftMinimizedPill');
    const iconCollapseLeft = document.getElementById('iconCollapseLeft');

    if (btnToggleCollapseLeft && canvasLeftExport && leftExportBody && leftMinimizedPill) {
      const toggleCollapse = (forceState) => {
        const shouldCollapse = typeof forceState === 'boolean' ? forceState : !canvasLeftExport.classList.contains('collapsed');
        if (shouldCollapse) {
          canvasLeftExport.classList.add('collapsed');
          leftExportBody.classList.add('hidden');
          leftMinimizedPill.classList.remove('hidden');
          if (iconCollapseLeft) iconCollapseLeft.className = 'fa-solid fa-chevron-right';
        } else {
          canvasLeftExport.classList.remove('collapsed');
          leftExportBody.classList.remove('hidden');
          leftMinimizedPill.classList.add('hidden');
          if (iconCollapseLeft) {
            iconCollapseLeft.className = window.innerWidth <= 900 ? 'fa-solid fa-xmark' : 'fa-solid fa-chevron-left';
          }
        }
      };

      btnToggleCollapseLeft.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCollapse();
      });
      leftMinimizedPill.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCollapse(false);
      });

      // Dismiss mobile export bottom sheet when clicking outside
      document.addEventListener('click', (e) => {
        if (window.innerWidth <= 900 && !canvasLeftExport.classList.contains('collapsed')) {
          if (!canvasLeftExport.contains(e.target) && !leftMinimizedPill.contains(e.target)) {
            toggleCollapse(true);
          }
        }
      });
    }
  }

  async copyImageToClipboard() {
    if (!this.mainCanvas) return;
    if (!navigator.clipboard || !window.ClipboardItem) {
      this.showToast('Clipboard copying is not supported in this browser', 'warning');
      return;
    }

    try {
      this.showToast('Copying image to clipboard...', 'info');
      this.mainCanvas.toBlob(async (blob) => {
        if (!blob) {
          this.showToast('Failed to generate image for clipboard', 'error');
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          this.showToast('Copied to clipboard! Ready to paste (Ctrl+V)', 'success');
        } catch (err) {
          console.warn('Clipboard write failed:', err);
          this.showToast('Clipboard access was blocked or denied', 'warning');
        }
      }, 'image/png');
    } catch (err) {
      console.error('Clipboard copy error:', err);
      this.showToast('Could not copy image to clipboard', 'error');
    }
  }

  async downloadSingleImage() {
    if (!this.mainCanvas) return;

    const baseName = document.getElementById('exportFilename').value.trim() || 'resized-image';
    let ext = '.jpg';
    if (this.exportFormat === 'image/png') ext = '.png';
    else if (this.exportFormat === 'image/webp') ext = '.webp';
    else if (this.exportFormat === 'image/avif') ext = '.avif';
    else if (this.exportFormat === 'application/pdf') ext = '.pdf';

    const filename = `${baseName}${ext}`;

    if (this.exportFormat === 'application/pdf') {
      const pdfBlob = await ImageEngine.generatePDFBlob(this.mainCanvas);
      this.triggerDownloadBlob(pdfBlob, filename);
      this.showToast(`Downloaded: ${filename}`, 'success');
    } else if (this.targetFileSizeKB && this.targetFileSizeKB > 0) {
      this.showToast(`Optimizing to target < ${this.targetFileSizeKB} KB...`, 'info');
      const res = await ImageEngine.compressToTargetSize(this.mainCanvas, this.targetFileSizeKB, this.exportFormat);
      let blob = res.blob;
      if (this.exportFormat === 'image/jpeg') {
        blob = await ImageEngine.embedDpiInJpegBlob(blob, this.dpi);
      }
      this.triggerDownloadBlob(blob, filename);
      const actualKb = Math.round(blob.size / 1024);
      this.showToast(`Downloaded: ${filename} (${actualKb} KB - Target < ${this.targetFileSizeKB} KB)`, 'success');
    } else {
      let blob = await ImageEngine.canvasToBlob(this.mainCanvas, this.exportFormat, this.exportQuality);
      if (this.exportFormat === 'image/jpeg') {
        blob = await ImageEngine.embedDpiInJpegBlob(blob, this.dpi);
      }
      this.triggerDownloadBlob(blob, filename);
      this.showToast(`Downloaded: ${filename}`, 'success');
    }
  }

  setTargetFileSize(kb) {
    this.targetFileSizeKB = kb;
    const input = document.getElementById('inputTargetFileSize');
    if (input) input.value = kb;
    document.querySelectorAll('.target-size-chips button[data-target-kb]').forEach(b => {
      b.classList.toggle('active', b.dataset.targetKb === String(kb));
    });
    this.updateStats();
  }

  triggerDownloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ==========================================
  // Zoom & Viewport
  // ==========================================
  setZoom(zoomVal) {
    this.zoom = Math.max(0.05, Math.min(5, zoomVal));
    if (this.zoomLevelLabel) {
      this.zoomLevelLabel.textContent = `${Math.round(this.zoom * 100)}%`;
    }
    if (this.mainCanvas && this.canvasWrapper) {
      const dispW = Math.round(this.mainCanvas.width * this.zoom);
      const dispH = Math.round(this.mainCanvas.height * this.zoom);
      this.canvasWrapper.style.width = `${dispW}px`;
      this.canvasWrapper.style.height = `${dispH}px`;
      this.canvasWrapper.style.transform = 'none';
    }
  }

  fitToScreen() {
    if (!this.mainCanvas || !this.canvasStage) return;

    const isMobile = window.innerWidth <= 900;
    const stageWidth = this.canvasStage.clientWidth;
    const stageHeight = this.canvasStage.clientHeight;

    if (stageWidth <= 0 || stageHeight <= 0) {
      requestAnimationFrame(() => this.fitToScreen());
      return;
    }

    // Smart margin deduction based on device form factor
    const horizMargin = isMobile ? 20 : 64;
    const vertMargin = isMobile ? 88 : 96;

    const availWidth = Math.max(80, stageWidth - horizMargin);
    const availHeight = Math.max(80, stageHeight - vertMargin);

    const scaleW = availWidth / this.mainCanvas.width;
    const scaleH = availHeight / this.mainCanvas.height;
    let fitScale = Math.min(scaleW, scaleH);

    // On mobile, if photo is smaller (passport photos, icons, stamps),
    // scale up to 2.5x to comfortably fill the viewport so it never appears tiny.
    // On desktop, allow up to 1.5x.
    const maxUpscale = isMobile ? 2.5 : 1.5;
    fitScale = Math.min(fitScale, maxUpscale);
    fitScale = Math.max(0.05, Math.min(5, fitScale));

    this.setZoom(fitScale);
  }

  // ==========================================
  // Split Comparison Slider
  // ==========================================
  toggleCompare() {
    this.isComparing = !this.isComparing;
    const btn = document.getElementById('btnToggleCompare');
    btn.classList.toggle('active', this.isComparing);
    this.compareContainer.classList.toggle('hidden', !this.isComparing);

    if (this.isComparing) {
      this.updateCompareCanvas();
      this.setCompareSplit(0.5);
      this.showToast('Split comparison mode enabled', 'info');
    }
  }

  updateCompareCanvas() {
    if (!this.originalCanvas || !this.mainCanvas || !this.compareCanvas) return;
    this.compareCanvas.width = this.mainCanvas.width;
    this.compareCanvas.height = this.mainCanvas.height;
    const ctx = this.compareCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.compareCanvas.width, this.compareCanvas.height);
    ctx.drawImage(this.originalCanvas, 0, 0, this.compareCanvas.width, this.compareCanvas.height);
  }

  setCompareSplit(ratio) {
    this.compareSplit = Math.max(0.01, Math.min(0.99, ratio));
    const pct = (this.compareSplit * 100).toFixed(2);
    if (this.compareSliderBar) this.compareSliderBar.style.left = `${pct}%`;
    if (this.compareContainer) this.compareContainer.style.setProperty('--compare-split', `${pct}%`);
    if (this.compareAfterWrapper) this.compareAfterWrapper.style.width = `${pct}%`;
  }

  initCompareDrag() {
    let isDragging = false;
    const onStart = (e) => {
      isDragging = true;
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const rect = this.canvasWrapper.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const ratio = (clientX - rect.left) / rect.width;
      this.setCompareSplit(ratio);
    };

    const onEnd = () => {
      isDragging = false;
    };

    this.compareSliderBar.addEventListener('mousedown', onStart);
    this.compareSliderBar.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
  }

  // ==========================================
  // Sample Images Generator
  // ==========================================
  loadSampleImage(type) {
    const canvas = document.createElement('canvas');

    if (type === 'landscape') {
      // High-res scenic gradient landscape
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 800);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.5, '#312e81');
      skyGrad.addColorStop(0.8, '#c084fc');
      skyGrad.addColorStop(1, '#f472b6');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 1920, 1080);

      // Sun
      ctx.beginPath();
      ctx.arc(960, 600, 180, 0, Math.PI * 2);
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 80;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Mountains Layer 1
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.moveTo(0, 1080);
      ctx.lineTo(250, 650);
      ctx.lineTo(600, 850);
      ctx.lineTo(1000, 520);
      ctx.lineTo(1400, 780);
      ctx.lineTo(1700, 580);
      ctx.lineTo(1920, 800);
      ctx.lineTo(1920, 1080);
      ctx.closePath();
      ctx.fill();

      // Mountains Layer 2
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(0, 1080);
      ctx.lineTo(400, 780);
      ctx.lineTo(850, 920);
      ctx.lineTo(1250, 700);
      ctx.lineTo(1650, 950);
      ctx.lineTo(1920, 780);
      ctx.lineTo(1920, 1080);
      ctx.closePath();
      ctx.fill();

      this.batchManager.addCanvasItem('mountain_landscape_1080p.jpg', canvas, 450000);
    } else if (type === 'portrait') {
      // Studio portrait aesthetic
      canvas.width = 1200;
      canvas.height = 1500;
      const ctx = canvas.getContext('2d');

      const bg = ctx.createRadialGradient(600, 600, 100, 600, 750, 800);
      bg.addColorStop(0, '#334155');
      bg.addColorStop(1, '#090d16');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1200, 1500);

      // Silhouette Head & Shoulders
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(600, 560, 220, 0, Math.PI * 2);
      ctx.fill();

      // Shoulders
      ctx.beginPath();
      ctx.ellipse(600, 1100, 480, 360, 0, 0, Math.PI * 2);
      ctx.fill();

      // Studio rim lighting
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 14;
      ctx.stroke();

      this.batchManager.addCanvasItem('studio_portrait_photo.jpg', canvas, 380000);
    } else if (type === 'document') {
      // Passport Card / ID test
      canvas.width = 1050;
      canvas.height = 700;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 1050, 700);

      // Card boundary
      ctx.fillStyle = '#ffffff';
      ctx.roundRect(50, 50, 950, 600, 24);
      ctx.fill();

      // Header ribbon
      ctx.fillStyle = '#1e40af';
      ctx.roundRect(50, 50, 950, 100, [24, 24, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('IDENTITY & PASSPORT SPECIMEN', 90, 115);

      // Photo placeholder
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(90, 190, 240, 320);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.strokeRect(90, 190, 240, 320);

      ctx.fillStyle = '#64748b';
      ctx.font = '20px sans-serif';
      ctx.fillText('2 × 2 in Photo', 135, 360);

      // Data fields
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('NAME: SPECIMEN / CITIZEN', 380, 230);
      ctx.fillText('DOC NO: A98234190', 380, 290);
      ctx.fillText('NATIONALITY: GLOBAL', 380, 350);
      ctx.fillText('EXPIRY: 2036-12-31', 380, 410);

      // Barcode lines
      ctx.fillStyle = '#0f172a';
      for (let x = 380; x < 940; x += 10) {
        ctx.fillRect(x, 460, (x % 20 === 0 ? 6 : 3), 50);
      }

      this.batchManager.addCanvasItem('passport_id_card.jpg', canvas, 210000);
    }

    this.showToast(`Sample ${type} loaded!`, 'success');
  }

  // ==========================================
  // Frame & Fit Controls
  // ==========================================
  initFrameControls() {
    if (!document.getElementById('panel-frame')) return;
    // Fit Aspect Ratio
    document.querySelectorAll('#frameAspectSelector .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#frameAspectSelector .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.frameSettings.aspectRatio = btn.dataset.frameAspect;
        this.renderCurrent();
      });
    });

    // Background Style
    document.querySelectorAll('#padBgStyleSelector .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#padBgStyleSelector .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.frameSettings.padStyle = btn.dataset.padStyle;
        document.getElementById('padCustomColorRow').classList.toggle('hidden', this.frameSettings.padStyle !== 'solid');
        this.renderCurrent();
      });
    });

    document.getElementById('padSolidColor').addEventListener('input', (e) => {
      this.frameSettings.solidColor = e.target.value;
      this.renderCurrent();
    });

    // Padding slider
    const padRange = document.getElementById('rangeFramePadding');
    const padVal = document.getElementById('valFramePadding');
    padRange.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.frameSettings.padding = val;
      padVal.textContent = `${val}px`;
      this.renderCurrent();
    });

    // Corner Radius
    const radiusRange = document.getElementById('rangeCornerRadius');
    const radiusVal = document.getElementById('valCornerRadius');
    radiusRange.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.frameSettings.cornerRadius = val;
      radiusVal.textContent = `${val}px`;
      this.renderCurrent();
    });

    document.querySelectorAll('.range-presets button[data-radius]').forEach(chip => {
      chip.addEventListener('click', () => {
        const r = parseInt(chip.dataset.radius, 10);
        radiusRange.value = r;
        this.frameSettings.cornerRadius = r;
        radiusVal.textContent = `${r}px`;
        this.renderCurrent();
      });
    });

    document.getElementById('btnCirclePill').addEventListener('click', () => {
      if (!this.mainCanvas) return;
      const maxR = Math.round(Math.min(this.mainCanvas.width, this.mainCanvas.height) / 2);
      radiusRange.value = Math.min(250, maxR);
      this.frameSettings.cornerRadius = maxR;
      radiusVal.textContent = `${maxR}px`;
      this.renderCurrent();
      this.showToast('Applied circle/pill radius', 'info');
    });

    // Polaroid frame mode
    const polaroidToggle = document.getElementById('togglePolaroid');
    const polaroidCaptionGroup = document.getElementById('polaroidCaptionGroup');
    const standardBorderGroup = document.getElementById('standardBorderGroup');

    polaroidToggle.addEventListener('change', (e) => {
      this.frameSettings.isPolaroid = e.target.checked;
      polaroidCaptionGroup.classList.toggle('hidden', !this.frameSettings.isPolaroid);
      standardBorderGroup.classList.toggle('hidden', this.frameSettings.isPolaroid);
      this.renderCurrent();
    });

    document.getElementById('polaroidCaption').addEventListener('input', (e) => {
      this.frameSettings.polaroidCaption = e.target.value;
      this.renderCurrent();
    });

    // Standard border
    const borderInput = document.getElementById('inputBorderWidth');
    borderInput.addEventListener('input', (e) => {
      this.frameSettings.borderWidth = parseInt(e.target.value, 10) || 0;
      this.renderCurrent();
    });

    document.getElementById('inputBorderColor').addEventListener('input', (e) => {
      this.frameSettings.borderColor = e.target.value;
      this.renderCurrent();
    });

    // Drop Shadow
    const shadowToggle = document.getElementById('toggleShadow');
    const shadowControls = document.getElementById('shadowControlsGroup');
    const shadowBlurRange = document.getElementById('rangeShadowBlur');
    const shadowBlurVal = document.getElementById('valShadowBlur');

    shadowToggle.addEventListener('change', (e) => {
      this.frameSettings.hasShadow = e.target.checked;
      shadowControls.classList.toggle('disabled-overlay', !this.frameSettings.hasShadow);
      this.renderCurrent();
    });

    shadowBlurRange.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.frameSettings.shadowBlur = val;
      shadowBlurVal.textContent = `${val}px`;
      this.renderCurrent();
    });
  }

  // ==========================================
  // Magic Studio Controls
  // ==========================================
  initMagicControls() {
    if (!document.getElementById('panel-magic')) return;
    const btnEyedropper = document.getElementById('btnEyedropper');
    const chromaColorInput = document.getElementById('inputChromaColor');
    const pickedDisplay = document.getElementById('pickedColorDisplay');
    const chromaTolRange = document.getElementById('rangeChromaTolerance');
    const chromaTolVal = document.getElementById('valChromaTolerance');
    const chromaFeatherRange = document.getElementById('rangeChromaFeather');
    const chromaFeatherVal = document.getElementById('valChromaFeather');
    const btnErase = document.getElementById('btnExecuteEraseBg');

    // Eyedropper click mode on canvas
    btnEyedropper.addEventListener('click', () => {
      this.magicSettings.isEyedropperActive = !this.magicSettings.isEyedropperActive;
      this.canvasStage.classList.toggle('eyedropper-active', this.magicSettings.isEyedropperActive);
      btnEyedropper.classList.toggle('active', this.magicSettings.isEyedropperActive);

      if (this.magicSettings.isEyedropperActive) {
        this.showToast('Click anywhere on the photo to pick background color', 'info');
      }
    });

    this.mainCanvas.addEventListener('click', (e) => {
      if (!this.magicSettings.isEyedropperActive) return;

      const rect = this.mainCanvas.getBoundingClientRect();
      const clickX = Math.round((e.clientX - rect.left) * (this.mainCanvas.width / rect.width));
      const clickY = Math.round((e.clientY - rect.top) * (this.mainCanvas.height / rect.height));

      const ctx = this.mainCanvas.getContext('2d');
      const pixel = ctx.getImageData(clickX, clickY, 1, 1).data;

      const toHex = (c) => c.toString(16).padStart(2, '0');
      const hex = `#${toHex(pixel[0])}${toHex(pixel[1])}${toHex(pixel[2])}`;

      this.magicSettings.chromaColor = hex;
      chromaColorInput.value = hex;
      pickedDisplay.style.backgroundColor = hex;

      this.magicSettings.isEyedropperActive = false;
      this.canvasStage.classList.remove('eyedropper-active');
      btnEyedropper.classList.remove('active');
      this.showToast(`Selected color ${hex.toUpperCase()}! Click "Erase Background" to apply.`, 'success');
    });

    chromaColorInput.addEventListener('input', (e) => {
      this.magicSettings.chromaColor = e.target.value;
      pickedDisplay.style.backgroundColor = e.target.value;
    });

    chromaTolRange.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.magicSettings.chromaTolerance = val;
      chromaTolVal.textContent = `${val}%`;
    });

    chromaFeatherRange.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.magicSettings.chromaFeather = val;
      chromaFeatherVal.textContent = `${val}px`;
    });

    btnErase.addEventListener('click', () => {
      if (!this.currentCanvas) return;
      this.showToast('Erasing background color...', 'info');
      const erased = FiltersEngine.eraseBackgroundColor(
        this.currentCanvas,
        this.magicSettings.chromaColor,
        this.magicSettings.chromaTolerance,
        this.magicSettings.chromaFeather
      );
      this.currentCanvas = erased;
      this.renderCurrent();
      this.showToast('Background erased & made transparent!', 'success');
    });

    // Palette Extractor
    const btnExtract = document.getElementById('btnExtractPalette');
    btnExtract.addEventListener('click', () => this.extractAndDisplayPalette());

    // Meme text controls
    const memeToggle = document.getElementById('toggleMeme');
    const memeGroup = document.getElementById('memeControlsGroup');
    const memeTop = document.getElementById('memeTopText');
    const memeBottom = document.getElementById('memeBottomText');
    const memeFontSize = document.getElementById('rangeMemeFontSize');
    const memeFontVal = document.getElementById('valMemeFontSize');

    memeToggle.addEventListener('change', (e) => {
      this.magicSettings.memeEnabled = e.target.checked;
      memeGroup.classList.toggle('disabled-overlay', !this.magicSettings.memeEnabled);
      this.renderCurrent();
    });

    memeTop.addEventListener('input', (e) => {
      this.magicSettings.topText = e.target.value;
      this.renderCurrent();
    });

    memeBottom.addEventListener('input', (e) => {
      this.magicSettings.bottomText = e.target.value;
      this.renderCurrent();
    });

    memeFontSize.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.magicSettings.fontSize = val;
      memeFontVal.textContent = `${val}px`;
      this.renderCurrent();
    });

    // Privacy Censor Box Controls
    document.querySelectorAll('#censorTypeSelector .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#censorTypeSelector .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.censorSettings.type = btn.dataset.censor;
      });
    });

    const rangeCensor = document.getElementById('rangeCensorIntensity');
    const valCensor = document.getElementById('valCensorIntensity');
    if (rangeCensor) {
      rangeCensor.addEventListener('input', (e) => {
        this.censorSettings.intensity = parseInt(e.target.value, 10);
        valCensor.textContent = `${this.censorSettings.intensity}px`;
      });
    }

    const btnSelectCensor = document.getElementById('btnSelectCensorArea');
    if (btnSelectCensor) {
      btnSelectCensor.addEventListener('click', () => {
        this.cropper.setAspectRatio('free');
        this.cropper.show();
        this.showToast('Position the box over face, text, or area to censor', 'info');
      });
    }

    const btnApplyCensor = document.getElementById('btnApplyCensor');
    if (btnApplyCensor) {
      btnApplyCensor.addEventListener('click', () => {
        if (!this.currentCanvas) return;
        const rect = this.cropper.getCropPixelRect();
        const censored = FiltersEngine.applyCensorToRegion(
          this.currentCanvas,
          rect,
          this.censorSettings.type,
          this.censorSettings.intensity
        );
        this.currentCanvas = censored;
        this.cropper.hide();
        this.renderCurrent();
        this.showToast('Censor applied to selected area!', 'success');
      });
    }
  }

  extractAndDisplayPalette() {
    if (!this.mainCanvas) return;
    const palette = FiltersEngine.extractDominantColors(this.mainCanvas, 6);
    const container = document.getElementById('paletteSwatchesGrid');
    if (!container) return;

    container.innerHTML = '';
    palette.forEach(color => {
      const card = document.createElement('div');
      card.className = 'palette-swatch-card';
      card.title = `Click to copy ${color.hex.toUpperCase()}`;
      card.innerHTML = `
        <div class="swatch-color-pill" style="background-color: ${color.hex}"></div>
        <span class="swatch-hex-label">${color.hex.toUpperCase()}</span>
      `;
      card.addEventListener('click', () => {
        navigator.clipboard.writeText(color.hex.toUpperCase()).then(() => {
          this.showToast(`Copied ${color.hex.toUpperCase()} to clipboard!`, 'success');
        });
      });
      container.appendChild(card);
    });

    this.showToast('Dominant palette extracted!', 'success');
  }

  // Toast Notifications
  showToast(message, type = 'info') {
    // Notifications disabled — download screen handles user feedback
    return;
  }

  // ==========================================
  // Navigation Dropdowns, Mega Footer & Theme
  // ==========================================
  initNavAndFooter() {
    this.collageMaker = new CollageMaker(this);

    // Top Navigation Dropdown Links
    document.querySelectorAll('[data-nav-action]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const action = link.dataset.navAction;
        this.handleMenuAction(action, link.dataset);
      });
    });

    // Mega Footer Links
    document.querySelectorAll('[data-footer-action]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const action = link.dataset.footerAction;
        this.handleFooterAction(action, link.dataset);
      });
    });

    // Theme Switcher
    this.initThemeSwitcher();

    // Mobile Navigation Drawer
    this.initMobileNav();

    // Legal / Info Dialog Modal
    this.initLegalModal();

    // Floating Help button
    const btnHelp = document.getElementById('floatingHelpBtn');
    if (btnHelp) {
      btnHelp.addEventListener('click', () => {
        this.openLegalModal('help');
      });
    }

    const btnFree = document.getElementById('btnNavFreeBadge');
    if (btnFree) {
      btnFree.addEventListener('click', (e) => {
        e.preventDefault();
        this.openLegalModal('about');
      });
    }

    // Hide editor-only actions on initial landing screen
    this.updateHeaderActionVisibility(false);
  }

  handleMenuAction(action, dataset = {}) {
    if (action === 'switch-bulk') {
      this.switchMode('bulk');
      return;
    }
    if (action === 'open-collage') {
      this.collageMaker.openModal();
      return;
    }

    // If no image loaded yet, open the dedicated Tool Landing Page!
    if (!this.currentCanvas) {
      this.showToolLanding(action, dataset);
      return;
    }

    this.switchMode('single');

    if (action.startsWith('resize')) {
      this.switchTab('resize');
      if (dataset.submode) {
        const btn = document.querySelector(`.mode-btn[data-resize-mode="${dataset.submode}"]`);
        if (btn) btn.click();
      }
      if (dataset.preset) {
        const sel = document.getElementById('selectPreset');
        if (sel) {
          sel.value = dataset.preset;
          sel.dispatchEvent(new Event('change'));
        }
      }
    } else if (action === 'upscale-2x') {
      this.switchTab('resize');
      this.applyUpscale(2);
    } else if (action.startsWith('crop')) {
      this.switchTab('crop');
      if (dataset.aspect) {
        this.cropper.setAspectRatio(dataset.aspect);
        const aspBtn = document.querySelector(`.aspect-btn[data-aspect="${dataset.aspect}"]`);
        if (aspBtn) {
          document.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('active'));
          aspBtn.classList.add('active');
        }
      }
    } else if (action === 'compress-target') {
      this.switchTab('compress');
      const kb = parseInt(dataset.kb, 10);
      if (kb) {
        this.applyTargetSizeCompression(kb);
        this.setTargetFileSize(kb);
      }
    } else if (action === 'compress-panel') {
      this.switchTab('compress');
    } else if (action === 'convert-fmt') {
      const fmt = dataset.fmt;
      if (fmt) {
        this.exportFormat = fmt;
        document.querySelectorAll('.format-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.format === fmt);
        });
        const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif', 'application/pdf': '.pdf' };
        const ext = extMap[fmt] || '.jpg';
        const label = document.getElementById('exportExtLabel');
        if (label) label.textContent = ext;
        this.updateStats();
        this.showToast(`Output format set to ${ext.toUpperCase()}`, 'success');
      }
    } else if (action === 'tab-frame') {
      this.switchTab('frame');
    } else if (action === 'tab-magic-eraser') {
      this.switchTab('magic');
    } else if (action === 'tab-magic-palette') {
      this.switchTab('magic');
      this.extractAndDisplayPalette();
    } else if (action === 'tab-adjust') {
      this.switchTab('adjust');
    } else if (action === 'tab-watermark') {
      this.switchTab('watermark');
    } else if (action === 'tab-magic-meme') {
      this.switchTab('magic');
      const toggle = document.getElementById('toggleMeme');
      if (toggle) {
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change'));
      }
    } else if (action === 'tab-inspector') {
      this.switchTab('inspector');
    }
  }

  checkInitialRoute() {
    const bodyTool = document.body.dataset.defaultTool;
    const urlParams = new URLSearchParams(window.location.search);
    const queryTool = urlParams.get('tool');
    const hash = window.location.hash.replace('#', '');
    const tool = bodyTool || queryTool || hash;

    if (!tool) return;

    if (tool === 'bulk' || tool === 'bulk-resizer') {
      this.switchMode('bulk');
    } else if (tool === 'compress-50') {
      this.showToolLanding('compress-target', { kb: 50 });
    } else if (tool === 'compress-20') {
      this.showToolLanding('compress-target', { kb: 20 });
    } else if (tool === 'compress-100') {
      this.showToolLanding('compress-target', { kb: 100 });
    } else if (tool === 'crop-free' || tool === 'crop') {
      this.showToolLanding('crop-free', {});
    } else if (tool === 'passport' || tool === 'passport-photo') {
      this.showToolLanding('passport', { submode: 'presets', preset: 'passport-us' });
    } else if (tool === 'collage') {
      this.collageMaker.openModal();
    } else if (OmniResizeApp.TOOL_CATALOG[tool]) {
      const entry = OmniResizeApp.TOOL_CATALOG[tool];
      this.showToolLanding(entry.action || tool, entry);
    }
  }

  showToolLanding(action, dataset = {}) {
    let toolKey = action;
    if (action === 'compress-target' && dataset.kb) {
      toolKey = `compress-${dataset.kb}`;
    } else if (action === 'convert-fmt' && dataset.fmt) {
      if (dataset.fmt === 'image/jpeg') toolKey = 'convert-jpg';
      else if (dataset.fmt === 'image/png') toolKey = 'convert-png';
      else if (dataset.fmt === 'image/webp') toolKey = 'convert-webp';
      else if (dataset.fmt === 'image/avif') toolKey = 'convert-avif';
      else if (dataset.fmt === 'application/pdf') toolKey = 'convert-pdf';
    } else if (action === 'passport') {
      toolKey = 'passport';
      action = 'resize-presets';
      dataset = { submode: 'presets', preset: 'passport-us' };
    }

    const catalog = OmniResizeApp.TOOL_CATALOG;
    const info = catalog[toolKey] || catalog[action] || catalog['resize-dims'];

    this.pendingToolAction = action;
    this.pendingToolDataset = dataset;

    // Update Hero elements
    if (this.toolHeroIcon) this.toolHeroIcon.innerHTML = `<i class="${info.icon}"></i>`;
    if (this.toolHeroTitle) this.toolHeroTitle.textContent = info.title;
    if (this.toolHeroDesc) this.toolHeroDesc.textContent = info.desc;
    if (this.toolUploadBtnText) this.toolUploadBtnText.textContent = info.btnText;
    if (this.toolStep2Text) this.toolStep2Text.textContent = info.step2;

    // Switch view
    this.dropzoneScreen.classList.add('hidden');
    if (this.toolLandingScreen) this.toolLandingScreen.classList.remove('hidden');
    this.editorScreen.classList.add('hidden');
    if (this.bulkScreen) this.bulkScreen.classList.add('hidden');

    this.updateHeaderActionVisibility(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  executePendingToolAction() {
    if (!this.pendingToolAction) return;
    const action = this.pendingToolAction;
    const dataset = this.pendingToolDataset || {};
    this.pendingToolAction = null;
    this.pendingToolDataset = {};

    setTimeout(() => {
      this.handleMenuAction(action, dataset);
    }, 100);
  }

  updateHeaderActionVisibility(isEditorActive) {
    const btnExportTop = document.getElementById('btnExportTop');
    const btnUndo = document.getElementById('btnUndo');
    const btnCompare = document.getElementById('btnToggleCompare');
    if (btnExportTop) btnExportTop.style.display = isEditorActive ? 'inline-flex' : 'none';
    if (btnUndo) btnUndo.style.display = isEditorActive ? 'inline-flex' : 'none';
    if (btnCompare) btnCompare.style.display = isEditorActive ? 'inline-flex' : 'none';

    if (isEditorActive) {
      document.body.classList.add('in-editor');
      document.body.classList.remove('in-bulk');
    } else {
      document.body.classList.remove('in-editor');
    }

    const mainFooter = document.getElementById('mainFooter');
    if (mainFooter) {
      const isStudioWorkspace = isEditorActive || document.body.classList.contains('in-bulk');
      mainFooter.style.display = isStudioWorkspace ? 'none' : 'block';
    }
  }

  static get TOOL_CATALOG() {
    return {
      'resize-dims': {
        title: 'Resize Image by Dimensions',
        desc: 'Quickly change image width and height in pixels (px), inches, cm, or mm with print standard DPI control and zero blurriness.',
        icon: 'fa-solid fa-ruler-combined',
        btnText: 'Select Image to Resize',
        step2: 'Enter your target dimensions or scale percentage to resize instantly.',
        action: 'resize-dims'
      },
      'resize-percent': {
        title: 'Resize Image by Percentage',
        desc: 'Scale your photos down or up by exact percentages (25%, 50%, 75%, 200%) in seconds with bicubic interpolation.',
        icon: 'fa-solid fa-percent',
        btnText: 'Select Image to Scale',
        step2: 'Choose percentage slider or 1-click preset scale buttons.',
        action: 'resize-percent'
      },
      'resize-presets': {
        title: 'Social Media Photo Resizer',
        desc: 'Over 20 pre-configured templates for Instagram, YouTube, X (Twitter), Facebook, LinkedIn, TikTok, and Passport photos.',
        icon: 'fa-solid fa-shapes',
        btnText: 'Select Photo for Social Preset',
        step2: 'Select your target social media network and format template.',
        action: 'resize-presets'
      },
      'passport': {
        title: 'Passport Photo Maker (2×2" & 35×45mm)',
        desc: 'Create official compliant passport, visa, and ID photos with exact 2×2 inch or 35×45mm dimensions, 300 DPI print standard JFIF metadata, and clean margins.',
        icon: 'fa-solid fa-id-card',
        btnText: 'Select Photo for Passport Photo',
        step2: 'Choose US Passport (2×2"), EU / UK / India (35×45mm), or visa preset with 300 DPI.',
        action: 'resize-presets',
        submode: 'presets',
        preset: 'passport-us'
      },
      'upscale-2x': {
        title: '2× & 4× Super-Resolution Upscaler',
        desc: 'Enhance and upscale low-resolution images with smart bicubic multi-step scaling and edge-sharpening convolution kernels.',
        icon: 'fa-solid fa-wand-magic-sparkles',
        btnText: 'Select Image to Upscale',
        step2: 'Click 2x HD or 4x Ultra HD to instantly boost image resolution.',
        action: 'upscale-2x'
      },
      'crop-free': {
        title: 'Crop Image Online',
        desc: 'Crop unwanted areas from your photos with an interactive drag-and-drop bounding box and rule-of-thirds grid.',
        icon: 'fa-solid fa-crop-simple',
        btnText: 'Select Image to Crop',
        step2: 'Drag the corner handles to select your area and click Apply Crop.',
        action: 'crop-free'
      },
      'crop-1-1': {
        title: '1:1 Square Crop (Instagram)',
        desc: 'Crop your photos into a perfect 1:1 square ratio for Instagram feed posts, product shots, and square album covers.',
        icon: 'fa-solid fa-square',
        btnText: 'Select Image for 1:1 Crop',
        step2: 'Align the 1:1 square bounding box and crop.',
        action: 'crop-1-1'
      },
      'crop-16-9': {
        title: '16:9 Landscape Crop (YouTube)',
        desc: 'Crop images into 16:9 widescreen format for YouTube thumbnails, desktop wallpapers, and presentation slides.',
        icon: 'fa-solid fa-tv',
        btnText: 'Select Image for 16:9 Crop',
        step2: 'Adjust the 16:9 frame over your subject and apply crop.',
        action: 'crop-16-9'
      },
      'crop-9-16': {
        title: '9:16 Vertical Crop (Story & Reels)',
        desc: 'Crop photos to 9:16 vertical ratio tailored for Instagram Stories, TikTok, YouTube Shorts, and phone wallpapers.',
        icon: 'fa-solid fa-mobile-screen',
        btnText: 'Select Image for 9:16 Crop',
        step2: 'Position the vertical 9:16 crop frame over your photo.',
        action: 'crop-9-16'
      },
      'crop-circle': {
        title: 'Circular Avatar & Profile Crop',
        desc: 'Crop any picture into a circular avatar with transparent background for Discord, Twitter, Google, and LinkedIn profiles.',
        icon: 'fa-solid fa-circle',
        btnText: 'Select Image for Circle Crop',
        step2: 'Frame your face or logo in the circular overlay and apply.',
        action: 'crop-circle'
      },
      'compress-20': {
        title: 'Compress Image to < 20 KB',
        desc: 'Reduce photo or digital signature file size to under 20 KB for online government applications and upload portals.',
        icon: 'fa-solid fa-gauge',
        btnText: 'Select Image to Compress (< 20KB)',
        step2: 'Binary search optimization automatically adjusts compression to fit strictly under 20 KB.',
        action: 'compress-target',
        kb: 20
      },
      'compress-50': {
        title: 'Compress Image to < 50 KB',
        desc: 'Compress photos under 50 KB without losing clarity. Ideal for passport photos, SSC, UPSC, and exam application forms.',
        icon: 'fa-solid fa-gauge',
        btnText: 'Select Image to Compress (< 50KB)',
        step2: 'Automatic quality and dimension tuning to guarantee final file size is under 50 KB.',
        action: 'compress-target',
        kb: 50
      },
      'compress-100': {
        title: 'Compress Image to < 100 KB',
        desc: 'Compress high-resolution photos under 100 KB for fast email attachments and web publishing.',
        icon: 'fa-solid fa-gauge-high',
        btnText: 'Select Image to Compress (< 100KB)',
        step2: 'Compresses image below 100 KB with real-time byte calculation.',
        action: 'compress-target',
        kb: 100
      },
      'compress-200': {
        title: 'Compress Image to < 200 KB',
        desc: 'Smart compression ensuring your picture is under 200 KB while retaining vibrant colors and sharpness.',
        icon: 'fa-solid fa-gauge-high',
        btnText: 'Select Image to Compress (< 200KB)',
        step2: 'Optimizes JPEG/WebP encoding to meet the 200 KB target threshold.',
        action: 'compress-target',
        kb: 200
      },
      'compress-500': {
        title: 'Compress Image to < 500 KB',
        desc: 'Reduce large 5MB - 20MB camera photos down below 500 KB for websites, blogs, and messaging apps.',
        icon: 'fa-solid fa-gauge-high',
        btnText: 'Select Image to Compress (< 500KB)',
        step2: 'Compresses photos under 500 KB seamlessly in your browser.',
        action: 'compress-target',
        kb: 500
      },
      'compress-panel': {
        title: 'Online Image Compressor',
        desc: 'Intelligent image compression with customizable quality slider, custom KB/MB target limit, and live size savings counter.',
        icon: 'fa-solid fa-sliders',
        btnText: 'Select Image to Compress',
        step2: 'Slide the quality control or enter custom KB target for instant compression.',
        action: 'compress-panel'
      },
      'convert-jpg': {
        title: 'Convert Image to JPG / JPEG',
        desc: 'Convert WebP, PNG, AVIF, or HEIC files to universally compatible JPEG photos with 300 DPI print standard headers.',
        icon: 'fa-solid fa-file-image',
        btnText: 'Select Image to Convert to JPG',
        step2: 'Select quality level and click 1-Click Download to export as .jpg.',
        action: 'convert-fmt',
        fmt: 'image/jpeg'
      },
      'convert-png': {
        title: 'Convert Image to PNG',
        desc: 'Convert photos to lossless PNG format with complete alpha transparency preservation and zero compression artifacts.',
        icon: 'fa-solid fa-file-image',
        btnText: 'Select Image to Convert to PNG',
        step2: 'Exports pixel-perfect lossless PNG image.',
        action: 'convert-fmt',
        fmt: 'image/png'
      },
      'convert-webp': {
        title: 'Convert Image to WebP',
        desc: 'Convert pictures to Google WebP format to reduce file sizes by 30-40% compared to JPG with identical visual quality.',
        icon: 'fa-solid fa-globe',
        btnText: 'Select Image to Convert to WebP',
        step2: 'Export high-efficiency WebP files for lightning-fast web pages.',
        action: 'convert-fmt',
        fmt: 'image/webp'
      },
      'convert-avif': {
        title: 'Convert Image to AVIF (Next-Gen)',
        desc: 'Convert photos to next-generation AV1 image format for unbeatable compression efficiency on modern web browsers.',
        icon: 'fa-solid fa-bolt',
        btnText: 'Select Image to Convert to AVIF',
        step2: 'Export next-generation AVIF images with superior HDR fidelity.',
        action: 'convert-fmt',
        fmt: 'image/avif'
      },
      'convert-pdf': {
        title: 'Image to PDF Converter',
        desc: 'Convert images into high-resolution, single-page or multi-page printable PDF documents directly in your browser.',
        icon: 'fa-solid fa-file-pdf',
        btnText: 'Select Image to Convert to PDF',
        step2: 'Choose page fit and download compliant .pdf document.',
        action: 'convert-fmt',
        fmt: 'application/pdf'
      },
      'tab-frame': {
        title: 'Frame & Padding (Blurred Margin Fit)',
        desc: 'Fit any landscape or portrait photo into 1:1 or 9:16 without cropping by adding blurred margins, solid colors, or Polaroid frames.',
        icon: 'fa-solid fa-border-all',
        btnText: 'Select Image to Frame & Fit',
        step2: 'Choose blur margin padding, rounded corner radius, or Polaroid styling.',
        action: 'tab-frame'
      },
      'tab-magic-eraser': {
        title: 'Magic Background Color Eraser',
        desc: 'Pick any solid background color using the visual eyedropper and make it completely transparent with chroma key extraction.',
        icon: 'fa-solid fa-wand-magic-sparkles',
        btnText: 'Select Image to Erase Background',
        step2: 'Use the eyedropper to select the backdrop color, adjust tolerance, and erase.',
        action: 'tab-magic-eraser'
      },
      'tab-magic-palette': {
        title: 'Palette Extractor & Color Picker',
        desc: 'Automatically extract the top 6 dominant colors from any photo with 1-click HEX code copying to clipboard.',
        icon: 'fa-solid fa-palette',
        btnText: 'Select Image to Extract Palette',
        step2: 'Click Extract Palette to discover the photo color scheme.',
        action: 'tab-magic-palette'
      },
      'tab-adjust': {
        title: 'Rotate, Flip & Straighten Image',
        desc: 'Rotate photos 90° clockwise/counter-clockwise, 180°, flip horizontally/vertically, and straighten tilted horizons.',
        icon: 'fa-solid fa-arrows-rotate',
        btnText: 'Select Image to Rotate & Flip',
        step2: 'Click rotation buttons or slide the fine straighten bar.',
        action: 'tab-adjust'
      },
      'tab-watermark': {
        title: 'Add Watermark to Photo',
        desc: 'Protect your images by stamping copyright text or company logos with adjustable opacity and 9-point grid alignment.',
        icon: 'fa-solid fa-signature',
        btnText: 'Select Image to Watermark',
        step2: 'Type watermark text or upload a logo, set position and transparency.',
        action: 'tab-watermark'
      },
      'tab-magic-meme': {
        title: 'Meme Text Generator',
        desc: 'Create viral internet memes by adding classic top and bottom Impact text with thick black outlines to any photo.',
        icon: 'fa-solid fa-face-laugh-squint',
        btnText: 'Select Image to Create Meme',
        step2: 'Type top and bottom meme captions with real-time text scaling.',
        action: 'tab-magic-meme'
      },
      'tab-inspector': {
        title: 'EXIF & Image Inspector',
        desc: 'Inspect image metadata, exact pixel dimensions, megapixels, aspect ratio, embedded 300 DPI headers, and strip GPS tags.',
        icon: 'fa-solid fa-circle-info',
        btnText: 'Select Image to Inspect',
        step2: 'View detailed technical specs and strip privacy data.',
        action: 'tab-inspector'
      },
      'passport-photo': {
        title: 'Passport & Visa Photo Maker (300 DPI)',
        desc: 'Create official compliant passport and visa photos (2×2 inches, 35×45 mm) with true 300 DPI JFIF print metadata and white background support.',
        icon: 'fa-solid fa-id-card',
        btnText: 'Select Photo for Passport Size',
        step2: 'Select country template (US, EU, India, UK) with automatic 300 DPI print metadata.',
        action: 'resize-presets',
        submode: 'presets',
        preset: 'passport-us'
      },
      'bulk-resizer': {
        title: 'Bulk Image Resizer Online Free',
        desc: 'Batch resize, compress, convert, and watermark dozens or hundreds of photos simultaneously in your browser. 100% private, zero upload limits, instant ZIP download.',
        icon: 'fa-solid fa-layer-group',
        btnText: 'Select Multiple Images for Bulk Resize',
        step2: 'Set scaling dimensions or target KB limit and download all as a ZIP.',
        action: 'switch-bulk'
      }
    };
  }

  switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

    const tab = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    const panel = document.getElementById(`panel-${tabName}`);
    if (tab) tab.classList.add('active');
    if (panel) panel.classList.add('active');

    if (tabName === 'crop') {
      this.cropper.show();
    } else {
      this.cropper.hide();
    }
  }

  handleFooterAction(action, dataset) {
    if (action === 'resize') {
      this.handleMenuAction('resize-dims', {});
    } else if (action === 'bulk') {
      this.switchMode('bulk');
    } else if (action === 'compress') {
      this.handleMenuAction('compress-panel', {});
    } else if (action === 'crop') {
      this.handleMenuAction('crop-free', {});
    } else if (action === 'collage') {
      this.collageMaker.openModal();
    } else if (action === 'flip-rotate') {
      this.handleMenuAction('tab-adjust', {});
    } else if (action === 'enlarge') {
      this.handleMenuAction('upscale-2x', {});
    } else if (action === 'color-picker') {
      this.handleMenuAction('tab-magic-palette', {});
    } else if (action === 'magic-eraser') {
      this.handleMenuAction('tab-magic-eraser', {});
    } else if (action === 'meme') {
      this.handleMenuAction('tab-magic-meme', {});
    } else if (action === 'conv-jpg') {
      this.handleMenuAction('convert-fmt', { fmt: 'image/jpeg' });
    } else if (action === 'conv-png') {
      this.handleMenuAction('convert-fmt', { fmt: 'image/png' });
    } else if (action === 'conv-webp') {
      this.handleMenuAction('convert-fmt', { fmt: 'image/webp' });
    } else if (action === 'conv-avif') {
      this.handleMenuAction('convert-fmt', { fmt: 'image/avif' });
    } else if (action === 'conv-pdf') {
      this.handleMenuAction('convert-fmt', { fmt: 'application/pdf' });
    } else if (action === 'target-kb') {
      this.handleMenuAction('compress-target', { kb: dataset.kb });
    } else if (action === 'modal-about') {
      this.openLegalModal('about');
    } else if (action === 'modal-privacy') {
      this.openLegalModal('privacy');
    } else if (action === 'modal-terms') {
      this.openLegalModal('terms');
    } else if (action === 'modal-contact') {
      this.openLegalModal('contact');
    }
  }

  initThemeSwitcher() {
    // Pure clean light theme permanently - no dark mode
    document.body.classList.remove('dark-theme', 'light-theme');
    try {
      localStorage.removeItem('omni_theme');
      localStorage.removeItem('omniresize_theme');
    } catch (_) {}
  }

  initMobileNav() {
    const btnToggle = document.getElementById('btnMobileMenuToggle');
    const drawer = document.getElementById('mobileNavDrawer');
    const backdrop = document.getElementById('mobileNavBackdrop');
    const btnClose = document.getElementById('btnMobileNavClose');

    if (!btnToggle || !drawer) return;

    const openDrawer = () => {
      drawer.classList.add('active');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
      drawer.classList.remove('active');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    btnToggle.addEventListener('click', () => {
      if (drawer.classList.contains('active')) closeDrawer();
      else openDrawer();
    });

    if (btnClose) btnClose.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('active')) {
        closeDrawer();
      }
    });

    // Handle drawer mode switchers
    drawer.querySelectorAll('.mobile-drawer-mode-btn').forEach(b => {
      b.addEventListener('click', () => {
        const mode = b.dataset.mode;
        drawer.querySelectorAll('.mobile-drawer-mode-btn').forEach(btn => btn.classList.toggle('active', btn === b));
        this.switchMode(mode);
        closeDrawer();
      });
    });

    // Handle drawer tool actions
    drawer.querySelectorAll('[data-mobile-action]').forEach(el => {
      el.addEventListener('click', (e) => {
        const action = el.dataset.mobileAction;
        closeDrawer();
        if (action === 'open-collage') {
          if (this.collageMaker) this.collageMaker.openModal();
        } else if (action.startsWith('conv-')) {
          const fmtMap = {
            'conv-jpg': 'image/jpeg',
            'conv-png': 'image/png',
            'conv-webp': 'image/webp',
            'conv-avif': 'image/avif',
            'conv-pdf': 'application/pdf'
          };
          const fmt = fmtMap[action];
          if (fmt) {
            this.handleFooterAction('convert-fmt', { fmt });
          }
        }
      });
    });

    // Auto-close on link clicks
    drawer.querySelectorAll('a.mobile-tool-card').forEach(link => {
      link.addEventListener('click', () => closeDrawer());
    });
  }

  initLegalModal() {
    const modal = document.getElementById('legalModal');
    const btnClose = document.getElementById('btnCloseLegal');
    const btnOk = document.getElementById('btnOkLegal');

    const close = () => {
      if (modal) modal.classList.remove('active');
    };
    if (btnClose) btnClose.addEventListener('click', close);
    if (btnOk) btnOk.addEventListener('click', close);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
      });
    }
  }

  openLegalModal(type) {
    const modal = document.getElementById('legalModal');
    const titleEl = document.getElementById('legalModalTitle');
    const bodyEl = document.getElementById('legalModalBody');
    if (!modal || !titleEl || !bodyEl) return;

    if (type === 'about') {
      titleEl.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles text-primary"></i> <span>About OmniResize Studio</span>';
      bodyEl.innerHTML = `
        <p><strong>OmniResize Studio</strong> is a free, high-performance browser studio engineered to deliver the fastest, most private photo editing experience on the web.</p>
        <h4 style="color:var(--text-main); margin-top:14px;">Key Innovations:</h4>
        <ul style="padding-left:20px; margin-top:6px; line-height:1.7;">
          <li><strong>100% Client-Side:</strong> All resizing, super-resolution, background erasing, and compression algorithms run locally in your browser memory.</li>
          <li><strong>Zero Cloud Uploads:</strong> Photos are never transmitted to any server. Absolute privacy and data protection.</li>
          <li><strong>No Limits:</strong> Batch process dozens of photos and download as a ZIP archive for free.</li>
        </ul>
      `;
    } else if (type === 'privacy') {
      titleEl.innerHTML = '<i class="fa-solid fa-shield-halved text-success"></i> <span>100% Client-Side Privacy Policy</span>';
      bodyEl.innerHTML = `
        <p><strong>Your images never leave your computer or phone.</strong></p>
        <p style="margin-top:8px;">Unlike traditional online services that upload your personal files to cloud servers for processing, <strong>OmniResize Studio is 100% client-side</strong>.</p>
        <h4 style="color:var(--text-main); margin-top:14px;">Security Highlights:</h4>
        <ul style="padding-left:20px; margin-top:6px; line-height:1.7;">
          <li>Zero file transfer over network — all processing happens in your device's RAM.</li>
          <li>Automatic <strong>EXIF & GPS metadata stripper</strong> removes sensitive location tags and camera serial numbers.</li>
          <li>Works 100% offline once the page is loaded.</li>
        </ul>
      `;
    } else if (type === 'terms') {
      titleEl.innerHTML = '<i class="fa-solid fa-file-contract text-primary"></i> <span>Terms of Service</span>';
      bodyEl.innerHTML = `
        <p>OmniResize Studio is provided completely free of charge for both individual and commercial use.</p>
        <p style="margin-top:8px;">You retain 100% ownership and copyright over all images you process with OmniResize Studio. No licenses, copies, or rights are claimed over your original or modified content.</p>
      `;
    } else if (type === 'help') {
      titleEl.innerHTML = '<i class="fa-solid fa-circle-question text-primary"></i> <span>Help & Shortcuts</span>';
      bodyEl.innerHTML = `
        <h4 style="color:var(--text-main);">Keyboard Shortcuts:</h4>
        <ul style="padding-left:20px; margin-top:6px; line-height:1.8;">
          <li><code>Ctrl + O</code> : Open & browse image files</li>
          <li><code>Ctrl + V</code> : Paste directly from clipboard</li>
          <li><code>Ctrl + S</code> : 1-Click Instant Download</li>
          <li><code>Ctrl + Z</code> : Reset adjustments</li>
        </ul>
        <h4 style="color:var(--text-main); margin-top:14px;">New Features:</h4>
        <p style="margin-top:4px;">Try the <strong>Collage Maker & Image Joiner</strong> (under the "More" menu) to combine photos side-by-side, stacked, or in a 2×2 grid!</p>
      `;
    } else if (type === 'contact') {
      titleEl.innerHTML = '<i class="fa-solid fa-envelope text-primary"></i> <span>Contact & Feedback</span>';
      bodyEl.innerHTML = `
        <p>We are constantly improving OmniResize Studio based on user feedback.</p>
        <p style="margin-top:10px;">For questions, feature requests, or partnerships, contact us at: <a href="mailto:support@omniresize.pro" style="color:#a5b4fc; font-weight:600;">support@omniresize.pro</a></p>
      `;
    }

    modal.classList.add('active');
  }


}

// Initialize on page load or immediately if document is already ready
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    if (!window.app) window.app = new OmniResizeApp();
  });
} else {
  window.app = new OmniResizeApp();
}

// Register Service Worker for Offline PWA Support
if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js?v=4.0')
      .then((reg) => {
        reg.update();
        console.log('OmniResize ServiceWorker registered (v4.0 Ready):', reg.scope);
      })
      .catch((err) => console.log('ServiceWorker registration error:', err));
  });
}

