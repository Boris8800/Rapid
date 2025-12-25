import { AppService } from './app.service';

describe('AppService', () => {
  it('ping returns pong', () => {
    const service = new AppService();
    expect(service.ping()).toBe('pong');
  });
});
