import { Injectable, Logger } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly register: promClient.Registry;
  private readonly serviceName: string;

  // Common metrics
  public readonly httpRequestDuration: promClient.Histogram;
  public readonly httpRequestTotal: promClient.Counter;
  public readonly httpRequestErrors: promClient.Counter;
  public readonly activeConnections: promClient.Gauge;

  constructor() {
    this.serviceName = process.env.SERVICE_NAME || 'heidi-service';
    this.register = new promClient.Registry();

    // Set default labels
    this.register.setDefaultLabels({
      service: this.serviceName,
      environment: process.env.NODE_ENV || 'development',
    });

    // Collect default metrics (CPU, memory, etc.)
    promClient.collectDefaultMetrics({
      register: this.register,
      prefix: 'heidi_',
    });

    // HTTP request duration histogram
    this.httpRequestDuration = new promClient.Histogram({
      name: 'heidi_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    // HTTP request counter
    this.httpRequestTotal = new promClient.Counter({
      name: 'heidi_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    // HTTP error counter
    this.httpRequestErrors = new promClient.Counter({
      name: 'heidi_http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.register],
    });

    // Active connections gauge
    this.activeConnections = new promClient.Gauge({
      name: 'heidi_active_connections',
      help: 'Number of active connections',
      labelNames: ['type'],
      registers: [this.register],
    });

    this.logger.log('Metrics service initialized');
  }

  /**
   * Create a custom counter
   */
  createCounter(
    name: string,
    help: string,
    labelNames: string[] = [],
  ): promClient.Counter {
    return new promClient.Counter({
      name: `heidi_${name}`,
      help,
      labelNames,
      registers: [this.register],
    });
  }

  /**
   * Create a custom gauge
   */
  createGauge(
    name: string,
    help: string,
    labelNames: string[] = [],
  ): promClient.Gauge {
    return new promClient.Gauge({
      name: `heidi_${name}`,
      help,
      labelNames,
      registers: [this.register],
    });
  }

  /**
   * Create a custom histogram
   */
  createHistogram(
    name: string,
    help: string,
    labelNames: string[] = [],
    buckets?: number[],
  ): promClient.Histogram {
    return new promClient.Histogram({
      name: `heidi_${name}`,
      help,
      labelNames,
      buckets,
      registers: [this.register],
    });
  }

  /**
   * Create a custom summary
   */
  createSummary(
    name: string,
    help: string,
    labelNames: string[] = [],
  ): promClient.Summary {
    return new promClient.Summary({
      name: `heidi_${name}`,
      help,
      labelNames,
      registers: [this.register],
    });
  }

  /**
   * Record HTTP request
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    const durationInSeconds = duration / 1000;

    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode.toString() },
      durationInSeconds,
    );

    this.httpRequestTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });

    // Record error if status code >= 400
    if (statusCode >= 400) {
      this.httpRequestErrors.inc({
        method,
        route,
        error_type: statusCode >= 500 ? 'server_error' : 'client_error',
      });
    }
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /**
   * Get registry
   */
  getRegistry(): promClient.Registry {
    return this.register;
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.register.resetMetrics();
    this.logger.log('Metrics reset');
  }
}
