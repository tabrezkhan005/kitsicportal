export const DEMO_PASSWORD = "KitsicDemo2026!";

export const DEMO_ACCOUNTS = [
  { email: "president@demo.kitsic", role: "president", fullName: "Demo President" },
  { email: "vicepresident@demo.kitsic", role: "vice_president", fullName: "Demo Vice President" },
  { email: "secretary@demo.kitsic", role: "secretary", fullName: "Demo Secretary" },
  { email: "treasurer@demo.kitsic", role: "treasurer", fullName: "Demo Treasurer" },
  { email: "techhead@demo.kitsic", role: "technical_head", fullName: "Demo Technical Head" },
  { email: "socialhead@demo.kitsic", role: "social_media_head", fullName: "Demo Social Media Head" },
  { email: "resourcehead@demo.kitsic", role: "resource_head", fullName: "Demo Resource Head" },
  { email: "logisticshead@demo.kitsic", role: "logistics_head", fullName: "Demo Logistics Head" },
  { email: "studentlead@demo.kitsic", role: "student_lead", fullName: "Demo Student Lead" },
  { email: "member@demo.kitsic", role: "member", fullName: "Demo Member" },
] as const;

export {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  NAVIGATION,
  DEPARTMENTS,
} from "./seed-data";
