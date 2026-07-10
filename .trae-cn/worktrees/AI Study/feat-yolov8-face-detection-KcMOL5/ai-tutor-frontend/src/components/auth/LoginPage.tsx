import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { ArrowRight, Eye, EyeClosed, Sparkle, GraduationCap } from '@phosphor-icons/react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!username.trim() || !password.trim()) {
      setLocalError('请填写用户名和密码');
      return;
    }
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch {
      // error handled by store
    }
  };

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-2 mesh-bg">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-center p-12 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-300/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
              <Sparkle size={20} weight="fill" className="text-white" />
            </div>
            <span className="text-xl font-semibold text-white tracking-tight">OwlStudy</span>
          </div>
          <div className="w-16 h-16 rounded-[1.25rem] bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8 ring-1 ring-white/10">
            <GraduationCap size={32} weight="bold" className="text-emerald-200" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
            开始你的
            <span className="block text-emerald-200 mt-1">考研备考之旅</span>
          </h1>
          <p className="mt-5 text-base text-emerald-100/70 leading-relaxed max-w-sm">
            AI 驱动的智能学习助手。专注度监测、个性化辅导，助你高效备考。
          </p>
          <div className="mt-10 flex flex-col gap-4">
            {[
              '面部识别专注度监测',
              'AI 智能问答辅导',
              '番茄钟学习管理',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-emerald-100/80">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-xs text-emerald-200/40 mt-12">
          &copy; 2026 OwlStudy
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-16">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Sparkle size={16} weight="fill" className="text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-800 tracking-tight">OwlStudy</span>
          </div>

          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">欢迎回来</h2>
          <p className="mt-2 text-sm text-slate-500">登录以继续你的学习进度</p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            {(error || localError) && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                {localError || error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">用户名</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="请输入用户名"
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
                  placeholder="请输入密码"
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeClosed size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-emerald-600 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-600/25 active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  登录
                  <ArrowRight size={16} weight="bold" />
                </>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-sm text-slate-500">
            还没有账号？{' '}
            <Link to="/register" className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
              立即注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}