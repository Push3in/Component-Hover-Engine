import { createContext } from 'react';

// True once every card has finished springing out to its spot in the fan on
// page load. Cards with their own animations (Status) wait for it.
export const IntroDone = createContext(true);
