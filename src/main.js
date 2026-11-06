import Lenis from 'lenis';

const TOTAL_FRAMES = 239;
const FRAME_PATH_PREFIX = '/frames/frame_';
const FRAME_EXTENSION = '.jpg';

// DOM Elements
const canvas = document.getElementById('animation-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const loader = document.getElementById('loader');
const loaderPercent = document.getElementById('loader-percent');
const loaderBar = document.getElementById('loader-bar');

// Frame Caching & State
const images = new Array(TOTAL_FRAMES + 1);
const loadedFlags = new Array(TOTAL_FRAMES + 1).fill(false);
let loadedCount = 0;
let targetFrame = 1;
let currentFrame = 1;
let lastDrawnFrameIndex = -1;
let dpr = 1;

/**
 * Format frame index to 4-digit filename (frame_0001.jpg)
 */
function getFrameSrc(index) {
  const padded = String(index).padStart(4, '0');
  return `${FRAME_PATH_PREFIX}${padded}${FRAME_EXTENSION}`;
}

/**
 * Resize and scale canvas for high-DPI displays
 */
function resizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  lastDrawnFrameIndex = -1;
  renderFrame(Math.round(currentFrame));

  if (lenis) {
    lenis.resize();
  }
}

/**
 * Draw image with centered 'cover' aspect ratio fitting
 */
function renderImageToCanvas(img) {
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const imgWidth = img.naturalWidth;
  const imgHeight = img.naturalHeight;

  // Cover aspect-ratio math
  const scale = Math.max(width / imgWidth, height / imgHeight);
  const drawWidth = imgWidth * scale;
  const drawHeight = imgHeight * scale;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  ctx.restore();
}

/**
 * Find nearest loaded frame to eliminate any blank frames
 */
function getNearestLoadedImage(targetIdx) {
  if (loadedFlags[targetIdx] && images[targetIdx]) {
    return { img: images[targetIdx], index: targetIdx };
  }

  for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
    const prev = targetIdx - offset;
    if (prev >= 1 && loadedFlags[prev] && images[prev]) {
      return { img: images[prev], index: prev };
    }
    const next = targetIdx + offset;
    if (next <= TOTAL_FRAMES && loadedFlags[next] && images[next]) {
      return { img: images[next], index: next };
    }
  }

  return null;
}

/**
 * Render frame by index
 */
function renderFrame(index) {
  const clamped = Math.min(Math.max(1, index), TOTAL_FRAMES);
  const match = getNearestLoadedImage(clamped);

  if (match && match.index !== lastDrawnFrameIndex) {
    renderImageToCanvas(match.img);
    lastDrawnFrameIndex = match.index;
  }
}

/**
 * Initialize Lenis for smooth momentum scrolling
 */
let lenis;
try {
  lenis = new Lenis({
    duration: 1.25,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    touchMultiplier: 1.4,
  });

  lenis.on('scroll', onScroll);
} catch (e) {
  console.warn('Lenis fallback to native scroll', e);
  window.addEventListener('scroll', onScroll, { passive: true });
}

function onScroll() {
  const scrollY = lenis ? lenis.scroll : window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? Math.min(Math.max(scrollY / maxScroll, 0), 1) : 0;

  targetFrame = 1 + progress * (TOTAL_FRAMES - 1);
  updateActiveNavLink();
  updateAboutWordReveal();
  triggerStatsCounter();
}

/**
 * Smooth anchor scrolling for in-page navigation links
 */
function initAnchorLinks() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#' || targetId === '') {
        e.preventDefault();
        if (lenis) lenis.scrollTo(0, { duration: 1.2 });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        if (lenis) {
          lenis.scrollTo(targetEl, { offset: -60, duration: 1.3 });
        } else {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
}

/**
 * Update active state on navigation pill
 */
