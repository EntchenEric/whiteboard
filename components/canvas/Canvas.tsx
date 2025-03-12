"use client"

import { useEffect, useRef, useState } from 'react';
import { CanvasData, Objects, drawRectangle, drawCircle } from './drawHandler';

interface CanvasProps {
    canvasData: CanvasData;
}

const Canvas = ({ canvasData }: CanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.save();
                context.translate(-scrollOffset.x, -scrollOffset.y);
                
                canvasData.objects.forEach((object: Objects) => {
                    if (object.type === "Rectangle")
                        drawRectangle(context, object);
                    else if (object.type == "Circle")
                        drawCircle(context, object);
                });
                
                context.restore();
            }
        }
    }, [canvasData, scrollOffset]);

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        if (containerRef.current) {
            setScrollOffset({
                x: containerRef.current.scrollLeft,
                y: containerRef.current.scrollTop,
            });
        }
    };

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            style={{
                width: '100%',
                height: '500px',
                overflow: 'auto',
                border: '1px solid black',
                position: 'relative',
            }}
        >
            <canvas ref={canvasRef} width={1000} height={1000} />
        </div>
    );
}

export { Canvas };
