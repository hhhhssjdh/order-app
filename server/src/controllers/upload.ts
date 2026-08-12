import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs';
import { AuthRequest } from '../middleware/auth';

// COS 云存储（微信云托管环境变量），未配置密钥时回退本地存储
const COS_BUCKET = process.env.COS_BUCKET;
const COS_REGION = process.env.COS_REGION;
const COS_SECRET_ID = process.env.COS_SECRET_ID;
const COS_SECRET_KEY = process.env.COS_SECRET_KEY;
const useCOS = !!(COS_BUCKET && COS_REGION && COS_SECRET_ID && COS_SECRET_KEY);

let cosClient: any = null;
if (useCOS) {
  // 动态引入，避免未配置时安装失败
  try {
    const COS = require('cos-nodejs-sdk-v5');
    cosClient = new COS({
      SecretId: COS_SECRET_ID,
      SecretKey: COS_SECRET_KEY,
    });
    console.log('[upload] 已启用 COS 云存储');
  } catch (e) {
    console.error('[upload] COS SDK 加载失败，回退本地存储:', (e as Error).message);
  }
}

const router = Router();

// 允许的 MIME 类型
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// 确保上传目录存在
const uploadsDir = path.join(__dirname, '../../uploads');
const originalDir = path.join(uploadsDir, 'original');
const thumbDir = path.join(uploadsDir, 'thumb');
[originalDir, thumbDir].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// multer 配置 - 存到 original 目录（临时）
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, originalDir),
  filename: (_req, file, cb) => {
    // 清洗文件名：只保留安全字符，防路径遍历
    const safeName = file.originalname.replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_');
    const ext = path.extname(safeName).toLowerCase();
    const baseName = path.basename(safeName, ext).slice(0, 40);
    const name = `${Date.now()}-${baseName}-${Math.random().toString(36).slice(2, 6)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    // 双重验证：MIME 类型 + 扩展名
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext) || !ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(new Error('仅支持 jpg/png/gif/webp 图片格式'));
    }
    cb(null, true);
  },
});

// 上传到 COS
function uploadToCOS(filePath: string, cosKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!cosClient || !COS_BUCKET) {
      reject(new Error('COS 未配置'));
      return;
    }
    cosClient.putObject(
      {
        Bucket: COS_BUCKET,
        Region: COS_REGION,
        Key: cosKey,
        Body: fs.createReadStream(filePath),
        ContentType: 'image/jpeg',
      },
      (err: Error | null) => {
        if (err) reject(err);
        else resolve(`https://${COS_BUCKET}.cos.${COS_REGION}.myqcloud.com/${cosKey}`);
      }
    );
  });
}

// POST /api/upload - 上传图片，返回原图和缩略图 URL
router.post('/', (req: AuthRequest, res: Response) => {
  upload.single('file')(req, res, async (err) => {
    // 处理 multer 错误
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: '图片大小不能超过5MB' });
      return res.status(400).json({ error: '上传失败: ' + err.message });
    }
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: '请选择图片' });

    const filename = req.file.filename;
    const originalPath = req.file.path;
    const thumbFilename = `thumb-${filename}`;
    const thumbPath = path.join(thumbDir, thumbFilename);

    try {
      // 用 sharp 验证文件是真实图片（防止伪造/畸形文件）
      const metadata = await sharp(originalPath).metadata();
      if (!metadata || !metadata.width || !metadata.height) {
        fs.unlinkSync(originalPath);
        return res.status(400).json({ error: '无效的图片文件' });
      }

      // 生成缩略图 (300px 宽，保持比例)
      await sharp(originalPath)
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .toFile(thumbPath);

      // COS 模式：上传原图和缩略图，返回 https URL
      if (useCOS && cosClient) {
        const originalUrl = await uploadToCOS(originalPath, `original/${filename}`);
        const thumbUrl = await uploadToCOS(thumbPath, `thumb/${thumbFilename}`);
        // 清理本地临时文件
        try { fs.unlinkSync(originalPath); } catch {}
        try { fs.unlinkSync(thumbPath); } catch {}
        return res.json({ original: originalUrl, thumb: thumbUrl });
      }

      // 本地模式
      res.json({
        original: `/uploads/original/${filename}`,
        thumb: `/uploads/thumb/${thumbFilename}`,
      });
    } catch (e) {
      // 图片处理失败，清理上传的文件
      try { fs.unlinkSync(originalPath); } catch {}
      try { fs.unlinkSync(thumbPath); } catch {}
      console.error('图片处理失败:', e);
      res.status(400).json({ error: '图片处理失败，请确认上传的是有效图片' });
    }
  });
});

export default router;
