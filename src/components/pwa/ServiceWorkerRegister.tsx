'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV !== 'development' && (window as any).serwist !== undefined) {
        (window as any).serwist.register();
      } else if (process.env.NODE_ENV === 'development') {
        // Unregister service workers in development to prevent RSC payload caching issues
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      }
    }
  }, []);

  return null;
}
