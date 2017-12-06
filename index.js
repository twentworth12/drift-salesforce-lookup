const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const request = require('superagent');
const sf_token = process.env.SF_TOKEN

const CONVERSATION_API_BASE = process.env.QA ? 'https://driftapi.com/v1/conversations' : 'https://driftapi.com/v1/conversations'

const TOKEN = process.env.BOT_API_TOKEN


const sendMessage = (conversationId, message) => {
  return request.post(CONVERSATION_API_BASE + `/${conversationId}/messages`)
    .set('Content-Type', 'application/json')
    .set(`Authorization`, `bearer ${TOKEN}`)
    .send(message)
    .catch(err => console.log(err))
}

const createReponseMessage = ({ orgId, editedMessageId, replace = false}) => {
  const message = {
    'orgId': orgId,
    'body': '<b>Testing 1-2-3</b><br/>Does this work',
    'type': replace ? 'edit' : 'private_prompt',
  }
  return replace ? Object.assign(message, { editedMessageId, editType: 'replace' }) : message
}


const SendMessage = (orgId, conversationId, messageId, editedMessageId, replace = false) => {
  return sendMessage(conversationId, createReponseMessage({ orgId, editedMessageId, replace }))
    .catch(err => console.log(err))
}

const handleMessage = (orgId, data) => {
  if (data.type === 'private_note') {
    console.log('found a private note!')
    const messageBody = data.body
    const conversationId = data.conversationId
    if (messageBody.startsWith('/lookup')) {
        console.log('found a lookup action!')
      return SendMessage(orgId, conversationId, conversationId, data.id)
    }
  }
}

var jsforce = require('jsforce');
var conn = new jsforce.Connection({
  instanceUrl : 'https://na52.salesforce.com',
  accessToken : sf_token
});


var records = [];
conn.query("SELECT Id, Email, FirstName, LastName FROM Lead where Id = '00Qd000000qOHR7'", function(err, result) {
  if (err) { return console.error(err); }

  var firstName = result.records[0].FirstName;
  var lastName = result.records[0].LastName;
  var email = result.records[0].Email;

  console.log(firstName, lastName, email);

});


var getConversation = function() {

  console.log('found a conversation!')
  var url = "https://driftapi.com/conversations/44756351";

  return fetch(url, {
      method: 'POST',
      headers: {
          'Authorization': 'bearer ' + TOKEN,
          'Content-Type': 'application/json',
      }

  })
  .then(function(response) {
    return response.text();
  })
  .then(function(data){
    console.log(data); //this will just be text
    var data_obj = JSON.parse('conversation: ' + data);
    return data_obj
  })

}


app.use(bodyParser.json())
app.listen(process.env.PORT || 3000, () => console.log('Example app listening on port 3000!'))
app.post('/api', (req, res) => {
      console.log('API call!')
  if (req.body.type === 'new_message') {
    console.log('found a message!');
    var conversation = getConversation();
    handleMessage(req.body.orgId, req.body.data);
  }
  return res.send('ok')
})
