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
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
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
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
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
    socket.on('undo', handleRemoteUndo);
    socket.on('redo', handleRemoteRedo);

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
      socket.off('undo', handleRemoteUndo);
      socket.off('redo', handleRemoteRedo);
    };
  }, [socket, paths, shapes, texts]);

  // Socket event handlers
  const handleRemoteDrawStart = (data: any) => {
    // Handle remote drawing start
  };

  const handleRemoteDrawMove = (data: any) => {
    // Handle remote drawing move
  };

  const handleRemoteDrawEnd = (data: any) => {
    const newPath: DrawPath = {
      id: data.path.id,
      points: data.path.points,
      color: data.path.color,
      width: data.path.width,
      tool: data.path.tool,
      timestamp: new Date()
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
      timestamp: new Date()
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
      timestamp: new Date()
    };
    setTexts(prev => [...prev, newText]);
  };

  const handleBoardClear = () => {
    setPaths([]);
    setShapes([]);
    setTexts([]);
    setUndoStack([]);
    setRedoStack([]);
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
        newCursors.delete(data.userId);
        return newCursors;
      });
    }, 3000);
  };

  const handleRemoteUndo = () => {
    // Handle remote undo
  };

  const handleRemoteRedo = () => {
    // Handle remote redo
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

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (tool === 'pen' || tool === 'eraser') {
      const newPath: DrawPath = {
        id: uuidv4(),
        points: currentPath,
        color: tool === 'eraser' ? '#FFFFFF' : color,
        width: brushSize,
        tool,
        timestamp: new Date()
      };

      setPaths(prev => [...prev, newPath]);

      if (socket) {
        socket.emit('draw-end', {
          roomId,
          path: newPath
        });
      }
    } else if (startPoint && currentPath.length > 0) {
      const endPoint = currentPath[currentPath.length - 1];
      const newShape: DrawShape = {
        id: uuidv4(),
        type: tool as any,
        startPoint,
        endPoint,
        color,
        width: brushSize,
        timestamp: new Date()
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

    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
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

      ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
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
      }
      ctx.stroke();
    });

    // Draw texts
    texts.forEach(text => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = text.color;
      ctx.font = `${text.fontSize}px ${text.fontFamily}`;
      ctx.fillText(text.text, text.position.x, text.position.y);
    });

    // Draw current path
    if (isDrawing && currentPath.length > 1) {
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.strokeStyle = color;

      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      currentPath.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }
  }, [paths, shapes, texts, currentPath, isDrawing, tool, color, brushSize]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (socket) {
      const point = getPointFromEvent(e);
      socket.emit('cursor-move', {
        roomId,
        position: point
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
          fontSize: brushSize * 4,
          fontFamily: 'Arial',
          timestamp: new Date()
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

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair bg-white"
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
          className="absolute pointer-events-none z-10"
          style={{
            left: cursor.position.x,
            top: cursor.position.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
            {cursor.username}
          </div>
        </div>
      ))}
    </div>
  );
}