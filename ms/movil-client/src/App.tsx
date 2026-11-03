import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-blue-500">CineMovil Client</h1>
        <p className="text-slate-400 mt-2">Aplicación móvil PWA para clientes</p>
      </header>
    </div>
  );
};

export default App;
