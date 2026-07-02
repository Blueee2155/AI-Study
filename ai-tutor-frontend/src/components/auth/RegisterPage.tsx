import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { ArrowRight, Eye, EyeClosed, Sparkle } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!username.trim() || !email.trim() || !password.trim()) {
      setLocalError('请填写所有必填字段');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('两次输入的密码不一致');
      return;
    }
    if (password.length < 6) {
      setLocalError('密码长度不能少于 6 位');
      return;
    }

    try {
      await register(username.trim(), email.trim(), password);
      navigate('/');
    } catch {
      // error handled by store
    }
  };

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 -right-24 w-96 h-96 bg-emerald-300/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Sparkle size={20} weight="fill" className="text-white" />
            </div>
            <span className="text-xl font-semibold text-white tracking-tight">OwlStudy</span>
          </div>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
            加入 OwlStudy
            <span className="block text-emerald-200 mt-1">开启高效学习</span>
          </h1>
          <p className="mt-5 text-base text-emerald-100/70 leading-relaxed max-w-sm">
            注册后即可享受 AI 驱动的学习监督、智能问答和专注度分析。
          </p>
        </div>
        <div className="relative z-10 text-xs text-emerald-200/40">
          &copy; 2026 OwlStudy
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-8 lg:p-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex items-center gap-3 mb-16">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Sparkle size={16} weight="fill" className="text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-800 tracking-tight">OwlStudy</span>
          </div>

          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">创建账号</h2>
          <p className="mt-2 text-sm text-slate-500">填写以下信息开始你的学习之旅</p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <AnimatePresence mode="wait">
              {(error || localError) && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600"
                >
                  {localError || error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">用户名</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="例如：考研小王"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">密码</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="至少 6 位密码"
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeClosed size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 rounded-xl bg-emerald-600 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-600/25"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  创建账号
                  <ArrowRight size={16} weight="bold" />
                </>
              )}
            </motion.button>
          </form>

          <p className="mt-10 text-center text-sm text-slate-500">
            已有账号？{' '}
            <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
              立即登录
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}