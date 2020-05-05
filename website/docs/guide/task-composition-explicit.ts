import { define, localConnector } from 'mgfx';
import { ioTs, t } from '@mgfx/validator-iots';

const fetchComments = define({
  name: 'fetchComments',
  input: ioTs(t.void),
  output: ioTs(
    t.array(
      t.type({
        id: t.number,
        userId: t.number,
        body: t.string,
      })
    )
  ),
});

const fetchUser = define({
  name: 'fetchUser',
  input: ioTs(t.number),
  output: ioTs(
    t.type({
      name: t.string,
      email: t.string,
    })
  ),
});

const connector = localConnector();

connector
  .run(fetchComments())
  .chain((comments) => {
    // Explicit composition;
    // Feed output of one `connector.run()` as input to another `connector.run()`
    const lastComment = comments[comments.length - 1];
    return connector.run(fetchUser(lastComment.userId));
  })
  .value((user) => {
    // We now have the user who left the last comment
  });
