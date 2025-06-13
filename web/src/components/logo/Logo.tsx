"use client";

import { useContext } from "react";
import { SettingsContext } from "../settings/SettingsProvider";
import { OnyxIcon, OnyxLogoTypeIcon } from "../icons/icons";

export function Logo({
  height,
  width,
  className,
  size = "default",
}: {
  height?: number;
  width?: number;
  className?: string;
  size?: "small" | "default" | "large";
}) {
  const settings = useContext(SettingsContext);

  const sizeMap = {
    small: { height: 24, width: 22 },
    default: { height: 32, width: 30 },
    large: { height: 48, width: 45 },
  };

  const { height: defaultHeight, width: defaultWidth } = sizeMap[size];
  height = height || defaultHeight;
  width = width || defaultWidth;

  // TEMPORARY CHANGE FOR DEBUGGING: Force this block to execute
  if (true) {
    return (
      <div style={{ height, width }} className={className}>
        {/* Original OnyxIcon replaced with custom image */}
        <img
          src="/Logo_TLNDR_Neg_RGB.png"
          alt="Onyx Logo"
          style={{ objectFit: "contain", height, width }}
          // Retaining className for potential layout styling from parent
          className={`${className}`}
        />
      </div>
    );
  }

  return (
    <div
      style={{ height, width }}
      className={`flex-none relative ${className}`}
    >
      {/* TODO: figure out how to use Next Image here */}
      <img
        src="/api/enterprise-settings/logo"
        alt="Logo"
        style={{ objectFit: "contain", height, width }}
      />
    </div>
  );
}

export function LogoType({
  size = "default",
}: {
  size?: "small" | "default" | "large";
}) {
  // TEMPORARY CHANGE FOR DEBUGGING
  return (
    <img
      src="/Logo_T_Neg_RGB.png"
      alt="Custom LogoType"
      style={{ height: "40px", width: "auto" }} // Adjust size as needed for a logotype
    />
  );
  // Original return:
  // return (
  //   <OnyxLogoTypeIcon
  //     size={115}
  //     className={`items-center w-full dark:text-[#fff]`}
  //   />
  // );
}
