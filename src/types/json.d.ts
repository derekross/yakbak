declare module "*.json" {
  const value: {
    name: string;
    version: string;
    [key: string]: unknown;
  };
  export default value;
}
