import { ProfileCard } from "@/components/Profile/ProfileCard";
import { Eye, Database, FileText, Settings } from "lucide-react";

const Privacy = () => {
  return (
    <div className="py-4 space-y-4">
      <div>
        <h1 className="text-2xl font-normal">Privacy & personalization</h1>
        <p className="text-muted-foreground mt-1">
          Choose what info is shown and control your data
        </p>
      </div>

      <div className="grid gap-4">
        <ProfileCard
          title="Activity controls"
          description="Decide what activity is saved to your account"
          icon={
            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
              <Eye className="h-6 w-6 text-blue-600" />
            </div>
          }
          actionLabel="Manage activity controls"
        />

        <ProfileCard
          title="Data & privacy"
          description="Review and manage your data and privacy settings"
          icon={
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
              <Database className="h-6 w-6 text-green-600" />
            </div>
          }
          actionLabel="Review data settings"
        />

        <ProfileCard
          title="Personalization"
          description="Manage how your information is used to personalize your experience"
          icon={
            <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center">
              <Settings className="h-6 w-6 text-purple-600" />
            </div>
          }
          actionLabel="Manage personalization"
        />

        <ProfileCard
          title="Download your data"
          description="Create an archive with a copy of your data"
          icon={
            <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center">
              <FileText className="h-6 w-6 text-orange-600" />
            </div>
          }
          actionLabel="Download data"
        />
      </div>
    </div>
  );
};

export default Privacy;
