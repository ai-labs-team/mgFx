import { useMemo, useCallback } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { parse, ParsedQuery, stringify } from 'query-string';

// @ts-ignore
import { resolveToLocation } from 'react-router-dom/modules/utils/locationUtils';

interface UseSearch {
  <T>(getter: (value: ParsedQuery) => T): T;
  <T>(
    getter: (value: ParsedQuery) => T,
    setter: (value: T, search: ParsedQuery) => ParsedQuery
  ): [T, (value: T) => void];
  (): ParsedQuery;
}

export const useSearch: UseSearch = <T>(
  getter?: (value: ParsedQuery) => T,
  setter?: (value: T, search: ParsedQuery) => ParsedQuery
) => {
  const location = useLocation();
  const history = useHistory();

  const value = useMemo(() => {
    const search = parse(location.search);
    return getter ? getter(search) : search;
  }, [location.search, getter]);

  const setValue = useCallback(
    (newValue: T) => {
      if (!setter) {
        return;
      }

      const newLocation = resolveToLocation(
        {
          search: stringify(setter(newValue, parse(location.search))),
        },
        location
      );

      history.replace(newLocation);
    },
    [location, value, setter]
  );

  return setter ? [value, setValue] : value;
};
