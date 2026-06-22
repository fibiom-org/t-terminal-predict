import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface FieldProps {
  readonly label: string;
  readonly placeholder?: string;
  readonly mask?: boolean;
  readonly onSubmit: (value: string) => void;
}

export function Field({ label, placeholder, mask, onSubmit }: FieldProps): React.ReactElement {
  const [value, setValue] = useState('');
  return (
    <Box>
      <Text color="cyan">{label} </Text>
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={(v) => onSubmit(v)}
        placeholder={placeholder}
        mask={mask ? '•' : undefined}
      />
    </Box>
  );
}
