import { useEffect, useState } from 'react';
import { CanvasData } from './drawHandler';

interface PerformanceMetricsProps {
  canvasData: CanvasData;
  renderTime?: number;
  isVisible: boolean;
}

export const PerformanceMetrics = ({ canvasData, renderTime = 0, isVisible }: PerformanceMetricsProps) => {
  const [fps, setFps] = useState<number>(0);
  const [frameCount, setFrameCount] = useState<number>(0);
  const [lastFrameTime, setLastFrameTime] = useState<number>(performance.now());
  const [memoryUsage, setMemoryUsage] = useState<any>(null);

  // Calculate FPS
  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();
    let frames = 0;

    const updateFPS = () => {
      const now = performance.now();
      frames++;
      
      // Update FPS every second
      if (now - lastTime >= 1000) {
        setFps(Math.round((frames * 1000) / (now - lastTime)));
        setFrameCount(prevCount => prevCount + frames);
        frames = 0;
        lastTime = now;
        
        // Try to get memory info if available
        if (performance && 'memory' in performance) {
          setMemoryUsage((performance as any).memory);
        }
      }
      
      frameId = requestAnimationFrame(updateFPS);
    };

    if (isVisible) {
      frameId = requestAnimationFrame(updateFPS);
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="performance-metrics bg-black/80 text-white p-3 rounded-md absolute bottom-4 right-4 text-xs font-mono z-10 pointer-events-none">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div>FPS:</div>
        <div className={`${fps < 30 ? 'text-red-400' : fps < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
          {fps}
        </div>
        
        <div>Render Time:</div>
        <div className={`${renderTime > 16 ? 'text-red-400' : renderTime > 8 ? 'text-yellow-400' : 'text-green-400'}`}>
          {renderTime.toFixed(2)} ms
        </div>
        
        <div>Objects:</div>
        <div>{canvasData.objects.length}</div>
        
        <div>Frames:</div>
        <div>{frameCount}</div>
        
        {memoryUsage && (
          <>
            <div>Heap Size:</div>
            <div>{Math.round(memoryUsage.totalJSHeapSize / (1024 * 1024))} MB</div>
            
            <div>Used Heap:</div>
            <div>{Math.round(memoryUsage.usedJSHeapSize / (1024 * 1024))} MB</div>
          </>
        )}
      </div>
    </div>
  );
}; 