const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  LevelFormat,
  PageBreak,
  PageNumber,
} = require("docx");

const OUT = "d:\\TRAE_ONE\\修改版_实验报告_基于Hadoop+Spark的糖尿病患者数据分析.docx";
const FONT = { ascii: "Arial", hAnsi: "Arial", eastAsia: "Microsoft YaHei" };

const border = { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };

function run(text, options = {}) {
  return new TextRun({ text, font: FONT, size: options.size ?? 21, bold: options.bold, color: options.color });
}

function para(text, options = {}) {
  return new Paragraph({
    alignment: options.alignment,
    spacing: options.spacing ?? { line: 360, lineRule: "atLeast", after: 80 },
    indent: options.indent,
    children: Array.isArray(text) ? text : [run(text, options.runOptions || {})],
  });
}

function heading(text, level) {
  const headingLevel = level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
  return new Paragraph({
    heading: headingLevel,
    children: [run(text, { bold: true, size: level === 1 ? 30 : level === 2 ? 26 : 24 })],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { line: 360, lineRule: "atLeast", after: 60 },
    children: [run(text)],
  });
}

function cell(text, width, header = false) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: header ? { fill: "DDEBF7", type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [para(text, { runOptions: { bold: header }, spacing: { line: 300, lineRule: "atLeast", after: 0 } })],
  });
}

function table(headers, rows, widths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths,
    rows: [
      new TableRow({ cantSplit: true, children: headers.map((h, i) => cell(h, widths[i], true)) }),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(String(c), widths[i], false)) })),
    ],
  });
}

function codeLine(text) {
  return new Paragraph({
    spacing: { line: 300, lineRule: "atLeast", after: 20 },
    shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
    children: [new TextRun({ text, font: { ascii: "Consolas", hAnsi: "Consolas", eastAsia: "Microsoft YaHei" }, size: 19 })],
  });
}

const children = [];

children.push(
  new Paragraph({ spacing: { before: 900, after: 300 }, alignment: AlignmentType.CENTER, children: [run("大数据技术课程设计", { bold: true, size: 34 })] }),
  new Paragraph({ spacing: { before: 450, after: 500 }, alignment: AlignmentType.CENTER, children: [run("基于Hadoop+Spark的糖尿病患者数据分析", { bold: true, size: 32 })] }),
  para("学    号：________________________", { alignment: AlignmentType.CENTER, spacing: { line: 420, after: 120 } }),
  para("姓    名：________________________", { alignment: AlignmentType.CENTER, spacing: { line: 420, after: 120 } }),
  para("指导教师：________________________", { alignment: AlignmentType.CENTER, spacing: { line: 420, after: 120 } }),
  para("完成日期：________________________", { alignment: AlignmentType.CENTER, spacing: { line: 420, after: 120 } }),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 260 }, children: [run("目录", { bold: true, size: 30 })] }),
  para("一、绪论"),
  para("    1.1 实验背景与意义"),
  para("    1.2 数据集与研究目标"),
  para("二、系统设计与算法实现"),
  para("    2.1 总体技术架构"),
  para("    2.2 数据存储与处理流程"),
  para("    2.3 机器学习模型设计"),
  para("三、评价指标与分析方法"),
  para("    3.1 数据清洗与统计指标"),
  para("    3.2 SQL分析指标"),
  para("    3.3 分类模型评价指标"),
  para("四、实验结果与分析"),
  para("    4.1 数据存储与清洗结果"),
  para("    4.2 Spark SQL统计分析结果"),
  para("    4.3 Spark MLlib模型实验结果"),
  para("    4.4 matplotlib可视化结果"),
  para("五、创新点"),
  para("六、遇到的问题和解决方法"),
  para("七、存在的不足"),
  para("八、设计心得"),
  new Paragraph({ children: [new PageBreak()] }),
);

