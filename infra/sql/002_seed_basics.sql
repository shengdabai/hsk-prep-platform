insert into public.plans (code, name, description, price_monthly_cents)
values
  ('free', 'Free', '基础体验计划', 0),
  ('pro', 'Pro', '解锁全部 HSK1 内容', 6900),
  ('institution', 'Institution', '机构预留计划', 19900)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  price_monthly_cents = excluded.price_monthly_cents;

insert into public.levels (code, name, display_order, is_active)
values ('hsk-1', 'HSK1', 1, true)
on conflict (code) do update
set
  name = excluded.name,
  display_order = excluded.display_order,
  is_active = excluded.is_active;

insert into public.sections (level_id, code, name, display_order, is_active)
select l.id, s.code, s.name, s.display_order, true
from public.levels l
cross join (
  values
    ('listening', '听力', 1),
    ('reading', '阅读', 2)
) as s(code, name, display_order)
where l.code = 'hsk-1'
on conflict (level_id, code) do update
set
  name = excluded.name,
  display_order = excluded.display_order,
  is_active = excluded.is_active;

insert into public.question_types (code, name, description)
values
  ('image_true_false', '图片判断', '判断图片与听到内容是否一致'),
  ('image_choice', '听句选图', '根据内容选择最匹配的图片或描述'),
  ('single_choice', '单选题', '从多个选项中选择一个正确答案'),
  ('matching', '匹配题', '将问句与回答进行匹配'),
  ('fill_blank', '填空题', '根据句意选择最合适的词')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;

insert into public.tags (code, label)
values
  ('drink', '饮品'),
  ('school', '学校'),
  ('hospital', '医院'),
  ('weather', '天气'),
  ('greeting', '问候')
on conflict (code) do update
set label = excluded.label;

with item_seed as (
  select *
  from (
    values
      ('item_hsk1_001', '听力图片判断 1', 'listening', 'image_true_false', '看图判断', '你听到：他在喝茶。', '图片和句子都在描述男生喝茶。', 'original', 'approved', 'published', 'cleared'),
      ('item_hsk1_002', '听力图片判断 2', 'listening', 'image_true_false', '看图判断', '你听到：她在医院上班。', '图中是护士站场景，和句子一致。', 'original', 'approved', 'published', 'cleared'),
      ('item_hsk1_003', '听力选图 1', 'listening', 'image_choice', '听句子选图', '你听到：我去超市买苹果。', '只有 A 同时对应超市和苹果。', 'original', 'approved', 'published', 'cleared'),
      ('item_hsk1_004', '听力单选 1', 'listening', 'single_choice', '听对话回答', '女：你去哪儿？ 男：我去学校上课。 问：男的去哪儿？', '对话中直接说去学校上课。', 'original', 'approved', 'published', 'cleared'),
      ('item_hsk1_005', '听力单选 2', 'listening', 'single_choice', '听短文回答', '短文：今天下雨了，我们没有去公园。 问：为什么没去公园？', '原因是下雨。', 'original', 'approved', 'published', 'cleared'),
      ('item_hsk1_006', '阅读选词 1', 'reading', 'fill_blank', '选词填空', '我今天很____，想早点回家休息。', '表示身体不舒服，用“病”。', 'original', 'approved', 'published', 'cleared'),
      ('item_hsk1_007', '阅读匹配 1', 'reading', 'matching', '匹配对话', '你好吗？', '常见问候的自然回答是“我很好，谢谢”。', 'original', 'approved', 'published', 'cleared'),
      ('item_hsk1_008', '阅读单选 1', 'reading', 'single_choice', '选词填空', '今天很热，我们去喝____吧。', '语义上应是可喝的饮品。', 'original', 'approved', 'published', 'cleared'),
      ('item_hsk1_009', '阅读图片词义 1', 'reading', 'image_choice', '看图选词', '句子：老师在黑板上写汉字。', '黑板最符合句子的场景。', 'original', 'approved', 'published', 'cleared'),
      ('item_hsk1_010', '阅读单选 2', 'reading', 'single_choice', '阅读短句回答', '玛丽是学生。她每天七点起床，八点上课。 问：玛丽几点上课？', '短句中明确写了八点上课。', 'original', 'approved', 'published', 'cleared')
  ) as x(item_code, title, section_code, question_type_code, stem, prompt, explanation, source_type, review_status, publish_status, copyright_status)
),
upserted_items as (
  insert into public.content_items (
    title,
    stem,
    prompt,
    explanation,
    level_id,
    section_id,
    question_type_id,
    source_type,
    review_status,
    publish_status,
    copyright_status
  )
  select
    item_code,
    stem,
    prompt,
    explanation,
    (select id from public.levels where code = 'hsk-1'),
    (select id from public.sections where code = item_seed.section_code and level_id = (select id from public.levels where code = 'hsk-1')),
    (select id from public.question_types where code = item_seed.question_type_code),
    source_type,
    review_status,
    publish_status,
    copyright_status
  from item_seed
  on conflict do nothing
  returning id, title
)
select 1;

delete from public.content_item_options where content_item_id in (select id from public.content_items where title like 'item_hsk1_%');
delete from public.content_item_answers where content_item_id in (select id from public.content_items where title like 'item_hsk1_%');

