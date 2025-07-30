/// <reference path="../.astro/types.d.ts" />

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

declare namespace App {
  interface Locals {
    user?: User;
    runtime: {
      env: {
        AUTH_GOOGLE_ID: string;
        AUTH_GOOGLE_SECRET: string;
        AUTH_SECRET: string;
        DB: D1Database;
        R2: R2Bucket;
      };
    };
  }
}