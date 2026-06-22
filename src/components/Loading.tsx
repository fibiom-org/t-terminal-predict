import React from 'react';
import { Text } from 'ink';
import Spinner from 'ink-spinner';

export function Loading({ label }: { label: string }): React.ReactElement {
  return (
    <Text color="cyan">
      <Spinner type="dots" /> {label}
    </Text>
  );
}
