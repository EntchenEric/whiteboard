"use client"

import React, { useEffect, useRef, useState } from 'react';
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

interface ShapeLayer {
    shape: Shape;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    needsRedraw: boolean;
}

const getSelectedObjectsBoundingBox = (targets: Array<Shape>) => {
    if (!targets || targets.length === 0) return null;
    
    const PADDING = 3;
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    targets.forEach((target) => {
        const targetMinX = target.x - PADDING;
        const targetMinY = target.y - PADDING;
        const targetMaxX = target.x + target.width + PADDING;
        const targetMaxY = target.y + target.height + PADDING;

        minX = Math.min(minX, targetMinX);
        minY = Math.min(minY, targetMinY);
        maxX = Math.max(maxX, targetMaxX);
        maxY = Math.max(maxY, targetMaxY);
    });

    return { 
        x: minX, 
        y: minY, 
        width: maxX - minX,
        height: maxY - minY
    };
};

const Canvas = ({ canvasData, callbacks, showPerformanceMetrics = false }: CanvasProps) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const selectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const interactionCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const callbacksRef = useRef(callbacks);
    const [shapeLayers, setShapeLayers] = useState<ShapeLayer[]>([]);
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
    const [lastRedrawTime, setLastRedrawTime] = useState<number>(0);
    const [movingObject, setMovingObject] = useState<Array<Shape> | null>(null);
    const lastMousePosition = useRef<{ x: number; y: number } | null>(null);
    
    const recentRedrawTimes = useRef<number[]>([]);
    const MAX_REDRAW_HISTORY = 200;
    
    const calculateRollingAverage = () => {
        if (recentRedrawTimes.current.length === 0) return 0;
        const sum = recentRedrawTimes.current.reduce((acc, time) => acc + time, 0);
        return sum / recentRedrawTimes.current.length;
    };
    
    useEffect(() => {
        const sortedObjects = [...canvasData.objects].sort((a, b) => a.layer - b.layer);
        
        const newShapeLayers = sortedObjects.map(shape => {
            const existingLayer = shapeLayers.find(layer => layer.shape.id === shape.id);
            
            if (existingLayer) {
                const needsRedraw = JSON.stringify(existingLayer.shape) !== JSON.stringify(shape);
                return {
                    shape,
                    canvasRef: existingLayer.canvasRef,
                    needsRedraw
                };
            } else {
                return {
                    shape,
                    canvasRef: React.createRef<HTMLCanvasElement>(),
                    needsRedraw: true
                };
            }
        });
        
        const currentIds = new Set(sortedObjects.map(shape => shape.id));
        const removedLayers = shapeLayers.filter(layer => !currentIds.has(layer.shape.id));
        
        if (removedLayers.length > 0) {
            if (selectedObjects) {
                const newSelection = selectedObjects.filter(obj => currentIds.has(obj.id));
                if (newSelection.length !== selectedObjects.length) {
                    setSelectedObjects(newSelection.length > 0 ? newSelection : null);
                }
            }
            
            if (hoveringObject && !currentIds.has(hoveringObject.id)) {
                setHoveringObject(null);
            }
        }
        
        setShapeLayers(newShapeLayers);
    }, [canvasData.objects]);

    useEffect(() => {
        drawSelectionOverlay();
    }, [selectedObjects, hoveringObject, currentHoveringSelectHandle, scrollOffset]);
    
    useEffect(() => {
        if (shapeLayers.length === 0) return;
        
        const startTime = performance.now();
        let totalDrawTime = 0;
        
        if (movingObject || rescalingObject) {
            const affectedShapeIds = new Set(
                (movingObject || rescalingObject || []).map(shape => shape.id)
            );
            
            shapeLayers.forEach(layer => {
                if (affectedShapeIds.has(layer.shape.id)) {
                    layer.needsRedraw = true;
                }
            });
        }
        
        shapeLayers.forEach(layer => {
            if (layer.needsRedraw) {
                const drawStartTime = performance.now();
                drawShape(layer);
                totalDrawTime += (performance.now() - drawStartTime);
            }
        });
        
        drawSelectionOverlay();
        
        const endTime = performance.now();
        const currentRenderTime = endTime - startTime;
        
        recentRedrawTimes.current.push(currentRenderTime);
        if (recentRedrawTimes.current.length > MAX_REDRAW_HISTORY) {
            recentRedrawTimes.current.shift();
        }
        
        const rollingAverage = calculateRollingAverage();
        
        setRenderTime(currentRenderTime);
        setLastRedrawTime(currentRenderTime);
        setRedrawCount(prev => prev + 1);
        setRedrawTime(rollingAverage);
        
        if (showPerformanceMetrics) {
            performanceMonitor.current.recordMetrics(
                currentRenderTime, 
                canvasData.objects.length
            );
        }
    }, [shapeLayers, scrollOffset, movingObject, rescalingObject, selectedObjects, hoveringObject]);
    
    const drawShape = (layer: ShapeLayer) => {
        const canvas = layer.canvasRef.current;
        if (!canvas) return;
        
        const shape = layer.shape;
        const context = canvas.getContext('2d');
        if (!context) return;
        
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        context.save();
        context.translate(-scrollOffset.x, -scrollOffset.y);
        
        if (shape.type === "Rectangle") {
            drawRectangle(context, shape);
        } else if (shape.type === "Circle") {
            drawCircle(context, shape);
        } else if (shape.type === "Image") {
            drawImage(context, shape);
        }
        
        context.restore();
        
        layer.needsRedraw = false;
    };
    
    const drawSelectionOverlay = () => {
        const canvas = selectionCanvasRef.current;
        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        if (!context) return;
        
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        context.save();
        context.translate(-scrollOffset.x, -scrollOffset.y);
        
        if (hoveringObject && !selectedObjects?.includes(hoveringObject)) {
            drawDashedSquare(context, [hoveringObject], false, "blue");
        }
        
        if (selectedObjects) {
            drawDashedSquare(context, selectedObjects, true, "black");
        }
        
        context.restore();
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

    const detectObjectHit = (x: number, y: number): Array<Shape> => {
        const hit: Shape[] = [];
        
        if (canvasData && canvasData.objects) {
            canvasData.objects.forEach((shape) => {
                if (shape.type === "Rectangle") {
                    if (
                        x >= shape.x &&
                        x <= shape.x + shape.width &&
                        y >= shape.y &&
                        y <= shape.y + shape.height
                    ) {
                        hit.push(shape);
                    }
                }
                else if (shape.type === "Circle") {
                    const centerX = shape.x + shape.width / 2;
                    const centerY = shape.y + shape.height / 2;
                    const radius = Math.min(shape.width, shape.height) / 2;
                    
                    const distanceFromCenter = Math.sqrt(
                        Math.pow(x - centerX, 2) +
                        Math.pow(y - centerY, 2)
                    );
                    
                    if (distanceFromCenter <= radius) {
                        hit.push(shape);
                    }
                }
                else if (shape.type === "Image") {
                    if (
                        x >= shape.x &&
                        x <= shape.x + shape.width &&
                        y >= shape.y &&
                        y <= shape.y + shape.height
                    ) {
                        hit.push(shape);
                    }
                }
            });
        }
        
        return hit;
    };
    
    const detectSelectionHandleHover = (context: CanvasRenderingContext2D, x: number, y: number) => {
        if (!selectedObjects || selectedObjects.length === 0) {
            setCurrentHoveringSelectHandle(null);
            return;
        }
        
        const boundingBox = getSelectedObjectsBoundingBox(selectedObjects);
        if (!boundingBox) return;
        
        const { x: boxX, y: boxY, width: boxWidth, height: boxHeight } = boundingBox;
        
        const handleSize = 10;
        
        const handles = {
            TL: { x: boxX, y: boxY },
            TR: { x: boxX + boxWidth, y: boxY },
            BL: { x: boxX, y: boxY + boxHeight },
            BR: { x: boxX + boxWidth, y: boxY + boxHeight }
        };
        
        for (const [position, coords] of Object.entries(handles)) {
            if (
                x >= coords.x - handleSize / 2 &&
                x <= coords.x + handleSize / 2 &&
                y >= coords.y - handleSize / 2 &&
                y <= coords.y + handleSize / 2
            ) {
                const handlePosition = position as "TL" | "TR" | "BL" | "BR";
                setCurrentHoveringSelectHandle(handlePosition);
                
                if (handlePosition === "TL" || handlePosition === "BR") {
                    setCursorStyle("nwse-resize");
                } else {
                    setCursorStyle("nesw-resize");
                }
                
                return;
            }
        }
        
        setCurrentHoveringSelectHandle(null);
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
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = event.clientX - rect.left + scrollOffset.x;
        const y = event.clientY - rect.top + scrollOffset.y;

        setClickTimestamp(event.timeStamp);

        const hitObjects = detectObjectHit(x, y);

        if (hitObjects.length === 0) {
            return setSelectedObjects(null);
        }

        const hit = hitObjects[0];
        const isShiftPressed = event.shiftKey;

        if (!isShiftPressed && hitObjects.length >= 1) {
            setSelectedObjects([hit]);
        } else {
            setSelectedObjects((prevSelected) => {
                const newSelection = new Set(prevSelected);

                if (newSelection.has(hit)) {
                    newSelection.delete(hit);
                } else {
                    newSelection.add(hit);
                }

                return Array.from(newSelection);
            });
        }
    };

    const scaleObjects = (dx: number, dy: number) => {
        if (!rescalingObject || !currentHoveringSelectHandle) return;
    
        rescalingObject.forEach((obj: Shape) => {
            let newWidth = obj.width;
            let newHeight = obj.height;
            let newX = obj.x;
            let newY = obj.y;
            
            switch (currentHoveringSelectHandle) {
                case "TL":
                    newWidth -= dx;
                    newHeight -= dy;
                    newX += dx;
                    newY += dy;
                    
                    if (newWidth <= 0) {
                        newWidth = Math.abs(newWidth);
                        newX = newX - newWidth;
                        setCurrentHoveringSelectHandle("TR");
                    }
                    
                    if (newHeight <= 0) {
                        newHeight = Math.abs(newHeight);
                        newY = newY - newHeight;
                        setCurrentHoveringSelectHandle("BL");
                    }
                    
                    if (newWidth <= 0 && newHeight <= 0) {
                        setCurrentHoveringSelectHandle("BR");
                    }
                    break;
    
                case "TR":
                    newWidth += dx;
                    newHeight -= dy;
                    newY += dy;
                    
                    if (newWidth <= 0) {
                        newWidth = Math.abs(newWidth);
                        newX = obj.x - newWidth;
                        setCurrentHoveringSelectHandle("TL");
                    }
                    
                    if (newHeight <= 0) {
                        newHeight = Math.abs(newHeight);
                        newY = newY - newHeight;
                        setCurrentHoveringSelectHandle("BR");
                    }
                    
                    if (newWidth <= 0 && newHeight <= 0) {
                        setCurrentHoveringSelectHandle("BL");
                    }
                    break;
    
                case "BL":
                    newWidth -= dx;
                    newHeight += dy;
                    newX += dx;
                    
                    if (newWidth <= 0) {
                        newWidth = Math.abs(newWidth);
                        newX = newX - newWidth;
                        setCurrentHoveringSelectHandle("BR");
                    }
                    
                    if (newHeight <= 0) {
                        newHeight = Math.abs(newHeight);
                        newY = obj.y - newHeight;
                        setCurrentHoveringSelectHandle("TL");
                    }
                    
                    if (newWidth <= 0 && newHeight <= 0) {
                        setCurrentHoveringSelectHandle("TR");
                    }
                    break;
    
                case "BR":
                    newWidth += dx;
                    newHeight += dy;
                    
                    if (newWidth <= 0) {
                        newWidth = Math.abs(newWidth);
                        newX = obj.x - newWidth;
                        setCurrentHoveringSelectHandle("BL");
                    }
                    
                    if (newHeight <= 0) {
                        newHeight = Math.abs(newHeight);
                        newY = obj.y - newHeight;
                        setCurrentHoveringSelectHandle("TR");
                    }
                    
                    if (newWidth <= 0 && newHeight <= 0) {
                        setCurrentHoveringSelectHandle("TL");
                    }
                    break;
            }
            
            const MIN_SIZE = 5;
            if (newWidth < MIN_SIZE) newWidth = MIN_SIZE;
            if (newHeight < MIN_SIZE) newHeight = MIN_SIZE;
    
            obj.width = newWidth;
            obj.height = newHeight;
            obj.x = newX;
            obj.y = newY;
    
            const layerIndex = shapeLayers.findIndex(layer => layer.shape.id === obj.id);
            if (layerIndex >= 0) {
                shapeLayers[layerIndex].needsRedraw = true;
            }
    
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
    
    const exportPerformanceData = () => {
        performanceMonitor.current.downloadCSV();
    };

    const logPerformanceStats = () => {
        performanceMonitor.current.logStats();
    };

    const handleCanvasClick = (event: MouseEvent) => {
        const x = event.offsetX;
        const y = event.offsetY;
        
        setClickTimestamp(event.timeStamp);
        
        const hitObjects = detectObjectHit(x, y);
        
        if (hitObjects.length === 0) {
            return setSelectedObjects(null);
        }
        
        const hit = hitObjects[0];
        const isShiftPressed = event.shiftKey;
        
        if (!isShiftPressed && hitObjects.length >= 1) {
            setSelectedObjects([hit]);
        } else {
            setSelectedObjects((prevSelected) => {
                if (!prevSelected) return [hit];
                
                const prevSelectedSet = new Set(prevSelected);
                
                if (prevSelected.some(obj => obj.id === hit.id)) {
                    prevSelectedSet.delete(hit);
                } else {
                    prevSelectedSet.add(hit);
                }
                
                return Array.from(prevSelectedSet);
            });
        }
    };
    
    const handleCanvasMouseMove = (event: MouseEvent) => {
        const x = event.offsetX;
        const y = event.offsetY;
        
        
        const canvas = selectionCanvasRef.current;
        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        if (!context) return;
        
        const hitObjects = detectObjectHit(x, y);
        const foundObject = hitObjects.length > 0 ? hitObjects[0] : null;
        
        if (foundObject !== hoveringObject) {
            setHoveringObject(foundObject);
        }
        
        if (foundObject && !rescalingObject && !movingObject) {
            setCursorStyle("pointer");
        } else if (!rescalingObject && !movingObject && !currentHoveringSelectHandle) {
            setCursorStyle("default");
        }
        
        if (!lastMousePosition.current) {
            lastMousePosition.current = { x, y };
            return;
        }
        
        const dx = x - lastMousePosition.current.x;
        const dy = y - lastMousePosition.current.y;
        
        lastMousePosition.current = { x, y };
        
        if (rescalingObject) {
            scaleObjects(dx, dy);
        } else if (movingObject) {
            moveObjects(dx, dy);
        } else if (event.buttons === 1 && foundObject) {
            setSelectedObjects([foundObject]);
            setMovingObject([foundObject]);
            setCursorStyle("grab");
            moveObjects(dx, dy);
        } else if (!rescalingObject) {
            detectSelectionHandleHover(context, x, y);
        }
    };
    
    const handleCanvasMouseDown = (event: MouseEvent) => {
        const x = event.offsetX;
        const y = event.offsetY;
        
        if (currentHoveringSelectHandle && selectedObjects) {
            setRescalingObject(selectedObjects);
            return;
        }
        
        const hitObjects = detectObjectHit(x, y);
        
        if (hitObjects.length > 0) {
            const hitObject = hitObjects[0];
            
            if (selectedObjects && selectedObjects.some(obj => obj.id === hitObject.id)) {
                setMovingObject(selectedObjects);
                setCursorStyle("grab");
            } else if (hitObject) {
                setSelectedObjects([hitObject]);
                setMovingObject([hitObject]);
                setCursorStyle("grab");
            }
        }
    };
    
    const handleCanvasMouseUp = (event: MouseEvent) => {
        if (rescalingObject) {
            setSelectedObjects(rescalingObject);
            setRescalingObject(null);
        }
        
        if (movingObject) {
            setSelectedObjects(movingObject);
            setMovingObject(null);
        }
        
        if (!hoveringObject && !currentHoveringSelectHandle) {
            setCursorStyle("default");
        } else if (hoveringObject && !currentHoveringSelectHandle) {
            setCursorStyle("pointer");
        }
    };

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
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
                Redraw Time (Avg of last {Math.min(redrawCount, MAX_REDRAW_HISTORY)} redraws): {Math.round((redrawTime + Number.EPSILON) * 10000) / 10000}ms
            </div>
            <div>
                Last Redraw Time: {Math.round(((lastRedrawTime) + Number.EPSILON) * 10000) / 10000}ms
            </div>
            
            <div 
                style={{ 
                    position: 'relative', 
                    width: '1000px', 
                    height: '1000px',
                    transformOrigin: '0 0'
                }}
            >
                <canvas
                    ref={interactionCanvasRef}
                    width={1000}
                    height={1000}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: 10000,
                        pointerEvents: 'auto', 
                        width: '1000px',
                        height: '1000px',
                        opacity: 0.01,
                    }}
                    onClick={(e) => handleCanvasClick(e.nativeEvent)}
                    onMouseMove={(e) => handleCanvasMouseMove(e.nativeEvent)}
                    onMouseDown={(e) => handleCanvasMouseDown(e.nativeEvent)}
                    onMouseUp={(e) => handleCanvasMouseUp(e.nativeEvent)}
                />
                
                {shapeLayers.map((layer) => (
                    <canvas
                        key={layer.shape.id}
                        ref={layer.canvasRef}
                        width={1000}
                        height={1000}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            zIndex: layer.shape.layer,
                            pointerEvents: 'none',
                            width: '1000px',
                            height: '1000px'
                        }}
                    />
                ))}
                
                <canvas
                    ref={selectionCanvasRef}
                    width={1000}
                    height={1000}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: 9999,
                        pointerEvents: 'none',
                        width: '1000px',
                        height: '1000px'
                    }}
                />
            </div>
            
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
