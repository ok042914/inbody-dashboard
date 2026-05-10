import type { NextConfig } from "next";
import { execSync } from "child_process";

function getBuildNumber(): string {
  try {
    return execSync("git rev-list --count HEAD", { encoding: "utf8" }).trim();
  } catch {
    return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "0";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_NUMBER: getBuildNumber(),
  },
};

export default nextConfig;
