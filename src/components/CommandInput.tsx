import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { matchCommands } from '@/commands/registry.js';

interface Props {
  onSubmit: (value: string) => void;
}

export function CommandInput({ onSubmit }: Props): React.ReactElement {
  const [value, setValue] = useState('');
  const [selected, setSelected] = useState(0);

  const open = value.startsWith('/') && !value.includes(' ');
  const suggestions = open ? matchCommands(value) : [];

  useEffect(() => {
    setSelected((s) => (suggestions.length === 0 ? 0 : Math.min(s, suggestions.length - 1)));
  }, [suggestions.length]);

  useInput((input, key) => {
    if (key.upArrow) {
      if (suggestions.length) setSelected((s) => (s - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (key.downArrow) {
      if (suggestions.length) setSelected((s) => (s + 1) % suggestions.length);
      return;
    }
    if (key.tab) {
      const pick = suggestions[selected];
      if (pick) setValue(`/${pick.name} `);
      return;
    }
    if (key.return) {
      const pick = suggestions[selected];
      const out = pick && open ? `/${pick.name}` : value;
      onSubmit(out);
      setValue('');
      setSelected(0);
      return;
    }
    if (key.backspace || key.delete) {
      setValue((v) => v.slice(0, -1));
      return;
    }

    if (key.ctrl || key.meta || key.escape || key.leftArrow || key.rightArrow) return;
    if (input) setValue((v) => v + input);
  });

  return (
    <Box flexDirection="column" width="100%">
      {suggestions.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {suggestions.map((c, i) => {
            const active = i === selected;
            return (
              <Text key={c.name} color={active ? 'cyan' : undefined} bold={active}>
                {active ? '❯ ' : '  '}/{c.name.padEnd(9)}
                <Text dimColor>{c.summary}</Text>
              </Text>
            );
          })}
        </Box>
      )}
      <Box borderStyle="round" borderColor="cyan" paddingX={1} width="100%">
        <Text color="cyan">❯ </Text>
        {value ? <Text>{value}</Text> : <Text dimColor>type / for commands…</Text>}
        <Text inverse> </Text>
      </Box>
    </Box>
  );
}
