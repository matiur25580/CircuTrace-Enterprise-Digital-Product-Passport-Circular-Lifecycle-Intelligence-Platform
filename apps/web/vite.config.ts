import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configure the React plugin and a predictable local development-server port.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
});
