import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageSquareText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CannedResponsesSelectorProps {
  onSelect: (content: string) => void;
}

export const CannedResponsesSelector = ({ onSelect }: CannedResponsesSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: responses, isLoading } = useQuery({
    queryKey: ["canned-responses"],
    queryFn: async () => {
      // @ts-ignore - table exists after migration
      const { data, error } = await supabase
        .from("helpdesk_canned_responses")
        .select("*, category:helpdesk_categories(name)")
        .order("title");
      
      if (error) throw error;
      return data || [];
    },
  });

  const filteredResponses = responses?.filter((response: any) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      response.title.toLowerCase().includes(searchLower) ||
      response.content.toLowerCase().includes(searchLower) ||
      response.shortcut?.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (content: string) => {
    onSelect(content);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          className="h-7 gap-1.5"
        >
          <MessageSquareText className="h-3.5 w-3.5" />
          Templates
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>
        <ScrollArea className="h-64">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : filteredResponses && filteredResponses.length > 0 ? (
            <div className="p-1">
              {filteredResponses.map((response: any) => (
                <button
                  key={response.id}
                  type="button"
                  className="w-full text-left p-2 rounded hover:bg-muted transition-colors"
                  onClick={() => handleSelect(response.content)}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm">{response.title}</span>
                    {response.shortcut && (
                      <span className="text-xs text-muted-foreground font-mono bg-muted px-1 rounded">
                        /{response.shortcut}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {response.content}
                  </p>
                  {response.category && (
                    <span className="text-xs text-muted-foreground mt-1 inline-block">
                      {response.category.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {search ? "No templates found" : "No canned responses yet"}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};