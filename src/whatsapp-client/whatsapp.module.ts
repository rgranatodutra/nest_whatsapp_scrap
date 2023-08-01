import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { HttpModule } from '@nestjs/axios';
import { WhatsappServiceII } from './whatsappII.service';

@Module({
	controllers: [
		WhatsappController
	],
	providers: [
		WhatsappService,
		WhatsappServiceII,
	],
	imports: [
		HttpModule
	],
})
export class WhatsappModule { };
