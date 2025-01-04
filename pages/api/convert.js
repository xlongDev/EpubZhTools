import multer from 'multer';
import { Converter } from 'opencc-js';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';

// 配置 multer
const upload = multer({ dest: 'uploads/' });

// 创建繁简转换器
const converter = Converter({ from: 'hk', to: 'cn' });

// 确保目录存在
const uploadDir = path.join(process.cwd(), 'uploads');
const convertedDir = path.join(process.cwd(), 'converted');
const tempDir = path.join(process.cwd(), 'temp_epub');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(convertedDir)) fs.mkdirSync(convertedDir);
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

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

    const inputFilePath = req.file.path;
    const originalFilename = decodeFilename(req.file.originalname);
    const filename = convertFilename(originalFilename);
    const outputFilePath = path.join(convertedDir, filename);

    try {
      // 解压文件
      const zip = new AdmZip(inputFilePath);
      zip.extractAllTo(tempDir, true);

      // 转换文件内容
      convertFilesToSimplified(tempDir, converter);

      // 重新打包文件
      const outputZip = new AdmZip();
      outputZip.addLocalFolder(tempDir);
      outputZip.writeZip(outputFilePath);

      // 清理临时文件
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.unlinkSync(inputFilePath);

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

// 转换文件内容
function convertFilesToSimplified(dir, converter) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      convertFilesToSimplified(filePath, converter);
    } else if (
      path.extname(file) === '.html' ||
      path.extname(file) === '.xhtml' ||
      path.extname(file) === '.ncx'
    ) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const simplifiedContent = converter(content);
        fs.writeFileSync(filePath, simplifiedContent, 'utf-8');
      } catch (error) {
        console.error('转换失败：', error);
        throw error;
      }
    }
  }
}

// 转换文件名
function convertFilename(filename) {
  const ext = path.extname(filename);
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