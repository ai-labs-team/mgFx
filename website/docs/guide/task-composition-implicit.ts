import { define, implement } from 'mgfx';
import { ioTs, t } from '@mgfx/validator-iots';

const def = define({
  name: 'lastCommenter',
  input: ioTs(t.void),
  output: ioTs(
    t.type({
      name: t.string,
      email: t.string,
    })
  ),
});

const impl = implement(def, (input, environment) => {
  return (
    environment
      // highlight-next-line
      .runChild(fetchComments())
      .chain((comments) => {
        const lastComment = comments[comments.length - 1];
        // highlight-next-line
        return environment.runChild(fetchUser(lastComment.userId));
      })
  );
});

// A more compact example using destructuring and `.map()`:
const prettyImpl = implement(def, (input, { runChild }) =>
  runChild(fetchComments())
    .map((comments) => comments[comments.length - 1].userId)
    .chain((userId) => runChild(fetchUser(userId)))
);
