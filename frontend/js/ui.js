/**
 * CrisisVerify — V1 Detailed Forensic UI Renderer (Multi-Modal Upgraded)
 */
import { drawCsGauge } from './charts.js';

const els = {
  results: document.getElementById('results'),
  verdictBanner: document.getElementById('verdict-banner'),
  tracksGrid: document.getElementById('tracks-grid'),
  evidencePanel: document.getElementById('evidence-panel'),
  aiAnalysis: document.getElementById('ai-analysis')
};

export function renderUnifiedResults(data) {
  // Show results section
  els.results.classList.add('visible');

  // 1. Render Top Verdict Banner
  renderVerdictBanner(data);

  // 2. Render Track Cards Grid
  renderTracksGrid(data);

  // 3. Render Evidence Sources
  renderEvidencePanel(data);

  // 4. Render AI Forensic Analysis
  renderAIAnalysis(data.verdict.aiAnalysis, data.verdict.model);
}

function renderVerdictBanner(data) {
  const isHighRisk = data.verdict.status === 'HIGH_RISK';
  const isVerified = data.verdict.status === 'VERIFIED';
  
  const statusColor = isHighRisk ? 'var(--red)' : isVerified ? 'var(--green)' : 'var(--amber)';
  const statusText = isHighRisk ? 'HIGH RISK MISINFORMATION' : isVerified ? 'VERIFIED — CLAIM CORROBORATED' : 'UNCERTAIN — UNVERIFIABLE';
  
  const confidenceMatch = data.verdict.aiAnalysis ? data.verdict.aiAnalysis.match(/CONFIDENCE:\s*(\d+%)/) : null;
  const confidence = confidenceMatch ? confidenceMatch[1] : 'N/A';

  const riskLabel = isHighRisk ? 'HIGH' : isVerified ? 'LOW' : 'MODERATE';

  els.verdictBanner.innerHTML = `
    <div style="font-size: 1.5rem; font-weight: 700; letter-spacing: 2px; color: ${statusColor}; margin-bottom: 8px;">
      ${statusText}
    </div>
    <div style="font-size: 0.9rem; color: var(--text-secondary); display: flex; gap: 16px;">
      <span>Confidence: <strong style="color: #fff;">${confidence}</strong></span>
      <span>·</span>
      <span>Risk Level: <strong style="color: ${statusColor};">${riskLabel}</strong></span>
    </div>
    <div class="verdict-banner__bg-icon">${isHighRisk ? '🚨' : isVerified ? '🛡️' : '⚠️'}</div>
  `;
}

