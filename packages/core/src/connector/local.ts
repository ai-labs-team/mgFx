/**
 * The 'local' Connector implementation allows the execution of Tasks within the context of a single NodeJS process.
 */
import { reject } from 'fluture';
import { CustomError } from 'ts-custom-error';

import {
  makeConnector,
  EncasedImplementationFunction,
  EnvironmentInitializer
} from '../connector';
import { Spec } from '../task';

export class NoImplementationError extends CustomError {}

export const local = () => {
  const implementations = new Map<
    Spec,
    [EncasedImplementationFunction, EnvironmentInitializer]
  >();

  return makeConnector({
    dispatch: process => {
      const match = implementations.get(process.spec);
      if (!match) {
        return reject(
          new NoImplementationError(
            `No Implementation for ${process.spec.name} was found. Did you forget to call serve()?`
          )
        );
      }

      const [implementation, environmentInitializer] = match;
      const environment = environmentInitializer(process);
      return implementation(process.input, environment);
    },

    provide: (spec, implementation, environmentInitializer) => {
      implementations.set(spec, [implementation, environmentInitializer]);

      return () => {
        implementations.delete(spec);
      };
    }
  });
};
