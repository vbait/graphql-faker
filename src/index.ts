#!/usr/bin/env node

import chalk from 'chalk';
import cors from 'cors';
import express from 'express';
import * as fs from 'fs';
import { execute, ExecutionArgs, printSchema, Source } from 'graphql';
import { createHandler } from 'graphql-http/lib/use/express';
import open from 'open';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { parseCLI } from './cli.js';
import {
  buildWithFakeDefinitions,
  ValidationErrors,
} from './fake_definition.js';
import { fakeFieldResolver, fakeTypeResolver } from './fake_schema.js';
import { getProxyExecuteFn } from './proxy.js';
import { existsSync, getRemoteSchema, readSDL } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const log = console.log;

const cliOptions = parseCLI();

const { fileName, extendURL, headers, forwardHeaders } = cliOptions;

let userSDL = existsSync(fileName) && readSDL(fileName);

if (extendURL) {
  // run in proxy mode
  getRemoteSchema(extendURL, headers)
    .then((schema) => {
      const remoteSDL = new Source(
        printSchema(schema),
        `Introspection from "${extendURL}"`,
      );

      if (!userSDL) {
        let body = fs.readFileSync(
          path.join(__dirname, 'default-extend.graphql'),
          'utf-8',
        );

        const rootTypeName = schema.getQueryType().name;
        body = body.replace('___RootTypeName___', rootTypeName);

        userSDL = new Source(body, fileName);
      }

      const executeFn = getProxyExecuteFn(extendURL, headers, forwardHeaders);
      runServer(cliOptions, userSDL, remoteSDL, executeFn);
    })
    .catch((error) => {
      log(chalk.red(error.stack));
      process.exit(1);
    });
} else {
  if (!userSDL) {
    userSDL = new Source(
      fs.readFileSync(path.join(__dirname, 'default-schema.graphql'), 'utf-8'),
      fileName,
    );
  }
  runServer(cliOptions, userSDL);
}

function runServer(
  options,
  userSDL: Source,
  remoteSDL?: Source,
  customExecuteFn?: (args: ExecutionArgs) => unknown,
) {
  const { port, openEditor } = options;
  const corsOptions = {
    credentials: true,
    origin: options.corsOrigin,
  };
  const app = express();

  let schema;
  try {
    schema = remoteSDL
      ? buildWithFakeDefinitions(remoteSDL, userSDL)
      : buildWithFakeDefinitions(userSDL);
  } catch (error) {
    if (error instanceof ValidationErrors) {
      prettyPrintValidationErrors(error);
    } else {
      // e.g. a GraphQL syntax error from the SDL. Fail loud instead of
      // starting the server with an undefined schema.
      log(chalk.red(error instanceof Error ? error.message : String(error)));
    }
    process.exit(1);
  }

  app.use('/graphql', cors(corsOptions));

  // Serve the GraphiQL IDE for browser requests; forward everything else
  // (API clients, GraphQL over GET) to the graphql-http handler below.
  app.get('/graphql', (req, res, next) => {
    if (req.accepts(['json', 'html']) === 'html') {
      res.type('html').send(graphiqlHTML);
    } else {
      next();
    }
  });

  app.all(
    '/graphql',
    createHandler({
      schema,
      context: (req) => req.raw as any,
      execute: (args) =>
        (customExecuteFn ?? execute)({
          ...args,
          fieldResolver: fakeFieldResolver,
          typeResolver: fakeTypeResolver,
        }),
    }),
  );

  const server = app.listen(port);

  const shutdown = () => {
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  log(`\n${chalk.green('✔')} Your GraphQL Fake API is ready to use 🚀
  Here are your links:

  ${chalk.blue('❯')} GraphQL API:  http://localhost:${port}/graphql
  ${chalk.blue('❯')} GraphiQL IDE: http://localhost:${port}/graphql

  `);

  if (openEditor) {
    setTimeout(() => open(`http://localhost:${port}/graphql`), 500);
  }
}

const graphiqlHTML = /* HTML */ `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>GraphQL Faker — GraphiQL</title>
      <style>
        body {
          margin: 0;
        }
        #graphiql {
          height: 100vh;
        }
      </style>
      <link
        rel="stylesheet"
        href="https://unpkg.com/graphiql@3/graphiql.min.css"
      />
    </head>
    <body>
      <div id="graphiql">Loading GraphiQL…</div>
      <script
        crossorigin
        src="https://unpkg.com/react@18/umd/react.production.min.js"
      ></script>
      <script
        crossorigin
        src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"
      ></script>
      <script
        crossorigin
        src="https://unpkg.com/graphiql@3/graphiql.min.js"
      ></script>
      <script>
        const root = ReactDOM.createRoot(document.getElementById('graphiql'));
        root.render(
          React.createElement(GraphiQL, {
            fetcher: GraphiQL.createFetcher({ url: '/graphql' }),
            defaultEditorToolsVisibility: true,
          }),
        );
      </script>
    </body>
  </html>`;

function prettyPrintValidationErrors(validationErrors: ValidationErrors) {
  const { subErrors } = validationErrors;
  log(
    chalk.red(
      subErrors.length > 1
        ? `\nYour schema contains ${subErrors.length} validation errors: \n`
        : `\nYour schema contains a validation error: \n`,
    ),
  );

  for (const error of subErrors) {
    const [message, ...otherLines] = error.toString().split('\n');
    log([chalk.yellow(message), ...otherLines].join('\n') + '\n\n');
  }
}
