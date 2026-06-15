'use client';

import React from 'react';
import App from '../src/App';
import { AppContextProvider } from '../src/context/AppContext';

export default function Page() {
  return (
    <AppContextProvider>
      <App />
    </AppContextProvider>
  );
}
