/**
 * OmniResize Studio - Interactive Cropper Tool
 */

class ImageCropper {
  constructor(options = {}) {
    this.overlay = document.getElementById('cropOverlay');
    this.cropBox = document.getElementById('cropBox');
    this.badge = document.getElementById('cropDimensions');
    this.canvas = document.getElementById('mainCanvas');
    this.canvasWrapper = document.getElementById('canvasWrapper');

    this.activeRatio = 'free'; // 'free', '1:1', '16:9', '9:16', '4:3', '4:5', 'circle'
    this.showGrid = true;

    // Normalized bounds [0..1] relative to current displayed image
    this.cropData = {
      x: 0.1,
      y: 0.1,
      width: 0.8,
      height: 0.8
    };

    this.isDragging = false;
    this.activeHandle = null;
    this.dragStart = { x: 0, y: 0 };
    this.cropBoxStart = { x: 0, y: 0, width: 0, height: 0 };

    this.initEvents();
  }

  show() {
    if (!this.overlay) return;
    this.overlay.classList.remove('hidden');
    this.updateBoxFromCropData();
  }

  hide() {
    if (!this.overlay) return;
    this.overlay.classList.add('hidden');
  }

  setAspectRatio(ratioStr) {
    this.activeRatio = ratioStr;
    if (ratioStr === 'circle') {
      this.cropBox.classList.add('circle-mode');
    } else {
      this.cropBox.classList.remove('circle-mode');
    }

    if (ratioStr === 'free') {
      return;
    }

    let targetRatio = 1;
    if (ratioStr === '1:1' || ratioStr === 'circle') targetRatio = 1;
    else if (ratioStr === '16:9') targetRatio = 16 / 9;
    else if (ratioStr === '9:16') targetRatio = 9 / 16;
    else if (ratioStr === '4:3') targetRatio = 4 / 3;
    else if (ratioStr === '4:5') targetRatio = 4 / 5;

    // Adjust cropData to match ratio inside current canvas dimensions
    const imgAspect = this.canvas.width / this.canvas.height;
    
    // Fit a centered box with aspect ratio
    let newWidth = 0.8;
    let newHeight = newWidth * (imgAspect / targetRatio);

    if (newHeight > 0.9) {
      newHeight = 0.8;
      newWidth = newHeight * (targetRatio / imgAspect);
    }

    this.cropData.width = Math.min(1, Math.max(0.1, newWidth));
    this.cropData.height = Math.min(1, Math.max(0.1, newHeight));
    this.cropData.x = (1 - this.cropData.width) / 2;
    this.cropData.y = (1 - this.cropData.height) / 2;

    this.updateBoxFromCropData();
  }

  toggleGrid(visible) {
    this.showGrid = visible;
    const grid = this.cropBox.querySelector('.crop-grid');
    if (grid) {
      grid.style.display = visible ? 'block' : 'none';
    }
  }

  updateBoxFromCropData() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const wrapperRect = this.canvasWrapper.getBoundingClientRect();

    // Position relative to canvasWrapper
    const offsetLeft = rect.left - wrapperRect.left;
    const offsetTop = rect.top - wrapperRect.top;

    const boxLeft = offsetLeft + this.cropData.x * rect.width;
    const boxTop = offsetTop + this.cropData.y * rect.height;
    const boxWidth = this.cropData.width * rect.width;
    const boxHeight = this.cropData.height * rect.height;

    this.cropBox.style.left = `${boxLeft}px`;
    this.cropBox.style.top = `${boxTop}px`;
    this.cropBox.style.width = `${boxWidth}px`;
    this.cropBox.style.height = `${boxHeight}px`;

    // Update backdrop cutouts
    const topBackdrop = this.overlay.querySelector('.crop-backdrop-top');
    const bottomBackdrop = this.overlay.querySelector('.crop-backdrop-bottom');
    const leftBackdrop = this.overlay.querySelector('.crop-backdrop-left');
    const rightBackdrop = this.overlay.querySelector('.crop-backdrop-right');

    if (topBackdrop) {
      topBackdrop.style.top = '0';
      topBackdrop.style.left = '0';
      topBackdrop.style.right = '0';
      topBackdrop.style.height = `${boxTop}px`;
    }
    if (bottomBackdrop) {
      bottomBackdrop.style.top = `${boxTop + boxHeight}px`;
      bottomBackdrop.style.left = '0';
      bottomBackdrop.style.right = '0';
      bottomBackdrop.style.bottom = '0';
    }
    if (leftBackdrop) {
      leftBackdrop.style.top = `${boxTop}px`;
      leftBackdrop.style.left = '0';
      leftBackdrop.style.width = `${boxLeft}px`;
      leftBackdrop.style.height = `${boxHeight}px`;
    }
    if (rightBackdrop) {
      rightBackdrop.style.top = `${boxTop}px`;
      rightBackdrop.style.left = `${boxLeft + boxWidth}px`;
      rightBackdrop.style.right = '0';
      rightBackdrop.style.height = `${boxHeight}px`;
    }

