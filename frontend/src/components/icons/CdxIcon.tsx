import React from "react";

export type IconProp =
  | string
  | { ltr?: string; rtl?: string; path?: string; shouldFlip?: boolean }
  | any;

interface CdxIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon: IconProp;
  size?: number | string;
}

export function CdxIcon({ icon, className = "", size = 20, ...props }: CdxIconProps) {
  if (!icon) return null;

  let pathContent = "";
  let shouldFlip = false;

  if (typeof icon === "string") {
    pathContent = icon;
  } else if (typeof icon === "object") {
    const isRtl =
      typeof document !== "undefined" && document.documentElement.dir === "rtl";
    if (isRtl && icon.rtl) {
      pathContent = icon.rtl;
    } else {
      pathContent = icon.ltr || icon.path || "";
    }
    if (isRtl && icon.shouldFlip && !icon.rtl) {
      shouldFlip = true;
    }
  }

  return (
    <span
      className={`cdx-icon ${shouldFlip ? "cdx-icon--flipped" : ""} ${className}`}
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: pathContent }}
      />
    </span>
  );
}

export default CdxIcon;

