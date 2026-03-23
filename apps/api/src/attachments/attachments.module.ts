import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AttachmentsController } from "./attachments.controller";
import { AttachmentsService } from "./attachments.service";
import { DocumentExtractorService } from "./document-extractor.service";

@Module({
  imports: [ConfigModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, DocumentExtractorService],
  exports: [AttachmentsService, DocumentExtractorService],
})
export class AttachmentsModule {}