    // Update badge dimensions in native canvas pixels
    const pixelW = Math.round(this.cropData.width * this.canvas.width);
    const pixelH = Math.round(this.cropData.height * this.canvas.height);
    if (this.badge) {
      this.badge.textContent = `${pixelW} × ${pixelH} px`;
    }
  }

  initEvents() {
    const onPointerDown = (e) => {
      e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      if (e.target.dataset.handle) {
        this.activeHandle = e.target.dataset.handle;
      } else if (e.target === this.cropBox || this.cropBox.contains(e.target)) {
        this.isDragging = true;
      } else {
        return;
      }

      this.dragStart = { x: clientX, y: clientY };
      this.cropBoxStart = { ...this.cropData };

      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('touchmove', onPointerMove, { passive: false });
      window.addEventListener('mouseup', onPointerUp);
      window.addEventListener('touchend', onPointerUp);
    };

    const onPointerMove = (e) => {
      e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const rect = this.canvas.getBoundingClientRect();
      const deltaNormX = (clientX - this.dragStart.x) / rect.width;
      const deltaNormY = (clientY - this.dragStart.y) / rect.height;

      if (this.isDragging) {
        // Move entire crop box
        let newX = this.cropBoxStart.x + deltaNormX;
        let newY = this.cropBoxStart.y + deltaNormY;

        newX = Math.max(0, Math.min(1 - this.cropBoxStart.width, newX));
        newY = Math.max(0, Math.min(1 - this.cropBoxStart.height, newY));

        this.cropData.x = newX;
        this.cropData.y = newY;
      } else if (this.activeHandle) {
        let { x, y, width, height } = this.cropBoxStart;
        const handle = this.activeHandle;

        if (handle.includes('e')) width += deltaNormX;
        if (handle.includes('s')) height += deltaNormY;
        if (handle.includes('w')) {
          const clamped = Math.min(x + width - 0.05, x + deltaNormX);
          width -= (clamped - x);
          x = clamped;
        }
        if (handle.includes('n')) {
          const clamped = Math.min(y + height - 0.05, y + deltaNormY);
          height -= (clamped - y);
          y = clamped;
        }

        // Clamp minimum size
        width = Math.max(0.05, width);
        height = Math.max(0.05, height);

        // Aspect ratio constraint
        if (this.activeRatio !== 'free') {
          let ratio = 1;
          if (this.activeRatio === '1:1' || this.activeRatio === 'circle') ratio = 1;
          else if (this.activeRatio === '16:9') ratio = 16 / 9;
          else if (this.activeRatio === '9:16') ratio = 9 / 16;
          else if (this.activeRatio === '4:3') ratio = 4 / 3;
          else if (this.activeRatio === '4:5') ratio = 4 / 5;

          const imgAspect = this.canvas.width / this.canvas.height;
          height = width * (imgAspect / ratio);
        }

        // Keep inside bounds [0..1]
        x = Math.max(0, Math.min(1 - width, x));
        y = Math.max(0, Math.min(1 - height, y));
        width = Math.min(1 - x, width);
        height = Math.min(1 - y, height);

        this.cropData = { x, y, width, height };
      }

      this.updateBoxFromCropData();
    };

    const onPointerUp = () => {
      this.isDragging = false;
      this.activeHandle = null;
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchend', onPointerUp);
    };

    this.cropBox.addEventListener('mousedown', onPointerDown);
    this.cropBox.addEventListener('touchstart', onPointerDown, { passive: false });
  }

  // Get cropped canvas
  getCroppedCanvas() {
    const sx = Math.round(this.cropData.x * this.canvas.width);
    const sy = Math.round(this.cropData.y * this.canvas.height);
    const sw = Math.round(this.cropData.width * this.canvas.width);
    const sh = Math.round(this.cropData.height * this.canvas.height);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = sw;
    outCanvas.height = sh;
    const ctx = outCanvas.getContext('2d');

    if (this.activeRatio === 'circle') {
      // Circular clip
      ctx.beginPath();
      ctx.arc(sw / 2, sh / 2, Math.min(sw, sh) / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    ctx.drawImage(this.canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    return outCanvas;
  }

  // Get current pixel coordinates of the crop/selection box
  getCropPixelRect() {
    const sx = Math.round(this.cropData.x * this.canvas.width);
    const sy = Math.round(this.cropData.y * this.canvas.height);
    const sw = Math.round(this.cropData.width * this.canvas.width);
    const sh = Math.round(this.cropData.height * this.canvas.height);
    return { x: sx, y: sy, width: sw, height: sh };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ImageCropper };
}
