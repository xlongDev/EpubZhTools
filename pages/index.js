import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUpload,
  faDownload,
  faSpinner,
  faMoon,
  faSun,
} from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons"; // 从 brands 中导入 Github 图标
import styles from "../styles/Home.module.css"; // 引入 CSS 文件

export default function Home() {
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  // 根据系统偏好设置初始模式
  useEffect(() => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setIsDarkMode(prefersDarkMode);
  }, []);

  // 切换夜间模式
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // 动态更新 body 的 class
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [isDarkMode]);

  const handleFileChange = (file) => {
    if (file && file.name.endsWith(".epub")) {
      if (file.size > MAX_FILE_SIZE) {
        setError("文件大小不能超过50MB");
        setFileName("");
      } else {
        setFileName(file.name);
        setError("");
      }
    } else {
      setError("请选择一个EPUB文件");
      setFileName("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fileInput = e.target.epubFile;
    const file = fileInput.files[0];

    if (!file) {
      setError("请选择一个EPUB文件");
      return;
    }

    setStatus(`已选择文件：${file.name}，正在转换，请稍候...`);
    setIsLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("epub", file);

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "转换失败");
      }

      const result = await response.json();

      if (!result.downloadUrl) {
        throw new Error("未找到下载链接");
      }

      setStatus("转换完成！");
      setIsLoading(false);

      const fullDownloadUrl = result.downloadUrl.startsWith("http")
        ? result.downloadUrl
        : `${window.location.origin}${result.downloadUrl}`;

      setDownloadUrl(fullDownloadUrl);
      window.location.href = fullDownloadUrl; // 自动触发下载
    } catch (error) {
      console.error("转换失败：", error);
      setStatus("");
      setError("转换失败：" + error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Github 图标 */}
      <a
        href="https://github.com/xlongDev/EpubZhTools" // 我的 Github 主页链接
        target="_blank"
        rel="noopener noreferrer"
        className={styles.githubLink}
      >
        <FontAwesomeIcon icon={faGithub} />
      </a>

      {/* 夜间模式切换按钮 */}
      <button onClick={toggleDarkMode} className={styles.darkModeToggle}>
        <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
      </button>

      <h1 className={styles.heading}>EPUB 繁简转换工具</h1>
      <form onSubmit={handleSubmit}>
        <div
          className={styles.uploadBox}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            handleFileChange(file);
            e.target.querySelector("input").files = e.dataTransfer.files;
          }}
        >
          <input
            type="file"
            id="epubFile"
            accept=".epub"
            required
            onChange={(e) => handleFileChange(e.target.files[0])}
          />
          <label htmlFor="epubFile">
            <FontAwesomeIcon icon={faUpload} />
            <span>{fileName || "点击选择文件或拖拽文件到这里"}</span>
          </label>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.button} disabled={isLoading}>
          转换并下载
        </button>
      </form>
      {status && <p className={styles.status}>{status}</p>}
      {isLoading && (
        <div className={styles.loading}>
          <FontAwesomeIcon icon={faSpinner} spin /> 正在转换，请稍候...
        </div>
      )}
      {downloadUrl && (
        <a id="downloadLink" href={downloadUrl} className={styles.downloadLink}>
          <FontAwesomeIcon icon={faDownload} /> 点击下载转换后的文件
        </a>
      )}
    </div>
  );
}
