export class NatureCursor {
    constructor(container) {
        this.container = container;
        this.pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        this.mouse = { x: this.pos.x, y: this.pos.y };
        this.particles = [];
        this.lastMouse = { x: this.pos.x, y: this.pos.y };
        this.lastParticleTime = 0;
        this.maxParticles = 120;
        this.colors = ['#3d9d8a', '#f2af29', '#3a764a', '#ff9cc4', '#ffffff'];
        this.init();
    }

    init() {
        // Create cursor element
        this.cursor = document.createElement('div');
        this.cursor.classList.add('nature-cursor');
        this.container.appendChild(this.cursor);

        // Create canvas for trails
        this.canvas = document.createElement('canvas');
        this.canvas.classList.add('nature-cursor-canvas');
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.onResize();

        // Bind methods
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onResize = this.onResize.bind(this);
        this.animate = this.animate.bind(this);

        // Event listeners
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('resize', this.onResize);

        this.onResize();
        requestAnimationFrame(this.animate);
    }

    onMouseMove(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        // Throttle particle spawn: only if mouse moved >8px or 1 per frame
        const now = performance.now();
        const dx = this.mouse.x - this.lastMouse.x;
        const dy = this.mouse.y - this.lastMouse.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if ((dist > 8 || now - this.lastParticleTime > 16) && this.particles.length < this.maxParticles) {
            this.spawnParticle(this.mouse.x, this.mouse.y);
            this.lastParticleTime = now;
        }
        this.lastMouse.x = this.mouse.x;
        this.lastMouse.y = this.mouse.y;
    }

    onResize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    spawnParticle(x, y) {
        if (this.particles.length >= this.maxParticles) return;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.7 + 0.15;
        this.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.7,
            life: 1,
            decay: Math.random() * 0.018 + 0.008,
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            size: Math.random() * 2 + 0.5,
            maxSize: Math.random() * 3 + 2
        });
    }

    animate() {
        // Stop animation if overlay is removed
        if (!this.container.isConnected) {
            this.cleanup();
            return;
        }

        // Faster cursor smoothing
        this.pos.x += (this.mouse.x - this.pos.x) * 0.35;
        this.pos.y += (this.mouse.y - this.pos.y) * 0.35;

        // Update cursor position
        this.cursor.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0) translate(-50%, -50%)`;

        // Clear canvas (full window)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and draw particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            // Animate size (optional: slight growth then shrink)
            if (p.size < p.maxSize && p.life > 0.7) {
                p.size += 0.12;
            } else if (p.life < 0.5 && p.size > 0.5) {
                p.size -= 0.08;
            }
            if (p.life <= 0 || p.size <= 0.5) {
                this.particles.splice(i, 1);
                continue;
            }
            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }

        requestAnimationFrame(this.animate);
    }

    cleanup() {
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('resize', this.onResize);
    }
}
