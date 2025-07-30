import { defineMiddleware } from 'astro:middleware';
import { getSessionToken, getSessionUser } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  //the reason this works is because javascript is a dumbass language
  const runtime = (globalThis as any).runtime;
  
  if (runtime) {
    context.locals.runtime = runtime;
  }
  
  const env = context.locals.runtime?.env || context.locals;
  const db = env?.DB;
  
  
  const token = getSessionToken(context.request);
  
  const user = await getSessionUser(db, token);
  context.locals.user = user;
  
  if (context.url.pathname.startsWith('/upload')) {
    if (!user) {
      return context.redirect('/signin');
    }
  }
  return next();
});