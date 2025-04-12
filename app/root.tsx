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
import React, { useState, useEffect } from "react";
import { Toaster, toast } from 'react-hot-toast'; // Import Toaster and toast

// Import CSS files
import tailwindStyles from "./tailwind.css?url";
import leafletStyles from "leaflet/dist/leaflet.css?url";
import globalStylesUrl from "./styles/global.css?url";

// Import Components
import { Header } from "./components/Header";
import { MobileMenu } from "./components/MobileMenu";
import { AuthModal } from "./components/AuthModal";

// Import Firebase Auth Service
import { listenToAuthState, signOut, type AppUser } from "./services/auth.service";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" },
  { rel: "stylesheet", href: tailwindStyles },
  { rel: "stylesheet", href: leafletStyles },
  { rel: "stylesheet", href: globalStylesUrl },
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null); // Use AppUser type
  const [authInitialized, setAuthInitialized] = useState(false); // Track auth state initialization
  const location = useLocation();

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = listenToAuthState((user) => {
      setCurrentUser(user);
      setAuthInitialized(true); // Mark auth as initialized once the first check is done
       if (user) {
         console.log("User logged in:", user);
       } else {
         console.log("User logged out");
       }
    });
    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, []);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie !');
      // Auth state listener will automatically set currentUser to null
    } catch (error) {
       const message = error instanceof Error ? error.message : 'Erreur inconnue';
       toast.error(`Erreur de déconnexion: ${message}`);
    }
  };

  // Show loading or placeholder while auth state is initializing
  if (!authInitialized) {
    return (
       <html lang="fr">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <Meta />
          <Links />
        </head>
        <body className="min-h-screen bg-jdc-black flex items-center justify-center">
          <p className="text-jdc-gray-300">Chargement...</p>
          <Scripts /> {/* Include Scripts even during loading */}
        </body>
      </html>
    );
  }

  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-jdc-black text-jdc-gray-300 font-sans">
        {/* Add react-hot-toast Toaster component */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: '',
            style: {
              background: '#333', // Example: Dark background
              color: '#fff', // Example: Light text
            },
            success: {
              style: {
                background: '#10B981', // Example: Green background for success
              },
              iconTheme: {
                 primary: '#fff',
                 secondary: '#10B981',
              },
            },
            error: {
              style: {
                background: '#EF4444', // Example: Red background for error
              },
               iconTheme: {
                 primary: '#fff',
                 secondary: '#EF4444',
              },
            },
          }}
        />

        <div className="flex flex-col min-h-screen">
          <Header
            user={currentUser}
            onToggleMobileMenu={toggleMobileMenu}
            onLoginClick={openAuthModal}
            onLogoutClick={handleLogout}
          />

          <MobileMenu
            isOpen={isMobileMenuOpen}
            user={currentUser}
            onClose={toggleMobileMenu}
            onLoginClick={openAuthModal}
            onLogoutClick={handleLogout}
          />

          <main className="flex-grow p-4 md:p-6 lg:p-8">
            {/* Pass user context or data down if needed */}
            <Outlet context={{ user: currentUser }} />
          </main>
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={closeAuthModal}
          // onLoginSuccess is handled by the auth state listener now
        />

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// No need for separate ToastProvider anymore
export default function App() {
  return <AppLayout />;
}


// --- Error Boundary (Keep as is, but ensure styles are linked correctly) ---
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
