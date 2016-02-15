gh-voting

A simple +1/:+1: vote calculator for gh issues

## Purpose

This utility allows to calculate vote comments in GitHub repository issues.


      Usage
        $ ./votesCalculator.js <options>
    
      Options
        -r, --repo    Github repository shorthand url: `someone/something`
        -t, --token   Github personal access token
        -v, --vote    String representation of a regular expression to match
                      comments against. Comments that match are treated as a vote.
        -s, --since   Date (ISO 8601) after which comments will be counted.
        -u, --unique  Should votes be unique? Available options:
                      - 'globally' - one vote per repo
                      - 'locally' - one vote per issue, many votes per repo
                      - 'none' - many votes per issue
        -c, -count    Which vote should be counted: first or last
