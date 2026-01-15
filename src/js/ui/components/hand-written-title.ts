/**
 * HandWrittenTitle Component - Vanilla TypeScript
 * Converted from React/framer-motion to vanilla TS with CSS animations
 * Creates an animated hand-drawn circle around text.
 */

export interface HandWrittenTitleOptions {
    container: HTMLElement | string;
    title?: string;
    subtitle?: string;
    /** Custom class for title text */
    titleClass?: string;
    /** Custom class for subtitle text */
    subtitleClass?: string;
}

export interface HandWrittenBadgeOptions {
    container: HTMLElement | string;
    /** Delay before animation starts (ms) */
    delay?: number;
}

/**
 * Add an animated hand-drawn circle around an inline badge element.
 * This is a lightweight version for wrapping existing badges.
 */
export function addHandWrittenCircle(options: HandWrittenBadgeOptions): void {
    const containerEl =
        typeof options.container === 'string'
            ? document.querySelector<HTMLElement>(options.container)
            : options.container;

    if (!containerEl) {
        console.warn('HandWrittenCircle: Container element not found');
        return;
    }

    // Add the wrapper class
    containerEl.classList.add('hw-badge-wrapper');

    // Create the SVG element
    const svgContainer = document.createElement('span');
    svgContainer.className = 'hw-svg-container';
    svgContainer.innerHTML = `
    <svg class="hw-svg" viewBox="0 0 200 100" preserveAspectRatio="none">
      <title>Hand Written Circle</title>
      <path
        class="hw-path"
        d="M 180 20 
           C 210 50, 195 85, 100 90
           C 5 85, -10 50, 20 30
           C 50 10, 150 5, 180 20"
        fill="none"
        stroke-width="3"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;

    // Insert the SVG at the beginning
    containerEl.insertBefore(svgContainer, containerEl.firstChild);

    // Trigger animation after delay
    const delay = options.delay ?? 800;
    setTimeout(() => {
        containerEl.classList.add('hw-animate');
    }, delay);
}

/**
 * Full HandWrittenTitle class for standalone components
 */
export class HandWrittenTitle {
    private container: HTMLElement;
    private options: Required<HandWrittenTitleOptions>;

    constructor(options: HandWrittenTitleOptions) {
        // Resolve container
        const containerEl =
            typeof options.container === 'string'
                ? document.querySelector<HTMLElement>(options.container)
                : options.container;

        if (!containerEl) {
            throw new Error('HandWrittenTitle: Container element not found');
        }

        this.container = containerEl;

        // Merge with defaults
        this.options = {
            container: this.container,
            title: options.title ?? 'Hand Written',
            subtitle: options.subtitle ?? '',
            titleClass: options.titleClass ?? '',
            subtitleClass: options.subtitleClass ?? '',
        };

        this.init();
    }

    private init(): void {
        this.render();
        // Trigger animation after a small delay
        requestAnimationFrame(() => {
            this.container.classList.add('hw-animate');
        });
    }

    private render(): void {
        const subtitleHtml = this.options.subtitle
            ? `<p class="hw-subtitle ${this.options.subtitleClass}">${this.options.subtitle}</p>`
            : '';

        this.container.innerHTML = `
      <div class="hw-wrapper">
        <div class="hw-svg-container">
          <svg
            class="hw-svg"
            viewBox="0 0 1200 600"
            preserveAspectRatio="xMidYMid meet"
          >
            <title>Hand Written Title</title>
            <path
              class="hw-path"
              d="M 950 90 
                 C 1250 300, 1050 480, 600 520
                 C 250 520, 150 480, 150 300
                 C 150 120, 350 80, 600 80
                 C 850 80, 950 180, 950 180"
              fill="none"
              stroke-width="12"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div class="hw-content">
          <h1 class="hw-title ${this.options.titleClass}">${this.options.title}</h1>
          ${subtitleHtml}
        </div>
      </div>
    `;
    }

    /**
     * Replay the animation
     */
    public replayAnimation(): void {
        this.container.classList.remove('hw-animate');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.container.classList.add('hw-animate');
            });
        });
    }

    /**
     * Destroy the component
     */
    public destroy(): void {
        this.container.innerHTML = '';
        this.container.classList.remove('hw-animate');
    }
}

/**
 * Factory function to create a HandWrittenTitle instance
 */
export function createHandWrittenTitle(options: HandWrittenTitleOptions): HandWrittenTitle {
    return new HandWrittenTitle(options);
}
