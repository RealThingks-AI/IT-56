import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, Package, FolderOpen, Building2, Loader2, X, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface SearchResults {
  assets: any[] | null;
  categories: any[] | null;
  departments: any[] | null;
  users: any[] | null;
}

export function GlobalAssetSearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ assets: null, categories: null, departments: null, users: null });
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K / ⌘K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Parallel search
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults({ assets: null, categories: null, departments: null, users: null });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const search = `%${debouncedQuery}%`;

    Promise.all([
      supabase
        .from("itam_assets")
        .select("id, asset_tag, name, status, serial_number, model, category:itam_categories(name)")
        .or(`asset_tag.ilike.${search},name.ilike.${search},serial_number.ilike.${search},model.ilike.${search}`)
        .eq("is_active", true)
        .limit(8),
      supabase
        .from("itam_categories")
        .select("id, name")
        .ilike("name", search)
        .eq("is_active", true)
        .limit(5),
      supabase
        .from("itam_departments")
        .select("id, name")
        .ilike("name", search)
        .eq("is_active", true)
        .limit(5),
      supabase
        .from("users")
        .select("id, name, email")
        .or(`name.ilike.${search},email.ilike.${search}`)
        .limit(5),
    ]).then(([assetsRes, categoriesRes, departmentsRes, usersRes]) => {
      setResults({
        assets: assetsRes.data,
        categories: categoriesRes.data,
        departments: departmentsRes.data,
        users: usersRes.data,
      });
      setIsSearching(false);
    });
  }, [debouncedQuery]);

  const handleSelect = useCallback((path: string) => {
    setShowResults(false);
    setQuery("");
    navigate(path);
  }, [navigate]);

  const handleClear = () => {
    setQuery("");
    setDebouncedQuery("");
    setResults({ assets: null, categories: null, departments: null, users: null });
    setShowResults(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowResults(false);
      inputRef.current?.blur();
    }
    if (e.key === "Enter" && query.trim().length >= 2) {
      handleSelect(`/assets/allassets?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const hasResults =
    (results.assets && results.assets.length > 0) ||
    (results.categories && results.categories.length > 0) ||
    (results.departments && results.departments.length > 0) ||
    (results.users && results.users.length > 0);

  const showDropdown = showResults && query.length >= 2;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search assets..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length >= 2) setShowResults(true);
          }}
          onFocus={() => { if (query.length >= 2) setShowResults(true); }}
          onKeyDown={handleKeyDown}
          className="pl-8 pr-16 h-8 w-[280px] text-xs"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="h-5 w-5"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          {!query && (
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 w-[400px] z-50 rounded-md border bg-popover shadow-lg overflow-hidden">
          <Command className="bg-transparent" shouldFilter={false}>
            <CommandList className="max-h-[350px]">
              {isSearching && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                </div>
              )}

              {!isSearching && !hasResults && (
                <CommandEmpty>No results found for "{debouncedQuery}"</CommandEmpty>
              )}

              {/* Assets */}
              {results.assets && results.assets.length > 0 && (
                <CommandGroup heading="Assets">
                  {results.assets.map((asset) => (
                    <CommandItem
                      key={asset.id}
                      value={`asset-${asset.asset_tag}-${asset.name}`}
                      onSelect={() => handleSelect(`/assets/detail/${asset.asset_tag}`)}
                    >
                      <Package className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm truncate">
                          {asset.asset_tag} — {asset.name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {(asset.category as any)?.name || "Uncategorized"} · {asset.status}
                          {asset.serial_number && ` · S/N: ${asset.serial_number}`}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Categories */}
              {results.categories && results.categories.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Categories">
                    {results.categories.map((cat) => (
                      <CommandItem
                        key={cat.id}
                        value={`category-${cat.name}`}
                        onSelect={() => handleSelect(`/assets/allassets?category=${encodeURIComponent(cat.name)}`)}
                      >
                        <FolderOpen className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm">{cat.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Departments */}
              {results.departments && results.departments.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Departments">
                    {results.departments.map((dept) => (
                      <CommandItem
                        key={dept.id}
                        value={`department-${dept.name}`}
                        onSelect={() => handleSelect(`/assets/allassets?department=${encodeURIComponent(dept.name)}`)}
                      >
                        <Building2 className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm">{dept.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Users */}
              {results.users && results.users.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Users">
                    {results.users.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={`user-${user.name || user.email}`}
                        onSelect={() => handleSelect(`/assets/allassets?search=${encodeURIComponent(user.name || user.email)}`)}
                      >
                        <User className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm truncate">{user.name || user.email}</span>
                          {user.name && <span className="text-xs text-muted-foreground truncate">{user.email}</span>}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Search all fallback */}
              {debouncedQuery.length >= 2 && !isSearching && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      value={`search-all-${debouncedQuery}`}
                      onSelect={() => handleSelect(`/assets/allassets?search=${encodeURIComponent(debouncedQuery)}`)}
                    >
                      <Search className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm">
                        Search all assets for "<span className="font-medium">{debouncedQuery}</span>"
                      </span>
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
