// whatsapp.controller.ts
import {
	Controller,
	Post,
	Body,
	Param,
	UseInterceptors,
	Get,
	Res,
	UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { WhatsappService } from './whatsapp.service';
import { Response } from 'express';
import { CustomFile } from './interfaces/messages.interfaces';

@Controller('whatsapp')
export class WhatsappController {
	constructor(
		private readonly whatsappService: WhatsappService,
	) { }

	@Post('messages/:fromNumber/:toNumber')
	@UseInterceptors(FileFieldsInterceptor([{ name: 'file', maxCount: 1 }]))
	public async sendMessage(
		@Param('toNumber') toNumber: string,
		@Param('fromNumber') fromNumber: string,
		@Body('text') text: string,
		@Body('file') customFile: CustomFile,
		@UploadedFiles() files: { file: Express.Multer.File[] }
	) {
		console.log("message: ", text);
		console.log("file: ", files);
		if (fromNumber === process.env.WHATSAPP_NUMBER) {
			if (files?.file && files.file[0]) {
				console.log("sent as file")
				console.log(files.file[0].buffer)
				console.log(typeof files.file[0].buffer)
				return this.whatsappService.sendFile(
					toNumber,
					files.file[0].buffer,
					files.file[0].mimetype,
					files.file[0].originalname,
				);
			} else {
				console.log("sent as text")
				return this.whatsappService.sendText(toNumber, text);
			}
		}
	}

	@Get('files/:fileName')
	public async getFileByName(
		@Res() response: Response,
		@Param('fileName') filename: string,
	) {
		const readStream = this.whatsappService.getFile(filename);
		readStream.pipe(response);

		readStream.on('end', () => readStream.close());

		return;
	}
}
