// Static helpdesk tools configuration - no database dependency
export const HELPDESK_TOOLS = [
  {
    key: "helpdesk",
    name: "Helpdesk",
    description: "Ticket management and support",
    path: "/",
  },
  {
    key: "assets",
    name: "Assets",
    description: "IT Asset Management",
    path: "/assets",
  },
  {
    key: "subscriptions",
    name: "Subscriptions",
    description: "Subscription and license management",
    path: "/subscription",
  },
  {
    key: "system-updates",
    name: "System Updates",
    description: "Windows update management",
    path: "/system-updates",
  },
  {
    key: "monitoring",
    name: "Monitoring",
    description: "System health monitoring",
    path: "/monitoring",
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