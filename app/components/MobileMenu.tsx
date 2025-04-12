import React from 'react';
import { NavLink } from '@remix-run/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faUserCircle, faSignOutAlt, faSignInAlt } from '@fortawesome/free-solid-svg-icons';
import { Button } from './ui/Button';

interface MobileMenuProps {
  isOpen: boolean;
  user: { name: string } | null; // Replace with your actual user type
  onClose: () => void;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

const navItems = [
  { name: 'Tableau de Bord', to: '/dashboard' },
  { name: 'Tickets SAP', to: '/tickets-sap' },
  { name: 'Envois CTN', to: '/envois-ctn' },
  { name: 'Clients', to: '/clients' },
];

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, user, onClose, onLoginClick, onLogoutClick }) => {
  if (!isOpen) return null;

  const linkActiveClass = "text-jdc-yellow bg-jdc-gray-800";
  const linkInactiveClass = "text-jdc-gray-300 hover:text-white hover:bg-jdc-gray-800";
  const linkBaseClass = "block px-3 py-2 rounded-md text-base font-medium transition-colors";

  const handleLogin = () => {
    onLoginClick();
    onClose(); // Close menu after clicking login
  };

  const handleLogout = () => {
    onLogoutClick();
    onClose(); // Close menu after clicking logout
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 z-50 md:hidden"
      onClick={onClose} // Close on overlay click
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed top-0 left-0 h-full w-64 bg-jdc-black shadow-xl p-4 transform transition-transform ease-in-out duration-300"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside menu
      >
        {/* Menu Header */}
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

        {/* Navigation Links */}
        <nav className="flex flex-col space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose} // Close menu on link click
              className={({ isActive }) => `${linkBaseClass} ${isActive ? linkActiveClass : linkInactiveClass}`}
              prefetch="intent"
            >
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* User Actions */}
        <div className="mt-6 pt-6 border-t border-jdc-gray-800">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center px-3 text-jdc-gray-300">
                <FontAwesomeIcon icon={faUserCircle} className="mr-2" />
                <span>{user.name}</span>
              </div>
              <Button variant="secondary" size="sm" onClick={handleLogout} className="w-full" leftIcon={<FontAwesomeIcon icon={faSignOutAlt} />}>
                Déconnexion
              </Button>
            </div>
          ) : (
            <Button variant="primary" size="sm" onClick={handleLogin} className="w-full" leftIcon={<FontAwesomeIcon icon={faSignInAlt} />}>
              Connexion
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
