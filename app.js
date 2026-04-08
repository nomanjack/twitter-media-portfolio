// Portfolio data
let ALL_POSTS = [];
let VISIBLE_POSTS = [];
let PROFILE = null;
let CONFIG = null;
let activeLayout = "masonry";
let editMode = false;
let hiddenIds = new Set();

const GRID_CONFIG = {
  COLS: 5,
  GAP: 18,
  easingFactor: 0.1,
  POOL_SIZE: 500,
  BUFFER: 600,
};

const state = {
  cameraOffset: { x: 0, y: 0 },
  targetOffset: { x: 0, y: 0 },
  isDragging: false,
  previousMousePosition: { x: 0, y: 0 },
  dragStartPosition: { x: 0, y: 0 },
  hasDragged: false,
  touchStart: null,
  lightboxOpen: false,
  lightboxItem: null,
  lightboxAnimating: false,
};

const viewport = document.getElementById("viewport");
const container = document.getElementById("container");
const grid = document.getElementById("grid");
const overlay = document.getElementById("lightbox-overlay");
const lightboxClose = document.getElementById("lightbox-close");
const lightboxTitle = document.getElementById("lightbox-title");
const lightboxLink = document.getElementById("lightbox-link");

// --- Theme ---

const getSystemTheme = () =>
  window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("portfolio-theme", theme);
};

const initTheme = () => {
  const saved = localStorage.getItem("portfolio-theme");
  applyTheme(saved || getSystemTheme());

  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (!localStorage.getItem("portfolio-theme")) {
      applyTheme(getSystemTheme());
    }
  });
};

const toggleTheme = () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
};

// --- Layout data ---
let layoutItems = [];
let colWidth = 0;
let totalWidth = 0;
let maxColHeight = 0;

const getDisplayPosts = () => {
  if (editMode) return ALL_POSTS.filter((p) => p.images && p.images.length > 0);
  return ALL_POSTS.filter((p) => p.images && p.images.length > 0 && !hiddenIds.has(p.id));
};

const buildLayout = () => {
  VISIBLE_POSTS = getDisplayPosts();
  if (activeLayout === "feed") buildFeedLayout();
  else if (activeLayout === "grid") buildGridLayout();
  else buildMasonryLayout();
};

const buildMasonryLayout = () => {
  const vw = window.innerWidth;
  const gap = GRID_CONFIG.GAP;

  colWidth = Math.floor((vw - gap) / GRID_CONFIG.COLS);
  totalWidth = colWidth * GRID_CONFIG.COLS;

  const colHeights = new Array(GRID_CONFIG.COLS).fill(0);
  const columns = Array.from({ length: GRID_CONFIG.COLS }, () => []);

  for (const post of VISIBLE_POSTS) {
    let minCol = 0;
    for (let c = 1; c < GRID_CONFIG.COLS; c++) {
      if (colHeights[c] < colHeights[minCol]) minCol = c;
    }

    const img = post.images[0];
    const aspect = img.width / img.height;
    const itemW = colWidth - gap;
    const itemH = itemW / aspect;

    const x = minCol * colWidth + gap / 2;
    const y = colHeights[minCol] + gap / 2;

    columns[minCol].push({ post, x, y, w: itemW, h: itemH });
    colHeights[minCol] += itemH + gap;
  }

  maxColHeight = Math.max(...colHeights, 1);

  layoutItems = [];
  for (let col = 0; col < GRID_CONFIG.COLS; col++) {
    for (let row = 0; row < columns[col].length; row++) {
      layoutItems.push({ key: `${col}-${row}`, ...columns[col][row] });
    }
  }
};

const buildGridLayout = () => {
  const vw = window.innerWidth;
  const gap = GRID_CONFIG.GAP;
  const cols = GRID_CONFIG.COLS;

  colWidth = Math.floor((vw - gap) / cols);
  totalWidth = colWidth * cols;
  const itemW = colWidth - gap;

  layoutItems = [];
  let colHeights = new Array(cols).fill(0);

  for (let i = 0; i < VISIBLE_POSTS.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const img = VISIBLE_POSTS[i].images[0];
    const aspect = img.width / img.height;
    const itemH = itemW / aspect;

    const y = colHeights[col] + gap / 2;

    layoutItems.push({
      key: `${col}-${row}`,
      post: VISIBLE_POSTS[i],
      x: col * colWidth + gap / 2,
      y,
      w: itemW,
      h: itemH,
    });

    colHeights[col] += itemH + gap;
  }

  maxColHeight = Math.max(...colHeights, 1);
};

