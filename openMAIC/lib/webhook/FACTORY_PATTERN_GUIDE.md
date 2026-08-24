# Webhook Event Handler Factory Pattern

## Overview

The webhook system now uses the **Factory Pattern** to make adding new event types trivial without modifying the route handler.

**Before (hardcoded):**
```typescript
// In route.ts - hardcoded event type check
if (event.type !== 'checkout.session.completed') {
  return NextResponse.json({ success: true });
}
// ... hardcoded processor creation
```

**After (factory pattern):**
```typescript
// In route.ts - factory routes automatically
const handler = webhookFactory.getHandler(event);
if (!handler) {
  return NextResponse.json({ success: true });
}
const result = await handler.handle(event);
```

## Architecture

### Core Files

1. **`lib/webhook/types/webhook-event-handler.ts`**
   - `WebhookEventHandler` interface
   - `WebhookProcessingResult` interface
   - All handlers must implement this interface

2. **`lib/webhook/event-handler-factory.ts`**
   - `WebhookEventHandlerFactory` class
   - Manages registration and routing of handlers
   - Singleton pattern for efficient initialization

3. **`lib/webhook/handlers/checkout-session-handler.ts`**
   - `CheckoutSessionCompletedHandler` implementation
   - Handles `checkout.session.completed` events
   - Delegates business logic to `StripeWebhookProcessor`

4. **`app/api/quiz/stripe/webhook/route.ts`**
   - Main webhook endpoint
   - Security checks (signature, rate limiting)
   - Routes events through factory

### Data Flow

```
Stripe Webhook Request
         ↓
  Signature Validation
         ↓
  Rate Limiting Check
         ↓
  Factory.getHandler(event)
         ↓
    ┌────┴────┐
    ↓         ↓
 Handler   No Handler
   ↓         ↓
handle()  Acknowledge
   ↓       (200 OK)
 Result
   ↓
HTTP Response
```

## Adding a New Event Type

### Step 1: Create Handler Class

Create a new handler file: `lib/webhook/handlers/your-event-handler.ts`

```typescript
import Stripe from 'stripe';
import { WebhookEventHandler, WebhookProcessingResult } from '../types/webhook-event-handler';
import { SupabaseClient } from '@supabase/supabase-js';

interface Logger {
  error: (msg: string, ctx?: Record<string, unknown>) => void;
  info: (msg: string, ctx?: Record<string, unknown>) => void;
  warn: (msg: string, ctx?: Record<string, unknown>) => void;
  debug: (msg: string, ctx?: Record<string, unknown>) => void;
}

/**
 * YourEventHandler
 *
 * Handles [your.event.type] events from Stripe.
 * Process your specific business logic here.
 *
 * @example
 * const handler = new YourEventHandler(supabase, logger);
 * if (handler.canHandle(event)) {
 *   const result = await handler.handle(event);
 * }
 */
export class YourEventHandler implements WebhookEventHandler {
  constructor(
    private supabase: SupabaseClient,
    private logger?: Logger
  ) {}

  /**
   * Determine if this handler can process the event
   *
   * Return true only for the specific event types this handler processes.
   *
   * @param event - Stripe event to check
   * @returns true if event.type matches this handler's event types
   *
   * @example
   * canHandle(event) {
   *   return event.type === 'invoice.payment_failed';
   * }
   */
  canHandle(event: Stripe.Event): boolean {
    return event.type === 'your.event.type';
  }

  /**
   * Process the webhook event
   *
   * Implement your business logic here.
   * Return appropriate HTTP status codes based on outcome.
   *
   * HTTP Status Codes:
   * - 200: Successfully processed OR permanent error (don't retry)
   * - 500: Transient error (Stripe will retry)
   * - 429: Rate limit exceeded
   * - 401: Security validation failed
   *
   * @param event - your.event.type event
   * @returns Processing result with HTTP status
   *
   * @example
   * async handle(event) {
   *   try {
   *     // Extract event data
   *     const data = event.data.object as StripeObject;
   *
   *     // Process event (e.g., update database)
   *     await this.supabase.from('table').insert({...});
   *
   *     return {
   *       success: true,
   *       httpStatus: 200,
   *       message: 'Event processed successfully',
   *     };
   *   } catch (err) {
   *     return {
   *       success: false,
   *       httpStatus: 500,
   *       message: 'Processing failed',
   *       error: err.message,
   *     };
   *   }
   * }
   */
  async handle(event: Stripe.Event): Promise<WebhookProcessingResult> {
    this.logger?.debug('YourEventHandler.handle() called', {
      eventId: event.id,
      eventType: event.type,
    });

    try {
      // TODO: Implement your event handling logic here
      const data = event.data.object;

      this.logger?.info('Event processed', {
        eventId: event.id,
        eventType: event.type,
      });

      return {
        success: true,
        httpStatus: 200,
        message: 'Event processed successfully',
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      this.logger?.error('Error processing event', {
        eventId: event.id,
        error: errorMsg,
      });

      // Return 500 for unexpected errors (conservative - allow Stripe retry)
      return {
        success: false,
        httpStatus: 500,
        message: 'Processing failed',
        error: errorMsg,
        retryable: true,
      };
    }
  }
}
```

