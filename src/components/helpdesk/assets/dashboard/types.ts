/** Shared types for the asset dashboard */

export interface DashboardAsset {
  id: string;
  asset_id: string;
  asset_tag: string | null;
  name: string;
  status: string | null;
  is_active: boolean | null;
  purchase_price: number | null;
  purchase_date: string | null;
  warranty_expiry: string | null;
  expected_return_date: string | null;
  checked_out_to: string | null;
  assigned_to: string | null;
  checked_out_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  custom_fields: Record<string, unknown> | null;
  category: { id: string; name: string } | null;
  confirmation_status: string | null;
  last_confirmed_at: string | null;
}

export interface OverdueAssignment {
  id: string;
  asset_id: string;
  expected_return_date: string | null;
  asset: {
    id: string;
    name: string;
    asset_tag: string | null;
    asset_id: string;
  };
}

export interface CheckinRecord {
  id: string;
  asset_id: string;
  asset_tag: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  details: unknown;
  performed_by: string | null;
  created_at: string | null;
  asset?: {
    id: string;
    name: string;
    asset_tag: string | null;
    asset_id: string;
    category: { name: string } | null;
  };
  user_name: string;
  performer_name: string | null;
}

export interface CheckoutRecord {
  id: string;
  name: string;
  asset_tag: string | null;
  asset_id: string;
  status: string;
  checked_out_to: string | null;
  assigned_to: string | null;
  checked_out_at: string | null;
  updated_at: string | null;
  category: { name: string } | null;
  assigned_to_name: string | null;
  location_id: string | null;
  location: { name: string; site: { name: string } | null } | null;
}

export interface RepairRecord {
  id: string;
  asset_id: string;
  issue_description: string | null;
  status: string;
  created_at: string | null;
  asset?: {
    id: string;
    name: string;
    asset_tag: string | null;
    asset_id: string;
    category: { name: string } | null;
  };
}

export interface LicenseRecord {
  id: string;
  name: string | null;
  expiry_date: string | null;
}

export interface CategoryDistItem {
  name: string;
  count: number;
  percent: number;
}
