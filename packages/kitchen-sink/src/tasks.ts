import { implement, define } from 'mgfx';
import { ioTs, t } from '@mgfx/validator-iots';
import { coalesce, FutureInstance, map, parallel } from 'fluture';
import { retryLinearly } from 'fluture-retry';
import { Either, isRight, left, right } from 'fp-ts/lib/Either';
import { httpRequest } from '@mgfx/task-http-request';

const parallelToleratingFailure = <L, R, T extends FutureInstance<L, R>>(
  concurrency: number
) => (futures: T[]) => {
  const coalesced = futures.map((future) =>
    future.pipe(coalesce<any, Either<L, R>>(left)(right))
  );

  return parallel(concurrency)(coalesced).pipe(
    map((values) => values.filter(isRight).map((value) => value.right))
  );
};

export const refresh = implement(
  define({
    name: 'refresh',
    input: ioTs(
      t.union([
        t.type({ accountId: t.number }),
        t.type({ userId: t.number }),
        t.type({ groupId: t.number }),
      ])
    ),
    output: ioTs(t.array(t.number)),
  }),
  (params, { runChild }) => {
    if ('accountId' in params) {
      return runChild(refreshAccount(params.accountId)).map(() => [
        params.accountId,
      ]);
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
    output: ioTs(t.number),
  }),
  (accountId, { runChild }) =>
    runChild(getAccount(accountId))
      .chain((account) =>
        runChild(
          getBalance({
            institution: account.institution,
            reference: account.reference,
          })
        )
      )
      .chain((balance) => runChild(updateBalance({ accountId, balance })))
      .map(() => accountId)
      .pipe(retryLinearly)
);

export const refreshUserAccounts = implement(
  define({
    name: 'refreshUserAccounts',
    input: ioTs(t.number),
    output: ioTs(t.array(t.number)),
  }),
  (userId, { runChild }) =>
    runChild(getUserAccountIds(userId))
      .map((accountIds) =>
        accountIds.map((accountId) => runChild(refreshAccount(accountId)))
      )
      .chain(parallelToleratingFailure(2))
);

export const refreshGroupAccounts = implement(
  define({
    name: 'refreshGroupAccounts',
    input: ioTs(t.number),
    output: ioTs(t.array(t.number)),
  }),
  (groupId, { runChild }) =>
    runChild(getGroupUserIds(groupId))
      .map((userIds) =>
        userIds.map((userId) => runChild(refreshUserAccounts(userId)))
      )
      .chain(parallel(2))
      .map((ids) => ids.reduce((result, ids) => result.concat(ids)))
);

const account = ioTs(
  t.type({
    institution: t.string,
    reference: t.string,
  })
);

export const getAccount = implement(
  define({
    name: 'getAccount',
    input: ioTs(t.number),
    output: account,
    context: {
      coreUrl: ioTs(t.string),
    },
  }),
  (accountId, { runChild, context: { coreUrl } }) =>
    runChild(
      httpRequest({
        url: `${coreUrl}/accounts/${accountId}`,
        method: 'get',
      })
    ).map((account) => ({
      institution: account.institution,
      reference: account.institution_reference,
    }))
);

export const getUserAccountIds = implement(
  define({
    name: 'getUserAccountIds',
    input: ioTs(t.number),
    output: ioTs(t.array(t.number)),
    context: {
      coreUrl: ioTs(t.string),
    },
  }),
  (userId, { runChild, context: { coreUrl } }) =>
    runChild(
      httpRequest({
        url: `${coreUrl}/accounts?user_id=${userId}`,
        method: 'get',
      })
    ).map((accounts) => accounts.map((account: any) => account.id))
);

export const getGroupUserIds = implement(
  define({
    name: 'getGroupUserIds',
    input: ioTs(t.number),
    output: ioTs(t.array(t.number)),
    context: {
      coreUrl: ioTs(t.string),
    },
  }),
  (groupId, { runChild, context: { coreUrl } }) =>
    runChild(
      httpRequest({
        url: `${coreUrl}/group_memberships?group_id=${groupId}&role=user`,
        method: 'get',
      })
    ).map((members) => members.map((member: any) => member.user_id))
);

export const updateBalance = implement(
  define({
    name: 'updateBalance',
    input: ioTs(
      t.type({
        accountId: t.number,
        balance: t.number,
      })
    ),
    output: ioTs(t.void),
    context: {
      coreUrl: ioTs(t.string),
    },
  }),
  ({ accountId, balance }, { runChild, context: { coreUrl } }) =>
    runChild(
      httpRequest({
        url: `${coreUrl}/accounts/${accountId}`,
        method: 'patch',
        data: {
          balance,
          last_refreshed: Date.now(),
        },
      })
    ).map(() => undefined)
);

export const getBalance = implement(
  define({
    name: 'getBalance',
    input: account,
    output: ioTs(t.number),
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
      bankAUrl: ioTs(t.string),
    },
  }),
  (reference, { runChild, context: { bankAUrl } }) =>
    runChild(
      httpRequest({
        url: `${bankAUrl}/accounts/${reference}`,
        method: 'get',
      })
    ).map((response) => response.balance)
);

export const bankB = implement(
  define({
    name: 'bankB',
    input: ioTs(t.string),
    output: ioTs(t.number),
    context: {
      bankBUrl: ioTs(t.string),
    },
  }),
  (reference, { runChild, context: { bankBUrl } }) => {
    const path = reference.startsWith('S') ? 'savings' : 'investments';

    return runChild(
      httpRequest({
        url: `${bankBUrl}/${path}/${reference}`,
        method: 'get',
      })
    ).map((response) => parseFloat(response.balance));
  }
);

export { httpRequest };
