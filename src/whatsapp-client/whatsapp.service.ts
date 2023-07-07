import { Injectable } from '@nestjs/common';
import { createReadStream, existsSync, promises } from 'fs';
import { join } from 'path';
import WAWebJS, { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { config } from 'dotenv';
import qrcode from 'qrcode-terminal';

@Injectable()
export class WhatsappService {
  private readonly client: Client;
  public readonly messages: Array<WAWebJS.Message> = [];

  constructor(private readonly httpService: HttpService) {
    const client = new Client({
      authStrategy: new LocalAuth(),
    });

    config();

    this.client = client;

    const { REQUEST_URL } = process.env;

    const INITIALIZE_URL = REQUEST_URL + '/wwebjs/init';
    const QR_URL = REQUEST_URL + '/wwebjs/qr';
    const READY_URL = REQUEST_URL + '/wwebjs/ready';

    const ObservableInitializeRequest = this.httpService.put(
      INITIALIZE_URL,
      {},
    );
    const PromiseInitializeResponse = firstValueFrom(
      ObservableInitializeRequest,
    );

    PromiseInitializeResponse.then((res) => console.log(res.data));

    this.client.on('qr', (qr: string) => {
      qrcode.generate(qr, { small: true });

      const ObservableQrCodeRequest = this.httpService.post(QR_URL, { qr });
      const PromiseQrCodeResponse = firstValueFrom(ObservableQrCodeRequest);

      PromiseQrCodeResponse.then((res) => console.log(res.data));
    });

    this.client.on('ready', () => {
      console.log('Client is ready!');

      const ObservableReadyRequest = this.httpService.put(READY_URL);
      const PromiseReadyResponse = firstValueFrom(ObservableReadyRequest);

      PromiseReadyResponse.then((res) => console.log(res.data));
    });

    this.client.on('message_create', async (message: WAWebJS.Message) => {
      const messageChat = await message.getChat();
      this.messages.push(message);

      if (!messageChat.isGroup) {
        const date = new Date(Number(`${message.timestamp}000`));
        const m_date = date.toLocaleDateString();
        const m_time = date.toLocaleTimeString().slice(0, 5);

        const fromNumber = messageChat.id.user;
        console.log(`${m_date} ${m_time} [+${fromNumber}]: `, message.body);

        const quotedMessage = await message.getQuotedMessage();
        const ID_REFERENCIA = quotedMessage && quotedMessage.id._serialized;
        const ID = message.id._serialized;
        const TIPO = message.type;
        const MENSAGEM = message.body;
        const TIMESTAMP = Number(`${message.timestamp}000`);
        const FROM_ME = message.fromMe;

        const requestData: any = {
          ID,
          ID_REFERENCIA,
          TIPO,
          MENSAGEM,
          TIMESTAMP,
          FROM_ME,
        };

        if (message.hasMedia) {
          const messageMedia = await message.downloadMedia();
          const mediaBuffer = Buffer.from(messageMedia.data, 'base64');
          const extractedExt = messageMedia.mimetype
            .split('/')[1]
            .split(';')[0];
          const ext = extractedExt === 'plain' ? 'text' : extractedExt;
          const ARQUIVO_NOME = `message_${message.id._serialized}_file.${ext}`;
          const ARQUIVO_NOME_ORIGINAL = messageMedia.filename || ARQUIVO_NOME;

          const filesPath = join(__dirname, '../../', 'files');
          const savePath = join(filesPath, ARQUIVO_NOME);

          await promises.writeFile(savePath, mediaBuffer);

          const succesfulWritedFile = existsSync(savePath);

          if (succesfulWritedFile) {
            const ARQUIVO_TIPO = messageMedia.mimetype;
            requestData.ARQUIVO = { NOME: ARQUIVO_NOME, TIPO: ARQUIVO_TIPO };

            if (ARQUIVO_NOME_ORIGINAL) {
              requestData.ARQUIVO = {
                ...requestData.ARQUIVO,
                NOME_ORIGINAL: ARQUIVO_NOME_ORIGINAL,
              };
            }
          }
        }

        const MESSAGE_URL =
          REQUEST_URL + `/wwebjs/messages/receive/${fromNumber}`;

        try {
          this.httpService.post(MESSAGE_URL, requestData);
        } catch (err) {
          console.log('Erro ao tentar enviar mensagem para o inpulse.');
          console.log(MESSAGE_URL, requestData);
        }
      }
    });

    this.client.initialize();
  }

  public async sendText(number: string, text: string) {
    try {
      const chatId = number.substring(1) + '@c.us';
      await this.client.sendMessage(chatId, text);

      return { success: true, message: 'Message sent' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  public async sendFile(
    number: string,
    file: Buffer,
    mime: string,
    name: string,
  ) {
    try {
      const chatId = number.substring(1) + '@c.us';

      const media = new MessageMedia(mime, file.toString('base64'), name);
      await this.client.sendMessage(chatId, media);

      return { success: true, message: 'Message sent' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  public async getAllNumberMessages(number: string) {
    const contacts = await this.client.getContacts();
    console.log('contacts: ', contacts);

    const chatById = await this.client.getChatById(`${number}@c.us`);
    console.log('chatById: ', chatById);
  }

  public getFile(fileName: string) {
    const filesPath = join(__dirname, '../../', 'files');
    const searchPath = join(filesPath, fileName);
    const doFileExists = existsSync(searchPath);

    if (doFileExists) {
      const readStream = createReadStream(searchPath);

      return readStream;
    }
  }
}
