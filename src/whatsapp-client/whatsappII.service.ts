import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import WAWebJS, { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom, retry } from 'rxjs';
import { config } from 'dotenv';
import { messageParser } from './utils/messageParser.util';
import { print } from './utils/consoleMessage.util.';
import { WhatsappService } from './whatsapp.service';

@Injectable()
export class WhatsappServiceII {
	private client: Client;

	constructor(
		private readonly httpService: HttpService,
		private readonly whatsappService: WhatsappService
	) {
		config();
		this.client = new Client({ authStrategy: new LocalAuth({ clientId: "client2" }) });

		const { REQUEST_URL, WHATSAPP_NUMBER } = process.env;
		const QR_URL = REQUEST_URL + '/wwebjs/qr/' + process.env.WHATSAPP_NUMBER_II;
		const READY_URL = REQUEST_URL + '/wwebjs/ready/' + process.env.WHATSAPP_NUMBER_II;
		const AUTH_URL = REQUEST_URL + '/wwebjs/auth/' + process.env.WHATSAPP_NUMBER_II;

		this.client.on('qr', (qr: string) => {
			console.log(this.whatsappService.isAuthenticated)
			if (this.whatsappService.isAuthenticated) {
				this.httpService.post(QR_URL, { qr })
					.pipe(
						retry(1), // Tentar novamente até 3 vezes em caso de falha
						catchError(error => {
							console.log("Erro ao enviar qr-code:", error.message);
							return ([]);
						})
					)
					.subscribe((res) => {
						console.log(`New qr code for: ${process.env.WHATSAPP_NUMBER_II}`);
					});
			}
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

			const messageDate = new Date(Number(`${message.timestamp}000`));
			const currentDate = new Date();
			const isMessageFromNow = (currentDate.getTime() - messageDate.getTime()) <= 300000;

			if (!messageChat.isGroup && isMessageFromNow) {
				const fromNumber = messageChat.id.user;
				const parsedMessage = await messageParser(message);

				const MESSAGE_URL =
					REQUEST_URL +
					`/wwebjs/receive_message/${WHATSAPP_NUMBER}/${fromNumber}`;

				try {
					this.httpService.post(MESSAGE_URL, parsedMessage)
						.pipe(
							retry(1),
							catchError(error => {
								console.log(error.status)
								console.log("Erro ao enviar mensagem para o backend:", error.response.data);
								return ([]);
							})
						)
						.subscribe((res) => {
							console.log(`Mensagem enviada ao backend com sucesso!`);
						});
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