const buildFeedLayout = () => {
  const vw = window.innerWidth;
  const gap = GRID_CONFIG.GAP;
  const feedW = Math.min(560, vw - gap * 2);

  // totalWidth = feedW so centerOffsetX centers the feed column exactly
  colWidth = feedW;
  totalWidth = feedW;

  let y = gap;

  layoutItems = [];
  for (let i = 0; i < VISIBLE_POSTS.length; i++) {
    const img = VISIBLE_POSTS[i].images[0];
    const aspect = img.width / img.height;
    const itemH = feedW / aspect;

    layoutItems.push({
      key: `0-${i}`,
      post: VISIBLE_POSTS[i],
      x: 0,
      y,
      w: feedW,
      h: itemH,
    });
    y += itemH + gap;
  }

  maxColHeight = y || 1;
};

// --- DOM Pool ---
const pool = [];
const freePool = [];
const activeMap = new Map();
const elToPost = new WeakMap();

const createPool = () => {
  grid.innerHTML = "";
  pool.length = 0;
  freePool.length = 0;
  activeMap.clear();

  for (let i = 0; i < GRID_CONFIG.POOL_SIZE; i++) {
    const el = document.createElement("div");
    el.className = "grid-item";
    el.style.display = "none";
    el.innerHTML = `<img src="" alt="" loading="lazy" decoding="async"><div class="grid-item-hidden-overlay"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg></div>`;
    grid.appendChild(el);
    pool.push(el);
    freePool.push(el);
  }
};

const acquireElement = () => {
  if (freePool.length === 0) return null;
  const el = freePool.pop();
  el.style.display = "";
  return el;
};

const releaseElement = (el) => {
  el.style.display = "none";
  el.style.visibility = "";
  el.classList.remove("hidden-post");
  freePool.push(el);
};

// --- Twitter image sizing ---
const twitterImageUrl = (url, size = "small") => {
  const base = url.split("?")[0];
  const ext = base.match(/\.(jpg|jpeg|png)$/i);
  const format = ext ? ext[1].toLowerCase() : "jpg";
  return `${base}?format=${format}&name=${size}`;
};

// --- Virtualized Renderer ---

const renderVisibleItems = () => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const buf = GRID_CONFIG.BUFFER;

  const lightboxEl = state.lightboxItem?.element || null;
  const camX = state.cameraOffset.x;
  const camY = state.cameraOffset.y;

  const minCullX = Math.min(camX, state.targetOffset.x);
  const maxCullX = Math.max(camX, state.targetOffset.x);
  const minCullY = Math.min(camY, state.targetOffset.y);
  const maxCullY = Math.max(camY, state.targetOffset.y);

  // All layouts tile in both directions (360° infinite scroll)
  const lockX = activeLayout === "feed" || activeLayout === "grid";
  const startTileX = lockX ? 0 : Math.floor((minCullX - buf) / totalWidth);
  const endTileX = lockX ? 0 : Math.floor((maxCullX + vw + buf) / totalWidth);
  const startTileY = Math.floor((minCullY - buf) / maxColHeight);
  const endTileY = Math.floor((maxCullY + vh + buf) / maxColHeight);

  // For feed/grid, center content horizontally using an offset
  let centerOffsetX = 0;
  if (activeLayout === "feed" || activeLayout === "grid") {
    centerOffsetX = Math.floor((vw - totalWidth) / 2);
  }

  const visibleThisFrame = new Set();

  for (let i = 0; i < layoutItems.length; i++) {
    const item = layoutItems[i];

    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const worldX = item.x + tx * totalWidth + centerOffsetX;
        const worldY = item.y + ty * maxColHeight;
        const sx = worldX - camX;
        const sy = worldY - camY;

        const txs = worldX - state.targetOffset.x;
        const tys = worldY - state.targetOffset.y;

        const visibleAtCam =
          sx + item.w >= -buf && sx <= vw + buf &&
          sy + item.h >= -buf && sy <= vh + buf;
        const visibleAtTarget =
          txs + item.w >= -buf && txs <= vw + buf &&
          tys + item.h >= -buf && tys <= vh + buf;

        if (!visibleAtCam && !visibleAtTarget) continue;

        const visKey = `${item.key}_${tx}_${ty}`;
        visibleThisFrame.add(visKey);

        const existing = activeMap.get(visKey);
        if (existing) {
          if (existing.poolEl !== lightboxEl) {
            existing.poolEl.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
          }
          // Update hidden state in edit mode
          if (editMode) {
            existing.poolEl.classList.toggle("hidden-post", hiddenIds.has(item.post.id));
          } else {
            existing.poolEl.classList.remove("hidden-post");
          }
          existing.screenX = sx;
          existing.screenY = sy;
        } else {
          const el = acquireElement();
          if (!el) continue;

          const img = el.querySelector("img");
          const src = twitterImageUrl(item.post.images[0].url, "medium");
          if (img.src !== src) {
            img.src = src;
            img.alt = item.post.text.substring(0, 60);
          }

          el.style.width = `${item.w}px`;
          el.style.height = `${item.h}px`;
          el.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;

          if (editMode) {
            el.classList.toggle("hidden-post", hiddenIds.has(item.post.id));
          }

          elToPost.set(el, item.post);
          activeMap.set(visKey, {
            poolEl: el,
            layoutItem: item,
            screenX: sx,
            screenY: sy,
          });
        }
      }
    }
  }

  for (const [visKey, entry] of activeMap) {
    if (!visibleThisFrame.has(visKey) && entry.poolEl !== lightboxEl) {
      releaseElement(entry.poolEl);
      elToPost.delete(entry.poolEl);
      activeMap.delete(visKey);
    }
  }
};

