import packageJson from "../../package.json";

export const VERSION = packageJson.version;

export function getVersion(): string {
  return VERSION;
}
