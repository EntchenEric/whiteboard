import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseGIF, decompressFrames } from "gifuct-js";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const loadGifFrames = async (url: string) => {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const gif = parseGIF(buffer);
  const frames = decompressFrames(gif, true);

  const frameDataURLs: string[] = [];
  const delays: number[] = [];

  let previousImageData: ImageData | null = null;
  let normalizedWidth = frames[0].dims.width;
  let normalizedHeight = frames[0].dims.height;

  frames.forEach((frame, index) => {
    const imageData = new Uint8ClampedArray(normalizedWidth * normalizedHeight * 4);

    if (previousImageData == null || index === 0) {
      // First frame or no previous frame to compare
      for (let i = 0; i < frame.patch.length; i += 4) {
        const r = frame.patch[i];
        const g = frame.patch[i + 1];
        const b = frame.patch[i + 2];
        const a = frame.patch[i + 3];
        const pixelIndex = (i / 4);

        imageData[pixelIndex * 4] = r;
        imageData[pixelIndex * 4 + 1] = g;
        imageData[pixelIndex * 4 + 2] = b;
        imageData[pixelIndex * 4 + 3] = a;
      }
    } else {
      // Copy the previous frame's full data
      imageData.set(previousImageData.data);

      // Apply the current frame's patches
      for (let i = 0; i < frame.patch.length; i += 4) {
        const r = frame.patch[i];
        const g = frame.patch[i + 1];
        const b = frame.patch[i + 2];
        const a = frame.patch[i + 3];
        const pixelIndex = (i / 4);

        // Calculate pixel position based on left/top offsets
        const x = (pixelIndex % frame.dims.width) + frame.dims.left;
        const y = Math.floor(pixelIndex / frame.dims.width) + frame.dims.top;

        if (r !== 0 && g !== 0 && b !== 0 && a !== 0 && x < normalizedWidth && y < normalizedHeight) {
          const offset = (y * normalizedWidth + x) * 4;

          imageData[offset] = r;
          imageData[offset + 1] = g;
          imageData[offset + 2] = b;
          imageData[offset + 3] = a;
        }
      }
    }

    // Update the previous frame for the next iteration
    previousImageData = new ImageData(imageData, normalizedWidth, normalizedHeight, { colorSpace: 'srgb' });

    // Convert imageData to a data URL (base64-encoded PNG)
    const dataURL = createPNGDataURL(imageData, normalizedWidth, normalizedHeight);
    frameDataURLs.push(dataURL);
    delays.push(frame.delay);
  });

  return { frames: frameDataURLs, delay: delays };
};

// Function to create a PNG data URL from image data (RGBA)
const createPNGDataURL = (imageData: Uint8ClampedArray, width: number, height: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const image = new ImageData(imageData, width, height, { colorSpace: 'srgb' });
  ctx.putImageData(image, 0, 0);

  return canvas.toDataURL();
};

export { loadGifFrames };