// --- Lightbox ---

const DRAG_THRESHOLD = 5;
let lightboxClone = null;

const openLightbox = (el, post) => {
  if (state.lightboxOpen || state.lightboxAnimating) return;

  state.lightboxAnimating = true;
  state.lightboxOpen = true;
  state.lightboxItem = { element: el, post };

  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxW = vw * 0.7;
  const maxH = vh * 0.7;

  const aspectRatio = rect.width / rect.height;
  let targetW, targetH;
  if (maxW / maxH > aspectRatio) {
    targetH = maxH;
    targetW = targetH * aspectRatio;
  } else {
    targetW = maxW;
    targetH = targetW / aspectRatio;
  }

  const startX = rect.left;
  const startY = rect.top;
  const startW = rect.width;
  const startH = rect.height;
  const endX = (vw - targetW) / 2;
  const endY = (vh - targetH) / 2;

  el.style.visibility = "hidden";

  lightboxClone = el.cloneNode(true);
  lightboxClone.classList.add("lightbox-active");
  // Remove edit mode overlay from clone
  const overlayEl = lightboxClone.querySelector(".grid-item-hidden-overlay");
  if (overlayEl) overlayEl.remove();
  lightboxClone.style.width = `${startW}px`;
  lightboxClone.style.height = `${startH}px`;
  lightboxClone.style.display = "";
  lightboxClone.style.visibility = "visible";
  lightboxClone.style.transform = `translate3d(${startX}px, ${startY}px, 0)`;

  if (post) {
    const hiRes = new Image();
    hiRes.src = twitterImageUrl(post.images[0].url, "4096x4096");
    hiRes.alt = "";
    hiRes.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:12px;opacity:0;transition:opacity 0.3s ease;";
    hiRes.onload = () => { hiRes.style.opacity = "1"; };
    lightboxClone.appendChild(hiRes);
  }
  document.body.appendChild(lightboxClone);

  overlay.classList.add("active");

  // Set lightbox info — no transition animations, just show immediately
  if (post) {
    const caption = post.text.trim();
    if (caption) {
      lightboxTitle.textContent = caption.length > 120 ? caption.substring(0, 120) + "\u2026" : caption;
      lightboxTitle.style.display = "";
    } else {
      lightboxTitle.textContent = "";
      lightboxTitle.style.display = "none";
    }
    lightboxLink.href = post.url;
    lightboxLink.textContent = "View on Twitter";
  }

  const lightboxInfo = document.getElementById("lightbox-info");
  lightboxInfo.style.top = `${endY + targetH + 16}px`;

  state.lightboxItem._endX = endX;
  state.lightboxItem._endY = endY;
  state.lightboxItem._endW = targetW;
  state.lightboxItem._endH = targetH;

  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const springDuration = 0.45 + Math.min(distance / 2000, 0.25);

  Motion.animate(
    lightboxClone,
    {
      width: [`${startW}px`, `${targetW}px`],
      height: [`${startH}px`, `${targetH}px`],
      transform: [
        `translate3d(${startX}px, ${startY}px, 0)`,
        `translate3d(${endX}px, ${endY}px, 0)`,
      ],
    },
    { type: "spring", duration: springDuration, bounce: 0.15 }
  ).then(() => {
    state.lightboxAnimating = false;
  });
};

