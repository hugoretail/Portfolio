export class NatureCursor {
    constructor(container) {
        this.container = container;
        this.pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        this.mouse = { x: this.pos.x, y: this.pos.y };
        this.colors = ['#3d9d8a', '#f2af29', '#3a764a', '#ff9cc4', '#ffffff'];
        this.burstParticles = [];
        this.init();
    }

    init() {
        // Create cursor element
        this.cursor = document.createElement('div');
        this.cursor.classList.add('nature-cursor');
        this.container.appendChild(this.cursor);

        // Create canvas for burst effect
        this.canvas = document.createElement('canvas');
        this.canvas.classList.add('nature-cursor-canvas');
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.onResize();

        // Bind methods
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onResize = this.onResize.bind(this);
        this.animate = this.animate.bind(this);
        this.onClick = this.onClick.bind(this);

        // Event listeners
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('resize', this.onResize);
        window.addEventListener('click', this.onClick);

        this.onResize();
        requestAnimationFrame(this.animate);
    }

    onMouseMove(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
    }

    onResize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }


    onClick(e) {
        // Simple burst effect at cursor
        const burstCount = 12;
        const angleStep = (Math.PI * 2) / burstCount;
        for (let i = 0; i < burstCount; i++) {
            const angle = i * angleStep + Math.random() * 0.2;
            const speed = 3.5 + Math.random() * 1.2;
            this.burstParticles.push({
                x: this.mouse.x,
                y: this.mouse.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
                size: 7 + Math.random() * 4
            });
        }
    }

    animate() {
        // Stop animation if overlay is removed
        if (!this.container.isConnected) {
            this.cleanup();
            return;
        }

        // Cursor follows mouse instantly (no lag)
        this.pos.x = this.mouse.x;
        this.pos.y = this.mouse.y;

        // Update cursor position
        this.cursor.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0) translate(-50%, -50%)`;

        // Clear canvas (full window)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw burst particles (if any)
        for (let i = this.burstParticles.length - 1; i >= 0; i--) {
            const p = this.burstParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.88;
            p.vy *= 0.88;
            p.life -= 0.08;
            if (p.life <= 0) {
                this.burstParticles.splice(i, 1);
                continue;
            }
            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            this.ctx.fill();
        }

        requestAnimationFrame(this.animate);
    }

    cleanup() {
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('resize', this.onResize);
        window.removeEventListener('click', this.onClick);
    }
}
