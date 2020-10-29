import React from 'react';
import { adjust, assoc, append, remove } from 'ramda';

import { Server } from '../config';

import {
  FormGroup,
  InputGroup,
  Button,
  Checkbox,
  Tooltip,
  Icon,
  Classes,
} from '@blueprintjs/core';

type Props = {
  servers: Server[];
  onChange: (servers: Server[]) => void;
};

export const ServerList: React.FC<Props> = ({ servers, onChange }) => {
  const items = React.useMemo(() => {
    return servers.map((server, index) => (
      <FormGroup label="URL" key={index}>
        <InputGroup
          value={server.baseUrl}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onChange(
              adjust(index, assoc('baseUrl', event.target.value), servers)
            )
          }
        />
        <Checkbox
          checked={server.deltas}
          onChange={() =>
            onChange(adjust(index, assoc('deltas', !server.deltas), servers))
          }
          labelElement={
            <>
              <span>Request delta updates</span>
              <Tooltip
                content={
                  <>
                    <span className={Classes.RUNNING_TEXT}>
                      When checked, the Analyzer server will only send a list of
                      changes since the last update.
                      <br />
                      When unchecked, the Analyzer server will send the entire
                      result set on every update.
                      <br />
                      <br />
                      Requires a version of the Analyzer server that supports
                      this feature; if not, this option has no effect.
                    </span>
                  </>
                }
              >
                <Icon icon="help" />
              </Tooltip>
            </>
          }
        />
        <Button
          icon="minus"
          text="Remove"
          onClick={() => onChange(remove(index, 1, servers))}
        />
      </FormGroup>
    ));
  }, [servers]);

  return (
    <>
      <Button
        icon="plus"
        text="Add Server"
        onClick={() => onChange(append({ baseUrl: '' }, servers))}
      />
      {items}
    </>
  );
};
