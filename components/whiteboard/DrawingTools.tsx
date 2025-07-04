'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DrawTool } from '@/types/whiteboard';
import { 
  Pen, 
  Eraser, 
  Square, 
  Circle, 
  Minus, 
  Type, 
  Hand,
  Undo,
  Redo,
  Trash2
} from 'lucide-react';

interface DrawingToolsProps {
  activeTool: DrawTool;
  onToolChange: (tool: DrawTool) => void;
  color: string;
  onColorChange: (color: string) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearBoard: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const tools = [
  { id: 'pen' as DrawTool, icon: Pen, label: 'Pen' },
  { id: 'eraser' as DrawTool, icon: Eraser, label: 'Eraser' },
  { id: 'rectangle' as DrawTool, icon: Square, label: 'Rectangle' },
  { id: 'circle' as DrawTool, icon: Circle, label: 'Circle' },
  { id: 'line' as DrawTool, icon: Minus, label: 'Line' },
  { id: 'text' as DrawTool, icon: Type, label: 'Text' },
  { id: 'select' as DrawTool, icon: Hand, label: 'Select' },
];

const colors = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'
];

const brushSizes = [2, 4, 8, 16, 32];

export default function DrawingTools({
  activeTool,
  onToolChange,
  color,
  onColorChange,
  brushSize,
  onBrushSizeChange,
  onUndo,
  onRedo,
  onClearBoard,
  canUndo,
  canRedo
}: DrawingToolsProps) {
  return (
    <Card className="w-16 h-full shadow-lg">
      <CardContent className="p-2 space-y-3">
        {/* Tools */}
        <div className="space-y-1">
          {tools.map((tool) => (
            <Button
              key={tool.id}
              variant={activeTool === tool.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onToolChange(tool.id)}
              className="w-12 h-12 p-0"
              title={tool.label}
            >
              <tool.icon className="w-4 h-4" />
            </Button>
          ))}
        </div>

        <Separator />

        {/* Colors */}
        <div className="space-y-1">
          <div className="text-xs text-gray-500 px-1">Color</div>
          <div className="grid grid-cols-2 gap-1">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => onColorChange(c)}
                className={`w-5 h-5 rounded border-2 ${
                  color === c ? 'border-gray-900' : 'border-gray-300'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        <Separator />

        {/* Brush Size */}
        <div className="space-y-1">
          <div className="text-xs text-gray-500 px-1">Size</div>
          <div className="space-y-1">
            {brushSizes.map((size) => (
              <button
                key={size}
                onClick={() => onBrushSizeChange(size)}
                className={`w-12 h-6 rounded border flex items-center justify-center ${
                  brushSize === size 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                title={`${size}px`}
              >
                <div 
                  className="rounded-full bg-gray-700"
                  style={{ width: Math.min(size, 12), height: Math.min(size, 12) }}
                />
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            className="w-12 h-12 p-0"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
            className="w-12 h-12 p-0"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearBoard}
            className="w-12 h-12 p-0 text-red-500 hover:text-red-700"
            title="Clear Board"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}