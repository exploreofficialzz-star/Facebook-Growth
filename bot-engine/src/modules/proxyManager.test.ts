import { describe, it, expect, beforeEach } from 'vitest';
import { ProxyManager, ProxyType } from './proxyManager';

describe('ProxyManager', () => {
  let manager: ProxyManager;

  beforeEach(() => {
    manager = new ProxyManager();
  });

  describe('addProxy', () => {
    it('should add a proxy to the pool', () => {
      manager.addProxy({
        id: 'proxy-1',
        type: ProxyType.MOBILE,
        address: '192.168.1.1',
        port: 8080,
        failureCount: 0,
        successCount: 0,
        isHealthy: true,
      });

      const proxies = manager.getAllProxies();
      expect(proxies).toHaveLength(1);
      expect(proxies[0].id).toBe('proxy-1');
    });

    it('should initialize proxy stats', () => {
      manager.addProxy({
        id: 'proxy-1',
        type: ProxyType.RESIDENTIAL,
        address: '192.168.1.1',
        port: 8080,
        failureCount: 0,
        successCount: 0,
        isHealthy: true,
      });

      const stats = manager.getProxyStats('proxy-1');
      expect(stats).not.toBeNull();
      expect(stats?.totalRequests).toBe(0);
      expect(stats?.successRate).toBe(100);
    });
  });

  describe('removeProxy', () => {
    it('should remove a proxy from the pool', () => {
      manager.addProxy({
        id: 'proxy-1',
        type: ProxyType.MOBILE,
        address: '192.168.1.1',
        port: 8080,
        failureCount: 0,
        successCount: 0,
        isHealthy: true,
      });

      expect(manager.removeProxy('proxy-1')).toBe(true);
      expect(manager.getAllProxies()).toHaveLength(0);
    });

    it('should return false when removing non-existent proxy', () => {
      expect(manager.removeProxy('non-existent')).toBe(false);
    });
  });

  describe('getNextProxy', () => {
    it('should return null when no proxies available', () => {
      expect(manager.getNextProxy()).toBeNull();
    });

    it('should return a healthy proxy', () => {
      manager.addProxy({
        id: 'proxy-1',
        type: ProxyType.MOBILE,
        address: '192.168.1.1',
        port: 8080,
        failureCount: 0,
        successCount: 0,
        isHealthy: true,
      });

      const proxy = manager.getNextProxy();
      expect(proxy).not.toBeNull();
      expect(proxy?.id).toBe('proxy-1');
    });

    it('should skip unhealthy proxies', () => {
      manager.addProxy({
        id: 'proxy-1',
        type: ProxyType.MOBILE,
        address: '192.168.1.1',
        port: 8080,
        failureCount: 10,
        successCount: 0,
        isHealthy: false,
      });

      manager.addProxy({
        id: 'proxy-2',
        type: ProxyType.MOBILE,
        address: '192.168.1.2',
        port: 8080,
        failureCount: 0,
        successCount: 5,
        isHealthy: true,
      });

      const proxy = manager.getNextProxy();
      expect(proxy?.id).toBe('proxy-2');
    });

    it('should filter by proxy type when specified', () => {
      manager.addProxy({
        id: 'proxy-1',
        type: ProxyType.MOBILE,
        address: '192.168.1.1',
        port: 8080,
        failureCount: 0,
        successCount: 0,
        isHealthy: true,
      });

      manager.addProxy({
        id: 'proxy-2',
        type: ProxyType.RESIDENTIAL,
        address: '192.168.1.2',
        port: 8080,
        failureCount: 0,
        successCount: 0,
        isHealthy: true,
      });

      const proxy = manager.getNextProxy(ProxyType.RESIDENTIAL);
      expect(proxy?.id).toBe('proxy-2');
    });
  });

  describe('getProxyUrl', () => {
    it('should format proxy URL without credentials', () => {
      const proxy = {
        id: 'proxy-1',
        type: ProxyType.MOBILE,
        address: '192.168.1.1',
        port: 8080,
        failureCount: 0,
        successCount: 0,
        isHealthy: true,
      };

      const url = manager.getProxyUrl(proxy);
      expect(url).toBe('http://192.168.1.1:8080');
    });

    it('should format proxy URL with credentials', () => {
      const proxy = {
        id: 'proxy-1',
        type: ProxyType.MOBILE,
        address: '192.168.1.1',
        port: 8080,
        username: 'user',
        password: 'pass',
        failureCount: 0,
        successCount: 0,
        isHealthy: true,
      };

      const url = manager.getProxyUrl(proxy);
      expect(url).toBe('http://user:pass@192.168.1.1:8080');
    });
  });

  describe('recordSuccess', () => {
    it('should increment success count', () => {
      manager.addProxy({
        id: 'proxy-1',
        type: ProxyType.MOBILE,
        address: '192.168.1.1',
        port: 8080,
        failureCount: 0,
        successCount: 0,
        isHealthy: true,
      });

      manager.recordSuccess('proxy-1', 100);
      const stats = manager.getProxyStats('proxy-1');
      expect(stats?.successfulRequests).toBe(1);
      expect(stats?.totalRequests).toBe(1);
    });

    it('should reduce failure count on success', () => {
      manager.addProxy({
        id: 'proxy-1',
        type: ProxyType.MOBILE,
        address: '192.168.1.1',
        port: 8080,
        failureCount: 3,
        successCount: 0,
        isHealthy: false,
      });

      manager.recordSuccess('proxy-1', 100);
      const proxy = manager.getProxyById('proxy-1');
      expect(proxy?.failureCount).toBe(2);
    });
  });

  describe('recordFailure', () => {
    it('should increment failure count', () => {
      manager.addProxy({
        id: 'proxy-1',
        type: ProxyType.MOBILE,
        address: '192.168.1.1',
        port: 8080,
        failureCount: 0,
        successCount: 0,
        isHealthy: true,
      });

      manager.recordFailure('proxy-1');
      const proxy = manager.getProxyById('proxy-1');
      expect(proxy?.failureCount).toBe(1);
    });

    it('should mark proxy unhealthy after multiple failures', () => {
      manager.addProxy({
        id: 'proxy-1',
        type: ProxyType.MOBILE,
        address: '192.168.1.1',
        port: 8080,
        failureCount: 0,
        successCount: 0,
        isHealthy: true,
      });

      for (let i = 0; i < 6; i++) {
        manager.recordFailure('proxy-1');
      }

      const proxy = manager.getProxyById('proxy-1');
      expect(proxy?.isHealthy).toBe(false);
    });
  });

  describe('getPoolHealth', () => {
    it('should return accurate pool health metrics', () => {
      manager.addProxy({
        id: 'proxy-1',
        type: ProxyType.MOBILE,
        address: '192.168.1.1',
        port: 8080,
        failureCount: 0,
        successCount: 5,
        isHealthy: true,
      });

      manager.addProxy({
        id: 'proxy-2',
        type: ProxyType.MOBILE,
        address: '192.168.1.2',
        port: 8080,
        failureCount: 10,
        successCount: 0,
        isHealthy: false,
      });

      const health = manager.getPoolHealth();
      expect(health.totalProxies).toBe(2);
      expect(health.healthyProxies).toBe(1);
      expect(health.unhealthyProxies).toBe(1);
    });
  });

  describe('rotateProxy', () => {
    it('should mark current proxy as used and return next', () => {
      manager.addProxy({
        id: 'proxy-1',
        type: ProxyType.MOBILE,
        address: '192.168.1.1',
        port: 8080,
        failureCount: 0,
        successCount: 0,
        isHealthy: true,
      });

      manager.addProxy({
        id: 'proxy-2',
        type: ProxyType.MOBILE,
        address: '192.168.1.2',
        port: 8080,
        failureCount: 0,
        successCount: 0,
        isHealthy: true,
      });

      const nextProxy = manager.rotateProxy('proxy-1');
      expect(nextProxy?.id).toBe('proxy-2');
    });
  });

  describe('resetProxyHealth', () => {
    it('should reset failure count and mark as healthy', () => {
      manager.addProxy({
        id: 'proxy-1',
        type: ProxyType.MOBILE,
        address: '192.168.1.1',
        port: 8080,
        failureCount: 10,
        successCount: 0,
        isHealthy: false,
      });

      manager.resetProxyHealth('proxy-1');
      const proxy = manager.getProxyById('proxy-1');
      expect(proxy?.failureCount).toBe(0);
      expect(proxy?.isHealthy).toBe(true);
    });
  });
});
