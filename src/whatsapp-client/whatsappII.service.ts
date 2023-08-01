import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import WAWebJS, { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { config } from 'dotenv';
import { messageParser } from './utils/messageParser.util';
import { print } from './utils/consoleMessage.util.';

@Injectable()
export class WhatsappServiceII {
	private client: Client;

	constructor(
		private readonly httpService: HttpService
	) {
		config();
		this.client = new Client({ authStrategy: new LocalAuth({ clientId: "client2" }) });

		const { REQUEST_URL, WHATSAPP_NUMBER } = process.env;
		const INITIALIZE_URL = REQUEST_URL + '/wwebjs/init/' + process.env.WHATSAPP_NUMBER_II;
		const QR_URL = REQUEST_URL + '/wwebjs/qr/' + process.env.WHATSAPP_NUMBER_II;
		const READY_URL = REQUEST_URL + '/wwebjs/ready/' + process.env.WHATSAPP_NUMBER_II;
		const AUTH_URL = REQUEST_URL + '/wwebjs/auth/' + process.env.WHATSAPP_NUMBER_II;

		const ObservableInitializeRequest = this.httpService.put(INITIALIZE_URL, {});
		const PromiseInitializeResponse = firstValueFrom(ObservableInitializeRequest);

		PromiseInitializeResponse
			.then((res) => console.log(res.data))

		this.client.on('qr', (qr: string) => {
			const ObservableQrCodeRequest = this.httpService.post(QR_URL, { qr });
			const PromiseQrCodeResponse = firstValueFrom(ObservableQrCodeRequest);

			PromiseQrCodeResponse.then((res) => console.log(`New qr code for: ${process.env.WHATSAPP_NUMBER_II}`));
		});

		this.client.on('authenticated', () => {
			const ObservableQrCodeRequest = this.httpService.post(AUTH_URL, {});
			const PromiseQrCodeResponse = firstValueFrom(ObservableQrCodeRequest);

			PromiseQrCodeResponse.then((res) => console.log(res.data));
		});

		this.client.on('ready', () => {
			const ObservableReadyRequest = this.httpService.put(READY_URL);
			const PromiseReadyResponse = firstValueFrom(ObservableReadyRequest);

			PromiseReadyResponse.then((res) => console.log(res.data));
		});

		this.client.on('message', async (message: WAWebJS.Message) => {
			const messageChat = await message.getChat();
			print(message);

			const messageDate = new Date(`${message.timestamp}000`);
			const currentDate = new Date();
			const isMessageFromNow = currentDate.getTime() - messageDate.getTime();

			if (!messageChat.isGroup && isMessageFromNow) {
				console.log('Não é de grupo');
				const fromNumber = messageChat.id.user;
				const parsedMessage = await messageParser(message);

				const MESSAGE_URL =
					REQUEST_URL +
					`/wwebjs/messages/receive/${WHATSAPP_NUMBER}/${fromNumber}`;

				console.log(MESSAGE_URL);

				try {
					const observable = this.httpService.post(MESSAGE_URL, parsedMessage);
					await firstValueFrom(observable);
				} catch (err) {
					console.log('Erro ao tentar enviar mensagem para o inpulse.');
					console.log(MESSAGE_URL, parsedMessage);
				};
			};
		});

		this.client.initialize();
	};

	public async sendText(number: string, text: string) {
		try {
			const chatId = number + '@c.us';
			const sentMessage = await this.client.sendMessage(chatId, text);
			const parsedMessage = messageParser(sentMessage);
			return parsedMessage;
		} catch (error) {
			throw new InternalServerErrorException('Falha ao enviar mensagem', {
				cause: error,
			});
		};
	};

	public async sendFile(
		number: string,
		file: Buffer,
		mime: string,
		name: string,
	) {
		try {
			const chatId = number + '@c.us';

			const media = new MessageMedia(mime, file.toString('base64'), name);
			const sentMessage = await this.client.sendMessage(chatId, media);
			const parsedMessage = messageParser(sentMessage);

			return parsedMessage;
		} catch (error) {
			throw new InternalServerErrorException('Falha ao enviar mensagem', {
				cause: error,
			});
		};
	};

	public getFile(fileName: string) {
		const filesPath = join(__dirname, '../../', 'files');
		const searchPath = join(filesPath, fileName);
		const doFileExists = existsSync(searchPath);

		if (doFileExists) {
			const readStream = createReadStream(searchPath);
			return readStream;
		};
	};
};
