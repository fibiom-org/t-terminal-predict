import { createContext, useContext } from 'react';

export const HeaderContext = createContext<string>('terminal-first trading');

export function useHeaderRight(): string {
  return useContext(HeaderContext);
}
