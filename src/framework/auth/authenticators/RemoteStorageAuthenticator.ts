import type { SolidUserProfile } from '@noeldemartin/solid-utils';
import Auth from '@/framework/core/facades/Auth';
import Authenticator from '@/framework/auth/Authenticator';
import type { AuthSession } from '@/framework/auth/Authenticator';

export default class RemoteStorageAuthenticator extends Authenticator {

    private activeWebId: string | null = null;

    public async login(): Promise<AuthSession> {
        window.ponderStorage.open();

        return new Promise(resolve => {
            const remove = this.addListener({ onSessionStarted: session => {
                remove();
                resolve(session);
            } });
        });
    }

    public async logout(): Promise<void> {
        window.ponderStorage.disconnect();
        this.activeWebId = null;
        await this.endSession();
    }

    protected async restoreSession(): Promise<void> {
        await this.initAuthenticatedFetch(window.ponderStorage.fetch);
        window.ponderStorage.onUser(user => this.updateUser(user));
        await this.updateUser(await window.ponderStorage.restore());
    }

    private async updateUser(user: SolidUserProfile | null): Promise<void> {
        if (user?.webId === this.activeWebId) return;
        const previous = this.activeWebId;
        this.activeWebId = user?.webId ?? null;
        if (user) await this.startSession({ user, loginUrl: user.webId });
        else if (previous) await Auth.logout(true);
        else await this.endSession();
    }

}
