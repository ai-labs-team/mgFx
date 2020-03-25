import React from 'react';
import {
  useLocation,
  useHistory,
  NavLinkProps,
  matchPath
} from 'react-router-dom';
import {
  resolveToLocation,
  normalizeToLocation
  // @ts-ignore
} from 'react-router-dom/modules/utils/locationUtils';
import { Button, IButtonProps } from '@blueprintjs/core';

type Props = IButtonProps & Pick<NavLinkProps, 'to' | 'replace' | 'exact'>;

export const NavButton: React.FC<Props> = ({
  to,
  replace,
  exact,
  ...props
}) => {
  const location = useLocation();
  const history = useHistory();

  const onClick = React.useCallback(() => {
    const newLocation = resolveToLocation(to, location);
    replace ? history.replace(location) : history.push(location);
  }, [to, replace, history]);

  const isActive = React.useMemo(() => {
    const toLocation = normalizeToLocation(resolveToLocation(to, location));
    return !!matchPath(location.pathname, {
      path: toLocation.pathname,
      exact
    });
  }, [to, exact, location]);

  return <Button {...props} onClick={onClick} active={isActive} />;
};
