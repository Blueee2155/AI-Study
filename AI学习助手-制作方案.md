# AI 学习助手 - 完整制作方案

---

## 项目概述

一款 Web 端考研学习助手，核心功能：
1. **学习状态监督**：通过浏览器调用摄像头，实时检测用户学习状态（是否分神/打瞌睡），通过屏幕上的虚拟宠物发出温柔语音提醒（约 25 分钟一次）
2. **考研问答系统**：专门的考研方向对话问答，解决备考中遇到的问题

---

## 一、技术选型总览

| 层级 | 技术 | 理由 |
|------|------|------|
| 前端 | React 18 + TypeScript + Tailwind CSS | 生态成熟，Web 摄像头 API 支持好 |
| 面部检测 | TensorFlow.js + face-landmarks-detection | 纯浏览器端运行，不占用后端 |
| 语音合成 | Web Speech API (SpeechSynthesis) | 浏览器原生支持，无需额外依赖 |
| 宠物动画 | Lottie / CSS Sprite 动画 | 轻量，表现力好 |
| 后端 | Python FastAPI | AI/ML 生态最强，异步性能好 |
| 大模型 | Claude API (通过 Anthropic SDK) | 上下文长，中文能力强 |
| 考研知识库 | PostgreSQL + pgvector 向量检索 | 存储考研资料，实现 RAG 增强问答 |
| 用户系统 | JWT (python-jose) | 轻量鉴权 |
| 部署 | Docker Compose (前端 Nginx + 后端 + 数据库) | 一键部署 |

---

## 二、项目架构图

```
┌─────────────────────────────────────────────────────────┐
│                     浏览器 (用户)                         │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐ │
│  │ 摄像头模块 │  │ 小宠物 UI │  │    问答对话界面         │ │
│  │TensorFlow│  │Lottie动画 │  │   Chat UI + Markdown   │ │
│  │ 人脸检测  │  │语音提醒   │  │                        │ │
│  └────┬─────┘  └────┬─────┘  └───────────┬────────────┘ │
│       │              │                    │              │
└───────┼──────────────┼────────────────────┼──────────────┘
        │              │        HTTP/WebSocket
        ▼              ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                     FastAPI 后端                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐ │
│  │ 用户模块  │  │ 问答模块  │  │     学习记录模块         │ │
│  │ 注册/登录 │  │ Claude   │  │   专注时长/分心次数      │ │
│  │ JWT 鉴权  │  │ API 调用 │  │   学习报告              │ │
│  └──────────┘  └────┬─────┘  └───────────┬────────────┘ │
│                     │                     │              │
│              ┌──────▼──────┐              │              │
│              │  RAG 知识库  │              │              │
│              │ pgvector    │              │              │
│              │ 考研资料检索 │              │              │
│              └──────┬──────┘              │              │
│                     │                     │              │
│              ┌──────▼─────────────────────▼─────┐        │
│              │        PostgreSQL                │        │
│              │  用户表 / 对话记录 / 学习记录      │        │
│              └─────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

---

## 三、详细制作步骤

### 阶段一：环境搭建（第 1-2 天）

#### 1.1 开发环境准备

```bash
# 前端环境
node -v  # 确认 >= 18
npm create vite@latest ai-tutor-frontend -- --template react-ts
cd ai-tutor-frontend
npm install
npm install tailwindcss @tailwindcss/vite
npm install @tensorflow/tfjs @tensorflow-models/face-landmarks-detection
npm install lottie-react
npm install marked  # Markdown 渲染
npm install zustand  # 状态管理
npm install react-router-dom  # 路由

# 后端环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install fastapi uvicorn[standard] --break-system-packages
pip install anthropic openai --break-system-packages
pip install sqlalchemy asyncpg pgvector psycopg2-binary --break-system-packages
pip install python-jose[cryptography] passlib[bcrypt] --break-system-packages
pip install pydantic python-multipart --break-system-packages
```

#### 1.2 数据库初始化

```sql
-- 启动 PostgreSQL，创建数据库
CREATE DATABASE ai_tutor;
CREATE EXTENSION IF NOT EXISTS vector;  -- pgvector 扩展

-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 学习记录表
CREATE TABLE study_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    focus_duration_seconds INT DEFAULT 0,
    distraction_count INT DEFAULT 0
);

