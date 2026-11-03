import React from 'react';
import { QueueSimulatorView } from './components/QueueSimulatorView';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <header className="max-w-4xl mx-auto mb-8 text-center sm:text-left">
        <div className="inline-block px-3 py-1 bg-indigo-950/80 border border-indigo-700/60 rounded-full text-indigo-300 text-xs font-semibold mb-3">
          Microservicio 03: MS Multimedia & Visión Artificial
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
          CineV2 — Simulador de Afluencia en Taquilla
        </h1>
        <p className="text-slate-400 mt-2 text-sm md:text-base">
          Inferencia en tiempo real con TensorFlow COCO-SSD, persistencia en DynamoDB Local y auditoría por MS IA-MCP.
        </p>
      </header>

      <main className="max-w-4xl mx-auto">
        <QueueSimulatorView />
      </main>

      <footer className="max-w-4xl mx-auto mt-12 text-center text-xs text-slate-600 border-t border-slate-900 pt-6">
        CineV2 Enterprise Architecture &copy; 2026. Microservicio de Multimedia y Visión Artificial.
      </footer>
    </div>
  );
};

export default App;
