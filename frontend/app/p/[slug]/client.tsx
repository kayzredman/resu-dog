"use client";

import ProfileView from "@/components/profile/ProfileView";
import type { ProfileData } from "@/components/profile/ProfileView";

interface Props {
  profile: Record<string, unknown>;
  resumeText: string | null;
}

export default function PublicProfileClient({ profile, resumeText }: Props) {
  return (
    <ProfileView
      profile={profile as unknown as ProfileData}
      resumeText={resumeText}
      isPublic
    />
  );
}
