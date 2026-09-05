// ============================================================
// 奶龙德州扑克 — 核心类型定义
// 纯 TypeScript，零外部依赖
// ============================================================

/** 花色 */
export enum Suit {
  Hearts = 'hearts',     // ♥ 红心
  Diamonds = 'diamonds', // ♦ 方块
  Clubs = 'clubs',       // ♣ 梅花
  Spades = 'spades',     // ♠ 黑桃
}

/** 点数 (2-14，14=Ace) */
export enum Rank {
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
  Ten = 10,
  Jack = 11,
  Queen = 12,
  King = 13,
  Ace = 14,
}

/** 一张扑克牌 */
export interface Card {
  suit: Suit;
  rank: Rank;
}

/** 手牌类型（从低到高） */
export enum HandType {
  HighCard = 0,
  OnePair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
  RoyalFlush = 9,
}

/** 手牌评估结果 */
export interface HandRank {
  type: HandType;
  /** 比较值，从高到低排列。
   *  例如 FullHouse(6,5): type + [6,6,6,5,5] → 用 [type, 6, 5] 比较 */
  value: number[];
  /** 最佳5张牌 */
  cards: Card[];
}

/** 游戏阶段 */
export enum GamePhase {
  Idle = 'idle',           // 等待开始
  PreFlop = 'preflop',
  Flop = 'flop',
  Turn = 'turn',
  River = 'river',
  Showdown = 'showdown',
}

/** 玩家行动类型 */
export enum ActionType {
  Fold = 'fold',
  Check = 'check',
  Call = 'call',
  Raise = 'raise',
  AllIn = 'allin',
}

/** 玩家座位状态 */
export enum PlayerStatus {
  Waiting = 'waiting',     // 等待中（未加入/旁观）
  Active = 'active',       // 当前手牌进行中
  Folded = 'folded',       // 已弃牌
  AllIn = 'allin',         // 已全押
  Eliminated = 'eliminated', // 筹码归零淘汰
}

/** 玩家 */
export interface Player {
  id: string;
  name: string;
  chips: number;
  holeCards: Card[];
  status: PlayerStatus;
  /** 当前手牌已投入底池的筹码 */
  currentBet: number;
  /** 本局总投入筹码 */
  totalBet: number;
  /** 座位索引 (0-8) */
  seatIndex: number;
  /** 是否 AI */
  isAI: boolean;
  /** AI 难度（仅 AI 玩家有效） */
  aiDifficulty?: AIDifficulty;
}

/** AI 难度 */
export enum AIDifficulty {
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard',
}

/** 玩家行动 */
export interface PlayerAction {
  playerId: string;
  actionType: ActionType;
  /** 加注金额或 All-in 金额（其他行动为 0） */
  amount: number;
}

/** 底池 */
export interface Pot {
  /** 总金额 */
  amount: number;
  /** 有资格竞争此池的玩家 ID 列表 */
  eligiblePlayerIds: string[];
}

/** 游戏配置 */
export interface GameConfig {
  /** 小盲金额 */
  smallBlind: number;
  /** 大盲金额 */
  bigBlind: number;
  /** 初始筹码 */
  initialChips: number;
  /** 操作超时（秒） */
  actionTimeout: number;
}

/** 游戏完整状态（快照，用于渲染） */
export interface GameState {
  /** 所有玩家（按座位序） */
  players: Player[];
  /** 牌组（剩余未发牌） */
  deck: Card[];
  /** 公共牌 */
  communityCards: Card[];
  /** 底池（含主池和边池） */
  pots: Pot[];
  /** 当前游戏阶段 */
  phase: GamePhase;
  /** 当前需要行动的玩家索引 */
  currentPlayerIndex: number;
  /** 庄家（Dealer Button）座位索引 */
  dealerIndex: number;
  /** 当前轮次最高下注 */
  currentBet: number;
  /** 本局总下注（用于计算最小加注） */
  totalRoundBet: number;
  /** 游戏配置 */
  config: GameConfig;
  /** 当前手牌编号 */
  handNumber: number;
  /** 上一轮行动（用于 UI 提示） */
  lastAction?: PlayerAction;
  /** 本轮已经行动过的玩家 ID（用于判断轮次是否结束） */
  actedPlayerIds: string[];
}

/** AI 决策视图（AI 可见的游戏信息，隐藏其他玩家底牌） */
export interface GameStateView {
  phase: GamePhase;
  communityCards: Card[];
  pots: Pot[];
  currentBet: number;
  config: GameConfig;
  /** AI 自身 */
  self: Player;
  /** 其他玩家（不含底牌） */
  opponents: Omit<Player, 'holeCards'>[];
  /** 仍活跃的玩家数 */
  activePlayerCount: number;
  /** 当前下注轮次的总加注次数 */
  raiseCount: number;
}

// ============================================================
// 辅助函数
// ============================================================

/** 花色显示字符 */
export function suitSymbol(suit: Suit): string {
  switch (suit) {
    case Suit.Hearts: return '♥';
    case Suit.Diamonds: return '♦';
    case Suit.Clubs: return '♣';
    case Suit.Spades: return '♠';
  }
}

/** 花色颜色 */
export function suitColor(suit: Suit): 'red' | 'black' {
  return (suit === Suit.Hearts || suit === Suit.Diamonds) ? 'red' : 'black';
}

/** 点数显示字符 */
export function rankSymbol(rank: Rank): string {
  switch (rank) {
    case Rank.Ace: return 'A';
    case Rank.King: return 'K';
    case Rank.Queen: return 'Q';
    case Rank.Jack: return 'J';
    case Rank.Ten: return '10';
    default: return String(rank);
  }
}

/** 手牌类型显示名 */
export function handTypeName(type: HandType): string {
  switch (type) {
    case HandType.RoyalFlush: return '皇家同花顺';
    case HandType.StraightFlush: return '同花顺';
    case HandType.FourOfAKind: return '四条';
    case HandType.FullHouse: return '葫芦';
    case HandType.Flush: return '同花';
    case HandType.Straight: return '顺子';
    case HandType.ThreeOfAKind: return '三条';
    case HandType.TwoPair: return '两对';
    case HandType.OnePair: return '一对';
    case HandType.HighCard: return '高牌';
  }
}

/** 创建一副标准 52 张牌（不洗牌） */
export function create52Deck(): Card[] {
  const suits = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades];
  const ranks: Rank[] = [];
  for (let r = 2; r <= 14; r++) ranks.push(r as Rank);
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/** Fisher-Yates 洗牌（原地修改 + 返回） */
export function shuffleDeck(deck: Card[]): Card[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** 从牌组顶部发 n 张牌 */
export function dealCards(deck: Card[], n: number): Card[] {
  return deck.splice(0, n);
}
