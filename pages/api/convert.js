import multer from 'multer';
import { Converter } from 'opencc-js';
import AdmZip from 'adm-zip';
import iconv from 'iconv-lite';
import path from 'path';
import { Readable } from 'stream';

// 使用内存存储
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 创建繁简转换器
const converter = Converter({ from: 'hk', to: 'cn' });

// 定义一个全局缓存来存储转换后的文件内容
global.fileCache = global.fileCache || {};

export const config = {
  api: {
    bodyParser: false, // 禁用默认的 bodyParser，使用 multer 处理文件上传
  },
};

export default function handler(req, res) {
  upload.single('epub')(req, res, async (err) => {
    if (err) {
      console.error('文件上传失败：', err);
      return res.status(500).json({ error: '文件上传失败' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    const fileBuffer = req.file.buffer; // 文件内容存储在内存中
    const originalFilename = decodeFilename(req.file.originalname);
    const filename = convertFilename(originalFilename);

    try {
      // 将文件内容转换为流
      const fileStream = new Readable();
      fileStream.push(fileBuffer);
      fileStream.push(null);

      // 处理文件（解压、转换、重新打包）
      const outputBuffer = await processFile(fileStream);

      // 将转换后的文件内容存储到内存中
      global.fileCache[filename] = outputBuffer;

      // 返回下载链接
      res.status(200).json({
        downloadUrl: `/api/download?filename=${encodeURIComponent(filename)}`,
      });
    } catch (error) {
      console.error('转换失败：', error);
      res.status(500).json({ error: '转换失败' });
    }
  });
}

// 处理文件（解压、转换、重新打包）
async function processFile(fileStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    fileStream.on('data', (chunk) => chunks.push(chunk));
    fileStream.on('end', () => {
      const fileBuffer = Buffer.concat(chunks);

      // 解压文件
      const zip = new AdmZip(fileBuffer);
      const zipEntries = zip.getEntries();

      // 转换文件内容
      for (const entry of zipEntries) {
        if (
          entry.entryName.endsWith('.html') ||
          entry.entryName.endsWith('.xhtml') ||
          entry.entryName.endsWith('.ncx')
        ) {
          const content = entry.getData().toString('utf-8');
          const simplifiedContent = converter(content);
          zip.updateFile(entry.entryName, Buffer.from(simplifiedContent, 'utf-8'));
        }
      }

      // 重新打包文件
      const outputBuffer = zip.toBuffer();
      resolve(outputBuffer);
    });
    fileStream.on('error', (error) => reject(error));
  });
}

// 转换文件名
function convertFilename(filename) {
  const ext = path.extname(filename); // 使用 path 模块处理文件名
  const nameWithoutExt = path.basename(filename, ext);
  const simplifiedName = converter(nameWithoutExt);
  return `${simplifiedName}${ext}`;
}

// 解码文件名
function decodeFilename(filename) {
  if (/[^\x00-\x7F]/.test(filename)) {
    return iconv.decode(Buffer.from(filename, 'binary'), 'utf8');
  }
  return filename;
}