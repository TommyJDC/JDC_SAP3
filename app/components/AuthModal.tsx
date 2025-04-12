import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useToast } from '~/root'; // Import useToast

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userData: { name: string }) => void; // Callback on successful login
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast(); // Get showToast function

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    // --- Placeholder Login Logic ---
    // Replace this with your actual authentication API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

      if (email === 'test@jdc.fr' && password === 'password') {
        // Simulate successful login
        const userData = { name: 'Utilisateur Test' }; // Replace with actual user data from API
        onLoginSuccess(userData);
        showToast({ title: 'Succès', message: 'Connexion réussie !', type: 'success' });
        onClose(); // Close modal on success
      } else {
        throw new Error('Email ou mot de passe incorrect.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue.';
      setError(message);
      showToast({ title: 'Erreur', message: message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
    // --- End Placeholder Logic ---
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
      onClick={onClose} // Close on overlay click
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="bg-jdc-card p-6 md:p-8 rounded-lg shadow-xl relative w-full max-w-md"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-jdc-gray-400 hover:text-white focus:outline-none"
          aria-label="Fermer la modal"
        >
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>

        <h2 id="auth-modal-title" className="text-2xl font-semibold text-white mb-6 text-center">
          Connexion
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<FontAwesomeIcon icon={faEnvelope} />}
            placeholder="votreadresse@email.com"
            required
            disabled={isLoading}
          />
          <Input
            label="Mot de passe"
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<FontAwesomeIcon icon={faLock} />}
            placeholder="********"
            required
            disabled={isLoading}
          />

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>

        {/* Optional: Add links for password reset or registration */}
        {/* <div className="mt-4 text-center text-sm">
          <a href="#" className="font-medium text-jdc-yellow hover:text-yellow-300">
            Mot de passe oublié ?
          </a>
        </div> */}
      </div>
    </div>
  );
};
