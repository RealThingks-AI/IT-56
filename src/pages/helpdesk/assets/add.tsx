import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Plus, CalendarIcon, ShieldCheck, X } from "lucide-react";
import { useAssetSetupConfig } from "@/hooks/useAssetSetupConfig";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addMonths } from "date-fns";
import { AssetPhotoSelector } from "@/components/helpdesk/assets/AssetPhotoSelector";
import { QuickAddFieldDialog, FieldType } from "@/components/helpdesk/assets/QuickAddFieldDialog";
import { invalidateAllAssetQueries } from "@/lib/assetQueryUtils";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ASSET_STATUS_OPTIONS } from "@/lib/assetStatusUtils";

// ── Zod Schema ──────────────────────────────────────────────────────────────
const assetFormSchema = z.object({
  category_id: z.string().min(1, "Category is required"),
  asset_tag: z.string().trim().min(1, "Asset Tag ID is required"),
  serial_number: z.string().trim().min(1, "Serial Number is required"),
  make_id: z.string().min(1, "Make is required"),
  model: z.string().trim().min(1, "Model is required"),
  purchase_date: z.date({ required_error: "Purchase Date is required" }),
  cost: z.string().min(1, "Cost is required").refine(v => !isNaN(Number(v)) && Number(v) >= 0, "Cost must be a valid positive number"),
  site_id: z.string().min(1, "Site is required"),
  location_id: z.string().min(1, "Location is required"),
  // Optional fields
  status: z.string().default("available"),
  vendor_id: z.string().optional().default(""),
  purchased_from: z.string().optional().default(""),
  currency: z.string().default("INR"),
  description: z.string().optional().default(""),
  asset_configuration: z.string().optional().default(""),
  classification_confidential: z.boolean().default(false),
  classification_internal: z.boolean().default(false),
  classification_public: z.boolean().default(false),
  department_id: z.string().optional().default(""),
  photo_url: z.string().nullable().optional().default(null),
  add_warranty: z.boolean().default(false),
  warranty_months: z.string().default("12"),
  warranty_expiry: z.date().nullable().optional().default(null),
});

type AssetFormData = z.infer<typeof assetFormSchema>;

