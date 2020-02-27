import { hook, attempt } from 'fluture';
import { Connector, ImplementationModule } from './connector';
import { Implementation } from './task';

/**
 * Registers a single Implementation against an mgFx connector, runs a Future, and then stops the Implementation after
 * the Future has settled.
 */
export const withImplementation = (connector: Connector) => (
  implementation: Implementation
) => hook<any, any>(attempt(() => connector.serve(implementation)))(attempt);

/**
 * Like `withImplementation`, but for a module (or module-like) object containing multiple Implementations
 */
export const withImplementations = (connector: Connector) => (
  module: ImplementationModule
) => hook<any, any>(attempt(() => connector.serveModule(module)))(attempt);
