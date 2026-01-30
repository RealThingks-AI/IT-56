import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns";
import { cn } from "@/lib/utils";

export interface CalendarEvent {
  id: string | number;
  date: Date;
  title: string;
  type: "asset_due" | "maintenance" | "contract" | "warranty";
  assetId?: number;
}

interface DashboardCalendarProps {
  events: CalendarEvent[];
}

const EVENT_COLORS: Record<CalendarEvent["type"], string> = {
  asset_due: "bg-red-500",
  maintenance: "bg-green-500",
  contract: "bg-orange-500",
  warranty: "bg-purple-500",
};

const EVENT_LABELS: Record<CalendarEvent["type"], string> = {
  asset_due: "Asset Due",
  maintenance: "Maintenance",
  contract: "Contract",
  warranty: "Warranty",
};

export function DashboardCalendar({ events }: DashboardCalendarProps) {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(event.date, day));
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.assetId) {
      navigate(`/assets/detail/${event.assetId}`);
    } else {
      navigate(`/assets/alerts?type=${event.type}`);
    }
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-2">
        {Object.entries(EVENT_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={cn("w-2.5 h-2.5 rounded-full", EVENT_COLORS[type as CalendarEvent["type"]])} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold uppercase tracking-wide">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 bg-muted/50">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDate = isToday(day);

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[60px] p-1 border-t border-r last:border-r-0 [&:nth-child(7n)]:border-r-0",
                  !isCurrentMonth && "bg-muted/30",
                  isTodayDate && "bg-primary/5"
                )}
              >
                <div
                  className={cn(
                    "text-xs font-medium mb-1",
                    !isCurrentMonth && "text-muted-foreground",
                    isTodayDate && "text-primary font-bold"
                  )}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "text-[10px] px-1 py-0.5 rounded truncate cursor-pointer text-white",
                        EVENT_COLORS[event.type]
                      )}
                      onClick={() => handleEventClick(event)}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <Badge
                      variant="secondary"
                      className="text-[9px] h-4 px-1 cursor-pointer"
                      onClick={() => navigate(`/assets/alerts?date=${format(day, "yyyy-MM-dd")}`)}
                    >
                      +{dayEvents.length - 2} more
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
