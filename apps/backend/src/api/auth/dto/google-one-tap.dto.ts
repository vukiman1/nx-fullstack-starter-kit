import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleOneTapDto {
  @IsString()
  @IsNotEmpty()
  credential!: string;
}
