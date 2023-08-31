// whatsapp.controller.ts
import {
  Controller,
  Post,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  Get,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WhatsappService } from './whatsapp.service';
import { Response } from 'express';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
  ) { }

  @Post('messages/:fromNumber/:toNumber')
  @UseInterceptors(FileInterceptor('file'))
  public async sendMessage(
    @Param('toNumber') toNumber: string,
    @Param('fromNumber') fromNumber: string,
    @Body('text') text: string,
    @Body('referenceId') referenceId?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    console.log(referenceId);
    if (fromNumber === process.env.WHATSAPP_NUMBER) {
      if (file) {
        return this.whatsappService.sendFile({
          file: file.buffer,
          mime: file.mimetype,
          name: file.originalname,
          number: toNumber,
          caption: text,
          referenceId: referenceId
        });
      } else {
        return this.whatsappService.sendText(toNumber, text, referenceId);
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
