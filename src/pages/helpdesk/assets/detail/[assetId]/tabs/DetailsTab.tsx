import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { DollarSign, Info } from "lucide-react";

interface DetailsTabProps {
  asset: any;
}

export const DetailsTab = ({ asset }: DetailsTabProps) => {
  const navigate = useNavigate();

  const handleVendorClick = () => {
    if (asset.vendor?.id) {
      navigate(`/assets/vendors/detail/${asset.vendor.id}`);
    }
  };

  const currency = asset.custom_fields?.currency || 'INR';
  const symbols: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
  const sym = symbols[currency] || '₹';

  const isAssigned = !!(asset.assigned_user?.name || asset.assigned_user?.email);
  const isCheckedOut = !!(asset.checked_out_user?.name || asset.checked_out_user?.email);

  const price = asset.purchase_price || 0;
  const salvage = asset.salvage_value || 0;
  const life = asset.useful_life_years || 5;
  const annual = life > 0 ? (price - salvage) / life : 0;

  return (
    <Card className="h-full">
      <CardContent className="p-4 space-y-3">
        {/* General */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md bg-muted/50">
            <Info className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">General</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
            <div className="flex justify-between text-sm py-1 border-b border-dashed border-muted">
              <span className="text-muted-foreground">Vendor</span>
              <span
                className={`font-medium ${asset.vendor?.id ? 'text-primary hover:underline cursor-pointer' : ''}`}
                onClick={handleVendorClick}
              >
                {asset.vendor?.name || '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-dashed border-muted">
              <span className="text-muted-foreground">Serial Number</span>
              <span className="font-mono text-xs">{asset.serial_number || '—'}</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-dashed border-muted">
              <span className="text-muted-foreground">Model</span>
              <span>{asset.model || '—'}</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-dashed border-muted">
              <span className="text-muted-foreground">Make</span>
              <span>{asset.make?.name || '—'}</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-dashed border-muted">
              <span className="text-muted-foreground">Site</span>
              <span>{asset.location?.site?.name || asset.custom_fields?.site_name || '—'}</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-dashed border-muted">
              <span className="text-muted-foreground">Department</span>
              <span>{asset.department?.name || '—'}</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-dashed border-muted">
              <span className="text-muted-foreground">Assigned To</span>
              <span className="font-medium flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full ${isAssigned ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                {asset.assigned_user?.name || asset.assigned_user?.email || 'Unassigned'}
              </span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-dashed border-muted">
              <span className="text-muted-foreground">Checked Out To</span>
              <span className="font-medium flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full ${isCheckedOut ? 'bg-purple-500' : 'bg-muted-foreground/30'}`} />
                {asset.checked_out_user?.name || asset.checked_out_user?.email || 'Not checked out'}
              </span>
            </div>
          </div>
        </div>

        {/* Financial & Depreciation */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md bg-muted/50">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Financial & Depreciation</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
            <div className="flex justify-between text-sm py-1 border-b border-dashed border-muted">
              <span className="text-muted-foreground">Current Value</span>
              <span className="font-medium">
                {sym}{(asset.current_value ?? asset.purchase_price)?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-dashed border-muted">
              <span className="text-muted-foreground">Salvage Value</span>
              <span>{sym}{salvage.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-dashed border-muted">
              <span className="text-muted-foreground">Useful Life</span>
              <span>{life} years</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-dashed border-muted">
              <span className="text-muted-foreground">Depreciation Method</span>
              <span className="capitalize">{(asset.depreciation_method || 'straight_line').replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-dashed border-muted">
              <span className="text-muted-foreground">Annual Depreciation</span>
              <span className="font-medium">{sym}{annual.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>

        {/* Notes & Metadata */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1 px-1">Notes</p>
          <p className={`text-sm px-1 whitespace-pre-wrap ${asset.notes || asset.description ? 'text-foreground' : 'text-muted-foreground italic'}`}>
            {asset.notes || asset.description || 'No description provided.'}
          </p>
          <div className="flex gap-4 mt-3 px-1 text-[11px] text-muted-foreground">
            <span>Created: {asset.created_at ? format(new Date(asset.created_at), "dd/MM/yyyy HH:mm") : '—'}</span>
            <span>Updated: {asset.updated_at ? format(new Date(asset.updated_at), "dd/MM/yyyy HH:mm") : '—'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
