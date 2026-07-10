# 🦄 独角兽宠物显示说明

## ❗ 重要提示

**重启电脑后,必须重新启动前后端服务才能看到独角兽!**

---

## ✅ 当前服务状态

| 服务 | 状态 | 地址 |
|------|------|------|
| 后端API | ✅ 运行中 | http://localhost:8000 |
| 前端开发服务器 | ✅ 运行中 | **http://localhost:5173** |

---

## 🚀 访问步骤(请按顺序执行)

### 1. 访问正确的地址
⚠️ **不要访问 localhost:8080**,应该访问:
```
http://localhost:5173
```

### 2. 清除localStorage缓存(首次访问或看不到独角兽时)
打开浏览器开发者工具(F12),切换到Console标签,执行:
```javascript
localStorage.removeItem('unicornPanelPosition');
location.reload();
```

或者访问专用清除页面:
```
http://localhost:5173/clear-cache.html
```
然后点击"清除缓存并返回主页"按钮

### 3. 登录账号
使用任意用户名和密码登录(如 demo/demo123)

### 4. 查看监控面板
登录后,右侧的"学习监控"面板中应该能看到:
- ✅ 白色圆角卡片内有独角兽SVG
- ✅ 独角兽位于卡片**正中心**
- ✅ 可以用鼠标拖动到任意位置
- ✅ 刷新页面后位置保留

---

## 🔧 如果仍然看不到独角兽

### 检查清单:

1. **确认前端服务在运行**
   ```powershell
   netstat -ano | findstr ":5173"
   # 应该看到 LISTENING 状态
   ```

2. **检查浏览器控制台错误**
   - 按 F12 打开开发者工具
   - 查看 Console 标签是否有红色错误
   - 查看 Network 标签确认JS/CSS加载成功

3. **确认localStorage已清除**
   ```javascript
   console.log(localStorage.getItem('unicornPanelPosition'));
   // 应该输出 null
   ```

4. **强制刷新浏览器**
   - Windows: Ctrl + F5
   - Mac: Cmd + Shift + R

5. **使用无痕模式测试**
   - Chrome: Ctrl + Shift + N
   - Edge: Ctrl + Shift + P
   - 访问 http://localhost:5173

---

## 📝 技术细节

### 为什么重启后看不到了?
- 重启电脑后,所有进程(包括Node.js和Python服务)都停止了
- 需要手动重新启动前后端服务

### 为什么是5173端口而不是8080?
- Vite开发服务器默认使用5173端口
- 8080端口可能用于其他用途(如旧的静态文件服务器)
- vite.config.ts中配置的proxy会将/api请求转发到后端8000端口

### 独角兽位置计算
- 父容器尺寸: ~300px宽 × 120px高
- 独角兽尺寸: 80px × 90px  
- 中心位置: x=(300-80)/2=110, y=(120-90)/2=15
- 代码位置: `UnicornAvatar.tsx` 第51-53行

---

## 🔄 每次重启电脑后的操作流程

```bash
# 1. 启动后端(终端1)
cd "d:\AI Study\ai-tutor-backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# 2. 启动前端(终端2)  
cd "d:\AI Study\ai-tutor-frontend"
npm run dev

# 3. 访问浏览器
# 打开 http://localhost:5173
# 清除缓存 → 登录 → 查看独角兽
```

或者使用批处理文件(如果有的话):
```bash
start-all.bat
```

---

## 📞 问题反馈

如果按照上述步骤操作后仍然看不到独角兽,请提供:
1. 浏览器控制台截图(F12 → Console)
2. Network标签中的请求列表
3. localStorage内容: `console.log(localStorage)`
4. 当前访问的URL地址

---

**最后更新**: 2026-07-10  
**适用版本**: AI学习助手 v1.0
