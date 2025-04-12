import React from 'react';
import { Link, NavLink } from '@remix-run/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faUserCircle, faSignOutAlt, faSignInAlt, faCog } from '@fortawesome/free-solid-svg-icons'; // faCog is already imported
import { Button } from './ui/Button';
import type { AppUser } from '~/services/auth.service';
import type { UserProfile } from '~/types/firestore.types'; // Import UserProfile

interface HeaderProps {
  user: AppUser | null;
  profile: UserProfile | null; // Renamed from userProfile for consistency with root.tsx context
  onToggleMobileMenu: () => void;
  onLoginClick: () => void;
  // Add onLogoutClick prop if it's missing from the interface
  onLogoutClick?: () => void; // Make optional or ensure it's always passed
  loadingAuth: boolean; // Add loadingAuth prop
}

const navItems = [
  { name: 'Tableau de Bord', to: '/dashboard' },
  { name: 'Tickets SAP', to: '/tickets-sap' },
  { name: 'Envois CTN', to: '/envois-ctn' },
];

// Define Admin item separately
const adminItem = { name: 'Admin', to: '/admin', icon: faCog };

const JDC_LOGO_URL = "https://www.jdc.fr/images/logo_jdc_blanc.svg";

export const Header: React.FC<HeaderProps> = ({ user, profile, onToggleMobileMenu, onLoginClick, onLogoutClick, loadingAuth }) => {
  const linkActiveClass = "text-jdc-yellow";
  const linkInactiveClass = "text-jdc-gray-300 hover:text-white transition-colors";

  // Determine if the Admin link should be shown
  const showAdminLink = !loadingAuth && profile?.role?.toLowerCase() === 'admin';

  return (
    <header className="bg-jdc-black border-b border-jdc-gray-800 py-3 px-4 md:px-6 sticky top-0 z-40">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        {/* Logo and Mobile Menu Button */}
        <div className="flex items-center">
           <Link to={user ? "/dashboard" : "/"} className="mr-4 md:mr-6 flex-shrink-0">
             <img src={JDC_LOGO_URL} alt="JDC Logo" className="h-8 w-auto" />
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
        {user && !loadingAuth && ( // Hide nav while auth is loading
          <nav className="hidden md:flex space-x-6 items-center">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `${isActive ? linkActiveClass : linkInactiveClass} font-medium`}
                prefetch="intent" // Keep prefetch for other items
              >
                {item.name}
              </NavLink>
            ))}
            {/* Conditionally render Admin link */}
            {showAdminLink && (
              <NavLink
                to={adminItem.to}
                className={({ isActive }) => `${isActive ? linkActiveClass : linkInactiveClass} font-medium flex items-center`} // Added flex items-center
                // Removed prefetch="intent" for Admin link
              >
                 <FontAwesomeIcon icon={adminItem.icon} className="mr-1.5" /> {/* Optional icon */}
                {adminItem.name}
              </NavLink>
            )}
          </nav>
        )}
         {/* Show placeholder or spinner during auth load */}
         {loadingAuth && <div className="hidden md:block text-jdc-gray-400 text-sm">Chargement...</div>}


        {/* User Actions */}
        <div className="flex items-center space-x-3">
          {loadingAuth ? (
             <div className="h-8 w-20 bg-jdc-gray-700 rounded animate-pulse"></div> // Placeholder
          ) : user ? (
            <>
              <span className="text-jdc-gray-300 hidden sm:inline" title={user.email ?? ''}>
                <FontAwesomeIcon icon={faUserCircle} className="mr-1" />
                {/* Prefer profile displayName, fallback to user displayName, then email prefix */}
                {profile?.displayName || user.displayName || user.email?.split('@')[0]}
              </span>
              {onLogoutClick && ( // Conditionally render logout button
                 <Button variant="ghost" size="sm" onClick={onLogoutClick} title="Déconnexion">
                   <FontAwesomeIcon icon={faSignOutAlt} />
                   <span className="sr-only sm:not-sr-only sm:ml-1">Déconnexion</span>
                 </Button>
              )}
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
