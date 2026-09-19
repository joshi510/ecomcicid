import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const serverRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const uploadsDir = path.join(serverRoot, 'uploads');
export const productUploadsDir = path.join(uploadsDir, 'products');