### Step 2: Register Handler in Webhook Route

Update `app/api/quiz/stripe/webhook/route.ts`:

```typescript
// In the initializeWebhookHandlers() function:

function initializeWebhookHandlers(): void {
  const supabase = getSupabaseClient();
  const brevoApiKey = process.env.BREVO_API_KEY;

  webhookFactory.registerAll([
    new CheckoutSessionCompletedHandler(supabase, brevoApiKey, {
      error: (msg, ctx) => log.error(msg, ctx),
      info: (msg, ctx) => log.info(msg, ctx),
      warn: (msg, ctx) => log.warn(msg, ctx),
      debug: (msg, ctx) => log.debug(msg, ctx),
    }),
    // ✅ Add new handler here:
    new YourEventHandler(supabase, {
      error: (msg, ctx) => log.error(msg, ctx),
      info: (msg, ctx) => log.info(msg, ctx),
      warn: (msg, ctx) => log.warn(msg, ctx),
      debug: (msg, ctx) => log.debug(msg, ctx),
    }),
  ]);

  log.info('Webhook handlers initialized', {
    handlerCount: webhookFactory.handlerCount(),
  });
}
```

### Step 3: That's It!

The route handler automatically routes events to your handler:
1. Event arrives
2. `factory.getHandler(event)` finds your handler (because `canHandle()` returns true)
3. `handler.handle(event)` is called with your business logic
4. Result is returned with appropriate HTTP status

**No route changes needed!**

## Example: Adding Invoice Payment Failed Handler

### 1. Create handler (`lib/webhook/handlers/invoice-payment-failed-handler.ts`)

```typescript
import Stripe from 'stripe';
import { WebhookEventHandler, WebhookProcessingResult } from '../types/webhook-event-handler';
import { SupabaseClient } from '@supabase/supabase-js';

interface Logger {
  error: (msg: string, ctx?: Record<string, unknown>) => void;
  info: (msg: string, ctx?: Record<string, unknown>) => void;
  warn: (msg: string, ctx?: Record<string, unknown>) => void;
  debug: (msg: string, ctx?: Record<string, unknown>) => void;
}

export class InvoicePaymentFailedHandler implements WebhookEventHandler {
  constructor(
    private supabase: SupabaseClient,
    private logger?: Logger
  ) {}

  canHandle(event: Stripe.Event): boolean {
    return event.type === 'invoice.payment_failed';
  }

  async handle(event: Stripe.Event): Promise<WebhookProcessingResult> {
    try {
      const invoice = event.data.object as Stripe.Invoice;

      this.logger?.info('Payment failed', {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        amount: invoice.amount_paid,
      });

      // Send email notification to customer
      // Update customer status
      // Retry after N days, etc.

      return {
        success: true,
        httpStatus: 200,
        message: 'Payment failure notification processed',
      };
    } catch (err) {
      return {
        success: false,
        httpStatus: 500,
        message: 'Processing failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
```

### 2. Register in route

```typescript
// In initializeWebhookHandlers():
webhookFactory.registerAll([
  new CheckoutSessionCompletedHandler(...),
  new InvoicePaymentFailedHandler(supabase, logger), // ✅ Add here
]);
```

### 3. Done!

Stripe sends `invoice.payment_failed` events → Factory routes to handler → Handler processes → Returns 200/500

## Handler Priority

Handlers are checked in registration order. **First handler where `canHandle()` returns true is used.**

```typescript
// This handler will be checked first
new CheckoutSessionCompletedHandler(...),

// This handler is checked second
new YourEventHandler(...),

// This handler is checked third
new AnotherHandler(...),
```

If you need priority-based routing, register high-priority handlers first.

## Testing

### Test Handler Directly

