declare module 'xss-clean' {
  const xssClean: () => (req: any, res: any, next: any) => void;
  export = xssClean;
}
