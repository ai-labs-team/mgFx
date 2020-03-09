import { implement, define } from 'mgfx';
import { ioTs, t } from '@mgfx/validator-iots';
import {
  chain,
  coalesce,
  Future,
  FutureInstance,
  map,
  parallel
} from 'fluture';
import { retryLinearly } from 'fluture-retry';
import { Either, isRight, left, right } from 'fp-ts/lib/Either';
import axios, { AxiosError } from 'axios';

const parallelToleratingFailure = <L, R, T extends FutureInstance<L, R>>(
  concurrency: number
) => (futures: T[]) => {
  const coalesced = futures.map(future =>
    future.pipe(coalesce<any, Either<L, R>>(left)(right))
  );

  return parallel(concurrency)(coalesced).pipe(
    map(values => values.filter(isRight).map(value => value.right))
  );
};

export const refresh = implement(
  define({
    name: 'refresh',
    input: ioTs(
      t.union([
        t.type({ accountId: t.number }),
        t.type({ userId: t.number }),
        t.type({ groupId: t.number })
      ])
    ),
    output: ioTs(t.array(t.number))
  }),
  (params, { runChild }) => {
    if ('accountId' in params) {
      return runChild(refreshAccount(params.accountId)).pipe(
        map(() => [params.accountId])
      );
    }

    if ('userId' in params) {
      return runChild(refreshUserAccounts(params.userId));
    }

    if ('groupId' in params) {
      return runChild(refreshGroupAccounts(params.groupId));
    }

    // Unreachable, just to stop TypeScript complaining
    throw new Error();
  }
);

export const refreshAccount = implement(
  define({
    name: 'refreshAccount',
    input: ioTs(t.number),
    output: ioTs(t.number)
  }),
  (accountId, { runChild }) =>
    getAccount(accountId)
      .pipe(runChild)
      .pipe(
        chain(account =>
          getBalance({
            institution: account.institution,
            reference: account.reference
          })
        )
      )
      .pipe(runChild)
      .pipe(chain(balance => updateBalance({ accountId, balance })))
      .pipe(runChild)
      .pipe(map(() => accountId))
      .pipe(retryLinearly)
);

export const refreshUserAccounts = implement(
  define({
    name: 'refreshUserAccounts',
    input: ioTs(t.number),
    output: ioTs(t.array(t.number))
  }),
  (userId, { runChild }) =>
    getUserAccountIds(userId)
      .pipe(runChild)
      .pipe(
        map(accountIds =>
          accountIds.map(accountId => refreshAccount(accountId).pipe(runChild))
        )
      )
      .pipe(chain(parallelToleratingFailure(2)))
);

export const refreshGroupAccounts = implement(
  define({
    name: 'refreshGroupAccounts',
    input: ioTs(t.number),
    output: ioTs(t.array(t.number))
  }),
  (groupId, { runChild }) =>
    getGroupUserIds(groupId)
      .pipe(runChild)
      .pipe(
        map(userIds =>
          userIds.map(userId => refreshUserAccounts(userId).pipe(runChild))
        )
      )
      .pipe(chain(parallel(2)))
      .pipe(map(ids => ids.reduce((result, ids) => result.concat(ids))))
);

export const httpRequest = implement(
  define({
    name: 'httpRequest',
    input: ioTs(
      t.intersection([
        t.type({
          url: t.string,
          method: t.keyof({
            get: null,
            post: null,
            put: null,
            patch: null,
            delete: null
          })
        }),
        t.partial({
          data: t.any,
          headers: t.record(t.string, t.string)
        })
      ])
    ),
    output: ioTs(t.any),
    context: {
      correlationId: ioTs(t.union([t.string, t.undefined]))
    }
  }),
  ({ url, method, data, headers }, { context: { correlationId = '' } }) =>
    Future((reject, resolve) => {
      const source = axios.CancelToken.source();

      axios({
        url,
        method,
        data,
        headers: {
          ...headers,
          'X-Correlation-Id': correlationId
        }
      })
        .then((response: any) => resolve(response.data))
        .catch((error: AxiosError) => {
          reject(new Error(error.message));
        });

      return () => {
        source.cancel();
      };
    })
);

