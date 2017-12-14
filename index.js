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


const SendMessage = (orgId, conversationId, messageId) => {
  return sendMessage(conversationId, returnMessage(conversationID, contactCallback))
    .catch(err => console.log(err))
}

const handleMessage = (orgId, data) => {
  if (data.type === 'private_note') {
    console.log('found a private note!')
    const messageBody = data.body
    const conversationId = data.conversationId
    
    
    if (messageBody.startsWith('/lookup')) {
        console.log('found a lookup action!')
      return SendMessage(orgId, conversationId, data.id)
    }
  }
}



// request function
function returnMessage(conversationID, callbackFn) {
  request
   .get(CONVERSATION_API_BASE + `${conversationID}`)
    .set('Content-Type', 'application/json')
    .set(`Authorization`, `bearer ${TOKEN}`)
   .end(function(err, res){
       console.log('in return message')
       callbackFn(res.body.data.contactId)
     });
}

// call back function
function contactCallback(contactId) { 
    console.log('contact ID is : ' + contactId)
    return getContactEmail(contactId, emailCallback);
}

function getContactEmail (contactId, callbackFn) {

request
  .get(CONTACT_API_BASE + `${contactId}`)
  .set(`Authorization`, `bearer ${TOKEN}`)
  .set('Content-Type', 'application/json')
  .end(function (err, res) {
        callbackFn(res.body.data.attributes.email)
     });
}


// call back function
function emailCallback(emailAddress) { 
    console.log('email is: ' + emailAddress)
    return callSF(emailAddress, sfCallback)
}

function callSF(emailAddress, callbackFn) {

	var jsforce = require('jsforce');
	var conn = new jsforce.Connection({
	  instanceUrl : 'https://na52.salesforce.com',
	  accessToken : sf_token
	});

	var records = [];
	conn.query("SELECT Id, Email, FirstName, LastName FROM Lead where Email = '"+emailAddress+"'", function(err, result) {
	  if (err) { return console.error(err); }

	  var firstName = result.records[0].FirstName;
	  var lastName = result.records[0].LastName;
	  var email = result.records[0].Email;
	  	  
	  callbackFn(result.records[0].FirstName)


	});

}

// call back function
function sfCallback(body) { 
    console.log('body is ' + body);
    return body;
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
