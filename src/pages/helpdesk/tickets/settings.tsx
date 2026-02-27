import { TicketConfiguration } from "@/components/helpdesk/TicketConfiguration";

export default function TicketSettings() {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Content - no duplicate header */}
      <div className="flex-1 overflow-y-auto p-4">
        <TicketConfiguration />
      </div>
    </div>
  );
}
