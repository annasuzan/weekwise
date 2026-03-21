import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Upload, LayoutDashboard, CalendarSync } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-accent-foreground" />
          </div>
          <span className="text-lg font-display font-bold text-foreground">WeekWise</span>
        </Link>

        <div className="flex items-center gap-1">
          <Link to="/upload">
            <Button
              variant={isActive('/upload') ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2 font-body text-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button
              variant={isActive('/dashboard') ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2 font-body text-xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="gap-2 font-body text-xs ml-2">
            <CalendarSync className="w-3.5 h-3.5" />
            Sync to Cal
          </Button>
          <Button variant="default" size="sm" className="gap-2 font-body text-xs ml-1">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-3.5 h-3.5" />
            Sign in
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
