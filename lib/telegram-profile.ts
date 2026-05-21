export type ParsedTelegramProfile = {
  id: string;
  username?: string;
  firstName?: string;
  photoUrl?: string;
};

type UserProfileFields = {
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramPhotoUrl?: string;
};

/** Apply parsed Telegram fields onto a Mongoose user document (only non-empty values). */
export function applyTelegramProfileToUser(
  user: UserProfileFields,
  profile: Pick<ParsedTelegramProfile, "username" | "firstName" | "photoUrl">,
): void {
  if (profile.username) user.telegramUsername = profile.username;
  if (profile.firstName) user.telegramFirstName = profile.firstName;
  if (profile.photoUrl) user.telegramPhotoUrl = profile.photoUrl;
}

export function parseTelegramUserFromInitData(initData: string): ParsedTelegramProfile | null {
  try {
    const params = new URLSearchParams(initData);
    const userRaw = params.get("user");
    if (!userRaw) return null;
    const user = JSON.parse(userRaw) as {
      id?: number | string;
      username?: string;
      first_name?: string;
      photo_url?: string;
    };
    if (user.id == null) return null;
    const id = String(user.id).trim();
    if (!id) return null;
    return {
      id,
      username: user.username?.trim() || undefined,
      firstName: user.first_name?.trim() || undefined,
      photoUrl: user.photo_url?.trim() || undefined,
    };
  } catch {
    return null;
  }
}