const closeLightbox = () => {
  if (!state.lightboxOpen || state.lightboxAnimating || !state.lightboxItem) return;

  state.lightboxAnimating = true;
  const { element: el } = state.lightboxItem;

  overlay.classList.remove("active");

  const originalRect = el.getBoundingClientRect();
  const endX = originalRect.left;
  const endY = originalRect.top;
  const endW = originalRect.width;
  const endH = originalRect.height;

  const fromX = state.lightboxItem._endX;
  const fromY = state.lightboxItem._endY;
  const fromW = state.lightboxItem._endW;
  const fromH = state.lightboxItem._endH;

  Motion.animate(
    lightboxClone,
    {
      width: [`${fromW}px`, `${endW}px`],
      height: [`${fromH}px`, `${endH}px`],
      transform: [
        `translate3d(${fromX}px, ${fromY}px, 0)`,
        `translate3d(${endX}px, ${endY}px, 0)`,
      ],
    },
    { type: "spring", duration: 0.4, bounce: 0 }
  ).then(() => {
    lightboxClone.remove();
    lightboxClone = null;
    el.style.visibility = "";
    state.lightboxOpen = false;
    state.lightboxItem = null;
    state.lightboxAnimating = false;
  });
};

// --- Input Handlers ---

const onMouseDown = (e) => {
  if (state.lightboxOpen) return;
  state.isDragging = true;
  state.hasDragged = false;
  state.dragStartPosition = { x: e.clientX, y: e.clientY };
  viewport.classList.add("grabbing");
  state.previousMousePosition = { x: e.clientX, y: e.clientY };
};

const onMouseMove = (e) => {
  if (!state.isDragging) return;

  const totalDx = e.clientX - state.dragStartPosition.x;
  const totalDy = e.clientY - state.dragStartPosition.y;
  if (Math.sqrt(totalDx * totalDx + totalDy * totalDy) > DRAG_THRESHOLD) {
    state.hasDragged = true;
  }

  const lockX = activeLayout === "feed" || activeLayout === "grid";
  if (!lockX) state.targetOffset.x -= e.clientX - state.previousMousePosition.x;
  state.targetOffset.y -= e.clientY - state.previousMousePosition.y;
  state.previousMousePosition = { x: e.clientX, y: e.clientY };
};

const onMouseUp = (e) => {
  const wasDragging = state.isDragging;
  state.isDragging = false;
  viewport.classList.remove("grabbing");

  if (wasDragging && !state.hasDragged && !state.lightboxOpen) {
    const target = e.target.closest(".grid-item");
    if (target) {
      const post = elToPost.get(target);
      if (!post) return;

      if (editMode) {
        // Toggle visibility in edit mode with smooth animation
        if (hiddenIds.has(post.id)) {
          hiddenIds.delete(post.id);
        } else {
          hiddenIds.add(post.id);
        }
        saveHiddenIds();
        updateEditCounter();
        // Animate the toggle smoothly — just update class, CSS handles transition
        renderVisibleItems();
      } else {
        openLightbox(target, post);
      }
    }
  }
};

