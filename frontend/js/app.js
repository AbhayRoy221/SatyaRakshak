/**
 * CrisisVerify — Main App Controller (Unified Multi-Modal)
 */
import { checkHealth, verifyUnified } from './api.js';
import { renderUnifiedResults, resetUI } from './ui.js';
import { initParticles } from './particles.js';

const els = {
  form: document.getElementById('unified-form'),
  claimInput: document.getElementById('claim-input'),
  imageInput: document.getElementById('image-input'),
  imagePreview: document.getElementById('image-preview'),
  previewImg: document.getElementById('preview-img'),
  previewName: document.getElementById('preview-name'),
  btnRemoveImage: document.getElementById('btn-remove-image'),
  
  sourceDomain: document.getElementById('source-domain'),
  authorName: document.getElementById('author-name'),
  authorCount: document.getElementById('author-count'),
  
  btnVerify: document.getElementById('btn-verify-unified'),
  loadingOverlay: document.getElementById('loading-overlay'),
  scanningLine: document.getElementById('scanning-line'),
  statusDots: document.getElementById('status-dots')
};

let currentImageFile = null;

// Initialize app
async function init() {
  initParticles();
  setupEventListeners();
  performHealthCheck();
}

function setupEventListeners() {
  // Form submission
  els.form.addEventListener('submit', handleVerification);

  // Image Drag & Drop / Selection
  const dropZone = document.getElementById('upload-zone');
  
  els.imageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  // Explicitly link dropzone click to file input
  dropZone.addEventListener('click', () => {
    els.imageInput.click();
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  els.btnRemoveImage.addEventListener('click', () => {
    currentImageFile = null;
    els.imageInput.value = '';
    els.imagePreview.style.display = 'none';
  });

  // Demo buttons
  document.querySelectorAll('[data-demo]').forEach(btn => {
    btn.addEventListener('click', (e) => loadDemo(e.target.dataset.demo));
  });
}

function handleFileSelected(file) {
  // Basic validation
  if (!file.type.startsWith('image/')) {
    alert('Please upload an image file (JPEG, PNG, WebP).');
    return;
  }
  
  if (file.size > 20 * 1024 * 1024) {
    alert('File is too large. Maximum size is 20MB. This keeps our multi-modal engine extremely fast and stable.');
    return;
  }

  currentImageFile = file;
  
  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    els.previewImg.src = e.target.result;
    els.previewName.textContent = file.name;
    els.imagePreview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function loadDemo(type) {
  if (type === 'earthquake') {
    els.claimInput.value = "Massive earthquake in Pune right now, 500 dead. Buildings collapsed across the city. Government has declared emergency.";
    els.sourceDomain.value = "whatsapp-forward.com";
    els.authorCount.value = "1";
    currentImageFile = null;
    els.imagePreview.style.display = 'none';
  }
}

async function handleVerification(e) {
  e.preventDefault();
  
  const textVal = els.claimInput.value.trim();
  
  if (!currentImageFile && (!textVal || textVal.length === 0)) {
    alert('Please provide either an image or a text claim to verify.');
    return;
  }

  // UI loading state
  resetUI();
  els.btnVerify.classList.add('loading');
  els.btnVerify.disabled = true;
  els.loadingOverlay.style.display = 'flex';
  els.scanningLine.classList.add('active');
  
  // Scroll to loading
  els.loadingOverlay.scrollIntoView({ behavior: 'smooth', block: 'center' });

  try {
    const result = await verifyUnified(
      currentImageFile, 
      textVal, 
      {
        sourceDomain: els.sourceDomain.value.trim(),
        authorName: els.authorName.value.trim(),
        authorCount: parseInt(els.authorCount.value) || 1
      }
    );

    els.loadingOverlay.style.display = 'none';
    renderUnifiedResults(result);

  } catch (err) {
    console.error(err);
    alert('Verification Engine Error: ' + err.message);
    els.loadingOverlay.style.display = 'none';
  } finally {
    els.btnVerify.classList.remove('loading');
    els.btnVerify.disabled = false;
    els.scanningLine.classList.remove('active');
  }
}

async function performHealthCheck() {
  const health = await checkHealth();
  
  if (!health) {
    els.statusDots.innerHTML = `<span style="color:var(--red)">•</span> Engine Offline`;
    return;
  }

  const nodes = [];
  
  // Supabase check
  if (health.services.database) {
    nodes.push(`<span style="color:var(--green)">•</span> DB`);
  } else {
    nodes.push(`<span style="color:var(--amber)">•</span> DB (Fallback)`);
  }

  // LLM check
  if (health.services.llm) {
    nodes.push(`<span style="color:var(--green)">•</span> LLM (${health.models.primary})`);
  } else {
    nodes.push(`<span style="color:var(--amber)">•</span> LLM (Fallback)`);
  }

  // Vision check
  nodes.push(`<span style="color:var(--green)">•</span> Vision OCR`);

  els.statusDots.innerHTML = nodes.join(' &nbsp;|&nbsp; ');
}

// Boot application
init();
