'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { defaultTemplates, TemplateService } from '@/lib/templates';
import { WhiteboardTemplate } from '@/types/whiteboard';
import { 
  Layout, 
  Briefcase, 
  GraduationCap, 
  Palette, 
  Calendar,
  Plus,
  Star
} from 'lucide-react';

interface TemplateSelectorProps {
  onSelectTemplate: (template: WhiteboardTemplate) => void;
  customTemplates: WhiteboardTemplate[];
  onSaveAsTemplate: () => void;
}

export default function TemplateSelector({ 
  onSelectTemplate, 
  customTemplates,
  onSaveAsTemplate 
}: TemplateSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('business');

  const categories = [
    { id: 'business', label: 'Business', icon: Briefcase },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'design', label: 'Design', icon: Palette },
    { id: 'planning', label: 'Planning', icon: Calendar }
  ];

  const handleSelectTemplate = (template: WhiteboardTemplate) => {
    onSelectTemplate(template);
    setIsDialogOpen(false);
  };

  const getCategoryTemplates = (category: string) => {
    return defaultTemplates.filter(template => template.category === category);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Layout className="w-4 h-4" />
          Templates
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layout className="w-5 h-5" />
            Choose a Template
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {categories.map((category) => (
              <TabsTrigger 
                key={category.id} 
                value={category.id}
                className="flex items-center gap-2"
              >
                <category.icon className="w-4 h-4" />
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {categories.map((category) => (
            <TabsContent key={category.id} value={category.id}>
              <ScrollArea className="h-96">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
                  {getCategoryTemplates(category.id).map((template) => (
                    <Card 
                      key={template.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <CardHeader className="pb-2">
                        <div className="aspect-video bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center mb-2">
                          <Layout className="w-8 h-8 text-blue-500" />
                        </div>
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-gray-600 mb-2">
                          {template.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {template.elements.length} elements
                          </Badge>
                          {template.isCustom && (
                            <Star className="w-3 h-3 text-yellow-500" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Custom Templates */}
                  {category.id === 'design' && customTemplates.map((template) => (
                    <Card 
                      key={template.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow border-purple-200"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <CardHeader className="pb-2">
                        <div className="aspect-video bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg flex items-center justify-center mb-2">
                          <Star className="w-8 h-8 text-purple-500" />
                        </div>
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-gray-600 mb-2">
                          {template.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs border-purple-300">
                            Custom
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {template.elements.length} elements
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
        
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={onSaveAsTemplate}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Save Current as Template
          </Button>
          
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}