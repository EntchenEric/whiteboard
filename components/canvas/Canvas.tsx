"use client"

import { useEffect, useRef, useState } from 'react';
import { CanvasData, Shape, drawRectangle, drawCircle, drawDashedSquare } from './drawHandler';

interface CanvasProps {
    canvasData: CanvasData;
}

const Canvas = ({ canvasData }: CanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const objectIdMap = useRef(new Map<Shape, string>());

    const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });
    const [selectedObject, setSelectedObject] = useState<Array<Shape> | null>(null);
    const [clickTimestamp, setClickTimestamp] = useState<undefined | number>(undefined);



    useEffect(() => {
        draw();
    }, [canvasData, scrollOffset, selectedObject, clickTimestamp]);

    const draw = () => {
        canvasData.objects.sort((a, b) => a.layer - b.layer);

        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.save();
                context.translate(-scrollOffset.x, -scrollOffset.y);

                canvasData.objects.forEach((object: Shape) => {
                    let id = objectIdMap.current.get(object)
                    if (!objectIdMap.current.has(object)) {
                        id = crypto.randomUUID()
                        objectIdMap.current.set(object, id);
                    }

                    if (object.type === "Rectangle")
                        drawRectangle(context, object);
                    else if (object.type == "Circle")
                        drawCircle(context, object);
                });
                if (selectedObject)
                    drawDashedSquare(context, selectedObject);
                context.restore();
            }
        }
    }

    const detectObjectHit = (context: CanvasRenderingContext2D, x: number, y: number) => {
        canvasData.objects.sort((a, b) => a.layer - b.layer);

        const hitObjects: Array<Shape> = []

        for (let i = canvasData.objects.length - 1; i >= 0; i--) {
            const object = canvasData.objects[i];

            if (object.type === "Rectangle")
                drawRectangle(context, object);
            else if (object.type === "Circle")
                drawCircle(context, object);

            if (context.isPointInPath(x, y))
                hitObjects.push(object);
        }
        return hitObjects;
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
            return setSelectedObject(null);

        const hit = hitObjects[0]

        const isShiftPressed = event.shiftKey;

        if (!isShiftPressed && hitObjects.length >= 1)
            setSelectedObject([hit])
        else
            setSelectedObject((prevSelected) => {
                const newSelection = new Set(prevSelected);

                if (newSelection.has(hit))
                    newSelection.delete(hit);
                else
                    newSelection.add(hit);

                return Array.from(newSelection);
            });
    };


    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            onClick={handleClick}
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
