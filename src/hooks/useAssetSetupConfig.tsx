import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Site {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Location {
  id: string;
  name: string;
  site_id: string | null;
  is_active: boolean;
  itam_sites?: { name: string } | null;
}

export interface Category {
  id: string;
  name: string;
  is_active: boolean;
  prefix?: string | null;
}

export interface Department {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Make {
  id: string;
  name: string;
  is_active: boolean;
}

export interface TagFormat {
  prefix: string;
  start_number: string;
  auto_increment: boolean;
  padding_length: number;
}

export const useAssetSetupConfig = () => {
  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ["itam-sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_sites")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return (data || []) as Site[];
    },
    staleTime: 30000,
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ["itam-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_locations")
        .select("*, itam_sites(name)")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return (data || []) as Location[];
    },
    staleTime: 30000,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["itam-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_categories")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return (data || []) as Category[];
    },
    staleTime: 30000,
  });

  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ["itam-departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_departments")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return (data || []) as Department[];
    },
    staleTime: 30000,
  });

  const { data: makes = [], isLoading: makesLoading } = useQuery({
    queryKey: ["itam-makes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_makes")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return (data || []) as Make[];
    },
    staleTime: 30000,
  });

  const { data: tagFormat } = useQuery({
    queryKey: ["itam-tag-format"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_tag_format")
        .select("*")
        .maybeSingle();
      
      if (error) throw error;
      return (data || { prefix: "AST-", start_number: "0001", auto_increment: true, padding_length: 6 }) as TagFormat;
    },
    staleTime: 30000,
  });

  // Helper functions to get ID by name (for backward compatibility)
  const getCategoryId = (name: string): string | null => {
    const cat = categories.find(c => c.name === name);
    return cat?.id || null;
  };

  const getLocationId = (name: string): string | null => {
    const loc = locations.find(l => l.name === name);
    return loc?.id || null;
  };

  const getSiteId = (name: string): string | null => {
    const site = sites.find(s => s.name === name);
    return site?.id || null;
  };

  const getDepartmentId = (name: string): string | null => {
    const dept = departments.find(d => d.name === name);
    return dept?.id || null;
  };

  const getMakeId = (name: string): string | null => {
    const make = makes.find(m => m.name === name);
    return make?.id || null;
  };

  return {
    sites,
    locations,
    categories,
    departments,
    makes,
    tagFormat,
    isLoading: sitesLoading || locationsLoading || categoriesLoading || departmentsLoading || makesLoading,
    // Helper functions for ID lookup
    getCategoryId,
    getLocationId,
    getSiteId,
    getDepartmentId,
    getMakeId,
  };
};
