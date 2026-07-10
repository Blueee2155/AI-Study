# AI学习助手 - 启动指南

##  快速启动

### 方法1: 使用启动脚本(推荐)

双击运行 `start-all.bat` 即可自动启动前后端服务并打开浏览器。

### 方法2: 手动启动

#### 1. 启动后端服务

```bash
cd ai-tutor-backend
.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

后端API地址: http://localhost:8000

#### 2. 启动前端服务

```bash
cd ai-tutor-frontend
python start-server.py
```

前端应用地址: http://localhost:3000

## 📋 功能特性

### 人脸检测与学习状态识别

- **专注 (focused)**: 用户正对屏幕,头部姿态稳定
- **分心 (distracted)**: 头部偏航角过大,转头看向其他方向
- **疲劳 (drowsy)**: 低头角度过大,可能在看手机或打瞌睡
- **离开 (away)**: 未检测到人脸超过10秒

### 检测技术

- **前端**: MediaPipe Face Mesh (本地实时检测)
- **后端**: YOLOv8 + OpenCV Haar Cascade (融合检测)
- **时序平滑**: 滑动窗口多数投票 + 滞回阈值机制
- **摄像头分辨率**: 640x480

## 🔧 技术架构

```
─────────────────────┐
│   Frontend (React)   │
│   Port: 3000         │
│                      │
│  ┌────────────────  │
│  │ MediaPipe      │  │
│  │ Face Mesh      │  │
│  └────────────────  │
│          ↓           │
│  ┌────────────────┐  │
│  │ Backend API    │  │
│  │ /api/vision/   │  │
│  └────────────────┘  │
──────────┬───────────┘
           │
           ↓
┌─────────────────────┐
│   Backend (FastAPI)  │
│   Port: 8000         │
│                      │
│  ┌────────────────┐  │
│  │ YOLOv8 Face    │  │
│  │ Detection      │  │
│  └────────────────┘  │
│          ↓           │
│  ┌────────────────┐  │
│  │ OpenCV Haar    │  │
│  │ Cascade        │  │
│  │ (fallback)     │  │
│  └────────────────┘  │
└─────────────────────┘
```

## ️ 依赖环境

### 后端
- Python 3.11+
- FastAPI
- OpenCV
- Ultralytics YOLOv8
- SQLAlchemy

### 前端
- Node.js 18+ (开发时)
- React 18
- TypeScript
- Vite
- MediaPipe Face Mesh

##  注意事项

1. **摄像头权限**: 首次访问需要授权摄像头权限
2. **网络要求**: 前端需要加载MediaPipe模型(CDN)
3. **性能优化**: 建议在光线充足的环境下使用
4. **隐私保护**: 所有检测在本地进行,不会上传视频数据
5. **SPA路由支持**: 前端已配置单页应用(SPA)路由,所有路径(如 `/login`, `/dashboard`)都会自动返回 `index.html`,由React Router处理客户端路由

## 🔍 故障排查

### 问题1: 无法连接后端

**症状**: 登录页面显示"网络错误: 无法连接后端"

**解决方案**:
1. 确认后端服务已启动(端口8000)
2. 检查防火墙是否阻止8000端口
3. 访问 http://localhost:8000/api/health 验证API是否正常

### 问题2: 摄像头无法访问

**症状**: 提示"无法访问摄像头"

**解决方案**:
1. 检查浏览器摄像头权限设置
2. 确认没有其他程序占用摄像头
3. 尝试刷新页面重新授权

### 问题3: 检测不准确

**解决方案**:
1. 确保光线充足,避免背光
2. 保持面部清晰可见,不要遮挡
3. 调整摄像头角度,使面部居中
4. 等待几秒让系统稳定(时序平滑机制)

##  下一步优化

1. **数据集训练**: 下载WIDER FACE完整数据集并训练YOLOv8模型
2. **学习状态分类器**: 标注数据并训练专用分类器
3. **精度提升**: 部署训练好的模型替换OpenCV fallback
4. **性能优化**: 降低检测频率,减少CPU占用

## 📞 技术支持

如有问题,请检查:
- 后端日志: `ai-tutor-backend/backend.log`
- 浏览器控制台: F12 → Console
- API文档: http://localhost:8000/docs
