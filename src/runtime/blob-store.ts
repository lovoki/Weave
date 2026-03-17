/**
 * 文件作用：大数据对象按需存储。
 * 超过 BLOB_THRESHOLD（50KB）时写入临时文件并返回 blobRef，
 * 未超阈值时直接返回内联 content。
 * 全部接口 async，避免阻塞主线程。
 */

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const BLOB_THRESHOLD = 50 * 1024; // 50KB

export class BlobStore {
  private readonly blobDir: string;
  private readonly memCache = new Map<string, string>();

  constructor() {
    this.blobDir = join(tmpdir(), "dagent-blobs");
  }

  /**
   * 存储内容。
   * - 若序列化后 <= 50KB：返回 { content: originalContent }
   * - 若超出阈值：写入临时文件，返回 { content: null, blobRef: id }
   */
  async store(content: unknown): Promise<{ content: unknown; blobRef?: string }> {
    let serialized: string;
    try {
      serialized = JSON.stringify(content);
    } catch {
      // 不可序列化时直接返回截断字符串
      return { content: String(content).slice(0, 500) };
    }

    if (serialized.length <= BLOB_THRESHOLD) {
      return { content };
    }

    // 超阈值：写临时文件
    const id = randomBytes(16).toString("hex");
    try {
      await mkdir(this.blobDir, { recursive: true });
      const filePath = join(this.blobDir, `${id}.json`);
      await writeFile(filePath, serialized, "utf-8");
    } catch {
      // 文件写入失败：降级为内存缓存
      this.memCache.set(id, serialized);
    }

    return { content: null, blobRef: id };
  }

  /**
   * 按 blobRef 取回内容。
   */
  async get(blobRef: string): Promise<unknown> {
    // 先查内存缓存
    const cached = this.memCache.get(blobRef);
    if (cached) {
      return JSON.parse(cached) as unknown;
    }

    const filePath = join(this.blobDir, `${blobRef}.json`);
    try {
      const data = await readFile(filePath, "utf-8");
      return JSON.parse(data) as unknown;
    } catch {
      return null;
    }
  }
}

/** 全局单例，供节点类使用 */
export const globalBlobStore = new BlobStore();
