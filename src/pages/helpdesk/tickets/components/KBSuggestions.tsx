import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ExternalLink, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KBSuggestionsProps {
  searchQuery: string;
}

export function KBSuggestions({ searchQuery }: KBSuggestionsProps) {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["kb-suggestions", searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_kb_articles")
        .select("id, title, summary")
        .eq("status", "published")
        .textSearch("title", searchQuery.split(" ").join(" | "))
        .limit(3);

      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length > 3,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-16 bg-muted animate-pulse rounded" />
        <div className="h-16 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No related articles found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-3">
        These articles might help solve your issue:
      </p>
      {articles.map((article) => (
        <Card key={article.id} className="p-3 hover:bg-accent transition-colors">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-medium text-sm mb-1">{article.title}</h4>
              {article.summary && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {article.summary}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => window.open(`/helpdesk/kb/article/${article.id}`, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
