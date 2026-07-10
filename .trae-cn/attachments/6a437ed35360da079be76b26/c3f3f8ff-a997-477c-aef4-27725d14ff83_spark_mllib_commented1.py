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
from pyspark.sql import SparkSession  # 从PySpark SQL库导入SparkSession
from pyspark.ml.feature import VectorAssembler  # 从MLlib导入特征向量组装器
from pyspark.ml.classification import LogisticRegression  # 从MLlib导入逻辑回归分类器
from pyspark.ml.evaluation import BinaryClassificationEvaluator, MulticlassClassificationEvaluator  # 从MLlib导入评估器

# 第三部分：主函数 - 训练和评估模型
def train_and_evaluate_model():
    
    print("=" * 60)  # 打印60个等号作为分隔线
    print("Spark MLlib模块")  # 打印模块名称
    print("=" * 60)  # 打印60个等号作为分隔线
    
    print("[INFO] 正在初始化SparkSession，请稍候...")
    
    # 步骤1: 创建SparkSession
    # 创建SparkSession：设置应用名称、本地运行模式，获取或创建实例
    spark = (
        SparkSession.builder
        .appName("Diabetes MLlib")
        .master("local[*]")
        .getOrCreate()
    )
    # 设置日志级别
    spark.sparkContext.setLogLevel("WARN")  # 设置日志级别为WARN
    
    try:  # 开始try块
        print("[SUCCESS] SparkSession初始化成功!")
        
        # 步骤2: 定义数据文件路径
        # 数据文件路径 - 优先尝试HDFS，失败则使用本地文件
        # ===== 修复：HDFS路径修正 =====
        hdfs_path = "hdfs://localhost:9000/diabetes/diabetes.csv"  # HDFS上的文件路径（已修正）
        local_path = os.path.join(os.path.dirname(__file__), "diabetes.csv")  # 本地文件路径
        
        # 步骤3: 尝试读取数据（优先HDFS，失败则用本地）
        print(f"\n[STEP 1] 尝试从HDFS读取数据...")
        try:  # 开始内层try块
            # 尝试从HDFS读取CSV文件
            # spark.read.csv(): 读取CSV文件
            # header=True: 第一行是表头
            # inferSchema=True: 自动推断数据类型
            df = spark.read.csv(hdfs_path, header=True, inferSchema=True)  # 读取HDFS文件
            # 测试是否能成功读取
            df.first()  # 触发计算，测试路径是否有效
            print(f"[SUCCESS] 从HDFS读取成功")  # 打印成功信息
        except Exception as e:  # 捕获异常（HDFS不存在等情况）
            print(f"[INFO] HDFS读取失败，切换到本地文件: {str(e)[:80]}...")
            # HDFS不存在，从本地文件读取
            local_path_with_schema = "file:///" + local_path.replace('\\', '/')
            df = spark.read.csv(local_path_with_schema, header=True, inferSchema=True)  # 读取本地文件
            print(f"[INFO] 使用本地文件: {local_path}")  # 打印读取来源
        
        # 打印原始数据记录数
        print(f"[INFO] 原始数据记录数: {df.count()}")  # 统计并打印记录数
        
        # 步骤4: 数据清洗
        print("\n[STEP 2] 清洗异常值...")  # 打印步骤提示
        # 过滤掉Glucose、BloodPressure、BMI为0的行
        df_cleaned = df.filter(
            (df.Glucose != 0) &  # Glucose不为0
            (df.BloodPressure != 0) &  # BloodPressure不为0
            (df.BMI != 0)  # BMI不为0
        )  # 过滤完成
        # 打印清洗后的记录数
        print(f"[SUCCESS] 清洗后记录数: {df_cleaned.count()}")  # 统计并打印清洗后的记录数
        
        # 步骤5: 准备特征向量
        print("\n[STEP 3] 准备特征向量...")  # 打印步骤提示
        # 特征列说明（8个特征）：
        # Pregnancies - 怀孕次数
        # Glucose - 葡萄糖水平
        # BloodPressure - 舒张压（mm Hg）
        # SkinThickness - 皮肤厚度（mm）
        # Insulin - 胰岛素水平（mu U/ml）
        # BMI - 体质指数（kg/m²）
        # DiabetesPedigreeFunction - 糖尿病家族遗传函数
        # Age - 年龄
        feature_columns = ["Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
                          "Insulin", "BMI", "DiabetesPedigreeFunction", "Age"]  # 定义特征列
        # 创建VectorAssembler对象
        # VectorAssembler: 将多个列合并为一个向量列
        # inputCols: 输入列名列表
        # outputCol: 输出列名
        assembler = VectorAssembler(
            inputCols=feature_columns,  # 输入：8个特征列
            outputCol="features"  # 输出：特征向量列
        )  # 创建组装器
        # 使用transform()方法将特征列组装为向量
        # select(): 只保留特征向量和目标列
        df_features = assembler.transform(df_cleaned).select("features", "Outcome")  # 组装特征向量
        print("[SUCCESS] 特征向量准备完成")  # 打印成功信息
        
        # 步骤6: 划分训练集和测试集
        print("\n[STEP 4] 划分训练集和测试集...")  # 打印步骤提示
        # 使用randomSplit()方法划分数据集
        # [0.8, 0.2]: 80%训练集，20%测试集
        # seed=42: 随机种子，确保结果可复现
        train_df, test_df = df_features.randomSplit([0.8, 0.2], seed=42)  # 划分数据集
        # 打印训练集和测试集大小
        print(f"[INFO] 训练集大小: {train_df.count()}")  # 打印训练集大小
        print(f"[INFO] 测试集大小: {test_df.count()}")  # 打印测试集大小
        
        # 步骤7: 训练逻辑回归模型
        print("\n[STEP 5] 训练逻辑回归模型...")  # 打印步骤提示
        # 创建逻辑回归模型对象
        # LogisticRegression: 逻辑回归分类器
        # featuresCol: 特征向量列名
        # labelCol: 目标列名（标签）
        # maxIter: 最大迭代次数
        lr = LogisticRegression(
            featuresCol="features",  # 特征列名
            labelCol="Outcome",  # 标签列名
            maxIter=100  # 最大迭代100次
        )  # 创建逻辑回归对象
        # 使用fit()方法训练模型
        # 传入训练数据，返回训练好的模型
        model = lr.fit(train_df)  # 训练模型
        print("[SUCCESS] 模型训练完成")  # 打印成功信息
        
        # 步骤8: 模型评估
        print("\n[STEP 6] 模型评估...")  # 打印步骤提示
        # 使用transform()方法进行预测
        # 将测试数据传入模型，得到预测结果
        predictions = model.transform(test_df)  # 使用模型进行预测
        # 创建多分类评估器
        # metricName="accuracy": 计算准确率
        accuracy_evaluator = MulticlassClassificationEvaluator(
            labelCol="Outcome",  # 标签列名
            predictionCol="prediction",  # 预测列名
            metricName="accuracy"  # 指标名称：准确率
        )  # 创建准确率评估器
        # 计算准确率
        accuracy = accuracy_evaluator.evaluate(predictions)  # 计算准确率
        # 创建精确率评估器
        # metricName="weightedPrecision": 计算加权精确率
        precision_evaluator = MulticlassClassificationEvaluator(
            labelCol="Outcome",  # 标签列名
            predictionCol="prediction",  # 预测列名
            metricName="weightedPrecision"  # 指标名称：加权精确率
        )  # 创建精确率评估器
        # 计算精确率
        precision = precision_evaluator.evaluate(predictions)  # 计算精确率
        # 创建召回率评估器
        # metricName="weightedRecall": 计算加权召回率
        recall_evaluator = MulticlassClassificationEvaluator(
            labelCol="Outcome",  # 标签列名
            predictionCol="prediction",  # 预测列名
            metricName="weightedRecall"  # 指标名称：加权召回率
        )  # 创建召回率评估器
        # 计算召回率
        recall = recall_evaluator.evaluate(predictions)  # 计算召回率
        # 创建F1分数评估器
        # metricName="f1": 计算F1分数
        f1_evaluator = MulticlassClassificationEvaluator(
            labelCol="Outcome",  # 标签列名
            predictionCol="prediction",  # 预测列名
            metricName="f1"  # 指标名称：F1分数
        )  # 创建F1分数评估器
        # 计算F1分数
        f1 = f1_evaluator.evaluate(predictions)  # 计算F1分数
        
        # 步骤9: 打印评估结果
        print("\n" + "=" * 60)  # 打印分隔线
        print("模型评估结果")  # 打印标题
        print("=" * 60)  # 打印分隔线
        # 打印各评估指标
        print(f"\n准确率 (Accuracy): {accuracy:.4f}")  # 打印准确率，保留4位小数
        print(f"精确率 (Precision): {precision:.4f}")  # 打印精确率
        print(f"召回率 (Recall): {recall:.4f}")  # 打印召回率
        print(f"F1分数 (F1-Score): {f1:.4f}")  # 打印F1分数
        
        # 计算并打印混淆矩阵
        print("\n混淆矩阵:")  # 打印标题
        # 使用groupBy()统计真实标签和预测标签的组合
        predictions.groupBy("Outcome", "prediction").count().show()  # 打印混淆矩阵
        
        # 打印预测样例（前10条）
        print("\n预测样例 (前10条):")  # 打印标题
        predictions.select("features", "Outcome", "prediction").show(10)  # 打印前10条预测结果
        
        print("\n[SUCCESS] MLlib分析完成!")  # 打印成功信息
        print("=" * 60)  # 打印分隔线
        # 返回评估结果
        return {
            'accuracy': accuracy,  # 准确率
            'precision': precision,  # 精确率
            'recall': recall,  # 召回率
            'f1': f1,  # F1分数
            'predictions': predictions  # 预测结果
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
    train_and_evaluate_model()  # 调用train_and_evaluate_model()函数