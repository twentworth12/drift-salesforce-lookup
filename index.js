const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const request = require('superagent');
const sf_token = process.env.SF_TOKEN

const CONVERSATION_API_BASE = process.env.QA ? 'https://driftapi.com/conversations' : 'https://driftapi.com/conversations'
const CONTACT_API_BASE = process.env.QA ? 'https://driftapi.com/contacts' : 'https://driftapi.com/contacts'

const TOKEN = process.env.BOT_API_TOKEN



function handleMessage(orgId, data) {
  if (data.type === 'private_note') {
    console.log('found a private note!')
    const messageBody = data.body
    const conversationId = data.conversationId
    console.log('converation id = ' + conversationId)
    console.log('org id = ' + orgId)

    if (messageBody.startsWith('/lookup')) {
        console.log('found a lookup action!')
      return returnMessage(conversationId, contactCallback, orgId)
    }
  }
}


// request function
function returnMessage(conversationId, callbackFn, orgId) {

  console.log('converation id 2 = ' + conversationId)
  console.log('org id 2 = ' + orgId)
      
  request
   .get(CONVERSATION_API_BASE + `${conversationId}`)
    .set('Content-Type', 'application/json')
    .set(`Authorization`, `bearer ${TOKEN}`)
   .end(function(err, res){
       callbackFn(res.body.data.contactId, conversationId, orgId)
     });
}

// call back function
function contactCallback(contactId, conversationId, orgId) { 
    console.log('contact ID is : ' + contactId)
    return getContactEmail(contactId, emailCallback, conversationId, orgId);
}

function getContactEmail (contactId, callbackFn, conversationId, orgId) {

    console.log('contact id 2 = ' + contactId)
    console.log('converation id 3 = ' + conversationId)

request
  .get(CONTACT_API_BASE + `${contactId}`)
  .set(`Authorization`, `bearer ${TOKEN}`)
  .set('Content-Type', 'application/json')
  .end(function (err, res) {
        callbackFn(res.body.data.attributes.email, conversationId, orgId)
     });
}

// call back function
function emailCallback(emailAddress, conversationId, orgId) { 
    console.log('email is: ' + emailAddress)
    console.log('converation id 4 = ' + conversationId)
    return callSF(emailAddress, sfCallback, conversationId, orgId)
}

function callSF(emailAddress, callbackFn, conversationId, orgId) {

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
	  	  
	  callbackFn(result.records[0].FirstName, conversationId, orgId)
	  
	  
	});

}

// call back function
function sfCallback(body, conversationId) { 
    console.log('body is : ' + body)
    return sendMessage(body, conversationId, orgId)
}

function sendMessage(body, conversationId, orgId) {

  const message = {
    'orgId': orgId,
    'body': '<b>Testing 1-2-3</b><br/>Does this work',
    'type': replace ? 'edit' : 'private_prompt',
  }

    console.log('message is : ' + message)

  return request.post(CONVERSATION_API_BASE + `/${conversationId}/messages`)
    .set('Content-Type', 'application/json')
    .set(`Authorization`, `bearer ${TOKEN}`)
    .send(message)
    .catch(err => console.log(err))
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
