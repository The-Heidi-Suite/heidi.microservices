import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KielNewsletterService } from './kiel-newsletter.service';

@Module({
  imports: [HttpModule],
  providers: [KielNewsletterService],
  exports: [KielNewsletterService],
})
export class KielNewsletterModule {}