with options_seed as (
  select *
  from (
    values
      ('item_hsk1_001', 'A', '一致', 1),
      ('item_hsk1_001', 'B', '不一致', 2),
      ('item_hsk1_002', 'A', '一致', 1),
      ('item_hsk1_002', 'B', '不一致', 2),
      ('item_hsk1_003', 'A', '女生在超市挑苹果', 1),
      ('item_hsk1_003', 'B', '男生在教室上课', 2),
      ('item_hsk1_003', 'C', '两个人在公园散步', 3),
      ('item_hsk1_004', 'A', '学校', 1),
      ('item_hsk1_004', 'B', '饭店', 2),
      ('item_hsk1_004', 'C', '医院', 3),
      ('item_hsk1_005', 'A', '太忙了', 1),
      ('item_hsk1_005', 'B', '下雨了', 2),
      ('item_hsk1_005', 'C', '公园关门了', 3),
      ('item_hsk1_006', 'A', '忙', 1),
      ('item_hsk1_006', 'B', '病', 2),
      ('item_hsk1_006', 'C', '贵', 3),
      ('item_hsk1_007', 'A', '我很好，谢谢。', 1),
      ('item_hsk1_007', 'B', '在图书馆。', 2),
      ('item_hsk1_007', 'C', '星期三。', 3),
      ('item_hsk1_008', 'A', '牛奶', 1),
      ('item_hsk1_008', 'B', '雨', 2),
      ('item_hsk1_008', 'C', '桌子', 3),
      ('item_hsk1_009', 'A', '黑板', 1),
      ('item_hsk1_009', 'B', '汽车', 2),
      ('item_hsk1_009', 'C', '饭桌', 3),
      ('item_hsk1_010', 'A', '七点', 1),
      ('item_hsk1_010', 'B', '八点', 2),
      ('item_hsk1_010', 'C', '九点', 3)
  ) as x(item_code, option_key, option_text, display_order)
)
insert into public.content_item_options (content_item_id, option_key, option_text, display_order)
select
  ci.id,
  os.option_key,
  os.option_text,
  os.display_order
from options_seed os
join public.content_items ci on ci.title = os.item_code;

with answers_seed as (
  select *
  from (
    values
      ('item_hsk1_001', 'A'),
      ('item_hsk1_002', 'A'),
      ('item_hsk1_003', 'A'),
      ('item_hsk1_004', 'A'),
      ('item_hsk1_005', 'B'),
      ('item_hsk1_006', 'B'),
      ('item_hsk1_007', 'A'),
      ('item_hsk1_008', 'A'),
      ('item_hsk1_009', 'A'),
      ('item_hsk1_010', 'B')
  ) as x(item_code, option_key)
)
insert into public.content_item_answers (content_item_id, correct_option_id, grading_strategy)
select
  ci.id,
  cio.id,
  'single_choice'
from answers_seed a
join public.content_items ci on ci.title = a.item_code
join public.content_item_options cio on cio.content_item_id = ci.id and cio.option_key = a.option_key;

insert into public.practice_sets (slug, title, description, level_id, section_id, set_mode, access_plan_code, duration_minutes, review_status, publish_status)
values
  (
    'hsk1-mock-01',
    'HSK1 Mock Exam 01',
    'HSK1 模拟整卷，覆盖听力与阅读。',
    (select id from public.levels where code = 'hsk-1'),
    null,
    'mock_exam',
    'free',
    40,
    'approved',
    'published'
  ),
  (
    'hsk1-listening-core',
    'HSK1 听力专项',
    '聚焦 HSK1 听力核心题型。',
    (select id from public.levels where code = 'hsk-1'),
    (select id from public.sections where code = 'listening' and level_id = (select id from public.levels where code = 'hsk-1')),
    'practice_set',
    'pro',
    15,
    'approved',
    'published'
  ),
  (
    'hsk1-reading-core',
    'HSK1 阅读专项',
    '聚焦 HSK1 阅读核心题型。',
    (select id from public.levels where code = 'hsk-1'),
    (select id from public.sections where code = 'reading' and level_id = (select id from public.levels where code = 'hsk-1')),
    'practice_set',
    'pro',
    15,
    'approved',
    'published'
  )
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  access_plan_code = excluded.access_plan_code,
  duration_minutes = excluded.duration_minutes;

delete from public.practice_set_items
where practice_set_id in (
  select id from public.practice_sets where slug in ('hsk1-mock-01', 'hsk1-listening-core', 'hsk1-reading-core')
);

insert into public.practice_set_items (practice_set_id, content_item_id, display_order)
select
  (select id from public.practice_sets where slug = 'hsk1-mock-01'),
  ci.id,
  row_number() over (order by ci.title)
from public.content_items ci
where ci.title like 'item_hsk1_%';

insert into public.practice_set_items (practice_set_id, content_item_id, display_order)
select
  (select id from public.practice_sets where slug = 'hsk1-listening-core'),
  ci.id,
  row_number() over (order by ci.title)
from public.content_items ci
join public.sections s on s.id = ci.section_id
where ci.title like 'item_hsk1_%'
  and s.code = 'listening';

insert into public.practice_set_items (practice_set_id, content_item_id, display_order)
select
  (select id from public.practice_sets where slug = 'hsk1-reading-core'),
  ci.id,
  row_number() over (order by ci.title)
from public.content_items ci
join public.sections s on s.id = ci.section_id
where ci.title like 'item_hsk1_%'
  and s.code = 'reading';
