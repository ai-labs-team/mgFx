import express from 'express';
import bodyParser from 'body-parser';
import { singleProcess } from 'mgfx';
import { ExpressRouteFactory } from '@mgfx/express-route-factory';
import { Timeout } from '@mgfx/tasks';

const { scheduler } = singleProcess({
  tasks: [
    Timeout
  ]
});

const app = express();
app.use(bodyParser.json());

const router = new ExpressRouteFactory({
  app,
  context: scheduler.createContext({
    labels: {
      name: 'express'
    }
  })
});

router.route('/', {
  get: (req, res) => {
    req.exec(Timeout, 100)
      .then(() => res.send('Hello World!'));
  },

  post: (req, res) => {
    req.exec(Timeout, 100)
      .then(() => res.send(`Hello ${req.body.name}!`));
  }
});

app.listen(8000);
