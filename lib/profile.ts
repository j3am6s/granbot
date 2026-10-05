import { prisma } from "./db";
import { encryptString } from "./crypto";
import { hashCode, randomDigits } from "./codes";
import { parseSetup } from "./schemas";

type ProfileInput = ReturnType<typeof parseSetup>;

export async function saveProfile(
  householdId: string,
  input: ProfileInput,
  issuePairing: boolean,
) {
  const pairingCode = issuePairing ? randomDigits(8) : null;
  await prisma.$transaction(async (tx) => {
    await tx.elderProfile.upsert({
      where: { householdId },
      create: {
        householdId,
        displayName: input.displayName,
        honorific: "さん",
        age: input.age,
        prefectureCode: input.prefectureCode,
        prefectureName: input.prefectureName,
        city: input.city,
        fallRisk: input.fallRisk,
        shelterName: input.shelterName,
        shelterAddressEnc: encryptString(input.shelterAddress),
        kitLocationEnc: encryptString(input.kitLocation),
      },
      update: {
        displayName: input.displayName,
        honorific: "さん",
        age: input.age,
        prefectureCode: input.prefectureCode,
        prefectureName: input.prefectureName,
        city: input.city,
        fallRisk: input.fallRisk,
        shelterName: input.shelterName,
        shelterAddressEnc: encryptString(input.shelterAddress),
        kitLocationEnc: encryptString(input.kitLocation),
      },
    });
    await tx.contact.deleteMany({ where: { householdId } });
    await tx.contact.createMany({
      data: input.contacts.map((contact) => ({ ...contact, householdId })),
    });
    if (pairingCode) {
      await tx.household.update({
        where: { id: householdId },
        data: {
          pairingCodeHash: hashCode(pairingCode),
          pairingCodeExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
    }
  });
  return pairingCode;
}
