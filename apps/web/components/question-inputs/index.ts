// answerFormat 输入子组件汇出口。question-view 只做分发,具体渲染在各子组件。
export { JudgeInput } from "./judge-input";
export { McInput } from "./mc-input";
export { McImageInput } from "./mc-image-input";
export { SharedPoolInput } from "./shared-pool-input";
export { MatchInput } from "./match-input";
export { OrderInput } from "./order-input";
export { FillInput } from "./fill-input";
export { WriteInput } from "./write-input";
export { SpeakInput } from "./speak-input";

// C5 单一来源:DisplayQuestion / DisplayOption 经 shared re-export 自 lib/view-models。
export type { DisplayOption, DisplayQuestion } from "./shared";
