// 签名会话 cookie(HMAC 防伪造),取代旧的明文 hsk_demo_user。
export const sessionCookie = "hsk_session";

// 旧明文 cookie 名仅保留用于登出时清理历史残留,不再用于鉴权。
export const legacyUserCookie = "hsk_demo_user";
export const legacyRoleCookie = "hsk_demo_role";