-- 考研知识库表（向量存储）
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(50),      -- 科目：政治/英语/数学/专业课
    content TEXT NOT NULL,
    embedding vector(1536),   -- OpenAI embedding 维度
    source VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 对话历史表
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    session_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL,  -- user / assistant
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 阶段二：前端开发 —— 核心模块（第 3-10 天）

#### 2.1 项目结构

```
ai-tutor-frontend/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Dashboard.tsx       # 主布局
│   │   │   └── Sidebar.tsx         # 侧边栏导航
│   │   ├── monitor/
│   │   │   ├── CameraView.tsx      # 摄像头实时画面
│   │   │   ├── FaceDetector.ts     # TF.js 面部检测逻辑
│   │   │   └── StatusBadge.tsx     # 学习状态指示器
│   │   ├── pet/
│   │   │   ├── VirtualPet.tsx      # 虚拟宠物组件
│   │   │   ├── PetBubble.tsx       # 宠物对话气泡
│   │   │   └── PetAnimations.ts    # 动画配置
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx       # 问答面板
│   │   │   ├── MessageList.tsx     # 消息列表
│   │   │   ├── MessageInput.tsx    # 输入框
│   │   │   └── MessageBubble.tsx   # 消息气泡（Markdown 渲染）
│   │   └── common/
│   │       ├── Timer.tsx           # 25分钟计时器
│   │       └── Settings.tsx        # 设置面板
│   ├── hooks/
│   │   ├── useFaceDetection.ts     # 面部检测 Hook
│   │   ├── useVoiceReminder.ts     # 语音提醒 Hook
│   │   └── useStudyTimer.ts       # 学习计时器 Hook
│   ├── stores/
│   │   ├── authStore.ts            # 用户状态
│   │   ├── studyStore.ts           # 学习状态
│   │   └── chatStore.ts            # 对话状态
│   ├── services/
│   │   └── api.ts                  # Axios API 封装
│   ├── types/
│   │   └── index.ts               # TypeScript 类型定义
│   ├── App.tsx
│   └── main.tsx
└── package.json
```

#### 2.2 核心模块实现要点

##### A. 摄像头 + 面部检测模块（关键）

```typescript
// hooks/useFaceDetection.ts 核心逻辑

import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

// 检测指标：
// 1. 头部姿态（偏转角度）：偏转 > 30° 视为分心
// 2. 眼睛开合度（EAR）：EAR < 0.2 持续 3 秒 = 打瞌睡
// 3. 视线方向：长时间不看屏幕 = 走神
// 4. 是否离开座位：画面中无人脸 > 10 秒 = 离开

export function useFaceDetection(onStatusChange: (status: StudyStatus) => void) {
  // status: 'focused' | 'distracted' | 'drowsy' | 'away'
  const [model, setModel] = useState(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function init() {
      await tf.ready();
      const model = await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh
      );
      setModel(model);

      // 开启摄像头
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current!.srcObject = stream;
    }
    init();
  }, []);

  // 每 500ms 检测一次
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!model || !videoRef.current) return;
      const predictions = await model.estimateFaces({
        input: videoRef.current
      });
      // 分析面部特征点 → 判断状态 → 回调 onStatusChange
    }, 500);
    return () => clearInterval(interval);
  }, [model]);
}
```

##### B. 虚拟宠物 + 语音提醒模块

```
宠物设计建议：
- 外观：一只可爱的卡通猫头鹰（象征智慧）
- 状态动画映射：
  - 用户专注 → 宠物安静看书 / 点头
  - 用户分心 → 宠物轻轻敲屏幕 / 挥翅膀
  - 用户瞌睡 → 宠物打哈欠 / 摇晃铃铛
  - 25 分钟到 → 宠物跳出来说"该休息一下啦~"
- 语音实现：使用 Web Speech API
  const utterance = new SpeechSynthesisUtterance('你已经学习25分钟啦，起来走动一下吧~');
  utterance.lang = 'zh-CN';
  utterance.rate = 0.9;  // 语速稍慢更温柔
  window.speechSynthesis.speak(utterance);
```

##### C. 问答对话界面

```
UI 布局（左中右三栏）：
┌────────────┬──────────────────┬────────────┐
│  科目选择   │                  │  学习状态   │
│  · 政治    │   对话消息区      │  专注度:   │
│  · 英语    │                  │  ████░░ 80%│
│  · 数学    │  [用户消息气泡]   │            │
│  · 专业课  │  [AI 回复气泡]    │  🦉 小宠物 │
│            │                  │  (动画)    │
│  历史对话   │  ┌──────────┐   │            │
│  · 昨天    │  │ 输入框... │   │  计时器    │
│  · 前天    │  │    [发送] │   │  22:35     │
│            │  └──────────┘   │            │
└────────────┴──────────────────┴────────────┘
```

