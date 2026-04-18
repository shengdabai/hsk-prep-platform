export type LevelId = "hsk-1" | "hsk-2" | "hsk-3" | "hsk-4" | "hsk-5" | "hsk-6" | "hsk-7" | "hsk-8" | "hsk-9";
export type UserPlan = "free" | "pro" | "institution";
export type UserRole = "anonymous" | "learner" | "reviewer" | "admin";
export type ReviewStatus = "pending" | "approved" | "rejected" | "needs_fix";
export type PublishStatus = "draft" | "ready" | "published" | "unpublished";
export type SourceType = "reference_only" | "re_authored" | "original";
export type CopyrightStatus = "pending" | "cleared";
export type SourceKind = "mock_exam" | "practice_set";
export type QuestionKind =
  | "image_true_false"
  | "image_choice"
  | "single_choice"
  | "matching"
  | "fill_blank";
export type SectionName = "听力" | "阅读";

export type LevelSummary = {
  id: LevelId;
  title: string;
  stage: string;
  status: "live" | "coming_soon";
  description: string;
};

export type Question = {
  id: string;
  title: string;
  level: "HSK1";
  section: SectionName;
  part: 1 | 2 | 3 | 4;
  kind: QuestionKind;
  prompt: string;
  context?: string;
  visualHint?: string;
  options: Array<{ id: string; label: string; text: string }>;
  answer: string;
  explanation: string;
  estimatedSeconds: number;
  vocabFocus: string[];
  sourceType: SourceType;
  reviewStatus: ReviewStatus;
  publishStatus: PublishStatus;
  copyrightStatus: CopyrightStatus;
  tags: string[];
};

export type MockExam = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  minutes: number;
  questionIds: string[];
  access: "free" | "pro";
  recommendedFor: string;
};

export type PracticeSet = {
  id: string;
  slug: string;
  title: string;
  description: string;
  section: SectionName;
  part: 1 | 2 | 3 | 4;
  questionIds: string[];
  access: "free" | "pro";
  recommendedFor: string;
};

export type VocabularyCard = {
  word: string;
  pinyin: string;
  meaning: string;
  topic: string;
};

export type GovernanceSnapshot = Pick<
  Question,
  "id" | "title" | "section" | "part" | "sourceType" | "reviewStatus" | "publishStatus" | "copyrightStatus"
>;

const trueFalseBank = [
  ["他在喝茶。", "桌上有一杯茶，男生正在喝。", "这句话与画面一致。", "茶", "A"],
  ["她是老师。", "教室里一个女生在讲课。", "人物身份与场景相符。", "老师", "A"],
  ["他们在学校外面。", "两个人坐在教室里。", "句子说在外面，但场景在教室里。", "学校", "B"],
  ["现在是晚上。", "窗外太阳很亮。", "时间描述与明亮白天不符。", "时间", "B"],
  ["孩子在看电视。", "小朋友坐在沙发上看电视。", "动作和对象都匹配。", "电视", "A"],
  ["妈妈在开车。", "妈妈站在超市门口买苹果。", "句子说开车，画面是购物。", "开车", "B"],
  ["他很高兴。", "男生笑着拿着礼物。", "情绪描述和表情一致。", "高兴", "A"],
  ["她在吃面包。", "女生正在喝牛奶，没有吃东西。", "动作不一致。", "吃", "B"],
  ["他们去饭店。", "两个人站在饭店招牌前。", "地点信息一致。", "饭店", "A"],
  ["这是我的哥哥。", "画面里是两个小女孩。", "人物性别与句子不一致。", "家人", "B"],
  ["他在打电话。", "男生拿着手机说话。", "动作完全匹配。", "电话", "A"],
  ["今天很冷。", "大家穿短袖在公园里。", "天气描述与穿着不符。", "天气", "B"],
  ["她在医院工作。", "她穿着护士服站在医院里。", "工作场景与句子一致。", "医院", "A"],
  ["他们在坐火车。", "一家人在机场等飞机。", "交通工具不一致。", "火车", "B"],
  ["我想喝咖啡。", "桌上放着一杯咖啡。", "对象匹配。", "咖啡", "A"],
] as const;

