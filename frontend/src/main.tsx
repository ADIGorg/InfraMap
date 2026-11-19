import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import 'leaflet/dist/leaflet.css';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Contêiner React #root indisponível.');
createRoot(root).render(<StrictMode><App /></StrictMode>);
