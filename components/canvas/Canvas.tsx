"use client"

import { useEffect, useRef, useState } from 'react';
import { CanvasData, Shape, drawRectangle, drawCircle, drawDashedSquare, drawTopLSelectionHandle, drawTopRSelectionHandle, drawBottomLSelectionHandle, drawBottomRSelectionHandle, drawImage } from './drawHandler';
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
    const [rescalingObject, setRescalingObject] = useState<Array<Shape> | null>(null);
    const [redrawCount, setRedrawCount] = useState<number>(0);
    const [redrawTime, setRedrawTime] = useState<number>(0);
    const [movingObject, setMovingObject] = useState<Array<Shape> | null>(null);
    const lastMousePosition = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        draw();
        handleCursorChange()
    }, [canvasData, scrollOffset, selectedObjects, clickTimestamp, currentHoveringSelectHandle, hoveringObject, rescalingObject]);

    const draw = () => {
        setRedrawCount(redrawCount + 1);
        const t0 = Date.now();
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
                    else if (object.type === "Image")
                        drawImage(context, object);
                });
                if (hoveringObject && !selectedObjects?.includes(hoveringObject)){
                    drawDashedSquare(context, [hoveringObject], false, "blue");
                }
                if (selectedObjects){
                    drawDashedSquare(context, selectedObjects, true, "black");
                }
                context.restore();
                
                const endTime = performance.now();
                const currentRenderTime = endTime - startTime;
                setRenderTime(currentRenderTime);

                if (showPerformanceMetrics) {
                    performanceMonitor.current.recordMetrics(
                        currentRenderTime, 
                        canvasData.objects.length
                    );
                }
            }
        }
        setRedrawTime(redrawTime + Date.now() - t0);
    }

    const exportPerformanceData = () => {
        performanceMonitor.current.downloadCSV();
    };

    const logPerformanceStats = () => {
        performanceMonitor.current.logStats();
    };

    const handleCursorChange = () => {
        if (currentHoveringSelectHandle != null)
            if (currentHoveringSelectHandle == "TL" || currentHoveringSelectHandle == "BR")
                return setCursorStyle('nwse-resize');
            else
                return setCursorStyle("nesw-resize");

        if (hoveringObject && !movingObject)
            setCursorStyle("pointer")
    }

    const detectObjectHit = (context: CanvasRenderingContext2D, x: number, y: number) => {
        const hitObjects: Array<Shape> = [];
    
        for (let i = 0; i < canvasData.objects.length; i++) {
            const object = canvasData.objects[i];
    
            if (object.type === "Rectangle") {
                context.beginPath();
                drawRectangle(context, object);
                if (context.isPointInPath(x, y)) {
                    hitObjects.push(object);
                }
            } else if (object.type === "Circle") {
                context.beginPath();
                drawCircle(context, object);
                if (context.isPointInPath(x, y)) {
                    hitObjects.push(object);
                }
            } else if (object.type === "Image") {
                if (
                    x >= object.x &&
                    x <= object.x + object.width &&
                    y >= object.y &&
                    y <= object.y + object.height
                ) {
                    hitObjects.push(object);
                }
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

    const scaleObjects = (dx: number, dy: number) => {
        if (!rescalingObject || !currentHoveringSelectHandle) return;
    
        rescalingObject.forEach((obj: Shape) => {
            let newWidth = obj.width;
            let newHeight = obj.height;
            let newX = obj.x;
            let newY = obj.y;
            let newHandle = currentHoveringSelectHandle;
    
            switch (currentHoveringSelectHandle) {
                case "TL":
                    newWidth -= dx;
                    newHeight -= dy;
                    newX += dx;
                    newY += dy;
                    if (newWidth < 0) {
                        newX += newWidth;
                        newWidth = Math.abs(newWidth);
                        newHandle = "TR";
                    }
                    if (newHeight < 0) {
                        newY += newHeight;
                        newHeight = Math.abs(newHeight);
                        newHandle = newHandle === "TR" ? "BR" : "BL";
                    }
                    break;
    
                case "TR":
                    newWidth += dx;
                    newHeight -= dy;
                    newY += dy;
                    if (newWidth < 0) {
                        newX += newWidth;
                        newWidth = Math.abs(newWidth);
                        newHandle = "TL";
                    }
                    if (newHeight < 0) {
                        newY += newHeight;
                        newHeight = Math.abs(newHeight);
                        newHandle = newHandle === "TL" ? "BL" : "BR";
                    }
                    break;
    
                case "BL":
                    newWidth -= dx;
                    newHeight += dy;
                    newX += dx;
                    if (newWidth < 0) {
                        newX += newWidth;
                        newWidth = Math.abs(newWidth);
                        newHandle = "BR";
                    }
                    if (newHeight < 0) {
                        newY += newHeight;
                        newHeight = Math.abs(newHeight);
                        newHandle = newHandle === "BR" ? "TR" : "TL";
                    }
                    break;
    
                case "BR":
                    newWidth += dx;
                    newHeight += dy;
                    if (newWidth < 0) {
                        newX += newWidth;
                        newWidth = Math.abs(newWidth);
                        newHandle = "BL";
                    }
                    if (newHeight < 0) {
                        newY += newHeight;
                        newHeight = Math.abs(newHeight);
                        newHandle = newHandle === "BL" ? "TL" : "TR";
                    }
                    break;
            }
    
            obj.width = newWidth;
            obj.height = newHeight;
            obj.x = newX;
            obj.y = newY;
    
            setCurrentHoveringSelectHandle(newHandle);
    
            callbacks.onShapeChange(obj);
        });
    };

    const moveObjects = (dx: number, dy: number) => {
        if (movingObject) {
            setCursorStyle("grab")
            movingObject.forEach((obj: Shape) => {
                obj.x += dx;
                obj.y += dy;

                callbacks.onShapeChange(obj);
            })
        }
    }


    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
    
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left + scrollOffset.x;
        const y = event.clientY - rect.top + scrollOffset.y;
    
        const context = canvas.getContext('2d');
        if (!context) return;
    
        let foundObject: Shape | null = null;
    
        for (let i = canvasData.objects.length - 1; i >= 0; i--) {
            const object = canvasData.objects[i];
            if (
                x >= object.x &&
                x <= object.x + object.width &&
                y >= object.y &&
                y <= object.y + object.height
            ) {
                foundObject = object;
                break;
            }
        }

        if (!lastMousePosition.current) {
            lastMousePosition.current = { x, y };
            return;
        }

        const dx = x - lastMousePosition.current.x;
        const dy = y - lastMousePosition.current.y;
        
        lastMousePosition.current = { x, y };
    
        if (!rescalingObject) {
            detectSelectionHandleHover(context, x, y);
        }
    
        if (rescalingObject) {
            scaleObjects(dx, dy);
        } else if (movingObject) {
            moveObjects(dx, dy);
        } else if(hoveringObject && event.buttons === 1) {
            setMovingObject([hoveringObject]);
            moveObjects(dx, dy);
        }
    
        if (foundObject !== hoveringObject) {
            setHoveringObject(foundObject);
        }
    };
    

    const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        if (currentHoveringSelectHandle && selectedObjects) {
            setRescalingObject(selectedObjects);
        } else if (hoveringObject && selectedObjects && selectedObjects.includes(hoveringObject)) {
            setMovingObject(selectedObjects);
            setCursorStyle("grab")
        }
    };

    const handleMouseUp = () => {
        if (rescalingObject) {
            setSelectedObjects(rescalingObject)
            setRescalingObject(null);
            setCursorStyle("default");
        }
        if (hoveringObject) {
            setSelectedObjects(movingObject);
            setMovingObject(null);
            setCursorStyle("default");
        }
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
            <div>
                Redraw Count: {redrawCount}
            </div>
            <div>
                Redraw Time: {Math.round(((redrawTime / redrawCount) + Number.EPSILON) * 10000) / 10000}ms
            </div>
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
