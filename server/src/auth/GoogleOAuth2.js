import { OAuth2Client } from "google-auth-library";

class GoogleOAuth2 {
    #clientId = "";
    #client = null;

    constructor(clientId) {
        this.#clientId = clientId;
        this.#client = new OAuth2Client(clientId);
    }

    get clientId() {
        return this.#clientId;
    }

    async verify(token) {
        try {
            const ticket = await this.#client.verifyIdToken({
                idToken: token,
                requiredAudience: this.#clientId,
            });
            const payload = ticket.getPayload();
            const {
                sub: id,
                hd: domain,
                email,
                name,
                picture: photo,
            } = payload;
            return {
                id,
                domain,
                email,
                name,
                photo,
            };
        } catch (err) {
            console.warn(err);
            return null;
        }
    }
}

export default GoogleOAuth2;
