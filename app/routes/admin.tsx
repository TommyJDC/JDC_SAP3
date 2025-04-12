import React, { useEffect, useState, useCallback } from 'react';
import { useOutletContext, Link } from '@remix-run/react';
import type { AppUser, UserProfile } from '~/types/firestore.types';
import { Card, CardHeader, CardBody } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { EditUserModal } from '~/components/EditUserModal';
import { SignupForm } from '~/components/SignupForm'; // Import SignupForm
import {
  getAllUserProfilesSdk,
  updateUserProfileSdk
} from '~/services/firestore.service';
import { signUpAndCreateProfile } from '~/services/auth.service'; // Import signup service
import { useToast } from '~/context/ToastContext';

// Define the context type expected from the outlet (matching root.tsx)
interface OutletContext {
  user: AppUser | null;
  profile: UserProfile | null;
  loadingAuth: boolean;
}

// Define available sectors and roles here for consistency
const AVAILABLE_SECTORS = ['CHR', 'HACCP', 'Kezia', 'Tabac'];
const AVAILABLE_ROLES = ['Admin', 'Technician', 'Viewer'];

export default function AdminPanel() {
  const { user, profile, loadingAuth } = useOutletContext<OutletContext>();
  const { addToast } = useToast();

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [errorUsers, setErrorUsers] = useState<string | null>(null);

  // State for the Edit User Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // State for Signup Form
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  // Determine authorization
  useEffect(() => {
    if (loadingAuth) {
      setIsAuthorized(null);
      return;
    }
    const isAdmin = user && profile?.role?.toLowerCase() === 'admin';
    setIsAuthorized(isAdmin);
  }, [user, profile, loadingAuth]);

  // Fetch users function
  const fetchUsers = useCallback(async () => {
    console.log('[AdminPanel] Fetching user list...');
    setLoadingUsers(true);
    setErrorUsers(null);
    try {
      const fetchedUsers = await getAllUserProfilesSdk();
      console.log('[AdminPanel] User list fetched successfully:', fetchedUsers);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('[AdminPanel] Error fetching user list:', error);
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      setErrorUsers(`Impossible de charger la liste des utilisateurs: ${errorMessage}. Vérifiez les permissions Firestore ou la console.`);
      addToast("Erreur lors du chargement des utilisateurs.", "error");
    } finally {
      setLoadingUsers(false);
    }
  }, [addToast]); // Keep addToast dependency

  // Fetch users effect
  useEffect(() => {
    if (isAuthorized === true) {
      fetchUsers();
    } else if (isAuthorized === false) {
      setUsers([]);
    }
  }, [isAuthorized, fetchUsers]);

  // --- Modal Handlers ---
  const handleOpenEditModal = (userToEdit: UserProfile) => {
    console.log('[AdminPanel] Opening edit modal for user:', userToEdit.uid);
    setEditingUser(userToEdit);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    console.log('[AdminPanel] Closing edit modal.');
    setIsEditModalOpen(false);
    setEditingUser(null);
  };

  // --- Save User Handler (Edit) ---
  const handleSaveUser = async (updatedUser: UserProfile) => {
    if (!editingUser) return;
    console.log('[AdminPanel] Attempting to save user (client-side):', updatedUser.uid, updatedUser);

    const dataToUpdate: Partial<UserProfile> = {};
    if (updatedUser.displayName !== editingUser.displayName) {
      dataToUpdate.displayName = updatedUser.displayName;
    }
    if (updatedUser.role !== editingUser.role) {
      dataToUpdate.role = updatedUser.role;
    }
    const sortedCurrentSectors = [...(editingUser.secteurs || [])].sort();
    const sortedUpdatedSectors = [...(updatedUser.secteurs || [])].sort();
    if (JSON.stringify(sortedCurrentSectors) !== JSON.stringify(sortedUpdatedSectors)) {
       dataToUpdate.secteurs = updatedUser.secteurs || [];
    }

     if (Object.keys(dataToUpdate).length === 0) {
       addToast("Aucune modification détectée.", "info");
       handleCloseEditModal();
       return;
     }

    try {
      await updateUserProfileSdk(editingUser.uid, dataToUpdate);
      // Optimistic update or refetch
      // setUsers(prevUsers =>
      //   prevUsers.map(u => (u.uid === updatedUser.uid ? updatedUser : u))
      // );
      addToast("Utilisateur mis à jour avec succès.", "success");
      handleCloseEditModal();
      fetchUsers(); // Refetch user list after update
    } catch (error: any) {
      console.error("[AdminPanel] Error saving user (client-side SDK):", error);
      addToast(`Erreur lors de la mise à jour : ${error.message || 'Erreur inconnue'}`, "error");
      throw error; // Re-throw for the modal to catch
    }
  };

  // --- Signup Handler ---
  const handleSignup = async (email: string, password: string, displayName: string) => {
    console.log(`[AdminPanel] Attempting signup for: ${email}`);
    setIsSigningUp(true);
    setSignupError(null);
    try {
      const newUserProfile = await signUpAndCreateProfile(email, password, displayName);
      addToast(`Utilisateur ${newUserProfile.displayName} créé avec succès !`, "success");
      // Refresh the user list to include the new user
      fetchUsers();
      // Optionally clear form fields if SignupForm doesn't do it internally
    } catch (error: any) {
      console.error("[AdminPanel] Signup failed:", error);
      setSignupError(error.message || "Erreur inconnue lors de l'inscription.");
      addToast(`Erreur lors de la création : ${error.message || 'Erreur inconnue'}`, "error");
      // Re-throw if SignupForm needs to handle it too, but setting state here is usually enough
      // throw error;
    } finally {
      setIsSigningUp(false);
    }
  };


  // --- Render Logic ---
  if (loadingAuth || isAuthorized === null) {
    return <div className="flex justify-center items-center h-64"><p className="text-jdc-gray-400 animate-pulse">Vérification de l'accès...</p></div>;
  }

  if (!isAuthorized) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Accès Refusé</h1>
        <p className="text-jdc-gray-300">Vous n'avez pas les permissions nécessaires.</p>
        <Link to="/dashboard" className="text-jdc-yellow hover:underline mt-4 inline-block">Retour au tableau de bord</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white mb-6">Panneau d'Administration</h1>

      {/* Admin Info Card */}
      <Card>
        <CardHeader><h2 className="text-lg font-medium text-white">Informations Administrateur</h2></CardHeader>
        <CardBody>
            <p className="text-jdc-gray-300">Connecté en tant que : <span className="font-medium text-white">{profile?.email}</span></p>
            <p className="text-jdc-gray-300">Rôle : <span className="font-medium text-white">{profile?.role}</span></p>
        </CardBody>
      </Card>

      {/* Create New User Section */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-white">Créer un Nouvel Utilisateur</h2>
          <p className="mt-1 text-sm text-jdc-gray-400">Crée un compte Firebase Auth et un profil Firestore associé (Rôle par défaut: Technician).</p>
        </CardHeader>
        <CardBody>
           <div className="bg-yellow-900 border border-yellow-700 text-yellow-100 px-4 py-3 rounded relative mb-4" role="alert">
             <strong className="font-bold">Info Sécurité : </strong>
             <span className="block sm:inline">La création est initiée côté client. Assurez-vous que vos règles Firestore pour la collection `users` sont sécurisées (par ex., autoriser la création uniquement si l'utilisateur est admin, ou utiliser des règles plus complexes si nécessaire).</span>
           </div>
          <SignupForm
            onSignup={handleSignup}
            isLoading={isSigningUp}
            error={signupError}
          />
        </CardBody>
      </Card>


      {/* User Management Section */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-white">Gestion des Utilisateurs Existants</h2>
          <p className="mt-1 text-sm text-jdc-gray-400">Modifier les rôles et les secteurs des utilisateurs.</p>
        </CardHeader>
        <CardBody>
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Attention Sécurité ! </strong>
            <span className="block sm:inline">La modification des utilisateurs est effectuée côté client via SDK. Ceci est INSECURISÉ pour les opérations sensibles (changement de rôle admin) et doit être remplacé par des fonctions backend sécurisées à terme.</span>
          </div>

          {loadingUsers && <div className="text-center py-4"><p className="text-jdc-gray-400 animate-pulse">Chargement de la liste...</p></div>}
          {errorUsers && !loadingUsers && <div className="text-center py-4 text-red-400"><p>{errorUsers}</p></div>}

          {!loadingUsers && !errorUsers && users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-jdc-gray-700">
                <thead className="bg-jdc-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-jdc-gray-300 uppercase tracking-wider">Nom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-jdc-gray-300 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-jdc-gray-300 uppercase tracking-wider">Rôle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-jdc-gray-300 uppercase tracking-wider">Secteurs</th>
                    <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-jdc-card divide-y divide-jdc-gray-700">
                  {users.map((u) => (
                    <tr key={u.uid}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{u.displayName || <i className="text-jdc-gray-500">Non défini</i>}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-jdc-gray-300">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-jdc-gray-300">{u.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-jdc-gray-300">{u.secteurs?.join(', ') || <i className="text-jdc-gray-500">Aucun</i>}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEditModal(u)}
                          // disabled={u.uid === user?.uid} // Optional: Prevent editing self
                        >
                          Modifier
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loadingUsers && !errorUsers && users.length === 0 && (
            <div className="text-center py-4 text-jdc-gray-400"><p>Aucun utilisateur trouvé.</p></div>
          )}
        </CardBody>
      </Card>

      {/* Render the Edit User Modal */}
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        user={editingUser}
        onSave={handleSaveUser}
        availableRoles={AVAILABLE_ROLES}
        availableSectors={AVAILABLE_SECTORS}
      />
    </div>
  );
}
