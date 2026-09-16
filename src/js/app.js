import { extractTikTok, extractInstagram, extractTerabox, extractTwitter, extractYouTube, extractUniversal, detectPlatform } from './extractors.js';

// Capacitor Plugins (Loaded safely with fallback for Web preview)
let ClipboardPlugin = null;
let AppPlugin = null;
let StatusBarPlugin = null;

async function initPlugins() {
  try {
    const { Clipboard } = await import('@capacitor/clipboard');
    ClipboardPlugin = Clipboard;
  } catch (e) {
    console.log('Clipboard plugin in web fallback mode');
  }

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    StatusBarPlugin = { StatusBar, Style };
    syncStatusBar();
  } catch (e) {
    console.log('StatusBar plugin in web fallback mode');
  }

  try {
    const { App } = await import('@capacitor/app');
    AppPlugin = App;
    checkSharedUrl();

    // Auto-detect when switching back to app on mobile & auto-lock gallery vault when backgrounded
    AppPlugin.addListener('appStateChange', (state) => {
      if (state && state.isActive) {
        setTimeout(checkClipboardAutoDetect, 350);
      } else {
        lockVault();
      }
    });
  } catch (e) {
    console.log('App plugin in web fallback mode');
  }

  // Web & fallback auto-lock when page is hidden or minimized
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      lockVault();
    }
  });

  // Initial check on launch
  setTimeout(checkClipboardAutoDetect, 700);
}

// Theme and Personalization State
let currentThemeMode = localStorage.getItem('vdown_theme_mode') || 'amoled';
let currentAccentColor = localStorage.getItem('vdown_accent_color') || 'silver';

function initTheme() {
  applyTheme(currentThemeMode, currentAccentColor, false);

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (currentThemeMode === 'system') {
        applyTheme('system', currentAccentColor, false);
      }
    });
  }
}

function applyTheme(mode, accent, save = true) {
  currentThemeMode = mode;
  currentAccentColor = accent;

  if (save) {
    localStorage.setItem('vdown_theme_mode', mode);
    localStorage.setItem('vdown_accent_color', accent);
  }

  let effectiveTheme = mode;
  if (mode === 'system') {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    effectiveTheme = prefersDark ? 'dark' : 'light';
  }

  document.documentElement.setAttribute('data-theme', effectiveTheme);
  document.documentElement.setAttribute('data-accent', accent);

  // Update UI active card states
  document.querySelectorAll('.theme-mode-card').forEach(card => {
    card.classList.toggle('active', card.getAttribute('data-mode') === mode);
  });
  document.querySelectorAll('.accent-color-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-accent') === accent);
  });

  syncStatusBar(effectiveTheme);
}

async function syncStatusBar(resolvedTheme = currentThemeMode) {
  let effective = resolvedTheme;
  if (effective === 'system') {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    effective = prefersDark ? 'dark' : 'light';
  }

  let color = '#000000';
  let isDarkBg = true;

  if (effective === 'amoled') {
    color = '#000000';
    isDarkBg = true;
  } else if (effective === 'light') {
    color = '#f1f4f8';
    isDarkBg = false;
  } else {
    color = '#0a0a0a';
    isDarkBg = true;
  }

  // Web meta theme-color tag
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.name = 'theme-color';
    document.head.appendChild(metaTheme);
  }
  metaTheme.content = color;

  // Native Android StatusBar plugin
  if (StatusBarPlugin && StatusBarPlugin.StatusBar) {
    try {
      if (typeof StatusBarPlugin.StatusBar.setOverlaysWebView === 'function') {
        await StatusBarPlugin.StatusBar.setOverlaysWebView({ overlay: false });
      }
      await StatusBarPlugin.StatusBar.setBackgroundColor({ color });
      await StatusBarPlugin.StatusBar.setStyle({
        style: isDarkBg ? StatusBarPlugin.Style.Dark : StatusBarPlugin.Style.Light
      });
    } catch (err) {
      // Ignored if unsupported on device
    }
  }
}

// State
let currentExtraction = null;
let downloadAbortController = null;
let downloadHistory = JSON.parse(localStorage.getItem('vdown_history') || '[]');
let detectedClipUrl = '';
let lastIgnoredOrProcessedUrl = '';
let isCheckingClipboard = false;

// DOM Elements
const brandBadge = document.querySelector('.brand-badge');
const urlInput = document.getElementById('url-input');
const btnPaste = document.getElementById('btn-paste');
const btnClear = document.getElementById('btn-clear');
const btnFetch = document.getElementById('btn-fetch');
const detectedBar = document.getElementById('detected-platform-bar');
const detectedName = document.getElementById('detected-name');
const alertBox = document.getElementById('alert-box');
const alertMsg = document.getElementById('alert-msg');

const resultCard = document.getElementById('result-card');
const resAvatar = document.getElementById('res-avatar');
const resAuthorName = document.getElementById('res-author-name');
const resAuthorUser = document.getElementById('res-author-user');
const resPlatformTag = document.getElementById('res-platform-tag');
const resVideo = document.getElementById('res-video');
const resThumb = document.getElementById('res-thumb');
const resDuration = document.getElementById('res-duration');
const resTitle = document.getElementById('res-title');

const audioPlayerCard = document.getElementById('audio-player-card');
const resAudio = document.getElementById('res-audio');
const audioTitle = document.getElementById('audio-title');

const formatList = document.getElementById('format-list');
const carouselSection = document.getElementById('carousel-section');
const carouselGrid = document.getElementById('carousel-grid');
const photoCount = document.getElementById('photo-count');
const btnDownloadAllPhotos = document.getElementById('btn-download-all-photos');

// Modals
const progressModal = document.getElementById('progress-modal');
const progressPercent = document.getElementById('progress-percent');
const progressTitle = document.getElementById('progress-title');
const progressDetail = document.getElementById('progress-detail');
const barFill = document.getElementById('bar-fill');
const btnCancelDownload = document.getElementById('btn-cancel-download');

const btnHistory = document.getElementById('btn-history');
const historyBadge = document.getElementById('history-badge');
const historyModal = document.getElementById('history-modal');
const historyList = document.getElementById('history-list');
const historyTotal = document.getElementById('history-total');
const btnClearHistory = document.getElementById('btn-clear-history');
const btnCloseHistory = document.getElementById('btn-close-history');

// Gallery Privacy Vault Elements
const galleryLockBadge = document.getElementById('gallery-lock-badge');
const vaultBadgeText = document.getElementById('vault-badge-text');
const btnVaultLock = document.getElementById('btn-vault-lock');
const vaultLockView = document.getElementById('vault-lock-view');
const galleryUnlockedContent = document.getElementById('gallery-unlocked-content');
const vaultPinDots = document.getElementById('vault-pin-dots');
const btnPinCancel = document.getElementById('btn-pin-cancel');
const btnPinBackspace = document.getElementById('btn-pin-backspace');

// Vault Setup Modal Elements
const vaultSetupModal = document.getElementById('vault-setup-modal');
const btnCloseVaultSetup = document.getElementById('btn-close-vault-setup');
const vaultEnableToggle = document.getElementById('vault-enable-toggle');
const vaultFormSection = document.getElementById('vault-form-section');
const vaultCurrentPinGroup = document.getElementById('vault-current-pin-group');
const vaultCurrentPin = document.getElementById('vault-current-pin');
const vaultNewPin = document.getElementById('vault-new-pin');
const vaultConfirmPin = document.getElementById('vault-confirm-pin');
const vaultSetupAlert = document.getElementById('vault-setup-alert');
const btnSaveVault = document.getElementById('btn-save-vault');

let isVaultUnlocked = false;
let vaultPinBuffer = '';

// Offline Player Elements
const offlinePlayerModal = document.getElementById('offline-player-modal');
const offlineVideo = document.getElementById('offline-video');
const offlinePlayerTitle = document.getElementById('offline-player-title');
const offlinePlayerBadge = document.getElementById('offline-player-badge');
const btnCloseOfflinePlayer = document.getElementById('btn-close-offline-player');
const btnOfflineShare = document.getElementById('btn-offline-share');

let currentGalFilter = 'all';
let currentPlayingItem = null;