function updateActiveNavLink() {
  const sections = ['hero', 'about', 'skills', 'certifications', 'projects', 'contact'];
  const scrollPosition = (lenis ? lenis.scroll : window.scrollY) + window.innerHeight * 0.35;

  let activeSection = 'hero';
  for (const id of sections) {
    const el = document.getElementById(id);
    if (el) {
      const top = el.offsetTop;
      const height = el.offsetHeight;
      if (scrollPosition >= top && scrollPosition < top + height) {
        activeSection = id;
      }
    }
  }

  document.querySelectorAll('.nav-link').forEach((link) => {
    const href = link.getAttribute('href').replace('#', '');
    if (href === activeSection) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Apple-style Word-by-Word Scroll Reveal in About Section
 */
let aboutWords = [];
function initAboutWordReveal() {
  const statement = document.getElementById('about-statement-text');
  if (!statement) return;

  const originalHtml = statement.innerHTML;
  // Parse nodes and wrap individual words in .about-word spans
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = originalHtml;

  function wrapText(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const words = text.split(/(\s+)/);
      const fragment = document.createDocumentFragment();

      words.forEach((word) => {
        if (word.trim().length > 0) {
          const span = document.createElement('span');
          span.className = 'about-word';
          span.textContent = word;
          fragment.appendChild(span);
        } else if (word.length > 0) {
          fragment.appendChild(document.createTextNode(word));
        }
      });

      node.parentNode.replaceChild(fragment, node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      Array.from(node.childNodes).forEach(wrapText);
    }
  }

  Array.from(tempDiv.childNodes).forEach(wrapText);
  statement.innerHTML = tempDiv.innerHTML;
  aboutWords = Array.from(statement.querySelectorAll('.about-word'));
}

function updateAboutWordReveal() {
  const aboutSection = document.getElementById('about');
  if (!aboutSection || aboutWords.length === 0) return;

  const rect = aboutSection.getBoundingClientRect();
  const windowHeight = window.innerHeight;

  // Calculate progress as section passes through viewport
  const start = windowHeight * 0.85;
  const end = windowHeight * 0.15;
  const progress = Math.min(Math.max((start - rect.top) / (start - end + rect.height * 0.3), 0), 1);

  const wordsToReveal = Math.floor(progress * aboutWords.length);
  aboutWords.forEach((word, index) => {
    if (index <= wordsToReveal) {
      word.classList.add('is-revealed');
    } else {
      word.classList.remove('is-revealed');
    }
  });
}

/**
 * Quick Stats Count-Up Animation
 */
let statsAnimated = false;
function triggerStatsCounter() {
  if (statsAnimated) return;
  const statsEl = document.querySelector('.about-quick-stats');
  if (!statsEl) return;

  const rect = statsEl.getBoundingClientRect();
  if (rect.top < window.innerHeight * 0.9) {
    statsAnimated = true;
    document.querySelectorAll('.stat-number').forEach((numEl) => {
      const target = parseFloat(numEl.getAttribute('data-count'));
      const isDecimal = String(target).includes('.');
      const duration = 1600;
      const startTime = performance.now();

      function updateNumber(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = (target * easeOut);

        numEl.textContent = isDecimal ? currentVal.toFixed(1) : Math.floor(currentVal);

        if (progress < 1) {
          requestAnimationFrame(updateNumber);
        } else {
          numEl.textContent = target;
        }
      }
      requestAnimationFrame(updateNumber);
    });
  }
}

/**
 * 3D Card Tilt & Specular Mouse Reflection
 */
function initInteractiveTiltCards() {
  const tiltCards = document.querySelectorAll('[data-tilt]');

  tiltCards.forEach((card) => {
    let bounds;

    function onMouseEnter() {
      bounds = card.getBoundingClientRect();
    }

    function onMouseMove(e) {
      if (!bounds) bounds = card.getBoundingClientRect();

      const mouseX = e.clientX - bounds.left;
      const mouseY = e.clientY - bounds.top;

      // Update spotlight position
      card.style.setProperty('--mouse-x', `${mouseX}px`);
      card.style.setProperty('--mouse-y', `${mouseY}px`);

      // 3D tilt angles
      const centerX = bounds.width / 2;
      const centerY = bounds.height / 2;
      const rotateX = ((mouseY - centerY) / centerY) * -6; // max 6deg
      const rotateY = ((mouseX - centerX) / centerX) * 6;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`;
    }

    function onMouseLeave() {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    }

    card.addEventListener('mouseenter', onMouseEnter);
    card.addEventListener('mousemove', onMouseMove);
    card.addEventListener('mouseleave', onMouseLeave);
  });
}

/**
 * Custom Magnetic Cursor Engine
 */
function initCustomCursor() {
  const dot = document.getElementById('cursor-dot');
  const follower = document.getElementById('cursor-follower');
  const label = follower ? follower.querySelector('.cursor-label') : null;

  if (!dot || !follower) return;

  let mouseX = -100;
  let mouseY = -100;
  let followerX = -100;
  let followerY = -100;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
  });

  // Follower lerp loop
  function cursorLoop() {
    followerX += (mouseX - followerX) * 0.15;
    followerY += (mouseY - followerY) * 0.15;

    follower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(cursorLoop);
  }
  requestAnimationFrame(cursorLoop);

  // Hover states
  document.querySelectorAll('[data-cursor]').forEach((el) => {
    const cursorType = el.getAttribute('data-cursor');

    el.addEventListener('mouseenter', () => {
      if (cursorType === 'hover') {
        follower.classList.add('is-hovering');
      } else if (cursorType === 'view') {
        follower.classList.add('is-viewing');
        if (label) label.textContent = 'VIEW';
      }
    });

    el.addEventListener('mouseleave', () => {
      follower.classList.remove('is-hovering', 'is-viewing');
      if (label) label.textContent = '';
    });
  });
}

/**
 * Interactive Project Filter Tabs
 */
function initProjectFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      projectCards.forEach((card) => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.classList.remove('is-hidden');
          card.style.opacity = '0';
          card.style.transform = 'translateY(15px) scale(0.97)';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = '';
          }, 50);
        } else {
          card.classList.add('is-hidden');
        }
      });

      if (lenis) lenis.resize();
    });
  });
}

/**
 * Project Details Modal Data & Controller
 */
const PROJECT_DATA = {
  'balconize': {
    title: 'Balconize: Urban Micro-Space Solar & Yield Optimizer',
    category: 'Algorithmic AgroTech & Solar Geometry',
    client: 'Touch Grass Pro Hackathon • Winner',
    img: '/assets/projects/balconize.png',
    desc: 'An urban micro-farming telemetry and yield planner engineered to help city residents transform limited apartment balconies into high-yield vertical farms. Features an algorithmic solar vector calculation engine with micro-climate telemetry, 100% local privacy fallback with 0ms latency, and zero cloud operating costs.',
    stats: [
      { val: '0ms', label: 'Local Latency' },
      { val: '100%', label: 'Local Privacy' },
      { val: '$0', label: 'Cloud Cost' },
    ],
    link: 'https://github.com',
  },
  'unihack-engine': {
    title: 'UniHack Delivery Engine: Product Intelligence to XLSX / CSV',
    category: 'Enterprise Data Engineering & PIM Automation',
    client: 'Enterprise Catalog Automation',
    img: '/assets/projects/unihack-engine.png',
    desc: 'An automated data enrichment and transformation engine that ingests bulk supplier catalogs (.csv / .xlsx) up to 200MB, normalizes unstructured taxonomy, and compiles fully populated 252-column enterprise Product Information Management (PIM) delivery spreadsheets with automated data validation and preview matrices.',
    stats: [
      { val: '252', label: 'Schema Columns' },
      { val: '200MB+', label: 'Dataset Files' },
      { val: '10,000+', label: 'Batch Items Enriched' },
    ],
    link: 'https://github.com',
  },
  'local-voice-intel': {
    title: 'LocalVoiceIntel: Custom Smart Voice Assistant',
    category: 'Generative AI, Multimodal RAG & Voice Intelligence',
    client: 'Google Gemini AI Studio Project',
    img: '/assets/projects/local-voice-intel.png',
    desc: 'A free, custom intelligent voice assistant integrating Google Gemini AI Studio with a local document knowledge base. Ingests PDFs and TXT files, indexes them into a high-density vector database, and generates real-time, context-aware spoken responses with audio synthesis and zero cloud subscription fees.',
    stats: [
      { val: '<400ms', label: 'Voice TTS Response' },
      { val: '100% Free', label: 'Gemini AI Studio' },
      { val: 'Multimodal', label: 'Document RAG' },
    ],
    link: 'https://github.com',
  },
  'eye-module': {
    title: 'Eye Module: Lossless Steganography & Cipher Suite',
    category: 'Cybersecurity, Cryptography & Digital Steganography',
    client: 'Information Security Research & Tooling',
    img: '/assets/projects/eye-module.png',
    desc: 'An interactive digital steganography application styled with an editorial cyber aesthetic. Performs least significant bit (LSB) pixel bitplane encoding to inject encrypted text messages directly into lossless image carriers without human-detectable visual noise, accompanied by a rapid decode extraction module.',
    stats: [
      { val: '0.00%', label: 'Visual Distortion' },
      { val: '256-Bit', label: 'Cipher Encryption' },
      { val: 'Instant', label: 'LSB Extraction' },
    ],
    link: 'https://github.com',
  },
};

function initProjectModal() {
  const modal = document.getElementById('project-modal');
  const modalImg = document.getElementById('modal-img');
  const modalTitle = document.getElementById('modal-title');
  const modalCategory = document.getElementById('modal-category');
  const modalClient = document.getElementById('modal-client');
  const modalDesc = document.getElementById('modal-desc');
  const modalLink = document.getElementById('modal-link');
  const closeBtn = modal ? modal.querySelector('.modal-close-btn') : null;
  const backdrop = modal ? modal.querySelector('.modal-backdrop') : null;

  if (!modal) return;

  function openModal(projectId) {
    const data = PROJECT_DATA[projectId];
    if (!data) return;

    modalImg.src = data.img;
    modalTitle.textContent = data.title;
    modalCategory.textContent = data.category;
    modalClient.textContent = `Client: ${data.client}`;
    modalDesc.textContent = data.desc;
    modalLink.href = data.link;

    if (data.stats && Array.isArray(data.stats)) {
      const statsContainer = modal.querySelector('.modal-stats');
      if (statsContainer) {
        statsContainer.innerHTML = data.stats
          .map(
            (s) => `
          <div class="modal-stat-item">
            <span class="modal-stat-val">${s.val}</span>
            <span class="modal-stat-label">${s.label}</span>
          </div>
        `
          )
          .join('');
      }
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  window.openProjectModal = openModal;

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('click', () => {
      const projectId = card.getAttribute('data-project');
      if (projectId) openModal(projectId);
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });
}

/**
 * 3D Hardcover Bookshelf Gallery (Project Section Animation)
 */
function initProjectCylinder() {
  const stage = document.getElementById('bookshelf-stage') || document.getElementById('cylinder-stage');
  const track = document.getElementById('cylinder-track');
  if (!stage || !track) return;

  const cards = Array.from(track.querySelectorAll('.book-card, .cyl-card'));
  const prevBtn = document.getElementById('cyl-prev-btn');
  const nextBtn = document.getElementById('cyl-next-btn');
  if (!cards.length) return;

  const total = cards.length;
  const center = (total - 1) / 2; // For 4 books, center is 1.5
  let activeIndex = -1;

  // Apply computed 3D book curve
  function applyCylinderTransforms() {
    const isMobile = window.innerWidth <= 768;
    cards.forEach((card, i) => {
      if (card.classList.contains('is-expanded')) return;
      const offset = i - center;
      const angleStep = isMobile ? 5 : 9.5;
      const rotY = -offset * angleStep;
      const depthFactor = isMobile ? 4 : 8;
      const tz = -Math.pow(Math.abs(offset), 1.5) * depthFactor;
      card.style.transform = `rotateY(${rotY}deg) translateZ(${tz}px)`;
    });
  }

  applyCylinderTransforms();
  window.addEventListener('resize', applyCylinderTransforms);

  // Hover expansion and interaction
  cards.forEach((card, idx) => {
    card.addEventListener('mouseenter', () => {
      cards.forEach((c) => c.classList.remove('is-expanded'));
      card.classList.add('is-expanded');
      activeIndex = idx;
    });

    card.addEventListener('mouseleave', () => {
      card.classList.remove('is-expanded');
      activeIndex = -1;
      applyCylinderTransforms();
    });

    // Mobile tap & click support
    card.addEventListener('click', (e) => {
      if (e.target.closest('.book-action-btn') || e.target.closest('.book-repo-btn') || e.target.closest('.cyl-view-btn') || e.target.closest('.cyl-link-btn')) {
        return;
      }
      if (card.classList.contains('is-expanded')) {
        const projectId = card.getAttribute('data-project');
        if (projectId && window.openProjectModal) {
          window.openProjectModal(projectId);
        }
      } else {
        cards.forEach((c) => c.classList.remove('is-expanded'));
        card.classList.add('is-expanded');
        activeIndex = idx;
      }
    });

    // View case study button
    const viewBtn = card.querySelector('.book-action-btn, .cyl-view-btn');
    if (viewBtn) {
      viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const projectId = viewBtn.getAttribute('data-project') || card.getAttribute('data-project');
        if (projectId && window.openProjectModal) {
          window.openProjectModal(projectId);
        }
      });
    }
  });

  // Prev / Next Buttons to cycle focus
  function setFocusCard(idx) {
    if (idx < 0) idx = total - 1;
    if (idx >= total) idx = 0;
    activeIndex = idx;
    cards.forEach((c, i) => {
      if (i === activeIndex) {
        c.classList.add('is-expanded');
      } else {
        c.classList.remove('is-expanded');
      }
    });
    cards[activeIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const nextIdx = activeIndex === -1 ? 0 : activeIndex - 1;
      setFocusCard(nextIdx);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const nextIdx = activeIndex === -1 ? 0 : activeIndex + 1;
      setFocusCard(nextIdx);
    });
  }

  // Interactive parallax tilt on stage mousemove
  let tiltRaf = null;
  stage.addEventListener('mousemove', (e) => {
    if (window.innerWidth <= 992) return;
    const rect = stage.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    if (tiltRaf) cancelAnimationFrame(tiltRaf);
    tiltRaf = requestAnimationFrame(() => {
      track.style.transform = `rotateY(${xPct * 6}deg)`;
    });
  });

  stage.addEventListener('mouseleave', () => {
    if (tiltRaf) cancelAnimationFrame(tiltRaf);
    track.style.transform = 'rotateY(0deg)';
  });
}

/**
 * Project View Tabs (3D Curved Gallery vs Grid View)
 */
function initProjectViewTabs() {
  const tabCyl = document.getElementById('tab-proj-cylinder');
  const tabGrid = document.getElementById('tab-proj-grid');
  const cylView = document.getElementById('project-cylinder-view');
  const gridView = document.getElementById('project-grid-view');
  const filters = document.getElementById('project-filters');

  if (!tabCyl || !tabGrid || !cylView || !gridView) return;

  tabCyl.addEventListener('click', () => {
    tabCyl.classList.add('active');
    tabGrid.classList.remove('active');
    cylView.style.display = 'block';
    gridView.style.display = 'none';
    if (filters) filters.style.display = 'none';
    if (lenis) lenis.resize();
  });

  tabGrid.addEventListener('click', () => {
    tabGrid.classList.add('active');
    tabCyl.classList.remove('active');
    cylView.style.display = 'none';
    gridView.style.display = 'grid';
    if (filters) filters.style.display = 'flex';
    if (lenis) lenis.resize();
  });
}

/**
 * Interactive Certificate Lightbox Modal
 */
function initCertificateModal() {
  const modal = document.getElementById('certificate-modal');
  if (!modal) return;

  const modalImg = document.getElementById('cert-modal-img');
  const modalTitle = document.getElementById('cert-modal-title');
  const modalIssuer = document.getElementById('cert-modal-issuer');
  const modalId = document.getElementById('cert-modal-id');
  const modalBadge = document.getElementById('cert-modal-badge');
  const modalOpenBtn = document.getElementById('cert-modal-open-btn');
  const closeBtn = document.getElementById('cert-modal-close');
  const backdrop = document.getElementById('cert-modal-backdrop');

  function openCertModal(card) {
    const src = card.getAttribute('data-cert-src');
    if (!src) return;

    const title = card.getAttribute('data-cert-title') || 'Certificate of Completion';
    const issuer = card.getAttribute('data-cert-issuer') || 'Issuing Authority';
    const id = card.getAttribute('data-cert-id') || 'Verified';
    const badge = card.getAttribute('data-cert-badge') || 'Verified Credential';

    if (modalImg) modalImg.src = src;
    if (modalTitle) modalTitle.innerHTML = title;
    if (modalIssuer) modalIssuer.innerHTML = issuer;
    if (modalId) modalId.textContent = `ID: ${id}`;
    if (modalBadge) modalBadge.textContent = badge;
    if (modalOpenBtn) modalOpenBtn.href = src;

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeCertModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.cert-card, .cert-slide-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      // Allow clicking either the card or the button inside it
      openCertModal(card);
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeCertModal);
  if (backdrop) backdrop.addEventListener('click', closeCertModal);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeCertModal();
    }
  });
}

/**
 * 3D Cascading Waterfall Controls & Interaction
 */
function initCertificateWaterfall() {
  const tabWaterfall = document.getElementById('tab-waterfall');
  const tabGrid = document.getElementById('tab-grid');
  const waterfallView = document.getElementById('cert-waterfall-view');
  const gridView = document.getElementById('cert-grid-view');
  const track = document.getElementById('cert-waterfall-track');
  const togglePlay = document.getElementById('cert-toggle-play');
  const playIcon = document.getElementById('cert-play-icon');
  const playText = document.getElementById('cert-play-text');
  const toggleDir = document.getElementById('cert-toggle-dir');

  if (!waterfallView || !track) return;

  // View toggle tabs
  if (tabWaterfall && tabGrid && gridView) {
    tabWaterfall.addEventListener('click', () => {
      tabWaterfall.classList.add('active');
      tabGrid.classList.remove('active');
      waterfallView.style.display = 'flex';
      gridView.style.display = 'none';
    });

    tabGrid.addEventListener('click', () => {
      tabGrid.classList.add('active');
      tabWaterfall.classList.remove('active');
      waterfallView.style.display = 'none';
      gridView.style.display = 'block';
    });
  }

  // Play / Pause toggle
  let isPaused = false;
  if (togglePlay && playIcon && playText) {
    togglePlay.addEventListener('click', () => {
      isPaused = !isPaused;
      if (isPaused) {
        track.classList.add('is-paused');
        playIcon.textContent = '▶';
        playText.textContent = 'Resume';
      } else {
        track.classList.remove('is-paused');
        playIcon.textContent = '❚❚';
        playText.textContent = 'Pause';
      }
    });
  }

  // Direction toggle
  let isReversed = false;
  if (toggleDir) {
    toggleDir.addEventListener('click', () => {
      isReversed = !isReversed;
      if (isReversed) {
        track.classList.add('reverse-flow');
      } else {
        track.classList.remove('reverse-flow');
      }
    });
  }
}

/**
 * Atmospheric Vision Contact Stage (Kinetic Fly-Through Zoom Transition from Video)
 */
function initVisionContactStage() {
  const stage = document.getElementById('vision-contact-stage');
  if (!stage) return;

  const bgs = Array.from(stage.querySelectorAll('.vision-bg-slide'));
  const panes = Array.from(stage.querySelectorAll('.vision-slide-pane'));
  const tabs = Array.from(stage.querySelectorAll('.vision-tab'));
  const advanceBtn = document.getElementById('vision-advance-btn');
  const progressCircle = document.getElementById('vision-progress-circle');
  const clockEl = document.getElementById('contact-live-clock');

  let currentIndex = 0;
  const totalSlides = Math.min(bgs.length, panes.length);
  let isTransitioning = false;
  let autoplayInterval = null;
  const slideDuration = 6500; // ms
  let elapsed = 0;
  const tickStep = 50; // ms
  const circumference = 2 * Math.PI * 25; // r=25 => ~157.08

  // 1. Live IST Clock
  function updateISTClock() {
    if (!clockEl) return;
    try {
      const now = new Date();
      const istString = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      clockEl.textContent = `${istString} IST`;
    } catch {
      const now = new Date();
      clockEl.textContent = `${now.toTimeString().split(' ')[0]} IST`;
    }
  }
  updateISTClock();
  setInterval(updateISTClock, 1000);

  // 2. Particle spark generator
  function spawnSparks(originX, originY, count = 22) {
    const palette = ['#FF6B00', '#FFA040', '#FFD280', '#FFFFFF', '#E08E45'];
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('span');
      particle.className = 'contact-particle';
      const size = 3 + Math.random() * 5;
      const angle = Math.random() * Math.PI * 2;
      const dist = 35 + Math.random() * 80;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      const color = palette[Math.floor(Math.random() * palette.length)];

      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${originX}px`;
      particle.style.top = `${originY}px`;
      particle.style.background = color;
      particle.style.boxShadow = `0 0 10px ${color}, 0 0 4px #FFFFFF`;
      particle.style.setProperty('--dx', `${dx}px`);
      particle.style.setProperty('--dy', `${dy}px`);
      particle.style.animationDuration = `${0.65 + Math.random() * 0.4}s`;

      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 1100);
    }
  }

  // 3. Slide Transition Handler (Kinetic 3D Fly-Through)
  function goToSlide(targetIndex, direction = 'forward') {
    if (targetIndex === currentIndex || isTransitioning) return;
    isTransitioning = true;
    elapsed = 0;
    updateProgressRing(0);

    const prevIndex = currentIndex;
    const currentPane = panes[prevIndex];
    const currentBg = bgs[prevIndex];
    const nextPane = panes[targetIndex];
    const nextBg = bgs[targetIndex];

    const isForward = direction === 'forward' || (direction === 'auto' && targetIndex > prevIndex);
    const exitClass = isForward ? 'is-exiting-forward' : 'is-exiting-backward';
    const enterClass = isForward ? 'is-entering-forward' : 'is-entering-backward';

    // Update Tab Navigation Active State
    tabs.forEach((tab, idx) => {
      if (idx === targetIndex) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Animate Out Current Slide
    currentPane.classList.remove('active');
    currentPane.classList.add(exitClass);
    currentBg.classList.remove('active');
    currentBg.classList.add(exitClass);

    // Animate In Incoming Slide
    nextPane.classList.add(enterClass);
    nextBg.classList.add(enterClass);

    // Complete Transition after animation ends (880ms)
    setTimeout(() => {
      // Clean up exit classes
      currentPane.classList.remove('is-exiting-forward', 'is-exiting-backward');
      currentBg.classList.remove('is-exiting-forward', 'is-exiting-backward');

      // Finalize incoming slide
      nextPane.classList.remove('is-entering-forward', 'is-entering-backward');
      nextPane.classList.add('active');
      nextBg.classList.remove('is-entering-forward', 'is-entering-backward');
      nextBg.classList.add('active');

      currentIndex = targetIndex;
      isTransitioning = false;
    }, 880);
  }

  function nextSlide() {
    goToSlide((currentIndex + 1) % totalSlides, 'forward');
  }

  function prevSlide() {
    goToSlide((currentIndex - 1 + totalSlides) % totalSlides, 'backward');
  }

  // 4. Circular Advance Button Listener
  if (advanceBtn) {
    advanceBtn.addEventListener('click', () => {
      const rect = advanceBtn.getBoundingClientRect();
      spawnSparks(rect.left + rect.width / 2, rect.top + rect.height / 2, 16);
      nextSlide();
    });
  }

  // 5. Top Tab Navigation Listeners
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const slideIdx = parseInt(tab.getAttribute('data-slide'), 10);
      if (!isNaN(slideIdx) && slideIdx !== currentIndex) {
        const dir = slideIdx > currentIndex ? 'forward' : 'backward';
        goToSlide(slideIdx, dir);
      }
    });
  });

  // 6. Autoplay & Progress Ring Countdown
  function updateProgressRing(fraction) {
    if (!progressCircle) return;
    const offset = circumference * (1 - fraction);
    progressCircle.style.strokeDashoffset = offset;
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayInterval = setInterval(() => {
      elapsed += tickStep;
      const frac = Math.min(elapsed / slideDuration, 1);
      updateProgressRing(frac);

      if (elapsed >= slideDuration) {
        elapsed = 0;
        nextSlide();
      }
    }, tickStep);
  }

  function stopAutoplay() {
    if (autoplayInterval) {
      clearInterval(autoplayInterval);
      autoplayInterval = null;
    }
  }

  startAutoplay();

  // Pause on stage hover / focus
  stage.addEventListener('mouseenter', stopAutoplay);
  stage.addEventListener('mouseleave', () => {
    elapsed = 0;
    startAutoplay();
  });

  // 7. Mouse Wheel Gestures (Zoom on Scroll)
  let wheelTimeout = null;
  stage.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) < 30 || isTransitioning) return;
    if (wheelTimeout) return;

    if (e.deltaY > 0) {
      nextSlide();
    } else {
      prevSlide();
    }

    wheelTimeout = setTimeout(() => {
      wheelTimeout = null;
    }, 900);
  }, { passive: true });

  // 8. Mobile Touch Swipe Gestures
  let touchStartX = 0;
  let touchStartY = 0;
  stage.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  stage.addEventListener('touchend', (e) => {
    if (isTransitioning || e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(deltaX) > 40 || Math.abs(deltaY) > 40) {
      if (deltaX < -40 || deltaY < -40) {
        nextSlide();
      } else if (deltaX > 40 || deltaY > 40) {
        prevSlide();
      }
    }
  }, { passive: true });

  // 9. Copy Email Micro-interaction with particle burst & toast
  const copyButtons = stage.querySelectorAll('.copy-email-btn');
  copyButtons.forEach((btn) => {
    const textSpan = btn.querySelector('.copy-btn-text');
    const pillSpan = btn.querySelector('.copy-email-pill');
    let copyTimer = null;

    btn.addEventListener('click', (e) => {
      const email = btn.getAttribute('data-email') || 'pandeyashish0329@gmail.com';
      const rect = btn.getBoundingClientRect();
      const sparkX = e.clientX || (rect.left + rect.width / 2);
      const sparkY = e.clientY || (rect.top + rect.height / 2);
      spawnSparks(sparkX, sparkY, 24);

      navigator.clipboard.writeText(email).then(() => {
        if (textSpan) textSpan.textContent = '✓ Copied!';
        if (pillSpan) pillSpan.textContent = 'Ready to Paste';
        btn.style.borderColor = '#FF6B00';
        btn.style.boxShadow = '0 0 25px rgba(255, 107, 0, 0.45)';

        clearTimeout(copyTimer);
        copyTimer = setTimeout(() => {
          if (textSpan) textSpan.textContent = 'Copy Email';
          if (pillSpan) pillSpan.textContent = email;
          btn.style.borderColor = '';
          btn.style.boxShadow = '';
        }, 2400);
      }).catch(() => {
        if (textSpan) textSpan.textContent = 'pandeyashish0329@gmail.com';
      });
    });
  });

  // 10. Subtle Magnetic Pull on Action Buttons (Desktop only)
  const magneticElements = stage.querySelectorAll('.vision-cta-btn, .vision-advance-btn, .vision-copy-btn, .vision-ghost-btn');
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    magneticElements.forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (e.clientX - centerX) * 0.18;
        const deltaY = (e.clientY - centerY) * 0.18;
        el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }
}

