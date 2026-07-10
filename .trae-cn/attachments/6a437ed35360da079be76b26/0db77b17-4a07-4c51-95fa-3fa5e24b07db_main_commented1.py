# -*- coding: utf-8 -*-

# 项目: 基于Hadoop+Spark的糖尿病患者数据分析

# 文件: 主入口文件（每行都有注释版 + 进度条 + 环境变量修复）

# 功能: 统一调用所有分析模块，完成完整的数据分析流程

# ========== 第一部分：设置环境变量（必须在最开头！） ==========
# 注意：这些环境变量必须在 import pyspark 或任何 Spark 子模块之前设置

import sys  # 导入sys库，用于获取Python解释器路径和系统相关功能
import os

# ===== 关键修复：设置Hadoop和Java环境变量 =====
# Spark 使用 JDK 17（新版 PySpark 需要 Java 17+）
os.environ['JAVA_HOME'] = r'D:\Sugar_Issue_Collect\Sugar_Issue_Collect\JDK8\jdk-17.0.12.7-hotspot'
os.environ['HADOOP_HOME'] = r'D:\Sugar_Issue_Collect\Sugar_Issue_Collect\hadoop\hadoop-3.3.6'
os.environ['HADOOP_CONF_DIR'] = r'D:\Sugar_Issue_Collect\Sugar_Issue_Collect\hadoop\hadoop-3.3.6\etc\hadoop'

# HDFS 操作专用的 JDK8 路径（和 Hadoop 3.3.6 配套）
HDFS_JAVA_HOME = r'D:\Sugar_Issue_Collect\Sugar_Issue_Collect\JDK8\jdk-8.0.422.5-hotspot'

# 解决PySpark Python版本不匹配问题
python_path = sys.executable  # 获取当前Python解释器的完整路径
os.environ['PYSPARK_PYTHON'] = python_path  # 设置worker进程使用的Python路径
os.environ['PYSPARK_DRIVER_PYTHON'] = python_path  # 设置driver进程使用的Python路径

# 把hadoop的bin目录加到PATH，确保能找到winutils.exe
hadoop_bin = os.path.join(os.environ['HADOOP_HOME'], 'bin')
if hadoop_bin not in os.environ.get('PATH', ''):
    os.environ['PATH'] = hadoop_bin + ';' + os.environ.get('PATH', '')

# 把java的bin目录也加到PATH（JDK17，给Spark用）
java_bin = os.path.join(os.environ['JAVA_HOME'], 'bin')
if java_bin not in os.environ.get('PATH', ''):
    os.environ['PATH'] = java_bin + ';' + os.environ.get('PATH', '')
# ==================================================

import time  # 导入time库，用于获取当前时间
import subprocess  # 导入subprocess库，用于执行系统命令

# ========== 新增：进度条与时间估测 ==========
try:
    from tqdm import tqdm
    TQDM_AVAILABLE = True
except ImportError:
    TQDM_AVAILABLE = False
    print("[WARNING] 未检测到tqdm库，将使用简易进度条。可运行: pip install tqdm 安装美化版")


