import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Ticket, Monitor, CreditCard, Shield, Box } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { HELPDESK_TOOLS } from "@/hooks/useUserTools";

// Tool icons mapping
const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  helpdesk: Ticket,
  assets: Box,
  subscriptions: CreditCard,
  "system-updates": Monitor,
  monitoring: Shield,
};

interface AddToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTools: string[];
  onToolsUpdated: (tools: string[]) => void;
}

export const AddToolsDialog = ({ open, onOpenChange, selectedTools, onToolsUpdated }: AddToolsDialogProps) => {
  const [tempSelectedTools, setTempSelectedTools] = useState<string[]>(selectedTools);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Sync tempSelectedTools with selectedTools prop when dialog opens
  useEffect(() => {
    if (open) {
      setTempSelectedTools(selectedTools);
    }
  }, [open, selectedTools]);

  const handleToggleTool = (toolKey: string) => {
    setTempSelectedTools(prev => 
      prev.includes(toolKey) 
        ? prev.filter(k => k !== toolKey)
        : [...prev, toolKey]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ selected_tools: tempSelectedTools } as any)
        .eq('id', user.id);

      if (error) throw error;

      onToolsUpdated(tempSelectedTools);
      toast({
        title: "Tools updated",
        description: "Your tool selection has been saved successfully.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving tools:', error);
      toast({
        title: "Error",
        description: "Failed to save your tool selection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Tools to Your Dashboard</DialogTitle>
          <DialogDescription className="text-sm">
            Select the tools you want to see on your personal dashboard
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {HELPDESK_TOOLS.map((tool) => {
              const Icon = TOOL_ICONS[tool.key] || Package;
              const isSelected = tempSelectedTools.includes(tool.key);
              
              return (
                <div
                  key={tool.key}
                  className={`flex items-start space-x-3 p-3 rounded-lg border transition-all duration-[var(--transition-fast)] cursor-pointer hover:border-primary/50 hover:bg-accent/50 ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => handleToggleTool(tool.key)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleTool(tool.key)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <h4 className="font-medium text-sm truncate">{tool.name}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{tool.description || 'No description available'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} size="sm">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? "Saving..." : "Save Tools"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};