const btnInfo = document.getElementById('btn-info');
const helpModal = document.getElementById('help-modal');
const btnCloseHelp = document.getElementById('btn-close-help');

const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toast-msg');

// Auto-Detect Banner Elements
const clipboardBanner = document.getElementById('clipboard-banner');
const clipPlatformBadge = document.getElementById('clip-platform-badge');
const clipUrlText = document.getElementById('clip-url-text');
const btnClipIgnore = document.getElementById('btn-clip-ignore');
const btnClipFetch = document.getElementById('btn-clip-fetch');
const btnClipClose = document.getElementById('btn-clip-close');

// Secret Vault Modal Elements (Private Feature)
const secretModal = document.getElementById('secret-modal');
const btnCloseSecret = document.getElementById('btn-close-secret');
const btnSaveSecret = document.getElementById('btn-save-secret');
const tbCookieInput = document.getElementById('tb-cookie-input');

// Quick Image Preview Modal Elements
const imagePreviewModal = document.getElementById('image-preview-modal');
const imagePreviewElem = document.getElementById('image-preview-elem');
const imagePreviewTitle = document.getElementById('image-preview-title');
const btnCloseImagePreview = document.getElementById('btn-close-image-preview');
const btnImagePreviewDownload = document.getElementById('btn-image-preview-download');
let currentPreviewDownloadAction = null;

// Theme Modal Elements
const btnTheme = document.getElementById('btn-theme');
const themeModal = document.getElementById('theme-modal');
const btnCloseTheme = document.getElementById('btn-close-theme');

// Mode Switcher & Batch Downloader Elements
const modeSingleBtn = document.getElementById('mode-single-btn');
const modeBatchBtn = document.getElementById('mode-batch-btn');
const singleInputGroup = document.getElementById('single-input-group');
const batchInputGroup = document.getElementById('batch-input-group');

const batchLinksInput = document.getElementById('batch-links-input');
const batchCountBadge = document.getElementById('batch-count-badge');
const btnBatchPaste = document.getElementById('btn-batch-paste');
const btnBatchClear = document.getElementById('btn-batch-clear');
const btnStartBatch = document.getElementById('btn-start-batch');
const batchBtnLabel = document.getElementById('batch-btn-label');

const batchProgressCard = document.getElementById('batch-progress-card');
const batchStatusTitle = document.getElementById('batch-status-title');
const batchStatusCounter = document.getElementById('batch-status-counter');
const batchBarFill = document.getElementById('batch-bar-fill');
const batchQueueList = document.getElementById('batch-queue-list');
const btnCancelBatch = document.getElementById('btn-cancel-batch');

let currentInputMode = 'single';
let parsedBatchUrls = [];
let isBatchRunning = false;
let batchCancelRequested = false;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initPlugins();
  initTheme();
  updateHistoryBadge();
  updateVaultBadge();
  setupEventListeners();
  checkSharedUrl();
});

// Setup Listeners
function setupEventListeners() {
  urlInput.addEventListener('input', handleInputChange);
  btnPaste.addEventListener('click', handlePaste);

  btnClear.addEventListener('click', () => {
    urlInput.value = '';
    handleInputChange();
    urlInput.focus();
  });

  btnFetch.addEventListener('click', handleFetch);

  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleFetch();
  });

  // Mode Switcher Listeners
  if (modeSingleBtn && modeBatchBtn) {
    modeSingleBtn.addEventListener('click', () => switchInputMode('single'));
    modeBatchBtn.addEventListener('click', () => switchInputMode('batch'));
  }

  // Batch Downloader Listeners
  if (batchLinksInput) {
    batchLinksInput.addEventListener('input', handleBatchInputChange);
  }
  if (btnBatchClear) {
    btnBatchClear.addEventListener('click', () => {
      batchLinksInput.value = '';
      handleBatchInputChange();
      batchLinksInput.focus();
    });
  }
  if (btnBatchPaste) {
    btnBatchPaste.addEventListener('click', handleBatchPaste);
  }
  if (btnStartBatch) {
    btnStartBatch.addEventListener('click', startBatchProcess);
  }
  if (btnCancelBatch) {
    btnCancelBatch.addEventListener('click', () => {
      if (isBatchRunning) {
        batchCancelRequested = true;
        showToast('Menghentikan antrean batch...');
      }
    });
  }

  btnHistory.addEventListener('click', openHistoryModal);
  btnCloseHistory.addEventListener('click', closeHistoryModal);
  btnClearHistory.addEventListener('click', clearHistory);

  // Gallery Privacy Vault Listeners
  if (btnVaultLock) {
    btnVaultLock.addEventListener('click', openVaultSetupModal);
  }
  if (galleryLockBadge) {
    galleryLockBadge.addEventListener('click', openVaultSetupModal);
  }
  if (btnPinCancel) {
    btnPinCancel.addEventListener('click', closeHistoryModal);
  }
  if (btnPinBackspace) {
    btnPinBackspace.addEventListener('click', handlePinBackspace);
  }
  document.querySelectorAll('.pin-key[data-num]').forEach(btn => {
    btn.addEventListener('click', () => {
      const num = btn.getAttribute('data-num');
      handlePinDigit(num);
    });
  });

  // Vault Setup Modal Listeners
  if (btnCloseVaultSetup) {
    btnCloseVaultSetup.addEventListener('click', closeVaultSetupModal);
  }
  if (vaultEnableToggle) {
    vaultEnableToggle.addEventListener('change', () => {
      const isChecked = vaultEnableToggle.checked;
      if (vaultFormSection) {
        vaultFormSection.classList.toggle('hidden', !isChecked);
      }
      if (btnSaveVault) {
        btnSaveVault.textContent = isChecked ? 'Simpan Pengaturan PIN' : 'Matikan Proteksi PIN';
      }
      if (vaultSetupAlert) {
        vaultSetupAlert.classList.add('hidden');
      }
    });
  }
  if (btnSaveVault) {
    btnSaveVault.addEventListener('click', handleSaveVaultSetup);
  }

  // Vault Setup Input helpers (auto-focus and enter key to save)
  if (vaultNewPin) {
    vaultNewPin.addEventListener('input', () => {
      if (vaultNewPin.value.length === 4 && vaultConfirmPin) {
        vaultConfirmPin.focus();
      }
    });
  }
  if (vaultConfirmPin) {
    vaultConfirmPin.addEventListener('input', () => {
      if (vaultConfirmPin.value.length === 4) {
        vaultConfirmPin.blur();
      }
    });
  }
  [vaultNewPin, vaultConfirmPin, vaultCurrentPin].forEach(input => {
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSaveVaultSetup();
      });
    }
  });

  // Physical Keyboard Support for Vault PIN Entry
  window.addEventListener('keydown', (e) => {
    if (historyModal && !historyModal.classList.contains('hidden') && isVaultEnabled() && !isVaultUnlocked) {
      if (/^[0-9]$/.test(e.key)) {
        handlePinDigit(e.key);
      } else if (e.key === 'Backspace') {
        handlePinBackspace();
      } else if (e.key === 'Escape') {
        closeHistoryModal();
      }
    }
  });

  // Gallery Filter Pills
  document.querySelectorAll('.gal-filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.gal-filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentGalFilter = pill.getAttribute('data-filter') || 'all';
      renderGalleryList();
    });
  });

  // Offline Player Listeners
  if (btnCloseOfflinePlayer) {
    btnCloseOfflinePlayer.addEventListener('click', closeOfflinePlayer);
  }
  if (btnOfflineShare) {
    btnOfflineShare.addEventListener('click', () => {
      if (currentPlayingItem) shareGalleryItem(currentPlayingItem);
    });
  }

  btnInfo.addEventListener('click', () => helpModal.classList.remove('hidden'));
  btnCloseHelp.addEventListener('click', () => helpModal.classList.add('hidden'));

  // Theme Personalization Listeners
  if (btnTheme && themeModal) {
    btnTheme.addEventListener('click', () => {
      themeModal.classList.remove('hidden');
    });
  }
  if (btnCloseTheme && themeModal) {
    btnCloseTheme.addEventListener('click', () => {
      themeModal.classList.add('hidden');
    });
  }

  // Theme Mode Cards
  document.querySelectorAll('.theme-mode-card').forEach(card => {
    card.addEventListener('click', () => {
      const mode = card.getAttribute('data-mode') || 'amoled';
      applyTheme(mode, currentAccentColor);
      const name = card.querySelector('.theme-mode-name')?.textContent || mode;
      showToast(`Mode ${name} aktif`);
    });
  });

  // Accent Color Buttons
  document.querySelectorAll('.accent-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const accent = btn.getAttribute('data-accent') || 'silver';
      applyTheme(currentThemeMode, accent);
      const name = btn.querySelector('.color-label')?.textContent || accent;
      showToast(`Aksen ${name} aktif`);
    });
  });

  btnCancelDownload.addEventListener('click', () => {
    if (downloadAbortController) {
      downloadAbortController.abort();
      downloadAbortController = null;
    }
    progressModal.classList.add('hidden');
    showToast('Unduhan dibatalkan');
  });

  // Platform Filter Pills
  document.querySelectorAll('.platform-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.platform-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });

  // Close modals on backdrop click
  [historyModal, helpModal, secretModal, offlinePlayerModal, imagePreviewModal, themeModal, vaultSetupModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal === offlinePlayerModal) {
          closeOfflinePlayer();
        } else if (modal === imagePreviewModal) {
          closeImagePreview();
        } else if (modal === historyModal) {
          closeHistoryModal();
        } else if (modal === vaultSetupModal) {
          closeVaultSetupModal();
        } else {
          modal.classList.add('hidden');
        }
      }
    });
  });

  if (btnCloseImagePreview) {
    btnCloseImagePreview.addEventListener('click', closeImagePreview);
  }

  if (btnImagePreviewDownload) {
    btnImagePreviewDownload.addEventListener('click', () => {
      if (typeof currentPreviewDownloadAction === 'function') {
        currentPreviewDownloadAction();
      }
      closeImagePreview();
    });
  }

  // Secret Easter Egg Trigger (Click 3x on PRO badge)
  let proClickCount = 0;
  let proClickTimer = null;
  if (brandBadge) {
    brandBadge.addEventListener('click', () => {
      proClickCount++;
      clearTimeout(proClickTimer);
      proClickTimer = setTimeout(() => {
        proClickCount = 0;
      }, 1200);
      if (proClickCount >= 3) {
        proClickCount = 0;
        openSecretModal();
      }
    });
  }

  if (btnCloseSecret) {
    btnCloseSecret.addEventListener('click', () => secretModal.classList.add('hidden'));
  }

  if (btnSaveSecret) {
    btnSaveSecret.addEventListener('click', () => {
      const cookieVal = tbCookieInput.value.trim();
      if (cookieVal) {
        localStorage.setItem('vdown_tb_cookie', cookieVal);
        showToast('Konfigurasi privat disimpan!');
      } else {
        localStorage.removeItem('vdown_tb_cookie');
        showToast('Konfigurasi privat direset');
      }
      secretModal.classList.add('hidden');
    });
  }

  // Auto-detect Banner Actions
  if (btnClipIgnore) btnClipIgnore.addEventListener('click', dismissClipboardBanner);
  if (btnClipClose) btnClipClose.addEventListener('click', dismissClipboardBanner);
  if (btnClipFetch) btnClipFetch.addEventListener('click', handleClipFetch);

  // Focus & Visibility Auto-Detect Listeners
  window.addEventListener('focus', () => {
    checkClipboardAutoDetect();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkClipboardAutoDetect();
    }
  });

  // When focusing empty input, also check clipboard
  urlInput.addEventListener('focus', () => {
    if (!urlInput.value.trim()) {
      checkClipboardAutoDetect();
    }
  });
}

