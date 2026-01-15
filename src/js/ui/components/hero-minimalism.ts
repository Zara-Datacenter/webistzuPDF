/**
 * MinimalHero - A vanilla TypeScript animated hero background component.
 * Creates particle effects and accent lines with WebistzuPDF blue theme.
 */

interface Particle {
    x: number;
    y: number;
    speed: number;
    opacity: number;
    fadeDelay: number;
    fadeStart: number;
    fadingOut: boolean;
}

export interface MinimalHeroOptions {
    /** Container element or selector */
    container: HTMLElement | string;
    /** Use as background only (hides header, hero text, and footer) */
    backgroundOnly?: boolean;
    /** Particle color - defaults to blue theme */
    particleColor?: { r: number; g: number; b: number };
    /** Brand name for the header (standalone mode only) */
    brandName?: string;
    /** Brand URL link */
    brandUrl?: string;
    /** CTA button text */
    ctaText?: string;
    /** CTA button click handler */
    onCtaClick?: () => void;
    /** Kicker text above title */
    kicker?: string;
    /** Main title (supports HTML) */
    title?: string;
    /** Subtitle text */
    subtitle?: string;
    /** Bottom section tag */
    tag?: string;
    /** Bottom section heading */
    heading?: string;
    /** Bottom section description */
    description?: string;
}

export class MinimalHero {
    private container: HTMLElement;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private particles: Particle[] = [];
    private rafId: number = 0;
    private options: Required<MinimalHeroOptions>;
    private resizeHandler: () => void;

    constructor(options: MinimalHeroOptions) {
        // Resolve container
        const containerEl =
            typeof options.container === 'string'
                ? document.querySelector<HTMLElement>(options.container)
                : options.container;

        if (!containerEl) {
            throw new Error('MinimalHero: Container element not found');
        }

        this.container = containerEl;

        // Merge with defaults - Blue theme particles
        this.options = {
            container: this.container,
            backgroundOnly: options.backgroundOnly ?? false,
            particleColor: options.particleColor ?? { r: 56, g: 189, b: 248 }, // Sky 400
            brandName: options.brandName ?? 'WEBISTZU',
            brandUrl: options.brandUrl ?? '/',
            ctaText: options.ctaText ?? 'Get Started',
            onCtaClick: options.onCtaClick ?? (() => (window.location.href = '/#tools-header')),
            kicker: options.kicker ?? 'Privacy First',
            title: options.title ?? 'The <span class="text-sky-400">PDF Toolkit</span><br/>Built for Privacy',
            subtitle:
                options.subtitle ??
                'Fast, Secure, and Forever Free. All processing happens in your browser.',
            tag: options.tag ?? 'No uploads required',
            heading: options.heading ?? '100% Client-Side. Your Files Never Leave.',
            description:
                options.description ??
                'Process unlimited PDFs with no signups, no limits, and complete privacy. Works offline too.',
        };

        this.resizeHandler = this.handleResize.bind(this);
        this.init();
    }

    private init(): void {
        this.render();
        this.setupCanvas();
        this.setupEventListeners();
        this.startAnimation();
    }

    private render(): void {
        const modeClass = this.options.backgroundOnly ? 'background-only' : 'standalone';

        this.container.innerHTML = `
      <section class="minimal-root ${modeClass}">
        <!-- Header -->
        <header class="minimal-header">
          <a class="minimal-brand" href="${this.options.brandUrl}">
            ${this.options.brandName}
          </a>
          <button class="minimal-cta" type="button">
            ${this.options.ctaText}
          </button>
        </header>

        <!-- Particles Canvas -->
        <canvas class="minimal-particleCanvas"></canvas>

        <!-- Accent Lines -->
        <div class="minimal-accent-lines">
          <div class="minimal-hline"></div>
          <div class="minimal-hline"></div>
          <div class="minimal-hline"></div>
          <div class="minimal-vline"></div>
          <div class="minimal-vline"></div>
          <div class="minimal-vline"></div>
        </div>

        <!-- Hero -->
        <main class="minimal-hero">
          <div>
            <div class="minimal-kicker">${this.options.kicker}</div>
            <h1 class="minimal-title">${this.options.title}</h1>
            <p class="minimal-subtitle">${this.options.subtitle}</p>
          </div>
        </main>

        <!-- Bottom content -->
        <section class="minimal-content">
          <div class="minimal-tag">${this.options.tag}</div>
          <div class="minimal-heading">${this.options.heading}</div>
          <p class="minimal-desc">${this.options.description}</p>
        </section>
      </section>
    `;

        // Attach CTA click handler (only in standalone mode)
        if (!this.options.backgroundOnly) {
            const ctaBtn = this.container.querySelector('.minimal-cta');
            if (ctaBtn) {
                ctaBtn.addEventListener('click', this.options.onCtaClick);
            }
        }
    }

