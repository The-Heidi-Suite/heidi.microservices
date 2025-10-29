import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@heidi/prisma';
import { LoggerService, ChildLogger } from '@heidi/logger';
import { ErrorReportingService } from '@heidi/errors';
import { HealthCheckService } from '@heidi/health';
import { AlertingService } from './alerting.service';
import { SystemMetrics, Alert, AlertRule } from './interfaces';

// Placeholder interfaces for services not yet implemented
interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface HealthStatus {
  checks: {
    database: { status: string };
    redis: { status: string };
  };
}

interface ErrorMetrics {
  totalErrors?: number;
  errorRate?: number;
  errorsBySeverity?: { critical?: number };
  recentErrors?: any[];
}

@Injectable()
export class MonitoringService {
  private readonly structuredLogger: ChildLogger;
  private readonly startTime = Date.now();
  private readonly alertRules: Map<string, AlertRule> = new Map();
  private readonly activeAlerts: Map<string, Alert> = new Map();
  private readonly alertHistory: Alert[] = [];
  private metricsHistory: SystemMetrics[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly alertingService: AlertingService,
    loggerService: LoggerService,
    private readonly healthCheckService: HealthCheckService,
    private readonly errorReportingService: ErrorReportingService,
    private readonly queueService?: any, // Optional: QueueService, if available
  ) {
    this.structuredLogger = loggerService.createChildLogger({
      operation: 'monitoring',
    });

    this.initializeAlertRules();
  }

