import WAWebJS from 'whatsapp-web.js';
import {
  MessageStatus,
  ParsedMessage,
  ReceiveMessageDto,
  ReceiveMessageFileDto,
} from '../interfaces/messages.interfaces';
import { join } from 'path';
import { existsSync, promises } from 'fs';

export async function messageParser(
  message: WAWebJS.Message,
): Promise<ParsedMessage> {
  const quotedMessage = await message.getQuotedMessage();
  const ID_REFERENCIA = quotedMessage && quotedMessage.id._serialized;
  const ID = message.id._serialized;
  const TIPO = message.type;
  const MENSAGEM = message.body;
  const TIMESTAMP = Number(`${message.timestamp}000`);
  const FROM_ME = message.fromMe;

  let STATUS: MessageStatus = 'SENT';
  switch (message.ack) {
    case -1:
      STATUS = 'ERROR';
      break;
    case 2:
      STATUS = 'RECEIVED';
      break;
    case 3:
      STATUS = 'READ';
      break;
    default:
      STATUS = 'PENDING';
      break;
  }

  const serializedMessage: ReceiveMessageDto = {
    ID,
    ID_REFERENCIA,
    TIPO,
    MENSAGEM,
    TIMESTAMP,
    FROM_ME,
    DATA_HORA: new Date(TIMESTAMP),
    STATUS,
  };

  if (message.hasMedia) {
    const messageMedia = await message.downloadMedia();
    const mediaBuffer = Buffer.from(messageMedia.data, 'base64');
    const extractedExt = messageMedia.mimetype.split('/')[1].split(';')[0];
    const ext = extractedExt === 'plain' ? 'text' : extractedExt;
    const ARQUIVO_NOME = `message_${message.id._serialized}_file.${ext}`;
    const ARQUIVO_NOME_ORIGINAL = messageMedia.filename || ARQUIVO_NOME;

    const filesPath = join(__dirname, '../../../', 'files');
    const savePath = join(filesPath, ARQUIVO_NOME);

    await promises.writeFile(savePath, mediaBuffer);

    const succesfulWritedFile = existsSync(savePath);

    if (succesfulWritedFile) {
      const ARQUIVO_TIPO = messageMedia.mimetype;
      const serializedFile: ReceiveMessageFileDto = {
        NOME_ARQUIVO: ARQUIVO_NOME,
        TIPO: ARQUIVO_TIPO,
        NOME_ORIGINAL: ARQUIVO_NOME_ORIGINAL,
        ARMAZENAMENTO: 'outros',
      };

      const parsedMessage: ParsedMessage = {
        ...serializedMessage,
        ARQUIVO: serializedFile,
      };

      return parsedMessage;
    }
  }

  return { ...serializedMessage, ARQUIVO: null };
}
