import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RequestType = 'ticket' | 'service_request' | 'all';

export const useUnifiedRequests = (requestType: RequestType = 'all') => {
  return useQuery({
    queryKey: ["unified-requests", requestType],
    staleTime: 60 * 1000,      // 1 minute - tickets change more often
    gcTime: 5 * 60 * 1000,     // 5 minutes cache retention
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userData } = await supabase
        .from("users")
        .select("organisation_id, id")
        .eq("auth_user_id", user.id)
        .single();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .maybeSingle();

      const tenantId = profileData?.tenant_id || 1;
      const orgId = userData?.organisation_id;

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

      if (orgId) {
        query = query.eq("organisation_id", orgId);
      } else {
        query = query.eq("tenant_id", tenantId);
      }

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userData } = await supabase
        .from("users")
        .select("organisation_id")
        .eq("auth_user_id", user.id)
        .single();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .maybeSingle();

      const tenantId = profileData?.tenant_id || 1;
      const orgId = userData?.organisation_id;

      let query = supabase
        .from("helpdesk_tickets")
        .select("status, priority, sla_breached, created_at, request_type", { count: "exact", head: false })
        .eq("is_deleted", false);

      if (orgId) {
        query = query.eq("organisation_id", orgId);
      } else {
        query = query.eq("tenant_id", tenantId);
      }

      const { data: requests, count: total } = await query;

      // Ticket stats
      const tickets = requests?.filter(r => r.request_type === 'ticket') || [];
      const ticketOpen = tickets.filter(t => t.status === "open").length;
      const ticketInProgress = tickets.filter(t => t.status === "in_progress").length;
      const ticketResolved = tickets.filter(t => t.status === "resolved").length;
      const ticketUrgent = tickets.filter(t => t.priority === "urgent").length;
      const ticketSlaBreached = tickets.filter(t => t.sla_breached).length;

      // Service Request stats
      const serviceRequests = requests?.filter(r => r.request_type === 'service_request') || [];
      const srPending = serviceRequests.filter(r => r.status === "pending").length;
      const srApproved = serviceRequests.filter(r => r.status === "approved").length;
      const srInProgress = serviceRequests.filter(r => r.status === "in_progress").length;
      const srFulfilled = serviceRequests.filter(r => r.status === "fulfilled").length;

      // Recent (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentTickets = requests?.filter(
        r => new Date(r.created_at) >= sevenDaysAgo
      ).length || 0;

      return {
        total: total || 0,
        tickets: {
          total: tickets.length,
          open: ticketOpen,
          inProgress: ticketInProgress,
          resolved: ticketResolved,
          urgent: ticketUrgent,
          slaBreached: ticketSlaBreached,
        },
        serviceRequests: {
          total: serviceRequests.length,
          pending: srPending,
          approved: srApproved,
          inProgress: srInProgress,
          fulfilled: srFulfilled,
        },
        recentTickets,
      };
    },
  });
};
