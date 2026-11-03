const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateDemoImages() {
  const assetsDir = path.join(__dirname);
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Generar demo-queue-normal.jpg (8 personas)
  const svgNormal = `
  <svg width="640" height="480" xmlns="http://www.w3.org/2000/svg">
    <rect width="640" height="480" fill="#1e293b"/>
    <text x="320" y="50" font-family="Arial" font-size="22" font-weight="bold" fill="#38bdf8" text-anchor="middle">
      CineV2 - Taquilla Principal: Fila Normal (8 Personas)
    </text>
    ${Array.from({ length: 8 }, (_, i) => `
      <g transform="translate(${50 + i * 68}, 180)">
        <circle cx="25" cy="25" r="18" fill="#10b981"/>
        <rect x="10" y="48" width="30" height="70" rx="6" fill="#059669"/>
      </g>
    `).join('')}
  </svg>`;

  await sharp(Buffer.from(svgNormal))
    .jpeg({ quality: 90 })
    .toFile(path.join(assetsDir, 'demo-queue-normal.jpg'));

  console.log('Generada demo-queue-normal.jpg');

  // Generar demo-queue-congested.jpg (45 personas)
  const svgCongested = `
  <svg width="900" height="600" xmlns="http://www.w3.org/2000/svg">
    <rect width="900" height="600" fill="#0f172a"/>
    <text x="450" y="50" font-family="Arial" font-size="24" font-weight="bold" fill="#f59e0b" text-anchor="middle">
      CineV2 - Taquilla Principal: Fila Congestionada (45 Personas)
    </text>
    ${Array.from({ length: 45 }, (_, i) => {
      const row = Math.floor(i / 15);
      const col = i % 15;
      return `
      <g transform="translate(${40 + col * 55}, ${110 + row * 140})">
        <circle cx="20" cy="20" r="15" fill="#ef4444"/>
        <rect x="8" y="38" width="24" height="60" rx="5" fill="#dc2626"/>
      </g>`;
    }).join('')}
  </svg>`;

  await sharp(Buffer.from(svgCongested))
    .jpeg({ quality: 90 })
    .toFile(path.join(assetsDir, 'demo-queue-congested.jpg'));

  console.log('Generada demo-queue-congested.jpg');
}

generateDemoImages().catch((err) => {
  console.error(err);
  process.exit(1);
});
