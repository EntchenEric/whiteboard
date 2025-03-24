import { CSSProperties } from 'react';

interface Rectangle {
    id: string;
    type: "Rectangle";
    width: number;
    height: number;
    x: number;
    y: number;

    borderRadius: number;
    filled: boolean;
    borderWidth: number;
    borderColor: CSSProperties['color']

    color: CSSProperties['color'];

    layer: number;
}

interface Circle {
    id: string;
    type: "Circle"
    height: number;
    width: number;
    x: number;
    y: number;

    filled: boolean;
    borderWidth: number;
    borderColor: CSSProperties['color']

    color: CSSProperties['color'];

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
    
    context.moveTo(topX + BORDER_RADIUS, topY);
    
    context.lineTo(bottomX - BORDER_RADIUS, topY);
    context.arcTo(bottomX, topY, bottomX, topY + BORDER_RADIUS, BORDER_RADIUS);
    
    context.lineTo(bottomX, bottomY - BORDER_RADIUS);
    context.arcTo(bottomX, bottomY, bottomX - BORDER_RADIUS, bottomY, BORDER_RADIUS);
    
    context.lineTo(topX + BORDER_RADIUS, bottomY);
    context.arcTo(topX, bottomY, topX, bottomY - BORDER_RADIUS, BORDER_RADIUS);
    
    context.lineTo(topX, topY + BORDER_RADIUS);
    context.arcTo(topX, topY, topX + BORDER_RADIUS, topY, BORDER_RADIUS);
    
    context.stroke();
    if (withHandles)
        drawSelectionHandles(context, topX, topY, bottomX, bottomY);
    context.restore();
};

const drawSelectionHandles = (context: CanvasRenderingContext2D, topX: number, topY: number, bottomX: number, bottomY: number) => {
    if (!context) return;

    const drawHandle = (x: number, y: number) => {
        context.beginPath();
        context.arc(x, y, HANDLE_RADIUS, 0, Math.PI * 2);
        context.fillStyle = "white";
        context.fill();
        context.strokeStyle = "black";
        context.lineWidth = 1.5;
        context.stroke();
    };

    drawHandle(topX, topY);       // Top-left
    drawHandle(bottomX, topY);    // Top-right
    drawHandle(bottomX, bottomY); // Bottom-right
    drawHandle(topX, bottomY);    // Bottom-left
};

const drawTopLSelectionHandle = (context: CanvasRenderingContext2D, targets: Array<Shape>) => {
    if (!context || targets.length === 0) return;

    const { topX, topY } = calculateBoundingBox(targets);

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

    if (rect.width === rect.height && rect.borderRadius >= Math.min(rect.width, rect.height)) {
        // Draw as circle if it's a square with large border radius
        context.beginPath();
        context.arc(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width / 2, 0, 2 * Math.PI);
        context.closePath();

        if (rect.filled) {
            context.fillStyle = rect.color || 'black';
            context.fill();
        }

        if (rect.borderWidth > 0) {
            context.lineWidth = rect.borderWidth;
            context.strokeStyle = rect.borderColor || 'black';
            context.stroke();
        }
    } else {
        // Draw as rounded rectangle
        context.beginPath();
        context.moveTo(rect.x + radius, rect.y);
        context.lineTo(rect.x + rect.width - radius, rect.y);
        context.arcTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height, radius);
        context.lineTo(rect.x + rect.width, rect.y + rect.height - radius);
        context.arcTo(rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height, radius);
        context.lineTo(rect.x + radius, rect.y + rect.height);
        context.arcTo(rect.x, rect.y + rect.height, rect.x, rect.y, radius);
        context.lineTo(rect.x, rect.y + radius);
        context.arcTo(rect.x, rect.y, rect.x + rect.width, rect.y, radius);
        context.closePath();

        if (rect.filled) {
            context.fillStyle = rect.color || 'black';
            context.fill();
        }

        if (rect.borderWidth > 0) {
            context.lineWidth = rect.borderWidth;
            context.strokeStyle = rect.borderColor || 'black';
            context.stroke();
        }
    }
}

const drawCircle = (context: CanvasRenderingContext2D, circle: Circle) => {
    if (!context) return;

    context.beginPath();
    context.arc(circle.x + circle.width / 2, circle.y + circle.height / 2, circle.width / 2, 0, 2 * Math.PI);
    context.closePath();

    if (circle.filled) {
        context.fillStyle = circle.color || 'black';
        context.fill();
    }

    if (circle.borderWidth > 0) {
        context.lineWidth = circle.borderWidth;
        context.strokeStyle = circle.borderColor || 'black';
        context.stroke();
    }
}

export { drawRectangle, drawCircle, drawDashedSquare, drawTopLSelectionHandle, drawTopRSelectionHandle, drawBottomLSelectionHandle, drawBottomRSelectionHandle }

export type { Rectangle, Circle, Shape, CanvasData }