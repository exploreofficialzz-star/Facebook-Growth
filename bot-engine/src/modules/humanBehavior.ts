import type { Page } from 'playwright';

/**
 * Human Behavior Simulation Module
 * Provides realistic human-like interactions to evade bot detection
 */

export class HumanBehavior {
  /**
   * Generate a random delay between min and max milliseconds
   * Simulates human think time between actions
   */
  static async randomDelay(min: number = 500, max: number = 3000): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Simulate human-like mouse movement using Bezier curves
   * Creates smooth, non-linear paths that don't look automated
   */
  static async humanMouseMove(
    page: Page,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    duration: number = 1000
  ): Promise<void> {
    const steps = Math.random() * 30 + 20; // 20-50 steps
    const startTime = Date.now();

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Ease-in-out cubic for natural acceleration/deceleration
      const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      // Add slight jitter for realism
      const jitterX = (Math.random() - 0.5) * 2;
      const jitterY = (Math.random() - 0.5) * 2;

      const x = fromX + (toX - fromX) * easeT + jitterX;
      const y = fromY + (toY - fromY) * easeT + jitterY;

      await page.mouse.move(x, y);

      // Variable speed between steps
      const stepDelay = Math.random() * 20 + 10;
      await new Promise(resolve => setTimeout(resolve, stepDelay));
    }
  }

  /**
   * Simulate human-like typing with variable keystroke intervals
   * Includes occasional typos and corrections
   */
  static async humanType(page: Page, text: string, includeTypos: boolean = false): Promise<void> {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Occasionally introduce typos (5% chance)
      if (includeTypos && Math.random() < 0.05) {
        const typoChar = String.fromCharCode(Math.random() * 26 + 97);
        await page.keyboard.type(typoChar);
        await this.randomDelay(100, 300);

        // Backspace to correct
        await page.keyboard.press('Backspace');
        await this.randomDelay(100, 200);
      }

      await page.keyboard.type(char);

      // Variable keystroke interval (50-200ms)
      const interval = Math.random() * 150 + 50;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  /**
   * Simulate human-like scrolling with variable speeds and pauses
   */
  static async humanScroll(
    page: Page,
    direction: 'down' | 'up' = 'down',
    distance: number = 500,
    duration: number = 2000
  ): Promise<void> {
    const steps = Math.random() * 10 + 5; // 5-15 scroll steps
    const scrollPerStep = distance / steps;

    for (let i = 0; i < steps; i++) {
      const scrollAmount = scrollPerStep + (Math.random() - 0.5) * 50; // Add variance
      const scrollDirection = direction === 'down' ? scrollAmount : -scrollAmount;

      await page.evaluate(amount => {
        window.scrollBy(0, amount);
      }, scrollDirection);

      // Random pause between scrolls
      await this.randomDelay(100, 400);
    }
  }

  /**
   * Simulate human-like clicking with movement and slight delay
   */
  static async humanClick(page: Page, selector: string): Promise<void> {
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    const box = await element.boundingBox();
    if (!box) {
      throw new Error(`Cannot get bounding box for: ${selector}`);
    }

    // Move mouse to element with human-like movement
    const currentMouse = await page.evaluate(() => ({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    }));

    await this.humanMouseMove(
      page,
      currentMouse.x,
      currentMouse.y,
      box.x + box.width / 2,
      box.y + box.height / 2,
      500
    );

    // Small delay before clicking
    await this.randomDelay(100, 300);

    // Click with slight movement for realism
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // Delay after click
    await this.randomDelay(300, 800);
  }

  /**
   * Simulate human browsing behavior - random page interactions
   */
  static async randomBrowsing(page: Page, duration: number = 30000): Promise<void> {
    const endTime = Date.now() + duration;

    while (Date.now() < endTime) {
      const action = Math.random();

      if (action < 0.4) {
        // Scroll
        await this.humanScroll(page, Math.random() > 0.5 ? 'down' : 'up', 300, 1000);
      } else if (action < 0.7) {
        // Random pause (thinking)
        await this.randomDelay(2000, 5000);
      } else {
        // Move mouse randomly
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        await this.humanMouseMove(page, x, y, Math.random() * window.innerWidth, Math.random() * window.innerHeight, 1000);
      }
    }
  }

  /**
   * Generate realistic session duration variance
   * Different users spend different amounts of time on pages
   */
  static getRealisticSessionDuration(minMinutes: number = 5, maxMinutes: number = 30): number {
    const minutes = Math.random() * (maxMinutes - minMinutes) + minMinutes;
    return minutes * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Generate a realistic user agent string
   */
  static getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * Generate realistic viewport dimensions
   */
  static getRandomViewport(): { width: number; height: number } {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 375, height: 812 }, // iPhone
      { width: 390, height: 844 }, // iPhone 14
      { width: 412, height: 915 }, // Android
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
  }
}
