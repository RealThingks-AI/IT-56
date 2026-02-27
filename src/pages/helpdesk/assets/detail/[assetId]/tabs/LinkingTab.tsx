import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link2, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { sanitizeSearchInput } from "@/lib/utils";

interface LinkingTabProps {
  assetId: string;
}

interface AssetLink {
  id: string;
  parent_asset_id: string;
  child_asset_id: string;
  link_type: string;
  notes: string | null;
  created_at: string;
  parent_asset?: { id: string; asset_id: string; asset_tag: string; category: { name: string } | null };
  child_asset?: { id: string; asset_id: string; asset_tag: string; category: { name: string } | null };
}

const LINK_TYPES = [
  { value: "component_of", label: "Component Of" },
  { value: "related_to", label: "Related To" },
  { value: "replaced_by", label: "Replaced By" },
  { value: "replaces", label: "Replaces" },
  { value: "accessory_of", label: "Accessory Of" },
  { value: "parent_of", label: "Parent Of" },
];

export const LinkingTab = ({ assetId }: LinkingTabProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [linkType, setLinkType] = useState("related_to");
  const [notes, setNotes] = useState("");

  // Fetch linked assets
  const { data: links = [], isLoading } = useQuery({
    queryKey: ["asset-links", assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_asset_links")
        .select(`
          *,
          parent_asset:itam_assets!parent_asset_id(id, asset_id, asset_tag, category:itam_categories(name)),
          child_asset:itam_assets!child_asset_id(id, asset_id, asset_tag, category:itam_categories(name))
        `)
        .or(`parent_asset_id.eq.${assetId},child_asset_id.eq.${assetId}`);
      
      if (error) throw error;
      return (data || []) as AssetLink[];
    },
    enabled: !!assetId,
  });

  // Search for assets to link
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["asset-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      const { data, error } = await supabase
        .from("itam_assets")
        .select("id, asset_id, asset_tag, category:itam_categories(name)")
        .neq("id", assetId)
        .eq("is_active", true)
        .or(`asset_id.ilike.%${sanitizeSearchInput(searchQuery)}%,asset_tag.ilike.%${sanitizeSearchInput(searchQuery)}%`)
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.length >= 2,
  });

  // Create link mutation
  const createLink = useMutation({
    mutationFn: async () => {
      if (!selectedAssetId) throw new Error("Please select an asset");
      
      const { error } = await supabase
        .from("itam_asset_links")
        .insert({
          parent_asset_id: assetId,
          child_asset_id: selectedAssetId,
          link_type: linkType,
          notes: notes || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-links", assetId] });
      toast.success("Asset linked successfully");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to link asset");
    },
  });

  // Delete link mutation
  const deleteLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from("itam_asset_links")
        .delete()
        .eq("id", linkId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-links", assetId] });
      toast.success("Link removed");
    },
    onError: () => {
      toast.error("Failed to remove link");
    },
  });

  const resetForm = () => {
    setSearchQuery("");
    setSelectedAssetId(null);
    setLinkType("related_to");
    setNotes("");
  };

  const getLinkedAsset = (link: AssetLink) => {
    if (link.parent_asset_id === assetId) {
      return link.child_asset;
    }
    return link.parent_asset;
  };

  const getLinkDirection = (link: AssetLink) => {
    return link.parent_asset_id === assetId ? "outgoing" : "incoming";
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="space-y-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Link Asset
          </Button>

          {links.length === 0 ? (
            <div className="text-center py-6">
              <Link2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No linked assets</p>
              <p className="text-xs text-muted-foreground mt-1">
                Link this asset to related components or accessories
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link) => {
                const linkedAsset = getLinkedAsset(link);
                const direction = getLinkDirection(link);
                
                if (!linkedAsset) return null;
                
                return (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span 
                            className="font-medium text-primary hover:underline cursor-pointer text-sm truncate"
                            onClick={() => navigate(`/assets/detail/${linkedAsset.asset_tag || linkedAsset.id}`)}
                          >
                            {linkedAsset.asset_id || linkedAsset.asset_tag}
                          </span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {direction === "outgoing" ? "→" : "←"} {link.link_type.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {linkedAsset.category?.name || "No category"}
                          {link.notes && ` • ${link.notes}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => navigate(`/assets/detail/${linkedAsset.asset_tag || linkedAsset.id}`)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteLink.mutate(link.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Link Asset Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Link Asset</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Search Asset</Label>
                <Input
                  placeholder="Search by Asset ID or Tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {isSearching && (
                  <p className="text-xs text-muted-foreground">Searching...</p>
                )}
                {searchResults.length > 0 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className={`p-2 text-sm cursor-pointer hover:bg-muted ${
                          selectedAssetId === result.id ? "bg-primary/10" : ""
                        }`}
                        onClick={() => {
                          setSelectedAssetId(result.id);
                          setSearchQuery(result.asset_id || result.asset_tag || "");
                        }}
                      >
                        <span className="font-medium">{result.asset_id || result.asset_tag}</span>
                        <span className="text-muted-foreground ml-2">
                          {result.category?.name || "No category"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Link Type</Label>
                <Select value={linkType} onValueChange={setLinkType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LINK_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Add any notes about this link..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createLink.mutate()}
                disabled={!selectedAssetId || createLink.isPending}
              >
                {createLink.isPending ? "Linking..." : "Link Asset"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
