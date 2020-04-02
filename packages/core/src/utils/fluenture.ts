// @ts-ignore
export * from 'fluenture';
import { FutureInstance, Cancel } from 'fluture';

/**
 * TODO: Offer these type definitions for inclusion in the fluenture package
 */
export type Future<A, B> = FutureInstance<A, B> | Fluenture<A, B>;

// Important: Fluenture needs to be placed *before* FutureInstance so that Fluenture's specialized `pipe` implementation
// takes priority over the 'vanilla' implementation when TypeScript is trying to select the appropriate overload.
export type Fluent<A, B> = Fluenture<A, B> & FutureInstance<A, B>;

export declare function fluent<A, B>(future: Future<A, B>): Fluent<A, B>;

export declare function functional<A, B>(
  future: Future<A, B>
): FutureInstance<A, B>;

export declare class Fluenture<A, B> {
  public pipe<T>(
    fn: (self: Fluent<A, B>) => T
  ): T extends Future<infer C, infer D> ? Fluent<C, D> : T;

  public alt<C, D>(future: Future<C, D>): Fluent<C, B | D>;

  public and<C, D>(future: Future<C, D>): Fluent<A | C, D>;

  public ap<C>(future: Future<A, (value: B) => C>): Fluent<A, C>;

  public bimap<C, D>(
    withLeft: (left: A) => C,
    withRight: (right: B) => D
  ): Fluent<C, D>;

  public both<C, D>(future: Future<C, D>): Fluent<A | C, [D, B]>;

  public cache(): this;

  public chain<C>(fn: (value: B) => Future<A, C>): Fluent<A, C>;

  public chainRej<C>(fn: (reason: A) => Future<C, B>): Fluent<C, B>;

  public coalesce<C>(
    withLeft: (left: A) => C,
    withRight: (right: B) => C
  ): Fluent<never, C>;

  public lastly<C>(future: Future<C, any>): Fluent<A | C, B>;

  public map<C>(fn: (value: B) => C): Fluent<A, C>;

  public mapRej<C>(fn: (reason: A) => C): Fluent<C, B>;

  // @TODO: This should be Fluent<A, B> | Fluent<B, D>, but doesn't work.
  public race<C, D>(future: Future<C, D>): Fluent<A | C, B | D>;

  public swap(): Fluent<B, A>;

  public done(fn: (value: A) => any): Cancel;

  public fork(
    withLeft: (reason: A) => any,
    withRight: (value: B) => any
  ): Cancel;

  public forkCatch(
    withError: (error: any) => any,
    withLeft: (reason: A) => any,
    withRight: (value: B) => any
  ): Cancel;

  public promise(): Promise<B>;

  public value(withRight: (value: B) => any): Cancel;
}
