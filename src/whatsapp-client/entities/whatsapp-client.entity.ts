export class Message {
    chatId: string;
    text: string;
    referenceId?: string | null;
    type: MessageType;
    file?: File | null;
}

export type MessageType = "chat" | "media" | "audio";

export interface File {
    name: string;
    type: string;
    buffer: ArrayBuffer;
}