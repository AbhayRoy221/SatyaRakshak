/**
 * CrisisVerify — Lightweight Particle Network Background
 * Canvas-based floating particles with proximity line connections.
 * Respects reduced-motion preferences and auto-resizes.
 */

const PARTICLE_CONFIG = {
  count: 80,
  maxSpeed: 0.3,
  minSize: 1,
  maxSize: 2.5,
  connectionDistance: 150,
  connectionOpacity: 0.12,
  colors: ['rgba(0, 240, 255, 0.6)', 'rgba(0, 255, 136, 0.4)', 'rgba(168, 85, 247, 0.35)'],
  mouseRadius: 200,
  mouseForce: 0.02
};

class Particle {
  constructor(canvas) {
    this.canvas = canvas;
    this.reset();
  }

  reset() {
    this.x = Math.random() * this.canvas.width;
    this.y = Math.random() * this.canvas.height;
    this.vx = (Math.random() - 0.5) * PARTICLE_CONFIG.maxSpeed;
    this.vy = (Math.random() - 0.5) * PARTICLE_CONFIG.maxSpeed;
    this.size = PARTICLE_CONFIG.minSize + Math.random() * (PARTICLE_CONFIG.maxSize - PARTICLE_CONFIG.minSize);
    this.color = PARTICLE_CONFIG.colors[Math.floor(Math.random() * PARTICLE_CONFIG.colors.length)];
    this.opacity = 0.3 + Math.random() * 0.5;
    this.pulseSpeed = 0.005 + Math.random() * 0.01;
    this.pulseOffset = Math.random() * Math.PI * 2;
  }

  update(mouseX, mouseY, time) {
    // Pulse size
    const pulse = Math.sin(time * this.pulseSpeed + this.pulseOffset) * 0.3;
    this.currentSize = this.size + pulse;
    this.currentOpacity = this.opacity + pulse * 0.2;

    // Mouse interaction
    if (mouseX !== null && mouseY !== null) {
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < PARTICLE_CONFIG.mouseRadius) {
        const force = (PARTICLE_CONFIG.mouseRadius - dist) / PARTICLE_CONFIG.mouseRadius;
        this.vx += (dx / dist) * force * PARTICLE_CONFIG.mouseForce;
        this.vy += (dy / dist) * force * PARTICLE_CONFIG.mouseForce;
      }
    }

    // Damping
    this.vx *= 0.999;
    this.vy *= 0.999;

    this.x += this.vx;
    this.y += this.vy;

    // Wrap around edges
    if (this.x < -10) this.x = this.canvas.width + 10;
    if (this.x > this.canvas.width + 10) this.x = -10;
    if (this.y < -10) this.y = this.canvas.height + 10;
    if (this.y > this.canvas.height + 10) this.y = -10;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.currentSize, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.currentOpacity;
    ctx.fill();

    // Glow
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.currentSize * 3, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.currentOpacity * 0.08;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function initParticles() {
  // Respect reduced motion preferences
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let mouseX = null;
  let mouseY = null;
  let animationId;
  let time = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Reinitialize particles if count changed significantly
    const targetCount = Math.min(PARTICLE_CONFIG.count, Math.floor((canvas.width * canvas.height) / 15000));
    while (particles.length < targetCount) {
      particles.push(new Particle(canvas));
    }
    while (particles.length > targetCount) {
      particles.pop();
    }
  }

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < PARTICLE_CONFIG.connectionDistance) {
          const opacity = (1 - dist / PARTICLE_CONFIG.connectionDistance) * PARTICLE_CONFIG.connectionOpacity;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0, 240, 255, ${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    time++;

    particles.forEach(p => {
      p.update(mouseX, mouseY, time);
      p.draw(ctx);
    });

    drawConnections();
    animationId = requestAnimationFrame(animate);
  }

  // Event listeners
  window.addEventListener('resize', () => {
    cancelAnimationFrame(animationId);
    resize();
    animate();
  });

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  window.addEventListener('mouseleave', () => {
    mouseX = null;
    mouseY = null;
  });

  // Initialize
  resize();
  animate();
}
