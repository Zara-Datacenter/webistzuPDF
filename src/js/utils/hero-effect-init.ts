/**
 * Hero Effect Initializer
 * Automatically adds animated particle background to hero sections on any page.
 */

import { createMinimalHero } from '../ui/components/hero-minimalism.js';

/**
 * Initialize hero effect on any page with a hero section.
 * Looks for common hero section IDs and adds the animated background.
 */
export function initHeroEffect(): void {
    // Common hero section patterns
    const heroSelectors = [
        '#hero-section',
        '#about-hero',
        '#contact-hero',
        '#licensing-hero',
        '#privacy-hero',
        '#terms-hero',
        '#faq-hero',
        '#error-hero',
        '[data-hero-section]',
    ];

    // Find the first matching hero section
    let heroSection: HTMLElement | null = null;
    for (const selector of heroSelectors) {
        heroSection = document.querySelector<HTMLElement>(selector);
        if (heroSection) break;
    }

    if (!heroSection) {
        // No hero section found on this page
        return;
    }

    // Check if hero effect container already exists (manually added in the HTML)
    let container = heroSection.querySelector<HTMLElement>('#hero-effect-container');

    if (container) {
        // Container already exists - just initialize it if not already done
        if (!container.querySelector('.minimal-root')) {
            createMinimalHero({
                container: container,
                backgroundOnly: true,
                particleColor: { r: 56, g: 189, b: 248 }, // Sky 400 - blue particles
            });
        }
        return;
    }

    // Ensure the hero section has relative positioning
    if (getComputedStyle(heroSection).position === 'static') {
        heroSection.style.position = 'relative';
    }

    // Create the hero effect container
    container = document.createElement('div');
    container.id = 'hero-effect-container';
    container.className = 'absolute inset-0 z-0';
    container.style.overflow = 'hidden';

    // Insert as the first child of the hero section
    heroSection.insertBefore(container, heroSection.firstChild);

    // Wrap existing content in a z-10 container if not already wrapped
    const existingContent = Array.from(heroSection.children).filter(
        (child) => child.id !== 'hero-effect-container'
    );

    if (existingContent.length > 0 && !heroSection.querySelector('.hero-content-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'hero-content-wrapper relative z-10';
        existingContent.forEach((child) => wrapper.appendChild(child));
        heroSection.appendChild(wrapper);
    }

    // Initialize the MinimalHero with background-only mode
    createMinimalHero({
        container: container,
        backgroundOnly: true,
        particleColor: { r: 56, g: 189, b: 248 }, // Sky 400 - blue particles
    });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroEffect);
} else {
    // DOM already loaded
    initHeroEffect();
}
