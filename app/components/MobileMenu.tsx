import React from 'react';
import { Link, NavLink } from '@remix-run/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faUserCircle, faSignOutAlt, faSignInAlt, faTachometerAlt, faTicketAlt, faTruck, faUsers } from '@fortawesome/free-solid-svg-icons';
import { Button } from './ui/Button';
import type { AppUser } from '~/services/auth.service'; // Import AppUser type

interface MobileMenuProps {
  isOpen: boolean;
  user: AppUser | null; // Use AppUser type
  onClose: () => void;
  onLoginClick: () => void;
  onLogoutClick: () => void; // Passed from root.tsx
}

const navItems = [
  { name: 'Tableau de Bord', to: '/dashboard', icon: faTachometerAlt },
  { name: 'Tickets SAP', to: '/tickets-sap', icon: faTicketAlt },
  { name: 'Envois CTN', to: '/envois-ctn', icon: faTruck },
  { name: 'Clients', to: '/clients', icon: faUsers },
];

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, user, onClose, onLoginClick, onLogoutClick }) => {
  if (!isOpen) return null;

  const linkActiveClass = "text-jdc-yellow bg-jdc-gray-800";
  const linkInactiveClass = "text-jdc-gray-300 hover:text-white hover:bg-jdc-gray-700";
  const linkBaseClass = "flex items-center px-4 py-3 rounded-md text-base font-medium transition-colors";

  const handleLoginClick = () => {
    onLoginClick();
    onClose(); // Close menu when login is clicked
  }

  const handleLogoutClick = () => {
    onLogoutClick();
    onClose(); // Close menu when logout is clicked
  }

  return (
    <div
      className={`fixed inset-0 z-50 md:hidden ${isOpen ? 'block' : 'hidden'}`}
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-75" aria-hidden="true" onClick={onClose}></div>

      {/* Mobile Menu Panel */}
      <div className="fixed inset-y-0 left-0 w-64 bg-jdc-black shadow-xl p-4 transform transition-transform ease-in-out duration-300 translate-x-0">
        <div className="flex justify-between items-center mb-6">
          <span className="text-jdc-yellow font-bold text-lg">JDC Menu</span>
          <button
            onClick={onClose}
            className="text-jdc-gray-400 hover:text-white focus:outline-none"
            aria-label="Fermer le menu"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        {/* Navigation Links (Only show if user is logged in) */}
        {user && (
          <nav className="flex-grow space-y-2 mb-6">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose} // Close menu on link click
                className={({ isActive }) => `${linkBaseClass} ${isActive ? linkActiveClass : linkInactiveClass}`}
                prefetch="intent"
              >
                <FontAwesomeIcon icon={item.icon} className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        )}

        {/* User Info and Actions */}
        <div className="border-t border-jdc-gray-800 pt-4">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center px-4">
                <FontAwesomeIcon icon={faUserCircle} className="h-8 w-8 text-jdc-gray-400 mr-3" />
                <div>
                  <p className="text-base font-medium text-white">{user.displayName}</p>
                  <p className="text-sm font-medium text-jdc-gray-400 truncate">{user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-jdc-gray-300 hover:text-white hover:bg-jdc-gray-700"
                onClick={handleLogoutClick}
                leftIcon={<FontAwesomeIcon icon={faSignOutAlt} className="mr-3 h-5 w-5" />}
              >
                Déconnexion
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              className="w-full"
              onClick={handleLoginClick}
              leftIcon={<FontAwesomeIcon icon={faSignInAlt} />}
            >
              Connexion
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