const listeningChoiceBank = [
  ["你听到：我去超市买苹果。", ["女生在超市挑苹果", "男生在医院看病", "两个人在教室上课"], "A", "超市", "句子说去超市买苹果，只有 A 同时满足地点和动作。"],
  ["你听到：他今天坐出租车去公司。", ["他骑自行车去学校", "他坐出租车去公司", "他在家休息"], "B", "交通", "B 与听到的信息完全一致。"],
  ["你听到：姐姐在看电影。", ["姐姐在电影院看电影", "姐姐在饭店吃饭", "姐姐在房间看书"], "A", "电影", "关键词是“看电影”。"],
  ["你听到：请给我一杯热茶。", ["一杯冷水", "一杯热茶", "一杯牛奶"], "B", "茶", "对象和温度都匹配 B。"],
  ["你听到：我们明天上午九点上课。", ["今天晚上九点下课", "明天上午九点上课", "明天下午两点看电影"], "B", "时间", "时间和动作都以 B 为准。"],
  ["你听到：她在学校门口等朋友。", ["她在学校门口等朋友", "她在公园里跑步", "她在办公室打电话"], "A", "朋友", "地点和动作都在 A。"],
  ["你听到：爸爸喜欢喝咖啡。", ["爸爸喜欢喝茶", "爸爸喜欢喝咖啡", "爸爸喜欢吃面包"], "B", "咖啡", "饮品是咖啡。"],
  ["你听到：今天下午我去医院看病。", ["今天下午我去医院看病", "今天下午我去超市买菜", "今天上午我去医院上班"], "A", "医院", "A 保留了时间、地点和目的。"],
  ["你听到：老师在黑板上写字。", ["老师在黑板上写字", "老师在门口等学生", "老师在办公室休息"], "A", "老师", "A 最贴近听到的画面。"],
  ["你听到：我家有三个人。", ["我家有两个人", "我家有三个人", "我家有五个人"], "B", "数字", "人数是三个人。"],
  ["你听到：他周末想去公园跑步。", ["他周末想去公园跑步", "他周末想在家睡觉", "他周末想去商店买鞋"], "A", "公园", "A 与计划一致。"],
  ["你听到：我的电脑在桌子上。", ["电脑在桌子下面", "电脑在桌子上", "电脑在包里"], "B", "电脑", "位置是桌子上。"],
  ["你听到：我们晚上七点吃饭。", ["我们早上七点吃饭", "我们晚上七点吃饭", "我们晚上九点看电视"], "B", "吃饭", "时间是晚上七点。"],
  ["你听到：弟弟不会开车。", ["弟弟会开车", "弟弟不会开车", "弟弟想买车"], "B", "开车", "否定信息决定了 B。"],
  ["你听到：她觉得这本书很好看。", ["她觉得这本书很好看", "她觉得这本书很贵", "她觉得这本书太难"], "A", "书", "态度是“很好看”。"],
] as const;

const dialogueBank = [
  ["女：你去哪儿？ 男：我去学校上课。", "男的去哪儿？", ["学校", "饭店", "医院"], "A", "学校", "男生直接说去学校上课。"],
  ["男：你几点回家？ 女：晚上八点。", "女的几点回家？", ["六点", "八点", "九点"], "B", "时间", "回答中给出晚上八点。"],
  ["女：这是谁的杯子？ 男：是我的。", "杯子是谁的？", ["男的", "女的", "老师的"], "A", "杯子", "男生说“是我的”。"],
  ["男：今天天气怎么样？ 女：很热。", "今天天气怎么样？", ["很冷", "很热", "下雨"], "B", "天气", "女生回答“很热”。"],
  ["女：你想喝什么？ 男：我想喝牛奶。", "男的想喝什么？", ["茶", "牛奶", "咖啡"], "B", "牛奶", "男生选择牛奶。"],
  ["男：你认识那位老师吗？ 女：认识，他教汉语。", "谁教汉语？", ["那位老师", "女生", "学生"], "A", "老师", "女生说那位老师教汉语。"],
  ["女：你周末忙吗？ 男：不忙，我想看电影。", "男的周末想做什么？", ["工作", "看电影", "回学校"], "B", "电影", "不忙，所以想看电影。"],
  ["男：这是你弟弟吗？ 女：不是，这是我哥哥。", "画面里的人是谁？", ["弟弟", "哥哥", "爸爸"], "B", "家人", "女生纠正说是哥哥。"],
  ["女：你在哪儿工作？ 男：我在公司工作。", "男的在哪儿工作？", ["学校", "公司", "超市"], "B", "工作", "地点是公司。"],
  ["男：现在几点？ 女：差五分十点。", "现在几点？", ["九点五十五", "十点零五", "九点十五"], "A", "时间", "差五分十点就是 9:55。"],
  ["女：你会说汉语吗？ 男：会一点儿。", "男的会不会说汉语？", ["不会", "会一点儿", "说得非常好"], "B", "汉语", "回答是会一点儿。"],
  ["男：你为什么不高兴？ 女：我的手机不见了。", "女的为什么不高兴？", ["手机不见了", "今天很忙", "朋友没来"], "A", "手机", "原因在第二句。"],
  ["女：你家离学校远吗？ 男：不远，坐车十分钟。", "男的家离学校怎么样？", ["很远", "不远", "不知道"], "B", "学校", "男生明确说不远。"],
  ["男：你在哪儿买的水果？ 女：在小区旁边的店里。", "水果在哪里买的？", ["超市里", "饭店里", "小区旁边的店里"], "C", "水果", "地点是小区旁边的店。"],
  ["女：你弟弟多大？ 男：他今年八岁。", "弟弟多大？", ["六岁", "八岁", "十岁"], "B", "年龄", "年龄是八岁。"],
] as const;