---

### 阶段三：后端开发（第 11-18 天）

#### 3.1 项目结构

```
ai-tutor-backend/
├── app/
│   ├── main.py                 # FastAPI 入口
│   ├── config.py               # 配置文件
│   ├── models/
│   │   ├── user.py             # 用户 ORM 模型
│   │   ├── chat.py             # 对话 ORM 模型
│   │   └── study.py            # 学习记录 ORM 模型
│   ├── schemas/
│   │   ├── user.py             # Pydantic 请求/响应模型
│   │   ├── chat.py
│   │   └── study.py
│   ├── routers/
│   │   ├── auth.py             # 注册/登录 API
│   │   ├── chat.py             # 问答对话 API (SSE 流式)
│   │   └── study.py            # 学习记录 API
│   ├── services/
│   │   ├── auth_service.py     # JWT 鉴权逻辑
│   │   ├── chat_service.py     # 调用 Claude API + RAG
│   │   └── rag_service.py      # 向量检索 + 上下文注入
│   ├── core/
│   │   ├── database.py         # 数据库连接
│   │   └── security.py         # 密码哈希 / JWT
│   └── utils/
│       └── embedding.py        # 文本向量化工具
├── scripts/
│   └── seed_knowledge.py       # 考研知识库导入脚本
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

#### 3.2 核心 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录，返回 JWT |
| POST | `/api/chat/send` | 发送消息（SSE 流式返回） |
| GET | `/api/chat/history/{session_id}` | 获取对话历史 |
| DELETE | `/api/chat/history/{session_id}` | 删除对话 |
| POST | `/api/study/session/start` | 开始学习记录 |
| POST | `/api/study/session/end` | 结束学习记录 |
| POST | `/api/study/distraction` | 记录一次分心事件 |
| GET | `/api/study/report?date=2026-06-30` | 获取每日学习报告 |

#### 3.3 RAG 问答流程（核心）

```
用户提问："马克思主义哲学的核心观点是什么？"
         │
         ▼
┌────────────────────┐
│ 1. 问题向量化       │  ← OpenAI text-embedding-3-small
│   embedding(提问)   │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ 2. 向量相似度检索    │  ← pgvector cosine_similarity
│   knowledge_base   │  ← 检索 top-5 最相关内容
│   ORDER BY         │
│   embedding        │
│   <=> query_embed  │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ 3. 构建增强 Prompt  │
│                     │
│ System: 你是考研    │
│ 辅导助手。参考以下   │
│ 资料回答问题：      │
│  [检索到的5条内容]  │
│                     │
│ User: 马克思主义    │
│ 哲学的核心观点...   │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ 4. 调用 Claude API │  ← SSE 流式返回
│   逐字返回给前端    │
└────────────────────┘
```

#### 3.4 关键代码：问答服务

```python
# services/chat_service.py

import anthropic

client = anthropic.AsyncAnthropic(api_key="your-api-key")

async def generate_answer(
    question: str,
    subject: str,
    history: list[dict],
    user_id: int
) -> AsyncGenerator[str, None]:
    """流式生成回答，结合 RAG"""

    # 1. 检索相关知识
    relevant_docs = await rag_service.search(question, subject, top_k=5)

    # 2. 构建 system prompt
    system_prompt = f"""你是一位专业的考研辅导助手，擅长{subject}科目。
参考以下考研资料来回答问题。如果资料不足以回答，请基于你的知识补充，但要说明信息来源。

【参考资料】
{chr(10).join(f"- {doc.content}" for doc in relevant_docs)}

【要求】
- 条理清晰，适当使用序号或分段
- 涉及重要概念时给出定义
- 如有公式，使用 LaTeX 格式 $$
- 结束时可以推荐 1-2 道相关真题"""

    # 3. 流式调用 Claude
    async with client.messages.stream(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=system_prompt,
        messages=history + [{"role": "user", "content": question}]
    ) as stream:
        async for text in stream.text_stream:
            yield text  # SSE 推送给前端
