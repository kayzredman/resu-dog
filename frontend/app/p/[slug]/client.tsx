"use client";

import ProfileView from "@/components/profile/ProfileView";
import type { ProfileData } from "@/components/profile/ProfileView";

interface Props {
  profile: ProfileData;
  resumeText: string | null;
  openToWork: boolean;
}

export default function PublicProfileClient({ profile, resumeText, openToWork }: Props) {
  return (
    <ProfileView
      profile={profile}
      resumeText={resumeText}
      openToWork={openToWork}
      isPublic
    />
  );
}
