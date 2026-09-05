# 技术方案 — 奶龙德州扑克

## 一、技术栈选型

| 层 | 方案 | 版本 | 说明 |
|---|------|------|------|
| 前端框架 | React | 18+ | 组件化 UI，生态丰富 |
| 跨端框架 | Taro | 4.x | 后续迁移微信小程序用 |
| 构建工具 | Vite (Web) / Webpack (Taro) | — | Web 版先用 Vite 快速开发 |
| 语言 | TypeScript | 5.x | 全栈类型安全 |
| 样式 | SCSS + CSS Modules | — | 组件级样式隔离，灵活度高于 Tailwind 适用于游戏 UI |
| 状态管理 | Zustand | 4.x | 轻量，Hook 友好 |
| 实时通信 | Socket.IO | 4.x | WebSocket 封装，房间广播 |
| 服务端 | Node.js + Express | 18+ / 4.x | 轻量 HTTP + WS 服务 |
| 测试 | Vitest | 1.x | 引擎单元测试 |
| Monorepo | npm workspaces | — | 原生支持，零额外依赖 |

## 二、环境要求

- Node.js >= 18
- npm >= 9
- 开发系统：Windows / macOS / Linux

## 三、核心依赖清单

### 前端 (client/)

```json
{
  "react": "^18",
  "react-dom": "^18",
  "zustand": "^4",
  "socket.io-client": "^4"
}
```

### 游戏引擎 (packages/engine/)

```json
{
  "typescript": "^5"
}
```

> 零运行时依赖，纯逻辑代码。

### 服务端 (server/)

```json
{
  "express": "^4",
  "socket.io": "^4",
  "cors": "^2",
  "tsx": "^4",
  "typescript": "^5"
}
```

### 开发工具

```json
{
  "vitest": "^1",
  "sass": "^1",
  "@types/react": "^18",
  "@types/express": "^4"
}
```

## 四、技术决策说明

### 为什么 Web 版先用 Vite 而不是直接上 Taro？

- Taro 项目的编译链较复杂，开发反馈循环慢
- 游戏 UI 需要大量 CSS 动画和精细布局，标准 HTML/CSS 环境更灵活
- 游戏引擎（纯 TS）零平台依赖，Taro 迁移时只需改写 UI 层
- Web 版验证完玩法后再加 Taro 适配层，风险更低

### 为什么选择 Zustand 而不是 Redux？

- 游戏状态更新频繁（倒计时、动画），Zustand 的细粒度订阅性能更好
- API 更简洁，样板代码少
- 与 React hooks 天然契合

### 为什么 Socket.IO？

- 比裸 WebSocket 多了房间概念，天然适合德州扑克房间管理
- 自动重连、心跳机制
- 服务端和客户端都有完善的 TypeScript 支持
