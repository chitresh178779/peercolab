import { useEffect, useRef } from 'react';

function BackgroundAnimation() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let particles = [];
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Dynamic density based on screen size
    const getParticleCount = (w) => {
      if (w < 480) return 20;
      if (w < 768) return 30;
      return 50;
    };

    const colors = [
      'rgba(0, 0, 0, 0.12)',         // Charcoal black
      'rgba(37, 99, 235, 0.20)',     // Blueprint blue
      'rgba(21, 128, 61, 0.20)',     // Emerald green
      'rgba(194, 65, 12, 0.20)',     // Amber ochre
      'rgba(124, 58, 237, 0.22)',    // Purple/violet
    ];

    const types = ['plus', 'star', 'circle', 'square', 'bracket', 'triangle'];
    const brackets = ['{', '}', '</>', '[', ']', '(', ')'];

    class Particle {
      constructor() {
        this.reset(true);
      }

      reset(init = false) {
        this.x = Math.random() * width;
        this.y = init ? Math.random() * height : height + 50;
        this.size = Math.random() * 11 + 9; // Size between 9px and 20px
        this.type = types[Math.floor(Math.random() * types.length)];
        this.bracketText = this.type === 'bracket' ? brackets[Math.floor(Math.random() * brackets.length)] : '';
        this.color = colors[Math.floor(Math.random() * colors.length)];

        // Soft drift speed
        this.baseVx = (Math.random() - 0.5) * 0.3;
        this.baseVy = -(Math.random() * 0.4 + 0.1); // Move upwards
        this.vx = this.baseVx;
        this.vy = this.baseVy;

        this.angle = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.01;
        this.fill = Math.random() > 0.6; // Some filled, some hollow
      }

      update() {
        // Apply mouse interaction (repel)
        const dx = this.x - mouseRef.current.x;
        const dy = this.y - mouseRef.current.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 150) {
          const force = (150 - dist) / 150;
          const angle = Math.atan2(dy, dx);
          // Gently push away
          this.vx += Math.cos(angle) * force * 0.5;
          this.vy += Math.sin(angle) * force * 0.5;
        }

        // Return to base speed (damping)
        this.vx += (this.baseVx - this.vx) * 0.05;
        this.vy += (this.baseVy - this.vy) * 0.05;

        // Move
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.rotationSpeed;

        // Reset if offscreen
        if (this.y < -50 || this.x < -50 || this.x > width + 50) {
          this.reset(false);
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color.replace('0.20', '0.05').replace('0.22', '0.06').replace('0.12', '0.03');
        ctx.lineWidth = 1.4; // Slightly bolder outlines

        switch (this.type) {
          case 'plus':
            ctx.beginPath();
            ctx.moveTo(-this.size, 0);
            ctx.lineTo(this.size, 0);
            ctx.moveTo(0, -this.size);
            ctx.lineTo(0, this.size);
            ctx.stroke();
            break;

          case 'star':
            // 4-point neobrutalist sparkle
            ctx.beginPath();
            ctx.moveTo(0, -this.size);
            ctx.quadraticCurveTo(0, 0, this.size, 0);
            ctx.quadraticCurveTo(0, 0, 0, this.size);
            ctx.quadraticCurveTo(0, 0, -this.size, 0);
            ctx.quadraticCurveTo(0, 0, 0, -this.size);
            ctx.closePath();
            if (this.fill) ctx.fill();
            ctx.stroke();
            break;

          case 'circle':
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 1.2, 0, Math.PI * 2);
            if (this.fill) ctx.fill();
            ctx.stroke();
            break;

          case 'square':
            ctx.beginPath();
            ctx.rect(-this.size / 1.5, -this.size / 1.5, this.size * 1.3, this.size * 1.3);
            if (this.fill) ctx.fill();
            ctx.stroke();
            break;

          case 'bracket':
            ctx.font = `bold ${this.size * 1.3}px var(--font-heading)`;
            ctx.fillStyle = this.color.replace('0.20', '0.4').replace('0.22', '0.45').replace('0.12', '0.25');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.bracketText, 0, 0);
            break;

          case 'triangle':
            ctx.beginPath();
            ctx.moveTo(0, -this.size);
            ctx.lineTo(this.size / 1.2, this.size / 1.2);
            ctx.lineTo(-this.size / 1.2, this.size / 1.2);
            ctx.closePath();
            if (this.fill) ctx.fill();
            ctx.stroke();
            break;

          default:
            break;
        }

        ctx.restore();
      }
    }

    // Initialize particles
    const initParticles = () => {
      particles = [];
      const count = getParticleCount(width);
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    };

    initParticles();

    // Event listeners
    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw connections (mind-map style dashed lines)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

          // Connection range (160px)
          if (dist < 160) {
            ctx.beginPath();
            // Connect colors nicely with slightly darker faint opacity
            ctx.strokeStyle = `rgba(0, 0, 0, ${0.10 * (1 - dist / 160)})`;
            ctx.lineWidth = 1.1;
            ctx.setLineDash([5, 5]); // Dashed sketchbook lines
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash for shapes
          }
        }
      }

      // 2. Update and draw particles
      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}

export default BackgroundAnimation;
