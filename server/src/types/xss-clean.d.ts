declare module 'xss-clean' {
  const middleware: (options?: any) => (req: any, res: any, next: any) => void;
  export = middleware;
}
