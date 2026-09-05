# CLAUDE.md — 奶龙德州扑克项目指引

## 项目简介

"奶龙德州扑克"是一款卡通可爱风格的德州扑克游戏，以奶龙（卡通龙形象）为主题。支持人机对战（3 个难度等级）和好友房间对战。Web H5 优先，后续迁移微信小程序。

## 文档索引

所有项目标准文件位于 `docs/` 目录：

| 文档 | 路径 | 说明 |
|------|------|------|
| 需求文档 | [docs/requirements.md](docs/requirements.md) | 游戏功能需求、玩法规则、交互流程 |
| 技术方案 | [docs/tech-stack.md](docs/tech-stack.md) | 技术栈选型、依赖清单、环境要求 |
| 设计规范 | [docs/design-spec.md](docs/design-spec.md) | 奶龙主题色板、UI 组件规范、动画标准 |
| 架构设计 | [docs/architecture.md](docs/architecture.md) | 分层架构、模块职责、数据流设计 |
| 实施计划 | [docs/implementation-plan.md](docs/implementation-plan.md) | 分阶段开发步骤、里程碑定义 |

开发日志位于 `devlog/` 目录，按日期命名（如 `devlog/2026-07-06.md`）。

## 工作原则

1. **稳步推进**：按实施计划的阶段逐一完成，每个阶段完成并通过验证后，再进入下一阶段
2. **每日日志**：每次开发会话结束后，更新当天的开发日志，记录完成事项和待办事项
3. **文档驱动**：修改或新增功能前，先更新对应的标准文档，保持文档与代码一致
4. **最小可验证单元**：每个模块完成后立即验证（单元测试或手动测试），不积压问题
5. **纯逻辑分离**：游戏引擎代码必须保持零平台依赖，放在 `packages/engine/` 中

## 项目结构

```
nailong-poker/
├── CLAUDE.md                  # 本文件 — 项目总指引
├── docs/                      # 标准文档
│   ├── requirements.md        # 需求文档
│   ├── tech-stack.md          # 技术方案
│   ├── design-spec.md         # 设计规范
│   ├── architecture.md        # 架构设计
│   └── implementation-plan.md # 实施计划
├── devlog/                    # 开发日志
│   └── YYYY-MM-DD.md
├── packages/
│   └── engine/                # 纯 TS 游戏逻辑 + AI（零平台依赖）
├── client/                    # Web 客户端（Taro + React）
├── server/                    # Node.js 服务端
└── package.json               # monorepo 根配置
```

## 常用命令

```bash
# 引擎测试
cd packages/engine && npx vitest

# 客户端开发
cd client && npm run dev:h5

# 服务端开发
cd server && npm run dev
```
