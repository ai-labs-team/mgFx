import compression from 'compression';
import { Router, Response, Request, NextFunction } from 'express';
import bodyParser from 'body-parser';
import errorHandler from 'errorhandler';
import { Analyzer } from '@mgfx/analyzer';
import { ioTs, t } from '@mgfx/validator-iots';
import { value } from '@mgfx/codecs';
import { chain, fork, map, FutureInstance } from 'fluture';
import { validateInput, Validator } from 'mgfx/dist/validator';

const queryParams = {
  spans: ioTs(
    t.partial({
      scope: t.partial({
        id: t.string,
        spec: t.type({
          name: t.string
        }),
        input: t.type({
          eq: t.any
        }),
        state: t.keyof({
          running: null,
          resolved: null,
          rejected: null,
          cancelled: null
        })
      }),
      limit: t.number,
      offset: t.number,
      order: t.type({
        field: t.keyof({
          createdAt: null,
          resolvedAt: null,
          rejectedAt: null,
          cancelledAt: null
        }),
        direction: t.keyof({
          asc: null,
          desc: null
        })
      })
    })
  )
};

const baseEvent = t.type({ timestamp: t.number });
const processEvent = t.intersection([
  baseEvent,
  t.type({
    kind: t.literal('process'),
    process: t.type({
      spec: t.type({
        name: t.string
      }),
      id: t.string,
      parentId: t.union([t.undefined, t.string]),
      input: t.any,
      context: t.union([
        t.undefined,
        t.type({
          id: t.string,
          parentId: t.union([t.undefined, t.string]),
          values: t.record(
            t.string,
            t.union([
              t.string,
              t.number,
              t.boolean,
              t.array(t.string),
              t.array(t.number),
              t.array(t.boolean)
            ])
          )
        })
      ])
    })
  })
]);

const resolutionEvent = t.intersection([
  baseEvent,
  t.type({
    kind: t.literal('resolution'),
    id: t.string,
    value: t.any
  })
]);

const rejectionEvent = t.intersection([
  baseEvent,
  t.type({
    kind: t.literal('rejection'),
    id: t.string,
    reason: t.any
  })
]);

const cancellationEvent = t.intersection([
  baseEvent,
  t.type({
    kind: t.literal('cancellation'),
    id: t.string
  })
]);

const event = ioTs(
  t.union([processEvent, resolutionEvent, rejectionEvent, cancellationEvent])
);

const decodeQuery = <T>(
  req: Request,
  validator: Validator<T>
): FutureInstance<any, T> =>
  value
    .decode(req.query.q)
    .pipe(chain(value => validateInput(validator, value)));

const decodeBody = <T>(
  req: Request,
  validator: Validator<T>
): FutureInstance<any, T> => validateInput(validator, req.body);

const toResponse = (res: Response, next: NextFunction) =>
  fork(next)(v => res.json(v));

export type Config = {
  analyzer: Analyzer;
};

export const httpServer = (config: Config) => {
  const { analyzer } = config;
  const router = Router();

  return router
    .use(compression())
    .use(bodyParser.json())
    .post('/collector', (req, res, next) => {
      decodeBody(req, event)
        .pipe(map(event => analyzer.receiver(event)))
        .pipe(toResponse(res, next));
    })
    .get('/query/spans', (req, res, next) => {
      decodeQuery(req, queryParams.spans)
        .pipe(chain(params => analyzer.query.spans(params).get()))
        .pipe(toResponse(res, next));
    })
    .get('/query/spans/observe', (req, res, next) => {
      decodeQuery(req, queryParams.spans).pipe(
        fork(next)(params => {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            Connection: 'keep-alive',
            'Cache-Control': 'no-cache'
          });

          const observer = analyzer.query
            .spans(params)
            .watch()
            .observe(spans => {
              const data = JSON.stringify(spans);
              res.write(`data: ${data}\n\n`);
              res.flush();
            });

          req.on('close', () => {
            observer.unsubscribe();
          });
        })
      );
    })
    .use(errorHandler());
};