// Input Change Handler
function handleInputChange() {
  const url = urlInput.value.trim();
  btnClear.classList.toggle('hidden', url.length === 0);

  if (url.length > 5) {
    const platform = detectPlatform(url);
    if (platform && platform !== 'universal') {
      const names = {
        tiktok: 'TIKTOK',
        instagram: 'INSTAGRAM',
        terabox: 'PRIVATE CLOUD',
        youtube: 'YOUTUBE',
        twitter: 'TWITTER',
        facebook: 'FACEBOOK',
        pinterest: 'PINTEREST'
      };
      detectedName.textContent = names[platform] || platform.toUpperCase();
      detectedBar.classList.remove('hidden');
      return;
    }
  }
  detectedBar.classList.add('hidden');
}

// Paste Handler
async function handlePaste() {
  try {
    let text = '';
    if (ClipboardPlugin) {
      const result = await ClipboardPlugin.read();
      text = result.value || '';
    } else if (navigator.clipboard) {
      text = await navigator.clipboard.readText();
    }

    if (text) {
      const urlMatch = text.match(/https?:\/\/[^\s]+/);
      const clean = urlMatch ? urlMatch[0] : text.trim();
      urlInput.value = clean;
      lastIgnoredOrProcessedUrl = clean;
      if (clipboardBanner) clipboardBanner.classList.add('hidden');
      handleInputChange();
      showToast('Tautan berhasil ditempel!');
      handleFetch();
    } else {
      showToast('Papan klip kosong');
    }
  } catch (err) {
    console.warn('Paste failed:', err);
    showToast('Gagal membaca clipboard. Silakan tempel manual.');
  }
}

// ==========================================================================
// Mode Switcher & Batch Downloader Logic
// ==========================================================================
function switchInputMode(mode) {
  currentInputMode = mode;
  if (mode === 'single') {
    modeSingleBtn?.classList.add('active');
    modeBatchBtn?.classList.remove('active');
    singleInputGroup?.classList.remove('hidden');
    batchInputGroup?.classList.add('hidden');
  } else {
    modeSingleBtn?.classList.remove('active');
    modeBatchBtn?.classList.add('active');
    singleInputGroup?.classList.add('hidden');
    batchInputGroup?.classList.remove('hidden');
    batchLinksInput?.focus();
  }
}

function parseUrlsFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const urlRegex = /https?:\/\/[^\s,]+/gi;
  const matches = text.match(urlRegex) || [];
  const cleaned = matches.map(u => u.replace(/[),.;"'>]+$/, '').trim()).filter(u => {
    try {
      const p = new URL(u);
      return p.protocol === 'http:' || p.protocol === 'https:';
    } catch {
      return false;
    }
  });
  return [...new Set(cleaned)];
}

function handleBatchInputChange() {
  const text = batchLinksInput.value;
  parsedBatchUrls = parseUrlsFromText(text);
  const count = parsedBatchUrls.length;

  if (batchCountBadge) {
    batchCountBadge.textContent = `${count} tautan`;
  }

  if (btnBatchClear) {
    btnBatchClear.classList.toggle('hidden', text.trim().length === 0);
  }

  if (btnStartBatch && batchBtnLabel) {
    if (count > 0) {
      btnStartBatch.disabled = false;
      batchBtnLabel.textContent = `Unduh Batch (${count} Tautan)`;
    } else {
      btnStartBatch.disabled = true;
      batchBtnLabel.textContent = `Unduh Batch (0 Tautan)`;
    }
  }
}

async function handleBatchPaste() {
  try {
    let pastedText = '';
    if (ClipboardPlugin) {
      const res = await ClipboardPlugin.read();
      pastedText = res.value || '';
    } else if (navigator.clipboard) {
      pastedText = await navigator.clipboard.readText();
    }

    if (pastedText) {
      if (batchLinksInput.value.trim()) {
        batchLinksInput.value = batchLinksInput.value.trim() + '\n' + pastedText;
      } else {
        batchLinksInput.value = pastedText;
      }
      handleBatchInputChange();
      showToast(`Teks ditempel (${parsedBatchUrls.length} tautan valid)`);
    } else {
      showToast('Papan klip kosong');
    }
  } catch (err) {
    console.warn('Batch paste error:', err);
    showToast('Gagal membaca clipboard. Silakan tempel manual.');
  }
}

