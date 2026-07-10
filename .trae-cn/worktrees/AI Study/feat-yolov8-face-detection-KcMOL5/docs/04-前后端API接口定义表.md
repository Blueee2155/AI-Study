# 前后端 API 接口定义表

| 项目名称 | AI 学习助手（考研助手） |
|---------|----------------------|
| 文档版本 | V1.0 |
| 编写日期 | 2026-07-03 |
| Base URL | `http://localhost:8000` |
| 认证方式 | Bearer Token (JWT) |

---

## 通用说明

### 请求格式

- Content-Type: `application/json`（除视觉检测的图像数据外）
- 所有受保护的接口需在 Header 中携带：`Authorization: Bearer {access_token}`

### 响应格式

```json
{
  "field1": "value1",
  "field2": "value2"
}
```

### 错误响应

```json
{
  "error": "错误类型",
  "message": "错误详情",
  "path": "请求路径"
}
```

### HTTP 状态码

| 状态码 | 含义 |
|-------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 / Token 无效 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 一、健康检查

### 1.1 健康检查

| 项目 | 内容 |
|------|------|
| **方法** | `GET` |
| **路径** | `/api/health` |
| **认证** | 不需要 |
| **说明** | 检查后端服务是否正常运行 |

**响应示例**

```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

---

## 二、用户认证模块

### 2.1 用户注册

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/api/auth/register` |
| **认证** | 不需要 |
| **说明** | 注册新用户，返回 JWT Token |

**请求参数**

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| username | string | 是 | 2-50 字符 | 用户名 |
| email | string | 是 | 合法邮箱格式 | 邮箱 |
| password | string | 是 | ≥ 6 位 | 密码 |

**请求示例**

```json
{
  "username": "student01",
  "email": "student@example.com",
  "password": "123456"
}
```

**成功响应 (201)**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "student01",
    "email": "student@example.com",
    "created_at": "2026-07-03T10:00:00"
  }
}
```

**错误响应**

| 状态码 | detail |
|-------|--------|
| 400 | "用户名已被注册" |
| 400 | "邮箱已被注册" |

---

### 2.2 用户登录

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/api/auth/login` |
| **认证** | 不需要 |
| **说明** | 用户登录，返回 JWT Token |

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

**请求示例**

```json
{
  "username": "student01",
  "password": "123456"
}
```

**成功响应 (200)**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "student01",
    "email": "student@example.com",
    "created_at": "2026-07-03T10:00:00"
  }
}
```

**错误响应**

| 状态码 | detail |
|-------|--------|
| 401 | "用户名或密码错误" |

---

### 2.3 获取当前用户信息

| 项目 | 内容 |
|------|------|
| **方法** | `GET` |
| **路径** | `/api/auth/me` |
| **认证** | **需要** |
| **说明** | 获取当前登录用户的详细信息 |

**成功响应 (200)**

```json
{
  "id": 1,
  "username": "student01",
  "email": "student@example.com",
  "created_at": "2026-07-03T10:00:00"
}
```

---

## 三、考研问答模块

### 3.1 创建对话会话

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/api/chat/sessions` |
| **认证** | **需要** |
| **说明** | 创建一个新的对话会话 |

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| subject | string | 是 | 科目（政治/英语/数学/专业课） |
| title | string \| null | 否 | 会话标题，默认"新对话" |

**请求示例**

```json
{
  "subject": "数学",
  "title": "高数极限问题"
}
```

**成功响应 (201)**

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "subject": "数学",
  "title": "高数极限问题",
  "messages": []
}
```

---

### 3.2 发送消息（非流式）

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/api/chat/send` |
| **认证** | **需要** |
| **说明** | 发送问题，等待完整回答后返回 |

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| question | string | 是 | 用户问题 |
| subject | string | 是 | 科目（默认"数学"） |
| session_id | string \| null | 否 | 会话ID，为空则自动生成 |

**请求示例**

```json
{
  "question": "什么是洛必达法则？",
  "subject": "数学",
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**成功响应 (200)**

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "reply": "洛必达法则是用于求解不定式极限的重要方法...\n\n## 📝 知识总结\n- **核心要点**：...\n- **关键公式**：..."
}
```

---

### 3.3 流式对话（SSE）

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/api/chat/stream` |
| **认证** | **需要** |
| **说明** | SSE 流式对话，逐字返回 AI 回答 |
| **响应类型** | `text/event-stream` |

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| question | string | 是 | 用户问题 |
| subject | string | 是 | 科目 |
| session_id | string \| null | 否 | 会话ID |

**SSE 事件格式**

```
event: message
data: {"type": "text", "content": "洛必达"}

event: message
data: {"type": "text", "content": "法则是"}

