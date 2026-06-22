import { useEffect, useState } from 'react';

export interface TerminalSize {
  readonly columns: number;
  readonly rows: number;
}

function read(): TerminalSize {
  return {
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  };
}

export function useTerminalSize(): TerminalSize {
  const [size, setSize] = useState<TerminalSize>(read);

  useEffect(() => {
    const onResize = (): void => setSize(read());
    process.stdout.on('resize', onResize);
    return () => {
      process.stdout.off('resize', onResize);
    };
  }, []);

  return size;
}
