# Add RabbitMQ Pattern

## Description
Add a new RabbitMQ message pattern for inter-service communication.

## Steps

1. **Add pattern to constants:**
   ```typescript
   // libs/rabbitmq/src/rmq.constants.ts
   export const RabbitMQPatterns = {
     // ... existing patterns
     NEW_SERVICE_NEW_ACTION: 'newService.newAction',
   } as const;
   ```

2. **Determine pattern type:**
   - **Request-Response** (synchronous): Use `send()` with timeout
   - **Fire-and-Forget** (asynchronous): Use `emit()`

3. **Naming convention:**
   - Format: `<service>.<action>`
   - Service: lowercase (e.g., `user`, `core`, `notification`)
   - Action: camelCase (e.g., `findByEmail`, `getUserAssignments`, `created`)

4. **Implement handler (if request-response):**
   ```typescript
   // In target service message controller
   import { Controller } from '@nestjs/microservices';
   import { MessagePattern, Payload } from '@nestjs/microservices';
   import { RabbitMQPatterns } from '@heidi/rabbitmq';

   @Controller()
   export class ServiceMessageController {
     constructor(private readonly service: ServiceService) {}

     @MessagePattern(RabbitMQPatterns.NEW_SERVICE_NEW_ACTION)
     async handleNewAction(@Payload() data: NewActionRequest) {
       return this.service.newAction(data);
     }
   }
   ```

5. **Implement event listener (if fire-and-forget):**
   ```typescript
   // In target service message controller
   import { EventPattern, Payload } from '@nestjs/microservices';

   @Controller()
   export class ServiceMessageController {
     @EventPattern(RabbitMQPatterns.NEW_SERVICE_NEW_ACTION)
     async handleNewAction(@Payload() data: NewActionEvent) {
       try {
         await this.service.handleAction(data);
       } catch (error) {
         // Log but don't throw - events are fire-and-forget
         this.logger.error('Failed to handle action', error);
       }
     }
   }
   ```

6. **Use in calling service:**
   ```typescript
   // Request-Response
   import { firstValueFrom, timeout } from 'rxjs';
   import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';

   @Injectable()
   export class CallingService {
     constructor(@Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper) {}

     async callOtherService(data: RequestData) {
       try {
         const result = await firstValueFrom(
           this.client
             .send(RabbitMQPatterns.NEW_SERVICE_NEW_ACTION, data)
             .pipe(timeout(10000)), // Always set timeout
         );
         return result;
       } catch (error) {
         if (error.name === 'TimeoutError') {
           this.logger.error('Request timed out', { pattern: RabbitMQPatterns.NEW_SERVICE_NEW_ACTION });
           throw new ServiceUnavailableException('Service unavailable');
         }
         throw error;
       }
     }
   }
   ```

   ```typescript
   // Fire-and-Forget
   this.client.emit(RabbitMQPatterns.NEW_SERVICE_NEW_ACTION, {
     // event data
     timestamp: new Date().toISOString(),
   });
   ```

## Pattern Types

### Request-Response Patterns
- Use for operations that need a response
- Always set timeout (default: 10 seconds)
- Handle timeout errors gracefully
- Examples: `USER_FIND_BY_ID`, `CORE_GET_USER_ASSIGNMENTS`

### Fire-and-Forget Events
- Use for asynchronous operations
- Don't expect a response
- Handle errors gracefully (log, don't throw)
- Examples: `USER_CREATED`, `NOTIFICATION_SEND`

## Timeout Guidelines
- Default: 10 seconds
- Quick operations: 5 seconds
- Complex operations: 30 seconds
- Always use `timeout()` operator from RxJS

## Error Handling
- Request-Response: Convert to appropriate HTTP exceptions
- Fire-and-Forget: Log errors but don't throw
- Always log with context (pattern name, payload)

## Message Contracts
- Define clear request/response types
- Include version for future compatibility
- Document in code comments
