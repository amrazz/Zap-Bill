'use client';

import { useEffect } from 'react';

/**
 * This component automatically unregisters any active service workers 
 * when the application is running in development mode.
 * 
 * This prevents the "ghost service worker" issue where old PWA caches 
 * interfere with your development changes.
 */
export default function ServiceWorkerCleaner() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then((success) => {
              if (success) {
                console.log('Successfully unregistered stale Service Worker in development mode.');
                // Optional: Reload the page to ensure the cache is purged
                // window.location.reload();
              }
            });
          }
        });
      }
    }
  }, []);

  return null;
}
