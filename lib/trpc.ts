import { createTRPCReact } from '@trpc/react-query';
import { httpLink } from '@trpc/client';
import type { AppRouter } from '@/backend/trpc/app-router';
import { SERVER_URL } from '@/lib/config';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${SERVER_URL}/api/trpc`,
    }),
  ],
});
