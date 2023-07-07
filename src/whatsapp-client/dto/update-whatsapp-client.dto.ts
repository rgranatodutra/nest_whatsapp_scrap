import { PartialType } from '@nestjs/mapped-types';
import { CreateWhatsappClientDto } from './create-whatsapp-client.dto';

export class UpdateWhatsappClientDto extends PartialType(CreateWhatsappClientDto) {}
