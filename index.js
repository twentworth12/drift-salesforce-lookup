const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const request = require('superagent');
const sf_token = process.env.SF_TOKEN
const sf_user = process.env.SF_USER
const sf_pass = process.env.SF_PASS

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

const handleMessage = (orgId, data) => {
  if (data.type === 'private_note') {
    console.log('found a private note!')
    const messageBody = data.body
    const conversationId = data.conversationId

    getContactId(data.conversationId, contactCallback)

    
    // getContactEmail(data.conversationId, emailCallback)
    
    if (messageBody.startsWith('/lookup')) {
        console.log('found a lookup action!')
      return SendMessage(orgId, conversationId, conversationId, data.id)
    }
  }
}



// request function
function getContactId(conversationID, callbackFn) {
  request
   .get(CONVERSATION_API_BASE + `${conversationID}`)
    .set('Content-Type', 'application/json')
    .set(`Authorization`, `bearer ${TOKEN}`)
   .end(function(err, res){
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
  .get(CONTACT_API_BASE + `/234452591`)
  .set(`Authorization`, `bearer ${TOKEN}`)
  .set('Content-Type', 'application/json')
  .end(function (err, res) {
        callbackFn(res.body.data.attributes.email)
     });
}


// call back function
function emailCallback(emailAddress) { 
    console.log('email is: ' + emailAddress)
    return callSF(emailAddress, returnSFMessage)
}

function callSF(emailAddress, callbackFn) {

	var jsforce = require('jsforce');
	var conn = new jsforce.Connection({
	  oauth2 : {
		// you can change loginUrl to connect to sandbox or prerelease env.
		// loginUrl : 'https://na52.salesforce.com',
		clientId : '3MVG9rFJvQRVOvk6O6Jp9PiHT9vMu_HqB4.xiqza6gtSLBQKGtc7q.Hrj.ahNIMEvQkNz93VPEyg3g7X0d3pZ',
		clientSecret : '2131124073545412448',
		redirectUri : '#'
	  }
	});
	conn.login(sf_user, sf_pass, function(err, userInfo) {
	  if (err) { return console.error(err); }
	  // Now you can get the access token and instance URL information.
	  // Save them to establish connection next time.
	  console.log(conn.accessToken);
	  console.log(conn.instanceUrl);
	  // logged in user property
	  console.log("User ID: " + userInfo.id);
	  console.log("Org ID: " + userInfo.organizationId);
	  // ...
	});


	var records = [];
	conn.query("SELECT Id, Email, FirstName, LastName FROM Lead where Id = '00Qd000000qOHR7'", function(err, result) {
	  if (err) { return console.error(err); }

	  var firstName = result.records[0].FirstName;
	  var lastName = result.records[0].LastName;
	  var email = result.records[0].Email;

	  console.log(firstName, lastName, email);

	});


}

// call back function
function returnSFMessage(emailAddress) { 
    console.log('email is: ' + emailAddress)
    return callSF(emailAddress, returnSFMessage)
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
