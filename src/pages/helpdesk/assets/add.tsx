import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { useAssetSetupConfig } from "@/hooks/useAssetSetupConfig";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { AssetPhotoSelector } from "@/components/helpdesk/assets/AssetPhotoSelector";
import { QuickAddFieldDialog, FieldType } from "@/components/helpdesk/assets/QuickAddFieldDialog";

const currencies = [{
  code: "INR",
  name: "India Rupee",
  symbol: "₹"
}, {
  code: "USD",
  name: "US Dollar",
  symbol: "$"
}, {
  code: "EUR",
  name: "Euro",
  symbol: "€"
}, {
  code: "GBP",
  name: "British Pound",
  symbol: "£"
}, {
  code: "AUD",
  name: "Australian Dollar",
  symbol: "A$"
}, {
  code: "CAD",
  name: "Canadian Dollar",
  symbol: "C$"
}];

import { ASSET_STATUS_OPTIONS } from "@/lib/assetStatusUtils";

const statusOptions = ASSET_STATUS_OPTIONS;

export default function AddAsset() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const editAssetId = searchParams.get("edit");
  const isEditMode = !!editAssetId;

  const {
    categories,
    sites,
    locations,
    departments,
    makes,
    isLoading: configLoading
  } = useAssetSetupConfig();

  const [formData, setFormData] = useState({
    asset_tag: "",
    serial_number: "",
    make_id: "",
    model: "",
    purchase_date: null as Date | null,
    purchased_from: "",
    cost: "",
    currency: "INR",
    description: "",
    asset_configuration: "",
    classification_confidential: false,
    classification_internal: false,
    classification_public: false,
    site_id: "",
    location_id: "",
    category_id: "",
    department_id: "",
    photo_url: null as string | null,
    status: "available"
  });

  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasPopulatedForm, setHasPopulatedForm] = useState(false);

  // Quick Add Dialog state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddFieldType, setQuickAddFieldType] = useState<FieldType>("site");

  // Fetch existing asset data when in edit mode
  const { data: existingAsset, isLoading: assetLoading } = useQuery({
    queryKey: ["itam-asset-edit", editAssetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_assets")
        .select(`
          *,
          category:itam_categories(id, name),
          department:itam_departments(id, name),
          location:itam_locations(id, name),
          make:itam_makes(id, name),
          vendor:itam_vendors(id, name)
        `)
        .eq("id", editAssetId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isEditMode
  });

  // Populate form with existing asset data
  useEffect(() => {
    if (existingAsset && isEditMode && !hasPopulatedForm) {
      const customFields = existingAsset.custom_fields as Record<string, any> | null;
      const classifications = Array.isArray(customFields?.classification) ? customFields.classification : [];
      
      setFormData({
        asset_tag: existingAsset.asset_tag || existingAsset.asset_id || "",
        serial_number: existingAsset.serial_number || "",
        make_id: existingAsset.make_id || "",
        model: existingAsset.model || "",
        purchase_date: existingAsset.purchase_date ? new Date(existingAsset.purchase_date) : null,
        purchased_from: customFields?.vendor || existingAsset.vendor?.name || "",
        cost: existingAsset.purchase_price?.toString() || "",
        currency: customFields?.currency || "INR",
        description: existingAsset.notes || "",
        asset_configuration: customFields?.asset_configuration || "",
        classification_confidential: classifications.includes("confidential"),
        classification_internal: classifications.includes("internal"),
        classification_public: classifications.includes("public"),
        site_id: customFields?.site_id || "",
        location_id: existingAsset.location_id || "",
        category_id: existingAsset.category_id || "",
        department_id: existingAsset.department_id || "",
        photo_url: customFields?.photo_url || null,
        status: existingAsset.status || "available"
      });
      setHasPopulatedForm(true);
    }
  }, [existingAsset, isEditMode, hasPopulatedForm]);

  // Filter locations based on selected site - include locations with null site_id
  const filteredLocations = useMemo(() => {
    if (!formData.site_id) return locations;
    // Show locations that match the selected site OR have no site assigned
    return locations.filter(loc => loc.site_id === formData.site_id || loc.site_id === null);
  }, [locations, formData.site_id]);

  // Clear location if site changes and current location doesn't belong to new site
  useEffect(() => {
    if (formData.site_id && formData.location_id) {
      const locationBelongsToSite = filteredLocations.some(loc => loc.id === formData.location_id);
      if (!locationBelongsToSite) {
        setFormData(prev => ({
          ...prev,
          location_id: ""
        }));
      }
    }
  }, [formData.site_id, formData.location_id, filteredLocations]);

  // Auto-fill Asset Tag ID when category is selected or changed (only for new assets)
  useEffect(() => {
    if (formData.category_id && !isEditMode) {
      handleAutoFill();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.category_id, isEditMode]);

  const handleAutoFill = async () => {
    if (!formData.category_id) {
      toast.error("Please select a category first");
      return;
    }
    setIsAutoFilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-next-asset-id-by-category", {
        body: { category_id: formData.category_id }
      });
      if (error) throw error;
      if (data?.needsConfiguration) {
        toast.error(data.error || "Tag format not configured for this category", {
          action: {
            label: "Setup",
            onClick: () => navigate("/assets/setup/fields-setup")
          }
        });
        return;
      }
      if (data?.assetId) {
        setFormData(prev => ({
          ...prev,
          asset_tag: data.assetId
        }));
        toast.success("Asset Tag ID generated");
      }
    } catch (error) {
      toast.error("Failed to generate Asset Tag ID");
    } finally {
      setIsAutoFilling(false);
    }
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    if (!formData.category_id) errors.push("Category is required");
    if (!formData.asset_tag.trim()) errors.push("Asset Tag ID is required");
    if (!formData.serial_number.trim()) errors.push("Serial Number is required");
    if (!formData.make_id) errors.push("Make is required");
    if (!formData.model.trim()) errors.push("Model is required");
    if (!formData.purchase_date) errors.push("Purchase Date is required");
    if (!formData.cost) errors.push("Cost is required");
    if (!formData.site_id) errors.push("Site is required");
    if (!formData.location_id) errors.push("Location is required");
    return errors;
  };

  const createAsset = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const [profileResult, userResult] = await Promise.all([
        supabase.from("profiles").select("tenant_id").eq("id", user.id).maybeSingle(),
        supabase.from("users").select("organisation_id").eq("auth_user_id", user.id).maybeSingle()
      ]);
      const tenantId = profileResult.data?.tenant_id || 1;
      const organisationId = userResult.data?.organisation_id;

      const classifications: string[] = [];
      if (formData.classification_confidential) classifications.push("confidential");
      if (formData.classification_internal) classifications.push("internal");
      if (formData.classification_public) classifications.push("public");

      const assetId = formData.asset_tag || `AST-${Date.now()}`;

      // @ts-ignore - Complex Supabase type inference issue
      const { error } = await supabase.from("itam_assets").insert({
        asset_id: assetId,
        asset_tag: assetId,
        name: formData.model || "Unnamed Asset",
        status: "available",
        category_id: formData.category_id || null,
        location_id: formData.location_id || null,
        department_id: formData.department_id || null,
        make_id: formData.make_id || null,
        model: formData.model || null,
        serial_number: formData.serial_number || null,
        purchase_price: formData.cost ? parseFloat(formData.cost) : null,
        notes: formData.description || null,
        tenant_id: tenantId,
        organisation_id: organisationId,
        is_active: true,
        purchase_date: formData.purchase_date ? format(formData.purchase_date, "yyyy-MM-dd") : null,
        custom_fields: {
          asset_configuration: formData.asset_configuration,
          classification: classifications,
          currency: formData.currency,
          vendor: formData.purchased_from,
          photo_url: formData.photo_url,
          site_id: formData.site_id || null
        }
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Asset created successfully");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets"] });
      queryClient.invalidateQueries({ queryKey: ["assets-overview"] });
      navigate("/assets/allassets");
    },
    onError: (error: Error) => {
      toast.error("Failed to create asset: " + error.message);
    }
  });

  const updateAsset = useMutation({
    mutationFn: async () => {
      if (!editAssetId) throw new Error("No asset ID provided");

      const classifications: string[] = [];
      if (formData.classification_confidential) classifications.push("confidential");
      if (formData.classification_internal) classifications.push("internal");
      if (formData.classification_public) classifications.push("public");

      const { error } = await supabase
        .from("itam_assets")
        .update({
          asset_tag: formData.asset_tag || null,
          name: formData.model || "Unnamed Asset",
          status: formData.status,
          category_id: formData.category_id || null,
          location_id: formData.location_id || null,
          department_id: formData.department_id || null,
          make_id: formData.make_id || null,
          model: formData.model || null,
          serial_number: formData.serial_number || null,
          purchase_price: formData.cost ? parseFloat(formData.cost) : null,
          notes: formData.description || null,
          purchase_date: formData.purchase_date ? format(formData.purchase_date, "yyyy-MM-dd") : null,
          custom_fields: {
            asset_configuration: formData.asset_configuration,
            classification: classifications,
            currency: formData.currency,
            vendor: formData.purchased_from,
            photo_url: formData.photo_url,
            site_id: formData.site_id || null
          }
        })
        .eq("id", editAssetId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Asset updated successfully");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets"] });
      queryClient.invalidateQueries({ queryKey: ["assets-overview"] });
      queryClient.invalidateQueries({ queryKey: ["itam-asset-detail", editAssetId] });
      queryClient.invalidateQueries({ queryKey: ["itam-asset-edit", editAssetId] });
      navigate(`/assets/detail/${editAssetId}`);
    },
    onError: (error: Error) => {
      toast.error("Failed to update asset: " + error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error(errors[0]);
      return;
    }
    setValidationErrors([]);
    
    if (isEditMode) {
      updateAsset.mutate();
    } else {
      createAsset.mutate();
    }
  };

  const handleCancel = () => {
    if (isEditMode && editAssetId) {
      navigate(`/assets/detail/${editAssetId}`);
    } else {
      navigate("/assets/allassets");
    }
  };

  const openQuickAddDialog = (fieldType: FieldType) => {
    setQuickAddFieldType(fieldType);
    setQuickAddOpen(true);
  };

  const handleQuickAddSuccess = (id: string, name: string) => {
    // Auto-select the newly created item
    switch (quickAddFieldType) {
      case "site":
        setFormData(prev => ({ ...prev, site_id: id }));
        break;
      case "location":
        setFormData(prev => ({ ...prev, location_id: id }));
        break;
      case "category":
        setFormData(prev => ({ ...prev, category_id: id }));
        break;
      case "department":
        setFormData(prev => ({ ...prev, department_id: id }));
        break;
      case "make":
        setFormData(prev => ({ ...prev, make_id: id }));
        break;
    }
  };

  const isPending = createAsset.isPending || updateAsset.isPending;
  const isPageLoading = isEditMode && (assetLoading || configLoading);

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-hidden">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Asset Details */}
        <Card>
          <CardHeader className="bg-muted/50 py-2.5">
            <CardTitle className="text-sm font-medium">
              {isEditMode ? "Edit Asset Details" : "Asset Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">
              {/* Category - First field */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Category <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-1.5">
                  <Select value={formData.category_id} onValueChange={value => setFormData({ ...formData, category_id: value })}>
                    <SelectTrigger className="flex-1 h-8 text-sm">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                          No categories found.{" "}
                          <Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={() => openQuickAddDialog("category")}>
                            Add one
                          </Button>
                        </div>
                      ) : (
                        categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => openQuickAddDialog("category")} title="Add new category" className="h-8 w-8 shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Asset Tag ID with AutoFill */}
              <div className="space-y-1.5">
                <Label htmlFor="asset_tag" className="text-xs">
                  Asset Tag ID <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input 
                    id="asset_tag" 
                    value={formData.asset_tag} 
                    onChange={e => setFormData({ ...formData, asset_tag: e.target.value })} 
                    placeholder="Enter asset tag" 
                    className="flex-1 h-8 text-sm" 
                    disabled={isEditMode}
                  />
                  {!isEditMode && (
                    <Button type="button" variant="secondary" size="sm" onClick={handleAutoFill} disabled={isAutoFilling || !formData.category_id} className="bg-primary hover:bg-primary/90 text-primary-foreground h-8" title={!formData.category_id ? "Select a category first" : "Auto-generate Asset Tag ID"}>
                      {isAutoFilling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "AutoFill"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Status - Only show in edit mode */}
              {isEditMode && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={formData.status} onValueChange={value => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Serial No */}
              <div className="space-y-1.5">
                <Label htmlFor="serial_number" className="text-xs">
                  Serial No <span className="text-destructive">*</span>
                </Label>
                <Input id="serial_number" value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} placeholder="Enter serial number" className="h-8 text-sm" />
              </div>

              {/* Make */}
              <div className="space-y-1.5">
                <Label htmlFor="make" className="text-xs">
                  Make <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-1.5">
                  <Select value={formData.make_id} onValueChange={value => setFormData({ ...formData, make_id: value })}>
                    <SelectTrigger className="flex-1 h-8 text-sm">
                      <SelectValue placeholder="Select make" />
                    </SelectTrigger>
                    <SelectContent>
                      {makes.length === 0 ? (
                        <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                          No makes found.{" "}
                          <Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={() => openQuickAddDialog("make")}>
                            Add one
                          </Button>
                        </div>
                      ) : (
                        makes.map(make => (
                          <SelectItem key={make.id} value={make.id}>{make.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => openQuickAddDialog("make")} title="Add new make" className="h-8 w-8 shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Model */}
              <div className="space-y-1.5">
                <Label htmlFor="model" className="text-xs">
                  Model <span className="text-destructive">*</span>
                </Label>
                <Input id="model" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} placeholder="Enter model" className="h-8 text-sm" />
              </div>

              {/* Purchase Date */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Purchase Date <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-8 text-sm", !formData.purchase_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {formData.purchase_date ? format(formData.purchase_date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200]" align="start">
                    <Calendar mode="single" selected={formData.purchase_date || undefined} onSelect={date => setFormData({ ...formData, purchase_date: date || null })} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Vendor */}
              <div className="space-y-1.5">
                <Label htmlFor="purchased_from" className="text-xs">
                  Vendor <span className="text-destructive">*</span>
                </Label>
                <Input id="purchased_from" value={formData.purchased_from} onChange={e => setFormData({ ...formData, purchased_from: e.target.value })} placeholder="Enter vendor name" className="h-8 text-sm" />
              </div>

              {/* Cost with Currency */}
              <div className="space-y-1.5">
                <Label htmlFor="cost" className="text-xs">
                  Cost <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-1.5">
                  <Select value={formData.currency} onValueChange={value => setFormData({ ...formData, currency: value })}>
                    <SelectTrigger className="w-[100px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(curr => (
                        <SelectItem key={curr.code} value={curr.code}>
                          {curr.symbol} {curr.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input id="cost" type="number" value={formData.cost} onChange={e => setFormData({ ...formData, cost: e.target.value })} placeholder="0.00" className="flex-1 h-8 text-sm" />
                </div>
              </div>

              {/* Asset Configuration */}
              <div className="space-y-1.5">
                <Label htmlFor="asset_configuration" className="text-xs">
                  Asset Configuration
                </Label>
                <Input id="asset_configuration" value={formData.asset_configuration} onChange={e => setFormData({ ...formData, asset_configuration: e.target.value })} placeholder="Enter configuration" className="h-8 text-sm" />
              </div>

              {/* Description - Full width */}
              <div className="space-y-1.5 md:col-span-3">
                <Label htmlFor="description" className="text-xs">
                  Description
                </Label>
                <Textarea id="description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Enter asset description" rows={2} className="text-sm resize-none" />
              </div>

              {/* Asset Classification */}
              <div className="space-y-1.5 md:col-span-3">
                <Label className="text-xs">Asset Classification</Label>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="confidential" checked={formData.classification_confidential} onCheckedChange={checked => setFormData({ ...formData, classification_confidential: !!checked })} />
                    <Label htmlFor="confidential" className="font-normal cursor-pointer text-sm">
                      Confidential
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="internal" checked={formData.classification_internal} onCheckedChange={checked => setFormData({ ...formData, classification_internal: !!checked })} />
                    <Label htmlFor="internal" className="font-normal cursor-pointer text-sm">
                      Internal
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="public" checked={formData.classification_public} onCheckedChange={checked => setFormData({ ...formData, classification_public: !!checked })} />
                    <Label htmlFor="public" className="font-normal cursor-pointer text-sm">
                      Public
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Site, Location and Department */}
        <Card>
          <CardHeader className="bg-muted/50 py-2.5">
            <CardTitle className="text-sm font-medium">Site, Location and Department</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">
              {/* Site */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Site <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-1.5">
                  <Select value={formData.site_id} onValueChange={value => setFormData({ ...formData, site_id: value })}>
                    <SelectTrigger className="flex-1 h-8 text-sm">
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.length === 0 ? (
                        <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                          No sites found.{" "}
                          <Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={() => openQuickAddDialog("site")}>
                            Add one
                          </Button>
                        </div>
                      ) : (
                        sites.map(site => (
                          <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => openQuickAddDialog("site")} title="Add new site" className="h-8 w-8 shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Location - filtered by site */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Location <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-1.5">
                  <Select value={formData.location_id} onValueChange={value => setFormData({ ...formData, location_id: value })}>
                    <SelectTrigger className="flex-1 h-8 text-sm">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredLocations.length === 0 ? (
                        <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                          No locations found.{" "}
                          <Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={() => openQuickAddDialog("location")}>
                            Add one
                          </Button>
                        </div>
                      ) : (
                        filteredLocations.map(loc => (
                          <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => openQuickAddDialog("location")} title="Add new location" className="h-8 w-8 shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <Label className="text-xs">Department</Label>
                <div className="flex gap-1.5">
                  <Select value={formData.department_id} onValueChange={value => setFormData({ ...formData, department_id: value })}>
                    <SelectTrigger className="flex-1 h-8 text-sm">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.length === 0 ? (
                        <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                          No departments found.{" "}
                          <Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={() => openQuickAddDialog("department")}>
                            Add one
                          </Button>
                        </div>
                      ) : (
                        departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => openQuickAddDialog("department")} title="Add new department" className="h-8 w-8 shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Asset Image */}
        <Card>
          <CardHeader className="bg-muted/50 py-2.5">
            <CardTitle className="text-sm font-medium">Asset Image</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <AssetPhotoSelector selectedUrl={formData.photo_url} onSelect={url => setFormData({ ...formData, photo_url: url })} />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2 pb-4">
          <Button type="button" variant="outline" size="sm" onClick={handleCancel} className="min-w-[80px]">
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isPending} className="min-w-[80px] bg-primary hover:bg-primary/90 text-primary-foreground">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                {isEditMode ? "Saving..." : "Submitting..."}
              </>
            ) : isEditMode ? "Save Changes" : "Submit"}
          </Button>
        </div>
      </form>

      {/* Quick Add Dialog */}
      <QuickAddFieldDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        fieldType={quickAddFieldType}
        onSuccess={handleQuickAddSuccess}
        selectedSiteId={formData.site_id}
        sites={sites}
      />
    </div>
  );
}
