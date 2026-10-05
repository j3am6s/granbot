import { decryptString } from "./crypto";
import { selectMentalSession, selectRoutine } from "./content";
import type { requireKiosk } from "./guards";
import { renderSafety } from "./safety/render";

type KioskBundle = Awaited<ReturnType<typeof requireKiosk>>;

export function buildBootstrap(bundle: KioskBundle) {
  const { elder, household } = bundle;
  const ctx = {
    shelterName: elder.shelterName,
    shelterAddress: decryptString(elder.shelterAddressEnc),
    kitLocation: decryptString(elder.kitLocationEnc),
    contactName: household.contacts[0]?.name ?? "家族",
    displayName: elder.displayName,
    honorific: elder.honorific,
  };
  return {
    greeting: `${elder.displayName}${elder.honorific}、こんにちは。`,
    contacts: household.contacts.map((contact) => ({
      name: contact.name,
      phone: contact.phone,
    })),
    routine: selectRoutine(elder.age, elder.fallRisk),
    mental: selectMentalSession(),
    stopSpeech: renderSafety("stop", ctx),
  };
}
