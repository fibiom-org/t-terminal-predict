import React from 'react';
import { Box, Text } from 'ink';

interface PanelProps {
  readonly title?: string;
  readonly children: React.ReactNode;
  readonly width?: number | string;
  readonly flexGrow?: number;
  readonly borderColor?: string;
  readonly minHeight?: number;
}

export function Panel({
  title,
  children,
  width,
  flexGrow,
  borderColor = 'gray',
  minHeight,
}: PanelProps): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      width={width}
      flexGrow={flexGrow}
      minHeight={minHeight}
    >
      {title ? (
        <Text bold color="cyan">
          {title}
        </Text>
      ) : null}
      {children}
    </Box>
  );
}