async function startBatchProcess() {
  if (isBatchRunning || parsedBatchUrls.length === 0) return;

  isBatchRunning = true;
  batchCancelRequested = false;
  btnStartBatch.disabled = true;
  batchLinksInput.disabled = true;

  // Prepare UI Queue
  batchProgressCard.classList.remove('hidden');
  batchQueueList.innerHTML = '';
  batchBarFill.style.width = '0%';
  batchStatusCounter.textContent = `0 / ${parsedBatchUrls.length} Selesai`;
  batchStatusTitle.textContent = 'Memproses Antrean Batch';

  const queueItems = parsedBatchUrls.map((url, idx) => {
    const platform = detectPlatform(url) || 'universal';
    const queueCard = document.createElement('div');
    queueCard.className = 'batch-queue-item';
    queueCard.id = `batch-item-${idx}`;

    let iconSvg = '';
    if (platform === 'tiktok') {
      iconSvg = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.65a6.34 6.34 0 0 0 10.86 4.49 6.27 6.27 0 0 0 1.83-4.49V8.9a8.18 8.18 0 0 0 4.78 1.52V7a4.85 4.85 0 0 1-.88-.31z"/></svg>`;
    } else if (platform === 'instagram') {
      iconSvg = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`;
    } else {
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>`;
    }

    queueCard.innerHTML = `
      <div class="batch-item-left">
        <div class="batch-item-icon">${iconSvg}</div>
        <div class="batch-item-meta">
          <span class="batch-item-title">${platform.toUpperCase()} #${idx + 1}</span>
          <span class="batch-item-url">${url}</span>
        </div>
      </div>
      <div class="batch-item-status waiting" id="batch-status-tag-${idx}">
        Menunggu
      </div>
    `;

    batchQueueList.appendChild(queueCard);
    return { url, platform, element: queueCard };
  });

  batchProgressCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const total = queueItems.length;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < total; i++) {
    if (batchCancelRequested) {
      setBatchItemUI(i, 'error', 'Dibatalkan');
      continue;
    }

    const current = queueItems[i];
    setBatchItemUI(i, 'extracting', 'Mengekstrak...');
    batchStatusTitle.textContent = `Memproses (${i + 1}/${total})...`;

    try {
      const cleanUrl = cleanMediaUrl(current.url);
      let data = null;

      if (current.platform === 'tiktok') {
        data = await extractTikTok(cleanUrl);
      } else if (current.platform === 'instagram') {
        data = await extractInstagram(cleanUrl);
      } else if (current.platform === 'twitter') {
        data = await extractTwitter(cleanUrl);
      } else if (current.platform === 'youtube') {
        data = await extractYouTube(cleanUrl);
      } else if (current.platform === 'terabox') {
        data = await extractTerabox(cleanUrl);
      } else {
        data = await extractUniversal(cleanUrl, current.platform);
      }

      if (!data || !data.success || !data.formats || data.formats.length === 0) {
        throw new Error('Gagal mengekstrak media.');
      }

      // Update card title if returned
      if (data.title) {
        const titleElem = document.querySelector(`#batch-item-${i} .batch-item-title`);
        if (titleElem) titleElem.textContent = data.title;
      }

      setBatchItemUI(i, 'downloading', 'Mengunduh...');

      // Pick best format
      const bestFormat = data.formats.find(f => f.recommended) ||
                         data.formats.find(f => f.type === 'video') ||
                         data.formats[0];

      if (!bestFormat || !bestFormat.url) {
        throw new Error('Link unduhan kosong.');
      }

      // Download silently to folder & gallery
      await startDownload(bestFormat, data, true);

      setBatchItemUI(i, 'done', 'Selesai ✓');
      successCount++;
    } catch (err) {
      console.warn(`Batch item ${i} error:`, err);
      setBatchItemUI(i, 'error', 'Gagal ✕');
      failCount++;
    }

    // Update global progress bar
    const progressPercent = Math.round(((i + 1) / total) * 100);
    batchBarFill.style.width = `${progressPercent}%`;
    batchStatusCounter.textContent = `${i + 1} / ${total} Selesai (${progressPercent}%)`;

    // Delay between items to avoid IP throttling
    if (i < total - 1 && !batchCancelRequested) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  isBatchRunning = false;
  btnStartBatch.disabled = false;
  batchLinksInput.disabled = false;

  if (batchCancelRequested) {
    batchStatusTitle.textContent = 'Antrean Batch Dihentikan';
    showToast(`Batch dihentikan (${successCount} berhasil, ${failCount} gagal/batal)`);
  } else {
    batchStatusTitle.textContent = 'Batch Download Selesai!';
    showToast(`🎉 Selesai! ${successCount} berhasil diunduh ke galeri.`);
  }
}

function setBatchItemUI(idx, statusClass, statusText) {
  const tag = document.getElementById(`batch-status-tag-${idx}`);
  if (tag) {
    tag.className = `batch-item-status ${statusClass}`;
    tag.textContent = statusText;
  }
}

// Fetch and Extract Media
async function handleFetch() {
  const rawUrl = urlInput.value.trim();
  if (!rawUrl) {
    showError('Silakan tempel tautan video terlebih dahulu.');
    return;
  }

  const match = rawUrl.match(/https?:\/\/[^\s]+/);
  const cleanUrl = match ? match[0] : rawUrl;
  lastIgnoredOrProcessedUrl = cleanUrl;
  if (clipboardBanner) clipboardBanner.classList.add('hidden');

  hideError();
  setFetchLoading(true);
  resultCard.classList.add('hidden');

  // Pause previous players
  if (resVideo) resVideo.pause();
  if (resAudio) resAudio.pause();

  try {
    const platform = detectPlatform(cleanUrl);
    let data;

    if (platform === 'tiktok') {
      data = await extractTikTok(cleanUrl);
    } else if (platform === 'instagram') {
      data = await extractInstagram(cleanUrl);
    } else if (platform === 'twitter') {
      data = await extractTwitter(cleanUrl);
    } else if (platform === 'youtube') {
      data = await extractYouTube(cleanUrl);
    } else if (platform === 'terabox') {
      data = await extractTerabox(cleanUrl);
    } else {
      data = await extractUniversal(cleanUrl, platform);
    }

    if (!data || !data.success) {
      throw new Error('Tidak ada media yang ditemukan untuk tautan ini.');
    }

    currentExtraction = data;
    renderResult(data);
    showToast('Video berhasil dimuat!');
  } catch (err) {
    console.error('Extraction error:', err);
    showError(err.message || 'Gagal mengekstrak video. Pastikan link aktif & publik.');
  } finally {
    setFetchLoading(false);
  }
}

