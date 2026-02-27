import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  type: "asset_due" | "maintenance" | "warranty" | "license";
  assetId?: number;
  assetTag?: string;
}

interface DashboardCalendarProps {
  events: CalendarEvent[];
}

const EVENT_COLORS: Record<CalendarEvent["type"], string> = {
  asset_due: "bg-red-500",
  maintenance: "bg-emerald-500",
  warranty: "bg-purple-500",
  license: "bg-indigo-500",
};

const EVENT_LABELS: Record<CalendarEvent["type"], string> = {
  asset_due: "Overdue",
  maintenance: "Repair",
  warranty: "Warranty",
  license: "License",
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
    if (event.assetTag) {
      navigate(`/assets/detail/${event.assetTag}`);
    } else if (event.assetId) {
      navigate(`/assets/detail/${event.assetId}`);
    } else {
      navigate(`/assets/alerts?type=${event.type}`);
    }
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col h-full">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            {!isSameMonth(currentMonth, new Date()) && (
              <Button
                variant="outline"
                size="sm"
                className="h-5 text-[10px] px-1.5"
                onClick={() => setCurrentMonth(new Date())}
              >
                Today
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden flex-1 flex flex-col">
          {/* Week Days Header */}
          <div className="grid grid-cols-7 bg-muted/50">
            {weekDays.map((day) => (
              <div
                key={day}
                className="py-1 text-center text-[10px] font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 flex-1">
            {days.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);

              return (
                <div
                  key={idx}
                  className={cn(
                    "p-1 border-t border-r last:border-r-0 [&:nth-child(7n)]:border-r-0",
                    !isCurrentMonth && "bg-muted/30",
                    isTodayDate && "bg-primary/5"
                  )}
                >
                  <div
                    className={cn(
                      "text-[11px] font-medium mb-0.5 px-0.5",
                      !isCurrentMonth && "text-muted-foreground/50",
                      isTodayDate && "text-primary font-bold"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <Tooltip key={event.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full cursor-pointer transition-transform hover:scale-125",
                                EVENT_COLORS[event.type]
                              )}
                              onClick={() => handleEventClick(event)}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p className="font-medium">{EVENT_LABELS[event.type]}</p>
                            <p className="text-muted-foreground">{event.title}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {dayEvents.length > 3 && (
                        <span
                          className="text-[8px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => navigate(`/assets/alerts?date=${format(day, "yyyy-MM-dd")}`)}
                        >
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-1.5 shrink-0">
          {Object.entries(EVENT_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={cn("w-2.5 h-2.5 rounded-full", EVENT_COLORS[type as CalendarEvent["type"]])} />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
