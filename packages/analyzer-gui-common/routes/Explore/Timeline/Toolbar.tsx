import React from 'react';
import { Button } from '@blueprintjs/core';

import { useFollowing } from '../Timeline';

export const Toolbar: React.FC = () => {
  const [following, setFollowing] = useFollowing();

  return (
    <div className="toolbar">
      <Button
        minimal
        small
        icon={following ? 'pause' : 'play'}
        onClick={() => setFollowing(!following)}
      />
    </div>
  );
};
