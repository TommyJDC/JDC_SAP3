import React from 'react';
import { Link, NavLink } from '@remix-run/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faUserCircle, faSignOutAlt, faSignInAlt } from '@fortawesome/free-solid-svg-icons';
import { Button } from './ui/Button'; // Assuming you have a Button component

interface HeaderProps {
  user: { name: string } | null; // Replace with your actual user type
  onToggleMobileMenu: () => void;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

const navItems = [
  { name: 'Tableau de Bord', to: '/dashboard' },
  { name: 'Tickets SAP', to: '/tickets-sap' },
  { name: 'Envois CTN', to: '/envois-ctn' },
  { name: 'Clients', to: '/clients' },
];

export const Header: React.FC<HeaderProps> = ({ user, onToggleMobileMenu, onLoginClick, onLogoutClick }) => {
  const linkActiveClass = "text-jdc-yellow";
  const linkInactiveClass = "text-jdc-gray-300 hover:text-white transition-colors";

  return (
    <header className="bg-jdc-black border-b border-jdc-gray-800 py-3 px-4 md:px-6 sticky top-0 z-40">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        {/* Logo and Mobile Menu Button */}
        <div className="flex items-center">
          <Link to="/dashboard" className="text-jdc-yellow font-bold text-xl mr-6">
            JDC {/* Replace with actual Logo component/image later */}
          </Link>
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden text-jdc-gray-300 hover:text-white focus:outline-none"
            aria-label="Ouvrir le menu"
          >
            <FontAwesomeIcon icon={faBars} size="lg" />
          </button>
        </div>

        {/* Desktop Navigation */}
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

        {/* User Actions */}
        <div className="flex items-center space-x-3">
          {user ? (
            <>
              <span className="text-jdc-gray-300 hidden sm:inline">
                <FontAwesomeIcon icon={faUserCircle} className="mr-1" />
                {user.name}
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
