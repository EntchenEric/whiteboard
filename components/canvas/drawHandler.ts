import { CSSProperties } from 'react';
import {loadGifFrames} from "@/lib/utils"

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

interface Image {
    id: string;
    type: "Image";
    height: number;
    width: number;
    x: number;
    y: number;
    rotation: number;
    url: string;
    layer: number;
}

type Shape = Rectangle | Circle | Image;

interface CanvasData {
    objects: Array<Shape>
}

const DASH_LENGTH = 3;
const DASH_DISTANCE = 2;
const PADDING = 3;
const LINE_WIDTH = 1.5;
const BORDER_RADIUS = 5;
const HANDLE_RADIUS = 6;

const imageCache = new Map<string, HTMLImageElement>();
const gifFrameNumberCashe = new Map<string, number>();
const gifFrameCashe = new Map<string, {frames: string[], delay: number[]}>();
const timeoutCache = new Map<string, NodeJS.Timeout>();
const gifFrameImgCashe = new Map<string, HTMLImageElement>();

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

const drawImage = async (context: CanvasRenderingContext2D, image: Image) => {
    if (!context) return;

    const isGif = image.url.toLowerCase().endsWith(".gif");

    if (isGif) {
        let gifData = gifFrameCashe.get(image.id);

        if (!gifData) {
            gifData = await loadGifFrames(image.url);
            gifFrameCashe.set(image.id, { ...gifData });
            const img = new Image();
            img.src = image.url;
            img.crossOrigin = "anonymous";
            imageCache.set(image.id, img);
        }

        if (!gifData || gifData.frames.length === 0) return;

        let frameIndex = gifFrameNumberCashe.get(image.id);
        if (frameIndex == undefined) {
            frameIndex = 0;
            gifFrameNumberCashe.set(image.id, 0)
        }
        
        if (timeoutCache.has(image.id)) {
            clearTimeout(timeoutCache.get(image.id)!);
            timeoutCache.delete(image.id);
        }
        
        let isAnimating = true;

        const animateGif = () => {
            if (!isAnimating) return;
            
            if (frameIndex === undefined) frameIndex = 0;
            
            let img = gifFrameImgCashe.get(image.id + frameIndex);
            if (!img) {
                img = new Image();
                img.src = gifData!.frames[frameIndex];
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    gifFrameImgCashe.set(image.id + frameIndex, img!);
                    context.clearRect(image.x, image.y, image.width, image.height);
                    context.drawImage(img!, image.x, image.y, image.width, image.height);
                };
            } else {
                context.clearRect(image.x, image.y, image.width, image.height);
                context.drawImage(img, image.x, image.y, image.width, image.height);
            }
            
            frameIndex = (frameIndex + 1) % gifData!.frames.length;
            gifFrameNumberCashe.set(image.id, frameIndex);
            
            const delay = gifData!.delay[frameIndex] || 100;
            const timeoutId = setTimeout(animateGif, delay);
            timeoutCache.set(image.id, timeoutId);
        };

        let currentImg = gifFrameImgCashe.get(image.id + frameIndex);
        if (currentImg) {
            context.drawImage(currentImg, image.x, image.y, image.width, image.height);
        } else {
            const firstImg = new Image();
            firstImg.src = gifData.frames[frameIndex];
            firstImg.crossOrigin = "anonymous";
            firstImg.onload = () => {
                gifFrameImgCashe.set(image.id + frameIndex, firstImg);
                context.drawImage(firstImg, image.x, image.y, image.width, image.height);
            };
        }
        
        const timeoutId = setTimeout(animateGif, gifData.delay[frameIndex] || 100);
        timeoutCache.set(image.id, timeoutId);
        
        return () => {
            isAnimating = false;
            if (timeoutCache.has(image.id)) {
                clearTimeout(timeoutCache.get(image.id)!);
                timeoutCache.delete(image.id);
            }
        };
    } else {
        let img = imageCache.get(image.id);

        if (!img) {
            img = new Image();
            img.src = image.url;
            img.crossOrigin = "anonymous";
            img.onload = () => {
                imageCache.set(image.id, img!);
                context.drawImage(img!, image.x, image.y, image.width, image.height);
            };
        } else {
            context.drawImage(img, image.x, image.y, image.width, image.height);
        }
    }
};


export { drawRectangle, drawCircle, drawDashedSquare, drawTopLSelectionHandle, drawTopRSelectionHandle, drawBottomLSelectionHandle, drawBottomRSelectionHandle, drawImage }

export type { Rectangle, Circle, Shape, CanvasData }