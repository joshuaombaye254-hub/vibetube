import { type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Download,
  Flame,
  Heart,
  History,
  Home,
  LayoutGrid,
  LogIn,
  Music2,
  Search,
  Settings,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/use-session";
import appIcon from "@/assets/app-icon.png";

type NavItem = { to: string; label: string; icon: typeof Home };

const SIDEBAR_MAIN: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/trending", label: "Trending", icon: Flame },
  { to: "/music", label: "Music", icon: Music2 },
  { to: "/categories", label: "Categories", icon: LayoutGrid },
];

const SIDEBAR_LIBRARY: NavItem[] = [
  { to: "/downloads", label: "Downloads", icon: Download },
  { to: "/favorites", label: "Favorites", icon: Heart },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
];

const BOTTOM_NAV: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/trending", label: "Trending", icon: Flame },
  { to: "/downloads", label: "Downloads", icon: Download },
  { to: "/profile", label: "Profile", icon: User },
];

function isActive(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 no-tap-highlight">
      <img src={appIcon} alt="" className="h-8 w-8" />
      <span className="text-lg font-extrabold tracking-tight text-foreground">
        Vibe<span className="text-gradient-primary">Tube</span>
      </span>
    </Link>
  );
}

function HeaderSearch() {
  const navigate = useNavigate();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("q");
        const query = typeof q === "string" ? q.trim() : "";
        if (query) void navigate({ to: "/search", search: { q: query } });
      }}
      className="relative hidden w-full max-w-xl md:block"
      role="search"
    >
      <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        name="q"
        type="search"
        placeholder="Search videos, channels, music…"
        autoComplete="off"
        className="h-11 w-full rounded-full border border-border bg-muted/60 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:bg-muted"
      />
    </form>
  );
}

function AccountButton() {
  const { user, loading } = useSession();
  if (loading) return <div className="h-9 w-9 rounded-full bg-muted" />;
  if (!user) {
    return (
      <Link
        to="/auth"
        className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-95"
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }
  return (
    <Link
      to="/profile"
      aria-label="Your profile"
      className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground uppercase ring-1 ring-primary/40 transition-transform hover:scale-105"
    >
      {user.email.charAt(0) || "U"}
    </Link>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  const { pathname } = useLocation();
  const active = isActive(pathname, item.to);
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors no-tap-highlight",
        active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icon className={cn("h-5 w-5", active && "text-primary")} />
      {item.label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const isAuthPage = pathname.startsWith("/auth") || pathname.startsWith("/reset-password");

  if (isAuthPage) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 lg:flex">
        <div className="px-2 pb-4">
          <Logo />
        </div>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
          {SIDEBAR_MAIN.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
          <div className="my-2 border-t border-sidebar-border" />
          {SIDEBAR_LIBRARY.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="border-t border-sidebar-border pt-3">
          <div className="px-3 pb-2 text-[11px] font-medium tracking-wider text-muted-foreground/60 uppercase">
            Account
          </div>
          <SidebarLink item={{ to: "/profile", label: "Profile", icon: User }} />
        </div>
      </aside>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md lg:pl-60">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="mx-auto flex w-full max-w-xl flex-1 justify-center">
            <HeaderSearch />
          </div>
          <div className="flex items-center gap-2 lg:ml-0">
            <Link
              to="/search"
              aria-label="Search"
              className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
            >
              <Search className="h-5 w-5" />
            </Link>
            <AccountButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-[1600px] px-4 pt-6 pb-28 sm:px-6 lg:pl-64 lg:pb-12">{children}</main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Bottom navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {BOTTOM_NAV.map((item) => {
            const active = isActive(pathname, item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors no-tap-highlight",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                    active && "bg-accent",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