    private setupCanvas(): void {
        this.canvas = this.container.querySelector('.minimal-particleCanvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) return;

        this.setCanvasSize();
        this.initParticles();
    }

    private setCanvasSize(): void {
        if (!this.canvas) return;
        // Use container dimensions for background mode
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width || window.innerWidth;
        this.canvas.height = rect.height || window.innerHeight;
    }

    private getParticleCount(): number {
        if (!this.canvas) return 0;
        return Math.floor((this.canvas.width * this.canvas.height) / 6000);
    }

    private createParticle(): Particle {
        if (!this.canvas) {
            return {
                x: 0,
                y: 0,
                speed: 0.1,
                opacity: 0.7,
                fadeDelay: 100,
                fadeStart: Date.now() + 100,
                fadingOut: false,
            };
        }

        const fadeDelay = Math.random() * 600 + 100;
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            speed: Math.random() / 4 + 0.15,
            opacity: Math.random() * 0.4 + 0.4,
            fadeDelay,
            fadeStart: Date.now() + fadeDelay,
            fadingOut: false,
        };
    }

    private resetParticle(p: Particle): void {
        if (!this.canvas) return;

        p.x = Math.random() * this.canvas.width;
        p.y = this.canvas.height + 10; // Start from bottom
        p.speed = Math.random() / 4 + 0.15;
        p.opacity = Math.random() * 0.4 + 0.4;
        p.fadeDelay = Math.random() * 600 + 100;
        p.fadeStart = Date.now() + p.fadeDelay;
        p.fadingOut = false;
    }

    private initParticles(): void {
        this.particles = [];
        const count = this.getParticleCount();
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle());
        }
    }

    private draw(): void {
        if (!this.ctx || !this.canvas) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const { r, g, b } = this.options.particleColor;

        this.particles.forEach((p) => {
            p.y -= p.speed;

            if (p.y < -10) {
                this.resetParticle(p);
            }

            if (!p.fadingOut && Date.now() > p.fadeStart) {
                p.fadingOut = true;
            }

            if (p.fadingOut) {
                p.opacity -= 0.006;
                if (p.opacity <= 0) {
                    this.resetParticle(p);
                }
            }

            // Draw particle with glow effect
            this.ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity})`;
            this.ctx!.shadowBlur = 3;
            this.ctx!.shadowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
            this.ctx!.fillRect(p.x, p.y, 1, Math.random() * 3 + 1);
        });

        // Reset shadow for performance
        this.ctx.shadowBlur = 0;

        this.rafId = requestAnimationFrame(() => this.draw());
    }

    private startAnimation(): void {
        this.rafId = requestAnimationFrame(() => this.draw());
    }

    private handleResize(): void {
        this.setCanvasSize();
        this.initParticles();
    }

    private setupEventListeners(): void {
        window.addEventListener('resize', this.resizeHandler);
    }

    /**
     * Clean up resources and remove event listeners
     */
    public destroy(): void {
        window.removeEventListener('resize', this.resizeHandler);
        cancelAnimationFrame(this.rafId);
        this.container.innerHTML = '';
    }

    /**
     * Update hero content dynamically
     */
    public updateContent(options: Partial<MinimalHeroOptions>): void {
        if (options.kicker !== undefined) {
            const kickerEl = this.container.querySelector('.minimal-kicker');
            if (kickerEl) kickerEl.textContent = options.kicker;
        }

        if (options.title !== undefined) {
            const titleEl = this.container.querySelector('.minimal-title');
            if (titleEl) titleEl.innerHTML = options.title;
        }

        if (options.subtitle !== undefined) {
            const subtitleEl = this.container.querySelector('.minimal-subtitle');
            if (subtitleEl) subtitleEl.textContent = options.subtitle;
        }

        if (options.tag !== undefined) {
            const tagEl = this.container.querySelector('.minimal-tag');
            if (tagEl) tagEl.textContent = options.tag;
        }

        if (options.heading !== undefined) {
            const headingEl = this.container.querySelector('.minimal-heading');
            if (headingEl) headingEl.textContent = options.heading;
        }

        if (options.description !== undefined) {
            const descEl = this.container.querySelector('.minimal-desc');
            if (descEl) descEl.textContent = options.description;
        }
    }
}

// Export a factory function for easy instantiation
export function createMinimalHero(options: MinimalHeroOptions): MinimalHero {
    return new MinimalHero(options);
}
