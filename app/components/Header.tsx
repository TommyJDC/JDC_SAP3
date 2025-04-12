import React from 'react';
import { Link, NavLink } from '@remix-run/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faUserCircle, faSignOutAlt, faSignInAlt } from '@fortawesome/free-solid-svg-icons';
import { Button } from './ui/Button';
import type { AppUser } from '~/services/auth.service'; // Import AppUser type

interface HeaderProps {
  user: AppUser | null; // Use AppUser type
  onToggleMobileMenu: () => void;
  onLoginClick: () => void;
  onLogoutClick: () => void; // Passed from root.tsx, already uses auth service
}

const navItems = [
  { name: 'Tableau de Bord', to: '/dashboard' },
  { name: 'Tickets SAP', to: '/tickets-sap' },
  { name: 'Envois CTN', to: '/envois-ctn' },
  { name: 'Clients', to: '/clients' },
];

const JDC_LOGO_URL = "https://www.jdc.fr/images/logo_jdc_blanc.svg";

export const Header: React.FC<HeaderProps> = ({ user, onToggleMobileMenu, onLoginClick, onLogoutClick }) => {
  const linkActiveClass = "text-jdc-yellow";
  const linkInactiveClass = "text-jdc-gray-300 hover:text-white transition-colors";

  return (
    <header className="bg-jdc-black border-b border-jdc-gray-800 py-3 px-4 md:px-6 sticky top-0 z-40">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        {/* Logo and Mobile Menu Button */}
        <div className="flex items-center">
           {/* JDC Logo */}
           <Link to={user ? "/dashboard" : "/"} className="mr-4 md:mr-6 flex-shrink-0">
             <img src={JDC_LOGO_URL} alt="JDC Logo" className="h-8 w-auto" /> {/* Adjust height as needed */}
           </Link>
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden text-jdc-gray-300 hover:text-white focus:outline-none"
            aria-label="Ouvrir le menu"
          >
            <FontAwesomeIcon icon={faBars} size="lg" />
          </button>
        </div>

        {/* Desktop Navigation (Only show if user is logged in) */}
        {user && (
          <nav className="hidden md:flex space-x-6 items-center">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `${isActive ? linkActiveClass : linkInactiveClass} font-medium`}
                prefetch="intent" // Prefetch on hover/focus
              >
                {item.name}
              </NavLink>
            ))}
          </nav>
        )}

        {/* User Actions */}
        <div className="flex items-center space-x-3">
          {user ? (
            <>
              <span className="text-jdc-gray-300 hidden sm:inline" title={user.email ?? ''}>
                <FontAwesomeIcon icon={faUserCircle} className="mr-1" />
                {user.displayName} {/* Use displayName from AppUser */}
              </span>
              <Button variant="ghost" size="sm" onClick={onLogoutClick} title="Déconnexion">
                <FontAwesomeIcon icon={faSignOutAlt} />
                <span className="sr-only sm:not-sr-only sm:ml-1">Déconnexion</span>
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={onLoginClick} leftIcon={<FontAwesomeIcon icon={faSignInAlt} />}>
              Connexion
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
