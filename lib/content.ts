import mental from "../content/mental.json";
import routines from "../content/routines.json";
import { weekdayTokyo } from "./time";

export function selectRoutine(age: number, fallRisk: boolean, now = new Date()) {
  const week = age >= 75 || fallRisk ? routines.chair : routines.standing;
  return week[weekdayTokyo(now) % week.length];
}

export function selectMentalSession(now = new Date()) {
  return mental[weekdayTokyo(now) % mental.length];
}
