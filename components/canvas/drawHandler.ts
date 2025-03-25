import { CSSProperties } from 'react';

interface Rectangle {
    id: string;
    type: "Rectangle";
    width: number;
    height: number;
    x: number;
    y: number;
    rotation: number;

    borderRadius: number;
    filled: boolean;
    borderWidth: number;
    borderColor: Exclude<CSSProperties['color'], undefined>;

    color: Exclude<CSSProperties['color'], undefined>;

    layer: number;
}

interface Circle {
    id: string;
    type: "Circle"
    height: number;
    width: number;
    x: number;
    y: number;
    rotation: number;

    filled: boolean;
    borderWidth: number;
    borderColor: Exclude<CSSProperties['color'], undefined>;

    color: Exclude<CSSProperties['color'], undefined>;

    layer: number;
}

type Shape = Rectangle | Circle;

interface CanvasData {
    objects: Array<Shape>
}

const DASH_LENGTH = 3;
const DASH_DISTANCE = 2;
const PADDING = 3;
const LINE_WIDTH = 1.5;
const BORDER_RADIUS = 5;
const HANDLE_RADIUS = 6;

const calculateBoundingBox = (targets: Array<Shape>) => {
    if (!targets.length) return { topX: 0, topY: 0, bottomX: 0, bottomY: 0, width: 0, height: 0 };
    
    let topX = Infinity, topY = Infinity, bottomX = -Infinity, bottomY = -Infinity;

    targets.forEach((target) => {
        const targetTopX = target.x - PADDING;
        const targetTopY = target.y - PADDING;
        const targetBottomX = target.x + target.width + PADDING;
        const targetBottomY = target.y + target.height + PADDING;

        topX = Math.min(topX, targetTopX);
        topY = Math.min(topY, targetTopY);
        bottomX = Math.max(bottomX, targetBottomX);
        bottomY = Math.max(bottomY, targetBottomY);
    });

    return { 
        topX, 
        topY, 
        bottomX, 
        bottomY,
        width: bottomX - topX,
        height: bottomY - topY
    };
};

const drawDashedSquare = (context: CanvasRenderingContext2D, targets: Array<Shape>, withHandles: boolean, borderColor: CSSProperties['color']) => {
    if (!context || targets.length === 0) return;

    const { topX, topY, bottomX, bottomY } = calculateBoundingBox(targets);

    if (topX >= bottomX || topY >= bottomY) return;

    context.save();

    context.setLineDash([DASH_LENGTH, DASH_DISTANCE]);
    context.strokeStyle = borderColor || 'black';
    context.lineWidth = LINE_WIDTH;

    context.beginPath();
    
    context.roundRect(topX, topY, bottomX - topX, bottomY - topY, BORDER_RADIUS);
    
    context.stroke();
    if (withHandles) {
        drawTopLSelectionHandle(context, targets);
        drawTopRSelectionHandle(context, targets);
        drawBottomLSelectionHandle(context, targets);
        drawBottomRSelectionHandle(context, targets);
    }
    context.restore();
};

const drawTopLSelectionHandle = (context: CanvasRenderingContext2D, targets: Array<Shape>) => {
    if (!context || targets.length === 0) return;

    const { topX, topY } = calculateBoundingBox(targets);
    context.restore();
    context.beginPath();
    context.arc(topX, topY, HANDLE_RADIUS, 0, Math.PI * 2);
    context.fillStyle = "white";
    context.fill();
    context.strokeStyle = "black";
    context.lineWidth = 1.5;
    context.stroke();
};

const drawTopRSelectionHandle = (context: CanvasRenderingContext2D, targets: Array<Shape>) => {
    if (!context || targets.length === 0) return;

    const { topY, bottomX } = calculateBoundingBox(targets);

    context.beginPath();
    context.arc(bottomX, topY, HANDLE_RADIUS, 0, Math.PI * 2);
    context.fillStyle = "white";
    context.fill();
    context.strokeStyle = "black";
    context.lineWidth = 1.5;
    context.stroke();
};

const drawBottomRSelectionHandle = (context: CanvasRenderingContext2D, targets: Array<Shape>) => {
    if (!context || targets.length === 0) return;

    const { bottomX, bottomY } = calculateBoundingBox(targets);

    context.beginPath();
    context.arc(bottomX, bottomY, HANDLE_RADIUS, 0, Math.PI * 2);
    context.fillStyle = "white";
    context.fill();
    context.strokeStyle = "black";
    context.lineWidth = 1.5;
    context.stroke();
};

const drawBottomLSelectionHandle = (context: CanvasRenderingContext2D, targets: Array<Shape>) => {
    if (!context || targets.length === 0) return;

    const { topX, bottomY } = calculateBoundingBox(targets);

    context.beginPath();
    context.arc(topX, bottomY, HANDLE_RADIUS, 0, Math.PI * 2);
    context.fillStyle = "white";
    context.fill();
    context.strokeStyle = "black";
    context.lineWidth = 1.5;
    context.stroke();
};

const drawRectangle = (context: CanvasRenderingContext2D, rect: Rectangle) => {
    if (!context) return;

    const radius = Math.min(rect.borderRadius, rect.width / 2, rect.height / 2);
    context.beginPath();
    context.roundRect(rect.x, rect.y, rect.width, rect.height, radius);

    if (rect.filled) {
        context.fillStyle = rect.color;
        context.fill();
    }

    if (rect.borderWidth > 0) {
        context.lineWidth = rect.borderWidth;
        context.strokeStyle = rect.borderColor;
        context.stroke();
    }
};


const drawCircle = (context: CanvasRenderingContext2D, circle: Circle) => {
    if (!context) return;
    context.beginPath();
    context.fillStyle = circle.color;
    context.ellipse(circle.x + circle.width / 2, circle.y + circle.height / 2, circle.width / 2, circle.height / 2, circle.rotation, 0, 2 * Math.PI);
    if (circle.filled) {
        context.fillStyle = circle.color;
        context.fill();
    }
    context.lineWidth = circle.borderWidth;
    context.stroke();
}

export { drawRectangle, drawCircle, drawDashedSquare, drawTopLSelectionHandle, drawTopRSelectionHandle, drawBottomLSelectionHandle, drawBottomRSelectionHandle }

export type { Rectangle, Circle, Shape, CanvasData }