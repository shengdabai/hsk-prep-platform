import { z } from "zod";

// 本域(auth / billing)请求体的 zod 校验 schema。
// 复用项目已依赖的 zod(apps/web/package.json),不引入新依赖。

// 密码规则:至少 8 位,且包含字母与数字(基础强度,避免纯数字/纯字母弱密码)。
const passwordSchema = z
  .string()
  .min(8, "密码至少 8 位。")
  .max(128, "密码过长。")
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), "密码需同时包含字母和数字。");

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("邮箱格式不正确。").max(254, "邮箱过长。"),
  password: passwordSchema,
  fullName: z.string().trim().min(1, "请填写姓名。").max(120, "姓名过长。"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("邮箱格式不正确。").max(254, "邮箱过长。"),
  password: z.string().min(1, "密码不能为空。").max(128, "密码过长。"),
});

// create-checkout 当前不接收业务字段(用户从会话取),但仍校验请求体为对象/可空,
// 防止畸形 body 触发异常。允许空 body。
export const createCheckoutSchema = z
  .object({
    // 预留:未来若支持选择套餐,可在此校验 plan 等字段。
    plan: z.enum(["pro", "institution"]).optional(),
  })
  .strict()
  .nullable();

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/** 把 zod 错误压成一行用户可读信息(取第一个 issue)。 */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "请求参数不合法。";
}

/**
 * 安全解析 JSON 请求体:body 非法 JSON 时返回 null,不抛异常。
 */
export async function safeJson(request: Request): Promise<unknown> {
  try {
    const text = await request.text();
    if (!text) {
      return null;
    }
    return JSON.parse(text);
  } catch {
    return null;
  }
}
