import Tesseract from 'tesseract.js';

class OCRService {
  async extractTextFromImage(imageData: string): Promise<string | null> {
    try {
      const { data: { text } } = await Tesseract.recognize(imageData, 'eng', {
        logger: m => console.log(m)
      });
      
      return text.trim();
    } catch (error) {
      console.error('OCR error:', error);
      return null;
    }
  }

  async extractTextFromCanvas(canvas: HTMLCanvasElement, region?: { x: number, y: number, width: number, height: number }): Promise<string | null> {
    try {
      let imageData: string;
      
      if (region) {
        // Extract specific region
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = region.width;
        tempCanvas.height = region.height;
        
        tempCtx?.drawImage(
          canvas,
          region.x, region.y, region.width, region.height,
          0, 0, region.width, region.height
        );
        
        imageData = tempCanvas.toDataURL();
      } else {
        imageData = canvas.toDataURL();
      }

      return await this.extractTextFromImage(imageData);
    } catch (error) {
      console.error('Canvas OCR error:', error);
      return null;
    }
  }
}

export const ocrService = new OCRService();