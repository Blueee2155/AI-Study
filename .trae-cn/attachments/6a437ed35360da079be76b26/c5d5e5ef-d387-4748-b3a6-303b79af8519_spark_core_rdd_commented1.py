# -*- coding: utf-8 -*-
import os
import sys

# ===== 环境变量（必须在 import pyspark 之前） =====
os.environ['HADOOP_HOME'] = r'D:\Sugar_Issue_Collect\Sugar_Issue_Collect\hadoop\hadoop-3.3.6'
os.environ['JAVA_HOME'] = r'D:\Sugar_Issue_Collect\Sugar_Issue_Collect\JDK8\jdk-17.0.12.7-hotspot'

python_path = sys.executable
os.environ['PYSPARK_PYTHON'] = python_path
os.environ['PYSPARK_DRIVER_PYTHON'] = python_path
os.environ['SPARK_LOCAL_IP'] = '127.0.0.1'

hadoop_bin = os.path.join(os.environ['HADOOP_HOME'], 'bin')
current_path = os.environ.get('PATH', '')
if hadoop_bin not in current_path:
    os.environ['PATH'] = hadoop_bin + ';' + current_path
# =================================================

from pyspark import SparkConf, SparkContext
from pyspark.sql import SparkSession


def clean_data_rdd():
    """
    使用Spark Core RDD进行数据清洗和基本统计
    返回: 清洗后的数据RDD
    """
    from pyspark.sql import SparkSession
    import os

    print("\n" + "=" * 60)
    print("Spark Core RDD模块")
    print("=" * 60)

    try:
        # 步骤1: 创建SparkSession（复用SQL引擎，稳定性更高）
        print("\n[STEP 1] 从HDFS读取数据: /diabetes/diabetes.csv")
        spark = SparkSession.builder \
            .appName("DiabetesRDD") \
            .config("spark.driver.host", "localhost") \
            .getOrCreate()
        sc = spark.sparkContext
        sc.setLogLevel("WARN")

        # 步骤2: 用SQL方式读取再转RDD（绕过原生textFile的worker兼容性问题）
        df_text = spark.read.text("hdfs://localhost:9000/diabetes/diabetes.csv")
        text_rdd = df_text.rdd.map(lambda row: row.value)

        # 步骤3: 提取表头和数据
        header = text_rdd.first()
        print(f"[INFO] 原始数据总记录数: {text_rdd.count()}")
        print(f"[INFO] 字段: {header}")

        data_rdd = text_rdd.filter(lambda line: line != header)

        # 步骤4: 解析CSV数据
        print("\n[STEP 2] 解析CSV数据...")
        parsed_rdd = data_rdd.map(lambda line: [float(x) if x.replace('.', '', 1).isdigit() else 0.0 for x in line.split(',')])
        print("[SUCCESS] 数据解析完成")

        # 步骤5: 清洗异常值
        print("\n[STEP 3] 清洗异常值...")
        print("[INFO] 过滤条件: Glucose(列2), BloodPressure(列3), BMI(列6) 不为0")
        cleaned_rdd = parsed_rdd.filter(lambda row: row[1] > 0 and row[2] > 0 and row[5] > 0)

        original_count = parsed_rdd.count()
        cleaned_count = cleaned_rdd.count()
        print(f"[SUCCESS] 数据清洗完成")
        print(f"  - 原始记录数: {original_count}")
        print(f"  - 清洗后记录数: {cleaned_count}")
        print(f"  - 删除记录数: {original_count - cleaned_count}")
        print(f"  - 删除比例: {(original_count - cleaned_count) / original_count * 100:.2f}%")

        # 步骤6: 统计基本信息
        print("\n[STEP 4] 统计基本信息...")
        num_fields = len(header.split(','))
        field_names = header.split(',')

        print("\n各字段统计信息:")
        print("-" * 60)
        for i in range(num_fields):
            field_rdd = cleaned_rdd.map(lambda row: row[i])
            min_val = field_rdd.min()
            max_val = field_rdd.max()
            mean_val = field_rdd.mean()
            std_val = field_rdd.stdev()
            print(f"{field_names[i]:25s} | Min: {min_val:8.2f} | Max: {max_val:8.2f} | Mean: {mean_val:8.2f} | Std: {std_val:8.2f}")

        # 步骤7: 统计患病率
        print("\n[STEP 5] 统计患病率...")
        outcome_col = num_fields - 1  # 最后一列是Outcome
        total = cleaned_rdd.count()
        positive = cleaned_rdd.filter(lambda row: row[outcome_col] == 1).count()
        negative = total - positive

        print("\n总体统计:")
        print(f"  - 总样本数: {total}")
        print(f"  - 阳性(患病): {positive} ({positive/total*100:.2f}%)")
        print(f"  - 阴性(未患病): {negative} ({negative/total*100:.2f}%)")

        print("\n[COMPLETE] Spark Core RDD分析完成!")
        print("=" * 60 + "\n")

        return cleaned_rdd

    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        # 确保关闭Spark上下文，避免残留进程
        try:
            sc.stop()
        except:
            pass