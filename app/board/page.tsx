"use client"

import { useState, useCallback, useMemo, useEffect } from "react";
import { Canvas } from "@/components/canvas/Canvas";
import { CanvasData, Shape } from '@/components/canvas/drawHandler'

// Utility function for debouncing
const useDebounce = (callback: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    return (...args: any[]) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(() => {
            callback(...args);
            timeoutId = null;
        }, delay);
    };
};

export default function Board() {
    const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(false);
    const [isStressTestRunning, setIsStressTestRunning] = useState(false);
    const [stressTestCount, setStressTestCount] = useState(100);
    
    const generateRandomColor = useCallback((): string => {
        const letters = "0123456789ABCDEF";
        let color = "#";
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }, []);

    const getJitteredPosition = useCallback((base: number, jitterRange: number = 15): number => {
        return base + (Math.random() * jitterRange - jitterRange / 2);
    }, []);
    
    const generateCanvasData = useCallback(({
        numRectangles = 3,
        numCircles = 3,
        widthRange = [20, 100],
        heightRange = [20, 100],
        positionRange = [10, 500],
        borderWidthRange = [1, 5],
        jitter = 15
    } = {}): CanvasData => {
        const objects: Shape[] = [];
    
        for (let i = 0; i < numRectangles; i++) {
            const width = Math.floor(Math.random() * (widthRange[1] - widthRange[0]) + widthRange[0]);
            const height = Math.floor(Math.random() * (heightRange[1] - heightRange[0]) + heightRange[0]);
            objects.push({
                id: crypto.randomUUID(),
                type: "Rectangle",
                width,
                height,
                x: Math.floor(Math.random() * (positionRange[1] - positionRange[0]) + positionRange[0]),
                y: Math.floor(Math.random() * (positionRange[1] - positionRange[0]) + positionRange[0]),
                borderRadius: 1000,
                borderWidth: Math.floor(Math.random() * (borderWidthRange[1] - borderWidthRange[0]) + borderWidthRange[0]),
                color: generateRandomColor(),
                filled: Math.random() > 0.5,
                borderColor: generateRandomColor(),
                layer: i,
                rotation: 0
            });
        }
    
        for (let i = 0; i < numCircles; i++) {
            const size = Math.floor(Math.random() * (widthRange[1] - widthRange[0]) + widthRange[0]);
            const baseX = Math.floor(Math.random() * (positionRange[1] - positionRange[0]) + positionRange[0]);
            const baseY = Math.floor(Math.random() * (positionRange[1] - positionRange[0]) + positionRange[0]);

            objects.push({
                id: crypto.randomUUID(),
                type: "Circle",
                width: size,
                height: size,
                x: getJitteredPosition(baseX, jitter),
                y: getJitteredPosition(baseY, jitter),
                borderWidth: Math.floor(Math.random() * (borderWidthRange[1] - borderWidthRange[0]) + borderWidthRange[0]),
                filled: Math.random() > 0.5,
                borderColor: generateRandomColor(),
                color: generateRandomColor(),
                layer: i,
                rotation: 0
            });
        }
    
        return { objects };
    }, [generateRandomColor, getJitteredPosition]);
    
    const initialCanvasData = useMemo(() => generateCanvasData({
        numRectangles: 10,
        numCircles: 5,
    }), [generateCanvasData]);

    const [canvasData, setCanvasData] = useState<CanvasData>(initialCanvasData);

    const handleActiveShapeChange = (updatedShape: Shape) => {
        setCanvasData((prevCanvasData) => {
            return {
                ...prevCanvasData,
                objects: prevCanvasData.objects.map((shape) =>
                    shape.id === updatedShape.id ? { ...shape, ...updatedShape } : shape
                ),
            };
        });
    };

    const addMoreShapes = (count: number = 20) => {
        const newData = generateCanvasData({
            numRectangles: Math.floor(count / 2),
            numCircles: Math.ceil(count / 2),
        });
        
        setCanvasData(prevData => ({
            objects: [...prevData.objects, ...newData.objects]
        }));
    };

    const clearShapes = () => {
        setCanvasData({ objects: [] });
        setIsStressTestRunning(false);
    };

    const runStressTest = () => {
        if (isStressTestRunning) {
            setIsStressTestRunning(false);
            return;
        }

        if (!showPerformanceMetrics) {
            setShowPerformanceMetrics(true);
        }

        setIsStressTestRunning(true);
        clearShapes();
    };

    useEffect(() => {
        if (!isStressTestRunning) return;

        const interval = setInterval(() => {
            addMoreShapes(10);
            
            setCanvasData(prevData => {
                if (prevData.objects.length >= stressTestCount) {
                    setIsStressTestRunning(false);
                    clearInterval(interval);
                }
                return prevData;
            });
        }, 1);

        return () => clearInterval(interval);
    }, [isStressTestRunning, stressTestCount]);

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Whiteboard Canvas</h1>
            
            <div className="flex flex-wrap gap-4 mb-4">
                <button 
                    onClick={() => addMoreShapes(20)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Add 20 Shapes
                </button>
                
                <button 
                    onClick={clearShapes}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Clear Canvas
                </button>
                
                <button 
                    onClick={() => setShowPerformanceMetrics(!showPerformanceMetrics)}
                    className={`px-4 py-2 ${showPerformanceMetrics ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'} text-white rounded`}
                >
                    {showPerformanceMetrics ? 'Hide Metrics' : 'Show Metrics'}
                </button>
            </div>
            
            
            <div className="border border-gray-300 rounded">
                <Canvas 
                    canvasData={canvasData} 
                    callbacks={{
                        onShapeChange: handleActiveShapeChange
                    }}
                    showPerformanceMetrics={showPerformanceMetrics}
                />
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
                <p>Object Count: {canvasData.objects.length}</p>
                {isStressTestRunning && (
                    <p className="text-purple-600 font-medium">
                        Stress test in progress: {canvasData.objects.length} / {stressTestCount} shapes
                    </p>
                )}
            </div>
        </div>
    );
}
