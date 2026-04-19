/**
 * CrisisVerify — Canvas Charts
 * Cs Score Radial Gauge + Sentiment Timeline + Credibility Breakdown
 */

/**
 * Draw Cs Score radial gauge
 * @param {HTMLCanvasElement} canvas
 * @param {number} score - 0 to 1
 */
export function drawCsGauge(canvas, score) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.offsetWidth * 2;
  const h = canvas.height = canvas.offsetHeight * 2;
  ctx.scale(2, 2);
  const cw = w / 2;
  const ch = h / 2;
  const cx = cw / 2;
  const cy = ch - 10;
  const radius = Math.min(cx, cy) - 10;

  ctx.clearRect(0, 0, cw, ch);

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI, 0);
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Score arc
  const angle = Math.PI + (score * Math.PI);
  const gradient = ctx.createLinearGradient(0, cy, cw, cy);

  if (score >= 0.7) {
    gradient.addColorStop(0, '#00ff88');
    gradient.addColorStop(1, '#00b35c');
  } else if (score >= 0.4) {
    gradient.addColorStop(0, '#ff9500');
    gradient.addColorStop(1, '#cc7700');
  } else {
    gradient.addColorStop(0, '#ff3b4e');
    gradient.addColorStop(1, '#cc2f3e');
  }

  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI, angle);
  ctx.lineWidth = 10;
  ctx.strokeStyle = gradient;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Glow effect
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI, angle);
  ctx.lineWidth = 14;
  ctx.strokeStyle = score >= 0.7
    ? 'rgba(0, 255, 136, 0.15)'
    : score >= 0.4
      ? 'rgba(255, 149, 0, 0.15)'
      : 'rgba(255, 59, 78, 0.15)';
  ctx.lineCap = 'round';
  ctx.stroke();
}

/**
 * Draw sentiment intensity timeline
 * @param {HTMLCanvasElement} canvas
 * @param {number[]} timeline - Array of compound values (-1 to 1)
 */
export function drawSentimentTimeline(canvas, timeline) {
  if (!timeline || timeline.length === 0) return;

  const ctx = canvas.getContext('2d');
  const dpr = 2;
  const w = canvas.width = canvas.offsetWidth * dpr;
  const h = canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);
  const cw = w / dpr;
  const ch = h / dpr;

  ctx.clearRect(0, 0, cw, ch);

  const padding = 20;
  const graphW = cw - padding * 2;
  const graphH = ch - padding * 2;
  const midY = padding + graphH / 2;

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;

  // Zero line
  ctx.beginPath();
  ctx.moveTo(padding, midY);
  ctx.lineTo(cw - padding, midY);
  ctx.stroke();

  // Quarter lines
  [0.25, 0.75].forEach(frac => {
    const y = padding + graphH * frac;
    ctx.beginPath();
    ctx.setLineDash([3, 6]);
    ctx.moveTo(padding, y);
    ctx.lineTo(cw - padding, y);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Labels
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.fillText('+1', 2, padding + 4);
  ctx.fillText(' 0', 4, midY + 3);
  ctx.fillText('-1', 2, ch - padding + 10);

  // Data points
  const stepX = graphW / (timeline.length - 1 || 1);

  // Draw filled area
  ctx.beginPath();
  ctx.moveTo(padding, midY);
  timeline.forEach((val, i) => {
    const x = padding + i * stepX;
    const y = midY - (val * graphH / 2);
    if (i === 0) ctx.lineTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(padding + (timeline.length - 1) * stepX, midY);
  ctx.closePath();

  const areaGrad = ctx.createLinearGradient(0, padding, 0, ch - padding);
  areaGrad.addColorStop(0, 'rgba(0, 255, 136, 0.08)');
  areaGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.02)');
  areaGrad.addColorStop(1, 'rgba(255, 59, 78, 0.08)');
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Draw line
  ctx.beginPath();
  timeline.forEach((val, i) => {
    const x = padding + i * stepX;
    const y = midY - (val * graphH / 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#00f0ff';
  ctx.stroke();

  // Draw dots
  timeline.forEach((val, i) => {
    const x = padding + i * stepX;
    const y = midY - (val * graphH / 2);
    const color = val < -0.5 ? '#ff3b4e' : val > 0.5 ? '#00ff88' : '#00f0ff';

    ctx.beginPath();
    ctx.arc(x, y, val < -0.5 ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Glow for manipulation markers
    if (val < -0.5) {
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 59, 78, 0.2)';
      ctx.fill();
    }
  });
}

/**
 * Draw credibility breakdown bar chart
 * @param {HTMLCanvasElement} canvas
 * @param {{ H: number, N: number, R: number }} breakdown
 */
export function drawBreakdownBars(canvas, breakdown) {
  const ctx = canvas.getContext('2d');
  const dpr = 2;
  const w = canvas.width = canvas.offsetWidth * dpr;
  const h = canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);
  const cw = w / dpr;
  const ch = h / dpr;

  ctx.clearRect(0, 0, cw, ch);

  const bars = [
    { label: 'H (History)', value: breakdown.H || 0, weight: '0.5', color: '#00f0ff' },
    { label: 'N (Authors)', value: breakdown.N || 0, weight: '0.3', color: '#a855f7' },
    { label: 'R (Repute)', value: breakdown.R || 0, weight: '0.2', color: '#00ff88' }
  ];

  const barH = 18;
  const gap = 16;
  const labelW = 75;
  const startY = 10;

  bars.forEach((bar, i) => {
    const y = startY + i * (barH + gap);
    const maxBarW = cw - labelW - 50;
    const barW = bar.value * maxBarW;

    // Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText(bar.label, 0, y + barH / 2 + 3);

    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.roundRect(labelW, y, maxBarW, barH, 4);
    ctx.fill();

    // Bar
    ctx.fillStyle = bar.color;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.roundRect(labelW, y, Math.max(barW, 2), barH, 4);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Value
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText(`${bar.value.toFixed(3)} (×${bar.weight})`, labelW + maxBarW + 6, y + barH / 2 + 3);
  });
}
