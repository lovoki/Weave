/**
 * 向后兼容 re-export：历史代码通过此路径 import，类型定义已迁移至 contracts/storage.ts。
 * 请新代码直接从 "../../contracts/storage.js" import。
 */
export type {
  SessionRecord,
  ExecutionRecord,
  WalEventRecord,
  IWalDao,
} from "../../contracts/storage.js";
