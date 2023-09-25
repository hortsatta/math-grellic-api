import {
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

import { CoreService } from './core.service';

@WebSocketGateway()
export class CoreGateway implements OnGatewayInit {
  private clockInterval: any;
  @WebSocketServer() server: Server;

  constructor(private readonly coreService: CoreService) {}

  afterInit() {
    this.startClock();
  }

  @SubscribeMessage('clock')
  getClock() {
    return this.coreService.getDateTimeNow();
  }

  @SubscribeMessage('start-clock')
  startClock() {
    this.clockInterval = setInterval(() => {
      this.server.emit('tick', this.coreService.getDateTimeNow());
    }, 60000);
  }

  @SubscribeMessage('stop-clock')
  stopClock() {
    clearInterval(this.clockInterval);
  }
}