class ProgressTracker:
    """进度追踪器：管理总进度、模块计时、剩余时间估算"""
    
    def __init__(self, total_modules, module_names):
        self.total = total_modules
        self.module_names = module_names
        self.current_idx = 0
        self.start_time = time.time()
        self.module_times = {}
        self.current_module_start = None
        self.pbar = None
        
        if TQDM_AVAILABLE:
            self.pbar = tqdm(
                total=total_modules,
                desc="总体进度",
                bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}]",
                ncols=80,
                position=0,
                leave=True
            )
        else:
            self._print_simple_progress(0)
    
    def _print_simple_progress(self, completed):
        bar_len = 40
        filled = int(bar_len * completed / self.total)
        bar = '█' * filled + '░' * (bar_len - filled)
        elapsed = time.time() - self.start_time
        if completed > 0:
            eta = elapsed * (self.total - completed) / completed
            eta_str = f"预计剩余: {self._format_time(eta)}"
        else:
            eta_str = "预计剩余: 计算中..."
        print(f"\r总体进度: |{bar}| {completed}/{self.total} "
              f"[已用时: {self._format_time(elapsed)} | {eta_str}]", end='', flush=True)
    
    def _format_time(self, seconds):
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        if hours > 0:
            return f"{hours}时{minutes:02d}分{secs:02d}秒"
        elif minutes > 0:
            return f"{minutes}分{secs:02d}秒"
        else:
            return f"{secs}秒"
    
    def start_module(self, module_key):
        self.current_module_start = time.time()
        module_name = dict(self.module_names).get(module_key, module_key)
        print(f"\n\n▶ 开始执行: [{module_name}]")
        print(f"  当前进度: {self.current_idx}/{self.total} 模块已完成")
        
        elapsed = time.time() - self.start_time
        if self.current_idx > 0:
            avg_time = elapsed / self.current_idx
            remaining_estimate = avg_time * (self.total - self.current_idx)
            print(f"  已运行: {self._format_time(elapsed)}")
            print(f"  预计还需: {self._format_time(remaining_estimate)}")
        else:
            print(f"  已运行: {self._format_time(elapsed)}")
            print(f"  提示: 第一个模块完成后将显示时间预估")
    
    def end_module(self, module_key, success):
        end_time = time.time()
        duration = end_time - self.current_module_start
        self.module_times[module_key] = duration
        self.current_idx += 1
        
        module_name = dict(self.module_names).get(module_key, module_key)
        status = "✅ 成功" if success else "❌ 失败"
        print(f"\n  {module_name} 完成! 耗时: {self._format_time(duration)} [{status}]")
        
        if TQDM_AVAILABLE and self.pbar:
            self.pbar.update(1)
            self.pbar.refresh()
        else:
            self._print_simple_progress(self.current_idx)
    
    def finish(self):
        if TQDM_AVAILABLE and self.pbar:
            self.pbar.close()
        else:
            print()
        
        total_time = time.time() - self.start_time
        print(f"\n{'='*60}")
        print(f"  总耗时: {self._format_time(total_time)}")
        print(f"{'='*60}")
        
        print("\n📊 各模块耗时明细:")
        print("-" * 50)
        for name, key in self.module_names:
            t = self.module_times.get(key, None)
            if t is not None:
                print(f"  {name:20s}: {self._format_time(t)}")
            else:
                print(f"  {name:20s}: 未执行")
        print("-" * 50)
# ==================================================

# 添加当前目录到Python模块搜索路径
sys.path.insert(0, os.path.dirname(__file__))

# HDFS工具函数

def get_hadoop_env():
    # HDFS 操作使用 JDK8（与 Hadoop 3.3.6 配套，兼容性更好）
    return {
        'JAVA_HOME': HDFS_JAVA_HOME,
        'HADOOP_HOME': os.environ['HADOOP_HOME'],
        'HADOOP_CONF_DIR': os.environ['HADOOP_CONF_DIR']
    }

def get_classpath():
    env = get_hadoop_env()
    hadoop_home = env['HADOOP_HOME']
    conf_dir = env['HADOOP_CONF_DIR']
    classpath = f"{conf_dir}"
    classpath += f";{hadoop_home}\\share\\hadoop\\common\\*"
    classpath += f";{hadoop_home}\\share\\hadoop\\common\\lib\\*"
    classpath += f";{hadoop_home}\\share\\hadoop\\hdfs\\*"
    classpath += f";{hadoop_home}\\share\\hadoop\\hdfs\\lib\\*"
    return classpath

def run_hdfs_command(args):
    env = get_hadoop_env()
    full_env = os.environ.copy()
    full_env.update(env)
    java_exe = os.path.join(env['JAVA_HOME'], 'bin', 'java.exe')
    classpath = get_classpath()
    cmd = [java_exe, '-cp', classpath, 'org.apache.hadoop.fs.FsShell'] + args
    result = subprocess.run(cmd, capture_output=True, text=True, env=full_env)
    return result.stdout, result.stderr, result.returncode

