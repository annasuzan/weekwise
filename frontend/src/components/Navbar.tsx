import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Upload, LayoutDashboard, CalendarSync, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';

const Navbar = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const { user, loading, login, logout } = useAuth();

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

          {/* Only show Sync to Cal when logged in */}
          {user && (
            <Button variant="outline" size="sm" className="gap-2 font-body text-xs ml-2">
              <CalendarSync className="w-3.5 h-3.5" />
              Sync to Cal
            </Button>
          )}

          {/* Auth button area */}
          {loading ? (
            // Skeleton while checking session
            <div className="ml-1 w-24 h-8 rounded-md bg-muted animate-pulse" />
          ) : user ? (
            // Logged in — show avatar dropdown
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 font-body text-xs ml-2 pl-1">
                  {user.picture && user.picture.length > 0 ? (
                    <img
                        src={user.picture}
                        alt={user.name}
                        className="w-6 h-6 rounded-full object-cover flex-shrink-0"  // ← add flex-shrink-0
                        referrerPolicy="no-referrer"   // ← add this, Google images need it
                      />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-accent-foreground">
                      {user.name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                  )}
                  <span className="max-w-[100px] truncate">{user.name}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // Logged out — show Sign in button
            <Button
              onClick={login}
              variant="default"
              size="sm"
              className="gap-2 font-body text-xs ml-1"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt=""
                className="w-3.5 h-3.5"
              />
              Sign in with Google
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
