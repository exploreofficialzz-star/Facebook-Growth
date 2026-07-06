import { Browser, BrowserContext, Page, chromium } from 'playwright';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { HumanBehavior } from './humanBehavior';
import { ProxyConfig, ProxyManager } from './proxyManager';

/**
 * Facebook Automation Engine
 * Handles browser automation with stealth capabilities and human behavior simulation
 */

export interface BotSessionConfig {
  facebookEmail: string;
  facebookPassword: string;
  proxy?: ProxyConfig;
  userAgent?: string;
  viewport?: { width: number; height: number };
}

export interface AutomationResult {
  success: boolean;
  action: string;
  timestamp: Date;
  details?: Record<string, unknown>;
  error?: string;
}

export class FacebookAutomation {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private proxyManager: ProxyManager;

  constructor(proxyManager: ProxyManager) {
    this.proxyManager = proxyManager;
  }

  /**
   * Initialize browser session with stealth capabilities
   */
  async initializeBrowser(config: BotSessionConfig): Promise<void> {
    try {
      const launchOptions: Parameters<typeof chromium.launch>[0] = {
        headless: true,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--no-default-browser-check',
        ],
      };

      // Add proxy if configured
      if (config.proxy) {
        const proxyUrl = this.proxyManager.getProxyUrl(config.proxy);
        launchOptions.proxy = {
          server: proxyUrl,
        };
      }

      this.browser = await chromium.launch(launchOptions);

      // Create context with stealth settings
      const contextOptions: Parameters<typeof this.browser.newContext>[0] = {
        userAgent: config.userAgent || HumanBehavior.getRandomUserAgent(),
        viewport: config.viewport || HumanBehavior.getRandomViewport(),
        locale: 'en-US',
        timezoneId: 'America/New_York',
        geolocation: { latitude: 40.7128, longitude: -74.006 }, // New York
        permissions: [],
        ignoreHTTPSErrors: true,
      };

      this.context = await this.browser.newContext(contextOptions);

      // Inject stealth scripts
      await this.injectStealthScripts();

      this.page = await this.context.newPage();

      // Set extra headers to look more human
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });
    } catch (error) {
      throw new Error(`Failed to initialize browser: ${error}`);
    }
  }

  /**
   * Inject stealth scripts to hide automation indicators
   */
  private async injectStealthScripts(): Promise<void> {
    if (!this.context) return;

    await this.context.addInitScript(() => {
      // Hide webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // Hide chrome property
      Object.defineProperty(window, 'chrome', {
        get: () => ({
          runtime: {},
        }),
      });

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: PermissionDescriptor) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);

      // Randomize canvas fingerprint
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function (type: string) {
        if (type === 'image/png') {
          const context = this.getContext('2d');
          if (context) {
            const imageData = context.getImageData(0, 0, this.width, this.height);
            for (let i = 0; i < imageData.data.length; i += 4) {
              imageData.data[i] += Math.floor(Math.random() * 10);
              imageData.data[i + 1] += Math.floor(Math.random() * 10);
              imageData.data[i + 2] += Math.floor(Math.random() * 10);
            }
            context.putImageData(imageData, 0, 0);
          }
        }
        return originalToDataURL.call(this, type);
      };
    });
  }

  /**
   * Login to Facebook account
   */
  async login(email: string, password: string): Promise<AutomationResult> {
    if (!this.page) {
      return {
        success: false,
        action: 'login',
        timestamp: new Date(),
        error: 'Browser not initialized',
      };
    }

    try {
      // Navigate to Facebook
      await this.page.goto('https://www.facebook.com/login', {
        waitUntil: 'networkidle',
      });

      // Wait for login form
      await this.page.waitForSelector('input[name="email"]', { timeout: 10000 });

      // Enter email with human-like typing
      await HumanBehavior.humanClick(this.page, 'input[name="email"]');
      await HumanBehavior.humanType(this.page, email);

      // Enter password
      await HumanBehavior.humanClick(this.page, 'input[name="pass"]');
      await HumanBehavior.humanType(this.page, password);

      // Submit form
      await HumanBehavior.humanClick(this.page, 'button[name="login"]');

      // Wait for navigation
      await this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });

      // Check if login was successful
      const isLoggedIn = await this.page.url().includes('facebook.com');

      return {
        success: isLoggedIn,
        action: 'login',
        timestamp: new Date(),
        details: { email },
      };
    } catch (error) {
      return {
        success: false,
        action: 'login',
        timestamp: new Date(),
        error: String(error),
      };
    }
  }

  /**
   * Like a Facebook post
   */
  async likePost(postUrl: string): Promise<AutomationResult> {
    if (!this.page) {
      return {
        success: false,
        action: 'like_post',
        timestamp: new Date(),
        error: 'Browser not initialized',
      };
    }

    try {
      await this.page.goto(postUrl, { waitUntil: 'networkidle' });

      // Find and click like button
      const likeButton = await this.page.$('[aria-label*="Like"]');
      if (likeButton) {
        await HumanBehavior.humanClick(this.page, '[aria-label*="Like"]');
        await HumanBehavior.randomDelay(1000, 3000);

        return {
          success: true,
          action: 'like_post',
          timestamp: new Date(),
          details: { postUrl },
        };
      }

      return {
        success: false,
        action: 'like_post',
        timestamp: new Date(),
        error: 'Like button not found',
      };
    } catch (error) {
      return {
        success: false,
        action: 'like_post',
        timestamp: new Date(),
        error: String(error),
      };
    }
  }

  /**
   * Comment on a Facebook post
   */
  async commentOnPost(postUrl: string, comment: string): Promise<AutomationResult> {
    if (!this.page) {
      return {
        success: false,
        action: 'comment_post',
        timestamp: new Date(),
        error: 'Browser not initialized',
      };
    }

    try {
      await this.page.goto(postUrl, { waitUntil: 'networkidle' });

      // Find comment input
      const commentInput = await this.page.$('[aria-label*="Write a comment"]');
      if (commentInput) {
        await HumanBehavior.humanClick(this.page, '[aria-label*="Write a comment"]');
        await HumanBehavior.randomDelay(500, 1500);

        // Type comment
        await HumanBehavior.humanType(this.page, comment, true); // Include typos for realism

        // Submit comment
        await HumanBehavior.randomDelay(1000, 2000);
        await this.page.keyboard.press('Enter');
        await HumanBehavior.randomDelay(2000, 4000);

        return {
          success: true,
          action: 'comment_post',
          timestamp: new Date(),
          details: { postUrl, commentLength: comment.length },
        };
      }

      return {
        success: false,
        action: 'comment_post',
        timestamp: new Date(),
        error: 'Comment input not found',
      };
    } catch (error) {
      return {
        success: false,
        action: 'comment_post',
        timestamp: new Date(),
        error: String(error),
      };
    }
  }

  /**
   * Share a Facebook post
   */
  async sharePost(postUrl: string): Promise<AutomationResult> {
    if (!this.page) {
      return {
        success: false,
        action: 'share_post',
        timestamp: new Date(),
        error: 'Browser not initialized',
      };
    }

    try {
      await this.page.goto(postUrl, { waitUntil: 'networkidle' });

      // Find and click share button
      const shareButton = await this.page.$('[aria-label*="Share"]');
      if (shareButton) {
        await HumanBehavior.humanClick(this.page, '[aria-label*="Share"]');
        await HumanBehavior.randomDelay(1000, 2000);

        // Click "Share Now" if available
        const shareNowButton = await this.page.$('button:has-text("Share Now")');
        if (shareNowButton) {
          await HumanBehavior.humanClick(this.page, 'button:has-text("Share Now")');
          await HumanBehavior.randomDelay(2000, 4000);
        }

        return {
          success: true,
          action: 'share_post',
          timestamp: new Date(),
          details: { postUrl },
        };
      }

      return {
        success: false,
        action: 'share_post',
        timestamp: new Date(),
        error: 'Share button not found',
      };
    } catch (error) {
      return {
        success: false,
        action: 'share_post',
        timestamp: new Date(),
        error: String(error),
      };
    }
  }

  /**
   * Follow a Facebook page
   */
  async followPage(pageUrl: string): Promise<AutomationResult> {
    if (!this.page) {
      return {
        success: false,
        action: 'follow_page',
        timestamp: new Date(),
        error: 'Browser not initialized',
      };
    }

    try {
      await this.page.goto(pageUrl, { waitUntil: 'networkidle' });

      // Find and click follow button
      const followButton = await this.page.$('button:has-text("Follow")');
      if (followButton) {
        await HumanBehavior.humanClick(this.page, 'button:has-text("Follow")');
        await HumanBehavior.randomDelay(1000, 3000);

        return {
          success: true,
          action: 'follow_page',
          timestamp: new Date(),
          details: { pageUrl },
        };
      }

      return {
        success: false,
        action: 'follow_page',
        timestamp: new Date(),
        error: 'Follow button not found',
      };
    } catch (error) {
      return {
        success: false,
        action: 'follow_page',
        timestamp: new Date(),
        error: String(error),
      };
    }
  }

  /**
   * Simulate browsing behavior
   */
  async browsePage(duration: number = 30000): Promise<AutomationResult> {
    if (!this.page) {
      return {
        success: false,
        action: 'browse_page',
        timestamp: new Date(),
        error: 'Browser not initialized',
      };
    }

    try {
      await HumanBehavior.randomBrowsing(this.page, duration);

      return {
        success: true,
        action: 'browse_page',
        timestamp: new Date(),
        details: { duration },
      };
    } catch (error) {
      return {
        success: false,
        action: 'browse_page',
        timestamp: new Date(),
        error: String(error),
      };
    }
  }

  /**
   * Close browser session
   */
  async closeBrowser(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}
