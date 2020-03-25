import React from 'react';
import { adjust, assoc, append, remove } from 'ramda';

import { Server } from '../../config';
import { FormGroup, InputGroup, Button } from '@blueprintjs/core';

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
