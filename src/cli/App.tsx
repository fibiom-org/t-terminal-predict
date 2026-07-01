import React, { useState } from 'react';
import { useApp } from 'ink';
import { WelcomeScreen, type WelcomeChoice } from '@/cli/screens/WelcomeScreen.js';
import { CreateWalletScreen } from '@/cli/screens/CreateWalletScreen.js';
import { ImportWalletScreen } from '@/cli/screens/ImportWalletScreen.js';
import { UnlockScreen } from '@/cli/screens/UnlockScreen.js';
import { MainScreen } from '@/cli/screens/MainScreen.js';
import { HeaderContext } from '@/cli/uiContext.js';
import { walletExists } from '@/storage/secureStore.js';
import { disposeManagers } from '@/wallet/managers.js';
import { shortAddress } from '@/utils/format.js';
import { getActiveChainId } from '@/storage/settingsStore.js';
import { getChain } from '@/config/chains.js';
import type { WalletSession } from '@/types/index.js';

type Route = 'welcome' | 'create' | 'import' | 'unlock' | 'main';

export function App(): React.ReactElement {
  const { exit } = useApp();
  const [session, setSession] = useState<WalletSession | null>(null);
  const [route, setRoute] = useState<Route>(walletExists() ? 'unlock' : 'welcome');
  const [activeChainId, setActiveChainId] = useState<number>(getActiveChainId());

  const enterMain = (s: WalletSession): void => {
    setSession(s);
    setRoute('main');
  };

  const onWelcome = (choice: WelcomeChoice): void => {
    if (choice === 'create') setRoute('create');
    else if (choice === 'import') setRoute('import');
    else exit();
  };

  const onLogout = (): void => {
    disposeManagers();
    setSession(null);
    setRoute('unlock');
  };

  const onReset = (): void => {
    disposeManagers();
    setSession(null);
    setActiveChainId(getActiveChainId());
    setRoute('welcome');
  };

  const networkName = getChain(activeChainId).name;
  const headerRight = session
    ? `${networkName} · ${shortAddress(session.addresses.evm)}`
    : `${networkName} · ${route === 'unlock' ? 'locked' : 'setup'}`;

  return (
    <HeaderContext.Provider value={headerRight}>
      {route === 'welcome' && <WelcomeScreen onSelect={onWelcome} />}
      {route === 'create' && <CreateWalletScreen onDone={enterMain} onCancel={() => setRoute('welcome')} />}
      {route === 'import' && (
        <ImportWalletScreen onDone={enterMain} onCancel={() => setRoute(walletExists() ? 'unlock' : 'welcome')} />
      )}
      {route === 'unlock' && <UnlockScreen onDone={enterMain} onRestore={() => setRoute('import')} onReset={onReset} />}
      {route === 'main' && session && (
        <MainScreen
          session={session}
          activeChainId={activeChainId}
          onSettingsChanged={() => setActiveChainId(getActiveChainId())}
          onLogout={onLogout}
          onReset={onReset}
          onRestore={() => {
            disposeManagers();
            setSession(null);
            setRoute('import');
          }}
        />
      )}
    </HeaderContext.Provider>
  );
}
