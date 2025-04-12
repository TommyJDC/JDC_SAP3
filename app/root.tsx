import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData, // Import useLoaderData
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node"; // Import LoaderFunctionArgs
import { json } from "@remix-run/node"; // Import json
import stylesheet from "~/tailwind.css?url";
import globalStyles from "~/styles/global.css?url";
import leafletStylesheetUrl from "leaflet/dist/leaflet.css?url"; // Import Leaflet CSS
import { Header } from "~/components/Header";
import { Toaster } from "react-hot-toast";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "~/firebase.config"; // Import auth from your config
import type { AppUser } from "~/types/firestore.types"; // Import AppUser type

export const links: LinksFunction = () => [
  // Tailwind base/components/utilities
  { rel: "stylesheet", href: stylesheet },
  // Your custom global styles
  { rel: "stylesheet", href: globalStyles },
  // Leaflet CSS - Load AFTER Tailwind/Global to ensure its styles take precedence if needed
  { rel: "stylesheet", href: leafletStylesheetUrl },
  // Add other global links like favicons here
];

// Loader function to provide environment variables or other server-side data
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Example: Provide Firebase config keys needed on the client
  // Ensure these are safe to expose publicly!
  // return json({
  //   ENV: {
  //     FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
  //     // Add other keys if needed by firebase.config.ts on the client
  //   }
  // });
  // For now, return empty object if no env vars needed directly by client config
   return json({});
};


export function Layout({ children }: { children: React.ReactNode }) {
  // const data = useLoaderData<typeof loader>(); // Get loader data if needed
  const [user, setUser] = useState<AppUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true); // Add loading state

  useEffect(() => {
    console.log("Root Layout: Setting up Auth Listener...");
    setLoadingAuth(true); // Start loading
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log("Root Layout: User Logged In", firebaseUser.uid);
        // Map the Firebase user to your AppUser type
        const appUser: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          // Add any other fields you need from the firebaseUser
        };
        setUser(appUser);
      } else {
        console.log("Root Layout: User Logged Out");
        setUser(null);
      }
       setLoadingAuth(false); // Finish loading
    });

    // Cleanup subscription on unmount
    return () => {
      console.log("Root Layout: Cleaning up Auth Listener.");
      unsubscribe();
    }
  }, []); // Empty dependency array ensures this runs only once on mount


  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      {/* Changed bg-jdc-dark to bg-jdc-black */}
      <body className="bg-jdc-black text-white font-sans">
        <Toaster position="bottom-center" />
        <Header user={user} loadingAuth={loadingAuth} /> {/* Pass user and loading state */}
        <main className="p-4 md:p-6 lg:p-8">
           {/* Pass user down through Outlet context */}
           {/* Only render Outlet once auth state is determined */}
           {!loadingAuth ? <Outlet context={{ user }} /> : (
             <div className="flex justify-center items-center h-64">
                <p className="text-jdc-gray-400">Chargement de l'authentification...</p>
             </div>
           )}
        </main>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
