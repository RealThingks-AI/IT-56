import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useHelpdeskStats = () => {
  return useQuery({
    queryKey: ["helpdesk-dashboard-stats"],
    staleTime: 5 * 60 * 1000,  // 5 minutes - stats don't change frequently
    gcTime: 10 * 60 * 1000,    // 10 minutes cache retention
    queryFn: async () => {
      const { data: tickets, error } = await supabase
        .from("helpdesk_tickets")
        .select("id, status, priority, sla_breached, created_at, resolved_at, first_response_at")
        .eq("is_deleted", false);

      if (error) throw error;

      const total = tickets?.length || 0;
      const open = tickets?.filter(t => t.status === "open").length || 0;
      const inProgress = tickets?.filter(t => t.status === "in_progress").length || 0;
      const resolved = tickets?.filter(t => t.status === "resolved").length || 0;
      const closed = tickets?.filter(t => t.status === "closed").length || 0;
      const urgent = tickets?.filter(t => t.priority === "urgent").length || 0;
      const slaBreached = tickets?.filter(t => t.sla_breached).length || 0;

      // Calculate tickets created in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentTickets = tickets?.filter(
        t => new Date(t.created_at) >= sevenDaysAgo
      ).length || 0;

      // Calculate MTTR (Mean Time To Resolution) in hours
      const resolvedTickets = tickets?.filter(t => t.resolved_at) || [];
      const mttr = resolvedTickets.length > 0
        ? resolvedTickets.reduce((acc, t) => {
            const created = new Date(t.created_at).getTime();
            const resolvedAt = new Date(t.resolved_at!).getTime();
            return acc + (resolvedAt - created);
          }, 0) / resolvedTickets.length / (1000 * 60 * 60)
        : 0;

      // Calculate average first response time in hours
      const respondedTickets = tickets?.filter(t => t.first_response_at) || [];
      const avgFirstResponse = respondedTickets.length > 0
        ? respondedTickets.reduce((acc, t) => {
            const created = new Date(t.created_at).getTime();
            const responded = new Date(t.first_response_at!).getTime();
            return acc + (responded - created);
          }, 0) / respondedTickets.length / (1000 * 60 * 60)
        : 0;

      // SLA compliance rate
      const slaCompliance = total > 0
        ? Math.round(((total - slaBreached) / total) * 100)
        : 100;

      // Resolution rate
      const resolutionRate = total > 0
        ? Math.round(((resolved + closed) / total) * 100)
        : 0;

      return {
        total,
        open,
        inProgress,
        resolved,
        closed,
        urgent,
        slaBreached,
        recentTickets,
        mttr: Math.round(mttr * 10) / 10,
        avgFirstResponse: Math.round(avgFirstResponse * 10) / 10,
        slaCompliance,
        resolutionRate,
      };
    },
  });
};