const onTouchStart = (e) => {
  if (e.touches.length === 1) {
    state.touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
};

const onTouchMove = (e) => {
  if (e.touches.length === 1 && state.touchStart) {
    e.preventDefault();
    const lockX = activeLayout === "feed" || activeLayout === "grid";
    if (!lockX) state.targetOffset.x -= e.touches[0].clientX - state.touchStart.x;
    state.targetOffset.y -= e.touches[0].clientY - state.touchStart.y;
    state.touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
};

const onTouchEnd = () => {
  state.touchStart = null;
};

const onWheel = (e) => {
  e.preventDefault();
  if (state.lightboxOpen) return;
  const lockX = activeLayout === "feed" || activeLayout === "grid";
  if (!lockX) state.targetOffset.x += e.deltaX;
  state.targetOffset.y += e.deltaY;
};

const onWindowResize = () => {
  buildLayout();
  for (const [visKey, entry] of activeMap) {
    releaseElement(entry.poolEl);
    activeMap.delete(visKey);
  }
  renderVisibleItems();
};

// --- Animation Loop ---

const animate = () => {
  requestAnimationFrame(animate);

  const dx = state.targetOffset.x - state.cameraOffset.x;
  const dy = state.targetOffset.y - state.cameraOffset.y;

  if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
    state.cameraOffset.x += dx * GRID_CONFIG.easingFactor;
    state.cameraOffset.y += dy * GRID_CONFIG.easingFactor;
    renderVisibleItems();
  }
};

// --- Layout switcher ---

let isTransitioning = false;

const createLayoutSwitcher = () => {
  const switcher = document.createElement("div");
  switcher.id = "layout-switcher";
  switcher.className = "toolbar-group";
  const layouts = [
    { id: "masonry", label: "Masonry", icon: "assets/masonry.svg" },
    { id: "grid", label: "Grid", icon: "assets/grid.svg" },
    { id: "feed", label: "Feed", icon: "assets/feed.svg" },
  ];

  for (const layout of layouts) {
    const btn = document.createElement("button");
    btn.className = "toolbar-btn" + (layout.id === activeLayout ? " active" : "");
    btn.dataset.layout = layout.id;
    btn.title = layout.label;
    btn.innerHTML = `<img src="${layout.icon}" alt="${layout.label}" width="18" height="18">`;
    switcher.appendChild(btn);
  }

  switcher.addEventListener("click", (e) => {
    const btn = e.target.closest(".toolbar-btn");
    if (!btn || btn.dataset.layout === activeLayout) return;
    switcher.querySelector(".toolbar-btn.active").classList.remove("active");
    btn.classList.add("active");
    applyLayout(btn.dataset.layout);
  });

  return switcher;
};

const applyLayout = (layout) => {
  if (isTransitioning) return;
  isTransitioning = true;
  activeLayout = layout;

  grid.style.transition = "opacity 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  grid.style.opacity = "0";

  setTimeout(() => {
    state.cameraOffset.x = 0;
    state.cameraOffset.y = 0;
    state.targetOffset.x = 0;
    state.targetOffset.y = 0;

    for (const [visKey, entry] of activeMap) {
      releaseElement(entry.poolEl);
      activeMap.delete(visKey);
    }

    buildLayout();
    renderVisibleItems();

    void grid.offsetHeight;
    grid.style.transition = "opacity 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    grid.style.opacity = "1";

    setTimeout(() => {
      grid.style.transition = "";
      isTransitioning = false;
    }, 250);
  }, 200);
};

// --- Edit mode ---

const saveHiddenIds = () => {
  fetch("/api/hidden", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hiddenIds: [...hiddenIds] }),
  }).catch(() => {});
};

const updateEditCounter = () => {
  const counter = document.getElementById("edit-counter");
  if (counter) {
    const total = ALL_POSTS.filter((p) => p.images && p.images.length > 0).length;
    const visible = total - hiddenIds.size;
    counter.textContent = `${visible}/${total}`;
  }
};

const createEditToggle = () => {
  const wrapper = document.createElement("div");
  wrapper.id = "edit-toggle-wrapper";
  wrapper.className = "toolbar-group";

  const btn = document.createElement("button");
  btn.id = "edit-toggle";
  btn.className = "toolbar-btn";
  btn.title = "Edit mode";
  btn.innerHTML = `<img src="assets/edit.svg" alt="Edit" width="18" height="18">`;

  const counter = document.createElement("span");
  counter.id = "edit-counter";
  counter.className = "edit-counter";
  counter.style.display = "none";

  wrapper.appendChild(btn);
  wrapper.appendChild(counter);

  btn.addEventListener("click", () => {
    editMode = !editMode;
    btn.classList.toggle("active", editMode);
    counter.style.display = editMode ? "" : "none";
    document.body.classList.toggle("edit-mode", editMode);

    // Trigger grow animation by removing and re-adding class
    btn.style.animation = "none";
    void btn.offsetHeight;
    btn.style.animation = "";

    if (editMode) {
      updateEditCounter();
    }

    // Rebuild to show/hide hidden posts
    for (const [visKey, entry] of activeMap) {
      releaseElement(entry.poolEl);
      activeMap.delete(visKey);
    }
    buildLayout();
    renderVisibleItems();
  });

  return wrapper;
};