function renderTracksGrid(data) {
  let html = '';

  // Track 1: G-RAG
  if (data.tracks.grag) {
    const g = data.tracks.grag;
    html += `
      <div class="track-card">
        <div class="track-card__header">
          <div class="track-card__number">T1</div>
          <div class="track-card__title">G-RAG Geographic Grounding</div>
          <div class="track-card__badge ${g.corroborationLevel === 'STRONG' || g.corroborationLevel === 'MODERATE' || g.corroborationLevel === 'SUPPORTED' ? 'track-card__badge--pass' : g.corroborationLevel === 'CONTRADICTED' ? 'track-card__badge--fail' : 'track-card__badge--warn'}">${g.corroborationLevel}</div>
        </div>
        <div class="track-item">
          <span class="track-item__label">Locations detected</span>
          <span class="track-item__value">${g.locations.length > 0 ? g.locations.join(', ') : 'None'}</span>
        </div>
        <div class="track-item">
          <span class="track-item__label">GDELT matches + Tavily Matches</span>
          <span class="track-item__value">${g.totalMatches}</span>
        </div>
        <div class="track-item">
          <span class="track-item__label">Latency</span>
          <span class="track-item__value">${g.processingTime}ms</span>
        </div>
      </div>
    `;
  }

  // Track 2: Credibility
  if (data.tracks.credibility) {
    const c = data.tracks.credibility;
    const isUnknown = c.csScore === null || c.csScore === undefined || c.credibilityLevel === 'UNKNOWN';
    const isCredible = !isUnknown && c.csScore >= 0.7;
    const isLow = !isUnknown && c.csScore < 0.4;

    const badgeClass = isUnknown ? 'track-card__badge--info' : isCredible ? 'track-card__badge--pass' : isLow ? 'track-card__badge--fail' : 'track-card__badge--warn';
    const badgeText = isUnknown ? 'NO SOURCE' : isCredible ? 'CREDIBLE' : 'UNVERIFIED';
    const displayScore = isUnknown ? 'N/A' : c.csScore;
    const gaugeScore = isUnknown ? 0 : c.csScore;

    const formulaHtml = isUnknown
      ? 'No source domain provided — credibility cannot be assessed'
      : `Cs = (0.5 × ${c.breakdown?.H || 0}) + (0.3 × ${c.breakdown?.N || 0}) + (0.2 × ${c.breakdown?.R || 0})`;

    html += `
      <div class="track-card">
        <div class="track-card__header">
          <div class="track-card__number">T2</div>
          <div class="track-card__title">Source Credibility (Cs)</div>
          <div class="track-card__badge ${badgeClass}">${badgeText}</div>
        </div>
        <div style="display: flex; gap: 16px; margin: 12px 0;">
          <div style="flex: 1; position: relative;">
            <canvas id="cs-gauge" width="160" height="90" style="width: 100%; height: 90px;"></canvas>
            <div style="position: absolute; bottom: 0; left: 0; width: 100%; text-align: center;">
              <div style="font-size: 1.5rem; font-weight: 700; color: ${isUnknown ? 'var(--text-muted)' : '#fff'};">${displayScore}</div>
              <div style="font-size: 0.6rem; color: var(--text-muted);">CREDIBILITY SCORE</div>
            </div>
          </div>
        </div>
        <div class="track-item">
          <span class="track-item__label">Source tier</span>
          <span class="track-item__value">${c.tier || 'Unknown'}</span>
        </div>
        <div class="track-item" style="font-size: 0.75rem; margin-top: 8px; color: var(--text-secondary);">
          ${formulaHtml}
        </div>
      </div>
    `;
  }

  // Track 3: Sentiment
  if (data.tracks.sentiment) {
    const s = data.tracks.sentiment;
    const isManipulated = s.manipulationScore > 0.4;
    const compound = s.overall?.compound ?? 0;
    const compoundAbs = Math.abs(compound).toFixed(3);
    const sentLabel = compound > 0.2 ? 'POSITIVE' : compound < -0.2 ? 'NEGATIVE' : 'NEUTRAL';
    const sentColor = compound > 0.2 ? 'var(--green)' : compound < -0.2 ? 'var(--red)' : 'var(--cyan)';
    const badgeLabel = isManipulated ? 'MANIPULATING' : sentLabel;

    const pos = s.overall?.pos ?? 0;
    const neu = s.overall?.neu ?? 0;
    const neg = s.overall?.neg ?? 0;
    const posP = Math.round(pos * 100);
    const neuP = Math.round(neu * 100);
    const negP = Math.round(neg * 100);

    html += `
      <div class="track-card">
        <div class="track-card__header">
          <div class="track-card__number">T3</div>
          <div class="track-card__title">Sentiment & Manipulation</div>
          <div class="track-card__badge ${isManipulated ? 'track-card__badge--fail' : 'track-card__badge--pass'}">${badgeLabel}</div>
        </div>

        <!-- Compound Score Hero -->
        <div class="sentiment-hero">
          <div class="sentiment-hero__score" style="color: ${sentColor}">${compoundAbs}</div>
          <div class="sentiment-hero__label" style="color: ${sentColor}">${sentLabel}</div>
          <div class="sentiment-hero__sub">COMPOUND SCORE</div>
        </div>

        <!-- Distribution Bar -->
        <div class="sentiment-distro">
          <div class="sentiment-distro__bar">
            <div class="sentiment-distro__segment sentiment-distro__segment--pos" style="width: ${Math.max(posP, 1)}%"></div>
            <div class="sentiment-distro__segment sentiment-distro__segment--neu" style="width: ${Math.max(neuP, 1)}%"></div>
            <div class="sentiment-distro__segment sentiment-distro__segment--neg" style="width: ${Math.max(negP, 1)}%"></div>
          </div>
          <div class="sentiment-distro__legend">
            <span><span class="sentiment-dot" style="background: var(--green);"></span> Pos ${posP}%</span>
            <span><span class="sentiment-dot" style="background: var(--cyan-dim);"></span> Neu ${neuP}%</span>
            <span><span class="sentiment-dot" style="background: var(--red);"></span> Neg ${negP}%</span>
          </div>
        </div>

        <!-- Manipulation Score -->
        <div class="track-item" style="margin-top: var(--space-sm);">
          <span class="track-item__label">Manipulation Score</span>
          <span class="track-item__value" style="color: ${isManipulated ? 'var(--red)' : 'var(--cyan)'}; font-weight: 700; font-size: 1rem;">${s.manipulationScore.toFixed(2)}</span>
        </div>
      </div>
    `;
  }

  // Track 4: Image Forensics (Dynamically added if image present)
  if (data.tracks.image) {
    const i = data.tracks.image;
    html += `
      <div class="track-card" style="grid-column: span 1;">
        <div class="track-card__header">
          <div class="track-card__number">T4</div>
          <div class="track-card__title">Image Provenance (C2PA)</div>
          <div class="track-card__badge ${i.verdict === 'AUTHENTIC' ? 'track-card__badge--pass' : i.verdict === 'TAMPERED' ? 'track-card__badge--fail' : 'track-card__badge--warn'}">${i.verdict}</div>
        </div>
        <div class="track-item" style="margin-top: 12px;">
          <span class="track-item__label">Cryptographic Hash</span>
          <span class="track-item__value" style="font-size: 0.6rem; color: var(--cyan); word-break: break-all;">${i.hash?.sha256 || 'N/A'}</span>
        </div>
        <div class="track-item">
          <span class="track-item__label">Digital Signer</span>
          <span class="track-item__value">${i.c2pa?.signer || 'None'}</span>
        </div>
        <div class="track-item">
          <span class="track-item__label">Metadata</span>
          <span class="track-item__value">${i.metadata?.format || 'Unknown'} · ${i.metadata?.size || '0'} bytes</span>
        </div>
      </div>
    `;
  }
  
  // Track 5: Digital Fingerprinting (Origin Search)
  if (data.tracks.fingerprint) {
    const f = data.tracks.fingerprint;
    const platform = f.stylometry?.probable_platform || f.ui?.platform_origin || 'Unknown';
    const isDetected = platform !== 'Unknown';
    
    // Platform icons mapping
    const icons = {
      'WhatsApp': '🟢 ',
      'Twitter/X': '𝕏 ',
      'Instagram': '📸 ',
      'Facebook': '👥 ',
      'Twitter': '𝕏 '
    };
    const icon = Object.entries(icons).find(([k]) => platform.includes(k))?.[1] || '🔍 ';

    // Forensic Artifact Checklist
    const markers = f.ui?.UI_markers_found || [];
    const artifactsHtml = markers.length > 0 
      ? `<ul class="forensic-audit-list">
          ${markers.map(m => `<li><span class="audit-check">✓</span> ${m}</li>`).join('')}
         </ul>`
      : '<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px;">No UI artifacts detected (Raw text content).</div>';

    // Patient Zero Proof Links
    const proofHtml = (f.temporal?.topRecords || []).map(r => `
      <a href="${r.url}" target="_blank" class="evidence-link-pill">
        <span class="evidence-link-pill__icon">${icons[r.platform] || '📡 '}</span>
        <div class="evidence-link-pill__content">
          <div class="evidence-link-pill__title">${r.title.substring(0, 30)}...</div>
          <div class="evidence-link-pill__url">${new URL(r.url).hostname}</div>
        </div>
      </a>
    `).join('');

    html += `
      <div class="track-card track-card--fingerprint">
        <div class="track-card__header">
          <div class="track-card__number">T5</div>
          <div class="track-card__title">Digital Fingerprinting Audit</div>
          <div class="track-card__badge ${isDetected ? 'track-card__badge--pass' : 'track-card__badge--warn'}">${isDetected ? 'DETECTED' : 'UNCERTAIN'}</div>
        </div>
        
        <div class="track-item" style="margin-top: 12px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
          <span class="track-item__label">Probable Origin Signature</span>
          <span class="track-item__value" style="color: var(--cyan); font-weight: 700;">${icon}${platform}</span>
          <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.3;">
            ${f.stylometry?.reasoning || 'Stylometric markers within baseline limits.'}
          </div>
        </div>

        <div class="track-item" style="margin-top: 12px;">
          <span class="track-item__label">Forensic Interface Audit</span>
          ${artifactsHtml}
        </div>

        <div class="track-item" style="margin-top: 12px;">
          <span class="track-item__label">Patient Zero Evidence (Proof)</span>
          <div class="evidence-proof-grid">
            ${proofHtml || '<span style="font-size: 0.75rem; color: var(--text-muted);">No social indexing found.</span>'}
          </div>
        </div>
      </div>
    `;
  }

  els.tracksGrid.innerHTML = html;

  // Mount Canvases
  if (data.tracks.credibility) {
    const cCanvas = document.getElementById('cs-gauge');
    if (cCanvas) drawCsGauge(cCanvas, data.tracks.credibility.csScore || 0);
  }


}

