// Professional Icon Configuration for AppMaster Platform
// All icons are from lucide-react with consistent sizing and styling

import {
  Users,
  FileText,
  Briefcase,
  Calendar,
  Ticket,
  Package,
  TrendingUp,
  CreditCard,
  BarChart3,
  Clock,
  Shield,
  Settings,
  Mail,
  Phone,
  MessageSquare,
  Lock,
  Key,
  Smartphone,
  Activity,
  Eye,
  Bell,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  ArrowRight,
  User,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Search,
  Download,
  Upload,
  Filter,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  LogOut,
  Home,
  type LucideIcon,
} from "lucide-react";

// Standard icon sizes for consistency
export const ICON_SIZES = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
} as const;

// Tool icon configuration with consistent professional colors
export const TOOL_ICONS: Record<
  string,
  { icon: LucideIcon; path: string; gradient: string }
> = {
  crm: {
    icon: Users,
    path: "/crm",
    gradient: "from-blue-500 to-blue-600",
  },
  invoicing: {
    icon: FileText,
    path: "/invoicing",
    gradient: "from-emerald-500 to-emerald-600",
  },
  attendance: {
    icon: Clock,
    path: "/attendance",
    gradient: "from-amber-500 to-amber-600",
  },
  helpdesk: {
    icon: Ticket,
    path: "/helpdesk",
    gradient: "from-cyan-500 to-cyan-600",
  },
};

// Status icons for consistent status indicators
export const STATUS_ICONS = {
  success: CheckCircle2,
  warning: AlertCircle,
  error: AlertCircle,
  info: Bell,
  pending: Clock,
} as const;

// Common action icons
export const ACTION_ICONS = {
  add: Plus,
  edit: Edit,
  delete: Trash2,
  save: Save,
  cancel: X,
  search: Search,
  filter: Filter,
  download: Download,
  upload: Upload,
  more: MoreVertical,
  settings: Settings,
} as const;

// Navigation icons
export const NAV_ICONS = {
  home: Home,
  user: User,
  users: Users,
  settings: Settings,
  security: Shield,
  payments: CreditCard,
  activity: Activity,
  logout: LogOut,
} as const;

export {
  Users,
  FileText,
  Briefcase,
  Calendar,
  Ticket,
  Package,
  TrendingUp,
  CreditCard,
  BarChart3,
  Clock,
  Shield,
  Settings,
  Mail,
  Phone,
  MessageSquare,
  Lock,
  Key,
  Smartphone,
  Activity,
  Eye,
  Bell,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  ArrowRight,
  User,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Search,
  Download,
  Upload,
  Filter,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  LogOut,
  Home,
};
