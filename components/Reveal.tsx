import type { CSSProperties, ReactNode } from "react";

type RevealElement = "div" | "article" | "section" | "aside";

type RevealProps = {
  as?: RevealElement;
  children: ReactNode;
  className?: string;
  delay?: number;
  style?: CSSProperties;
};

export function Reveal({ as = "div", children, className, delay = 0, style: styleProp }: RevealProps) {
  const classes = ["reveal", className].filter(Boolean).join(" ");
  const style = {
    ...(delay ? ({ "--reveal-delay": `${delay}s` } as CSSProperties) : {}),
    ...styleProp
  };

  const Tag = as;
  return (
    <Tag className={classes} style={style}>
      {children}
    </Tag>
  );
}