def upload_to_hdfs():
    local_path = os.path.join(os.path.dirname(__file__), "diabetes.csv")
    if not os.path.exists(local_path):
        print(f"[ERROR] 本地文件不存在: {local_path}")
        return False
    print(f"[INFO] 本地文件: {local_path}")
    print(f"[INFO] HDFS目标路径: /diabetes/diabetes.csv")
    print("\n[STEP 1] 创建HDFS目录...")
    stdout, stderr, rc = run_hdfs_command(['-mkdir', '-p', '/diabetes'])
    if rc == 0:
        print("[SUCCESS] 目录创建成功")
    else:
        print(f"[WARNING] mkdir返回码: {rc}")
    print("\n[STEP 2] 上传文件到HDFS...")
    stdout, stderr, rc = run_hdfs_command(['-put', '-f', local_path, '/diabetes/diabetes.csv'])
    if rc == 0:
        print("[SUCCESS] 文件上传成功!")
    else:
        print(f"[ERROR] 上传失败: {stderr}")
        return False
    print("\n[STEP 3] 验证HDFS文件...")
    stdout, stderr, rc = run_hdfs_command(['-ls', '/diabetes/diabetes.csv'])
    if rc == 0:
        print("[SUCCESS] HDFS文件验证通过")
        print(f"  文件信息: {stdout.strip()}")
    else:
        print(f"[WARNING] 验证失败")
        return False
    print("\n[COMPLETE] HDFS操作完成!")
    return True

# 主函数

