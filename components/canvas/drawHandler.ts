import { CSSProperties } from 'react';

interface Rectangle {
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

type Objects = Rectangle | Circle;

interface CanvasData {
    objects: Array<Objects>
}

const drawRectangle = (context: CanvasRenderingContext2D, rect: Rectangle) => {
    if (context) {
        const radius = Math.min(rect.borderRadius, rect.width / 2, rect.height / 2);

        if (rect.width === rect.height && rect.borderRadius >= Math.min(rect.width, rect.height)) {
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
}

const drawCircle = (context: CanvasRenderingContext2D, circle: Circle) => {
    if (context) {
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
}


export {drawRectangle, drawCircle}

export type {Rectangle, Circle, Objects, CanvasData}