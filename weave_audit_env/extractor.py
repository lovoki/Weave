# 从 dirty_data.log 中提取合法邮箱并写入 clean_emails.json
# 合法邮箱定义：含且仅含一个 '@'，前后均有非空白字符，域名部分含至少一个 '.' 且后缀长度 ≥ 2

import re
import json

# 读取日志
with open('dirty_data.log', 'r', encoding='utf-8') as f:
    content = f.read()

# 精准匹配合法邮箱：
# - 必须有 local-part（非空、不含连续@、不以@开头/结尾）
# - 必须有 domain-part（含至少一个点，TLD 至少两位字母）
# - 整体不包含空格或控制字符
pattern = r'\b[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}\b'
emails = list(set(re.findall(pattern, content)))  # 去重

# 注意：re.findall 返回 tuple 若有捕获组 → 改用 finditer + group(0)
emails = list(set([m.group(0) for m in re.finditer(pattern, content)]))

# 写出 JSON 数组
with open('clean_emails.json', 'w', encoding='utf-8') as f:
    json.dump(emails, f, indent=2)