const account = ioTs(
  t.type({
    institution: t.string,
    reference: t.string
  })
);

export const getAccount = implement(
  define({
    name: 'getAccount',
    input: ioTs(t.number),
    output: account,
    context: {
      coreUrl: ioTs(t.string)
    }
  }),
  (accountId, { runChild, context: { coreUrl } }) =>
    httpRequest({
      url: `${coreUrl}/accounts/${accountId}`,
      method: 'get'
    })
      .pipe(runChild)
      .pipe(
        map(account => ({
          institution: account.institution,
          reference: account.institution_reference
        }))
      )
);

export const getUserAccountIds = implement(
  define({
    name: 'getUserAccountIds',
    input: ioTs(t.number),
    output: ioTs(t.array(t.number)),
    context: {
      coreUrl: ioTs(t.string)
    }
  }),
  (userId, { runChild, context: { coreUrl } }) =>
    httpRequest({
      url: `${coreUrl}/accounts?user_id=${userId}`,
      method: 'get'
    })
      .pipe(runChild)
      .pipe(map(accounts => accounts.map((account: any) => account.id)))
);

export const getGroupUserIds = implement(
  define({
    name: 'getGroupUserIds',
    input: ioTs(t.number),
    output: ioTs(t.array(t.number)),
    context: {
      coreUrl: ioTs(t.string)
    }
  }),
  (groupId, { runChild, context: { coreUrl } }) =>
    httpRequest({
      url: `${coreUrl}/group_memberships?group_id=${groupId}&role=user`,
      method: 'get'
    })
      .pipe(runChild)
      .pipe(map(members => members.map((member: any) => member.user_id)))
);

export const updateBalance = implement(
  define({
    name: 'updateBalance',
    input: ioTs(
      t.type({
        accountId: t.number,
        balance: t.number
      })
    ),
    output: ioTs(t.void),
    context: {
      coreUrl: ioTs(t.string)
    }
  }),
  ({ accountId, balance }, { runChild, context: { coreUrl } }) =>
    httpRequest({
      url: `${coreUrl}/accounts/${accountId}`,
      method: 'patch',
      data: {
        balance,
        last_refreshed: Date.now()
      }
    })
      .pipe(runChild)
      .pipe(map(() => undefined))
);

export const getBalance = implement(
  define({
    name: 'getBalance',
    input: account,
    output: ioTs(t.number)
  }),
  (account, { runChild }) => {
    if (account.institution === 'bankA') {
      return runChild(bankA(account.reference));
    }

    if (account.institution === 'bankB') {
      return runChild(bankB(account.reference));
    }

    throw new Error(
      `Institution ${account.institution} is not supported at this time.`
    );
  }
);

export const bankA = implement(
  define({
    name: 'bankA',
    input: ioTs(t.string),
    output: ioTs(t.number),
    context: {
      bankAUrl: ioTs(t.string)
    }
  }),
  (reference, { runChild, context: { bankAUrl } }) =>
    httpRequest({
      url: `${bankAUrl}/accounts/${reference}`,
      method: 'get'
    })
      .pipe(runChild)
      .pipe(map(response => response.balance))
);

export const bankB = implement(
  define({
    name: 'bankB',
    input: ioTs(t.string),
    output: ioTs(t.number),
    context: {
      bankBUrl: ioTs(t.string)
    }
  }),
  (reference, { runChild, context: { bankBUrl } }) => {
    const path = reference.startsWith('S') ? 'savings' : 'investments';

    return httpRequest({
      url: `${bankBUrl}/${path}/${reference}`,
      method: 'get'
    })
      .pipe(runChild)
      .pipe(map(response => parseFloat(response.balance)));
  }
);
