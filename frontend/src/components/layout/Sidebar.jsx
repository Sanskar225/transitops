import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Truck, UserRound, Route, Wrench, Fuel, Receipt, BarChart3, ScrollText, Users, Radar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CAN_ADMIN_ROLES } from '../../utils/constants';

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/vehicles', label: 'Vehicles', icon: Truck },
  { to: '/app/drivers', label: 'Drivers', icon: UserRound },
  { to: '/app/trips', label: 'Trips', icon: Route },
  { to: '/app/dispatch', label: 'AI Dispatch', icon: Radar },
  { to: '/app/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/app/fuel', label: 'Fuel Logs', icon: Fuel },
  { to: '/app/expenses', label: 'Expenses', icon: Receipt },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/audit', label: 'Audit Log', icon: ScrollText },
];

export default function Sidebar() {
  const { user } = useAuth();
  const items = [...NAV];
  if (user && CAN_ADMIN_ROLES.includes(user.role)) {
    items.push({ to: '/app/users', label: 'Users', icon: Users });
  }

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border bg-panel/60 h-screen sticky top-0">
      <div className="px-5 py-5 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-beacon shadow-beacon" />
        <span className="font-display font-semibold tracking-tight text-ink">TransitOps</span>
      </div>
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive ? 'bg-panel2 text-beacon' : 'text-muted hover:text-ink hover:bg-panel2'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 text-xs text-muted border-t border-border font-mono">
        v1.0 · fleet-net
      </div>
    </aside>
  );
}