children.push(heading("绪论", 1));
children.push(heading("实验背景与意义", 2));
children.push(para("糖尿病是一类与血糖水平、身体质量指数、年龄、遗传因素等多种指标有关的慢性疾病。使用大数据技术对糖尿病患者数据进行清洗、统计、建模和可视化，有助于理解疾病相关因素，也能够训练学生将 Hadoop 分布式存储、Spark 计算框架和 Python 数据分析工具应用到完整项目中的能力。"));
children.push(para("本实验围绕 Pima Indians Diabetes Database 数据集展开，将本地 CSV 数据上传到 HDFS，再分别使用 Spark Core RDD、Spark SQL、Spark MLlib 和 matplotlib 完成数据处理、结构化分析、预测建模和图表展示，形成从数据存储到结果解释的完整分析链路。"));

children.push(heading("数据集与研究目标", 2));
children.push(para("数据集共包含 768 条医疗记录，每条记录由 8 个特征变量和 1 个二分类目标变量组成。目标变量 Outcome 取值为 0 或 1，分别表示未患病和患病。"));
children.push(table(
  ["字段名", "含义", "说明"],
  [
    ["Pregnancies", "怀孕次数", "患者怀孕次数"],
    ["Glucose", "葡萄糖水平", "口服葡萄糖耐量测试指标"],
    ["BloodPressure", "血压", "舒张压，单位 mm Hg"],
    ["SkinThickness", "皮肤厚度", "三头肌皮褶厚度"],
    ["Insulin", "胰岛素水平", "2 小时血清胰岛素"],
    ["BMI", "体质指数", "衡量肥胖程度的重要指标"],
    ["DiabetesPedigreeFunction", "遗传函数", "糖尿病家族遗传风险指标"],
    ["Age", "年龄", "患者年龄"],
    ["Outcome", "患病结果", "0 表示未患病，1 表示患病"],
  ],
  [2700, 2800, 4200],
));
children.push(para("本实验的研究目标是：完成糖尿病数据在 HDFS 中的存储验证；利用 Spark 对异常数据进行清洗并获得统计特征；分析年龄段、患病状态与关键医学指标之间的关系；训练逻辑回归模型预测患病状态；最后用可视化图表展示核心结果。"));

children.push(heading("系统设计与算法实现", 1));
children.push(heading("总体技术架构", 2));
children.push(para("系统采用“本地数据文件 + Hadoop HDFS + Spark 计算 + Python 可视化”的结构。主程序 main.py 统一调度各模块，并在开始阶段设置 JAVA_HOME、HADOOP_HOME、HADOOP_CONF_DIR、PYSPARK_PYTHON 和 PYSPARK_DRIVER_PYTHON 等环境变量，避免 Windows 环境下 Spark 与 Hadoop 版本、路径和 Python 解释器不一致导致的运行问题。"));
children.push(table(
  ["层次", "使用技术", "主要功能"],
  [
    ["数据存储层", "Hadoop HDFS", "创建 /diabetes 目录并保存 diabetes.csv"],
    ["分布式计算层", "Spark Core RDD", "读取数据、解析 CSV、清洗异常值、计算基础统计量"],
    ["结构化分析层", "Spark SQL", "创建 diabetes 临时视图并执行患病率、年龄段、均值对比查询"],
    ["机器学习层", "Spark MLlib", "使用 VectorAssembler 和 LogisticRegression 构建预测模型"],
    ["展示层", "matplotlib + pandas", "生成患病分布、年龄段患病率、BMI 与 Glucose 散点图"],
  ],
  [2200, 2600, 4700],
));
children.push(para("主入口文件中还设计了 ProgressTracker 进度追踪器，能够记录 HDFS、RDD、SQL、MLlib 和可视化五个模块的执行状态、耗时与成功情况，使实验运行过程更清晰。"));

children.push(heading("数据存储与处理流程", 2));
children.push(para("HDFS 模块通过 Java 命令直接调用 org.apache.hadoop.fs.FsShell，执行 -mkdir、-put、-ls 等操作。这样可以绕过 Windows 下 hdfs.cmd 脚本对路径和 classpath 处理不稳定的问题，提高实验可复现性。"));
children.push(codeLine("run_hdfs_command(['-mkdir', '-p', '/diabetes'])"));
children.push(codeLine("run_hdfs_command(['-put', '-f', local_path, '/diabetes/diabetes.csv'])"));
children.push(para("Spark Core RDD 模块从 hdfs://localhost:9000/diabetes/diabetes.csv 读取文本数据，先提取表头，再将每行 CSV 解析为浮点数数组。数据清洗规则是过滤 Glucose、BloodPressure 和 BMI 等于 0 的记录，因为这些值在医学意义上不合理，会影响统计结果和模型训练。"));
children.push(codeLine("cleaned_rdd = parsed_rdd.filter(lambda row: row[1] > 0 and row[2] > 0 and row[5] > 0)"));
children.push(para("Spark SQL 模块定义了显式 schema，并将清洗后的 DataFrame 注册为 diabetes 临时视图。随后通过 SQL 完成总体患病率、年龄段患病率以及患病组与未患病组指标均值对比三类分析。"));

