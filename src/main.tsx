import { render } from 'ink';
import { App } from '@/cli/App.js';

if (!process.stdout.isTTY) {
  process.stderr.write('TTerminal requires an interactive terminal (TTY).\n');
  process.exit(1);
}

const enterAltScreen = (): void => {
  process.stdout.write('\x1b[?1049h');
  process.stdout.write('\x1b[2J\x1b[H');
};

const leaveAltScreen = (): void => {
  process.stdout.write('\x1b[?1049l');
};

enterAltScreen();
process.on('exit', leaveAltScreen);

const { waitUntilExit } = render(<App />, { exitOnCtrlC: true });
await waitUntilExit();
leaveAltScreen();
