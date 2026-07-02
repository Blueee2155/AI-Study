"""
考研知识库导入脚本
将预制的考研知识点批量向量化并存入数据库
"""

import asyncio
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import async_session
from app.models.chat import KnowledgeBase
from app.utils.embedding import get_embeddings_batch

# ===== 考研知识点数据 =====
# 这里仅包含示例数据，实际使用时需要补充完整

KNOWLEDGE_DATA = {
    "政治": [
        {
            "content": "马克思主义哲学的核心观点：1. 物质决定意识，意识对物质有反作用。2. 世界是物质的，物质是运动的，运动是有规律的。3. 实践是认识的来源、动力、目的和检验标准。4. 矛盾是事物发展的根本动力，矛盾普遍性与特殊性相互联结。",
            "source": "马克思主义基本原理概论"
        },
        {
            "content": "唯物辩证法的三大规律：1. 对立统一规律（矛盾规律）——事物发展的根本规律。2. 量变质变规律——事物发展的两种状态。3. 否定之否定规律——事物发展的方向和道路。",
            "source": "马克思主义基本原理概论"
        },
        {
            "content": "认识论核心：实践与认识的辩证关系。实践决定认识：实践是认识的来源、动力、目的和检验标准。认识反作用于实践：正确的认识指导实践取得成功，错误的认识导致实践失败。",
            "source": "马克思主义基本原理概论"
        },
        {
            "content": "毛泽东思想活的灵魂：实事求是、群众路线、独立自主。新民主主义革命总路线：无产阶级领导的，人民大众的，反对帝国主义、封建主义和官僚资本主义的革命。",
            "source": "毛泽东思想和中国特色社会主义理论体系概论"
        },
        {
            "content": "中国特色社会主义进入新时代的主要矛盾：人民日益增长的美好生活需要和不平衡不充分的发展之间的矛盾。习近平新时代中国特色社会主义思想的核心内容：'八个明确'和'十四个坚持'。",
            "source": "习近平新时代中国特色社会主义思想概论"
        },
    ],
    "英语": [
        {
            "content": "考研英语阅读理解六大题型：1. 主旨大意题 2. 细节理解题 3. 推理判断题 4. 词义猜测题 5. 观点态度题 6. 段落结构题。做题顺序：先读题干，再读文章，最后定位答题。",
            "source": "考研英语阅读技巧"
        },
        {
            "content": "长难句分析步骤：1. 找出谓语动词 2. 找出连接词/引导词 3. 划分句子结构 4. 逐步翻译。常见从句类型：定语从句（修饰名词）、状语从句（修饰动词/句子）、名词性从句（作主语/宾语/表语/同位语）。",
            "source": "考研英语语法"
        },
        {
            "content": "考研英语写作模板结构：第一段（描述现象/图表）→ 第二段（分析原因/影响）→ 第三段（总结观点/提出建议）。高分要点：词汇多样性、句式丰富性、逻辑连贯性、语言准确性。",
            "source": "考研英语写作"
        },
        {
            "content": "考研英语核心词汇记忆方法：1. 词根词缀法（如：pre-表示'前'，re-表示'再'）2. 联想记忆法 3. 语境记忆法 4. 分类记忆法。重点记忆：历年真题中出现频率高的2000个核心词汇。",
            "source": "考研英语词汇"
        },
    ],
    "数学": [
        {
            "content": "高等数学核心考点：1. 极限的计算（洛必达法则、等价无穷小、泰勒公式）2. 导数与微分（复合函数求导、隐函数求导、参数方程求导）3. 不定积分与定积分（换元法、分部积分法）4. 微分中值定理（罗尔定理、拉格朗日中值定理、柯西中值定理）",
            "source": "高等数学辅导讲义"
        },
        {
            "content": "线性代数核心考点：1. 行列式的计算 2. 矩阵的运算与秩 3. 向量组的线性相关性 4. 线性方程组解的结构 5. 特征值与特征向量 6. 二次型标准化。重要定理：Cayley-Hamilton定理、谱分解定理。",
            "source": "线性代数辅导讲义"
        },
        {
            "content": "概率论核心考点：1. 随机事件与概率（古典概型、条件概率、全概率公式、贝叶斯公式）2. 随机变量及其分布（离散型/连续型、分布函数）3. 数字特征（期望、方差、协方差、相关系数）4. 大数定律与中心极限定理。",
            "source": "概率论与数理统计辅导讲义"
        },
        {
            "content": "常用等价无穷小（x→0时）：sinx~x, tanx~x, arcsinx~x, arctanx~x, ln(1+x)~x, e^x-1~x, 1-cosx~1/2·x², (1+x)^α-1~αx。记忆口诀：'正弦正切反正弦，反正切与对数，指数减一和幂函，一减余弦半平方'。",
            "source": "高等数学公式手册"
        },
    ],
    "专业课": [
        {
            "content": "计算机考研408核心科目：1. 数据结构（线性表、栈、队列、树、图、排序、查找）2. 计算机组成原理（数据的表示、存储器层次、指令系统、CPU、总线、输入输出）3. 操作系统（进程管理、内存管理、文件管理、设备管理）4. 计算机网络（OSI模型、TCP/IP协议栈、网络层、传输层、应用层）",
            "source": "计算机专业基础综合"
        },
        {
            "content": "数据结构重要算法：1. 排序（快速排序、归并排序、堆排序时间复杂度）2. 树（二叉树遍历、BST、AVL、B树）3. 图（DFS、BFS、最短路径Dijkstra、最小生成树Prim/Kruskal）4. 查找（二分查找、哈希表）。",
            "source": "数据结构考研指导"
        },
        {
            "content": "操作系统核心概念：进程与线程的区别、死锁的四个必要条件（互斥、请求与保持、不可剥夺、环路等待）、页面置换算法（FIFO、LRU、OPT）、磁盘调度算法（先来先服务、最短寻道时间优先、电梯算法）。",
            "source": "操作系统考研指导"
        },
        {
            "content": "计算机网络核心：TCP三次握手（SYN→SYN+ACK→ACK）、四次挥手（FIN→ACK→FIN→ACK）、TCP流量控制（滑动窗口）与拥塞控制（慢开始、拥塞避免、快重传、快恢复）、IP地址分类与CIDR子网划分。",
            "source": "计算机网络考研指导"
        },
    ],
}


async def seed_database():
    """将知识点批量存入数据库"""
    print("开始导入考研知识库...")

    all_docs = []
    for subject, docs in KNOWLEDGE_DATA.items():
        for doc in docs:
            all_docs.append({"subject": subject, **doc})

    print(f"共 {len(all_docs)} 条知识点待导入")

    # 批量生成 embedding
    print("正在生成向量嵌入...")
    contents = [doc["content"] for doc in all_docs]
    embeddings = await get_embeddings_batch(contents)

    # 存入数据库
    print("正在存入数据库...")
    async with async_session() as db:
        for i, doc in enumerate(all_docs):
            kb = KnowledgeBase(
                subject=doc["subject"],
                content=doc["content"],
                embedding=embeddings[i],
                source=doc["source"],
            )
            db.add(kb)
        await db.commit()

    print("✅ 知识库导入完成！")


if __name__ == "__main__":
    asyncio.run(seed_database())