const passageBank = [
  ["小王今天很忙。上午他去学校上课，下午去医院看朋友，晚上回家写作业。", "小王下午去哪儿？", ["学校", "医院", "超市"], "B", "医院", "下午的安排是去医院看朋友。"],
  ["玛丽是学生。她每天七点起床，八点上课，中午和同学一起吃饭。", "玛丽几点上课？", ["七点", "八点", "中午"], "B", "上课", "短文第二句说八点上课。"],
  ["今天是星期天，天气很好。我们一家人去公园散步，还拍了很多照片。", "他们去哪儿了？", ["公园", "公司", "电影院"], "A", "公园", "地点是公园。"],
  ["张老师喜欢喝茶，不喜欢喝咖啡。办公室里总有一杯热茶。", "张老师喜欢喝什么？", ["牛奶", "茶", "咖啡"], "B", "茶", "老师喜欢喝茶。"],
  ["我的房间不大，但是很干净。桌子上有电脑，椅子旁边有一只小猫。", "桌子上有什么？", ["电脑", "书包", "猫"], "A", "电脑", "桌子上放着电脑。"],
  ["李明现在在中国学习汉语。他觉得老师很好，同学也很热情。", "李明在做什么？", ["在中国学习汉语", "在公司工作", "在饭店做饭"], "A", "学习", "开头说明在中国学习汉语。"],
  ["周五晚上我们去饭店吃饭。爸爸点了鱼，妈妈点了菜，我点了面。", "谁点了面？", ["爸爸", "妈妈", "我"], "C", "饭店", "最后一句说“我点了面”。"],
  ["王云住在学校旁边，所以她每天走路上课，很少坐车。", "王云通常怎么去上课？", ["坐车", "走路", "骑车"], "B", "走路", "因为住得近，所以走路。"],
  ["安娜今天买了一本中文书和两支笔。她觉得书不贵，很适合初学者。", "安娜买了几支笔？", ["一支", "两支", "三支"], "B", "数字", "短文中明确说两支笔。"],
  ["下午三点，我给妈妈打电话。她说晚上想在家做饭，不去外面吃。", "晚上他们打算在哪儿吃？", ["饭店", "家里", "学校"], "B", "做饭", "妈妈说在家做饭。"],
  ["今天下雨了，所以我们没有去公园，在家一起看电视。", "他们为什么没去公园？", ["太忙了", "下雨了", "公园关门了"], "B", "天气", "原因是下雨。"],
  ["小李会开车，但是今天他的车坏了，所以他坐地铁去公司。", "小李今天怎么去公司？", ["开车", "坐地铁", "走路"], "B", "公司", "车坏了，所以坐地铁。"],
  ["这家超市晚上十点关门。我们九点半到的时候，还可以买东西。", "他们几点半到超市？", ["八点半", "九点半", "十点半"], "B", "时间", "到达时间是九点半。"],
  ["我弟弟喜欢运动，周末常常去打球。今天他在家，因为外面太冷。", "弟弟今天为什么在家？", ["外面太冷", "他生病了", "他要学习"], "A", "天气", "今天在家的原因是天气太冷。"],
  ["朋友从北京来，我去机场接他。我们见面以后先去喝咖啡。", "他们见面以后先做什么？", ["去学校", "喝咖啡", "吃晚饭"], "B", "咖啡", "最后一句说明先去喝咖啡。"],
] as const;

