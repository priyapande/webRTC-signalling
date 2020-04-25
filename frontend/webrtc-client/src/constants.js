const host = window.location.host;
const protocol = window.location.protocol;
export const conn = new WebSocket(("https:" === protocol ? "wss://" + host : "ws://localhost:8080") + "/socket");
export const MESSAGE = "MESSAGE";
export const INIT = "INIT";
export const PEER_CONNECTED = "PEER.CONNECTED";
export const payloadType = {
    OFFER: "offer",
    ANSWER: "answer",
    CANDIDATE: "candidate"
}