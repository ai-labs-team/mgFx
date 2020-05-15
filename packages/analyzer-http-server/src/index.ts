import compression from 'compression';
import { Router, Response, Request, NextFunction } from 'express';
import bodyParser from 'body-parser';
import errorHandler from 'errorhandler';
import { create as createPatchGenerator } from 'jsondiffpatch';
import { Analyzer, Span } from '@mgfx/analyzer';
import { ioTs, t } from '@mgfx/validator-iots';
import { value } from '@mgfx/codecs';
import { chain, fork, map, FutureInstance } from 'fluture';
import { validateInput, Validator } from 'mgfx/dist/validator';

const patchGenerator = createPatchGenerator({
  objectHash: (span: Span) => span.id,
});

const queryParams = {
  spans: ioTs(
    t.partial({
      scope: t.partial({
        id: t.string,
        context: t.type({
          id: t.string,
        }),
        spec: t.type({
          name: t.string,
        }),
        input: t.type({
          eq: t.any,
        }),
        state: t.keyof({
          running: null,
          resolved: null,
          rejected: null,
          cancelled: null,
        }),
      }),
      limit: t.number,
      offset: t.number,
      order: t.type({
        field: t.keyof({
          createdAt: null,
          endedAt: null,
        }),
        direction: t.keyof({
          asc: null,
          desc: null,
        }),
      }),
      distinct: t.union([
        t.keyof({
          input: null,
          output: null,
        }),
        t.type({
          input: t.type({
            path: t.array(t.string),
          }),
        }),
        t.type({
          output: t.type({
            path: t.array(t.string),
          }),
        }),
      ]),
      compact: t.boolean,
    })
  ),
};

const baseEvent = t.type({ timestamp: t.number });
const processEvent = t.intersection([
  baseEvent,
  t.type({
    kind: t.literal('process'),
    process: t.type({
      spec: t.type({
        name: t.string,
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
              t.array(t.boolean),
            ])
          ),
        }),
      ]),
    }),
  }),
]);

const resolutionEvent = t.intersection([
  baseEvent,
  t.type({
    kind: t.literal('resolution'),
    id: t.string,
    value: t.any,
  }),
]);

const rejectionEvent = t.intersection([
  baseEvent,
  t.type({
    kind: t.literal('rejection'),
    id: t.string,
    reason: t.any,
  }),
]);

const cancellationEvent = t.intersection([
  baseEvent,
  t.type({
    kind: t.literal('cancellation'),
    id: t.string,
  }),
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
    .pipe(chain((value) => validateInput(validator, value)));

const decodeBody = <T>(
  req: Request,
  validator: Validator<T>
): FutureInstance<any, T> => validateInput(validator, req.body);

const toResponse = (res: Response, next: NextFunction) =>
  fork(next)((v) => res.json(v));

export type Config = {
  analyzer: Analyzer;
  collector?: Partial<{
    enabled: boolean;
    sizeLimit: string | number;
  }>;
};

export const httpServer = (config: Config) => {
  const {
    analyzer,
    collector = {
      enabled: true,
    },
  } = config;

  let router = Router()
    .use(compression())
    .get('/query/spans', (req, res, next) => {
      decodeQuery(req, queryParams.spans)
        .pipe(chain((params) => analyzer.query.spans(params).get()))
        .pipe(toResponse(res, next));
    })
    .get('/query/spans/observe', (req, res, next) => {
      const deltas = req.query.deltas === 'true';

      decodeQuery(req, queryParams.spans).pipe(
        fork(next)((params) => {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            Connection: 'keep-alive',
            'Cache-Control': 'no-cache',
          });

          let prevState: Span[] | undefined;

          const observer = analyzer.query
            .spans(params)
            .watch()
            .map(
              deltas
                ? (spans) => {
                    if (!prevState) {
                      prevState = spans;
                      return [spans];
                    }

                    const delta = patchGenerator.diff(prevState, spans);
                    prevState = spans;
                    return [delta, 'delta'];
                  }
                : (spans) => [spans]
            )
            .observe(([data, kind]) => {
              if (kind) {
                res.write(`event: ${kind}\n`);
              }

              res.write(`data: ${JSON.stringify(data)}\n\n`);
              res.flush();
            });

          req.on('close', () => {
            observer.unsubscribe();
          });
        })
      );
    });

  if (collector.enabled) {
    router = router.post(
      '/collector',
      bodyParser.json({ limit: collector.sizeLimit }),
      (req, res, next) => {
        decodeBody(req, event)
          .pipe(map((event) => analyzer.receiver(event)))
          .pipe(toResponse(res, next));
      }
    );
  }

  router = router.use(errorHandler());

  return router;
};
