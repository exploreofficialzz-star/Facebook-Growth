/**
 * Proxy Manager Module
 * Manages assignment and rotation of residential and mobile proxies
 */

export enum ProxyType {
  MOBILE = 'mobile',
  RESIDENTIAL = 'residential',
  DATACENTER = 'datacenter',
}

export interface ProxyConfig {
  id: string;
  type: ProxyType;
  address: string;
  port: number;
  username?: string;
  password?: string;
  lastUsed?: Date;
  failureCount: number;
  successCount: number;
  isHealthy: boolean;
}

export interface ProxyStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  averageResponseTime: number;
}

export class ProxyManager {
  private proxies: Map<string, ProxyConfig> = new Map();
  private proxyStats: Map<string, ProxyStats> = new Map();

  /**
   * Add a proxy to the pool
   */
  addProxy(config: ProxyConfig): void {
    this.proxies.set(config.id, {
      ...config,
      failureCount: 0,
      successCount: 0,
      isHealthy: true,
    });

    this.proxyStats.set(config.id, {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      successRate: 100,
      averageResponseTime: 0,
    });
  }

  /**
   * Remove a proxy from the pool
   */
  removeProxy(proxyId: string): boolean {
    return this.proxies.delete(proxyId);
  }

  /**
   * Get the next available proxy using round-robin with health checks
   */
  getNextProxy(preferredType?: ProxyType): ProxyConfig | null {
    const availableProxies = Array.from(this.proxies.values()).filter(p => {
      if (!p.isHealthy) return false;
      if (preferredType && p.type !== preferredType) return false;
      return true;
    });

    if (availableProxies.length === 0) {
      // If no healthy proxies of preferred type, return any healthy proxy
      const anyHealthy = Array.from(this.proxies.values()).filter(p => p.isHealthy);
      if (anyHealthy.length === 0) return null;
      return this.selectLeastUsedProxy(anyHealthy);
    }

    // Return the least recently used proxy
    return this.selectLeastUsedProxy(availableProxies);
  }

  /**
   * Select the proxy that was used least recently
   */
  private selectLeastUsedProxy(proxies: ProxyConfig[]): ProxyConfig {
    return proxies.reduce((prev, current) => {
      const prevTime = prev.lastUsed?.getTime() || 0;
      const currentTime = current.lastUsed?.getTime() || 0;
      return prevTime < currentTime ? prev : current;
    });
  }

  /**
   * Get proxy URL for browser automation
   */
  getProxyUrl(proxy: ProxyConfig): string {
    const auth = proxy.username && proxy.password ? `${proxy.username}:${proxy.password}@` : '';
    return `http://${auth}${proxy.address}:${proxy.port}`;
  }

  /**
   * Record successful proxy usage
   */
  recordSuccess(proxyId: string, responseTime: number): void {
    const proxy = this.proxies.get(proxyId);
    if (!proxy) return;

    proxy.lastUsed = new Date();
    proxy.successCount++;
    proxy.failureCount = Math.max(0, proxy.failureCount - 1); // Reduce failure count on success

    const stats = this.proxyStats.get(proxyId);
    if (stats) {
      stats.totalRequests++;
      stats.successfulRequests++;
      stats.successRate = (stats.successfulRequests / stats.totalRequests) * 100;
      stats.averageResponseTime =
        (stats.averageResponseTime * (stats.totalRequests - 1) + responseTime) / stats.totalRequests;
    }

    // Mark as healthy if success rate is above threshold
    if (proxy.failureCount === 0 && proxy.successCount > 5) {
      proxy.isHealthy = true;
    }
  }

  /**
   * Record failed proxy usage
   */
  recordFailure(proxyId: string, reason?: string): void {
    const proxy = this.proxies.get(proxyId);
    if (!proxy) return;

    proxy.failureCount++;
    proxy.lastUsed = new Date();

    const stats = this.proxyStats.get(proxyId);
    if (stats) {
      stats.totalRequests++;
      stats.failedRequests++;
      stats.successRate = (stats.successfulRequests / stats.totalRequests) * 100;
    }

    // Mark as unhealthy if failure rate is too high
    if (proxy.failureCount > 5 || (stats && stats.successRate < 50)) {
      proxy.isHealthy = false;
    }
  }

  /**
   * Get statistics for a proxy
   */
  getProxyStats(proxyId: string): ProxyStats | null {
    return this.proxyStats.get(proxyId) || null;
  }

  /**
   * Get all proxies with their stats
   */
  getAllProxies(): Array<ProxyConfig & { stats: ProxyStats | null }> {
    return Array.from(this.proxies.values()).map(proxy => ({
      ...proxy,
      stats: this.proxyStats.get(proxy.id) || null,
    }));
  }

  /**
   * Get health report of proxy pool
   */
  getPoolHealth(): {
    totalProxies: number;
    healthyProxies: number;
    unhealthyProxies: number;
    averageSuccessRate: number;
  } {
    const proxies = Array.from(this.proxies.values());
    const stats = Array.from(this.proxyStats.values());

    const healthyCount = proxies.filter(p => p.isHealthy).length;
    const unhealthyCount = proxies.filter(p => !p.isHealthy).length;
    const avgSuccessRate =
      stats.length > 0
        ? stats.reduce((sum, s) => sum + s.successRate, 0) / stats.length
        : 0;

    return {
      totalProxies: proxies.length,
      healthyProxies: healthyCount,
      unhealthyProxies: unhealthyCount,
      averageSuccessRate: avgSuccessRate,
    };
  }

  /**
   * Rotate proxies - mark current as used and get next
   */
  rotateProxy(currentProxyId: string): ProxyConfig | null {
    const proxy = this.proxies.get(currentProxyId);
    if (proxy) {
      proxy.lastUsed = new Date();
    }
    return this.getNextProxy();
  }

  /**
   * Get proxy by ID
   */
  getProxyById(proxyId: string): ProxyConfig | null {
    return this.proxies.get(proxyId) || null;
  }

  /**
   * Reset proxy health status (useful for recovery attempts)
   */
  resetProxyHealth(proxyId: string): void {
    const proxy = this.proxies.get(proxyId);
    if (proxy) {
      proxy.failureCount = 0;
      proxy.isHealthy = true;
    }
  }

  /**
   * Clean up proxies that haven't been used in a long time
   */
  pruneUnusedProxies(maxInactiveHours: number = 24): number {
    const now = Date.now();
    const maxAge = maxInactiveHours * 60 * 60 * 1000;
    let pruned = 0;

    for (const [id, proxy] of this.proxies) {
      const lastUsedTime = proxy.lastUsed?.getTime() || 0;
      if (lastUsedTime > 0 && now - lastUsedTime > maxAge && !proxy.isHealthy) {
        this.proxies.delete(id);
        this.proxyStats.delete(id);
        pruned++;
      }
    }

    return pruned;
  }
}