```

---

### 阶段四：考研知识库构建（第 19-22 天）

#### 4.1 数据来源

需要收集以下资料并向量化存入 knowledge_base：

| 科目 | 资料来源 |
|------|---------|
| 政治 | 肖秀荣精讲精练、徐涛核心考案的知识点摘要 |
| 英语 | 考研英语大纲词汇、长难句解析、阅读技巧 |
| 数学 | 张宇/李永乐等辅导书的定理公式、经典题型 |
| 专业课 | 根据用户报考专业定制 |

#### 4.2 数据导入脚本

```python
# scripts/seed_knowledge.py

import asyncio
from openai import AsyncOpenAI
from app.core.database import async_session
from app.models.chat import KnowledgeBase
from sqlalchemy import text

client = AsyncOpenAI(api_key="your-key")

async def embed_and_store(documents: list[dict]):
    """批量向量化并存入数据库"""
    async with async_session() as db:
        for doc in documents:
            # 调用 embedding API
            response = await client.embeddings.create(
                model="text-embedding-3-small",
                input=doc["content"]
            )
            embedding = response.data[0].embedding

            # 存入 pgvector
            kb = KnowledgeBase(
                subject=doc["subject"],
                content=doc["content"],
                embedding=embedding,
                source=doc["source"]
            )
            db.add(kb)
        await db.commit()
```

---

### 阶段五：联调与测试（第 23-26 天）

#### 5.1 前端-后端联调

```
重点关注：
1. SSE 流式对话是否正常（错误重连、断点续传）
2. JWT token 过期刷新机制
3. 摄像头权限处理（用户拒绝时的 fallback）
4. 面部检测性能（是否导致页面卡顿，考虑 Web Worker）
```

#### 5.2 测试清单

| 测试项 | 方法 |
|--------|------|
| 面部检测准确率 | 真人测试：专注/分心/瞌睡/离开 各 20 次，统计识别率 |
| 25 分钟提醒 | 缩短为 1 分钟测试，确认语音+宠物动画触发正常 |
| 问答质量 | 准备 20 道典型考研题，人工评估回答质量 |
| 流式响应延迟 | 从发送到首字出现应在 1.5 秒内 |
| 并发压力 | `wrk` 或 `locust` 模拟 50 并发对话 |

---

### 阶段六：部署上线（第 27-30 天）

#### 6.1 Docker Compose 配置

```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./ai-tutor-frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  backend:
    build: ./ai-tutor-backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/ai_tutor
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - db

  db:
    image: pgvector/pgvector:pg16
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=ai_tutor
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

#### 6.2 部署命令

```bash
# 本地部署（需要 Docker）
docker compose up -d

# 或部署到云服务器（阿里云/腾讯云 学生机即可，2C4G 够用）
# 注意：摄像头只能在 localhost 或 HTTPS 下调用
# 生产环境需配置 HTTPS（Let's Encrypt + Nginx 反向代理）
```

---

## 四、开发时间线总览

```
第 1-2 天   环境搭建、数据库初始化
第 3-6 天   前端：摄像头 + 面部检测 + 宠物 UI
第 7-10 天  前端：问答界面 + Web Speech 语音
第 11-14 天 后端：用户系统 + JWT + 基础 API
第 15-18 天 后端：Claude 集成 + RAG 检索 + SSE 流式
第 19-22 天 考研知识库构建 + 向量化导入
第 23-26 天 前后端联调 + 测试 + Bug 修复
第 27-30 天 Docker 部署 + 上线 + 文档

总计约 1 个月（全职开发）
```

---

## 五、关键难点与解决方案

| 难点 | 解决方案 |
|------|---------|
| 浏览器面部检测精度不够 | 使用 MediaPipe FaceMesh（468 个特征点），比基础方案更准；配合头部姿态估计算法 |
| 宠物动画不够生动 | 找设计师做 Lottie 动画，或使用 Rive 交互式动画工具 |
| 考研知识库资料不足 | 先手动整理核心知识点 + 真题集；后续可爬取公开考研资料 |
| Claude API 费用控制 | 启用对话上下文压缩（超过 10 轮时自动摘要）；限制单次最大 token |
| 摄像头隐私顾虑 | 所有面部检测在浏览器本地完成，不传输任何图像到后端；加上隐私声明 |

---

## 六、拓展方向（V2 计划）

- 学习计划自动生成（根据考试日期倒推每日任务）
- 错题本功能（AI 自动识别薄弱点）
- 番茄钟 + 白噪音
- 多人学习房间（好友互相监督）
- 每日学习报告推送到微信/邮箱