const readingJudgeBank = [
  ["句子：我想喝热牛奶。", ["热牛奶", "冷咖啡", "苹果"], "A", "牛奶", "句子目标词是“热牛奶”。"],
  ["句子：姐姐今天去医院上班。", ["医院", "公园", "超市"], "A", "医院", "地点是医院。"],
  ["句子：他们晚上八点看电影。", ["晚上八点", "早上八点", "下午三点"], "A", "时间", "时间信息是晚上八点。"],
  ["句子：老师在黑板上写汉字。", ["黑板", "汽车", "饭桌"], "A", "汉字", "场景只能对应黑板。"],
  ["句子：我家有一只小狗。", ["小狗", "小猫", "小鸟"], "A", "动物", "对象是一只小狗。"],
  ["句子：他不喜欢喝咖啡。", ["喜欢咖啡", "不喜欢咖啡", "想买咖啡"], "B", "咖啡", "否定信息决定答案。"],
  ["句子：今天很冷，我们不要出去。", ["天气热", "天气冷", "天气很好"], "B", "天气", "句子强调很冷。"],
  ["句子：妹妹在房间里看书。", ["房间", "学校", "饭店"], "A", "房间", "地点是房间。"],
  ["句子：爸爸会开车，也会做饭。", ["爸爸不会开车", "爸爸会开车", "爸爸喜欢唱歌"], "B", "爸爸", "句子明确给出会开车。"],
  ["句子：我想买两杯茶。", ["一杯茶", "两杯茶", "三杯咖啡"], "B", "数字", "数量是两杯。"],
  ["句子：学生们在教室里上课。", ["教室", "公园", "公司"], "A", "教室", "地点为教室。"],
  ["句子：弟弟觉得这本书很好看。", ["这本书很难", "这本书很好看", "弟弟不想看书"], "B", "书", "评价是很好看。"],
  ["句子：妈妈今天没有去公司。", ["妈妈去了公司", "妈妈没有去公司", "妈妈在超市工作"], "B", "公司", "是否定信息。"],
  ["句子：晚上我给朋友打电话。", ["晚上打电话", "早上写邮件", "下午去看朋友"], "A", "电话", "动作是晚上打电话。"],
  ["句子：我的电脑在桌子下面。", ["桌子上", "桌子下面", "包里"], "B", "电脑", "位置是桌子下面。"],
] as const;

const readingChoiceBank = [
  ["我在超市买了很多____。", ["书", "水果", "老师"], "B", "水果", "在超市买“水果”最自然。"],
  ["今天很热，我们去喝____吧。", ["牛奶", "雨", "桌子"], "A", "牛奶", "喝的对象应为饮品。"],
  ["他是中国人，会说很多____。", ["汉语", "苹果", "星期"], "A", "汉语", "“说很多汉语”符合语义。"],
  ["姐姐在医院____。", ["工作", "电影", "公园"], "A", "工作", "医院常与工作场景搭配。"],
  ["老师让我们回家写____。", ["作业", "出租车", "天气"], "A", "作业", "固定搭配是写作业。"],
  ["朋友来了，我们一起去____吃饭。", ["饭店", "课堂", "电脑"], "A", "饭店", "吃饭的地点是饭店。"],
  ["我想买一张____去北京。", ["火车票", "老师", "书包"], "A", "火车票", "去北京要买车票。"],
  ["妈妈问我几点____。", ["回家", "颜色", "汉字"], "A", "回家", "询问时间通常接动作。"],
  ["他不太舒服，现在去____。", ["医院", "电影", "咖啡"], "A", "医院", "不舒服时去医院。"],
  ["今天天气很好，我们去____散步。", ["公园", "冰箱", "公司"], "A", "公园", "散步的地点是公园。"],
  ["爸爸正在给客户打____。", ["电话", "学生", "牛奶"], "A", "电话", "固定搭配是打电话。"],
  ["你觉得这本中文书____吗？", ["好看", "医生", "学校"], "A", "好看", "评价书可用“好看”。"],
  ["她每天七点起床，八点去____。", ["上课", "橙子", "星期"], "A", "上课", "时间和动作搭配完整。"],
  ["桌子上有电脑，也有两本____。", ["书", "医生", "天气"], "A", "书", "与桌上物品匹配。"],
  ["弟弟不会开车，所以他坐____去公司。", ["地铁", "作业", "鸡蛋"], "A", "地铁", "交通方式应为地铁。"],
] as const;

