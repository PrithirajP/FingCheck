import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ClerkProvider } from '@clerk/clerk-react'

// Import your publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center text-rose-500">
      <h1 className="text-2xl font-bold mb-2">Missing Clerk Publishable Key</h1>
      <p className="text-slate-400 max-w-md text-sm">
        Please ensure <code className="bg-slate-900 px-2 py-1 rounded text-amber-400">VITE_CLERK_PUBLISHABLE_KEY</code> is set in <code className="bg-slate-900 px-2 py-1 rounded text-amber-400">frontend/.env</code>.
      </p>
    </div>
  );
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <App />
      </ClerkProvider>
    </React.StrictMode>,
  );
}