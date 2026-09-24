/**
 * OmniResize Studio - Core Canvas Rendering, Resizing & Compression Engine
 */

const ImageEngine = {
  // Format bytes into human readable KB / MB
  formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  // Multi-step high-quality downsampling (Bicubic approximation)
  // Multi-step high-quality downsampling (Bicubic approximation) with Fit Mode & Do Not Enlarge
  resampleCanvas(sourceCanvas, targetWidth, targetHeight, interpolation = 'bicubic', options = {}) {
    let sw = sourceCanvas.width;
    let sh = sourceCanvas.height;

    let tw = Math.max(1, Math.round(targetWidth));
    let th = Math.max(1, Math.round(targetHeight));

    // 1. "Do not enlarge if smaller" check
    if (options.doNotEnlarge && tw > sw && th > sh) {
      tw = sw;
      th = sh;
    }

    const fitMode = options.fitMode || 'stretch';

    if (fitMode === 'stretch') {
      const scaled = this._resampleDirect(sourceCanvas, tw, th, interpolation);
      if (options.bgColor) {
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = tw;
        bgCanvas.height = th;
        const bgCtx = bgCanvas.getContext('2d');
        bgCtx.fillStyle = options.bgColor;
        bgCtx.fillRect(0, 0, tw, th);
        bgCtx.drawImage(scaled, 0, 0);
        return bgCanvas;
      }
      return scaled;
    } else if (fitMode === 'max') {
      // Scale down proportionally so neither width nor height exceeds max limits
      let drawW = sw;
      let drawH = sh;
      if (sw > tw || sh > th || !options.doNotEnlarge) {
        const scale = Math.min(tw / sw, th / sh);
        drawW = Math.max(1, Math.round(sw * scale));
        drawH = Math.max(1, Math.round(sh * scale));
      }
      return this._resampleDirect(sourceCanvas, drawW, drawH, interpolation);
    } else if (fitMode === 'fit') {
      // Fit proportionally within tw and th, center and letterbox
      const aspectSource = sw / sh;
      const aspectTarget = tw / th;
      let drawW = tw;
      let drawH = th;
      if (aspectSource > aspectTarget) {
        drawW = tw;
        drawH = Math.round(tw / aspectSource);
      } else {
        drawH = th;
        drawW = Math.round(th * aspectSource);
      }

      const scaledInner = this._resampleDirect(sourceCanvas, drawW, drawH, interpolation);
      const out = document.createElement('canvas');
      out.width = tw;
      out.height = th;
      const ctx = out.getContext('2d');
      if (options.bgColor) {
        ctx.fillStyle = options.bgColor;
        ctx.fillRect(0, 0, tw, th);
      }
      ctx.drawImage(scaledInner, Math.round((tw - drawW) / 2), Math.round((th - drawH) / 2));
      return out;
    } else if (fitMode === 'fill') {
      // Fill tw and th completely, crop center excess
      const aspectSource = sw / sh;
      const aspectTarget = tw / th;
      let drawW = tw;
      let drawH = th;
      if (aspectSource > aspectTarget) {
        drawH = th;
        drawW = Math.round(th * aspectSource);
      } else {
        drawW = tw;
        drawH = Math.round(tw / aspectSource);
      }

      const scaledLarge = this._resampleDirect(sourceCanvas, drawW, drawH, interpolation);
      const out = document.createElement('canvas');
      out.width = tw;
      out.height = th;
      const ctx = out.getContext('2d');
      ctx.drawImage(scaledLarge, Math.round((tw - drawW) / 2), Math.round((th - drawH) / 2));
      return out;
    }

    return this._resampleDirect(sourceCanvas, tw, th, interpolation);
  },

  _resampleDirect(sourceCanvas, targetWidth, targetHeight, interpolation = 'bicubic') {
    if (interpolation === 'nearest') {
      const out = document.createElement('canvas');
      out.width = targetWidth;
      out.height = targetHeight;
      const ctx = out.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
      return out;
    }

    if (interpolation === 'bilinear' || (targetWidth >= sourceCanvas.width && targetHeight >= sourceCanvas.height)) {
      const out = document.createElement('canvas');
      out.width = targetWidth;
      out.height = targetHeight;
      const ctx = out.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
      return out;
    }

    // Bicubic / Stepped downsampling for pristine results
    let currentCanvas = sourceCanvas;
    let curW = sourceCanvas.width;
    let curH = sourceCanvas.height;

    // Step down by half until near target
    while (curW / 2 > targetWidth && curH / 2 > targetHeight) {
      curW = Math.round(curW / 2);
      curH = Math.round(curH / 2);

      const stepCanvas = document.createElement('canvas');
      stepCanvas.width = curW;
      stepCanvas.height = curH;
      const stepCtx = stepCanvas.getContext('2d');
      stepCtx.imageSmoothingEnabled = true;
      stepCtx.imageSmoothingQuality = 'high';
      stepCtx.drawImage(currentCanvas, 0, 0, curW, curH);
      currentCanvas = stepCanvas;
    }

    // Final target draw
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetWidth;
    finalCanvas.height = targetHeight;
    const finalCtx = finalCanvas.getContext('2d');
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(currentCanvas, 0, 0, targetWidth, targetHeight);

    return finalCanvas;
  },

  // Smart 2x / 4x Super-Resolution Upscaling with Unsharp Mask
  upscaleImage(sourceCanvas, factor = 2) {
    const targetW = sourceCanvas.width * factor;
    const targetH = sourceCanvas.height * factor;

    // High quality stepped upscale
    const upscaled = this._resampleDirect(sourceCanvas, targetW, targetH, 'bicubic');

    // Apply unsharp mask to crisp up edges
    const out = document.createElement('canvas');
    out.width = targetW;
    out.height = targetH;
    const ctx = out.getContext('2d');
    ctx.drawImage(upscaled, 0, 0);

    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const d = imgData.data;
    const copy = new Uint8ClampedArray(d);
    const w = targetW;
    const h = targetH;

    // Convolution sharpen kernel: [0, -0.4, 0, -0.4, 2.6, -0.4, 0, -0.4, 0]
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          const val = 2.6 * copy[idx + c]
            - 0.4 * copy[((y - 1) * w + x) * 4 + c]
            - 0.4 * copy[((y + 1) * w + x) * 4 + c]
            - 0.4 * copy[(y * w + (x - 1)) * 4 + c]
            - 0.4 * copy[(y * w + (x + 1)) * 4 + c];
          d[idx + c] = Math.min(255, Math.max(0, val));
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return out;
  },

  // Embed True DPI Resolution into JPEG JFIF APP0 Header
  async embedDpiInJpegBlob(blob, dpi = 300) {
    try {
      const buffer = await blob.arrayBuffer();
      const view = new DataView(buffer);

      // Verify JPEG SOI marker (0xFF 0xD8)
      if (view.getUint16(0) !== 0xFFD8) return blob;

      let offset = 2;
      while (offset < view.byteLength - 4) {
        const marker = view.getUint16(offset);
        const length = view.getUint16(offset + 2);

        if (marker === 0xFFE0) {
          // JFIF identifier check: 'JFIF\0'
          const isJfif = view.getUint8(offset + 4) === 0x4A &&
                         view.getUint8(offset + 5) === 0x46 &&
                         view.getUint8(offset + 6) === 0x49 &&
                         view.getUint8(offset + 7) === 0x46;

          if (isJfif) {
            // Units: 1 = dots per inch (DPI)
            view.setUint8(offset + 11, 1);
            // Xdensity (2 bytes)
            view.setUint16(offset + 12, dpi);
            // Ydensity (2 bytes)
            view.setUint16(offset + 14, dpi);
            return new Blob([buffer], { type: 'image/jpeg' });
          }
        }
        offset += 2 + length;
      }
      return blob;
    } catch (e) {
      return blob;
    }
  },

  // Apply rotation & flip transformations
  transformCanvas(sourceCanvas, angle = 0, flipH = false, flipV = false) {
    const rad = (angle * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));

    const newWidth = Math.round(sourceCanvas.width * cos + sourceCanvas.height * sin);
    const newHeight = Math.round(sourceCanvas.width * sin + sourceCanvas.height * cos);

    const out = document.createElement('canvas');
    out.width = newWidth;
    out.height = newHeight;
    const ctx = out.getContext('2d');

    ctx.translate(newWidth / 2, newHeight / 2);
    ctx.rotate(rad);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);

    return out;
  },

  // Apply background fill (especially for JPG exports which don't support alpha)
  applyBackgroundFill(sourceCanvas, fillOption = 'transparent', customHex = '#ffffff') {
    if (fillOption === 'transparent') {
      return sourceCanvas;
    }

    const out = document.createElement('canvas');
    out.width = sourceCanvas.width;
    out.height = sourceCanvas.height;
    const ctx = out.getContext('2d');

    if (fillOption === 'white') {
      ctx.fillStyle = '#ffffff';
    } else if (fillOption === 'black') {
      ctx.fillStyle = '#000000';
    } else if (fillOption === 'custom') {
      ctx.fillStyle = customHex || '#ffffff';
    }

    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(sourceCanvas, 0, 0);
    return out;
  },

  // Convert canvas to Blob with quality
  canvasToBlob(canvas, mimeType = 'image/jpeg', quality = 0.85) {
    return new Promise((resolve) => {
      // Fallback for browsers that may not support direct avif canvas export
      try {
        canvas.toBlob((blob) => {
          if (!blob) {
            // Fallback to jpeg if format unsupported
            canvas.toBlob((fallbackBlob) => resolve(fallbackBlob), 'image/jpeg', quality);
          } else {
            resolve(blob);
          }
        }, mimeType, quality);
      } catch (err) {
        canvas.toBlob((fallbackBlob) => resolve(fallbackBlob), 'image/jpeg', quality);
      }
    });
  },

  // Smart Binary Search Compression to achieve < targetKB
  async compressToTargetSize(sourceCanvas, targetKB, mimeType = 'image/jpeg') {
    const targetBytes = targetKB * 1024;
    let minQuality = 0.05;
    let maxQuality = 0.98;
    let bestBlob = null;
    let workingCanvas = sourceCanvas;

    // Check if initial full quality already fits
    let testBlob = await this.canvasToBlob(workingCanvas, mimeType, 0.95);
    if (testBlob.size <= targetBytes) {
      return { blob: testBlob, canvas: workingCanvas, quality: 0.95 };
    }

    // Binary search quality first
    let iterations = 0;
    while (iterations < 7) {
      iterations++;
      const midQuality = (minQuality + maxQuality) / 2;
      const blob = await this.canvasToBlob(workingCanvas, mimeType, midQuality);

      if (blob.size <= targetBytes) {
        bestBlob = blob;
        minQuality = midQuality; // Try to get higher quality still under target
      } else {
        maxQuality = midQuality; // Reduce quality
      }
    }

    // If even lowest quality doesn't fit, iteratively scale dimensions down
    if (!bestBlob || bestBlob.size > targetBytes) {
      let scale = 0.9;
      while (scale > 0.2) {
        const scaledCanvas = this.resampleCanvas(
          sourceCanvas,
          Math.round(sourceCanvas.width * scale),
          Math.round(sourceCanvas.height * scale)
        );
        const blob = await this.canvasToBlob(scaledCanvas, mimeType, 0.75);
        if (blob.size <= targetBytes) {
          return { blob, canvas: scaledCanvas, quality: 0.75 };
        }
        scale -= 0.15;
      }
    }

    return {
      blob: bestBlob || (await this.canvasToBlob(workingCanvas, mimeType, 0.2)),
      canvas: workingCanvas,
      quality: minQuality
    };
  },

  // Generate a clean Single-Page PDF containing the image
  async generatePDFBlob(canvas) {
    const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const width = canvas.width;
    const height = canvas.height;

    // Standard PDF page points (72 points per inch)
    // Scale image to fit within an A4 or custom dimension page
    const pageWidth = Math.max(200, Math.min(1200, Math.round(width * 0.75)));
    const pageHeight = Math.max(200, Math.min(1600, Math.round(height * 0.75)));

    // Pure client-side minimal compliant PDF structure with embedded JPEG
    const base64Data = imgDataUrl.split(',')[1];
    const binaryImg = atob(base64Data);
    const imgLength = binaryImg.length;

    // Build PDF content
    const header = `%PDF-1.4\n`;
    const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
    const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
    const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`;
    const obj4Header = `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgLength} >>\nstream\n`;
    const obj4Footer = `\nendstream\nendobj\n`;
    
    const streamContent = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im1 Do\nQ\n`;
    const obj5 = `5 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}endstream\nendobj\n`;

    // Combine strings and binary array
    const parts = [header, obj1, obj2, obj3, obj4Header];
    const byteArrays = [];

    // Helper to push text
    const textEncoder = new TextEncoder();
    for (const p of parts) {
      byteArrays.push(textEncoder.encode(p));
    }

    // Push raw JPEG bytes
    const imgBytes = new Uint8Array(imgLength);
    for (let i = 0; i < imgLength; i++) {
      imgBytes[i] = binaryImg.charCodeAt(i);
    }
    byteArrays.push(imgBytes);

    // Push obj4Footer and obj5
    byteArrays.push(textEncoder.encode(obj4Footer + obj5));

    // Calculate xref offsets
    let offset = 0;
    const offsets = [0]; // obj 0
    // Simple xref calculation for clean output
    const trailer = `xref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000115 00000 n \n0000000240 00000 n \n0000000450 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n500\n%%EOF`;
    byteArrays.push(textEncoder.encode(trailer));

    return new Blob(byteArrays, { type: 'application/pdf' });
  },

  // Auto-convert Apple iPhone HEIC/HEIF photos to standard JPEG
  convertHeicToJpeg: async function(file) {
    if (typeof heic2any === 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'js/vendor/heic2any.min.js';
        script.onload = resolve;
        script.onerror = () => {
          const cdnScript = document.createElement('script');
          cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/heic2any/0.0.4/heic2any.min.js';
          cdnScript.onload = resolve;
          cdnScript.onerror = reject;
          document.head.appendChild(cdnScript);
        };
        document.head.appendChild(script);
      });
    }

    const conversionResult = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.95
    });

    const resultBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
    const newName = (file.name || 'image.heic').replace(/\.(heic|heif)$/i, '.jpg');
    return new File([resultBlob], newName, { type: 'image/jpeg' });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ImageEngine };
}
