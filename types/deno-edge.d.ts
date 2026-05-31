declare module "https://deno.land/std@0.224.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void
}

declare const Deno: {
  env: {
    get(name: string): string | undefined
  }
}