// Render Result Card
function renderResult(data) {
  // Author
  resAuthorName.textContent = data.author?.name || 'Creator';
  resAuthorUser.textContent = data.author?.username || '';
  if (data.author?.avatar) {
    resAvatar.innerHTML = `<img src="${data.author.avatar}" alt="Avatar" />`;
  } else {
    resAvatar.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
  }

  // Tag
  resPlatformTag.textContent = data.platform === 'terabox' ? 'PRIVATE CLOUD' : (data.platform || 'VIDEO').toUpperCase();

  // Title
  resTitle.textContent = data.title || 'Video Media';

  // Inline Video Player / Thumbnail Preview
  if (data.previewVideo) {
    resVideo.removeAttribute('src');
    resVideo.setAttribute('referrerpolicy', 'no-referrer');
    if (data.thumbnail) {
      resVideo.poster = data.thumbnail;
    } else {
      resVideo.removeAttribute('poster');
    }
    resVideo.src = data.previewVideo;
    resVideo.classList.remove('hidden');
    resThumb.classList.add('hidden');
    resVideo.load();
  } else if (data.thumbnail) {
    resVideo.removeAttribute('src');
    resThumb.src = data.thumbnail;
    resThumb.classList.remove('hidden');
    resVideo.classList.add('hidden');
  } else {
    resVideo.removeAttribute('src');
    resThumb.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop';
    resThumb.classList.remove('hidden');
    resVideo.classList.add('hidden');
  }

  if (data.duration) {
    resDuration.textContent = data.duration;
    resDuration.classList.remove('hidden');
  } else {
    resDuration.classList.add('hidden');
  }

  // Inline Audio Player
  if (data.audioUrl) {
    audioPlayerCard.classList.remove('hidden');
    resAudio.src = data.audioUrl;
    audioTitle.textContent = data.audioTitle || 'Soundtrack Original';
  } else {
    audioPlayerCard.classList.add('hidden');
  }

  // Formats List
  formatList.innerHTML = '';
  data.formats.forEach(f => {
    const item = document.createElement('div');
    item.className = `format-item ${f.recommended ? 'recommended' : ''}`;

    let iconSvg = '';
    if (f.type === 'video') {
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>`;
    } else if (f.type === 'audio') {
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
    } else {
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
    }

    const thumbUrl = f.thumb || (f.type === 'image' ? f.url : null) || (f.type === 'video' ? data.thumbnail : null);

    item.innerHTML = `
      <div class="format-info">
        <div class="format-icon ${thumbUrl ? 'has-thumb' : ''}" title="${thumbUrl ? 'Ketuk foto untuk pratinjau' : ''}">
          ${thumbUrl ? `
            <img src="${thumbUrl}" alt="Preview" class="format-thumb-img" referrerpolicy="no-referrer" loading="lazy" />
            ${f.type === 'video' ? `
              <span class="format-thumb-play" title="Video">
                <svg viewBox="0 0 24 24" fill="currentColor" width="9" height="9">
                  <polygon points="6 4 20 12 6 20 6 4"></polygon>
                </svg>
              </span>` : ''}
          ` : ''}
          <div class="format-fallback-icon">${iconSvg}</div>
        </div>
        <div class="format-text">
          <h5>${f.label} ${f.badge ? `<span class="format-badge">${f.badge}</span>` : ''}</h5>
          <span class="format-sub">${f.size ? f.size + ' • ' : ''}${f.ext?.toUpperCase() || 'FILE'}</span>
        </div>
      </div>
      <div class="format-action-icon" title="Unduh">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      </div>
    `;

    // Handle thumbnail image error gracefully
    const thumbImg = item.querySelector('.format-thumb-img');
    if (thumbImg) {
      thumbImg.addEventListener('error', function () {
        const pIcon = this.closest('.format-icon');
        if (pIcon) {
          pIcon.classList.remove('has-thumb');
          const playBadge = pIcon.querySelector('.format-thumb-play');
          if (playBadge) playBadge.remove();
        }
        this.remove();
      });

      // Clicking directly on the thumbnail triggers quick image preview
      thumbImg.closest('.format-icon').addEventListener('click', (e) => {
        e.stopPropagation();
        if (thumbUrl) {
          openImagePreview(thumbUrl, f.label, () => startDownload(f, data));
        } else {
          startDownload(f, data);
        }
      });
    }

    item.addEventListener('click', () => startDownload(f, data));
    formatList.appendChild(item);
  });

  // Multi-item Carousel / Slides Section (Only show when > 1 slide/media)
  const slides = (Array.isArray(data.slides) && data.slides.length > 0)
    ? data.slides
    : (data.isPhotos && Array.isArray(data.images)
      ? data.images.map((url, i) => ({ index: i + 1, type: 'image', ext: 'jpg', url, thumb: url, label: `Foto #${i + 1}` }))
      : []);

  if (slides.length > 1) {
    carouselSection.classList.remove('hidden');
    const isAllPhotos = slides.every(s => s.type === 'image');
    photoCount.textContent = `${slides.length}`;
    const titleHeader = carouselSection.querySelector('.carousel-title-bar h4');
    if (titleHeader) {
      titleHeader.innerHTML = `Slide ${isAllPhotos ? 'Foto' : 'Media'} (<span id="photo-count">${slides.length}</span>)`;
    }
    carouselGrid.innerHTML = '';

    slides.forEach((slide) => {
      const card = document.createElement('div');
      card.className = 'carousel-item';
      card.innerHTML = `
        <img src="${slide.thumb || slide.url}" alt="${slide.label}" referrerpolicy="no-referrer" loading="lazy" />
        ${slide.type === 'video' ? `
          <span class="carousel-video-badge">
            <svg viewBox="0 0 24 24" fill="currentColor" width="9" height="9">
              <polygon points="6 4 20 12 6 20 6 4"></polygon>
            </svg>
            VIDEO
          </span>` : ''}
        <button class="carousel-item-btn" title="Unduh ${slide.label}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
      `;

      // Handle image load error
      const cardImg = card.querySelector('img');
      if (cardImg) {
        cardImg.addEventListener('error', function () {
          this.style.opacity = '0.35';
        });
      }

      // Download button on card
      const dlBtn = card.querySelector('.carousel-item-btn');
      if (dlBtn) {
        dlBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          startDownload({
            id: `slide_${slide.index}`,
            label: `${slide.label} ${slide.type === 'video' ? 'HD' : ''}`,
            url: slide.url,
            ext: slide.ext,
            type: slide.type
          }, data);
        });
      }

      // Tapping card opens photo preview if image, or triggers download
      card.addEventListener('click', () => {
        if (slide.type === 'image') {
          openImagePreview(slide.url, slide.label, () => {
            startDownload({
              id: `slide_${slide.index}`,
              label: slide.label,
              url: slide.url,
              ext: slide.ext,
              type: slide.type
            }, data);
          });
        } else {
          startDownload({
            id: `slide_${slide.index}`,
            label: `${slide.label} HD`,
            url: slide.url,
            ext: slide.ext,
            type: slide.type
          }, data);
        }
      });

      carouselGrid.appendChild(card);
    });

    btnDownloadAllPhotos.textContent = `Unduh Semua (${slides.length})`;
    btnDownloadAllPhotos.onclick = () => {
      showToast(`Mengunduh ${slides.length} media secara berurutan...`);
      slides.forEach((slide, idx) => {
        setTimeout(() => {
          startDownload({
            id: `slide_${slide.index}`,
            label: `${slide.label} ${slide.type === 'video' ? 'HD' : ''}`,
            url: slide.url,
            ext: slide.ext,
            type: slide.type
          }, data, true);
        }, idx * 700);
      });
    };
  } else {
    carouselSection.classList.add('hidden');
  }

  resultCard.classList.remove('hidden');
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Download Process Manager
async function startDownload(format, parentData, silent = false) {
  const ext = format.ext || (format.type === 'video' ? 'mp4' : (format.type === 'audio' ? 'mp3' : 'jpg'));
  
  // Use original filename if available (especially for TeraBox ZIP / documents / media)
  let filename;
  if (parentData.title && /\.[a-zA-Z0-9]{2,6}$/.test(parentData.title.trim())) {
    filename = parentData.title.trim().replace(/[\\/:*?"<>|]/g, '_');
  } else {
    filename = `Zyp_${(parentData.platform || 'media').toUpperCase()}_${Date.now()}.${ext}`;
  }

  const directUrl = format.url;

  // Comprehensive MIME types for video, photo, zip, docs, etc.
  let mimeType = 'application/octet-stream';
  if (ext === 'mp4' || format.type === 'video') mimeType = 'video/mp4';
  else if (ext === 'mkv') mimeType = 'video/x-matroska';
  else if (ext === 'mp3' || format.type === 'audio') mimeType = 'audio/mpeg';
  else if (ext === 'jpg' || ext === 'jpeg' || format.type === 'image') mimeType = 'image/jpeg';
  else if (ext === 'png') mimeType = 'image/png';
  else if (ext === 'webp') mimeType = 'image/webp';
  else if (ext === 'zip') mimeType = 'application/zip';
  else if (ext === 'rar') mimeType = 'application/x-rar-compressed';
  else if (ext === '7z') mimeType = 'application/x-7z-compressed';
  else if (ext === 'pdf') mimeType = 'application/pdf';
  else if (ext === 'apk') mimeType = 'application/vnd.android.package-archive';

  // 1. Android Native Bridge (Saves directly to public Downloads folder & Galeri with system notification)
  if (window.AndroidBridge && typeof window.AndroidBridge.downloadUrl === 'function') {
    try {
      window.AndroidBridge.downloadUrl(directUrl, filename, mimeType);
      recordDownloadHistory(parentData, format, filename, directUrl, mimeType, ext);

      if (!silent) {
        showToast('🚀 Unduhan dimulai! Cek notifikasi status bar HP.');
      }
      return;
    } catch (bridgeErr) {
      console.warn('AndroidBridge error, falling back:', bridgeErr);
    }
  }

  // 2. Web browser fallback (for PC / preview testing)
  if (!silent) {
    progressTitle.textContent = `Mengunduh ${format.label}...`;
    progressDetail.textContent = 'Memulai unduhan...';
    progressPercent.textContent = '0%';
    barFill.style.width = '0%';
    progressModal.classList.remove('hidden');
  }

  downloadAbortController = new AbortController();

  try {
    try {
      const response = await fetch(directUrl, {
        signal: downloadAbortController.signal,
        headers: { 'Accept': '*/*' }
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      let loadedBytes = 0;

      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        loadedBytes += value.length;

        if (totalBytes > 0 && !silent) {
          const percent = Math.round((loadedBytes / totalBytes) * 100);
          progressPercent.textContent = `${percent}%`;
          barFill.style.width = `${percent}%`;
          progressDetail.textContent = `${(loadedBytes / (1024 * 1024)).toFixed(1)} MB / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
        }
      }

      const blob = new Blob(chunks, { type: mimeType });

      // If AndroidBridge saveBase64 is available:
      if (window.AndroidBridge && typeof window.AndroidBridge.saveBase64 === 'function') {
        const readerB64 = new FileReader();
        readerB64.onloadend = () => {
          window.AndroidBridge.saveBase64(readerB64.result, filename, mimeType);
        };
        readerB64.readAsDataURL(blob);
      } else {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      }

      recordDownloadHistory(parentData, format, filename, directUrl, mimeType, ext);

      if (!silent) {
        progressModal.classList.add('hidden');
        showToast('✅ Unduhan Selesai! Tersimpan di folder unduhan.');
      }
    } catch (streamErr) {
      if (downloadAbortController.signal.aborted) return;

      console.warn('Stream fetch error, falling back to direct anchor download:', streamErr);
      const a = document.createElement('a');
      a.href = directUrl;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      recordDownloadHistory(parentData, format, filename, directUrl, mimeType, ext);

      if (!silent) {
        progressModal.classList.add('hidden');
        showToast('Memulai pengunduhan file...');
      }
    }
  } catch (err) {
    if (downloadAbortController?.signal?.aborted) return;
    console.error('Download error:', err);
    if (!silent) {
      progressModal.classList.add('hidden');
      showError('Gagal mengunduh file: ' + err.message);
    }
  } finally {
    downloadAbortController = null;
  }
}

// ==========================================================================
// Offline Gallery & Media Management
// ==========================================================================
function recordDownloadHistory(parentData, format, filename, directUrl, mimeType, ext) {
  const isVideo = ext === 'mp4' || ext === 'mkv' || format.type === 'video';
  const isAudio = ext === 'mp3' || ext === 'm4a' || ext === 'wav' || format.type === 'audio';
  const isImage = ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp' || format.type === 'image';

  addToHistory({
    id: Date.now().toString() + Math.floor(Math.random() * 1000),
    title: parentData.title || format.label || filename,
    platform: parentData.platform || 'media',
    thumbnail: parentData.thumbnail || '',
    filename: filename,
    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    format: format.badge || ext.toUpperCase(),
    type: isVideo ? 'video' : isAudio ? 'audio' : isImage ? 'image' : 'file',
    mimeType: mimeType,
    url: directUrl
  });
}

function addToHistory(item) {
  downloadHistory.unshift(item);
  if (downloadHistory.length > 60) downloadHistory.pop();
  localStorage.setItem('vdown_history', JSON.stringify(downloadHistory));
  updateHistoryBadge();
}

function updateHistoryBadge() {
  const count = downloadHistory.length;
  if (historyBadge) {
    historyBadge.textContent = count;
    historyBadge.classList.toggle('hidden', count === 0);
  }
}

// ==========================================================================
// Gallery Privacy Vault & PIN Protection Logic
// ==========================================================================
function isVaultEnabled() {
  const enabled = localStorage.getItem('vdown_vault_enabled') === 'true';
  const hasPin = !!localStorage.getItem('vdown_vault_pin');
  return enabled && hasPin;
}

function verifyVaultPin(pin) {
  const stored = localStorage.getItem('vdown_vault_pin');
  if (!stored || !pin) return false;
  try {
    return btoa(pin) === stored;
  } catch (e) {
    return false;
  }
}

function lockVault() {
  isVaultUnlocked = false;
  vaultPinBuffer = '';
  updatePinDots();
  if (isVaultEnabled()) {
    if (vaultLockView) vaultLockView.classList.remove('hidden');
    if (galleryUnlockedContent) galleryUnlockedContent.classList.add('hidden');
    updateVaultBadge();
  }
}

function updateVaultBadge() {
  if (!galleryLockBadge) return;
  const enabled = isVaultEnabled();
  galleryLockBadge.className = 'vault-badge';

  if (!enabled) {
    galleryLockBadge.classList.add('public');
    galleryLockBadge.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="11" height="11">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
      </svg>
      <span>Publik</span>
    `;
  } else if (isVaultUnlocked) {
    galleryLockBadge.classList.add('unlocked');
    galleryLockBadge.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="11" height="11">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
      </svg>
      <span>Terbuka</span>
    `;
  } else {
    galleryLockBadge.classList.add('locked');
    galleryLockBadge.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="11" height="11">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      <span>Terkunci</span>
    `;
  }
}

function updatePinDots() {
  const dots = document.querySelectorAll('.pin-dot');
  dots.forEach((dot, idx) => {
    dot.classList.remove('error', 'success');
    dot.classList.toggle('filled', idx < vaultPinBuffer.length);
  });
}

function handlePinDigit(digit) {
  if (vaultPinBuffer.length >= 4) return;
  vaultPinBuffer += digit;
  updatePinDots();

  if (vaultPinBuffer.length === 4) {
    if (verifyVaultPin(vaultPinBuffer)) {
      // PIN Correct!
      const dots = document.querySelectorAll('.pin-dot');
      dots.forEach(dot => dot.classList.add('success'));
      if (navigator.vibrate) navigator.vibrate(40);

      setTimeout(() => {
        isVaultUnlocked = true;
        vaultPinBuffer = '';
        if (vaultLockView) vaultLockView.classList.add('hidden');
        if (galleryUnlockedContent) galleryUnlockedContent.classList.remove('hidden');
        updateVaultBadge();
        renderGalleryList();
        showToast('🔓 Galeri Berhasil Dibuka');
      }, 200);
    } else {
      // PIN Incorrect!
      if (vaultPinDots) vaultPinDots.classList.add('shake-error');
      const dots = document.querySelectorAll('.pin-dot');
      dots.forEach(dot => dot.classList.add('error'));
      if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
      showToast('❌ PIN Salah! Coba lagi');

      setTimeout(() => {
        if (vaultPinDots) vaultPinDots.classList.remove('shake-error');
        vaultPinBuffer = '';
        updatePinDots();
      }, 550);
    }
  }
}

function handlePinBackspace() {
  if (vaultPinBuffer.length > 0) {
    vaultPinBuffer = vaultPinBuffer.slice(0, -1);
    updatePinDots();
  }
}

function openHistoryModal() {
  updateVaultBadge();

  if (isVaultEnabled() && !isVaultUnlocked) {
    vaultPinBuffer = '';
    updatePinDots();
    if (vaultLockView) vaultLockView.classList.remove('hidden');
    if (galleryUnlockedContent) galleryUnlockedContent.classList.add('hidden');
  } else {
    if (vaultLockView) vaultLockView.classList.add('hidden');
    if (galleryUnlockedContent) galleryUnlockedContent.classList.remove('hidden');
    currentGalFilter = 'all';
    document.querySelectorAll('.gal-filter-pill').forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-filter') === 'all');
    });
    renderGalleryList();
  }

  if (historyModal) historyModal.classList.remove('hidden');
}

function closeHistoryModal() {
  if (historyModal) historyModal.classList.add('hidden');
  lockVault();
}

function openVaultSetupModal() {
  if (!vaultSetupModal) return;
  const enabled = isVaultEnabled();
  if (vaultEnableToggle) vaultEnableToggle.checked = enabled;
  if (vaultFormSection) vaultFormSection.classList.toggle('hidden', !enabled);
  if (vaultCurrentPinGroup) vaultCurrentPinGroup.classList.toggle('hidden', !enabled || isVaultUnlocked);
  if (btnSaveVault) {
    btnSaveVault.textContent = enabled ? 'Simpan Pengaturan PIN' : 'Aktifkan Proteksi PIN';
  }
  if (vaultCurrentPin) vaultCurrentPin.value = '';
  if (vaultNewPin) vaultNewPin.value = '';
  if (vaultConfirmPin) vaultConfirmPin.value = '';
  if (vaultSetupAlert) {
    vaultSetupAlert.textContent = '';
    vaultSetupAlert.classList.add('hidden');
  }
  vaultSetupModal.classList.remove('hidden');
}

function closeVaultSetupModal() {
  if (vaultSetupModal) vaultSetupModal.classList.add('hidden');
  if (vaultSetupAlert) {
    vaultSetupAlert.textContent = '';
    vaultSetupAlert.classList.add('hidden');
  }
}

function showVaultSetupAlert(msg) {
  if (vaultSetupAlert) {
    vaultSetupAlert.textContent = msg;
    vaultSetupAlert.classList.remove('hidden');
  }
}

function handleSaveVaultSetup() {
  const isEnabledCurrently = isVaultEnabled();
  const willEnable = vaultEnableToggle ? vaultEnableToggle.checked : false;

  // Case 1: Disabling Vault - direct and clean
  if (!willEnable) {
    localStorage.removeItem('vdown_vault_enabled');
    localStorage.removeItem('vdown_vault_pin');
    isVaultUnlocked = true;
    updateVaultBadge();
    closeVaultSetupModal();
    showToast('🔓 Kunci Privasi Berhasil Dinonaktifkan');
    if (historyModal && !historyModal.classList.contains('hidden')) {
      openHistoryModal();
    }
    return;
  }

  // Case 2: Enabling Vault or Changing PIN
  if (isEnabledCurrently && !isVaultUnlocked) {
    const curPin = vaultCurrentPin ? vaultCurrentPin.value.trim() : '';
    if (!verifyVaultPin(curPin)) {
      showVaultSetupAlert('PIN saat ini salah!');
      return;
    }
  }

  const newPin = vaultNewPin ? vaultNewPin.value.trim() : '';
  const confirmPin = vaultConfirmPin ? vaultConfirmPin.value.trim() : '';

  if (!/^\d{4}$/.test(newPin)) {
    showVaultSetupAlert('PIN baru harus tepat 4 digit angka (0-9)!');
    return;
  }

  if (newPin !== confirmPin) {
    showVaultSetupAlert('Konfirmasi PIN tidak cocok!');
    return;
  }

  localStorage.setItem('vdown_vault_enabled', 'true');
  localStorage.setItem('vdown_vault_pin', btoa(newPin));
  isVaultUnlocked = true; // allow immediate access after setup
  updateVaultBadge();
  closeVaultSetupModal();
  showToast('🔐 Kunci Privasi Galeri Aktif!');

  if (historyModal && !historyModal.classList.contains('hidden')) {
    openHistoryModal();
  }
}

function renderGalleryList() {
  if (!historyList || !historyTotal) return;

  const totalCount = downloadHistory.length;
  historyTotal.textContent = `${totalCount} file`;
  historyList.innerHTML = '';

  let filtered = downloadHistory;
  if (currentGalFilter === 'video') {
    filtered = downloadHistory.filter(i => i.type === 'video' || i.format?.toLowerCase().includes('mp4') || i.filename?.toLowerCase().endsWith('.mp4'));
  } else if (currentGalFilter === 'audio') {
    filtered = downloadHistory.filter(i => i.type === 'audio' || i.format?.toLowerCase().includes('mp3') || i.filename?.toLowerCase().endsWith('.mp3') || i.filename?.toLowerCase().endsWith('.m4a'));
  } else if (currentGalFilter === 'file') {
    filtered = downloadHistory.filter(i => {
      const isVid = i.type === 'video' || i.format?.toLowerCase().includes('mp4') || i.filename?.toLowerCase().endsWith('.mp4');
      const isAud = i.type === 'audio' || i.format?.toLowerCase().includes('mp3') || i.filename?.toLowerCase().endsWith('.mp3') || i.filename?.toLowerCase().endsWith('.m4a');
      return !isVid && !isAud;
    });
  }

  if (filtered.length === 0) {
    historyList.innerHTML = `
      <div class="empty-history">
        <span class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        </span>
        <p>${totalCount === 0 ? 'Belum ada file di galeri.' : 'Tidak ada file dalam kategori ini.'}</p>
        <span class="empty-sub">Video dan file yang kamu unduh akan tersimpan rapi di sini.</span>
      </div>
    `;
    return;
  }

  filtered.forEach(item => {
    const isVideo = item.type === 'video' || item.format?.toLowerCase().includes('mp4') || item.filename?.toLowerCase().endsWith('.mp4');
    const isAudio = item.type === 'audio' || item.format?.toLowerCase().includes('mp3') || item.filename?.toLowerCase().endsWith('.mp3') || item.filename?.toLowerCase().endsWith('.m4a');
    const defaultThumb = isAudio
      ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop'
      : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop';

    const card = document.createElement('div');
    card.className = 'history-item';
    card.innerHTML = `
      <div class="hist-top-row">
        <div class="hist-thumb-wrap" style="cursor: pointer;" title="Buka / Putar">
          <img src="${item.thumbnail || defaultThumb}" class="hist-thumb" alt="Thumbnail" />
          ${isVideo ? `
            <div class="hist-play-overlay">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
          ` : ''}
        </div>
        <div class="hist-info">
          <span class="hist-title" title="${item.title || item.filename}">${item.title || item.filename}</span>
          <div class="hist-meta-row">
            <span class="hist-badge ${item.platform === 'terabox' ? 'tb' : ''}">${item.platform ? item.platform.toUpperCase() : 'MEDIA'}</span>
            <span class="hist-badge">${item.format || (isVideo ? 'MP4' : isAudio ? 'MP3' : 'FILE')}</span>
            <span class="hist-date">${item.date}</span>
          </div>
        </div>
      </div>
      <div class="hist-actions-bar">
        <button class="hist-btn-del" title="Hapus file" aria-label="Hapus">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
        <button class="hist-btn-share" title="Bagikan ke WhatsApp, Telegram, dll.">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
          Bagikan
        </button>
        <button class="hist-btn-play" title="${isVideo ? 'Putar Video' : 'Buka File'}">
          <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          ${isVideo ? 'Putar' : isAudio ? 'Dengar' : 'Buka'}
        </button>
      </div>
    `;

    card.querySelector('.hist-thumb-wrap').addEventListener('click', () => playGalleryItem(item));
    card.querySelector('.hist-btn-play').addEventListener('click', () => playGalleryItem(item));
    card.querySelector('.hist-btn-share').addEventListener('click', () => shareGalleryItem(item));
    card.querySelector('.hist-btn-del').addEventListener('click', () => deleteGalleryItem(item.id));

    historyList.appendChild(card);
  });
}

function playGalleryItem(item) {
  const isVideo = item.type === 'video' || item.format?.toLowerCase().includes('mp4') || item.filename?.toLowerCase().endsWith('.mp4');
  const isAudio = item.type === 'audio' || item.format?.toLowerCase().includes('mp3') || item.filename?.toLowerCase().endsWith('.mp3') || item.filename?.toLowerCase().endsWith('.m4a');
  const mime = item.mimeType || (isVideo ? 'video/mp4' : isAudio ? 'audio/mpeg' : '*/*');

  // Android Native Player via Intent
  if (window.AndroidBridge && typeof window.AndroidBridge.openFile === 'function') {
    window.AndroidBridge.openFile(item.filename, mime);
    return;
  }

  // In-app fallback (for web or direct url preview)
  if (isVideo || isAudio) {
    currentPlayingItem = item;
    if (offlinePlayerTitle) offlinePlayerTitle.textContent = item.title || item.filename;
    if (offlinePlayerBadge) offlinePlayerBadge.textContent = (item.platform || 'MEDIA').toUpperCase();
    if (offlineVideo) {
      offlineVideo.src = item.url || '';
      offlineVideo.play().catch(e => console.log('Autoplay prevented:', e));
    }
    if (offlinePlayerModal) {
      offlinePlayerModal.classList.remove('hidden');
    }
  } else if (item.url) {
    window.open(item.url, '_blank');
  } else {
    showToast('File tersimpan di folder Download perangkat');
  }
}

function closeOfflinePlayer() {
  if (offlineVideo) {
    offlineVideo.pause();
    offlineVideo.removeAttribute('src');
    offlineVideo.load();
  }
  if (offlinePlayerModal) {
    offlinePlayerModal.classList.add('hidden');
  }
  currentPlayingItem = null;
}

function shareGalleryItem(item) {
  const isVideo = item.type === 'video' || item.format?.toLowerCase().includes('mp4') || item.filename?.toLowerCase().endsWith('.mp4');
  const isAudio = item.type === 'audio' || item.format?.toLowerCase().includes('mp3') || item.filename?.toLowerCase().endsWith('.mp3') || item.filename?.toLowerCase().endsWith('.m4a');
  const mime = item.mimeType || (isVideo ? 'video/mp4' : isAudio ? 'audio/mpeg' : '*/*');

  // 1. Android FileProvider Share (WhatsApp, Telegram, etc.)
  if (window.AndroidBridge && typeof window.AndroidBridge.shareFile === 'function') {
    window.AndroidBridge.shareFile(item.filename, mime);
    showToast('Membuka menu bagikan...');
    return;
  }

  // 2. Web Share API fallback
  if (navigator.share) {
    navigator.share({
      title: item.title || 'Zyp Media',
      text: `Unduh ${item.title || 'media'} via Zyp`,
      url: item.url || window.location.origin
    }).catch(err => {
      if (err.name !== 'AbortError') console.log('Share error:', err);
    });
    return;
  }

  // 3. Fallback: Copy link
  if (item.url) {
    navigator.clipboard.writeText(item.url).then(() => {
      showToast('Tautan disalin ke papan klip');
    }).catch(() => {
      showToast('Gagal membagikan');
    });
  }
}

function deleteGalleryItem(id) {
  const itemIndex = downloadHistory.findIndex(i => i.id === id);
  if (itemIndex === -1) return;
  const item = downloadHistory[itemIndex];

  if (!confirm(`Hapus "${item.title || item.filename}" dari riwayat dan penyimpanan perangkat?`)) {
    return;
  }

  if (window.AndroidBridge && typeof window.AndroidBridge.deleteFile === 'function') {
    window.AndroidBridge.deleteFile(item.filename);
  }

  downloadHistory.splice(itemIndex, 1);
  localStorage.setItem('vdown_history', JSON.stringify(downloadHistory));
  updateHistoryBadge();
  renderGalleryList();
  showToast('File berhasil dihapus.');
}

function clearHistory() {
  if (confirm('Bersihkan semua riwayat galeri unduhan?')) {
    downloadHistory = [];
    localStorage.removeItem('vdown_history');
    updateHistoryBadge();
    renderGalleryList();
    showToast('Galeri unduhan dibersihkan');
  }
}

// Check shared URL (from other apps via Android SEND Intent)
function checkSharedUrl() {
  window.handleSharedText = (text) => {
    if (text) {
      const match = text.match(/https?:\/\/[^\s]+/);
      if (match) {
        urlInput.value = match[0];
        handleInputChange();
        setTimeout(handleFetch, 300);
      }
    }
  };

  const urlParams = new URLSearchParams(window.location.search);
  const shared = urlParams.get('url') || urlParams.get('text');
  if (shared) {
    const match = shared.match(/https?:\/\/[^\s]+/);
    if (match) {
      urlInput.value = match[0];
      handleInputChange();
      setTimeout(handleFetch, 400);
    }
  }

  if (AppPlugin) {
    AppPlugin.addListener('appUrlOpen', (event) => {
      if (event.url) {
        const match = event.url.match(/https?:\/\/[^\s]+/);
        if (match) {
          urlInput.value = match[0];
          handleInputChange();
          handleFetch();
        }
      }
    });
  }
}

// Helpers
function setFetchLoading(isLoading) {
  const btnText = btnFetch.querySelector('.btn-text');
  const btnLoader = btnFetch.querySelector('.btn-loader');
  btnFetch.disabled = isLoading;
  btnText.classList.toggle('hidden', isLoading);
  btnLoader.classList.toggle('hidden', !isLoading);
}

function showError(msg) {
  alertMsg.textContent = msg;
  alertBox.classList.remove('hidden');
}

function hideError() {
  alertBox.classList.add('hidden');
}

function showToast(msg) {
  toastMsg.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2800);
}

// ==========================================================================
// Clipboard Auto-Detect Engine
// ==========================================================================
async function checkClipboardAutoDetect() {
  if (isCheckingClipboard) return;
  if (document.hidden) return;

  isCheckingClipboard = true;
  try {
    let text = '';
    if (ClipboardPlugin) {
      const result = await ClipboardPlugin.read();
      text = result.value || '';
    } else if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        text = await navigator.clipboard.readText();
      } catch (clipErr) {
        // Ignored if browser permission not yet given or not in active user gesture
      }
    }

    if (!text || typeof text !== 'string') {
      isCheckingClipboard = false;
      return;
    }

    const match = text.match(/https?:\/\/[^\s]+/);
    if (!match) {
      isCheckingClipboard = false;
      return;
    }

    const candidateUrl = match[0].trim();

    // Skip if already in input or already processed/dismissed
    if (urlInput.value.trim() === candidateUrl || candidateUrl === lastIgnoredOrProcessedUrl) {
      isCheckingClipboard = false;
      return;
    }

    const platform = detectPlatform(candidateUrl);
    if (platform && platform !== 'universal') {
      showClipboardBanner(candidateUrl, platform);
    }
  } catch (err) {
    console.debug('Clipboard auto-detect check failed:', err);
  } finally {
    isCheckingClipboard = false;
  }
}

function showClipboardBanner(url, platform) {
  if (!clipboardBanner) return;
  detectedClipUrl = url;
  const names = {
    tiktok: 'TIKTOK',
    instagram: 'INSTAGRAM',
    terabox: 'PRIVATE CLOUD',
    youtube: 'YOUTUBE',
    twitter: 'TWITTER',
    facebook: 'FACEBOOK',
    pinterest: 'PINTEREST'
  };
  if (clipPlatformBadge) {
    clipPlatformBadge.textContent = names[platform] || platform.toUpperCase();
  }
  if (clipUrlText) {
    clipUrlText.textContent = url;
  }
  clipboardBanner.classList.remove('hidden');
}

function openSecretModal() {
  if (!secretModal) return;
  const savedCookie = localStorage.getItem('vdown_tb_cookie') || '';
  if (tbCookieInput) tbCookieInput.value = savedCookie;
  secretModal.classList.remove('hidden');
}

function dismissClipboardBanner() {
  lastIgnoredOrProcessedUrl = detectedClipUrl;
  if (clipboardBanner) clipboardBanner.classList.add('hidden');
}

function handleClipFetch() {
  if (!detectedClipUrl) return;
  const targetUrl = detectedClipUrl;
  lastIgnoredOrProcessedUrl = targetUrl;
  if (clipboardBanner) clipboardBanner.classList.add('hidden');

  urlInput.value = targetUrl;
  handleInputChange();
  showToast('Tautan otomatis diterapkan!');
  handleFetch();
}

// Quick Image Preview Modal Controls
function openImagePreview(url, title, downloadCallback) {
  if (!imagePreviewModal || !url) return;
  if (imagePreviewTitle) imagePreviewTitle.textContent = title || 'Pratinjau Foto';
  if (imagePreviewElem) imagePreviewElem.src = url;
  currentPreviewDownloadAction = downloadCallback;
  imagePreviewModal.classList.remove('hidden');
}

function closeImagePreview() {
  if (imagePreviewModal) imagePreviewModal.classList.add('hidden');
  if (imagePreviewElem) imagePreviewElem.src = '';
  currentPreviewDownloadAction = null;
}



