# WMAVR

中文 PCVR 工具站。页面在浏览器里计算。部署到 Cloudflare Pages 时，构建命令留空，发布目录就是本文件夹。

- `/` 首页
- `/rig/` 串流诊断
- `/gpu/` 显卡编码器
- `/headsets/` 头显对照
- `/wifi/` 网络参考
- `/table/` 能力表

本地预览请在本目录启动 HTTP 服务，再打开对应地址。直接双击 html 时，浏览器不会加载 JSON。

上线前先在 `pages.dev` 走一遍。要把 `wmavr.com` 指过来时，先从 GoDaddy 导出现有 DNS 记录，再改域名服务器。Cloudflare Web Analytics 在面板里打开即可。

改规则只改 `data/rig.json`。
