import { Home, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileSidebarProps {
  activeSection: string;
}

const navigationItems = [
  { title: "About", icon: Home, id: "home" },
  { title: "Personal info", icon: User, id: "personal-info" },
  { title: "Security", icon: Shield, id: "security" },
];

export const ProfileSidebar = ({ activeSection }: ProfileSidebarProps) => {
  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", `#${id}`);
    }
  };

  return (
    <aside className="bg-background h-full w-[200px] min-w-[200px] flex-shrink-0">
      <nav className="space-y-1 px-3 py-4 h-full overflow-y-auto">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className={cn(
              "w-full flex items-center h-9 rounded-md px-3 text-sm font-medium transition-all duration-200",
              "hover:bg-accent hover:text-accent-foreground text-left",
              activeSection === item.id && "bg-primary/10 text-primary border-l-2 border-primary"
            )}
          >
            <item.icon className="h-4 w-4 mr-3" />
            <span>{item.title}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};