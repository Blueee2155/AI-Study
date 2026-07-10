# AI学习助手问题修复计划

## 上下文

用户报告了两个核心问题:
1. **人脸检测4种学习状态不准确** - 专注、分心、开小差、离开的检测准确率低
2. **AI流式回答问题出现错误** - 显示 "抱歉,AI服务暂时不可用 (AsyncClient.init() got an unexpected keyword argument 'proxies')"

经过深入调研,发现这两个问题分别源于不同的根本原因,需要系统性修复。

---

## 问题一: 人脸检测学习状态不准确

### 根本原因分析

1. **前后端完全割裂** - 前端从未调用后端视觉API,仅使用MediaPipe Face Mesh本地检测
2. **检测方法过于简单** - 仅用EAR(眼部纵横比)和头部偏航角两个硬编码阈值判断4种状态
3. **缺乏时序平滑** - 无滑动窗口投票、无状态滞回、无眨眼频率(PERCLOS)检测
4. **摄像头分辨率过低** - 320x240不足以准确捕捉眼部细节
5. **状态语义映射错误** - `drowsy`(困倦)被显示为"开小差",语义严重不符
6. **后端模型未训练/部署** - YOLOv8人脸检测、学习状态分类器模型文件全部缺失

### 修复方案

#### P0优先级(立即可做,无需训练模型)

**任务1.1: 修正状态语义映射**
- 修改文件: 
  - `ai-tutor-frontend/src/components/monitor/StudyMonitor.tsx` 第139行
  - `ai-tutor-frontend/src/components/monitor/StatusBadge.tsx` 第12行
- 将 `drowsy` 的显示从"开小差"改为"疲劳"或"困倦"
- 如需"开小差"概念,新增 `off_task` 状态并实现对应检测逻辑

**任务1.2: 添加时序平滑机制**
- 修改文件: `ai-tutor-frontend/src/hooks/useFaceDetection.ts`
- 实现滑动窗口投票(维护最近10帧状态列表,多数投票决定当前状态)
- 为所有状态添加滞回阈值(进入阈值宽松,退出阈值严格)
- 防止状态在两个值间频繁跳变

**任务1.3: 添加PERCLOS眨眼检测**
- 修改文件: `ai-tutor-frontend/src/hooks/useFaceDetection.ts`
- 记录连续帧的EAR值序列
- 计算单位时间内眼睛闭合比例(PERCLOS)
- PERCLOS > 0.4 作为疲劳判据(行业标准)
- 替代单一帧的瞬时EAR判断

**任务1.4: 提高摄像头分辨率**
- 修改文件: `ai-tutor-frontend/src/hooks/useFaceDetection.ts` 第68行
- 将摄像头分辨率从 320x240 提升到 640x480
- 改善面部关键点定位精度

**任务1.5: 利用俯仰角(pitch)检测低头**
- 修改文件: `ai-tutor-frontend/src/hooks/useFaceDetection.ts` 第152行
- 当前pitch已计算但从未使用
- 大幅低头是疲劳/打瞌睡的重要信号
- 添加pitch阈值判断(如 pitch > 30度判定为低头疲劳)

#### P1优先级(需要数据准备和模型训练)

**任务1.6: 打通前后端视觉API**
- 修改文件:
  - `ai-tutor-frontend/src/services/api.ts` - 新增 `/api/vision/detect` 接口调用
  - `ai-tutor-frontend/src/hooks/useFaceDetection.ts` - 集成后端API调用
- 前端将视频帧发送到后端 `/api/vision/detect`
- 后端返回融合后的状态结果(YOLOv8 + 规则 + 分类器)
- 或采用混合方案:前端实时初筛,后端周期性精确判断

**任务1.7: 准备训练数据集**
- 运行脚本:
  - `ai-tutor-backend/scripts/prepare_widerface_yolo.py` - 准备WIDER FACE人脸数据集
  - `ai-tutor-backend/scripts/prepare_wflw_eye_yolo.py` - 准备WFLW眼睛数据集
- 手动采集/标注4类学习状态数据集(study-state/)
  - 建议每类至少500-1000张图片
  - 类别: 专注、分心、疲劳、离开
- 创建目录结构:
  - `ai-tutor-backend/datasets/face-study/`
  - `ai-tutor-backend/datasets/eye-study/`
  - `ai-tutor-backend/datasets/study-state/`
  - `ai-tutor-backend/datasets/eye-state/`

**任务1.8: 训练并部署模型**
- 训练脚本:
  - `ai-tutor-backend/scripts/train_yolov8_face.py` - YOLOv8人脸检测
  - `ai-tutor-backend/scripts/train_yolov8_eye.py` - YOLOv8眼睛检测
  - `ai-tutor-backend/scripts/train_study_state_classifier.py` - 学习状态分类器
  - `ai-tutor-backend/scripts/train_eye_state_classifier.py` - 眼睛状态分类器
- 将训练好的模型文件放到 `ai-tutor-backend/models/` 目录:
  - `yolov8n-face.pt`
  - `yolov8n-eye.pt`
  - `yolov8n-study-cls.pt`
  - `yolov8n-eye-cls.pt`
- 优化训练参数:
  - 增加epochs(当前仅60,建议200+)
  - 添加数据增强(Mosaic、MixUp、随机擦除)
  - 使用GPU加速(如有)

---

## 问题二: AI流式回答错误

### 根本原因分析

**依赖包版本兼容性问题**: `openai==1.55.0` 与 `httpx==0.28.1` 不兼容

