# -*- coding: utf-8 -*-
# 第一部分：设置环境变量（必须在import pyspark之前！）
import os
import sys

# ===== 关键修复：设置Hadoop和Java环境变量 =====
os.environ['HADOOP_HOME'] = r'D:\Sugar_Issue_Collect\Sugar_Issue_Collect\hadoop\hadoop-3.3.6'
os.environ['JAVA_HOME'] = r'D:\Sugar_Issue_Collect\Sugar_Issue_Collect\JDK8\jdk-17.0.12.7-hotspot'

python_path = sys.executable
os.environ['PYSPARK_PYTHON'] = python_path
os.environ['PYSPARK_DRIVER_PYTHON'] = python_path

hadoop_bin = os.path.join(os.environ['HADOOP_HOME'], 'bin')
if hadoop_bin not in os.environ.get('PATH', ''):
    os.environ['PATH'] = hadoop_bin + ';' + os.environ.get('PATH', '')
# ============================================

# 第二部分：导入必要的Python库
from pyspark.sql import SparkSession  # 从PySpark SQL库导入SparkSession，这是Spark 2.0+的新入口点
from pyspark.sql.functions import col, when, avg, count, lit  # 导入常用的SQL函数
from pyspark.sql.types import StructType, StructField, DoubleType  # 导入数据类型定义

