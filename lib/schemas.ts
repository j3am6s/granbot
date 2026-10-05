import { z } from "zod";
import { prefectureByCode } from "../content/prefectures";
import { HttpError, cleanPlace, normalizePhone } from "./text";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(20),
  phone: z.string().trim().min(8).max(20),
});

export const setupSchema = z.object({
  displayName: z.string().trim().min(1).max(20),
  age: z.number().int().min(60).max(110),
  prefectureCode: z.string().trim(),
  city: z.string().trim().min(1).max(40),
  fallRisk: z.boolean(),
  shelterName: z.string().trim().min(1).max(80),
  shelterAddress: z.string().trim().min(1).max(200),
  kitLocation: z.string().trim().min(1).max(80),
  contacts: z.array(contactSchema).min(1).max(3),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(80),
  password: z.string().min(10).max(72),
});

export function registerErrorMessage(error: z.ZodError) {
  const fields = new Set(error.issues.map((issue) => issue.path[0]));
  const parts: string[] = [];
  if (fields.has("name")) parts.push("名前を入れてください。");
  if (fields.has("email")) parts.push("メールの形を確認してください。例: hanako@example.com");
  if (fields.has("password")) parts.push("パスワードは10文字以上にしてください。");
  return parts.join("") || "入力を確認してください。";
}

export const loginSchema = z.object({
  email: z.string().trim().email().max(80),
  password: z.string().min(1).max(72),
});

export const pinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/),
});

export const pairSchema = pinSchema.extend({
  code: z.string().regex(/^\d{8}$/),
});

export function parseSetup(input: unknown) {
  const parsed = setupSchema.safeParse(input);
  if (!parsed.success) {
    throw new HttpError(400, "入力を確認してください。");
  }
  const prefecture = prefectureByCode(parsed.data.prefectureCode);
  if (!prefecture) throw new HttpError(400, "都道府県を選んでください。");
  const city = cleanPlace(parsed.data.city);
  const shelterName = cleanPlace(parsed.data.shelterName);
  const shelterAddress = cleanPlace(parsed.data.shelterAddress);
  const kitLocation = cleanPlace(parsed.data.kitLocation);
  if (!city || !shelterName || !shelterAddress || !kitLocation) {
    throw new HttpError(400, "入力を確認してください。");
  }
  const contacts = parsed.data.contacts.map((contact, index) => {
    const name = cleanPlace(contact.name);
    if (!name) throw new HttpError(400, "家族の名前を確認してください。");
    return { name, phone: normalizePhone(contact.phone), sortOrder: index };
  });
  return {
    ...parsed.data,
    displayName: cleanPlace(parsed.data.displayName),
    city,
    shelterName,
    shelterAddress,
    kitLocation,
    prefectureName: prefecture.name,
    contacts,
  };
}
