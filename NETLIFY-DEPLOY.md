# Netlify 部署说明

这个项目是 **Next.js 16 + App Router**，不是可以把源码文件直接拖进 Netlify Deploy 页面就运行的纯静态 HTML。

## 正确部署方式（推荐）

1. 将整个项目上传到 GitHub。
2. Netlify 连接这个 GitHub 仓库。
3. Netlify Build command：`npm run build`
4. Publish directory：`.next`
5. 在 Netlify 的环境变量中设置：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. 设置环境变量后，重新触发一次 **Clear cache and deploy site**。

Netlify 会先执行 Next.js build，再部署 `.next`。这样 Supabase 的 `NEXT_PUBLIC_*` 环境变量才会被编译进浏览器代码。

## Supabase 数据库

第一次使用云同步前，在 Supabase SQL Editor 执行项目根目录的 `supabase.sql`。

然后打开网站：

**设置 → 云端自动同步**

注册/登录账号即可。

## 为什么不能直接拖源码

直接拖 `app/`、`components/`、`package.json` 等源码到 Netlify 的手动 Deploy 页面，并不会替你执行 `npm run build`。

这个项目必须经过 Next.js build。