children.push(heading("机器学习模型设计", 2));
children.push(para("MLlib 模块选取 Pregnancies、Glucose、BloodPressure、SkinThickness、Insulin、BMI、DiabetesPedigreeFunction 和 Age 八个变量作为输入特征，利用 VectorAssembler 将多列特征组装为 features 向量。"));
children.push(para("数据集按 8:2 比例划分为训练集和测试集，随机种子设置为 42，以保证实验结果具有可复现性。模型采用 LogisticRegression，最大迭代次数为 100，适合本实验的二分类预测任务。"));
children.push(codeLine("train_df, test_df = df_features.randomSplit([0.8, 0.2], seed=42)"));
children.push(codeLine("lr = LogisticRegression(featuresCol='features', labelCol='Outcome', maxIter=100)"));

children.push(heading("评价指标与分析方法", 1));
children.push(heading("数据清洗与统计指标", 2));
children.push(para("数据清洗阶段主要关注原始记录数、清洗后记录数、删除记录数和删除比例。基础统计阶段对每个字段计算最小值、最大值、平均值和标准差，用于观察字段取值范围和离散程度。"));
children.push(bullet("清洗规则：删除 Glucose、BloodPressure、BMI 为 0 的记录。"));
children.push(bullet("统计对象：Pregnancies、Glucose、BloodPressure、SkinThickness、Insulin、BMI、DiabetesPedigreeFunction、Age 和 Outcome。"));

children.push(heading("SQL分析指标", 2));
children.push(para("SQL 分析重点包括总体患病率、不同年龄段患病率以及患病组与未患病组的关键指标均值对比。年龄段划分为 20-29、30-39、40-49、50-59 和 60+，可以更直观地观察年龄对患病比例的影响。"));

children.push(heading("分类模型评价指标", 2));
children.push(para("模型评估使用准确率、精确率、召回率、F1 分数和混淆矩阵。准确率反映整体预测正确比例，精确率衡量被预测为患病样本中真正患病的比例，召回率衡量实际患病样本被正确识别的比例，F1 分数综合考虑精确率和召回率。"));

children.push(heading("实验结果与分析", 1));
children.push(heading("数据存储与清洗结果", 2));
children.push(para("实验成功将 diabetes.csv 上传到 HDFS 的 /diabetes/diabetes.csv 路径，并在后续 Spark 模块中完成读取。清洗结果如下。"));
children.push(table(
  ["指标", "数值"],
  [
    ["原始记录数", "768"],
    ["清洗后记录数", "724"],
    ["删除记录数", "44"],
    ["删除比例", "5.73%"],
  ],
  [4600, 4700],
));
children.push(para("清洗后保留 724 条记录，删除的 44 条记录主要是 Glucose、BloodPressure 或 BMI 出现 0 值的异常样本。该处理减少了医学上不合理的输入，有利于提高后续统计分析和模型训练的可靠性。"));

