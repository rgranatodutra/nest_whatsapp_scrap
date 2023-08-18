export type MessageStatus =
  | 'PENDING'
  | 'SENT'
  | 'RECEIVED'
  | 'READ'
  | 'DELETED'
  | 'ERROR';

export class ReceiveMessageDto {
  TIPO: string;
  MENSAGEM?: string;
  FROM_ME: boolean;
  DATA_HORA: Date;
  TIMESTAMP: number;
  ID: string;
  ID_REFERENCIA?: string | null;
  STATUS: MessageStatus;
}

export class ReceiveMessageFileDto {
  TIPO: string;
  NOME_ARQUIVO?: string;
  NOME_ORIGINAL?: string;
  ARMAZENAMENTO: 'local' | 'meta' | 'outros';
  LINK_EXTERNO?: string;
}

export class ParsedMessage extends ReceiveMessageDto {
  ARQUIVO: ReceiveMessageFileDto | null;
}

export class CustomFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}