// --- Theme toggle ---

const createThemeToggle = () => {
  const btn = document.createElement("button");
  btn.className = "toolbar-btn";
  btn.title = "Toggle theme";
  btn.innerHTML = `<img src="assets/theme.svg" alt="Theme" width="18" height="18">`;
  btn.addEventListener("click", toggleTheme);
  return btn;
};

// --- Profile header ---

const createProfileHeader = () => {
  if (!PROFILE) return;

  const header = document.createElement("a");
  header.id = "profile-header";
  header.className = "profile-header";
  header.href = PROFILE.url;
  header.target = "_blank";
  header.rel = "noopener";

  header.innerHTML = `<span class="profile-handle">@${CONFIG?.handle || PROFILE.handle || PROFILE.name}</span>`;

  document.body.appendChild(header);
};

// --- Toolbar ---

const createToolbar = () => {
  const toolbar = document.createElement("div");
  toolbar.id = "toolbar";
  toolbar.className = "toolbar";

  const layoutSwitcher = createLayoutSwitcher();
  toolbar.appendChild(layoutSwitcher);

  // Only show edit toggle during local development
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    const editToggle = createEditToggle();
    toolbar.appendChild(editToggle);
  }

  const rightGroup = document.createElement("div");
  rightGroup.className = "toolbar-group";
  rightGroup.appendChild(createThemeToggle());
  toolbar.appendChild(rightGroup);

  document.body.appendChild(toolbar);
};

// --- Init ---

const refreshGrid = () => {
  for (const [visKey, entry] of activeMap) {
    releaseElement(entry.poolEl);
    activeMap.delete(visKey);
  }
  buildLayout();
  renderVisibleItems();
};

const init = async () => {
  initTheme();

  // Load portfolio data
  try {
    const res = await fetch("./portfolio-data.json");
    if (!res.ok) throw new Error("Not found");
    const data = await res.json();
    ALL_POSTS = data.posts || [];
    PROFILE = data.profile || null;
  } catch {
    console.error("No portfolio-data.json found. Run: node sync-media.js");
    ALL_POSTS = [];
  }

  // Load config for hidden IDs
  try {
    const res = await fetch("./portfolio.config.json");
    if (res.ok) {
      CONFIG = await res.json();
      hiddenIds = new Set(CONFIG.hiddenIds || []);
    }
  } catch {}

  VISIBLE_POSTS = getDisplayPosts();
  console.log(`Loaded ${VISIBLE_POSTS.length} posts`);

  if (PROFILE) {
    document.title = `@${CONFIG?.handle || PROFILE.name} — Portfolio`;
  }

  buildLayout();
  createPool();
  renderVisibleItems();
  createProfileHeader();
  createToolbar();

  // Pre-warm Motion
  const warmup = document.createElement("div");
  warmup.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;";
  document.body.appendChild(warmup);
  Motion.animate(warmup, { opacity: [0, 1] }, { duration: 0.01 }).then(() => warmup.remove());

  viewport.addEventListener("mousedown", onMouseDown);
  viewport.addEventListener("mousemove", onMouseMove);
  viewport.addEventListener("mouseup", onMouseUp);
  viewport.addEventListener("mouseleave", onMouseUp);
  viewport.addEventListener("wheel", onWheel, { passive: false });
  viewport.addEventListener("touchstart", onTouchStart);
  viewport.addEventListener("touchmove", onTouchMove, { passive: false });
  viewport.addEventListener("touchend", onTouchEnd);
  window.addEventListener("resize", onWindowResize);

  lightboxClose.addEventListener("click", (e) => {
    e.stopPropagation();
    closeLightbox();
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeLightbox();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.lightboxOpen) closeLightbox();
  });

  animate();
};

init();
