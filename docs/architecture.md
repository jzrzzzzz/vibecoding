# 架构设计 — 奶龙德州扑克

## 一、分层架构

```
┌──────────────────────────────────────────────┐
│           UI 层 (client/src/)                 │
│  pages/  页面容器                             │
│  components/  通用组件                        │
│  stores/  Zustand 状态管理                    │
│  hooks/   自定义 Hooks                        │
├──────────────────────────────────────────────┤
│       适配层 (client/src/bridge/)              │
│  socket.ts     WebSocket 通信封装              │
│  audio.ts      音效管理                        │
│  storage.ts    本地存储（昵称等）               │
├─────── 网络边界 ──────────────────────────────┤
│   ┌─────────────┐  ┌──────────────────────┐   │
│   │  客户端 AI   │  │     服务端仲裁        │   │
│   │ (本地运行)   │  │  (好友对战时权威)     │   │
│   └─────────────┘  └──────────────────────┘   │
├──────────────────────────────────────────────┤
│       游戏引擎层 (packages/engine/src/)        │
│  纯 TypeScript，零平台依赖，全端复用           │
│  ├─ deck.ts        牌组操作                   │
│  ├─ evaluator.ts   手牌评估                   │
│  ├─ game-state.ts  游戏状态机                 │
│  ├─ betting.ts     下注逻辑                   │
│  ├─ pot.ts         底池计算（含边池）          │
│  ├─ types.ts       核心类型定义               │
│  └─ ai/            AI 决策引擎                │
└──────────────────────────────────────────────┘
```

## 二、模块职责

### 2.1 游戏引擎 (packages/engine/) — 核心

**deck.ts**：牌组创建、Fisher-Yates 洗牌、发牌

**evaluator.ts**：从 7 张牌中选出最佳 5 张组合，返回手牌等级 + 比较值
- 输入：`Card[]` (7 张，含 2 张底牌 + 5 张公共牌)
- 输出：`HandRank { rank: HandType, value: number[], cards: Card[] }`
- 算法：遍历 C(7,5) = 21 种组合，取最大

**types.ts**：核心枚举和接口
```typescript
enum Suit { Hearts, Diamonds, Clubs, Spades }
enum HandType { HighCard, OnePair, TwoPair, ThreeOfAKind, Straight, Flush, FullHouse, FourOfAKind, StraightFlush, RoyalFlush }
enum GamePhase { Idle, PreFlop, Flop, Turn, River, Showdown }
enum ActionType { Fold, Check, Call, Raise, AllIn }
```

**game-state.ts**：游戏状态机
- 持有完整的游戏状态：玩家列表、牌组、公共牌、底池、当前阶段、当前行动玩家
- 方法：`startHand()`, `processAction()`, `nextPhase()`, `determineWinner()`
- 事件回调：`onPhaseChange`, `onPlayerAction`, `onHandEnd`

**betting.ts**：下注逻辑
- 最小加注额约束
- All-in 处理
- 当前下注轮的最大/最小合法下注计算

**pot.ts**：底池管理
- 主池 + 边池划分
- 当有人 All-in 且筹码不足时正确分池
- 结算时按池分配

### 2.2 AI 引擎 (packages/engine/src/ai/)

**base.ts**：AI 基类，定义决策接口
```typescript
interface AIDecision {
  action: ActionType;
  amount?: number; // raise/all-in amount
}
abstract class AIPlayer {
  abstract decide(state: GameStateView): AIDecision;
}
```

**easy.ts**：简单 AI
- 手牌强度粗略分类（好/中/差）
- 好牌跟注或小加注，中等牌跟注，差牌弃牌
- 10% 概率随机诈唬

**medium.ts**：中等 AI
- 计算底池赔率 (pot odds)
- 根据位置调整策略（后位更激进）
- 20% 概率诈唬

**hard.ts**：困难 AI
- 手牌范围 vs 范围的胜率估算（Monte Carlo 快速采样）
- GTO 简化：平衡价值下注与诈唬比例
- 识别牌面纹理（干燥/湿润）
- 半诈唬（听牌时加注）

### 2.3 客户端 (client/)

**状态管理 (Zustand)**：
```typescript
// gameStore — 牌桌状态
interface GameStore {
  players: PlayerState[];
  communityCards: Card[];
  pot: PotState;
  currentPhase: GamePhase;
  currentPlayerIndex: number;
  myCards: Card[];
  availableActions: ActionType[];
  // ...
}

// roomStore — 房间状态
interface RoomStore {
  roomCode: string;
  players: RoomPlayer[];
  isHost: boolean;
  // ...
}
```

**通信层 (bridge/socket.ts)**：
- 与 Socket.IO 服务端通信
- 人机对战模式：仅本地，不连服务端
- 好友对战模式：通过 Socket.IO 与服务端同步

### 2.4 服务端 (server/)

**room-manager.ts**：
- `Map<roomCode, Room>` 内存存储
- 创建房间（生成唯一 6 位码）
- 加入/离开房间
- 房间过期清理（闲置 30 分钟自动销毁）

**game-controller.ts**：
- 每个房间内嵌一个 `GameState` 实例（来自 engine）
- 接收玩家操作 → 验证合法性 → 执行 → 广播新状态
- 定时器管理（15 秒操作超时自动弃牌）

**socket-handlers.ts**：
```typescript
// 事件定义
'room:create'      → 创建房间
'room:join'        → 加入房间
'room:leave'       → 离开房间
'room:settings'    → 房主修改设置
'game:start'       → 房主开始游戏
'game:action'      → 玩家提交操作
'game:state'       → 服务端广播状态（客户端被动接收）
'player:disconnect'→ 掉线处理
```

## 三、数据流

### 人机对战模式（纯客户端）
```
用户操作 → GameState.processAction() → 更新 Zustand store → UI 重渲染
                                      → AI 玩家轮次 → AI.decide() → GameState.processAction()
```

### 好友对战模式（客户端-服务端）
```
用户操作 → socket.emit('game:action') → 服务端 game-controller 验证并执行
                                      → socket.emit('game:state', newState) 广播给所有玩家
                                      → 各客户端接收 → 更新 Zustand → UI 重渲染
```

## 四、关键设计决策

1. **引擎不在服务端运行（好友对战除外）**：人机对战完全客户端本地，避免服务端依赖
2. **服务端权威**：好友对战中，一切游戏逻辑执行在服务端，客户端不得修改游戏状态
3. **AI 本地化**：AI 引擎运行在客户端，不增加服务端负担
4. **状态驱动 UI**：UI 层完全由 Zustand store 驱动，不自行维护游戏状态
