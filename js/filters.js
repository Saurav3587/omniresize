/**
 * OmniResize Studio - Filters, Color Adjustments & Watermarking Engine
 */

const FiltersEngine = {
  // Apply adjustments to an existing canvas context
  applyAdjustments(ctx, width, height, options = {}) {
    const {
      brightness = 100,
      contrast = 100,
      saturation = 100,
      warmth = 0,
      blur = 0,
      filter = 'none'
    } = options;

    // Use CSS filter string on canvas context for GPU-accelerated rendering
    let filterParts = [];

    if (brightness !== 100) filterParts.push(`brightness(${brightness}%)`);
    if (contrast !== 100) filterParts.push(`contrast(${contrast}%)`);
    if (saturation !== 100) filterParts.push(`saturate(${saturation}%)`);
    if (warmth > 0) filterParts.push(`sepia(${warmth}%)`);
    if (blur > 0) filterParts.push(`blur(${blur}px)`);

    // Add preset filters & cinematic color grade LUTs
    switch (filter) {
      case 'teal-orange':
        filterParts.push('contrast(118%) saturate(125%) hue-rotate(-10deg) sepia(15%) brightness(102%)');
        break;
      case 'golden-hour':
      case 'warm':
        filterParts.push('sepia(35%) saturate(140%) brightness(104%) contrast(105%)');
        break;
      case 'kodak-chrome':
        filterParts.push('contrast(120%) saturate(130%) sepia(12%) brightness(102%)');
        break;
      case 'film-noir':
        filterParts.push('grayscale(100%) contrast(155%) brightness(90%)');
        break;
      case 'cyberpunk':
        filterParts.push('hue-rotate(285deg) contrast(140%) saturate(175%) brightness(105%)');
        break;
      case 'nordic-cold':
      case 'cold':
        filterParts.push('hue-rotate(185deg) saturate(88%) contrast(108%) brightness(98%)');
        break;
      case 'emerald':
        filterParts.push('hue-rotate(75deg) saturate(115%) contrast(110%) brightness(98%)');
        break;
      case 'dramatic':
        filterParts.push('contrast(150%) saturate(120%) brightness(90%)');
        break;
      case 'vintage':
        filterParts.push('sepia(45%) contrast(110%) brightness(95%) saturate(85%)');
        break;
      case 'grayscale':
        filterParts.push('grayscale(100%)');
        break;
      case 'invert':
        filterParts.push('invert(100%)');
        break;
    }

    return filterParts.join(' ') || 'none';
  },

  // Draw Watermark (Text or Image) onto canvas
  drawWatermark(ctx, canvasWidth, canvasHeight, options = {}) {
    if (!options.enabled) return;

    ctx.save();
    ctx.globalAlpha = (options.opacity || 60) / 100;

    const margin = Math.max(16, Math.round(Math.min(canvasWidth, canvasHeight) * 0.03));
    const anchor = options.anchor || 'br';

    if (options.type === 'text' && options.text) {
      const text = options.text;
      const fontSize = options.fontSize || 32;
      const color = options.color || '#ffffff';

      ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      const metrics = ctx.measureText(text);
      const textWidth = metrics.width;
      const textHeight = fontSize;

      let x = margin;
      let y = margin + textHeight;

      // Calculate anchor positions
      // Top row
      if (anchor === 'tl') {
        x = margin;
        y = margin + textHeight;
      } else if (anchor === 'tc') {
        x = (canvasWidth - textWidth) / 2;
        y = margin + textHeight;
      } else if (anchor === 'tr') {
        x = canvasWidth - textWidth - margin;
        y = margin + textHeight;
      }
      // Middle row
      else if (anchor === 'ml') {
        x = margin;
        y = canvasHeight / 2 + textHeight / 3;
      } else if (anchor === 'mc') {
        x = (canvasWidth - textWidth) / 2;
        y = canvasHeight / 2 + textHeight / 3;
      } else if (anchor === 'mr') {
        x = canvasWidth - textWidth - margin;
        y = canvasHeight / 2 + textHeight / 3;
      }
      // Bottom row
      else if (anchor === 'bl') {
        x = margin;
        y = canvasHeight - margin;
      } else if (anchor === 'bc') {
        x = (canvasWidth - textWidth) / 2;
        y = canvasHeight - margin;
      } else if (anchor === 'br') {
        x = canvasWidth - textWidth - margin;
        y = canvasHeight - margin;
      }

      ctx.fillText(text, x, y);
    } else if (options.type === 'image' && options.imageElement) {
      const img = options.imageElement;
      const scalePercent = (options.imageScale || 20) / 100;
      const targetWidth = canvasWidth * scalePercent;
      const targetHeight = (targetWidth / img.width) * img.height;

      let x = margin;
      let y = margin;

      if (anchor === 'tl') {
        x = margin;
        y = margin;
      } else if (anchor === 'tc') {
        x = (canvasWidth - targetWidth) / 2;
        y = margin;
      } else if (anchor === 'tr') {
        x = canvasWidth - targetWidth - margin;
        y = margin;
      } else if (anchor === 'ml') {
        x = margin;
        y = (canvasHeight - targetHeight) / 2;
      } else if (anchor === 'mc') {
        x = (canvasWidth - targetWidth) / 2;
        y = (canvasHeight - targetHeight) / 2;
      } else if (anchor === 'mr') {
        x = canvasWidth - targetWidth - margin;
        y = (canvasHeight - targetHeight) / 2;
      } else if (anchor === 'bl') {
        x = margin;
        y = canvasHeight - targetHeight - margin;
      } else if (anchor === 'bc') {
        x = (canvasWidth - targetWidth) / 2;
        y = canvasHeight - targetHeight - margin;
      } else if (anchor === 'br') {
        x = canvasWidth - targetWidth - margin;
        y = canvasHeight - targetHeight - margin;
      }

      ctx.drawImage(img, x, y, targetWidth, targetHeight);
    }

    ctx.restore();
  },

  // 1. Magic Background Eraser (Chroma / Color Key Removal)
  eraseBackgroundColor(sourceCanvas, targetHex = '#ffffff', tolerance = 25, feather = 2) {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = sourceCanvas.width;
    outCanvas.height = sourceCanvas.height;
    const ctx = outCanvas.getContext('2d');
    ctx.drawImage(sourceCanvas, 0, 0);

    const imgData = ctx.getImageData(0, 0, outCanvas.width, outCanvas.height);
    const data = imgData.data;

    // Parse target hex
    let hex = targetHex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const targetR = parseInt(hex.substring(0, 2), 16) || 255;
    const targetG = parseInt(hex.substring(2, 4), 16) || 255;
    const targetB = parseInt(hex.substring(4, 6), 16) || 255;

    const maxDist = 441.67; // sqrt(255^2 + 255^2 + 255^2)
    const tolDist = (tolerance / 100) * maxDist;
    const featherDist = (feather / 10) * 40; // Soft edge distance

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a === 0) continue;

      const dr = r - targetR;
      const dg = g - targetG;
      const db = b - targetB;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);

      if (dist <= tolDist) {
        data[i + 3] = 0; // Completely transparent
      } else if (dist < tolDist + featherDist && featherDist > 0) {
        const factor = (dist - tolDist) / featherDist;
        data[i + 3] = Math.round(a * factor);
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return outCanvas;
  },

  // 2. Extract Dominant Color Palette
  extractDominantColors(canvas, numColors = 6) {
    const ctx = canvas.getContext('2d');
    // Sample down for fast processing
    const sampleW = Math.min(100, canvas.width);
    const sampleH = Math.min(100, canvas.height);
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = sampleW;
    sampleCanvas.height = sampleH;
    const sCtx = sampleCanvas.getContext('2d');
    sCtx.drawImage(canvas, 0, 0, sampleW, sampleH);

    const imgData = sCtx.getImageData(0, 0, sampleW, sampleH).data;
    const colorCounts = {};

    for (let i = 0; i < imgData.length; i += 16) { // Step every 4 pixels
      const a = imgData[i + 3];
      if (a < 128) continue; // Skip transparent

      // Quantize to 5-bit depth to cluster similar colors
      const r = Math.round(imgData[i] / 16) * 16;
      const g = Math.round(imgData[i + 1] / 16) * 16;
      const b = Math.round(imgData[i + 2] / 16) * 16;

      const key = `${r},${g},${b}`;
      colorCounts[key] = (colorCounts[key] || 0) + 1;
    }

    // Sort by count
    const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);

    const palette = [];
    for (const [key] of sorted) {
      if (palette.length >= numColors) break;
      const [r, g, b] = key.split(',').map(Number);
      const toHex = (c) => Math.min(255, c).toString(16).padStart(2, '0');
      const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      
      // Avoid almost identical shades
      const tooClose = palette.some(p => {
        const dr = p.r - r;
        const dg = p.g - g;
        const db = p.b - b;
        return Math.sqrt(dr * dr + dg * dg + db * db) < 35;
      });

      if (!tooClose) {
        palette.push({ hex, r, g, b });
      }
    }

    return palette;
  },

  // 3. Render Classic Meme Text
  drawMemeText(ctx, canvasWidth, canvasHeight, options = {}) {
    if (!options.enabled) return;

    ctx.save();
    const fontSize = options.fontSize || 48;
    ctx.font = `900 ${fontSize}px Impact, "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.1));
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 2;

    const margin = Math.round(canvasHeight * 0.05);

    // Top text
    if (options.topText && options.topText.trim()) {
      const topStr = options.topText.trim().toUpperCase();
      const y = margin + fontSize;
      ctx.strokeText(topStr, canvasWidth / 2, y);
      ctx.fillText(topStr, canvasWidth / 2, y);
    }

    // Bottom text
    if (options.bottomText && options.bottomText.trim()) {
      const btmStr = options.bottomText.trim().toUpperCase();
      const y = canvasHeight - margin;
      ctx.strokeText(btmStr, canvasWidth / 2, y);
      ctx.fillText(btmStr, canvasWidth / 2, y);
    }

    ctx.restore();
  },

  // 4. Canvas Padding, Blurred Margins, Borders & Shadows
  applyFrameAndPadding(sourceCanvas, options = {}) {
    const {
      aspectRatio = 'original', // 'original', '1:1', '9:16', '16:9', '4:5'
      padStyle = 'blur', // 'blur', 'solid', 'gradient'
      solidColor = '#0f172a',
      padding = 0,
      cornerRadius = 0,
      borderWidth = 0,
      borderColor = '#ffffff',
      isPolaroid = false,
      polaroidCaption = '',
      hasShadow = false,
      shadowBlur = 25
    } = options;

    // Check if any frame or padding option is active
    const isAspectDifferent = aspectRatio !== 'original';
    if (!isAspectDifferent && padding === 0 && cornerRadius === 0 && borderWidth === 0 && !isPolaroid && !hasShadow) {
      return sourceCanvas;
    }

    const sw = sourceCanvas.width;
    const sh = sourceCanvas.height;

    // Compute target dimensions for outer container
    let outerW = sw;
    let outerH = sh;

    if (isAspectDifferent) {
      let targetRatio = 1;
      if (aspectRatio === '1:1') targetRatio = 1;
      else if (aspectRatio === '9:16') targetRatio = 9 / 16;
      else if (aspectRatio === '16:9') targetRatio = 16 / 9;
      else if (aspectRatio === '4:5') targetRatio = 4 / 5;

      const currentRatio = sw / sh;
      if (currentRatio > targetRatio) {
        // Image is wider than container ratio: height grows
        outerW = sw;
        outerH = Math.round(sw / targetRatio);
      } else {
        // Image is taller than container ratio: width grows
        outerH = sh;
        outerW = Math.round(sh * targetRatio);
      }
    }

    // Add extra margin/padding
    const totalPad = Math.max(0, padding) * 2;
    outerW += totalPad;
    outerH += totalPad;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = outerW;
    outCanvas.height = outerH;
    const ctx = outCanvas.getContext('2d');

    // 1. Draw Background
    if (isAspectDifferent || padding > 0) {
      if (padStyle === 'blur') {
        ctx.save();
        ctx.filter = 'blur(30px) brightness(0.65) saturate(1.2)';
        // Draw stretched & centered background
        const scale = Math.max(outerW / sw, outerH / sh) * 1.15;
        const bgW = sw * scale;
        const bgH = sh * scale;
        ctx.drawImage(sourceCanvas, (outerW - bgW) / 2, (outerH - bgH) / 2, bgW, bgH);
        ctx.restore();
      } else if (padStyle === 'solid') {
        ctx.fillStyle = solidColor;
        ctx.fillRect(0, 0, outerW, outerH);
      } else if (padStyle === 'gradient') {
        const grad = ctx.createLinearGradient(0, 0, outerW, outerH);
        grad.addColorStop(0, '#312e81');
        grad.addColorStop(0.5, '#4f46e5');
        grad.addColorStop(1, '#06b6d4');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, outerW, outerH);
      }
    }

    // 2. Position inner image centered
    let innerX = Math.round((outerW - sw) / 2);
    let innerY = Math.round((outerH - sh) / 2);

    // Polaroid frame mode
    if (isPolaroid) {
      const polBorder = Math.max(16, Math.round(Math.min(sw, sh) * 0.05));
      const polBottom = Math.max(60, Math.round(Math.min(sw, sh) * 0.18));

      const polX = innerX - polBorder;
      const polY = innerY - polBorder;
      const polW = sw + polBorder * 2;
      const polH = sh + polBorder + polBottom;

      ctx.save();
      if (hasShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetY = 10;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(polX, polY, polW, polH);
      ctx.restore();

      // Draw original image
      ctx.drawImage(sourceCanvas, innerX, innerY);

      // Draw polaroid caption
      if (polaroidCaption) {
        ctx.save();
        ctx.fillStyle = '#1e293b';
        ctx.font = `600 ${Math.max(16, Math.round(polBottom * 0.35))}px "Plus Jakarta Sans", cursive, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(polaroidCaption, innerX + sw / 2, innerY + sh + (polBottom * 0.65));
        ctx.restore();
      }
      return outCanvas;
    }

    // Standard Inner Image with Rounded Corners & Shadow
    ctx.save();
    if (hasShadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetY = 8;
    }

    if (cornerRadius > 0) {
      ctx.beginPath();
      const r = Math.min(cornerRadius, sw / 2, sh / 2);
      ctx.roundRect(innerX, innerY, sw, sh, r);
      ctx.closePath();
      ctx.clip();
    }

    ctx.drawImage(sourceCanvas, innerX, innerY);

    if (borderWidth > 0) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.stroke();
    }
    ctx.restore();

    return outCanvas;
  },

  // 5. Privacy Censor Box (Pixelate Mosaic, Heavy Blur, Blackout)
  applyCensorToRegion(sourceCanvas, rect, type = 'pixelate', intensity = 16) {
    const out = document.createElement('canvas');
    out.width = sourceCanvas.width;
    out.height = sourceCanvas.height;
    const ctx = out.getContext('2d');
    ctx.drawImage(sourceCanvas, 0, 0);

    const rx = Math.max(0, Math.round(rect.x));
    const ry = Math.max(0, Math.round(rect.y));
    const rw = Math.min(out.width - rx, Math.round(rect.width));
    const rh = Math.min(out.height - ry, Math.round(rect.height));

    if (rw <= 0 || rh <= 0) return out;

    if (type === 'blackout') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(rx, ry, rw, rh);
      return out;
    }

    if (type === 'pixelate') {
      const blockSize = Math.max(4, Math.round(intensity));
      const imgData = ctx.getImageData(rx, ry, rw, rh);
      const data = imgData.data;

      for (let by = 0; by < rh; by += blockSize) {
        for (let bx = 0; bx < rw; bx += blockSize) {
          // Calculate average color in block
          let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
          const bw = Math.min(blockSize, rw - bx);
          const bh = Math.min(blockSize, rh - by);

          for (let py = 0; py < bh; py++) {
            for (let px = 0; px < bw; px++) {
              const idx = ((by + py) * rw + (bx + px)) * 4;
              rSum += data[idx];
              gSum += data[idx + 1];
              bSum += data[idx + 2];
              aSum += data[idx + 3];
              count++;
            }
          }

          const avgR = Math.round(rSum / count);
          const avgG = Math.round(gSum / count);
          const avgB = Math.round(bSum / count);
          const avgA = Math.round(aSum / count);

          // Fill block with average
          for (let py = 0; py < bh; py++) {
            for (let px = 0; px < bw; px++) {
              const idx = ((by + py) * rw + (bx + px)) * 4;
              data[idx] = avgR;
              data[idx + 1] = avgG;
              data[idx + 2] = avgB;
              data[idx + 3] = avgA;
            }
          }
        }
      }
      ctx.putImageData(imgData, rx, ry);
      return out;
    }

    if (type === 'blur') {
      // Step-down and stretch blur
      const small = document.createElement('canvas');
      const scale = Math.max(0.04, 1 / (intensity || 16));
      small.width = Math.max(1, Math.round(rw * scale));
      small.height = Math.max(1, Math.round(rh * scale));
      const sCtx = small.getContext('2d');
      sCtx.drawImage(out, rx, ry, rw, rh, 0, 0, small.width, small.height);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(small, 0, 0, small.width, small.height, rx, ry, rw, rh);
      ctx.restore();
      return out;
    }

    return out;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FiltersEngine };
}