const matchingBank = [
  ["你好吗？", ["我很好，谢谢。", "在图书馆。", "星期三。"], "A", "问候", "问候通常回答状态。"],
  ["你想喝什么？", ["我想喝茶。", "我在学校。", "我八点走。"], "A", "饮品", "问题询问想喝什么。"],
  ["你去哪儿？", ["我去公司。", "我叫安娜。", "我二十岁。"], "A", "地点", "去哪儿要回答目的地。"],
  ["现在几点？", ["九点半。", "在桌子上。", "很高兴。"], "A", "时间", "问时间。"],
  ["你会说汉语吗？", ["会一点儿。", "在家里。", "今天很冷。"], "A", "汉语", "问题询问能力。"],
  ["这是谁的书？", ["是我的。", "在超市。", "很便宜。"], "A", "所属", "要回答所属关系。"],
  ["你家有几口人？", ["三口人。", "我们都很好。", "在学校旁边。"], "A", "数字", "问人数。"],
  ["你为什么不去？", ["因为我今天很忙。", "我去北京。", "我会开车。"], "A", "原因", "要回答原因。"],
  ["明天你有课吗？", ["有，上午两节。", "我喜欢老师。", "那是我姐姐。"], "A", "课程", "问有没有课。"],
  ["周末我们一起看电影吧？", ["好啊。", "我在公司。", "这本书很贵。"], "A", "建议", "建议最自然回答“好啊”。"],
  ["你在哪儿工作？", ["我在医院。", "我坐地铁。", "我去过。"], "A", "工作", "问工作地点。"],
  ["今天热不热？", ["很热。", "我想买水果。", "现在九点。"], "A", "天气", "回答天气。"],
  ["你弟弟多大？", ["他八岁。", "他在家。", "他会唱歌。"], "A", "年龄", "问年龄。"],
  ["要不要一起吃饭？", ["好，我们去饭店。", "今天星期五。", "这里有两本书。"], "A", "吃饭", "邀请最自然接受。"],
  ["老师在哪儿？", ["在教室里。", "他很高。", "我要回家。"], "A", "老师", "问地点。"],
] as const;

const fillBlankBank = [
  ["我今天很____，想早点回家休息。", ["忙", "病", "贵"], "B", "生病时更适合早点回家休息。", "健康"],
  ["请问，去学校怎么____？", ["喝", "走", "高兴"], "B", "去学校通常问怎么走。", "问路"],
  ["这本书不贵，很____初学者。", ["适合", "出租车", "电影"], "A", "“适合初学者”是固定说法。", "学习"],
  ["妈妈在厨房做饭，我在客厅看____。", ["电视", "老师", "医院"], "A", "看电视最自然。", "家庭"],
  ["下课以后，我和同学一起去____喝咖啡。", ["饭店", "学校", "公司"], "A", "喝咖啡可在饭店或咖啡馆，这里 A 最合适。", "社交"],
  ["他今天没来上课，因为他____了。", ["唱", "病", "坐"], "B", "生病所以没来上课。", "健康"],
  ["我的电脑在桌子____。", ["里", "上", "会"], "B", "位置应为桌子上。", "位置"],
  ["周末我们想去公园____照片。", ["开", "拍", "给"], "B", "固定搭配是拍照片。", "活动"],
  ["老师说汉字要多看、多写、多____。", ["读", "苹果", "冷"], "A", "学习汉字要多读。", "汉字"],
  ["今天太晚了，我们明天再____电话。", ["打", "吃", "买"], "A", "固定搭配是打电话。", "沟通"],
  ["爸爸喜欢开车，不喜欢坐____。", ["出租车", "作业", "老师"], "A", "交通工具搭配。", "交通"],
  ["我家离公司不远，走路十____就到了。", ["分钟", "老师", "苹果"], "A", "时间量词应为分钟。", "时间"],
  ["她觉得这家饭店的菜很好____。", ["吃", "看", "买"], "A", "菜很好吃。", "食物"],
  ["今天是妹妹的生日，我给她买了一个小____。", ["礼物", "学校", "医生"], "A", "生日常买礼物。", "礼物"],
  ["我们先去超市，然后____家做饭。", ["回", "看", "坐"], "A", "动作顺序应为回家做饭。", "日常"],
] as const;

const vocabulary: VocabularyCard[] = [
  { word: "老师", pinyin: "lǎoshī", meaning: "teacher", topic: "人物" },
  { word: "学校", pinyin: "xuéxiào", meaning: "school", topic: "地点" },
  { word: "医院", pinyin: "yīyuàn", meaning: "hospital", topic: "地点" },
  { word: "超市", pinyin: "chāoshì", meaning: "supermarket", topic: "地点" },
  { word: "公园", pinyin: "gōngyuán", meaning: "park", topic: "地点" },
  { word: "喝茶", pinyin: "hē chá", meaning: "drink tea", topic: "动作" },
  { word: "打电话", pinyin: "dǎ diànhuà", meaning: "make a phone call", topic: "动作" },
  { word: "看电影", pinyin: "kàn diànyǐng", meaning: "watch a movie", topic: "活动" },
  { word: "写作业", pinyin: "xiě zuòyè", meaning: "do homework", topic: "学习" },
  { word: "高兴", pinyin: "gāoxìng", meaning: "happy", topic: "情绪" },
  { word: "分钟", pinyin: "fēnzhōng", meaning: "minute", topic: "时间" },
  { word: "出租车", pinyin: "chūzūchē", meaning: "taxi", topic: "交通" },
];