children.push(heading("Spark SQL统计分析结果", 2));
children.push(para("总体患病率统计显示，清洗后样本中患病人数为 249，占 34.39%；未患病人数为 475，占 65.61%。样本总体上未患病类别更多，存在一定类别不均衡。"));
children.push(table(
  ["年龄段", "总人数", "患病人数", "患病率"],
  [
    ["20-29", "371", "77", "20.75%"],
    ["30-39", "155", "69", "44.52%"],
    ["40-49", "112", "61", "54.46%"],
    ["50-59", "56", "33", "58.93%"],
    ["60+", "30", "9", "30.00%"],
  ],
  [2200, 2200, 2200, 2700],
));
children.push(para("从年龄段结果看，20-29 岁患病率最低，30 岁后明显升高，50-59 岁达到 58.93%。60 岁以上患病率下降到 30.00%，主要可能与该年龄段样本量只有 30 条有关，因此不能简单理解为年龄越大风险越低。"));
children.push(table(
  ["分组", "怀孕次数", "葡萄糖", "血压", "皮肤厚度", "胰岛素", "BMI", "遗传函数", "年龄"],
  [
    ["未患病", "3.32", "111.02", "70.91", "20.40", "72.18", "30.97", "0.43", "31.26"],
    ["患病", "4.91", "142.61", "75.25", "23.44", "107.99", "35.31", "0.56", "37.34"],
  ],
  [1200, 1000, 1000, 1000, 1100, 1000, 900, 1200, 900],
));
children.push(para("患病组在所有平均指标上均高于未患病组，其中葡萄糖、胰岛素和 BMI 的差异更明显。这说明血糖水平、体重相关指标和胰岛素水平与糖尿病患病状态存在较强关联。"));

children.push(heading("Spark MLlib模型实验结果", 2));
children.push(table(
  ["评价指标", "结果", "说明"],
  [
    ["准确率 Accuracy", "80.34%", "整体预测正确的比例"],
    ["精确率 Precision", "80.02%", "预测为患病中真正患病的比例"],
    ["召回率 Recall", "80.34%", "实际患病中被模型识别的比例"],
    ["F1 分数", "79.86%", "精确率和召回率的综合指标"],
  ],
  [2500, 2200, 4600],
));
children.push(table(
  ["实际类别", "预测未患病", "预测患病"],
  [
    ["实际未患病", "68", "8"],
    ["实际患病", "15", "26"],
  ],
  [3100, 3100, 3100],
));
children.push(para("逻辑回归模型准确率达到 80.34%，能够较好完成二分类预测。混淆矩阵中实际患病但预测为未患病的样本有 15 个，这类假阴性在医学辅助判断场景中风险较高，后续可通过特征扩展、阈值调整或使用随机森林等模型进一步优化召回能力。"));

children.push(heading("matplotlib可视化结果", 2));
children.push(para("可视化模块基于 pandas 读取本地 diabetes.csv，使用与 Spark 模块一致的异常值过滤规则，并生成三类图表。图表分别从类别分布、年龄段患病率和 BMI-Glucose 二维关系三个角度补充说明统计结论。"));
children.push(bullet("患病分布柱状图：未患病 475 人，占 65.61%；患病 249 人，占 34.39%。"));
children.push(bullet("年龄段患病率折线图：患病率从 20-29 岁的 20.75% 上升到 50-59 岁的 58.93%。"));
children.push(bullet("BMI 与 Glucose 散点图：患病样本更多集中在 BMI 和 Glucose 较高的区域。"));

children.push(heading("创新点", 1));
children.push(para("本实验不是单独调用 Spark 或 pandas 完成静态分析，而是把 HDFS 存储、RDD 清洗、SQL 查询、MLlib 训练和 matplotlib 可视化串联为完整流程。主程序统一调度各模块，并提供进度条和模块耗时统计，使实验更接近真实数据处理任务。"));
children.push(para("在 Windows 环境中，代码针对 Hadoop 与 Spark 的兼容性问题做了专门处理：Spark 使用 JDK17，HDFS 命令使用与 Hadoop 更兼容的 JDK8，并通过直接调用 FsShell 替代 hdfs.cmd，从而提高了系统稳定性。"));

children.push(heading("遇到的问题和解决方法", 1));
children.push(table(
  ["问题", "原因", "解决方法"],
  [
    ["JAVA_HOME 路径或版本不兼容", "Hadoop 与 Spark 对 JDK 版本要求不同", "Spark 运行使用 JDK17，HDFS 操作单独指定 JDK8"],
    ["HDFS 命令执行失败", "Windows 下 hdfs.cmd 处理 classpath 不稳定", "使用 java -cp 直接调用 org.apache.hadoop.fs.FsShell"],
    ["PySpark worker 与 driver Python 版本不一致", "系统存在多个 Python 解释器", "设置 PYSPARK_PYTHON 和 PYSPARK_DRIVER_PYTHON 为当前解释器路径"],
    ["CSV 读取和 RDD textFile 存在兼容问题", "本地 worker 启动与 HDFS 路径处理不稳定", "先用 Spark SQL text 读取，再转换为 RDD"],
    ["matplotlib 中文显示乱码", "默认字体不支持中文", "设置 SimHei、Arial Unicode MS、DejaVu Sans 等字体候选"],
  ],
  [2700, 3100, 3500],
));

