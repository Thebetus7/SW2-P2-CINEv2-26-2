import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as net from 'net';

/**
 * Servidor S3 local compatible con la API REST de MinIO/AWS S3
 * Permite ejecutar ms-multimedia y la carga de pósters sin depender de Docker.
 */

export const STORAGE_ROOT = path.resolve(__dirname, '../../storage/s3_local');
export const DEFAULT_PORT = parseInt(process.env.S3_PORT || '9000', 10);

/**
 * Inicializa la estructura física de almacenamiento de buckets
 */
export function ensureBucketStructure(): void {
  const buckets = ['cine-posters', 'cine-tickets'];
  for (const bucket of buckets) {
    const bucketPath = path.join(STORAGE_ROOT, bucket);
    if (!fs.existsSync(bucketPath)) {
      fs.mkdirSync(bucketPath, { recursive: true });
    }
  }
}

/**
 * Determina el tipo MIME según la extensión del archivo
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.json':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Comprueba si un puerto TCP está en uso
 */
function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        tester.close(() => resolve(false));
      })
      .listen(port);
  });
}

/**
 * Crea e inicia el servidor HTTP compatible con S3
 */
export async function startLocalS3Server(port: number = DEFAULT_PORT): Promise<http.Server | null> {
  ensureBucketStructure();

  const inUse = await isPortInUse(port);
  if (inUse) {
    console.log(`[LocalS3Server] Puerto ${port} ya está en uso (MinIO o S3 activo). Omitiendo servidor embebido.`);
    return null;
  }

  const server = http.createServer((req, res) => {
    // Configurar cabeceras CORS universales
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'ETag, Content-Length, Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url || '/', `http://localhost:${port}`);
    const pathname = decodeURIComponent(parsedUrl.pathname);

    // Endpoint de salud básico
    if (pathname === '/minio/health/live' || pathname === '/minio/health/ready' || pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'LocalS3Server' }));
      return;
    }

    // Parsear bucket y key de la ruta S3: /bucket/key...
    const parts = pathname.split('/').filter(Boolean);
    const bucket = parts[0];
    const key = parts.slice(1).join('/');

    if (!bucket) {
      // ListBuckets básico
      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end(
        '<?xml version="1.0" encoding="UTF-8"?><ListAllMyBucketsResult><Buckets><Bucket><Name>cine-posters</Name></Bucket><Bucket><Name>cine-tickets</Name></Bucket></Buckets></ListAllMyBucketsResult>'
      );
      return;
    }

    const bucketPath = path.join(STORAGE_ROOT, bucket);

    // 1. HEAD /:bucket (HeadBucket)
    if (req.method === 'HEAD' && !key) {
      if (fs.existsSync(bucketPath)) {
        res.writeHead(200);
      } else {
        res.writeHead(404);
      }
      res.end();
      return;
    }

    // 2. PUT /:bucket (CreateBucket)
    if (req.method === 'PUT' && !key) {
      if (!fs.existsSync(bucketPath)) {
        fs.mkdirSync(bucketPath, { recursive: true });
      }
      res.writeHead(200);
      res.end();
      return;
    }

    const targetFilePath = path.join(STORAGE_ROOT, bucket, key);

    // 3. HEAD /:bucket/:key (HeadObject)
    if (req.method === 'HEAD') {
      if (fs.existsSync(targetFilePath)) {
        const stats = fs.statSync(targetFilePath);
        res.writeHead(200, {
          'Content-Length': stats.size,
          'Content-Type': getMimeType(targetFilePath),
          'ETag': `"mock-etag-${stats.size}"`,
        });
      } else {
        res.writeHead(404);
      }
      res.end();
      return;
    }

    // 4. PUT /:bucket/:key (PutObject)
    if (req.method === 'PUT') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const parentDir = path.dirname(targetFilePath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }

        fs.writeFileSync(targetFilePath, buffer);
        const etag = crypto.createHash('md5').update(buffer).digest('hex');

        res.writeHead(200, {
          'ETag': `"${etag}"`,
          'Content-Type': 'application/xml',
        });
        res.end();
      });
      req.on('error', (err) => {
        res.writeHead(500);
        res.end(err.message);
      });
      return;
    }

    // 5. GET /:bucket/:key (GetObject / Visualización web de pósters y tickets)
    if (req.method === 'GET') {
      if (fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).isFile()) {
        const mime = getMimeType(targetFilePath);
        const stream = fs.createReadStream(targetFilePath);
        res.writeHead(200, {
          'Content-Type': mime,
          'Cache-Control': 'public, max-age=86400',
        });
        stream.pipe(res);
        return;
      }

      // Fallback: Si se solicita una portada que aún no existe, devolver un póster visual por defecto
      if (bucket === 'cine-posters') {
        const movieTitle = path.basename(key, path.extname(key)).replace(/[-_]/g, ' ');
        const svgPoster = `
          <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
            <defs>
              <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0f172a"/>
                <stop offset="50%" stop-color="#1e293b"/>
                <stop offset="100%" stop-color="#0284c7"/>
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#bg)"/>
            <circle cx="300" cy="380" r="100" fill="#38bdf8" fill-opacity="0.2"/>
            <text x="300" y="400" font-family="sans-serif" font-size="80" fill="#38bdf8" text-anchor="middle">🎬</text>
            <text x="300" y="550" font-family="sans-serif" font-weight="bold" font-size="32" fill="#ffffff" text-anchor="middle">${movieTitle || 'CINEv2 POSTER'}</text>
            <text x="300" y="600" font-family="sans-serif" font-size="20" fill="#94a3b8" text-anchor="middle">Disponible en Cartelera</text>
          </svg>
        `.trim();

        res.writeHead(200, {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        });
        res.end(svgPoster);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Object not found in local S3 storage');
      return;
    }

    // 6. DELETE /:bucket/:key (DeleteObject)
    if (req.method === 'DELETE') {
      if (fs.existsSync(targetFilePath)) {
        fs.unlinkSync(targetFilePath);
      }
      res.writeHead(204);
      res.end();
      return;
    }

    res.writeHead(405);
    res.end('Method not allowed');
  });

  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log(`[LocalS3Server] Servidor S3 emulado activo en http://localhost:${port}`);
      console.log(`[LocalS3Server] Almacenamiento local persistente en: ${STORAGE_ROOT}`);
      resolve(server);
    });
    server.on('error', (err) => {
      console.error(`[LocalS3Server] Error al iniciar servidor en puerto ${port}:`, err);
      reject(err);
    });
  });
}