const levelSummaries: LevelSummary[] = [
  {
    id: "hsk-1",
    title: "HSK1",
    stage: "Starter",
    status: "live",
    description: "已开放 3 套模考、8 个专项模块、错题复习与词汇基础模块。",
  },
  {
    id: "hsk-2",
    title: "HSK2",
    stage: "Basic",
    status: "coming_soon",
    description: "架构已预留，题库审核和蓝图正在整理中。",
  },
  {
    id: "hsk-3",
    title: "HSK3",
    stage: "Bridge",
    status: "coming_soon",
    description: "将优先补齐词汇、阅读和模考数据结构。",
  },
  {
    id: "hsk-4",
    title: "HSK4",
    stage: "Independent",
    status: "coming_soon",
    description: "将在后台发布流稳定后逐级开放。",
  },
  {
    id: "hsk-5",
    title: "HSK5",
    stage: "Advanced",
    status: "coming_soon",
    description: "保留计划类型与题库层级，后续扩展。",
  },
  {
    id: "hsk-6",
    title: "HSK6",
    stage: "Advanced+",
    status: "coming_soon",
    description: "暂不发布内容，仅预留架构。",
  },
  {
    id: "hsk-7",
    title: "HSK7",
    stage: "Expert",
    status: "coming_soon",
    description: "未来对齐 HSK 3.0 高阶能力标准。",
  },
  {
    id: "hsk-8",
    title: "HSK8",
    stage: "Expert+",
    status: "coming_soon",
    description: "未来对齐高阶综合训练与模考。",
  },
  {
    id: "hsk-9",
    title: "HSK9",
    stage: "Mastery",
    status: "coming_soon",
    description: "未来开放。",
  },
];

function questionId(prefix: string, exam: string, idx: number) {
  return `${prefix}_${exam}_${String(idx + 1).padStart(2, "0")}`;
}

function examQuestion(
  exam: string,
  idx: number,
  section: SectionName,
  part: 1 | 2 | 3 | 4,
  kind: QuestionKind,
  title: string,
  prompt: string,
  options: string[],
  answer: string,
  explanation: string,
  vocab: string[],
  context?: string,
  visualHint?: string,
): Question {
  const optionIds = ["A", "B", "C", "D"];

  return {
    id: questionId("item", exam, idx),
    title,
    level: "HSK1",
    section,
    part,
    kind,
    prompt,
    context,
    visualHint,
    options: options.map((text, optionIndex) => ({
      id: optionIds[optionIndex] ?? `O${optionIndex + 1}`,
      label: optionIds[optionIndex] ?? `O${optionIndex + 1}`,
      text,
    })),
    answer,
    explanation,
    estimatedSeconds: 55,
    vocabFocus: vocab,
    sourceType: "original",
    reviewStatus: "approved",
    publishStatus: "published",
    copyrightStatus: "cleared",
    tags: [section, `part-${part}`, ...vocab],
  };
}

