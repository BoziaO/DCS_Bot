/**
 * Performance Monitoring System
 * Tracks bot performance metrics and provides optimization insights
 */

const os = require("os");
const process = require("process");

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      commands: new Map(),
      events: new Map(),
      database: {
        queries: 0,
        errors: 0,
        avgResponseTime: 0,
        slowQueries: [],
      },
      memory: {
        peak: 0,
        current: 0,
        gc: 0,
      },
      uptime: Date.now(),
      errors: [],
    };

    this.thresholds = {
      slowCommand: 1000,
      slowQuery: 500,
      memoryWarning: 512 * 1024 * 1024,
      errorRate: 0.05,
    };

    this.startMonitoring();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    setInterval(() => {
      this.updateMemoryStats();
    }, 30000);

    setInterval(() => {
      this.generateReport();
    }, 300000);

    if (global.gc) {
      const originalGC = global.gc;
      global.gc = () => {
        const start = process.hrtime.bigint();
        originalGC();
        const end = process.hrtime.bigint();
        this.metrics.memory.gc++;
        console.log(`🗑️ GC completed in ${Number(end - start) / 1000000}ms`);
      };
    }
  }

  /**
   * Track command execution
   */
  trackCommand(commandName, executionTime, success = true, error = null) {
    if (!this.metrics.commands.has(commandName)) {
      this.metrics.commands.set(commandName, {
        executions: 0,
        totalTime: 0,
        avgTime: 0,
        errors: 0,
        slowExecutions: 0,
      });
    }

    const stats = this.metrics.commands.get(commandName);
    stats.executions++;
    stats.totalTime += executionTime;
    stats.avgTime = stats.totalTime / stats.executions;

    if (!success) {
      stats.errors++;
      if (error) {
        this.logError("command", commandName, error);
      }
    }

    if (executionTime > this.thresholds.slowCommand) {
      stats.slowExecutions++;
      console.warn(
        `⚠️ Slow command detected: ${commandName} took ${executionTime}ms`
      );
    }
  }

  /**
   * Track event processing
   */
  trackEvent(eventName, executionTime, success = true, error = null) {
    if (!this.metrics.events.has(eventName)) {
      this.metrics.events.set(eventName, {
        executions: 0,
        totalTime: 0,
        avgTime: 0,
        errors: 0,
      });
    }

    const stats = this.metrics.events.get(eventName);
    stats.executions++;
    stats.totalTime += executionTime;
    stats.avgTime = stats.totalTime / stats.executions;

    if (!success) {
      stats.errors++;
      if (error) {
        this.logError("event", eventName, error);
      }
    }
  }

  /**
   * Track database operations
   */
  trackDatabaseQuery(queryType, executionTime, success = true, error = null) {
    this.metrics.database.queries++;

    const totalTime =
      this.metrics.database.avgResponseTime *
        (this.metrics.database.queries - 1) +
      executionTime;
    this.metrics.database.avgResponseTime =
      totalTime / this.metrics.database.queries;

    if (!success) {
      this.metrics.database.errors++;
      if (error) {
        this.logError("database", queryType, error);
      }
    }

    if (executionTime > this.thresholds.slowQuery) {
      this.metrics.database.slowQueries.push({
        type: queryType,
        time: executionTime,
        timestamp: new Date(),
      });

      if (this.metrics.database.slowQueries.length > 50) {
        this.metrics.database.slowQueries.shift();
      }

      console.warn(
        `⚠️ Slow database query: ${queryType} took ${executionTime}ms`
      );
    }
  }

  /**
   * Update memory statistics
   */
  updateMemoryStats() {
    const memUsage = process.memoryUsage();
    this.metrics.memory.current = memUsage.heapUsed;

    if (memUsage.heapUsed > this.metrics.memory.peak) {
      this.metrics.memory.peak = memUsage.heapUsed;
    }

    if (memUsage.heapUsed > this.thresholds.memoryWarning) {
      console.warn(
        `⚠️ High memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
      );
    }
  }

  /**
   * Log errors with context
   */
  logError(type, context, error) {
    const errorEntry = {
      type,
      context,
      error: error.message || error,
      stack: error.stack,
      timestamp: new Date(),
    };

    this.metrics.errors.push(errorEntry);

    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }
  }

  /**
   * Get system information
   */
  getSystemInfo() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: process.uptime(),
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      system: {
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAverage: os.loadavg(),
        cpuCount: os.cpus().length,
      },
    };
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const report = {
      timestamp: new Date(),
      uptime: Date.now() - this.metrics.uptime,
      system: this.getSystemInfo(),
      commands: this.getTopCommands(),
      events: this.getTopEvents(),
      database: this.metrics.database,
      memory: this.metrics.memory,
      errors: this.getRecentErrors(),
      recommendations: this.getRecommendations(),
    };

    console.log("📊 Performance Report Generated");
    return report;
  }

  /**
   * Get top commands by usage
   */
  getTopCommands(limit = 10) {
    return Array.from(this.metrics.commands.entries())
      .sort(([, a], [, b]) => b.executions - a.executions)
      .slice(0, limit)
      .map(([name, stats]) => ({ name, ...stats }));
  }

  /**
   * Get top events by usage
   */
  getTopEvents(limit = 10) {
    return Array.from(this.metrics.events.entries())
      .sort(([, a], [, b]) => b.executions - a.executions)
      .slice(0, limit)
      .map(([name, stats]) => ({ name, ...stats }));
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10) {
    return this.metrics.errors.slice(-limit).reverse();
  }

  /**
   * Generate optimization recommendations
   */
  getRecommendations() {
    const recommendations = [];

    for (const [name, stats] of this.metrics.commands.entries()) {
      if (stats.avgTime > this.thresholds.slowCommand) {
        recommendations.push({
          type: "performance",
          severity: "medium",
          message: `Command '${name}' has slow average execution time: ${Math.round(
            stats.avgTime
          )}ms`,
        });
      }

      const errorRate = stats.errors / stats.executions;
      if (errorRate > this.thresholds.errorRate) {
        recommendations.push({
          type: "reliability",
          severity: "high",
          message: `Command '${name}' has high error rate: ${Math.round(
            errorRate * 100
          )}%`,
        });
      }
    }

    if (this.metrics.memory.current > this.thresholds.memoryWarning) {
      recommendations.push({
        type: "memory",
        severity: "high",
        message: `High memory usage detected: ${Math.round(
          this.metrics.memory.current / 1024 / 1024
        )}MB`,
      });
    }

    if (this.metrics.database.avgResponseTime > this.thresholds.slowQuery) {
      recommendations.push({
        type: "database",
        severity: "medium",
        message: `Database queries are slow on average: ${Math.round(
          this.metrics.database.avgResponseTime
        )}ms`,
      });
    }

    return recommendations;
  }

  /**
   * Create performance middleware for commands
   */
  createCommandMiddleware() {
    return (originalExecute) => {
      return async function (interaction) {
        const start = process.hrtime.bigint();
        let success = true;
        let error = null;

        try {
          await originalExecute.call(this, interaction);
        } catch (err) {
          success = false;
          error = err;
          throw err;
        } finally {
          const end = process.hrtime.bigint();
          const executionTime = Number(end - start) / 1000000;

          performanceMonitor.trackCommand(
            interaction.commandName,
            executionTime,
            success,
            error
          );
        }
      };
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics.commands.clear();
    this.metrics.events.clear();
    this.metrics.database = {
      queries: 0,
      errors: 0,
      avgResponseTime: 0,
      slowQueries: [],
    };
    this.metrics.errors = [];
    this.metrics.uptime = Date.now();
  }
}

const performanceMonitor = new PerformanceMonitor();

module.exports = {
  PerformanceMonitor,
  performanceMonitor,
};
