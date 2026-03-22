import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { AppLogger } from "../logging/app-logger.js";
import type { IMemoryStore, MemorySnapshot } from "../../core/ports/memory-store.js";

/**
 * 文件作用：提供文件化记忆系统，统一读取 Agent 风格、用户风格和长期记忆，
 * 并组装为可直接注入大模型的系统提示词文本。
 */
export class MemoryStore implements IMemoryStore {
  private readonly logger = new AppLogger("memory-store");

  constructor(private readonly memoriesDir = "memories") {}

  ensureMemoryFiles(): void {
    // 首次启动时自动创建目录与模板文件，避免因文件缺失导致运行失败。
    const absoluteDir = resolve(process.cwd(), this.memoriesDir);
    this.logger.info("memory.ensure.start", "开始检查记忆目录与模板文件", { absoluteDir });
    if (!existsSync(absoluteDir)) {
      mkdirSync(absoluteDir, { recursive: true });
      this.logger.info("memory.dir.created", "记忆目录不存在，已自动创建", { absoluteDir });
    }

    // 不再使用 SYSTEM_PROMPT.md，统一由 SOUL.md 承载系统行为与风格。
    this.ensureFile(
      "SOUL.md",
      "<!-- 文件作用：定义 Agent 的系统行为和风格语气，用于统一输出。 -->\n你是 Dagent，一个可靠、简洁直白的智能助手。\n"
    );
    this.ensureFile(
      "USER.md",
      "<!-- 文件作用：定义当前用户偏好的沟通风格与输出偏好，用于个性化响应。 -->\n输出默认使用中文。减少输出字数\n"
    );
    this.ensureFile(
      "MEMORY.md",
      "<!-- 文件作用：存放 Agent 的长期记忆摘要（跨会话稳定事实与历史结论）。 -->\n长期记忆初始化。\n"
    );
    this.logger.info("memory.ensure.completed", "记忆模板文件检查完成", { memoriesDir: absoluteDir });
  }

  loadSnapshot(): MemorySnapshot {
    // 快照用于一次性读取本轮所需记忆，避免中途多次 IO 造成不一致。
    this.logger.info("memory.snapshot.load", "开始加载记忆快照");
    return {
      agentStyle: this.readMemoryFile("SOUL.md"),
      userStyle: this.readMemoryFile("USER.md"),
      longTermMemory: this.readMemoryFile("MEMORY.md")
    };
  }

  buildSystemPrompt(basePrompt?: string): string {
    // 将多源记忆按固定结构拼接，确保注入顺序稳定，便于调试与迭代。
    const snapshot = this.loadSnapshot();
    const sections: string[] = [];

    if (basePrompt?.trim()) {
      sections.push("[基础系统提示词]\n" + basePrompt.trim());
    }

    if (snapshot.agentStyle.trim()) {
      sections.push("[Agent 系统行为与风格]\n" + snapshot.agentStyle.trim());
    }

    if (snapshot.userStyle.trim()) {
      sections.push("[用户风格]\n" + snapshot.userStyle.trim());
    }

    if (snapshot.longTermMemory.trim()) {
      sections.push("[长期记忆]\n" + snapshot.longTermMemory.trim());
    }

    this.logger.info("memory.prompt.composed", "系统提示词组装完成", {
      sectionCount: sections.length,
      hasBasePrompt: Boolean(basePrompt?.trim())
    });
    return sections.join("\n\n");
  }

  private readMemoryFile(fileName: string): string {
    const filePath = resolve(process.cwd(), this.memoriesDir, fileName);
    if (!existsSync(filePath)) {
      this.logger.info("memory.file.missing", "记忆文件不存在，按空内容处理", { filePath });
      return "";
    }

    this.logger.info("memory.file.read", "读取记忆文件", { filePath });
    return readFileSync(filePath, "utf8");
  }

  private ensureFile(fileName: string, content: string): void {
    const filePath = resolve(process.cwd(), this.memoriesDir, fileName);
    if (!existsSync(filePath)) {
      // 这里仅负责模板落盘；对话链路日志由 Agent 运行期按 run 维度统一生成。
      writeFileSync(filePath, content, "utf8");
      this.logger.info("memory.file.created", "记忆模板文档已创建", {
        filePath
      });
      return;
    }

    this.logger.info("memory.file.exists", "记忆文档已存在，跳过创建", { filePath });
  }
}
