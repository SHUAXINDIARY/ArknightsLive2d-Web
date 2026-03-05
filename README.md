# ArknightsLive2d-Web

《明日方舟》Live2D 网页展示项目，基于 `spine-webgl` 渲染模型数据。  
支持在网页中选择并播放干员、敌人，以及皮肤立绘（DynIllust）动画。

## 在线体验

- 站点地址：[https://arknightslive2d.shuaxinjs.cn/](https://arknightslive2d.shuaxinjs.cn/)

## 功能说明

- 首页 `index.html`
  - 支持按名称搜索并选择干员、敌人
  - 内置下拉搜索组件（支持键盘选择、清空已选）
  - 通过侧边栏切换动作
- 皮肤页 `skin.html`
  - 展示 DynIllust 皮肤立绘
  - 默认启用自适应显示（`fitToCanvas`）

## 项目结构

```text
.
├─ index.html              # 首页入口（干员/敌人）
├─ skin.html               # 皮肤页入口（DynIllust）
├─ assets/
│  ├─ css/                 # 样式
│  ├─ js/                  # 渲染与交互逻辑
│  ├─ svg/                 # SVG 图标资源
│  └─ models_data.json     # 模型索引（部分场景使用）
└─ Ark-Models/             # 模型数据子模块
```

## 本地开发

```bash
# 1) 克隆仓库
git clone https://github.com/SHUAXINDIARY/ArknightsLive2d-Web.git
cd ArknightsLive2d-Web

# 2) 初始化子模块（首次必做）
pnpm pre

# 3) 启动静态服务（默认 3000 端口）
pnpm start
```

浏览器访问：`http://localhost:3000/`

## 数据更新

本项目使用 Git Submodule 引入模型数据仓库 `Ark-Models`。  
更新命令：

```bash
pnpm update:data
```

## 技术栈

- 原生 HTML / CSS / JavaScript
- Web Components（自定义选择器、加载组件、抽屉组件）
- Spine WebGL runtime

## 数据来源

- [Ark-Models](https://github.com/isHarryh/Ark-Models)

## 版权声明

本仓库中所有素材版权归属 [上海鹰角网络有限公司](https://www.hypergryph.com/)。  
仅供学习交流，请勿用于商业用途或任何侵权场景。
