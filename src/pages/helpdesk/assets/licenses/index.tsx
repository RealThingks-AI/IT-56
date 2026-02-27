import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, Plus, Key, AlertTriangle, XCircle, Users,
  ChevronLeft, ChevronRight, Loader2, ArrowUpDown, ArrowUp, ArrowDown,
  MoreHorizontal, Edit, Trash2, UserPlus,
} from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { StatCard } from "@/components/helpdesk/assets/StatCard";
import { toast } from "sonner";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥", AUD: "A$", CAD: "C$",
};

const ITEMS_PER_PAGE = 50;

type SortKey = "name" | "vendor" | "type" | "seats" | "utilization" | "expiry" | "cost";
type SortDir = "asc" | "desc";

const getExpiryInfo = (expiryDate: string | null) => {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const daysUntil = differenceInDays(expiry, new Date());
  if (isPast(expiry)) return { status: "expired" as const, days: Math.abs(daysUntil) };
  if (daysUntil <= 30) return { status: "expiring" as const, days: daysUntil };
  return { status: "active" as const, days: daysUntil };
};

const SortableHead = ({ label, sortKey, currentSort, onSort }: {
  label: string; sortKey: SortKey;
  currentSort: { key: SortKey; dir: SortDir } | null;
  onSort: (key: SortKey) => void;
}) => {
  const isActive = currentSort?.key === sortKey;
  return (
    <TableHead
      className="font-medium text-xs uppercase text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          currentSort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </TableHead>
  );
};

