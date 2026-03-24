# [P3] 生产就绪：npm publish + wss:// + 错误分类

## 目标（可测量）
可作为 npm 包发布，WebSocket 支持 wss://（TLS），错误有明确分类和用户友好消息

## 执行步骤
- [ ] 配置 `package.json` 的 `exports`、`files`、`engines` 字段
- [ ] WebSocket 服务器支持 wss://（自签名证书用于开发，生产由反向代理处理 TLS）
- [ ] 定义错误分类体系：UserError（用户操作错误）/ SystemError（内部错误）/ NetworkError
- [ ] 所有 catch 块：SystemError 记录完整堆栈，UserError 只显示友好消息

## Definition of Done
- [ ] `npm pack` → 生成正确 tarball，无多余文件
- [ ] wss:// 连接成功
- [ ] 错误分类覆盖所有已知异常场景
