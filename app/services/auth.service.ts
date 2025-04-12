import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
  type AuthError
} from "firebase/auth";
import { auth } from "~/firebase.config"; // Use the initialized auth instance

// Define a simpler User type for our app state
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null; // Add other relevant fields if needed
}

// --- Login ---
export const signIn = async (email: string, password: string): Promise<AppUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    // Map FirebaseUser to our AppUser type
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
    };
  } catch (error) {
    // Rethrow or handle specific Firebase auth errors
    console.error("Firebase Sign In Error:", error);
    const authError = error as AuthError;
    // Provide more specific error messages based on authError.code
    if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password') {
       throw new Error("Email ou mot de passe incorrect.");
    } else if (authError.code === 'auth/invalid-email') {
        throw new Error("Format d'email invalide.");
    }
    throw new Error("Erreur de connexion. Veuillez réessayer."); // Generic fallback
  }
};

// --- Logout ---
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Firebase Sign Out Error:", error);
    throw new Error("Erreur lors de la déconnexion.");
  }
};

// --- Auth State Listener ---
// Calls the callback whenever the user's sign-in state changes.
// Returns an unsubscribe function to clean up the listener.
export const listenToAuthState = (callback: (user: AppUser | null) => void): (() => void) => {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      // User is signed in, map to AppUser
      const appUser: AppUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        // Use email prefix as display name if displayName is null
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "Utilisateur",
      };
      callback(appUser);
    } else {
      // User is signed out
      callback(null);
    }
  });

  return unsubscribe; // Return the unsubscribe function for cleanup
};
