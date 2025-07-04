'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  Trash2,
  Triangle,
  Diamond,
  ArrowRight,
  Highlighter,
  StickyNote,
  Zap,
  MousePointer2
} from 'lucide-react';

interface EnhancedDrawingToolsProps {
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

const toolGroups = [
  {
    name: 'Drawing',
    tools: [
      { id: 'pen' as DrawTool, icon: Pen, label: 'Pen', shortcut: 'P' },
      { id: 'highlighter' as DrawTool, icon: Highlighter, label: 'Highlighter', shortcut: 'H' },
      { id: 'eraser' as DrawTool, icon: Eraser, label: 'Eraser', shortcut: 'E' },
    ]
  },
  {
    name: 'Shapes',
    tools: [
      { id: 'rectangle' as DrawTool, icon: Square, label: 'Rectangle', shortcut: 'R' },
      { id: 'circle' as DrawTool, icon: Circle, label: 'Circle', shortcut: 'C' },
      { id: 'triangle' as DrawTool, icon: Triangle, label: 'Triangle', shortcut: 'T' },
      { id: 'diamond' as DrawTool, icon: Diamond, label: 'Diamond', shortcut: 'D' },
      { id: 'line' as DrawTool, icon: Minus, label: 'Line', shortcut: 'L' },
      { id: 'arrow' as DrawTool, icon: ArrowRight, label: 'Arrow', shortcut: 'A' },
    ]
  },
  {
    name: 'Content',
    tools: [
      { id: 'text' as DrawTool, icon: Type, label: 'Text', shortcut: 'X' },
      { id: 'sticky' as DrawTool, icon: StickyNote, label: 'Sticky Note', shortcut: 'S' },
    ]
  },
  {
    name: 'Navigation',
    tools: [
      { id: 'select' as DrawTool, icon: MousePointer2, label: 'Select', shortcut: 'V' },
      { id: 'hand' as DrawTool, icon: Hand, label: 'Pan', shortcut: 'Space' },
      { id: 'laser' as DrawTool, icon: Zap, label: 'Laser Pointer', shortcut: 'Q' },
    ]
  }
];

const colors = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB',
  '#8B4513', '#808080', '#FFB6C1', '#98FB98', '#87CEEB'
];

const brushSizes = [1, 2, 4, 8, 16, 32, 64];

export default function EnhancedDrawingTools({
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
}: EnhancedDrawingToolsProps) {
  return (
    <TooltipProvider>
      <Card className="w-20 h-full shadow-lg">
        <CardContent className="p-2 space-y-4">
          {/* Tool Groups */}
          {toolGroups.map((group, groupIndex) => (
            <div key={group.name}>
              {groupIndex > 0 && <Separator className="my-2" />}

              <div className="space-y-1">
                <div className="text-xs text-gray-500 px-1 mb-2">{group.name}</div>
                {group.tools.map((tool) => (
                  <Tooltip key={tool.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activeTool === tool.id ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => onToolChange(tool.id)}
                        className="w-16 h-12 p-0 relative"
                      >
                        <tool.icon className="w-4 h-4" />
                        {tool.shortcut && (
                          <Badge
                            variant="secondary"
                            className="absolute -top-1 -right-1 text-xs px-1 py-0 h-4"
                          >
                            {tool.shortcut}
                          </Badge>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{tool.label}</p>
                      {tool.shortcut && (
                        <p className="text-xs text-gray-400">Press {tool.shortcut}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}



          {/* Colors */}
          <div className="space-y-1">
            <div className="text-xs text-gray-500 px-1">Color</div>
            <div className="grid grid-cols-3 gap-1">
              {colors.map((c) => (
                <Tooltip key={c}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onColorChange(c)}
                      className={`w-5 h-5 rounded border-2 transition-all hover:scale-110 ${color === c ? 'border-gray-900 ring-2 ring-blue-300' : 'border-gray-300'
                        }`}
                      style={{ backgroundColor: c }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{c}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          <Separator />

          {/* Brush Size */}
          <div className="space-y-1">
            <div className="text-xs text-gray-500 px-1">Size</div>
            <div className="space-y-1">
              {brushSizes.map((size) => (
                <Tooltip key={size}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onBrushSizeChange(size)}
                      className={`w-16 h-8 rounded border flex items-center justify-center transition-all hover:scale-105 ${brushSize === size
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-300 hover:border-gray-400'
                        }`}
                    >
                      <div
                        className="rounded-full bg-gray-700"
                        style={{
                          width: Math.min(size, 16),
                          height: Math.min(size, 16)
                        }}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{size}px</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-1">
            <div className="text-xs text-gray-500 px-1">Actions</div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="w-16 h-12 p-0"
                >
                  <Undo className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Undo (Ctrl+Z)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="w-16 h-12 p-0"
                >
                  <Redo className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Redo (Ctrl+Y)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearBoard}
                  className="w-16 h-12 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Clear Board</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}