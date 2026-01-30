import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { 
  FileText, 
  Clock, 
  Ticket, 
  BarChart3,
  Mail
} from "lucide-react";

const modules = [
  { 
    category: "Finance", 
    color: "from-blue-500 to-cyan-500",
    items: [
      { name: "Invoicing", icon: FileText, path: "/invoicing" }
    ]
  },
  { 
    category: "HR", 
    color: "from-purple-500 to-pink-500",
    items: [
      { name: "Attendance", icon: Clock, path: "/attendance" }
    ]
  },
  { 
    category: "IT", 
    color: "from-cyan-500 to-blue-500",
    items: [
      { name: "HelpDesk", icon: Ticket, path: "/helpdesk" }
    ]
  },
  { 
    category: "Sales", 
    color: "from-indigo-500 to-purple-500",
    items: [
      { name: "CRM", icon: BarChart3, path: "/crm" }
    ]
  },
  { 
    category: "Custom", 
    color: "from-gray-500 to-slate-500",
    items: [
      { name: "Contact Us", icon: Mail, path: "/contact" }
    ]
  }
];

const ModuleGrid = () => {
  return (
    <section className="py-12 md:py-16 lg:py-20 px-4">
      <div className="w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {modules.map((module, idx) => (
            <Card 
              key={module.category}
              className="group relative overflow-hidden border-border bg-card hover:shadow-lg transition-all duration-300 animate-fade-in hover:scale-105"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-b ${module.color} flex items-center justify-center`}>
                <span className="text-white font-semibold text-sm writing-mode-vertical">
                  {module.category}
                </span>
              </div>
              <div className="pl-16 pr-6 py-6 space-y-3">
                {module.items.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="flex items-center gap-3 text-foreground hover:text-primary transition-colors group/item"
                  >
                    <item.icon className="w-5 h-5 text-muted-foreground group-hover/item:text-primary transition-colors" />
                    <span className="text-sm font-medium group-hover/item:translate-x-1 transition-transform duration-200">
                      {item.name}
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ModuleGrid;
