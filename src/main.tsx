import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// 分片版字型：瀏覽器只下載畫面上用到的字（每片約 30KB），不用單檔版（3–4MB）。
import '@fontsource/noto-serif-tc/400.css';
import '@fontsource/noto-serif-tc/700.css';
import '@fontsource/lxgw-wenkai-tc/400.css';
import './styles.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
