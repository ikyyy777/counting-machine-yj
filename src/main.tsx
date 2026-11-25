import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initAutoCacheRefresh } from './utils/cacheBuster.ts';

async function bootstrap() {
  const reloaded = await initAutoCacheRefresh();
  if (reloaded) return;

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void bootstrap();
