/**
 * Webhook Event Handler Factory Tests
 *
 * Tests for the factory pattern implementation.
 * Verifies that:
 * - Factory correctly routes events to handlers
 * - Multiple handlers can be registered
 * - Handlers are checked in registration order
 * - Unhandled event types return null
 * - Factory is extensible for new event types
 */

import { WebhookEventHandlerFactory } from '../event-handler-factory';
import { WebhookEventHandler, WebhookProcessingResult } from '../types/webhook-event-handler';
import Stripe from 'stripe';

// Mock handler for testing
class MockCheckoutHandler implements WebhookEventHandler {
  canHandle(event: Stripe.Event): boolean {
    return event.type === 'checkout.session.completed';
  }

  async handle(event: Stripe.Event): Promise<WebhookProcessingResult> {
    return {
      success: true,
      httpStatus: 200,
      message: 'Checkout event processed',
    };
  }
}

class MockInvoiceHandler implements WebhookEventHandler {
  canHandle(event: Stripe.Event): boolean {
    return event.type === 'invoice.payment_failed';
  }

  async handle(event: Stripe.Event): Promise<WebhookProcessingResult> {
    return {
      success: true,
      httpStatus: 200,
      message: 'Invoice event processed',
    };
  }
}

class MockCustomerHandler implements WebhookEventHandler {
  canHandle(event: Stripe.Event): boolean {
    return event.type === 'customer.created';
  }

  async handle(event: Stripe.Event): Promise<WebhookProcessingResult> {
    return {
      success: true,
      httpStatus: 200,
      message: 'Customer event processed',
    };
  }
}

