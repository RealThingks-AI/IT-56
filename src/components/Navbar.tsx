import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import appLogo from "@/assets/app-logo.png";

export const Navbar = () => {
  const { user, signOut } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={appLogo} alt="RT-IT-Hub" className="w-7 h-7 object-contain" />
          <span className="text-xl font-bold text-primary">RT-IT-Hub</span>
        </Link>
        
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/profile">
                <Button variant="ghost" size="sm">Profile</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button size="sm">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
