import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Loader2, ThumbsUp, ThumbsDown, Meh } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CSATWidgetProps {
  ticketId: number;
  ticketStatus: string;
}

export const CSATWidget = ({ ticketId, ticketStatus }: CSATWidgetProps) => {
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const queryClient = useQueryClient();

  const { data: existingRating } = useQuery({
    queryKey: ["helpdesk-csat", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_csat_ratings")
        .select("*")
        .eq("ticket_id", ticketId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: ["resolved", "closed"].includes(ticketStatus),
  });

  const submitRating = useMutation({
    mutationFn: async () => {
      if (rating === null) throw new Error("Please select a rating");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      const { error } = await supabase.from("helpdesk_csat_ratings").upsert({
        ticket_id: ticketId,
        rating,
        feedback: feedback.trim() || null,
        submitted_by: userData?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thank you for your feedback!");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-csat", ticketId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to submit feedback: " + error.message);
    },
  });

  // Only show for resolved/closed tickets
  if (!["resolved", "closed"].includes(ticketStatus)) {
    return null;
  }

  // Already rated
  if (existingRating) {
    const getRatingEmoji = (r: number) => {
      if (r >= 4) return <ThumbsUp className="h-5 w-5 text-green-500" />;
      if (r >= 3) return <Meh className="h-5 w-5 text-yellow-500" />;
      return <ThumbsDown className="h-5 w-5 text-red-500" />;
    };

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {getRatingEmoji(existingRating.rating)}
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-4 w-4",
                    star <= existingRating.rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  )}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {existingRating.rating}/5
            </span>
          </div>
          {existingRating.feedback && (
            <p className="mt-2 text-sm text-muted-foreground italic">
              "{existingRating.feedback}"
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">How was your experience?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="p-1 transition-transform hover:scale-110"
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(null)}
              onClick={() => {
                setRating(star);
                setShowFeedback(true);
              }}
            >
              <Star
                className={cn(
                  "h-8 w-8 transition-colors",
                  (hoveredRating !== null ? star <= hoveredRating : star <= (rating || 0))
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground hover:text-yellow-300"
                )}
              />
            </button>
          ))}
        </div>

        {rating !== null && (
          <p className="text-center text-sm text-muted-foreground">
            {rating === 1 && "Very unsatisfied"}
            {rating === 2 && "Unsatisfied"}
            {rating === 3 && "Neutral"}
            {rating === 4 && "Satisfied"}
            {rating === 5 && "Very satisfied"}
          </p>
        )}

        {showFeedback && (
          <div className="space-y-3">
            <Textarea
              placeholder="Any additional feedback? (optional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
            />
            <Button
              onClick={() => submitRating.mutate()}
              disabled={submitRating.isPending}
              className="w-full"
            >
              {submitRating.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Submit Feedback
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
