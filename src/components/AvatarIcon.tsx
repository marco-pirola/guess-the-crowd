import { AvatarKey } from "@/lib/types";
import { AVATAR_EMOJI } from "@/lib/avatars";

const SIZES = {
  sm: "h-8 w-8 text-base",
  md: "h-11 w-11 text-xl",
  lg: "h-14 w-14 text-2xl",
} as const;

export function AvatarIcon({
  avatarKey,
  size = "md",
  className = "",
}: {
  avatarKey: AvatarKey;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-sunken ${SIZES[size]} ${className}`}
    >
      {AVATAR_EMOJI[avatarKey]}
    </span>
  );
}
