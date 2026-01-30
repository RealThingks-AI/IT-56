import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ScheduleUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updateTitle?: string;
  onSchedule: (date: Date, time: string) => void;
}

export function ScheduleUpdateDialog({ 
  open, 
  onOpenChange, 
  updateTitle,
  onSchedule 
}: ScheduleUpdateDialogProps) {
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState<string>("02:00");

  const handleSchedule = () => {
    if (date && time) {
      onSchedule(date, time);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Update</DialogTitle>
        </DialogHeader>

        {updateTitle && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Scheduling update: <span className="font-semibold text-foreground">{updateTitle}</span>
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label>Select Date</Label>
            <div className="mt-2">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>
          </div>

          <div>
            <Label>Select Time</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="00:00">12:00 AM</SelectItem>
                <SelectItem value="01:00">1:00 AM</SelectItem>
                <SelectItem value="02:00">2:00 AM (Recommended)</SelectItem>
                <SelectItem value="03:00">3:00 AM</SelectItem>
                <SelectItem value="04:00">4:00 AM</SelectItem>
                <SelectItem value="12:00">12:00 PM</SelectItem>
                <SelectItem value="18:00">6:00 PM</SelectItem>
                <SelectItem value="22:00">10:00 PM</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Off-peak hours recommended to minimize disruption
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={!date}>
            Schedule Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
