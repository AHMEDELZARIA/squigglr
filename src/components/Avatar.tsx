const SIZES = {
  sm: "h-12 w-12 text-2xl",
  md: "h-16 w-16 text-4xl",
  lg: "h-36 w-36 text-7xl",
};

interface AvatarProps {
  avatar: string;
  /** "sm", "md" or "lg". */
  size?: keyof typeof SIZES;
  selected?: boolean;
}

/** A child's picture in a ring. A child has a picture and no name (BR-001). */
export function Avatar({
  avatar,
  size = "md",
  selected = false,
}: AvatarProps) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border-[3px] leading-none ${SIZES[size]} ${
        selected ? "border-brand bg-lavender-deep" : "border-edge bg-lavender"
      }`}
    >
      {avatar}
    </span>
  );
}
