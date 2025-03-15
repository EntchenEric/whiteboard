/**
 * PerformanceMonitor - A utility for tracking and logging canvas performance metrics
 */

interface PerformanceEntry {
  timestamp: number;
  renderTime: number;
  objectCount: number;
  fps?: number;
  memoryUsage?: {
    totalJSHeapSize?: number;
    usedJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
}

interface PerformanceStats {
  avgRenderTime: number;
  minRenderTime: number;
  maxRenderTime: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  sampleCount: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private entries: PerformanceEntry[] = [];
  private maxEntries: number = 1000;
  private isRecording: boolean = false;
  private lastFpsTime: number = 0;
  private frameCount: number = 0;
  private currentFps: number = 0;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start recording performance metrics
   */
  public startRecording(): void {
    this.isRecording = true;
    this.lastFpsTime = performance.now();
    this.frameCount = 0;
    console.log('Performance monitoring started');
  }

  /**
   * Stop recording performance metrics
   */
  public stopRecording(): void {
    this.isRecording = false;
    console.log('Performance monitoring stopped');
  }

  /**
   * Clear all recorded performance entries
   */
  public clearEntries(): void {
    this.entries = [];
    console.log('Performance entries cleared');
  }

  /**
   * Record a new performance entry
   */
  public recordMetrics(renderTime: number, objectCount: number): void {
    if (!this.isRecording) return;

    // Calculate FPS
    const now = performance.now();
    this.frameCount++;
    
    if (now - this.lastFpsTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    // Get memory usage if available
    let memoryUsage;
    if (performance && 'memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = {
        totalJSHeapSize: memory?.totalJSHeapSize,
        usedJSHeapSize: memory?.usedJSHeapSize,
        jsHeapSizeLimit: memory?.jsHeapSizeLimit
      };
    }

    // Create and add the entry
    const entry: PerformanceEntry = {
      timestamp: now,
      renderTime,
      objectCount,
      fps: this.currentFps,
      memoryUsage
    };

    this.entries.push(entry);

    // Limit the number of entries to prevent memory issues
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  /**
   * Get all recorded performance entries
   */
  public getEntries(): PerformanceEntry[] {
    return [...this.entries];
  }

  /**
   * Get performance statistics
   */
  public getStats(): PerformanceStats {
    if (this.entries.length === 0) {
      return {
        avgRenderTime: 0,
        minRenderTime: 0,
        maxRenderTime: 0,
        avgFps: 0,
        minFps: 0,
        maxFps: 0,
        sampleCount: 0
      };
    }

    let totalRenderTime = 0;
    let minRenderTime = Infinity;
    let maxRenderTime = 0;
    
    let totalFps = 0;
    let minFps = Infinity;
    let maxFps = 0;
    let fpsCount = 0;

    for (const entry of this.entries) {
      // Render time stats
      totalRenderTime += entry.renderTime;
      minRenderTime = Math.min(minRenderTime, entry.renderTime);
      maxRenderTime = Math.max(maxRenderTime, entry.renderTime);
      
      // FPS stats (only if available)
      if (entry.fps) {
        totalFps += entry.fps;
        minFps = Math.min(minFps, entry.fps);
        maxFps = Math.max(maxFps, entry.fps);
        fpsCount++;
      }
    }

    return {
      avgRenderTime: totalRenderTime / this.entries.length,
      minRenderTime,
      maxRenderTime,
      avgFps: fpsCount > 0 ? totalFps / fpsCount : 0,
      minFps: fpsCount > 0 ? minFps : 0,
      maxFps,
      sampleCount: this.entries.length
    };
  }

  /**
   * Export performance data as CSV
   */
  public exportAsCSV(): string {
    if (this.entries.length === 0) {
      return 'No performance data available';
    }

    const headers = ['Timestamp', 'Render Time (ms)', 'Object Count', 'FPS', 'Total Heap Size (MB)', 'Used Heap Size (MB)'];
    const rows = this.entries.map(entry => [
      new Date(entry.timestamp).toISOString(),
      entry.renderTime.toFixed(2),
      entry.objectCount,
      entry.fps || 'N/A',
      entry.memoryUsage?.totalJSHeapSize ? (entry.memoryUsage.totalJSHeapSize / (1024 * 1024)).toFixed(2) : 'N/A',
      entry.memoryUsage?.usedJSHeapSize ? (entry.memoryUsage.usedJSHeapSize / (1024 * 1024)).toFixed(2) : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Download performance data as CSV file
   */
  public downloadCSV(): void {
    const csvContent = this.exportAsCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `canvas-performance-${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Log performance statistics to console
   */
  public logStats(): void {
    const stats = this.getStats();
    console.group('Canvas Performance Statistics');
    console.log(`Sample Count: ${stats.sampleCount}`);
    console.log(`Avg Render Time: ${stats.avgRenderTime.toFixed(2)} ms`);
    console.log(`Min Render Time: ${stats.minRenderTime.toFixed(2)} ms`);
    console.log(`Max Render Time: ${stats.maxRenderTime.toFixed(2)} ms`);
    console.log(`Avg FPS: ${stats.avgFps.toFixed(2)}`);
    console.log(`Min FPS: ${stats.minFps.toFixed(2)}`);
    console.log(`Max FPS: ${stats.maxFps.toFixed(2)}`);
    console.groupEnd();
  }
}

export default PerformanceMonitor; 