import { useEffect, useState } from 'react';
import { analyticsApi } from '../api/resources';
import { useSocketEvent } from '../context/SocketContext';

/**
 * Signature element (per design brief): a control-tower-style ticker of live
 * fleet telemetry. Ties the "real-time network" thesis to an actual number
 * that updates as sockets fire, rather than a decorative marquee.
 */
export default function BeaconTicker({ authenticated = false }) {
  const [stats, setStats] = useState(null);

  const refresh = async () => {
    try {
      const res = await analyticsApi.fleetUtilization();
      setStats(res.data);
    } catch {
      // Ticker is decorative on the public landing page - fail silently.
    }
  };

  useEffect(() => { if (authenticated) refresh(); }, [authenticated]);
  useSocketEvent('vehicle.updated', () => authenticated && refresh());

  const items = stats
    ? [
        `${stats.onTrip} VEHICLES ON ROUTE`,
        `${stats.totalActive} ACTIVE FLEET`,
        `${stats.utilizationPct}% UTILIZATION`,
      ]
    : ['LIVE FLEET NETWORK', 'REAL-TIME DISPATCH', 'ZERO RACE CONDITIONS'];

  const track = [...items, ...items];

  return (
    <div className="overflow-hidden border-y border-beacon-dim/30 bg-black/40 backdrop-blur-sm">
      <div className="flex whitespace-nowrap ticker-track py-2">
        {track.map((t, i) => (
          <span key={i} className="mx-6 font-mono text-xs tracking-widest text-beacon/80 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-beacon animate-pulse" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