# 第三部分：主函数 - 执行SQL查询
def perform_sql_queries():
    
    print("=" * 60)  # 打印60个等号作为分隔线
    print("Spark SQL模块")  # 打印模块名称
    print("=" * 60)  # 打印60个等号作为分隔线
    
    print("[INFO] 正在初始化SparkSession，请稍候...")
    
    # 步骤1: 创建SparkSession
    # SparkSession是Spark 2.0+的新入口点，整合了SparkContext和SQLContext
    # builder模式: 链式调用配置方法
    # appName(): 设置应用名称
    # master(): 设置运行模式（"local"表示本地模式）
    # getOrCreate(): 获取或创建SparkSession实例
    # 创建SparkSession：设置应用名称、本地运行模式，获取或创建实例
    spark = (
        SparkSession.builder
        .appName("Diabetes SQL Analysis")
        .master("local[*]")
        .getOrCreate()
    )
    # 设置日志级别为WARN，减少不必要的日志输出
    spark.sparkContext.setLogLevel("WARN")  # 设置日志级别
    
    try:  # 开始try块
        print("[SUCCESS] SparkSession初始化成功!")
        
        # 步骤2: 定义数据文件路径
        # 定义HDFS和本地文件路径
        # ===== 修复：HDFS路径修正 =====
        hdfs_path = "hdfs://localhost:9000/diabetes/diabetes.csv"  # HDFS上的文件路径（已修正）
        local_path = os.path.join(os.path.dirname(__file__), "diabetes.csv")  # 本地文件路径
        
        # 步骤3: 定义数据schema（数据结构）
        # 字段说明：
        # Pregnancies - 怀孕次数
        # Glucose - 葡萄糖水平（口服葡萄糖耐量测试）
        # BloodPressure - 舒张压（mm Hg）
        # SkinThickness - 三头肌皮褶厚度（mm）
        # Insulin - 2小时血清胰岛素（mu U/ml）
        # BMI - 体质指数（kg/m²）
        # DiabetesPedigreeFunction - 糖尿病家族遗传函数
        # Age - 年龄
        # Outcome - 患病结果（0=未患病，1=患病）
        # 定义DataFrame的schema（数据结构）
        # StructType: 定义整个DataFrame的结构
        # StructField: 定义单个字段
        # 参数: (字段名, 数据类型, 是否允许为null)
        schema = StructType([
            StructField("Pregnancies", DoubleType(), True),  # 怀孕次数
            StructField("Glucose", DoubleType(), True),  # 葡萄糖水平
            StructField("BloodPressure", DoubleType(), True),  # 血压
            StructField("SkinThickness", DoubleType(), True),  # 皮肤厚度
            StructField("Insulin", DoubleType(), True),  # 胰岛素水平
            StructField("BMI", DoubleType(), True),  # 体质指数
            StructField("DiabetesPedigreeFunction", DoubleType(), True),  # 糖尿病家族遗传函数
            StructField("Age", DoubleType(), True),  # 年龄
            StructField("Outcome", DoubleType(), True)  # 患病结果
        ])  # schema定义完成
        
        # 步骤4: 尝试读取数据（优先HDFS，失败则用本地）
        print(f"\n[STEP 1] 尝试从HDFS读取数据...")
        try:  # 开始内层try块
            # 尝试从HDFS读取CSV文件
            # spark.read.csv(): 读取CSV文件
            # header=True: 第一行是表头
            # schema=schema: 使用定义的schema
            df = spark.read.csv(hdfs_path, header=True, schema=schema)  # 读取HDFS文件
            # 测试是否能成功读取
            df.first()  # 触发计算，测试路径是否有效
            print(f"[SUCCESS] 从HDFS读取成功")  # 打印成功信息
        except Exception as e:  # 捕获异常（HDFS不存在等情况）
            print(f"[INFO] HDFS读取失败，切换到本地文件: {str(e)[:80]}...")
            # HDFS不存在，从本地文件读取
            local_path_with_schema = "file:///" + local_path.replace('\\', '/')
            df = spark.read.csv(local_path_with_schema, header=True, schema=schema)  # 读取本地文件
            print(f"[INFO] 使用本地文件: {local_path}")  # 打印读取来源
        
        # 打印原始数据记录数
        print(f"[INFO] 原始数据记录数: {df.count()}")  # 统计并打印记录数
        
        # 步骤5: 数据清洗
        print("\n[STEP 2] 清洗异常值...")  # 打印步骤提示
        # 使用filter()过滤掉异常值
        # col(): 引用DataFrame中的列
        # != 0: 不等于0
        # &: 逻辑与操作符
        df_cleaned = df.filter(
            (col("Glucose") != 0) &  # Glucose不为0
            (col("BloodPressure") != 0) &  # BloodPressure不为0
            (col("BMI") != 0)  # BMI不为0
        )  # 过滤完成
        # 打印清洗后的记录数
        print(f"[SUCCESS] 清洗后记录数: {df_cleaned.count()}")  # 统计并打印清洗后的记录数
        
        # 步骤6: 创建临时视图
        print("\n[STEP 3] 创建临时视图...")  # 打印步骤提示
        # 创建临时视图，用于SQL查询
        # createOrReplaceTempView(): 创建或替换临时视图
        # 视图名: "diabetes"
        # 创建后可以使用SQL语句查询这个视图
        df_cleaned.createOrReplaceTempView("diabetes")  # 创建临时视图
        print("[SUCCESS] 临时视图 'diabetes' 创建完成")  # 打印成功信息
        
        # 步骤7: SQL查询1 - 患病率统计
        print("\n[STEP 4] 执行SQL查询...")  # 打印步骤提示
        print("\n" + "=" * 60)  # 打印分隔线
        print("查询1: 总体患病率统计")  # 打印查询标题
        print("=" * 60)  # 打印分隔线
        # 使用spark.sql()执行SQL查询
        # SQL语句: 计算总体患病率
        result1 = spark.sql("""
            SELECT
                COUNT(*) as total_count,  -- 总样本数
                SUM(CASE WHEN Outcome = 1 THEN 1 ELSE 0 END) as positive_count,  -- 患病数
                SUM(CASE WHEN Outcome = 0 THEN 1 ELSE 0 END) as negative_count,  -- 未患病数
                ROUND(SUM(CASE WHEN Outcome = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as positive_rate,  -- 患病率
                ROUND(SUM(CASE WHEN Outcome = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as negative_rate  -- 未患病率
            FROM diabetes
        """)  # SQL查询完成
        # 显示查询结果
        result1.show()  # 打印查询结果表格
        
        # 步骤8: SQL查询2 - 按年龄段分组的患病率
        print("=" * 60)  # 打印分隔线
        print("查询2: 按年龄段分组的患病率")  # 打印查询标题
        print("=" * 60)  # 打印分隔线
        # SQL查询: 按年龄段分组统计患病率
        result2 = spark.sql("""
            SELECT
                CASE
                    WHEN Age < 30 THEN '20-29'  -- 年龄小于30岁
                    WHEN Age < 40 THEN '30-39'  -- 年龄30-39岁
                    WHEN Age < 50 THEN '40-49'  -- 年龄40-49岁
                    WHEN Age < 60 THEN '50-59'  -- 年龄50-59岁
                    ELSE '60+'  -- 年龄60岁以上
                END as age_group,  -- 年龄段
                COUNT(*) as total_count,  -- 该年龄段总人数
                SUM(CASE WHEN Outcome = 1 THEN 1 ELSE 0 END) as positive_count,  -- 该年龄段患病数
                ROUND(SUM(CASE WHEN Outcome = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as positive_rate  -- 该年龄段患病率
            FROM diabetes
            GROUP BY
                CASE
                    WHEN Age < 30 THEN '20-29'
                    WHEN Age < 40 THEN '30-39'
                    WHEN Age < 50 THEN '40-49'
                    WHEN Age < 60 THEN '50-59'
                    ELSE '60+'
                END
            ORDER BY age_group  -- 按年龄段排序
        """)  # SQL查询完成
        # 显示查询结果
        result2.show()  # 打印查询结果表格
        
        # 步骤9: SQL查询3 - 患病vs未患病各指标均值对比
        print("=" * 60)  # 打印分隔线
        print("查询3: 患病vs未患病各指标均值对比")  # 打印查询标题
        print("=" * 60)  # 打印分隔线
        # SQL查询: 计算患病和未患病组的各指标平均值
        result3 = spark.sql("""
            SELECT
                Outcome,  -- 患病结果（0或1）
                ROUND(AVG(Pregnancies), 2) as avg_pregnancies,  -- 平均怀孕次数
                ROUND(AVG(Glucose), 2) as avg_glucose,  -- 平均葡萄糖水平
                ROUND(AVG(BloodPressure), 2) as avg_blood_pressure,  -- 平均血压
                ROUND(AVG(SkinThickness), 2) as avg_skin_thickness,  -- 平均皮肤厚度
                ROUND(AVG(Insulin), 2) as avg_insulin,  -- 平均胰岛素水平
                ROUND(AVG(BMI), 2) as avg_bmi,  -- 平均BMI
                ROUND(AVG(DiabetesPedigreeFunction), 2) as avg_pedigree,  -- 平均遗传函数值
                ROUND(AVG(Age), 2) as avg_age,  -- 平均年龄
                COUNT(*) as count  -- 样本数
            FROM diabetes
            GROUP BY Outcome  -- 按患病结果分组
            ORDER BY Outcome  -- 按患病结果排序
        """)  # SQL查询完成
        # 显示查询结果
        result3.show()  # 打印查询结果表格
        
        # 步骤10: 收集查询结果
        print("\n" + "=" * 60)  # 打印分隔线
        print("查询结果汇总")  # 打印标题
        print("=" * 60)  # 打印分隔线
        # 将查询结果转换为Python列表，便于后续使用
        # collect(): 将DataFrame转换为Row对象列表
        age_data = result2.collect()  # 收集年龄段患病率数据
        comparison_data = result3.collect()  # 收集均值对比数据
        
        print("\n[SUCCESS] SQL查询完成!")  # 打印成功信息
        print("=" * 60)  # 打印分隔线
        # 返回查询结果
        return {
            'age_data': age_data,  # 年龄段患病率
            'comparison_data': comparison_data,  # 均值对比
            'df_cleaned': df_cleaned  # 清洗后的DataFrame
        }  # 返回字典
    except Exception as e:  # 捕获所有异常
        print(f"[ERROR] {e}")  # 打印错误信息
        import traceback  # 导入traceback模块
        traceback.print_exc()  # 打印详细错误堆栈
        return None  # 返回None表示出错
    finally:  # 无论是否发生异常都执行
        spark.stop()  # 关闭SparkSession，释放资源
        print("[INFO] SparkSession已关闭")

# 主程序入口
if __name__ == "__main__":  # 如果直接运行此脚本
    perform_sql_queries()  # 调用perform_sql_queries()函数