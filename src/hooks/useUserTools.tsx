// Static helpdesk tools configuration - no database dependency
export const HELPDESK_TOOLS = [
  {
    key: "helpdesk",
    name: "Helpdesk",
    description: "Ticket management and support",
    path: "/helpdesk",
  },
  {
    key: "assets",
    name: "Assets",
    description: "IT Asset Management",
    path: "/helpdesk/assets",
  },
  {
    key: "subscriptions",
    name: "Subscriptions",
    description: "Subscription and license management",
    path: "/helpdesk/subscription",
  },
  {
    key: "system-updates",
    name: "System Updates",
    description: "Windows update management",
    path: "/helpdesk/system-updates",
  },
  {
    key: "monitoring",
    name: "Monitoring",
    description: "System health monitoring",
    path: "/helpdesk/monitoring",
  },
];

export const useUserTools = () => {
  // Return static helpdesk tools - no database calls needed
  return {
    allTools: HELPDESK_TOOLS,
    userTools: HELPDESK_TOOLS,
    isLoading: false,
    assignTool: { mutate: () => {}, isPending: false },
    unassignTool: { mutate: () => {}, isPending: false },
    bulkAssignTools: { mutate: () => {}, isPending: false },
  };
};