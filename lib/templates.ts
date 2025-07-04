import { WhiteboardTemplate, TemplateElement } from '@/types/whiteboard';

export const defaultTemplates: WhiteboardTemplate[] = [
  {
    id: 'flowchart',
    name: 'Flowchart',
    description: 'Process flow diagram template',
    category: 'business',
    thumbnail: '/templates/flowchart.png',
    isCustom: false,
    elements: [
      {
        type: 'shape',
        data: { type: 'rectangle', color: '#3b82f6', text: 'Start' },
        position: { x: 100, y: 100 },
        size: { width: 120, height: 60 }
      },
      {
        type: 'shape',
        data: { type: 'diamond', color: '#f59e0b', text: 'Decision?' },
        position: { x: 100, y: 200 },
        size: { width: 120, height: 80 }
      },
      {
        type: 'shape',
        data: { type: 'rectangle', color: '#10b981', text: 'Process' },
        position: { x: 300, y: 200 },
        size: { width: 120, height: 60 }
      },
      {
        type: 'shape',
        data: { type: 'rectangle', color: '#ef4444', text: 'End' },
        position: { x: 100, y: 350 },
        size: { width: 120, height: 60 }
      }
    ]
  },
  {
    id: 'mindmap',
    name: 'Mind Map',
    description: 'Brainstorming and idea organization',
    category: 'education',
    thumbnail: '/templates/mindmap.png',
    isCustom: false,
    elements: [
      {
        type: 'shape',
        data: { type: 'circle', color: '#8b5cf6', text: 'Main Topic' },
        position: { x: 400, y: 300 },
        size: { width: 150, height: 150 }
      },
      {
        type: 'shape',
        data: { type: 'circle', color: '#06b6d4', text: 'Subtopic 1' },
        position: { x: 200, y: 150 },
        size: { width: 100, height: 100 }
      },
      {
        type: 'shape',
        data: { type: 'circle', color: '#06b6d4', text: 'Subtopic 2' },
        position: { x: 600, y: 150 },
        size: { width: 100, height: 100 }
      },
      {
        type: 'shape',
        data: { type: 'circle', color: '#06b6d4', text: 'Subtopic 3' },
        position: { x: 200, y: 450 },
        size: { width: 100, height: 100 }
      },
      {
        type: 'shape',
        data: { type: 'circle', color: '#06b6d4', text: 'Subtopic 4' },
        position: { x: 600, y: 450 },
        size: { width: 100, height: 100 }
      }
    ]
  },
  {
    id: 'kanban',
    name: 'Kanban Board',
    description: 'Task management and workflow visualization',
    category: 'planning',
    thumbnail: '/templates/kanban.png',
    isCustom: false,
    elements: [
      {
        type: 'text',
        data: { text: 'To Do', fontSize: 24, fontWeight: 'bold', color: '#374151' },
        position: { x: 100, y: 50 }
      },
      {
        type: 'text',
        data: { text: 'In Progress', fontSize: 24, fontWeight: 'bold', color: '#374151' },
        position: { x: 350, y: 50 }
      },
      {
        type: 'text',
        data: { text: 'Done', fontSize: 24, fontWeight: 'bold', color: '#374151' },
        position: { x: 600, y: 50 }
      },
      {
        type: 'sticky',
        data: { text: 'Task 1', color: '#fef3c7' },
        position: { x: 100, y: 100 },
        size: { width: 200, height: 100 }
      },
      {
        type: 'sticky',
        data: { text: 'Task 2', color: '#dbeafe' },
        position: { x: 350, y: 100 },
        size: { width: 200, height: 100 }
      },
      {
        type: 'sticky',
        data: { text: 'Task 3', color: '#dcfce7' },
        position: { x: 600, y: 100 },
        size: { width: 200, height: 100 }
      }
    ]
  },
  {
    id: 'swot',
    name: 'SWOT Analysis',
    description: 'Strategic planning framework',
    category: 'business',
    thumbnail: '/templates/swot.png',
    isCustom: false,
    elements: [
      {
        type: 'shape',
        data: { type: 'rectangle', color: '#10b981', text: 'Strengths' },
        position: { x: 100, y: 100 },
        size: { width: 300, height: 200 }
      },
      {
        type: 'shape',
        data: { type: 'rectangle', color: '#f59e0b', text: 'Weaknesses' },
        position: { x: 450, y: 100 },
        size: { width: 300, height: 200 }
      },
      {
        type: 'shape',
        data: { type: 'rectangle', color: '#3b82f6', text: 'Opportunities' },
        position: { x: 100, y: 350 },
        size: { width: 300, height: 200 }
      },
      {
        type: 'shape',
        data: { type: 'rectangle', color: '#ef4444', text: 'Threats' },
        position: { x: 450, y: 350 },
        size: { width: 300, height: 200 }
      }
    ]
  }
];

export class TemplateService {
  static getTemplatesByCategory(category: string): WhiteboardTemplate[] {
    return defaultTemplates.filter(template => template.category === category);
  }

  static getTemplateById(id: string): WhiteboardTemplate | undefined {
    return defaultTemplates.find(template => template.id === id);
  }

  static createCustomTemplate(name: string, description: string, elements: TemplateElement[]): WhiteboardTemplate {
    return {
      id: `custom-${Date.now()}`,
      name,
      description,
      category: 'design',
      thumbnail: '/templates/custom.png',
      isCustom: true,
      elements
    };
  }
}