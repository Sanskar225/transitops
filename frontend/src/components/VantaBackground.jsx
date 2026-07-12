import { useEffect, useRef } from 'react';

const THREE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
const VANTA_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/vanta/0.5.24/vanta.net.min.js';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Renders the animated constellation/network background used across
 * TransitOps's public-facing screens (landing, login, register) — an
 * intentional visual metaphor: dots = vehicles/drivers, connecting lines =
 * live routes, matching the "real-time fleet network" thesis of the product.
 *
 * Config values below mirror the reference exactly: color 0xf2e4e9,
 * backgroundColor 0x0, points 20, maxDistance 10, spacing 20, showDots true.
 */
export default function VantaBackground({ className = '', children }) {
  const hostRef = useRef(null);
  const effectRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await loadScript(THREE_SRC);
        await loadScript(VANTA_SRC);
        if (cancelled || !hostRef.current || !window.VANTA) return;

        effectRef.current = window.VANTA.NET({
          el: hostRef.current,
          THREE: window.THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
          color: 0xf2e4e9,
          backgroundColor: 0x0,
          points: 20.0,
          maxDistance: 10.0,
          spacing: 20.0,
          showDots: true,
        });
      } catch {
        // If the CDN is unreachable, the page still works - just shows the
        // solid void-black background instead of the animated net.
      }
    }

    init();
    return () => {
      cancelled = true;
      if (effectRef.current && effectRef.current.destroy) effectRef.current.destroy();
    };
  }, []);

  return (
    <div ref={hostRef} className={`relative bg-void ${className}`}>
      {children}
    </div>
  );
}
