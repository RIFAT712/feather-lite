import React from "react";

interface CdxIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon: string | { path: string } | any;
  size?: number | string;
}

export function CdxIcon({ icon, className = "", size = 20, ...props }: CdxIconProps) {
  const pathContent = typeof icon === "string" ? icon : icon?.path || "";
  return (
    <span className={`cdx-icon ${className}`} {...props}>
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
