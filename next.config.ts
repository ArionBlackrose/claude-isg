import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Bu proje ana repo altındaki .claude/worktrees/ içinde ayrı bir git
  // worktree olarak yaşıyor — ana repoda da bir package-lock.json olduğu
  // için Next, workspace root'u otomatik tespit ederken yanlışlıkla dışarıdaki
  // ana repoyu seçip dosya izlemeyi (file tracing/watch) oraya kadar
  // genişletebiliyordu; bu hem "multiple lockfiles" uyarısına hem de dev
  // sunucusunun gereksiz yere ana repodaki diğer worktree'leri de izlemeye
  // çalışıp yavaşlamasına/instabil davranmasına yol açıyordu. Kökü açıkça bu
  // worktree'ye sabitlemek bunu önler.
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
