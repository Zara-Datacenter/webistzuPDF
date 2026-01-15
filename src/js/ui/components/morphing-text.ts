/**
 * MorphingText Component - Vanilla TypeScript
 * Converted from React GooeyText/MorphingText
 * Creates a "gooey" morphing effect between words using SVG filters.
 */

export interface MorphingTextOptions {
    container: HTMLElement | string;
    texts: string[];
    morphTime?: number;
    cooldownTime?: number;
    textClassName?: string;
}

export class MorphingText {
    private container: HTMLElement;
    private text1: HTMLElement;
    private text2: HTMLElement;
    private options: Required<MorphingTextOptions>;

    private textIndex: number;
    private time: number;
    private morph: number = 0;
    private cooldown: number;
    private animationFrameId: number | null = null;

    constructor(options: MorphingTextOptions) {
        const containerEl =
            typeof options.container === 'string'
                ? document.querySelector<HTMLElement>(options.container)
                : options.container;

        if (!containerEl) {
            throw new Error('MorphingText: Container element not found');
        }

        this.container = containerEl;
        this.options = {
            container: this.container,
            texts: options.texts,
            morphTime: options.morphTime ?? 1,
            cooldownTime: options.cooldownTime ?? 0.25,
            textClassName: options.textClassName ?? '',
        };

        this.textIndex = this.options.texts.length - 1;
        this.time = Date.now();
        this.cooldown = this.options.cooldownTime;

        this.init();
    }

    private init(): void {
        // 1. Inject SVG Filters if not already present
        this.injectFilters();

        // 2. Setup Container Styles
        this.container.classList.add('morphing-text-container');
        this.container.innerHTML = ''; // Clear existing content

        // 3. Create Text Elements
        this.text1 = document.createElement('span');
        this.text1.className = `morphing-text-item ${this.options.textClassName}`;
        this.container.appendChild(this.text1);

        this.text2 = document.createElement('span');
        this.text2.className = `morphing-text-item ${this.options.textClassName}`;
        this.container.appendChild(this.text2);

        // 4. Initial Text Setup
        this.text1.textContent = this.options.texts[this.textIndex % this.options.texts.length];
        this.text2.textContent = this.options.texts[(this.textIndex + 1) % this.options.texts.length];

        // 5. Start Animation
        this.animate();
    }

    private injectFilters(): void {
        if (document.getElementById('morphing-filters')) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'morphing-filters';
        svg.setAttribute('class', 'hidden-svg-filter');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        svg.innerHTML = `
      <defs>
        <filter id="threshold">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 255 -140"
          />
        </filter>
      </defs>
    `;
        document.body.appendChild(svg);
    }

    private setMorph(fraction: number): void {
        const fraction0 = Math.pow(fraction, 0.4) * 100;
        const fraction1 = Math.pow(1 - fraction, 0.4) * 100;

        const blur2 = Math.min(8 / fraction - 8, 100);
        const blur1 = Math.min(8 / (1 - fraction) - 8, 100);

        // Add subtle scale for inflating effect
        const scale2 = 0.9 + 0.1 * fraction; // 0.9 -> 1.0 (Incoming)
        const scale1 = 1.0 + 0.1 * fraction; // 1.0 -> 1.1 (Outgoing)

        this.text2.style.filter = `blur(${blur2}px)`;
        this.text2.style.opacity = `${fraction0}%`;
        this.text2.style.transform = `scale(${scale2})`;

        this.text1.style.filter = `blur(${blur1}px)`;
        this.text1.style.opacity = `${fraction1}%`;
        this.text1.style.transform = `scale(${scale1})`;
    }

    private doExactMorph(): void {
        this.morph -= this.cooldown;
        this.cooldown = 0;

        let fraction = this.morph / this.options.morphTime;

        if (fraction > 1) {
            this.cooldown = this.options.cooldownTime;
            fraction = 1;
        }

        this.setMorph(fraction);
    }

    private doCooldown(): void {
        this.morph = 0;

        this.text2.style.filter = '';
        this.text2.style.opacity = '100%';
        this.text2.style.transform = '';

        this.text1.style.filter = '';
        this.text1.style.opacity = '0%';
        this.text1.style.transform = '';
    }

    private animate = (): void => {
        this.animationFrameId = requestAnimationFrame(this.animate);

        const newTime = Date.now();
        const dt = (newTime - this.time) / 1000;
        this.time = newTime;

        this.cooldown -= dt;

        if (this.cooldown <= 0) {
            if (this.cooldown <= 0 && this.morph === 0) {
                // Cycle text when cooldown finishes and we start morphing
                this.cooldown = 0;
                this.morph = 0.01; // Start morph

                this.textIndex++;
                this.text1.textContent = this.options.texts[this.textIndex % this.options.texts.length];
                this.text2.textContent = this.options.texts[(this.textIndex + 1) % this.options.texts.length];
            }
            this.doExactMorph();
        } else {
            this.doCooldown();
        }
    }
}

export function addMorphingText(options: MorphingTextOptions): MorphingText {
    return new MorphingText(options);
}
