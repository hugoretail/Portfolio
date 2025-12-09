export class NatureCursor {
    constructor(container) {
        this.container = container;
        this.pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        this.mouse = { x: this.pos.x, y: this.pos.y };
        this.particles = [];
        // Colors extracted from the theme: teal, amber, green, pink, white
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
        
        // Spawn particles on move
        // Higher chance to spawn when moving fast could be cool, but random is fine for subtle
        if (Math.random() > 0.4) {
            this.spawnParticle(this.mouse.x, this.mouse.y);
        }
    }

    onResize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    spawnParticle(x, y) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.8 + 0.2;
        this.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.8, // Slight upward drift like pollen/spores
            life: 1,
            decay: Math.random() * 0.015 + 0.005,
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            size: Math.random() * 2.5 + 0.5
        });
    }

    animate() {
        // Stop animation if overlay is removed
        if (!this.container.isConnected) {
            this.cleanup();
            return;
        }

        // Smooth cursor movement (lag effect)
        this.pos.x += (this.mouse.x - this.pos.x) * 0.15;
        this.pos.y += (this.mouse.y - this.pos.y) * 0.15;
        
        // Update cursor position
        // We use translate3d for performance
        this.cursor.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0) translate(-50%, -50%)`;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and draw particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.globalAlpha = p.life;
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
