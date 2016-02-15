'use strict';

const _ = require('lodash');
const ghGot = require('gh-got');
const Promise = require('bluebird');
const Table = require('cli-table');

const tableStub = new Table({
  head: [
    '#',
    'Contender',
    '% votes',
    'votes',
    'comments overall',
    'non-vote comments',
    'votes/comments %',
    'voters',
  ],
});

const api = {
  issues: ctx =>
    `repos/${ ctx.repo }/issues`,
  issuesComments: ctx =>
    `${ api.issues(ctx) }/comments?sort=updated&direction=${
    ctx.count === 'last' ? 'desc' : 'asc' }&since=${
    (new Date(ctx.since)).toISOString() }`,
};

const requestOptions = ctx => _.pick(ctx, 'token');
const isVote = ctx => comment => !!comment.body.match(new RegExp(ctx.vote));
const prettyPercent = float => `${ (float * 100).toFixed(2) || '0' }%`;

/**
 * @param {{repo: string, token: string, vote: string, since: string}} ctx
 * @returns {Promise.<{table: Table, summary: {
 *  allIssues: number,
 *  allComments: number,
 *  uniqueCommenters: number,
 *  uniqueVotes: number,
 * }}>}
 */
module.exports = ctx => Promise
// Acquire data
  .all([
    ghGot(api.issues(ctx), requestOptions(ctx)),
    ghGot(api.issuesComments(ctx), requestOptions(ctx)),
  ])
  .then(results => results.map(response => response.body))
  // Package it
  .then(results => ({
    issues: results[0],
    comments: results[1],
    ctx,
  }))
  // Process data
  // Note: Too bad we don't have destructuring yet
  .then(v => {
    const ctx = v.ctx;
    const issues = v.issues;
    const comments = v.comments;

    const allVotes = comments.filter(isVote(ctx));
    const commentsUniqueByUser = _.uniqBy(comments, _.property('user.id'));

    const votes = ctx.unique === 'globally' ?
      _.uniqBy(allVotes, _.property('user.id')) :
      allVotes;

    // Prepare intermediate data structures
    const commentsByIssue = _.groupBy(comments, 'issue_url');
    const votesByIssue = _.groupBy(votes, 'issue_url');

    return {
      summary: {
        allIssues: issues.length,
        allComments: comments.length,
        uninqueCommenters: commentsUniqueByUser.length,
        uniqueVotes: votes.length,
      },
      rawLines: issues.map(issue => {
        const issueVotes = votesByIssue[issue.url] || [];
        return {
          issue,
          comments: commentsByIssue[issue.url] || [],
          votes: ctx.unique === 'locally' ?
            _.uniqBy(issueVotes, _.property('user.id')) :
            issueVotes,
        };
      }),
    };
  })
  // Prepare the view
  .then(report => {
    const votesOverall = report.rawLines.reduce(
      (sum, rawLine) => sum += rawLine.votes.length,
      0
    );

    return {
      summary: report.summary,
      table: _(report.rawLines)
        .map(rawLine => ({
          contender: `${ rawLine.issue.title }(#${ rawLine.issue.number })`,
          percentVotes: prettyPercent(rawLine.votes.length / votesOverall),
          votesCount: rawLine.votes.length,
          commentsCount: rawLine.comments.length,
          nonVoteCommentCount: rawLine.comments.length - rawLine.votes.length,
          votesCommentsRatio:
            prettyPercent(rawLine.votes.length / rawLine.comments.length),
          voters: rawLine.votes.map(vote => vote.user.login).join(),
        }))
        .sortBy('votesCount')
        .reverse()
        .reduce((reportTable, line, __, array) => {
          reportTable.push([
            // Finding first index instead of using iteration index allows to
            // display ex aequo places correctly
            _.findIndex(array, ['votesCount', line.votesCount]) + 1,
            line.contender,
            line.percentVotes,
            line.votesCount,
            line.commentsCount,
            line.nonVoteCommentCount,
            line.votesCommentsRatio,
            line.voters,
          ]);
          return reportTable;
        }, tableStub),
    };
  })
  .catch(console.error.bind(console))
;
