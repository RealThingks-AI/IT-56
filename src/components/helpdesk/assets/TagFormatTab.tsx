import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Pencil, Tag } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
}

interface TagFormat {
  id: string;
  category_id: string;
  prefix: string;
  current_number: number;
  zero_padding: number;
}

export function TagFormatTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [prefix, setPrefix] = useState("");
  const [padding, setPadding] = useState(4);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["itam-categories"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data: userData } = await supabase
        .from("users")
        .select("organisation_id")
        .eq("auth_user_id", user.id)
        .single();
      
      const { data, error } = await supabase
        .from("itam_categories")
        .select("id, name")
        .eq("organisation_id", userData?.organisation_id)
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch tag formats
  const { data: tagFormats = [], isLoading } = useQuery({
    queryKey: ["category-tag-formats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_tag_formats")
        .select("*");
      
      if (error) throw error;
      return (data || []) as TagFormat[];
    },
  });

  const getTagFormatForCategory = (categoryId: string) => {
    return tagFormats.find((tf) => tf.category_id === categoryId);
  };

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category);
    const existing = getTagFormatForCategory(category.id);
    if (existing) {
      setPrefix(existing.prefix);
      setPadding(existing.zero_padding);
    } else {
      // Suggest default prefix based on category name
      const suggested = category.name.substring(0, 3).toUpperCase() + "-";
      setPrefix(suggested);
      setPadding(4);
    }
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCategory) throw new Error("No category selected");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: userData } = await supabase
        .from("users")
        .select("organisation_id")
        .eq("auth_user_id", user.id)
        .single();
      
      const existing = getTagFormatForCategory(selectedCategory.id);
      
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("category_tag_formats")
          .update({
            prefix: prefix.trim(),
            zero_padding: padding,
          })
          .eq("id", existing.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("category_tag_formats")
          .insert({
            category_id: selectedCategory.id,
            prefix: prefix.trim(),
            zero_padding: padding,
            current_number: 1,
            organisation_id: userData?.organisation_id,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Tag format saved successfully");
      queryClient.invalidateQueries({ queryKey: ["category-tag-formats"] });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  const getPreviewTag = () => {
    if (!prefix) return "—";
    const paddedNumber = "1".padStart(padding, "0");
    return `${prefix}${paddedNumber}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tag Format
            </CardTitle>
            <CardDescription className="text-xs">
              Configure Asset Tag ID prefixes for each category
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CATEGORY</TableHead>
                <TableHead>PREFIX</TableHead>
                <TableHead>PADDING</TableHead>
                <TableHead>PREVIEW</TableHead>
                <TableHead className="text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category: Category) => {
                const tagFormat = getTagFormatForCategory(category.id);
                return (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      {tagFormat ? (
                        <Badge variant="secondary">{tagFormat.prefix}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not configured</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tagFormat ? tagFormat.zero_padding : "—"}
                    </TableCell>
                    <TableCell>
                      {tagFormat ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {tagFormat.prefix}{tagFormat.current_number.toString().padStart(tagFormat.zero_padding, "0")}
                        </code>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(category)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        {tagFormat ? "Edit" : "Configure"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No categories found. Add categories first to configure tag formats.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Configure Tag Format: {selectedCategory?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Prefix</Label>
              <Input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="e.g., LAP-"
              />
              <p className="text-xs text-muted-foreground">
                The prefix that will appear before the number (e.g., "LAP-" for Laptops)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Number Padding</Label>
              <Input
                type="number"
                min={1}
                max={8}
                value={padding}
                onChange={(e) => setPadding(parseInt(e.target.value) || 4)}
              />
              <p className="text-xs text-muted-foreground">
                How many digits to pad the number (e.g., 4 means 0001, 0002, etc.)
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-xs">Preview</Label>
              <p className="text-lg font-mono mt-1">{getPreviewTag()}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !prefix.trim()}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
