import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword, // Import user creation function
  type User as FirebaseUser,
  type AuthError
} from "firebase/auth";
import { auth } from "~/firebase.config"; // Use the initialized auth instance
import { createUserProfileSdk } from "./firestore.service"; // Import profile creation function
import type { UserProfile } from "~/types/firestore.types"; // Import UserProfile type

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

// --- Sign Up and Create Profile ---
/**
 * Creates a new user in Firebase Authentication and then creates their
 * corresponding profile document in Firestore.
 * @param email User's email
 * @param password User's password (must be >= 6 characters)
 * @param displayName User's display name
 * @returns The newly created UserProfile data from Firestore.
 */
export const signUpAndCreateProfile = async (email: string, password: string, displayName: string): Promise<UserProfile> => {
  let firebaseUser: FirebaseUser | null = null;

  try {
    // Step 1: Create user in Firebase Authentication
    console.log(`[AuthService] Attempting to create Auth user for: ${email}`);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    firebaseUser = userCredential.user;
    console.log(`[AuthService] Auth user created successfully: ${firebaseUser.uid}`);

    // Step 2: Create user profile document in Firestore
    console.log(`[AuthService] Attempting to create Firestore profile for: ${firebaseUser.uid}`);
    const newUserProfile = await createUserProfileSdk(
        firebaseUser.uid,
        firebaseUser.email!, // Email is guaranteed non-null after successful creation
        displayName,
        'Technician' // Default role
    );
    console.log(`[AuthService] Firestore profile created successfully for: ${firebaseUser.uid}`);

    // Optionally update the Auth user's display name if needed, though we store it in Firestore
    // await updateProfile(firebaseUser, { displayName: displayName });

    return newUserProfile; // Return the profile data from Firestore

  } catch (error) {
    console.error("[AuthService] Error during sign up or profile creation:", error);
    const authError = error as AuthError;

    // Handle specific Firebase Auth errors during creation
    if (authError.code === 'auth/email-already-in-use') {
      throw new Error("Cette adresse email est déjà utilisée.");
    } else if (authError.code === 'auth/invalid-email') {
      throw new Error("Format d'email invalide.");
    } else if (authError.code === 'auth/weak-password') {
      throw new Error("Le mot de passe est trop faible (minimum 6 caractères).");
    } else if (error instanceof Error && error.message.includes("Firestore")) {
        // If Firestore creation failed after Auth succeeded, we might need cleanup or specific handling.
        // For now, just rethrow the Firestore error message.
        // In a production scenario, you might want to delete the Auth user here if profile creation fails.
        console.warn(`[AuthService] Auth user ${firebaseUser?.uid} created, but Firestore profile failed.`);
        throw new Error(`Erreur lors de la création du profil: ${error.message}`);
    }
    // Generic fallback error
    throw new Error("Erreur lors de la création du compte. Veuillez réessayer.");
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
        // Use email prefix as display name if displayName is null (fallback)
        // Note: We now primarily rely on the Firestore profile for display name
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