/**
 * Main animation & interpolation loop
 */
function tick(time) {
  if (lenis) {
    lenis.raf(time);
  }

  // Smooth lerp damping for buttery frame transitions
  const delta = targetFrame - currentFrame;
  if (Math.abs(delta) > 0.001) {
    currentFrame += delta * 0.09;
  } else {
    currentFrame = targetFrame;
  }

  const frameToRender = Math.round(currentFrame);
  renderFrame(frameToRender);

  requestAnimationFrame(tick);
}

/**
 * Concurrently preload all frames with a pool limit
 */
function preloadAllFrames() {
  const CONCURRENCY_LIMIT = 8;
  const indices = [];

  for (let i = 2; i <= TOTAL_FRAMES; i++) {
    indices.push(i);
  }

  let currentIndex = 0;

  function updateLoader() {
    const percent = Math.min(100, Math.round((loadedCount / TOTAL_FRAMES) * 100));
    if (loaderPercent) loaderPercent.textContent = percent;
    if (loaderBar) loaderBar.style.width = `${percent}%`;

    if (loadedCount >= TOTAL_FRAMES) {
      setTimeout(() => {
        if (loader) loader.classList.add('loaded');
      }, 350);
    }
  }

  function loadNext() {
    if (currentIndex >= indices.length) return;

    const frameIdx = indices[currentIndex++];
    const img = new Image();
    img.src = getFrameSrc(frameIdx);

    const onComplete = () => {
      images[frameIdx] = img;
      loadedFlags[frameIdx] = true;
      loadedCount++;
      updateLoader();

      const currentTarget = Math.round(currentFrame);
      if (
        Math.abs(currentTarget - frameIdx) <
        Math.abs(currentTarget - (lastDrawnFrameIndex > 0 ? lastDrawnFrameIndex : 1))
      ) {
        lastDrawnFrameIndex = -1;
        renderFrame(currentTarget);
      }

      loadNext();
    };

    img.onload = onComplete;
    img.onerror = () => {
      console.warn(`Failed to load frame ${frameIdx}`);
      onComplete();
    };
  }

  for (let i = 0; i < CONCURRENCY_LIMIT; i++) {
    loadNext();
  }
}