  private initializeAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_failure_rate',
        name: 'High Job Failure Rate',
        description: 'Job failure rate exceeds threshold',
        condition: 'job_failure_rate > threshold',
        threshold: 0.2, // 20%
        severity: 'high',
        enabled: true,
        cooldownMinutes: 15,
      },
      {
        id: 'queue_stalled',
        name: 'Queue Processing Stalled',
        description: 'No jobs processed in the last 30 minutes',
        condition: 'queue_throughput == 0',
        threshold: 0,
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 30,
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        description: 'Memory usage exceeds threshold',
        condition: 'memory_usage > threshold',
        threshold: 0.85, // 85%
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 10,
      },
      {
        id: 'database_connection_issues',
        name: 'Database Connection Issues',
        description: 'Database health check failing',
        condition: 'database_status != healthy',
        threshold: 1,
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 5,
      },
      {
        id: 'redis_connection_issues',
        name: 'Redis Connection Issues',
        description: 'Redis health check failing',
        condition: 'redis_status != healthy',
        threshold: 1,
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 5,
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Error rate exceeds threshold',
        condition: 'error_rate > threshold',
        threshold: 10, // 10 errors per minute
        severity: 'high',
        enabled: true,
        cooldownMinutes: 10,
      },
    ];

    defaultRules.forEach((rule) => {
      this.alertRules.set(rule.id, rule);
    });

    this.structuredLogger.log(`Initialized ${defaultRules.length} alert rules`);
  }

  /**
   * Collect comprehensive system metrics
   */
  async collectMetrics(): Promise<SystemMetrics> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;

    try {
      const [jobMetrics, queueMetrics, systemMetrics, databaseMetrics, errorMetrics] =
        await Promise.all([
          this.collectJobMetrics(),
          this.collectQueueMetrics(),
          this.collectSystemMetrics(),
          this.collectDatabaseMetrics(),
          this.collectErrorMetrics(),
        ]);

      const metrics: SystemMetrics = {
        timestamp,
        uptime,
        version: this.configService.get<string>('SERVICE_VERSION', '1.0.0'),
        environment: this.configService.get<string>('NODE_ENV', 'development'),
        jobs: jobMetrics,
        queues: queueMetrics,
        system: systemMetrics,
        database: databaseMetrics,
        errors: errorMetrics,
      };

      // Store metrics history (keep last 100 entries)
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > 100) {
        this.metricsHistory.shift();
      }

      return metrics;
    } catch (error) {
      this.structuredLogger.error('Failed to collect metrics', error);
      throw error;
    }
  }

  private async collectJobMetrics() {
    if (!this.prismaService) {
      return {
        total: 0,
        active: 0,
        paused: 0,
        failed: 0,
        completed: 0,
        averageExecutionTime: 0,
        successRate: 0,
        failureRate: 0,
      };
    }

    try {
      const [totalJobs, activeJobs, pausedJobs, failedJobs, completedJobs, recentRuns] =
        await Promise.all([
          this.prismaService.job.count(),
          this.prismaService.job.count({ where: { status: 'ACTIVE' } }),
          this.prismaService.job.count({ where: { status: 'PAUSED' } }),
          this.prismaService.job.count({ where: { status: 'FAILED' } }),
          this.prismaService.jobRun.count({ where: { status: 'COMPLETED' } }),
          this.prismaService.jobRun.findMany({
            where: {
              startedAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            },
            select: {
              status: true,
              startedAt: true,
              completedAt: true,
            },
          }),
        ]);

      // Calculate execution times and success rate
      const completedRuns = recentRuns.filter(
        (run) => run.status === 'COMPLETED' && run.completedAt,
      );
      const failedRuns = recentRuns.filter((run) => run.status === 'FAILED');

      const averageExecutionTime =
        completedRuns.length > 0
          ? completedRuns.reduce((sum, run) => {
              const duration = run.completedAt!.getTime() - run.startedAt.getTime();
              return sum + duration;
            }, 0) / completedRuns.length
          : 0;

      const totalRecentRuns = recentRuns.length;
      const successRate = totalRecentRuns > 0 ? completedRuns.length / totalRecentRuns : 1;
      const failureRate = totalRecentRuns > 0 ? failedRuns.length / totalRecentRuns : 0;

      return {
        total: totalJobs,
        active: activeJobs,
        paused: pausedJobs,
        failed: failedJobs,
        completed: completedJobs,
        averageExecutionTime,
        successRate,
        failureRate,
      };
    } catch (error) {
      this.structuredLogger.error('Failed to collect job metrics', error);
      return {
        total: 0,
        active: 0,
        paused: 0,
        failed: 0,
        completed: 0,
        averageExecutionTime: 0,
        successRate: 0,
        failureRate: 0,
      };
    }
  }

  private async collectQueueMetrics() {
    try {
      if (!this.queueService?.getQueueStats) {
        return {
          scraping: {
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            paused: 0,
            throughput: 0,
            averageProcessingTime: 0,
          },
          cleanup: {
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            paused: 0,
            throughput: 0,
            averageProcessingTime: 0,
          },
        };
      }

      const scrapingStats: QueueStats = await this.queueService.getQueueStats();

      // Calculate throughput (jobs per minute) from recent history
      const scrapingThroughput = this.calculateThroughput('scraping');
      const cleanupThroughput = this.calculateThroughput('cleanup');

      return {
        scraping: {
          waiting: scrapingStats.waiting,
          active: scrapingStats.active,
          completed: scrapingStats.completed,
          failed: scrapingStats.failed,
          delayed: scrapingStats.delayed,
          paused: 0, // BullMQ doesn't track paused jobs in stats
          throughput: scrapingThroughput,
          averageProcessingTime: 0, // Would need job history to calculate
        },
        cleanup: {
          waiting: 0, // Would need cleanup queue stats
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: 0,
          throughput: cleanupThroughput,
          averageProcessingTime: 0,
        },
      };
    } catch (error) {
      this.structuredLogger.error('Failed to collect queue metrics', error);
      return {
        scraping: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: 0,
          throughput: 0,
          averageProcessingTime: 0,
        },
        cleanup: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: 0,
          throughput: 0,
          averageProcessingTime: 0,
        },
      };
    }
  }

  private calculateThroughput(_queueName: string): number {
    // Simple throughput calculation based on recent metrics
    // In a real implementation, you'd track job completion events
    return 0;
  }

  private async collectSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000;

    return {
      memoryUsage,
      cpuUsage: cpuPercent,
      networkConnections: 0, // Would need system-level monitoring
    };
  }

  private async collectDatabaseMetrics() {
    // Simple database metrics - in production you'd use more sophisticated monitoring
    return {
      connectionCount: 1, // Prisma connection pool size
      queryCount: 0, // Would need query interceptor
      averageQueryTime: 0, // Would need query timing
      slowQueries: 0, // Would need slow query log analysis
    };
  }

  private async collectErrorMetrics() {
    try {
      if (!this.errorReportingService?.getErrorMetrics) {
        return {
          totalErrors: 0,
          errorRate: 0,
          criticalErrors: 0,
          recentErrors: 0,
        };
      }

      const errorMetrics: ErrorMetrics = this.errorReportingService.getErrorMetrics(60 * 60 * 1000); // Last hour

      if (!errorMetrics) {
        return {
          totalErrors: 0,
          errorRate: 0,
          criticalErrors: 0,
          recentErrors: 0,
        };
      }

      return {
        totalErrors: errorMetrics.totalErrors || 0,
        errorRate: errorMetrics.errorRate || 0,
        criticalErrors: errorMetrics.errorsBySeverity?.critical || 0,
        recentErrors: errorMetrics.recentErrors?.length || 0,
      };
    } catch (error) {
      this.structuredLogger.error('Failed to collect error metrics', error);
      return {
        totalErrors: 0,
        errorRate: 0,
        criticalErrors: 0,
        recentErrors: 0,
      };
    }
  }

  /**
   * Check alert rules and trigger alerts if conditions are met
   */
  // @ts-expect-error - Cron decorator has typing inconsistencies with async methods
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAlerts(): Promise<void> {
    try {
      const metrics = await this.collectMetrics();
      const healthStatus: HealthStatus = this.healthCheckService?.getHealthStatus
        ? await this.healthCheckService.getHealthStatus()
        : { checks: { database: { status: 'healthy' }, redis: { status: 'healthy' } } };

      for (const rule of this.alertRules.values()) {
        if (!rule.enabled) continue;

        // Check cooldown period
        if (rule.lastTriggered) {
          const cooldownEnd = new Date(
            rule.lastTriggered.getTime() + rule.cooldownMinutes * 60 * 1000,
          );
          if (new Date() < cooldownEnd) continue;
        }

        const shouldAlert = this.evaluateAlertCondition(rule, metrics, healthStatus);

        if (shouldAlert) {
          await this.triggerAlert(rule, metrics);
        }
      }
    } catch (error) {
      this.structuredLogger.error('Failed to check alerts', error);
    }
  }

  private evaluateAlertCondition(
    rule: AlertRule,
    metrics: SystemMetrics,
    healthStatus: HealthStatus,
  ): boolean {
    switch (rule.id) {
      case 'high_failure_rate':
        return metrics.jobs.failureRate > rule.threshold;

      case 'queue_stalled':
        return metrics.queues.scraping.throughput === 0 && metrics.queues.scraping.active === 0;

      case 'high_memory_usage':
        const memoryUsage =
          metrics.system.memoryUsage.heapUsed / metrics.system.memoryUsage.heapTotal;
        return memoryUsage > rule.threshold;

      case 'database_connection_issues':
        return healthStatus.checks.database.status !== 'healthy';

      case 'redis_connection_issues':
        return healthStatus.checks.redis.status !== 'healthy';

      case 'high_error_rate':
        return metrics.errors.errorRate > rule.threshold;

      default:
        return false;
    }
  }

  private async triggerAlert(rule: AlertRule, metrics: SystemMetrics): Promise<void> {
    const alertId = `alert_${rule.id}_${Date.now()}`;
    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: this.generateAlertMessage(rule, metrics),
      timestamp: new Date(),
      resolved: false,
      metadata: { metrics },
    };

    // Store alert
    this.activeAlerts.set(alertId, alert);
    this.alertHistory.push(alert);

    // Update rule last triggered time
    rule.lastTriggered = new Date();

    // Log alert
    this.structuredLogger.warn(`Alert triggered: ${rule.name}`, {
      alertId,
      ruleId: rule.id,
      severity: rule.severity,
      message: alert.message,
    });

    // Send alert notification
    await this.sendAlertNotification(alert);
  }

  private generateAlertMessage(rule: AlertRule, metrics: SystemMetrics): string {
    switch (rule.id) {
      case 'high_failure_rate':
        return `Job failure rate is ${(metrics.jobs.failureRate * 100).toFixed(1)}% (threshold: ${(rule.threshold * 100).toFixed(1)}%)`;

      case 'queue_stalled':
        return `Queue processing has stalled - no jobs processed recently`;

      case 'high_memory_usage':
        const memoryUsage = (
          (metrics.system.memoryUsage.heapUsed / metrics.system.memoryUsage.heapTotal) *
          100
        ).toFixed(1);
        return `Memory usage is ${memoryUsage}% (threshold: ${(rule.threshold * 100).toFixed(1)}%)`;

      case 'database_connection_issues':
        return `Database health check is failing`;

      case 'redis_connection_issues':
        return `Redis health check is failing`;

      case 'high_error_rate':
        return `Error rate is ${metrics.errors.errorRate.toFixed(1)} errors/min (threshold: ${rule.threshold})`;

      default:
        return `Alert condition met for rule: ${rule.name}`;
    }
  }

  private async sendAlertNotification(alert: Alert): Promise<void> {
    try {
      await this.alertingService.sendAlert(alert);
    } catch (error) {
      this.structuredLogger.error('Failed to send alert notification', error, {
        alertId: alert.id,
        ruleId: alert.ruleId,
      });
    }
  }

  /**
   * Get current system metrics
   */
  async getMetrics(): Promise<SystemMetrics> {
    return await this.collectMetrics();
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit: number = 50): SystemMetrics[] {
    return this.metricsHistory.slice(-limit);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter((alert) => !alert.resolved);
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();

      this.structuredLogger.log(`Alert resolved: ${alert.ruleName}`, {
        alertId,
        ruleId: alert.ruleId,
      });

      return true;
    }
    return false;
  }

  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      this.structuredLogger.log(`Alert rule updated: ${ruleId}`, { updates });
      return true;
    }
    return false;
  }
}
