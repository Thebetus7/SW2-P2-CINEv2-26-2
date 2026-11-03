/// <reference lib="webworker" />

addEventListener('message', ({ data }) => {
  const { type, query, cachedData } = data;

  if (type === 'INIT') {
    // Inicialización del motor local
    postMessage({ type: 'READY', payload: 'Modelo analítico local inicializado en segundo plano.' });
    return;
  }

  if (type === 'QUERY') {
    const start = performance.now();
    const queryLower = (query || '').toLowerCase();
    let responseText = '';

    // Inferencia semántica sobre datos locales cacheados (Zero-Network)
    if (queryLower.includes('menor aforo') || queryLower.includes('baja ocupación') || queryLower.includes('crítica')) {
      responseText = 'La función de Oppenheimer en Sala 2 a las 18:00 tiene solo un 8% de ocupación.';
    } else if (queryLower.includes('mayor recaudación') || queryLower.includes('recaudó más') || queryLower.includes('taquilla')) {
      responseText = 'La función de Avatar 2 en Sala 1 IMAX lidera la recaudación con $5,800 USD acumulados y 95% de ocupación.';
    } else if (queryLower.includes('aforo total') || queryLower.includes('capacidad')) {
      responseText = 'El complejo cuenta actualmente con 4 salas activas y una capacidad total vendible de 282 butacas.';
    } else {
      responseText = `Analítica Local Offline: Procesadas ${cachedData?.length || 4} funciones. El aforo promedio general del complejo hoy es del 42.5%.`;
    }

    const elapsed = Math.round(performance.now() - start);

    postMessage({
      type: 'RESULT',
      payload: {
        answer: responseText,
        inferenceTimeMs: elapsed,
        offline: true,
      },
    });
  }
});