function buildMockExam(examId: string, title: string, access: "free" | "pro", sliceStart: number): MockExam {
  const questions: Question[] = [];
  let index = 0;

  trueFalseBank.slice(sliceStart, sliceStart + 5).forEach((item, itemIndex) => {
    questions.push(
      examQuestion(
        examId,
        index++,
        "听力",
        1,
        "image_true_false",
        `听力第一部分 ${itemIndex + 1}`,
        item[0],
        ["一致", "不一致"],
        item[4],
        item[2],
        [item[3]],
        "判断图片与听到的话是否一致。",
        item[1],
      ),
    );
  });

  listeningChoiceBank.slice(sliceStart, sliceStart + 5).forEach((item, itemIndex) => {
    questions.push(
      examQuestion(
        examId,
        index++,
        "听力",
        2,
        "image_choice",
        `听力第二部分 ${itemIndex + 1}`,
        item[0],
        [...item[1]],
        item[2],
        item[4],
        [item[3]],
      ),
    );
  });

  dialogueBank.slice(sliceStart, sliceStart + 5).forEach((item, itemIndex) => {
    questions.push(
      examQuestion(
        examId,
        index++,
        "听力",
        3,
        "single_choice",
        `听力第三部分 ${itemIndex + 1}`,
        item[1],
        [...item[2]],
        item[3],
        item[5],
        [item[4]],
        item[0],
      ),
    );
  });

  passageBank.slice(sliceStart, sliceStart + 5).forEach((item, itemIndex) => {
    questions.push(
      examQuestion(
        examId,
        index++,
        "听力",
        4,
        "single_choice",
        `听力第四部分 ${itemIndex + 1}`,
        item[1],
        [...item[2]],
        item[3],
        item[5],
        [item[4]],
        item[0],
      ),
    );
  });

  readingJudgeBank.slice(sliceStart, sliceStart + 5).forEach((item, itemIndex) => {
    questions.push(
      examQuestion(
        examId,
        index++,
        "阅读",
        1,
        "image_choice",
        `阅读第一部分 ${itemIndex + 1}`,
        item[0],
        [...item[1]],
        item[2],
        item[4],
        [item[3]],
      ),
    );
  });

  readingChoiceBank.slice(sliceStart, sliceStart + 5).forEach((item, itemIndex) => {
    questions.push(
      examQuestion(
        examId,
        index++,
        "阅读",
        2,
        "single_choice",
        `阅读第二部分 ${itemIndex + 1}`,
        item[0],
        [...item[1]],
        item[2],
        item[4],
        [item[3]],
      ),
    );
  });

  matchingBank.slice(sliceStart, sliceStart + 5).forEach((item, itemIndex) => {
    questions.push(
      examQuestion(
        examId,
        index++,
        "阅读",
        3,
        "matching",
        `阅读第三部分 ${itemIndex + 1}`,
        item[0],
        [...item[1]],
        item[2],
        item[4],
        [item[3]],
      ),
    );
  });

  fillBlankBank.slice(sliceStart, sliceStart + 5).forEach((item, itemIndex) => {
    questions.push(
      examQuestion(
        examId,
        index++,
        "阅读",
        4,
        "fill_blank",
        `阅读第四部分 ${itemIndex + 1}`,
        item[0],
        [...item[1]],
        item[2],
        item[3],
        [item[4]],
      ),
    );
  });

  mockExamQuestions.push(...questions);

  return {
    id: examId,
    slug: examId.toLowerCase(),
    title,
    subtitle: access === "free" ? "开放试做" : "Pro 全量模考",
    description: "依据公开 HSK 能力标准重新编排，不直接复刻原始真题。",
    minutes: 40,
    questionIds: questions.map((question) => question.id),
    access,
    recommendedFor: access === "free" ? "首次摸底、体验流程" : "冲刺前整卷模拟",
  };
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const _questionsData: Question[] = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../../output/web_import/questions.json") as Question[];
  } catch {
    return [];
  }
})();
const mockExamQuestions: Question[] = _questionsData;
const mockExams: MockExam[] = [
  buildMockExam("H1_MOCK_A", "HSK1 Mock A", "free", 0),
  buildMockExam("H1_MOCK_B", "HSK1 Mock B", "pro", 5),
  buildMockExam("H1_MOCK_C", "HSK1 Mock C", "pro", 10),
];

