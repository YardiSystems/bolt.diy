import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { loadFilesFromUrls, type UrlFileLoadConfig } from '~/utils/fileUtils';
import { useLoaderData } from '@remix-run/react';

export const meta: MetaFunction = () => {
  return [{ title: 'Bolt' }, { name: 'description', content: 'Talk with Bolt, an AI assistant from StackBlitz' }];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const files = url.searchParams.get('files')?.split(',').filter(Boolean);
  const fileLoadRoot = process.env.FILELOADROOT;

  if (fileLoadRoot && files?.length) {
    const config: UrlFileLoadConfig = {
      fileLoadRoot,
      files,
    };

    try {
      const loadedFiles = await loadFilesFromUrls(config);
      return json({ loadedFiles });
    } catch (error) {
      console.error('Error loading files:', error);
      return json({ error: 'Failed to load files', loadedFiles: null });
    }
  }

  return json({ loadedFiles: null });
};

/**
 * Landing page component for Bolt
 * Note: Settings functionality should ONLY be accessed through the sidebar menu.
 * Do not add settings button/panel to this landing page as it was intentionally removed
 * to keep the UI clean and consistent with the design system.
 */
export default function Index() {
  const { loadedFiles } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <Header />
      <ClientOnly fallback={<BaseChat />}>
        {() => <Chat initialLoadedFiles={loadedFiles} />}
      </ClientOnly>
    </div>
  );
}
