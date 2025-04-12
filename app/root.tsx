import { type ReactNode, useEffect, useState, Suspense } from 'react';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
  useNavigation,
  useSubmit, // Import useSubmit
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node"; // Import ActionFunctionArgs
import { json, redirect } from "@remix-run/node"; // Import redirect
import NProgress from 'nprogress';
import nProgressStyles from 'nprogress/nprogress.css?url'; // Import nprogress CSS
import globalStylesUrl from "~/styles/global.css?url"; // Import global CSS
import tailwindStylesUrl from "~/tailwind.css?url"; // Import Tailwind CSS
import leafletStylesUrl from 'leaflet/dist/leaflet.css?url'; // Import Leaflet CSS

import { Header } from "~/components/Header";
import { MobileMenu } from "~/components/MobileMenu";
import { AuthModal } from "~/components/AuthModal";
import ToastContainer from '~/components/Toast'; // Correct: Import default export
import { ToastProvider, useToast } from '~/context/ToastContext'; // Import ToastProvider and useToast
import { onAuthStateChanged, signOut } from "firebase/auth"; // Import signOut
import { auth } from "~/firebase.config"; // Import Firebase auth instance
import type { AppUser, UserProfile } from '~/types/firestore.types'; // Import types
import { getUserProfile } from '~/services/firestore.service'; // Import function to get profile

// Define links for CSS
export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwindStylesUrl },
  { rel: "stylesheet", href: globalStylesUrl },
  { rel: "stylesheet", href: nProgressStyles },
  { rel: "stylesheet", href: leafletStylesUrl }, // Add Leaflet CSS here
];

// Loader remains the same (client-side auth handling)
export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("Root Loader: Executing (no server-side auth state here).");
  return json({ profile: null }); // Return null initially
};

// --- Root Action for Logout ---
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "logout") {
    console.log("Root Action: Handling logout request.");
    // Here you would typically clear server-side session/cookie if you had one.
    // Since we rely on client-side Firebase Auth, the actual sign-out happens
    // on the client, but we redirect after the action is submitted.
    // We can't call Firebase signOut() here directly.
    return redirect("/"); // Redirect to home page after logout action
  }

  return json({ ok: false, error: "Invalid action" }, { status: 400 });
};


// Main App Component wrapped with ToastProvider
function App({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigation = useNavigation();
  const { addToast } = useToast(); // Use the toast hook
  const submit = useSubmit(); // Hook for submitting the logout action

  // NProgress loading indicator logic
  useEffect(() => {
    if (navigation.state === 'idle') NProgress.done();
    else NProgress.start();
  }, [navigation.state]);

  // State for user and profile
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true); // Track initial auth check

  // State for mobile menu and auth modal
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Firebase Auth state listener
  useEffect(() => {
    console.log("Root Effect: Setting up Firebase Auth listener.");
    setLoadingAuth(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Root Effect: onAuthStateChanged triggered.", firebaseUser);
      if (firebaseUser) {
        const appUser: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        };
        setUser(appUser);
        try {
          console.log(`Root Effect: Fetching profile for UID: ${firebaseUser.uid}`);
          const userProfile = await getUserProfile(firebaseUser.uid);
          console.log("Root Effect: Profile fetched:", userProfile);
          setProfile(userProfile);
          // Removed automatic welcome toast to avoid spamming
        } catch (error) {
          console.error("Root Effect: Error fetching user profile:", error);
          setProfile(null);
          addToast('Erreur lors de la récupération du profil utilisateur.', 'error');
        }
      } else {
        console.log("Root Effect: User signed out.");
        setUser(null);
        setProfile(null);
      }
      setLoadingAuth(false); // Auth check complete
    });

    return () => {
      console.log("Root Effect: Cleaning up Firebase Auth listener.");
      unsubscribe();
    };
  }, [addToast]);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  // --- Logout Handler ---
  const handleLogout = async () => {
    console.log("handleLogout: Attempting Firebase sign out...");
    try {
      await signOut(auth); // Sign out from Firebase on the client
      console.log("handleLogout: Firebase sign out successful.");
      // Optionally clear local state immediately if needed, though the
      // onAuthStateChanged listener should handle it.
      // setUser(null);
      // setProfile(null);
      addToast('Déconnexion réussie.', 'success');
      // Submit the logout action to the server (for potential session cleanup and redirect)
      submit({ _action: "logout" }, { method: "post", action: "/" }); // Submit to root action
    } catch (error) {
      console.error("handleLogout: Error signing out:", error);
      addToast('Erreur lors de la déconnexion.', 'error');
    }
  };


  // Determine if the current route is the dashboard
  const isDashboard = location.pathname === '/dashboard';

  return (
    <>
      <Header
        user={user}
        profile={profile} // Pass profile to Header
        onToggleMobileMenu={toggleMobileMenu}
        onLoginClick={openAuthModal}
        onLogoutClick={handleLogout} // Pass logout handler
        loadingAuth={loadingAuth} // Pass loading state
      />
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={toggleMobileMenu}
        user={user}
        profile={profile} // Pass profile to MobileMenu
        onLoginClick={openAuthModal}
        onLogoutClick={handleLogout} // Pass logout handler
        loadingAuth={loadingAuth} // Pass loading state
      />
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      <main className={`container mx-auto px-4 py-6 ${isDashboard ? 'mt-0' : 'mt-16 md:mt-20'}`}>
         {/* Pass user, profile, loadingAuth down through Outlet context */}
         <Outlet context={{ user, profile, loadingAuth }} />
      </main>
      <ToastContainer /> {/* Correct: Use the imported default component */}
    </>
  );
}


// Document structure
export default function Document() {
  return (
    <html lang="fr" className="h-full bg-jdc-blue-dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full font-sans">
        {/* Wrap the App component with ToastProvider */}
        <ToastProvider>
           {/* Use Suspense for potential lazy loading within App */}
           <Suspense fallback={<div>Chargement de l'application...</div>}>
             <App>
               {/* Outlet is now rendered inside App */}
             </App>
           </Suspense>
        </ToastProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// Error Boundary
export function ErrorBoundary() {
  // Correctly use useRouteError hook if available and applicable
  // const error = useRouteError();
  // Basic fallback for now
  return (
     <html lang="fr" className="h-full bg-jdc-blue-dark">
      <head>
        <title>Oops! Une erreur est survenue</title>
        <Meta />
        <Links />
      </head>
      <body className="h-full font-sans text-white flex flex-col items-center justify-center">
         <h1 className="text-2xl font-bold mb-4">Une erreur est survenue</h1>
         {/* Add more detailed error display if needed */}
         {/* <p>{error instanceof Error ? error.message : 'Unknown error'}</p> */}
         <p>Nous sommes désolés, quelque chose s'est mal passé.</p>
         <Scripts />
      </body>
    </html>
  );
}
