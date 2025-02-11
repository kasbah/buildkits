import jwtDecode from "jwt-decode";
import { ConnectionDetails, HathoraConnection } from "./connection";

export type LobbyInfo = {
  roomId: string;
  region: string;
  createdBy: string;
  createdAt: Date;
};

export type StartingConnectionInfo = { status: "starting" };
export type ActiveConnectionInfo = ConnectionDetails & {
  status: "active";
};
export type ConnectionInfo = StartingConnectionInfo | ActiveConnectionInfo;

export class HathoraClient {
  public static getUserFromToken(token: string): object & { id: string } {
    return jwtDecode(token);
  }

  public constructor(private appId: string, private localConnectionDetails?: ConnectionDetails) {}

  public async loginAnonymous(): Promise<string> {
    const res = await this.postJson(`https://api.hathora.dev/auth/v1/${this.appId}/login/anonymous`, {});
    return res.token;
  }

  public async loginNickname(nickname: string): Promise<string> {
    const res = await this.postJson(`https://api.hathora.dev/auth/v1/${this.appId}/login/nickname`, { nickname });
    return res.token;
  }

  public async loginGoogle(idToken: string): Promise<string> {
    const res = await this.postJson(`https://api.hathora.dev/auth/v1/${this.appId}/login/google`, { idToken });
    return res.token;
  }

  public async createPrivateLobby(token: string): Promise<string> {
    return await this.postJson(
      `https://api.hathora.dev/lobby/v1/${this.appId}/create/private?local=${
        this.localConnectionDetails === undefined ? "false" : "true"
      }`,
      {},
      { Authorization: token }
    );
  }

  public async createPublicLobby(token: string): Promise<string> {
    return await this.postJson(
      `https://api.hathora.dev/lobby/v1/${this.appId}/create/public?local=${
        this.localConnectionDetails === undefined ? "false" : "true"
      }`,
      {},
      { Authorization: token }
    );
  }

  public async getPublicLobbies(token: string, region?: string): Promise<LobbyInfo[]> {
    const regionParam = region === undefined ? "" : `region=${region}&`;
    const res = await fetch(
      `https://api.hathora.dev/lobby/v1/${this.appId}/list?${regionParam}local=${
        this.localConnectionDetails === undefined ? "false" : "true"
      }`,
      { headers: { Authorization: token } }
    );
    return await res.json();
  }

  public async getConnectionDetailsForRoomId(roomId: string): Promise<ConnectionDetails> {
    if (this.localConnectionDetails !== undefined) {
      return this.localConnectionDetails;
    }
    const res = await fetch(`https://api.hathora.dev/rooms/v1/${this.appId}/connectioninfo/${roomId}`);
    const connectionInfo: ConnectionInfo = await res.json();
    if (connectionInfo.status === "starting") {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(this.getConnectionDetailsForRoomId(roomId));
        }, 1000);
      });
    }
    return connectionInfo;
  }

  public async newConnection(roomId: string): Promise<HathoraConnection> {
    const connectionDetails = await this.getConnectionDetailsForRoomId(roomId);
    return new HathoraConnection(roomId, connectionDetails);
  }

  private async postJson(url: string, body: any, headers: Record<string, string> = {}) {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  }
}
