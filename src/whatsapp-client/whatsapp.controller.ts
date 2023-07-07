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
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('messages/:number')
  @UseInterceptors(FileInterceptor('file'))
  public async sendMessage(
    @Param('number') number: string,
    @Body('text') text: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      return this.whatsappService.sendFile(
        number,
        file.buffer,
        file.mimetype,
        file.originalname,
      );
    } else {
      return this.whatsappService.sendText(number, text);
    }
  }

  @Get()
  public async getAllMessages() {
    return this.whatsappService.messages;
  }

  @Get('messages/:number')
  public async getAllMessagesFromNumber(@Param('number') number: string) {
    return await this.whatsappService.getAllNumberMessages(number);
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
