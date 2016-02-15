#!/usr/bin/env node

'use strict';

const calculateVotes = require('./src/votes-calculator');
const meow = require('meow');
const pkg = require('./package.json');
const prompt = require('prompt');

require('bluebird').promisifyAll(prompt);
require('colors');

const promptSchema = {
  properties: {
    repo: {
      pattern: require('github-short-url-regex')({exact: true}),
      required: true,
    },
    token: {
      description: 'Personal access token. Go to' +
      'https://github.com/settings/tokens to acquire one. Without it you' +
      'may not be able to fetch all required data because of rate limits.',
      pattern: require('sha1-regex'),
    },
    vote: {
      description: 'Regular expression to match comment body against to' +
      ' determine if it\'s a vote or not',
      default: '\\+1',
    },
    since: {
      description: 'Then the voting starts. ISO 8601 formatted date',
      pattern: require('regex-iso-date')(),
    },
    unique: {
      default: 'locally',
      pattern: /^(globally|locally|none)$/,
    },
    count: {
      description: 'If globally-unique is set to true this setting decides' +
      ' if first or last vote counts',
      pattern: /^(first|last)$/,
      default: 'first',
    },
  },
};

const cli = meow(`
  Usage
    $ ./${ pkg.main } <options>

  Options
    -r, --repo    Github repository shorthand url: \`someone/something\`
    -t, --token   Github personal access token
    -v, --vote    String representation of a regular expression to match
                  comments against. Comments that match are treated as a vote.
    -s, --since   Date (ISO 8601) after which comments will be counted.
    -u, --unique  Should votes be unique? Available options:
                  - 'globally' - one vote per repo
                  - 'locally' - one vote per issue, many votes per repo
                  - 'none' - many votes per issue
    -c, -count    Which vote should be counted: first or last
`, {
  alias: {
    r: 'repo',
    t: 'token',
    v: 'vote',
    s: 'since',
    u: 'unique',
    c: 'count',
    h: 'help',
  },
});

if (!cli.flags.help) {
  prompt.start();
  prompt.override = cli.flags;

  prompt
    .getAsync(promptSchema)
    .then(calculateVotes)
    // Note: Too bad we don't have destructuring yet
    .then(report => {
      const summary = report.summary;
      const table = report.table;

      console.log(`${ summary.allIssues } issues`.red);
      console.log(`${ summary.allComments } comments`.red);
      console.log(`${ summary.uninqueCommenters } users commented`.red);
      console.log(`${ summary.uniqueVotes } votes`.red);

      console.log(table.toString());
    });
}
