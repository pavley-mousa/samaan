import { IsUUID } from 'class-validator';

export class ChoosePickupSlotDto {
  @IsUUID()
  pickupSlotId!: string;
}
