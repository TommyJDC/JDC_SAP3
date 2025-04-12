import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
  useLocation,
} from "@remix-run/react";
import type { LinksFunction, MetaFunction } from "@remix-run/node";
import React, { useState, useEffect, createContext, useContext } from "react";

// Import CSS files
import tailwindStyles from "./tailwind.css?url";
import leafletStyles from "leaflet/dist/leaflet.css?url";
import globalStylesUrl from "./styles/global.css?url";

// Import Components
import { Header } from "./components/Header";
import { MobileMenu } from "./components/MobileMenu";
import { AuthModal } from "./components/AuthModal";
import { Toast } from "./components/Toast";

// --- Toast Context ---
interface ToastMessage {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastContextType {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  hideToast: (id: number) => void;
  toasts: ToastMessage[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdCounter = React.useRef(0);

  const showToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = toastIdCounter.current++;
    setToasts((prevToasts) => [...prevToasts, { ...toast, id }]);
    // Auto-hide after 5 seconds (adjust as needed)
    setTimeout(() => hideToast(id), 5000);
  };

  const hideToast = (id: number) => {
    setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
// --- End Toast Context ---


export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" },
  { rel: "stylesheet", href: tailwindStyles },
  { rel: "stylesheet", href: leafletStyles },
  { rel: "stylesheet", href: globalStylesUrl },
  // Add favicon link if you have one in public/
  // { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
];

export const meta: MetaFunction = () => {
  return [
    { title: "JDC Dashboard" },
    { name: "description", content: "JDC Technical Management Dashboard" },
  ];
};


function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // Example state
  const { toasts, hideToast } = useToast();
  const location = useLocation();

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Example user state (replace with actual auth logic later)
  const [user, setUser] = useState<{ name: string } | null>(null);
  const handleLogin = () => setUser({ name: "Utilisateur Test" }); // Placeholder
  const handleLogout = () => setUser(null); // Placeholder

  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-jdc-black text-jdc-gray-300 font-sans">
        <div className="flex flex-col min-h-screen">
          <Header
            user={user}
            onToggleMobileMenu={toggleMobileMenu}
            onLoginClick={openAuthModal} // Or directly handleLogin if modal is simple
            onLogoutClick={handleLogout}
          />

          <MobileMenu
            isOpen={isMobileMenuOpen}
            user={user}
            onClose={toggleMobileMenu}
            onLoginClick={openAuthModal}
            onLogoutClick={handleLogout}
          />

          <main className="flex-grow p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={closeAuthModal}
          onLoginSuccess={handleLogin} // Pass login success handler
        />

        {/* Toast Container */}
        <div className="fixed bottom-5 right-5 z-[1000] space-y-2">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              title={toast.title}
              message={toast.message}
              type={toast.type}
              onClose={() => hideToast(toast.id)}
            />
          ))}
        </div>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppLayout />
    </ToastProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (process.env.NODE_ENV === 'development') {
    console.error(error);
  }

  let errorMessage = "Une erreur inattendue est survenue.";
  let errorStatus = 500;
  let errorTitle = "Oops!";

  if (isRouteErrorResponse(error)) {
    errorMessage = error.data?.message || error.statusText || "Erreur serveur";
    errorStatus = error.status;
    errorTitle = `Erreur ${errorStatus}`;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <html lang="fr">
      <head>
        <title>{errorTitle}</title>
        <Meta />
        <Links />
        {/* Ensure styles are loaded even on error page */}
        <link rel="stylesheet" href={tailwindStyles} />
        <link rel="stylesheet" href={globalStylesUrl} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" />
      </head>
      <body className="min-h-screen bg-jdc-black text-jdc-gray-300 font-sans flex items-center justify-center p-4">
        <div className="text-center p-8 bg-jdc-card rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-4xl font-bold text-jdc-yellow mb-4">{errorTitle}</h1>
          <p className="text-xl text-jdc-gray-300 mb-6">{errorMessage}</p>
          <a href="/" className="inline-block bg-jdc-yellow text-jdc-black px-6 py-2 rounded font-semibold hover:bg-yellow-300 transition-colors">
            Retour à l'accueil
          </a>
          {process.env.NODE_ENV === 'development' && error instanceof Error && (
            <pre className="mt-6 p-4 bg-gray-800 text-left text-sm text-red-400 rounded overflow-auto">
              {error.stack}
            </pre>
          )}
        </div>
        <Scripts />
      </body>
    </html>
  );
}
