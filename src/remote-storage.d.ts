import type { SolidUserProfile } from '@noeldemartin/solid-utils';
declare global {
    interface Window {
        ponderStorage: {
            fetch: typeof fetch;
            api: {
                root: string;
                getPublicURL(url: string): Promise<string | undefined>;
                publish(url: string, related?: string[]): Promise<string>;
                unpublish(url: string): Promise<void>;
            };
            open(): void;
            disconnect(): void;
            restore(): Promise<SolidUserProfile | null>;
            onUser(callback: (user: SolidUserProfile | null) => void): () => void;
        };
    }
}
