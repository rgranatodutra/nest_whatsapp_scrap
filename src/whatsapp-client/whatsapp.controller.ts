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
    @UploadedFile() file?: Express.Multer.File,
  ) {
    console.log(fromNumber, process.env.WHATSAPP_NUMBER);
    if (fromNumber === process.env.WHATSAPP_NUMBER) {
      if (file) {
        return this.whatsappService.sendFile(
          toNumber,
          file.buffer,
          file.mimetype,
          file.originalname,
        );
      } else {
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
