/**
 * Utility functions for determining styles based on data.
 */

interface StatusStyle {
  bgColor: string;
  textColor: string;
  borderColor?: string; // Optional border color
}

/**
 * Returns Tailwind CSS classes for shipment status badges.
 * Includes specific color for 'RELICAT'.
 * @param status The shipment status string.
 * @returns Object containing bgColor and textColor Tailwind classes.
 */
export const getShipmentStatusStyle = (status?: string | null): StatusStyle => {
  if (!status) {
    return { bgColor: 'bg-jdc-gray-500', textColor: 'text-white' }; // Gray for undefined/null
  }
  const lowerStatus = status.toLowerCase();

  if (lowerStatus === 'oui') {
    return { bgColor: 'bg-green-600', textColor: 'text-white' }; // Green for OUI (delivered)
  }
  if (lowerStatus === 'non') {
    return { bgColor: 'bg-yellow-500', textColor: 'text-jdc-black' }; // Yellow for NON (in transit/pending)
  }
  if (lowerStatus === 'relicat') {
    return { bgColor: 'bg-red-600', textColor: 'text-white' }; // Red for RELICAT
  }
  // Default style for any other status
  return { bgColor: 'bg-jdc-gray-500', textColor: 'text-white' }; // Gray for others
};

/**
 * Returns Tailwind CSS classes for ticket status badges.
 * @param status The ticket status string.
 * @returns Object containing bgColor and textColor Tailwind classes.
 */
export const getTicketStatusStyle = (status?: string | null): StatusStyle => {
    if (!status) return { bgColor: 'bg-jdc-gray-500', textColor: 'text-white' }; // Grey for undefined/null

    const statusLower = status.toLowerCase();

    if (statusLower.includes('fermé')) return { bgColor: 'bg-green-600', textColor: 'text-white' };
    if (statusLower.includes('en cours')) return { bgColor: 'bg-yellow-500', textColor: 'text-jdc-black' };
    if (statusLower.includes('annulé')) return { bgColor: 'bg-red-600', textColor: 'text-white' };
    if (statusLower.includes('demande de rma')) return { bgColor: 'bg-purple-600', textColor: 'text-white' };
    if (statusLower.includes('nouveau')) return { bgColor: 'bg-blue-500', textColor: 'text-white' };
    if (statusLower.includes('ouvert')) return { bgColor: 'bg-orange-500', textColor: 'text-white' }; // Changed Ouvert to Orange for distinction

    return { bgColor: 'bg-jdc-gray-500', textColor: 'text-white' }; // Default grey
};

// Add other style utility functions here if needed
