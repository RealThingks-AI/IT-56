import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-muted border-t border-border py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold text-foreground mb-3">RT-IT-Hub</h3>
            <p className="text-sm text-muted-foreground">
              Your complete IT management solution.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-muted-foreground hover:text-foreground">Home</Link></li>
              <li><Link to="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-3">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/report-issue" className="text-muted-foreground hover:text-foreground">Report Issue</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="#" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link></li>
              <li><Link to="#" className="text-muted-foreground hover:text-foreground">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} RT-IT-Hub. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
