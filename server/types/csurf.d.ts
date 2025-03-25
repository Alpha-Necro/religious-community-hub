declare module 'csurf' {
  interface CsrfOptions {
    cookie?: {
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'strict' | 'lax' | 'none';
    };
  }

  const csurf: (options?: CsrfOptions) => (req: any, res: any, next: any) => void;
  export = csurf;
}
