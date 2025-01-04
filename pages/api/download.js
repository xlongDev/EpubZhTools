import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { filename } = req.query;

  if (!filename) {
    return res.status(400).json({ error: '文件名不能为空' });
  }

  const filePath = path.join(process.cwd(), 'converted', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件未找到' });
  }

  // 对文件名进行编码，确保它符合 HTTP 头部规范
  const encodedFilename = encodeURIComponent(filename);

  // 设置响应头，触发文件下载
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
  res.setHeader('Content-Type', 'application/octet-stream');

  // 创建文件流并发送给客户端
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  // 监听文件流结束事件，删除文件
  fileStream.on('end', () => {
    fs.unlinkSync(filePath);
    console.log('文件下载成功：', filePath);
  });

  // 监听文件流错误事件
  fileStream.on('error', (err) => {
    console.error('文件下载失败：', err);
    res.status(500).json({ error: '文件下载失败' });
  });
}