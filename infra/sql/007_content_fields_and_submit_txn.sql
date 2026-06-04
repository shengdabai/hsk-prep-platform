-- 007 — 内容字段补齐(A1 对称性回归)+ submit 原子事务(终审 HIGH-2)
--
-- 目标 A1:Phase 5 在 mock 侧新增的 content 字段在 supabase schema 缺列,导致切真实
--   后端后这些字段被 mapContentItem 静默丢弃(对称性回归)。本迁移补齐四类列,使
--   共享选项池 / 听力上下文 / 分部序号 / 选项图在 supabase 路径同样可用:
--     - content_items.context        听力对话/短文/阅读篇章原文(题干上下文)
--     - content_items.part           该题在所属 section 的分部序号(spec 各级"第N部分")
--     - content_items.shared_option_pool  共享选项池(A-F 六选共享),JSONB:{groupId, poolOptionIds}
--     - content_item_options.image_asset_id  选图题(mc_image)每选项图资产
--
-- 目标 HIGH-2:supabase submitSession 原为多步非事务写(report + session + 错题),
--   中途失败会留下脏态(report 存在但 session 仍 active / 无错题行)。本迁移提供一个
--   Postgres 事务函数 submit_exam_session(...),把"插报告 + 置会话已提交 + 批量 upsert
--   错题本"包进单一事务,任一步失败整体回滚。应用层用单次 RPC 调用替代三次分散写。
--
-- 幂等:全部 add column if not exists / create or replace function,可重复执行。

-- ── A1:内容字段补齐 ─────────────────────────────────────────────────────────
alter table public.content_items
  add column if not exists context text;

alter table public.content_items
  add column if not exists part integer;

-- 共享选项池:{ "groupId": "...", "poolOptionIds": ["A","B",...] };无池题为 null。
alter table public.content_items
  add column if not exists shared_option_pool jsonb;

-- 选图题每选项图(指向 media_assets);纯文本选项为 null。
alter table public.content_item_options
  add column if not exists image_asset_id uuid
    references public.media_assets(id) on delete set null;

-- ── HIGH-2:submit 原子事务函数 ──────────────────────────────────────────────
-- 入参:
--   p_session_id     会话 id
--   p_profile_id     学员 id(冗余传入,避免函数内再查一次)
--   p_total          可判分题数
--   p_correct        判分正确数
--   p_accuracy       正确率(0..1)
--   p_duration       用时(秒)
--   p_report_json    完整领域报告(jsonb;函数回填真实报告 id 后由应用层无需二次 update)
--   p_submitted_at   提交时间(ISO,timestamptz)
--   p_mistakes       错题数组 jsonb:[{ "itemId": "<uuid>" }, ...]
-- 返回:本会话对应报告行 id(uuid)。
--
-- 幂等去竞态:exam_reports.exam_session_id 唯一。若已有报告(并发 submit 先到者),
--   函数捕获 unique_violation,返回既有报告 id,并仍补齐"会话置已提交 + 错题 upsert"
--   (修复终审指出的"找到既有报告即返回、漏补 session/错题写入"缺口)。
-- 错题本:upsert(onConflict profile_id,content_item_id),payload 不含 SRS 列,
--   从而保留既有复习进度;首次入库由 004 的列默认值给出初始 SRS 锚点。
create or replace function public.submit_exam_session(
  p_session_id uuid,
  p_profile_id uuid,
  p_total integer,
  p_correct integer,
  p_accuracy numeric,
  p_duration integer,
  p_report_json jsonb,
  p_submitted_at timestamptz,
  p_mistakes jsonb
) returns uuid
language plpgsql
as $$
declare
  v_report_id uuid;
  v_mistake jsonb;
begin
  -- 1) 插报告(唯一约束兜底并发);已存在则取既有 id(幂等闭环)。
  begin
    insert into public.exam_reports (
      exam_session_id, profile_id, total_questions, correct_answers,
      accuracy_rate, score, duration_seconds, report_json
    ) values (
      p_session_id, p_profile_id, p_total, p_correct,
      p_accuracy, p_correct, p_duration,
      -- 回填真实报告 id 到 report_json.id(在 insert 后用 RETURNING 拿到 id 再更新一次,
      -- 全在同一事务内)。
      p_report_json
    )
    returning id into v_report_id;

    update public.exam_reports
      set report_json = jsonb_set(p_report_json, '{id}', to_jsonb(v_report_id::text))
      where id = v_report_id;
  exception
    when unique_violation then
      select id into v_report_id
        from public.exam_reports
        where exam_session_id = p_session_id;
  end;

  -- 2) 会话置已提交(无论新报告还是命中既有报告,都补齐,避免"报告存在但会话仍 active")。
  update public.exam_sessions
    set status = 'submitted', submitted_at = p_submitted_at
    where id = p_session_id;

  -- 3) 错题本 upsert(每 user/item 至多一行;不携带 SRS 列,保留复习进度)。
  if p_mistakes is not null then
    for v_mistake in select * from jsonb_array_elements(p_mistakes)
    loop
      insert into public.mistake_book (
        profile_id, content_item_id, first_seen_session_id, last_seen_at, mastered
      ) values (
        p_profile_id,
        (v_mistake->>'itemId')::uuid,
        p_session_id,
        p_submitted_at,
        false
      )
      on conflict (profile_id, content_item_id)
      do update set last_seen_at = excluded.last_seen_at;
    end loop;
  end if;

  return v_report_id;
end;
$$;
