import React from "react";
import "./Loader.css";

export interface LoaderProps {
  /** Text to display under/next to the spinner (default: "Loading...") */
  text?: string;
  /** Optional secondary helper text */
  subtext?: string;
  /** Size variant: "sm" | "md" | "lg" | "inline" (default: "md") */
  size?: "sm" | "md" | "lg" | "inline";
  /** Minimum height in pixels or CSS string (e.g., 200, "250px") */
  minHeight?: number | string;
  /** Additional custom class names */
  className?: string;
  /** Whether to render inside a card-like bordered background (default: false) */
  card?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({
  text = "Loading...",
  subtext,
  size = "md",
  minHeight,
  className = "",
  card = false,
}) => {
  const containerStyle: React.CSSProperties = {
    ...(minHeight !== undefined
      ? { minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight }
      : {}),
  };

  return (
    <div
      className={`neevai-loader-container size-${size} ${card ? "as-card" : ""} ${className}`.trim()}
      style={containerStyle}
      role="status"
      aria-live="polite"
    >
      <div className="neevai-spinner-wrapper">
        <div className="neevai-spinner-ring" />
        <div className="neevai-spinner-core" />
      </div>

      {(text || subtext) && (
        <div className="neevai-loader-text-group">
          {text && <span className="neevai-loader-text">{text}</span>}
          {subtext && <span className="neevai-loader-subtext">{subtext}</span>}
        </div>
      )}
    </div>
  );
};

export default Loader;
