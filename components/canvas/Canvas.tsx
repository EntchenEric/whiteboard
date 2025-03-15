"use client"

import { useEffect, useRef, useState } from 'react';
import { CanvasData, Shape, drawRectangle, drawCircle, drawDashedSquare, drawTopLSelectionHandle, drawTopRSelectionHandle, drawBottomLSelectionHandle, drawBottomRSelectionHandle } from './drawHandler';
import { PerformanceMetrics } from './PerformanceMetrics';
import PerformanceMonitor from './PerformanceMonitor';

interface Callbacks {
    onShapeChange: (shape: Shape) => void;
}

interface CanvasProps {
    canvasData: CanvasData;
    callbacks: Callbacks;
    showPerformanceMetrics?: boolean;
}

const Canvas = ({ canvasData, callbacks, showPerformanceMetrics = false }: CanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const callbacksRef = useRef(callbacks);
    const [renderTime, setRenderTime] = useState<number>(0);
    const performanceMonitor = useRef<PerformanceMonitor>(PerformanceMonitor.getInstance());

    useEffect(() => {
        callbacksRef.current = callbacks;
    }, [callbacks]);

    // Initialize performance monitoring
    useEffect(() => {
        const monitor = performanceMonitor.current;
        
        if (showPerformanceMetrics) {
            monitor.startRecording();
        } else {
            monitor.stopRecording();
        }
        
        return () => {
            monitor.stopRecording();
        };
    }, [showPerformanceMetrics]);

    const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });
    const [selectedObjects, setSelectedObjects] = useState<Array<Shape> | null>(null);
    const [hoveringObject, setHoveringObject] = useState<Shape | null>(null);
    const [clickTimestamp, setClickTimestamp] = useState<undefined | number>(undefined);
    const [currentHoveringSelectHandle, setCurrentHoveringSelectHandle] = useState<"TL" | "TR" | "BL" | "BR" | null>(null);
    const [cursorStyle, setCursorStyle] = useState<"grab" | "default" | "pointer" | "text" | "move" | "nesw-resize" | "nwse-resize">("default");
    const [rescalingObject, setRescalingObject] = useState<Shape | null>(null);

    useEffect(() => {
        draw();
        handleCursorChange()
    }, [canvasData, scrollOffset, selectedObjects, clickTimestamp, currentHoveringSelectHandle, hoveringObject, rescalingObject]);

    const draw = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
                const startTime = performance.now();
                
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.save();
                context.translate(-scrollOffset.x, -scrollOffset.y);

                canvasData.objects.forEach((object: Shape) => {
                    if (object.type === "Rectangle")
                        drawRectangle(context, object);
                    else if (object.type == "Circle")
                        drawCircle(context, object);
                });
                if (hoveringObject && !selectedObjects?.includes(hoveringObject))
                    drawDashedSquare(context, [hoveringObject], false, "blue")
                if (selectedObjects)
                    drawDashedSquare(context, selectedObjects, true, "black");
                context.restore();
                
                const endTime = performance.now();
                const currentRenderTime = endTime - startTime;
                setRenderTime(currentRenderTime);
                
                // Record metrics
                if (showPerformanceMetrics) {
                    performanceMonitor.current.recordMetrics(
                        currentRenderTime, 
                        canvasData.objects.length
                    );
                }
            }
        }
    }

    // Export performance data
    const exportPerformanceData = () => {
        performanceMonitor.current.downloadCSV();
    };

    // Log performance stats to console
    const logPerformanceStats = () => {
        performanceMonitor.current.logStats();
    };

    const handleCursorChange = () => {
        if (currentHoveringSelectHandle != null)
            if (currentHoveringSelectHandle == "TL" || currentHoveringSelectHandle == "BR")
                return setCursorStyle('nwse-resize');
            else
                return setCursorStyle("nesw-resize");

        return setCursorStyle("default");
    }

    const detectObjectHit = (context: CanvasRenderingContext2D, x: number, y: number) => {
        const hitObjects: Array<Shape> = [];
    
        for (let i = 0; i < canvasData.objects.length; i++) {
            const object = canvasData.objects[i];
    
            context.beginPath();
    
            if (object.type === "Rectangle") {
                drawRectangle(context, object);
            } else if (object.type === "Circle") {
                drawCircle(context, object);
            }
    
            if (context.isPointInPath(x, y)) {
                hitObjects.push(object);
            }
        }
    
        return hitObjects;
    };

    const detectSelectionHandleHover = (context: CanvasRenderingContext2D, x: number, y: number) => {
        if (!selectedObjects) return;

        drawTopLSelectionHandle(context, selectedObjects);

        if (context.isPointInPath(x, y))
            return setCurrentHoveringSelectHandle("TL")


        drawTopRSelectionHandle(context, selectedObjects);

        if (context.isPointInPath(x, y))
            return setCurrentHoveringSelectHandle("TR")

        drawBottomLSelectionHandle(context, selectedObjects);

        if (context.isPointInPath(x, y))
            return setCurrentHoveringSelectHandle("BL")

        drawBottomRSelectionHandle(context, selectedObjects);

        if (context.isPointInPath(x, y))
            return setCurrentHoveringSelectHandle("BR")

        setCurrentHoveringSelectHandle(null)
    }

    const scaleShape = (shape: Shape, newX: number, newY: number): Shape => {
        let newWidth = newX - shape.x;
        let newHeight = newY - shape.y;
        let newXPos = shape.x;
        let newYPos = shape.y;
    
        if (newWidth < 0) {
            newXPos += newWidth;
            newWidth = Math.abs(newWidth);
        }
        if (newHeight < 0) {
            newYPos += newHeight;
            newHeight = Math.abs(newHeight);
        }
    
        return {
            ...shape,
            x: newXPos,
            y: newYPos,
            width: newWidth,
            height: newHeight,
        };
    };
    
    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        if (containerRef.current) {
            setScrollOffset({
                x: containerRef.current.scrollLeft,
                y: containerRef.current.scrollTop,
            });
        }
    };

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left + scrollOffset.x;
        const y = event.clientY - rect.top + scrollOffset.y;

        const context = canvas.getContext('2d');
        if (!context) return;

        setClickTimestamp(event.timeStamp);

        const hitObjects: Array<Shape> = detectObjectHit(context, x, y)

        if (hitObjects.length == 0)
            return setSelectedObjects(null);

        const hit = hitObjects[0]

        const isShiftPressed = event.shiftKey;

        if (!isShiftPressed && hitObjects.length >= 1)
            setSelectedObjects([hit])
        else
            setSelectedObjects((prevSelected) => {
                const newSelection = new Set(prevSelected);

                if (newSelection.has(hit))
                    newSelection.delete(hit);
                else
                    newSelection.add(hit);

                return Array.from(newSelection);
            });
    };

    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left + scrollOffset.x;
        const y = event.clientY - rect.top + scrollOffset.y;

        const context = canvas.getContext('2d');
        if (!context) return;

        setClickTimestamp(event.timeStamp);

        if (!rescalingObject) 
            detectSelectionHandleHover(context, x, y);
        if (rescalingObject)
            callbacks.onShapeChange(scaleShape(rescalingObject, x, y));

    }

    const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        if (currentHoveringSelectHandle && selectedObjects) {
            setRescalingObject(selectedObjects[0]);
        }
    };

    const handleMouseUp = () => {
        setRescalingObject(null);
    };

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            style={{
                cursor: cursorStyle,
                width: '100%',
                height: '500px',
                overflow: 'auto',
                border: '1px solid black',
                position: 'relative',
            }}
        >
            <canvas ref={canvasRef} width={1000} height={1000} />
            <PerformanceMetrics 
                canvasData={canvasData} 
                renderTime={renderTime} 
                isVisible={showPerformanceMetrics} 
            />
            
            {showPerformanceMetrics && (
                <div className="absolute top-4 right-4 flex gap-2">
                    <button 
                        onClick={exportPerformanceData}
                        className="bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600"
                    >
                        Export CSV
                    </button>
                    <button 
                        onClick={logPerformanceStats}
                        className="bg-green-500 text-white px-2 py-1 text-xs rounded hover:bg-green-600"
                    >
                        Log Stats
                    </button>
                </div>
            )}
        </div>
    );
}

export { Canvas };
