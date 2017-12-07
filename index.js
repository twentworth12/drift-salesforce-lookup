const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const request = require('superagent');
const sf_token = process.env.SF_TOKEN

const CONVERSATION_API_BASE = process.env.QA ? 'https://driftapi.com/conversations' : 'https://driftapi.com/conversations'
const CONTACT_API_BASE = process.env.QA ? 'https://driftapi.com/contacts' : 'https://driftapi.com/contacts'

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


function getContactId(conversationID) {

 request
   .get(CONVERSATION_API_BASE + `/${conversationId}`)
    .set('Content-Type', 'application/json')
    .set(`Authorization`, `bearer ${TOKEN}`)
   .end(function(err, res){
     if (err || !res.ok) {
       console.log('Oh no! error');
     } else {
       console.log('getContactId: ' + res.body.data.contactId)
       return JSON.stringify(res.body.data.contactId)
     }
   });
}




function getContactEmail(contactId) {

request
  .get(CONTACT_API_BASE + `/${contactId}`)
  .set(`Authorization`, `bearer ${TOKEN}`)
  .set('Content-Type', 'application/json')
  .end(function (err, res) {
    if (err) {
      console.log(err)
    } else {
      console.log('getContactEmail: ' + JSON.stringify(res.body.data.attributes.email))
      return res.body.data.attributes.email
    }
  })
}

const handleMessage = (orgId, data) => {
  if (data.type === 'private_note') {
    const messageBody = data.body
    const conversationId = data.conversationId

	contactId = getContactId(conversationId)
    
    if (messageBody.startsWith('/lookup')) {
        console.log('found a lookup action!')
      return SendMessage(orgId, conversationId, conversationId, data.id)
    }
  }
}


app.use(bodyParser.json())
app.listen(process.env.PORT || 3000, () => console.log('Example app listening on port 3000!'))
app.post('/api', (req, res) => {
  if (req.body.type === 'new_message') {
    console.log('found a new message!');
    handleMessage(req.body.orgId, req.body.data);
  }
  return res.send('ok')
})



/*

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

*/