children.push(heading("存在的不足", 1));
children.push(para("本实验虽然实现了完整的大数据分析流程，但仍存在一些不足。首先，数据集规模只有 768 条，更多体现教学实验价值，尚不能完全展示 Hadoop 和 Spark 在海量数据场景下的性能优势。其次，模型只使用逻辑回归，没有对随机森林、梯度提升树等模型进行对比。"));
children.push(para("此外，当前清洗规则主要处理 Glucose、BloodPressure 和 BMI 的 0 值问题，对 Insulin、SkinThickness 等字段中可能存在的异常或缺失含义没有进一步建模处理。后续可以加入更细致的数据质量分析、特征标准化、交叉验证和超参数调优，以提高实验完整性。"));

children.push(heading("设计心得", 1));
children.push(para("通过本次实验，我进一步理解了 Hadoop 与 Spark 在数据分析流程中的分工。HDFS 更适合作为统一的数据存储层，Spark 则提供了从底层 RDD 到结构化 SQL 再到机器学习算法的完整计算能力。"));
children.push(para("实验过程中也体会到环境配置和工程化组织的重要性。相比只运行单个脚本，模块化设计、统一入口、进度提示和异常处理能够显著提升项目可维护性。最终系统完成了数据存储、清洗、统计、建模和可视化，模型准确率达到 80.34%，能够较好体现大数据技术在医疗健康数据分析中的应用价值。"));

children.push(heading("参考资料", 1));
children.push(bullet("Apache Hadoop 官方文档：https://hadoop.apache.org/docs/"));
children.push(bullet("Apache Spark 官方文档：https://spark.apache.org/docs/latest/"));
children.push(bullet("PySpark API 文档：https://spark.apache.org/docs/latest/api/python/"));
children.push(bullet("matplotlib 官方文档：https://matplotlib.org/stable/contents.html"));
children.push(bullet("Kaggle Pima Indians Diabetes Database 数据集说明"));

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: FONT, size: 21 } },
    },
    paragraphStyles: [
      { id: "Normal", name: "Normal", paragraph: { spacing: { line: 360, lineRule: "atLeast", after: 60 } } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: FONT },
        paragraph: { spacing: { before: 240, after: 120, line: 312, lineRule: "auto" }, outlineLevel: 0, keepNext: false, keepLines: false, numbering: { reference: "heading-numbering-cn", level: 0 } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: FONT },
        paragraph: { spacing: { before: 180, after: 80, line: 312, lineRule: "auto" }, outlineLevel: 1, keepNext: false, keepLines: false, numbering: { reference: "heading-numbering-cn", level: 1 } } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: FONT },
        paragraph: { spacing: { before: 120, after: 60, line: 312, lineRule: "auto" }, outlineLevel: 2, keepNext: false, keepLines: false, numbering: { reference: "heading-numbering-cn", level: 2 } } },
    ],
  },
  numbering: {
    config: [
      {
        reference: "heading-numbering-cn",
        levels: [
          { level: 0, format: LevelFormat.CHINESE_COUNTING, text: "%1、", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 0, hanging: 432 } } } },
          { level: 1, format: LevelFormat.DECIMAL, text: "%1.%2", alignment: AlignmentType.LEFT, isLegalNumberingStyle: true, style: { paragraph: { indent: { left: 432, hanging: 432 } } } },
          { level: 2, format: LevelFormat.DECIMAL, text: "%1.%2.%3", alignment: AlignmentType.LEFT, isLegalNumberingStyle: true, style: { paragraph: { indent: { left: 864, hanging: 432 } } } },
        ],
      },
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        ],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1260, bottom: 1440, left: 1260 },
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run("基于Hadoop+Spark的糖尿病患者数据分析", { size: 18, color: "666666" })] })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run("第 ", { size: 18 }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18 }), run(" 页", { size: 18 })] })] }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, buffer);
  console.log(OUT);
});