event: message
data: {"type": "done", "session_id": "550e8400-..."}
```

**SSE 事件类型**

| type | 说明 | content 字段 |
|------|------|-------------|
| text | 文本片段 | AI 回答的一个 chunk |
| done | 流结束 | session_id（完整会话ID） |
| error | 错误 | 错误信息 |

---

### 3.4 获取对话历史

| 项目 | 内容 |
|------|------|
| **方法** | `GET` |
| **路径** | `/api/chat/history/{session_id}` |
| **认证** | **需要** |
| **说明** | 获取指定会话的完整对话记录 |

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| session_id | string | 会话ID (UUID) |

**成功响应 (200)**

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "subject": "数学",
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "什么是洛必达法则？"
    },
    {
      "id": 2,
      "role": "assistant",
      "content": "洛必达法则是用于求解不定式极限的重要方法..."
    }
  ]
}
```

**错误响应**

| 状态码 | detail |
|-------|--------|
| 404 | "对话记录不存在" |

---

### 3.5 获取所有会话列表

| 项目 | 内容 |
|------|------|
| **方法** | `GET` |
| **路径** | `/api/chat/sessions` |
| **认证** | **需要** |
| **说明** | 获取当前用户的所有对话会话，按最后活跃时间排序 |

**成功响应 (200)**

```json
{
  "sessions": [
    {
      "session_id": "550e8400-...",
      "subject": "数学",
      "messages": [...]
    },
    {
      "session_id": "660e8400-...",
      "subject": "英语",
      "messages": [...]
    }
  ]
}
```

---

### 3.6 删除对话

| 项目 | 内容 |
|------|------|
| **方法** | `DELETE` |
| **路径** | `/api/chat/history/{session_id}` |
| **认证** | **需要** |
| **说明** | 删除指定会话的所有对话记录 |

**成功响应 (200)**

```json
{
  "message": "对话已删除"
}
```

---

### 3.7 调试信息

| 项目 | 内容 |
|------|------|
| **方法** | `GET` |
| **路径** | `/api/chat/debug/info` |
| **认证** | 不需要 |
| **说明** | 返回代码版本和运行时信息（仅调试用） |

**成功响应 (200)**

```json
{
  "code_version": "v2-deepseek-httpx-no-openai",
  "python_version": "3.11.5",
  "httpx_version": "0.27.0",
  "note": "使用直接 httpx 调用 DeepSeek API，不依赖 openai 库"
}
```

---

## 四、视觉检测模块

### 4.1 人脸检测与状态识别

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/api/vision/detect` |
| **认证** | 不需要 |
| **说明** | 接收摄像头帧图像，返回人脸检测结果和学习状态 |

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image | string | 是 | Base64 编码的 JPEG 图像，支持 data URL 前缀 |

**请求示例**

```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
}
```

**成功响应 (200)**

```json
{
  "status": "专注",
  "focus_score": 82,
  "reason": "检测到稳定人脸，视线集中",
  "faces": [
    {
      "bbox": [120.5, 60.3, 200.8, 280.4],
      "score": 0.80,
      "source": "opencv"
    }
  ],
  "study_classifier": null,
  "model": "opencv-fallback",
  "frame": {
    "width": 416,
    "height": 312
  }
}
```

**字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | 学习状态：专注 / 分心 / 开小差 / 离开 |
| focus_score | int | 专注分数 (0-100) |
| reason | string | 状态判定原因 |
| faces | array | 人脸检测结果列表 |
| faces[].bbox | array[float] | 人脸框 [x, y, width, height] |
| faces[].score | float | 检测置信度 (0-1) |
| faces[].source | string | 检测来源：opencv / yolov8 |
| study_classifier | object \| null | 学习状态分类模型结果（如有） |
| model | string | 使用的模型：yolov8 / opencv-fallback / unavailable |
| frame | object | 图像尺寸信息 |

**状态说明**

| status | 含义 | focus_score 范围 | 触发条件 |
|--------|------|-----------------|---------|
| 专注 | 用户正在专注学习 | 78-100 | 人脸居中且面积 ≥ 2% |
| 分心 | 用户注意力不集中 | 0-65 | 检测置信度低或位置不稳定 |
| 开小差 | 用户明显走神 | 0-32 | 人脸偏离画面中心 |
| 离开 | 用户不在画面中 | 0-10 | 无人脸或面积 < 1.5% |

---

## 五、学习记录模块

### 5.1 开始学习会话

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/api/study/session/start` |
| **认证** | **需要** |
| **说明** | 开始一次学习记录会话 |

**成功响应 (201)**

```json
{
  "id": 1,
  "start_time": "2026-07-03T10:00:00",
  "end_time": null,
  "focus_duration_seconds": 0,
  "distraction_count": 0
}
```

---

