"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _EventBus_emitter;
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = void 0;
const events_1 = require("events");
/**
 * Lightweight, in-process domain event bus.
 *
 * Usage:
 *   eventBus.on('preferences.updated', (payload) => { ... });
 *   eventBus.emit('preferences.updated', { userId, before, after, changedFields });
 */
class EventBus {
    constructor() {
        _EventBus_emitter.set(this, new events_1.EventEmitter());
    }
    on(event, listener) {
        __classPrivateFieldGet(this, _EventBus_emitter, "f").on(event, listener);
    }
    off(event, listener) {
        __classPrivateFieldGet(this, _EventBus_emitter, "f").off(event, listener);
    }
    once(event, listener) {
        __classPrivateFieldGet(this, _EventBus_emitter, "f").once(event, listener);
    }
    emit(event, payload) {
        __classPrivateFieldGet(this, _EventBus_emitter, "f").emit(event, payload);
    }
}
_EventBus_emitter = new WeakMap();
exports.eventBus = new EventBus();
