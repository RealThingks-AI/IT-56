import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  ListChecks, 
  UserPlus, 
  FolderTree, 
  MessageSquare, 
  FileText, 
  Zap,
  Settings,
  Columns
} from "lucide-react";
import { useState } from "react";
import { CannedResponsesManager } from "./CannedResponsesManager";
import { CategoriesManager } from "./CategoriesManager";
import { TicketTemplatesManager } from "./TicketTemplatesManager";
import { ColumnSettingsManager } from "./ColumnSettingsManager";

interface ConfigCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  onClick?: () => void;
  badge?: string;
  comingSoon?: boolean;
}

type ActiveManager = "none" | "canned-responses" | "categories" | "templates" | "column-settings";

export const TicketConfiguration = () => {
  const navigate = useNavigate();
  const [activeManager, setActiveManager] = useState<ActiveManager>("none");

  const configCards: ConfigCard[] = [
    {
      id: "categories",
      title: "Categories",
      description: "Manage ticket categories and subcategories for organization",
      icon: FolderTree,
      onClick: () => setActiveManager("categories"),
    },
    {
      id: "sla",
      title: "SLA Policies",
      description: "Define response and resolution time targets for tickets based on priority",
      icon: Clock,
      path: "/sla",
    },
    {
      id: "assignment-rules",
      title: "Assignment Rules",
      description: "Configure automatic ticket routing based on category, priority, or keywords",
      icon: UserPlus,
      path: "/tickets/assignment-rules",
    },
    {
      id: "automation",
      title: "Automation Rules",
      description: "Set up automated actions, notifications, and escalations",
      icon: Zap,
      path: "/automation",
    },
    {
      id: "queues",
      title: "Queues",
      description: "Manage ticket queues, assignment methods, and team workflows",
      icon: ListChecks,
      path: "/queues",
    },
    {
      id: "templates",
      title: "Ticket Templates",
      description: "Pre-fill ticket forms with common issue types and required fields",
      icon: FileText,
      onClick: () => setActiveManager("templates"),
    },
    {
      id: "canned-responses",
      title: "Canned Responses",
      description: "Create reusable response templates with shortcuts for quick replies",
      icon: MessageSquare,
      onClick: () => setActiveManager("canned-responses"),
    },
    {
      id: "column-settings",
      title: "Column Settings",
      description: "Customize visible columns and their order in ticket lists",
      icon: Columns,
      onClick: () => setActiveManager("column-settings"),
    },
  ];

  const handleCardClick = (card: ConfigCard) => {
    if (card.comingSoon) return;
    if (card.onClick) {
      card.onClick();
    } else if (card.path) {
      navigate(card.path);
    }
  };

  if (activeManager !== "none") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveManager("none")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Configuration
          </button>
        </div>
        {activeManager === "canned-responses" && <CannedResponsesManager />}
        {activeManager === "categories" && <CategoriesManager />}
        {activeManager === "templates" && <TicketTemplatesManager />}
        {activeManager === "column-settings" && <ColumnSettingsManager />}
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {configCards.map((card) => (
          <Card 
            key={card.id}
            className={`transition-all ${
              card.comingSoon 
                ? 'opacity-60 cursor-not-allowed' 
                : 'cursor-pointer hover:border-primary hover:shadow-md'
            }`}
            onClick={() => handleCardClick(card)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <card.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{card.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs leading-relaxed">
                {card.description}
              </CardDescription>
              {card.badge && (
                <Badge 
                  variant={card.comingSoon ? "outline" : "secondary"} 
                  className="mt-3 text-xs"
                >
                  {card.badge}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
