# -*- coding: utf-8 -*-


# 第一部分：导入必要的Python库

import matplotlib.pyplot as plt  # 导入matplotlib的pyplot接口，用于绘图
import matplotlib  # 导入matplotlib主模块，用于配置
import numpy as np  # 导入numpy库，用于数值计算
import pandas as pd  # 导入pandas库，用于数据处理
import os  # 导入os库，用于文件路径操作

# 第二部分：设置中文字体支持

# 设置matplotlib支持中文显示
# font.sans-serif: 设置无衬线字体族
# 'SimHei': 黑体（Windows常用）
# 'Arial Unicode MS': Arial Unicode（Mac常用）
# 'DejaVu Sans': 默认字体
matplotlib.rcParams['font.sans-serif'] = ['SimHei', 'Arial Unicode MS', 'DejaVu Sans']  # 设置中文字体

# 设置坐标轴负号显示正常（否则负号会显示为方块）
matplotlib.rcParams['axes.unicode_minus'] = False  # 设置负号显示

# 第三部分：主函数 - 生成可视化图表

def generate_visualizations():
    
    print("=" * 60)  # 打印60个等号作为分隔线
    print("matplotlib可视化模块")  # 打印模块名称
    print("=" * 60)  # 打印60个等号作为分隔线

    # 步骤1: 读取数据

    # 定义数据文件路径
    # os.path.dirname(__file__): 获取当前脚本所在目录
    # os.path.join(): 拼接完整路径
    data_path = os.path.join(os.path.dirname(__file__), "diabetes.csv")  # 数据文件路径

    print("\n[STEP 1] 读取数据...")  # 打印步骤提示

    # 使用pandas读取CSV文件
    # pd.read_csv(): 读取CSV文件并返回DataFrame
    df = pd.read_csv(data_path)  # 读取数据

    # 步骤2: 数据清洗

    print("[STEP 2] 清洗数据...")  # 打印步骤提示

    # 过滤掉Glucose、BloodPressure、BMI为0的行
    # df[]: 使用布尔索引过滤数据
    # &: 逻辑与操作符
    df_cleaned = df[
        (df['Glucose'] != 0) &  # Glucose不为0
        (df['BloodPressure'] != 0) &  # BloodPressure不为0
        (df['BMI'] != 0)  # BMI不为0
    ]  # 过滤完成

    # 打印清洗后的记录数
    print(f"[INFO] 清洗后记录数: {len(df_cleaned)}")  # 打印记录数

    # 步骤3: 创建输出目录

    # 定义输出目录路径
    output_dir = os.path.join(os.path.dirname(__file__), "charts")  # 图表输出目录

    # 使用os.makedirs()创建目录
    # exist_ok=True: 如果目录已存在不报错
    os.makedirs(output_dir, exist_ok=True)  # 创建输出目录

    # 步骤4: 图表1 - 患病分布柱状图

    print("\n[STEP 3] 生成图表1: 患病分布柱状图...")  # 打印步骤提示

    # 创建图表和坐标轴对象
    # figsize: 图表大小（宽8英寸，高6英寸）
    fig, ax = plt.subplots(figsize=(8, 6))  # 创建图表

    # 统计Outcome列的值分布
    # value_counts(): 统计每个值的出现次数
    # sort_index(): 按索引排序（0在前，1在后）
    outcome_counts = df_cleaned['Outcome'].value_counts().sort_index()  # 统计患病分布

    # 定义颜色方案
    # 绿色表示未患病，红色表示患病
    colors = ['#2ecc71', '#e74c3c']  # 颜色列表

    # 定义标签
    labels = ['未患病 (0)', '患病 (1)']  # 标签列表

    # 绘制柱状图
    # ax.bar(): 绘制柱状图
    # edgecolor: 柱子边框颜色
    # linewidth: 边框线宽
    bars = ax.bar(labels, outcome_counts.values, color=colors, edgecolor='black', linewidth=1.2)  # 绘制柱状图

    # 在柱子上添加数值标签
    for bar, count in zip(bars, outcome_counts.values):  # 循环遍历每个柱子
        height = bar.get_height()  # 获取柱子高度
        # ax.text(): 在指定位置添加文本
        # bar.get_x() + bar.get_width()/2.: 柱子中心的x坐标
        # height: 柱子顶部的y坐标
        # f'{count}\n({count/len(df_cleaned)*100:.1f}%)': 显示数量和百分比
        # ha='center': 水平居中对齐
        # va='bottom': 垂直底部对齐
        ax.text(bar.get_x() + bar.get_width()/2., height,
                f'{count}\n({count/len(df_cleaned)*100:.1f}%)',
                ha='center', va='bottom', fontsize=11, fontweight='bold')  # 添加数值标签

    # 设置图表标题和标签
    ax.set_title('糖尿病患病分布', fontsize=16, fontweight='bold', pad=20)  # 设置标题
    ax.set_ylabel('样本数量', fontsize=12)  # 设置y轴标签
    ax.set_xlabel('Outcome', fontsize=12)  # 设置x轴标签

    # 添加网格线
    # axis='y': 只显示y轴方向的网格
    # alpha: 透明度
    # linestyle: 线型（虚线）
    ax.grid(axis='y', alpha=0.3, linestyle='--')  # 添加网格线

    # 自动调整布局，避免标签重叠
    plt.tight_layout()  # 调整布局

    # 保存图表
    # dpi=150: 分辨率150点/英寸
    # bbox_inches='tight': 自动裁剪空白区域
    chart1_path = os.path.join(output_dir, "chart1_outcome_distribution.png")  # 图表1保存路径
    plt.savefig(chart1_path, dpi=150, bbox_inches='tight')  # 保存图表

    # 关闭图表，释放内存
    plt.close()  # 关闭图表

    print(f"[SUCCESS] 图表已保存: {chart1_path}")  # 打印保存成功信息

    # 步骤5: 图表2 - 年龄段患病率折线图

    print("\n[STEP 4] 生成图表2: 年龄段患病率折线图...")  # 打印步骤提示

    # 定义年龄段分组边界
    age_bins = [20, 30, 40, 50, 60, 100]  # 年龄段边界

    # 定义年龄段标签
    age_labels = ['20-29', '30-39', '40-49', '50-59', '60+']  # 年龄段标签

    # 使用pd.cut()将年龄分组
    # bins: 分组边界
    # labels: 分组标签
    # right=False: 左闭右开区间，如[20, 30)
    df_cleaned['AgeGroup'] = pd.cut(df_cleaned['Age'], bins=age_bins, labels=age_labels, right=False)  # 创建年龄段列

    # 按年龄段分组统计
    # groupby(): 按指定列分组
    # agg(): 聚合操作
    #   - total: 统计总人数
    #   - positive: 统计患病人数（Outcome=1的求和）
    # observed=True: 只显示实际存在的分组
    age_stats = df_cleaned.groupby('AgeGroup', observed=True).agg(
        total=('Outcome', 'count'),  # 统计每个年龄段的总人数
        positive=('Outcome', 'sum')  # 统计每个年龄段的患病人数
    ).reset_index()  # 重置索引，使AgeGroup成为普通列

    # 计算患病率
    # 患病率 = 患病人数 / 总人数 * 100
    age_stats['positive_rate'] = (age_stats['positive'] / age_stats['total']) * 100  # 计算患病率

    # 创建图表
    fig, ax = plt.subplots(figsize=(10, 6))  # 创建图表

    # 绘制折线图
    # marker='o': 数据点使用圆形标记
    # linewidth: 线宽
    # markersize: 标记大小
    # color: 折线颜色
    # markerfacecolor: 标记填充颜色
    # markeredgecolor: 标记边框颜色
    ax.plot(age_stats['AgeGroup'], age_stats['positive_rate'],
            marker='o', linewidth=2.5, markersize=10, color='#3498db',
            markerfacecolor='#e74c3c', markeredgecolor='black', markeredgewidth=1.5)  # 绘制折线图

    # 在数据点上添加数值标签
    for i, row in age_stats.iterrows():  # 循环遍历每个数据点
        # ax.annotate(): 添加注释
        # f'{row["positive_rate"]:.1f}%': 显示患病率，保留1位小数
        # textcoords="offset points": 使用偏移坐标
        # xytext=(0, 15): 向上偏移15个点
        ax.annotate(f'{row["positive_rate"]:.1f}%',
                   (row['AgeGroup'], row['positive_rate']),
                   textcoords="offset points", xytext=(0, 15),
                   ha='center', fontsize=10, fontweight='bold')  # 添加数值标签

    # 设置图表标题和标签
    ax.set_title('各年龄段糖尿病患病率', fontsize=16, fontweight='bold', pad=20)  # 设置标题
    ax.set_xlabel('年龄段', fontsize=12)  # 设置x轴标签
    ax.set_ylabel('患病率 (%)', fontsize=12)  # 设置y轴标签

    # 添加网格线
    ax.grid(True, alpha=0.3, linestyle='--')  # 添加网格线

    # 设置y轴范围
    ax.set_ylim(0, 100)  # 设置y轴范围为0-100

    # 自动调整布局
    plt.tight_layout()  # 调整布局

    # 保存图表
    chart2_path = os.path.join(output_dir, "chart2_age_group_rate.png")  # 图表2保存路径
    plt.savefig(chart2_path, dpi=150, bbox_inches='tight')  # 保存图表
    plt.close()  # 关闭图表

    print(f"[SUCCESS] 图表已保存: {chart2_path}")  # 打印保存成功信息

    # 步骤6: 图表3 - BMI与Glucose散点图

    print("\n[STEP 5] 生成图表3: BMI与Glucose散点图...")  # 打印步骤提示

    # 创建图表
    fig, ax = plt.subplots(figsize=(10, 8))  # 创建图表

    # 将数据分为患病和未患病两组
    # df[df['Outcome'] == 0]: 过滤出Outcome为0的行
    negative = df_cleaned[df_cleaned['Outcome'] == 0]  # 未患病数据
    positive = df_cleaned[df_cleaned['Outcome'] == 1]  # 患病数据

    # 绘制未患病的散点
    # ax.scatter(): 绘制散点图
    # c: 点的颜色
    # alpha: 透明度
    # s: 点的大小
    # edgecolors: 点的边框颜色
    # linewidth: 边框线宽
    # label: 图例标签
    ax.scatter(negative['BMI'], negative['Glucose'],
              c='#2ecc71', alpha=0.6, s=50, edgecolors='black', linewidth=0.5,
              label='未患病 (0)')  # 绘制未患病散点

    # 绘制患病的散点
    ax.scatter(positive['BMI'], positive['Glucose'],
              c='#e74c3c', alpha=0.6, s=50, edgecolors='black', linewidth=0.5,
              label='患病 (1)')  # 绘制患病散点

    # 设置图表标题和标签
    ax.set_title('BMI与Glucose关系散点图', fontsize=16, fontweight='bold', pad=20)  # 设置标题
    ax.set_xlabel('BMI', fontsize=12)  # 设置x轴标签
    ax.set_ylabel('Glucose', fontsize=12)  # 设置y轴标签

    # 添加图例
    # loc='upper left': 图例位置在左上角
    # fontsize: 字体大小
    # framealpha: 图例背景透明度
    ax.legend(loc='upper left', fontsize=11, framealpha=0.9)  # 添加图例

    # 添加网格线
    ax.grid(True, alpha=0.3, linestyle='--')  # 添加网格线

    # 自动调整布局
    plt.tight_layout()  # 调整布局

    # 保存图表
    chart3_path = os.path.join(output_dir, "chart3_bmi_glucose_scatter.png")  # 图表3保存路径
    plt.savefig(chart3_path, dpi=150, bbox_inches='tight')  # 保存图表
    plt.close()  # 关闭图表

    print(f"[SUCCESS] 图表已保存: {chart3_path}")  # 打印保存成功信息

    # 完成

    print("\n" + "=" * 60)  # 打印分隔线
    print("[COMPLETE] 所有可视化图表生成完成!")  # 打印完成信息
    print(f"输出目录: {output_dir}")  # 打印输出目录
    print("=" * 60)  # 打印分隔线

    # 返回生成的图表路径
    return {
        'chart1': chart1_path,  # 图表1路径
        'chart2': chart2_path,  # 图表2路径
        'chart3': chart3_path  # 图表3路径
    }  # 返回字典


# 主程序入口

if __name__ == "__main__":  # 如果直接运行此脚本
    generate_visualizations()  # 调用generate_visualizations()函数