const LicensesList = ({ embedded = false }: { embedded?: boolean }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { settings } = useSystemSettings();
  const currencySymbol = CURRENCY_SYMBOLS[settings.currency] || settings.currency;

  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ["itam-licenses-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_licenses")
        .select("*, itam_vendors(name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const deleteLicense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("itam_licenses")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("License deleted");
      queryClient.invalidateQueries({ queryKey: ["itam-licenses-list"] });
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete license"),
  });

  const handleSort = (key: SortKey) => {
    setSort(prev =>
      prev?.key === key
        ? prev.dir === "asc" ? { key, dir: "desc" } : null
        : { key, dir: "asc" }
    );
  };

  const filteredAndSorted = useMemo(() => {
    let result = licenses.filter((l) =>
      searchTerm
        ? l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.itam_vendors?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        : true
    );

    if (sort) {
      result = [...result].sort((a, b) => {
        const dir = sort.dir === "asc" ? 1 : -1;
        switch (sort.key) {
          case "name": return dir * a.name.localeCompare(b.name);
          case "vendor": return dir * (a.itam_vendors?.name || "").localeCompare(b.itam_vendors?.name || "");
          case "type": return dir * (a.license_type || "").localeCompare(b.license_type || "");
          case "seats": return dir * ((a.seats_allocated || 0) - (b.seats_allocated || 0));
          case "utilization": {
            const uA = (a.seats_allocated || 0) / (a.seats_total || 1);
            const uB = (b.seats_allocated || 0) / (b.seats_total || 1);
            return dir * (uA - uB);
          }
          case "expiry": {
            const dA = a.expiry_date ? new Date(a.expiry_date).getTime() : 0;
            const dB = b.expiry_date ? new Date(b.expiry_date).getTime() : 0;
            return dir * (dA - dB);
          }
          case "cost": return dir * ((a.cost || 0) - (b.cost || 0));
          default: return 0;
        }
      });
    }
    return result;
  }, [licenses, searchTerm, sort]);

  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
  const paginatedLicenses = useMemo(
    () => filteredAndSorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredAndSorted, currentPage]
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Stats
  const totalLicenses = licenses.length;
  const expiringSoon = licenses.filter(l => getExpiryInfo(l.expiry_date)?.status === "expiring").length;
  const expired = licenses.filter(l => getExpiryInfo(l.expiry_date)?.status === "expired").length;
  const totalSeatsUsed = licenses.reduce((acc, l) => acc + (l.seats_allocated || 0), 0);
  const totalSeatsTotal = licenses.reduce((acc, l) => acc + (l.seats_total || 1), 0);

  return (
    <div className={embedded ? "animate-fade-in" : "min-h-screen bg-background"}>
      <div className={embedded ? "space-y-4" : "p-4 space-y-4"}>
        {!embedded && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BackButton />
              <div>
                <h1 className="text-xl font-bold">License Management</h1>
                <p className="text-xs text-muted-foreground">{filteredAndSorted.length} licenses</p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate("/assets/licenses/add-license")}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add License
            </Button>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Key} value={totalLicenses} label="Total Licenses" colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
          <StatCard icon={AlertTriangle} value={expiringSoon} label="Expiring Soon" colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" />
          <StatCard icon={XCircle} value={expired} label="Expired" colorClass="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
          <StatCard icon={Users} value={`${totalSeatsUsed}/${totalSeatsTotal}`} label="Seats Used" colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
        </div>

        {/* Search + Add */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search licenses or vendors…"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          {embedded && (
            <Button size="sm" className="ml-auto" onClick={() => navigate("/assets/licenses/add-license")}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add License
            </Button>
          )}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/50">
                  <SortableHead label="License Name" sortKey="name" currentSort={sort} onSort={handleSort} />
                  <SortableHead label="Vendor" sortKey="vendor" currentSort={sort} onSort={handleSort} />
                  <SortableHead label="Type" sortKey="type" currentSort={sort} onSort={handleSort} />
                  <SortableHead label="Seats" sortKey="seats" currentSort={sort} onSort={handleSort} />
                  <SortableHead label="Utilization" sortKey="utilization" currentSort={sort} onSort={handleSort} />
                  <SortableHead label="Expiry" sortKey="expiry" currentSort={sort} onSort={handleSort} />
                  <SortableHead label="Cost" sortKey="cost" currentSort={sort} onSort={handleSort} />
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16">
                      <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Loading licenses…</p>
                    </TableCell>
                  </TableRow>
                ) : paginatedLicenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16">
                      <Key className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium text-muted-foreground">
                        {searchTerm ? "No licenses match your search" : "No licenses found"}
                      </p>
                      {!searchTerm && (
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-1 text-primary"
                          onClick={() => navigate("/assets/licenses/add-license")}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add your first license
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLicenses.map((license) => {
                    const seatsTotal = license.seats_total || 1;
                    const seatsAllocated = license.seats_allocated || 0;
                    const utilization = (seatsAllocated / seatsTotal) * 100;
                    const expiryInfo = getExpiryInfo(license.expiry_date);

                    const rowBg =
                      expiryInfo?.status === "expired"
                        ? "bg-destructive/5 hover:bg-destructive/10"
                        : expiryInfo?.status === "expiring"
                        ? "bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100/80 dark:hover:bg-amber-950/30"
                        : "hover:bg-muted/50";

                    const utilColor =
                      utilization >= 90 ? "text-destructive" :
                      utilization >= 75 ? "text-amber-600 dark:text-amber-400" :
                      "text-primary";

                    return (
                      <TableRow
                        key={license.id}
                        className={`cursor-pointer transition-colors duration-150 ${rowBg}`}
                    onClick={() => navigate(`/assets/licenses/detail/${license.id}`)}
                      >
                        <TableCell className="font-medium text-sm">{license.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{license.itam_vendors?.name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[11px] font-normal">
                            {license.license_type || "License"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {seatsAllocated}/{seatsTotal}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Progress value={utilization} className="h-1.5 flex-1" />
                            <span className={`text-xs font-medium tabular-nums w-8 text-right ${utilColor}`}>
                              {utilization.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {license.expiry_date ? (
                            <div className="inline-flex items-center gap-1.5">
                              <span className={
                                expiryInfo?.status === "expired" ? "text-destructive font-medium" :
                                expiryInfo?.status === "expiring" ? "text-amber-600 dark:text-amber-400 font-medium" :
                                "text-muted-foreground"
                              }>
                                {format(new Date(license.expiry_date), "MMM d, yyyy")}
                              </span>
                              {expiryInfo?.status === "expired" && (
                                <Badge variant="destructive" className="text-[10px] h-4 px-1.5">Expired</Badge>
                              )}
                              {expiryInfo?.status === "expiring" && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-400 text-amber-600 dark:text-amber-400">
                                  {expiryInfo.days}d
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-medium tabular-nums">
                          {license.cost ? `${currencySymbol}${license.cost.toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/assets/licenses/add-license?edit=${license.id}`)}>
                                <Edit className="h-3.5 w-3.5 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/assets/licenses/allocate?license=${license.id}`)}>
                                <UserPlus className="h-3.5 w-3.5 mr-2" />
                                Allocate Seat
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteId(license.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-xs text-muted-foreground tabular-nums">
                  {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSorted.length)} of {filteredAndSorted.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-2 tabular-nums">
                    {currentPage}/{totalPages}
                  </span>
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteId && deleteLicense.mutate(deleteId)}
        title="Delete License"
        description="Are you sure? This will deactivate the license."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};

export default LicensesList;
