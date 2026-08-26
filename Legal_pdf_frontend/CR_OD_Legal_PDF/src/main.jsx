/**
 * @file main.jsx
 * @description Application entry point for CR OD Legal PDF.
 * Bootstraps the React app by mounting the root <App /> component
 * into the DOM element with id="root" defined in index.html.
 *
 * React.StrictMode is enabled to surface potential issues
 * during development (double-invoked effects, deprecated APIs, etc.).
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'     // Global Tailwind CSS + custom animation styles
import './style.css'     // Common base layout and service styling (scoped)
import App from './App.jsx' // Root application component

// --- Backend Compatibility Interceptor ---
// If a deployed backend URL is provided via VITE_API_URL, we globally intercept 
// relative fetch requests and download links to point to the backend domain.
// This allows the frontend to work seamlessly without Vite's local proxy.
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '';

if (API_BASE_URL) {
  // 1. Intercept fetch calls
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    let [resource, config] = args;
    if (typeof resource === 'string') {
      if (resource.startsWith('/') && !resource.startsWith('/src/') && !resource.startsWith('/assets/')) {
        resource = API_BASE_URL + resource;
      } else if (resource.startsWith(window.location.origin + '/')) {
        const path = resource.replace(window.location.origin, '');
        if (path !== '/' && !path.startsWith('/#') && !path.startsWith('/src/') && !path.startsWith('/assets/')) {
          resource = API_BASE_URL + path;
        }
      }
    }
    return originalFetch(resource, config);
  };

  // 2. Intercept <a> tag clicks for dynamically generated downloads
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href && link.hasAttribute('download')) {
      if (link.href.startsWith(window.location.origin + '/')) {
        const path = link.href.replace(window.location.origin, '');
        // Exclude frontend routing hashes and static assets
        if (path !== '/' && !path.startsWith('/#') && !path.startsWith('/src/') && !path.startsWith('/assets/')) {
          link.href = API_BASE_URL + path;
        }
      }
    }
  }, true); // Use capture phase
}
// -----------------------------------------

// Mount the React component tree into the HTML root element
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