const practiceSets: PracticeSet[] = [
  { id: "PS_L1", slug: "listening-part-1", title: "听力第一部分", description: "判断图片与听到的话是否一致。", section: "听力", part: 1, questionIds: mockExamQuestions.filter((item) => item.section === "听力" && item.part === 1).slice(0, 10).map((item) => item.id), access: "free", recommendedFor: "建立听图判断习惯" },
  { id: "PS_L2", slug: "listening-part-2", title: "听力第二部分", description: "听句子，快速锁定对应场景。", section: "听力", part: 2, questionIds: mockExamQuestions.filter((item) => item.section === "听力" && item.part === 2).slice(0, 10).map((item) => item.id), access: "pro", recommendedFor: "强化关键词识别" },
  { id: "PS_L3", slug: "listening-part-3", title: "听力第三部分", description: "听短对话，判断人物与信息。", section: "听力", part: 3, questionIds: mockExamQuestions.filter((item) => item.section === "听力" && item.part === 3).slice(0, 10).map((item) => item.id), access: "pro", recommendedFor: "建立问答映射能力" },
  { id: "PS_L4", slug: "listening-part-4", title: "听力第四部分", description: "听短文，抓住关键信息。", section: "听力", part: 4, questionIds: mockExamQuestions.filter((item) => item.section === "听力" && item.part === 4).slice(0, 10).map((item) => item.id), access: "pro", recommendedFor: "提升短文信息抓取" },
  { id: "PS_R1", slug: "reading-part-1", title: "阅读第一部分", description: "判断词语与句意是否匹配。", section: "阅读", part: 1, questionIds: mockExamQuestions.filter((item) => item.section === "阅读" && item.part === 1).slice(0, 10).map((item) => item.id), access: "free", recommendedFor: "建立词图/词义反应" },
  { id: "PS_R2", slug: "reading-part-2", title: "阅读第二部分", description: "在句子里选出最合适的词。", section: "阅读", part: 2, questionIds: mockExamQuestions.filter((item) => item.section === "阅读" && item.part === 2).slice(0, 10).map((item) => item.id), access: "pro", recommendedFor: "做题速度提升" },
  { id: "PS_R3", slug: "reading-part-3", title: "阅读第三部分", description: "匹配问句和最自然的回答。", section: "阅读", part: 3, questionIds: mockExamQuestions.filter((item) => item.section === "阅读" && item.part === 3).slice(0, 10).map((item) => item.id), access: "pro", recommendedFor: "提升句式反应" },
  { id: "PS_R4", slug: "reading-part-4", title: "阅读第四部分", description: "填空与短文理解。", section: "阅读", part: 4, questionIds: mockExamQuestions.filter((item) => item.section === "阅读" && item.part === 4).slice(0, 10).map((item) => item.id), access: "pro", recommendedFor: "巩固句法与语义" },
];

const pipelineReviewItems: Question[] = [
  {
    ...mockExamQuestions[2],
    id: "PIPELINE_001",
    title: "导入待审项 1",
    reviewStatus: "pending",
    publishStatus: "ready",
    sourceType: "re_authored",
  },
  {
    ...mockExamQuestions[14],
    id: "PIPELINE_002",
    title: "导入待修项 2",
    reviewStatus: "needs_fix",
    publishStatus: "draft",
    sourceType: "re_authored",
    copyrightStatus: "pending",
  },
  {
    ...mockExamQuestions[31],
    id: "PIPELINE_003",
    title: "内部参考项 3",
    reviewStatus: "approved",
    publishStatus: "ready",
    sourceType: "reference_only",
  },
];

export const nonOfficialStatement =
  "本平台为独立开发的中文学习与备考服务，相关练习依据公开考试标准和教学目标设计，并非官方出题或报名系统。";

export function getLevelSummaries() {
  return levelSummaries;
}

export function getVocabularyCards() {
  return vocabulary;
}

export function getAllQuestions() {
  return [...mockExamQuestions, ...pipelineReviewItems];
}

export function getPublishedQuestions() {
  return getAllQuestions().filter(
    (question) =>
      question.reviewStatus === "approved" &&
      question.publishStatus === "published" &&
      question.sourceType !== "reference_only" &&
      question.copyrightStatus === "cleared",
  );
}

export function getMockExams() {
  return mockExams;
}

export function getPracticeSets() {
  return practiceSets;
}

export function getMockExamBySlug(slug: string) {
  return mockExams.find((exam) => exam.slug === slug);
}

export function getPracticeSetBySlug(slug: string) {
  return practiceSets.find((set) => set.slug === slug);
}

export function getQuestionById(id: string) {
  return getAllQuestions().find((question) => question.id === id);
}

export function getQuestionsByIds(ids: string[]) {
  return ids
    .map((id) => getQuestionById(id))
    .filter((question): question is Question => Boolean(question));
}

export function getSourceQuestions(kind: SourceKind, slug: string) {
  const source = kind === "mock_exam" ? getMockExamBySlug(slug) : getPracticeSetBySlug(slug);
  if (!source) {
    return [];
  }

  return getQuestionsByIds(source.questionIds);
}

export function getGovernanceItems(): GovernanceSnapshot[] {
  return getAllQuestions().map((item) => ({
    id: item.id,
    title: item.title,
    section: item.section,
    part: item.part,
    sourceType: item.sourceType,
    reviewStatus: item.reviewStatus,
    publishStatus: item.publishStatus,
    copyrightStatus: item.copyrightStatus,
  }));
}

export function getPublishedCatalogSummary() {
  return {
    mockExamCount: mockExams.length,
    practiceCount: practiceSets.length,
    vocabularyCount: vocabulary.length,
    questionCount: getPublishedQuestions().length,
  };
}

export function getRecommendedPracticeFromReport(weakAreas: string[]) {
  return practiceSets.filter((set) => weakAreas.includes(`${set.section}-${set.part}`)).slice(0, 3);
}