/**
 * Footer Live Time & Back To Top
 */
function initFooter() {
  const timeEl = document.getElementById('footer-live-time');
  function updateTime() {
    if (!timeEl) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    timeEl.textContent = `${timeStr} • IST (UTC+5:30)`;
  }
  updateTime();
  setInterval(updateTime, 1000);

  const backToTopBtn = document.getElementById('back-to-top-btn');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      if (lenis) lenis.scrollTo(0, { duration: 1.5 });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

/**
 * 3D Rotary Wheel Skills Carousel (Motion Graphics Style inspired by reference video)
 */
function initSkillsRotaryCarousel() {
  const stage = document.getElementById('skills-stage');
  const prevBtn = document.getElementById('skills-prev');
  const nextBtn = document.getElementById('skills-next');
  const dialLabel = document.getElementById('dial-active-label');
  const dialRing = document.getElementById('dial-rotating-ring');
  const dotsContainer = document.getElementById('skills-dots');

  if (!stage) return;

  const cards = Array.from(stage.querySelectorAll('.skills-card'));
  const total = cards.length;
  if (total === 0) return;

  let activeIndex = 0;
  let isAutoplay = true;
  let autoplayTimer = null;

  // Build dots
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    cards.forEach((card, idx) => {
      const dot = document.createElement('button');
      dot.className = `skill-dot ${idx === 0 ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Go to skill ${idx + 1}`);
      dot.addEventListener('click', () => {
        goToCard(idx);
        resetAutoplay();
      });
      dotsContainer.appendChild(dot);
    });
  }

  function updateCarousel() {
    const isMobile = window.innerWidth < 640;
    const isTablet = window.innerWidth >= 640 && window.innerWidth < 1080;

    const xStep = isMobile ? 160 : isTablet ? 230 : 290;
    const yCurve = isMobile ? 22 : 32;
    const rotZStep = isMobile ? 9 : 12;
    const rotYStep = isMobile ? 18 : 22;

    cards.forEach((card, i) => {
      let offset = (i - activeIndex) % total;
      if (offset > total / 2) offset -= total;
      if (offset < -total / 2) offset += total;

      const absOffset = Math.abs(offset);
      const sign = Math.sign(offset);

      if (absOffset === 0) {
        // Active Center Card
        card.style.transform = `translate3d(0px, 0px, 90px) rotateY(0deg) rotateZ(0deg) scale(1.05)`;
        card.style.opacity = '1';
        card.style.zIndex = '20';
        card.style.pointerEvents = 'auto';
        card.classList.add('is-active');

        // Update dial label
        const titleEl = card.querySelector('.skill-card-title');
        if (dialLabel && titleEl) {
          dialLabel.textContent = titleEl.textContent;
        }
      } else if (absOffset === 1) {
        const x = sign * xStep;
        const y = yCurve;
        const z = 10;
        const rotZ = sign * rotZStep;
        const rotY = -sign * rotYStep;
        card.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(0.92)`;
        card.style.opacity = '0.85';
        card.style.zIndex = '15';
        card.style.pointerEvents = 'auto';
        card.classList.remove('is-active');
      } else if (absOffset === 2) {
        const x = sign * (xStep * 1.8);
        const y = yCurve * 2.6;
        const z = -90;
        const rotZ = sign * (rotZStep * 1.8);
        const rotY = -sign * (rotYStep * 1.5);
        card.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(0.8)`;
        card.style.opacity = '0.5';
        card.style.zIndex = '10';
        card.style.pointerEvents = 'auto';
        card.classList.remove('is-active');
      } else if (absOffset === 3) {
        const x = sign * (xStep * 2.45);
        const y = yCurve * 4.8;
        const z = -200;
        const rotZ = sign * (rotZStep * 2.4);
        const rotY = -sign * (rotYStep * 1.9);
        card.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(0.68)`;
        card.style.opacity = '0.2';
        card.style.zIndex = '5';
        card.style.pointerEvents = 'auto';
        card.classList.remove('is-active');
      } else {
        // Behind the wheel
        card.style.transform = `translate3d(0px, 160px, -400px) rotateY(0deg) scale(0.5)`;
        card.style.opacity = '0';
        card.style.zIndex = '1';
        card.style.pointerEvents = 'none';
        card.classList.remove('is-active');
      }
    });

    // Rotate Dial Ring smoothly in sync with active index
    if (dialRing) {
      const dialAngle = -(activeIndex * (360 / total));
      dialRing.style.transform = `rotate(${dialAngle}deg)`;
    }

    // Update Dots
    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll('.skill-dot');
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === activeIndex);
      });
    }
  }

  function goToCard(index) {
    activeIndex = (index + total) % total;
    updateCarousel();
  }

  function nextCard() {
    goToCard(activeIndex + 1);
  }

  function prevCard() {
    goToCard(activeIndex - 1);
  }

  // Click on cards to center them
  cards.forEach((card, idx) => {
    card.addEventListener('click', () => {
      if (idx !== activeIndex) {
        goToCard(idx);
        resetAutoplay();
      }
    });
  });

  // Navigation Buttons
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prevCard();
      resetAutoplay();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      nextCard();
      resetAutoplay();
    });
  }

  // Touch / Swipe support
  let touchStartX = 0;
  stage.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  stage.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextCard();
      else prevCard();
      resetAutoplay();
    }
  }, { passive: true });

  // Autoplay
  function startAutoplay() {
    autoplayTimer = setInterval(() => {
      if (isAutoplay) nextCard();
    }, 4200);
  }

  function resetAutoplay() {
    clearInterval(autoplayTimer);
    startAutoplay();
  }

  const wrapper = document.getElementById('skills-carousel');
  if (wrapper) {
    wrapper.addEventListener('mouseenter', () => { isAutoplay = false; });
    wrapper.addEventListener('mouseleave', () => { isAutoplay = true; });
  }

  window.addEventListener('resize', updateCarousel);

  updateCarousel();
  startAutoplay();
}

/**
 * 3D CoverFlow Carousel for Programmes & Tech Ecosystems
 * Replicating the 3D perspective stacked card carousel with smooth transitions
 */
function initProgrammesCoverflow() {
  const container = document.getElementById('programmes-coverflow');
  if (!container) return;

  const stage = document.getElementById('prog-stage');
  const cards = Array.from(container.querySelectorAll('.coverflow-card'));
  const prevBtn = document.getElementById('prog-prev');
  const nextBtn = document.getElementById('prog-next');
  const dotsContainer = document.getElementById('prog-dots');

  if (!cards.length) return;

  const count = cards.length;
  let currentIndex = 0;
  let autoplayTimer = null;
  let isAutoplayActive = true;

  // Build Pagination Dots
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    cards.forEach((card, idx) => {
      const dot = document.createElement('button');
      dot.className = `coverflow-dot ${idx === 0 ? 'is-active' : ''}`;
      dot.setAttribute('aria-label', `Navigate to ${card.querySelector('.card-company-title')?.textContent || 'Card ' + (idx + 1)}`);
      dot.addEventListener('click', () => {
        goToCard(idx);
        resetAutoplay();
      });
      dotsContainer.appendChild(dot);
    });
  }

  const dots = dotsContainer ? Array.from(dotsContainer.querySelectorAll('.coverflow-dot')) : [];

  function updateCoverflow() {
    const width = window.innerWidth;
    const isMobile = width < 640;
    const isTablet = width >= 640 && width <= 1024;

    const xStep = isMobile ? 145 : (isTablet ? 210 : 270);
    const zOffset1 = isMobile ? -50 : -75;
    const zOffset2 = isMobile ? -110 : -150;
    const rotY1 = isMobile ? 12 : 16;
    const rotY2 = isMobile ? 18 : 24;
    const scale1 = isMobile ? 0.84 : 0.90;
    const scale2 = isMobile ? 0.70 : 0.78;
    const opacity1 = isMobile ? 0.75 : 0.88;
    const opacity2 = isMobile ? 0.40 : 0.55;

    cards.forEach((card, i) => {
      let offset = (i - currentIndex) % count;
      if (offset > count / 2) offset -= count;
      if (offset < -count / 2) offset += count;

      const absOffset = Math.abs(offset);
      const sign = offset > 0 ? 1 : -1;

      let tx = 0;
      let tz = 0;
      let rotY = 0;
      let scaleVal = 1;
      let opacityVal = 1;
      let zIndexVal = 20;
      let pointerEvents = 'auto';

      if (absOffset === 0) {
        tx = 0;
        tz = 0;
        rotY = 0;
        scaleVal = 1; // Pure 1:1 pixel rendering for razor-sharp vector text and icons
        opacityVal = 1;
        zIndexVal = 25;
        card.classList.add('is-active');
      } else if (absOffset === 1) {
        tx = sign * xStep;
        tz = zOffset1;
        rotY = -sign * rotY1;
        scaleVal = scale1;
        opacityVal = opacity1;
        zIndexVal = 18;
        card.classList.remove('is-active');
      } else if (absOffset === 2) {
        tx = sign * (xStep * 1.82);
        tz = zOffset2;
        rotY = -sign * rotY2;
        scaleVal = scale2;
        opacityVal = opacity2;
        zIndexVal = 12;
        card.classList.remove('is-active');
      } else {
        tx = sign * (xStep * 2.5);
        tz = -260;
        rotY = -sign * 30;
        scaleVal = 0.65;
        opacityVal = 0;
        zIndexVal = 1;
        pointerEvents = 'none';
        card.classList.remove('is-active');
      }

      card.style.transform = `translate3d(${tx}px, 0px, ${tz}px) rotateY(${rotY}deg) scale(${scaleVal})`;
      card.style.zIndex = zIndexVal;
      card.style.opacity = opacityVal;
      card.style.pointerEvents = pointerEvents;
    });

    // Update Dots
    dots.forEach((dot, dIdx) => {
      dot.classList.toggle('is-active', dIdx === currentIndex);
    });
  }

  function goToCard(index) {
    currentIndex = ((index % count) + count) % count;
    updateCoverflow();
  }

  function nextCard() {
    goToCard(currentIndex + 1);
  }

  function prevCard() {
    goToCard(currentIndex - 1);
  }

  // Click on Card to Center
  cards.forEach((card, idx) => {
    card.addEventListener('click', (e) => {
      // If clicking button or link inside active card, allow navigation
      if (card.classList.contains('is-active') && e.target.closest('a, button')) {
        return;
      }
      if (idx !== currentIndex) {
        e.preventDefault();
        goToCard(idx);
        resetAutoplay();
      }
    });
  });

  // Buttons
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prevCard();
      resetAutoplay();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      nextCard();
      resetAutoplay();
    });
  }

  // Swipe / Touch Support
  if (stage) {
    let touchStartX = 0;
    let touchStartY = 0;

    stage.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    stage.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchStartX - touchEndX;
      const diffY = touchStartY - touchEndY;

      // Only trigger if horizontal swipe is dominant
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
        if (diffX > 0) nextCard();
        else prevCard();
        resetAutoplay();
      }
    }, { passive: true });
  }

  // Autoplay
  function startAutoplay() {
    autoplayTimer = setInterval(() => {
      if (isAutoplayActive) {
        nextCard();
      }
    }, 4500);
  }

  function resetAutoplay() {
    clearInterval(autoplayTimer);
    startAutoplay();
  }

  container.addEventListener('mouseenter', () => { isAutoplayActive = false; });
  container.addEventListener('mouseleave', () => { isAutoplayActive = true; });

  // Keyboard navigation when section is in view
  window.addEventListener('keydown', (e) => {
    const rect = container.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (!inView) return;

    if (e.key === 'ArrowLeft') {
      prevCard();
      resetAutoplay();
    } else if (e.key === 'ArrowRight') {
      nextCard();
      resetAutoplay();
    }
  });

  window.addEventListener('resize', updateCoverflow);

  updateCoverflow();
  startAutoplay();
}

/**
 * Bootstrapping
 */
function init() {
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  initAnchorLinks();
  initAboutWordReveal();
  initInteractiveTiltCards();
  initCustomCursor();
  initSkillsRotaryCarousel();
  initProgrammesCoverflow();
  initProjectFilters();
  initProjectModal();
  initProjectCylinder();
  initProjectViewTabs();
  initCertificateModal();
  initCertificateWaterfall();
  initVisionContactStage();
  initFooter();

  // Load first frame immediately
  const firstImg = new Image();
  firstImg.src = getFrameSrc(1);
  firstImg.onload = () => {
    images[1] = firstImg;
    loadedFlags[1] = true;
    loadedCount++;
    renderFrame(1);
    preloadAllFrames();
  };
  firstImg.onerror = () => {
    preloadAllFrames();
  };

  requestAnimationFrame(tick);
}

init();
