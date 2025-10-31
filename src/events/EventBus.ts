import { EventEmitter } from "events";

/**
 * Lightweight, in-process domain event bus.
 *
 * Usage:
 *   eventBus.on('preferences.updated', (payload) => { ... });
 *   eventBus.emit('preferences.updated', { userId, before, after, changedFields });
 */
class EventBus {
  #emitter = new EventEmitter();

  on(event: string, listener: (payload: any) => void): void {
    this.#emitter.on(event, listener);
  }

  off(event: string, listener: (payload: any) => void): void {
    this.#emitter.off(event, listener);
  }

  once(event: string, listener: (payload: any) => void): void {
    this.#emitter.once(event, listener);
  }

  emit(event: string, payload: any): void {
    this.#emitter.emit(event, payload);
  }
}

export const eventBus = new EventBus();
