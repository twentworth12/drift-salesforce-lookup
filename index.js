const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const request = require('superagent');

const DRIFT_TOKEN = process.env.BOT_API_TOKEN
const SF_TOKEN = process.env.SF_TOKEN

const CONVERSATION_API_BASE = 'https://driftapi.com/conversations'
const CONTACT_API_BASE = 'https://driftapi.com/contacts'


function handleMessage(orgId, data) {
  if (data.type === 'private_note') {
    const messageBody = data.body
    const conversationId = data.conversationId
    console.log('converation id = ' + conversationId)
    console.log('org id = ' + orgId)

    if (messageBody.startsWith('/lookup')) {
      return getContactId(conversationId, GetContactId, orgId)
    }
  }
}


// request function
function getContactId(conversationId, callbackFn, orgId) {

// Get the contact from Drift
  request
   .get(CONVERSATION_API_BASE + `${conversationId}`)
    .set('Content-Type', 'application/json')
    .set(`Authorization`, `bearer ${DRIFT_TOKEN}`)
   .end(function(err, res){
       callbackFn(res.body.data.contactId, conversationId, orgId)
     });
}

// call back function
function GetContactId(contactId, conversationId, orgId) { 
    return getContactEmail(contactId, GetContactEmail, conversationId, orgId);
}

function getContactEmail (contactId, callbackFn, conversationId, orgId) {

// Get the email address from Drift
request
  .get(CONTACT_API_BASE + `${contactId}`)
  .set(`Authorization`, `bearer ${DRIFT_TOKEN}`)
  .set('Content-Type', 'application/json')
  .end(function (err, res) {
        callbackFn(res.body.data.attributes.email, conversationId, orgId)
     });
}

// call back function
function GetContactEmail(emailAddress, conversationId, orgId) { 
    return querySalesforce(emailAddress, postMessage, conversationId, orgId)
}

function querySalesforce(emailAddress, callbackFn, conversationId, orgId) {

 if (typeof emailAddress != 'undefined') {

		var jsforce = require('jsforce');
		var conn = new jsforce.Connection({
		  instanceUrl : 'https://na52.salesforce.com',
		  accessToken : SF_TOKEN
		});

		var records = [];
		
	
			// Customize this to change the fields you return from the Lead object
			conn.query("SELECT Id, Email, FirstName, LastName, Company, Academics__c, Total_RM_Studio_starts__c, Last_RM_Studio_usage__c FROM Lead where Email = '" + emailAddress + "'", function(err, result) {
			  if (err) { return console.error(err); }

			  var firstName = result.records[0].FirstName;
			  var lastName = result.records[0].LastName;
			  var Id = result.records[0].Id;
			  var Company = result.records[0].Company;
	  
			  if (result.records[0].Last_RM_Studio_usage__c != null) {
				var lastStudioUsage = result.records[0].Last_RM_Studio_usage__c
			  } else {
				lastStudioUsage = "None"
			  }
	  
			  if (result.records[0].Total_RM_Studio_starts__c != null) {
				var totalStudioStarts = result.records[0].Total_RM_Studio_starts__c
			  } else {
				totalStudioStarts = "None"
			  }	  
	  
			  if (result.records[0].Academics__c != "") {
				var Academic = result.records[0].Academics__c
			  } else {
				Academic = "Nope"
			  }
	  
			  // Built the Drift reply body
			  body = "<a target='_blank' href=https://na52.salesforce.com/" + Id + ">" + firstName + " " + lastName + "</a><br/>" + "Company: " + Company + "<br/>Total Studio Starts: " + totalStudioStarts + "<br/>Last RM Studio Usage: " + lastStudioUsage + "<br/>Academic: " + Academic
			  callbackFn(body, conversationId, orgId)

	  
		});
		} else {
			body = "Oops, we didn't find an email address"
			callbackFn(body, conversationId, orgId)
			}


}

function postMessage(body, conversationId, orgId) { 

    const message = {
    'orgId': orgId,
    'body': body,
    'type': false ? 'edit' : 'private_prompt',
  }
  
  	// Send the message
    return request.post(CONVERSATION_API_BASE + `/${conversationId}/messages`)
    .set('Content-Type', 'application/json')
    .set(`Authorization`, `bearer ${DRIFT_TOKEN}`)
    .send(message)
    .catch(err => console.log(err))
    
}


app.use(bodyParser.json())
app.listen(process.env.PORT || 3000, () => console.log('Example app listening on port 3000!'))
app.post('/api', (req, res) => {
  if (req.body.type === 'new_message') {
    
    handleMessage(req.body.orgId, req.body.data);  
    
  }
  return res.send('ok')
})
