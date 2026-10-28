import { useContext } from 'react';
import { NavigationContext } from './navigationContext.js';

/**
 * The admin's published header and footer links.
 *
 * In its own file so the context module exports only a component,
 * which is what keeps fast refresh working.
 *
 * @returns {{header: Array<object>, footer: Array<object>}}
 */
export function useNavigation() {
  return useContext(NavigationContext);
}
