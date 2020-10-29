import React from 'react';
import { Tag } from '@blueprintjs/core';

import { useConfig } from 'src/hooks/useConfig';

export const FilterButton: React.FC = () => {
  const {
    state: {
      logParameters: { scope },
    },
  } = useConfig();

  const tags: string[] = [];

  if (scope.spec?.name) {
    tags.push(`Name: ${scope.spec.name}`);
  }

  return tags.length ? (
    <>
      {tags.map((tag, index) => (
        <Tag key={index} minimal>
          {tag}
        </Tag>
      ))}
    </>
  ) : (
    <Tag>All</Tag>
  );
};
