import { LogOut, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export default function Topbar() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-5 sticky top-0 bg-void/90 backdrop-blur z-20">
      <div className="flex items-center gap-2 text-xs font-mono text-muted">
        {connected ? <Wifi size={14} className="text-teal" /> : <WifiOff size={14} className="text-danger" />}
        {connected ? 'LIVE' : 'OFFLINE'}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <div className="text-sm text-ink">{user?.name}</div>
          <div className="text-[11px] text-muted font-mono">{user?.role}</div>
        </div>
        <button onClick={logout} className="btn-ghost !px-2 !py-1.5" title="Log out">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