### 5.2 结束学习会话

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/api/study/session/end` |
| **认证** | **需要** |
| **说明** | 结束学习会话，自动计算专注时长 |

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| session_id | int | 是 | 学习会话ID |

**请求示例**

```json
{
  "session_id": 1
}
```

**成功响应 (200)**

```json
{
  "id": 1,
  "start_time": "2026-07-03T10:00:00",
  "end_time": "2026-07-03T10:50:00",
  "focus_duration_seconds": 3000,
  "distraction_count": 3
}
```

---

### 5.3 记录分心事件

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/api/study/distraction` |
| **认证** | **需要** |
| **说明** | 记录一次分心事件，分心计数 +1 |

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| session_id | int | 是 | 学习会话ID |

**成功响应 (200)**

```json
{
  "message": "已记录分心事件",
  "distraction_count": 4
}
```

---

### 5.4 获取每日学习报告

| 项目 | 内容 |
|------|------|
| **方法** | `GET` |
| **路径** | `/api/study/report` |
| **认证** | **需要** |
| **说明** | 获取指定日期的学习报告 |

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| report_date | string | 否 | 日期格式 YYYY-MM-DD，默认今天 |

**请求示例**

```
GET /api/study/report?report_date=2026-07-03
```

**成功响应 (200)**

```json
{
  "date": "2026-07-03",
  "total_focus_minutes": 120,
  "distraction_count": 5,
  "sessions": [
    {
      "id": 1,
      "start_time": "2026-07-03T09:00:00",
      "end_time": "2026-07-03T10:00:00",
      "focus_duration_seconds": 3600,
      "distraction_count": 2
    },
    {
      "id": 2,
      "start_time": "2026-07-03T10:30:00",
      "end_time": "2026-07-03T10:50:00",
      "focus_duration_seconds": 1200,
      "distraction_count": 3
    }
  ]
}
```

---

## 六、运行时设置模块

### 6.1 设置 API Key

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/api/settings/apikey` |
| **认证** | **需要** |
| **说明** | 运行时动态设置 API Key（内存存储，不写入文件） |

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| key | string | 是 | Key 名称：DEEPSEEK_API_KEY 或 OPENAI_API_KEY |
| value | string | 是 | API Key 值（DeepSeek 需以 sk- 开头） |

**请求示例**

```json
{
  "key": "DEEPSEEK_API_KEY",
  "value": "sk-xxxxxxxxxxxxxxxxxxxx"
}
```

**成功响应 (200)**

```json
{
  "status": "ok",
  "key": "DEEPSEEK_API_KEY",
  "configured": true
}
```

**错误响应**

| 状态码 | detail |
|-------|--------|
| 400 | "不支持的 API Key 类型" |
| 400 | "DeepSeek API Key 应以 sk- 开头" |

---

### 6.2 查询 API Key 状态

| 项目 | 内容 |
|------|------|
| **方法** | `GET` |
| **路径** | `/api/settings/apikey/{key_name}` |
| **认证** | **需要** |
| **说明** | 查询某个 API Key 是否已配置（不返回实际值） |

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| key_name | string | DEEPSEEK_API_KEY 或 OPENAI_API_KEY |

**成功响应 (200)**

```json
{
  "key": "DEEPSEEK_API_KEY",
  "configured": true
}
```

---

## 七、接口总览

| # | 方法 | 路径 | 认证 | 模块 | 说明 |
|---|------|------|------|------|------|
| 1 | GET | `/api/health` | 否 | 系统 | 健康检查 |
| 2 | POST | `/api/auth/register` | 否 | 认证 | 用户注册 |
| 3 | POST | `/api/auth/login` | 否 | 认证 | 用户登录 |
| 4 | GET | `/api/auth/me` | 是 | 认证 | 获取当前用户 |
| 5 | POST | `/api/chat/sessions` | 是 | 问答 | 创建会话 |
| 6 | POST | `/api/chat/send` | 是 | 问答 | 发送消息（非流式） |
| 7 | POST | `/api/chat/stream` | 是 | 问答 | SSE 流式对话 |
| 8 | GET | `/api/chat/history/{session_id}` | 是 | 问答 | 获取对话历史 |
| 9 | GET | `/api/chat/sessions` | 是 | 问答 | 获取会话列表 |
| 10 | DELETE | `/api/chat/history/{session_id}` | 是 | 问答 | 删除对话 |
| 11 | GET | `/api/chat/debug/info` | 否 | 问答 | 调试信息 |
| 12 | POST | `/api/vision/detect` | 否 | 视觉 | 人脸检测与状态识别 |
| 13 | POST | `/api/study/session/start` | 是 | 学习 | 开始学习会话 |
| 14 | POST | `/api/study/session/end` | 是 | 学习 | 结束学习会话 |
| 15 | POST | `/api/study/distraction` | 是 | 学习 | 记录分心事件 |
| 16 | GET | `/api/study/report` | 是 | 学习 | 获取每日学习报告 |
| 17 | POST | `/api/settings/apikey` | 是 | 设置 | 设置 API Key |
| 18 | GET | `/api/settings/apikey/{key_name}` | 是 | 设置 | 查询 API Key 状态 |

---

*文档完*