function renderEvidencePanel(data) {
  const sources = data.tracks.grag?.topEvidence || [];
  if (sources.length === 0) {
    els.evidencePanel.style.display = 'none';
    return;
  }

  els.evidencePanel.style.display = 'block';
  
  const listHtml = sources.map(source => `
    <li class="evidence-item">
      <div class="evidence-item__title">
        <a href="${source.url}" target="_blank" style="color: var(--cyan); text-decoration: none;">
          ${source.title.length > 80 ? source.title.substring(0, 80) + '...' : source.title} ↗
        </a>
      </div>
      <div class="evidence-item__source">${new URL(source.url).hostname.replace('www.', '')}</div>
      ${source.snippet ? `<div class="evidence-item__snippet" style="margin-top: 6px; font-size: 0.8rem; color: var(--text-secondary);">${source.snippet.substring(0, 150)}...</div>` : ''}
    </li>
  `).join('');

  els.evidencePanel.innerHTML = `
    <h3 class="evidence-panel__title">📂 Evidence Sources (${sources.length})</h3>
    <ul class="evidence-list">${listHtml}</ul>
  `;
}

function renderAIAnalysis(markdown, model) {
  if (!markdown) {
    els.aiAnalysis.innerHTML = '';
    return;
  }
  
  // Rebrand the synthesis as the Agentic Chief
  const headerHtml = `
    <div class="ai-analysis-header" style="border-bottom: 2px solid var(--cyan); padding-bottom: 12px; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 32px; height: 32px; background: var(--cyan-glow); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid var(--cyan);">
          🤖
        </div>
        <div>
          <h3 style="margin: 0; font-size: 1rem; color: var(--cyan); letter-spacing: 1px;">AGENTIC FORENSIC CHIEF</h3>
          <span style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase;">A-RAG Engine · Multi-Modal Synthesis (${model || 'Groq'})</span>
        </div>
      </div>
    </div>
  `;

  let formatted = markdown.replace(/\*(.*?)\*/g, "<strong>$1</strong>");

  els.aiAnalysis.innerHTML = `
    ${headerHtml}
    <div class="ai-analysis-panel" style="white-space: pre-wrap; font-size: 0.85rem; line-height: 1.6;">${formatted}</div>
  `;
}

export function resetUI() {
  els.results.classList.remove('visible');
  if (els.verdictBanner) els.verdictBanner.innerHTML = '';
  els.tracksGrid.innerHTML = '';
  els.evidencePanel.innerHTML = '';
  els.aiAnalysis.innerHTML = '';
}
