import "@/styles/globals.css"; // 引入全局样式
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";

// 禁用 Font Awesome 的服务器端渲染
config.autoAddCss = false;

function MyApp({ Component, pageProps }) {
  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
