import React from 'react';
import {
  useLocation,
  useHistory,
  NavLinkProps,
  matchPath,
} from 'react-router-dom';
import {
  resolveToLocation,
  normalizeToLocation,
  // @ts-ignore
} from 'react-router-dom/modules/utils/locationUtils';
import { MenuItem, IMenuItemProps } from '@blueprintjs/core';

type Props = IMenuItemProps & Pick<NavLinkProps, 'to' | 'replace' | 'exact'>;

export const NavMenuItem: React.FC<Props> = ({
  to,
  replace,
  exact,
  ...props
}) => {
  const location = useLocation();
  const history = useHistory();

  const onClick = React.useCallback(() => {
    const newLocation = resolveToLocation(to, location);
    replace ? history.replace(newLocation) : history.push(newLocation);
  }, [to, replace, history]);

  const isActive = React.useMemo(() => {
    const toLocation = normalizeToLocation(resolveToLocation(to, location));
    return !!matchPath(location.pathname, {
      path: toLocation.pathname,
      exact,
    });
  }, [to, exact, location]);

  return <MenuItem {...props} onClick={onClick} active={isActive} />;
};

