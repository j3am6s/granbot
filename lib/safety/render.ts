import scripts from "../../content/safety-scripts.json";

export type SafetyKind = keyof typeof scripts;

export type SafetyContext = {
  shelterName: string;
  shelterAddress: string;
  kitLocation: string;
  contactName: string;
  displayName: string;
  honorific: string;
};

export function renderSafety(kind: SafetyKind, ctx: SafetyContext, drill = false) {
  const kit = ctx.kitLocation.trim() || "まだ登録されていない場所";
  const body = scripts[kind]
    .replaceAll("{shelterName}", ctx.shelterName)
    .replaceAll("{shelterAddress}", ctx.shelterAddress)
    .replaceAll("{kitLocation}", kit)
    .replaceAll("{contactName}", ctx.contactName)
    .replaceAll("{name}", `${ctx.displayName}${ctx.honorific}`);
  return drill ? `これは練習です。${body}` : body;
}
