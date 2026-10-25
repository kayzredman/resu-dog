// Pro features (international CV formats, public profile). Free for everyone during the
// beta; set PRO_FEATURES_UNLOCKED=false once payments are live to require a Pro plan.

import { NextResponse } from "next/server";

export function proUnlocked(): boolean {
  return process.env.PRO_FEATURES_UNLOCKED !== "false";
}

/**
 * Returns a 402 response when the caller can't use a Pro feature, else null.
 * Usage: `const locked = requirePro(); if (locked) return locked;`
 */
export function requirePro(): NextResponse | null {
  // TODO(payments): check the caller's subscription here before falling back to the flag
  if (proUnlocked()) return null;
  return NextResponse.json(
    { detail: "This is a Resu-Dog Pro feature.", code: "pro_required" },
    { status: 402 }
  );
}
