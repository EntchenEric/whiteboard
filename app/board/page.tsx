import { Canvas } from "@/components/canvas/Canvas";
import { CanvasData, Shape } from '@/components/canvas/drawHandler'

export default function Board() {

    const generateRandomColor = (): string => {
        const letters = "0123456789ABCDEF";
        let color = "#";
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    };

    const getJitteredPosition = (base: number, jitterRange: number = 15): number => {
        return base + (Math.random() * jitterRange - jitterRange / 2);
    };
    
    const generateCanvasData = ({
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
            });
        }
    
        for (let i = 0; i < numCircles; i++) {
            const size = Math.floor(Math.random() * (widthRange[1] - widthRange[0]) + widthRange[0]);
            const baseX = Math.floor(Math.random() * (positionRange[1] - positionRange[0]) + positionRange[0]);
            const baseY = Math.floor(Math.random() * (positionRange[1] - positionRange[0]) + positionRange[0]);

            objects.push({
                type: "Circle",
                width: size,
                height: size,
                x: getJitteredPosition(baseX, jitter),
                y: getJitteredPosition(baseY, jitter),
                borderWidth: Math.floor(Math.random() * (borderWidthRange[1] - borderWidthRange[0]) + borderWidthRange[0]),
                filled: Math.random() > 0.5,
                borderColor: generateRandomColor(),
                color: generateRandomColor(),
                layer: i
            });
        }
    
        return { objects };
    };
    

    const canvasData: CanvasData = generateCanvasData({
        numRectangles: 10,
        numCircles: 5,
    });

    return (
        <div>
            <Canvas canvasData={canvasData}/>
        </div>
    );
}