describe('WebhookEventHandlerFactory', () => {
  describe('register()', () => {
    it('should register a single handler', () => {
      const factory = new WebhookEventHandlerFactory();
      const handler = new MockCheckoutHandler();

      factory.register(handler);

      expect(factory.handlerCount()).toBe(1);
    });

    it('should register multiple handlers', () => {
      const factory = new WebhookEventHandlerFactory();
      const checkoutHandler = new MockCheckoutHandler();
      const invoiceHandler = new MockInvoiceHandler();

      factory.register(checkoutHandler);
      factory.register(invoiceHandler);

      expect(factory.handlerCount()).toBe(2);
    });

    it('should maintain registration order', () => {
      const factory = new WebhookEventHandlerFactory();
      const handlers = [
        new MockCheckoutHandler(),
        new MockInvoiceHandler(),
        new MockCustomerHandler(),
      ];

      handlers.forEach((h) => factory.register(h));

      const registered = factory.getHandlers();
      expect(registered.length).toBe(3);
      expect(registered[0]).toBeInstanceOf(MockCheckoutHandler);
      expect(registered[1]).toBeInstanceOf(MockInvoiceHandler);
      expect(registered[2]).toBeInstanceOf(MockCustomerHandler);
    });
  });

  describe('registerAll()', () => {
    it('should register multiple handlers at once', () => {
      const factory = new WebhookEventHandlerFactory();
      const handlers = [
        new MockCheckoutHandler(),
        new MockInvoiceHandler(),
        new MockCustomerHandler(),
      ];

      factory.registerAll(handlers);

      expect(factory.handlerCount()).toBe(3);
    });

    it('should preserve order when registering all', () => {
      const factory = new WebhookEventHandlerFactory();
      const handlers = [
        new MockCheckoutHandler(),
        new MockInvoiceHandler(),
        new MockCustomerHandler(),
      ];

      factory.registerAll(handlers);

      const registered = factory.getHandlers();
      expect(registered[0]).toBe(handlers[0]);
      expect(registered[1]).toBe(handlers[1]);
      expect(registered[2]).toBe(handlers[2]);
    });
  });

  describe('getHandler()', () => {
    it('should return handler for matching event type', () => {
      const factory = new WebhookEventHandlerFactory();
      const checkoutHandler = new MockCheckoutHandler();
      factory.register(checkoutHandler);

      const event: Stripe.Event = {
        id: 'evt_test',
        type: 'checkout.session.completed',
      } as Stripe.Event;

      const handler = factory.getHandler(event);

      expect(handler).toBe(checkoutHandler);
    });

    it('should return null for unhandled event type', () => {
      const factory = new WebhookEventHandlerFactory();
      factory.register(new MockCheckoutHandler());

      const event: Stripe.Event = {
        id: 'evt_test',
        type: 'unknown.event.type',
      } as Stripe.Event;

      const handler = factory.getHandler(event);

      expect(handler).toBeNull();
    });

    it('should return first matching handler in registration order', () => {
      const factory = new WebhookEventHandlerFactory();

      // Create a handler that handles multiple event types
      class MultiEventHandler implements WebhookEventHandler {
        canHandle(event: Stripe.Event): boolean {
          return ['event.a', 'event.b', 'event.c'].includes(event.type);
        }

        async handle(event: Stripe.Event): Promise<WebhookProcessingResult> {
          return {
            success: true,
            httpStatus: 200,
            message: 'Multi-event processed',
          };
        }
      }

      const handler = new MultiEventHandler();
      factory.register(handler);

      const eventA: Stripe.Event = {
        id: 'evt_a',
        type: 'event.a',
      } as Stripe.Event;

      const eventB: Stripe.Event = {
        id: 'evt_b',
        type: 'event.b',
      } as Stripe.Event;

      expect(factory.getHandler(eventA)).toBe(handler);
      expect(factory.getHandler(eventB)).toBe(handler);
    });

    it('should respect handler priority (registration order)', () => {
      const factory = new WebhookEventHandlerFactory();

      // First handler handles 'checkout.session.completed'
      const checkoutHandler = new MockCheckoutHandler();

      // Second handler also handles 'checkout.session.completed'
      class AlsoCheckoutHandler implements WebhookEventHandler {
        canHandle(event: Stripe.Event): boolean {
          return event.type === 'checkout.session.completed';
        }

        async handle(event: Stripe.Event): Promise<WebhookProcessingResult> {
          return {
            success: true,
            httpStatus: 200,
            message: 'Alternative checkout processor',
          };
        }
      }

      factory.register(checkoutHandler);
      factory.register(new AlsoCheckoutHandler());

      const event: Stripe.Event = {
        id: 'evt_test',
        type: 'checkout.session.completed',
      } as Stripe.Event;

      const handler = factory.getHandler(event);

      // Should return first handler that canHandle
      expect(handler).toBe(checkoutHandler);
    });

    it('should route different events to different handlers', () => {
      const factory = new WebhookEventHandlerFactory();
      const checkoutHandler = new MockCheckoutHandler();
      const invoiceHandler = new MockInvoiceHandler();

      factory.register(checkoutHandler);
      factory.register(invoiceHandler);

      const checkoutEvent: Stripe.Event = {
        id: 'evt_checkout',
        type: 'checkout.session.completed',
      } as Stripe.Event;

      const invoiceEvent: Stripe.Event = {
        id: 'evt_invoice',
        type: 'invoice.payment_failed',
      } as Stripe.Event;

      expect(factory.getHandler(checkoutEvent)).toBe(checkoutHandler);
      expect(factory.getHandler(invoiceEvent)).toBe(invoiceHandler);
    });
  });

  describe('getHandlers()', () => {
    it('should return all registered handlers', () => {
      const factory = new WebhookEventHandlerFactory();
      const handlers = [
        new MockCheckoutHandler(),
        new MockInvoiceHandler(),
        new MockCustomerHandler(),
      ];

      handlers.forEach((h) => factory.register(h));

      const registered = factory.getHandlers();
      expect(registered.length).toBe(3);
      expect(registered).toEqual(handlers);
    });

    it('should return empty array when no handlers registered', () => {
      const factory = new WebhookEventHandlerFactory();

      expect(factory.getHandlers()).toEqual([]);
    });

    it('should return a copy of handlers array', () => {
      const factory = new WebhookEventHandlerFactory();
      factory.register(new MockCheckoutHandler());

      const handlers1 = factory.getHandlers();
      const handlers2 = factory.getHandlers();

      // Should be equal but not the same reference
      expect(handlers1).toEqual(handlers2);
      expect(handlers1).not.toBe(handlers2);
    });
  });

  describe('clear()', () => {
    it('should remove all handlers', () => {
      const factory = new WebhookEventHandlerFactory();
      factory.register(new MockCheckoutHandler());
      factory.register(new MockInvoiceHandler());

      expect(factory.handlerCount()).toBe(2);

      factory.clear();

      expect(factory.handlerCount()).toBe(0);
      expect(factory.getHandlers()).toEqual([]);
    });

    it('should allow re-registration after clear', () => {
      const factory = new WebhookEventHandlerFactory();
      factory.register(new MockCheckoutHandler());

      factory.clear();

      factory.register(new MockInvoiceHandler());

      expect(factory.handlerCount()).toBe(1);
      expect(factory.getHandlers()[0]).toBeInstanceOf(MockInvoiceHandler);
    });
  });

  describe('handlerCount()', () => {
    it('should return number of registered handlers', () => {
      const factory = new WebhookEventHandlerFactory();

      expect(factory.handlerCount()).toBe(0);

      factory.register(new MockCheckoutHandler());
      expect(factory.handlerCount()).toBe(1);

      factory.register(new MockInvoiceHandler());
      expect(factory.handlerCount()).toBe(2);
    });
  });

  describe('Integration: Full workflow', () => {
    it('should handle complete webhook routing flow', async () => {
      const factory = new WebhookEventHandlerFactory();
      factory.registerAll([
        new MockCheckoutHandler(),
        new MockInvoiceHandler(),
        new MockCustomerHandler(),
      ]);

      // Simulate multiple webhook events
      const events: Stripe.Event[] = [
        {
          id: 'evt_1',
          type: 'checkout.session.completed',
          data: { object: {} },
        } as Stripe.Event,
        {
          id: 'evt_2',
          type: 'invoice.payment_failed',
          data: { object: {} },
        } as Stripe.Event,
        {
          id: 'evt_3',
          type: 'customer.created',
          data: { object: {} },
        } as Stripe.Event,
        {
          id: 'evt_4',
          type: 'unknown.event.type',
          data: { object: {} },
        } as Stripe.Event,
      ];

      // Route each event
      const results = [];
      for (const event of events) {
        const handler = factory.getHandler(event);
        if (handler) {
          const result = await handler.handle(event);
          results.push({ event: event.type, result });
        } else {
          results.push({ event: event.type, result: 'no_handler' });
        }
      }

      // Verify results
      expect(results[0].result.success).toBe(true);
      expect(results[0].result.message).toBe('Checkout event processed');

      expect(results[1].result.success).toBe(true);
      expect(results[1].result.message).toBe('Invoice event processed');

      expect(results[2].result.success).toBe(true);
      expect(results[2].result.message).toBe('Customer event processed');

      expect(results[3].result).toBe('no_handler');
    });

    it('should be reusable across multiple requests', async () => {
      const factory = new WebhookEventHandlerFactory();
      factory.register(new MockCheckoutHandler());

      const event: Stripe.Event = {
        id: 'evt_test',
        type: 'checkout.session.completed',
      } as Stripe.Event;

      // Simulate multiple requests reusing same factory
      for (let i = 0; i < 5; i++) {
        const handler = factory.getHandler(event);
        expect(handler).not.toBeNull();

        const result = await handler!.handle(event);
        expect(result.success).toBe(true);
      }

      // Handler count should remain the same
      expect(factory.handlerCount()).toBe(1);
    });
  });

  describe('Extension: Adding new event types', () => {
    it('should support adding custom event handlers', () => {
      const factory = new WebhookEventHandlerFactory();

      // Start with checkout handler
      factory.register(new MockCheckoutHandler());
      expect(factory.handlerCount()).toBe(1);

      // Add new handler at runtime
      class CustomEventHandler implements WebhookEventHandler {
        canHandle(event: Stripe.Event): boolean {
          return event.type === 'custom.event.type';
        }

        async handle(event: Stripe.Event): Promise<WebhookProcessingResult> {
          return {
            success: true,
            httpStatus: 200,
            message: 'Custom event processed',
          };
        }
      }

      factory.register(new CustomEventHandler());
      expect(factory.handlerCount()).toBe(2);

      // Verify custom handler is used
      const event: Stripe.Event = {
        id: 'evt_custom',
        type: 'custom.event.type',
      } as Stripe.Event;

      const handler = factory.getHandler(event);
      expect(handler).toBeInstanceOf(CustomEventHandler);
    });

    it('should support conditional handler registration', () => {
      const factory = new WebhookEventHandlerFactory();

      // Register based on feature flag
      const featureEnabled = true;

      if (featureEnabled) {
        factory.register(new MockInvoiceHandler());
      }

      expect(factory.handlerCount()).toBe(1);

      const event: Stripe.Event = {
        id: 'evt_invoice',
        type: 'invoice.payment_failed',
      } as Stripe.Event;

      expect(factory.getHandler(event)).toBeInstanceOf(MockInvoiceHandler);
    });
  });
});
