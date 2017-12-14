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

const createReponseMessage = ({ orgId, editedMessageId, replace = false, conversationId, body}) => {

  const message = {
    'orgId': orgId,
    'body': body,
    'type': replace ? 'edit' : 'private_prompt',
  }
  return replace ? Object.assign(message, { editedMessageId, editType: 'replace' }) : message
}


const SendMessage = (orgId, conversationId, messageId, editedMessageId, replace = false) => {
  return sendMessage(conversationId, getContactId(conversationId, contactCallback, orgId, editedMessageId, replace, conversationId ))
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



// request function
function getContactId(conversationID, callbackFn, orgId, editedMessageId, replace) {
  request
   .get(CONVERSATION_API_BASE + `${conversationID}`)
    .set('Content-Type', 'application/json')
    .set(`Authorization`, `bearer ${TOKEN}`)
   .end(function(err, res){
       callbackFn(res.body.data.contactId, orgId, editedMessageId, replace, conversationId)
     });
}

// call back function
function contactCallback(contactId, orgId, editedMessageId, replace, conversationId ) { 
    console.log('contact ID is : ' + contactId)
    return getContactEmail(contactId, emailCallback, orgId, editedMessageId, replace, conversationId);
}

function getContactEmail (contactId, callbackFn, orgId, editedMessageId, replace, conversationId ) {

request
  .get(CONTACT_API_BASE + `${contactId}`)
  .set(`Authorization`, `bearer ${TOKEN}`)
  .set('Content-Type', 'application/json')
  .end(function (err, res) {
        callbackFn(res.body.data.attributes.email, orgId, editedMessageId, replace, conversationId )
     });
}


// call back function
function emailCallback(emailAddress, orgId, editedMessageId, replace, conversationId) { 
    console.log('email is: ' + emailAddress)
    return callSF(emailAddress, orgId, editedMessageId, replace, conversationId )
}

function callSF(emailAddress, orgId, editedMessageId, replace, conversationId ) {

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
	  console.log(Object.values(result));
	  
	  var body = "testme 123";
	  
	  createReponseMessage({ orgId, editedMessageId, replace, conversationId, body })


	});

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
