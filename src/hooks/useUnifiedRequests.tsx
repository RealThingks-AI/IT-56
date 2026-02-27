import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RequestType = 'ticket' | 'service_request' | 'all';

/**
 * Simplified unified requests hook for single-company internal use.
 * Fetches all request data without organisation/tenant filtering.
 */
export const useUnifiedRequests = (requestType: RequestType = 'all') => {
  return useQuery({
    queryKey: ["unified-requests", requestType],
    staleTime: 60 * 1000,      // 1 minute
    gcTime: 5 * 60 * 1000,     // 5 minutes cache retention
    queryFn: async () => {
      let query = supabase
        .from("helpdesk_tickets")
        .select(`
          *,
          category:helpdesk_categories(name),
          assignee:users!helpdesk_tickets_assignee_id_fkey(name, email),
          requester:users!helpdesk_tickets_requester_id_fkey(name, email),
          created_by_user:users!helpdesk_tickets_created_by_fkey(name, email)
        `)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      // Filter by request type
      if (requestType !== 'all') {
        query = query.eq("request_type", requestType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
};

export const useUnifiedRequestsStats = () => {
  return useQuery({
    queryKey: ["unified-requests-stats"],
    staleTime: 2 * 60 * 1000,  // 2 minutes
    gcTime: 5 * 60 * 1000,     // 5 minutes cache retention
    queryFn: async () => {
      const { data: requests, count: total } = await supabase
        .from("helpdesk_tickets")
        .select("status, priority, sla_breached, sla_due_date, created_at, request_type, assignee_id", { count: "exact", head: false })
        .eq("is_deleted", false);

      // Ticket stats
      const tickets = requests?.filter(r => r.request_type === 'ticket') || [];
      const ticketOpen = tickets.filter(t => t.status === "open").length;
      const ticketInProgress = tickets.filter(t => t.status === "in_progress").length;
      const ticketOnHold = tickets.filter(t => t.status === "on_hold").length;
      const ticketResolved = tickets.filter(t => t.status === "resolved").length;
      const ticketUrgent = tickets.filter(t => t.priority === "urgent").length;
      const ticketSlaBreached = tickets.filter(t => t.sla_breached || 
        (t.sla_due_date && new Date(t.sla_due_date) < new Date() && !['resolved', 'closed'].includes(t.status))
      ).length;
      
      // Unassigned tickets (active only)
      const ticketUnassigned = tickets.filter(t => 
        !t.assignee_id && !['resolved', 'closed'].includes(t.status)
      ).length;

      // Service Request stats
      const serviceRequests = requests?.filter(r => r.request_type === 'service_request') || [];
      const srPending = serviceRequests.filter(r => r.status === "pending" || r.status === "open").length;
      const srApproved = serviceRequests.filter(r => r.status === "approved").length;
      const srInProgress = serviceRequests.filter(r => r.status === "in_progress").length;
      const srFulfilled = serviceRequests.filter(r => r.status === "fulfilled").length;
      const srUnassigned = serviceRequests.filter(r => 
        !r.assignee_id && !['fulfilled', 'closed', 'rejected'].includes(r.status)
      ).length;

      // Recent (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentTickets = requests?.filter(
        r => new Date(r.created_at) >= sevenDaysAgo
      ).length || 0;

      // All unassigned (tickets + service requests)
      const allUnassigned = (requests || []).filter(r => 
        !r.assignee_id && !['resolved', 'closed', 'fulfilled', 'rejected'].includes(r.status)
      ).length;

      // All SLA breached
      const allSlaBreached = (requests || []).filter(r => 
        r.sla_breached || 
        (r.sla_due_date && new Date(r.sla_due_date) < new Date() && !['resolved', 'closed', 'fulfilled'].includes(r.status))
      ).length;

      return {
        total: total || 0,
        unassigned: allUnassigned,
        slaBreached: allSlaBreached,
        tickets: {
          total: tickets.length,
          open: ticketOpen,
          inProgress: ticketInProgress,
          onHold: ticketOnHold,
          resolved: ticketResolved,
          urgent: ticketUrgent,
          slaBreached: ticketSlaBreached,
          unassigned: ticketUnassigned,
        },
        serviceRequests: {
          total: serviceRequests.length,
          pending: srPending,
          approved: srApproved,
          inProgress: srInProgress,
          fulfilled: srFulfilled,
          unassigned: srUnassigned,
        },
        recentTickets,
      };
    },
  });
};
