import { Span } from '@mgfx/analyzer';

import { exposeTimedWorker, TimedOutput } from '../../../../../worker';
import { render, compareByTime } from '../renderer';

export type Input = Parameters<typeof render>;
export type Output = TimedOutput<typeof render>;

exposeTimedWorker((spans: Span[]) => render(spans.sort(compareByTime)));
