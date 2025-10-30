declare module "bcryptjs" {
  interface HashOptions { rounds?: number; }
  export function hash(data: string, rounds?: number): Promise<string>;
  export function hashSync(data: string, rounds?: number): string;
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function compareSync(data: string, encrypted: string): boolean;
  const _default: {
    hash: typeof hash;
    hashSync: typeof hashSync;
    compare: typeof compare;
    compareSync: typeof compareSync;
  };
  export default _default;
}
