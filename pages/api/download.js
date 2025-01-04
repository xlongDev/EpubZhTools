export default function handler(req, res) {
  const { filename } = req.query;

  if (!filename) {
    return res.status(400).json({ error: '文件名不能为空' });
  }

  try {
    // 从内存中获取文件内容
    const fileContent = global.fileCache[filename];

    if (!fileContent) {
      return res.status(404).json({ error: '文件未找到' });
    }

    // 对文件名进行编码，确保它符合 HTTP 头部规范
    const encodedFilename = encodeURIComponent(filename);

    // 设置响应头，触发文件下载
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Type', 'application/epub+zip');

    // 发送文件内容给客户端
    res.send(fileContent);
  } catch (error) {
    console.error('文件下载失败：', error);
    res.status(500).json({ error: '文件下载失败' });
  }
}