def main():
    print("\n" + "=" * 70)
    print("基于Hadoop+Spark的糖尿病患者数据分析")
    print("=" * 70)
    print(f"开始时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70 + "\n")
    
    # 打印环境信息
    print("[环境检查]")
    print(f"  Spark用Java: {os.environ.get('JAVA_HOME', '未设置')}")
    print(f"  HDFS用Java: {HDFS_JAVA_HOME}")
    print(f"  HADOOP_HOME: {os.environ.get('HADOOP_HOME', '未设置')}")
    print(f"  PYSPARK_PYTHON: {os.environ.get('PYSPARK_PYTHON', '未设置')}")
    print(f"  Python版本: {sys.version}")
    print()
    
    # 初始化进度追踪器
    modules = [
        ('HDFS存储', 'hdfs'),
        ('Spark Core RDD', 'rdd'),
        ('Spark SQL', 'sql'),
        ('Spark MLlib', 'mllib'),
        ('matplotlib可视化', 'visualization')
    ]
    tracker = ProgressTracker(total_modules=len(modules), module_names=modules)
    
    results = {}
    
    # 模块1: HDFS存储
    tracker.start_module('hdfs')
    print("\n" + "=" * 70)
    print("[模块1] HDFS存储")
    print("=" * 70)
    try:
        stdout, stderr, rc = run_hdfs_command(['-ls', '/diabetes/diabetes.csv'])
        if rc == 0:
            print("[INFO] HDFS上已有数据，跳过上传")
            print(f"  文件信息: {stdout.strip()}")
            results['hdfs'] = True
        else:
            hdfs_result = upload_to_hdfs()
            if hdfs_result:
                print("[SUCCESS] HDFS模块执行成功")
                results['hdfs'] = True
            else:
                print("[ERROR] HDFS模块执行失败")
                results['hdfs'] = False
    except Exception as e:
        print(f"[ERROR] HDFS模块异常: {e}")
        results['hdfs'] = False
    tracker.end_module('hdfs', results.get('hdfs', False))
    
    # 模块2: Spark Core RDD
    tracker.start_module('rdd')
    print("\n  ⚡ Spark模块启动提示:")
    print("     - Spark首次启动需要10-30秒初始化，请耐心等待")
    print("     - 如果超过5分钟仍无输出，按Ctrl+C中断查看错误")
    print("     - 已自动配置JDK17 + HADOOP_HOME环境变量")
    print()
    print("\n" + "=" * 70)
    print("[模块2] Spark Core RDD分析")
    print("=" * 70)
    try:
        from spark_core_rdd import clean_data_rdd
        rdd_result = clean_data_rdd()
        if rdd_result is not None:
            print("[SUCCESS] Spark Core RDD模块执行成功")
            results['rdd'] = True
        else:
            print("[ERROR] Spark Core RDD模块执行失败")
            results['rdd'] = False
    except Exception as e:
        print(f"[ERROR] Spark Core RDD模块异常: {e}")
        import traceback
        print(f"[ERROR] 详细堆栈:\n{traceback.format_exc()}")
        results['rdd'] = False
    tracker.end_module('rdd', results.get('rdd', False))
    
    # 模块3: Spark SQL
    tracker.start_module('sql')
    print("\n" + "=" * 70)
    print("[模块3] Spark SQL分析")
    print("=" * 70)
    try:
        from spark_sql import perform_sql_queries
        sql_result = perform_sql_queries()
        if sql_result is not None:
            print("[SUCCESS] Spark SQL模块执行成功")
            results['sql'] = True
        else:
            print("[ERROR] Spark SQL模块执行失败")
            results['sql'] = False
    except Exception as e:
        print(f"[ERROR] Spark SQL模块异常: {e}")
        import traceback
        print(f"[ERROR] 详细堆栈:\n{traceback.format_exc()}")
        results['sql'] = False
    tracker.end_module('sql', results.get('sql', False))
    
    # 模块4: Spark MLlib
    tracker.start_module('mllib')
    print("\n" + "=" * 70)
    print("[模块4] Spark MLlib机器学习")
    print("=" * 70)
    try:
        from spark_mllib import train_and_evaluate_model
        mllib_result = train_and_evaluate_model()
        if mllib_result is not None:
            print("[SUCCESS] Spark MLlib模块执行成功")
            results['mllib'] = True
        else:
            print("[ERROR] Spark MLlib模块执行失败")
            results['mllib'] = False
    except Exception as e:
        print(f"[ERROR] Spark MLlib模块异常: {e}")
        import traceback
        print(f"[ERROR] 详细堆栈:\n{traceback.format_exc()}")
        results['mllib'] = False
    tracker.end_module('mllib', results.get('mllib', False))
    
    # 模块5: 可视化
    tracker.start_module('visualization')
    print("\n" + "=" * 70)
    print("[模块5] matplotlib可视化")
    print("=" * 70)
    try:
        from visualization import generate_visualizations
        viz_result = generate_visualizations()
        if viz_result is not None:
            print("[SUCCESS] 可视化模块执行成功")
            results['visualization'] = True
        else:
            print("[ERROR] 可视化模块执行失败")
            results['visualization'] = False
    except Exception as e:
        print(f"[ERROR] 可视化模块异常: {e}")
        import traceback
        print(f"[ERROR] 详细堆栈:\n{traceback.format_exc()}")
        results['visualization'] = False
    tracker.end_module('visualization', results.get('visualization', False))
    
    tracker.finish()
    
    # 执行结果汇总
    print("\n" + "=" * 70)
    print("执行结果汇总")
    print("=" * 70)
    print("\n模块执行状态:")
    print("-" * 50)
    success_count = 0
    for name, key in modules:
        status = "[OK] 成功" if results.get(key, False) else "[FAIL] 失败"
        print(f"  {name:20s} : {status}")
        if results.get(key, False):
            success_count += 1
    print("-" * 50)
    print(f"  成功模块: {success_count}/{len(modules)}")
    if success_count == len(modules):
        print("\n[COMPLETE] 所有模块执行成功!")
    else:
        print(f"\n[WARNING] {len(modules) - success_count} 个模块执行失败")
    print("\n" + "=" * 70)
    print(f"结束时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70 + "\n")
    return results

if __name__ == "__main__":
    main()