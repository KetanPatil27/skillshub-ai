import { avatarColor, cn, initials } from "@/lib/utils";

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        avatarColor(name),
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </div>
  );
}
