'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { DrawTool, Point, DrawPath, DrawShape, DrawText, CursorPosition } from '@/types/whiteboard';
import { v4 as uuidv4 } from 'uuid';

interface DrawingCanvasProps {
  roomId: string;
  tool: DrawTool;
  color: string;
  brushSize: number;
  onUndo: () => void;
  onRedo: () => void;
}

export default function DrawingCanvas({
  roomId,
  tool,
  color,
  brushSize,
  onUndo,
  onRedo
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [shapes, setShapes] = useState<DrawShape[]>([]);
  const [texts, setTexts] = useState<DrawText[]>([]);
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const { socket } = useSocket();

  // Initialize canvas and socket listeners
  useEffect(() => {
    if (!socket) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      ctx.scale(dpr, dpr);
      
      setCanvasSize({ width: rect.width, height: rect.height });
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Socket event listeners
    socket.on('draw-start', handleRemoteDrawStart);
    socket.on('draw-move', handleRemoteDrawMove);
    socket.on('draw-end', handleRemoteDrawEnd);
    socket.on('draw-shape', handleRemoteDrawShape);
    socket.on('add-text', handleRemoteAddText);
    socket.on('board-cleared', handleBoardClear);
    socket.on('board-state', handleBoardState);
    socket.on('cursor-move', handleCursorMove);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      socket.off('draw-start', handleRemoteDrawStart);
      socket.off('draw-move', handleRemoteDrawMove);
      socket.off('draw-end', handleRemoteDrawEnd);
      socket.off('draw-shape', handleRemoteDrawShape);
      socket.off('add-text', handleRemoteAddText);
      socket.off('board-cleared', handleBoardClear);
      socket.off('board-state', handleBoardState);
      socket.off('cursor-move', handleCursorMove);
    };
  }, [socket]);

  // Socket event handlers
  const handleRemoteDrawStart = (data: any) => {
    // Handle remote drawing start if needed
  };

  const handleRemoteDrawMove = (data: any) => {
    // Handle remote drawing move if needed
  };

  const handleRemoteDrawEnd = (data: any) => {
    const newPath: DrawPath = {
      id: data.path.id,
      points: data.path.points,
      color: data.path.color,
      width: data.path.width,
      tool: data.path.tool,
      timestamp: new Date(),
      userId: data.userId
    };
    setPaths(prev => [...prev, newPath]);
  };

  const handleRemoteDrawShape = (data: any) => {
    const newShape: DrawShape = {
      id: data.shape.id,
      type: data.shape.type,
      startPoint: data.shape.startPoint,
      endPoint: data.shape.endPoint,
      color: data.shape.color,
      width: data.shape.width,
      timestamp: new Date(),
      userId: data.userId
    };
    setShapes(prev => [...prev, newShape]);
  };

  const handleRemoteAddText = (data: any) => {
    const newText: DrawText = {
      id: data.text.id,
      text: data.text.text,
      position: data.text.position,
      color: data.text.color,
      fontSize: data.text.fontSize,
      fontFamily: data.text.fontFamily,
      timestamp: new Date(),
      userId: data.userId,
      isEditable: false
    };
    setTexts(prev => [...prev, newText]);
  };

  const handleBoardClear = () => {
    setPaths([]);
    setShapes([]);
    setTexts([]);
  };

  const handleBoardState = (boardData: any) => {
    setPaths(boardData.paths || []);
    setShapes(boardData.shapes || []);
    setTexts(boardData.texts || []);
  };

  const handleCursorMove = (data: CursorPosition) => {
    setCursors(prev => {
      const newCursors = new Map(prev);
      newCursors.set(data.userId, data);
      return newCursors;
    });

    // Remove cursor after timeout
    setTimeout(() => {
      setCursors(prev => {
        const newCursors = new Map(prev);
        if (newCursors.get(data.userId)?.timestamp === data.timestamp) {
          newCursors.delete(data.userId);
        }
        return newCursors;
      });
    }, 3000);
  };

  // Drawing functions
  const getPointFromEvent = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getPointFromEvent(e);
    setIsDrawing(true);
    setStartPoint(point);
    setCurrentPath([point]);

    if (socket) {
      socket.emit('draw-start', {
        roomId,
        point,
        tool,
        color,
        width: brushSize
      });
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const point = getPointFromEvent(e);
    setCurrentPath(prev => [...prev, point]);

    if (socket) {
      socket.emit('draw-move', {
        roomId,
        point,
        tool,
        color,
        width: brushSize
      });
    }

    drawLine(point);
  };

  const stopDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);

    if (tool === 'pen' || tool === 'eraser' || tool === 'highlighter') {
      const newPath: DrawPath = {
        id: uuidv4(),
        points: currentPath,
        color: tool === 'eraser' ? '#FFFFFF' : color,
        width: brushSize,
        tool,
        timestamp: new Date(),
        userId: 'local'
      };

      setPaths(prev => [...prev, newPath]);

      if (socket) {
        socket.emit('draw-end', {
          roomId,
          path: newPath
        });
      }
    } else if ((tool === 'rectangle' || tool === 'circle' || tool === 'line' || tool === 'arrow' || tool === 'triangle' || tool === 'diamond') && startPoint && currentPath.length > 0) {
      const endPoint = currentPath[currentPath.length - 1];
      const newShape: DrawShape = {
        id: uuidv4(),
        type: tool as any,
        startPoint,
        endPoint,
        color,
        width: brushSize,
        timestamp: new Date(),
        userId: 'local'
      };

      setShapes(prev => [...prev, newShape]);

      if (socket) {
        socket.emit('draw-shape', {
          roomId,
          shape: newShape
        });
      }
    }

    setCurrentPath([]);
    setStartPoint(null);
  };

  const drawLine = (point: Point) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.3;
    } else {
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.globalAlpha = 1;
    }

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;

    if (currentPath.length > 1) {
      const prevPoint = currentPath[currentPath.length - 2];
      ctx.beginPath();
      ctx.moveTo(prevPoint.x, prevPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw paths
    paths.forEach(path => {
      if (path.points.length < 2) return;

      if (path.tool === 'highlighter') {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.3;
      } else {
        ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
        ctx.globalAlpha = 1;
      }

      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = path.color;

      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });

    // Draw shapes
    shapes.forEach(shape => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.lineWidth = shape.width;
      ctx.strokeStyle = shape.color;

      ctx.beginPath();
      switch (shape.type) {
        case 'rectangle':
          ctx.rect(
            shape.startPoint.x,
            shape.startPoint.y,
            shape.endPoint.x - shape.startPoint.x,
            shape.endPoint.y - shape.startPoint.y
          );
          break;
        case 'circle':
          const radius = Math.sqrt(
            Math.pow(shape.endPoint.x - shape.startPoint.x, 2) +
            Math.pow(shape.endPoint.y - shape.startPoint.y, 2)
          );
          ctx.arc(shape.startPoint.x, shape.startPoint.y, radius, 0, 2 * Math.PI);
          break;
        case 'line':
          ctx.moveTo(shape.startPoint.x, shape.startPoint.y);
          ctx.lineTo(shape.endPoint.x, shape.endPoint.y);
          break;
        case 'arrow':
          drawArrow(ctx, shape.startPoint, shape.endPoint);
          break;
        case 'triangle':
          drawTriangle(ctx, shape.startPoint, shape.endPoint);
          break;
        case 'diamond':
          drawDiamond(ctx, shape.startPoint, shape.endPoint);
          break;
      }
      ctx.stroke();
    });

    // Draw texts
    texts.forEach(text => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = text.color;
      ctx.font = `${text.fontSize}px ${text.fontFamily}`;
      ctx.fillText(text.text, text.position.x, text.position.y);
    });

    // Draw current path
    if (isDrawing && currentPath.length > 1) {
      if (tool === 'highlighter') {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.3;
      } else {
        ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
        ctx.globalAlpha = 1;
      }

      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;

      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      currentPath.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }

    // Draw current shape preview
    if (isDrawing && startPoint && currentPath.length > 0 && 
        (tool === 'rectangle' || tool === 'circle' || tool === 'line' || tool === 'arrow' || tool === 'triangle' || tool === 'diamond')) {
      const endPoint = currentPath[currentPath.length - 1];
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = color;

      ctx.beginPath();
      switch (tool) {
        case 'rectangle':
          ctx.rect(
            startPoint.x,
            startPoint.y,
            endPoint.x - startPoint.x,
            endPoint.y - startPoint.y
          );
          break;
        case 'circle':
          const radius = Math.sqrt(
            Math.pow(endPoint.x - startPoint.x, 2) +
            Math.pow(endPoint.y - startPoint.y, 2)
          );
          ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
          break;
        case 'line':
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(endPoint.x, endPoint.y);
          break;
        case 'arrow':
          drawArrow(ctx, startPoint, endPoint);
          break;
        case 'triangle':
          drawTriangle(ctx, startPoint, endPoint);
          break;
        case 'diamond':
          drawDiamond(ctx, startPoint, endPoint);
          break;
      }
      ctx.stroke();
    }
  }, [paths, shapes, texts, currentPath, isDrawing, tool, color, brushSize, startPoint]);

  // Helper functions for drawing shapes
  const drawArrow = (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
    const headLength = 20;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);

    ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6)
    );
  };

  const drawTriangle = (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
    const width = end.x - start.x;
    const height = end.y - start.y;

    ctx.moveTo(start.x + width / 2, start.y);
    ctx.lineTo(start.x, end.y);
    ctx.lineTo(end.x, end.y);
    ctx.closePath();
  };

  const drawDiamond = (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const width = Math.abs(end.x - start.x) / 2;
    const height = Math.abs(end.y - start.y) / 2;

    ctx.moveTo(centerX, start.y);
    ctx.lineTo(end.x, centerY);
    ctx.lineTo(centerX, end.y);
    ctx.lineTo(start.x, centerY);
    ctx.closePath();
  };

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (socket) {
      const point = getPointFromEvent(e);
      socket.emit('cursor-move', {
        roomId,
        position: point,
        tool,
        color,
        timestamp: Date.now()
      });
    }

    if (isDrawing) {
      draw(e);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (tool === 'text') {
      const point = getPointFromEvent(e);
      const text = prompt('Enter text:');
      if (text) {
        const newText: DrawText = {
          id: uuidv4(),
          text,
          position: point,
          color,
          fontSize: Math.max(brushSize * 4, 16),
          fontFamily: 'Arial',
          timestamp: new Date(),
          userId: 'local',
          isEditable: false
        };

        setTexts(prev => [...prev, newText]);

        if (socket) {
          socket.emit('add-text', {
            roomId,
            text: newText
          });
        }
      }
    }
  };

  const getCursorStyle = () => {
    switch (tool) {
      case 'pen':
      case 'highlighter':
        return 'crosshair';
      case 'eraser':
        return 'grab';
      case 'text':
        return 'text';
      case 'hand':
        return 'grab';
      case 'select':
        return 'default';
      default:
        return 'crosshair';
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full bg-white"
        style={{ cursor: getCursorStyle() }}
        onMouseDown={startDrawing}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        onDoubleClick={handleDoubleClick}
      />

      {/* Render other users' cursors */}
      {Array.from(cursors.entries()).map(([userId, cursor]) => (
        <div
          key={userId}
          className="absolute pointer-events-none z-10 transition-all duration-100"
          style={{
            left: cursor.position.x,
            top: cursor.position.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs shadow-lg">
            {cursor.username}
          </div>
          <div 
            className="w-3 h-3 rounded-full border-2 border-white shadow-md"
            style={{ backgroundColor: cursor.color || '#3b82f6' }}
          />
        </div>
      ))}
    </div>
  );
}