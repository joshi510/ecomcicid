import { mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { productUploadsDir } from '../config/paths.js';
import { AppError } from '../utils/ApiError.js';

const ALLOWED_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(productUploadsDir, { recursive: true });
    cb(null, productUploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ALLOWED_TYPES[file.mimetype] ?? [];
    cb(null, `${randomUUID()}${allowed.includes(ext) ? ext : allowed[0] ?? '.bin'}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ALLOWED_TYPES[file.mimetype];
    if (!allowedExts || !allowedExts.includes(ext)) {
      cb(
        new AppError(
          400,
          'Only JPEG, PNG, WebP, and GIF images are allowed',
          'INVALID_FILE_TYPE',
        ),
      );
      return;
    }
    cb(null, true);
  },
});

const productImages = upload.array('images', 8);

function sniffImageMime(buffer: Buffer) {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

function rejectUnsafeUploads(req: Request) {
  const files = Array.isArray(req.files) ? req.files : [];
  for (const file of files) {
    const sniffed = sniffImageMime(readFileSync(file.path));
    if (!sniffed || sniffed !== file.mimetype) {
      for (const uploaded of files) {
        try {
          unlinkSync(uploaded.path);
        } catch {
          /* ignore */
        }
      }
      throw new AppError(400, 'Uploaded file is not a valid image', 'INVALID_FILE_CONTENT');
    }
  }
}

export function acceptProductImages(req: Request, res: Response, next: NextFunction) {
  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.includes('multipart/form-data')) {
    next();
    return;
  }

  productImages(req, res, (err?: unknown) => {
    if (err) {
      next(err);
      return;
    }
    try {
      rejectUnsafeUploads(req);
      next();
    } catch (error) {
      next(error);
    }
  });
}

export function uploadedProductImagePaths(req: Request): string[] {
  const files = req.files;
  if (!Array.isArray(files)) {
    return [];
  }

  return files.map((file) => `/uploads/products/${file.filename}`);
}
