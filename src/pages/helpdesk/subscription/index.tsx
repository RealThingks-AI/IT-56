import { Outlet } from "react-router-dom";

const HelpdeskSubscriptionLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="w-full">
        <Outlet />
      </div>
    </div>
  );
};

export default HelpdeskSubscriptionLayout;
