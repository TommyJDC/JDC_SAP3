import { Timestamp } from 'firebase/firestore';

/**
 * Formats a date value (Timestamp, Date object, or string) into a localized string (jj/mm/aaaa).
 * Returns 'Date inconnue' if the input is invalid or null/undefined.
 */
export const formatDate = (dateInput: any): string => {
  if (!dateInput) {
    return 'Date inconnue';
  }

  let date: Date | null = null;

  if (dateInput instanceof Timestamp) {
    date = dateInput.toDate();
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === 'string') {
    try {
      date = new Date(dateInput);
      // Check if the parsed date is valid
      if (isNaN(date.getTime())) {
        date = null;
      }
    } catch (e) {
      console.warn("Could not parse date string:", dateInput, e);
      date = null;
    }
  } else if (typeof dateInput === 'object' && dateInput.seconds) {
     // Handle Firestore Timestamp-like objects from server rendering if needed
     try {
       date = new Timestamp(dateInput.seconds, dateInput.nanoseconds).toDate();
     } catch (e) {
       console.warn("Could not parse Timestamp-like object:", dateInput, e);
       date = null;
     }
  }


  if (date) {
    try {
      // Use French locale for dd/mm/yyyy format
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (e) {
       console.error("Error formatting date:", date, e);
       return 'Date invalide';
    }
  }

  return 'Date inconnue';
};
