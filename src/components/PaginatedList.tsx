import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface PaginatedListProps<I> {
  readonly items: readonly I[];
  readonly getKey: (item: I) => string;
  readonly renderItem: (item: I, active: boolean) => React.ReactNode;
  readonly onSelect?: (item: I) => void;
  readonly title?: string;
  readonly pageSize?: number;
  readonly isActive?: boolean;
}

export function PaginatedList<I>({
  items,
  getKey,
  renderItem,
  onSelect,
  title,
  pageSize = 8,
  isActive = true,
}: PaginatedListProps<I>): React.ReactElement {
  const [index, setIndex] = useState(0);
  const count = items.length;
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const page = Math.floor(index / pageSize);
  const start = page * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  useInput(
    (input, key) => {
      if (count === 0) return;
      if (key.upArrow) {
        setIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setIndex((i) => Math.min(count - 1, i + 1));
      } else if (key.leftArrow || key.pageUp) {
        setIndex((i) => Math.max(0, i - pageSize));
      } else if (key.rightArrow || key.pageDown) {
        setIndex((i) => Math.min(count - 1, i + pageSize));
      } else if (key.return) {
        const item = items[index];
        if (item && onSelect) onSelect(item);
      } else if (/^[1-9]$/.test(input)) {
        const target = start + Number(input) - 1;
        if (target < count) {
          setIndex(target);
          const item = items[target];
          if (item && onSelect) onSelect(item);
        }
      }
    },
    { isActive },
  );

  return (
    <Box flexDirection="column" width="100%" borderStyle="round" borderColor="gray" paddingX={1}>
      {title ? (
        <Text bold color="cyan">
          {title}
        </Text>
      ) : null}
      {pageItems.map((item, i) => {
        const globalIndex = start + i;
        const active = globalIndex === index;
        return (
          <Box key={getKey(item)}>
            <Text color={active ? 'cyan' : undefined}>{active ? '❯ ' : '  '}</Text>
            <Box flexGrow={1} flexDirection="column">
              {renderItem(item, active)}
            </Box>
          </Box>
        );
      })}
      {count === 0 ? <Text dimColor>Nothing to show.</Text> : null}
      <Box marginTop={1} justifyContent="space-between">
        <Text dimColor>{count === 0 ? '' : `${index + 1}/${count}`}</Text>
        <Text dimColor>
          Page <Text color="cyan">{page + 1}</Text>/{pages} · ↑↓ move · ←→ page · enter select
        </Text>
      </Box>
    </Box>
  );
}
