#!/usr/bin/env node
'use strict';
const commander =  require('commander');
const https = require('https');
const fs = require('fs');
const csvSync = require('csv-parse/lib/sync');

commander
    .version('1.0.0')
    .option('-w --webhook <Webhook Type>', 'Github Webhook Type', /^(pr|issue|prcomment|issuecomment)$/)
    .option('-r, --room <RoomId>', 'Chatwork RoomId')
    .option('-t, --token <Token>', 'Chatwork Token')
    .option('-m, --mapping <MappingFilePath>', 'Mapping CSVFile(GithubAccount,ChatworkId)')
    .parse(process.argv);

let inputPayload = '';
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
    chunk.split('\n').forEach((v) => {
        inputPayload += v;
    });
});
    
process.stdin.on('end', function(){
    checkRequireArguments(commander);
    const payload = JSON.parse(inputPayload);
    const members = getMembersFromMappingFile(commander.mapping);
    sendMessage(commander.webhook, payload, commander.room, commander.token, members);
});

const checkRequireArguments = (commander) => {
    if (!(commander.webhook && commander.room && commander.token)) {
        error('\n  error: required option missing (wehhook, room, token)');
    }
}

const getMembersFromMappingFile = (file) => {
    if (!file) return [];
    const mappingData = csvSync(fs.readFileSync(file));
    if (mappingData.some(v => v.length !== 2)) {
        error('\n  error: invalid format mapping file\n');
    }
    return mappingData.map(v => {
        return {git_name: v[0], cw_id: v[1]};
    });
}

const sendMessage = (webhook, payload, roomId, chatworkToken, members) => {
    const HOST = 'api.chatwork.com';
    const PATH = '/v2/rooms/' + roomId + '/messages';
    let message;
    switch(webhook) {
        case 'pr':
            message = getPullRequestMessage(payload, members);
            break;
        case 'issue':
            message = getIssueMessage(payload, members);
            break;
        case 'prcomment':
            message = getPullRequestCommentMessage(payload, members);
            break;
        case 'issuecomment':
            message = getIssueCommentMessage(payload, members);
            break;
        default:
            error('\n  error: invalid webhook\n');
    }

    if (message) {
        const options = {
            host: HOST,
            path: PATH + '?body=' + encodeURIComponent(message),
            method: 'POST',
            headers: {
              'X-ChatWorkToken': chatworkToken
            }
        };

        const req = https.request(options, function (res) {
            console.log('STATUS: ' + res.statusCode);
            console.log('HEADERS: ' + JSON.stringify(res.headers));
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
              console.log('BODY: ' + chunk);
            });
        });
        req.on('error', function (e) {
            console.log('problem with request: ' + e.message);
        });
        req.end();
    }
}

const getPullRequestMessage = (payload, members) => {
    const actionType = payload.action;
    const pullRequest = payload. pull_request;
    const sender = payload.sender;
    const messagePrefix = pullRequest.title + '\n' + pullRequest. html_url;
    const actions = {
        opened: {
            prefix: '',
            title: 'Pull Requestが発行されました！ by : ' + createChatworkName(pullRequest.user.login, members),
            message: messagePrefix + '\n\n' + createBodyWithChatworkName(pullRequest.body, members)
        },
        closed: {
          prefix: 'To : ' + createChatworkName(pullRequest.user.login, members),
          title: 'Pull Requestが' + (pullRequest. merged ? 'マージ' : 'クローズ') + 'されました！ by : ' + createChatworkName(sender.login, members),
          message: messagePrefix
        },
         reopened: {
           prefix: 'To : ' + createChatworkName(pullRequest.user.login, members),
           title: 'Pull Requestが再オープンされました！ by : ' + createChatworkName(sender.login, members),
           message: messagePrefix
        }
    };
    const action = actions[actionType];
    if (action) return action.prefix + '[info][title]' + action.title + '[/title]' + action.message + '[/info]';
}

const getIssueMessage = (payload, members) => {
    const actionType = payload.action;
    const issue = payload. issue;
    const sender = payload.sender;
    const messagePrefix = issue.title + '\n' + issue. html_url;
    const actions = {
        opened: {
            prefix: '',
            title: 'issueが発行されました！ by : ' + createChatworkName(issue.user.login, members),
            message: messagePrefix + '\n\n' + createBodyWithChatworkName(issue.body, members)
        },
        closed: {
          prefix: 'To : ' + createChatworkName(issue.user.login, members),
          title: 'issueがクローズされました！ by : ' + createChatworkName(sender.login, members),
          message: messagePrefix
        },
         reopened: {
           prefix: 'To : ' + createChatworkName(issue.user.login, members),
           title: 'issueが再オープンされました！ by : ' + createChatworkName(sender.login, members),
           message: messagePrefix
        }
    };
    const action = actions[actionType];
    if (action) return action.prefix + '[info][title]' + action.title + '[/title]' + action.message + '[/info]';
}

const getPullRequestCommentMessage = (payload, members) => {
    const actionType = payload.action;
    const pr = payload. pull_request;
    const comment = payload.comment;
    if (actionType === 'created') {
        const messageBody = pr.title + '\n' + comment.html_url + '\n\n' + createBodyWithChatworkName(comment.body, members);
        return 'To : ' + createChatworkName(pr.user.login, members) + '[info][title]Pull Requestへのコメントがありました！ From : ' + createChatworkName(comment.user.login, members) + '[/title]' + messageBody + '[/info]';
    }
}

const getIssueCommentMessage = (payload, members) => {
    const actionType = payload.action;
    const issue = payload. issue;
    const comment = payload.comment;
    if (actionType === 'created') {
        const messageType = (issue.pull_request ? 'Pull Request' : 'issue');
        const messageBody = issue.title + '\n' + comment. html_url + '\n\n' + createBodyWithChatworkName(comment.body, members);
        return 'To : ' + createChatworkName(issue.user.login, members) + '[info][title]' + messageType + 'へのコメントがありました！ From : ' + createChatworkName(comment.user.login, members) + '[/title]' + messageBody + '[/info]';
    }
}

const createChatworkName = (git_name, members) => {
    const targetMembers = members.filter(v => v.git_name === git_name);
    if (targetMembers.length > 0) {
        return '[To:' + targetMembers[0].cw_id + ']';
    }
    return git_name;
}

const createBodyWithChatworkName = (body, members) => {
    let replacedBody = body;
    members.forEach(v => {
        const mentionString = '@' + v.git_name;
        const mentionRegExp = new RegExp(mentionString + '([^A-Za-z0-9\-]|$)', 'g')
        replacedBody = replacedBody.replace(mentionRegExp, '[To:' + v.cw_id + ']$1');
    });
    return replacedBody;
}

const error = (message) => {
    console.log(message);
    process.exit(1);
};