const fallbackCurrencies = [
  { code: "INR", name: "India Rupee", symbol: "₹" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
];

// ── Field Wrapper with inline error ─────────────────────────────────────────
function FormField({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-[11px] text-destructive font-medium animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  );
}

// ── Loading Skeleton ────────────────────────────────────────────────────────
function AddAssetSkeleton() {
  return (
    <div className="px-4 py-3 space-y-3">
      <Card>
        <CardHeader className="bg-muted/50 py-2.5">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="bg-muted/50 py-2.5">
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Section Card ────────────────────────────────────────────────────────────
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <CardHeader className="py-2 px-4 border-b bg-muted/50">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span className="w-1 h-4 bg-primary rounded-full" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-3">{children}</CardContent>
    </Card>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function AddAsset() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const editAssetId = searchParams.get("edit");
  const isEditMode = !!editAssetId;

  const { preferences, updatePreferences } = useUserPreferences();

  const {
    categories, sites, locations, departments, makes,
    isLoading: configLoading,
  } = useAssetSetupConfig();

  // Currencies from DB
  const { data: currencies } = useQuery({
    queryKey: ["currencies-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("currencies")
        .select("code, name, symbol")
        .eq("is_active", true)
        .order("code");
      return data && data.length > 0 ? data : fallbackCurrencies;
    },
    staleTime: 60000,
  });
  const currencyList = currencies || fallbackCurrencies;

  // Vendors
  const { data: vendors = [] } = useQuery({
    queryKey: ["itam-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_vendors")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // ── Get asset defaults from preferences ───────────────────────────────────
  const assetDefaults = useMemo(() => {
    const ns = preferences?.notification_settings as Record<string, any> | undefined;
    return ns?.assetDefaults as { site_id?: string; location_id?: string; department_id?: string } | undefined;
  }, [preferences?.notification_settings]);

  // ── React Hook Form ───────────────────────────────────────────────────────
  const {
    control,
    handleSubmit: rhfHandleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
    setFocus,
  } = useForm<AssetFormData>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      category_id: "",
      asset_tag: "",
      serial_number: "",
      make_id: "",
      model: "",
      purchase_date: undefined as any,
      cost: "",
      currency: preferences?.currency || "INR",
      description: "",
      asset_configuration: "",
      classification_confidential: false,
      classification_internal: false,
      classification_public: false,
      site_id: "",
      location_id: "",
      department_id: "",
      vendor_id: "",
      purchased_from: "",
      photo_url: null,
      status: "available",
      add_warranty: false,
      warranty_months: "12",
      warranty_expiry: null,
    },
  });

  const watchedValues = watch();
  const categoryId = watchedValues.category_id;
  const purchaseDate = watchedValues.purchase_date;
  const addWarranty = watchedValues.add_warranty;
  const warrantyMonths = watchedValues.warranty_months;
  const siteId = watchedValues.site_id;
  const locationId = watchedValues.location_id;

  // ── Auto-fill & state ─────────────────────────────────────────────────────
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [hasPopulatedForm, setHasPopulatedForm] = useState(false);
  const autoFillRef = useRef(false);
  const prevCategoryRef = useRef<string>("");

  // Quick Add Dialog
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddFieldType, setQuickAddFieldType] = useState<FieldType>("site");

  // ── Unsaved changes warning ───────────────────────────────────────────────
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ── Load user currency preference ─────────────────────────────────────────
  useEffect(() => {
    if (preferences?.currency && !isEditMode && !hasPopulatedForm) {
      setValue("currency", preferences.currency);
    }
  }, [preferences?.currency, isEditMode, hasPopulatedForm, setValue]);

  // ── Pre-fill site/location/department from saved preferences ──────────────
  useEffect(() => {
    if (!isEditMode && !hasPopulatedForm && assetDefaults) {
      if (assetDefaults.site_id) setValue("site_id", assetDefaults.site_id);
      if (assetDefaults.location_id) setValue("location_id", assetDefaults.location_id);
      if (assetDefaults.department_id) setValue("department_id", assetDefaults.department_id);
    }
  }, [isEditMode, hasPopulatedForm, assetDefaults, setValue]);

  // ── Fetch existing asset in edit mode ─────────────────────────────────────
  const { data: existingAsset, isLoading: assetLoading } = useQuery({
    queryKey: ["itam-asset-edit", editAssetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_assets")
        .select(`*, category:itam_categories(id, name), department:itam_departments(id, name), location:itam_locations(id, name), make:itam_makes(id, name), vendor:itam_vendors(id, name)`)
        .eq("id", editAssetId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isEditMode,
  });

  // Populate form with existing data
  useEffect(() => {
    if (existingAsset && isEditMode && !hasPopulatedForm) {
      const cf = existingAsset.custom_fields as Record<string, any> | null;
      const classifications = Array.isArray(cf?.classification) ? cf.classification : [];

      reset({
        asset_tag: existingAsset.asset_tag || existingAsset.asset_id || "",
        serial_number: existingAsset.serial_number || "",
        make_id: existingAsset.make_id || "",
        model: existingAsset.model || "",
        purchase_date: existingAsset.purchase_date ? new Date(existingAsset.purchase_date) : undefined as any,
        purchased_from: cf?.vendor || existingAsset.vendor?.name || "",
        vendor_id: existingAsset.vendor_id || "",
        cost: existingAsset.purchase_price?.toString() || "",
        currency: cf?.currency || preferences?.currency || "INR",
        description: existingAsset.notes || "",
        asset_configuration: cf?.asset_configuration || "",
        classification_confidential: classifications.includes("confidential"),
        classification_internal: classifications.includes("internal"),
        classification_public: classifications.includes("public"),
        site_id: cf?.site_id || "",
        location_id: existingAsset.location_id || "",
        category_id: existingAsset.category_id || "",
        department_id: existingAsset.department_id || "",
        photo_url: cf?.photo_url || null,
        status: existingAsset.status || "available",
        add_warranty: !!existingAsset.warranty_expiry,
        warranty_months: "12",
        warranty_expiry: existingAsset.warranty_expiry ? new Date(existingAsset.warranty_expiry) : null,
      });
      setHasPopulatedForm(true);
      prevCategoryRef.current = existingAsset.category_id || "";
    }
  }, [existingAsset, isEditMode, hasPopulatedForm, reset, preferences?.currency]);

  // ── Auto-calculate warranty expiry ────────────────────────────────────────
  useEffect(() => {
    if (addWarranty && purchaseDate && warrantyMonths) {
      const expiry = addMonths(purchaseDate, parseInt(warrantyMonths));
      setValue("warranty_expiry", expiry);
    } else if (!addWarranty) {
      setValue("warranty_expiry", null);
    }
  }, [addWarranty, purchaseDate, warrantyMonths, setValue]);

  // ── Filter locations by site ──────────────────────────────────────────────
  const filteredLocations = useMemo(() => {
    if (!siteId) return locations;
    return locations.filter(loc => loc.site_id === siteId || loc.site_id === null);
  }, [locations, siteId]);

  // Clear location if site changes
  useEffect(() => {
    if (siteId && locationId) {
      const belongs = filteredLocations.some(loc => loc.id === locationId);
      if (!belongs) setValue("location_id", "");
    }
  }, [siteId, locationId, filteredLocations, setValue]);

  // ── Auto-fill Asset Tag only when category changes AND tag is empty ───────
  useEffect(() => {
    if (categoryId && !isEditMode && categoryId !== prevCategoryRef.current) {
      prevCategoryRef.current = categoryId;
      const currentTag = watchedValues.asset_tag;
      if (!currentTag) {
        handleAutoFill();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, isEditMode]);

  const handleAutoFill = async () => {
    if (!categoryId) {
      toast.error("Please select a category first");
      return;
    }
    if (autoFillRef.current) return;
    autoFillRef.current = true;
    setIsAutoFilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-next-asset-id-by-category", {
        body: { category_id: categoryId },
      });
      if (error) throw error;
      if (data?.needsConfiguration) {
        toast.error(data.error || "Tag format not configured for this category", {
          action: { label: "Setup", onClick: () => navigate("/assets/setup/fields-setup") },
        });
        return;
      }
      if (data?.assetId) {
        const { data: existing } = await supabase
          .from("itam_assets")
          .select("id")
          .eq("asset_tag", data.assetId)
          .eq("is_active", true)
          .maybeSingle();
        if (existing) {
          toast.error(`Generated ID "${data.assetId}" already exists. Please enter manually or retry.`);
          return;
        }
        setValue("asset_tag", data.assetId, { shouldDirty: true });
        toast.success("Asset Tag ID generated");
      }
    } catch {
      toast.error("Failed to generate Asset Tag ID");
    } finally {
      setIsAutoFilling(false);
      autoFillRef.current = false;
    }
  };

  // ── Submit handlers ───────────────────────────────────────────────────────
  const createAsset = useMutation({
    mutationFn: async (formData: AssetFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const classifications: string[] = [];
      if (formData.classification_confidential) classifications.push("confidential");
      if (formData.classification_internal) classifications.push("internal");
      if (formData.classification_public) classifications.push("public");

      const assetId = formData.asset_tag || `AST-${Date.now()}`;

      const { data: existingTag } = await supabase
        .from("itam_assets")
        .select("id")
        .eq("asset_tag", assetId)
        .eq("is_active", true)
        .maybeSingle();
      if (existingTag) throw new Error("This Asset Tag ID is already in use.");

      // @ts-ignore
      const { error } = await supabase.from("itam_assets").insert({
        asset_id: assetId,
        asset_tag: assetId,
        name: formData.model || "Unnamed Asset",
        status: "available",
        category_id: formData.category_id || null,
        location_id: formData.location_id || null,
        department_id: formData.department_id || null,
        make_id: formData.make_id || null,
        vendor_id: formData.vendor_id || null,
        model: formData.model || null,
        serial_number: formData.serial_number || null,
        purchase_price: formData.cost ? parseFloat(formData.cost) : null,
        notes: formData.description || null,
        is_active: true,
        purchase_date: formData.purchase_date ? format(formData.purchase_date, "yyyy-MM-dd") : null,
        warranty_expiry: formData.warranty_expiry ? format(formData.warranty_expiry, "yyyy-MM-dd") : null,
        custom_fields: {
          asset_configuration: formData.asset_configuration,
          classification: classifications,
          currency: formData.currency,
          vendor: formData.purchased_from,
          photo_url: formData.photo_url,
          site_id: formData.site_id || null,
        },
      } as any);
      if (error) throw error;

      // Save currency preference
      if (formData.currency !== preferences?.currency) {
        updatePreferences.mutate({ currency: formData.currency });
      }

      // Save site/location/department preferences
      const currentNs = (preferences?.notification_settings || {}) as Record<string, any>;
      const newDefaults = {
        site_id: formData.site_id || null,
        location_id: formData.location_id || null,
        department_id: formData.department_id || null,
      };
      updatePreferences.mutate({
        notification_settings: { ...currentNs, assetDefaults: newDefaults },
      });

      // Log asset creation
      try {
        const { data: newAsset } = await supabase
          .from("itam_assets")
          .select("id")
          .eq("asset_tag", assetId)
          .eq("is_active", true)
          .maybeSingle();
        if (newAsset) {
          await supabase.from("itam_asset_history").insert({
            asset_id: newAsset.id,
            asset_tag: assetId,
            action: "created",
            new_value: assetId,
            details: {
              name: formData.model || "Unnamed Asset",
              category_id: formData.category_id || null,
              serial_number: formData.serial_number || null,
              model: formData.model || null,
              status: "available",
            },
            performed_by: user.id,
          } as any);
        }
      } catch (logErr) {
        console.error("Failed to log asset creation:", logErr);
      }
    },
    onSuccess: () => {
      toast.success("Asset created successfully");
      invalidateAllAssetQueries(queryClient);
      setTimeout(() => navigate("/assets/allassets"), 300);
    },
    onError: (error: Error) => {
      toast.error("Failed to create asset: " + error.message);
    },
  });

  const updateAsset = useMutation({
    mutationFn: async (formData: AssetFormData) => {
      if (!editAssetId) throw new Error("No asset ID provided");
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (formData.asset_tag) {
        const { data: existingTag } = await supabase
          .from("itam_assets")
          .select("id")
          .eq("asset_tag", formData.asset_tag)
          .eq("is_active", true)
          .neq("id", editAssetId)
          .maybeSingle();
        if (existingTag) throw new Error("This Asset Tag ID is already in use.");
      }

      const { data: currentAsset } = await supabase
        .from("itam_assets")
        .select("*")
        .eq("id", editAssetId)
        .single();

      const classifications: string[] = [];
      if (formData.classification_confidential) classifications.push("confidential");
      if (formData.classification_internal) classifications.push("internal");
      if (formData.classification_public) classifications.push("public");

      const newValues: Record<string, any> = {
        asset_tag: formData.asset_tag || null,
        name: formData.model || "Unnamed Asset",
        status: formData.status,
        category_id: formData.category_id || null,
        location_id: formData.location_id || null,
        department_id: formData.department_id || null,
        make_id: formData.make_id || null,
        vendor_id: formData.vendor_id || null,
        model: formData.model || null,
        serial_number: formData.serial_number || null,
        purchase_price: formData.cost ? parseFloat(formData.cost) : null,
        notes: formData.description || null,
        purchase_date: formData.purchase_date ? format(formData.purchase_date, "yyyy-MM-dd") : null,
        warranty_expiry: formData.warranty_expiry ? format(formData.warranty_expiry, "yyyy-MM-dd") : null,
        custom_fields: {
          ...((currentAsset?.custom_fields as Record<string, any>) || {}),
          asset_configuration: formData.asset_configuration,
          classification: classifications,
          currency: formData.currency,
          vendor: formData.purchased_from,
          photo_url: formData.photo_url,
          site_id: formData.site_id || null,
        },
      };

      const { error } = await supabase
        .from("itam_assets")
        .update(newValues)
        .eq("id", editAssetId);
      if (error) throw error;

      // Save currency preference
      if (formData.currency !== preferences?.currency) {
        updatePreferences.mutate({ currency: formData.currency });
      }

      // Field-level change logging
      if (currentAsset && authUser) {
        try {
          const trackedFields = [
            "name", "status", "category_id", "location_id", "department_id",
            "make_id", "serial_number", "purchase_price", "notes",
            "warranty_expiry", "model", "asset_tag", "vendor_id", "purchase_date",
          ];

          // Build FK resolver map: field -> lookup array
          const fkResolvers: Record<string, { list: { id: string; name: string }[]; label: string }> = {
            category_id: { list: categories, label: "Category" },
            location_id: { list: locations, label: "Location" },
            department_id: { list: departments, label: "Department" },
            make_id: { list: makes, label: "Make" },
            vendor_id: { list: vendors, label: "Vendor" },
          };

          const resolveName = (field: string, id: string | null): string => {
            if (!id) return "";
            const resolver = fkResolvers[field];
            if (resolver) {
              const found = resolver.list.find(item => item.id === id);
              return found?.name || id;
            }
            return id;
          };

          const changes: { field: string; old: string | null; new: string | null }[] = [];
          let statusChange: { old: string | null; new: string | null } | null = null;

          for (const field of trackedFields) {
            const oldVal = String(currentAsset[field] ?? "");
            const newVal = String(newValues[field] ?? "");
            if (oldVal !== newVal) {
              const isFk = field in fkResolvers;
              const displayOld = isFk ? resolveName(field, currentAsset[field] as string | null) : oldVal;
              const displayNew = isFk ? resolveName(field, newValues[field] as string | null) : newVal;
              const label = isFk ? fkResolvers[field].label : field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

              if (field === "status") {
                statusChange = { old: displayOld || null, new: displayNew || null };
              } else {
                changes.push({ field: label, old: displayOld || null, new: displayNew || null });
              }
            }
          }

          // Track custom_fields changes
          const oldCf = (currentAsset.custom_fields as Record<string, any>) || {};
          const newCf = newValues.custom_fields || {};
          const customFieldKeys: { key: string; label: string; resolveSite?: boolean }[] = [
            { key: "asset_configuration", label: "Asset Configuration" },
            { key: "currency", label: "Currency" },
            { key: "classification", label: "Classification" },
            { key: "site_id", label: "Site", resolveSite: true },
            { key: "photo_url", label: "Photo" },
            { key: "vendor", label: "Purchased From" },
          ];

          for (const { key, label, resolveSite } of customFieldKeys) {
            const oldRaw = oldCf[key];
            const newRaw = newCf[key];
            const oldStr = Array.isArray(oldRaw) ? oldRaw.join(", ") : String(oldRaw ?? "");
            const newStr = Array.isArray(newRaw) ? newRaw.join(", ") : String(newRaw ?? "");
            if (oldStr !== newStr) {
              let displayOld = oldStr;
              let displayNew = newStr;
              if (resolveSite) {
                displayOld = (oldRaw && sites.find(s => s.id === oldRaw)?.name) || oldStr;
                displayNew = (newRaw && sites.find(s => s.id === newRaw)?.name) || newStr;
              }
              changes.push({ field: label, old: displayOld || null, new: displayNew || null });
            }
          }

          const rowsToInsert: any[] = [];

          // Status change gets its own row (separate action type)
          if (statusChange) {
            rowsToInsert.push({
              asset_id: editAssetId,
              asset_tag: newValues.asset_tag || currentAsset.asset_tag,
              action: "status_changed",
              old_value: statusChange.old,
              new_value: statusChange.new,
              details: { field: "Status", old: statusChange.old, new: statusChange.new },
              performed_by: authUser.id,
            });
          }

          // All other field changes consolidated into one row
          if (changes.length > 0) {
            rowsToInsert.push({
              asset_id: editAssetId,
              asset_tag: newValues.asset_tag || currentAsset.asset_tag,
              action: "fields_updated",
              old_value: `${changes.length} field${changes.length > 1 ? 's' : ''} updated`,
              new_value: changes.map(c => c.field).join(", "),
              details: { changes },
              performed_by: authUser.id,
            });
          }

          if (rowsToInsert.length > 0) {
            await supabase.from("itam_asset_history").insert(rowsToInsert as any);
          }
        } catch (logErr) {
          console.error("Failed to log asset changes:", logErr);
        }
      }
    },
    onSuccess: () => {
      toast.success("Asset updated successfully");
      invalidateAllAssetQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["itam-asset-edit", editAssetId] });
      const assetTag = watchedValues.asset_tag;
      navigate(`/assets/detail/${assetTag || editAssetId}`);
    },
    onError: (error: Error) => {
      toast.error("Failed to update asset: " + error.message);
    },
  });

  const onSubmit = (data: AssetFormData) => {
    if (isEditMode) {
      updateAsset.mutate(data);
    } else {
      createAsset.mutate(data);
    }
  };

  const onInvalid = useCallback(() => {
    // Scroll to first error
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      try {
        setFocus(firstErrorField as any);
      } catch {
        const el = document.querySelector(`[name="${firstErrorField}"], #${firstErrorField}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    toast.error("Please fix the highlighted fields");
  }, [errors, setFocus]);

  const handleCancel = () => {
    if (isEditMode && editAssetId) {
      navigate(`/assets/detail/${watchedValues.asset_tag || editAssetId}`);
    } else {
      navigate("/assets/allassets");
    }
  };

  const openQuickAddDialog = (fieldType: FieldType) => {
    setQuickAddFieldType(fieldType);
    setQuickAddOpen(true);
  };

  const handleQuickAddSuccess = (id: string) => {
    const fieldMap: Record<FieldType, keyof AssetFormData> = {
      site: "site_id",
      location: "location_id",
      category: "category_id",
      department: "department_id",
      make: "make_id",
    };
    const field = fieldMap[quickAddFieldType];
    if (field) setValue(field as any, id, { shouldDirty: true });
  };

  const isPending = createAsset.isPending || updateAsset.isPending;
  const isPageLoading = isEditMode && (assetLoading || configLoading);

  // ── Ctrl+Enter keyboard shortcut ──────────────────────────────────────────
  useKeyboardShortcuts([
    {
      key: "Enter",
      ctrl: true,
      callback: () => {
        if (!isPending) rhfHandleSubmit(onSubmit, onInvalid)();
      },
    },
  ]);

  if (isPageLoading) return <AddAssetSkeleton />;

  // Helper to get error message for a field
  const err = (field: keyof AssetFormData) => errors[field]?.message;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto px-4 py-3 space-y-3">

        {/* ── Asset Details ───────────────────────────────────────────── */}
        <SectionCard title={isEditMode ? "Edit Asset Details" : "Asset Details"}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
            {/* Category */}
            <FormField label="Category" required error={err("category_id")}>
              <div className="flex gap-1.5">
                <Controller
                  name="category_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger className={cn("flex-1 h-9 text-sm transition-colors", err("category_id") && "border-destructive ring-1 ring-destructive/30")}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.length === 0 ? (
                          <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                            No categories found.{" "}
                            <Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={() => openQuickAddDialog("category")}>Add one</Button>
                          </div>
                        ) : categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => openQuickAddDialog("category")} title="Add new category" className="h-9 w-9 shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </FormField>

            {/* Asset Tag ID */}
            <FormField label="Asset Tag ID" required error={err("asset_tag")}>
              <div className="flex gap-1.5">
                <Controller
                  name="asset_tag"
                  control={control}
                  render={({ field }) => (
                    <div className="relative flex-1">
                      <Input
                        {...field}
                        id="asset_tag"
                        placeholder="Enter asset tag"
                        className={cn("h-9 text-sm pr-7 transition-colors", err("asset_tag") && "border-destructive ring-1 ring-destructive/30")}
                        disabled={isEditMode}
                      />
                      {field.value && !isEditMode && (
                        <button
                          type="button"
                          onClick={() => setValue("asset_tag", "", { shouldDirty: true })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                />
                {!isEditMode && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAutoFill}
                    disabled={isAutoFilling || !categoryId}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-3"
                    title={!categoryId ? "Select a category first" : "Auto-generate Asset Tag ID"}
                  >
                    {isAutoFilling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "AutoFill"}
                  </Button>
                )}
              </div>
            </FormField>

            {/* Serial No — always 3rd column */}
            {isEditMode ? (
              <FormField label="Status">
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_STATUS_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            ) : (
              <FormField label="Serial No" required error={err("serial_number")}>
                <Controller
                  name="serial_number"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} id="serial_number" placeholder="Enter serial number" className={cn("h-9 text-sm transition-colors", err("serial_number") && "border-destructive ring-1 ring-destructive/30")} />
                  )}
                />
              </FormField>
            )}

            {/* Serial No in edit mode goes to next row */}
            {isEditMode && (
              <FormField label="Serial No" required error={err("serial_number")}>
                <Controller
                  name="serial_number"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} id="serial_number" placeholder="Enter serial number" className={cn("h-9 text-sm transition-colors", err("serial_number") && "border-destructive ring-1 ring-destructive/30")} />
                  )}
                />
              </FormField>
            )}

            {/* Make */}
            <FormField label="Make" required error={err("make_id")}>
              <div className="flex gap-1.5">
                <Controller
                  name="make_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger className={cn("flex-1 h-9 text-sm transition-colors", err("make_id") && "border-destructive ring-1 ring-destructive/30")}>
                        <SelectValue placeholder="Select make" />
                      </SelectTrigger>
                      <SelectContent>
                        {makes.length === 0 ? (
                          <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                            No makes found.{" "}
                            <Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={() => openQuickAddDialog("make")}>Add one</Button>
                          </div>
                        ) : makes.map(make => (
                          <SelectItem key={make.id} value={make.id}>{make.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => openQuickAddDialog("make")} title="Add new make" className="h-9 w-9 shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </FormField>

            {/* Model */}
            <FormField label="Model" required error={err("model")}>
              <Controller
                name="model"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="model" placeholder="Enter model" className={cn("h-9 text-sm transition-colors", err("model") && "border-destructive ring-1 ring-destructive/30")} />
                )}
              />
            </FormField>

            {/* Purchase Date + Warranty */}
            <FormField label="Purchase Date" required error={err("purchase_date")}>
              <div className="flex items-center gap-1.5">
                <Controller
                  name="purchase_date"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal h-9 text-sm flex-1 transition-colors",
                            !field.value && "text-muted-foreground",
                            err("purchase_date") && "border-destructive ring-1 ring-destructive/30"
                          )}
                        >
                          <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                          {field.value ? format(field.value, "PP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[200]" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={date => field.onChange(date || null)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {purchaseDate && (
                  <div className="flex items-center gap-1">
                    <Controller
                      name="add_warranty"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="add_warranty"
                          checked={field.value}
                          onCheckedChange={checked => field.onChange(!!checked)}
                          className="h-3.5 w-3.5"
                        />
                      )}
                    />
                    <Label htmlFor="add_warranty" className="text-xs font-normal cursor-pointer whitespace-nowrap">Warranty</Label>
                  </div>
                )}
                {purchaseDate && addWarranty && (
                  <Controller
                    name="warranty_months"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-9 text-xs w-[90px] shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Month</SelectItem>
                          <SelectItem value="3">3 Months</SelectItem>
                          <SelectItem value="6">6 Months</SelectItem>
                          <SelectItem value="12">1 Year</SelectItem>
                          <SelectItem value="24">2 Years</SelectItem>
                          <SelectItem value="36">3 Years</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </div>
              {/* Warranty expiry display */}
              {addWarranty && watchedValues.warranty_expiry && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    Warranty expires: <span className="font-medium text-foreground">{format(watchedValues.warranty_expiry, "PP")}</span>
                  </span>
                </div>
              )}
            </FormField>

            {/* Vendor */}
            <FormField label="Vendor">
              <div className="flex gap-1.5">
                <Controller
                  name="vendor_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={val => { field.onChange(val); setValue("purchased_from", ""); }}>
                      <SelectTrigger className="flex-1 h-9 text-sm">
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.length === 0 ? (
                          <div className="px-2 py-3 text-xs text-muted-foreground text-center">No vendors found.</div>
                        ) : vendors.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </FormField>

            {/* Cost + Currency */}
            <FormField label="Cost" required error={err("cost")}>
              <div className="flex gap-1.5">
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-[100px] h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencyList.map(curr => (
                          <SelectItem key={curr.code} value={curr.code}>{curr.symbol} {curr.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Controller
                  name="cost"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="cost"
                      type="number"
                      placeholder="0.00"
                      className={cn("flex-1 h-9 text-sm transition-colors", err("cost") && "border-destructive ring-1 ring-destructive/30")}
                    />
                  )}
                />
              </div>
            </FormField>

            {/* Configuration & Description */}
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Asset Configuration">
                <Controller
                  name="asset_configuration"
                  control={control}
                  render={({ field }) => (
                    <Textarea {...field} id="asset_configuration" placeholder="Enter configuration" rows={2} className="text-sm resize-none" />
                  )}
                />
              </FormField>
              <FormField label="Description">
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Textarea {...field} id="description" placeholder="Enter asset description" rows={2} className="text-sm resize-none" />
                  )}
                />
              </FormField>
            </div>
          </div>
        </SectionCard>

        {/* ── Site, Location & Department ─────────────────────────────── */}
        <SectionCard title="Site, Location and Department">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
            {/* Site */}
            <FormField label="Site" required error={err("site_id")}>
              <div className="flex gap-1.5">
                <Controller
                  name="site_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger className={cn("flex-1 h-9 text-sm transition-colors", err("site_id") && "border-destructive ring-1 ring-destructive/30")}>
                        <SelectValue placeholder="Select site" />
                      </SelectTrigger>
                      <SelectContent>
                        {sites.length === 0 ? (
                          <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                            No sites found.{" "}
                            <Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={() => openQuickAddDialog("site")}>Add one</Button>
                          </div>
                        ) : sites.map(site => (
                          <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => openQuickAddDialog("site")} title="Add new site" className="h-9 w-9 shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </FormField>

            {/* Location */}
            <FormField label="Location" required error={err("location_id")}>
              <div className="flex gap-1.5">
                <Controller
                  name="location_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger className={cn("flex-1 h-9 text-sm transition-colors", err("location_id") && "border-destructive ring-1 ring-destructive/30")}>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredLocations.length === 0 ? (
                          <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                            No locations found.{" "}
                            <Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={() => openQuickAddDialog("location")}>Add one</Button>
                          </div>
                        ) : filteredLocations.map(loc => (
                          <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => openQuickAddDialog("location")} title="Add new location" className="h-9 w-9 shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </FormField>

            {/* Department */}
            <FormField label="Department">
              <div className="flex gap-1.5">
                <Controller
                  name="department_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger className="flex-1 h-9 text-sm">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.length === 0 ? (
                          <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                            No departments found.{" "}
                            <Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={() => openQuickAddDialog("department")}>Add one</Button>
                          </div>
                        ) : departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => openQuickAddDialog("department")} title="Add new department" className="h-9 w-9 shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </FormField>
          </div>
        </SectionCard>

        {/* ── Asset Image ────────────────────────────────────────────── */}
        <SectionCard title="Asset Image">
          <Controller
            name="photo_url"
            control={control}
            render={({ field }) => (
              <AssetPhotoSelector selectedUrl={field.value} onSelect={url => field.onChange(url)} />
            )}
          />
        </SectionCard>
      </div>

      {/* ── Sticky Action Buttons ──────────────────────────────────── */}
      <div className="sticky bottom-0 z-10 border-t border-border/80 bg-background/95 backdrop-blur-sm px-4 py-2.5 flex justify-between items-center shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono border">Ctrl+Enter</kbd> to submit
        </span>
        <div className="flex gap-2 ml-auto">
          <Button type="button" variant="outline" size="sm" onClick={handleCancel} className="min-w-[80px]">
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={rhfHandleSubmit(onSubmit, onInvalid)}
            className="min-w-[80px] bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                {isEditMode ? "Saving..." : "Submitting..."}
              </>
            ) : isEditMode ? "Save Changes" : "Submit"}
          </Button>
        </div>
      </div>

      {/* Quick Add Dialog */}
      <QuickAddFieldDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        fieldType={quickAddFieldType}
        onSuccess={handleQuickAddSuccess}
        selectedSiteId={siteId}
        sites={sites}
      />
    </div>
  );
}
