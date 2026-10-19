/**
 * Codemons UI Scaling System
 * Scales the entire interface as one unit based on reference dimensions (778 x 748).
 * Automatically cancels out browser zoom and maintains unified proportions.
 */
(function () {
  const REF_W = 778;
  const REF_H = 748;
  const REF_DUAL_W = 1470;
  const REF_DUAL_H = 840;
  const BASE_SCALE = 0.67;
  const MIN_SCALE = 0.45;
  const MAX_SCALE = 1.4;

  // Minimum readable size rules:
  // Calibrated to 0.62 so it does not artificially force oversized elements on standard desktop displays
  const MIN_READABLE_SCALE = 0.62;

  function snapCanvasPixelScale() {
    const canvas = document.getElementById('game-canvas');
    const viewport = document.querySelector('.canvas-viewport');
    if (!canvas || !viewport) return;
    const vpRect = viewport.getBoundingClientRect();
    if (vpRect.width <= 0 || vpRect.height <= 0) return;

    // Available space inside viewport with padding margins
    const padX = 16;
    const padY = 16;
    const availW = Math.max(0, vpRect.width - padX);
    const availH = Math.max(0, vpRect.height - padY);
    const maxMultiple = Math.floor(Math.min(availW / 160, availH / 144));

    if (maxMultiple >= 2) {
      const w = 160 * maxMultiple;
      const h = 144 * maxMultiple;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    } else {
      canvas.style.width = '';
      canvas.style.height = '';
    }
  }

  function applyScale() {
    const isSmallScreen = window.innerWidth < 900 || window.innerHeight > window.innerWidth;
    
    // Small Screen Fallback: When < 900px or taller than wide, scale by window width only
    let rawScale;
    if (isSmallScreen) {
      rawScale = (window.innerWidth / REF_W) * BASE_SCALE;
    } else {
      // In dual-panel mode, calibrate rawScale around target compact density (~0.67)
      // so typical laptop/desktop screens (1280px-1920px width, 650px-900px height at 100% zoom)
      // compute to approximately 0.66-0.70 rather than clamping at 0.80 or higher.
      const ratio = Math.min(window.innerWidth / REF_DUAL_W, window.innerHeight / REF_DUAL_H);
      rawScale = BASE_SCALE * Math.pow(ratio, 0.12);
      // Fallback formula preservation: Math.min(window.innerWidth / REF_W, window.innerHeight / REF_H)
      
      // Raise scale if computed value would break minimum readable text sizes
      if (rawScale < MIN_READABLE_SCALE) {
        rawScale = MIN_READABLE_SCALE;
      }
    }

    const scale = Math.min(Math.max(rawScale, MIN_SCALE), MAX_SCALE);
    document.documentElement.style.setProperty('--ui-scale', scale.toFixed(4));
    document.documentElement.classList.toggle('stacked-layout', isSmallScreen);

    // Round battle canvas to integer multiple of 160x144 for pixel crispness
    snapCanvasPixelScale();

    return scale;
  }

  // Run immediately before first paint
  applyScale();

  // Resize throttling with requestAnimationFrame
  let rAF = null;
  function onResize() {
    if (rAF !== null) return;
    rAF = requestAnimationFrame(() => {
      applyScale();
      rAF = null;
    });
  }

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => {
    applyScale();
  });

  // Debug helper to inspect current scale metrics
  window.debugScale = function () {
    const currentScale = getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim();
    const info = {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      '--ui-scale': currentScale
    };
    console.log('[Codemons UI Scale]', info);
    return info;
  };

  // Set up ResizeObserver on .canvas-viewport once DOM is ready
  function initViewportObserver() {
    const viewport = document.querySelector('.canvas-viewport');
    if (!viewport) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initViewportObserver, { once: true });
      }
      return;
    }
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        snapCanvasPixelScale();
      });
      ro.observe(viewport);
    }
    snapCanvasPixelScale();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initViewportObserver, { once: true });
  } else {
    initViewportObserver();
  }

  window.applyScale = applyScale;
  window.snapCanvasPixelScale = snapCanvasPixelScale;
})();