- httpx 0.28.0 移除了 `AsyncClient.__init__()` 中的 `proxies` 参数
- openai 1.55.0 仍硬编码传递 `proxies=proxies`(即使值为None)
- 导致错误: `TypeError: AsyncClient.__init__() got an unexpected keyword argument 'proxies'`
- anthropic 0.42.0 存在相同问题

项目代码本身无问题(`chat_service.py` 和 `embedding.py` 直接使用httpx且未传proxies),但requirements.txt中声明了不兼容的openai和anthropic版本。

### 修复方案

**任务2.1: 升级依赖包到兼容版本(推荐)**
- 修改文件: `ai-tutor-backend/requirements.txt`
- 执行命令:
  ```bash
  cd d:\AI Study\ai-tutor-backend
  .venv\Scripts\pip.exe install --upgrade openai anthropic
  ```
- 更新requirements.txt:
  ```diff
  - openai==1.55.0
  - anthropic==0.42.0
  + openai>=1.58.0
  + anthropic>=0.40.0
  + httpx>=0.27.2,<0.29.0
  ```

**备选方案B: 锁定httpx到兼容版本**
- 如果升级openai/anthropic有其他风险,可降级httpx:
  ```bash
  .venv\Scripts\pip.exe install httpx==0.27.2
  ```
- 在requirements.txt中添加: `httpx==0.27.2`

**备选方案C: 移除未使用的依赖(最佳实践)**
- 由于项目代码不直接使用openai和anthropic包(chat服务直接用httpx调用DeepSeek API),可从requirements.txt中移除这两个依赖
- 修改requirements.txt:
  ```diff
  - anthropic==0.42.0
  - openai==1.55.0
  ```

---

## 关键文件路径汇总

### 人脸检测相关
- `ai-tutor-frontend/src/hooks/useFaceDetection.ts` - 前端人脸检测核心逻辑
- `ai-tutor-frontend/src/components/monitor/StudyMonitor.tsx` - 状态显示组件
- `ai-tutor-frontend/src/components/monitor/StatusBadge.tsx` - 状态徽章组件
- `ai-tutor-frontend/src/services/api.ts` - API调用服务(需新增vision接口)
- `ai-tutor-backend/app/routers/vision.py` - 后端视觉检测API
- `ai-tutor-backend/scripts/train_yolov8_face.py` - YOLOv8人脸检测训练
- `ai-tutor-backend/scripts/train_yolov8_eye.py` - YOLOv8眼睛检测训练
- `ai-tutor-backend/scripts/train_study_state_classifier.py` - 学习状态分类器训练
- `ai-tutor-backend/scripts/train_eye_state_classifier.py` - 眼睛状态分类器训练
- `ai-tutor-backend/scripts/prepare_widerface_yolo.py` - WIDER FACE数据集准备
- `ai-tutor-backend/scripts/prepare_wflw_eye_yolo.py` - WFLW眼睛数据集准备
- `ai-tutor-backend/datasets/` - 数据集目录(需创建)
- `ai-tutor-backend/models/` - 模型文件目录(需放置训练好的模型)

### AI流式回答相关
- `ai-tutor-backend/requirements.txt` - 依赖声明(需修改)
- `ai-tutor-backend/app/services/chat_service.py` - 聊天服务(代码本身无问题)
- `ai-tutor-backend/app/utils/embedding.py` - Embedding服务(代码本身无问题)
- `.venv\Lib\site-packages\openai\_base_client.py` 第1438-1446行 - 错误源头(第三方库)
- `.venv\Lib\site-packages\anthropic\_base_client.py` 第1401-1402行 - 同类问题(第三方库)

---

## 验证方法

### 人脸检测验证
1. **基础功能测试** - 启动前端应用,开启摄像头,确认能检测到人脸并显示状态
2. **状态准确性测试** - 模拟4种状态(专注看书、转头看旁边、闭眼打哈欠、离开座位),观察状态切换是否准确
3. **时序平滑测试** - 快速移动头部,观察状态是否稳定(不应频繁跳变)
4. **PERCLOS测试** - 持续闭眼5秒以上,应触发疲劳状态
5. **分辨率测试** - 对比320x240和640x480的检测效果差异

### AI流式回答验证
1. **基础验证** - 确认openai客户端可正常初始化:
   ```bash
   .venv\Scripts\python.exe -c "from openai import AsyncOpenAI; c = AsyncOpenAI(api_key='test', base_url='https://api.deepseek.com/v1'); print('OK')"
   ```
2. **端到端验证** - 启动后端服务,通过前端发送一条聊天消息,确认流式回答正常显示,不再出现 "AI服务暂时不可用" 错误
3. **日志检查** - 查看后端控制台/日志,确认无 `TypeError` 异常

---

## 执行顺序建议

1. **先修复问题二(AI流式回答)** - 这是阻塞性bug,影响核心功能,且修复简单(只需修改requirements.txt并重新安装依赖)
2. **再修复问题一的P0任务** - 这些任务无需训练模型,可立即提升准确率
3. **最后执行问题一的P1任务** - 需要数据准备和模型训练,周期较长

---

## 风险提示

1. **人脸检测改进** - P0任务可显著提升准确率,但要达到理想效果仍需P1任务的模型训练
2. **依赖升级** - 如果项目未来需要使用openai或anthropic SDK的功能,建议采用方案A升级到兼容版本;方案C(移除依赖)最干净,但需确认没有遗漏的代码路径使用了这些包
3. **数据标注质量** - P1任务的效果高度依赖于训练数据的质量和数量,建议仔细标注
4. **性能考虑** - 提高摄像头分辨率和添加时序平滑会增加计算开销,需在低端设备上测试性能
