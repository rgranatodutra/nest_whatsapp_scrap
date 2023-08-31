import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import WAWebJS, { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError, retry } from 'rxjs';
import { config } from 'dotenv';
import { messageParser } from './utils/messageParser.util';
import { formatToOpusAudio } from './utils/formatToOpusAudio.util';

interface sendFileProps {
	number: string,
	file: Buffer,
	mime: string,
	name: string,
	caption?: string
	referenceId?: string
}

@Injectable()
export class WhatsappService {
	private client: Client;
	public isAuthenticated: boolean = false;

	constructor(
		private readonly httpService: HttpService
	) {
		config();
		this.client = new Client({ authStrategy: new LocalAuth({ clientId: "client1" }) });

		const { REQUEST_URL, WHATSAPP_NUMBER } = process.env;
		const INITIALIZE_URL = REQUEST_URL + '/wwebjs/init/' + process.env.WHATSAPP_NUMBER;
		const QR_URL = REQUEST_URL + '/wwebjs/qr/' + process.env.WHATSAPP_NUMBER;
		const READY_URL = REQUEST_URL + '/wwebjs/ready/' + process.env.WHATSAPP_NUMBER;
		const AUTH_URL = REQUEST_URL + '/wwebjs/auth/' + process.env.WHATSAPP_NUMBER;

		this.httpService.post(INITIALIZE_URL, {})
			.pipe(
				retry(2), // Tentar novamente até 3 vezes em caso de falha
				catchError(error => {
					console.log("Erro ao enviar qr-code:", error.message);
					return ([]);
				})
			)
			.subscribe((res) => {
				console.log(res.data);
			});

		this.client.on('qr', (qr: string) => {
			this.httpService.post(QR_URL, { qr })
				.pipe(
					retry(1), // Tentar novamente até 3 vezes em caso de falha
					catchError(error => {
						console.log("Erro ao enviar qr-code:", error.message);
						return ([]);
					})
				)
				.subscribe((res) => {
					console.log(`New qr code for: ${process.env.WHATSAPP_NUMBER}`);
				});
		});

		this.client.on('authenticated', () => {
			const ObservableQrCodeRequest = this.httpService.post(AUTH_URL, {});
			const PromiseQrCodeResponse = firstValueFrom(ObservableQrCodeRequest);

			PromiseQrCodeResponse.then((res) => console.log(res.data));
			this.isAuthenticated = true;
		});

		this.client.on('ready', () => {
			const ObservableReadyRequest = this.httpService.put(READY_URL);
			const PromiseReadyResponse = firstValueFrom(ObservableReadyRequest);

			PromiseReadyResponse.then((res) => {
				this.isAuthenticated = true;
			});

			console.log("ready")
		});

		this.client.on('message', async (message: WAWebJS.Message) => {
			const messageChat = await message.getChat();

			const messageDate = new Date(Number(`${message.timestamp}000`));
			const currentDate = new Date();
			const isMessageFromNow = (currentDate.getTime() - messageDate.getTime()) <= 300000;
			const fromNumber = messageChat.id.user;

			// Adiciona os numeros que você quer incluir nos testes
			// Remova a WhiteList para implementar no cliente
			/* - */const whiteList = ["558391466064"];
			/* - */const isMessageOnWhitelist = whiteList.includes(fromNumber);

			if (!messageChat.isGroup && isMessageFromNow && !message.isStatus /* - */ && isMessageOnWhitelist) {

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

		this.client.on("message_ack", (data) => {
			const UPDATE_MESSAGE_URL = REQUEST_URL + `/wwebjs/update_message/${data.id._serialized}`;

			const ackStrings = {
				1: "PENDING",
				2: "RECEIVED",
				3: "READ",
				4: "4",
				5: "5"
			};

			this.httpService.put(UPDATE_MESSAGE_URL, { status: ackStrings[data.ack] })
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
		});

		this.client.initialize();
	};

	public async sendText(number: string, text: string, referenceId?: string) {
		try {
			const chatId = number + '@c.us';

			const sentMessage = await this.client.sendMessage(chatId, text, {
				quotedMessageId: referenceId
			});

			console.log(sentMessage);

			const parsedMessage = messageParser(sentMessage);
			return parsedMessage;
		} catch (error) {
			console.error(error);
			throw new InternalServerErrorException('Falha ao enviar mensagem', {
				cause: error,
			});
		};
	};

	public async sendFile(props: sendFileProps) {
		try {
			const chatId = props.number.replace(/\D+/g, '') + '@c.us';

			if (props.mime.includes("audio")) {
				props.file = await formatToOpusAudio(props.file)
			};

			const media = new MessageMedia(props.mime, props.file.toString('base64'), props.name);
			const sentMessage = await this.client.sendMessage(chatId, media);

			const parsedMessage = messageParser(sentMessage);

			return parsedMessage;
		} catch (error) {
			console.error(error);
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