```typescript
import { CheckoutSessionCompletedHandler } from '../lib/webhook/handlers/checkout-session-handler';

describe('CheckoutSessionCompletedHandler', () => {
  it('should canHandle checkout.session.completed events', () => {
    const handler = new CheckoutSessionCompletedHandler(supabase, brevoApiKey);
    const event: Stripe.Event = { type: 'checkout.session.completed' };
    
    expect(handler.canHandle(event)).toBe(true);
  });

  it('should not canHandle other event types', () => {
    const handler = new CheckoutSessionCompletedHandler(supabase, brevoApiKey);
    const event: Stripe.Event = { type: 'invoice.payment_failed' };
    
    expect(handler.canHandle(event)).toBe(false);
  });

  it('should handle checkout events', async () => {
    const handler = new CheckoutSessionCompletedHandler(supabase, brevoApiKey);
    const event: Stripe.Event = {
      type: 'checkout.session.completed',
      data: { object: { ... } },
    };

    const result = await handler.handle(event);
    expect(result.httpStatus).toBe(200);
    expect(result.success).toBe(true);
  });
});
```

### Test Factory Routing

```typescript
import { WebhookEventHandlerFactory } from '../lib/webhook/event-handler-factory';

describe('WebhookEventHandlerFactory', () => {
  it('should get correct handler for event type', () => {
    const factory = new WebhookEventHandlerFactory();
    factory.register(new CheckoutSessionCompletedHandler(...));
    factory.register(new InvoicePaymentFailedHandler(...));

    const checkoutEvent: Stripe.Event = { type: 'checkout.session.completed' };
    const checkoutHandler = factory.getHandler(checkoutEvent);
    expect(checkoutHandler).toBeInstanceOf(CheckoutSessionCompletedHandler);

    const invoiceEvent: Stripe.Event = { type: 'invoice.payment_failed' };
    const invoiceHandler = factory.getHandler(invoiceEvent);
    expect(invoiceHandler).toBeInstanceOf(InvoicePaymentFailedHandler);
  });

  it('should return null for unhandled event types', () => {
    const factory = new WebhookEventHandlerFactory();
    factory.register(new CheckoutSessionCompletedHandler(...));

    const unknownEvent: Stripe.Event = { type: 'unknown.event' };
    const handler = factory.getHandler(unknownEvent);
    expect(handler).toBeNull();
  });

  it('should support registering multiple handlers', () => {
    const factory = new WebhookEventHandlerFactory();
    const handlers = [
      new CheckoutSessionCompletedHandler(...),
      new InvoicePaymentFailedHandler(...),
    ];

    factory.registerAll(handlers);
    expect(factory.handlerCount()).toBe(2);
  });
});
```

## Benefits of This Pattern

| Aspect | Before (Hardcoded) | After (Factory) |
|--------|-------------------|-----------------|
| **Adding new event** | Modify route.ts + add logic | Create handler + register |
| **Event type changes** | Modify switch/if statements | Just change `canHandle()` |
| **Testing** | Hard to test in isolation | Easy unit tests per handler |
| **Code organization** | Everything in route.ts | Handler logic isolated |
| **Reusability** | Tightly coupled to route | Handlers are composable |
| **Maintenance** | Growing route complexity | Consistent handler pattern |

## Performance Considerations

- **Module-level singleton:** Factory initialized once on server startup, reused for all requests
- **Handler instantiation:** Only instantiated once, not recreated per request
- **Handler lookup:** O(n) where n = number of handlers (typically < 10, so negligible)
- **Allocation:** No allocations in hot path after module initialization

## Debugging

Enable debug logs to trace handler routing:

```typescript
// In your webhook request
log.debug('Routing event to handler', {
  webhookId: event.id,
  eventType: event.type,
  handlerType: handler.constructor.name,
});
```

Check logs to see:
1. Which event types arrive
2. Which handler processes each event
3. Handler processing duration
4. Errors with full context

## Migration Guide (From Old System)

### Before
```typescript
// Old hardcoded route
if (event.type !== 'checkout.session.completed') {
  return NextResponse.json({ success: true });
}

const processor = new StripeWebhookProcessor(...);
const result = await processor.process(event);
```

### After
```typescript
// New factory route
const handler = webhookFactory.getHandler(event);
if (!handler) {
  return NextResponse.json({ success: true });
}
const result = await handler.handle(event);
```

The `CheckoutSessionCompletedHandler` encapsulates the old processor logic internally.

## Summary

✅ **Before:** Add new event → Modify route.ts  
✅ **After:** Add new event → Create handler class + register  

**No route changes needed for new event types!**
